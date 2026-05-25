import { dotVec3, normalizeVec3, type Vec3 } from "./vec3";
import { geometryTolerance } from "./tolerances";

export interface Plane {
  readonly normal: Vec3;
  readonly offset: number;
}

export type PlanePointClassification = "front" | "back" | "boundary";

export function planeFromPointAndNormal(point: Vec3, normal: Vec3): Plane {
  const normalized = normalizeVec3(normal);

  return {
    normal: normalized,
    offset: -dotVec3(normalized, point),
  };
}

export function signedDistanceToPlane(plane: Plane, point: Vec3): number {
  return dotVec3(plane.normal, point) + plane.offset;
}

export function classifyPointToPlane(
  plane: Plane,
  point: Vec3,
  tolerance = geometryTolerance,
): PlanePointClassification {
  const distance = signedDistanceToPlane(plane, point);

  if (distance > tolerance) {
    return "front";
  }

  if (distance < -tolerance) {
    return "back";
  }

  return "boundary";
}
