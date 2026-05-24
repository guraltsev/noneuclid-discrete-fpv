# 24 - Example LLM prompts for future work

These prompts are meant for implementation sessions after the human developer has revised the final specs.

## Stage 00 prompt

```text
Read docs/llm-handoff/00_index.md and docs/issues/_closed/10_stage_00_bootstrap.md. Create the initial Vite TypeScript scaffold with Vitest, strict typecheck, the requested source folders, and scripts/deploy-pages.sh. Do not implement geometry, rendering, movement, or VR. End by running typecheck, test, and build.
```

## Stage 01 prompt

```text
Read 11_stage_01_math_primitives.md and implement the math primitives only. Add behavior tests for vector operations, rigid transform inverse/composition, polygon classification, and segment-plane intersection. Do not import Three.js from math modules.
```

## Stage 02 prompt

```text
Read 12_stage_02_prism_cell_compiler.md. Implement CellComplexSpec, PrismCellSpec, portal specs, compileCellComplex, portal transform compilation, and forbidden-zone construction. Add behavior tests for valid and invalid specs. Do not implement movement or rendering.
```

## Stage 03 prompt

```text
Read 13_stage_03_movement_collision_portals.md. Implement PlayerPose, PlayerBody, movePlayer, collision against prism walls/floor/ceiling, portal crossing, and forbidden-zone blocking. Add behavior tests. Do not add renderer code.
```

## Stage 04 prompt

```text
Read 14_stage_04_three_desktop_scene.md. Render compiled prism cells in Three.js and connect desktop controls to movePlayer. Add a debug overlay. Keep renderer code out of compiler and movement modules. Add only small render-contract tests.
```

## Stage 05 prompt

```text
Read 15_stage_05_portal_viewing.md. Implement one-hop portal views first, then limited recursive portal views if one-hop is stable. Expose public debug data for visible portal images. Do not implement ray tools yet.
```

## Stage 06 prompt

```text
Read 16_stage_06_straight_ray_tool.md. Implement traceStraightRay as a locally straight ray traversal through portals. Add tests for wall hits, portal crossings, max distance, max crossings, and forbidden-zone stops. Do not call this a geodesic solver.
```

## Stage 07 prompt

```text
Read 17_stage_07_environment_tools.md. Add marker placement, path tracing, simple distance/angle measurement, and local discovery log events. The UI should show raw measurements only and must not explain theorems.
```

## Stage 08 prompt

```text
Read 18_stage_08_webxr_vr_controls.md. Add WebXR entry and controller input using Three.js. Keep desktop fallback. Controller input should create movement/tool requests, not duplicate tool algorithms.
```

## Stage 09 prompt

```text
Read 19_stage_09_classroom_hardening.md. Add reset flows, preflight checks, readable error screens, local discovery log export, and GitHub Pages deployment checks. Do not add accounts, analytics, cloud storage, or multiplayer.
```

## Stage 10 prompt

```text
Read 20_stage_10_authoring_compiler_and_qr.md. Add optional JSON authoring import/export that compiles through the existing compiler. Do not implement QR scanning unless explicitly asked. Ensure invalid authoring input cannot bypass compiler validation.
```

## Stage 11 prompt

```text
Read 21_stage_11_general_volume_cells_later.md. Design but do not implement general polyhedron cells unless explicitly requested. If requested, add them as a new cell kind with full validation, collision, portal crossing, straight ray tracing, rendering, and forbidden-zone support.
```

## Stage 12 prompt

```text
Read 22_stage_12_cleanup_pass.md. Perform a cleanup-only pass. Improve names, split mixed-concept files, add public JSDoc to stable APIs, and replace implementation-locking tests with behavior tests. Do not add features.
```

## Bug-fix prompt template

```text
A behavior is wrong: <describe behavior>. Read the relevant stage file and tests. Add a failing behavior test that reproduces the issue without asserting private implementation details. Fix the smallest amount of code needed. Run typecheck, tests, and build. Summarize the behavior fixed and any remaining risk.
```

## World-authoring prompt template

```text
Create a new TypeScript world spec using the existing PrismCellSpec contract. The world should contain <describe rooms and portals>. Do not change compiler or movement behavior unless the current public contract cannot express the requested world. Add a compile test for the world.
```

## Refactor prompt template

```text
Refactor <file or module> for readability only. Preserve public behavior and tests. Do not add features. Do not introduce service classes, registries, or broad abstraction layers. Improve names and comments where they clarify the domain model.
```
