import { geometryTolerance } from "./tolerances";

export interface Vec2xy {
  readonly x: number;
  readonly y: number;
}

export interface Polygon2xy {
  readonly vertices: readonly Vec2xy[];
}

export type Polygon2 = Polygon2xy;
export type Vec2xz = Vec2xy;
export type Polygon2xz = Polygon2xy;

export type PolygonPointClassification = "inside" | "outside" | "boundary";

export function polygonSignedArea2xy(polygon: Polygon2xy): number {
  let area = 0;

  for (let index = 0; index < polygon.vertices.length; index += 1) {
    const current = polygon.vertices[index];
    const next = polygon.vertices[(index + 1) % polygon.vertices.length];

    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

export function validatePolygon2xy(polygon: Polygon2xy, tolerance = geometryTolerance): void {
  if (polygon.vertices.length < 3) {
    throw new Error("Polygon2xy requires at least three vertices.");
  }

  if (polygonSignedArea2xy(polygon) <= tolerance) {
    throw new Error("Polygon2xy vertices must be counterclockwise in the x/y plane.");
  }
}

export function classifyPointInPolygon2xy(
  polygon: Polygon2xy,
  point: Vec2xy,
  tolerance = geometryTolerance,
): PolygonPointClassification {
  validatePolygon2xy(polygon, tolerance);

  let inside = false;

  for (let index = 0; index < polygon.vertices.length; index += 1) {
    const start = polygon.vertices[index];
    const end = polygon.vertices[(index + 1) % polygon.vertices.length];

    if (pointLiesOnSegment2xy(point, start, end, tolerance)) {
      return "boundary";
    }

    const crossesRay = (start.y > point.y) !== (end.y > point.y);

    if (crossesRay) {
      const xAtPointY = start.x + ((point.y - start.y) * (end.x - start.x)) / (end.y - start.y);

      if (xAtPointY > point.x) {
        inside = !inside;
      }
    }
  }

  return inside ? "inside" : "outside";
}

function pointLiesOnSegment2xy(point: Vec2xy, start: Vec2xy, end: Vec2xy, tolerance: number): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const cross = (point.x - start.x) * dy - (point.y - start.y) * dx;

  if (Math.abs(cross) > tolerance) {
    return false;
  }

  const minX = Math.min(start.x, end.x) - tolerance;
  const maxX = Math.max(start.x, end.x) + tolerance;
  const minY = Math.min(start.y, end.y) - tolerance;
  const maxY = Math.max(start.y, end.y) + tolerance;

  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

export const polygonSignedArea2xz = polygonSignedArea2xy;
export const validatePolygon2xz = validatePolygon2xy;
export const classifyPointInPolygon2xz = classifyPointInPolygon2xy;
