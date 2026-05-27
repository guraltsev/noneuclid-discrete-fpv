import * as THREE from "three";
import { publicAssetUrl } from "../../glue/assetUrls";

export const CEILING_TEXTURE_FILE = "photo-wall-texture-pattern.jpg";
export const CEILING_TEXTURE_URL = publicAssetUrl(CEILING_TEXTURE_FILE);

export function createCeilingMaterial(repeatX: number, repeatY: number): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.userData.textureUrl = CEILING_TEXTURE_URL;

  if (typeof Image !== "undefined") {
    material.map = loadCeilingTexture(repeatX, repeatY);
    material.needsUpdate = true;
  }

  return material;
}

function loadCeilingTexture(repeatX: number, repeatY: number): THREE.Texture {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(CEILING_TEXTURE_URL, (loadedTexture) => {
    configureCeilingTexture(loadedTexture, repeatX, repeatY);
  });

  configureCeilingTexture(texture, repeatX, repeatY);
  return texture;
}

function configureCeilingTexture(texture: THREE.Texture, repeatX: number, repeatY: number): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.name = "ceiling-texture";
  texture.userData.textureUrl = CEILING_TEXTURE_URL;
  texture.userData.repeatX = repeatX;
  texture.userData.repeatY = repeatY;
}
