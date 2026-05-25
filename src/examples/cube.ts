import cubeWorldSource from "./cube.world.js?raw";
import { compileExampleWorld } from "./compileExampleWorld";

export const cube = compileExampleWorld(cubeWorldSource, "cube.world.js");
