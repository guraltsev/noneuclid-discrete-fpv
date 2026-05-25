import type { CompiledPrismCell, CompiledPrismSide } from "../cell-complex/prismCells";
import type { SingularityCollisionColumn } from "../cell-complex/forbiddenZones";
import type { Vec3 } from "../math/vec3";
import type { DynamicObjectState, SimpleCollisionBox } from "./dynamicObject";

export type BlockingReason = "wall" | "floor" | "ceiling" | "forbidden-zone";

export interface CollisionResult {
  readonly blocked: boolean;
  readonly reason?: BlockingReason;
  readonly sideIndex?: number;
}

export interface CollisionCandidate {
  readonly cell: CompiledPrismCell;
  readonly position: Vec3;
  readonly collision?: SimpleCollisionBox;
  readonly ignoredPortalSideIndex?: number;
}

export interface SimpleBoxBounds {
  readonly center: Vec3;
  readonly halfX: number;
  readonly halfY: number;
  readonly halfZ: number;
}

export interface BoundaryCrossing {
  readonly side: CompiledPrismSide;
  readonly startClearance: number;
  readonly endClearance: number;
  readonly endProjection: number;
}

const zeroOffset = { x: 0, y: 0, z: 0 };

export function testCellCollision(candidate: CollisionCandidate): CollisionResult {
  const bounds = getCollisionBounds(candidate.position, candidate.collision);

  if (!bounds) {
    return { blocked: false };
  }

  const { center, halfY } = bounds;

  if (center.y - halfY < 0) {
    return { blocked: true, reason: "floor" };
  }

  if (center.y + halfY > candidate.cell.heightMeters) {
    return { blocked: true, reason: "ceiling" };
  }

  for (const column of candidate.cell.singularityColumns) {
    if (simpleBoxIntersectsSingularityColumn(bounds, column)) {
      return { blocked: true, reason: "forbidden-zone" };
    }
  }

  for (const side of candidate.cell.sides) {
    if (side.sideIndex === candidate.ignoredPortalSideIndex) {
      continue;
    }

    const distance = signedDistanceToSide(side, center);
    const support = getSideSupport(side, bounds);

    if (distance < support) {
      return { blocked: true, reason: "wall", sideIndex: side.sideIndex };
    }
  }

  return { blocked: false };
}

export function getCollisionBounds(
  position: Vec3,
  collision?: SimpleCollisionBox,
): SimpleBoxBounds | undefined {
  if (!collision) {
    return undefined;
  }

  const offset = collision.offset ?? zeroOffset;

  return {
    center: {
      x: position.x + offset.x,
      y: position.y + offset.y,
      z: position.z + offset.z,
    },
    halfX: collision.dx / 2,
    halfY: collision.dy / 2,
    halfZ: collision.dz / 2,
  };
}

function simpleBoxIntersectsSingularityColumn(
  box: SimpleBoxBounds,
  column: SingularityCollisionColumn,
): boolean {
  const columnHalfHeight = column.heightMeters / 2;
  const boxMinY = box.center.y - box.halfY;
  const boxMaxY = box.center.y + box.halfY;
  const columnMinY = column.center.y - columnHalfHeight;
  const columnMaxY = column.center.y + columnHalfHeight;

  if (boxMaxY <= columnMinY || boxMinY >= columnMaxY) {
    return false;
  }

  const closestX = clamp(column.center.x, box.center.x - box.halfX, box.center.x + box.halfX);
  const closestZ = clamp(column.center.z, box.center.z - box.halfZ, box.center.z + box.halfZ);
  const dx = column.center.x - closestX;
  const dz = column.center.z - closestZ;

  return dx * dx + dz * dz < column.radiusMeters * column.radiusMeters;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function signedDistanceToSide(side: CompiledPrismSide, point: Vec3): number {
  return (point.x - side.start.x) * side.inwardNormal.x + (point.z - side.start.z) * side.inwardNormal.z;
}

export function getSideSupport(side: CompiledPrismSide, bounds: SimpleBoxBounds): number {
  return Math.abs(side.inwardNormal.x) * bounds.halfX + Math.abs(side.inwardNormal.z) * bounds.halfZ;
}

export function projectPointAlongSide(side: CompiledPrismSide, point: Vec3): number {
  const edgeX = side.end.x - side.start.x;
  const edgeZ = side.end.z - side.start.z;

  return ((point.x - side.start.x) * edgeX + (point.z - side.start.z) * edgeZ) / side.lengthMeters;
}

export function findBoundaryCrossing(
  cell: CompiledPrismCell,
  startObject: DynamicObjectState,
  endObject: DynamicObjectState,
): BoundaryCrossing | undefined {
  const startBounds = getCollisionBounds(startObject.localPose.translation, startObject.collision);
  const endBounds = getCollisionBounds(endObject.localPose.translation, endObject.collision);
  const startPoint = startBounds?.center ?? startObject.localPose.translation;
  const endPoint = endBounds?.center ?? endObject.localPose.translation;

  let crossing: BoundaryCrossing | undefined;

  for (const side of cell.sides) {
    const startSupport = startBounds ? getSideSupport(side, startBounds) : 0;
    const endSupport = endBounds ? getSideSupport(side, endBounds) : 0;
    const startClearance = signedDistanceToSide(side, startPoint) - startSupport;
    const endClearance = signedDistanceToSide(side, endPoint) - endSupport;

    if (startClearance >= 0 && endClearance < 0) {
      if (!crossing || endClearance < crossing.endClearance) {
        crossing = {
          side,
          startClearance,
          endClearance,
          endProjection: projectPointAlongSide(side, endPoint),
        };
      }
    }
  }

  return crossing;
}
