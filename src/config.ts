import { normalizeTooltipPreferences, type TooltipPreferences } from "./shared/dossiers.js";
import { normalizeTrackerMappings, type TrackerMappings } from "./shared/tracker-mappings.js";
import { normalizeImageOutputRatio, type ImageOutputRatio } from "./shared/image-output.js";
import { normalizeContextSources, type ContextSourcesConfig } from './shared/context-sources.js';
import { DEFAULT_SPEECH_SETTINGS, normalizeSpeechSettings, type SpeechSettings } from "./speech-config.js";
import { DEFAULT_READER_PREFERENCES, normalizeReaderPreferences, type ReaderPreferences } from "./shared/reader-preferences.js";
import { BUILTIN_IMAGE_TEMPLATES, migrateImageTemplates, upgradeImageTemplates, type ImageTemplate } from "./shared/image-templates.js";

export type VisualNovelMode = "standard" | "cyoa";

export const SCENE_IMAGE_FITS = ["cover", "contain", "fill", "none", "scale-down"] as const;
export type VisualNovelSceneImageFit = (typeof SCENE_IMAGE_FITS)[number];

/**
 * How strongly one-shot stage effects (shake, flash, zoom) are presented.
 * - "full": every planned effect plays (the pre-redesign behavior, the default);
 * - "gentle": strong shakes and screen flashes are dropped or softened;
 * - "off": no one-shot effects at all.
 * The OS `prefers-reduced-motion` setting is honored by the theme CSS on top of
 * this and is never overridden by it.
 */
export const EFFECT_INTENSITIES = ["off", "gentle", "full"] as const;
export type VisualNovelEffectIntensity = (typeof EFFECT_INTENSITIES)[number];
/**
 * How inline text effects (<shake>, <rainbow>, ... see src/shared/text-effects.ts)
 * render in dialogue: "animated" plays them, "static" keeps their colour and
 * styling without motion, "off" shows plain text. OS reduced-motion always
 * downgrades "animated" to "static".
 */
export const TEXT_EFFECT_MODES = ["animated", "static", "off"] as const;
export type VisualNovelTextEffectMode = (typeof TEXT_EFFECT_MODES)[number];

/**
 * Where a character's reference anchor image comes from.
 * - "captured": the first render of the character in the chat (the default, unchanged behaviour);
 * - "card": one fixed sprite per character resolved from the card's assets. Characters the card
 *   does not know still use captured renders.
 */
export const REFERENCE_SOURCES = ["captured", "card"] as const;
export type VisualNovelReferenceSource = (typeof REFERENCE_SOURCES)[number];

/** Dialogue text scale bounds (multiplier over the theme's dialogue font size). */
export const TEXT_SCALE_MIN = 0.8;
export const TEXT_SCALE_MAX = 1.6;

/**
 * The canonical, host-neutral set of built-in visual-novel theme presets.
 *
 * These identifiers are the single source of truth shared by the backend config
 * normalization (src/config.ts), the frontend preset CSS map, and the stage /
 * settings wiring. They deliberately live here — not in the frontend `theme`
 * module — so the shared config never imports browser or frontend code.
 */
export const THEME_PRESET_IDS = [
  "lumiverse",
  "golden-hour",
  "boxed-console",
  "paper-novel",
  "midnight-noir",
  "yamaku-classic",
  "literature-club",
  "astral-glass",
  "neon-rain",
  "obsidian-reliquary",
] as const;

export type VisualNovelThemePreset = (typeof THEME_PRESET_IDS)[number];

/** A named prompt preset: a positive (prefix) and a negative block. */
export type VisualNovelPromptPreset = {
  id: string;
  name: string;
  positive: string;
  /** Absent on legacy presets: selecting one keeps the existing suffix. */
  suffix?: string;
  negative: string;
};

export type VisualNovelConfig = {
  themePreset: VisualNovelThemePreset;
  enabled: boolean;
  autoEnter: boolean;
  mode: VisualNovelMode;
  sceneImageFit: VisualNovelSceneImageFit;
  castMode: boolean;
  debugLogging: boolean;
  generateImages: boolean;
  reviewImages: boolean;
  dynamicImageTemplates: boolean;
  defaultImageTemplateId: string;
  imageTemplates: ImageTemplate[];
  imagePromptFormat: "description" | "tags";
  automaticImagePromptSettings: boolean;
  imagePromptBudgetOverride: boolean;
  imagePromptBudget: number;
  imageOutputAspectRatio: ImageOutputRatio;
  collectEntityReferences: boolean;
  persistentLocationArt: boolean;
  persistentCastArt: boolean;
  tooltips: TooltipPreferences;
  includeSimTrackerContext: boolean;
  simTrackerMappings: TrackerMappings;
  contextSources: ContextSourcesConfig;
  /** Anchor each character's appearance to their captured reference portrait. */
  referenceAnchoring: boolean;
  /** Where the reference anchor image comes from ("captured" render or "card" sprite). */
  referenceSource: VisualNovelReferenceSource;
  generateChoices: boolean;
  parserConnectionId: string | null;
  systemOneMode: "off" | "compare" | "on";
  systemOneApiUrl: string;
  systemOneModel: string;
  parserParameters: Record<string, unknown>;
  imageConnectionId: string | null;
  imageModel: string;
  imageParameters: Record<string, unknown>;
  maxImagesPerTurn: number;
  imageConcurrency: number;
  includeRecentMessages: number;
  includeCharacterContext: boolean;
  includePersonaContext: boolean;
  includeLorebookContext: boolean;
  promptPrefix: string;
  promptSuffix: string;
  negativePrompt: string;
  selectedSharedStyleId?: string|null;
  promptPresets: VisualNovelPromptPreset[];
  /** Append character creation/source reference to character tags: Character \(Source\) */
  originalReference: boolean;
  /** Creation/source name (e.g. "doki doki literature club") */
  originalCreationName: string;
  novelAiQualityTags: boolean;
  novelAiUseDefaultNegative: boolean;
  customPlannerInstructions: string;
  customCss: string;
  ignoredTags: string;
  displayRegexRules: string;
  useNativeCardImages: boolean;
  textSpeed: number;
  autoPlayDelay: number;
  skipMode: "read" | "all";
  /** Presentation strength of one-shot stage effects. Default "full" keeps existing playback. */
  effectIntensity: VisualNovelEffectIntensity;
  /** Inline dialogue text effects (<shake>, <rainbow>, ...). Default "animated". */
  textEffects: VisualNovelTextEffectMode;
  /** Dialogue text size multiplier, 1 = the theme's own size. */
  textScale: number;
  readerPreferences: ReaderPreferences;
  audioDirectory: string;
  bgmVolume: number;
  sfxVolume: number;
  /** Default-off speech (TTS) settings. See src/speech-config.ts. */
  speech: SpeechSettings;
};

export const DEFAULT_CONFIG: VisualNovelConfig = {
  themePreset: "lumiverse",
  enabled: true,
  autoEnter: false,
  mode: "standard",
  sceneImageFit: "cover",
  castMode: false,
  debugLogging: false,
  generateImages: true,
  reviewImages: true,
  dynamicImageTemplates: false,
  defaultImageTemplateId: "portrait",
  imageTemplates: BUILTIN_IMAGE_TEMPLATES.map(template => ({ ...template })),
  imagePromptFormat: "description",
  automaticImagePromptSettings: true,
  imagePromptBudgetOverride: false,
  imagePromptBudget: 3000,
  imageOutputAspectRatio: "default",
  collectEntityReferences: false,
  persistentLocationArt: false,
  persistentCastArt: false,
  tooltips: normalizeTooltipPreferences({}),
  includeSimTrackerContext: true,
  simTrackerMappings: normalizeTrackerMappings({}),
  contextSources: normalizeContextSources({}),
  referenceAnchoring: true,
  referenceSource: "captured",
  generateChoices: true,
  parserConnectionId: null,
  systemOneMode: "off",
  systemOneApiUrl: "https://api.typesafe.ai",
  systemOneModel: "jev-latest",
  parserParameters: {},
  imageConnectionId: null,
  imageModel: "",
  imageParameters: {},
  maxImagesPerTurn: 4,
  imageConcurrency: 2,
  includeRecentMessages: 8,
  includeCharacterContext: true,
  includePersonaContext: true,
  includeLorebookContext: false,
  promptPrefix: "masterpiece, best quality, anime visual novel scene",
  promptSuffix: "",
  negativePrompt: "low quality, blurry, malformed hands, text, subtitles, speech bubble, watermark, logo, frame, border",
  selectedSharedStyleId: null,
  promptPresets: [],
  originalReference: false,
  originalCreationName: "",
  novelAiQualityTags: true,
  novelAiUseDefaultNegative: true,
  customPlannerInstructions: "",
  customCss: "",
  ignoredTags: "",
  displayRegexRules: "",
  useNativeCardImages: false,
  textSpeed: 20,
  autoPlayDelay: 2000,
  skipMode: "read",
  effectIntensity: "full",
  textEffects: "animated",
  textScale: 1,
  readerPreferences: DEFAULT_READER_PREFERENCES,
  audioDirectory: "",
  bgmVolume: 0.7,
  sfxVolume: 0.8,
  speech: DEFAULT_SPEECH_SETTINGS,
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function floatBetween(value: unknown, minimum: number, maximum: number, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
}

function integer(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, Math.round(number)))
    : fallback;
}

function promptPresetList(value: unknown): VisualNovelPromptPreset[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const presets: VisualNovelPromptPreset[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    presets.push({
      id,
      name,
      positive: typeof record.positive === "string" ? record.positive : "",
      ...(typeof record.suffix === "string" ? { suffix: record.suffix } : {}),
      negative: typeof record.negative === "string" ? record.negative : ""
    });
    if (presets.length >= 32) break;
  }
  return presets;
}

function referenceSource(value: unknown): VisualNovelReferenceSource {
  return typeof value === "string" && (REFERENCE_SOURCES as readonly string[]).includes(value)
    ? value as VisualNovelReferenceSource
    : DEFAULT_CONFIG.referenceSource;
}

function effectIntensity(value: unknown): VisualNovelEffectIntensity {
  return typeof value === "string" && (EFFECT_INTENSITIES as readonly string[]).includes(value)
    ? value as VisualNovelEffectIntensity
    : DEFAULT_CONFIG.effectIntensity;
}

function textEffectMode(value: unknown): VisualNovelTextEffectMode {
  return typeof value === "string" && (TEXT_EFFECT_MODES as readonly string[]).includes(value)
    ? value as VisualNovelTextEffectMode
    : DEFAULT_CONFIG.textEffects;
}

function textScale(value: unknown): number {
  const scale = floatBetween(value, TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_CONFIG.textScale);
  return Math.round(scale * 100) / 100;
}

function sceneImageFit(value: unknown): VisualNovelSceneImageFit {
  return typeof value === "string" && (SCENE_IMAGE_FITS as readonly string[]).includes(value)
    ? value as VisualNovelSceneImageFit
    : DEFAULT_CONFIG.sceneImageFit;
}


/**
 * The pre-1.0 default prompt suffix duplicated camera framing as prose. The
 * compact Inlay-style camera tags now own framing, so the exact legacy default
 * is retired to an empty suffix; any user-customized suffix is preserved.
 */
const LEGACY_DEFAULT_PROMPT_SUFFIX = "wide composition, centered subject, stable eye-level camera, dialogue-safe lower frame";

function retiredLegacySuffix(value: string): string {
  return value.trim() === LEGACY_DEFAULT_PROMPT_SUFFIX ? "" : value;
}

/**
 * F9: content-addressed normalization memo. A turn calls `loadConfig` from
 * many sites, and each normalization rebuilds ~62 fields and re-runs the
 * 32-template image upgrade. Normalization is a pure function of its raw
 * input, so identical content can safely reuse one build. The key is a length
 * + 53-bit content signature; hits return a shallow clone so a caller writing
 * a top-level field can never poison the cached build. Non-serializable input
 * (circular refs, BigInt) simply bypasses the memo.
 */
const CONFIG_MEMO_LIMIT = 16;
const configMemo = new Map<string, VisualNovelConfig>();
export function clearConfigMemo(): void { configMemo.clear(); }
function hash53(source: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export function normalizeConfig(value: unknown): VisualNovelConfig {
  const input = record(value);
  let signature: string | null = null;
  try {
    const serialized = JSON.stringify(input);
    signature = `${serialized.length}:${hash53(serialized)}`;
  } catch {
    // Non-serializable input cannot be content-keyed; normalize uncached.
  }
  if (signature !== null) {
    const cached = configMemo.get(signature);
    if (cached) {
      configMemo.delete(signature);
      configMemo.set(signature, cached); // LRU touch
      return { ...cached };
    }
    const built = normalizeConfigUncached(input);
    if (configMemo.size >= CONFIG_MEMO_LIMIT) configMemo.delete(configMemo.keys().next().value!);
    configMemo.set(signature, built);
    return { ...built };
  }
  return normalizeConfigUncached(input);
}

function normalizeConfigUncached(input: Record<string, unknown>): VisualNovelConfig {
  const themePreset = (THEME_PRESET_IDS as readonly string[]).includes(input.themePreset as string)
    ? input.themePreset as VisualNovelThemePreset
    : "lumiverse";
  return {
    themePreset,
    enabled: bool(input.enabled, DEFAULT_CONFIG.enabled),
    autoEnter: bool(input.autoEnter, DEFAULT_CONFIG.autoEnter),
    mode: input.mode === "cyoa" ? "cyoa" : "standard",
    sceneImageFit: sceneImageFit(input.sceneImageFit),
    castMode: bool(input.castMode, false),
    debugLogging: bool(input.debugLogging, DEFAULT_CONFIG.debugLogging),
    generateImages: bool(input.generateImages, DEFAULT_CONFIG.generateImages),
    reviewImages: bool(input.reviewImages, DEFAULT_CONFIG.reviewImages),
    dynamicImageTemplates: bool(input.dynamicImageTemplates, false),
    defaultImageTemplateId: nullableString(input.defaultImageTemplateId) ?? "portrait",
    imageTemplates: input.imageTemplates === undefined ? migrateImageTemplates(promptPresetList(input.promptPresets)) : upgradeImageTemplates(input.imageTemplates),
    imagePromptFormat: input.imagePromptFormat === "tags" ? "tags" : "description",
    automaticImagePromptSettings: bool(input.automaticImagePromptSettings, true),
    imagePromptBudgetOverride: input.imagePromptBudgetOverride === true,
    imagePromptBudget: typeof input.imagePromptBudget === "number" && Number.isFinite(input.imagePromptBudget) ? Math.min(50000, Math.max(256, Math.trunc(input.imagePromptBudget))) : 3000,
    imageOutputAspectRatio: normalizeImageOutputRatio(input.imageOutputAspectRatio),
    collectEntityReferences: input.collectEntityReferences === true,
    tooltips: normalizeTooltipPreferences(input.tooltips),
    persistentLocationArt: input.persistentLocationArt === true,
    persistentCastArt: input.persistentCastArt === true,
    includeSimTrackerContext: bool(input.includeSimTrackerContext, true),
    simTrackerMappings: normalizeTrackerMappings(input.simTrackerMappings),
    contextSources: normalizeContextSources(input.contextSources),
    referenceAnchoring: bool(input.referenceAnchoring, DEFAULT_CONFIG.referenceAnchoring),
    referenceSource: referenceSource(input.referenceSource),
    generateChoices: bool(input.generateChoices, DEFAULT_CONFIG.generateChoices),
    parserConnectionId: nullableString(input.parserConnectionId),
    systemOneMode: input.systemOneMode === "compare" || input.systemOneMode === "on" ? input.systemOneMode : "off",
    systemOneApiUrl: stringValue(input.systemOneApiUrl, DEFAULT_CONFIG.systemOneApiUrl).trim() || DEFAULT_CONFIG.systemOneApiUrl,
    systemOneModel: stringValue(input.systemOneModel, DEFAULT_CONFIG.systemOneModel).trim() || DEFAULT_CONFIG.systemOneModel,
    parserParameters: record(input.parserParameters),
    imageConnectionId: nullableString(input.imageConnectionId),
    imageModel: stringValue(input.imageModel, DEFAULT_CONFIG.imageModel),
    imageParameters: record(input.imageParameters),
    maxImagesPerTurn: integer(input.maxImagesPerTurn, 0, 12, DEFAULT_CONFIG.maxImagesPerTurn),
    imageConcurrency: integer(input.imageConcurrency, 1, 6, DEFAULT_CONFIG.imageConcurrency),
    includeRecentMessages: integer(input.includeRecentMessages, 0, 30, DEFAULT_CONFIG.includeRecentMessages),
    includeCharacterContext: bool(input.includeCharacterContext, DEFAULT_CONFIG.includeCharacterContext),
    includePersonaContext: bool(input.includePersonaContext, DEFAULT_CONFIG.includePersonaContext),
    includeLorebookContext: bool(input.includeLorebookContext, DEFAULT_CONFIG.includeLorebookContext),
    promptPrefix: stringValue(input.promptPrefix, DEFAULT_CONFIG.promptPrefix),
    promptSuffix: retiredLegacySuffix(stringValue(input.promptSuffix, DEFAULT_CONFIG.promptSuffix)),
    negativePrompt: stringValue(input.negativePrompt, DEFAULT_CONFIG.negativePrompt),
    selectedSharedStyleId: typeof input.selectedSharedStyleId==='string'?input.selectedSharedStyleId.slice(0,256):null,
    promptPresets: promptPresetList(input.promptPresets),
    originalReference: bool(input.originalReference, DEFAULT_CONFIG.originalReference),
    originalCreationName: stringValue(input.originalCreationName, DEFAULT_CONFIG.originalCreationName).trim(),
    novelAiQualityTags: bool(input.novelAiQualityTags, DEFAULT_CONFIG.novelAiQualityTags),
    novelAiUseDefaultNegative: bool(input.novelAiUseDefaultNegative, DEFAULT_CONFIG.novelAiUseDefaultNegative),
    customPlannerInstructions: stringValue(input.customPlannerInstructions, DEFAULT_CONFIG.customPlannerInstructions),
    customCss: stringValue(input.customCss, DEFAULT_CONFIG.customCss),
    ignoredTags: stringValue(input.ignoredTags, DEFAULT_CONFIG.ignoredTags),
    displayRegexRules: stringValue(input.displayRegexRules, DEFAULT_CONFIG.displayRegexRules),
    useNativeCardImages: bool(input.useNativeCardImages, DEFAULT_CONFIG.useNativeCardImages),
    textSpeed: integer(input.textSpeed, 0, 100, DEFAULT_CONFIG.textSpeed),
    autoPlayDelay: integer(input.autoPlayDelay, 500, 10000, DEFAULT_CONFIG.autoPlayDelay),
    skipMode: input.skipMode === "all" ? "all" : "read",
    effectIntensity: effectIntensity(input.effectIntensity),
    textEffects: textEffectMode(input.textEffects),
    textScale: textScale(input.textScale),
    readerPreferences: normalizeReaderPreferences(input.readerPreferences),
    audioDirectory: stringValue(input.audioDirectory, DEFAULT_CONFIG.audioDirectory).trim(),
    bgmVolume: floatBetween(input.bgmVolume, 0, 1, DEFAULT_CONFIG.bgmVolume),
    sfxVolume: floatBetween(input.sfxVolume, 0, 1, DEFAULT_CONFIG.sfxVolume),
    speech: normalizeSpeechSettings(input.speech),
  };
}
