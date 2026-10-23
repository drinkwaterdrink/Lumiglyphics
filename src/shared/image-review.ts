import type {ImagePromptProfile} from "./image-prompt-profile.js";
import type { ImagePromptMetadata } from "./image-templates.js";
export type ImageRequestRecord = {
  canRegeneratePrompt?: boolean;
  promptAdaptationError?: string;
  promptProfile?: ImagePromptProfile;
  imagePromptMetadata?: ImagePromptMetadata;
  requestId: string;
  jobId: string;
  paragraphIndex: number;
  state: "review" | "prepared" | "approved" | "skipped" | "cancelled";
  prompt: string;
  negativePrompt: string;
  model: string;
  provider: string;
  connectionId: string;
  connectionRevision?: number;
  parameters: Record<string, unknown>;
  referenceSummary: string;
  createdAt: string;
};

export type ImageRequestEdits = {
  prompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, unknown>;
};
