import { geometryTolerance } from "./tolerances";

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Runtime geometry uses cell-local coordinates:
 * x is horizontal right/east, y is horizontal depth/forward, and z is vertical height.
 */
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scaleVec3(v: Vec3, scale: number): Vec3 {
  return vec3(v.x * scale, v.y * scale, v.z * scale);
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function lengthVec3(v: Vec3): number {
  return Math.sqrt(dotVec3(v, v));
}

export function normalizeVec3(v: Vec3, tolerance = geometryTolerance): Vec3 {
  const length = lengthVec3(v);

  if (length <= tolerance) {
    throw new Error("Cannot normalize a near-zero Vec3.");
  }

  return scaleVec3(v, 1 / length);
}

export function distanceVec3(a: Vec3, b: Vec3): number {
  return lengthVec3(subVec3(a, b));
}

export function almostEqualVec3(a: Vec3, b: Vec3, tolerance = geometryTolerance): boolean {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.z - b.z) <= tolerance
  );
}
