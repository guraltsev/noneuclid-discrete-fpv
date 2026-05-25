import tetrahedronWorldSource from "./tetrahedron.world.js?raw";
import { compileExampleWorld } from "./compileExampleWorld";

export const tetrahedron = compileExampleWorld(tetrahedronWorldSource, "tetrahedron.world.js");
