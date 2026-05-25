import type { PortalSpec } from "../cell-complex/specs";
import { applyRigidTransform3 } from "../math/rigidTransform3";
import type { PlayerPose } from "./playerPose";

export function crossPortal(pose: PlayerPose, portal: PortalSpec): PlayerPose {
  return {
    ...pose,
    cellId: portal.targetCellId,
    position: applyRigidTransform3(portal.transformToTarget, pose.position),
  };
}
