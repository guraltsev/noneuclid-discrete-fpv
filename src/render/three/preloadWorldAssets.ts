import * as THREE from "three";
import type { CompiledCellComplex } from "../../cell-complex/compileCellComplex";
import { publicAssetUrl } from "../../glue/assetUrls";
import { CEILING_TEXTURE_FILE } from "./ceilingTexture";
import { PORTAL_WALL_TEXTURE_FILE } from "./portalWallTexture";
import { runtimeDiagnostics } from "./runtimeDiagnostics";

export async function preloadWorldAssets(world: CompiledCellComplex): Promise<void> {
  const assetPaths = new Set<string>();
  const diagnostics = runtimeDiagnostics();

  for (const cell of world.cells) {
    for (const object of cell.objects) {
      assetPaths.add(object.assetPath);
    }
  }

  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const gltfLoader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  await Promise.allSettled([
    ...[PORTAL_WALL_TEXTURE_FILE, CEILING_TEXTURE_FILE].map((assetPath) => {
      diagnostics.recordPreloadStart(assetPath, "texture");
      return textureLoader.loadAsync(publicAssetUrl(assetPath)).then(
        (texture) => {
          diagnostics.recordPreloadComplete(assetPath, "texture");
          return texture;
        },
        (error: unknown) => {
          diagnostics.recordPreloadError(assetPath, "texture", error);
          throw error;
        },
      );
    }),
    ...[...assetPaths].map((assetPath) => {
      diagnostics.recordPreloadStart(assetPath, "gltf");
      return gltfLoader.loadAsync(publicAssetUrl(assetPath)).then(
        (gltf) => {
          diagnostics.recordPreloadComplete(assetPath, "gltf");
          return gltf;
        },
        (error: unknown) => {
          diagnostics.recordPreloadError(assetPath, "gltf", error);
          throw error;
        },
      );
    }),
  ]);
}
