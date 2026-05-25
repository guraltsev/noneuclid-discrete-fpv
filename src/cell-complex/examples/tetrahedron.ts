import { identityRigidTransform3 } from "../../math/rigidTransform3";
import type { PrismCellSpec } from "../specs";
import type { CellComplexSpec } from "../specs";

const triangleBase = [
  { x: 0, z: -2 },
  { x: 1.732, z: 1 },
  { x: -1.732, z: 1 },
] as const;

export const tetrahedron: CellComplexSpec = {
  cells: [
    tetraFace("face-a", ["face-b", "face-c", "face-d"]),
    tetraFace("face-b", ["face-a", "face-d", "face-c"]),
    tetraFace("face-c", ["face-a", "face-b", "face-d"]),
    tetraFace("face-d", ["face-a", "face-c", "face-b"]),
  ],
};

function tetraFace(id: string, neighbors: readonly [string, string, string]): PrismCellSpec {
  return {
    id,
    heightMeters: 3,
    baseVertices: triangleBase,
    portals: neighbors.map((neighborId, sideIndex) => ({
      id: `edge-${sideIndex}`,
      sideIndex,
      targetCellId: neighborId,
      targetPortalId: `edge-${sideIndex}`,
      transformToTarget: identityRigidTransform3,
    })),
  };
}
