export interface RenderState {
  readonly frameCount: number;
  readonly visiblePortalPaths?: VisiblePortalPathRenderState;
}

export interface VisiblePortalPathRenderState {
  readonly candidatePathCount: number;
  readonly keptPathCount: number;
  readonly visiblePathCount: number;
  readonly visiblePathCountByDepth: readonly { readonly depth: number; readonly count: number }[];
  readonly maxVisibleDepth: number;
  readonly clippedByCameraCount: number;
  readonly clippedByAreaCount: number;
  readonly clippedByBudgetCount: number;
  readonly budgetExhausted: boolean;
}
