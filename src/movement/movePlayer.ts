import { addVec3, type Vec3 } from "../math/vec3";
import type { PlayerPose } from "./playerPose";

export type MovementCoordinateFrame = "global" | "current-cell";

export interface MoveRequest {
  readonly pose: PlayerPose;
  readonly localDisplacement: Vec3;
  readonly yawDeltaRadians: number;
  readonly pitchDeltaRadians: number;
  readonly coordinateFrame: MovementCoordinateFrame;
}

export type MoveResult = {
  readonly kind: "moved";
  readonly pose: PlayerPose;
};

export function movePlayer(request: MoveRequest): MoveResult {
  const yawRadians = request.pose.yawRadians + request.yawDeltaRadians;
  const pitchRadians = clampPitch(request.pose.pitchRadians + request.pitchDeltaRadians);
  const displacement = resolveLocalDisplacement(request.localDisplacement, yawRadians, request.coordinateFrame);

  return {
    kind: "moved",
    pose: {
      ...request.pose,
      yawRadians,
      pitchRadians,
      position: addVec3(request.pose.position, displacement),
    },
  };
}

function clampPitch(pitchRadians: number): number {
  const maxPitchRadians = Math.PI / 2 - 0.01;

  return Math.max(-maxPitchRadians, Math.min(maxPitchRadians, pitchRadians));
}

function resolveLocalDisplacement(
  localDisplacement: Vec3,
  yawRadians: number,
  coordinateFrame: MovementCoordinateFrame,
): Vec3 {
  const sinYaw = Math.sin(yawRadians);
  const cosYaw = Math.cos(yawRadians);
  const displacement = {
    x: cosYaw * localDisplacement.x + sinYaw * localDisplacement.z,
    y: localDisplacement.y,
    z: -sinYaw * localDisplacement.x + cosYaw * localDisplacement.z,
  };

  if (coordinateFrame === "current-cell") {
    return displacement;
  }

  return displacement;
}
