import { identityRigidTransform3 } from "../../math/rigidTransform3";
import type { CellComplexSpec } from "../specs";
import type { PortalSpec } from "../specs";

const sideMeters = 4;
const halfSideMeters = sideMeters / 2;
const squareBase = [
  { x: -halfSideMeters, z: -halfSideMeters },
  { x: halfSideMeters, z: -halfSideMeters },
  { x: halfSideMeters, z: halfSideMeters },
  { x: -halfSideMeters, z: halfSideMeters },
] as const;

export const cube: CellComplexSpec = {
  cells: [
    cubeFace("front", [
      ["bottom", 2],
      ["right", 3],
      ["top", 0],
      ["left", 1],
    ]),
    cubeFace("right", [
      ["bottom", 1],
      ["back", 3],
      ["top", 1],
      ["front", 1],
    ]),
    cubeFace("back", [
      ["bottom", 0],
      ["left", 3],
      ["top", 2],
      ["right", 1],
    ]),
    cubeFace("left", [
      ["bottom", 3],
      ["front", 3],
      ["top", 3],
      ["back", 1],
    ]),
    cubeFace("top", [
      ["front", 2],
      ["right", 2],
      ["back", 2],
      ["left", 2],
    ]),
    cubeFace("bottom", [
      ["back", 0],
      ["right", 0],
      ["front", 0],
      ["left", 0],
    ]),
  ],
};

function cubeFace(
  id: string,
  sideTargets: readonly [
    readonly [targetCellId: string, targetSideIndex: number],
    readonly [targetCellId: string, targetSideIndex: number],
    readonly [targetCellId: string, targetSideIndex: number],
    readonly [targetCellId: string, targetSideIndex: number],
  ],
) {
  return {
    id,
    heightMeters: sideMeters,
    baseVertices: squareBase,
    portals: sideTargets.map(([targetCellId, targetSideIndex], sideIndex): PortalSpec => ({
      id: sideId(sideIndex),
      sideIndex,
      targetCellId,
      targetPortalId: sideId(targetSideIndex),
      transformToTarget: identityRigidTransform3,
    })),
  };
}

function sideId(sideIndex: number): string {
  return `side-${sideIndex}`;
}
