# 17 - Dynamic visible portal path debug mode

## Goal

Add a debug mode that discovers camera-visible portal paths every frame and displays the current visible-path count in the on-screen debug UI.

This issue is the next step after the completed path-table and static-culling work in [docs/issues/_closed/17_portal_path_tables_and_static_culling.md](./_closed/17_portal_path_tables_and_static_culling.md). It should prove the runtime visibility algorithm before the renderer starts drawing recursive cell images from those paths.

## Scope boundary

This issue is about dynamic discovery and debug reporting only.

In scope:

- build a renderer-side visible-path discovery module,
- consume the existing statically culled portal path tables,
- compute per-frame visible portal paths from the active camera,
- expose visible-path counts and max visible depth in debug state,
- display a small per-frame count in the top debug UI,
- add contract tests for the visibility algorithm.

Out of scope:

- instanced recursive cell rendering,
- shader or scissor clipping,
- rendering destination cell copies,
- portal-view compositing,
- changing movement or collision behavior,
- replacing the current one-cell renderer.

## Current starting point

Already available:

- [src/cell-complex/portalPaths.ts](../../src/cell-complex/portalPaths.ts) builds per-root portal path tables.
- [src/cell-complex/staticPortalPathCull.ts](../../src/cell-complex/staticPortalPathCull.ts) builds kept path tables and cull summaries.
- [src/render/three/createThreeApp.ts](../../src/render/three/createThreeApp.ts) can build static path debug tables behind debug flags.
- [src/render/three/debugOverlay.ts](../../src/render/three/debugOverlay.ts) and [src/render/three/renderState.ts](../../src/render/three/renderState.ts) are the right places to surface compact UI state.

Missing:

- `src/render/three/visiblePortalPaths.ts`,
- `tests/render-contract/visiblePortalPaths.test.ts`,
- per-frame visible-path stats in renderer debug state,
- top-of-screen visible-path count.

## Required debug behavior

Add a debug option such as:

```text
portal-visible-path-debug
```

When enabled:

- the app builds or reuses statically culled portal path tables,
- every frame reads the current root cell, camera pose, projection, and viewport,
- computes the visible portal paths for the current camera,
- updates debug state with:
  - candidate path count,
  - statically kept path count,
  - visible path count,
  - visible path count by depth,
  - max visible depth,
  - clipped-by-camera count,
  - clipped-by-area count,
  - clipped-by-budget count,
  - budget-exhausted flag,
- displays a compact top UI line, for example:

```text
visible paths: 37 / kept 812 / depth 6
```

When `window.noneuclidPortalDebug.ShowCellPath(...)` is available, its result should also echo whether that exact matched path is visible in the current frame. The helper should report at least:

```text
pathId
destinationCellId
survivedStaticCull
currentlyVisible
screenAreaPixels, when visible
clipRectNdc, when visible
```

This should answer the question "is the cell image for this specific path visible right now?" without requiring the user to compare path ids manually against the global visible-path count. If the camera moves, repeated calls to `ShowCellPath(...)` should reflect the latest per-frame visibility state.

Keep this display plain and diagnostic. It should not become a teaching UI or renderer control panel.

## Correct algorithm

The visible-path pass should be parent-driven rather than independently testing every path. A child path can be visible only if its parent path is visible.

### Inputs

```ts
export interface ComputeVisiblePortalPathsInput {
  readonly world: CompiledCellComplex;
  readonly rootCellId: string;
  readonly pathTable: PortalPathTable;
  readonly camera: THREE.Camera;
  readonly viewportPixels: { readonly width: number; readonly height: number };
  readonly options: VisiblePortalPathOptions;
}
```

```ts
export interface VisiblePortalPathOptions {
  readonly maxDepth: number;
  readonly maxVisiblePaths: number;
  readonly minPortalScreenAreaPixels: number;
  readonly includeRootCell: boolean;
  readonly sortMode: "depth-then-area" | "area-then-depth";
}
```

### Output

```ts
export interface VisiblePortalPath {
  readonly pathId: number;
  readonly destinationCellId: string;
  readonly depth: number;
  readonly rootFromDestinationMatrix: THREE.Matrix4;
  readonly clipPolygonNdc: readonly Vec2[];
  readonly clipRectNdc: Rect2;
  readonly screenAreaPixels: number;
}
```

Also return a debug summary:

```ts
export interface VisiblePortalPathDebugSummary {
  readonly rootCellId: string;
  readonly candidatePathCount: number;
  readonly keptPathCount: number;
  readonly visiblePathCount: number;
  readonly visiblePathCountByDepth: readonly { readonly depth: number; readonly count: number }[];
  readonly maxVisibleDepth: number;
  readonly clippedByCameraCount: number;
  readonly clippedByAreaCount: number;
  readonly clippedByBudgetCount: number;
  readonly budgetExhausted: boolean;
}
```

### Portal aperture construction

For a prism side portal, build the source-side aperture as four cell-local corners:

```text
side vertex A at floor
side vertex B at floor
side vertex B at ceiling
side vertex A at ceiling
```

Use the compiled cell's base vertices, portal side index, and cell height. Do not infer aperture geometry from rendered wall meshes.

### Projection rule

For each non-root path, only the newest portal step is projected for that step of the traversal.

Given a path:

```text
root -> ... -> parent destination cell -> child destination cell
```

the newest portal aperture lives in the parent destination cell. Transform that aperture into root-cell coordinates using the parent's `rootFromDestination`, then project it through the active camera to NDC.

In other words:

```text
portal corner in parent cell local coordinates
  -> parentPath.rootFromDestination
  -> root-cell coordinates
  -> Three.js camera view/projection
  -> NDC
```

Do not use the child `rootFromDestination` for the aperture that leads into the child. That transform places child geometry, not the doorway in the parent image.

### Parent aperture accumulation

Start with the root path aperture:

```text
full screen NDC rectangle: [-1,-1], [1,-1], [1,1], [-1,1]
```

For each child path:

1. Find the already visible parent path by `parentPathId`.
2. Project the newest portal rectangle to an NDC polygon.
3. Clip that polygon against the parent's accumulated `clipPolygonNdc`.
4. If the result is empty, reject the child.
5. Compute polygon area in pixels.
6. If the area is below `minPortalScreenAreaPixels`, reject the child.
7. Otherwise keep the child with the clipped polygon as its accumulated aperture.

The accumulated aperture matters because a depth-4 path is visible only through all four ancestor portal windows, not just through its final doorway.

### Behind-camera handling

A first implementation may reject a portal if all four aperture corners are behind the camera near plane.

If some corners are in front and some are behind, keep the implementation conservative:

- clip the portal polygon against the near plane before NDC projection, or
- keep the portal as a coarse visible candidate if near-plane clipping is not implemented yet.

Do not reject mixed near-plane cases based on a center point. That can incorrectly remove portals when the viewer is close to a doorway.

### Polygon clipping

Use a deterministic convex polygon clipper:

```text
clip candidate polygon by each edge half-plane of parent aperture
```

Both the projected portal rectangle and accumulated parent aperture should be convex in this first scope. Keep the function pure and test it without WebGL.

### Ordering and budget

Compute parent-before-child visibility first. Then sort kept paths for reporting:

```text
depth-then-area:
  lower depth first,
  larger screen area second,
  lower path id as tie-breaker

area-then-depth:
  larger screen area first,
  lower depth second,
  lower path id as tie-breaker
```

Apply `maxVisiblePaths` after sorting. Count omitted sorted paths as `clippedByBudgetCount` and set `budgetExhausted` when any are omitted.

For debug mode, include the root path in internal accounting only when `includeRootCell` is true. The top UI should label whether the root path is included if that becomes confusing; the default should include root for consistency with later rendering.

## Suggested implementation steps

### 1. Add the debug flag

Add `portal-visible-path-debug` to [src/glue/debugOptions.ts](../../src/glue/debugOptions.ts).

It should be inactive unless debug options are active, matching the existing portal path debug flags.

### 2. Add pure helpers

Create [src/render/three/visiblePortalPaths.ts](../../src/render/three/visiblePortalPaths.ts).

Keep most helpers pure:

- build portal aperture corners,
- transform aperture corners to root space,
- project root-space points to NDC,
- clip convex polygons,
- compute NDC rect and pixel area,
- summarize visible paths by depth.

Only the camera projection wrapper needs to touch Three.js.

### 3. Wire per-frame computation

In [src/render/three/createThreeApp.ts](../../src/render/three/createThreeApp.ts):

- build static path tables when `portal-visible-path-debug` is active,
- recompute visible paths after camera pose is applied each frame,
- avoid console logging every frame,
- keep enough state to update the overlay and `window.noneuclidPortalDebug` if that helper is also active,
- make `ShowCellPath(...)` include live visibility for the matched path id using the most recent visible-path result.

This can share the existing static cull setup used by `portal-path-debug`, but it should not require path overlay mode.

### 4. Update debug state and overlay

Update [src/render/three/renderState.ts](../../src/render/three/renderState.ts) and [src/render/three/debugOverlay.ts](../../src/render/three/debugOverlay.ts) so the top UI can show the live count.

The visible-path debug display should be small and stable. It should not resize or jump as counts change.

### 5. Add tests

Add [tests/render-contract/visiblePortalPaths.test.ts](../../tests/render-contract/visiblePortalPaths.test.ts).

Required tests:

- root path is included when requested,
- first-hop portal in front of the camera is visible,
- portal fully behind the camera is rejected,
- child path is rejected when its parent is not visible,
- nested aperture area does not grow beyond the parent aperture,
- `maxDepth` limits discovery,
- `maxVisiblePaths` limits reported visible paths and sets `budgetExhausted`,
- same destination cell reached by two visible paths remains two visible paths,
- `ShowCellPath(...)` reports `currentlyVisible: true` only when the matched path id is present in the latest visible-path result.

Add smaller tests for polygon clipping if needed. Prefer focused tests over snapshots of large Three.js objects.

## Acceptance criteria

This issue is complete when:

- `portal-visible-path-debug` exists and can be enabled from launch/debug settings,
- visible paths are discovered every frame while the flag is active,
- the top debug UI shows a live visible-path count,
- `ShowCellPath(...)` reports whether the matched cell path is currently visible,
- debug state exposes counts by depth, max visible depth, and budget information,
- the algorithm accumulates parent portal apertures instead of testing each portal independently,
- tests cover first-hop, behind-camera, nested, max-depth, and max-visible-path behavior,
- `npm.cmd test -- --run`, `npm.cmd run typecheck`, and `npm.cmd run build` pass.

## Notes for future issues

This issue should produce the data needed by the later portal path renderer, but it should stop before drawing recursive cell copies.

Once this debug mode is stable, the next renderer issue can use `VisiblePortalPath[]` to compact instanced cell archetypes and then add rectangular or polygon clipping.
