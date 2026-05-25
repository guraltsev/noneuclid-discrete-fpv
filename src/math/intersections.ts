import type { Plane } from "./planes";
import { signedDistanceToPlane } from "./planes";
import { geometryTolerance } from "./tolerances";
import { addVec3, scaleVec3, subVec3, type Vec3 } from "./vec3";

export type SegmentPlaneIntersection =
  | { readonly kind: "none" }
  | { readonly kind: "point"; readonly t: number; readonly point: Vec3 }
  | { readonly kind: "coplanar" };

export interface IntersectionResult {
  readonly hit: boolean;
  readonly distanceMeters?: number;
}

export function intersectSegmentWithPlane(
  start: Vec3,
  end: Vec3,
  plane: Plane,
  tolerance = geometryTolerance,
): SegmentPlaneIntersection {
  const startDistance = signedDistanceToPlane(plane, start);
  const endDistance = signedDistanceToPlane(plane, end);

  if (Math.abs(startDistance) <= tolerance && Math.abs(endDistance) <= tolerance) {
    return { kind: "coplanar" };
  }

  const denominator = startDistance - endDistance;

  if (Math.abs(denominator) <= tolerance) {
    return { kind: "none" };
  }

  const t = startDistance / denominator;

  if (t < -tolerance || t > 1 + tolerance) {
    return { kind: "none" };
  }

  const clampedT = Math.min(1, Math.max(0, t));

  return {
    kind: "point",
    t: clampedT,
    point: addVec3(start, scaleVec3(subVec3(end, start), clampedT)),
  };
}
