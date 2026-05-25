import type { CellComplexSpec } from "../specs";

const sideMeters = 4;
const halfSideMeters = sideMeters / 2;

export const cube: CellComplexSpec = {
  cells: [
    {
      id: "cube-room",
      heightMeters: sideMeters,
      baseVertices: [
        { x: -halfSideMeters, z: -halfSideMeters },
        { x: halfSideMeters, z: -halfSideMeters },
        { x: halfSideMeters, z: halfSideMeters },
        { x: -halfSideMeters, z: halfSideMeters },
      ],
      portals: [],
    },
  ],
};
