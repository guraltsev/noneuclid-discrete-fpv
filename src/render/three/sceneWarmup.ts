interface SceneWarmupApi {
  request(reason: string): void;
  dispose(): void;
}

const noopWarmup: SceneWarmupApi = {
  request() {},
  dispose() {},
};

let activeSceneWarmup: SceneWarmupApi = noopWarmup;

export function installSceneWarmup(api: SceneWarmupApi): void {
  activeSceneWarmup.dispose();
  activeSceneWarmup = api;
}

export function requestSceneWarmup(reason: string): void {
  activeSceneWarmup.request(reason);
}
