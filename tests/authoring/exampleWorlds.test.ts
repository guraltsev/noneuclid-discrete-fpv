import { describe, expect, it } from "vitest";
import { cube, dodecahedron, tetrahedron, torus, twoPrismLoop } from "../../src/authoring/exampleWorlds";
import type { CellComplexSpec } from "../../src/cell-complex/specs";

const exampleWorlds = [
  ["cube", cube],
  ["dodecahedron", dodecahedron],
  ["tetrahedron", tetrahedron],
  ["torus", torus],
  ["twoPrismLoop", twoPrismLoop],
] as const;

describe("example worlds", () => {
  it.each(exampleWorlds)("does not repeat object assets within %s", (_name, world) => {
    expect(repeatedObjectAssetPaths(world)).toEqual([]);
  });
});

function repeatedObjectAssetPaths(world: CellComplexSpec): string[] {
  const counts = new Map<string, number>();

  for (const cell of world.cells) {
    for (const object of cell.visuals?.objects ?? []) {
      counts.set(object.assetPath, (counts.get(object.assetPath) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([assetPath]) => assetPath)
    .sort();
}
