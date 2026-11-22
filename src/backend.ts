import type { SpindleAPI } from "lumiverse-spindle-types";
import { bindBackendUuidProvider, type BackendUuidContext } from "./backend/core/uuid.js";
import { registerVisualNovelBackend } from "./backend/runtime/controller.js";

declare const spindle: SpindleAPI;

bindBackendUuidProvider(spindle as unknown as BackendUuidContext);
registerVisualNovelBackend(spindle);
