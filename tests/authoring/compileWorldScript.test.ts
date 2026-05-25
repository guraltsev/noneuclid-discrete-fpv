import { describe, expect, it } from "vitest";
import { compileWorldScript } from "../../src/authoring/compileWorldScript";
import { compileCellComplex } from "../../src/cell-complex/compileCellComplex";
import cubeWorldSource from "../../src/examples/cube.world.js?raw";

describe("compileWorldScript", () => {
  it("compiles a minimal script into a valid CellComplexSpec", () => {
    const spec = compileWorldScript(`
triangle = [
  [0, 0],
  [4, 0],
  [2, 3],
];

PolygonFace("triangle-room", "#f6c04d", triangle);
OnFace("triangle-room", [
  tree("triangle-tree", {
    position: [0, 0, 0],
    scale: 1.2,
  }),
]);
`);

    expect(spec).toMatchObject({
      cells: [
        {
          id: "triangle-room",
          heightMeters: 4,
          baseVertices: [
            { x: 0, z: 0 },
            { x: 4, z: 0 },
            { x: 2, z: 3 },
          ],
          visuals: {
            floorColor: "#f6c04d",
            objects: [{ id: "triangle-tree", assetPath: "low_poly_tree_wind/scene.gltf" }],
          },
        },
      ],
    });
  });

  it("compiles the cube world script and produces a spec that passes runtime compilation", () => {
    const spec = compileWorldScript(cubeWorldSource, {
      sourceName: "cube.world.js",
    });
    const compiled = compileCellComplex(spec);
    const front = compiled.cellsById.get("front");

    expect(spec.cells).toHaveLength(6);
    expect(compiled.cells).toHaveLength(6);
    expect(front?.portalsById.get("edge-1-2")?.targetCellId).toBe("right");
    expect(front?.objects).toHaveLength(2);
  });

  it("reports readable authoring errors for malformed scripts", () => {
    expect(() =>
      compileWorldScript(
        `
square = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

PolygonFace("front", "#f00", square);
PolygonFace("right", "#0f0", square);
Portal("front", [1, 3], "right", [0, 3]);
`,
        { sourceName: "bad.world.js" },
      ),
    ).toThrowError(
      'World script "bad.world.js" failed: Invalid edge [1, 3]; use consecutive pairs like [1, 2] or the wraparound pair [0, 3].',
    );
  });
});
