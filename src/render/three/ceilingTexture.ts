import * as THREE from "three";
import { publicAssetUrl } from "../../glue/assetUrls";
import type { PreparedWorldAssets } from "./preloadWorldAssets";

export const CEILING_TEXTURE_FILE = "photo-wall-texture-pattern.jpg";
export const CEILING_TEXTURE_URL = publicAssetUrl(CEILING_TEXTURE_FILE);

export function createCeilingMaterial(
  repeatX: number,
  repeatY: number,
  assets: PreparedWorldAssets,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.userData.textureUrl = CEILING_TEXTURE_URL;

  const preparedTexture = assets.getTexture(CEILING_TEXTURE_FILE);
  if (!preparedTexture) {
    throw new Error(`Ceiling texture was not preloaded: ${CEILING_TEXTURE_FILE}`);
  }

  material.map = configureCeilingTexture(preparedTexture.clone(), repeatX, repeatY);
  material.needsUpdate = true;
  return material;
}

function configureCeilingTexture(texture: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.name = "ceiling-texture";
  texture.userData.textureUrl = CEILING_TEXTURE_URL;
  texture.userData.repeatX = repeatX;
  texture.userData.repeatY = repeatY;
  return texture;
}
