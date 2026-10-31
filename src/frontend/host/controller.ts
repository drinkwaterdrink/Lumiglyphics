import {inspectorState,pictureStateSummary} from '../image-review/inspector-model.js';
import {scopedPictureOperations,type LocalPictureOperations} from '../image-review/local-operations.js';
import type {ImageRetryQueueView} from '../../shared/image-retries.js';
import {selectHeldBackground} from '../../shared/background-hold.js';
import {createUiId} from '../request-id.js';
import {NarrativePreviewSchema} from '../../shared/preparation-preview.js';
import {referenceHistoryFor} from '../../shared/reference-history.js';
import { samePresentationTurn } from "../../shared/presentation-entities.js";
import type { SpindleFrontendContext } from "lumiverse-spindle-types";
import { restoreReadingPosition, LoadedReadingCursor } from "./reading-position.js";
import type { ReadingPosition } from "../../shared/reading-position.js";
import type { VisualNovelConfig, VisualNovelEffectIntensity, VisualNovelTextEffectMode } from "../../config.js";
import { REFERENCE_IMAGE_MAX_BYTES, REFERENCE_IMAGE_MIMES } from "../../protocol.js";
import type { AssetView, BackendResponse, ConnectionCatalogOption, FrontendRequest, TurnView } from "../../protocol.js";
import { AudioEngine, VnStage, isAmbientEffect, isStageEffect } from "../stage/index.js";
import type { AmbientEffect, StageEffect } from "../store/index.js";
import { VisualNovelSettingsPanel } from "../settings/panel.js";
import { ImageStudio } from "../image-review/studio.js";
import { ExternalImageReview } from "../image-review/external-review.js";
import {ImageLibrary} from '../image-library/library.js';
import type { VnChoice, VnTurnInput } from "../store/index.js";
import { createVnHeaderLauncher } from "./manual-launcher.js";
import { captureSimTrackerCards } from "./panel-capture.js";
import { GameBridge } from "./game-bridge.js";
import { connectImageBridge } from "./image-bridge.js";
import { PanelDock } from "../stage/panel-dock.js";
import { sceneImageUrlFor } from "../stage/image-loader.js";
import { stagingContext, supportsVisualNovelOverlay, type ComponentOverrideHandle } from "./staging-context.js";
import { presentAmbient, presentEffect } from "./effect-presentation.js";
import {
  describeImageFailure,
  describeOperationError,
  describePlanningFailure,
  type HostStageError,
} from "./turn-status.js";
import { SpeechController, type SpeechCursor } from "../speech/controller.js";
import { createSpeechTransport } from "../speech/transport.js";
import { SpeechDock } from "../speech/ui.js";
import { SpeechSettingsSection } from "../speech/settings-ui.js";
import { formatReplyUsage } from "../../shared/reply-usage.js";
import { createDisplayRuleGuard } from "../stage/display-rule-probe.js";

const CLEANUP_KEY = Symbol.for("lumiglyphics.frontend-cleanup");

/** Chunked bytes -> base64 that avoids call-stack limits on large audio files. */
function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

/**
 * Answer a backend `vn_reference_fetch`: fetch the card asset from the
 * logged-in origin and relay it as a base64 data URL (the backend cannot
 * read image bytes itself). Always replies exactly once, with `dataUrl` or
 * `error`; no UI is involved and the base64 body is never logged.
 */
export async function relayReferenceFetch(
  message: { requestId: string; imageId: string },
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
  send: (reply: Extract<FrontendRequest, { type: "vn_reference_image" }>) => void
): Promise<void> {
  try {
    const response = await fetchImpl(`/api/v1/images/${encodeURIComponent(message.imageId)}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Image fetch failed (${response.status}).`);
    const blob = await response.blob();
    if (blob.size > REFERENCE_IMAGE_MAX_BYTES) throw new Error("Reference image exceeds the 8 MiB relay limit.");
    const mimeType = blob.type.toLowerCase();
    if (!REFERENCE_IMAGE_MIMES.has(mimeType)) throw new Error("Reference asset is not a supported image.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    send({ type: "vn_reference_image", requestId: message.requestId, dataUrl: `data:${mimeType};base64,${base64FromBytes(bytes)}` });
  } catch (error) {
    send({ type: "vn_reference_image", requestId: message.requestId, error: error instanceof Error ? error.message : String(error) });
  }
}

function messageType(value: unknown): string {
  return value !== null && typeof value === "object" && typeof (value as { type?: unknown }).type === "string"
    ? (value as { type: string }).type
    : "";
}

/**
 * Choose the image currently visible for a paragraph cursor.
 *
 * Pure and deterministic: among ready assets with `paragraphIndex <= cursor`,
 * pick the highest paragraph; when several share that paragraph, the FIRST one
 * in the turn's asset order wins (a stable tie) rather than the last. Previously
 * the `>=` comparison let the last asset at a shared paragraph win, so an asset
 * arriving later (or two distinct same-paragraph cues) could flip the background
 * with the cursor frozen.
 */
export function selectCurrentImage(turn: TurnView, paragraphIndex: number): AssetView | null {
  let match: AssetView | null = null;
  for (const asset of turn.assets) {
    if (asset.status !== "generated" && asset.status !== "browser_ready" && !asset.previousImage) continue;
    if (!asset.imageUrl || asset.paragraphIndex > paragraphIndex) continue;
    if (!match || asset.paragraphIndex > match.paragraphIndex) match = asset;
  }
  return match?selectHeldBackground(turn,paragraphIndex,match):null;
}

export function currentAssetError(turn: TurnView, paragraphIndex: number): string | null {
  const visible = turn.assets.filter((asset) => asset.paragraphIndex <= paragraphIndex)
    .sort((a, b) => b.paragraphIndex - a.paragraphIndex);
  const at = visible[0]?.paragraphIndex;
  const current = visible.find(asset=>asset.paragraphIndex===at&&asset.status==='failed')??visible[0];
  return current?.status === "failed" ? current.error || "Image generation failed. Retry this turn." : null;
}

/**
 * Structured form of `currentAssetError`: a friendly message, the raw backend
 * text as detail, and a truthful statement of what "Try again" does (finished
 * images are kept; the whole turn is retried, never a single image).
 */
export function currentAssetFailure(turn: TurnView, paragraphIndex: number): HostStageError | null {
  const visible = turn.assets.filter((asset) => asset.paragraphIndex <= paragraphIndex)
    .sort((a, b) => b.paragraphIndex - a.paragraphIndex);
  const at = visible[0]?.paragraphIndex;
  const current = visible.find(asset=>asset.paragraphIndex===at&&asset.status==='failed')??visible[0];
  return current?.status === "failed" ? { ...describeImageFailure(turn, current.error), ...(current.failureId ? {failureId: current.failureId} : {}) } : null;
}

/**
 * Whether two turn deliveries refer to the same logical turn. Used to guard
 * against a re-broadcast of the same turn (a GENERATION_ENDED followed by a
 * MESSAGE_EDITED/SWIPE_EDITED/MESSAGE_SWIPED reconcile, or a `vn_retry_turn`)
 * resetting the paragraph cursor back to paragraph 0.
 */
export function sameTurnIdentity(
  left: Pick<TurnView, "chatId" | "messageId" | "sourceFingerprint">,
  right: Pick<TurnView, "chatId" | "messageId" | "sourceFingerprint">,
): boolean {
  return left.chatId === right.chatId
    && left.messageId === right.messageId
    && left.sourceFingerprint === right.sourceFingerprint;
}

/**
 * How a received turn should be applied to the stage. Pure so the same-turn
 * guard and load-turn decisions are testable without a DOM.
 *
 * A re-broadcast of the SAME logical turn is applied as "sync at the current
 * cursor" (never reset to paragraph 0); a genuinely different turn is a
 * "load-turn" that resets the narrative cursor while preserving the previous
 * scene's image until the new turn's scene image is generated and ready.
 */
export type TurnApplicationDecision =
  | { kind: "none" }
  | { kind: "planning" }
  | { kind: "error"; error: string }
  | { kind: "same-turn"; paragraphIndex: number }
  | { kind: "revised-turn"; paragraphIndex: number }
  | { kind: "load-turn" };

/**
 * Whether the stage should preserve the currently displayed image across turns.
 * Preserving the image is only safe when advancing to a new turn within the SAME chat
 * and for the same speaker/card, so that the stage does not flash a blank screen while
 * the new turn's scene image generates.
 *
 * It must NEVER preserve the image when switching to a new chat, opening a new card,
 * or on the initial turn delivery.
 */
export function shouldPreserveImage(previous: TurnView | null, next: TurnView): boolean {
  if (!previous) return false;
  if (previous.chatId !== next.chatId) return false;
  const prevSpeaker = (previous.speaker || "").trim().toLowerCase();
  const nextSpeaker = (next.speaker || "").trim().toLowerCase();
  if (prevSpeaker && nextSpeaker && prevSpeaker !== nextSpeaker) return false;
  return true;
}

/**
 * Literal nameplate for one paragraph. The planner attributes a per-paragraph
 * speaker (`paragraphSpeakers`, parallel to `paragraphs`):
 * - a name -> that character/persona name is displayed;
 * - "" -> intentional narrator, the plate is hidden;
 * - null / absent -> unknown, fall back to the turn speaker (card name),
 *   which is exactly the pre-attribution behavior.
 */
export function nameplateForParagraph(view: TurnView, index: number): string {
  const snapshot=view.presentation?.snapshots[index];
  const key={chatId:view.chatId,assistantMessageId:view.messageId,swipeId:view.swipeId,sourceFingerprint:view.sourceFingerprint,revision:view.revision};
  if(snapshot && snapshot.at.paragraphIndex===index && samePresentationTurn(snapshot.at.key,key) && snapshot.speakerEntityId) {
    const speaker=snapshot.entities.find(e=>e.id===snapshot.speakerEntityId&&e.kind==='npc');
    if(speaker)return speaker.name;
  }
  const attributed = view.paragraphSpeakers?.[index];
  return attributed === undefined || attributed === null ? view.speaker : attributed;
}

/**
 * Speech cursor for one paragraph of a ready turn. Preserves the raw tri-state
 * paragraph attribution ("" narrator / name / null-undefined unknown) so voice
 * resolution can mirror the nameplate exactly. Returns null for missing
 * paragraphs so planning/error states never produce a speakable cursor.
 */
export function speechCursorFor(view: TurnView, index: number): SpeechCursor | null {
  const text = view.paragraphs[index];
  if (typeof text !== "string") return null;
  return {
    chatId: view.chatId,
    messageId: view.messageId,
    sourceFingerprint: view.sourceFingerprint,
    paragraphIndex: index,
    text,
    paragraphSpeaker: view.paragraphSpeakers?.[index],
    turnSpeaker: view.speaker,
  };
}

/**
 * The validated one-shot stage effect for a paragraph, as a spreadable object,
 * after the user's effect-presentation preference ("full" keeps every effect).
 */
export function effectForParagraph(
  view: TurnView,
  index: number,
  intensity: VisualNovelEffectIntensity = "full",
): { effect?: StageEffect } {
  const effect = view.effects?.[index];
  if (!isStageEffect(effect)) return {};
  const presented = presentEffect(effect, paragraphEffectIntensity(view,index,intensity));
  return presented ? { effect: presented } : {};
}

function paragraphEffectIntensity(view:TurnView,index:number,global:VisualNovelEffectIntensity):VisualNovelEffectIntensity {
 const cap=view.effectLimits?.length===view.paragraphs.length?view.effectLimits[index]:null;
 return global==='off'||cap==='off'?'off':global==='gentle'||cap==='gentle'?'gentle':'full';
}

export function musicAttenuationForParagraph(view:TurnView|null,index:number):number {
 if(!view||view.musicLimits?.length!==view.paragraphs.length)return 1;
 return view.musicLimits[index]==='mute'?0:view.musicLimits[index]==='quiet'?.35:1;
}

/** The validated ambient effect for a paragraph, as a spreadable object. */
export function ambientForParagraph(
  view: TurnView,
  index: number,
  intensity: VisualNovelEffectIntensity = "full",
): { ambient?: AmbientEffect | null } {
  const ambient = view.ambients?.[index];
  if (ambient === null) return { ambient: null };
  return isAmbientEffect(ambient) ? { ambient: presentAmbient(ambient, paragraphEffectIntensity(view,index,intensity)) } : {};
}

/** The turn-level opening ambient (paragraph 0's ambient, when valid). */
export function firstAmbient(view: TurnView, intensity: VisualNovelEffectIntensity = "full"): AmbientEffect | null {
  const ambient = view.ambients?.[0];
  return isAmbientEffect(ambient) ? presentAmbient(ambient, paragraphEffectIntensity(view,0,intensity)) : null;
}

/** Build the stage input without turning absent ambient data into a clear. */
export function stageTurnInput(
  next: TurnView,
  mode: VnTurnInput["mode"],
  preserveImage: boolean,
  intensity: VisualNovelEffectIntensity = "full",
): VnTurnInput {
  const key={chatId:next.chatId,assistantMessageId:next.messageId,swipeId:next.swipeId,sourceFingerprint:next.sourceFingerprint,revision:next.revision};
  const presentation=next.presentation?.snapshots.length===next.paragraphs.length&&next.presentation.snapshots.every((s,i)=>s.at.paragraphIndex===i&&samePresentationTurn(s.at.key,key))?next.presentation:undefined;
  const referenceHistory=referenceHistoryFor(next.referenceHistory,key);
  return {
    ...(next.replyCost ? {replyCost: formatReplyUsage(next.replyCost.usage, next.replyCost.imagesGenerated)} : {}),
    mode,
    paragraphs: next.paragraphs.map((text, index) => ({
      id: `${next.sourceFingerprint}:${index}`,
      text,
      speaker: nameplateForParagraph(next, index),
      ...(next.effectLimits?.length===next.paragraphs.length&&(next.effectLimits[index]==='gentle'||next.effectLimits[index]==='off')?{effectLimit:next.effectLimits[index]!}:{}),
      ...effectForParagraph(next, index, intensity),
      ...ambientForParagraph(next, index, intensity)
    })),
    choices: next.choices.map((choice) => ({ id: choice.id, label: choice.label, value: choice.value })),
    preserveImage,
    ...(presentation ? {presentation} : {}),
    ...(referenceHistory?{referenceHistory}:{}),
    ...(next.ambients !== undefined ? { ambient: firstAmbient(next, intensity) } : {}),
    ...(next.location ? { location: next.location } : {})
  };
}

export function decideTurnApplication(
  previous: TurnView | null,
  next: TurnView,
  cursor: number,
  active: boolean,
  hasLoadedTurn: boolean,
): TurnApplicationDecision {
  if (!active) return { kind: "none" };
  if (next.status === "planning") return { kind: "planning" };
  if (next.status === "failed") return { kind: "error", error: next.error ?? "Visual planning failed." };
  // Only treat a re-broadcast as the same turn when the stage is actually showing
  // it. A vn_state that arrives while inactive records the turn but never loads
  // the paragraphs, so the first active delivery still needs a real load-turn.
  if (previous && hasLoadedTurn && sameTurnIdentity(previous, next) && previous.swipeId === next.swipeId) {
    if (next.revision < previous.revision) return { kind: "none" };
    if (next.revision !== previous.revision) return { kind: "revised-turn", paragraphIndex: Math.max(0, Math.min(cursor, next.paragraphs.length - 1)) };
    return { kind: "same-turn", paragraphIndex: cursor };
  }
  return { kind: "load-turn" };
}

function replaceAsset(turn: TurnView, asset: AssetView): TurnView {
  const match = (entry: AssetView) => entry.jobId === asset.jobId || (Boolean(asset.cueId) && entry.cueId === asset.cueId);
  const assets = turn.assets.some(match)
    ? turn.assets.map((entry) => match(entry) ? asset : entry)
    : [...turn.assets, asset];
  return { ...turn, assets };
}

export function computeAssetProgress(turn: TurnView | null, queue?:ImageRetryQueueView | null,local?:LocalPictureOperations|null): { current: number; total: number; label?:string; busy?:boolean } | null {
  if (!turn || !turn.assets || turn.assets.length === 0) return null;
  // Cache-served extra swaps never generate; they must not inflate "n of m".
  const budgeted = turn.assets.filter((a) => a.source !== "cache");
  if (budgeted.length === 0) return null;
  const total = budgeted.length;
  const done = budgeted.filter(
    (a) =>
      a.status === "generated" ||
      a.status === "browser_ready" ||
      a.status === "failed" ||
      a.status === "cancelled",
  ).length;
  const scoped=queue&&queue.chatId===turn.chatId&&queue.messageId===turn.messageId&&queue.sourceFingerprint===turn.sourceFingerprint&&queue.swipeId===turn.swipeId&&queue.revision===turn.revision?queue:null;
  const operations=scopedPictureOperations(turn,local);
  const states=budgeted.map(asset=>{const operation=operations.get(asset.jobId)?.kind;return inspectorState({asset,requestState:turn.imageRequests?.filter(record=>record.jobId===asset.jobId).at(-1)?.state,preparing:operation==='prepare',operation:operation==='rewrite'||operation==='template'?operation:undefined,retryQueued:Boolean(scoped?.jobIds.includes(asset.jobId)),retryRunning:scoped?.activeJobId===asset.jobId});});
  const pending=states.some(state=>['held','preparing','rewriting','rebuilding','generating','waiting','retry-queued','retry-running'].includes(state.kind));
  if(pending){
    return {current:Math.min(total,done+1),total,label:pictureStateSummary(states),busy:states.some(state=>['preparing','rewriting','rebuilding','generating','retry-running'].includes(state.kind))};
  }
  return null;
}

/** Actionable reviews only: local preparation/rewrite is work, not approval. */
export function computeReviewAttention(turn:TurnView|null,local?:LocalPictureOperations|null):number {
  if(!turn)return 0;
  const operations=scopedPictureOperations(turn,local);
  return turn.assets.filter(asset=>{
    const operation=operations.get(asset.jobId)?.kind;
    return inspectorState({asset,requestState:turn.imageRequests?.filter(record=>record.jobId===asset.jobId).at(-1)?.state,preparing:operation==='prepare',operation:operation==='rewrite'||operation==='template'?operation:undefined}).kind==='held';
  }).length;
}

/**
 * The subset of VnStage the controller pushes saved-config presentation onto.
 * Keeping this narrow lets tests exercise the live stage calls without a DOM.
 */
export type VisualStageThemeTarget = Pick<
  VnStage,
  "setThemePreset" | "setSceneImageFit" | "setUserCss" | "setDisplayRegexRules"
> & {
  setTextSpeed?: (speed: number) => void;
  setAutoPlayDelay?: (delay: number) => void;
  setSkipMode?: (mode: "read" | "all") => void;
  /** Dialogue text size multiplier (stage sets `--vn-text-scale`). */
  setTextScale?: (scale: number) => void;
  setCastMode?: (enabled:boolean) => void;
  setTooltipPreferences?: (prefs: VisualNovelConfig["tooltips"]) => void;
  setReaderPreferences?: (preferences: VisualNovelConfig["readerPreferences"]) => void;
  /** Lets the stage also gate its own heuristic effects (text-triggered shake). */
  setEffectIntensity?: (level: VisualNovelEffectIntensity) => void;
  /** Inline dialogue text effects mode (stage sets `data-vn-text-effects`). */
  setTextEffects?: (mode: VisualNovelTextEffectMode) => void;
};

/**
 * Push a config's presentation settings onto the stage. Applied on every save
 * and on every `vn_state` / `vn_config` response so the stage always mirrors
 * the persisted config: the active theme preset, the scene-image fit, the
 * user's custom CSS (which stays the final cascade layer), custom display regex rules,
 * and dialogue flow parameters (typewriter speed, auto-play delay, skip mode).
 */
/** One guard per stage: custom display rules apply only after their worker probe passes. */
const displayRuleGuards = new WeakMap<VisualStageThemeTarget, (rulesText: string) => void>();
function applyDisplayRulesGuarded(stage: VisualStageThemeTarget, rulesText: string): void {
  let guard = displayRuleGuards.get(stage);
  if (!guard) {
    guard = createDisplayRuleGuard((text) => stage.setDisplayRegexRules(text));
    displayRuleGuards.set(stage, guard);
  }
  guard(rulesText);
}

export function applyVisualConfigToStage(
  stage: VisualStageThemeTarget,
  config: VisualNovelConfig,
): void {
  stage.setThemePreset(config.themePreset);
  stage.setSceneImageFit(config.sceneImageFit);
  stage.setCastMode?.(config.castMode);
  stage.setUserCss(config.customCss);
  applyDisplayRulesGuarded(stage, config.displayRegexRules);
  stage.setTextSpeed?.(config.textSpeed);
  stage.setAutoPlayDelay?.(config.autoPlayDelay);
  stage.setSkipMode?.(config.skipMode);
  stage.setTextScale?.(config.textScale);
  stage.setReaderPreferences?.(config.readerPreferences);
  stage.setTooltipPreferences?.(config.tooltips);
  stage.setEffectIntensity?.(config.effectIntensity);
  stage.setTextEffects?.(config.textEffects);
}

/**
 * The subset of the settings panel the host reports back into. Every member
 * beyond the original three is optional so the host works with a panel that
 * has not adopted the redesign feedback yet.
 */
export type SettingsFeedbackTarget = {
  setConfig(config: VisualNovelConfig, requestId?: string): void;
  setConnectionCatalog(kind: "planner" | "image", state: ConnectionCatalogFeedback): void;
  setSystemOneKeyStatus(saved: boolean, message?: string): void;
  setAudioStatus(message: string): void;
  /** Acknowledged save result: "saved" only after the backend echoes `vn_config`. */
  setSaveStatus?(status: { kind: "saved" } | { kind: "error"; error: string }, requestId?: string): void;
  /** Exact library counts from the last scan/import. */
  setAudioLibrary?(library: { bgmCount: number; sfxCount: number }): void;
};

export type ConnectionCatalogFeedback =
  | { status: "idle" | "loading"; options: readonly ConnectionCatalogOption[] }
  | { status: "ready"; options: readonly ConnectionCatalogOption[] }
  | { status: "error"; options: readonly ConnectionCatalogOption[]; error: string };

/**
 * Truthful catalog states from a `vn_connection_catalog` response. A kind whose
 * listing failed is reported as an error (the backend lists each kind with
 * `allSettled`); "ready" only means "listed by Lumiverse", never "tested".
 */
export function connectionCatalogStates(message: {
  planner?: ConnectionCatalogOption[];
  image?: ConnectionCatalogOption[];
  errors?: { planner?: string; image?: string };
}): Record<"planner" | "image", ConnectionCatalogFeedback> {
  const forKind = (kind: "planner" | "image"): ConnectionCatalogFeedback => {
    const error = message.errors?.[kind];
    if (error) return { status: "error", options: [], error };
    return { status: "ready", options: message[kind] ?? [] };
  };
  return { planner: forKind("planner"), image: forKind("image") };
}

/**
 * The messages one state request sends, in order. The `vn_view` announcement
 * always precedes `vn_get_state` so a (re)started backend learns whether this
 * chat's view is open before it decides to plan; `viewOpen` repeats the flag on
 * the state request itself. Every boot, reconnect, activation, and chat switch
 * goes through this, which is how the backend relearns view state after a
 * restart. Without a chat there is nothing to announce.
 */
export function viewStateMessages(chatId: string, viewOpen: boolean | undefined): FrontendRequest[] {
  // `undefined` = say nothing about the view. Used for the boot request: a
  // page reload must not close a view the backend still holds open (and
  // abort its image batch) before the config says whether autoEnter reopens
  // it. The first vn_state reply settles the view explicitly.
  if (viewOpen === undefined) return [{ type: "vn_get_state", chatId }];
  if (!chatId) return [{ type: "vn_get_state", chatId, viewOpen }];
  return [
    { type: "vn_view", chatId, open: viewOpen },
    { type: "vn_get_state", chatId, viewOpen },
  ];
}

export function setupVisualNovelFrontend(baseContext: SpindleFrontendContext): () => void {
  const previousCleanup = (globalThis as Record<PropertyKey, unknown>)[CLEANUP_KEY];
  if (typeof previousCleanup === "function") previousCleanup();

  const ctx = stagingContext(baseContext);
  const app = ctx.ui.mountApp({ className: "visual-novel-preview-mount", position: "app-overlay" });
  const externalReviewMount = ctx.ui.mountApp({ className: "lumiglyphics-external-review", position: "app-overlay" });
  Object.assign(externalReviewMount.root.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "10020" });
  externalReviewMount.setVisible(true);
  let externalReviewOpen = false;
  const externalReview = new ExternalImageReview(externalReviewMount.root, request => {
    if(request.type === "vn_external_image_cancel") imageBridge.cancelRequest(request.request.chatId, request.request.requestId);
    else ctx.sendToBackend(request);
  }, open => {
    externalReviewOpen = open;
    if (open) { stage.toggleSkip(false); stage.holdAutoPlay(); }
    else if (active) stage.checkAutoPlay();
  });
  Object.assign(app.root.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    // Divide by the Lumiverse UI scale: the mount sits under `body > * { zoom }`.
    height: "calc(100dvh / var(--lumiverse-ui-scale, 1))",
    zIndex: "9990"
  });
  app.setVisible(false);

  let active = false;
  const configRef: { current: VisualNovelConfig | null } = { current: null };
  // Browser-console mirror of the backend "listening" trace. Gated by the same
  // debugLogging setting; shows every backend message the frontend listens to.
  const vnDebug = (...parts: unknown[]): void => {
    if (configRef.current?.debugLogging) console.info("[VN]", ...parts);
  };
  let turn: TurnView | null = null;
  let retryQueue:ImageRetryQueueView|null=null;
  let localPictureOperations:LocalPictureOperations|null=null;
  const loadedReadingCursor = new LoadedReadingCursor();
  let savedReadingPosition: ReadingPosition | null = null;
  let readingPositionTimer: ReturnType<typeof setTimeout> | null = null;
  function saveCursor(paragraphIndex: number, immediate = false): void {
    if (stage.isReadingUserParagraph()) return;
    const position = loadedReadingCursor.position(paragraphIndex);
    if (!position) return;
    savedReadingPosition = position;
    if (readingPositionTimer) clearTimeout(readingPositionTimer);
    readingPositionTimer = null;
    const send = () => { readingPositionTimer = null; ctx.sendToBackend({ type: "vn_reading_position", position }); };
    if (immediate) send(); else readingPositionTimer = setTimeout(send, 250);
  }
  let pendingNextTurn: TurnView | null = null;
  let overrideHandles: ComponentOverrideHandle[] = [];
  const acknowledgedAssets = new Set<string>();
  let destroyed = false;
  const audioEngine = new AudioEngine({
    bgmVolume: configRef.current?.bgmVolume ?? 0.7,
    sfxVolume: configRef.current?.sfxVolume ?? 0.8,
  });

  let speech: SpeechController;
  let speechDock: SpeechDock;

  const isSpeechHoldingAuto = (): boolean => {
    if (!speech) return false;
    const s = speech.getStatus();
    return s.kind === "loading" || s.kind === "playing" || s.kind === "paused";
  };

  const syncSpeechCursor = (view: TurnView | null, paragraphIndex: number): void => {
    speech?.setCursor(view && view.status === "ready" ? speechCursorFor(view, paragraphIndex) : null);
  };
  const onVisibilityChanged = (): void => {
    if (speech) speech.setVisible(!document.hidden);
  };
  document.addEventListener("visibilitychange", onVisibilityChanged);

  let currentBgm: string | null = null;
  let turnOpeningBgm: string | null = null;
  function syncAudioForParagraph(activeTurn: TurnView, paragraphIndex: number): void {
    audioEngine.setBgmAttenuation(musicAttenuationForParagraph(activeTurn,paragraphIndex));
    if (!activeTurn.audioCues || activeTurn.audioCues.length === 0) return;
    const cue = activeTurn.audioCues.find((c) => c.paragraphIndex === paragraphIndex);
    if (!cue) return;
    const bgmSrc = cue.bgmUrl || cue.bgm;
    if (bgmSrc) {
      currentBgm = bgmSrc;
      vnDebug("audio", `p${paragraphIndex}`, "bgm ->", bgmSrc);
      audioEngine.playBgm(bgmSrc);
    }
    const sfxSrc = cue.sfxUrl || cue.sfx;
    if (sfxSrc) {
      vnDebug("audio", `p${paragraphIndex}`, "sfx ->", sfxSrc);
      audioEngine.playSfx(sfxSrc);
    }
  }

  // Moves from game-engine extensions (Warp etc.): shown on the stage, picked back to their owner.
  let gameBridge: GameBridge | null = null;
  const syncGameChoices = (): void => {
    const id = chatId();
    const choices = gameBridge?.choicesFor(id) ?? [];
    stage.setGameChoices(choices, gameBridge?.busyFor(id) ?? false);
  };

  let imageLibraryOpen=false;
  let imageStudioOpen=false;
  let preparationActive=false;
  let invalidatedReferenceTurn:string|null=null;
  const referenceTurnToken=(value:TurnView)=>JSON.stringify([value.chatId,value.messageId,value.swipeId,value.sourceFingerprint,value.revision]);
  const withoutReferenceHistory=(value:TurnView):TurnView=>{const {referenceHistory:_,...rest}=value;return rest;};
  const stage = new VnStage({
    mount: app.root,
    themePreset: configRef.current?.themePreset ?? "lumiverse",
    isAutoAdvanceHeld: () => isSpeechHoldingAuto()||imageLibraryOpen||imageStudioOpen||externalReviewOpen,
    onExit: () => deactivate(),
    onTooltipPreferencesChange: tooltips => { ctx.sendToBackend({type:"vn_set_config",patch:{tooltips},chatId:chatId()}); },
    onReaderPreferencesChange: readerPreferences => {
      ctx.sendToBackend({ type: "vn_set_config", patch: { readerPreferences }, chatId: chatId() });
    },
    onPrevious: (paragraphIndex) => {
      saveCursor(paragraphIndex);
      imageStudio.setCursor(paragraphIndex);
      imageLibrary.setContext(turn,stage.getState().currentParagraphIndex);
      panels.setCursor(paragraphIndex);
      syncSpeechCursor(turn, paragraphIndex);
      audioEngine.stopAll();
      audioEngine.setBgmAttenuation(musicAttenuationForParagraph(turn,paragraphIndex));
      const earlierMusic = turn?.audioCues?.filter((cue) => cue.paragraphIndex <= paragraphIndex && (cue.bgmUrl || cue.bgm))
        .sort((a, b) => b.paragraphIndex - a.paragraphIndex)[0];
      currentBgm = earlierMusic?.bgmUrl || earlierMusic?.bgm || turnOpeningBgm;
      if (currentBgm) audioEngine.playBgm(currentBgm);
      void syncImageForParagraph(paragraphIndex);
    },
    onAdvance: (paragraphIndex) => {
      imageStudio.setCursor(paragraphIndex);
      imageLibrary.setContext(turn,stage.getState().currentParagraphIndex);
      panels.setCursor(paragraphIndex);
      if (pendingNextTurn) {
        const next = pendingNextTurn;
        pendingNextTurn = null;
        applyTurn(next, turn);
        return;
      }
      saveCursor(paragraphIndex);
      syncSpeechCursor(turn, paragraphIndex);
      if (turn) syncAudioForParagraph(turn, paragraphIndex);
      void syncImageForParagraph(paragraphIndex);
    },
    onChoice: async (choice: VnChoice) => {
      const raw = choice.value?.trim() ?? "";
      const isNumeric = /^\s*(?:\d+|choice[_-]?\d+|option\s*\d+)\s*$/i.test(raw);
      const submission = (!raw || isNumeric) ? choice.label : raw;
      await handleUserSubmission(submission);
    },
    onSubmit: async (content: string) => {
      await handleUserSubmission(content);
    },
    onGameChoice: async (choice) => {
      const activeChatId = chatId();
      const picked = gameBridge?.resolve(activeChatId,choice);
      if (!picked || !gameBridge) {gameBridge?.request(activeChatId);throw new Error("That move changed or isn't available anymore. Refresh the available moves and choose again.");}
      if (!gameBridge.pick(activeChatId,picked)) throw new Error("That move is no longer available. Refresh the available moves.");
      speech.setCursor(null);
      stage.presentUserParagraph(picked.label, turn?.userSpeaker || "You");
    },
    onReviewImages:()=>imageStudio.open(),
    onReroll: () => {
      const activeChatId = chatId();
      if (!activeChatId) return;
      stage.setPhase("planning");
      if (!turn) {
        // No turn exists (an unselected macro greeting): re-check the latest
        // message instead of retrying a turn that was never planned.
        ctx.sendToBackend({ type: "vn_refresh", chatId: activeChatId });
        return;
      }
      ctx.sendToBackend({
        type: "vn_retry_turn",
        chatId: activeChatId,
        messageId: turn.messageId,
      });
    },
    onSwipe: () => {
      const activeChatId = chatId();
      if (!activeChatId || !turn) return;
      stage.setPhase("planning");
      ctx.sendToBackend({
        type: "vn_retry_turn",
        chatId: activeChatId,
        messageId: turn.messageId,
      });
    },
  });

  let panelCapture: { chatId: string; messageId: string; fingerprint: string | null; cards: Array<{ title: string; html: string }> } | null = null;
  // Speech (default-off TTS). Own player and lifecycle; never the SFX channel.
  // Mounted into stage.panelMount so it renders in front of the stage scene and background.
  speechDock = new SpeechDock({
    mount: stage.panelMount,
    onPlay: () => { void speech.playCurrent(); },
    onPause: () => speech.pause(),
    onStop: () => speech.stop("user-stop"),
  });
  speech = new SpeechController({
    transport: createSpeechTransport(),
    onStatus: (status) => {
      speechDock.setStatus(status);
      audioEngine.setSpeechDucking(status.kind === "playing");
      if (status.kind === "loading" || status.kind === "playing" || status.kind === "paused") {
        stage.holdAutoPlay();
      } else if (active) {
        stage.checkAutoPlay();
      }
    },
  });

  gameBridge = new GameBridge(window, syncGameChoices);
  const imageBridge = connectImageBridge(window, chatId, (request) => ctx.sendToBackend(request), (chatId, requestId) => externalReview.result(chatId, requestId));

  const panels = new PanelDock(stage.panelMount);
  const imageLibrary=new ImageLibrary(stage.panelMount,request=>ctx.sendToBackend(request),open=>{
    imageLibraryOpen=open;
    if(open){stage.panelMount.dataset.vnHistoryOpen='true';stage.workspace.open('history');}else{delete stage.panelMount.dataset.vnHistoryOpen;stage.workspace.toolClosed('history');}
    if(open){stage.toggleSkip(false);stage.holdAutoPlay();}else if(active)stage.checkAutoPlay();
  });
  imageLibrary.useHistoryEntry();
  stage.historyOpener=opener=>imageLibrary.open('story',opener);
  const imageStudio = new ImageStudio(stage.panelMount, (request) => ctx.sendToBackend(request), (enabled) => {
    ctx.sendToBackend({ type: "vn_set_config", patch: { reviewImages: enabled }, chatId: chatId() ?? "" });
  },open=>{imageStudioOpen=open;if(open){stage.panelMount.dataset.vnStudioOpen='true';stage.workspace.open('artwork');stage.toggleSkip(false);stage.holdAutoPlay();}else{delete stage.panelMount.dataset.vnStudioOpen;stage.workspace.toolClosed('artwork');if(active)stage.checkAutoPlay();}},operations=>{
    localPictureOperations=operations;stage.setAssetProgress(computeAssetProgress(turn,retryQueue,operations));
    stage.workspace.setAttention(computeReviewAttention(turn,operations));
  });
  stage.workspace.register('artwork',{element:imageStudio.getElement(),hideAtHome:true,enter:()=>imageStudio.open(),leave:()=>imageStudio.close()});
  stage.workspace.register('history',{element:imageLibrary.getElement(),hideAtHome:true,enter:()=>{if(!imageLibrary.isOpen())imageLibrary.openWorkspace();},leave:()=>imageLibrary.close(),back:()=>imageLibrary.backWithinWorkspace()});
  imageLibrary.setDocked();
  imageStudio.setLibraryOpener(()=>imageLibrary.open('images'));
  const panelRequests = new Map<string, { resolve: (template: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  panels.onResolveTemplate = (template) => new Promise((resolve, reject) => {
    const requestId = createUiId();
    const timer = setTimeout(() => { panelRequests.delete(requestId); reject(new Error("Host template resolution timed out.")); }, 10_000);
    panelRequests.set(requestId, { resolve, reject, timer });
    const context = ctx.getActiveChat();
    ctx.sendToBackend({ type: "vn_resolve_panel_template", chatId: context.chatId ?? "", ...(context.characterId ? { characterId: context.characterId } : {}), requestId, template });
  });
  panels.onCapture = () => {
    if (!turn) return [];
    const mounted = captureSimTrackerCards(ctx.dom.findMessageElement(turn.messageId), document);
    if (mounted.length) return mounted;
    return panelCapture?.chatId === turn.chatId && panelCapture.messageId === turn.messageId && panelCapture.fingerprint === turn.sourceFingerprint ? panelCapture.cards : [];
  };

  const action = ctx.ui.registerInputBarAction({
    id: "lumiglyphics-toggle",
    label: "Open visual novel",
    subtitle: "Open this chat in the full-screen visual novel view",
    enabled: true
  });
  const headerLauncher = createVnHeaderLauncher(
    ctx.ui.mount("chat_header_right"),
    () => toggleVisualNovel(),
  );
  const settingsHandle = ctx.ui.registerSettingsTab?.({
    id: "lumiglyphics",
    title: "Lumiglyphics",
    shortName: "LG",
    description: "Visual-novel presentation, generation, and custom CSS settings",
    keywords: ["visual novel", "cyoa", "images", "custom css"],
    position: "after-display"
  });
  const settingsPanel: VisualNovelSettingsPanel & SettingsFeedbackTarget = new VisualNovelSettingsPanel({
    getChatId:()=>chatId(),
    onPresentationRules:request=>ctx.sendToBackend(request),
    onCastGallery:(chatId,requestId,offset)=>ctx.sendToBackend({type:'vn_cast_gallery',chatId,requestId,offset}),
    onCastVoice:name=>speechSettings?.prepareCharacter(name),
    onCastArt:(chatId,requestId,action)=>ctx.sendToBackend({type:'vn_cast_art',version:1,chatId,requestId,...action}),
    onLocationArt:(chatId,requestId,action)=>ctx.sendToBackend({type:'vn_location_art',version:1,chatId,requestId,...action}),
    onRefreshContextSources:(chatId,requestId)=>ctx.sendToBackend({type:"vn_get_context_sources",chatId,requestId}),
    mount: settingsHandle?.root ?? stage.panelMount,
    onOpenPreview: () => activate(),
    onRefreshConnections: () => requestConnectionCatalog(),
    onSaveSystemOneKey: (key) => ctx.sendToBackend({ type: "vn_set_system_one_key", key }),
    onClearSystemOneKey: () => ctx.sendToBackend({ type: "vn_clear_system_one_key" }),
    onScanAudio: (directory) => {
      ctx.sendToBackend({ type: "vn_scan_audio", directory });
    },
    onImportAudio: async (files) => {
      const supported = [".mp3", ".ogg", ".wav", ".m4a", ".flac"];
      const audioFiles = files.filter((file) => supported.some((extension) => file.name.toLowerCase().endsWith(extension)));
      if (audioFiles.length === 0) {
        settingsPanel?.setAudioStatus("No supported audio files (.mp3/.ogg/.wav/.m4a/.flac) in that folder.");
        return;
      }
      let sent = 0;
      let skipped = 0;
      for (const file of audioFiles) {
        if (file.size > 30 * 1024 * 1024) {
          skipped += 1;
          continue;
        }
        settingsPanel?.setAudioStatus(`Importing ${sent + 1}/${audioFiles.length}: ${file.name}…`);
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
          const dataBase64 = base64FromBytes(bytes);
          // The host WebSocket bridge rejects frontend->backend messages over
          // 4 MB, so larger files are sent as ordered chunks and reassembled.
          const chunkSize = 3_000_000;
          if (dataBase64.length <= chunkSize) {
            ctx.sendToBackend({ type: "vn_import_audio_file", relativePath, dataBase64 });
          } else {
            const chunkCount = Math.ceil(dataBase64.length / chunkSize);
            const transferId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
              ctx.sendToBackend({
                type: "vn_import_audio_file",
                relativePath,
                dataBase64: dataBase64.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize),
                transferId,
                chunkIndex,
                chunkCount
              });
            }
          }
          sent += 1;
          vnDebug("audio import", relativePath, `${bytes.length} bytes`, dataBase64.length > chunkSize ? `(${Math.ceil(dataBase64.length / chunkSize)} chunks)` : "");
        } catch {
          skipped += 1;
        }
      }
      ctx.sendToBackend({ type: "vn_import_audio_done", fileCount: sent });
      settingsPanel?.setAudioStatus(`Sent ${sent} file(s)${skipped ? `, skipped ${skipped}` : ""}; scanning…`);
    },
    onSave: (patch, requestId) => {
      const current = configRef.current;
      if (current) {
        const next = { ...current, ...patch };
        configRef.current = next;
        applyVisualConfigToStage(stage, next);
        audioEngine.setBgmVolume(next.bgmVolume);
        audioEngine.setSfxVolume(next.sfxVolume);
        // Preview stage changes locally; only backend messages confirm persistence.
      }
      ctx.sendToBackend({ type: "vn_set_config", patch, chatId: chatId(), requestId });
    }
  });
  // Speech settings render inside the panel's Voice section (own shadow root,
  // own save path). Profile/voice listing happens only on explicit button
  // presses inside it (metadata calls, no synthesis).
  const speechTransport = createSpeechTransport();
  stage.workspace.register('settings',{element:settingsPanel.getElement(),hideAtHome:!settingsHandle,enter:()=>{settingsPanel.getElement().dataset.vnWorkspaceTool='settings';},leave:()=>{settingsPanel.leaveWorkspace();delete settingsPanel.getElement().dataset.vnWorkspaceTool;},back:()=>settingsPanel.backWithinWorkspace()});
  delete settingsPanel.getElement().dataset.vnWorkspaceTool;
  stage.workspace.onSettingsPage=page=>settingsPanel.openPage(page,{focus:true});
  const speechSettings = new SpeechSettingsSection({
    mount: settingsPanel.voiceMount(),
    onSave: (speechPatch) => {
      ctx.sendToBackend({ type: "vn_set_config", patch: { speech: speechPatch }, chatId: chatId() });
    },
    listProfiles: () => speechTransport.listProfiles(new AbortController().signal),
    listVoices: (connectionId) => speechTransport.listVoices(connectionId, new AbortController().signal),
    getChatId: () => chatId(),
  });

  function chatId(): string {
    return ctx.getActiveChat().chatId ?? "";
  }

  let lastAnnouncedChatId = "";
  // True until the first vn_state answers the boot request; that reply decides
  // whether the view opens (autoEnter) or is explicitly closed.
  let bootPending = true;
  let stateRequestId: string | undefined;
  function requestState(options: { boot?: boolean;prepare?:boolean } = {}): void {
    const current = chatId();
    // Leaving a chat (home screen, or another chat) closes the previous view
    // explicitly; the backend must not keep paying for a chat nobody is watching.
    if (lastAnnouncedChatId && lastAnnouncedChatId !== current && active) {
      ctx.sendToBackend({ type: "vn_view", chatId: lastAnnouncedChatId, open: false });
    }
    lastAnnouncedChatId = current;
    stateRequestId = createUiId();
    for (const message of viewStateMessages(current, options.boot ? undefined : active)) {
      ctx.sendToBackend(message.type === "vn_get_state" ? { ...message, requestId: stateRequestId,...(options.prepare!==undefined?{prepare:options.prepare}:{}) } : message);
    }
    syncGameChoices();
    gameBridge?.request(current);
  }

  const connectionOptions: Record<"planner" | "image", readonly ConnectionCatalogOption[]> = { planner: [], image: [] };
  function requestConnectionCatalog(): void {
    // Listing is free (no model call). Keep the previous options visible while loading.
    settingsPanel?.setConnectionCatalog("planner", { status: "loading", options: connectionOptions.planner });
    settingsPanel?.setConnectionCatalog("image", { status: "loading", options: connectionOptions.image });
    ctx.sendToBackend({ type: "vn_get_connection_catalog" });
  }

  /**
   * Hand a host error to the stage as a structured `VnStageErrorInput`: the
   * stage renders the title, a collapsed technical detail, and a user-initiated
   * "Try again" only when `retryable` is true. Never retries by itself.
   */
  function reportStageError(error: HostStageError | null): void {
    if(error&&preparationActive){preparationActive=false;imageStudio.setPlanning(chatId(),false);stage.stopPreparationPreview();}
    stage.setError(error);
  }

  function registerOverrides(): void {
    if (!ctx.ui.registerComponentOverride || overrideHandles.length > 0) return;
    const hiddenComponent = () => null;
    overrideHandles = (["BubbleMessage", "MinimalMessage", "InputArea"] as const).map((host) => ctx.ui.registerComponentOverride!({
      host,
      mode: "replace",
      priority: 10,
      component: hiddenComponent
    }));
  }

  function toggleVisualNovel(): void {
    try {
      if (active) deactivate();
      else activate();
    } catch (error) {
      stage.setError(error instanceof Error ? error.message : String(error));
      app.setVisible(true);
    }
  }

  function destroyOverrides(): void {
    for (const handle of overrideHandles.splice(0)) handle.destroy();
  }

  function activate(): void {
    if (destroyed || active) return;
    if (!supportsVisualNovelOverlay(ctx)) {
      throw new Error("This Lumiverse build does not expose the staging component override contract.");
    }
    active = true;
    stage.resume();
    const captureMessageId = turn?.messageId ?? ctx.messages.getLatestMessageId();
    panelCapture = captureMessageId ? { chatId: chatId(), messageId: captureMessageId, fingerprint: turn?.sourceFingerprint ?? null, cards: captureSimTrackerCards(ctx.dom.findMessageElement(captureMessageId), document) } : null;
    registerOverrides();
    app.setVisible(true);
    action.setLabel("Exit visual novel");
    headerLauncher.setActive(true);
    const activeChatId = chatId();
    if (!turn || turn.chatId !== activeChatId) {
      turn = null;
      imageStudio.setTurn(null);
    imageLibrary.setContext(null,0);
      settingsPanel?.setImagePreviewMetadata();
      loadedReadingCursor.load(null);
      stage.reset();
    }
    speech.setActive(true);
    speechDock.setOverlayActive(true);
    if (turn && activeChatId === turn.chatId) {
      void syncImageForParagraph(stage.getState().currentParagraphIndex);
    }
    requestState();
    stage.focus();
  }

  function deactivate(): void {
    if(turn){invalidatedReferenceTurn=referenceTurnToken(turn);turn=withoutReferenceHistory(turn);}stage.setReferenceHistory(undefined);
    preparationActive=false;stage.clearPreparationPreview();imageStudio.setPlanning(chatId(),false);
    imageLibrary.close();
    if (destroyed) return;
    const wasActive = active;
    stage.suspend();
    if (wasActive) saveCursor(stage.getState().currentParagraphIndex, true);
    stage.showReaderText();
    active = false;
    // Tell the backend this chat's view closed so it stops paying for the
    // in-flight batch and skips upcoming replies. Only when actually open;
    // repeats would be harmless (the backend close is idempotent).
    const activeChatId = chatId();
    if (wasActive && activeChatId) ctx.sendToBackend({ type: "vn_view", chatId: activeChatId, open: false });
    // Closing the view stops speech, aborts any request, and clears the session cache.
    stage.toggleAutoPlay(false);
    speech.setActive(false);
    speechDock.setOverlayActive(false);
    audioEngine.stopAll();
    destroyOverrides();
    app.setVisible(false);
    stage.setCastTurn(null,0);
    action.setLabel("Open visual novel");
    headerLauncher.setActive(false);
  }

  async function submit(content: string): Promise<void> {
    const activeChatId = chatId();
    if (!activeChatId) throw new Error("No chat is active.");
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Enter a response first.");
    const requestId = globalThis.crypto?.randomUUID?.() ?? `vn-submit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    ctx.sendToBackend({ type: "vn_submit", chatId: activeChatId, content: trimmed, requestId });
  }

  async function handleUserSubmission(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Enter a response first.");
    const userSpeaker = turn?.userSpeaker || "You";
    speech.setCursor(null);
    stage.presentUserParagraph(trimmed, userSpeaker);
    await submit(trimmed);
  }

  async function syncImageForParagraph(paragraphIndex: number): Promise<void> {
    if (!turn) return;
    const sourceTurn = turn;
    const assetFailure = currentAssetFailure(turn, paragraphIndex);
    if (assetFailure) reportStageError(assetFailure);
    let asset = stage.setCastTurn(turn,paragraphIndex) ?? selectCurrentImage(turn, paragraphIndex);
    if (!asset || !sceneImageUrlFor(asset)) {
      asset = turn.assets
        .filter((a) => (a.status === "generated" || a.status === "browser_ready" || a.previousImage) && Boolean(sceneImageUrlFor(a)))
        .sort((a, b) => a.paragraphIndex - b.paragraphIndex)[0] ?? null;
    }
    const sceneUrl = asset ? sceneImageUrlFor(asset) : null;
    if (!asset || !sceneUrl) {
      vnDebug("image sync", `p${paragraphIndex}`, "no decodable asset yet");
      return;
    }
    vnDebug("image sync", `p${paragraphIndex}`, `using cue p${asset.paragraphIndex}`, asset.status, sceneUrl, asset.imageUrl ?? "(no host url)");
    const loaded = await stage.setSceneImage({
      url: sceneUrl,
      ...(asset.presentation ? { presentation: asset.presentation } : {}),
      alt: `Generated scene for paragraph ${asset.paragraphIndex + 1}`,
      requestId: `${sourceTurn.chatId}:${sourceTurn.messageId}:${sourceTurn.swipeId}:${sourceTurn.sourceFingerprint}:${sourceTurn.revision}:${asset.jobId}:${asset.imageId ?? asset.imageUrl}`
    });
    if (!loaded || asset.status === "browser_ready" || !turn || !active
      || !sameTurnIdentity(sourceTurn, turn) || sourceTurn.revision !== turn.revision || sourceTurn.swipeId !== turn.swipeId
      || !turn.assets.some(candidate => candidate.jobId === asset.jobId && candidate.imageId === asset.imageId && candidate.imageUrl === asset.imageUrl)) return;
    const acknowledgementKey = `${sourceTurn.chatId}:${sourceTurn.messageId}:${sourceTurn.swipeId}:${sourceTurn.sourceFingerprint}:${sourceTurn.revision}:${asset.jobId}:${asset.imageId ?? asset.imageUrl}`;
    if (acknowledgedAssets.has(acknowledgementKey)) return;
    acknowledgedAssets.add(acknowledgementKey);
    ctx.sendToBackend({
      type: "vn_asset_ready",
      chatId: sourceTurn.chatId,
      messageId: sourceTurn.messageId,
      jobId: asset.jobId,
      sourceFingerprint: sourceTurn.sourceFingerprint,
      swipeId: sourceTurn.swipeId,
      revision: sourceTurn.revision,
      imageId: asset.imageId,
      imageUrl: asset.imageUrl
    });
  }

  /**
   * Apply an incoming turn delivery. Re-broadcasting the SAME logical turn must
   * not reset the cursor back to paragraph 0 (a GENERATION_ENDED followed by a
   * MESSAGE_EDITED/SWIPE_EDITED/MESSAGE_SWIPED reconcile, or a `vn_retry_turn`,
   * re-sends the identical turn). A genuinely different turn within the same
   * chat preserves the previous scene image until the new turn's scene image is
   * generated, preventing a blank screen between turns.
   */
  function applyTurn(next: TurnView, previous: TurnView | null): void {
    if (next.chatId !== chatId()) return;
    if (turn && sameTurnIdentity(turn, next) && turn.swipeId === next.swipeId && next.revision < turn.revision) return;
    preparationActive=false;imageStudio.setPlanning(next.chatId,false);
    const previewCursor=stage.preparationCursorFor(next);
    if (panelCapture) {
      if (panelCapture.chatId !== next.chatId || panelCapture.messageId !== next.messageId || (panelCapture.fingerprint !== null && panelCapture.fingerprint !== next.sourceFingerprint)) panelCapture = null;
      else panelCapture.fingerprint = next.sourceFingerprint;
    }
    if(!turn||turn.chatId!==next.chatId||turn.messageId!==next.messageId||turn.sourceFingerprint!==next.sourceFingerprint||turn.swipeId!==next.swipeId||turn.revision!==next.revision)retryQueue=null;
    turn = next;
    imageStudio.setTurn(next);
    imageLibrary.setContext(next,stage.getState().currentParagraphIndex);
    settingsPanel?.setImagePreviewMetadata(next?.imageRequests?.at(-1)?.imagePromptMetadata);
    imageStudio.setCursor(stage.getState().currentParagraphIndex);
      imageLibrary.setContext(turn,stage.getState().currentParagraphIndex);
    stage.setAssetProgress(computeAssetProgress(next,retryQueue,localPictureOperations));
    stage.workspace.setAttention(computeReviewAttention(next,localPictureOperations));
    const decision = decideTurnApplication(loadedReadingCursor.turn, next, stage.getState().currentParagraphIndex, active, stage.getState().paragraphs.length > 0);
    vnDebug("turn decision", decision.kind, {
      message: next.messageId,
      paragraphs: next.paragraphs.length,
      choices: next.choices.length,
      status: next.status
    });
    if (decision.kind === "none") return;
    if (decision.kind === "planning") {
      speech.setCursor(null);
      stage.setPhase("planning");
      return;
    }
    if (decision.kind === "error") {
      stage.stopPreparationPreview();
      speech.setCursor(null);
      reportStageError(describePlanningFailure(next));
      return;
    }
    const recovering = decision.kind === "same-turn" && (stage.getState().phase === "planning" || stage.getState().phase === "error");
    if (decision.kind === "same-turn" && !recovering) {
      stage.setReferenceHistory(next.referenceHistory);
      audioEngine.setBgmAttenuation(musicAttenuationForParagraph(next,decision.paragraphIndex));
      loadedReadingCursor.load(next);
      // Identical cursor identity: SpeechController treats this as a no-op, so
      // a same-turn rebroadcast (e.g. an image/asset update) never replays speech.
      syncSpeechCursor(next, decision.paragraphIndex);
      panels.setTurn(next, decision.paragraphIndex);
      void syncImageForParagraph(decision.paragraphIndex);
      return;
    }
    const requestedMode = configRef.current?.mode ?? "standard";
    panels.setTurn(next, 0);
    const mode = requestedMode === "cyoa" && next.choices.length > 0 ? "cyoa" : "standard";
    const preserveImage = shouldPreserveImage(previous, next);
    turnOpeningBgm = preserveImage ? currentBgm : null;
    const revised = decision.kind === "revised-turn" || recovering;
    const draft = revised ? stage.getState().draft : "";
    const restored = decision.kind === "revised-turn" || decision.kind === "same-turn" ? Math.min(decision.paragraphIndex, Math.max(0, next.paragraphs.length - 1)) : restoreReadingPosition(savedReadingPosition, next);
    const cursor = previewCursor ?? restored ?? 0;
    if (restored !== null || previewCursor!==null) { stage.toggleAutoPlay(false); stage.toggleSkip(false); }
    stage.clearPreparationPreview();
    stage.showReaderText();
    stage.loadTurn({ ...stageTurnInput(next, mode, preserveImage, configRef.current?.effectIntensity ?? "full"), initialParagraphIndex: cursor });
    // Loading a turn resets store progress. Restore it after the new stage exists.
    stage.setAssetProgress(computeAssetProgress(next,retryQueue,localPictureOperations));
    stage.workspace.setAttention(computeReviewAttention(next,localPictureOperations));
    if (revised) stage.restoreReplyDraft(draft);
    loadedReadingCursor.load(next);
    panels.setCursor(cursor);
    imageStudio.setCursor(cursor);
      imageLibrary.setContext(turn,stage.getState().currentParagraphIndex);
    if (restored !== null || previewCursor!==null) speech.setCursor(speechCursorFor(next, cursor), { autoplay: false }); else syncSpeechCursor(next, 0);
    void syncImageForParagraph(cursor);
    audioEngine.setBgmAttenuation(musicAttenuationForParagraph(next,cursor));
    if (restored === null && previewCursor===null) syncAudioForParagraph(next, 0);
  }

  function routeBackend(payload: unknown): void {
    const type = messageType(payload);
    if(type==='vn_narrative_preview'){
      const parsed=NarrativePreviewSchema.safeParse(payload);if(!parsed.success)return;
      const preview=parsed.data;
      if(!active||!preparationActive||preview.chatId!==chatId()||preview.sessionId!==stateRequestId||stage.isReadingUserParagraph())return;
      const latest=ctx.messages.getLatestMessageId();if(latest&&latest!==preview.messageId)return;
      // Replanning an already displayed reply keeps its existing controls and local draft.
      if(turn&&turn.chatId===preview.chatId&&turn.messageId===preview.messageId&&turn.swipeId===preview.swipeId&&turn.sourceFingerprint===preview.sourceFingerprint)return;
      speech.setCursor(null);stage.showPreparationPreview(preview);return;
    }
    const message = payload as BackendResponse;
    if(message.type==='vn_reference_history_invalidated'){
      if(message.chatId!==chatId())return;
      if(turn){invalidatedReferenceTurn=referenceTurnToken(turn);turn=withoutReferenceHistory(turn);}
      stage.setReferenceHistory(undefined);if(active)requestState({prepare:false});return;
    }
    if(message.type==='vn_image_library'){imageLibrary.receive(message.chatId,message.requestId,message.page);return;}
    if(message.type==='vn_error'&&message.operation==='vn_image_library'){imageLibrary.error(message.chatId??'',message.requestId,message.error);return;}
    if (message.type === "vn_external_image") {
      if (message.result.status !== "accepted") externalReview.result(message.result.chatId, message.result.requestId);
      imageBridge.result(message.result); return;
    }
    if (message.type === "vn_external_image_review") {
      if (message.chatId === chatId() && imageBridge.owns(message.chatId, message.requestId)) externalReview.receive(message);
      return;
    }
    if (message.type === "vn_error" && message.operation === "vn_external_image_review") {
      externalReview.error(message.chatId, message.requestId, message.error); return;
    }
    if (message.type === "vn_panel_template") {
      const pending = panelRequests.get(message.requestId);
      if (!pending) return;
      panelRequests.delete(message.requestId); clearTimeout(pending.timer);
      if (message.error || message.chatId !== chatId()) pending.reject(new Error(message.error ?? "The active chat changed."));
      else pending.resolve(message.template ?? "");
      return;
    }
    if (type && type !== "vn_asset") vnDebug("received", type, payload);
    if (type === "vn_connection_catalog" && message.type === "vn_connection_catalog") {
      const states = connectionCatalogStates(message);
      connectionOptions.planner = states.planner.options;
      connectionOptions.image = states.image.options;
      settingsPanel?.setConnectionCatalog("planner", states.planner);
      settingsPanel?.setConnectionCatalog("image", states.image);
      return;
    }
    if(type==='vn_presentation_rules'&&message.type==='vn_presentation_rules'){settingsPanel?.setPresentationRules(message.chatId,message.requestId,message.catalog);imageStudio.setPresentationRules(message.chatId,message.requestId,message.catalog);return;}
    if(type==='vn_error'&&message.type==='vn_error'&&message.operation==='vn_presentation_rules'){settingsPanel?.presentationRulesError(message.error,message.requestId);imageStudio.presentationRulesError(message.error,message.requestId);return;}
    if(type==='vn_cast_context'&&message.type==='vn_cast_context'){settingsPanel?.setCastContext(message.chatId,message.requestId,message.scan);return;}
    if(type==='vn_cast_art'&&message.type==='vn_cast_art'){const accepted=settingsPanel?.setCastArt(message.chatId,message.requestId,message.library);if(accepted&&active&&turn&&message.chatId===chatId())ctx.sendToBackend({type:'vn_get_state',chatId:message.chatId,viewOpen:true,prepare:false});return;}
    if(type==='vn_cast_gallery'&&message.type==='vn_cast_gallery'){settingsPanel?.setCastGallery(message.chatId,message.requestId,message.gallery);return;}
    if(type==='vn_error'&&message.type==='vn_error'&&message.operation==='vn_cast_gallery'){if(message.chatId===chatId())settingsPanel?.castArtError(message.error,message.requestId);return;}
    if(type==='vn_cast_art_notice'&&message.type==='vn_cast_art_notice'){if(message.chatId===chatId())settingsPanel?.castArtNotice(message.error);return;}
    if(type==='vn_error'&&message.type==='vn_error'&&message.operation==='vn_cast_art'){if(!message.chatId||message.chatId===chatId())settingsPanel?.castArtError(message.error,message.requestId);return;}
    if(type==='vn_location_art'&&message.type==='vn_location_art'){settingsPanel?.setLocationArt(message.chatId,message.requestId,message.library);return;}
    if(type==='vn_location_art_notice'&&message.type==='vn_location_art_notice'){if(message.chatId===chatId())settingsPanel?.locationArtNotice(message.error);return;}
    if(type==='vn_error'&&message.type==='vn_error'&&message.operation==='vn_location_art'){if(!message.chatId||message.chatId===chatId())settingsPanel?.locationArtError(message.error,message.requestId);return;}
    if(type==='vn_context_sources' && message.type==='vn_context_sources') {settingsPanel?.setContextSourceReport(message.report);return;}
    if(type==='vn_error' && message.type==='vn_error' && message.operation==='vn_get_context_sources') {if(!message.chatId||message.chatId===chatId())settingsPanel?.contextSourceError(message.requestId);return;}
    if (type === "vn_system_one_key_status" && message.type === "vn_system_one_key_status") {
      settingsPanel?.setSystemOneKeyStatus(message.saved);
      return;
    }
    if (type === "vn_audio_scanned" && message.type === "vn_audio_scanned") {
      settingsPanel?.setAudioStatus(`Scanned ${message.bgmCount} BGM, ${message.sfxCount} SFX.`);
      settingsPanel?.setAudioLibrary?.({ bgmCount: message.bgmCount, sfxCount: message.sfxCount });
      return;
    }
    if (type === "vn_state" && message.type === "vn_state") {
      if (message.chatId !== chatId() || (message.requestId !== undefined && message.requestId !== stateRequestId)) return;
      configRef.current = message.config;
      savedReadingPosition = message.readingPosition ?? savedReadingPosition;
      imageStudio.setReview(message.config.reviewImages);
      imageStudio.setConfig(message.config);
      imageBridge.fit(message.config.sceneImageFit);
      applyVisualConfigToStage(stage, configRef.current);

      audioEngine.setBgmVolume(configRef.current.bgmVolume);
      audioEngine.setSfxVolume(configRef.current.sfxVolume);
      speech.setSettings(configRef.current.speech);
      speechDock.setEnabled(configRef.current.speech.enabled);
      speechSettings?.setConfig(configRef.current.speech);
      settingsPanel?.setConfig(configRef.current);
      if (configRef.current?.autoEnter && !active) activate();
      if (bootPending) {
        // The boot request said nothing about the view. Now that the config is
        // known: autoEnter has just reopened it; otherwise the view the backend
        // may still hold open from before the reload is closed for real.
        bootPending = false;
        const bootChatId = chatId();
        if (!active && bootChatId) ctx.sendToBackend({ type: "vn_view", chatId: bootChatId, open: false });
      }
      if (message.turn && message.turn.chatId === chatId()) {
        const next=invalidatedReferenceTurn===referenceTurnToken(message.turn)&&message.requestId!==stateRequestId?withoutReferenceHistory(message.turn):message.turn;
        applyTurn(next, turn);
      } else {
        turn = null;
        imageStudio.setTurn(null);
    imageLibrary.setContext(null,0);
      settingsPanel?.setImagePreviewMetadata();
        speech.setCursor(null);
        panels.setTurn(null);
        loadedReadingCursor.load(null);
        stage.reset();
        if (active) stage.setPhase("idle");
      }
      return;
    }
    if (type === "vn_config" && message.type === "vn_config") {
      imageBridge.fit(message.config.sceneImageFit);
      // The echo of a persisted config is the only save acknowledgment the
      // transport offers; "saved" is claimed here and nowhere earlier.
      const castWasEnabled=configRef.current?.castMode??false;
      const rememberedBefore=Boolean(configRef.current?.tooltips.enabled&&configRef.current.tooltips.rememberReferences);
      configRef.current = message.config;
      if(!rememberedBefore&&message.config.tooltips.enabled&&message.config.tooltips.rememberReferences&&active)requestState({prepare:false});
      if(!castWasEnabled&&message.config.castMode&&active&&turn)ctx.sendToBackend({type:"vn_get_state",chatId:chatId(),viewOpen:true});
      imageStudio.setReview(message.config.reviewImages);
      imageStudio.setConfig(message.config);
      applyVisualConfigToStage(stage, configRef.current);
      if(turn && active)void syncImageForParagraph(stage.getState().currentParagraphIndex);
      audioEngine.setBgmVolume(configRef.current.bgmVolume);
      audioEngine.setSfxVolume(configRef.current.sfxVolume);
      speech.setSettings(configRef.current.speech);
      speechDock.setEnabled(configRef.current.speech.enabled);
      speechSettings?.setConfig(configRef.current.speech);
      settingsPanel?.setConfig(configRef.current, message.requestId);
      settingsPanel?.setSaveStatus?.({ kind: "saved" }, message.requestId);
      return;
    }
    if (type === "vn_turn" && message.type === "vn_turn") {
      if (message.turn.chatId !== chatId()) return;
      // Uncorrelated late turn broadcasts cannot restore invalidated history.
      // A fresh correlated vn_state may restore it after read-only validation.
      const next=invalidatedReferenceTurn===referenceTurnToken(message.turn)?withoutReferenceHistory(message.turn):message.turn;
      if (stage.isReadingUserParagraph()) {
        pendingNextTurn = next;
      } else {
        applyTurn(next, turn);
      }
      return;
    }
    if (type === "vn_asset" && message.type === "vn_asset") {
      vnDebug("received vn_asset", `p${message.asset.paragraphIndex}`, message.asset.status, message.asset.imageUrl ?? "(no url)", (!turn || turn.chatId !== message.chatId || turn.messageId !== message.messageId) ? "(ignored: not the active turn)" : "");
      if (!turn || turn.chatId !== message.chatId || turn.messageId !== message.messageId) return;
      if ((message.sourceFingerprint !== undefined && message.sourceFingerprint !== turn.sourceFingerprint)
        || (message.revision !== undefined && message.revision !== turn.revision)
        || (message.swipeId !== undefined && message.swipeId !== turn.swipeId)) return;
      turn = replaceAsset(turn, message.asset);
      imageStudio.setTurn(turn);
      imageLibrary.setContext(turn,stage.getState().currentParagraphIndex);
      settingsPanel?.setImagePreviewMetadata(turn?.imageRequests?.at(-1)?.imagePromptMetadata);
      stage.setAssetProgress(computeAssetProgress(turn,retryQueue,localPictureOperations));
      stage.workspace.setAttention(computeReviewAttention(turn,localPictureOperations));
      const cursor = stage.getState().currentParagraphIndex;
      if (message.asset.paragraphIndex <= cursor || !stage.getState().displayedImage) void syncImageForParagraph(cursor);
      return;
    }
    if(type==="vn_image_retry_queue"&&message.type==="vn_image_retry_queue"){
      if(!turn||message.queue.chatId!==turn.chatId||message.queue.messageId!==turn.messageId||message.queue.sourceFingerprint!==turn.sourceFingerprint||message.queue.swipeId!==turn.swipeId||message.queue.revision!==turn.revision)return;
      retryQueue=message.queue;imageStudio.setRetryQueue(message.queue);stage.setAssetProgress(computeAssetProgress(turn,retryQueue,localPictureOperations));
      stage.workspace.setAttention(computeReviewAttention(turn,localPictureOperations));return;
    }
    if (type === "vn_image_requests" && message.type === "vn_image_requests") {
      if (!turn || turn.chatId !== message.chatId || turn.messageId !== message.messageId || turn.sourceFingerprint !== message.sourceFingerprint) return;
      turn = { ...turn, imageRequests: message.requests };
      stage.setAssetProgress(computeAssetProgress(turn,retryQueue,localPictureOperations));
      stage.workspace.setAttention(computeReviewAttention(turn,localPictureOperations));
      imageStudio.setTurn(turn);
      imageLibrary.setContext(turn,stage.getState().currentParagraphIndex);
      settingsPanel?.setImagePreviewMetadata(turn?.imageRequests?.at(-1)?.imagePromptMetadata);
      return;
    }
    if (type === "vn_waiting" && message.type === "vn_waiting") {
      if (message.chatId !== chatId()) return;
      preparationActive=false;imageStudio.setPlanning(message.chatId,false);
      turn = null;
      imageStudio.setTurn(null);
    imageLibrary.setContext(null,0);
      settingsPanel?.setImagePreviewMetadata();
      pendingNextTurn = null;
      panels.setTurn(null);
      loadedReadingCursor.load(null);
      stage.reset();
      reportStageError({
        message: "This opening message holds several scenes, and none is selected yet. Pick a starting scene in the chat view, then use Try again or reopen Lumiglyphics.",
        source: "waiting",
        retryable: true,
        retryScope: "Checks the latest message again.",
      });
      return;
    }
    if (type === "vn_reference_fetch" && message.type === "vn_reference_fetch") {
      // Data relay for card-sourced reference anchoring. Served regardless of
      // the active chat: the backend keeps generating for its own chat and the
      // image id came from the backend, not from user input.
      void relayReferenceFetch(message, (input, init) => fetch(input, init), (reply) => ctx.sendToBackend(reply));
      return;
    }
    if (type === "vn_planning" && message.type === "vn_planning") {
      if (message.chatId === chatId() && active) {preparationActive=true;imageStudio.setPlanning(message.chatId,true);stage.setPhase("planning");}
      return;
    }
    if (type === "vn_generation" && message.type === "vn_generation") {
      if (message.chatId !== chatId()) return;
      if (message.active) {
        stage.setError(null);
        stage.setAssetProgress(null);stage.workspace.setAttention(0);
        if (!stage.isReadingUserParagraph()) {
          stage.setPhase("waiting-for-response");
        }
      } else if (message.error) {
        reportStageError({
          message: "The reply finished, but the scene could not be updated.",
          detail: message.error,
          source: "generation",
          retryable: false,
        });
      }
      return;
    }
    if (type === "vn_permission" && message.type === "vn_permission") {
      if (!message.granted) {
        externalReview.cancel(); imageBridge.cancelAll();
        deactivate();
        reportStageError({
          message: "Visual novel mode needs a permission that was turned off.",
          detail: `Permission revoked: ${message.permission}. Re-enable it before reopening visual novel mode.`,
          source: "permission",
          retryable: false,
        });
      }
      return;
    }
    if (type === "vn_error" && message.type === "vn_error") {
      if(message.operation==='vn_replan_turn'&&(!message.chatId||message.chatId===chatId())){preparationActive=false;imageStudio.setPlanning(chatId(),false);stage.stopPreparationPreview();}
      if (message.operation === "vn_queue_image_retries" || message.operation === "queue_image_retry" || message.operation === "vn_recover_images" || message.operation === "vn_replan_turn" || message.operation === "vn_correct_image_subject" || message.operation === "vn_set_card_role" || message.operation === "vn_regenerate_image_prompt" || message.operation === "vn_reprepare_image_template" || message.operation === "vn_image_review" || message.operation === "vn_prepare_image" || message.operation === "prepare_image") {
        if (!message.chatId || message.chatId === chatId()) imageStudio.showError(message.error);
        return;
      }
      if (message.operation === "vn_set_config") {
        settingsPanel?.setSaveStatus?.({ kind: "error", error: message.error }, message.requestId);
        return;
      }
      if (message.operation === "vn_set_system_one_key" || message.operation === "vn_clear_system_one_key" || message.operation === "vn_get_system_one_key_status") {
        settingsPanel?.setSystemOneKeyStatus(false, message.error);
        return;
      }
      if (message.operation === "vn_get_connection_catalog") {
        settingsPanel?.setConnectionCatalog("planner", { status: "error", options: [], error: message.error });
        settingsPanel?.setConnectionCatalog("image", { status: "error", options: [], error: message.error });
        return;
      }
      if (!message.chatId || message.chatId === chatId()) {
        reportStageError(describeOperationError(message.operation, message.error, turn));
      }
    }
  }

  const unsubBackend = ctx.onBackendMessage(routeBackend);
  const unsubAction = action.onClick(toggleVisualNovel);
  const unsubChat = ctx.events.on("CHAT_SWITCHED", () => {
    preparationActive=false;
    externalReview.cancel(); imageBridge.cancelAll();
    settingsPanel?.clearCastArt();
    settingsPanel?.clearPresentationRules();
    settingsPanel?.clearLocationArt();
    settingsPanel?.clearContextSources();
    imageStudio.setTurn(null);
    imageLibrary.setContext(null,0);
      settingsPanel?.setImagePreviewMetadata();
    panelCapture = null;
    panels.setTurn(null);
    turn = null;
    pendingNextTurn = null;
    speech.onChatChanged();
    loadedReadingCursor.load(null);
    stage.reset();
    requestState();
  });
  const unsubFork = ctx.events.on("CHAT_FORKED", () => {
    preparationActive=false;stage.clearPreparationPreview();
    externalReview.cancel(); imageBridge.cancelAll();
    settingsPanel?.clearCastArt();
    settingsPanel?.clearPresentationRules();
    settingsPanel?.clearLocationArt();
    settingsPanel?.clearContextSources();
    imageStudio.setTurn(null);
    imageLibrary.setContext(null,0);
      settingsPanel?.setImagePreviewMetadata();
    panelCapture = null;
    panels.setTurn(null);
    turn = null;
    pendingNextTurn = null;
    speech.onChatChanged();
    loadedReadingCursor.load(null);
    stage.reset();
    requestState();
  });
  const unsubPermission = ctx.events.on("PERMISSION_CHANGED", (payload) => {
    if (!payload || typeof payload !== "object") return;
    const detail = payload as { permission?: unknown; granted?: unknown };
    if (detail.granted === false) { externalReview.cancel(); imageBridge.cancelAll(); deactivate(); }
  });

  requestConnectionCatalog();
  ctx.sendToBackend({ type: "vn_get_system_one_key_status" });
  requestState({ boot: true });
  ctx.ready();

  const cleanup = (): void => {
    if (destroyed) return;
    deactivate();
    stage.workspace.destroy();
    destroyed = true;
    unsubBackend();
    unsubAction();
    unsubChat();
    unsubFork();
    unsubPermission();
    headerLauncher.destroy();
    action.destroy();
    document.removeEventListener("visibilitychange", onVisibilityChanged);
    speech.dispose();
    speechDock.destroy();
    speechSettings?.destroy();
    settingsPanel?.destroy();
    imageStudio.destroy();
    imageLibrary.destroy();
    settingsHandle?.destroy();
    audioEngine.destroy();
    panels.destroy();
    gameBridge?.destroy();
    imageBridge.destroy();
    externalReview.destroy();
    externalReviewMount.destroy();
    for (const pending of panelRequests.values()) { clearTimeout(pending.timer); pending.reject(new Error("Panel layer closed.")); }
    panelRequests.clear();
    stage.destroy();
    app.destroy();
    if ((globalThis as Record<PropertyKey, unknown>)[CLEANUP_KEY] === cleanup) {
      delete (globalThis as Record<PropertyKey, unknown>)[CLEANUP_KEY];
    }
  };
  (globalThis as Record<PropertyKey, unknown>)[CLEANUP_KEY] = cleanup;
  return cleanup;
}
