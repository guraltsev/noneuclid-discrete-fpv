import { defaultWorldId, findWorldCatalogEntry, normalizeWorldId } from "../authoring/worldCatalog";

export interface LaunchOptions {
  readonly selectedWorldId: string;
  readonly renderWorldPicker: boolean;
  readonly debugLevel: number;
}

export function readLaunchOptions(location: Location): LaunchOptions {
  const params = new URLSearchParams(location.search);
  const requestedWorldId = normalizeWorldId(params.get("world")) ?? defaultWorldId;
  const selectedWorldId = findWorldCatalogEntry(requestedWorldId)?.id ?? defaultWorldId;

  return {
    selectedWorldId,
    renderWorldPicker: !isDisabled(params.get("worldPicker")),
    debugLevel: readIntegerParam(params.get("debug")),
  };
}

function isDisabled(rawValue: string | null): boolean {
  return rawValue === "0" || rawValue === "false" || rawValue === "no";
}

function readIntegerParam(rawValue: string | null): number {
  if (!rawValue) {
    return 0;
  }

  const value = Number.parseInt(rawValue, 10);
  return Number.isFinite(value) ? value : 0;
}
