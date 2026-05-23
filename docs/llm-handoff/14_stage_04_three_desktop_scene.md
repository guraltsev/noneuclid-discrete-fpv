# 14 - Stage 04: Three.js desktop scene

## Goal

Render the current prism cell and allow desktop first-person exploration with keyboard/mouse or simple pointer controls.

This stage proves that compiled cells and movement results can drive a visible environment.

## Files to create

```text
src/render/three/createThreeApp.ts
src/render/three/buildCellMesh.ts
src/render/three/buildPortalMesh.ts
src/render/three/buildDecorationMesh.ts
src/render/three/desktopControls.ts
src/render/three/debugOverlay.ts
src/render/three/renderState.ts
tests/render-contract/buildCellMesh.test.ts
tests/render-contract/debugState.test.ts
```

## Rendering responsibilities

The renderer may:

- create Three.js scene objects,
- draw floors, ceilings, walls, and portal faces,
- draw low-poly decorations,
- draw debug overlays,
- translate user input into movement requests,
- render current movement/tool state.

The renderer must not:

- validate world specs,
- decide portal transforms,
- implement movement collision rules,
- construct forbidden zones,
- trace rays through portals.

## First visual style

Use simple readable geometry:

- floor: muted material with grid or subtle texture,
- ceiling: simple material,
- solid walls: opaque,
- portal walls: visible frame or translucent colored surface,
- forbidden zones: debug-only cylinders or outlines,
- decorations: sparse low-poly props.

The world should not feel like an empty math diagram, but graphical fidelity is not the goal.

## Desktop controls

Desktop controls should support:

- forward/back/strafe movement,
- turn with mouse or keyboard,
- reset to spawn,
- fire straight ray later,
- toggle debug overlay.

At this stage, only movement and reset are required.

## Debug overlay

The overlay should show:

- current world id,
- current cell id,
- local position,
- yaw,
- last movement result,
- whether the current page is a secure context,
- whether WebXR appears available if detected.

## Tests to write

Renderer contract tests should not inspect huge Three.js object graphs.

Required tests:

- `buildCellMesh` creates renderable groups for floor, ceiling, and side faces,
- portal side faces are marked in returned metadata,
- debug state can be constructed from app state and last movement result.

## Manual checks

Manual check after implementation:

- app loads in desktop browser,
- player can move inside a room,
- player stops at walls,
- player crosses a portal,
- debug overlay updates current cell id,
- reset returns to spawn.

## Exit criteria

A human can open `npm run dev` and explore a two-prism world from desktop.

## Do not do in this stage

Do not add recursive portal rendering yet.

Do not add VR controls yet.

Do not add ray tools yet.
