import * as THREE from "three";

export interface PrerenderCellsOptions {
  readonly renderer: Pick<THREE.WebGLRenderer, "compile" | "render">;
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly cellMeshes: ReadonlyMap<string, THREE.Object3D>;
  readonly activeCellId: string;
  readonly warmupViewsByCellId?: ReadonlyMap<string, readonly CellWarmupView[]>;
}

export interface CellWarmupView {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly yawRadians: number;
  readonly pitchRadians?: number;
}

export function prerenderCells(options: PrerenderCellsOptions): void {
  const visibilityByCellId = new Map<string, boolean>();
  const cameraMatrixAutoUpdate = options.camera.matrixAutoUpdate;
  const cameraPosition = options.camera.position.clone();
  const cameraQuaternion = options.camera.quaternion.clone();
  const cameraRotationOrder = options.camera.rotation.order;

  for (const [cellId, cellMesh] of options.cellMeshes) {
    visibilityByCellId.set(cellId, cellMesh.visible);
    cellMesh.visible = true;
    cellMesh.userData = {
      ...cellMesh.userData,
      prerenderedByDefault: true,
    };
  }

  options.renderer.compile(options.scene, options.camera);
  options.renderer.render(options.scene, options.camera);
  prerenderCellWarmupViews(options);

  for (const [cellId, cellMesh] of options.cellMeshes) {
    cellMesh.visible = cellId === options.activeCellId;
    cellMesh.userData = {
      ...cellMesh.userData,
      prerenderedByDefault: true,
      prerendered: true,
      previousVisible: visibilityByCellId.get(cellId) ?? false,
    };
  }

  options.camera.matrixAutoUpdate = cameraMatrixAutoUpdate;
  options.camera.position.copy(cameraPosition);
  options.camera.quaternion.copy(cameraQuaternion);
  options.camera.rotation.order = cameraRotationOrder;
  options.camera.updateMatrixWorld(true);
}

function prerenderCellWarmupViews(options: PrerenderCellsOptions): void {
  if (!options.warmupViewsByCellId || options.warmupViewsByCellId.size === 0) {
    return;
  }

  for (const [cellId, cellMesh] of options.cellMeshes) {
    const warmupViews = options.warmupViewsByCellId.get(cellId);

    if (!warmupViews || warmupViews.length === 0) {
      continue;
    }

    for (const [, otherCellMesh] of options.cellMeshes) {
      otherCellMesh.visible = false;
    }

    cellMesh.visible = true;

    for (const view of warmupViews) {
      options.camera.position.set(view.position.x, view.position.y, view.position.z);
      options.camera.rotation.set(view.pitchRadians ?? 0, view.yawRadians, 0, "YXZ");
      options.camera.updateMatrixWorld(true);
      options.renderer.render(options.scene, options.camera);
    }
  }
}
