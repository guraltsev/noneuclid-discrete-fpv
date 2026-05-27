import * as THREE from "three";
import type { AssetObjectSpec, CellObjectSpec } from "../../cell-complex/specs";
import { runtimeDiagnostics } from "./runtimeDiagnostics";
import type { PreparedGltfAsset, PreparedWorldAssets } from "./preloadWorldAssets";
import { worldPointToThree, worldYawRadiansToThree } from "./worldAxes";

export function buildDecorationMesh(
  cellId: string,
  objectSpec: CellObjectSpec,
  assets: PreparedWorldAssets,
): THREE.Object3D {
  if (objectSpec.kind !== "asset") {
    throw new Error(`Cannot build static decoration mesh for object kind "${objectSpec.kind}".`);
  }

  return buildStaticAssetMesh(cellId, objectSpec, assets);
}

function buildStaticAssetMesh(
  cellId: string,
  objectSpec: AssetObjectSpec,
  assets: PreparedWorldAssets,
): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `decoration:${objectSpec.id}`;
  group.position.copy(worldPointToThree(objectSpec.position));
  group.rotation.y = worldYawRadiansToThree(objectSpec.yawRadians ?? 0);
  const diagnostics = runtimeDiagnostics();

  if (objectSpec.scaleXYZ) {
    group.scale.set(objectSpec.scaleXYZ.x, objectSpec.scaleXYZ.y, objectSpec.scaleXYZ.z);
  } else {
    const scale = objectSpec.scale ?? 1;
    group.scale.setScalar(scale);
  }

  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  );
  placeholder.position.y = 0.3;
  placeholder.name = `placeholder:${objectSpec.id}`;
  group.add(placeholder);

  diagnostics.recordAssetInstanceStart(cellId, objectSpec.id, objectSpec.assetPath, objectSpec.kind);
  const prepared = assets.instantiateGltf(objectSpec.assetPath);
  if (!prepared) {
    throw new Error(`Static asset was not preloaded: ${objectSpec.assetPath}`);
  }

  replacePlaceholderWithPreparedAsset(group, placeholder, objectSpec, prepared);
  diagnostics.recordAssetInstanceComplete(cellId, objectSpec.id, objectSpec.assetPath, objectSpec.kind);
  return group;
}

function replacePlaceholderWithPreparedAsset(
  group: THREE.Group,
  placeholder: THREE.Object3D,
  objectSpec: AssetObjectSpec,
  prepared: PreparedGltfAsset,
): void {
  placeholder.removeFromParent();
  disposeObject3D(placeholder);
  prepared.scene.name = `asset:${objectSpec.id}`;
  group.add(prepared.scene);
}

function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose();
    }
    return;
  }

  material.dispose();
}
