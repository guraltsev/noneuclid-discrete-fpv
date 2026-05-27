import { compileCellComplex } from "./cell-complex/compileCellComplex";
import { describeGeometrySpec } from "./cell-complex/describeGeometry";
import { createInitialAppState } from "./appState";
import { loadWorldSpec } from "./authoring/worldCatalog";
import { hasDebugOption } from "./glue/debugOptions";
import { readLaunchOptions } from "./glue/readLaunchOptions";
import { renderLaunchControls } from "./glue/renderLaunchControls";
import { createThreeApp } from "./render/three/createThreeApp";
import { preloadWorldAssets } from "./render/three/preloadWorldAssets";
import { installRuntimeDiagnostics } from "./render/three/runtimeDiagnostics";
import "./style.css";

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Missing #app element.");
}

void startApp(appElement);

async function startApp(container: HTMLDivElement): Promise<void> {
  const launchOptions = readLaunchOptions(window.location);
  const geometrySpec = await loadWorldSpec(launchOptions.selectedWorldId);
  console.info(describeGeometrySpec(geometrySpec));
  const world = compileCellComplex(geometrySpec);
  installRuntimeDiagnostics(world, hasDebugOption(launchOptions.debugOptions, "runtime-diagnostics"));
  const assets = await preloadWorldAssets(world);
  const appState = createInitialAppState(world);

  if (launchOptions.renderWorldPicker || launchOptions.debugEnabled) {
    renderLaunchControls(document.body, launchOptions);
  }

  createThreeApp(container, appState, { debugOptions: launchOptions.debugOptions, assets });
}
