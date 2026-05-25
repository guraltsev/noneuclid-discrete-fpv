# 11 - Stage 01: Math primitives

## Goal

Create the minimal math primitives needed for cells, portals, collision, and rays.

This stage should be independent of Three.js.

Supporting design guide: `../design/005-stage-01-math-primitives-guide.md`.

## Files to create

```text
src/math/vec3.ts
src/math/rigidTransform3.ts
src/math/planes.ts
src/math/polygons.ts
src/math/intersections.ts
src/math/tolerances.ts
tests/math/vec3.test.ts
tests/math/rigidTransform3.test.ts
tests/math/polygons.test.ts
tests/math/intersections.test.ts
```

## Public concepts

Implement plain data types and functions for:

- `Vec3`,
- `RigidTransform3`,
- plane representation,
- polygon representation in local coordinates,
- point-in-polygon checks,
- segment-plane intersection,
- transform composition,
- transform inverse.

## Coordinate convention

Use one convention from the beginning:

```text
x/z: horizontal floor plane
y: vertical height
```

A prism floor lies in `y = 0`. A ceiling lies in `y = height`.

Document this convention in `vec3.ts` or `prismCells.ts` when it first becomes public.

## Tolerances

Use a small default tolerance for numerical comparisons.

Do not create a huge global constants file. Put tolerances in `src/math/tolerances.ts` only if multiple math modules need them.

Example:

```ts
export const geometryTolerance = 1e-8;
```

If a tolerance exists only for one function, keep it local.

## Tests to write

Behavior tests should cover:

- vector addition/subtraction,
- dot and cross product behavior,
- rigid transform identity,
- rigid transform inverse round trip,
- transform composition behavior,
- point inside/outside/on-boundary polygon classification,
- segment-plane intersection for crossing, parallel, and endpoint cases.

## Implementation guidance

Keep math functions small and direct.

Avoid adding a matrix library. A custom rigid-transform type with rotation and translation is enough for the first pass.

Use arrays or small objects consistently. Do not switch between many vector representations.

## Exit criteria

The stage is complete when all math tests pass and no project module outside `math` depends on Three.js for mathematical behavior.

## Do not do in this stage

Do not implement cells.

Do not implement movement.

Do not implement rendering.

Do not add curvature or theorem logic.
