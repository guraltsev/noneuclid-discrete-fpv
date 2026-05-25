import type { CellComplexSpec } from "../cell-complex/specs";
import { compileWorldScript } from "../authoring/compileWorldScript";

export function compileExampleWorld(sourceText: string, sourceName: string): CellComplexSpec {
  return compileWorldScript(sourceText, { sourceName });
}
