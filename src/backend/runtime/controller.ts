import {managePresentationRules} from './presentation-rules.js';
import {NarrativePreviewSchema} from '../../shared/preparation-preview.js';
import {captureReferenceLineage,referenceMessages,readReferenceHistory,preserveReferenceLineage} from './reference-history.js';
import {scanCastContext} from "./cast-context.js";
import {CastGalleryRequestSchema,CastArtRequestSchema} from '../../shared/cast-art.js';
import {castArtToken,findCastDisplayArt,findSetupDisplayArt,listCastGallery,manageCastArt} from './cast-art.js';
import {LocationArtRequestSchema} from '../../shared/stage-assets.js';
import {manageLocationArt} from './location-art.js';
import { ContextSourceSession } from './context-providers/session.js';
import type { VisualNovelConfig } from '../../config.js';
import { ContextSourcesRequestSchema } from '../../protocol.js';
const contextSourceSession = new ContextSourceSession();
const contextConfigSaves = new Map<string, Promise<VisualNovelConfig>>();
import { readerPresentationFor } from "./entity-projection.js";
import { modelOutputParameters } from './template-output.js';
import { correctVisualSubject } from "./subject-resolution.js";
import { CorrectImageSubjectRequestSchema, SetCardRoleRequestSchema, ReplanTurnRequestSchema, RecoverImagesRequestSchema } from "../../protocol.js";
import { imageDiagnostic } from '../../shared/image-diagnostics.js';
import type {
  ChatMessageDTO,
  GenerationEndedPayloadDTO,
  MessageSwipedPayloadDTO,
  SwipeEditedPayloadDTO,
  SpindleAPI
} from "lumiverse-spindle-types";
import { ImageReviewGate, safeImageHistory, applyImageEdits } from "./image-review.js";
import type { ImageRequestEdits } from '../../shared/image-review.js';
import { extractSimTracker } from "./simtracker.js";
import { templateSnapshot } from "../../shared/image-templates.js";
const imageReviewGates = new Map<string, ImageReviewGate>();
const preparingSingleImages = new Map<string,symbol>();
const recoveringImageBatches = new Map<string,string>();
const generatingChats = new Set<string>();
import { createExternalImages } from "./external-images.js";
import {
  AssetJobSchema,
  ChoiceSchema
} from "../../shared/contracts.js";
import type { FrontendRequest, AssetView, TurnView } from "../../protocol.js";
import { resolvePanelTemplate } from "./panel-templates.js";
import { ViewRegistry } from "./view-registry.js";
import { isFrontendRequest } from "../../protocol.js";
import { compareTurnKeys, turnKeyEquals } from "../core/guards.js";
import { PlanningQueue, isAbortError } from "../core/planning-queue.js";
import { resolveNativeCardJobs } from "./native-assets.js";
import { handleReferenceImageResponse } from "./reference-source.js";
import { CACHE_JOB_PROVIDER, createAssetJobs, prepareAssetJobs, generateAssets, resolveCacheCues, retainPlanEpisodes } from "./images.js";
import { SceneImageCache, sceneImageScope } from "../core/scene-image-cache.js";
import { fingerprintForMessage, gameHintsForTurn, planTurn } from "./planner.js";
import {readImageLibraryPage} from './image-library.js';
import {
  isUnselectedGreeting,
  needsResolution,
  resolutionCacheKey,
  resolveContextMessages,
  resolveMessageIntake,
  type MessageIntake,
  type MessageResolutionCache
} from "./message-text.js";
import { loadConnectionCatalog } from "./connections.js";
import { SYSTEM_ONE_KEY } from "./system-one.js";
import {
  clearAudioCatalogCache,
  normalizeAudioStoragePrefix,
  preloadAudioForCues,
  resolveAudioUrl,
  scanAudioCatalog,
  SUPPORTED_AUDIO_EXTENSIONS
} from "./audio-catalog.js";
import {
  loadCardRole,
  saveCardRole,
  saveCorrectedAppearance,
  loadCharacterAppearance,
  loadCharacterRegistry,
  loadChatState,
  loadConfig,
  loadReadingPosition,
  saveReadingPosition,
  loadSingleCharacterState,
  loadTurnRecord,
  mergeCharacterAppearanceFromState,
  mergePlannerCharacters,
  resetChatIdentityState,
  saveCharacterRegistry,
  saveChatState,
  saveSingleCharacterState,
  saveTurnRecordIfCurrent,
  saveTurnRecord,
  mutateActiveTurnRecord,
  turnPath,
  updateConfig,
  type StoredTurnRecord
} from "./storage.js";

type NormalizedChatMessage = ChatMessageDTO & {
  role: "system" | "user" | "assistant";
  metadata?: Record<string, unknown>;
};

const planningQueue = new PlanningQueue();
const externalImageServices = new WeakMap<SpindleAPI, ReturnType<typeof createExternalImages>>();
function externalImages(spindle: SpindleAPI) {
  let service = externalImageServices.get(spindle);
  if (!service) { service = createExternalImages(spindle); externalImageServices.set(spindle, service); }
  return service;
}
const assetControllers = new Map<string, AbortController>();
const pendingAssetStarts = new Map<string,symbol>();
/**
 * Per-chat intake epoch. Macro resolution awaits the host before the planning
 * queue can see the job, so a cancel, a new generation, a deletion, or a
 * newer message event during that await could otherwise let a stale intake
 * enqueue afterwards. Bumping the epoch invalidates every intake that started
 * before the bump.
 */
const intakeEpochs = new Map<string, number>();
function bumpIntakeEpoch(userId: string | undefined, chatId: string): void {
  const key = runtimeKey(userId, chatId);
  intakeEpochs.set(key, (intakeEpochs.get(key) ?? 0) + 1);
}
const activeTurnKeys = new Map<string, StoredTurnRecord["plan"]["key"]>();

/**
 * Temporary scene-image cache (one per backend worker). See
 * `core/scene-image-cache.ts` for lifetime rules. Exposed for tests and
 * diagnostics; production code reaches it only through this accessor.
 */
const sceneCache = new SceneImageCache();
export function sceneImageCache(): SceneImageCache {
  return sceneCache;
}
/** Last chat each user asked state for; a change releases the previous chat's cache scope. */
const activeChatByUser = new Map<string, string>();

/** Release cache admission for a chat whose turn/scene/swipe just changed. Entries stay; late results are rejected. */
function releaseSceneCacheAdmission(spindle: SpindleAPI, userId: string | undefined, chatId: string, reason: string): void {
  const scope = sceneImageScope(userId, chatId);
  const epoch = sceneCache.bumpEpoch(scope, reason);
  dbg(spindle, userId, `scene-cache admission released scope=${scope} epoch=${epoch} reason=${reason}`);
}

/** Explicit release of a whole chat scope (delete/reset/chat switch): entries dropped, late results rejected. */
function releaseSceneCacheScope(spindle: SpindleAPI, userId: string | undefined, chatId: string, reason: "chat_switch" | "scope_cleared"): void {
  const scope = sceneImageScope(userId, chatId);
  const dropped = sceneCache.invalidateScope(scope, reason);
  dbg(spindle, userId, `scene-cache scope released scope=${scope} reason=${reason} dropped=${dropped} generation=${sceneCache.generation(scope)}`);
}

/** Track the chat a user is viewing; switching chats releases the previous chat's scope. */
function noteActiveChat(spindle: SpindleAPI, userId: string | undefined, chatId: string): void {
  const userKey = userId ?? "owner";
  const previous = activeChatByUser.get(userKey);
  if (previous !== chatId) contextSourceSession.cancel(userKey);
  if (previous && previous !== chatId) releaseSceneCacheScope(spindle, userId, previous, "chat_switch");
  if (chatId) activeChatByUser.set(userKey, chatId);
}

const preparationSessions=new Map<string,string>();
function runtimeKey(userId: string | undefined, chatId: string): string {
  return `${userId ?? "owner"}:${chatId}`;
}

/**
 * Chats whose Cue view is currently open, per user. Automatic work (planning
 * and image generation on host events) is skipped while a chat's view is
 * closed; opening the view later plans the latest reply through `vn_get_state`.
 * Exposed for tests; production code reaches it only through this accessor.
 */
const views = new ViewRegistry();
export function viewRegistry(): ViewRegistry {
  return views;
}

/**
 * Persist "cancelled" over any queued/generating job of the chat's active turn
 * so a view-close abort leaves nothing that looks stuck. Late in-flight results
 * are already rejected by the ownership check (`activeTurnKeys`).
 */
async function cancelIncompleteJobs(
  spindle: SpindleAPI,
  chatId: string,
  userId: string | undefined,
  abortedTurn: StoredTurnRecord["plan"]["key"] | null
): Promise<void> {
  const key = runtimeKey(userId, chatId);
  // Runs unawaited after a close. The aborted batch never resumes on its own,
  // so its jobs are stamped even if the view reopened meanwhile (otherwise a
  // fast close/reopen leaves "generating" jobs that nothing will ever finish).
  // Only a new owner claiming the chat's turn while we were loading (retry,
  // reply, reuse) makes the stored jobs live work that must be left alone,
  // and only the record of the aborted turn itself is ever touched.
  const unclaimed = (): boolean => !activeTurnKeys.has(key);
  const chatState = await loadChatState(spindle, chatId, userId);
  if (!chatState.activeTurnPath || !unclaimed()) return;
  const record = await loadTurnRecord(spindle, chatState.activeTurnPath, userId);
  if (!record || !unclaimed()) return;
  if (abortedTurn && !turnKeyEquals(record.plan.key, abortedTurn)) return;
  const nowTime = new Date().toISOString();
  let cancelled = 0;
  const jobs = record.jobs.map((job) => {
    if (job.status !== "queued" && job.status !== "generating") return job;
    cancelled += 1;
    return AssetJobSchema.parse({ ...job, status: "cancelled", error: null, finishedAt: nowTime });
  });
  if (cancelled === 0 || !unclaimed()) return;
  const next = { ...record, jobs, imageRequests: record.imageRequests?.map((request) => request.state === "review" ? { ...request, state: "cancelled" as const } : request) ?? [], updatedAt: nowTime };
  await saveTurnRecord(spindle, chatState.activeTurnPath, next, userId);
  dbg(spindle, userId, `view-gate persisted cancelled over ${cancelled} incomplete job(s) chat=${chatId}`);
  // A view that reopened before this landed already holds the pre-cancel
  // jobs; tell it so no spinner outlives the batch.
  if (views.isOpen(userId, chatId)) {
    for (const job of jobs) {
      if (job.status !== "cancelled" || job.finishedAt !== nowTime) continue;
      spindle.sendToFrontend({ type: "vn_asset", chatId, messageId: record.plan.key.assistantMessageId, sourceFingerprint: next.plan.key.sourceFingerprint, swipeId: next.plan.key.swipeId, revision: next.plan.key.revision, asset: await assetViewWithCastArt(spindle,next,job,userId) }, userId);
    }
  }
}

/**
 * Abort a chat's in-flight work the same way GENERATION_STARTED does: drop
 * turn ownership so late results cannot persist or send, abort the asset
 * batch, cancel queued planning, and release the scene-cache admission.
 */
function abortChatWork(spindle: SpindleAPI, userId: string | undefined, chatId: string, reason: string): void {
  const key = runtimeKey(userId, chatId);
  planningQueue.cancelChat(userId, chatId, undefined, reason);
  const abortedTurn = activeTurnKeys.get(key) ?? null;
  activeTurnKeys.delete(key);
  pendingAssetStarts.delete(key);
  assetControllers.get(key)?.abort(reason);
  releaseSceneCacheAdmission(spindle, userId, chatId, "view_closed");
  void cancelIncompleteJobs(spindle, chatId, userId, abortedTurn).catch((error) => {
    spindle.log.warn(`Visual novel view-close cleanup failed: ${errorText(error)}`);
  });
}

/** Mark a chat's view open. Opening displaces the user's previously open chat, whose work is aborted. */
function openView(spindle: SpindleAPI, userId: string | undefined, chatId: string): void {
  if (!chatId) return;
  const wasOpen = views.isOpen(userId, chatId);
  const displaced = views.open(userId, chatId);
  if (!wasOpen) dbg(spindle, userId, `view open chat=${chatId}`);
  if (displaced) {
    preparationSessions.delete(runtimeKey(userId,displaced));
    dbg(spindle, userId, `view closed chat=${displaced} reason=view_switched`);
    abortChatWork(spindle, userId, displaced, "The visual novel view moved to another chat.");
  }
}

/** Close whichever chat's view is open for this user (home screen, no active chat). */
function closeOpenView(spindle: SpindleAPI, userId: string | undefined, reason: string): void {
  const open = views.openChat(userId);
  if (open) closeView(spindle, userId, open, reason);
}

/** Mark a chat's view closed and abort its in-flight work. Idempotent. */
function closeView(spindle: SpindleAPI, userId: string | undefined, chatId: string, reason: string): void {
  preparationSessions.delete(runtimeKey(userId,chatId));
  if (!views.close(userId, chatId)) return;
  dbg(spindle, userId, `view closed chat=${chatId} reason=${reason}`);
  abortChatWork(spindle, userId, chatId, "The visual novel view closed before this turn settled.");
}

/**
 * Whether automatic work (planning + image generation triggered by host
 * events) may run for a chat. Explicit requests from the open view
 * (vn_get_state, vn_retry_turn, choices) never pass through here.
 */
async function allowAutomaticWork(spindle: SpindleAPI, userId: string | undefined, chatId: string, trigger: string): Promise<boolean> {
  const config = await loadConfig(spindle, userId);
  rememberDebugFlag(userId, config);
  if (!config.enabled) {
    dbg(spindle, userId, `skipped ${trigger}: extension disabled (enabled=false) chat=${chatId}`);
    return false;
  }
  if (!views.isOpen(userId, chatId)) {
    dbg(spindle, userId, `skipped ${trigger}: view closed chat=${chatId}`);
    return false;
  }
  return true;
}

/**
 * Hand the exact planning text to the image/reference pipeline (card
 * reference lookups pair inline tags with plan paragraphs from this string;
 * a legacy record without it skips that step rather than re-resolving).
 */
function sourceTextOption(record: Pick<StoredTurnRecord, "resolvedSourceText">): { resolvedSourceText?: string } {
  return record.resolvedSourceText !== undefined ? { resolvedSourceText: record.resolvedSourceText } : {};
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ *
 * Verbose debug logging ("listening" trace).
 *
 * When `debugLogging` is enabled every host event the extension listens to,
 * every planning run, and every asset transition is traced to the Lumiverse
 * log with a stable `[VN]` prefix. The flag is cached per user because host
 * events arrive before any config read; the cache refreshes on every config
 * load, so toggling the setting applies from the next event on.
 * ------------------------------------------------------------------ */

const debugFlags = new Map<string, boolean>();

/**
 * Audio imports arrive as one message per file followed by a "done" marker.
 * Messages are handled concurrently, so the done handler must wait for every
 * pending write before rescanning the catalog.
 */
const pendingAudioImports = new Map<string, Promise<void>[]>();

/**
 * Reassembly buffers for chunked audio imports. The host WebSocket bridge
 * caps a frontend->backend message at 4 MB, so files larger than one chunk
 * arrive as ordered pieces sharing a transferId.
 */
const audioImportBuffers = new Map<string, { chunks: Array<string | undefined>; received: number }>();

/** Maximum assembled base64 size (~30 MB of raw audio). */
export const MAX_AUDIO_IMPORT_BASE64 = 40 * 1024 * 1024;

/**
 * Accept one chunk of a (possibly single-chunk) audio import. Returns the
 * complete base64 payload once every chunk has arrived, otherwise null.
 * Oversized transfers throw and drop their buffer.
 */
export function acceptAudioImportChunk(
  bufferKey: string,
  part: { dataBase64: string; chunkIndex?: number; chunkCount?: number }
): string | null {
  const chunkCount = part.chunkCount && part.chunkCount > 1 ? Math.floor(part.chunkCount) : 1;
  if (chunkCount === 1) {
    if (part.dataBase64.length > MAX_AUDIO_IMPORT_BASE64) throw new Error("Audio file too large to import (30 MB max).");
    return part.dataBase64;
  }
  const index = Math.floor(part.chunkIndex ?? 0);
  if (index < 0 || index >= chunkCount) return null;
  const buffer = audioImportBuffers.get(bufferKey) ?? { chunks: new Array<string | undefined>(chunkCount), received: 0 };
  if (buffer.chunks.length !== chunkCount) {
    audioImportBuffers.delete(bufferKey);
    return null;
  }
  if (buffer.chunks[index] === undefined) buffer.received += 1;
  buffer.chunks[index] = part.dataBase64;
  const assembledSoFar = buffer.chunks.reduce((total, chunk) => total + (chunk?.length ?? 0), 0);
  if (assembledSoFar > MAX_AUDIO_IMPORT_BASE64) {
    audioImportBuffers.delete(bufferKey);
    throw new Error("Audio file too large to import (30 MB max).");
  }
  audioImportBuffers.set(bufferKey, buffer);
  if (buffer.received < chunkCount) return null;
  audioImportBuffers.delete(bufferKey);
  return buffer.chunks.join("");
}

/** Drop any unfinished chunk buffers for a user's import session. */
export function clearAudioImportBuffers(userKey: string): void {
  for (const key of [...audioImportBuffers.keys()]) {
    if (key.startsWith(`${userKey}:`)) audioImportBuffers.delete(key);
  }
}

/**
 * Make a browser-supplied relative path safe for scoped storage: forward
 * slashes, no drive letters, no leading slashes, no dot segments.
 */
export function sanitizeAudioImportPath(relativePath: string): string | null {
  const normalized = relativePath
    .replace(/\\/g, "/")
    .replace(/^[A-Za-z]:\//, "")
    .replace(/^\/+/, "");
  const parts = normalized.split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..");
  if (parts.length === 0) return null;
  return parts.join("/");
}

function rememberDebugFlag(userId: string | undefined, config: { debugLogging: boolean }): void {
  debugFlags.set(userId ?? "owner", config.debugLogging);
}

function dbg(spindle: SpindleAPI, userId: string | undefined, message: string): void {
  if (debugFlags.get(userId ?? "owner")) spindle.log.info(`[VN] ${message}`);
}

function summarizeDiagnostics(diagnostics: {
  chatLoaded: boolean;
  characterLoaded: boolean;
  personaLoaded: boolean;
  loreActivated: number;
  loreIncluded: number;
  errors: string[];
}): string {
  const parts = [
    `character=${diagnostics.characterLoaded ? "yes" : "no"}`,
    `persona=${diagnostics.personaLoaded ? "yes" : "no"}`,
    `lore=${diagnostics.loreIncluded}/${diagnostics.loreActivated}`
  ];
  if (diagnostics.errors.length > 0) parts.push(`errors=[${diagnostics.errors.join("; ")}]`);
  return parts.join(" ");
}

/**
 * Per-paragraph stage-effect and ambient views. A paragraph's one-shot effect
 * comes from its visual cue; its persistent ambient comes from the scene that
 * owns the most recent cue at or before that paragraph (falling back to the
 * first scene). Both arrays are omitted when the turn has nothing to show so
 * old records keep their legacy behavior. Explicit ambient nulls are sent to clear.
 */
function effectViews(record: StoredTurnRecord): Pick<TurnView, "effects" | "ambients" | "effectLimits" | "musicLimits"> {
  const paragraphCount = record.plan.paragraphs.length;
  if (paragraphCount === 0) return {};
  const effects: Array<string | null> = new Array(paragraphCount).fill(null);
  // An explicit empty list suppresses legacy effects; only old records fall back.
  for (const cue of record.plan.effectCues ?? record.plan.visualCues) {
    if (cue.effect && cue.paragraphIndex >= 0 && cue.paragraphIndex < paragraphCount) {
      effects[cue.paragraphIndex] = cue.effect;
    }
  }
  const ambients: Array<string | null> = new Array(paragraphCount).fill(null);
  const scenes = record.plan.scenes;
  let sceneIndex = 0;
  for (let index = 0; index < paragraphCount; index += 1) {
    // Scene boundaries are independent of the image budget and cue placement.
    while (sceneIndex + 1 < scenes.length && scenes[sceneIndex + 1]!.startParagraph <= index) {
      sceneIndex += 1;
    }
    ambients[index] = scenes[sceneIndex]?.ambient ?? null;
  }
  const hasEffect = effects.some((value) => value !== null);
  // Explicit null is a clear instruction, not missing data.
  const hasAmbient = scenes.some((scene) => scene.ambient !== undefined);
  return {
    ...(hasEffect ? { effects } : {}),
    ...(record.plan.effectLimits?.length===paragraphCount?{effectLimits:record.plan.effectLimits}:{}),
    ...(record.plan.musicLimits?.length===paragraphCount?{musicLimits:record.plan.musicLimits}:{}),
    ...(hasAmbient ? { ambients } : {})
  };
}

function assetView(record: StoredTurnRecord, job: StoredTurnRecord["jobs"][number]): AssetView {
  const previous = job.status !== "generated" && job.status !== "browser_ready" ? record.previousImages?.[job.jobId] : undefined;
  const cue = record.plan.visualCues.find((candidate) => candidate.assetJobId === job.jobId)
    ?? record.plan.cacheCues?.find((candidate) => candidate.assetJobId === job.jobId);
  const template = record.imageRequests?.filter(r => r.jobId === job.jobId && r.state === "approved").at(-1)?.imagePromptMetadata?.template ?? cue?.imageTemplate;
  const role = template?.id === 'manga-page' ? 'scene' : template?.category === 'portrait' ? 'portrait' : template?.category === 'environment' && template.subjectMode === 'none' ? 'background' : 'scene';
  return {
    ...(cue ? {stageAsset:{role,sceneId:cue.sceneId,sceneRevision:cue.sceneRevision,...(role==='portrait'&&cue.character?{character:cue.character,attire:cue.resolvedAttire??cue.attire??null}:{})}} : {}),
    jobId: job.jobId,
    diagnostic: {...imageDiagnostic(cue, job.status === 'failed'),...(record.plannerMode ? {planner:record.plannerMode} : {})},
    cueId: cue?.cueId ?? job.jobId,
    ...((record.imageRequests?.filter(r => r.jobId === job.jobId && r.state === "approved").at(-1)?.imagePromptMetadata?.template ?? cue?.imageTemplate)?.id === "manga-page" ? { presentation: "page" as const } : {}),
    paragraphIndex: job.paragraphIndex,
    status: job.status,
    ...(job.status === "failed" ? {failureId: `${record.plan.key.revision}:${job.jobId}:${job.startedAt}:${job.finishedAt}`} : {}),
    ...(job.provider === CACHE_JOB_PROVIDER ? { source: "cache" as const } : {}),
    ...(job.imageId || previous?.imageId ? { imageId: job.imageId || previous!.imageId } : {}),
    ...(job.imageUrl || previous?.imageUrl ? { imageUrl: job.imageUrl || previous!.imageUrl } : {}),
    ...(previous ? { previousImage: true } : {}),
    ...(job.error ? { error: job.error } : {})
  };
}

/**
 * Load the data URLs for a turn's audio cues into the bounded cache, then
 * build the view. Keeps `turnView` synchronous while audio bytes stay lazy.
 */
export async function turnViewWithAudio(spindle: SpindleAPI, record: StoredTurnRecord, userId?:string): Promise<TurnView> {
  const cues = record.plan.audioCues?.length
    ? record.plan.audioCues
    : record.plan.visualCues.filter((cue) => Boolean(cue.bgm || cue.sfx));
  try {
    await preloadAudioForCues(spindle, cues);
  } catch {
    // Audio is best-effort: a failed preload only mutes the cue.
  }
  const view=turnView(record);
  const config=await decorateCastAssets(spindle,record,view.assets,userId);
  try{if(config?.tooltips.enabled&&config.tooltips.rememberReferences){const history=await readReferenceHistory(spindle,record,userId);if(history)view.referenceHistory=history;}}catch{/* Optional references never block primary reading. */}
  return view;
}

/** All outgoing turn/asset messages share this display-only projection. */
async function decorateCastAssets(spindle:SpindleAPI,record:StoredTurnRecord,assets:AssetView[],userId?:string):Promise<VisualNovelConfig|null>{
 const token=castArtToken(spindle,record.plan.key.chatId,userId);
 const config=await loadConfig(spindle,userId).catch(()=>null);
 if(!config?.castMode)return config;
 const {castAppearanceIdentity,resolveCueCharacterVisualState,sceneForCue}=await import('./images.js');
 const appearance=await loadCharacterAppearance(spindle,userId,record.plan.key.chatId).catch(()=>({}));
 await Promise.all(assets.map(async asset=>{
  const cue=[...record.plan.visualCues,...(record.plan.cacheCues??[])].find(c=>c.assetJobId===asset.jobId);
  if(!cue||asset.stageAsset?.role!=='portrait')return;
  try{
   const scene=sceneForCue(record.plan,cue),identity=castAppearanceIdentity(scene,cue,appearance);if(!identity)return;
   const visual=resolveCueCharacterVisualState(scene,cue,appearance);
   const url=await findSetupDisplayArt(spindle,record.plan.key.chatId,{character:visual.characterName,baseIdentity:visual.baseIdentity,attire:cue.resolvedAttire!==undefined?cue.resolvedAttire:cue.attire??scene.attire??null},userId)
     ??await findCastDisplayArt(spindle,record.plan.key.chatId,identity.character,identity.fingerprint,userId);
   if(url)asset.stageAsset.displayImageUrl=url;
  }catch{/* Display artwork must never block ordinary reading. */}
 }));
 // An early resolved portrait must not survive management while another is pending.
 if(token!==castArtToken(spindle,record.plan.key.chatId,userId))for(const asset of assets)if(asset.stageAsset)delete asset.stageAsset.displayImageUrl;
 return config;
}
async function assetViewWithCastArt(spindle:SpindleAPI,record:StoredTurnRecord,job:StoredTurnRecord["jobs"][number],userId?:string):Promise<AssetView>{
 const asset=assetView(record,job);await decorateCastAssets(spindle,record,[asset],userId);return asset;
}

export function turnView(record: StoredTurnRecord): TurnView {
  const swipe = record.plan.key.swipeId;
  // Prefer the dedicated audio cue list (added so audio survives the image-cue
  // limit); fall back to bgm/sfx on visual cues for turns planned before this
  // field existed.
  const toAudioView = (cue: { paragraphIndex: number; bgm?: string | null | undefined; sfx?: string | null | undefined }) => ({
    paragraphIndex: cue.paragraphIndex,
    ...(cue.bgm ? { bgm: cue.bgm, bgmUrl: resolveAudioUrl(cue.bgm, "bgm") } : {}),
    ...(cue.sfx ? { sfx: cue.sfx, sfxUrl: resolveAudioUrl(cue.sfx, "sfx") } : {}),
  });
  const audioCues = (record.plan.audioCues?.length
    ? record.plan.audioCues
    : record.plan.visualCues.filter((cue) => Boolean(cue.bgm || cue.sfx))
  ).map(toAudioView);

  const presentation=readerPresentationFor(record.plan,record.presentation);
  return {
    ...(presentation ? {presentation} : {}),
    chatId: record.plan.key.chatId,
    messageId: record.plan.key.assistantMessageId,
    swipeId: typeof swipe === "number" ? swipe : Number(swipe ?? 0) || 0,
    sourceFingerprint: record.plan.key.sourceFingerprint,
    revision: record.plan.key.revision,
    cardRole:record.cardRole??'auto',
    cardRoleAvailable:Boolean(record.cardId),
    subjectCandidates:[...new Map(record.plan.visualCues.filter(c=>c.character).map(c=>[c.character!,{name:c.character!,appearance:c.resolvedIdentity??''}])).values()].slice(0,32),
    speaker: record.speaker,
    userSpeaker: record.userSpeaker || "You",
    paragraphs: record.plan.paragraphs.map((paragraph) => paragraph.text),
    ...(record.plan.panels ? { panels: record.plan.panels } : {}),
    ...(record.plan.panelSource ? { panelSource: record.plan.panelSource } : {}),
    ...(record.plan.paragraphSpeakers?.some((speaker) => speaker !== null)
      ? { paragraphSpeakers: record.plan.paragraphSpeakers }
      : {}),
    ...effectViews(record),
    choices: record.plan.choices.map((choice) => ({ id: choice.id, label: choice.label, value: choice.submission })),
    assets: record.jobs.map((job) => assetView(record, job)),
    ...(record.imageRequests ? { imageRequests: record.imageRequests } : {}),
    ...(audioCues.length > 0 ? { audioCues } : {}),
    status: record.status,
    ...(record.error ? { error: record.error } : {})
  };
}

async function bootstrapLatestAssistantTurn(spindle: SpindleAPI, chatId: string, userId?: string): Promise<void> {
  const messages = await spindle.chat.getMessages(chatId) as NormalizedChatMessage[];
  const latest = [...messages].reverse().find((message) => !message.is_user && message.content.trim());
  if (!latest) return;
  await processAssistantMessage(spindle, chatId, latest, latest.content, userId);
}

/**
 * How a stored turn relates to the message it was planned from, given the
 * message's current intake resolution.
 *
 * - `current`: the record is for this message and its selection fingerprint
 *   matches (or, for a legacy record, the raw text still matches what it was
 *   fingerprinted on). Nothing to replan.
 * - `reselected`: same stored message text, but the scene selection resolved
 *   differently (a picker only sets a chat variable). Replan; when the message
 *   is the chat's sole assistant turn the identity state came from the
 *   discarded scene and is reset.
 * - `changed`: a different message, edited text, or a legacy record whose
 *   fingerprint scheme cannot be compared. Replan with continuity intact.
 */
type RecordRelation = "current" | "reselected" | "changed";

function relateRecord(
  record: StoredTurnRecord | null,
  message: Pick<NormalizedChatMessage, "id" | "swipe_id" | "content">,
  intake: Pick<MessageIntake, "selectionText" | "stableSelection">
): RecordRelation {
  if (!record) return "changed";
  const key = record.plan.key;
  if (key.assistantMessageId !== message.id || (key.swipeId ?? null) !== (message.swipe_id ?? null)) return "changed";
  const selection = fingerprintForMessage({ id: message.id, swipe_id: message.swipe_id, content: intake.selectionText });
  const rawFingerprint = fingerprintForMessage({ id: message.id, swipe_id: message.swipe_id, content: message.content });
  if (record.source?.version === 2) {
    // 1. Raw text changed -> plain edit (replan, preserve continuity).
    if (record.source.rawFingerprint !== rawFingerprint) return "changed";
    // 2. Raw text identical, selection identical -> current.
    if (key.sourceFingerprint === selection) return "current";
    // 3. Raw text identical, selection differs:
    //    Only a stable selection change is a genuine re-selection that resets identity.
    //    An unstable selection (volatile condition or stateful macro re-rolled)
    //    replans without reset so the new branch is shown with identity preserved.
    return intake.stableSelection ? "reselected" : "changed";
  }
  // Legacy records: fingerprinted on raw text (pre-macro intake) or on the
  // fully resolved text (volatile output included). Either exact match means
  // the stored turn still describes this message; anything else replans once
  // and upgrades the record, never resetting identity on a guess.
  if (key.sourceFingerprint === selection || key.sourceFingerprint === rawFingerprint) return "current";
  return "changed";
}

function selectionFingerprint(message: Pick<NormalizedChatMessage, "id" | "swipe_id">, intake: Pick<MessageIntake, "selectionText">): string {
  return fingerprintForMessage({ id: message.id, swipe_id: message.swipe_id, content: intake.selectionText });
}

export async function sendState(
  spindle: SpindleAPI,
  chatId: string,
  userId?: string,
  options: { viewOpen?: boolean;readOnly?:boolean; requestId?: string | undefined } = {}
): Promise<void> {
  // No active chat (home screen): whatever view was open is gone. Close it
  // before the first await so a reply landing meanwhile is already gated.
  if (!chatId) closeOpenView(spindle, userId, "no_active_chat");
  if(chatId&&options.requestId&&options.viewOpen!==false)preparationSessions.set(runtimeKey(userId,chatId),options.requestId);
  const config = await loadConfig(spindle, userId);
  rememberDebugFlag(userId, config);
  if (!chatId) {
    spindle.sendToFrontend({ type: "vn_state", chatId: "", config, turn: null, requestId: options.requestId }, userId);
    return;
  }
  // Only an explicit flag changes the view state. A state request that says
  // nothing about the view (background reconcile, older frontends) must never
  // open it, or closed chats would start paying for planning and images again.
  if (options.viewOpen === true) openView(spindle, userId, chatId);
  else if (options.viewOpen === false) closeView(spindle, userId, chatId, "state_request");
  // The scene cache follows the chat the user is looking at, not background requests.
  if (views.isOpen(userId, chatId)) noteActiveChat(spindle, userId, chatId);
  const chatState = await loadChatState(spindle, chatId, userId);
  let record: StoredTurnRecord | null = null;
  try {
    record = await loadTurnRecord(spindle, chatState.activeTurnPath, userId);
    if (record && record.plan.key.chatId !== chatId) {
      spindle.log.warn("Stored visual novel turn belongs to another chat; rebuilding it from the current chat.");
      record = null;
    }
  } catch (error) {
    spindle.log.warn(`Stored visual novel turn could not be loaded; rebuilding it from chat: ${errorText(error)}`);
  }
  // The stored turn can be stale for two reasons: a newer reply arrived
  // while the view was closed, or the same message resolves to a different
  // scene (a LumiRealm picker only sets a chat variable). Both are decided
  // BEFORE the state is sent so a stale turn is never rendered first. Only
  // messages that contain macro syntax reach the host; a host that cannot
  // resolve right now (interceptor not loaded, transient error) keeps the
  // stored turn instead of replacing it.
  let stale: { message: NormalizedChatMessage; intake: MessageIntake | null; relation: RecordRelation } | null = null;
  if (record) {
    try {
      const messages = await spindle.chat.getMessages(chatId) as NormalizedChatMessage[];
      const latest = [...messages].reverse().find((message) => !message.is_user && message.content.trim());
      if (latest) {
        const isSame = latest.id === record.plan.key.assistantMessageId;
        if (!isSame) {
          stale = { message: latest, intake: null, relation: "changed" };
        } else if (needsResolution(latest.content)) {
          const intake = await resolveMessageIntake(spindle, chatId, latest.content, userId);
          const relation = relateRecord(record, latest, intake);
          if (relation !== "current" && !intake.resolved) {
            dbg(spindle, userId, `host could not resolve message ${latest.id}; keeping the stored turn chat=${chatId}`);
          } else if (relation !== "current") {
            stale = { message: latest, intake, relation };
          }
        } else if (relateRecord(record, latest, { selectionText: latest.content, stableSelection: true }) !== "current") {
          stale = { message: latest, intake: { text: latest.content, selectionText: latest.content, resolved: true, stableSelection: true }, relation: "changed" };
        }
      }
    } catch (error) {
      spindle.log.warn(`Stored turn freshness check failed; sending the stored turn: ${errorText(error)}`);
    }
  }
  if (record && !stale && !assetControllers.has(runtimeKey(userId, chatId)) && record.imageRequests?.some((request) => request.state === "review")) {
    record = { ...record, imageRequests: record.imageRequests.map((request) => request.state === "review" ? { ...request, state: "cancelled" as const } : request), jobs: record.jobs.map((job) => job.status === "queued" || job.status === "generating" ? AssetJobSchema.parse({ ...job, status: "cancelled", finishedAt: new Date().toISOString() }) : job) };
    if (chatState.activeTurnPath) await saveTurnRecord(spindle, chatState.activeTurnPath, record, userId);
  }
  if(record && !stale && spindle.chats?.get) {
    try {
      const chat=await spindle.chats.get(chatId,userId);
      if(chat?.character_id) record={...record,cardId:chat.character_id,cardRole:await loadCardRole(spindle,chatId,chat.character_id,userId)};
    } catch(error) {spindle.log.warn(`Card role unavailable: ${errorText(error)}`);}
  }
  spindle.sendToFrontend({
    type: "vn_state",
    requestId: options.requestId,
    chatId,
    config,
    turn: record && !stale ? await turnViewWithAudio(spindle, record,userId) : null,
    readingPosition: await loadReadingPosition(spindle, chatId, userId)
  }, userId);
  const canPlan = !options.readOnly&&config.enabled && views.isOpen(userId, chatId);
  if (!record) {
    if (canPlan) await bootstrapLatestAssistantTurn(spindle, chatId, userId);
    else dbg(spindle, userId, `skipped bootstrap: ${config.enabled ? "view closed" : "extension disabled (enabled=false)"} chat=${chatId}`);
    return;
  }
  if (!canPlan || !stale) return;
  dbg(spindle, userId, stale.relation === "reselected"
    ? `scene selection changed; replanning with the resolved text chat=${chatId}`
    : `stored turn is stale (newer or changed reply); planning the latest reply chat=${chatId}`);
  await processAssistantMessage(spindle, chatId, stale.message, stale.message.content, userId, stale.intake ? { precomputedIntake: stale.intake } : {});
  // A close mid-batch leaves cancelled jobs behind. They are not resumed
  // automatically on reopen (a GENERATION_STARTED abort looks the same and a
  // newer reply is usually on its way); the reading view offers Retry for them.
}

async function persistActiveTurn(
  spindle: SpindleAPI,
  record: StoredTurnRecord,
  path: string,
  userId?: string,
  isCurrent?: () => boolean
): Promise<void> {
  if (isCurrent && userId) {
    if (!await saveTurnRecordIfCurrent(spindle, path, record, userId, isCurrent)) return;
  } else await saveTurnRecord(spindle, path, record, userId);
  if (isCurrent && !isCurrent()) return;
  const lastScene = record.plan.scenes.at(-1) ?? null;
  await saveChatState(spindle, record.plan.key.chatId, {
    schemaVersion: 1,
    activeTurnPath: path,
    latestScene: lastScene && record.plan.terminalVisualState ? {
      ...lastScene,
      character: record.plan.terminalVisualState.character,
      ...(record.plan.terminalVisualState.characterId ? { characterId: record.plan.terminalVisualState.characterId } : {}),
      ...(record.plan.terminalVisualState.subjectCategory ? { subjectCategory: record.plan.terminalVisualState.subjectCategory } : {}),
      identityPrompt: record.plan.terminalVisualState.identity || null,
      attire: record.plan.terminalVisualState.attire,
      continuity: record.plan.terminalContinuity,
      activeAssetId: null
    } : lastScene,
    terminalContinuity: record.plan.terminalContinuity,
    updatedAt: new Date().toISOString()
  }, userId, isCurrent);
}

async function startAssets(
  spindle: SpindleAPI,
  record: StoredTurnRecord,
  path: string,
  userId?: string,
  options: { bypassJobIds?: Iterable<string>; onlyJobId?: string; forceReview?: boolean; initialEdits?: ImageRequestEdits; regeneratePrompt?:boolean } = {}
): Promise<void> {
  const key=runtimeKey(userId,record.plan.key.chatId),start=Symbol();pendingAssetStarts.set(key,start);
  let config:VisualNovelConfig;
  try{config=await loadConfig(spindle,userId);}catch(error){if(pendingAssetStarts.get(key)===start)pendingAssetStarts.delete(key);throw error;}
  if(pendingAssetStarts.get(key)!==start)return;
  pendingAssetStarts.delete(key);
  rememberDebugFlag(userId, config);
  if (!config.generateImages || record.jobs.length === 0) return;
  const requiresReview = config.reviewImages || Boolean(options.onlyJobId) || Boolean(options.forceReview) || record.forceImageReview === true;
  // The view may have closed between planning and this batch start; a closed
  // view means nobody sees (or pays for) these images.
  if (!views.isOpen(userId, record.plan.key.chatId)) {
    dbg(spindle, userId, `skipped asset batch: view closed chat=${record.plan.key.chatId}`);
    await cancelIncompleteJobs(spindle, record.plan.key.chatId, userId, record.plan.key);
    return;
  }
  const cacheServed = record.jobs.filter((job) => job.provider === CACHE_JOB_PROVIDER).length;
  dbg(spindle, userId, `assets starting: ${record.jobs.length - cacheServed} generated job(s)${cacheServed ? ` + ${cacheServed} cache-served swap(s) (not generated)` : ""} for chat=${record.plan.key.chatId} message=${record.plan.key.assistantMessageId} concurrency=${config.imageConcurrency}`);
  if (!compareTurnKeys(activeTurnKeys.get(key) ?? null, record.plan.key).accepted) return;
  assetControllers.get(key)?.abort("A newer turn replaced this asset batch.");
  const controller = new AbortController();
  assetControllers.set(key, controller);
  // Every batch start supersedes the previous batch's cache admission, so a
  // late result from the replaced batch can never populate the active cache.
  releaseSceneCacheAdmission(spindle, userId, record.plan.key.chatId, "batch_start");
  const scope = sceneImageScope(userId, record.plan.key.chatId);
  const admission = sceneCache.admission(scope);
  let current = record;
  const ownsBatch=()=>assetControllers.get(key)===controller&&compareTurnKeys(activeTurnKeys.get(key)??null,record.plan.key).accepted;
  const saveBatch=async()=>{if(userId)await saveTurnRecordIfCurrent(spindle,path,current,userId,ownsBatch);else if(ownsBatch())await saveTurnRecord(spindle,path,current,userId);};
  const gate = new ImageReviewGate(async (request) => {
    if (assetControllers.get(key) !== controller) return;
    if (controller.signal.aborted && request.state !== "cancelled" && request.state !== "skipped") return;
    if (!compareTurnKeys(activeTurnKeys.get(key) ?? null, record.plan.key).accepted) return;
    const requests = safeImageHistory([...(current.imageRequests ?? []).filter((entry) => entry.requestId !== request.requestId), request]);
    current = { ...current, imageRequests: requests, updatedAt: new Date().toISOString() };
    await saveBatch();
    if (!ownsBatch())return;
    if (!compareTurnKeys(activeTurnKeys.get(key) ?? null, record.plan.key).accepted) return;
    spindle.sendToFrontend({ type: "vn_image_requests", chatId: record.plan.key.chatId, messageId: record.plan.key.assistantMessageId, sourceFingerprint: record.plan.key.sourceFingerprint, requests }, userId);
  });
  imageReviewGates.set(key, gate);
  const mergeJobs = (jobs: StoredTurnRecord["jobs"]): StoredTurnRecord["jobs"] => options.onlyJobId ? current.jobs.map((job) => jobs.find((entry) => entry.jobId === job.jobId) ?? job) : jobs;
  const batchPlan = options.onlyJobId ? { ...record.plan, visualCues: [...record.plan.visualCues, ...(record.plan.cacheCues ?? [])].filter((cue) => cue.assetJobId === options.onlyJobId), cacheCues: [] } : record.plan;
  const batchJobs = options.onlyJobId ? record.jobs.filter((job) => job.jobId === options.onlyJobId) : record.jobs;

  try {
    const finalJobs = await generateAssets(
      spindle,
      batchPlan,
      batchJobs,
      config,
      controller.signal,
      async (jobs, changed) => {
        dbg(spindle, userId, `asset ${changed.jobId} p${changed.paragraphIndex} [${changed.priority}] -> ${changed.status}${changed.imageId ? ` image=${changed.imageId}` : ""}${changed.error ? ` error="${changed.error}"` : ""}`);
        const active = activeTurnKeys.get(key) ?? null;
        if (assetControllers.get(key) !== controller) return;
        if (!compareTurnKeys(active, changed.ownerTurnKey).accepted) return;
        current = { ...current, jobs: mergeJobs(jobs), updatedAt: new Date().toISOString() };
        await saveBatch();
        const asset=await assetViewWithCastArt(spindle,current,changed,userId);
        if(controller.signal.aborted||(assetControllers.has(key)&&assetControllers.get(key)!==controller)||!compareTurnKeys(activeTurnKeys.get(key)??null,changed.ownerTurnKey).accepted)return;
        const latestJob=current.jobs.find(j=>j.jobId===changed.jobId);
        if(latestJob?.status!==changed.status||latestJob.imageId!==changed.imageId)return;
        spindle.sendToFrontend({
          type: "vn_asset",
          chatId: record.plan.key.chatId,
          messageId: record.plan.key.assistantMessageId,
          sourceFingerprint: current.plan.key.sourceFingerprint,
          swipeId: current.plan.key.swipeId,
          revision: current.plan.key.revision,
          asset
        }, userId);
      },
      userId,
      {
        sceneCache, admission,
        independentRequests: requiresReview,
        disableCacheStore: requiresReview,
        ...(config.reviewImages ? { bypassJobIds: batchJobs.map((job) => job.jobId) } : options.bypassJobIds ? { bypassJobIds: options.bypassJobIds } : {}),
        ...sourceTextOption(record),
        beforeGenerate: async (job, request, metadata, jobSignal) => {
          let draft = options.onlyJobId === job.jobId && options.initialEdits ? applyImageEdits(request,options.initialEdits) : request;
          if(options.onlyJobId===job.jobId && options.regeneratePrompt){
            if(!metadata.regeneratePrompt)throw new Error('Prompt regeneration is unavailable for this picture.');
            draft=await metadata.regeneratePrompt(draft);
          }
          draft.parameters = modelOutputParameters(metadata.provider, draft.model, draft.parameters ?? {});
          return gate.prepare(job.jobId, job.paragraphIndex, draft, metadata, requiresReview, jobSignal);
        }
      }
    );
    const active = activeTurnKeys.get(key) ?? null;
    if (assetControllers.get(key)===controller && compareTurnKeys(active, record.plan.key).accepted) {
      current = { ...current, jobs: mergeJobs(finalJobs), updatedAt: new Date().toISOString() };
      await saveBatch();
    }
  } finally {
    if (assetControllers.get(key) === controller) assetControllers.delete(key);
    if (imageReviewGates.get(key) === gate) imageReviewGates.delete(key);
  }
}

/** Provider calls may ignore abort. Release only the aborted owner; its late
 * callbacks are rejected by controller identity and serialized write guards. */
function releaseAbortedImageBatch(key:string):void {
 if(!assetControllers.get(key)?.signal.aborted)return;
 assetControllers.delete(key);imageReviewGates.delete(key);preparingSingleImages.delete(key);
}

async function prepareSingleImage(spindle: SpindleAPI, request: Extract<FrontendRequest, { type: "vn_prepare_image" | "vn_correct_image_subject" }>, userId: string): Promise<void> {
  const key = runtimeKey(userId, request.chatId);
  releaseAbortedImageBatch(key);
  if (preparingSingleImages.has(key)||recoveringImageBatches.has(key)||pendingAssetStarts.has(key)) throw new Error("A picture is already being prepared or recovered.");
  const preparation=Symbol();preparingSingleImages.set(key,preparation);
  try { await prepareSingleImageUnlocked(spindle, request, userId); }
  finally { if(preparingSingleImages.get(key)===preparation)preparingSingleImages.delete(key); }
}

async function prepareSingleImageUnlocked(spindle: SpindleAPI, request: Extract<FrontendRequest, { type: "vn_prepare_image" | "vn_correct_image_subject" }>, userId: string): Promise<void> {
  const key = runtimeKey(userId, request.chatId);
  const epoch=intakeEpochs.get(key)??0;
  const correction=request.type==='vn_correct_image_subject' ? CorrectImageSubjectRequestSchema.parse(request) : undefined;
  const config = await loadConfig(spindle, userId);
  if (!config.generateImages) throw new Error("Enable generated pictures in settings before preparing a replacement.");
  if(request.type === 'vn_prepare_image' && request.edits !== undefined) applyImageEdits({prompt:''},request.edits);
  const template = request.templateId === undefined ? undefined : config.imageTemplates.find(item => item.id === request.templateId);
  if (request.templateId !== undefined && !template) throw new Error("This template is unavailable.");
  if (!views.isOpen(userId, request.chatId)) throw new Error("Open the visual novel before preparing a picture.");
  if (assetControllers.has(key)) throw new Error("Generate or skip the waiting pictures before preparing a replacement.");
  const state = await loadChatState(spindle, request.chatId, userId);
  const record = await loadTurnRecord(spindle, state.activeTurnPath, userId);
  if (!record || record.plan.key.chatId !== request.chatId || record.plan.key.assistantMessageId !== request.messageId || record.plan.key.sourceFingerprint !== request.sourceFingerprint) throw new Error("This picture belongs to an older turn.");
  const messages = await spindle.chat.getMessages(request.chatId) as NormalizedChatMessage[];
  const latest = [...messages].reverse().find((message) => !message.is_user && message.content.trim());
  if (!latest || latest.id !== request.messageId) throw new Error("A newer reply has replaced this picture.");
  const intake = await resolveMessageIntake(spindle, request.chatId, latest.content, userId);
  if (!intake.resolved || relateRecord(record, latest, intake) !== "current" || !views.isOpen(userId, request.chatId)) throw new Error("The source changed or the view closed. Refresh the visual novel first.");
  const active = activeTurnKeys.get(key);
  if (active && !compareTurnKeys(active, record.plan.key).accepted) throw new Error("This picture belongs to an older turn.");
  if((intakeEpochs.get(key)??0)!==epoch) throw new Error("A newer generation replaced this correction.");
  activeTurnKeys.set(key, record.plan.key);
  if(correction && record.correctionRequestIds?.includes(correction.requestId)) throw new Error("This correction has already been prepared.");
  if(correction && Number(record.plan.key.swipeId??0)!==correction.swipeId) throw new Error('This correction belongs to an older swipe.');
  const job = record.jobs.find((entry) => entry.jobId === request.jobId);
  if (!job || ![...record.plan.visualCues, ...(record.plan.cacheCues ?? [])].some((cue) => cue.assetJobId === job.jobId)) throw new Error("This picture cannot be prepared from this turn.");
  if(job.provider===CACHE_JOB_PROVIDER) throw new Error("This is a reuse-only picture outside the image budget. Choose one of this reply’s generated pictures instead.");
  const previousImages = { ...record.previousImages };
  if (job.imageId && job.imageUrl) previousImages[job.jobId] = { imageId: job.imageId, imageUrl: job.imageUrl };
  const queued = AssetJobSchema.parse({ ...job, status: "queued", imageId: null, imageUrl: null, error: null, queuedAt: new Date().toISOString(), startedAt: null, generatedAt: null, readyAt: null, finishedAt: null });
  const registry=correction ? await loadCharacterRegistry(spindle,request.chatId,userId) : {};
  let corrected: StoredTurnRecord['plan']['visualCues'][number] | undefined;
  const updateCue = (cue: StoredTurnRecord['plan']['visualCues'][number]) => {
    if(cue.assetJobId!==job.jobId) return cue;
    const selected=template ? {...cue,imageTemplate:templateSnapshot(template),imageTemplateReason:'Manual template selection',presentationRuleTrace:undefined} : cue;
    if(!correction) return selected;
    corrected={...correctVisualSubject(selected,correction.subject,registry,config.imageTemplates),visualSources:['manual subject correction'],imageTemplateReason:'Manual subject correction',presentationRuleTrace:undefined};
    return corrected;
  };
  const next = { ...record, ...(correction ? {correctionRequestIds:[...(record.correctionRequestIds??[]),correction.requestId].slice(-32)} : {}), plan: { ...record.plan, visualCues: record.plan.visualCues.map(updateCue), ...(record.plan.cacheCues ? { cacheCues: record.plan.cacheCues.map(updateCue) } : {}) }, previousImages, jobs: record.jobs.map((entry) => entry.jobId === job.jobId ? queued : entry) };
  const path = state.activeTurnPath!;
  const isCurrent=()=>views.isOpen(userId,request.chatId) && !assetControllers.has(key) && (intakeEpochs.get(key)??0)===epoch && compareTurnKeys(activeTurnKeys.get(key)??null,record.plan.key).accepted;
  if(!isCurrent()) throw new Error('This picture changed while preparing the correction.');
  if(correction?.subject.kind==='character' && correction.subject.saveAppearance && corrected?.character && corrected.resolvedIdentity) await saveCorrectedAppearance(spindle,request.chatId,corrected.character,corrected.resolvedIdentity,userId);
  if(!isCurrent() || !await saveTurnRecordIfCurrent(spindle,path,next,userId,isCurrent)) return;
  if(!isCurrent()) return;
  const view=await turnViewWithAudio(spindle,next,userId);
  if(!isCurrent())return;
  spindle.sendToFrontend({ type: "vn_turn", turn:view }, userId);
  await startAssets(spindle, next, path, userId, { onlyJobId: job.jobId, bypassJobIds: [job.jobId],...(request.type === 'vn_prepare_image' && request.edits ? {initialEdits:request.edits} : {}),...(request.type==='vn_prepare_image' && request.regeneratePrompt===true ? {regeneratePrompt:true} : {}) });
}

async function processAssistantMessage(
  spindle: SpindleAPI,
  chatId: string,
  message: NormalizedChatMessage,
  content: string,
  userId?: string,
  options?: { retry?: boolean; forceRegenerate?: boolean; precomputedIntake?: MessageIntake }
): Promise<void> {
  if (!content.trim() || message.is_user) return;
  // Macro intake: the raw stored text may hold every alternative scene of a
  // RisuAI card greeting. Resolve once, cache for this planning run, and use
  // the resolved text everywhere (plan, storage, frontend). Fingerprints use
  // the selection text (volatile macros masked) so `{{random}}`/`{{time}}`
  // output never looks like a new scene.
  const intakeKey = runtimeKey(userId, chatId);
  const intakeEpoch = intakeEpochs.get(intakeKey) ?? 0;
  const resolutionCache: MessageResolutionCache = new Map();
  const intake = options?.precomputedIntake ?? await resolveMessageIntake(spindle, chatId, content, userId);
  if ((intakeEpochs.get(intakeKey) ?? 0) !== intakeEpoch) {
    dbg(spindle, userId, `intake for message ${message.id} superseded while resolving; dropped`);
    return;
  }
  const resolved = intake.text;
  resolutionCache.set(resolutionCacheKey(message), resolved);
  if (resolved !== content) dbg(spindle, userId, `message ${message.id} macro-resolved: ${content.length} -> ${resolved.length} chars`);
  const path = turnPath(chatId, message.id, message.swipe_id);
  const existing = await loadTurnRecord(spindle, path, userId);
  const relation = relateRecord(existing, message, intake);
  // The host could not resolve the message right now (no interceptor loaded,
  // transient error). A turn already planned from a successful resolution
  // stays authoritative: never replace it with a waiting state or a replan
  // built from the stripped raw text.
  if (!intake.resolved && existing && !options?.forceRegenerate) {
    dbg(spindle, userId, `message ${message.id} could not be resolved by the host; keeping the stored turn`);
    const key = runtimeKey(userId, chatId);
    activeTurnKeys.set(key, existing.plan.key);
    await persistActiveTurn(spindle, existing, path, userId);
    spindle.sendToFrontend({ type: "vn_turn", turn: await turnViewWithAudio(spindle, existing,userId) }, userId);
    return;
  }
  if (isUnselectedGreeting(content, resolved)) {
    dbg(spindle, userId, `message ${message.id} has no narrative after macro resolution; waiting for a scene selection`);
    spindle.sendToFrontend({ type: "vn_waiting", chatId, messageId: message.id, reason: "greeting_unselected" }, userId);
    return;
  }
  const fingerprint = selectionFingerprint(message, intake);
  const rawFingerprint = fingerprintForMessage({ id: message.id, swipe_id: message.swipe_id, content });
  if (!options?.retry && !options?.forceRegenerate && existing && relation === "current") {
    const hasIncompleteJobs = existing.jobs.some(
      (job) => job.status === "failed" || job.status === "cancelled" || job.status === "queued" || job.status === "generating"
    );
    if (!hasIncompleteJobs) {
      dbg(spindle, userId, `turn reused from storage chat=${chatId} message=${message.id} fingerprint=${fingerprint}`);
      const key = runtimeKey(userId, chatId);
      activeTurnKeys.set(key, existing.plan.key);
      await persistActiveTurn(spindle, existing, path, userId);
      spindle.sendToFrontend({ type: "vn_turn", turn: await turnViewWithAudio(spindle, existing,userId) }, userId);
      return;
    }
  }

  const dedupeId = `${message.id}:${message.swipe_id}:${fingerprint}`;
  dbg(spindle, userId, `planning enqueued chat=${chatId} message=${message.id} swipe=${message.swipe_id} fingerprint=${fingerprint}`);
  const scheduled = planningQueue.enqueue(userId, chatId, message.id, async (operation) => {
    const planningStartedAt = Date.now();
    if(views.isOpen(userId,chatId))spindle.sendToFrontend({type:'vn_planning',chatId},userId);
    const config = await loadConfig(spindle, userId);
    rememberDebugFlag(userId, config);
    const messages = await spindle.chat.getMessages(chatId) as NormalizedChatMessage[];
    const referenceSnapshot=referenceMessages(messages,message.id);
    // Greeting replacement: the same stored message re-resolved to a different
    // scene while it is the chat's only assistant turn. The durable identity
    // state (frozen protagonist, registry, appearance roster, scene lineage)
    // came from the discarded scene; the predecessor state of such a chat is
    // empty, so restore that instead of leaking the old cast into the newly
    // selected scene. Mid-chat turns are never reset.
    // Only a re-selection (same stored text, different resolved scene) resets;
    // a plain edit of the greeting keeps continuity and identity.
    const assistantTurns = messages.filter((candidate) => !candidate.is_user && candidate.content.trim());
    const replacesGreeting = relation === "reselected"
      && assistantTurns.length === 1
      && assistantTurns[0]!.id === message.id;
    if (replacesGreeting) {
      dbg(spindle, userId, `greeting ${message.id} re-resolved to a different scene; resetting this chat's identity state`);
      await resetChatIdentityState(spindle, chatId, userId);
      releaseSceneCacheScope(spindle, userId, chatId, "scope_cleared");
    }
    const chatState = await loadChatState(spindle, chatId, userId);
    const setupToken = castArtToken(spindle, chatId, userId);
    const identityCurrent = () => !operation.controller.signal.aborted && setupToken === castArtToken(spindle, chatId, userId);
    const singleCharacter = await loadSingleCharacterState(spindle, chatId, userId);
    const characterAppearance = await loadCharacterAppearance(spindle, userId, chatId);
    const characterRegistry = await loadCharacterRegistry(spindle, chatId, userId);
    const recentMessages = config.includeRecentMessages > 0
      ? await resolveContextMessages(spindle, chatId, messages.slice(-config.includeRecentMessages), resolutionCache, userId)
      : [];
    const result = await planTurn(spindle, {
      onNarrativePrepared: paragraphs=>{
        const sessionId=preparationSessions.get(intakeKey);
        if(!sessionId||operation.controller.signal.aborted||!views.isOpen(userId,chatId)||(intakeEpochs.get(intakeKey)??0)!==intakeEpoch)return;
        const preview=NarrativePreviewSchema.safeParse({type:'vn_narrative_preview',chatId,messageId:message.id,swipeId:message.swipe_id??0,sourceFingerprint:fingerprint,sessionId,paragraphs});
        if(preview.success)spindle.sendToFrontend(preview.data,userId);
      },
      signal: operation.controller.signal,
      chatId,
      message,
      content: resolved,
      sourceFingerprint: fingerprint,
      previousScene: replacesGreeting ? null : options?.retry && existing ? existing.plan.scenes[0] ?? null : chatState.latestScene,
      previousContinuity: replacesGreeting ? null : options?.retry && existing ? existing.plan.initialContinuity : chatState.terminalContinuity,
      recentMessages,
      config,
      singleCharacter,
      characterAppearance,
      characterRegistry,
      gameHints: gameHintsForTurn(messages, message.id),
      ...(config.includeSimTrackerContext ? { simTrackerEvidence: extractSimTracker(messages, message.id, config.simTrackerMappings) } : {}),
      ...(userId ? { userId } : {})
    });
    if (operation.controller.signal.aborted) return;
    dbg(spindle, userId, [
      `planned chat=${chatId} message=${message.id} in ${Date.now() - planningStartedAt}ms`,
      `fallback=${result.usedFallback ? "yes" : "no"}`,
      `paragraphs=${result.plan.paragraphs.length}`,
      `scenes=${result.plan.scenes.length} (${result.plan.scenes.map((scene) => `${scene.sceneId}@p${scene.startParagraph} rev${scene.revision} "${scene.environment.location}"`).join(", ")})`,
      `cues=${result.plan.visualCues.length} [${result.plan.visualCues.map((cue) => `p${cue.paragraphIndex}:${cue.poseExpressionId ?? "?"}${cue.character ? `(${cue.character})` : ""}`).join(", ")}]`,
      `audio=${result.plan.audioCues.length} [${result.plan.audioCues.map((cue) => `p${cue.paragraphIndex}:${[cue.bgm ? `bgm=${cue.bgm}` : "", cue.sfx ? `sfx=${cue.sfx}` : ""].filter(Boolean).join("+")}`).join(", ")}]`,
      `effects=[${(result.plan.effectCues ?? result.plan.visualCues).filter((cue) => cue.effect).map((cue) => `p${cue.paragraphIndex}:${cue.effect}`).join(", ")}]`,
      `ambients=[${result.plan.scenes.map((scene) => `p${scene.startParagraph}:${scene.ambient === undefined ? "omitted" : scene.ambient}`).join(", ")}]`,
      `choices=${result.plan.choices.length}`,
      `protagonist="${result.singleCharacter.protagonist.name}" tags=${result.singleCharacter.protagonist.tags.length}`,
      `subject=${result.plan.terminalVisualState?.characterId ?? "?"}/${result.plan.terminalVisualState?.subjectCategory ?? "unknown"}`,
      `registry=${Object.values(result.characterRegistry).map((entry) => `${entry.id}${entry.aliases.length ? `(${entry.aliases.join("/")})` : ""}`).join(",")}`,
      ...(result.rejectedAliases.length ? [`rejectedAliases=[${result.rejectedAliases.map((item) => `${item.alias}->${item.requestedFor} owned by ${item.ownedBy}`).join("; ")}]`] : []),
      ...(result.rejectedSubjects.length ? [`rejectedSubjects=[${result.rejectedSubjects.map((item) => `${item.name}: ${item.requested} kept ${item.durable}`).join("; ")}]`] : []),
      `context: ${summarizeDiagnostics(result.contextDiagnostics)}`
    ].join(" | "));
    await mergeCharacterAppearanceFromState(spindle, singleCharacter, userId, chatId, identityCurrent);
    await saveSingleCharacterState(spindle, chatId, result.singleCharacter, userId, identityCurrent);
    await mergeCharacterAppearanceFromState(spindle, result.singleCharacter, userId, chatId, identityCurrent);
    if (result.extractedCharacters && result.extractedCharacters.length > 0) {
      await mergePlannerCharacters(spindle, result.extractedCharacters, userId, chatId, identityCurrent);
    }
    // Persist stable ids, explicit aliases and subject categories learned this turn.
    await saveCharacterRegistry(spindle, chatId, result.characterRegistry, userId, identityCurrent);
        let jobs: StoredTurnRecord["jobs"] = [];
    if (config.useNativeCardImages) {
      try {
        jobs = await resolveNativeCardJobs({
          spindle,
          chatId,
          plan: result.plan,
          content: resolved,
          speakerName: message.name,
          userId,
        });
      } catch (err) {
        if (config.debugLogging) spindle.log.warn(`Native card image resolution failed: ${errorText(err)}`);
      }
    } else if (config.generateImages) {
      jobs = await prepareAssetJobs(spindle, result.plan, config, characterAppearance, sceneCache, userId, sourceTextOption({ resolvedSourceText: resolved }));
      // Reuse-only candidates beyond the image cap: deterministic cache lookup
      // before the first vn_turn. Hits become terminal jobs; misses add nothing.
      if (result.plan.cacheCues?.length) {
        const scope = sceneImageScope(userId, chatId);
        retainPlanEpisodes(sceneCache, scope, result.plan);
        const extra = await resolveCacheCues(spindle, result.plan, config, characterAppearance, jobs, sceneCache, userId, {
          log: (line) => dbg(spindle, userId, line),
          ...sourceTextOption({ resolvedSourceText: resolved })
        });
        if (extra.length > 0) {
          dbg(spindle, userId, `scene-cache resolved ${extra.length} extra swap(s) beyond the image cap without requests (cap=${config.maxImagesPerTurn}, budgeted=${jobs.length})`);
          jobs = [...jobs, ...extra];
        }
      }
    }
    let userSpeaker = "You";
    try {
      const persona = await spindle.personas?.getActive?.(userId);
      if (persona?.name?.trim()) {
        userSpeaker = persona.name.trim();
      }
    } catch {}
    if (userSpeaker === "You") {
      try {
        const recent = (await spindle.chat.getMessages(chatId) as NormalizedChatMessage[]);
        const lastUser = [...recent].reverse().find((m) => m.role === "user" || Boolean(m.is_user));
        if (lastUser?.name?.trim()) {
          userSpeaker = lastUser.name.trim();
        }
      } catch {}
    }

    const settingsSnapshot: Record<string, unknown> = {
      promptPrefix: config.promptPrefix,
      promptSuffix: config.promptSuffix,
      negativePrompt: config.negativePrompt,
      imageConnectionId: config.imageConnectionId,
      imageModel: config.imageModel,
      imageConcurrency: config.imageConcurrency
    };
    const nowTime = new Date().toISOString();
    const record: StoredTurnRecord = {
      schemaVersion: 1,
      cardRole:result.cardRole,
      plannerMode: result.usedFallback ? 'fallback' : 'model',
      ...(relation === 'current' && existing?.forceImageReview ? {forceImageReview:true} : {}),
      ...(relation === 'current' && existing?.replanRequestIds ? {replanRequestIds:existing.replanRequestIds} : {}),
      ...(result.cardId ? {cardId:result.cardId} : {}),
      speaker: result.cardRole === "scenario" ? "Narrator" : message.name || "Narrator",
      userSpeaker,
      status: "ready",
      plan: result.plan,
      jobs,
      updatedAt: nowTime,
      resolvedSourceText: resolved,
      source: { version: 2, rawFingerprint },
      referenceLineage:preserveReferenceLineage(existing?.referenceLineage,await captureReferenceLineage(referenceSnapshot??[],result.plan,content)),
      settingsSnapshot,
      attempts: [
        {
          attemptNumber: 1,
          timestamp: nowTime,
          settings: settingsSnapshot
        }
      ]
    };
    // The view may have closed (or a new generation started) during the awaits
    // above. Persisting or sending now would resurrect a turn nobody is watching.
    if (operation.controller.signal.aborted) {
      dbg(spindle, userId, `planned turn dropped after abort chat=${chatId} message=${message.id}`);
      return;
    }
    const key = runtimeKey(userId, chatId);
    activeTurnKeys.set(key, record.plan.key);
    await persistActiveTurn(spindle, record, path, userId, () => !operation.controller.signal.aborted);
    if (operation.controller.signal.aborted) return;
    const view = await turnViewWithAudio(spindle, record,userId);
    if (operation.controller.signal.aborted) return;
    spindle.sendToFrontend({ type: "vn_turn", turn: view }, userId);
    if (!config.useNativeCardImages && config.generateImages) {
      void startAssets(spindle, record, path, userId).catch((error) => {
        if (!isAbortError(error)) {
          spindle.log.error(`Visual novel asset pipeline failed: ${errorText(error)}`);
          spindle.sendToFrontend({ type: "vn_error", chatId, operation: "generate_assets", error: errorText(error) }, userId);
        }
      });
    }
  }, dedupeId);

  try {
    await scheduled.promise;
  } catch (error) {
    if (isAbortError(error, scheduled.operation.controller.signal)) return;
    spindle.sendToFrontend({ type: "vn_error", chatId, operation: "plan_turn", error: errorText(error) }, userId);
    throw error;
  }
}

async function generationEnded(spindle: SpindleAPI, payload: GenerationEndedPayloadDTO, userId?: string): Promise<void> {
  generatingChats.delete(runtimeKey(userId,payload.chatId));
  spindle.sendToFrontend({
    type: "vn_generation",
    chatId: payload.chatId,
    active: false,
    ...(payload.error ? { error: payload.error } : {})
  }, userId);
  dbg(spindle, userId, `event GENERATION_ENDED chat=${payload.chatId} message=${payload.messageId ?? "latest"} contentChars=${payload.content?.length ?? 0}${payload.error ? ` error=${payload.error}` : ""}`);
  if (payload.error || !payload.content) return;
  if (!(await allowAutomaticWork(spindle, userId, payload.chatId, "GENERATION_ENDED"))) return;
  const messages = await spindle.chat.getMessages(payload.chatId) as NormalizedChatMessage[];
  const message = payload.messageId
    ? messages.find((candidate) => candidate.id === payload.messageId)
    : [...messages].reverse().find((candidate) => !candidate.is_user);
  if (!message) throw new Error("The generated assistant message could not be found.");
  await processAssistantMessage(spindle, payload.chatId, message, payload.content, userId);
}

function submissionMetadata(message: NormalizedChatMessage): Record<string, unknown> {
  const metadata = message.metadata;
  return metadata && typeof metadata === "object" ? metadata : {};
}

const pendingSubmissions = new Map<string, Promise<void>>();

function submit(spindle: SpindleAPI, request: Extract<FrontendRequest, { type: "vn_submit" }>, userId: string): Promise<void> {
  const key = JSON.stringify([userId, request.chatId, request.requestId]);
  const existing = pendingSubmissions.get(key);
  if (existing) return existing;
  // Reserve synchronously, before either metadata read or append can yield.
  const pending = Promise.resolve().then(() => submitOnce(spindle, request, userId));
  pendingSubmissions.set(key, pending);
  void pending.finally(() => {
    if (pendingSubmissions.get(key) === pending) pendingSubmissions.delete(key);
  }).catch(() => {});
  return pending;
}

async function submitOnce(spindle: SpindleAPI, request: Extract<FrontendRequest, { type: "vn_submit" }>, userId: string): Promise<void> {
  const existing = await spindle.chat.getMessages(request.chatId) as NormalizedChatMessage[];
  const alreadyWritten = existing.some((message) => {
    const vn = submissionMetadata(message).visualNovelPreview;
    return vn !== null && typeof vn === "object" && (vn as { requestId?: unknown }).requestId === request.requestId;
  });
  if (alreadyWritten) {
    spindle.sendToFrontend({
      type: "vn_error",
      chatId: request.chatId,
      operation: "submit",
      error: "This response was already saved. The extension will not submit it twice."
    }, userId);
    return;
  }

  try {
    await spindle.chat.appendMessage(request.chatId, {
      role: "user",
      content: request.content,
      metadata: { visualNovelPreview: { requestId: request.requestId } }
    }, { triggerGeneration: true });
  } catch (error) {
    const after = await spindle.chat.getMessages(request.chatId) as NormalizedChatMessage[];
    const saved = after.some((message) => {
      const vn = submissionMetadata(message).visualNovelPreview;
      return vn !== null && typeof vn === "object" && (vn as { requestId?: unknown }).requestId === request.requestId;
    });
    const detail = errorText(error);
    throw new Error(saved
      ? `Your response was saved, but Lumiverse could not start generation: ${detail}`
      : detail);
  }
}

export async function markAssetReady(
  spindle: SpindleAPI,
  request: Extract<FrontendRequest, { type: "vn_asset_ready" }>,
  userId?: string
): Promise<void> {
  const scope = runtimeKey(userId, request.chatId);
  const epoch = intakeEpochs.get(scope) ?? 0;
  const isCurrent = () => (intakeEpochs.get(scope) ?? 0) === epoch;
  const chatState = await loadChatState(spindle, request.chatId, userId);
  if (!chatState.activeTurnPath || !isCurrent()) return;
  const next = await mutateActiveTurnRecord(spindle, request.chatId, chatState.activeTurnPath, userId, record => {
  if (record.plan.key.assistantMessageId !== request.messageId
    || record.plan.key.sourceFingerprint !== request.sourceFingerprint
    || (request.swipeId !== undefined && String(record.plan.key.swipeId ?? 0) !== String(request.swipeId ?? 0))
    || (request.revision !== undefined && record.plan.key.revision !== request.revision)) return null;
  const index = record.jobs.findIndex((job) => job.jobId === request.jobId);
  if (index < 0) return null;
  const job = record.jobs[index]!;
  if (job.status !== "generated"
    || (request.imageId !== undefined && job.imageId !== request.imageId)
    || (request.imageUrl !== undefined && job.imageUrl !== request.imageUrl)) return null;
  const readyAt = new Date().toISOString();
  const readyJob = AssetJobSchema.parse({
    ...job,
    status: "browser_ready",
    readyAt,
    finishedAt: readyAt
  });
  dbg(spindle, userId, `asset ${readyJob.jobId} p${readyJob.paragraphIndex} -> browser_ready (decoded in browser)`);
  const jobs = record.jobs.map((candidate, candidateIndex) => candidateIndex === index ? readyJob : candidate);
  return { ...record, jobs, updatedAt: readyAt };
  }, isCurrent);
  if (!next || !isCurrent()) return;
  const readyJob = next.jobs.find(job => job.jobId === request.jobId)!;
  spindle.sendToFrontend({
    type: "vn_asset",
    chatId: request.chatId,
    messageId: request.messageId,
    sourceFingerprint: next.plan.key.sourceFingerprint,
    swipeId: next.plan.key.swipeId,
    revision: next.plan.key.revision,
    asset: await assetViewWithCastArt(spindle,next,readyJob,userId)
  }, userId);
}

async function retryTurn(
  spindle: SpindleAPI,
  chatId: string,
  message: NormalizedChatMessage,
  userId?: string
): Promise<void> {
  const key = runtimeKey(userId, chatId);
  assetControllers.get(key)?.abort("Retrying turn.");
  planningQueue.cancelChat(userId, chatId);
  releaseSceneCacheAdmission(spindle, userId, chatId, "retry");

  const path = turnPath(chatId, message.id, message.swipe_id);
  const existing = await loadTurnRecord(spindle, path, userId);

  // A scene picker may have changed since this turn was planned. Re-resolve
  // macro-bearing messages first; a resolution that no longer matches the
  // stored plan replans instead of regenerating the discarded scene's images.
  if (needsResolution(message.content)) {
    const intake = await resolveMessageIntake(spindle, chatId, message.content, userId);
    // A host that cannot resolve right now keeps the stored plan (images are
    // retried below); only a real, different resolution replans.
    if (intake.resolved && relateRecord(existing, message, intake) !== "current") {
      await processAssistantMessage(spindle, chatId, message, message.content, userId, { retry: true, precomputedIntake: intake });
      return;
    }
  }

  const config = await loadConfig(spindle, userId);
  rememberDebugFlag(userId, config);
  const characterAppearance = await loadCharacterAppearance(spindle, userId, chatId);

  if (!existing || existing.status === "failed" || existing.jobs.length === 0
    || existing.plan.visualCues.some((cue) => cue.imageTemplate?.subjectMode !== 'none' && cue.resolvedIdentity !== undefined && !cue.resolvedIdentity.trim())) {
    await processAssistantMessage(spindle, chatId, message, message.content, userId, { retry: true });
    return;
  }

  const freshJobs = createAssetJobs(existing.plan, config, characterAppearance);
  const freshJobMap = new Map(freshJobs.map((j) => [j.jobId, j]));
  const nowTime = new Date().toISOString();
  // Forced regeneration: re-queued jobs bypass cache lookup (they still own and
  // store their fresh render). Finished jobs, including cache-served ones
  // (always `generated`), are kept exactly as before; unfinished jobs never
  // carry an image id (schema invariant), so there is nothing to invalidate.
  const bypassJobIds = new Set<string>();
  const updatedJobs = existing.jobs.map((job) => {
    if (job.status === "browser_ready" || job.status === "generated") {
      return job;
    }
    bypassJobIds.add(job.jobId);
    const fresh = freshJobMap.get(job.jobId);
    return AssetJobSchema.parse({
      ...job,
      status: "queued",
      promptFingerprint: fresh?.promptFingerprint ?? job.promptFingerprint,
      imageId: null,
      imageUrl: null,
      error: null,
      queuedAt: nowTime,
      startedAt: null,
      generatedAt: null,
      readyAt: null,
      finishedAt: null
    });
  });

  const settingsSnapshot: Record<string, unknown> = {
    promptPrefix: config.promptPrefix,
    promptSuffix: config.promptSuffix,
    negativePrompt: config.negativePrompt,
    imageConnectionId: config.imageConnectionId,
    imageModel: config.imageModel,
    imageConcurrency: config.imageConcurrency
  };

  // Reuse-only candidates that have no job yet may hit now (cache only, no requests).
  if (config.generateImages && !config.useNativeCardImages && (existing.plan.cacheCues?.length || existing.plan.classifierVisuals)) {
    const scope = sceneImageScope(userId, chatId);
    retainPlanEpisodes(sceneCache, scope, existing.plan);
    const extra = await resolveCacheCues(spindle, existing.plan, config, characterAppearance, updatedJobs, sceneCache, userId, {
      log: (line) => dbg(spindle, userId, line),
      ...sourceTextOption(existing)
    });
    for (const job of extra) updatedJobs.push(job);
  }

  const updatedRecord: StoredTurnRecord = {
    ...existing,
    status: "ready",
    jobs: updatedJobs,
    updatedAt: nowTime,
    settingsSnapshot,
    attempts: [
      ...(existing.attempts ?? []),
      {
        attemptNumber: (existing.attempts?.length ?? 1) + 1,
        timestamp: nowTime,
        settings: settingsSnapshot
      }
    ]
  };

  activeTurnKeys.set(key, updatedRecord.plan.key);
  await saveTurnRecord(spindle, path, updatedRecord, userId);
  await persistActiveTurn(spindle, updatedRecord, path, userId);
  spindle.sendToFrontend({ type: "vn_turn", turn: await turnViewWithAudio(spindle, updatedRecord,userId) }, userId);

  if (!config.useNativeCardImages && config.generateImages) {
    void startAssets(spindle, updatedRecord, path, userId, { bypassJobIds }).catch((error) => {
      if (!isAbortError(error)) {
        spindle.log.error(`Visual novel asset pipeline retry failed: ${errorText(error)}`);
        spindle.sendToFrontend({ type: "vn_error", chatId, operation: "retry_turn", error: errorText(error) }, userId);
      }
    });
  }
}

async function recoverImages(spindle:SpindleAPI,request:Extract<FrontendRequest,{type:'vn_recover_images'}>,userId:string):Promise<void>{
 const action=RecoverImagesRequestSchema.parse(request),key=runtimeKey(userId,action.chatId),epoch=intakeEpochs.get(key)??0;
 if(recoveringImageBatches.get(key)===action.requestId)return;
 if(recoveringImageBatches.has(key))throw new Error('Image recovery is already in progress.');
 releaseAbortedImageBatch(key);
 if(!views.isOpen(userId,action.chatId)||generatingChats.has(key)||planningQueue.active().some(op=>op.userId===userId&&op.chatId===action.chatId)||preparingSingleImages.has(key)&&!assetControllers.has(key))throw new Error('Wait for reply planning or picture preparation to finish, then try again.');
 recoveringImageBatches.set(key,action.requestId);
 try{
  const state=await loadChatState(spindle,action.chatId,userId);
  let record=await loadTurnRecord(spindle,state.activeTurnPath,userId);
  if(!record||record.plan.key.chatId!==action.chatId||record.plan.key.assistantMessageId!==action.messageId||record.plan.key.sourceFingerprint!==action.sourceFingerprint||Number(record.plan.key.swipeId??0)!==action.swipeId||record.plan.key.revision!==action.revision)throw new Error('This recovery belongs to an older reply or swipe.');
  if(record.imageRecoveryRequestIds?.includes(action.requestId))return;
  const messages=await spindle.chat.getMessages(action.chatId) as NormalizedChatMessage[];
  const latest=[...messages].reverse().find(m=>!m.is_user&&m.content.trim());
  if(!latest||latest.id!==action.messageId)throw new Error('A newer reply replaced these pictures.');
  const intake=await resolveMessageIntake(spindle,action.chatId,latest.content,userId);
  if(!intake.resolved||relateRecord(record,latest,intake)!=='current')throw new Error('The reply changed. Refresh the reader before recovering pictures.');
  const config=await loadConfig(spindle,userId);
  if(action.action==='retry'&&(!config.generateImages||config.useNativeCardImages))throw new Error('Enable generated pictures before retrying.');
  const current=()=>views.isOpen(userId,action.chatId)&&(intakeEpochs.get(key)??0)===epoch&&recoveringImageBatches.get(key)===action.requestId&&(!activeTurnKeys.has(key)||compareTurnKeys(activeTurnKeys.get(key)??null,record!.plan.key).accepted);
  if(!current())throw new Error('This reply changed during image recovery.');
  // Detach before aborting: an old provider may never settle, and cancellation
  // notifications must not race the new recovery record.
  pendingAssetStarts.delete(key);
  const oldController=assetControllers.get(key);assetControllers.delete(key);imageReviewGates.delete(key);preparingSingleImages.delete(key);oldController?.abort('Stopped pending pictures for explicit recovery.');
  releaseSceneCacheAdmission(spindle,userId,action.chatId,'image_recovery');
  record=await loadTurnRecord(spindle,state.activeTurnPath,userId);
  if(!record||!current())return;
  const stamp=new Date().toISOString(),retryIds=new Set<string>();
  const jobs=record.jobs.map(job=>{
   if(job.status==='generated'||job.status==='browser_ready')return job;
   if(action.action==='retry'&&job.provider!==CACHE_JOB_PROVIDER)retryIds.add(job.jobId);
   return AssetJobSchema.parse({...job,status:retryIds.has(job.jobId)?'queued':'cancelled',imageId:null,imageUrl:null,error:null,queuedAt:retryIds.has(job.jobId)?stamp:job.queuedAt,startedAt:null,generatedAt:null,readyAt:null,finishedAt:retryIds.has(job.jobId)?null:stamp});
  });
  const next:StoredTurnRecord={...record,jobs,imageRequests:record.imageRequests?.map(r=>r.state==='review'?{...r,state:'cancelled' as const}:r)??[],imageRecoveryRequestIds:[...(record.imageRecoveryRequestIds??[]),action.requestId].slice(-32),updatedAt:stamp};
  activeTurnKeys.set(key,next.plan.key);
  if(!current()||!await saveTurnRecordIfCurrent(spindle,state.activeTurnPath!,next,userId,current))return;
  const view=await turnViewWithAudio(spindle,next,userId);if(!current())return;
  spindle.sendToFrontend({type:'vn_turn',turn:view},userId);
  if(retryIds.size)void startAssets(spindle,next,state.activeTurnPath!,userId,{bypassJobIds:retryIds,forceReview:true}).catch(error=>{if(!isAbortError(error))spindle.sendToFrontend({type:'vn_error',chatId:action.chatId,operation:'prepare_image',error:errorText(error)},userId);});
 }finally{if(recoveringImageBatches.get(key)===action.requestId)recoveringImageBatches.delete(key);}
}

/** Explicit recovery calls the planner, but never authorizes fresh image calls. */
async function replanCurrentTurn(spindle: SpindleAPI, request: Extract<FrontendRequest, {type:'vn_replan_turn'}>, userId: string): Promise<void> {
  const action = ReplanTurnRequestSchema.parse(request);
  const key = runtimeKey(userId, action.chatId);
  const epoch = intakeEpochs.get(key) ?? 0;
  if (!views.isOpen(userId, action.chatId)) throw new Error('Open the reader before replanning.');
  if (recoveringImageBatches.has(key) || pendingAssetStarts.has(key) || generatingChats.has(key) || assetControllers.has(key) || preparingSingleImages.has(key) || planningQueue.active().some(op => op.userId === userId && op.chatId === action.chatId)) throw new Error('Finish the chat reply, skip waiting pictures, and let current preparation finish before replanning.');
  const preparation=Symbol();preparingSingleImages.set(key,preparation);
  try {
    const state = await loadChatState(spindle, action.chatId, userId);
    const old = await loadTurnRecord(spindle, state.activeTurnPath, userId);
    if (!old || old.plan.key.chatId !== action.chatId || old.plan.key.assistantMessageId !== action.messageId || old.plan.key.sourceFingerprint !== action.sourceFingerprint || Number(old.plan.key.swipeId ?? 0) !== action.swipeId) throw new Error('This replan belongs to an older reply or swipe.');
    if (old.replanRequestIds?.includes(action.requestId)) throw new Error('This replan request has already been handled.');
    const isCurrent = () => views.isOpen(userId, action.chatId) && (intakeEpochs.get(key) ?? 0) === epoch && compareTurnKeys(activeTurnKeys.get(key) ?? null, old.plan.key).accepted;
    const messages = await spindle.chat.getMessages(action.chatId) as NormalizedChatMessage[];
    const referenceSnapshot=referenceMessages(messages,action.messageId);
    const latest = [...messages].reverse().find(m => !m.is_user && m.content.trim());
    if (!latest || latest.id !== action.messageId || Number(latest.swipe_id ?? 0) !== action.swipeId) throw new Error('A newer reply or swipe replaced this replan.');
    const rawReplanSource=latest.content;
    const intake = await resolveMessageIntake(spindle, action.chatId, rawReplanSource, userId);
    if (!intake.resolved || relateRecord(old, latest, intake) !== 'current' || !views.isOpen(userId,action.chatId) || (intakeEpochs.get(key) ?? 0) !== epoch || generatingChats.has(key)) throw new Error('The source changed or the reader closed. Refresh it first.');
    // A reopened reader / restarted backend has no owner until recovery claims
    // the fully validated stored key. Never displace a different active turn.
    const active = activeTurnKeys.get(key);
    if (active && !compareTurnKeys(active,old.plan.key).accepted) throw new Error('A newer turn replaced this replan.');
    activeTurnKeys.set(key,old.plan.key);
    const config = await loadConfig(spindle, userId);
    const singleCharacter = await loadSingleCharacterState(spindle, action.chatId, userId);
    const characterAppearance = await loadCharacterAppearance(spindle, userId, action.chatId);
    const characterRegistry = await loadCharacterRegistry(spindle, action.chatId, userId);
    const recentMessages = config.includeRecentMessages > 0 ? await resolveContextMessages(spindle, action.chatId, messages.slice(-config.includeRecentMessages), new Map(), userId) : [];
    if (!isCurrent()) return;
    const scheduled = planningQueue.enqueue(userId, action.chatId, action.messageId, async operation => {
      const current = () => !operation.controller.signal.aborted && isCurrent();
      if (!current()) return;
      spindle.sendToFrontend({type:'vn_planning',chatId:action.chatId},userId);
      const result = await planTurn(spindle, {signal:operation.controller.signal,chatId:action.chatId,message:latest,content:intake.text,sourceFingerprint:action.sourceFingerprint,
        previousScene:old.plan.scenes[0] ?? null,previousContinuity:old.plan.initialContinuity,
        recentMessages,config,singleCharacter,characterAppearance,characterRegistry,userId,
        gameHints:gameHintsForTurn(messages,latest.id),
        ...(config.includeSimTrackerContext ? {simTrackerEvidence:extractSimTracker(messages,latest.id,config.simTrackerMappings)} : {})});
      if (!current()) return;
      const plan = {...result.plan,key:{...result.plan.key,revision:old.plan.key.revision + 1}};
      let jobs: StoredTurnRecord['jobs'] = [];
      if (config.useNativeCardImages) jobs = await resolveNativeCardJobs({spindle,chatId:action.chatId,plan,content:intake.text,speakerName:latest.name,userId});
      else if (config.generateImages) {
        jobs = await prepareAssetJobs(spindle,plan,config,characterAppearance,sceneCache,userId,sourceTextOption({resolvedSourceText:intake.text}));
        // Exact verified cache matches can survive; paragraph/prompt hashes alone
        // cannot prove model, negative-prompt, parameter or reference compatibility.
        const hits = await resolveCacheCues(spindle,plan,config,characterAppearance,[],sceneCache,userId,{...sourceTextOption({resolvedSourceText:intake.text}),includeBudgeted:true});
        jobs = jobs.map(job => hits.find(hit => hit.jobId === job.jobId) ?? job);
      }
      if (!current()) return;
      // Re-check source data after the planner/provider metadata awaits too.
      // Hosts do not always deliver edit/swipe events before this callback.
      const freshMessages = await spindle.chat.getMessages(action.chatId) as NormalizedChatMessage[];
      const freshLatest = [...freshMessages].reverse().find(m => !m.is_user && m.content.trim());
      if (!freshLatest || freshLatest.id !== latest.id || Number(freshLatest.swipe_id ?? 0) !== action.swipeId) throw new Error('A newer reply or swipe replaced the replan.');
      const freshIntake = await resolveMessageIntake(spindle,action.chatId,freshLatest.content,userId);
      if (!current()) return;
      if (!freshIntake.resolved || relateRecord(old,freshLatest,freshIntake) !== 'current') throw new Error('The reply changed while replanning. Refresh the reader first.');
      const previousImages: NonNullable<StoredTurnRecord['previousImages']> = {};
      for (const job of jobs) {
        if (job.status === 'generated' || job.status === 'browser_ready') continue;
        const cue = plan.visualCues.find(c => c.assetJobId === job.jobId);
        const prior = old.jobs.find(j => j.paragraphIndex === job.paragraphIndex);
        const priorCue = old.plan.visualCues.find(c => c.assetJobId === prior?.jobId);
        // Old art is only a labelled fallback for the same prose and person,
        // never a claimed match or a substitute character.
        if (!prior || !cue || !priorCue || cue.character !== priorCue.character || cue.resolvedIdentity !== priorCue.resolvedIdentity || plan.paragraphs[job.paragraphIndex]?.text !== old.plan.paragraphs[prior.paragraphIndex]?.text) continue;
        const image = (prior.status === 'generated' || prior.status === 'browser_ready') && prior.imageId && prior.imageUrl ? {imageId:prior.imageId,imageUrl:prior.imageUrl} : old.previousImages?.[prior.jobId];
        if (image) previousImages[job.jobId] = image;
      }
      const now = new Date().toISOString();
      const record: StoredTurnRecord = {schemaVersion:1,speaker:result.cardRole === 'scenario' ? 'Narrator' : latest.name || 'Narrator',...(old.userSpeaker ? {userSpeaker:old.userSpeaker} : {}),status:'ready',plan,jobs,previousImages,forceImageReview:true,
        imageRequests:safeImageHistory((old.imageRequests ?? []).filter(r => r.state === 'approved' && jobs.some(job => job.jobId === r.jobId))),
        cardRole:result.cardRole,plannerMode:result.usedFallback ? 'fallback' : 'model',...(result.cardId ? {cardId:result.cardId} : {}),
        replanRequestIds:[...(old.replanRequestIds ?? []),action.requestId].slice(-32),
        ...(old.correctionRequestIds ? {correctionRequestIds:old.correctionRequestIds} : {}),resolvedSourceText:intake.text,...(old.source ? {source:old.source} : {}),referenceLineage:preserveReferenceLineage(old.referenceLineage,await captureReferenceLineage(referenceSnapshot??[],plan,rawReplanSource)),updatedAt:now,
        attempts:[...(old.attempts ?? []).slice(-15),{attemptNumber:(old.attempts?.at(-1)?.attemptNumber ?? 0)+1,timestamp:now,settings:{replan:true,forcedImageReview:true}}]};
      await persistActiveTurn(spindle,record,state.activeTurnPath!,userId,current);
      if (!current()) return;
      const view = await turnViewWithAudio(spindle,record,userId);
      if (!current()) return;
      activeTurnKeys.set(key,plan.key);
      spindle.sendToFrontend({type:'vn_turn',turn:view},userId);
      if (!config.useNativeCardImages && config.generateImages) void startAssets(spindle,record,state.activeTurnPath!,userId,{forceReview:true}).catch(error => {
        if (!isAbortError(error)) spindle.sendToFrontend({type:'vn_error',chatId:action.chatId,operation:'prepare_image',error:errorText(error)},userId);
      });
    },`replan:${action.requestId}`);
    try { await scheduled.promise; }
    catch (error) { if (!isAbortError(error,scheduled.operation.controller.signal)) throw error; }
  } finally { if(preparingSingleImages.get(key)===preparation)preparingSingleImages.delete(key); }
}

async function handleFrontendMessage(spindle: SpindleAPI, request: FrontendRequest, userId: string): Promise<void> {
  if (request.type === "vn_external_image") { await externalImages(spindle).request(request.request, userId); return; }
  if (request.type === "vn_external_image_cancel") { externalImages(spindle).cancel(request.request, userId); return; }
  if (request.type === "vn_external_image_review") {
    if (!await externalImages(spindle).review(request, userId)) throw new Error("This external image preview has expired or was cancelled. Request a new picture from its source.");
    return;
  }
  dbg(spindle, userId, `frontend request ${request.type}`);
  switch (request.type) {
    case 'vn_image_library': {
      const page=await readImageLibraryPage(spindle,request,userId);
      spindle.sendToFrontend({type:'vn_image_library',chatId:request.chatId,requestId:request.requestId,page},userId);
      return;
    }
    case 'vn_replan_turn':
      await replanCurrentTurn(spindle,request,userId);
      return;
    case "vn_regenerate_image_prompt": {
      if(typeof request.requestId!=='string'||!request.requestId||request.requestId.length>100)throw new Error('Invalid prompt selection.');
      const key=runtimeKey(userId,request.chatId),turn=activeTurnKeys.get(key);
      if(!views.isOpen(userId,request.chatId)||!turn||turn.assistantMessageId!==request.messageId||turn.sourceFingerprint!==request.sourceFingerprint)throw new Error('This prompt belongs to an older or closed turn.');
      if(!await imageReviewGates.get(key)?.regenerate(request.requestId))throw new Error('This prompt is already being handled or cancelled.');
      return;
    }
    case "vn_reprepare_image_template": {
      if (typeof request.requestId !== "string" || request.requestId.length > 100 || typeof request.templateId !== "string") throw new Error("Invalid template selection.");
      const key = runtimeKey(userId, request.chatId);
      const turn = activeTurnKeys.get(key);
      if (!views.isOpen(userId, request.chatId) || !turn || turn.assistantMessageId !== request.messageId || turn.sourceFingerprint !== request.sourceFingerprint) throw new Error("This review belongs to an older or closed turn.");
      if (!(await imageReviewGates.get(key)?.reprepare(request.requestId, request.templateId))) throw new Error("This request has already been handled or cancelled.");
      return;
    }
    case "vn_image_review": {
      if (typeof request.chatId !== "string" || typeof request.requestId !== "string" || request.requestId.length > 100 || (request.action !== "generate" && request.action !== "skip")) throw new Error("Invalid image review action.");
      const key = runtimeKey(userId, request.chatId);
      const turn = activeTurnKeys.get(key);
      if (!views.isOpen(userId, request.chatId) || !turn || turn.assistantMessageId !== request.messageId || turn.sourceFingerprint !== request.sourceFingerprint) throw new Error("This review belongs to an older or closed turn.");
      if (!imageReviewGates.get(key)?.decide(request.requestId, request.action, request.edits ?? {})) throw new Error("This request has already been handled or cancelled. Prepare it again if needed.");
      return;
    }
    case "vn_set_card_role": {
      const action=SetCardRoleRequestSchema.parse(request);
      const roleKey=runtimeKey(userId,action.chatId);
      const epoch=intakeEpochs.get(roleKey)??0;
      if(!views.isOpen(userId,action.chatId) || recoveringImageBatches.has(runtimeKey(userId,action.chatId)) || pendingAssetStarts.has(runtimeKey(userId,action.chatId)) || assetControllers.has(runtimeKey(userId,action.chatId))) throw new Error('Finish or skip the waiting pictures before changing the card role.');
      const state=await loadChatState(spindle,action.chatId,userId);
      const record=await loadTurnRecord(spindle,state.activeTurnPath,userId);
      if(!record || record.plan.key.chatId!==action.chatId || record.plan.key.assistantMessageId!==action.messageId || record.plan.key.sourceFingerprint!==action.sourceFingerprint || Number(record.plan.key.swipeId??0)!==action.swipeId) throw new Error('This role selection belongs to an older turn.');
      const chat=await spindle.chats.get(action.chatId,userId);
      if(!chat?.character_id) throw new Error('No card is attached to this chat.');
      const messages=await spindle.chat.getMessages(action.chatId) as NormalizedChatMessage[];
      const latest=[...messages].reverse().find(m=>!m.is_user&&m.content.trim());
      if(!latest || latest.id!==action.messageId || Number(latest.swipe_id??0)!==action.swipeId) throw new Error('A newer reply or swipe replaced this role selection.');
      const intake=await resolveMessageIntake(spindle,action.chatId,latest.content,userId);
      if(!intake.resolved || relateRecord(record,latest,intake)!=='current' || !views.isOpen(userId,action.chatId)) throw new Error('The source changed. Refresh the reader first.');
      if((intakeEpochs.get(roleKey)??0)!==epoch || recoveringImageBatches.has(roleKey) || pendingAssetStarts.has(roleKey) || assetControllers.has(roleKey) || preparingSingleImages.has(roleKey) || !compareTurnKeys(activeTurnKeys.get(roleKey)??null,record.plan.key).accepted) throw new Error('This turn changed while saving the card role.');
      await saveCardRole(spindle,action.chatId,chat.character_id,action.role,userId);
      const next={...record,cardId:chat.character_id,cardRole:action.role};
      const isCurrent=()=>views.isOpen(userId,action.chatId) && !assetControllers.has(roleKey) && (intakeEpochs.get(roleKey)??0)===epoch && compareTurnKeys(activeTurnKeys.get(roleKey)??null,record.plan.key).accepted;
      if(!await saveTurnRecordIfCurrent(spindle,state.activeTurnPath!,next,userId,isCurrent) || !isCurrent()) return;
      const view=await turnViewWithAudio(spindle,next,userId);if(!isCurrent())return;
      spindle.sendToFrontend({type:'vn_turn',turn:view},userId);
      return;
    }
    case "vn_recover_images":
      await recoverImages(spindle,request,userId);
      return;
    case "vn_correct_image_subject":
    case "vn_prepare_image":
      if (typeof request.chatId !== "string" || typeof request.jobId !== "string") throw new Error("Invalid image selection.");
      await prepareSingleImage(spindle, request, userId);
      return;
    case "vn_resolve_panel_template": {
      if (typeof request.requestId !== "string" || request.requestId.length > 100 || typeof request.chatId !== "string") return;
      try {
        const template = await resolvePanelTemplate(spindle, request.template, request.chatId, userId, typeof request.characterId === "string" ? request.characterId : undefined);
        spindle.sendToFrontend({ type: "vn_panel_template", requestId: request.requestId, chatId: request.chatId, template }, userId);
      } catch (error) {
        spindle.sendToFrontend({ type: "vn_panel_template", requestId: request.requestId, chatId: request.chatId, error: error instanceof Error ? error.message : String(error) }, userId);
      }
      return;
    }
    case "vn_view": {
      if (typeof request.chatId !== "string" || !request.chatId) return;
      if (request.open) openView(spindle, userId, request.chatId);
      else closeView(spindle, userId, request.chatId, "vn_view");
      return;
    }
    case "vn_get_state":
      await sendState(spindle, request.chatId ?? "", userId, {requestId: request.requestId,...(request.viewOpen === undefined ? {} : { viewOpen: request.viewOpen }),...(request.prepare===false?{readOnly:true}:{})});
      return;
    case "vn_reading_position": {
      const { position } = request;
      const state = await loadChatState(spindle, position.key.chatId, userId);
      const record = await loadTurnRecord(spindle, state.activeTurnPath, userId);
      if (!record || record.plan.key.chatId !== position.key.chatId
        || record.plan.key.assistantMessageId !== position.key.assistantMessageId
        || String(record.plan.key.swipeId ?? 0) !== String(position.key.swipeId ?? 0)
        || record.plan.key.sourceFingerprint !== position.key.sourceFingerprint
        || position.paragraphIndex >= record.plan.paragraphs.length) return;
      await saveReadingPosition(spindle, position, userId);
      return;
    }
    case "vn_get_connection_catalog": {
      const catalog = await loadConnectionCatalog(spindle, userId);
      spindle.sendToFrontend({ type: "vn_connection_catalog", ...catalog }, userId);
      return;
    }
    case "vn_get_system_one_key_status":
      spindle.sendToFrontend({ type: "vn_system_one_key_status", saved: await spindle.enclave.has(SYSTEM_ONE_KEY, userId) }, userId);
      return;
    case "vn_set_system_one_key": {
      const key = request.key.trim();
      if (!key || key.length > 8192) throw new Error("Enter a valid System One API key");
      await spindle.enclave.put(SYSTEM_ONE_KEY, key, userId);
      spindle.sendToFrontend({ type: "vn_system_one_key_status", saved: true }, userId);
      return;
    }
    case "vn_clear_system_one_key":
      await spindle.enclave.delete(SYSTEM_ONE_KEY, userId);
      spindle.sendToFrontend({ type: "vn_system_one_key_status", saved: false }, userId);
      return;
    case "vn_get_context_sources": {
      const action=ContextSourcesRequestSchema.parse(request);
      const sourceConfig=async()=>{await contextConfigSaves.get(userId);return (await loadConfig(spindle,userId)).contextSources;};
      const report=await contextSourceSession.refresh(spindle,sourceConfig(),userId,action.chatId,action.requestId);
      if(report) spindle.sendToFrontend({type:'vn_context_sources',report},userId);
      return;
    }
    case "vn_presentation_rules": {
      const catalog=await managePresentationRules(spindle,request,userId);
      spindle.sendToFrontend({type:"vn_presentation_rules",chatId:request.chatId??"",requestId:request.requestId,catalog},userId);
      return;
    }
    case "vn_cast_gallery": {
      const action=CastGalleryRequestSchema.parse(request);
      const gallery=await listCastGallery(spindle,action.offset,userId);
      spindle.sendToFrontend({type:'vn_cast_gallery',chatId:action.chatId,requestId:action.requestId,gallery},userId);
      return;
    }
    case "vn_cast_art": {
      const action=CastArtRequestSchema.parse(request);
      if(action.action==='scan'){const scan=await scanCastContext(spindle,action.chatId,userId,action.characterId);spindle.sendToFrontend({type:'vn_cast_context',chatId:action.chatId,requestId:action.requestId,scan},userId);return;}
      const library=await manageCastArt(spindle,action.chatId,action,userId);
      if(action.action!=="list")releaseSceneCacheScope(spindle,userId,action.chatId,"scope_cleared");
      spindle.sendToFrontend({type:"vn_cast_art",chatId:action.chatId,requestId:action.requestId,library},userId);
      return;
    }
    case "vn_location_art": {
      const action=LocationArtRequestSchema.parse(request);
      const library=await manageLocationArt(spindle,action.chatId,action,userId);
      if(action.action!=="list")releaseSceneCacheScope(spindle,userId,action.chatId,"scope_cleared");
      spindle.sendToFrontend({type:'vn_location_art',chatId:action.chatId,requestId:action.requestId,library},userId);
      return;
    }
    case "vn_set_config": {
      if(request.patch.contextSources!==undefined) contextSourceSession.cancel(userId);
      const saving = updateConfig(spindle, request.patch, userId);
      if(request.patch.contextSources!==undefined) contextConfigSaves.set(userId,saving);
      let config:VisualNovelConfig;
      try { config=await saving; }
      finally { if(contextConfigSaves.get(userId)===saving)contextConfigSaves.delete(userId); }
      rememberDebugFlag(userId, config);
      dbg(spindle, userId, `config saved (${Object.keys(request.patch).length} field(s) in patch)`);
      if (request.patch.audioDirectory !== undefined) {
        void scanAudioCatalog(spindle, config.audioDirectory);
      }
      spindle.sendToFrontend({ type: "vn_config", config, requestId: request.requestId }, userId);
      return;
    }
    case "vn_scan_audio": {
      const config = await loadConfig(spindle, userId);
      const dir = request.directory?.trim() || config.audioDirectory;
      clearAudioCatalogCache();
      const catalog = await scanAudioCatalog(spindle, dir);
      spindle.sendToFrontend({
        type: "vn_audio_scanned",
        bgmCount: catalog.bgm.length,
        sfxCount: catalog.sfx.length,
      }, userId);
      return;
    }
    case "vn_import_audio_file": {
      const cleaned = sanitizeAudioImportPath(request.relativePath);
      if (!cleaned) return;
      const dot = cleaned.lastIndexOf(".");
      const extension = dot >= 0 ? cleaned.slice(dot).toLowerCase() : "";
      if (!(SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(extension)) return;
      const bufferKey = `${userId ?? "owner"}:${request.transferId ?? cleaned}`;
      const assembled = acceptAudioImportChunk(bufferKey, request);
      if (assembled === null) {
        dbg(spindle, userId, `audio chunk ${((request.chunkIndex ?? 0) + 1)}/${request.chunkCount ?? 1} buffered for ${cleaned}`);
        return;
      }
      const dataBase64 = assembled;
      const config = await loadConfig(spindle, userId);
      const prefix = normalizeAudioStoragePrefix(config.audioDirectory || "audio");
      const target = `${prefix}/${cleaned}`;
      const write = (async () => {
        const bytes = Uint8Array.from(atob(dataBase64), (character) => character.charCodeAt(0));
        const directory = target.split("/").slice(0, -1).join("/");
        if (directory) await spindle.storage.mkdir(directory).catch(() => {});
        await spindle.storage.writeBinary(target, bytes);
        dbg(spindle, userId, `audio imported ${target} (${bytes.length} bytes)`);
      })();
      const pendingKey = userId ?? "owner";
      const pending = pendingAudioImports.get(pendingKey) ?? [];
      pending.push(write.catch((error) => {
        spindle.log.warn(`Audio import failed for ${target}: ${errorText(error)}`);
      }));
      pendingAudioImports.set(pendingKey, pending);
      await write;
      return;
    }
    case "vn_import_audio_done": {
      const pendingKey = userId ?? "owner";
      clearAudioImportBuffers(pendingKey);
      const pending = pendingAudioImports.get(pendingKey) ?? [];
      pendingAudioImports.delete(pendingKey);
      await Promise.allSettled(pending);
      const config = await loadConfig(spindle, userId);
      clearAudioCatalogCache();
      const catalog = await scanAudioCatalog(spindle, config.audioDirectory || "audio");
      dbg(spindle, userId, `audio import finished: ${request.fileCount} file(s) sent, catalog now ${catalog.bgm.length} BGM / ${catalog.sfx.length} SFX`);
      spindle.sendToFrontend({
        type: "vn_audio_scanned",
        bgmCount: catalog.bgm.length,
        sfxCount: catalog.sfx.length,
      }, userId);
      return;
    }
    case "vn_submit":
      // Submissions only come from the open view; a restarted backend relearns
      // the open state here so the resulting reply is not skipped.
      openView(spindle, userId, request.chatId);
      await submit(spindle, request, userId);
      return;
    case "vn_asset_ready":
      await markAssetReady(spindle, request, userId);
      return;
    case "vn_cancel": {
      bumpIntakeEpoch(userId, request.chatId);
      planningQueue.cancelChat(userId, request.chatId);
      pendingAssetStarts.delete(runtimeKey(userId,request.chatId));
      assetControllers.get(runtimeKey(userId, request.chatId))?.abort("Cancelled from the visual novel UI.");
      releaseSceneCacheAdmission(spindle, userId, request.chatId, "cancel");
      return;
    }
    case "vn_refresh": {
      // "Try again" from a view that has no turn yet (waiting card, early
      // failure). It comes from the open view, so it relearns the open state
      // like submit/retry do, then goes through the same freshness check as
      // any state request: reuse, replan a changed selection, or bootstrap.
      // A chat with no assistant message answers vn_state/turn:null so the
      // stage leaves its planning phase instead of waiting forever.
      if (typeof request.chatId !== "string" || !request.chatId) return;
      await sendState(spindle, request.chatId, userId, { viewOpen: true });
      return;
    }
    case "vn_reference_image": {
      // Reply to a backend-initiated card reference fetch. The payload is
      // routed by request id only and never logged (it carries base64).
      if (typeof request.requestId !== "string" || request.requestId.length > 100) return;
      handleReferenceImageResponse(request);
      return;
    }
    case "vn_retry_turn": {
      // Retries only come from the open view; never gate explicit user actions.
      openView(spindle, userId, request.chatId);
      const messages = await spindle.chat.getMessages(request.chatId) as NormalizedChatMessage[];
      const message = messages.find((candidate) => candidate.id === request.messageId);
      if (!message) throw new Error("The assistant message no longer exists.");
      await retryTurn(spindle, request.chatId, message, userId);
      return;
    }
  }
}

function eventMessage(payload: unknown): { chatId: string; message: NormalizedChatMessage } | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as { chatId?: unknown; message?: unknown };
  if (typeof candidate.chatId !== "string" || !candidate.message || typeof candidate.message !== "object") return null;
  const message = candidate.message as Partial<NormalizedChatMessage>;
  if (typeof message.id !== "string" || typeof message.content !== "string" || typeof message.is_user !== "boolean") return null;
  return { chatId: candidate.chatId, message: message as NormalizedChatMessage };
}

async function clearDeletedTurn(spindle: SpindleAPI, payload: unknown, userId?: string): Promise<void> {
  if (!payload || typeof payload !== "object") return;
  const candidate = payload as { chatId?: unknown; messageId?: unknown };
  if (typeof candidate.chatId !== "string" || typeof candidate.messageId !== "string") return;
  spindle.sendToFrontend({type:'vn_reference_history_invalidated',chatId:candidate.chatId},userId);
  const state = await loadChatState(spindle, candidate.chatId, userId);
  const record = await loadTurnRecord(spindle, state.activeTurnPath, userId);
  if (!record || record.plan.key.assistantMessageId !== candidate.messageId) return;
  bumpIntakeEpoch(userId, candidate.chatId);
  planningQueue.cancelChat(userId, candidate.chatId);
  assetControllers.get(runtimeKey(userId, candidate.chatId))?.abort("The source assistant message was deleted.");
  activeTurnKeys.delete(runtimeKey(userId, candidate.chatId));
  // The chat's scene lineage restarts (latestScene becomes null): release the
  // whole scope so the next "initial" episode never shares the old entries.
  releaseSceneCacheScope(spindle, userId, candidate.chatId, "scope_cleared");
  await saveChatState(spindle, candidate.chatId, {
    schemaVersion: 1,
    activeTurnPath: null,
    latestScene: null,
    terminalContinuity: null,
    updatedAt: new Date().toISOString()
  }, userId);
  await sendState(spindle, candidate.chatId, userId, { viewOpen: views.isOpen(userId, candidate.chatId) });
}

function reconcileMessageEvent(spindle: SpindleAPI, payload: unknown, userId?: string): void {
  const event = eventMessage(payload);
  if (!event)return;
  spindle.sendToFrontend({type:'vn_reference_history_invalidated',chatId:event.chatId},userId);
  if(event.message.is_user)return;
  void (async () => {
    if (!(await allowAutomaticWork(spindle, userId, event.chatId, "message reconcile"))) return;
    // An ancestor edit invalidates remembered descriptions but must not move
    // the reader backwards or start planning that older response.
    const messages=await spindle.chat.getMessages(event.chatId) as NormalizedChatMessage[];
    if([...messages].reverse().find(m=>!m.is_user&&m.content.trim())?.id!==event.message.id)return;
    // A newer version of the message supersedes any intake still resolving.
    bumpIntakeEpoch(userId, event.chatId);
    releaseSceneCacheAdmission(spindle, userId, event.chatId, "message_changed");
    await processAssistantMessage(spindle, event.chatId, event.message, event.message.content, userId);
  })().catch((error) => {
    spindle.log.error(`Visual novel message reconciliation failed: ${errorText(error)}`);
  });
}

export function registerVisualNovelBackend(spindle: SpindleAPI): void {
  spindle.on("PERMISSION_CHANGED", (payload) => {
    spindle.sendToFrontend({
      type: "vn_permission",
      permission: payload.permission,
      granted: payload.granted
    });
  });
  spindle.on("GENERATION_STARTED", (payload, userId) => {
    generatingChats.add(runtimeKey(userId,payload.chatId));
    dbg(spindle, userId, `event GENERATION_STARTED chat=${payload.chatId}`);
    // A new generation is starting (a user message was submitted). Drop any
    // ownership of the previous turn's assets so queued old-turn ComfyUI calls
    // cannot start and running completions cannot persist/send, then abort the
    // current asset batch. The new turn's ownership is re-established when it is
    // actually planned (processAssistantMessage -> activeTurnKeys.set).
    const key = runtimeKey(userId, payload.chatId);
    bumpIntakeEpoch(userId, payload.chatId);
    activeTurnKeys.delete(key);
    pendingAssetStarts.delete(key);
    assetControllers.get(key)?.abort("A new generation started before this turn's assets settled.");
    releaseSceneCacheAdmission(spindle, userId, payload.chatId, "generation_started");
    spindle.sendToFrontend({ type: "vn_generation", chatId: payload.chatId, active: true }, userId);
  });
  spindle.on("GENERATION_ENDED", (payload, userId) => {
    void generationEnded(spindle, payload, userId).catch((error) => {
      spindle.log.error(`Visual novel turn failed: ${errorText(error)}`);
      spindle.sendToFrontend({ type: "vn_error", chatId: payload.chatId, operation: "generation_ended", error: errorText(error) }, userId);
    });
  });
  spindle.on("GENERATION_STOPPED", (payload, userId) => {
    generatingChats.delete(runtimeKey(userId,payload.chatId));
    dbg(spindle, userId, `event GENERATION_STOPPED chat=${payload.chatId}`);
    spindle.sendToFrontend({ type: "vn_generation", chatId: payload.chatId, active: false }, userId);
  });
  spindle.on("MESSAGE_SWIPED", (payload: MessageSwipedPayloadDTO, userId) => {
    dbg(spindle, userId, "event MESSAGE_SWIPED");
    reconcileMessageEvent(spindle, payload, userId);
  });
  spindle.on("SWIPE_EDITED", (payload: SwipeEditedPayloadDTO, userId) => {
    dbg(spindle, userId, "event SWIPE_EDITED");
    reconcileMessageEvent(spindle, payload, userId);
  });
  spindle.on("MESSAGE_EDITED", (payload, userId) => {
    dbg(spindle, userId, "event MESSAGE_EDITED");
    reconcileMessageEvent(spindle, payload, userId);
  });
  spindle.on("CHAT_SWITCHED", (payload: unknown, userId?: string) => {
    // Host-side notice of the active chat. The frontend also asks for state on
    // CHAT_SWITCHED, so `vn_get_state` remains the fallback observation.
    const candidate = payload && typeof payload === "object" ? payload as { chatId?: unknown } : {};
    const chatId = typeof candidate.chatId === "string" ? candidate.chatId : "";
    dbg(spindle, userId, `event CHAT_SWITCHED chat=${chatId || "(none)"}`);
    noteActiveChat(spindle, userId, chatId);
  });
  spindle.on("IMAGE_DELETED", (payload: unknown) => {
    // Best effort: a deleted gallery image must never be served from the cache again.
    const candidate = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const imageId = [candidate.imageId, candidate.id, (candidate.image as Record<string, unknown> | undefined)?.id]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (!imageId) return;
    const dropped = sceneCache.invalidateImage(imageId, "image_deleted");
    if (dropped > 0) spindle.log.info(`[VN] scene-cache dropped ${dropped} entr${dropped === 1 ? "y" : "ies"} for deleted image ${imageId}`);
  });
  spindle.on("MESSAGE_DELETED", (payload, userId) => {
    dbg(spindle, userId, "event MESSAGE_DELETED");
    void clearDeletedTurn(spindle, payload, userId).catch((error) => {
      spindle.log.error(`Visual novel deletion reconciliation failed: ${errorText(error)}`);
    });
  });
  spindle.onFrontendMessage((payload, userId) => {
    if (!isFrontendRequest(payload)) return;
    void handleFrontendMessage(spindle, payload, userId).catch((error) => {
      const chatId = "chatId" in payload && typeof payload.chatId === "string" ? payload.chatId : undefined;
      spindle.log.error(`Visual novel frontend request failed: ${errorText(error)}`);
      spindle.sendToFrontend({ type: "vn_error", ...(chatId ? { chatId } : {}), ...("requestId" in payload&&typeof payload.requestId==="string"?{requestId:payload.requestId}:{}),operation: payload.type, error: errorText(error) }, userId);
    });
  });
  void loadConfig(spindle).then((cfg) => {
    rememberDebugFlag(undefined, cfg);
    void scanAudioCatalog(spindle, cfg.audioDirectory || "audio");
  }).catch(() => {});
  spindle.log.info("Lumiglyphics loaded (based on Cue — Living Novel).");
}
