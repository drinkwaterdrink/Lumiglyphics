import { z } from 'zod';
import { NANOGPT_PROMPT_CAPABILITIES } from './image-prompt-capabilities.js';
import { ModelOutputCapabilitiesSchema, type ModelOutputCapabilities } from './model-output-capabilities.js';
import { NANOGPT_OUTPUT_CAPABILITIES } from './model-output-catalogue.js';
import type { PromptProfileSettings } from './image-prompt-profile.js';

export const PromptDialectIdSchema = z.enum([
  'flux3-klein',
  'flux3',
  'gpt-image-2.5',
  'grok-imagine-2',
  'qwen-image-3',
  'nano-banana-2.1',
  'seedream-5',
  'anima',
  'novelai',
  'generic-prose',
  'generic-tags',
  'ideogram-v4'
]);
export type PromptDialectId = z.infer<typeof PromptDialectIdSchema>;

export const NegativePolicySchema = z.enum([
  'native',
  'positive-only',
  'unknown'
]);
export type NegativePolicy = z.infer<typeof NegativePolicySchema>;

export const SoftBudgetsSchema = z.object({
  simple: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  standard: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  complex: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  dense: z.tuple([z.number().int().min(1), z.number().int().min(1)])
}).strict();
export type SoftBudgets = z.infer<typeof SoftBudgetsSchema>;

export const ProfileFeaturesSchema = z.object({
  references: z.boolean().optional(),
  layoutBoxes: z.boolean().optional(),
  exactText: z.boolean().optional(),
  thinking: z.boolean().optional()
}).strict();
export type ProfileFeatures = z.infer<typeof ProfileFeaturesSchema>;

export const ImagePromptProfileV2Schema = z.object({
  version: z.literal(2),
  exactModel: z.string().min(1).max(256),
  family: z.string().min(1).max(64),
  dialect: PromptDialectIdSchema,
  serializerRevision: z.string().min(1).max(64),
  hardMaxCharacters: z.number().int().min(256).max(65000),
  capabilitySource: z.enum(['live', 'catalogue', 'fallback']),
  negativePolicy: NegativePolicySchema,
  softBudgets: SoftBudgetsSchema,
  promptExpansion: z.object({
    supported: z.boolean(),
    enabled: z.boolean().optional()
  }).strict().optional(),
  features: ProfileFeaturesSchema,
  ideogramMode: z.enum(['json', 'structured-prose']).optional(),
  outputCapabilities: ModelOutputCapabilitiesSchema.optional(),
  guidance: z.string().max(2400).optional()
}).strict();
export type ImagePromptProfileV2 = z.infer<typeof ImagePromptProfileV2Schema>;

export const V2_SERIALIZER_REVISION = '2026.10-rev1';

const DIALECT_BUDGETS: Record<PromptDialectId, SoftBudgets> = {
  'flux3-klein': {
    simple: [900, 1800],
    standard: [1200, 2200],
    complex: [1600, 2600],
    dense: [1800, 3000]
  },
  flux3: {
    simple: [800, 1600],
    standard: [1100, 2000],
    complex: [1500, 2400],
    dense: [1700, 2800]
  },
  'gpt-image-2.5': {
    simple: [700, 1500],
    standard: [1000, 1900],
    complex: [1300, 2200],
    dense: [1500, 2600]
  },
  'grok-imagine-2': {
    simple: [450, 1000],
    standard: [700, 1300],
    complex: [900, 1500],
    dense: [1000, 1600]
  },
  'qwen-image-3': {
    simple: [300, 650],
    standard: [400, 750],
    complex: [500, 850],
    dense: [600, 900]
  },
  'nano-banana-2.1': {
    simple: [800, 1800],
    standard: [1200, 2200],
    complex: [1500, 2600],
    dense: [1800, 3000]
  },
  'seedream-5': {
    simple: [500, 1200],
    standard: [800, 1500],
    complex: [1000, 1800],
    dense: [1200, 2000]
  },
  anima: {
    simple: [250, 650],
    standard: [400, 800],
    complex: [500, 900],
    dense: [600, 1000]
  },
  novelai: {
    simple: [300, 700],
    standard: [450, 900],
    complex: [600, 1100],
    dense: [700, 1200]
  },
  'generic-prose': {
    simple: [500, 1200],
    standard: [800, 1600],
    complex: [1000, 1900],
    dense: [1200, 2200]
  },
  'generic-tags': {
    simple: [250, 600],
    standard: [400, 750],
    complex: [500, 900],
    dense: [600, 1000]
  },
  'ideogram-v4': {
    simple: [800, 2500],
    standard: [1500, 4500],
    complex: [2500, 7000],
    dense: [3500, 9500]
  }
};

const QWEN3_NO_EXPANSION_BUDGETS: SoftBudgets = {
  simple: [550, 1000],
  standard: [700, 1200],
  complex: [800, 1400],
  dense: [900, 1500]
};

interface RouteDialectResolution {
  dialect: PromptDialectId;
  family: string;
  negativePolicy: NegativePolicy;
  features: ProfileFeatures;
  promptExpansion?: { supported: boolean; enabled?: boolean };
}

/**
 * Exact route matching takes absolute priority over generic family regex matching.
 * Models are explicitly distinguished to prevent cross-generational collisions
 * (e.g. FLUX.3 Klein != FLUX.2 Klein, Qwen 3 != Qwen 2.1, Grok != Animagine).
 */
export function resolveRouteDialect(
  provider: string,
  modelId: string,
  parameters?: Record<string, unknown>,
  settings?: PromptProfileSettings
): RouteDialectResolution {
  const normModel = modelId.trim().toLowerCase();
  const normProvider = provider.trim().toLowerCase();
  const ideogramMode = settings?.ideogramPromptMode ?? 'auto';
  const flux3KleinMode = settings?.flux3KleinPromptMode ?? 'auto';

  // Manual FLUX.3 Klein override takes precedence:
  if (flux3KleinMode === 'pup-caption') {
    return {
      dialect: 'flux3-klein',
      family: 'flux',
      negativePolicy: 'positive-only',
      features: { references: true, layoutBoxes: true, exactText: true }
    };
  }

  // Manual Ideogram override:
  if (ideogramMode === 'json' || ideogramMode === 'structured-prose') {
    return {
      dialect: 'ideogram-v4',
      family: 'ideogram',
      negativePolicy: 'positive-only',
      features: { references: true, exactText: true, layoutBoxes: true }
    };
  }

  if (ideogramMode === 'off' && normModel.includes('ideogram')) {
    return {
      dialect: 'generic-prose',
      family: 'ideogram',
      negativePolicy: 'positive-only',
      features: { references: true }
    };
  }

  if (
    flux3KleinMode === 'off' &&
    (normModel === 'blackforestlabs/flux-3/klein/text-to-image' ||
      normModel === 'blackforestlabs/flux-3/klein/edit-image' ||
      normModel === 'blackforestlabs/flux-3/klein/base/text-to-image' ||
      normModel === 'blackforestlabs/flux-3/klein/base/edit-image' ||
      /(?:^|[\/._-])flux[-_.]?3.*klein/.test(normModel))
  ) {
    return {
      dialect: 'generic-prose',
      family: 'flux',
      negativePolicy: 'positive-only',
      features: { references: true }
    };
  }

  // Ideogram routes (NanoGPT & hosted endpoints)
  if (normModel.includes('ideogram')) {
    return {
      dialect: 'ideogram-v4',
      family: 'ideogram',
      negativePolicy: 'positive-only',
      features: { references: true, exactText: true, layoutBoxes: true }
    };
  }

  // NovelAI native provider
  if (normProvider === 'novelai') {
    return {
      dialect: 'novelai',
      family: 'novelai',
      negativePolicy: 'native',
      features: { references: false }
    };
  }

  // 1. FLUX.3 Klein vs FLUX.2 Klein vs generic FLUX
  // Exact routes: blackforestlabs/flux-3/klein/text-to-image, blackforestlabs/flux-3/klein/base/text-to-image, etc.
  if (
    normModel === 'blackforestlabs/flux-3/klein/text-to-image' ||
    normModel === 'blackforestlabs/flux-3/klein/edit-image' ||
    normModel === 'blackforestlabs/flux-3/klein/base/text-to-image' ||
    normModel === 'blackforestlabs/flux-3/klein/base/edit-image' ||
    /(?:^|[\/._-])flux[-_.]?3.*klein/.test(normModel)
  ) {
    return {
      dialect: 'flux3-klein',
      family: 'flux',
      negativePolicy: 'positive-only',
      features: { references: true, layoutBoxes: true, exactText: true }
    };
  }

  // General FLUX.3 routes (NOT Klein)
  if (
    normModel === 'black-forest-labs/flux-3/text-to-image' ||
    normModel === 'blackforestlabs/flux-3/pro/text-to-image' ||
    normModel === 'blackforestlabs/flux-3/dev/text-to-image' ||
    /(?:^|[\/._-])flux[-_.]?3/.test(normModel)
  ) {
    return {
      dialect: 'flux3',
      family: 'flux',
      negativePolicy: 'positive-only',
      features: { references: true }
    };
  }

  // FLUX.2 Klein or generic FLUX (FLUX.2 is NOT FLUX.3 Klein!)
  if (normModel.includes('flux-2') || normModel.includes('flux')) {
    return {
      dialect: 'generic-prose',
      family: 'flux',
      negativePolicy: normModel.startsWith('flux-2-') ? 'positive-only' : 'positive-only',
      features: { references: true }
    };
  }

  // 2. OpenAI GPT Image 2.5 (Flare and Sunburst share dialect, distinct exactModel)
  if (
    normModel === 'openai/gpt-image-2.5/flare/text-to-image' ||
    normModel === 'openai/gpt-image-2.5/flare/edit' ||
    normModel === 'openai/gpt-image-2.5/sunburst/text-to-image' ||
    normModel === 'openai/gpt-image-2.5/sunburst/edit' ||
    normModel.includes('gpt-image-2.5')
  ) {
    return {
      dialect: 'gpt-image-2.5',
      family: 'gpt-image',
      negativePolicy: 'positive-only',
      features: { exactText: true, references: true }
    };
  }

  // 3. xAI Grok Imagine 2.0 (Animagine MUST NOT match Grok!)
  if (
    !normModel.includes('animagine') &&
    (normModel === 'xai/grok-imagine-image/v2.0/text-to-image' ||
      normModel === 'xai/grok-imagine-image/v2.0/edit' ||
      normModel === 'grok-imagine-image/v2.0' ||
      /(?:^|[\/._-])grok.*imagine.*(?:v?2|2\.0)/.test(normModel))
  ) {
    return {
      dialect: 'grok-imagine-2',
      family: 'grok',
      negativePolicy: 'positive-only',
      features: { references: true }
    };
  }

  // 4. Qwen Image 3 / 3 Pro vs Qwen 2.1
  // Qwen Image 3 supports native negatives; Qwen 2.1 is positive-only!
  if (
    normModel === 'qwen-image-3' ||
    normModel === 'qwen-image-3-pro' ||
    /^qwen-image-3(?:-pro)?$/.test(normModel)
  ) {
    const expansionEnabled = parameters?.prompt_expansion !== false;
    return {
      dialect: 'qwen-image-3',
      family: 'qwen',
      negativePolicy: 'native',
      features: { references: true, exactText: true },
      promptExpansion: {
        supported: true,
        enabled: expansionEnabled
      }
    };
  }

  // Qwen 2.1 and earlier Qwen
  if (/qwen/.test(normModel)) {
    return {
      dialect: 'generic-prose',
      family: 'qwen',
      negativePolicy: 'positive-only',
      features: { references: true }
    };
  }

  // 5. Nano Banana 2.1 (Google / provider aliases)
  if (
    normModel === 'nano-banana-2.1' ||
    normModel === 'gemini-nano-banana-2.1' ||
    normModel === 'google/nano-banana-2.1' ||
    normModel.includes('nano-banana-2.1') ||
    /^(?:google\/)?(?:gemini-)?nano-banana-2\.1(?:\/.*)?$/.test(normModel)
  ) {
    return {
      dialect: 'nano-banana-2.1',
      family: 'nano-banana',
      negativePolicy: 'positive-only',
      features: { references: true, thinking: true, exactText: true }
    };
  }

  // 6. ByteDance Seedream 5.0 Pro
  if (
    normModel === 'bytedance/seedream-v5.0-pro' ||
    normModel === 'bytedance/seedream-v5.0-pro/edit' ||
    normModel === 'seedream-5-alternative' ||
    normModel === 'seedream-5-alternative/edit' ||
    /seedream[-_]?(?:v?5(?:\.0)?(?:-pro)?)/.test(normModel)
  ) {
    return {
      dialect: 'seedream-5',
      family: 'seedream',
      negativePolicy: 'positive-only',
      features: { references: true }
    };
  }

  // 7. Anima (explicit tag-driven anime model)
  if (
    normModel === 'anima/text-to-image' ||
    normModel === 'anima/text-to-image-lora' ||
    /^anima(?:\/|$)/.test(normModel)
  ) {
    return {
      dialect: 'anima',
      family: 'anima',
      negativePolicy: 'positive-only',
      features: { references: false }
    };
  }

  // 8. Tag-driven community models
  if (
    /(?:danbooru|pony|illustrious|animagine|aniflatmix|artiwaifu|wai-illustrious|hentai|anime|tags)/.test(normModel)
  ) {
    return {
      dialect: 'generic-tags',
      family: normModel.includes('pony') ? 'pony' : normModel.includes('illustrious') ? 'illustrious' : 'anime-generic',
      negativePolicy: 'unknown',
      features: {}
    };
  }

  // 9. Recraft (v3, v4, v4.1, flash/pro)
  if (/recraft/.test(normModel)) {
    return {
      dialect: 'generic-prose',
      family: 'recraft',
      negativePolicy: 'positive-only',
      features: { references: true, exactText: true }
    };
  }

  // 10. Generic prose fallback
  return {
    dialect: 'generic-prose',
    family: 'generic',
    negativePolicy: 'unknown',
    features: {}
  };
}

export function resolveImagePromptProfileV2(
  provider: string | null | undefined,
  model: string | null | undefined,
  settings: PromptProfileSettings = {},
  liveLimits?: ReadonlyMap<string, number>,
  liveOutputs?: ReadonlyMap<string, ModelOutputCapabilities>,
  parameters?: Record<string, unknown>
): ImagePromptProfileV2 {
  const p = provider?.trim().toLowerCase() ?? '';
  const rawModel = model?.trim() ?? 'unknown';
  const id = rawModel;

  const resolution = resolveRouteDialect(p, id, parameters, settings);
  const dialect = resolution.dialect;
  const family = resolution.family;

  // Mechanical capability lookup:
  // Live provider metadata takes absolute precedence over bundled catalogue
  const liveLimit = p === 'nanogpt' ? liveLimits?.get(id) : undefined;
  const catalogueLimit =
    p === 'nanogpt' && Object.hasOwn(NANOGPT_PROMPT_CAPABILITIES, id)
      ? NANOGPT_PROMPT_CAPABILITIES[id]
      : undefined;

  const providerLimit = liveLimit ?? catalogueLimit;

  let capabilitySource: 'live' | 'catalogue' | 'fallback' = 'fallback';
  if (liveLimit !== undefined) {
    capabilitySource = 'live';
  } else if (catalogueLimit !== undefined) {
    capabilitySource = 'catalogue';
  }

  // Fallback defaults per dialect when provider ceiling is unknown
  const dialectFallbackCeiling: Record<PromptDialectId, number> = {
    'flux3-klein': 3000,
    flux3: 3000,
    'gpt-image-2.5': 32000,
    'grok-imagine-2': 8000,
    'qwen-image-3': 800,
    'nano-banana-2.1': 50000,
    'seedream-5': 3000,
    anima: 3000,
    novelai: 3000,
    'generic-prose': 3000,
    'generic-tags': 3000,
    'ideogram-v4': 10000
  };

  const defaultCeiling = providerLimit ?? dialectFallbackCeiling[dialect] ?? 3000;

  // Manual user budget override is authoritative up to the provider ceiling
  let hardMaxCharacters = defaultCeiling;
  if (settings.imagePromptBudgetOverride && typeof settings.imagePromptBudget === 'number' && Number.isFinite(settings.imagePromptBudget)) {
    const manualBudget = Math.min(65000, Math.max(256, Math.trunc(settings.imagePromptBudget)));
    hardMaxCharacters = providerLimit !== undefined ? Math.min(manualBudget, providerLimit) : manualBudget;
  }

  // Live output capabilities vs bundled catalogue
  const liveOutput = p === 'nanogpt' ? liveOutputs?.get(id) : undefined;
  const catalogueOutput =
    p === 'nanogpt' && Object.hasOwn(NANOGPT_OUTPUT_CAPABILITIES, id)
      ? NANOGPT_OUTPUT_CAPABILITIES[id]
      : undefined;
  const outputCapabilities = liveOutput ?? catalogueOutput;

  // Soft budgets tuning
  let softBudgets = DIALECT_BUDGETS[dialect];
  if (dialect === 'qwen-image-3' && resolution.promptExpansion?.enabled === false) {
    softBudgets = QWEN3_NO_EXPANSION_BUDGETS;
  }

  return ImagePromptProfileV2Schema.parse({
    version: 2,
    exactModel: rawModel,
    family,
    dialect,
    serializerRevision: V2_SERIALIZER_REVISION,
    hardMaxCharacters,
    capabilitySource,
    negativePolicy: resolution.negativePolicy,
    softBudgets,
    ...(resolution.promptExpansion ? { promptExpansion: resolution.promptExpansion } : {}),
    features: resolution.features,
    ...(dialect === 'ideogram-v4' ? { ideogramMode: settings.ideogramPromptMode === 'structured-prose' ? 'structured-prose' : 'json' } : {}),
    ...(outputCapabilities ? { outputCapabilities } : {}),
    guidance: `Dialect: ${dialect}. Model-aware Prompt Engine v2.`
  });
}
