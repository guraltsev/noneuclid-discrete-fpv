import type { Vec3 } from "../math/vec3";

export interface PlayerPose {
  readonly cellId: string;
  readonly position: Vec3;
  readonly yawRadians: number;
  readonly pitchRadians: number;
}

export function createDefaultPlayerPose(cellId: string): PlayerPose {
  return {
    cellId,
    position: { x: 0, y: 0, z: 0 },
    yawRadians: 0,
    pitchRadians: 0,
  };
}
