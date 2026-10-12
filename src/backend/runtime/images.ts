import { templateOutputParameters } from "./template-output.js";
import { applyAttireOverride } from "./attire.js";
export { applyAttireOverride, isClothingTag, cleanClothingFromPhrase } from "./attire.js";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { applyImageEdits, type ImageGenerationRequest, type ImagePreparationMetadata } from "./image-review.js";
import type { VisualNovelConfig } from "../../config.js";
import { DEFAULT_CONFIG } from "../../config.js";
import { novelAiCapabilities, novelAiQualityTags, NOVELAI_NEGATIVE_DEFAULT, renderNovelAiEmphasis } from "./novelai-prompt.js";
import { AssetJobSchema, type AssetJob, type SceneState, type TurnPlan, type VisualCue } from "../../shared/contracts.js";
import { AssetScheduler } from "../core/asset-scheduler.js";
import {
  SceneImageCache,
  canonicalJson,
  sceneEpisodeOf,
  sceneImageCacheKey,
  sceneImageScope,
  shortSceneKey,
  type SceneImageAdmission,
  type SceneImageCacheEntry,
  type SceneImageIdentity,
  type SceneImageMissReason,
  type SceneImageOutcome,
  type SceneImageProvenance
} from "../core/scene-image-cache.js";
import { POSE_EXPRESSION_CATALOGUE, poseById } from "../../shared/character.js";
import { compileActionProp } from "../../shared/action-prop.js";
import { renderImageTemplate, templateSnapshot, type ImagePromptMetadata } from "../../shared/image-templates.js";
import { buildVisualBrief, resolveTemplateIdentity } from "./visual-brief.js";
import {
  appearanceMapKeyFor,
  characterAppearanceKey,
  characterIdFor,
  normalizeCharacterName,
  stripAnatomyCompounds,
  subjectPromptFor,
  type CharacterAppearanceMap,
  type SubjectCategory
} from "../../shared/identity.js";
import { assemblePrompt, normalizeConfig, renderNegativeWithCurrentSelection, renderPrompt, splitTopLevelCsv, parseWeightedGroup, validateAndRepairDelimiters, type Config, type PromptEntry } from "../inlay-prompt/index.js";
import {
  loadCharacterAppearance,
  loadConfig,
  loadPortraits,
  savePortrait,
  VALID_IMAGE_MIMES,
  type StoredPortrait
} from "./storage.js";
import { REFERENCE_IMAGE_MAX_BYTES } from "../../protocol.js";
import {
  fetchReferenceImageViaFrontend,
  loadCardReferenceContext,
  type CardAssetResolution,
  type CardReferenceContext
} from "./reference-source.js";

export type AssetUpdateHandler = (jobs: AssetJob[], changed: AssetJob) => Promise<void> | void;

function hash(source: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    value = Math.imul(value ^ source.charCodeAt(index), 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, "0");
}

function sceneForCue(plan: TurnPlan, cue: VisualCue): SceneState {
  const scene = plan.scenes.find((candidate) => candidate.sceneId === cue.sceneId && candidate.revision === cue.sceneRevision);
  if (!scene) throw new Error(`No scene owns visual cue ${cue.cueId}.`);
  return scene;
}

export type CueVisualState = {
  characterName: string;
  characterKey: string;
  /** Stable registry id when the planner resolved one; falls back to the name key. */
  characterId: string;
  /** Durable subject class persisted with the cue; `unknown` defers to the identity text. */
  subjectCategory: SubjectCategory;
  baseIdentity: string;
  identity: string;
  attire: string;
};

export function portraitIdentityFingerprint(name: string, identity: string, config: VisualNovelConfig, provider: string | null): string {
  if (!identity.trim()) return "";
  return hash(JSON.stringify(["identity-v2", characterAppearanceKey(name), identity.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).sort(), provider, config.imageConnectionId, config.imageModel]));
}

export function compatiblePortrait(portrait: StoredPortrait | undefined, fingerprint: string): StoredPortrait | undefined {
  // Card portraits live under their own `card:` key and never satisfy the
  // captured lookup; the guard covers hand-edited stores.
  if (portrait?.source === "card") return undefined;
  return fingerprint && portrait?.identityFingerprint === fingerprint ? portrait : undefined;
}

/** Portrait-store key for a character's card-sourced portrait. */
export function cardPortraitKey(characterKey: string): string {
  return `card:${characterKey}`;
}

/**
 * The cache-key reference descriptor for one cue in card mode: the card
 * sprite actually chosen (image id + asset name), the captured fallback
 * (with its portrait image id when one anchors this render), or none.
 */
export function cardReferenceForCache(
  cardPortrait: StoredPortrait | undefined,
  capturedPortrait: StoredPortrait | undefined
): SceneImageReference {
  if (cardPortrait) {
    return {
      source: "card",
      imageId: cardPortrait.imageId,
      ...(cardPortrait.assetName ? { assetName: cardPortrait.assetName } : {})
    };
  }
  if (capturedPortrait) {
    return {
      source: "captured",
      ...(capturedPortrait.imageId ? { imageId: capturedPortrait.imageId } : {})
    };
  }
  return { source: "none" };
}

/** The stored card portrait for a character, or undefined. */
export function cardPortraitFor(portraits: Record<string, StoredPortrait>, characterKey: string): StoredPortrait | undefined {
  const portrait = portraits[cardPortraitKey(characterKey)];
  return portrait?.source === "card" ? portrait : undefined;
}

export function resolveCueCharacterVisualState(
  scene: SceneState,
  cue: VisualCue,
  characterAppearance?: CharacterAppearanceMap
): CueVisualState {
  const characterName = cueCharacterName(scene, cue);
  const characterKey = characterAppearanceKey(characterName);
  const sceneCharacterName = normalizeCharacterName(scene.character || scene.cast[0] || "");
  const sceneCharacterKey = characterAppearanceKey(sceneCharacterName);

  let baseIdentity = "";
  if (characterKey && sceneCharacterKey && characterKey === sceneCharacterKey) {
    baseIdentity = scene.identityPrompt?.trim() ?? "";
  } else if (characterKey && sceneCharacterKey && characterKey !== sceneCharacterKey) {
    // Cue character differs from the scene's primary character.
    // Do not leak the scene character's identity prompt.
    const mapKey = appearanceMapKeyFor(characterAppearance, characterName);
    if (mapKey && characterAppearance?.[mapKey]) {
      baseIdentity = characterAppearance[mapKey].trim();
    } else if (scene.continuity?.characters) {
      const match = Object.entries(scene.continuity.characters).find(
        ([name]) => characterAppearanceKey(name) === characterKey
      );
      if (match && match[1]?.appearance) {
        baseIdentity = Object.values(match[1].appearance).filter(Boolean).join(", ");
      }
    }
  } else {
    baseIdentity = scene.identityPrompt?.trim() ?? "";
  }

  if (cue.resolvedIdentity !== undefined) baseIdentity = cue.resolvedIdentity;
  if (cue.imageTemplate) baseIdentity = resolveTemplateIdentity(scene, cue, characterAppearance).identity;
  const attire = cue.resolvedAttire !== undefined ? cue.resolvedAttire ?? "" : cue.attire || (characterKey === sceneCharacterKey ? scene.attire : null) || "";
  let identity = baseIdentity;
  if (attire && identity) {
    identity = applyAttireOverride(identity, attire);
  } else if (attire) {
    identity = attire;
  }

  const characterId = cue.characterId?.trim() || (characterKey === sceneCharacterKey && scene.characterId?.trim()) || characterIdFor(characterName);
  const subjectCategory: SubjectCategory = cue.subjectCategory
    ?? (characterKey === sceneCharacterKey ? scene.subjectCategory : undefined)
    ?? "unknown";
  return { characterName, characterKey, characterId, subjectCategory, baseIdentity, identity, attire };
}

/** Compiled camera block. Fixed for every scene image; kept in one place so the cache key sees the same values. */
const CUE_CAMERA = { framing: "upper body", angle: "eye level", perspective: "straight-on" } as const;

/**
 * Everything the prompt compiler consumed for one cue, plus its output. The
 * scene-image cache keys on this structured description, so it must stay the
 * single source for `compileImagePrompt` / `compileNegativePrompt`.
 */
export type CueDescription = {
  visualState: CueVisualState;
  pose: { id: string; suffix: string };
  actionTag: string | null;
  environment: SceneImageIdentity["environment"];
  framing: SceneImageIdentity["framing"];
  entry: PromptEntry;
  promptSyntax: Config["promptSyntax"];
};

export function describeCue(
  config: VisualNovelConfig,
  scene: SceneState,
  cue: VisualCue,
  characterAppearance?: CharacterAppearanceMap,
  provider?: string | null
): CueDescription {
  const promptSyntax = (config as any).promptSyntax ?? "comfyui";
  const compilerConfig = normalizeConfig({
    promptSyntax,
    promptStyle: "anima",
    supplement: true,
    customPositivePrefix: config.promptPrefix,
    customPositiveSuffix: config.promptSuffix,
    customNegative: config.negativePrompt,
    maxCharacters: 1,
    perspectiveMode: "dynamic",
    originalReference: config.originalReference,
    originalCreationName: config.originalCreationName,
    originalReferenceFormat: provider?.trim().toLowerCase() === "novelai" ? "tags" : "parenthetical"
  });
  const visualState = resolveCueCharacterVisualState(scene, cue, characterAppearance);
  const identity = visualState.identity;
  const [label, situation] = classifySubject(identity, visualState.subjectCategory);
  const pose = poseById(POSE_EXPRESSION_CATALOGUE, cue.poseExpressionId);
  const actionTag = compileActionProp(cue.action);
  const timeWeather = [scene.environment.timeOfDay, scene.environment.weather].filter(Boolean).join(", ");
  const desc = scene.environment.description?.trim();
  const isRedundantDesc = !desc || desc.toLowerCase() === `a quiet ${scene.environment.location.toLowerCase()}.` || desc.toLowerCase() === scene.environment.location.toLowerCase();
  const environment: SceneImageIdentity["environment"] = {
    location: scene.environment.location,
    timeWeather,
    lighting: scene.environment.lighting ?? null,
    description: isRedundantDesc ? null : desc,
    persistentElements: [...scene.environment.persistentElements]
  };
  const entry = assemblePrompt({
    environment: {
      location: [environment.location],
      timeWeather,
      lightingMood: environment.lighting ? [environment.lighting] : [],
      backgroundElements: environment.persistentElements,
      ...(environment.description ? { description: [environment.description] } : {})
    }
  }, {
    paragraph: 1,
    situation,
    camera: { ...CUE_CAMERA, focus: [] },
    characters: [{
      ...(config.originalReference && config.originalCreationName?.trim() && visualState.characterName
        ? { name: visualState.characterName }
        : {}),
      label,
      identity,
      expression: pose.suffix,
      ...(actionTag ? { action: actionTag } : {}),
      visibleTags: identity
    }]
  }, compilerConfig, 1, 1);
  return {
    visualState,
    pose: { id: pose.id, suffix: pose.suffix },
    actionTag: actionTag || null,
    environment,
    framing: { ...CUE_CAMERA },
    entry,
    promptSyntax
  };
}

function compilePromptEntry(
  config: VisualNovelConfig,
  scene: SceneState,
  cue: VisualCue,
  characterAppearance?: CharacterAppearanceMap
): PromptEntry {
  return describeCue(config, scene, cue, characterAppearance).entry;
}

export function cueUsesCharacterReference(cue: VisualCue): boolean {
  return !cue.imageTemplate || cue.imageTemplate.subjectMode === "one" && cue.imageTemplate.referencePolicy === "character";
}

function withoutImageReferences(parameters: Record<string, unknown>): Record<string, unknown> {
  // Explicit empty overrides survive the host's merge with connection defaults.
  const cleared = Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key,
    /(?:reference|(?:resolved|source|input|init)Images?)/i.test(key)
      ? Array.isArray(value) ? [] : typeof value === "string" ? "" : typeof value === "boolean" ? false : typeof value === "number" ? 0 : null
      : value]));
  return { ...cleared, resolvedReferenceImages: [] };
}

export function compileTemplateCue(config: VisualNovelConfig, scene: SceneState, cue: VisualCue, appearances?: CharacterAppearanceMap) {
  if (!cue.imageTemplate) throw new Error("This cue has no image template snapshot.");
  const brief = buildVisualBrief(config, scene, cue, appearances);
  const format = (value: string) => config.imagePromptFormat === "tags" ? value.replace(/;\s*|\n+/g, ", ") : value;
  const compiled = renderImageTemplate(cue.imageTemplate, { style: config.promptPrefix, scene: format(brief.scene), subjects: format(brief.subjects), action: format(brief.action), composition: format(brief.composition), lighting: brief.lighting, suffix: config.promptSuffix, negative: config.negativePrompt });
  if (!compiled.prompt.trim()) throw new Error("The image template produced an empty prompt.");
  return { ...compiled, brief };
}

export function compileImagePrompt(
  config: VisualNovelConfig,
  scene: SceneState,
  cue: VisualCue,
  characterAppearance?: CharacterAppearanceMap,
  syntax?: Config["promptSyntax"],
  provider?: string | null
): string {
  if (cue.imageTemplate) return compileTemplateCue(config, scene, cue, characterAppearance).prompt;
  if (provider === "novelai") return compileNovelAiRequest(config, scene, cue, characterAppearance).prompt;
  const selectedSyntax = syntax ?? (config as any).promptSyntax ?? "comfyui";
  const entry = describeCue(config, scene, cue, characterAppearance, provider ?? (selectedSyntax === "nai" ? "novelai" : null)).entry;
  return renderPrompt(entry.prompt, selectedSyntax);
}

/** One compiled payload is shared by generation and cache identity. */
export function compileNovelAiRequest(config: VisualNovelConfig, scene: SceneState, cue: VisualCue, appearances?: CharacterAppearanceMap) {
  if (cue.imageTemplate) {
    const compiled = compileTemplateCue(config, scene, cue, appearances);
    // The complete self-contained template is the scene caption. Duplicating its
    // subjects into host character captions would silently change that prompt.
    return { prompt: compiled.prompt, negativePrompt: compiled.negativePrompt, parameters: { qualityToggle: false, negativePrompt: compiled.negativePrompt, characterTags: [] as { tags: string }[] } };
  }
  const model = config.imageModel;
  const caps = novelAiCapabilities(model);
  const adjusted = { ...config, promptPrefix: config.promptPrefix === DEFAULT_CONFIG.promptPrefix ? "anime visual novel scene" : config.promptPrefix };
  const entry = describeCue(adjusted, scene, cue, appearances, "novelai").entry;
  const characterSections = caps.structured ? entry.prompt.characterSections ?? [] : [];
  const base = entry.prompt.sections.filter((section) => !characterSections.includes(section));
  const joined = base.join(", ");
  const quality = config.novelAiQualityTags === false ? [] : splitTopLevelCsv(novelAiQualityTags(model))
    .filter((tag) => !splitTopLevelCsv(joined).some((present) => present.trim().toLowerCase() === tag.trim().toLowerCase()));
  const prompt = renderNovelAiEmphasis([...base, ...quality].join(", "), model);
  const negative = config.novelAiUseDefaultNegative !== false && config.negativePrompt === DEFAULT_CONFIG.negativePrompt
    ? NOVELAI_NEGATIVE_DEFAULT : config.negativePrompt;
  const negativePrompt = renderNovelAiEmphasis(negative, model);
  return { prompt, negativePrompt, parameters: {
    qualityToggle: false, // Explicit tags above make additions visible and avoid duplicate host defaults.
    negativePrompt,
    characterTags: characterSections.map((tags) => ({ tags: renderNovelAiEmphasis(tags, model) }))
  } };
}

export function compileNegativePrompt(
  config: VisualNovelConfig,
  scene: SceneState,
  cue: VisualCue,
  characterAppearance?: CharacterAppearanceMap
): string {
  if (cue.imageTemplate) return compileTemplateCue(config, scene, cue, characterAppearance).negativePrompt;
  const entry = compilePromptEntry(config, scene, cue, characterAppearance);
  if (entry.negative) return entry.negative;
  const compilerConfig = normalizeConfig({
    promptSyntax: "comfyui",
    promptStyle: "anima",
    supplement: true,
    customPositivePrefix: config.promptPrefix,
    customPositiveSuffix: config.promptSuffix,
    customNegative: config.negativePrompt,
    maxCharacters: 1,
    perspectiveMode: "dynamic"
  });
  return renderNegativeWithCurrentSelection(entry.shotNegative, entry.prompt.format ?? "ordered", compilerConfig);
}

/** Sort user image parameters deterministically. Internal reference payloads are never part of this map. */
function userImageParameters(config: VisualNovelConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(config.imageParameters).sort()) out[key] = config.imageParameters[key];
  return out;
}

/**
 * Structured exact-compatibility identity for one cue: the effective state
 * the compiler consumed (durable subject, wardrobe, environment incl. lighting,
 * pose, bounded action, framing) AND the exact provider request it produced.
 * `provider` is the resolved image provider id (null when unknown).
 */
/**
 * The reference anchor actually chosen for one cue, carried in the cache key
 * in card mode only (captured-mode default keys keep their exact bytes).
 * "card" pins a fixed sprite (image id + asset name); "captured" is the
 * fallback to a captured portrait (with its image id when one anchors this
 * render); "none" renders unanchored (portrait capture or no identity).
 */
export type SceneImageReference =
  | { source: "card"; imageId: string; assetName?: string }
  | { source: "captured"; imageId?: string }
  | { source: "none" };

export function sceneImageIdentityFor(
  config: VisualNovelConfig,
  scene: SceneState,
  cue: VisualCue,
  characterAppearance: CharacterAppearanceMap | undefined,
  provider: string | null,
  reference?: SceneImageReference,
  profileRevision?: string
): SceneImageIdentity {
  if (cue.imageTemplate) {
    const compiled = compileTemplateCue(config, scene, cue, characterAppearance);
    const brief = compiled.brief;
    const visual = resolveCueCharacterVisualState(scene, cue, characterAppearance);
    const { connectionId, workflowId } = splitConnectionSelection(config.imageConnectionId);
    return {
      imageTemplate: cue.imageTemplate,
      visualBrief: brief,
      subject: brief.subjectMode === "none" ? { characterId: "none", subjectCategory: "none" } : { characterId: visual.characterId, subjectCategory: visual.subjectCategory },
      appearance: { identity: brief.subjects, attire: brief.subjectMode === "none" ? "" : visual.attire },
      environment: { location: scene.environment.location, timeWeather: [scene.environment.timeOfDay, scene.environment.weather].filter(Boolean).join(", "), lighting: scene.environment.lighting, description: scene.environment.description, persistentElements: scene.environment.persistentElements },
      pose: { id: brief.subjectMode === "none" ? "none" : cue.poseExpressionId ?? "idle", suffix: "" },
      action: brief.action || null,
      framing: { framing: brief.framing, angle: "eye level", perspective: "straight-on" },
      request: { prompt: compiled.prompt, negativePrompt: compiled.negativePrompt, provider, connectionId: connectionId ? workflowId ? `${connectionId}::${workflowId}` : connectionId : null, model: config.imageModel, parameters: templateOutputParameters(cue.imageTemplate, provider, userImageParameters(config), {}), promptSyntax: config.imagePromptFormat, ...(profileRevision ? { profileRevision } : {}),
        referenceAnchoring: referenceAnchoringEnabled(config) && cueUsesCharacterReference(cue),
        ...(referenceAnchoringEnabled(config) && cueUsesCharacterReference(cue) ? { reference: reference ?? { source: "none" as const }, ...(config.referenceSource === "card" ? { referenceSource: "card" as const } : {}) } : {}) }
    };
  }
  const description = describeCue(config, scene, cue, characterAppearance, provider);
  const nai = provider === "novelai" ? compileNovelAiRequest(config, scene, cue, characterAppearance) : null;
  const { connectionId, workflowId } = splitConnectionSelection(config.imageConnectionId);
  return {
    subject: {
      characterId: description.visualState.characterId,
      subjectCategory: description.visualState.subjectCategory
    },
    appearance: {
      identity: description.visualState.identity,
      attire: description.visualState.attire
    },
    environment: description.environment,
    pose: description.pose,
    action: description.actionTag,
    framing: description.framing,
    request: {
      prompt: nai?.prompt ?? renderPrompt(description.entry.prompt, description.promptSyntax),
      negativePrompt: nai?.negativePrompt ?? compileNegativePrompt(config, scene, cue, characterAppearance),
      provider,
      connectionId: connectionId ? (workflowId ? `${connectionId}::${workflowId}` : connectionId) : null,
      model: config.imageModel,
      parameters: { ...userImageParameters(config), ...(nai?.parameters ?? {}) },
      promptSyntax: nai ? "nai" : description.promptSyntax,
      referenceAnchoring: referenceAnchoringEnabled(config),
      // Only present in card mode, so default ("captured") cache keys keep
      // their exact bytes. Card mode also carries the actually chosen
      // reference, so different sprites - and anchored vs fallback renders -
      // never share entries.
      ...(referenceAnchoringEnabled(config) && config.referenceSource === "card"
        ? { referenceSource: "card" as const, reference: reference ?? ({ source: "none" } as SceneImageReference) }
        : {})
    }
  };
}

/** Provider key used by cache-resolved (reuse-only) jobs. They never touch the scheduler. */
export const CACHE_JOB_PROVIDER = "cache";

export type SceneImageVerifier = (imageId: string) => Promise<boolean>;

/**
 * Default verifier: the image must still exist in Lumiverse. When the host
 * does not expose `images.get`, the asset is unverifiable and treated as
 * missing (normal generation runs instead).
 */
export function defaultSceneImageVerifier(spindle: SpindleAPI, userId?: string): SceneImageVerifier {
  return async (imageId) => {
    const api = (spindle as { images?: { get?: (id: string, userId?: string) => Promise<unknown> } }).images;
    if (!api || typeof api.get !== "function") throw new Error("images.get unavailable");
    return Boolean(await api.get(imageId, userId));
  };
}

export type SceneCacheOptions = {
  /** Reviewed pictures remain independent and never populate the automatic compiler cache. */
  independentRequests?: boolean;
  disableCacheStore?: boolean;
  beforeGenerate?: (job: AssetJob, request: ImageGenerationRequest, metadata: ImagePreparationMetadata, signal: AbortSignal) => Promise<ImageGenerationRequest>;
  /** Exact content used to plan this turn; omitted for legacy records. */
  resolvedSourceText?: string;
  sceneCache?: SceneImageCache | null;
  /** Token minted when the batch was admitted; defaults to a token minted at call time. */
  admission?: SceneImageAdmission;
  /** Jobs that must skip lookup (forced regeneration). They still claim and store. */
  bypassJobIds?: Iterable<string>;
  verifyImage?: SceneImageVerifier;
};

/**
 * Keep only the physical scene episodes this plan can reach. Call whenever a
 * plan is accepted for a chat (planning, retry, batch start). Idempotent.
 */
export function retainPlanEpisodes(cache: SceneImageCache, scope: string, plan: TurnPlan): number {
  return cache.retainEpisodes(scope, plan.scenes.map((scene) => sceneEpisodeOf(scene, cache.generation(scope))));
}

/**
 * Fail closed on identity: the cache only serves cues whose durable identity
 * was persisted by the planner (registry id, resolved appearance, subject
 * class). Legacy or unresolved cues always take normal generation.
 */
export function cacheEligibleCue(cue: VisualCue): boolean {
  if (cue.imageTemplate?.subjectMode === "none") return true;
  return Boolean(cue.characterId?.trim()) && Boolean(cue.resolvedIdentity?.trim()) && cue.subjectCategory !== undefined;
}

/** Resolve the image provider once per batch; null when unknown. */
export async function resolveSceneImageProvider(spindle: SpindleAPI, config: VisualNovelConfig, userId?: string): Promise<string | null> {
  return resolveImageProviderId(spindle, config, userId);
}

/**
 * Deterministic cache lookup for the plan's reuse-only candidates
 * (`plan.cacheCues`, the cues beyond `maxImagesPerTurn`). A hit becomes a
 * terminal `generated` job with provider `cache`; a miss produces nothing: no
 * job, no provider request, no budget change. Candidates that already have a
 * job (any status) are skipped. Never throws.
 */
export async function resolveCacheCues(
  spindle: SpindleAPI,
  plan: TurnPlan,
  config: VisualNovelConfig,
  characterAppearance: CharacterAppearanceMap | undefined,
  existingJobs: readonly AssetJob[],
  cache: SceneImageCache,
  userId?: string,
  options: { resolvedSourceText?: string; provider?: string | null; verifyImage?: SceneImageVerifier; log?: (line: string) => void; includeBudgeted?: boolean } = {}
): Promise<AssetJob[]> {
  const candidates = options.includeBudgeted || (plan.classifierVisuals && config.systemOneMode === "on")
    ? [...plan.visualCues, ...(plan.cacheCues ?? [])]
    : plan.cacheCues ?? [];
  if (candidates.length === 0) return [];
  const scope = sceneImageScope(userId, plan.key.chatId);
  const haveJob = new Set(existingJobs.map((job) => job.jobId));
  const pending = candidates.filter((cue) => !haveJob.has(cue.assetJobId));
  if (pending.length === 0) return [];
  const profile = await resolveImageProfile(spindle, config, userId);
  const provider = options.provider !== undefined ? options.provider : profile.provider;
  if (provider === "novelai") config = { ...config, imageModel: config.imageModel || profile.model || "nai-diffusion-4-5-full" };
  const verify = options.verifyImage ?? defaultSceneImageVerifier(spindle, userId);
  const log = options.log ?? (() => {});
  // Card mode keys carry the chosen reference, so candidates resolve it the
  // same way the budgeted path does (stored portraits + one context lookup).
  const referenceSource = pending.some(cueUsesCharacterReference) && referenceAnchoringEnabled(config) && provider !== null && REFERENCE_PROVIDERS.has(provider);
  const cardSource = referenceSource && config.referenceSource === "card";
  let candidatePortraits: Record<string, StoredPortrait> = {};
  let candidateResolutions: Map<string, CardAssetResolution> | null = null;
  if (referenceSource) {
    try {
      const [loaded, ctx] = await Promise.all([
        loadPortraits(spindle, plan.key.chatId, userId).catch(() => ({} as Record<string, StoredPortrait>)),
        cardSource ? loadCardReferenceContext(spindle, plan, userId, options).catch(() => null) : Promise.resolve(null)
      ]);
      candidatePortraits = loaded;
      candidateResolutions = ctx?.resolutions ?? null;
    } catch {
      candidatePortraits = {};
      candidateResolutions = null;
    }
  }
  const resolved: AssetJob[] = [];
  for (const cue of pending) {
    let scene: SceneState;
    try {
      scene = sceneForCue(plan, cue);
    } catch {
      continue;
    }
    if (!cacheEligibleCue(cue)) {
      cache.recordMiss("identity_unresolved");
      log(`scene-cache candidate p${cue.paragraphIndex} miss reason=identity_unresolved (no job, no request)`);
      continue;
    }
    let key: string;
    try {
      let reference: SceneImageReference | undefined;
      if (cardSource && cueUsesCharacterReference(cue)) {
        const visualState = resolveCueCharacterVisualState(scene, cue, characterAppearance);
        const cardPortrait = visualState.characterKey
          ? cardPortraitFor(candidatePortraits, visualState.characterKey)
          : undefined;
        // A candidate whose sprite is not stored yet will fetch it on the
        // budgeted path, so key it by the resolution (same image id + asset).
        const pendingResolution = visualState.characterKey
          ? candidateResolutions?.get(visualState.characterKey)
          : undefined;
        const pendingAsPortrait: StoredPortrait | undefined = !cardPortrait && pendingResolution
          ? {
              name: visualState.characterName,
              imageId: pendingResolution.imageId,
              data: "",
              mimeType: "image/png",
              createdAt: new Date().toISOString(),
              source: "card",
              ...(pendingResolution.assetName ? { assetName: pendingResolution.assetName } : {})
            }
          : undefined;
        const fingerprint = portraitIdentityFingerprint(visualState.characterName, visualState.baseIdentity, config, provider);
        const captured = !cardPortrait && !pendingAsPortrait && visualState.characterKey
          ? compatiblePortrait(candidatePortraits[visualState.characterKey], fingerprint)
          : undefined;
        reference = cardReferenceForCache(cardPortrait ?? pendingAsPortrait, captured);
      }
      if (!cardSource && referenceSource && cue.imageTemplate && cueUsesCharacterReference(cue)) {
        const visual = resolveCueCharacterVisualState(scene, cue, characterAppearance);
        const captured = compatiblePortrait(candidatePortraits[visual.characterKey], portraitIdentityFingerprint(visual.characterName, visual.baseIdentity, config, provider));
        reference = captured ? { source: "captured", imageId: captured.imageId } : { source: "none" };
      }
      key = sceneImageCacheKey(sceneImageIdentityFor(config, scene, cue, characterAppearance, provider, reference, profile.cacheProfile));
    } catch {
      continue;
    }
    const episode = sceneEpisodeOf(scene, cache.generation(scope));
    const found = cache.lookup(scope, key, episode);
    if (found.status === "miss") {
      log(`scene-cache candidate p${cue.paragraphIndex} miss reason=${found.reason} key=${shortSceneKey(key)} (no job, no request)`);
      continue;
    }
    const verdict = await verifyEntry(cache, scope, key, found.entry, verify);
    if (verdict !== "ok") {
      log(`scene-cache candidate p${cue.paragraphIndex} miss reason=${verdict} image=${found.entry.imageId} (no job, no request)`);
      continue;
    }
    const timestamp = new Date().toISOString();
    const job = AssetJobSchema.parse({
      jobId: cue.assetJobId,
      ownerTurnKey: plan.key,
      sceneId: cue.sceneId,
      sceneRevision: cue.sceneRevision,
      paragraphIndex: cue.paragraphIndex,
      promptFingerprint: key,
      provider: CACHE_JOB_PROVIDER,
      priority: "background",
      status: "generated",
      imageId: found.entry.imageId,
      imageUrl: found.entry.imageUrl,
      error: null,
      queuedAt: timestamp,
      startedAt: timestamp,
      generatedAt: timestamp,
      readyAt: null,
      finishedAt: null
    });
    log(`scene-cache candidate p${cue.paragraphIndex} hit key=${shortSceneKey(key)} image=${found.entry.imageId} from message=${found.entry.provenance.assistantMessageId} -> extra swap without a request`);
    resolved.push(job);
  }
  return resolved;
}

/** Confirm a hit still points at a real asset; otherwise retire it. */
async function verifyEntry(
  cache: SceneImageCache,
  scope: string,
  key: string,
  entry: SceneImageCacheEntry,
  verify: SceneImageVerifier
): Promise<"ok" | Extract<SceneImageMissReason, "asset_missing" | "asset_unverifiable">> {
  let reason: "asset_missing" | "asset_unverifiable";
  try {
    if (await verify(entry.imageId)) return "ok";
    reason = "asset_missing";
  } catch {
    reason = "asset_unverifiable";
  }
  cache.revokeHit();
  cache.invalidate(scope, key, reason);
  cache.recordMiss(reason);
  return reason;
}

export function createAssetJobs(
  plan: TurnPlan,
  config: VisualNovelConfig,
  characterAppearance?: CharacterAppearanceMap
): AssetJob[] {
  const now = new Date().toISOString();
  return plan.visualCues.map((cue, index) => {
    const scene = sceneForCue(plan, cue);
    const pose = poseById(POSE_EXPRESSION_CATALOGUE, cue.poseExpressionId);
    const promptIdentity = `${compileImagePrompt(config, scene, cue, characterAppearance)}\0${pose.id}`;
    return AssetJobSchema.parse({
      jobId: cue.assetJobId,
      ownerTurnKey: plan.key,
      sceneId: cue.sceneId,
      sceneRevision: cue.sceneRevision,
      paragraphIndex: cue.paragraphIndex,
      promptFingerprint: `${hash(promptIdentity)}${hash(promptIdentity.split("").reverse().join(""))}`,
      provider: "pending",
      priority: index === 0 ? "visible" : index === 1 ? "next" : "background",
      status: "queued",
      imageId: null,
      imageUrl: null,
      error: null,
      queuedAt: now,
      startedAt: null,
      generatedAt: null,
      readyAt: null,
      finishedAt: null
    });
  });
}

function replaceJob(jobs: AssetJob[], next: AssetJob): AssetJob[] {
  return jobs.map((job) => job.jobId === next.jobId ? next : job);
}

/** Allocate classifier turns after cache lookup. Only distinct misses spend slots. */
export async function prepareAssetJobs(
  spindle: SpindleAPI,
  plan: TurnPlan,
  config: VisualNovelConfig,
  characterAppearance: CharacterAppearanceMap | undefined,
  cache: SceneImageCache,
  userId?: string,
  options: Pick<SceneCacheOptions, "resolvedSourceText" | "verifyImage"> = {}
): Promise<AssetJob[]> {
  const candidates = createAssetJobs(plan, config, characterAppearance);
  if (!plan.classifierVisuals || config.systemOneMode !== "on") return candidates;
  const scope = sceneImageScope(userId, plan.key.chatId);
  retainPlanEpisodes(cache, scope, plan);
  const profile = await resolveImageProfile(spindle, config, userId);
  const provider = profile.provider;
  if (provider === "novelai") config = { ...config, imageModel: config.imageModel || profile.model || "nai-diffusion-4-5-full" };
  let warm = await resolveCacheCues(spindle, plan, config, characterAppearance, [], cache, userId, { ...options, provider });
  // Preserve the normal path's requirement to acquire a missing reference portrait.
  if (referenceAnchoringEnabled(config) && provider && REFERENCE_PROVIDERS.has(provider)) {
    const portraits = await loadPortraits(spindle, plan.key.chatId, userId).catch(() => ({} as Record<string, StoredPortrait>));
    warm = warm.filter((job) => {
      const cue = plan.visualCues.find((cue) => cue.assetJobId === job.jobId);
      if (!cue) return false;
      if (!cueUsesCharacterReference(cue)) return true;
      const state = resolveCueCharacterVisualState(sceneForCue(plan, cue), cue, characterAppearance);
      return Boolean(config.referenceSource === "card" && cardPortraitFor(portraits, state.characterKey))
        || Boolean(compatiblePortrait(portraits[state.characterKey], portraitIdentityFingerprint(state.characterName, state.baseIdentity, config, provider)));
    });
  }
  const warmById = new Map(warm.map((job) => [job.jobId, job]));
  const selected: AssetJob[] = [];
  const missingKeys = new Set<string>();
  const limit = config.maxImagesPerTurn > 0 ? config.maxImagesPerTurn : Infinity;
  for (const job of candidates) {
    const hit = warmById.get(job.jobId);
    if (hit) { selected.push(hit); continue; }
    const cue = plan.visualCues.find((cue) => cue.assetJobId === job.jobId)!;
    const scene = sceneForCue(plan, cue);
    const key = cacheEligibleCue(cue)
      ? `${sceneEpisodeOf(scene, cache.generation(scope))}:${sceneImageCacheKey(sceneImageIdentityFor(config, scene, cue, characterAppearance, provider, undefined, profile.cacheProfile))}`
      : job.jobId;
    if (missingKeys.has(key) || missingKeys.size >= limit) continue;
    missingKeys.add(key);
    selected.push(job);
  }
  return selected;
}

function abortError(signal: AbortSignal): Error {
  const error = new Error(typeof signal.reason === "string" ? signal.reason : "Image generation cancelled.");
  error.name = "AbortError";
  return error;
}

const REFERENCE_PROVIDERS = new Set(["novelai", "comfyui", "swarmui"]);

/** Whether reference anchoring is enabled for this config (default on). */
export function referenceAnchoringEnabled(config: VisualNovelConfig): boolean {
  return config.referenceAnchoring !== false && config.imageParameters.referenceAnchoring !== false;
}

/** The character a cue depicts, used as the portrait lookup key. */
export function cueCharacterName(scene: SceneState, cue: VisualCue): string {
  return normalizeCharacterName(cue.character || scene.character || scene.cast[0] || "");
}

/** Provider-specific reference parameters for one generation. */
export function referenceParametersFor(
  provider: string | null,
  portrait: Pick<StoredPortrait, "data" | "mimeType">,
  config: VisualNovelConfig
): Record<string, unknown> {
  if (!provider || !REFERENCE_PROVIDERS.has(provider)) return {};
  if (provider === "novelai") {
    const raw = Number(config.imageParameters.referenceStrength);
    const strength = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.6;
    return {
      resolvedReferenceImages: [{
        data: portrait.data,
        strength,
        infoExtracted: 1,
        refType: "character"
      }]
    };
  }
  if (provider === "comfyui") {
    const raw = Number(config.imageParameters.referenceStrength);
    const strength = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.7;
    return {
      resolvedSourceImages: [{ data: portrait.data, mimeType: portrait.mimeType }],
      ...(config.imageParameters.denoise !== undefined ? {} : { denoise: strength })
    };
  }
  return {
    resolvedSourceImages: [{ data: portrait.data, mimeType: portrait.mimeType }]
  };
}

/** Parse a base64 data URL into raw base64 bytes and a MIME type. */
export function parseDataUrl(dataUrl: string | undefined): { data: string; mimeType: string } | null {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1]!.toLowerCase();
  const data = match[2]!;
  if (!VALID_IMAGE_MIMES.has(mimeType)) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  return { mimeType, data };
}

/**
 * Split a settings connection id into the real connection profile id and an
 * optional ComfyUI workflow id. The settings catalog exposes per-workflow
 * entries as compound `<connectionId>::<workflowId>` ids.
 */
export function splitConnectionSelection(raw: string | null): { connectionId?: string; workflowId?: string } {
  if (!raw) return {};
  const separator = raw.indexOf("::");
  if (separator === -1) return { connectionId: raw };
  return { connectionId: raw.slice(0, separator), workflowId: raw.slice(separator + 2) };
}

async function resolveImageProviderId(
  spindle: SpindleAPI,
  config: VisualNovelConfig,
  userId?: string
): Promise<string | null> {
  return (await resolveImageProfile(spindle, config, userId)).provider;
}

function profileCacheIdentity(profile: { id?: string; provider?: string; model?: string; updated_at?: number; default_parameters?: Record<string, unknown> } | null | undefined): string {
  return canonicalJson([profile?.id, profile?.provider, profile?.model, profile?.updated_at, profile?.default_parameters ?? {}]);
}

async function resolveImageProfile(spindle: SpindleAPI, config: VisualNovelConfig, userId?: string): Promise<{ provider: string | null; model: string | null; cacheProfile: string }> {
  try {
    const { connectionId } = splitConnectionSelection(config.imageConnectionId);
    if (connectionId) {
      const connection = await spindle.imageGen.getConnection(connectionId, userId);
      return { provider: connection?.provider?.trim().toLowerCase() ?? null, model: connection?.model ?? null, cacheProfile: profileCacheIdentity(connection) };
    }
    const connections = await spindle.imageGen.listConnections(userId);
    const chosen = connections.find((candidate) => candidate.is_default) ?? connections[0];
    return { provider: chosen?.provider?.trim().toLowerCase() ?? null, model: chosen?.model ?? null, cacheProfile: profileCacheIdentity(chosen) };
  } catch {
    return { provider: null, model: null, cacheProfile: "unavailable" };
  }
}

export async function generateAssets(
  spindle: SpindleAPI,
  plan: TurnPlan,
  initialJobs: AssetJob[],
  config: VisualNovelConfig,
  signal: AbortSignal,
  onUpdate: AssetUpdateHandler,
  userId?: string,
  cacheOptions: SceneCacheOptions = {}
): Promise<AssetJob[]> {
  let jobs = [...initialJobs];
  const providerKey = `image:${config.imageConnectionId ?? "default"}`;
  const scheduler = new AssetScheduler({ [providerKey]: { concurrency: config.imageConcurrency } });
  const cache = cacheOptions.sceneCache ?? null;
  // Provider detection also selects creation-reference formatting, even when
  // caching and image-reference anchoring are both disabled.
  const profile = await resolveImageProfile(spindle, config, userId);
  const provider = profile.provider;
  if (provider === "novelai") config = { ...config, imageModel: config.imageModel || profile.model || "nai-diffusion-4-5-full" };
  const anchorable = plan.visualCues.some(cueUsesCharacterReference) && referenceAnchoringEnabled(config) && provider !== null && REFERENCE_PROVIDERS.has(provider);
  const cardSource = anchorable && config.referenceSource === "card";

  const [initialPortraits, characterAppearance] = await Promise.all([
    anchorable ? loadPortraits(spindle, plan.key.chatId, userId).catch(() => ({} as Record<string, StoredPortrait>)) : Promise.resolve({} as Record<string, StoredPortrait>),
    loadCharacterAppearance(spindle, userId, plan.key.chatId).catch(() => ({} as CharacterAppearanceMap))
  ]);
  const portraits: Record<string, StoredPortrait> = { ...initialPortraits };

  if (config.debugLogging) {
    const portraitNames = Object.values(portraits).map((entry) => entry.name).join(", ");
    spindle.log.info(`[VN] reference anchoring ${anchorable ? `active (provider=${provider})` : referenceAnchoringEnabled(config) ? `inactive (provider=${provider ?? "unknown"} unsupported)` : "disabled by config"}; ${Object.keys(portraits).length} portrait(s)${portraitNames ? ` [${portraitNames}]` : ""}`);
  }

  /* ---- referenceSource "card": one fixed card asset per character ---- */
  // Resolution happens once per batch; the per-character relay fetch happens
  // at most once per chat (the stored portrait is the lock). Any failure in
  // here degrades to the captured path and never blocks the batch.
  const cardContext: CardReferenceContext | null = cardSource
    ? await loadCardReferenceContext(spindle, plan, userId, cacheOptions).catch(() => null)
    : null;
  const cardFetchPromises = new Map<string, Promise<StoredPortrait | null>>();
  // Test escape hatch mirroring `referenceStrength`: not a provider parameter.
  const rawFetchTimeout = Number(config.imageParameters.referenceFetchTimeoutMs);
  const cardFetchTimeoutMs = Number.isFinite(rawFetchTimeout) && rawFetchTimeout > 0 ? rawFetchTimeout : undefined;
  const acquireCardPortrait = (characterName: string, characterKey: string, resolution: CardAssetResolution): Promise<StoredPortrait | null> => {
    const existing = cardFetchPromises.get(characterKey);
    if (existing) return existing;
    const pending = (async (): Promise<StoredPortrait | null> => {
      if (signal.aborted) return null;
      const dataUrl = await fetchReferenceImageViaFrontend(spindle, {
        chatId: plan.key.chatId,
        imageId: resolution.imageId,
        characterKey,
        ...(userId ? { userId } : {}),
        ...(cardFetchTimeoutMs !== undefined ? { timeoutMs: cardFetchTimeoutMs } : {}),
        signal
      });
      // Drop replies after cancellation. Once a storage write has started,
      // cancellation cannot undo that write; the provider boundary checks again.
      if (signal.aborted) return null;
      const parsed = parseDataUrl(dataUrl ?? undefined);
      if (!parsed || Math.floor(parsed.data.length * 3 / 4) > REFERENCE_IMAGE_MAX_BYTES) {
        // Never log the data URL itself; base64 stays out of the logs.
        if (config.debugLogging) spindle.log.info(`[VN] card reference for "${characterName}" unavailable (${dataUrl === null ? "relay timeout or error" : parsed ? "payload too large" : "invalid data URL"}) — using the captured path`);
        return null;
      }
      const stored: StoredPortrait = {
        name: characterName,
        imageId: resolution.imageId,
        data: parsed.data,
        mimeType: parsed.mimeType,
        createdAt: new Date().toISOString(),
        source: "card",
        ...(resolution.assetName ? { assetName: resolution.assetName } : {})
      };
      if (signal.aborted) return null;
      try {
        if (await savePortrait(spindle, plan.key.chatId, stored, userId, { key: cardPortraitKey(characterKey) })) {
          portraits[cardPortraitKey(characterKey)] = stored;
          if (config.debugLogging) spindle.log.info(`[VN] card reference locked for "${characterName}" -> ${resolution.assetName || "card avatar"} (${stored.imageId}, ${stored.mimeType}, ${stored.data.length} base64 chars)`);
        } else {
          const refreshed = await loadPortraits(spindle, plan.key.chatId, userId);
          const winner = cardPortraitFor(refreshed, characterKey);
          if (winner) {
            portraits[cardPortraitKey(characterKey)] = winner;
            return winner;
          }
        }
      } catch {
        // Non-fatal: the in-memory portrait still anchors this batch.
      }
      return stored;
    })();
    cardFetchPromises.set(characterKey, pending);
    return pending;
  };

  /* ---- scene-image cache (temporary, reuse-first, generate-on-miss) ---- */
  const scope = sceneImageScope(userId, plan.key.chatId);
  const admission = cache ? (cacheOptions.admission ?? cache.admission(scope)) : null;
  const bypass = new Set(cacheOptions.bypassJobIds ?? []);
  const verify = cacheOptions.verifyImage ?? defaultSceneImageVerifier(spindle, userId);
  const cacheLog = (line: string): void => {
    if (config.debugLogging) spindle.log.info(`[VN] ${line}`);
  };
  const observedGenerationMs: number[] = [];
  const estimateSavedMs = (): string => {
    if (observedGenerationMs.length === 0) return "unknown (no provider timing observed in this batch yet)";
    const mean = observedGenerationMs.reduce((sum, value) => sum + value, 0) / observedGenerationMs.length;
    return `~${Math.round(mean)}ms, estimate = mean of ${observedGenerationMs.length} provider call(s) in this batch`;
  };
  if (cache) {
    const retired = retainPlanEpisodes(cache, scope, plan);
    if (retired > 0) cacheLog(`scene-cache retired ${retired} entr${retired === 1 ? "y" : "ies"} from earlier physical scenes (episodes now ${plan.scenes.map((scene) => sceneEpisodeOf(scene, cache.generation(scope))).join(",")})`);
    cacheLog(`scene-cache batch admitted scope=${scope} epoch=${admission!.epoch} entries=${cache.size} bypass=${bypass.size}`);
  }
  const provenanceFor = (jobId: string, promptFingerprint: string): SceneImageProvenance => {
    const { connectionId, workflowId } = splitConnectionSelection(config.imageConnectionId);
    return {
      provider,
      connectionId: connectionId ? (workflowId ? `${connectionId}::${workflowId}` : connectionId) : null,
      model: config.imageModel,
      promptFingerprint,
      assistantMessageId: plan.key.assistantMessageId,
      swipeId: plan.key.swipeId,
      jobId
    };
  };
  const stillAdmitted = (): boolean => Boolean(cache && admission && cache.isAdmitted(admission) && !signal.aborted);
  /** After a budgeted store, reuse-only candidates may now hit. Deterministic, no requests. */
  let resolvingCandidates: Promise<void> = Promise.resolve();
  const resolveCandidatesNow = (): Promise<void> => {
    if (!cache || (!plan.cacheCues?.length && !plan.classifierVisuals)) return Promise.resolve();
    resolvingCandidates = resolvingCandidates.then(async () => {
      if (!stillAdmitted()) return;
      const extra = await resolveCacheCues(spindle, plan, config, characterAppearance, jobs, cache, userId, { ...cacheOptions, provider, verifyImage: verify, log: cacheLog });
      if (!stillAdmitted()) return;
      for (const job of extra) {
        if (jobs.some((existing) => existing.jobId === job.jobId)) continue;
        jobs = [...jobs, job];
        await onUpdate(jobs, job);
      }
    }).catch(() => undefined);
    return resolvingCandidates;
  };

  const capturePromises = new Map<string, Promise<StoredPortrait | null>>();
  const ownedJobIds = new Set(initialJobs.map((job) => job.jobId));
  const unsubscribe = scheduler.subscribe((changed) => {
    if (!ownedJobIds.has(changed.jobId)) return;
    jobs = replaceJob(jobs, changed);
    void onUpdate(jobs, changed);
  });
  const abort = (): void => {
    scheduler.cancelTurn((job) => ownedJobIds.has(job.jobId), typeof signal.reason === "string" ? signal.reason : undefined);
  };
  signal.addEventListener("abort", abort, { once: true });

  try {
    if (cache && (plan.cacheCues?.length || plan.classifierVisuals)) await resolveCandidatesNow();
    const scheduledCues = plan.classifierVisuals
      ? plan.visualCues.filter((cue) => initialJobs.some((job) => job.jobId === cue.assetJobId))
      : plan.visualCues;
    const promises = scheduledCues.map((cue) => {
      const existing = initialJobs.find((job) => job.jobId === cue.assetJobId);
      if (!existing) throw new Error(`Missing asset job ${cue.assetJobId}.`);
      // A retry keeps finished images: such jobs are preserved as-is and never
      // re-scheduled (the scheduler only accepts queued jobs).
      if (existing.status === "generated" || existing.status === "browser_ready") return Promise.resolve(existing);
      const job = AssetJobSchema.parse({ ...existing, provider: providerKey });
      return scheduler.schedule(job, async (scheduledJob, jobSignal) => {
        if (signal.aborted) throw abortError(signal);
        const scene = sceneForCue(plan, cue);
        const visualState = resolveCueCharacterVisualState(scene, cue, characterAppearance);
        const canAnchor = anchorable && cueUsesCharacterReference(cue);
        if (cue.imageTemplate?.subjectMode !== "none" && cue.resolvedIdentity !== undefined && !cue.resolvedIdentity.trim()) throw new Error(`No usable appearance was resolved for "${visualState.characterName}". Replan this turn with a character description; the previous character will not be substituted.`);
        const prompt = compileImagePrompt(config, scene, cue, characterAppearance, undefined, provider);
        const nai = provider === "novelai" ? compileNovelAiRequest(config, scene, cue, characterAppearance) : null;
        const negativePrompt = nai?.negativePrompt ?? compileNegativePrompt(config, scene, cue, characterAppearance);
        const characterName = visualState.characterName;
        const characterKey = visualState.characterKey;

        /* ---- card sprite reference first (referenceSource "card") ---- */
        // The stored card portrait is the per-chat lock; the relay fetch runs
        // at most once per character per batch and times out into the
        // captured path below.
        let cardPortrait: StoredPortrait | undefined;
        if (cardSource && canAnchor && characterKey) {
          cardPortrait = cardPortraitFor(portraits, characterKey);
          if (!cardPortrait) {
            const resolution = cardContext?.resolutions.get(characterKey);
            if (resolution) cardPortrait = (await acquireCardPortrait(characterName, characterKey, resolution)) ?? undefined;
          }
        }

        /* ---- reference anchoring decision first: unchanged, and it gates reuse ---- */
        // If another render is currently capturing this character, wait for it before proceeding.
        // Dependent renders wait; unrelated characters stay concurrent.
        if (!cardPortrait && canAnchor && characterKey && capturePromises.has(characterKey)) {
          try {
            await capturePromises.get(characterKey);
          } catch {
            // Predecessor capture failure is handled gracefully below
          }
        }

        const identityFingerprint = portraitIdentityFingerprint(characterName, visualState.baseIdentity, config, provider);
        let portrait = cardPortrait ?? (canAnchor && characterKey ? compatiblePortrait(portraits[characterKey], identityFingerprint) : undefined);
        let isCaptureOwner = false;
        let captureResolve: ((val: StoredPortrait | null) => void) | undefined;

        let wantsCapture = canAnchor && Boolean(characterKey) && Boolean(identityFingerprint) && !portrait && !capturePromises.has(characterKey);
        if (wantsCapture) {
          isCaptureOwner = true;
          const promise = new Promise<StoredPortrait | null>((resolve) => {
            captureResolve = resolve;
          });
          capturePromises.set(characterKey, promise);
        }

        /* ---- reuse-first: exact-compatible cached image, or own the generation ---- */
        let cacheKey: string | null = null;
        let episode = "";
        let settle: ((outcome: SceneImageOutcome) => void) | null = null;
        if (cache && admission) {
          if (!cacheEligibleCue(cue)) {
            cache.recordMiss("identity_unresolved");
            cacheLog(`scene-cache p${cue.paragraphIndex} miss reason=identity_unresolved (planner did not persist a durable identity) -> generating`);
          } else {
            cacheKey = sceneImageCacheKey(sceneImageIdentityFor(
              config, scene, cue, characterAppearance, provider,
              cardSource ? cardReferenceForCache(cardPortrait, portrait) : cue.imageTemplate ? portrait ? { source: "captured", imageId: portrait.imageId } : { source: "none" } : undefined,
              profile.cacheProfile
            ));
            episode = sceneEpisodeOf(scene, cache.generation(scope));
            if (bypass.has(scheduledJob.jobId)) {
              cache.recordMiss("bypass");
              cacheLog(`scene-cache p${cue.paragraphIndex} miss reason=bypass (forced regeneration) key=${shortSceneKey(cacheKey)} -> generating`);
            } else if (wantsCapture) {
              // Reference anchoring needs this render to capture the character's
              // portrait. Reuse would skip that capture, so the cache stands aside
              // (the render is still owned and stored for later cues).
              cache.recordMiss("portrait_capture");
              cacheLog(`scene-cache p${cue.paragraphIndex} miss reason=portrait_capture (portrait for "${characterName}" must be captured by this render) key=${shortSceneKey(cacheKey)} -> generating`);
            } else {
              // Loop: a hit may turn out to point at a deleted asset, and a
              // waiter may be released by an aborted owner; both re-enter here.
              for (;;) {
                if (signal.aborted) throw abortError(signal);
                if (jobSignal.aborted) throw abortError(jobSignal);
                const found = cache.lookup(scope, cacheKey, episode);
                if (found.status === "hit") {
                  const verdict = await verifyEntry(cache, scope, cacheKey, found.entry, verify);
                  if (verdict === "ok") {
                    cacheLog(`scene-cache p${cue.paragraphIndex} hit key=${shortSceneKey(cacheKey)} image=${found.entry.imageId} from message=${found.entry.provenance.assistantMessageId} job=${found.entry.provenance.jobId} -> generation avoided (saved: ${estimateSavedMs()})`);
                    return { imageId: found.entry.imageId, imageUrl: found.entry.imageUrl };
                  }
                  cacheLog(`scene-cache p${cue.paragraphIndex} miss reason=${verdict} image=${found.entry.imageId} -> generating`);
                } else {
                  cacheLog(`scene-cache p${cue.paragraphIndex} miss reason=${found.reason} key=${shortSceneKey(cacheKey)}`);
                }
                const claim = cache.claim(scope, cacheKey, jobSignal);
                if (claim.role === "owner") {
                  settle = claim.settle;
                  cacheLog(`scene-cache p${cue.paragraphIndex} owns generation key=${shortSceneKey(cacheKey)}`);
                  break;
                }
                const waitStarted = Date.now();
                cacheLog(`scene-cache p${cue.paragraphIndex} waiting for in-flight compatible generation key=${shortSceneKey(cacheKey)}`);
                const outcome = await claim.promise;
                const waitedMs = Date.now() - waitStarted;
                if (outcome.kind === "entry") {
                  cacheLog(`scene-cache p${cue.paragraphIndex} shared in-flight result image=${outcome.entry.imageId} after ${waitedMs}ms wait -> generation avoided`);
                  cache.recordHitShared();
                  return { imageId: outcome.entry.imageId, imageUrl: outcome.entry.imageUrl };
                }
                if (outcome.kind === "failed") {
                  cacheLog(`scene-cache p${cue.paragraphIndex} in-flight owner failed after ${waitedMs}ms wait -> failing once, no retry cascade`);
                  throw outcome.error instanceof Error ? outcome.error : new Error(String(outcome.error));
                }
                if (!cache.isAdmitted(admission)) {
                  const stale = new Error("Scene changed while waiting for a compatible image.");
                  stale.name = "AbortError";
                  throw stale;
                }
                cacheLog(`scene-cache p${cue.paragraphIndex} in-flight owner ${outcome.kind} after ${waitedMs}ms wait -> re-claiming`);
              }
            }
          }
        }

        let generationSettled = false;
        try {
          if (config.debugLogging && anchorable) {
            spindle.log.info(`[VN] cue p${cue.paragraphIndex}: ${portrait ? `anchored to portrait ${portrait.imageId} (${portrait.name})` : wantsCapture ? `no portrait for "${characterName}" yet — capturing this render` : `unanchored (character="${characterName}")`}`);
          }
          const parameters = portrait && provider
            ? { ...config.imageParameters, ...referenceParametersFor(provider, portrait, config) }
            : {
                ...config.imageParameters,
                ...(provider === "comfyui" && config.imageParameters.denoise === undefined ? { denoise: 0.0 } : {})
              };
          const { connectionId, workflowId } = splitConnectionSelection(config.imageConnectionId);
          const effectiveParameters = {
            ...parameters,
            ...(nai?.parameters ?? {}),
            ...(workflowId ? { workflow_id: workflowId } : {})
          };
          // Relay/capture waits and storage operations can outlive cancellation.
          // Never start paid work after either the batch or job was cancelled.
          if (signal.aborted) throw abortError(signal);
          if (jobSignal.aborted) throw abortError(jobSignal);
          const generationStarted = Date.now();
          const selected = cacheOptions.beforeGenerate && connectionId && typeof spindle.imageGen.getConnection === "function"
            ? await spindle.imageGen.getConnection(connectionId, userId)
            : cacheOptions.beforeGenerate && typeof spindle.imageGen.listConnections === "function" ? (await spindle.imageGen.listConnections(userId)).find((entry) => entry.is_default) ?? null : null;
          const input: ImageGenerationRequest = {
            ...(connectionId ? { connection_id: connectionId } : {}),
            prompt,
            ...(cue.imageTemplate || negativePrompt ? { negativePrompt } : {}),
            ...(config.imageModel ? { model: config.imageModel } : {}),
            parameters: effectiveParameters,
            owner_chat_id: plan.key.chatId,
            includeDataUrl: wantsCapture,
            ...(userId ? { userId } : {})
          };
          // Freeze exposed profile defaults/model before review, including a default-profile selection.
          let frozen: ImageGenerationRequest = cacheOptions.beforeGenerate || cue.imageTemplate ? {
            ...input,
            ...(selected?.id ? { connection_id: selected.id } : {}),
            ...(config.imageModel || selected?.model ? { model: config.imageModel || selected!.model } : {}),
            parameters: { ...templateOutputParameters(cue.imageTemplate, selected?.provider ?? provider, config.imageParameters, selected?.default_parameters ?? {}), ...input.parameters }
          } : input;
          if (cue.imageTemplate) {
            frozen = applyImageEdits(frozen, { prompt, negativePrompt });
            frozen.parameters = { ...frozen.parameters, negativePrompt };
          }
          if (!cueUsesCharacterReference(cue)) frozen = { ...frozen, parameters: withoutImageReferences(frozen.parameters ?? {}) };
          const metadataFor = (selectedCue: VisualCue): ImagePromptMetadata | undefined => selectedCue.imageTemplate ? {
            template: selectedCue.imageTemplate, selectionReason: selectedCue.imageTemplateReason ?? "Default template", format: config.imagePromptFormat,
            brief: compileTemplateCue(config, scene, selectedCue, characterAppearance).brief,
            trackerStatus: selectedCue.trackerStatus ?? (config.includeSimTrackerContext ? "not_found" : "disabled"),
            ...(selectedCue.trackerSourceMessageId ? { trackerSourceMessageId: selectedCue.trackerSourceMessageId } : {})
          } : undefined;
          const baseMetadata: ImagePreparationMetadata = {
            provider: selected?.provider ?? provider ?? "Unknown",
            ...(selected ? { connectionRevision: selected.updated_at } : {}),
            referenceSummary: portrait ? `${portrait.source ?? "captured"} portrait: ${portrait.name} (${portrait.imageId})` : wantsCapture ? "No reference yet; this picture will establish the portrait" : "No extension reference"
          };
          const initialMetadata = metadataFor(cue);
          const approved = cacheOptions.beforeGenerate ? await cacheOptions.beforeGenerate(scheduledJob, frozen, {
            ...baseMetadata,
            ...(initialMetadata ? { imagePromptMetadata: initialMetadata } : {}),
            rebuildTemplate: async templateId => {
              if (signal.aborted || jobSignal.aborted) throw abortError(jobSignal);
              const latestConfig = await loadConfig(spindle, userId);
              const template = latestConfig.imageTemplates.find(item => item.id === templateId);
              if (!template) throw new Error("This template is unavailable.");
              const nextCue = { ...cue, imageTemplate: templateSnapshot(template), imageTemplateReason: "Manual template selection" };
              const nextCompiled = compileTemplateCue(config, scene, nextCue, characterAppearance);
              const usesReference = referenceAnchoringEnabled(config) && cueUsesCharacterReference(nextCue) && provider !== null && REFERENCE_PROVIDERS.has(provider);
              let nextPortrait: StoredPortrait | undefined;
              if (usesReference) {
                const refreshed = await loadPortraits(spindle, plan.key.chatId, userId).catch(() => ({} as Record<string, StoredPortrait>));
                Object.assign(portraits, refreshed);
                if (config.referenceSource === "card") {
                  nextPortrait = cardPortraitFor(portraits, characterKey);
                  if (!nextPortrait) {
                    const context = cardContext ?? await loadCardReferenceContext(spindle, { ...plan, visualCues: [nextCue] }, userId, cacheOptions).catch(() => null);
                    const resolution = context?.resolutions.get(characterKey);
                    if (resolution) nextPortrait = (await acquireCardPortrait(characterName, characterKey, resolution)) ?? undefined;
                  }
                }
                nextPortrait ??= compatiblePortrait(portraits[characterKey], identityFingerprint);
              }
              if (signal.aborted || jobSignal.aborted) throw abortError(jobSignal);
              portrait = nextPortrait;
              wantsCapture = usesReference && Boolean(characterKey) && Boolean(identityFingerprint) && !nextPortrait;
              const nextNai = provider === "novelai" ? compileNovelAiRequest(config, scene, nextCue, characterAppearance) : null;
              const updated = applyImageEdits(frozen, { prompt: nextCompiled.prompt, negativePrompt: nextCompiled.negativePrompt });
              const request: ImageGenerationRequest = { ...updated, includeDataUrl: wantsCapture, parameters: {
                ...withoutImageReferences({ ...templateOutputParameters(nextCue.imageTemplate, selected?.provider ?? provider, config.imageParameters, selected?.default_parameters ?? {}), ...effectiveParameters }),
                ...(nextPortrait && provider ? referenceParametersFor(provider, nextPortrait, config) : {}),
                ...(nextNai?.parameters ?? {})
              } };
              return { request, metadata: { ...baseMetadata, imagePromptMetadata: metadataFor(nextCue)!, referenceSummary: nextPortrait ? `${nextPortrait.source ?? "captured"} portrait: ${nextPortrait.name} (${nextPortrait.imageId})` : wantsCapture ? "No reference yet; this picture will establish the portrait" : "No extension reference" } };
            }
          }, jobSignal) : frozen;
          if (signal.aborted) throw abortError(signal);
          if (jobSignal.aborted) throw abortError(jobSignal);
          if (cacheOptions.beforeGenerate && selected?.id) {
            const latest = await spindle.imageGen.getConnection(selected.id, userId);
            if (!latest || latest.updated_at !== selected.updated_at) throw new Error("Image connection changed during review. Prepare the picture again.");
          }
          if (signal.aborted) throw abortError(signal);
          if (jobSignal.aborted) throw abortError(jobSignal);
          // A locally edited request cannot populate the compiler's original cache key.
          if (cacheOptions.disableCacheStore || JSON.stringify(approved) !== JSON.stringify(frozen)) { cacheKey = null; settle?.({ kind: "released" }); settle = null; }
          const result = await spindle.imageGen.generate(approved);
          observedGenerationMs.push(Date.now() - generationStarted);

          if (signal.aborted) throw abortError(signal);
          if (jobSignal.aborted) throw abortError(jobSignal);
          if (!result.imageId) throw new Error("The image provider completed without a persisted image ID.");

          if (wantsCapture) {
            const parsed = parseDataUrl(result.imageDataUrl);
            if (parsed) {
              const stored: StoredPortrait = {
                name: characterName,
                imageId: result.imageId,
                data: parsed.data,
                mimeType: parsed.mimeType,
                createdAt: new Date().toISOString(),
                prompt: approved.prompt,
                identityFingerprint
              };
              try {
                if (await savePortrait(spindle, plan.key.chatId, stored, userId, { replace: !compatiblePortrait(portraits[characterKey], identityFingerprint) })) {
                  portraits[characterKey] = stored;
                  if (config.debugLogging) spindle.log.info(`[VN] portrait captured for "${characterName}" -> ${stored.imageId} (${stored.mimeType}, ${stored.data.length} base64 chars)`);
                } else {
                  const refreshed = await loadPortraits(spindle, plan.key.chatId, userId);
                  const winner = refreshed[characterKey];
                  if (winner) portraits[characterKey] = winner;
                }
              } catch {
                // Non-fatal: anchoring simply resumes on a later turn.
              }
            }
          }
          const imageUrl = result.imageUrl ?? `/api/v1/images/${encodeURIComponent(result.imageId)}`;
          if (cache && admission && cacheKey) {
            const stored = cache.store(scope, cacheKey, {
              imageId: result.imageId,
              imageUrl,
              episode,
              provenance: provenanceFor(scheduledJob.jobId, scheduledJob.promptFingerprint)
            }, admission, signal);
            if (stored.stored) {
              cacheLog(`scene-cache p${cue.paragraphIndex} store key=${shortSceneKey(cacheKey)} image=${result.imageId}${stored.replaced ? " (replaced)" : ""} entries=${cache.size} bytes=${cache.bytes}`);
              generationSettled = true;
              settle?.({ kind: "entry", entry: stored.entry });
              // A budgeted image just landed: reuse-only candidates may hit now.
              void resolveCandidatesNow();
            } else {
              cacheLog(`scene-cache p${cue.paragraphIndex} reject reason=${stored.reason} image=${result.imageId} (late or superseded result not cached)`);
              generationSettled = true;
              settle?.({ kind: "released" });
            }
          }
          return { imageId: result.imageId, imageUrl };
        } catch (error) {
          if (settle && !generationSettled) {
            generationSettled = true;
            const aborted = signal.aborted || jobSignal.aborted || (error instanceof Error && error.name === "AbortError");
            settle(aborted ? { kind: "aborted" } : { kind: "failed", error });
          }
          throw error;
        } finally {
          if (settle && !generationSettled) {
            generationSettled = true;
            settle({ kind: "released" });
          }
          // Release ownership in finally, covering validation and persistence failures
          if (isCaptureOwner) {
            captureResolve?.(portraits[characterKey] ?? null);
            capturePromises.delete(characterKey);
          }
        }
      }, { independent: Boolean(cacheOptions.independentRequests) }).promise;
    });
    await Promise.allSettled(promises);
    await resolvingCandidates;
    // Guarantee finished batches have no unexplained queued jobs
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i]!.status === "queued") {
        jobs[i] = AssetJobSchema.parse({
          ...jobs[i]!,
          status: "cancelled",
          imageId: null,
          imageUrl: null,
          generatedAt: null,
          readyAt: null,
          error: null,
          finishedAt: new Date().toISOString()
        });
      }
    }
    if (cache) {
      const stats = cache.stats();
      cacheLog(`scene-cache batch summary hits=${stats.hits} shared=${stats.sharedHits} avoided=${stats.generationsAvoided} stores=${stats.stores} misses=${Object.entries(stats.misses).filter(([, count]) => count > 0).map(([reason, count]) => `${reason}:${count}`).join(",") || "0"} rejects=${Object.entries(stats.rejections).filter(([, count]) => count > 0).map(([reason, count]) => `${reason}:${count}`).join(",") || "0"} waits=${stats.waits.count}/${stats.waits.totalMs}ms evictions=${stats.evictions} entries=${stats.entries} bytes=${stats.bytes}`);
    }
    return jobs;
  } finally {
    signal.removeEventListener("abort", abort);
    unsubscribe();
  }
}

/**
 * Decide the solo subject line. A persisted `subjectCategory` wins outright;
 * only `unknown` falls back to explicit gender words in the identity text.
 * Species and anatomy compounds ("cat ears", "fox tail", "wolf fur") are
 * stripped before the creature check, so animal ears never make a "1other".
 */
export function classifySubject(identity: string, subjectCategory: SubjectCategory = "unknown"): [label: string, situation: string] {
  const persisted = subjectPromptFor(subjectCategory);
  if (persisted) return persisted;

  const text = identity.toLowerCase();
  if (/\b1boy\b/.test(text)) return ["boy", "1boy, solo"];
  if (/\b1girl\b/.test(text)) return ["girl", "1girl, solo"];
  if (/\b1other\b/.test(text)) return ["other", "1other, solo"];

  // Strip relational prose and possessives (e.g. "sister's", "mother's")
  let cleaned = text.replace(/\b\w+'s\b/gi, "");
  // Strip known clothing phrases containing gender words like "maid uniform"
  cleaned = cleaned.replace(/\bmaid\s+uniform\b/gi, "uniform");
  cleaned = cleaned.replace(/\bfake\s+(?:mustache|beard)\b/gi, "");

  const isNonbinary = /\b(?:nonbinary|non-binary|agender|genderless)\b/i.test(cleaned);
  const isFemale = /\b(?:girl|woman|female|lady|gal|tomboy|(?:demon|wolf|cat|fox|monster|bunny|cow)\s*(?:girl|woman|female))\b/i.test(cleaned);
  const isMale = /\b(?:boy|man|male|guy|gentleman|father|son|brother|husband|(?:demon|wolf|cat|fox|monster|bunny|cow)\s*(?:boy|man|male)|anthro\s+\w+\s+male|male\s+warrior|male\s+android)\b/i.test(cleaned);

  // Animal words attached to body parts are anatomy, not a creature subject.
  const creatureText = stripAnatomyCompounds(cleaned)
    .replace(/\b(?:kitsune|catgirl|foxgirl|wolfgirl|kemonomimi|nekomimi|neko|anthro|furry|beastkin|monster\s+girl|monster\s+boy)\b/gi, " ");
  const isAnimal = /\b(?:dog|cat|retriever|hound|wolf|horse|quadruped|four\s+legs|animal|creature|beast|monster)\b/i.test(creatureText);

  if (isFemale && !isMale) {
    return ["girl", "1girl, solo"];
  } else if (isMale && !isFemale) {
    return ["boy", "1boy, solo"];
  } else if (isAnimal || isNonbinary || /\b(?:1other|creature|monster|animal|robot|android|cyborg|machine|golem|inanimate)\b/i.test(creatureText)) {
    return ["other", "1other, solo"];
  }

  // Default
  return ["girl", "1girl, solo"];
}
