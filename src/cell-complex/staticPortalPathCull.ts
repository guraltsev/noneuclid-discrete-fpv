import type { CompiledCellComplex } from "./compileCellComplex";
import { forbiddenPortalJunctionRadiusMeters } from "./forbiddenZones";
import {
  createPortalPathTable,
  type PortalPathTable,
  type PortalPathTablesByRootCell,
  type PortalRenderPath,
  type PortalRenderStep,
} from "./portalPaths";
import type { CompiledPortal } from "./specs";
import type { CompiledPrismSide } from "./prismCells";
import {
  composeRigidTransform3,
  identityRigidTransform3,
  invertRigidTransform3,
  transformPoint3,
  type RigidTransform3,
} from "../math/rigidTransform3";
import { vec3, type Vec3 } from "../math/vec3";

interface Vec2 {
  readonly x: number;
  readonly y: number;
}

interface Segment2 {
  readonly start: Vec2;
  readonly end: Vec2;
}

interface TauSigmaBox {
  readonly tauMin: number;
  readonly tauMax: number;
  readonly sigmaMin: number;
  readonly sigmaMax: number;
}

interface HalfPlane2 {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

interface ProjectiveTauSigmaResult {
  readonly mayExist: boolean;
  readonly status: "accepted" | "rejected" | "fallback-degenerate-projective-map";
}

export interface StaticPortalPathCullOptions {
  readonly toleranceMeters: number;
  readonly maxKeptPathsPerRoot?: number;
  readonly keepRejectedPathDetails?: boolean;
  readonly debugTauSigmaDisagreements?: boolean;
}

interface TauSigmaDisagreementStats {
  exactAccepted: number;
  fallbackAccepted: number;
  loggedExactAccepted: number;
  loggedFallbackAccepted: number;
}

export interface BuildStaticallyCulledPortalPathTablesOptions extends StaticPortalPathCullOptions {
  readonly maxDepth: number;
  readonly skipImmediateReverse?: boolean;
  readonly onDepthComplete?: (status: StaticPortalPathDepthStatus) => void;
}

export interface StaticPortalPathDepthStatus {
  readonly rootCellId: string;
  readonly depth: number;
  readonly processedPathCount: number;
  readonly acceptedPathCount: number;
  readonly rejectedPathCount: number;
  readonly totalKeptPathCount: number;
  readonly totalRejectedPathCount: number;
  readonly budgetExhausted: boolean;
}

export interface StaticPortalPathCullResult {
  readonly tables: PortalPathTablesByRootCell;
  readonly summariesByRootCellId: ReadonlyMap<string, StaticPortalPathCullSummary>;
}

export interface StaticPortalPathCullSummary {
  readonly rootCellId: string;
  readonly inputPathCount: number;
  readonly keptPathCount: number;
  readonly rejectedPathCount: number;
  readonly rejectedByReason: ReadonlyMap<StaticPortalPathRejectReason, number>;
  readonly rejectedPaths: readonly RejectedPortalRenderPath[];
}

export type StaticPortalPathRejectReason =
  | "outside-ancestor-portal-plane"
  | "no-static-line-transversal"
  | "outside-ancestor-portal-slab"
  | "outside-ancestor-vertical-range"
  | "static-path-budget";

export interface RejectedPortalRenderPath {
  readonly pathId: number;
  readonly reason: StaticPortalPathRejectReason;
  readonly details?: string;
}

export function buildStaticallyCulledPortalPathTables(
  world: CompiledCellComplex,
  options: BuildStaticallyCulledPortalPathTablesOptions,
): StaticPortalPathCullResult {
  if (!Number.isInteger(options.maxDepth) || options.maxDepth < 0) {
    throw new Error(`Portal path maxDepth must be a non-negative integer; received ${options.maxDepth}.`);
  }

  if (options.toleranceMeters < 0) {
    throw new Error(`Static portal path cull tolerance must be non-negative; received ${options.toleranceMeters}.`);
  }

  const tablesByRootCellId = new Map<string, PortalPathTable>();
  const summariesByRootCellId = new Map<string, StaticPortalPathCullSummary>();
  const skipImmediateReverse = options.skipImmediateReverse ?? true;
  const cullTolerance = Math.max(options.toleranceMeters, forbiddenPortalJunctionRadiusMeters / 2);
  const tauSigmaDebugStats = options.debugTauSigmaDisagreements ? createTauSigmaDisagreementStats() : undefined;

  for (const rootCell of world.cells) {
    const rootPath: PortalRenderPath = {
      id: 0,
      rootCellId: rootCell.id,
      destinationCellId: rootCell.id,
      depth: 0,
      steps: [],
      destinationFromRoot: identityRigidTransform3,
      rootFromDestination: identityRigidTransform3,
    };
    const keptPaths: PortalRenderPath[] = [rootPath];
    const rejectedPaths: RejectedPortalRenderPath[] = [];
    const rejectedByReason = new Map<StaticPortalPathRejectReason, number>();
    let frontier: PortalRenderPath[] = [rootPath];
    const budget = options.maxKeptPathsPerRoot ?? Number.POSITIVE_INFINITY;
    let nextPathId = 1;
    let budgetExhausted = false;

    options.onDepthComplete?.({
      rootCellId: rootCell.id,
      depth: 0,
      processedPathCount: 1,
      acceptedPathCount: 1,
      rejectedPathCount: 0,
      totalKeptPathCount: keptPaths.length,
      totalRejectedPathCount: rejectedPaths.length,
      budgetExhausted,
    });

    for (let depth = 1; depth <= options.maxDepth && frontier.length > 0 && !budgetExhausted; depth += 1) {
      const nextFrontier: PortalRenderPath[] = [];
      let processedPathCount = 0;
      let acceptedPathCount = 0;
      let rejectedPathCount = 0;

      for (const parent of frontier) {
        const sourceCell = world.cellsById.get(parent.destinationCellId);

        if (!sourceCell) {
          throw new Error(`Portal path reached missing cell "${parent.destinationCellId}".`);
        }

        for (const portal of sourceCell.portals) {
          if (skipImmediateReverse && isImmediateReverse(parent, portal)) {
            continue;
          }

          processedPathCount += 1;

          if (keptPaths.length >= budget) {
            const rejection = createRejection(nextPathId, "static-path-budget", options.keepRejectedPathDetails);
            rejectedPaths.push(rejection);
            rejectedByReason.set(rejection.reason, (rejectedByReason.get(rejection.reason) ?? 0) + 1);
            rejectedPathCount += 1;
            budgetExhausted = true;
            break;
          }

          const destinationFromRoot = composeRigidTransform3(portal.transformToTarget, parent.destinationFromRoot);
          const child: PortalRenderPath = {
            id: nextPathId,
            rootCellId: rootCell.id,
            destinationCellId: portal.targetCellId,
            depth,
            parentPathId: parent.id,
            steps: [
              ...parent.steps,
              {
                sourceCellId: sourceCell.id,
                sourcePortalId: portal.id,
                sourcePortalSideIndex: portal.sideIndex,
                targetCellId: portal.targetCellId,
                targetPortalId: portal.targetPortalId,
              },
            ],
            destinationFromRoot,
            rootFromDestination: invertRigidTransform3(destinationFromRoot),
          };
          nextPathId += 1;

          const rejection =
            rejectGeometrically(world, child, cullTolerance, options.keepRejectedPathDetails) ??
            rejectByTauSigmaTransversal(
              world,
              child,
              options.toleranceMeters,
              options.keepRejectedPathDetails,
              options.debugTauSigmaDisagreements,
              tauSigmaDebugStats,
            );

          if (rejection) {
            rejectedPaths.push(rejection);
            rejectedByReason.set(rejection.reason, (rejectedByReason.get(rejection.reason) ?? 0) + 1);
            rejectedPathCount += 1;
            continue;
          }

          keptPaths.push(child);
          nextFrontier.push(child);
          acceptedPathCount += 1;
        }

        if (budgetExhausted) {
          break;
        }
      }

      options.onDepthComplete?.({
        rootCellId: rootCell.id,
        depth,
        processedPathCount,
        acceptedPathCount,
        rejectedPathCount,
        totalKeptPathCount: keptPaths.length,
        totalRejectedPathCount: rejectedPaths.length,
        budgetExhausted,
      });

      frontier = nextFrontier;
    }

    tablesByRootCellId.set(rootCell.id, createPortalPathTable(rootCell.id, options.maxDepth, keptPaths));
    summariesByRootCellId.set(rootCell.id, {
      rootCellId: rootCell.id,
      inputPathCount: keptPaths.length + rejectedPaths.length,
      keptPathCount: keptPaths.length,
      rejectedPathCount: rejectedPaths.length,
      rejectedByReason,
      rejectedPaths: options.keepRejectedPathDetails ? rejectedPaths : rejectedPaths.map(stripRejectionDetails),
    });
  }

  logTauSigmaDisagreementSummary(tauSigmaDebugStats);

  return {
    tables: {
      maxDepth: options.maxDepth,
      tablesByRootCellId,
    },
    summariesByRootCellId,
  };
}

export function staticallyCullPortalPathTables(
  world: CompiledCellComplex,
  pathTables: PortalPathTablesByRootCell,
  options: StaticPortalPathCullOptions,
): StaticPortalPathCullResult {
  if (options.toleranceMeters < 0) {
    throw new Error(`Static portal path cull tolerance must be non-negative; received ${options.toleranceMeters}.`);
  }

  const tablesByRootCellId = new Map<string, PortalPathTable>();
  const summariesByRootCellId = new Map<string, StaticPortalPathCullSummary>();
  const tauSigmaDebugStats = options.debugTauSigmaDisagreements ? createTauSigmaDisagreementStats() : undefined;

  for (const [rootCellId, table] of pathTables.tablesByRootCellId) {
    if (!world.cellsById.has(rootCellId)) {
      throw new Error(`Static portal path culling received unknown root cell "${rootCellId}".`);
    }

    const keptPaths: PortalRenderPath[] = [];
    const rejectedPaths: RejectedPortalRenderPath[] = [];
    const rejectedByReason = new Map<StaticPortalPathRejectReason, number>();
    const budget = options.maxKeptPathsPerRoot ?? Number.POSITIVE_INFINITY;
    const cullTolerance = Math.max(options.toleranceMeters, forbiddenPortalJunctionRadiusMeters / 2);

    for (const path of table.paths) {
      const geometricRejection =
        path.depth === 0
          ? undefined
          : rejectGeometrically(world, path, cullTolerance, options.keepRejectedPathDetails) ??
            rejectByTauSigmaTransversal(
              world,
              path,
              options.toleranceMeters,
              options.keepRejectedPathDetails,
              options.debugTauSigmaDisagreements,
              tauSigmaDebugStats,
            );
      const budgetRejection =
        path.depth > 0 && !geometricRejection && keptPaths.length >= budget
          ? createRejection(path.id, "static-path-budget", options.keepRejectedPathDetails)
          : undefined;
      const rejection = geometricRejection ?? budgetRejection;

      if (rejection) {
        rejectedPaths.push(rejection);
        rejectedByReason.set(rejection.reason, (rejectedByReason.get(rejection.reason) ?? 0) + 1);
        continue;
      }

      keptPaths.push(path);
    }

    tablesByRootCellId.set(rootCellId, createPortalPathTable(rootCellId, table.maxDepth, keptPaths));
    summariesByRootCellId.set(rootCellId, {
      rootCellId,
      inputPathCount: table.paths.length,
      keptPathCount: keptPaths.length,
      rejectedPathCount: rejectedPaths.length,
      rejectedByReason,
      rejectedPaths: options.keepRejectedPathDetails ? rejectedPaths : rejectedPaths.map(stripRejectionDetails),
    });
  }

  logTauSigmaDisagreementSummary(tauSigmaDebugStats);

  return {
    tables: {
      maxDepth: pathTables.maxDepth,
      tablesByRootCellId,
    },
    summariesByRootCellId,
  };
}

function rejectGeometrically(
  world: CompiledCellComplex,
  path: PortalRenderPath,
  toleranceMeters: number,
  includeDetails: boolean | undefined,
): RejectedPortalRenderPath | undefined {
  const destinationCell = world.cellsById.get(path.destinationCellId);

  if (!destinationCell) {
    throw new Error(`Static portal path culling reached missing destination cell "${path.destinationCellId}".`);
  }

  const boundInRoot = prismBoundVertices(destinationCell.baseVertices, destinationCell.heightMeters).map((point) =>
    transformPoint3(path.rootFromDestination, point),
  );
  let sourceFromRoot: RigidTransform3 = identityRigidTransform3;

  for (const step of path.steps) {
    const sourceCell = world.cellsById.get(step.sourceCellId);
    const portal = sourceCell?.portalsById.get(step.sourcePortalId);

    if (!sourceCell || !portal) {
      throw new Error(`Static portal path culling reached missing portal "${step.sourceCellId}:${step.sourcePortalId}".`);
    }

    const boundInSource = boundInRoot.map((point) => transformPoint3(sourceFromRoot, point));
    const rejection = rejectAgainstPortalAperture(
      path.id,
      sourceCell.id,
      sourceCell.sides[portal.sideIndex],
      sourceCell.heightMeters,
      boundInSource,
      toleranceMeters,
      includeDetails,
    );

    if (rejection) {
      return rejection;
    }

    sourceFromRoot = composeRigidTransform3(portal.transformToTarget, sourceFromRoot);
  }

  return undefined;
}

function isImmediateReverse(parent: PortalRenderPath, portal: CompiledPortal): boolean {
  const previousStep: PortalRenderStep | undefined = parent.steps[parent.steps.length - 1];

  if (!previousStep) {
    return false;
  }

  return (
    parent.destinationCellId === previousStep.targetCellId &&
    portal.id === previousStep.targetPortalId &&
    portal.targetCellId === previousStep.sourceCellId &&
    portal.reciprocalPortalId === previousStep.sourcePortalId
  );
}

function rejectByTauSigmaTransversal(
  world: CompiledCellComplex,
  path: PortalRenderPath,
  toleranceMeters: number,
  includeDetails: boolean | undefined,
  debugDisagreements: boolean | undefined,
  debugStats: TauSigmaDisagreementStats | undefined,
): RejectedPortalRenderPath | undefined {
  if (path.steps.length <= 2) {
    return undefined;
  }

  const portalSegments = portalSegmentsInRoot(world, path);

  if (portalSegments.length !== path.steps.length) {
    return undefined;
  }

  const rootPortal = portalSegments[0];
  const leafPortal = portalSegments[portalSegments.length - 1];
  const intermediatePortals = portalSegments.slice(1, -1);
  const feasible = tauSigmaLineTransversalMayExist(rootPortal, leafPortal, intermediatePortals, {
    pathId: path.id,
    toleranceMeters,
    debugDisagreements,
    debugStats,
  });

  if (feasible) {
    return undefined;
  }

  return {
    pathId: path.id,
    reason: "no-static-line-transversal",
    ...(includeDetails ? { details: `Rejected path ${path.id}; no tau/sigma line intersects all portal windows.` } : {}),
  };
}

function portalSegmentsInRoot(world: CompiledCellComplex, path: PortalRenderPath): readonly Segment2[] {
  const segments: Segment2[] = [];
  let sourceFromRoot: RigidTransform3 = identityRigidTransform3;

  for (const step of path.steps) {
    const sourceCell = world.cellsById.get(step.sourceCellId);
    const portal = sourceCell?.portalsById.get(step.sourcePortalId);

    if (!sourceCell || !portal) {
      throw new Error(`Static portal path culling reached missing portal "${step.sourceCellId}:${step.sourcePortalId}".`);
    }

    const side = sourceCell.sides[portal.sideIndex];
    const rootFromSource = invertRigidTransform3(sourceFromRoot);
    const start = transformPoint3(rootFromSource, vec3(side.start.x, side.start.y, 0));
    const end = transformPoint3(rootFromSource, vec3(side.end.x, side.end.y, 0));

    segments.push({
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
    });
    sourceFromRoot = composeRigidTransform3(portal.transformToTarget, sourceFromRoot);
  }

  return segments;
}

function tauSigmaLineTransversalMayExist(
  rootPortal: Segment2,
  leafPortal: Segment2,
  windows: readonly Segment2[],
  options: {
    readonly pathId: number;
    readonly toleranceMeters: number;
    readonly debugDisagreements?: boolean;
    readonly debugStats?: TauSigmaDisagreementStats;
  },
): boolean {
  const toleranceMeters = options.toleranceMeters;

  if (!affineIntervalLineTransversalMayExist(rootPortal, leafPortal, windows, toleranceMeters)) {
    const projective = options.debugDisagreements
      ? projectiveTauSigmaLineTransversalMayExist(rootPortal, leafPortal, windows, toleranceMeters)
      : undefined;

    if (projective?.mayExist) {
      logTauSigmaDisagreement({
        pathId: options.pathId,
        projectiveStatus: projective.status,
        rootPortal,
        leafPortal,
        windows,
        stats: options.debugStats,
      });
    }

    return false;
  }

  return projectiveTauSigmaLineTransversalMayExist(rootPortal, leafPortal, windows, toleranceMeters).mayExist;
}

function createTauSigmaDisagreementStats(): TauSigmaDisagreementStats {
  return {
    exactAccepted: 0,
    fallbackAccepted: 0,
    loggedExactAccepted: 0,
    loggedFallbackAccepted: 0,
  };
}

function logTauSigmaDisagreement(options: {
  readonly pathId: number;
  readonly projectiveStatus: ProjectiveTauSigmaResult["status"];
  readonly rootPortal: Segment2;
  readonly leafPortal: Segment2;
  readonly windows: readonly Segment2[];
  readonly stats?: TauSigmaDisagreementStats;
}): void {
  const isExact = options.projectiveStatus === "accepted";
  const stats = options.stats;
  const maxLogsPerKind = 1;

  if (stats) {
    if (isExact) {
      stats.exactAccepted += 1;

      if (stats.loggedExactAccepted >= maxLogsPerKind) {
        return;
      }

      stats.loggedExactAccepted += 1;
    } else {
      stats.fallbackAccepted += 1;
      return;
    }
  }

  const message = isExact
    ? "Tau-sigma culling disagreement: affine rejected but projective accepted exactly."
    : "Tau-sigma culling note: affine rejected; projective kept only by conservative fallback.";
  console.warn(`${message} ${JSON.stringify({
    pathId: options.pathId,
    projectiveStatus: options.projectiveStatus,
    rootPortal: cloneSegmentForDebug(options.rootPortal),
    leafPortal: cloneSegmentForDebug(options.leafPortal),
    windows: options.windows.map(cloneSegmentForDebug),
  })}`);
}

function cloneSegmentForDebug(segment: Segment2): Segment2 {
  return {
    start: { x: segment.start.x, y: segment.start.y },
    end: { x: segment.end.x, y: segment.end.y },
  };
}

function logTauSigmaDisagreementSummary(stats: TauSigmaDisagreementStats | undefined): void {
  if (!stats || (stats.exactAccepted === 0 && stats.fallbackAccepted === 0)) {
    return;
  }

  console.warn("Tau-sigma culling disagreement summary.", {
    exactAccepted: stats.exactAccepted,
    fallbackAccepted: stats.fallbackAccepted,
    loggedExactAccepted: stats.loggedExactAccepted,
    loggedFallbackAccepted: stats.loggedFallbackAccepted,
  });
}

function projectiveTauSigmaLineTransversalMayExist(
  rootPortal: Segment2,
  leafPortal: Segment2,
  windows: readonly Segment2[],
  toleranceMeters: number,
): ProjectiveTauSigmaResult {
  const rootDirection = sub2(rootPortal.end, rootPortal.start);
  const leafDirection = sub2(leafPortal.end, leafPortal.start);
  const rootLeafLinesIntersect = Math.abs(cross2(rootDirection, leafDirection)) > toleranceMeters;
  const projectedSegments = projectSegmentsToParallelRootLeaf([rootPortal, leafPortal, ...windows], toleranceMeters);

  if (!projectedSegments) {
    return {
      mayExist: true,
      status: "fallback-degenerate-projective-map",
    };
  }

  const projectedRoot = projectedSegments[0];
  const projectedLeaf = projectedSegments[1];
  const projectedWindows = projectedSegments.slice(2);
  const rootDenominatorLine = parameterCoordinateLine(projectedRoot.start.y, projectedRoot.end.y, "tau");
  const leafDenominatorLine = parameterCoordinateLine(projectedLeaf.start.y, projectedLeaf.end.y, "sigma");
  let domains: Vec2[][] = rootLeafLinesIntersect
    ? clipDomainsBySameSigns([unitTauSigmaSquare()], rootDenominatorLine, leafDenominatorLine, toleranceMeters)
    : [unitTauSigmaSquare()];

  if (domains.length === 0) {
    return {
      mayExist: false,
      status: "rejected",
    };
  }

  for (const window of projectedWindows) {
    if (rootLeafLinesIntersect) {
      domains = clipDomainsToWindowChart(domains, rootDenominatorLine, leafDenominatorLine, window, toleranceMeters);

      if (domains.length === 0) {
        return {
          mayExist: false,
          status: "rejected",
        };
      }
    }

    const startLine = tauSigmaLineForPoint(projectedRoot, projectedLeaf, window.start);
    const endLine = tauSigmaLineForPoint(projectedRoot, projectedLeaf, window.end);
    const rootLine = parameterLineForPointOnSegment(window, projectedRoot.start, projectedRoot.end, "tau");
    const leafLine = parameterLineForPointOnSegment(window, projectedLeaf.start, projectedLeaf.end, "sigma");
    const lineCrossingDomains = clipDomainsByOppositeSigns(domains, startLine, endLine, toleranceMeters);
    const nextDomains = clipDomainsByOppositeSigns(lineCrossingDomains, rootLine, leafLine, toleranceMeters);

    if (nextDomains.length === 0) {
      return {
        mayExist: false,
        status: "rejected",
      };
    }

    domains = pruneTauSigmaDomains(nextDomains, toleranceMeters);
  }

  domains = filterDomainsByProjectedWitness(projectedRoot, projectedLeaf, projectedWindows, domains, toleranceMeters);

  return {
    mayExist: domains.length > 0,
    status: domains.length > 0 ? "accepted" : "rejected",
  };
}

function filterDomainsByProjectedWitness(
  projectedRoot: Segment2,
  projectedLeaf: Segment2,
  projectedWindows: readonly Segment2[],
  domains: readonly Vec2[][],
  toleranceMeters: number,
): Vec2[][] {
  return domains.filter((domain) => {
    const centroid = polygonCentroid(domain);
    const candidates = centroid ? [centroid, ...domain] : domain;

    return candidates.some((candidate) =>
      projectedWindows.every((window) => projectedRayIntersectsWindow(projectedRoot, projectedLeaf, candidate, window, toleranceMeters)),
    );
  });
}

function polygonCentroid(polygon: readonly Vec2[]): Vec2 | undefined {
  if (polygon.length === 0) {
    return undefined;
  }

  let x = 0;
  let y = 0;

  for (const point of polygon) {
    x += point.x;
    y += point.y;
  }

  return {
    x: x / polygon.length,
    y: y / polygon.length,
  };
}

function projectedRayIntersectsWindow(
  projectedRoot: Segment2,
  projectedLeaf: Segment2,
  parameter: Vec2,
  window: Segment2,
  toleranceMeters: number,
): boolean {
  const rayStart = interpolate2(projectedRoot.start, projectedRoot.end, parameter.x);
  const rayEnd = interpolate2(projectedLeaf.start, projectedLeaf.end, parameter.y);
  const windowStartSide = orient2(rayStart, rayEnd, window.start);
  const windowEndSide = orient2(rayStart, rayEnd, window.end);
  const rayStartSide = orient2(window.start, window.end, rayStart);
  const rayEndSide = orient2(window.start, window.end, rayEnd);

  return (
    valuesMayHaveOppositeSigns(windowStartSide, windowEndSide, toleranceMeters) &&
    valuesMayHaveOppositeSigns(rayStartSide, rayEndSide, toleranceMeters)
  );
}

function valuesMayHaveOppositeSigns(first: number, second: number, toleranceMeters: number): boolean {
  return !((first > toleranceMeters && second > toleranceMeters) || (first < -toleranceMeters && second < -toleranceMeters));
}

function affineIntervalLineTransversalMayExist(
  rootPortal: Segment2,
  leafPortal: Segment2,
  windows: readonly Segment2[],
  toleranceMeters: number,
): boolean {
  const stack: TauSigmaBox[] = [{ tauMin: 0, tauMax: 1, sigmaMin: 0, sigmaMax: 1 }];
  const maxSplits = 8;
  let splitCount = 0;

  while (stack.length > 0) {
    const box = stack.pop()!;

    if (windows.some((window) => !affineBoxMayContainRayThroughWindow(rootPortal, leafPortal, window, box, toleranceMeters))) {
      continue;
    }

    if (splitCount >= maxSplits || tauSigmaBoxDiameter(box) <= 1e-3) {
      return true;
    }

    splitCount += 1;
    stack.push(...splitTauSigmaBox(box));
  }

  return false;
}

function affineBoxMayContainRayThroughWindow(
  rootPortal: Segment2,
  leafPortal: Segment2,
  window: Segment2,
  box: TauSigmaBox,
  toleranceMeters: number,
): boolean {
  const rootSide = affineOrientationInterval(
    window.start,
    window.end,
    rootPortal.start,
    rootPortal.end,
    box.tauMin,
    box.tauMax,
  );
  const leafSide = affineOrientationInterval(
    window.start,
    window.end,
    leafPortal.start,
    leafPortal.end,
    box.sigmaMin,
    box.sigmaMax,
  );

  if (intervalsHaveSameStrictSign(rootSide, leafSide, toleranceMeters)) {
    return false;
  }

  const windowStartSide = movingRayEndpointOrientationInterval(rootPortal, leafPortal, window.start, box);
  const windowEndSide = movingRayEndpointOrientationInterval(rootPortal, leafPortal, window.end, box);

  return !intervalsHaveSameStrictSign(windowStartSide, windowEndSide, toleranceMeters);
}

function affineOrientationInterval(
  lineStart: Vec2,
  lineEnd: Vec2,
  segmentStart: Vec2,
  segmentEnd: Vec2,
  parameterMin: number,
  parameterMax: number,
): readonly [number, number] {
  const valueAtMin = orient2(lineStart, lineEnd, interpolate2(segmentStart, segmentEnd, parameterMin));
  const valueAtMax = orient2(lineStart, lineEnd, interpolate2(segmentStart, segmentEnd, parameterMax));

  return [Math.min(valueAtMin, valueAtMax), Math.max(valueAtMin, valueAtMax)];
}

function movingRayEndpointOrientationInterval(
  rootPortal: Segment2,
  leafPortal: Segment2,
  point: Vec2,
  box: TauSigmaBox,
): readonly [number, number] {
  const values = [
    orient2(interpolate2(rootPortal.start, rootPortal.end, box.tauMin), interpolate2(leafPortal.start, leafPortal.end, box.sigmaMin), point),
    orient2(interpolate2(rootPortal.start, rootPortal.end, box.tauMin), interpolate2(leafPortal.start, leafPortal.end, box.sigmaMax), point),
    orient2(interpolate2(rootPortal.start, rootPortal.end, box.tauMax), interpolate2(leafPortal.start, leafPortal.end, box.sigmaMin), point),
    orient2(interpolate2(rootPortal.start, rootPortal.end, box.tauMax), interpolate2(leafPortal.start, leafPortal.end, box.sigmaMax), point),
  ];

  return [Math.min(...values), Math.max(...values)];
}

function intervalsHaveSameStrictSign(
  first: readonly [number, number],
  second: readonly [number, number],
  toleranceMeters: number,
): boolean {
  return (
    (first[0] > toleranceMeters && second[0] > toleranceMeters) ||
    (first[1] < -toleranceMeters && second[1] < -toleranceMeters)
  );
}

function splitTauSigmaBox(box: TauSigmaBox): readonly TauSigmaBox[] {
  const tauSize = box.tauMax - box.tauMin;
  const sigmaSize = box.sigmaMax - box.sigmaMin;

  if (tauSize >= sigmaSize) {
    const mid = (box.tauMin + box.tauMax) / 2;
    return [
      { ...box, tauMax: mid },
      { ...box, tauMin: mid },
    ];
  }

  const mid = (box.sigmaMin + box.sigmaMax) / 2;
  return [
    { ...box, sigmaMax: mid },
    { ...box, sigmaMin: mid },
  ];
}

function tauSigmaBoxDiameter(box: TauSigmaBox): number {
  return Math.max(box.tauMax - box.tauMin, box.sigmaMax - box.sigmaMin);
}

function clipDomainsByOppositeSigns(
  domains: readonly Vec2[][],
  firstLine: HalfPlane2,
  secondLine: HalfPlane2,
  toleranceMeters: number,
): Vec2[][] {
  const nextDomains: Vec2[][] = [];

  for (const domain of domains) {
    const firstPositive = clipConvexPolygonByHalfPlane(
      clipConvexPolygonByHalfPlane(domain, firstLine, toleranceMeters),
      negateHalfPlane(secondLine),
      toleranceMeters,
    );
    const secondPositive = clipConvexPolygonByHalfPlane(
      clipConvexPolygonByHalfPlane(domain, negateHalfPlane(firstLine), toleranceMeters),
      secondLine,
      toleranceMeters,
    );

    if (firstPositive.length > 0) {
      nextDomains.push(firstPositive);
    }

    if (secondPositive.length > 0) {
      nextDomains.push(secondPositive);
    }
  }

  return pruneTauSigmaDomains(nextDomains, toleranceMeters);
}

function clipDomainsBySameSigns(
  domains: readonly Vec2[][],
  firstLine: HalfPlane2,
  secondLine: HalfPlane2,
  toleranceMeters: number,
): Vec2[][] {
  const nextDomains: Vec2[][] = [];

  for (const domain of domains) {
    const bothPositive = clipConvexPolygonByHalfPlane(
      clipConvexPolygonByHalfPlane(domain, firstLine, toleranceMeters),
      secondLine,
      toleranceMeters,
    );
    const bothNegative = clipConvexPolygonByHalfPlane(
      clipConvexPolygonByHalfPlane(domain, negateHalfPlane(firstLine), toleranceMeters),
      negateHalfPlane(secondLine),
      toleranceMeters,
    );

    if (bothPositive.length > 0) {
      nextDomains.push(bothPositive);
    }

    if (bothNegative.length > 0) {
      nextDomains.push(bothNegative);
    }
  }

  return pruneTauSigmaDomains(nextDomains, toleranceMeters);
}

function clipDomainsToWindowChart(
  domains: readonly Vec2[][],
  rootDenominatorLine: HalfPlane2,
  leafDenominatorLine: HalfPlane2,
  window: Segment2,
  toleranceMeters: number,
): Vec2[][] {
  const windowSign = Math.sign((window.start.y + window.end.y) / 2);

  if (windowSign === 0) {
    return domains as Vec2[][];
  }

  const rootLine = windowSign > 0 ? rootDenominatorLine : negateHalfPlane(rootDenominatorLine);
  const leafLine = windowSign > 0 ? leafDenominatorLine : negateHalfPlane(leafDenominatorLine);

  return pruneTauSigmaDomains(
    domains
      .map((domain) =>
        clipConvexPolygonByHalfPlane(
          clipConvexPolygonByHalfPlane(domain, rootLine, toleranceMeters),
          leafLine,
          toleranceMeters,
        ),
      )
      .filter((domain) => domain.length > 0),
    toleranceMeters,
  );
}

function parameterCoordinateLine(startValue: number, endValue: number, parameterName: "tau" | "sigma"): HalfPlane2 {
  const slope = endValue - startValue;

  return parameterName === "tau"
    ? {
        a: slope,
        b: 0,
        c: startValue,
      }
    : {
        a: 0,
        b: slope,
        c: startValue,
      };
}

function projectSegmentsToParallelRootLeaf(
  segments: readonly Segment2[],
  toleranceMeters: number,
): readonly Segment2[] | undefined {
  const root = segments[0];
  const leaf = segments[1];
  const rootDirection = sub2(root.end, root.start);
  const leafDirection = sub2(leaf.end, leaf.start);
  const rootLength = length2(rootDirection);
  const leafLength = length2(leafDirection);

  if (rootLength <= toleranceMeters || leafLength <= toleranceMeters) {
    return undefined;
  }

  const directionCross = cross2(rootDirection, leafDirection);

  if (Math.abs(directionCross) <= areaTolerance(rootLength, leafLength, toleranceMeters)) {
    return projectParallelSegmentsToAffineFrame(segments, toleranceMeters);
  }

  const rootToLeaf = sub2(leaf.start, root.start);
  const rootParameter = cross2(rootToLeaf, leafDirection) / directionCross;
  const intersection = add2(root.start, scale2(rootDirection, rootParameter));

  return projectIntersectingSegmentsToParallelFrame(segments, intersection, rootDirection, leafDirection, toleranceMeters);
}

function projectParallelSegmentsToAffineFrame(
  segments: readonly Segment2[],
  toleranceMeters: number,
): readonly Segment2[] | undefined {
  const root = segments[0];
  const leaf = segments[1];
  const rootDirection = sub2(root.end, root.start);
  const rootLength = length2(rootDirection);
  const rootLengthSquared = dot2(rootDirection, rootDirection);
  const denominator = cross2(rootDirection, sub2(leaf.start, root.start));

  if (rootLength <= toleranceMeters || Math.abs(denominator) <= toleranceMeters * rootLength) {
    return undefined;
  }

  return segments.map((segment) => ({
    start: projectParallelPoint(segment.start, root.start, rootDirection, rootLengthSquared, denominator),
    end: projectParallelPoint(segment.end, root.start, rootDirection, rootLengthSquared, denominator),
  }));
}

function projectParallelPoint(
  point: Vec2,
  origin: Vec2,
  xAxis: Vec2,
  xAxisLengthSquared: number,
  yDenominator: number,
): Vec2 {
  const offset = sub2(point, origin);

  return {
    x: dot2(offset, xAxis) / xAxisLengthSquared,
    y: cross2(xAxis, offset) / yDenominator,
  };
}

function projectIntersectingSegmentsToParallelFrame(
  segments: readonly Segment2[],
  intersection: Vec2,
  rootDirection: Vec2,
  leafDirection: Vec2,
  toleranceMeters: number,
): readonly Segment2[] | undefined {
  const basisDeterminant = cross2(rootDirection, leafDirection);
  const rootLength = length2(rootDirection);
  const leafLength = length2(leafDirection);

  if (
    rootLength <= toleranceMeters ||
    leafLength <= toleranceMeters ||
    Math.abs(basisDeterminant) <= areaTolerance(rootLength, leafLength, toleranceMeters)
  ) {
    return undefined;
  }

  const projected: Segment2[] = [];

  for (const segment of segments) {
    const startCoordinates = intersectingBasisCoordinates(
      segment.start,
      intersection,
      rootDirection,
      leafDirection,
      basisDeterminant,
    );
    const endCoordinates = intersectingBasisCoordinates(
      segment.end,
      intersection,
      rootDirection,
      leafDirection,
      basisDeterminant,
    );

    if (crossesProjectiveInfinity(startCoordinates, endCoordinates, toleranceMeters)) {
      return undefined;
    }

    const start = projectIntersectingCoordinates(startCoordinates, toleranceMeters);
    const end = projectIntersectingCoordinates(endCoordinates, toleranceMeters);

    if (!start || !end) {
      return undefined;
    }

    projected.push({ start, end });
  }

  return projected;
}

function intersectingBasisCoordinates(
  point: Vec2,
  intersection: Vec2,
  rootDirection: Vec2,
  leafDirection: Vec2,
  basisDeterminant: number,
): Vec2 {
  const offset = sub2(point, intersection);

  return {
    x: cross2(offset, leafDirection) / basisDeterminant,
    y: cross2(rootDirection, offset) / basisDeterminant,
  };
}

function crossesProjectiveInfinity(start: Vec2, end: Vec2, toleranceMeters: number): boolean {
  const startDenominator = start.x + start.y;
  const endDenominator = end.x + end.y;

  return startDenominator * endDenominator < -toleranceMeters * toleranceMeters;
}

function projectIntersectingCoordinates(coordinates: Vec2, toleranceMeters: number): Vec2 | undefined {
  const denominator = coordinates.x + coordinates.y;

  if (Math.abs(denominator) <= toleranceMeters) {
    return undefined;
  }

  return {
    x: coordinates.x / denominator,
    y: 1 / denominator,
  };
}

function areaTolerance(firstLength: number, secondLength: number, toleranceMeters: number): number {
  return toleranceMeters * Math.max(firstLength, secondLength, 1);
}

function tauSigmaLineForPoint(rootPortal: Segment2, leafPortal: Segment2, point: Vec2): HalfPlane2 {
  const value00 = orient2(rootPortal.start, leafPortal.start, point);
  const value10 = orient2(rootPortal.end, leafPortal.start, point);
  const value01 = orient2(rootPortal.start, leafPortal.end, point);

  return {
    a: value10 - value00,
    b: value01 - value00,
    c: value00,
  };
}

function parameterLineForPointOnSegment(
  lineSegment: Segment2,
  parameterStart: Vec2,
  parameterEnd: Vec2,
  parameterName: "tau" | "sigma",
): HalfPlane2 {
  const valueAtStart = orient2(lineSegment.start, lineSegment.end, parameterStart);
  const valueAtEnd = orient2(lineSegment.start, lineSegment.end, parameterEnd);
  const slope = valueAtEnd - valueAtStart;

  return parameterName === "tau"
    ? {
        a: slope,
        b: 0,
        c: valueAtStart,
      }
    : {
        a: 0,
        b: slope,
        c: valueAtStart,
      };
}

function unitTauSigmaSquare(): Vec2[] {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
}

function pruneTauSigmaDomains(domains: readonly Vec2[][], toleranceMeters: number): Vec2[][] {
  const seen = new Set<string>();
  const pruned: Vec2[][] = [];

  for (const domain of domains) {
    if (polygonArea(domain) <= toleranceMeters * toleranceMeters) {
      continue;
    }

    const key = polygonKey(domain, toleranceMeters);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    pruned.push(domain);
  }

  return pruned;
}

function polygonArea(polygon: readonly Vec2[]): number {
  let twiceArea = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  return Math.abs(twiceArea) / 2;
}

function polygonKey(polygon: readonly Vec2[], toleranceMeters: number): string {
  const scale = 1 / Math.max(toleranceMeters, 1e-9);

  return polygon
    .map((point) => `${Math.round(point.x * scale)},${Math.round(point.y * scale)}`)
    .sort()
    .join(";");
}

function clipConvexPolygonByHalfPlane(
  polygon: readonly Vec2[],
  halfPlane: HalfPlane2,
  toleranceMeters: number,
): Vec2[] {
  if (polygon.length === 0) {
    return [];
  }

  const clipped: Vec2[] = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const currentValue = evaluateHalfPlane(halfPlane, current);
    const nextValue = evaluateHalfPlane(halfPlane, next);
    const currentInside = currentValue >= 0;
    const nextInside = nextValue >= 0;

    if (currentInside && nextInside) {
      clipped.push(next);
      continue;
    }

    if (currentInside !== nextInside) {
      clipped.push(intersectTauSigmaEdge(current, next, currentValue, nextValue));
    }

    if (!currentInside && nextInside) {
      clipped.push(next);
    }
  }

  return dedupePolygonVertices(clipped, toleranceMeters);
}

function intersectTauSigmaEdge(start: Vec2, end: Vec2, startValue: number, endValue: number): Vec2 {
  const alpha = startValue / (startValue - endValue);

  return {
    x: start.x + (end.x - start.x) * alpha,
    y: start.y + (end.y - start.y) * alpha,
  };
}

function dedupePolygonVertices(vertices: readonly Vec2[], toleranceMeters: number): Vec2[] {
  const deduped: Vec2[] = [];

  for (const vertex of vertices) {
    const previous = deduped[deduped.length - 1];

    if (!previous || Math.hypot(vertex.x - previous.x, vertex.y - previous.y) > toleranceMeters) {
      deduped.push(vertex);
    }
  }

  const first = deduped[0];
  const last = deduped[deduped.length - 1];

  if (first && last && deduped.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) <= toleranceMeters) {
    deduped.pop();
  }

  return deduped;
}

function negateHalfPlane(halfPlane: HalfPlane2): HalfPlane2 {
  return {
    a: -halfPlane.a,
    b: -halfPlane.b,
    c: -halfPlane.c,
  };
}

function evaluateHalfPlane(halfPlane: HalfPlane2, point: Vec2): number {
  return halfPlane.a * point.x + halfPlane.b * point.y + halfPlane.c;
}

function add2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale2(vector: Vec2, scale: number): Vec2 {
  return { x: vector.x * scale, y: vector.y * scale };
}

function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function length2(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function cross2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function interpolate2(start: Vec2, end: Vec2, parameter: number): Vec2 {
  return {
    x: start.x + (end.x - start.x) * parameter,
    y: start.y + (end.y - start.y) * parameter,
  };
}

function orient2(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function rejectAgainstPortalAperture(
  pathId: number,
  sourceCellId: string,
  side: CompiledPrismSide,
  sourceCellHeightMeters: number,
  boundInSource: readonly Vec3[],
  toleranceMeters: number,
  includeDetails: boolean | undefined,
): RejectedPortalRenderPath | undefined {
  const sideStart = vec3(side.start.x, side.start.y, 0);
  const inwardNormal = vec3(side.inwardNormal.x, side.inwardNormal.y, 0);
  const planeDistances = boundInSource.map((point) =>
    (point.x - sideStart.x) * inwardNormal.x + (point.y - sideStart.y) * inwardNormal.y,
  );

  if (planeDistances.every((distance) => distance > -toleranceMeters)) {
    return createGeometricRejection(
      pathId,
      "outside-ancestor-portal-plane",
      includeDetails,
      `${sourceCellId}:side-${side.sideIndex}`,
    );
  }

  if (
    boundInSource.every((point) => point.z < -toleranceMeters) ||
    boundInSource.every((point) => point.z > sourceCellHeightMeters + toleranceMeters)
  ) {
    return createGeometricRejection(
      pathId,
      "outside-ancestor-vertical-range",
      includeDetails,
      `${sourceCellId}:side-${side.sideIndex}`,
    );
  }

  return undefined;
}

function prismBoundVertices(
  baseVertices: readonly { readonly x: number; readonly y: number }[],
  heightMeters: number,
): readonly Vec3[] {
  return baseVertices.flatMap((vertex) => [vec3(vertex.x, vertex.y, 0), vec3(vertex.x, vertex.y, heightMeters)]);
}

function createGeometricRejection(
  pathId: number,
  reason: StaticPortalPathRejectReason,
  includeDetails: boolean | undefined,
  portalLabel: string,
): RejectedPortalRenderPath {
  return {
    pathId,
    reason,
    ...(includeDetails ? { details: `Rejected path ${pathId} against ancestor portal ${portalLabel}.` } : {}),
  };
}

function createRejection(
  pathId: number,
  reason: StaticPortalPathRejectReason,
  includeDetails: boolean | undefined,
): RejectedPortalRenderPath {
  return {
    pathId,
    reason,
    ...(includeDetails ? { details: `Rejected path ${pathId} because the static path budget was exhausted.` } : {}),
  };
}

function stripRejectionDetails(rejection: RejectedPortalRenderPath): RejectedPortalRenderPath {
  return {
    pathId: rejection.pathId,
    reason: rejection.reason,
  };
}
