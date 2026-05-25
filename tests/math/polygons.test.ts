import { describe, expect, it } from "vitest";
import {
  classifyPointInPolygon2xz,
  polygonSignedArea2xz,
  validatePolygon2xz,
  type Polygon2xz,
} from "../../src/math/polygons";

describe("polygons", () => {
  const square: Polygon2xz = {
    vertices: [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
    ],
  };

  it("computes signed area in the x/z plane", () => {
    expect(polygonSignedArea2xz(square)).toBe(4);
  });

  it("classifies inside, outside, edge, and vertex points", () => {
    expect(classifyPointInPolygon2xz(square, { x: 0, z: 0 })).toBe("inside");
    expect(classifyPointInPolygon2xz(square, { x: 2, z: 0 })).toBe("outside");
    expect(classifyPointInPolygon2xz(square, { x: 1, z: 0 })).toBe("boundary");
    expect(classifyPointInPolygon2xz(square, { x: -1, z: -1 })).toBe("boundary");
  });

  it("accepts counterclockwise polygons and rejects invalid bases", () => {
    expect(() => validatePolygon2xz(square)).not.toThrow();
    expect(() => validatePolygon2xz({ vertices: square.vertices.slice().reverse() })).toThrow(/counterclockwise/);
    expect(() => validatePolygon2xz({ vertices: square.vertices.slice(0, 2) })).toThrow(/at least three/);
  });
});
