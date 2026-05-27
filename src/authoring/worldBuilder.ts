import type { AuthoredPortalSpec, CellComplexSpec, CellObjectSpec, PrismCellSpec } from "../cell-complex/specs";
import { isWorldLibraryObjectSpec, type WorldLibraryObjectSpec } from "../world-objects/library";

const defaultHeightMeters = 15;

type VertexTuple = readonly [number, number];
type EdgePair = readonly [number, number];

interface MutableCell {
  readonly id: string;
  readonly heightMeters: number;
  readonly baseVertices: { readonly x: number; readonly z: number }[];
  readonly portals: AuthoredPortalSpec[];
  readonly visuals: {
    floorColor: string;
    objects: CellObjectSpec[];
  };
}

export interface WorldBuilder {
  PolygonFace(name: string, color: string, vertices: readonly VertexTuple[]): void;
  Portal(face1: string, edge1: EdgePair, face2: string, edge2: EdgePair): void;
  OnFace(faceName: string, objects: readonly WorldLibraryObjectSpec[]): void;
  build(): CellComplexSpec;
}

export function createWorldBuilder(): WorldBuilder {
  const cells = new Map<string, MutableCell>();
  const portalAssignments = new Map<string, Set<string>>();
  const objectIds = new Set<string>();

  return {
    PolygonFace(name, color, vertices) {
      if (cells.has(name)) {
        throw new Error(`Duplicate face "${name}".`);
      }

      if (!Array.isArray(vertices) || vertices.length < 3) {
        throw new Error(`PolygonFace("${name}") requires at least 3 vertices.`);
      }

      const normalizedVertices = vertices.map((vertex, index) => normalizeVertex(name, vertex, index));

      cells.set(name, {
        id: name,
        heightMeters: defaultHeightMeters,
        baseVertices: normalizedVertices,
        portals: [],
        visuals: {
          floorColor: color,
          objects: [],
        },
      });
      portalAssignments.set(name, new Set());
    },

    Portal(face1, edge1, face2, edge2) {
      const cell1 = cells.get(face1);
      const cell2 = cells.get(face2);

      if (!cell1) {
        throw new Error(`Unknown face "${face1}" in Portal().`);
      }

      if (!cell2) {
        throw new Error(`Unknown face "${face2}" in Portal().`);
      }

      const authoredEdge1 = normalizeEdgePair(face1, edge1, cell1.baseVertices.length);
      const authoredEdge2 = normalizeEdgePair(face2, edge2, cell2.baseVertices.length);

      if (face1 === face2 && authoredEdge1.portalId === authoredEdge2.portalId) {
        throw new Error(`Portal("${face1}", [${edge1[0]}, ${edge1[1]}], ...) cannot connect an edge to itself.`);
      }

      assertUnassignedEdge(portalAssignments, face1, authoredEdge1.portalId);
      assertUnassignedEdge(portalAssignments, face2, authoredEdge2.portalId);

      cell1.portals.push({
        id: authoredEdge1.portalId,
        sideIndex: authoredEdge1.sideIndex,
        targetCellId: face2,
        targetPortalId: authoredEdge2.portalId,
      });
      cell2.portals.push({
        id: authoredEdge2.portalId,
        sideIndex: authoredEdge2.sideIndex,
        targetCellId: face1,
        targetPortalId: authoredEdge1.portalId,
      });
      portalAssignments.get(face1)?.add(authoredEdge1.portalId);
      portalAssignments.get(face2)?.add(authoredEdge2.portalId);
    },

    OnFace(faceName, objects) {
      const cell = cells.get(faceName);

      if (!cell) {
        throw new Error(`Unknown face "${faceName}" in OnFace().`);
      }

      if (!Array.isArray(objects)) {
        throw new Error(`OnFace("${faceName}", ...) requires an array of objects.`);
      }

      for (const object of objects) {
        if (!isWorldLibraryObjectSpec(object)) {
          throw new Error(`OnFace("${faceName}", ...) received an object that was not created by the object library.`);
        }

        if (objectIds.has(object.id)) {
          throw new Error(`Duplicate object id "${object.id}".`);
        }

        objectIds.add(object.id);
        cell.visuals.objects.push(stripLibraryBrand(object));
      }
    },

    build() {
      return {
        cells: [...cells.values()].map((cell): PrismCellSpec => ({
          id: cell.id,
          heightMeters: cell.heightMeters,
          baseVertices: [...cell.baseVertices],
          portals: [...cell.portals],
          visuals: {
            floorColor: cell.visuals.floorColor,
            objects: [...cell.visuals.objects],
          },
        })),
      };
    },
  };
}

export function authorEdgeToSideIndex(vertexCount: number, edge: EdgePair): number {
  const [startIndex, endIndex] = edge;

  if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
    throw new Error(`Invalid edge [${String(startIndex)}, ${String(endIndex)}]; edge indexes must be integers.`);
  }

  if (startIndex < 0 || endIndex < 0 || startIndex >= vertexCount || endIndex >= vertexCount) {
    throw new Error(`Invalid edge [${startIndex}, ${endIndex}]; expected indexes in the range 0-${vertexCount - 1}.`);
  }

  if (startIndex >= endIndex) {
    throw new Error(`Invalid edge [${startIndex}, ${endIndex}]; edge indexes must be written in ascending order.`);
  }

  if (startIndex === 0 && endIndex === vertexCount - 1) {
    return vertexCount - 1;
  }

  if (endIndex === startIndex + 1) {
    return startIndex;
  }

  throw new Error(
    `Invalid edge [${startIndex}, ${endIndex}]; use consecutive pairs like [1, 2] or the wraparound pair [0, ${vertexCount - 1}].`,
  );
}

function normalizeVertex(faceName: string, vertex: readonly number[], index: number): { readonly x: number; readonly z: number } {
  if (!Array.isArray(vertex) || vertex.length !== 2) {
    throw new Error(`PolygonFace("${faceName}") vertex ${index} must be a [x, z] pair.`);
  }

  const [x, z] = vertex;

  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new Error(`PolygonFace("${faceName}") vertex ${index} must contain finite numbers.`);
  }

  return { x, z };
}

function normalizeEdgePair(faceName: string, edge: EdgePair, vertexCount: number): { readonly sideIndex: number; readonly portalId: string } {
  if (!Array.isArray(edge) || edge.length !== 2) {
    throw new Error(`Portal("${faceName}", ...) requires edges written as [startIndex, endIndex].`);
  }

  const sideIndex = authorEdgeToSideIndex(vertexCount, edge);
  return {
    sideIndex,
    portalId: `edge-${edge[0]}-${edge[1]}`,
  };
}

function assertUnassignedEdge(
  portalAssignments: ReadonlyMap<string, ReadonlySet<string>>,
  faceName: string,
  portalId: string,
): void {
  if (portalAssignments.get(faceName)?.has(portalId)) {
    throw new Error(`Face "${faceName}" already has a portal on ${portalId}.`);
  }
}

function stripLibraryBrand(object: WorldLibraryObjectSpec): CellObjectSpec {
  return { ...object };
}
