import type { VisiblePortalPathRenderState } from "./renderState";

export interface DebugOverlayState {
  readonly visible: boolean;
  readonly visiblePortalPaths?: VisiblePortalPathRenderState;
  readonly inspectedPathLine?: string;
}

export interface DebugOverlay {
  update(state: DebugOverlayState): void;
  dispose(): void;
}

export function createDebugOverlay(container: HTMLElement): DebugOverlay {
  const root = document.createElement("div");
  root.className = "debug-overlay";
  root.hidden = true;
  container.append(root);

  return {
    update(state) {
      root.hidden = !state.visible || !state.visiblePortalPaths;

      if (!state.visiblePortalPaths) {
        root.textContent = "";
        return;
      }

      root.textContent = [
        formatVisiblePortalPathLine(state.visiblePortalPaths),
        state.inspectedPathLine,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
    },
    dispose() {
      root.remove();
    },
  };
}

export function formatVisiblePortalPathLine(state: VisiblePortalPathRenderState): string {
  const budget = state.budgetExhausted ? " / budget" : "";

  return `visible paths: ${state.visiblePathCount} / kept ${state.keptPathCount} / depth ${state.maxVisibleDepth}${budget}`;
}
