import * as THREE from "three";
import type { AppState } from "../../appState";
import { movePlayer } from "../../movement/movePlayer";
import { DEFAULT_PLAYER_EYE_HEIGHT_METERS } from "../../movement/playerBody";
import { createDefaultPlayerPose } from "../../movement/playerPose";
import { createDesktopControls } from "./desktopControls";

export interface ThreeApp {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  dispose(): void;
}

export function createThreeApp(container: HTMLElement, appState: AppState): ThreeApp {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101820);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.append(renderer.domElement);
  const controls = createDesktopControls(renderer.domElement);
  const clock = new THREE.Clock();
  let animationFrameId = 0;
  let playerPose = appState.playerPose;

  const light = new THREE.HemisphereLight(0xffffff, 0x304050, 2);
  scene.add(light);

  const grid = new THREE.GridHelper(12, 24, 0x8fb8c0, 0x263840);
  scene.add(grid);

  const geometry = new THREE.BoxGeometry(4, 3, 4);
  const material = new THREE.MeshBasicMaterial({ color: 0x5fb3b3, wireframe: true });
  const roomPreview = new THREE.Mesh(geometry, material);
  roomPreview.position.y = 1.5;
  roomPreview.name = `Preview for ${appState.world.cells.length} prism cells`;
  scene.add(roomPreview);

  function applyCameraPose(): void {
    camera.position.set(
      playerPose.position.x,
      playerPose.position.y + DEFAULT_PLAYER_EYE_HEIGHT_METERS,
      playerPose.position.z,
    );
    camera.rotation.set(playerPose.pitchRadians, playerPose.yawRadians, 0, "YXZ");
  }

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function renderFrame(): void {
    const frame = controls.consumeFrame(clock.getDelta());

    if (frame.resetRequested) {
      playerPose = createDefaultPlayerPose(appState.playerPose.cellId);
    } else {
      playerPose = movePlayer({
        pose: playerPose,
        localDisplacement: frame.localDisplacement,
        yawDeltaRadians: frame.yawDeltaRadians,
        pitchDeltaRadians: frame.pitchDeltaRadians,
        coordinateFrame: "global",
      }).pose;
    }

    applyCameraPose();
    renderer.render(scene, camera);
    animationFrameId = window.requestAnimationFrame(renderFrame);
  }

  window.addEventListener("resize", onResize);
  applyCameraPose();
  renderFrame();

  return {
    scene,
    renderer,
    dispose() {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
