import { defaultWorldId, findWorldCatalogEntry, normalizeWorldId } from "../authoring/worldCatalog";
import { parseDebugOptions, type DebugOptionId } from "./debugOptions";

export interface LaunchOptions {
  readonly selectedWorldId: string;
  readonly renderWorldPicker: boolean;
  readonly debugEnabled: boolean;
  readonly debugOptions: readonly DebugOptionId[];
}

export function readLaunchOptions(location: Location): LaunchOptions {
  const params = new URLSearchParams(location.search);
  const requestedWorldId = normalizeWorldId(params.get("world")) ?? defaultWorldId;
  const selectedWorldId = findWorldCatalogEntry(requestedWorldId)?.id ?? defaultWorldId;

  return {
    selectedWorldId,
    renderWorldPicker: !isDisabled(params.get("worldPicker")),
    debugEnabled: isEnabled(params.get("debug")),
    debugOptions: parseDebugOptions(params.get("debugOptions")),
  };
}

function isDisabled(rawValue: string | null): boolean {
  return rawValue === "0" || rawValue === "false" || rawValue === "no";
}

function isEnabled(rawValue: string | null): boolean {
  return rawValue !== null && !isDisabled(rawValue);
}
