# 16 - Finish stage 04 renderer meshes, debug overlay, and renderer contract tests

## Goal

Close the remaining gaps from the original stage-04 desktop-scene handoff now that the basic desktop-playable foundation exists.

This issue is intentionally narrower than the already-completed foundation work in [docs/issues/_closed/19_stage_04_desktop_scene_foundation.md](./_closed/19_stage_04_desktop_scene_foundation.md). It focuses only on the pieces that are still missing from the original renderer scope.

## What is already done

The repository already has:

- browser app startup in [src/main.ts](../../src/main.ts),
- a working Three.js app loop in [src/render/three/createThreeApp.ts](../../src/render/three/createThreeApp.ts),
- desktop keyboard and mouse controls in [src/render/three/desktopControls.ts](../../src/render/three/desktopControls.ts),
- world-aware player movement routed through the stage-03 runtime contract.

That work should remain in place. This issue is about finishing the renderer-side polish and testability that the original stage-04 checklist expected.

## Remaining gaps

The current renderer is still incomplete in a few specific places:

- [src/render/three/buildCellMesh.ts](../../src/render/three/buildCellMesh.ts) currently builds the floor and outline, but not a full floor/ceiling/side-face mesh set.
- [src/render/three/buildPortalMesh.ts](../../src/render/three/buildPortalMesh.ts) is still a stub and is not meaningfully used.
- [src/render/three/debugOverlay.ts](../../src/render/three/debugOverlay.ts) currently exposes only `visible: boolean`.
- [src/render/three/renderState.ts](../../src/render/three/renderState.ts) currently exposes only `frameCount`.
- There are no renderer-contract tests under `tests/render-contract`.

Because of those gaps, the original stage-04 renderer responsibilities are only partially complete.

## Required work

### 1. Finish cell mesh construction

Update [src/render/three/buildCellMesh.ts](../../src/render/three/buildCellMesh.ts) so it produces renderable geometry for:

- floor,
- ceiling,
- solid side walls,
- portal side faces or portal frames,
- cell-local decorations.

Keep the visual style simple and readable. This is still stage 04, not recursive portal rendering.

### 2. Make portal-side metadata explicit

Return or expose enough metadata from `buildCellMesh(...)` that tests can verify which side faces are portals without walking huge Three.js graphs.

If [src/render/three/buildPortalMesh.ts](../../src/render/three/buildPortalMesh.ts) remains part of the design, wire it into that path. If not, remove or replace the stub so the architecture is clearer.

### 3. Implement useful debug state and overlay behavior

Replace the placeholder renderer-local state with something that can represent at least:

- current world id if available,
- current cell id,
- local position,
- yaw,
- last movement result,
- whether the page is in a secure context,
- whether WebXR appears available when detectable.

The overlay may stay simple DOM or renderer-adjacent UI. It does not need to become an in-world VR panel.

### 4. Add renderer contract tests

Add tests under `tests/render-contract` that verify:

- `buildCellMesh(...)` produces renderable floor, ceiling, and side-face groupings,
- portal side faces are marked in returned metadata,
- debug state can be constructed from app state and movement results without needing a live renderer.

Keep the tests contract-level. Do not lock the implementation to large raw Three.js object dumps.

## Acceptance criteria

This issue is complete when:

- `buildCellMesh(...)` covers floor, ceiling, and side faces,
- portal sides are distinguishable through lightweight metadata,
- debug overlay state contains meaningful desktop/XR-readiness information,
- renderer-contract tests exist for mesh metadata and debug-state construction,
- `npm.cmd test`, `npm.cmd run typecheck`, and `npm.cmd run build` all pass.
