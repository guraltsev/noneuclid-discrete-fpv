# 38 - Decompose runtime monoliths and retire legacy paths

Status: open as of 2026-08-03T14:24:10-05:00.

Priority: P1 for geodesic correctness boundaries; P3 for dead UI cleanup.

## Problem

`src/render/three/createThreeApp.ts` is approximately 6,648 lines and
`src/world-objects/geodesicCannon.ts` is approximately 4,533 lines. They combine
multiple state machines, rendering orchestration, input actions, geometry
updates, compatibility adapters, and cleanup rules. This conflicts with the
Stage 12 goal of splitting oversized mixed-concept files.

The geodesic module still contains legacy emitter connections, segment
`connectionState`, legacy tie/detach, and straightening APIs alongside the new
interval/endpoint/curve-shortening model. The UI tree also retains unused DOM
palette/input modules and a legacy desktop editor path after issues 27 and 30.

## Required work

- Coordinate geodesic legacy removal with issues 31 and 32; do not remove a
  path until equivalent endpoint/portal/failure tests protect current behavior.
- Extract curve-shortening pair operations, anchored rebuild/portal-word logic,
  legacy migration helpers, and renderer-derived segment state into explicit
  modules with narrow contracts.
- Split `createThreeApp` by lifecycle, geometry snapshot commit, portal frame
  rendering, runtime-object actions, palette/help integration, and XR session
  orchestration without introducing a second source of truth.
- Remove unused desktop DOM palette/input/editor compatibility modules after
  confirming no launch mode imports them.
- Keep the refactor behavior-preserving and land it in reviewable slices.

## Acceptance criteria

- Active runtime paths no longer depend on the old geodesic straightening model.
- The eight skipped legacy geodesic tests are removed or replaced by current
  endpoint/curve-shortening behavior tests, not merely unskipped unchanged.
- Dead DOM menu/editor paths are absent from runtime construction.
- Extracted modules have focused contract tests and preserve all current public
  behavior.
- Typecheck, tests, browser smoke, and build pass after each major slice.
