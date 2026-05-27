import * as THREE from "three";
import type { CompiledCellComplex } from "../cell-complex/compileCellComplex";
import type { CellObjectSpec, GeodesciMarmotObjectSpec } from "../cell-complex/specs";
import { yawRigidTransform3, transformDirection3, type RigidTransform3 } from "../math/rigidTransform3";
import { vec3 } from "../math/vec3";
import type { DynamicObjectState } from "../movement/dynamicObject";
import { moveDynamicObject } from "../movement/moveDynamicObject";
import { runtimeDiagnostics } from "../render/three/runtimeDiagnostics";
import type { PreparedGltfAsset, PreparedWorldAssets } from "../render/three/preloadWorldAssets";
import { applyWorldRigidTransform } from "../render/three/worldAxes";

const defaultCollisionOffset = { x: 0, y: 0, z: 0.22 } as const;
const defaultAnimationClipName = "Armature|ArmatureAction";
const defaultScale = 0.42;

export interface CreateGeodesciMarmotOptions {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly velocity: { readonly x: number; readonly y: number };
  readonly scale?: number;
  readonly animationClipName?: string;
}

export interface GeodesciMarmotRuntime {
  readonly root: THREE.Object3D;
  readonly cellId: string;
  update(world: CompiledCellComplex, deltaSeconds: number): void;
  syncParent(cellRoots: ReadonlyMap<string, THREE.Object3D>): void;
  reset(cellRoots: ReadonlyMap<string, THREE.Object3D>): void;
}

export function createGeodesciMarmot(options: CreateGeodesciMarmotOptions): GeodesciMarmotObjectSpec {
  return {
    id: options.id,
    kind: "geodesci-marmot",
    assetPath: "racoon-animation/scene.gltf",
    position: options.position,
    scale: options.scale ?? defaultScale,
    yawRadians: yawFromVelocity(options.velocity),
    velocity: options.velocity,
    collision: {
      dx: 0.42,
      dy: 0.72,
      dz: 0.42,
      offset: defaultCollisionOffset,
    },
    animationClipName: options.animationClipName ?? defaultAnimationClipName,
  };
}

export function isGeodesciMarmotObjectSpec(objectSpec: CellObjectSpec): objectSpec is GeodesciMarmotObjectSpec {
  return objectSpec.kind === "geodesci-marmot";
}

export function createGeodesciMarmotRuntime(
  objectSpec: GeodesciMarmotObjectSpec,
  startCellId: string,
  assets: PreparedWorldAssets,
): GeodesciMarmotRuntime {
  const root = new THREE.Group();
  root.name = `geodesci-marmot:${objectSpec.id}`;

  const visual = new THREE.Group();
  visual.scale.setScalar(objectSpec.scale ?? defaultScale);
  root.add(visual);

  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.24, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x8c6a43, roughness: 0.95 }),
  );
  placeholder.position.z = 0.16;
  placeholder.name = `placeholder:${objectSpec.id}`;
  visual.add(placeholder);

  let mixer: THREE.AnimationMixer | undefined;
  const initialState = createDynamicObjectState(objectSpec, startCellId);
  let state = initialState;
  const forwardSpeedMetersPerSecond = Math.hypot(objectSpec.velocity.x, objectSpec.velocity.y);
  const diagnostics = runtimeDiagnostics();

  diagnostics.recordAssetInstanceStart(startCellId, objectSpec.id, objectSpec.assetPath, objectSpec.kind);
  const prepared = assets.instantiateGltf(objectSpec.assetPath);
  if (!prepared) {
    throw new Error(`Animated asset was not preloaded: ${objectSpec.assetPath}`);
  }

  mixer = installPreparedMarmotAsset(visual, placeholder, objectSpec, prepared);
  diagnostics.recordAssetInstanceComplete(startCellId, objectSpec.id, objectSpec.assetPath, objectSpec.kind);
  applyObjectPose(root, state.localPose);

  return {
    root,
    get cellId() {
      return state.cellId;
    },
    update(world, deltaSeconds) {
      mixer?.update(deltaSeconds);

      if (forwardSpeedMetersPerSecond <= 0 || deltaSeconds <= 0) {
        return;
      }

      const displacement = transformDirection3(state.localPose, vec3(0, forwardSpeedMetersPerSecond * deltaSeconds, 0));
      const result = moveDynamicObject({
        world,
        object: state,
        displacement,
      });
      state = result.object;
      applyObjectPose(root, state.localPose);
    },
    syncParent(cellRoots) {
      const targetRoot = cellRoots.get(state.cellId);

      if (targetRoot && root.parent !== targetRoot) {
        targetRoot.add(root);
      }
    },
    reset(cellRoots) {
      state = initialState;
      applyObjectPose(root, state.localPose);
      const targetRoot = cellRoots.get(state.cellId);

      if (targetRoot && root.parent !== targetRoot) {
        targetRoot.add(root);
      }
    },
  };
}

function installPreparedMarmotAsset(
  visual: THREE.Object3D,
  placeholder: THREE.Object3D,
  objectSpec: GeodesciMarmotObjectSpec,
  prepared: PreparedGltfAsset,
): THREE.AnimationMixer | undefined {
  placeholder.removeFromParent();
  disposeObject3D(placeholder);

  const model = prepared.scene;
  model.name = `asset:${objectSpec.id}`;
  visual.add(model);

  if (prepared.animations.length <= 0) {
    return undefined;
  }

  const mixer = new THREE.AnimationMixer(model);
  const clip =
    prepared.animations.find((candidate) => candidate.name === objectSpec.animationClipName) ?? prepared.animations[0];
  mixer.clipAction(clip).play();
  return mixer;
}

function createDynamicObjectState(objectSpec: GeodesciMarmotObjectSpec, cellId: string): DynamicObjectState {
  return {
    cellId,
    localPose: yawRigidTransform3(
      objectSpec.yawRadians ?? yawFromVelocity(objectSpec.velocity),
      vec3(objectSpec.position.x, objectSpec.position.y, objectSpec.position.z),
    ),
    collision: objectSpec.collision,
  };
}

function yawFromVelocity(velocity: GeodesciMarmotObjectSpec["velocity"]): number {
  return Math.atan2(velocity.x, velocity.y);
}

function applyObjectPose(root: THREE.Object3D, pose: RigidTransform3): void {
  applyWorldRigidTransform(root, pose);
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
