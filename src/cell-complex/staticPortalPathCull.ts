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

export interface StaticPortalPathCullOptions {
  readonly toleranceMeters: number;
  readonly maxKeptPathsPerRoot?: number;
  readonly keepRejectedPathDetails?: boolean;
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

          const rejection = rejectGeometrically(world, child, cullTolerance, options.keepRejectedPathDetails);

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
        path.depth === 0 ? undefined : rejectGeometrically(world, path, cullTolerance, options.keepRejectedPathDetails);
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
