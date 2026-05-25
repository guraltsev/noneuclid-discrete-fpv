# 13 - Compile portal transforms from side identifications

## Goal

Move portal rigid transforms out of authored world data and into the prism-cell compiler.

For stage 03, authored prism worlds should only need to say:

- which cells exist,
- each cell's convex base polygon,
- which side of one cell is identified with which side of another cell.

The compiler should turn that topological authoring data into a working runtime portal model, including the rigid transform that movement uses during boundary crossing.

This issue is written as implementation guidance for a future LLM-assisted session. Favor the design rules in this file over preserving the current split where example worlds hand-author `transformToTarget`.

## Problem summary

The current runtime now has a stronger movement contract:

- motion is checked against a cell domain,
- out-of-bounds movement is interpreted as a boundary crossing attempt,
- crossing succeeds only through a valid portal,
- non-portal exits resolve back inside the source cell,
- compiled cells are assumed convex and validated up front.

That part is the right direction.

However, the compile layer is still incomplete for nontrivial portal worlds.

Today, portal crossing in [src/movement/portalCrossing.ts](../../src/movement/portalCrossing.ts) applies `portal.transformToTarget` directly to the moving object's pose. But in the current authoring model, that transform is still part of the raw world spec in [src/cell-complex/specs.ts](../../src/cell-complex/specs.ts).

That means the authored examples are doing two jobs at once:

- authoring topology: which side connects to which side,
- providing compiled movement data: the exact rigid transform for the seam.

This is why:

- [src/cell-complex/examples/twoPrismLoop.ts](../../src/cell-complex/examples/twoPrismLoop.ts) works, because the portal translations were hand-authored,
- [src/cell-complex/examples/cube.ts](../../src/cell-complex/examples/cube.ts) does not represent a fully working runtime world, because it uses `identityRigidTransform3` for every portal,
- [src/cell-complex/examples/tetrahedron.ts](../../src/cell-complex/examples/tetrahedron.ts) has the same issue.

The problem is not that cube cells are centered upright prisms. That is correct.

The problem is that side identification alone is not yet compiled into the rigid portal mapping needed by movement.

## Why this matters now

This compiler gap blocks the intended authoring model.

The project guidance consistently points toward:

- cell-local runtime coordinates rather than one master Euclidean world frame,
- prism-cell-first world compilation,
- movement consuming compiled topology and geometry rather than re-solving authoring data ad hoc.

Relevant context:

- [docs/Development_guide.md](../Development_guide.md)
- [docs/design/002-cell-complex-first.md](../design/002-cell-complex-first.md)
- [docs/design/003-no-curvature-engine.md](../design/003-no-curvature-engine.md)
- [docs/design/004-domain-model.md](../design/004-domain-model.md)
- [docs/llm-handoff/06_authoring_model.md](../llm-handoff/06_authoring_model.md)
- [docs/llm-handoff/12_stage_02_prism_cell_compiler.md](../llm-handoff/12_stage_02_prism_cell_compiler.md)
- [docs/llm-handoff/13_stage_03_movement_collision_portals.md](../llm-handoff/13_stage_03_movement_collision_portals.md)
- [docs/issues/11_stage_03_hardening_movement_and_compilation.md](./11_stage_03_hardening_movement_and_compilation.md)
- [docs/issues/12_portal_crossing_reachability.md](./12_portal_crossing_reachability.md)

If the compile layer keeps treating portal transforms as authored truth:

- `cube` and `tetrahedron` remain misleading examples,
- movement correctness depends on every world manually solving seam geometry,
- the authoring model is more coupled to runtime math than it should be,
- the compiler is not yet providing the world-rule completeness that stage 03 expects.

## Current state of the code

### Authoring and compilation

- [src/cell-complex/specs.ts](../../src/cell-complex/specs.ts) currently defines `PortalSpec` with `transformToTarget: RigidTransform3`.
- [src/authoring/validateAuthoringSpec.ts](../../src/authoring/validateAuthoringSpec.ts) validates ids, portal reciprocity, side bounds, and convexity assumptions, but does not derive seam transforms.
- [src/cell-complex/compileCellComplex.ts](../../src/cell-complex/compileCellComplex.ts) validates then compiles cells shallowly.
- [src/cell-complex/prismCells.ts](../../src/cell-complex/prismCells.ts) computes side geometry and portal lookups, but the compiled portal data is still just the authored portal object.

### Runtime movement

- [src/movement/moveDynamicObject.ts](../../src/movement/moveDynamicObject.ts) detects boundary crossings and asks portal crossing to transform the object into the target cell.
- [src/movement/portalCrossing.ts](../../src/movement/portalCrossing.ts) composes the portal transform with the object's pose.
- [src/movement/collision.ts](../../src/movement/collision.ts) relies on compiled side geometry and target-cell collision checks after crossing.

### Example worlds that expose the gap

- [src/cell-complex/examples/twoPrismLoop.ts](../../src/cell-complex/examples/twoPrismLoop.ts)
- [src/cell-complex/examples/cube.ts](../../src/cell-complex/examples/cube.ts)
- [src/cell-complex/examples/tetrahedron.ts](../../src/cell-complex/examples/tetrahedron.ts)
- [src/cell-complex/examples/torus.ts](../../src/cell-complex/examples/torus.ts)

### Current tests to extend

- [tests/cell-complex/compileCellComplex.test.ts](../../tests/cell-complex/compileCellComplex.test.ts)
- [tests/cell-complex/describeGeometry.test.ts](../../tests/cell-complex/describeGeometry.test.ts)
- [tests/movement/moveDynamicObject.test.ts](../../tests/movement/moveDynamicObject.test.ts)
- [tests/movement/movePlayer.test.ts](../../tests/movement/movePlayer.test.ts)

## Design decision for this issue

For stage 03 prism-cell worlds, portal transform derivation should be a compiler responsibility.

Treat this as the intended layering:

1. Authored world spec expresses side identifications.
2. Validation checks that the side identifications are coherent and reciprocal.
3. Compilation derives seam-local portal transforms from cell-side geometry.
4. Runtime movement consumes only compiled portal transforms.

Do not require the example worlds to hand-author transforms for ordinary prism-side gluing.

## Stage-03 assumptions

The following assumptions are part of this issue:

- every compiled movement cell is a convex upright prism,
- all prism bases are expressed in counterclockwise order,
- all portal crossings are side-to-side identifications between prism walls,
- `y` remains the shared up axis across portal crossings,
- target-side orientation along the seam is reversed relative to source-side traversal,
- runtime movement should not need to infer portal transforms from raw authoring data.

These assumptions are compatible with the current movement hardening work and with the "no curvature engine" boundary in [docs/design/003-no-curvature-engine.md](../design/003-no-curvature-engine.md).

## Recommended model split

### 1. Split authored portals from compiled portals

The current `PortalSpec` type in [src/cell-complex/specs.ts](../../src/cell-complex/specs.ts) is overloaded.

Refactor toward a distinction like:

```ts
interface AuthoredPortalSpec {
  readonly id: string;
  readonly sideIndex: number;
  readonly targetCellId: string;
  readonly targetPortalId: string;
}

interface CompiledPortal {
  readonly id: string;
  readonly sideIndex: number;
  readonly targetCellId: string;
  readonly targetPortalId: string;
  readonly transformToTarget: RigidTransform3;
}
```

The exact names may vary, but the important rule is:

- authored prism worlds should not need to provide `transformToTarget`,
- compiled runtime data should always have `transformToTarget`.

### 2. Keep raw authoring simple

Worlds like:

- [src/cell-complex/examples/cube.ts](../../src/cell-complex/examples/cube.ts)
- [src/cell-complex/examples/tetrahedron.ts](../../src/cell-complex/examples/tetrahedron.ts)
- [src/cell-complex/examples/twoPrismLoop.ts](../../src/cell-complex/examples/twoPrismLoop.ts)

should be able to express only:

- cell geometry,
- side pairings,
- visuals.

No explicit portal transform should be required for ordinary stage-03 side gluing.

### 3. Compiled cells should expose compiled portal data

In [src/cell-complex/prismCells.ts](../../src/cell-complex/prismCells.ts), compiled sides and portal lookup tables should point at compiled portal objects, not authored portal specs.

That keeps movement and rendering consumers honest:

- renderers can inspect the topology and labels,
- movement can apply the seam transform,
- neither layer has to reach back into authoring semantics.

## How to derive the portal transform

This is the core missing compiler step.

For each portal in a compiled source cell:

1. Find the reciprocal target portal.
2. Read source and target side geometry from compiled cell sides.
3. Build a seam-aligned rigid transform from source cell-local coordinates to target cell-local coordinates.

### Geometry available already

Each side in [src/cell-complex/prismCells.ts](../../src/cell-complex/prismCells.ts) already carries:

- `start`
- `end`
- `lengthMeters`
- `inwardNormal`

From those you can derive:

- side tangent,
- side midpoint,
- outward normal,
- a side-local frame.

### Recommended seam mapping rule

If a source side is identified to a target side, then the transform should make these statements true:

- source side midpoint maps to target side midpoint,
- movement across the source wall maps to movement into the target cell interior,
- source side traversal direction maps to reversed traversal on the target side,
- `y` is preserved.

That means the source seam basis and target seam basis should be chosen so that:

- source tangent maps to negative target tangent,
- source outward crossing direction maps to target inward direction,
- up maps to up.

One concrete basis choice that satisfies the stage-03 prism assumptions is:

- source basis: `[t_source, up, -n_source]`
- target basis: `[-t_target, up, n_target]`

where:

- `t_source` is the unit tangent from source side start to end,
- `t_target` is the unit tangent from target side start to end,
- `n_source` is the source inward normal,
- `n_target` is the target inward normal.

Then:

- compute the rotation from source basis to target basis,
- compute the translation so that the rotated source side midpoint lands on the target side midpoint.

In formula form:

```text
R = B_target * transpose(B_source)
T = midpoint_target - R * midpoint_source
```

and the portal transform is:

```text
p_target = R * p_source + T
```

This is enough for the current runtime because:

- dynamic-object movement uses `RigidTransform3`,
- portal crossing composes transforms,
- collision remains axis-aligned in target cell-local coordinates after crossing.

## Important implementation notes

### 1. Compile portal pairs once

Do not derive transforms lazily during movement.

Compile them once in the compile pass and store the result in the compiled portal data.

### 2. Keep validation separate from derivation

Validation should still be responsible for:

- duplicate ids,
- portal reciprocity,
- valid side indices,
- convexity and winding assumptions.

Derivation should assume validated reciprocal portals and operate on already-compiled side geometry.

### 3. Use reciprocity as an invariant

If portal pairing is reciprocal, then the transform for the target portal should be the inverse seam mapping of the source portal, modulo small floating-point error.

It is acceptable to:

- derive each portal independently from geometry,
- or derive one and compute the reciprocal using inversion.

Either approach is fine as long as tests prove the pair behaves consistently.

### 4. Keep torus behavior working

[src/cell-complex/examples/torus.ts](../../src/cell-complex/examples/torus.ts) should still work after this refactor.

The torus world is a good sanity check because:

- each portal is on the same cell,
- side geometry is symmetric,
- the derived transforms should collapse to the expected wraparound translations.

### 5. Treat `twoPrismLoop` as an authoring simplification test

After this issue, [src/cell-complex/examples/twoPrismLoop.ts](../../src/cell-complex/examples/twoPrismLoop.ts) should no longer need to hand-author `±15` translations.

The compile pass should derive the same effective mapping from the side pairing alone.

## Suggested file-level plan

### 1. Refactor the cell-complex types

Likely files:

- [src/cell-complex/specs.ts](../../src/cell-complex/specs.ts)
- [src/cell-complex/prismCells.ts](../../src/cell-complex/prismCells.ts)
- [src/cell-complex/compileCellComplex.ts](../../src/cell-complex/compileCellComplex.ts)

Goals:

- separate authored portal data from compiled portal data,
- keep compiled cells exposing `transformToTarget`,
- keep side-level portal lookup fast for movement.

### 2. Add a dedicated portal-transform compiler helper

Create a focused helper module, for example:

- `src/cell-complex/compilePortalTransforms.ts`

The exact filename may vary, but this logic should not be hidden inline in `moveDynamicObject` or scattered across cell compilation.

This helper should:

- accept validated compiled cells or compiled side geometry,
- resolve portal pairs,
- compute seam transforms,
- return compiled portal records.

### 3. Update example worlds to authored topology only

Likely files:

- [src/cell-complex/examples/twoPrismLoop.ts](../../src/cell-complex/examples/twoPrismLoop.ts)
- [src/cell-complex/examples/cube.ts](../../src/cell-complex/examples/cube.ts)
- [src/cell-complex/examples/tetrahedron.ts](../../src/cell-complex/examples/tetrahedron.ts)
- [src/cell-complex/examples/torus.ts](../../src/cell-complex/examples/torus.ts)

Goals:

- remove hand-authored portal transforms where they are only expressing seam identification,
- keep authoring examples readable and topological,
- ensure `cube` and `tetrahedron` become meaningful runtime worlds rather than partial placeholders.

### 4. Keep movement runtime mostly unchanged

Likely files:

- [src/movement/portalCrossing.ts](../../src/movement/portalCrossing.ts)
- [src/movement/moveDynamicObject.ts](../../src/movement/moveDynamicObject.ts)

Goals:

- movement should continue consuming compiled `transformToTarget`,
- avoid mixing authoring-level portal derivation into runtime movement,
- preserve the existing stage-03 reachability contract from issue 12.

## Tests to add

Add tests before or alongside the refactor.

### Compilation tests

Extend [tests/cell-complex/compileCellComplex.test.ts](../../tests/cell-complex/compileCellComplex.test.ts) to prove:

- compiled portals include derived transforms even when authoring omits them,
- `twoPrismLoop` compiles into the same effective east-west translation as before,
- `torus` compiles into the expected wraparound transforms,
- `cube` compiles into transforms that map each source side into the identified target side,
- `tetrahedron` compiles into valid reciprocal portal transforms.

### Geometry-consistency tests

Either in the same file or in a focused new test module, prove for each compiled portal:

- source midpoint maps to target midpoint,
- source tangent maps to reversed target tangent,
- source outward normal maps to target inward normal,
- paired reciprocal transforms compose to near identity.

### Movement tests

Extend [tests/movement/moveDynamicObject.test.ts](../../tests/movement/moveDynamicObject.test.ts) and/or [tests/movement/movePlayer.test.ts](../../tests/movement/movePlayer.test.ts) to prove:

- a dynamic object can cross a portal in `cube`,
- the target pose lands inside the target cell rather than colliding immediately,
- a dynamic object can cross at least one portal in `tetrahedron`,
- `twoPrismLoop` still behaves correctly after removing authored transforms.

## Acceptance criteria

This issue is complete when all of the following are true:

- authored prism worlds no longer need to supply `transformToTarget` for ordinary side-to-side portal gluing,
- compiled portal data always includes a rigid `transformToTarget`,
- `compileCellComplex(...)` derives portal transforms from side identification and side geometry,
- runtime movement continues to consume compiled portal transforms rather than authoring specs,
- `cube` is a genuinely traversable world under the stage-03 movement contract,
- `tetrahedron` is also traversable under the same compiled portal logic,
- `torus` and `twoPrismLoop` still work after the authoring simplification,
- tests verify seam geometry consistency, not only successful compilation.

## Non-goals

- Do not add non-prism or non-convex runtime support here.
- Do not add recursive rendering or ray tracing here.
- Do not add a full global embedding solver for polyhedral spaces.
- Do not add curved-space, holonomy, or geodesic machinery here.
- Do not move collision away from the current stage-03 axis-aligned box simplification here.

## Verification notes

At the time this issue was written:

- stage-03 movement had already been strengthened to use boundary-driven reachability,
- `cube` and `tetrahedron` still depended on placeholder authored portal transforms,
- the repository already had the side geometry and rigid-transform utilities needed to implement this cleanly,
- the missing step was a compiler pass that turns side identifications into runtime portal transforms.
