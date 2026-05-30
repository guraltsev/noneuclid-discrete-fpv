import type { PortalInstanceRenderState, VisiblePortalPathRenderState, XrDebugRenderState } from "./renderState";

export interface DebugOverlayState {
  readonly visible: boolean;
  readonly visiblePortalPaths?: VisiblePortalPathRenderState;
  readonly portalInstances?: PortalInstanceRenderState;
  readonly xr?: XrDebugRenderState;
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
      const hasContent = Boolean(state.visiblePortalPaths || state.portalInstances || state.xr || state.inspectedPathLine);
      root.hidden = !state.visible || !hasContent;

      if (!hasContent) {
        root.textContent = "";
        return;
      }

      root.textContent = [
        state.visiblePortalPaths ? formatVisiblePortalPathLine(state.visiblePortalPaths) : undefined,
        state.portalInstances ? formatPortalInstanceLine(state.portalInstances) : undefined,
        state.portalInstances ? formatPortalArchetypeLine(state.portalInstances) : undefined,
        state.xr ? formatXrDebugLine(state.xr) : undefined,
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

export function formatPortalInstanceLine(state: PortalInstanceRenderState): string {
  return `portal instances: ${state.renderedInstanceCount} / ${state.totalCapacity} slots`;
}

export function formatPortalArchetypeLine(state: PortalInstanceRenderState): string {
  const clipOverflow = state.clipPolygonOverflowPathIds.length + state.visiblePathOverflowCount;
  return `archetypes: ${state.archetypeCount} / overflow ${state.capacityOverflowCount} / clip ${clipOverflow}`;
}

export function formatXrDebugLine(state: XrDebugRenderState): string {
  const blocked = state.lastMovementBlocked
    ? `blocked ${state.lastBlockingReason ?? "unknown"}`
    : "not blocked";
  const portal = state.lastCrossedPortalId ? ` / portal ${state.lastCrossedPortalId}` : "";
  const root = state.sharedRenderRootCellId ? ` / xr root ${state.sharedRenderRootCellId}` : "";

  return [
    `xr ${state.sessionStatus}`,
    state.secureContext ? "secure" : "insecure",
    `input ${state.activeInputSource}`,
    `cell ${state.currentCellId}`,
    `pos ${formatVec3(state.playerPosition)}`,
    `yaw ${roundNumber(state.yawRadians)}`,
    blocked,
  ].join(" / ") + portal + root;
}

function formatVec3(point: { readonly x: number; readonly y: number; readonly z: number }): string {
  return `(${roundNumber(point.x)}, ${roundNumber(point.y)}, ${roundNumber(point.z)})`;
}

function roundNumber(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
