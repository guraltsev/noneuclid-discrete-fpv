import type { CompiledCellComplex } from "../cell-complex/compileCellComplex";
import type { CompiledPrismSide } from "../cell-complex/prismCells";
import { rigidTransform3 } from "../math/rigidTransform3";
import { addVec3, type Vec3 } from "../math/vec3";
import {
  findBoundaryCrossing,
  getCollisionBounds,
  getSideSupport,
  testCellCollision,
  type BlockingReason,
} from "./collision";
import type { DynamicObjectState } from "./dynamicObject";
import { crossDynamicObjectPortal } from "./portalCrossing";

export interface MoveDynamicObjectRequest {
  readonly world: CompiledCellComplex;
  readonly object: DynamicObjectState;
  readonly displacement: Vec3;
}

export interface MoveDynamicObjectResult {
  readonly object: DynamicObjectState;
  readonly attemptedDisplacement: Vec3;
  readonly blocked: boolean;
  readonly blockingReason?: BlockingReason;
  readonly crossedPortal: boolean;
  readonly crossedPortalId?: string;
}

export function moveDynamicObject(request: MoveDynamicObjectRequest): MoveDynamicObjectResult {
  const startCell = request.world.cellsById.get(request.object.cellId);

  if (!startCell) {
    throw new Error(`Cannot move object in missing cell "${request.object.cellId}".`);
  }

  const candidateObject = translateObject(request.object, request.displacement);
  const boundaryCrossing = findBoundaryCrossing(startCell, request.object, candidateObject);

  if (boundaryCrossing?.side.portal && isPortalCrossingReachable(candidateObject, boundaryCrossing.side, startCell.heightMeters)) {
    const sourceCollision = testCellCollision({
      cell: startCell,
      position: candidateObject.localPose.translation,
      collision: candidateObject.collision,
      ignoredPortalSideIndex: boundaryCrossing.side.sideIndex,
    });

    if (sourceCollision.blocked) {
      return blockedResult(request, sourceCollision.reason);
    }

    const crossedObject = crossDynamicObjectPortal(candidateObject, boundaryCrossing.side.portal);
    const targetCell = request.world.cellsById.get(crossedObject.cellId);

    if (!targetCell) {
      throw new Error(`Portal "${boundaryCrossing.side.portal.id}" targets missing cell "${crossedObject.cellId}".`);
    }

    const targetCollision = testCellCollision({
      cell: targetCell,
      position: crossedObject.localPose.translation,
      collision: crossedObject.collision,
      ignoredPortalSideIndex: targetCell.portalsById.get(boundaryCrossing.side.portal.targetPortalId)?.sideIndex,
    });

    if (targetCollision.blocked) {
      return blockedResult(request, targetCollision.reason);
    }

    return {
      object: crossedObject,
      attemptedDisplacement: request.displacement,
      blocked: false,
      crossedPortal: true,
      crossedPortalId: boundaryCrossing.side.portal.id,
    };
  }

  const collision = testCellCollision({
    cell: startCell,
    position: candidateObject.localPose.translation,
    collision: candidateObject.collision,
  });

  if (collision.blocked) {
    const resolvedObject =
      collision.reason === "wall"
        ? resolveBlockedWallPosition(
            candidateObject,
            boundaryCrossing?.side ?? startCell.sides.find((side) => side.sideIndex === collision.sideIndex),
          )
        : request.object;

    return blockedResult(request, collision.reason, resolvedObject);
  }

  return {
    object: candidateObject,
    attemptedDisplacement: request.displacement,
    blocked: false,
    crossedPortal: false,
  };
}

function blockedResult(
  request: MoveDynamicObjectRequest,
  blockingReason: BlockingReason | undefined,
  object = request.object,
): MoveDynamicObjectResult {
  return {
    object,
    attemptedDisplacement: request.displacement,
    blocked: true,
    blockingReason,
    crossedPortal: false,
  };
}

function translateObject(object: DynamicObjectState, displacement: Vec3): DynamicObjectState {
  return {
    ...object,
    localPose: rigidTransform3(
      object.localPose.rotation,
      addVec3(object.localPose.translation, displacement),
    ),
  };
}

function isPortalCrossingReachable(
  object: DynamicObjectState,
  side: CompiledPrismSide,
  heightMeters: number,
): boolean {
  const bounds = getCollisionBounds(object.localPose.translation, object.collision);
  const point = bounds?.center ?? object.localPose.translation;
  const support = bounds ? getSideSupport(side, bounds) : 0;
  const sideProjection = projectPointAlongSideWithBounds(side, point);

  return (
    sideProjection >= 0 &&
    sideProjection <= side.lengthMeters &&
    point.y - (bounds?.halfY ?? 0) >= 0 &&
    point.y + (bounds?.halfY ?? 0) <= heightMeters &&
    getSignedClearanceToSide(side, point, support) < 0
  );
}

function resolveBlockedWallPosition(
  object: DynamicObjectState,
  side: CompiledPrismSide | undefined,
): DynamicObjectState {
  if (!side) {
    return object;
  }

  const bounds = getCollisionBounds(object.localPose.translation, object.collision);
  const point = bounds?.center ?? object.localPose.translation;
  const support = bounds ? getSideSupport(side, bounds) : 0;
  const clearance = getSignedClearanceToSide(side, point, support);
  const inwardOffset = clearance < 0 ? -clearance + 1e-6 : 0;

  if (inwardOffset === 0) {
    return object;
  }

  return translateObject(object, {
    x: side.inwardNormal.x * inwardOffset,
    y: 0,
    z: side.inwardNormal.z * inwardOffset,
  });
}

function projectPointAlongSideWithBounds(side: CompiledPrismSide, point: Vec3): number {
  const edgeX = side.end.x - side.start.x;
  const edgeZ = side.end.z - side.start.z;

  return ((point.x - side.start.x) * edgeX + (point.z - side.start.z) * edgeZ) / side.lengthMeters;
}

function getSignedClearanceToSide(side: CompiledPrismSide, point: Vec3, support: number): number {
  return (point.x - side.start.x) * side.inwardNormal.x + (point.z - side.start.z) * side.inwardNormal.z - support;
}
