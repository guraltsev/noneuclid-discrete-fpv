# 13 - Stage 03: Movement, collision, portals, and forbidden zones

## Goal

Implement basic first-person movement through compiled prism cells.

The player should move inside a cell, collide with ordinary walls/floor/ceiling, cross portals through their interiors, and never enter the 15 cm forbidden zone around portal junctions.

## Files to create

```text
src/movement/playerBody.ts
src/movement/movePlayer.ts
src/movement/collision.ts
src/movement/portalCrossing.ts
tests/movement/moveInsideCell.test.ts
tests/movement/wallCollision.test.ts
tests/movement/portalCrossing.test.ts
tests/movement/forbiddenZoneCollision.test.ts
```

## Player model

Use a simple capsule-like approximation.

Suggested first values:

```text
body radius: 0.25 m
eye height: 1.45 m
body height: 1.60 m
```

Keep these values in `playerBody.ts` with comments. They can become settings later.

## Movement contract

A movement request supplies:

- current `PlayerPose`,
- desired local displacement,
- desired yaw change if needed,
- elapsed time or step scale if needed.

A movement result returns a discriminated union:

- moved,
- crossed portal,
- blocked by wall,
- blocked by floor or ceiling,
- blocked by forbidden zone.

## Portal crossing rule

A crossing is valid only if:

- the motion segment intersects a portal face,
- the intersection point is inside the portal face interior,
- the intersection point is not too close to a portal boundary,
- the body does not intersect a forbidden zone,
- the target pose lies inside the target cell.

The player position and facing direction are transformed by the compiled portal transform.

## Collision simplification allowed

The first pass may use conservative movement:

- small per-frame steps,
- stop-before-impact behavior,
- no fancy sliding,
- no crouching,
- no jumping.

Sliding can be added later if needed for comfort.

## Forbidden zone behavior

The player should stop before a forbidden zone. Do not teleport, push sideways unpredictably, or allow the player to pass through.

The debug result should identify the forbidden zone when possible.

## Tests to write

Required tests:

- player moves in open space,
- player stops at wall,
- player cannot move below floor,
- player cannot move above ceiling,
- player crosses a centered portal,
- player orientation changes according to portal transform,
- crossing too close to a portal side boundary is blocked,
- movement into a portal junction forbidden zone is blocked,
- movement near but outside forbidden radius is allowed.

## Exit criteria

Movement behavior works without rendering. Tests should be able to create a compiled world, move a player through it, and inspect the resulting pose.

## Do not do in this stage

Do not build a renderer.

Do not add VR controls.

Do not add ray tools.

Do not implement theorem logic.
