import {CastGalleryRequestSchema,type CastGallery,CastArtRequestSchema,type CastArtLibrary} from './shared/cast-art.js';
import {ImageLibraryRequestSchema,type ImageLibraryPage} from './shared/image-library.js';
import {LocationArtRequestSchema,type LocationArtLibrary} from './shared/stage-assets.js';
import type { ContextSourceReport } from './shared/context-sources.js';
import type { ReaderPresentation } from "./shared/presentation-entities.js";
import { z } from "zod";
import { CardRoleSchema, type CardRole } from "./shared/card-role.js";
import { SubjectCorrectionSchema } from "./shared/subject-correction.js";
import type { VisualNovelConfig } from "./config.js";
import { ReadingPositionSchema, type ReadingPosition } from "./shared/reading-position.js";
import type { PanelArtifact } from "./shared/panels.js";
import type { CueImageRequest, CueImageResult } from "./shared/cue-images.js";
import type { ImageRequestEdits, ImageRequestRecord } from "./shared/image-review.js";
import type { ImageDiagnostic } from './shared/image-diagnostics.js';

const recoveryScope={version:z.literal(1),chatId:z.string().min(1).max(200),messageId:z.string().min(1).max(200),swipeId:z.number().int().min(0),sourceFingerprint:z.string().min(1).max(200),requestId:z.string().min(1).max(100)};
export const CorrectImageSubjectRequestSchema=z.object({type:z.literal('vn_correct_image_subject'),...recoveryScope,jobId:z.string().min(1).max(200),templateId:z.string().min(1).max(100).optional(),subject:SubjectCorrectionSchema}).strict();
export const SetCardRoleRequestSchema=z.object({type:z.literal('vn_set_card_role'),...recoveryScope,role:CardRoleSchema}).strict();
export const ReplanTurnRequestSchema=z.object({type:z.literal('vn_replan_turn'),...recoveryScope}).strict();
export const ContextSourcesRequestSchema = z.object({type:z.literal("vn_get_context_sources"),chatId:z.string().min(1).max(256),requestId:z.string().min(1).max(100)}).strict();
export type FrontendRequest =
  | z.infer<typeof ImageLibraryRequestSchema>
  | z.infer<typeof CastGalleryRequestSchema>
  | z.infer<typeof CastArtRequestSchema>
  | z.infer<typeof LocationArtRequestSchema>
  | z.infer<typeof ContextSourcesRequestSchema>
  | z.infer<typeof ReplanTurnRequestSchema>
  | z.infer<typeof CorrectImageSubjectRequestSchema>
  | z.infer<typeof SetCardRoleRequestSchema>
  | { type: "vn_reading_position"; position: ReadingPosition }
  | { type: "vn_image_review"; chatId: string; messageId: string; sourceFingerprint: string; requestId: string; action: "generate" | "skip"; edits?: ImageRequestEdits }
  | { type: "vn_prepare_image"; chatId: string; messageId: string; sourceFingerprint: string; jobId: string; templateId?: string; edits?: ImageRequestEdits; regeneratePrompt?: boolean }
  | { type: "vn_regenerate_image_prompt"; chatId: string; messageId: string; sourceFingerprint: string; requestId: string }
  | { type: "vn_reprepare_image_template"; chatId: string; messageId: string; sourceFingerprint: string; requestId: string; templateId: string }
  | { type: "vn_external_image"; request: CueImageRequest }
  | { type: "vn_external_image_cancel"; request: Pick<CueImageRequest, "version" | "provider" | "chatId" | "requestId"> }
  | { type: "vn_resolve_panel_template"; chatId: string; characterId?: string; requestId: string; template: string }
  /**
   * Announce whether the Cue view is open for a chat. The backend only plans
   * turns and generates images for chats whose view is open; closing the view
   * aborts the in-flight batch. Idempotent; repeats are no-ops.
   */
  | { type: "vn_view"; chatId: string; open: boolean }
  /**
   * `viewOpen` repeats the view announcement on the state request itself.
   * True opens the view, false closes it; absent changes nothing (a state
   * request that says nothing about the view never opens it).
   */
  | { type: "vn_get_state"; chatId?: string; viewOpen?: boolean }
  | { type: "vn_get_connection_catalog" }
  | { type: "vn_get_system_one_key_status" }
  | { type: "vn_set_system_one_key"; key: string }
  | { type: "vn_clear_system_one_key" }
  | { type: "vn_set_config"; patch: Partial<VisualNovelConfig>; chatId?: string }
  | { type: "vn_submit"; chatId: string; content: string; requestId: string }
  | { type: "vn_asset_ready"; chatId: string; messageId: string; jobId: string; sourceFingerprint: string }
  | { type: "vn_cancel"; chatId: string }
  | { type: "vn_retry_turn"; chatId: string; messageId: string }
  /** Re-check the chat's latest assistant message (macro selection may have changed). */
  | { type: "vn_refresh"; chatId: string }
  | { type: "vn_scan_audio"; directory?: string }
  | {
      type: "vn_import_audio_file";
      relativePath: string;
      dataBase64: string;
      /** Set when a file is split to fit the host's 4 MB message limit. */
      transferId?: string;
      chunkIndex?: number;
      chunkCount?: number;
    }
  | { type: "vn_import_audio_done"; fileCount: number }
  | {
      /**
       * Reply to a `vn_reference_fetch`: the frontend fetched the card asset
       * bytes and relays them as a base64 data URL. Exactly one of `dataUrl`
       * and `error` is set. The backend cannot read image bytes itself
       * (`spindle.images.get` only returns a URL), so the logged-in frontend
       * does the fetch.
       */
      type: "vn_reference_image";
      requestId: string;
      dataUrl?: string;
      error?: string;
    };

/** Upper bound for a relayed reference image (decoded bytes, checked on both sides). */
export const REFERENCE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const REFERENCE_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"]);

export type AssetView = {
  stageAsset?: import("./shared/cast-composition.js").StageAssetMetadata;
  diagnostic?: ImageDiagnostic;
  presentation?: "page";
  jobId: string;
  cueId: string;
  paragraphIndex: number;
  status: "queued" | "generating" | "generated" | "browser_ready" | "failed" | "cancelled";
  imageId?: string;
  imageUrl?: string;
  error?: string;
  /**
   * "cache": an extra swap beyond the image cap, served from the temporary
   * scene-image cache without a provider request. Such assets are always
   * terminal; they never count toward generation progress or retry wording.
   */
  source?: "cache";
  previousImage?: boolean;
};

export type AudioCueView = {
  paragraphIndex: number;
  bgm?: string | null;
  sfx?: string | null;
  bgmUrl?: string | null;
  sfxUrl?: string | null;
};

export type TurnView = {
  presentation?: ReaderPresentation;
  cardRole?: CardRole;
  cardRoleAvailable?: boolean;
  subjectCandidates?: Array<{name:string;appearance:string}>;
  chatId: string;
  messageId: string;
  swipeId: number;
  sourceFingerprint: string;
  revision: number;
  speaker: string;
  userSpeaker?: string;
  paragraphs: string[];
  panels?: PanelArtifact[];
  panelSource?: string;
  /** Per-paragraph nameplate override; null entries fall back to `speaker`. */
  paragraphSpeakers?: Array<string | null>;
  /** Per-paragraph one-shot stage effect ids; null entries mean no effect. */
  effects?: Array<string | null>;
  /** Per-paragraph persistent ambient effect ids; null entries mean no ambient. */
  ambients?: Array<string | null>;
  choices: Array<{ id: string; label: string; value: string }>;
  assets: AssetView[];
  imageRequests?: ImageRequestRecord[];
  audioCues?: AudioCueView[];
  status: "planning" | "ready" | "failed" | "cancelled";
  error?: string;
};

export type ConnectionCatalogOption = {
  id: string;
  name: string;
  provider: string;
  model: string;
  isDefault: boolean;
};

export type ConnectionCatalogErrors = {
  planner?: string;
  image?: string;
};

export type BackendResponse =
  | {type:'vn_image_library';chatId:string;requestId:string;page:ImageLibraryPage}
  | {type:"vn_cast_gallery";chatId:string;requestId:string;gallery:CastGallery}
  | {type:"vn_cast_art";chatId:string;requestId:string;library:CastArtLibrary}
  | {type:"vn_cast_art_notice";chatId:string;error:string}
  | {type:"vn_location_art";chatId:string;requestId:string;library:LocationArtLibrary}
  | {type:"vn_location_art_notice";chatId:string;error:string}
  | { type: "vn_context_sources"; report: ContextSourceReport }
  | { type: "vn_image_requests"; chatId: string; messageId: string; sourceFingerprint: string; requests: ImageRequestRecord[] }
  | { type: "vn_external_image"; result: CueImageResult }
  | { type: "vn_panel_template"; requestId: string; chatId: string; template?: string; error?: string }
  | { type: "vn_state"; chatId: string; config: VisualNovelConfig; turn: TurnView | null; readingPosition?: ReadingPosition | null }
  | { type: "vn_config"; config: VisualNovelConfig }
  | { type: "vn_system_one_key_status"; saved: boolean }
  | {
    type: "vn_connection_catalog";
    planner: ConnectionCatalogOption[];
    image: ConnectionCatalogOption[];
    errors?: ConnectionCatalogErrors;
  }
  | { type: "vn_turn"; turn: TurnView }
  | { type: "vn_asset"; chatId: string; messageId: string; asset: AssetView }
  | { type: "vn_planning"; chatId: string }
  /**
   * The latest assistant message has no narrative left after macro
   * resolution (an unselected multi-scene greeting). Nothing was planned and
   * no images were made; the user picks a scene in the chat first.
   */
  | { type: "vn_waiting"; chatId: string; messageId: string; reason: "greeting_unselected" }
  | { type: "vn_generation"; chatId: string; active: boolean; error?: string }
  | { type: "vn_permission"; permission: string; granted: boolean }
  | { type: "vn_audio_scanned"; bgmCount: number; sfxCount: number }
  | {
      /**
       * Ask the frontend to fetch `/api/v1/images/<imageId>` (same origin,
       * with credentials) and reply with `vn_reference_image` carrying the
       * matching `requestId`. Used only when `referenceSource` is "card".
       */
      type: "vn_reference_fetch";
      chatId: string;
      requestId: string;
      imageId: string;
      characterKey: string;
    }
  | { type: "vn_error"; chatId?: string; requestId?:string; operation: string; error: string };

export function isFrontendRequest(value: unknown): value is FrontendRequest {
  if (value === null || typeof value !== "object") return false;
  if((value as {type?:unknown}).type==='vn_image_library')return ImageLibraryRequestSchema.safeParse(value).success;
  if ((value as {type?:unknown}).type === "vn_cast_gallery") return CastGalleryRequestSchema.safeParse(value).success;
  if ((value as {type?:unknown}).type === "vn_cast_art") return CastArtRequestSchema.safeParse(value).success;
  if ((value as {type?:unknown}).type === "vn_get_context_sources") return ContextSourcesRequestSchema.safeParse(value).success;
  if ((value as {type?:unknown}).type === 'vn_replan_turn') return ReplanTurnRequestSchema.safeParse(value).success;
  if ((value as {type?:unknown}).type === "vn_correct_image_subject") return CorrectImageSubjectRequestSchema.safeParse(value).success;
  if ((value as {type?:unknown}).type === "vn_set_card_role") return SetCardRoleRequestSchema.safeParse(value).success;
  if ((value as { type?: unknown }).type === "vn_reading_position") return ReadingPositionSchema.safeParse((value as { position?: unknown }).position).success;
  return typeof (value as { type?: unknown }).type === "string"
    && String((value as { type: string }).type).startsWith("vn_");
}
