import { compileCellComplex } from "./cell-complex/compileCellComplex";
import { createInitialAppState } from "./appState";
import { loadGeometrySpec, readGeometrySelectionOptions, renderGeometryPicker } from "./geometrySelection";
import { createThreeApp } from "./render/three/createThreeApp";
import "./style.css";

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Missing #app element.");
}

void startApp(appElement);

async function startApp(container: HTMLDivElement): Promise<void> {
  const geometryOptions = readGeometrySelectionOptions(window.location);
  const geometrySpec = await loadGeometrySpec(geometryOptions.selectedGeometryId);
  const world = compileCellComplex(geometrySpec);
  const appState = createInitialAppState(world);

  if (geometryOptions.renderPicker) {
    renderGeometryPicker(document.body, geometryOptions.selectedGeometryId);
  }

  createThreeApp(container, appState);
}
