import * as THREE from "three";
import type { AppState } from "../../appState";
import type { DebugOptionId } from "../../glue/debugOptions";
import { movePlayer } from "../../movement/movePlayer";
import { DEFAULT_PLAYER_EYE_HEIGHT_METERS } from "../../movement/playerBody";
import { createDefaultPlayerPose } from "../../movement/playerPose";
import {
  createGeodesciMarmotRuntime,
  isGeodesciMarmotObjectSpec,
  type GeodesciMarmotRuntime,
} from "../../world-objects/geodesciMarmot";
import { buildCellMesh } from "./buildCellMesh";
import { createDesktopControls } from "./desktopControls";
import { prerenderCells } from "./prerenderCells";
import { runtimeDiagnostics } from "./runtimeDiagnostics";
import { installSceneWarmup } from "./sceneWarmup";

export interface ThreeApp {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  dispose(): void;
}

export interface ThreeAppOptions {
  readonly debugOptions: readonly DebugOptionId[];
}

export function createThreeApp(container: HTMLElement, appState: AppState, options: ThreeAppOptions): ThreeApp {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1c1c);
  scene.environment = null;
  scene.fog = new THREE.Fog(0x2f2f2f, 0, 200);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.append(renderer.domElement);
  const controls = createDesktopControls(renderer.domElement);
  const clock = new THREE.Clock();
  const diagnostics = runtimeDiagnostics();
  let animationFrameId = 0;
  let playerPose = appState.playerPose;

  const light = new THREE.HemisphereLight(0xffffff, 0x304050, 2);
  scene.add(light);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(3, 6, 4);
  scene.add(keyLight);

  const cellMeshes = new Map<string, THREE.Object3D>();
  const cellSideCounts = new Map(appState.world.cells.map((cell) => [cell.id, cell.sideCount]));
  const marmotRuntimes: GeodesciMarmotRuntime[] = [];

  for (const cell of appState.world.cells) {
    const cellMesh = buildCellMesh(cell, {
      debugOptions: options.debugOptions,
      eyeHeightMeters: DEFAULT_PLAYER_EYE_HEIGHT_METERS,
      cellSideCounts,
    });
    cellMesh.visible = false;
    cellMeshes.set(cell.id, cellMesh);
    scene.add(cellMesh);

    for (const objectSpec of cell.objects) {
      if (!isGeodesciMarmotObjectSpec(objectSpec)) {
        continue;
      }

      const runtime = createGeodesciMarmotRuntime(objectSpec, cell.id);
      runtime.syncParent(cellMeshes);
      marmotRuntimes.push(runtime);
    }
  }

  let scheduledWarmupReason: string | undefined;
  let warmupTimerId: number | undefined;

  installSceneWarmup({
    request(reason) {
      scheduledWarmupReason = scheduledWarmupReason ? `${scheduledWarmupReason}, ${reason}` : reason;

      if (warmupTimerId !== undefined) {
        return;
      }

      warmupTimerId = window.setTimeout(() => {
        warmupTimerId = undefined;
        const reasonText = scheduledWarmupReason ?? "unknown";
        scheduledWarmupReason = undefined;
        const startMs = performance.now();
        applyCameraPose();
        prerenderCells({
          renderer,
          scene,
          camera,
          cellMeshes,
          activeCellId: playerPose.cellId,
        });
        diagnostics.recordWarmup(reasonText, performance.now() - startMs);
      }, 0);
    },
    dispose() {
      if (warmupTimerId !== undefined) {
        window.clearTimeout(warmupTimerId);
        warmupTimerId = undefined;
      }
    },
  });

  function applyCameraPose(): void {
    camera.position.set(
      playerPose.position.x,
      playerPose.position.y + DEFAULT_PLAYER_EYE_HEIGHT_METERS,
      playerPose.position.z,
    );
    camera.rotation.set(playerPose.pitchRadians, playerPose.yawRadians, 0, "YXZ");
  }

  prerenderCells({
    renderer,
    scene,
    camera,
    cellMeshes,
    activeCellId: playerPose.cellId,
  });

  let visibleCellId: string | undefined = playerPose.cellId;

  function updateVisibleCell(): void {
    if (visibleCellId === playerPose.cellId) {
      return;
    }

    for (const [cellId, cellMesh] of cellMeshes) {
      cellMesh.visible = cellId === playerPose.cellId;
    }

    visibleCellId = playerPose.cellId;
  }

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function renderFrame(): void {
    const frameStartMs = performance.now();
    const deltaSeconds = clock.getDelta();
    const frame = controls.consumeFrame(deltaSeconds);
    const frameBeforeMoveMs = performance.now();
    const previousCellId = playerPose.cellId;
    let moveResult:
      | {
          readonly pose: typeof playerPose;
          readonly crossedPortal: boolean;
          readonly crossedPortalId?: string;
        }
      | undefined;

    if (frame.resetRequested) {
      playerPose = createDefaultPlayerPose(appState.playerPose.cellId);
      for (const runtime of marmotRuntimes) {
        runtime.reset(cellMeshes);
      }
    } else {
      moveResult = movePlayer({
        world: appState.world,
        pose: playerPose,
        body: appState.playerBody,
        localDisplacement: frame.localDisplacement,
        yawDeltaRadians: frame.yawDeltaRadians,
        pitchDeltaRadians: frame.pitchDeltaRadians,
        coordinateFrame: "global",
      });
      playerPose = moveResult.pose;
    }
    const frameAfterMoveMs = performance.now();

    if (moveResult?.crossedPortal && playerPose.cellId !== previousCellId) {
      diagnostics.recordCellEntered(previousCellId, playerPose.cellId, moveResult.crossedPortalId ?? "unknown-portal");
    }

    for (const runtime of marmotRuntimes) {
      runtime.update(appState.world, frame.resetRequested ? 0 : deltaSeconds);
      runtime.syncParent(cellMeshes);
    }

    updateVisibleCell();
    applyCameraPose();
    const frameBeforeRenderMs = performance.now();
    renderer.render(scene, camera);
    const frameAfterRenderMs = performance.now();
    diagnostics.recordFrame(playerPose.cellId, {
      totalMs: frameAfterRenderMs - frameStartMs,
      moveMs: frameAfterMoveMs - frameBeforeMoveMs,
      renderMs: frameAfterRenderMs - frameBeforeRenderMs,
    });
    animationFrameId = window.requestAnimationFrame(renderFrame);
  }

  window.addEventListener("resize", onResize);
  applyCameraPose();
  renderFrame();

  return {
    scene,
    renderer,
    dispose() {
      installSceneWarmup({
        request() {},
        dispose() {},
      });
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      for (const cellMesh of cellMeshes.values()) {
        disposeObject3D(cellMesh);
      }
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
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
