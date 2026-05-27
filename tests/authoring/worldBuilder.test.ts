import { describe, expect, it } from "vitest";
import { createWorldBuilder, authorEdgeToSideIndex } from "../../src/authoring/worldBuilder";
import { createConvexPrismBaseVertices } from "../../src/cell-complex/prismBase";
import { worldObjectLibrary } from "../../src/world-objects/library";

const squareBase = createConvexPrismBaseVertices([
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]);

describe("worldBuilder", () => {
  it("creates polygon faces with expected colors and vertices", () => {
    const builder = createWorldBuilder();

    builder.PolygonFace("front", "#d95f5f", squareBase);

    const spec = builder.build();

    expect(spec.cells).toHaveLength(1);
    expect(spec.cells[0]).toMatchObject({
      id: "front",
      heightMeters: 15,
      baseVertices: [
        { x: -1, z: -1 },
        { x: 1, z: -1 },
        { x: 1, z: 1 },
        { x: -1, z: 1 },
      ],
      visuals: {
        floorColor: "#d95f5f",
        objects: [],
      },
    });
  });

  it("creates reciprocal directed portals from a single Portal call", () => {
    const builder = createWorldBuilder();

    builder.PolygonFace("front", "#f00", squareBase);
    builder.PolygonFace("right", "#0f0", squareBase);
    builder.Portal("front", [1, 2], "right", [0, 3]);

    const spec = builder.build();
    const front = spec.cells.find((cell) => cell.id === "front");
    const right = spec.cells.find((cell) => cell.id === "right");

    expect(front?.portals).toEqual([
      {
        id: "edge-1-2",
        sideIndex: 1,
        targetCellId: "right",
        targetPortalId: "edge-0-3",
      },
    ]);
    expect(right?.portals).toEqual([
      {
        id: "edge-0-3",
        sideIndex: 3,
        targetCellId: "front",
        targetPortalId: "edge-1-2",
      },
    ]);
  });

  it("maps authored edge pairs to the expected side indexes", () => {
    expect(authorEdgeToSideIndex(4, [0, 1])).toBe(0);
    expect(authorEdgeToSideIndex(4, [1, 2])).toBe(1);
    expect(authorEdgeToSideIndex(4, [2, 3])).toBe(2);
    expect(authorEdgeToSideIndex(4, [0, 3])).toBe(3);
  });

  it("rejects invalid edges and duplicate portal assignments clearly", () => {
    const builder = createWorldBuilder();

    builder.PolygonFace("front", "#f00", squareBase);
    builder.PolygonFace("right", "#0f0", squareBase);

    expect(() => builder.Portal("front", [1, 3], "right", [0, 3])).toThrowError(
      "Invalid edge [1, 3]; use consecutive pairs like [1, 2] or the wraparound pair [0, 3].",
    );

    builder.Portal("front", [1, 2], "right", [0, 3]);

    expect(() => builder.Portal("front", [1, 2], "right", [0, 1])).toThrowError(
      'Face "front" already has a portal on edge-1-2.',
    );
  });

  it("attaches library objects to the requested face", () => {
    const builder = createWorldBuilder();

    builder.PolygonFace("front", "#f00", squareBase);

    builder.OnFace("front", [
      worldObjectLibrary.house("front-house", {
        position: [-0.5, 0, 0.25],
        scale: 3,
        yaw: 0.2,
      }),
      worldObjectLibrary.geodesic_marmot("front-runner", {
        position: [-0.8, 0, -0.2],
        velocity: [1.2, 0.4],
      }),
    ]);

    const spec = builder.build();

    expect(spec.cells[0]?.visuals?.objects).toMatchObject([
      {
        id: "front-house",
        kind: "asset",
        position: { x: -0.5, y: 0, z: 0.25 },
      },
      {
        id: "front-runner",
        kind: "geodesci-marmot",
        velocity: { x: 1.2, z: 0.4 },
      },
    ]);
  });
});
