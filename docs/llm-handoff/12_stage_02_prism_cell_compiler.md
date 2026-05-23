# 12 - Stage 02: Prism cell compiler

## Goal

Implement the first runtime world model: a compiled cell complex whose cells are vertical prisms over polygonal bases.

This stage turns TypeScript authoring specs into checked runtime data.

## Files to create

```text
src/cell-complex/specs.ts
src/cell-complex/prismCells.ts
src/cell-complex/compileCellComplex.ts
src/cell-complex/portalTransforms.ts
src/cell-complex/forbiddenZones.ts
src/cell-complex/examples/twoPrismLoop.ts
src/cell-complex/examples/prismTorusLikeRoom.ts
tests/cell-complex/compileCellComplex.test.ts
tests/cell-complex/portalTransforms.test.ts
tests/cell-complex/forbiddenZones.test.ts
```

## Public behavior

The compiler should:

- reject duplicate cell ids,
- reject missing portal endpoints,
- reject portal endpoints that refer to solid walls,
- reject incompatible portal face dimensions,
- reject non-positive prism height,
- reject invalid base polygons,
- construct floor, ceiling, side faces, wall faces, and portal faces,
- construct explicit portal transforms,
- construct forbidden zones around portal junctions.

## First cell type

Only implement:

```ts
type CellSpec = PrismCellSpec;
```

Do not add a fake `VolumeCellSpec` branch yet. Document the future stage instead.

## Prism side faces

Every base polygon edge becomes one side face.

The side face is either:

```ts
{ kind: "wall" }
```

or:

```ts
{ kind: "portal"; portal: PortalId }
```

The floor and ceiling are always collision surfaces and never portals in this stage.

## Portal transform authoring

Use restricted orientation descriptions, not arbitrary matrices.

The compiler computes a rigid transform from source crossing coordinates to target crossing coordinates.

For the first pass, it is acceptable to support only equal-height portal faces and a small set of orientation options.

## Forbidden-zone construction

Find every portal junction in each prism cell.

For a prism, a portal junction exists at a vertical prism edge if both adjacent side faces are portal faces.

Create a forbidden vertical capsule or cylinder with radius:

```text
0.15 meters
```

The compiler should expose these zones to movement and tools.

## Tests to write

Required tests:

- valid two-prism loop compiles,
- duplicate cell id is rejected,
- portal endpoint to missing cell is rejected,
- portal endpoint to wall face is rejected,
- incompatible face heights are rejected,
- floor portal request is rejected,
- ceiling portal request is rejected,
- two adjacent portal side faces create a forbidden zone,
- non-adjacent portal side faces do not create a junction zone,
- portal transform round-trips with its reverse for a simple two-way portal.

## Exit criteria

A developer can import a sample TypeScript world spec, compile it, and inspect the compiled cells, portals, collision faces, and forbidden zones.

## Do not do in this stage

Do not implement player movement.

Do not implement rendering.

Do not compute curvature.

Do not implement arbitrary polyhedron cells.
