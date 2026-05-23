# 05 - Domain language

Use these words consistently in code, docs, tests, and prompts.

## Cell complex

A cell complex is the explorable world model. It is made of cells glued to each other by portals.

In the first implementation, every cell is a prism cell. Later, arbitrary volume cells may be added.

## Prism cell

A prism cell is a vertical extrusion of a 2D polygonal base.

It has:

- one floor,
- one ceiling,
- one vertical side face for each base polygon edge,
- local coordinates,
- optional decorations,
- optional markers,
- zero or more portal side faces.

The floor and ceiling are non-portal collision surfaces in the first implementation.

## Side face

A side face is a vertical rectangular or polygonal wall segment corresponding to one edge of the prism base.

A side face may be:

- a solid wall,
- a portal face.

## Portal

A portal glues one portal face to another portal face.

A portal has:

- a source cell face,
- a target cell face,
- a rigid 3D transform from source-crossing coordinates to target-crossing coordinates,
- a crossing direction convention,
- validation that both faces are compatible.

A portal is not a visual effect. The visual effect is a rendering of the portal contract.

## Portal junction

A portal junction is a codimension-2 place where two or more portal faces meet.

For prism cells, this is usually a vertical edge where two portal side faces meet.

For future polyhedron cells, it may be an edge or vertex incident to multiple portal faces.

## Forbidden zone

A forbidden zone is a 15 cm thickened neighborhood around a portal junction.

The first implementation should use:

```text
forbiddenRadiusMeters = 0.15
```

A player capsule must not intersect a forbidden zone. A marker should not be placed inside a forbidden zone. A ray should stop at or before a forbidden zone if continuing would pass through it.

The forbidden zone is a safety and robustness rule. It is not a computed curvature effect.

## Player body

The player body is a capsule-like collision object inside a current cell.

The implementation may initially approximate the body as:

```text
horizontal radius: 0.25 m
height: 1.60 m
eye height: 1.45 m
```

Keep these values close to the movement code until they become user-configurable.

## Movement step

A movement step asks the world to move the player from one pose to another over a small time interval.

A step may:

- succeed within the same cell,
- cross one portal,
- be shortened by collision,
- be rejected by collision,
- be rejected by a forbidden zone,
- stop before a portal junction.

## Straight ray

A straight ray is the first exploration tool.

It starts at a point and direction in the current cell, travels straight inside the cell, and transforms through portals when it crosses portal faces.

It is not a point-to-point geodesic solver. It is not a shortest path algorithm.

## Marker

A marker is a student-placed object in a cell.

A marker has:

- cell id,
- local position,
- optional label,
- optional color or shape,
- creation time or event id if discovery logging is enabled.

Markers should be allowed only at valid locations outside forbidden zones.

## Path trace

A path trace records where a student walked or where a ray traveled.

A path trace is a sequence of local segments, each tagged by cell id. Do not flatten it into one global Euclidean coordinate system, because different cells may have incompatible embeddings.

## Measurement tool

A measurement tool provides raw environmental measurements such as distance, angle, or segment count.

It should not explain the theorem being discovered. The instructor and course materials interpret the measurements.

## World spec

A world spec is author-authored data describing cells, portals, decorations, spawn points, and available tools.

The canonical world spec format is TypeScript during the first implementation.

## Compiled cell complex

A compiled cell complex is the validated runtime form of a world spec.

It should contain no unvalidated portal references, no missing cells, no incompatible portal faces, and no ambiguous forbidden zones.
