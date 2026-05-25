import type { AssetObjectSpec } from "../cell-complex/specs";

export interface StaticObjectAuthoringParams {
  readonly position: readonly [x: number, y: number, z: number];
  readonly scale?: number;
  readonly scaleXYZ?: readonly [x: number, y: number, z: number];
  readonly yaw?: number;
}

export function createStaticAssetObject(
  id: string,
  assetPath: string,
  params: StaticObjectAuthoringParams,
): AssetObjectSpec {
  return {
    id,
    kind: "asset",
    assetPath,
    position: {
      x: params.position[0],
      y: params.position[1],
      z: params.position[2],
    },
    scale: params.scale,
    scaleXYZ: params.scaleXYZ
      ? {
          x: params.scaleXYZ[0],
          y: params.scaleXYZ[1],
          z: params.scaleXYZ[2],
        }
      : undefined,
    yawRadians: params.yaw,
  };
}
