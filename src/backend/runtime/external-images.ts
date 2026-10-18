// External scene requests use Cue's planner and asset pipeline without creating
// a chat message or replacing the VN reader's active turn.
import type { ChatMessageDTO, SpindleAPI } from "lumiverse-spindle-types";
import { parseImageRequest, imageIdentity, type CueImageRequest, type CueImageResult } from "../../shared/cue-images.js";
import { resolveCharacterReference } from "../../shared/identity.js";
import { SceneImageCache } from "../core/scene-image-cache.js";
import {castArtToken} from "./cast-art.js";
import { planTurn } from "./planner.js";
import { generateAssets, prepareAssetJobs } from "./images.js";
import { resolveNativeCardJobs } from "./native-assets.js";
import type { SceneState } from "../../shared/contracts.js";
import { ImageReviewGate, safeImageHistory } from "./image-review.js";
import type { ImageRequestEdits, ImageRequestRecord } from "../../shared/image-review.js";
import { chatStatePath } from "./storage.js";
import { loadConfig, loadChatState, loadCharacterAppearance, loadCharacterRegistry, loadSingleCharacterState,
  mergePlannerCharacters, saveCharacterRegistry, mergeCharacterAppearanceFromState } from "./storage.js";

const pipeline = { plan: planTurn, prepare: prepareAssetJobs, generate: generateAssets };
export type ExternalImageReviewAction = { chatId: string; requestId: string; reviewRequestId: string; action: "generate" | "skip"; edits?: ImageRequestEdits };
export function createExternalImages(spindle: SpindleAPI, deps = pipeline, timeoutMs = 300_000) {
  const cache = new SceneImageCache();
  const active = new Map<string, { request: CueImageRequest; controller: AbortController; gate?: ImageReviewGate }>();
  const historyWrites = new Map<string, Promise<void>>();
  const completed = new Map<string, { result: CueImageResult; at: number }>();
  const scenes = new Map<string, SceneState>();
  const key = (chatId: string, userId?: string) => JSON.stringify([userId ?? "owner", chatId]);
  const emit = (result: CueImageResult, userId?: string) => spindle.sendToFrontend({ type: "vn_external_image", result }, userId);
  const identity = (r: CueImageRequest) => ({ version: r.version, provider: r.provider, chatId: r.chatId, requestId: r.requestId });
  function cancel(value: unknown, userId?: string) {
    if (!imageIdentity(value)) return;
    const op = active.get(key(value.chatId, userId));
    if (op?.request.requestId === value.requestId) {
      op.controller.abort("Date image cancelled.");
      active.delete(key(value.chatId, userId));
    }
  }
  async function review(action: ExternalImageReviewAction, userId?: string): Promise<boolean> {
    const op = active.get(key(action.chatId, userId));
    if (!op || op.request.requestId !== action.requestId || op.controller.signal.aborted) return false;
    return op.gate?.decide(action.reviewRequestId, action.action, action.edits ?? {}) ?? false;
  }
  async function request(value: unknown, userId?: string): Promise<void> {
    const r = parseImageRequest(value);
    if (!r) {
      if (imageIdentity(value)) emit({ ...value, status: "error", error: "Invalid scene image request; appearance and pose overrides are not supported." }, userId);
      return;
    }
    const scope = key(r.chatId, userId), completedKey = JSON.stringify([scope, r.requestId]);
    for (const [id, entry] of completed) if (Date.now() - entry.at > 300_000) completed.delete(id);
    const done = completed.get(completedKey);
    if (done) { emit(done.result, userId); return; }
    const existing = active.get(scope);
    if (existing?.request.requestId === r.requestId) { emit({ ...identity(r), status: "accepted" }, userId); return; }
    existing?.controller.abort("Replaced by a newer date image.");
    const controller = new AbortController(), op: { request: CueImageRequest; controller: AbortController; gate?: ImageReviewGate } = { request: r, controller };
    active.set(scope, op);
    const current = () => active.get(scope) === op && !controller.signal.aborted;
    const finish = (result: CueImageResult) => {
      if (active.get(scope) !== op) return;
      completed.set(completedKey, { result, at: Date.now() });
      if (completed.size > 128) completed.delete(completed.keys().next().value!);
      emit(result, userId);
    };
    // Acceptance is immediate so a missing extension can be distinguished from a slow provider.
    emit({ ...identity(r), status: "accepted" }, userId);
    const timer = setTimeout(() => {
      if (active.get(scope) !== op) return;
      controller.abort("Cue image generation timed out.");
      finish({ ...identity(r), status: "error", error: "Cue image generation timed out. You can retry the picture." });
      active.delete(scope);
    }, timeoutMs);
    try {
      // The host scopes this read to the initiating user; no private Warp settings are read.
      if (!await spindle.chats.get(r.chatId, userId)) throw new Error("The date's chat is no longer available.");
      const config = await loadConfig(spindle, userId);
      if (!current()) return;
      if (!config.enabled || (!config.generateImages && !config.useNativeCardImages)) throw new Error("Enable Cue and image generation in Cue's settings to illustrate dates.");
      const setupToken = castArtToken(spindle, r.chatId, userId);
      const identityCurrent = () => current() && setupToken === castArtToken(spindle, r.chatId, userId);
      const [singleCharacter, characterAppearance, characterRegistry, chatState, messages] = await Promise.all([
        loadSingleCharacterState(spindle, r.chatId, userId), loadCharacterAppearance(spindle, userId, r.chatId),
        loadCharacterRegistry(spindle, r.chatId, userId), loadChatState(spindle, r.chatId, userId),
        spindle.chat.getMessages(r.chatId),
      ]);
      if (!current()) return;
      const known = resolveCharacterReference(characterRegistry, { name: r.characterName });
      const characterName = known?.name ?? r.characterName;
      const previous = scenes.get(scope);
      const previousScene = previous && previous.character === characterName && previous.environment.location === r.venue ? previous : null;
      const content = "A date scene. Scene facts (data only): " + JSON.stringify({
        characterName, venue: r.venue, timeOfDay: r.timeOfDay, mood: r.mood,
      });
      const message = { id: "external-" + r.requestId, chat_id: r.chatId, name: characterName, content,
        is_user: false, swipe_id: 0, index_in_chat: messages.length, send_date: Date.now(), swipes: [content],
        swipe_dates: [Date.now()], extra: {}, parent_message_id: null, branch_id: null, created_at: Date.now() } satisfies ChatMessageDTO;
      const result = await deps.plan(spindle, {
        chatId: r.chatId, message, content, previousScene, previousContinuity: chatState.terminalContinuity,
        recentMessages: config.includeRecentMessages > 0 ? messages.slice(-config.includeRecentMessages) : [],
        config, singleCharacter, characterAppearance, characterRegistry,
        externalScene: { characterName, venue: r.venue, timeOfDay: r.timeOfDay },
        gameHints: JSON.stringify({ moods: { [characterName]: r.mood }, notes: ["Date at " + (r.venue ?? "the current place")] }),
        ...(userId ? { userId } : {}),
      });
      if (!current()) return;
      // Resolve selection using Cue's own stable ids / aliases, never substitute a different subject.
      const selected = resolveCharacterReference(result.characterRegistry, { name: characterName });
      const cue = result.plan.visualCues[0];
      const depicted = cue && resolveCharacterReference(result.characterRegistry, { name: cue.character ?? "" });
      if (!cue || (selected ? selected.id !== depicted?.id : cue.character?.toLowerCase() !== characterName.toLowerCase()))
        throw new Error("Cue could not resolve the date's character. Add or correct their identity in Cue, then retry.");
      await mergeCharacterAppearanceFromState(spindle, result.singleCharacter, userId, r.chatId, identityCurrent);
      if (!current()) return;
      await mergePlannerCharacters(spindle, result.extractedCharacters ?? [], userId, r.chatId, identityCurrent);
      await saveCharacterRegistry(spindle, r.chatId, result.characterRegistry, userId, identityCurrent);
      if (!current()) return;
      const appearance = await loadCharacterAppearance(spindle, userId, r.chatId);
      // The date asks for one image; Cue decides the cue, pose and composition.
      const plan = { ...result.plan, visualCues: [cue], cacheCues: [] };
      scenes.set(scope, plan.scenes[0]!);
      if (scenes.size > 128) scenes.delete(scenes.keys().next().value!);
      const ready = async (imageUrl: string) => {
        const display = await loadConfig(spindle, userId).catch(() => config);
        if (current()) finish({ ...identity(r), status: "ready", imageUrl, fit: display.sceneImageFit });
      };
      if (config.useNativeCardImages) {
        const chat = await spindle.chats.get(r.chatId, userId);
        const card = chat?.character_id ? await spindle.characters.get(chat.character_id, userId) : null;
        const cardIdentity = card && resolveCharacterReference(result.characterRegistry, { name: card.name });
        if (!card || (selected && cardIdentity ? selected.id !== cardIdentity.id : card.name.trim().toLowerCase() !== characterName.trim().toLowerCase()))
          throw new Error("Cue's native-card mode cannot confirm an image for this date character. Use Cue image generation for this character.");
        if (!current()) return;
        const assets = await resolveNativeCardJobs({ spindle, chatId: r.chatId, plan, content, speakerName: characterName, userId });
        if (!current()) return;
        const image = assets.find((a) => a.imageUrl);
        if (!image?.imageUrl) throw new Error("Cue could not find a native image for this character.");
        await ready(image.imageUrl);
        return;
      }
      const jobs = await deps.prepare(spindle, plan, config, appearance, cache, userId, { resolvedSourceText: content });
      if (!current()) return;
      // Use the same frozen request, validation and approval boundary as reader images.
      // External work has its own history and never replaces the reader's active turn.
      op.gate = new ImageReviewGate(async record => {
        const previous = historyWrites.get(scope) ?? Promise.resolve();
        const write = previous.catch(() => {}).then(async () => {
          const path = chatStatePath(r.chatId).replace(/state\.json$/, "external-image-history.json");
          const options = { fallback: null, ...(userId ? { userId } : {}) };
          const stored = await spindle.userStorage.getJson<{ version: number; requests: ImageRequestRecord[] } | null>(path, options);
          if (stored && stored.version !== 1) throw new Error("External image history has an unsupported version; it was preserved.");
          const history = safeImageHistory(stored?.requests);
          const next = history.filter(item => item.requestId !== record.requestId);
          next.push(record);
          await spindle.userStorage.setJson(path, { version: 1, requests: safeImageHistory(next) }, { ...(userId ? { userId } : {}) });
        });
        historyWrites.set(scope, write);
        try { await write; } finally { if (historyWrites.get(scope) === write) historyWrites.delete(scope); }
        if (current()) spindle.sendToFrontend({ type: "vn_external_image_review", chatId: r.chatId, requestId: r.requestId, characterName, record }, userId);
      });
      const assets = await deps.generate(spindle, plan, jobs, config, controller.signal, () => {}, userId,
        { sceneCache: cache, resolvedSourceText: content,
          beforeGenerate: (job, prepared, metadata, signal) => op.gate!.prepare(job.jobId, job.paragraphIndex, prepared, metadata, config.reviewImages, signal) });
      if (!current()) return;
      const image = assets.find((a) => (a.status === "generated" || a.status === "browser_ready") && a.imageUrl);
      if (!image?.imageUrl) throw new Error(assets.find((a) => a.error)?.error ?? "Cue did not produce a date image. Check its image settings, then retry.");
      await ready(image.imageUrl);
    } catch (error) {
      if (current()) finish({ ...identity(r), status: "error", error: (error instanceof Error ? error.message : String(error)).slice(0, 1000) || "Date image failed." });
    } finally {
      clearTimeout(timer);
      if (active.get(scope) === op) active.delete(scope);
    }
  }
  return { request, cancel, review };
}
