import { geometryTolerance } from "./tolerances";

export interface Vec2xz {
  readonly x: number;
  readonly z: number;
}

export interface Polygon2xz {
  readonly vertices: readonly Vec2xz[];
}

export type Polygon2 = Polygon2xz;

export type PolygonPointClassification = "inside" | "outside" | "boundary";

export function polygonSignedArea2xz(polygon: Polygon2xz): number {
  let area = 0;

  for (let index = 0; index < polygon.vertices.length; index += 1) {
    const current = polygon.vertices[index];
    const next = polygon.vertices[(index + 1) % polygon.vertices.length];

    area += current.x * next.z - next.x * current.z;
  }

  return area / 2;
}

export function validatePolygon2xz(polygon: Polygon2xz, tolerance = geometryTolerance): void {
  if (polygon.vertices.length < 3) {
    throw new Error("Polygon2xz requires at least three vertices.");
  }

  if (polygonSignedArea2xz(polygon) <= tolerance) {
    throw new Error("Polygon2xz vertices must be counterclockwise in the x/z plane.");
  }
}

export function classifyPointInPolygon2xz(
  polygon: Polygon2xz,
  point: Vec2xz,
  tolerance = geometryTolerance,
): PolygonPointClassification {
  validatePolygon2xz(polygon, tolerance);

  let inside = false;

  for (let index = 0; index < polygon.vertices.length; index += 1) {
    const start = polygon.vertices[index];
    const end = polygon.vertices[(index + 1) % polygon.vertices.length];

    if (pointLiesOnSegment2xz(point, start, end, tolerance)) {
      return "boundary";
    }

    const crossesRay = (start.z > point.z) !== (end.z > point.z);

    if (crossesRay) {
      const xAtPointZ = start.x + ((point.z - start.z) * (end.x - start.x)) / (end.z - start.z);

      if (xAtPointZ > point.x) {
        inside = !inside;
      }
    }
  }

  return inside ? "inside" : "outside";
}

function pointLiesOnSegment2xz(point: Vec2xz, start: Vec2xz, end: Vec2xz, tolerance: number): boolean {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const cross = (point.x - start.x) * dz - (point.z - start.z) * dx;

  if (Math.abs(cross) > tolerance) {
    return false;
  }

  const minX = Math.min(start.x, end.x) - tolerance;
  const maxX = Math.max(start.x, end.x) + tolerance;
  const minZ = Math.min(start.z, end.z) - tolerance;
  const maxZ = Math.max(start.z, end.z) + tolerance;

  return point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ;
}
