import type { SpindleFrontendContext } from "lumiverse-spindle-types";
import { setupVisualNovelFrontend } from "./frontend/host/controller.js";

export function setup(ctx: SpindleFrontendContext): () => void {
  try {
    return setupVisualNovelFrontend(ctx);
  } catch (error) {
    console.error("[Lumiglyphics] Critical frontend setup exception:", error);
    throw error;
  }
}
