import type {ImagePromptProfile} from "./image-prompt-profile.js";
import type { ImagePromptMetadata } from "./image-templates.js";
import type { ImagePromptProfileV2 } from "./image-prompt-profile-v2.js";
import type { ImageShotSpec } from "./image-shot-spec.js";
import type { ImageOutputPlan } from "./image-output-plan.js";
import type { StyleDNA } from "./style-dna.js";
export type ImageRequestRecord = {
  canRegeneratePrompt?: boolean | undefined;
  promptAdaptationError?: string | undefined;
  promptProfile?: ImagePromptProfile | undefined;
  promptProfileV2?: ImagePromptProfileV2 | undefined;
  shotSpec?: ImageShotSpec | undefined;
  outputPlan?: ImageOutputPlan | undefined;
  styleSnapshot?: StyleDNA | undefined;
  imagePromptMetadata?: ImagePromptMetadata | undefined;
  requestId: string;
  jobId: string;
  paragraphIndex: number;
  state: "review" | "prepared" | "approved" | "skipped" | "cancelled";
  prompt: string;
  negativePrompt: string;
  model: string;
  provider: string;
  connectionId: string;
  connectionRevision?: number | undefined;
  parameters: Record<string, unknown>;
  referenceSummary: string;
  createdAt: string;
};

export type ImageRequestEdits = {
  prompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, unknown>;
};
