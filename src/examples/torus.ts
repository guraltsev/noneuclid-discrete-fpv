import torusWorldSource from "./torus.world.js?raw";
import { compileExampleWorld } from "./compileExampleWorld";

export const torus = compileExampleWorld(torusWorldSource, "torus.world.js");
