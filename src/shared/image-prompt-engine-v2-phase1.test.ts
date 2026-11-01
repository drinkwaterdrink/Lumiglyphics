import { expect, test } from 'bun:test';
import {
  resolveRouteDialect,
  resolveImagePromptProfileV2,
  ImagePromptProfileV2Schema
} from './image-prompt-profile-v2.js';
import {
  ImageShotSpecSchema,
  createDefaultShotSpec,
  parseImageShotSpec
} from './image-shot-spec.js';
import {
  StyleDNASchema,
  createEmptyStyleDNA,
  parseStyleDNA
} from './style-dna.js';
import {
  PromptDocumentSchema,
  createPromptDocument,
  assemblePromptSections
} from './prompt-document.js';
import {
  resolveImageOutputPlan,
  computeOrientation,
  ImageOutputPlanSchema
} from './image-output-plan.js';
import {
  resolveImagePromptProfile
} from './image-prompt-profile.js';
import {
  ImagePromptMetadataSchema,
  VisualBriefSchema,
  ImageTemplateSnapshotSchema,
  templateSnapshot,
  BUILTIN_IMAGE_TEMPLATES
} from './image-templates.js';
import { NANOGPT_OUTPUT_CAPABILITIES } from './model-output-catalogue.js';

test('exact route matching distinguishes FLUX.3 Klein, generic FLUX.3, and FLUX.2', () => {
  // FLUX.3 Klein exact routes
  const klein1 = resolveRouteDialect('nanogpt', 'blackforestlabs/flux-3/klein/text-to-image');
  expect(klein1.dialect).toBe('flux3-klein');
  expect(klein1.family).toBe('flux');
  expect(klein1.negativePolicy).toBe('positive-only');
  expect(klein1.features.layoutBoxes).toBe(true);

  const kleinBase = resolveRouteDialect('nanogpt', 'blackforestlabs/flux-3/klein/base/text-to-image');
  expect(kleinBase.dialect).toBe('flux3-klein');

  // FLUX.3 standard routes (not Klein)
  const flux3 = resolveRouteDialect('nanogpt', 'black-forest-labs/flux-3/text-to-image');
  expect(flux3.dialect).toBe('flux3');
  expect(flux3.features.layoutBoxes).toBeUndefined();

  // FLUX.2 Klein MUST NOT match flux3-klein
  const flux2Klein = resolveRouteDialect('nanogpt', 'flux-2-klein-4b');
  expect(flux2Klein.dialect).not.toBe('flux3-klein');
  expect(flux2Klein.dialect).toBe('generic-prose');
});

test('GPT Image 2.5 Flare and Sunburst share dialect but preserve exactModel', () => {
  const flare = resolveImagePromptProfileV2('nanogpt', 'openai/gpt-image-2.5/flare/text-to-image');
  const sunburst = resolveImagePromptProfileV2('nanogpt', 'openai/gpt-image-2.5/sunburst/text-to-image');

  expect(flare.dialect).toBe('gpt-image-2.5');
  expect(sunburst.dialect).toBe('gpt-image-2.5');
  expect(flare.exactModel).toBe('openai/gpt-image-2.5/flare/text-to-image');
  expect(sunburst.exactModel).toBe('openai/gpt-image-2.5/sunburst/text-to-image');
  expect(flare.features.exactText).toBe(true);
});

test('Grok Imagine Image 2.0 matches exact route and never matches Animagine', () => {
  const grok = resolveRouteDialect('nanogpt', 'xai/grok-imagine-image/v2.0/text-to-image');
  expect(grok.dialect).toBe('grok-imagine-2');
  expect(grok.family).toBe('grok');
  expect(grok.negativePolicy).toBe('positive-only');

  const animagine = resolveRouteDialect('nanogpt', 'animagine-xl-31');
  expect(animagine.dialect).not.toBe('grok-imagine-2');
  expect(animagine.family).not.toBe('grok');
  expect(animagine.dialect).toBe('generic-tags');
});

test('Qwen Image 3 supports native negatives while Qwen 2.1 is positive-only', () => {
  const qwen3 = resolveRouteDialect('nanogpt', 'qwen-image-3');
  expect(qwen3.dialect).toBe('qwen-image-3');
  expect(qwen3.negativePolicy).toBe('native');
  expect(qwen3.promptExpansion?.supported).toBe(true);
  expect(qwen3.promptExpansion?.enabled).toBe(true);

  const qwen3Pro = resolveRouteDialect('nanogpt', 'qwen-image-3-pro');
  expect(qwen3Pro.dialect).toBe('qwen-image-3');
  expect(qwen3Pro.negativePolicy).toBe('native');

  // Qwen 2.1 is positive-only and does not get the qwen-image-3 dialect
  const qwen21 = resolveRouteDialect('nanogpt', 'qwen-image-2.1-turbo');
  expect(qwen21.dialect).not.toBe('qwen-image-3');
  expect(qwen21.negativePolicy).toBe('positive-only');
});

test('Qwen Image 3 prompt expansion state adjusts soft budgets', () => {
  const profileExpanded = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3', {}, undefined, undefined, { prompt_expansion: true });
  const profileUnexpanded = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3', {}, undefined, undefined, { prompt_expansion: false });

  expect(profileExpanded.promptExpansion?.enabled).toBe(true);
  expect(profileUnexpanded.promptExpansion?.enabled).toBe(false);

  // When expansion is enabled, soft budgets are kept compact
  expect(profileExpanded.softBudgets.standard[0]).toBeLessThan(profileUnexpanded.softBudgets.standard[0]);
  expect(profileExpanded.softBudgets.standard[1]).toBeLessThan(profileUnexpanded.softBudgets.standard[1]);
});

test('Nano Banana 2.1 alias resolution across providers', () => {
  const aliases = [
    'nano-banana-2.1',
    'gemini-nano-banana-2.1',
    'google/nano-banana-2.1'
  ];

  for (const alias of aliases) {
    const profile = resolveImagePromptProfileV2('nanogpt', alias);
    expect(profile.dialect).toBe('nano-banana-2.1');
    expect(profile.family).toBe('nano-banana');
    expect(profile.features.thinking).toBe(true);
    expect(profile.features.references).toBe(true);
  }
});

test('Seedream 5.0 Pro routes resolve to seedream-5 dialect', () => {
  const seedream = resolveImagePromptProfileV2('nanogpt', 'bytedance/seedream-v5.0-pro');
  expect(seedream.dialect).toBe('seedream-5');
  expect(seedream.family).toBe('seedream');
  expect(seedream.negativePolicy).toBe('positive-only');
});

test('Anima resolves to tag-driven anima dialect', () => {
  const anima = resolveImagePromptProfileV2('nanogpt', 'anima/text-to-image');
  expect(anima.dialect).toBe('anima');
  expect(anima.family).toBe('anima');
});

test('NovelAI provider resolves to novelai dialect with native negative policy', () => {
  const nai = resolveImagePromptProfileV2('novelai', 'nai-diffusion-4');
  expect(nai.dialect).toBe('novelai');
  expect(nai.negativePolicy).toBe('native');
});

test('unknown models degrade gracefully to generic prose or tags', () => {
  const unknownProse = resolveImagePromptProfileV2('unknown-provider', 'my-custom-photo-model');
  expect(unknownProse.dialect).toBe('generic-prose');
  expect(unknownProse.negativePolicy).toBe('unknown');

  const unknownTags = resolveImagePromptProfileV2('unknown-provider', 'my-pony-anime-lora');
  expect(unknownTags.dialect).toBe('generic-tags');
  expect(unknownTags.negativePolicy).toBe('unknown');
});

test('live capabilities take precedence over static catalogue snapshots', () => {
  const liveLimits = new Map<string, number>([
    ['qwen-image-3', 1500] // Catalog is 800
  ]);

  const profileLive = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3', {}, liveLimits);
  expect(profileLive.capabilitySource).toBe('live');
  expect(profileLive.hardMaxCharacters).toBe(1500);

  const profileCatalogue = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3');
  expect(profileCatalogue.capabilitySource).toBe('catalogue');
  expect(profileCatalogue.hardMaxCharacters).toBe(800);

  const profileFallback = resolveImagePromptProfileV2('other', 'unregistered-model');
  expect(profileFallback.capabilitySource).toBe('fallback');
});

test('manual user budget override respects provider ceiling', () => {
  // Provider limit for qwen-image-3 in catalogue is 800
  const profileCapped = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3', {
    imagePromptBudgetOverride: true,
    imagePromptBudget: 4000
  });
  expect(profileCapped.hardMaxCharacters).toBe(800);

  // Manual budget lower than provider limit is respected
  const profileLowered = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3', {
    imagePromptBudgetOverride: true,
    imagePromptBudget: 500
  });
  expect(profileLowered.hardMaxCharacters).toBe(500);
});

test('ImageOutputPlan maps requested 16:9 to square 1:1 for FLUX.3 Klein with structured warning', () => {
  const kleinCaps = NANOGPT_OUTPUT_CAPABILITIES['blackforestlabs/flux-3/klein/text-to-image'];
  expect(kleinCaps).toBeDefined();

  const plan = resolveImageOutputPlan({
    capabilities: kleinCaps,
    parameters: {},
    requestedRatio: '16:9',
    modelId: 'blackforestlabs/flux-3/klein/text-to-image',
    source: 'catalogue'
  });

  expect(plan.requestedRatio).toBe('16:9');
  expect(plan.actualRatio).toBe('1:1');
  expect(plan.orientation).toBe('square');
  expect(plan.warnings.length).toBeGreaterThan(0);
  expect(plan.warnings[0]).toContain('does not offer requested aspect ratio 16:9');
});

test('ImageOutputPlan supports matching ratio when capabilities offer it', () => {
  const qwenCaps = NANOGPT_OUTPUT_CAPABILITIES['qwen-image-3'];
  expect(qwenCaps).toBeDefined();

  const plan = resolveImageOutputPlan({
    capabilities: qwenCaps,
    parameters: {},
    requestedRatio: '16:9',
    modelId: 'qwen-image-3',
    source: 'catalogue'
  });

  expect(plan.requestedRatio).toBe('16:9');
  expect(plan.actualRatio).toBe('16:9');
  expect(plan.orientation).toBe('landscape');
  expect(plan.warnings).toEqual([]);
});

test('ImageOutputPlan treats rawRequestOverride as authoritative and never mutates it', () => {
  const plan = resolveImageOutputPlan({
    parameters: {
      rawRequestOverride: {
        custom_param: 123,
        aspect_ratio: '21:9',
        size: '1280x548'
      }
    },
    requestedRatio: '1:1',
    modelId: 'any-model'
  });

  expect(plan.source).toBe('raw-override');
  expect(plan.actualRatio).toBe('21:9');
  expect(plan.orientation).toBe('landscape');
  expect(plan.warnings).toEqual([]);
});

test('computeOrientation accurately classifies common aspect ratios', () => {
  expect(computeOrientation('1:1')).toBe('square');
  expect(computeOrientation('1024x1024')).toBe('square');
  expect(computeOrientation('16:9')).toBe('landscape');
  expect(computeOrientation('1920x1080')).toBe('landscape');
  expect(computeOrientation('9:16')).toBe('portrait');
  expect(computeOrientation('1080x1920')).toBe('portrait');
  expect(computeOrientation('invalid')).toBe('unknown');
});

test('ImageShotSpec schema validates correct specifications and rejects invalid types', () => {
  const defaultSpec = createDefaultShotSpec();
  expect(ImageShotSpecSchema.parse(defaultSpec)).toBeDefined();

  const validParsed = parseImageShotSpec({
    version: 1,
    intent: 'confrontation',
    output: {
      requestedRatio: '16:9',
      actualRatio: '16:9',
      orientation: 'landscape'
    },
    camera: {
      shotSize: 'medium-wide',
      angle: 'low-angle',
      lens: 'wide',
      depthOfField: 'deep'
    },
    composition: {
      mode: 'rule-of-thirds',
      subjectPlacements: [
        { subject: 'Hero', horizontal: 'left', depth: 'foreground', scale: 'large' },
        { subject: 'Villain', horizontal: 'right', depth: 'midground', scale: 'medium' }
      ]
    },
    safeArea: {
      edge: 'bottom',
      fraction: 0.25,
      reason: 'dialogue-overlay'
    },
    source: 'planner',
    revision: 1
  });
  expect(validParsed).toBeDefined();

  // Invalid intent rejected
  expect(parseImageShotSpec({ ...defaultSpec, intent: 'unsupported-intent' })).toBeUndefined();
  // Invalid fraction (> 1) rejected
  expect(parseImageShotSpec({ ...defaultSpec, safeArea: { edge: 'bottom', fraction: 1.5, reason: 'dialogue-overlay' } })).toBeUndefined();
});

test('StyleDNA schema validates attributes and empty defaults', () => {
  const empty = createEmptyStyleDNA();
  expect(StyleDNASchema.parse(empty)).toBeDefined();

  const animeDNA = parseStyleDNA({
    medium: '2D anime illustration',
    linework: ['precise tapered ink contours'],
    shading: ['flat cel-shaded color regions'],
    rendering: ['consistent facial construction', 'painted background detail'],
    preserve: ['scene-defined lighting and palette'],
    avoidIntent: ['glossy CGI surfaces', 'plastic 3D rendering']
  });
  expect(animeDNA?.medium).toBe('2D anime illustration');
  expect(animeDNA?.linework?.[0]).toBe('precise tapered ink contours');

  // Invalid extra fields or types rejected
  expect(parseStyleDNA({ unexpectedKey: 123 })).toBeUndefined();
});

test('PromptDocument schema validates sections, priorities, and assembly', () => {
  const doc = createPromptDocument(
    'flux3-klein',
    [
      { id: 'subjects', priority: 0, required: true, compressible: false, text: 'Marseline standing at the counter.' },
      { id: 'environment', priority: 1, required: true, compressible: true, text: 'A rustic sunlit pottery studio.' },
      { id: 'style', priority: 2, required: false, compressible: true, text: 'Crisp anime illustration.' }
    ],
    [],
    { layout_boxes: [] },
    ['Dialect advice']
  );

  expect(PromptDocumentSchema.parse(doc)).toBeDefined();
  expect(assemblePromptSections(doc.sections)).toContain('Marseline standing at the counter.');
  expect(assemblePromptSections(doc.sections)).toContain('A rustic sunlit pottery studio.');

  // Priority outside 0..3 rejected
  expect(() => PromptDocumentSchema.parse({
    ...doc,
    sections: [{ id: 'bad', priority: 5, required: true, compressible: false, text: 'invalid' }]
  })).toThrow();
});

test('ImagePromptMetadataSchema preserves backward compatibility with V1 records and supports V2 fields', () => {
  const v1Record = {
    template: templateSnapshot(BUILTIN_IMAGE_TEMPLATES[0]!),
    selectionReason: 'Story beat',
    format: 'description',
    brief: {
      scene: 'The kitchen',
      subjects: 'Nadine Pruitt',
      action: 'Holding a colander',
      composition: 'Eye level',
      lighting: 'Dim rain light',
      subjectMode: 'one',
      framing: 'portrait',
      referencePolicy: 'character',
      sources: ['Story'],
      conflicts: []
    },
    trackerStatus: 'not_found'
  };

  // V1 record parses cleanly
  const parsedV1 = ImagePromptMetadataSchema.parse(v1Record);
  expect(parsedV1.template.id).toBe('portrait');
  expect(parsedV1.promptEngineVersion).toBeUndefined();

  // V2 record with optional fields parses cleanly
  const v2Record = {
    ...v1Record,
    promptEngineVersion: 2,
    promptDialect: 'flux3-klein',
    serializerRevision: '2026.10-rev1',
    shotSpec: createDefaultShotSpec(),
    styleSnapshot: createEmptyStyleDNA({ medium: 'anime' }),
    outputPlan: resolveImageOutputPlan({ requestedRatio: '1:1', modelId: 'flux3-klein' }),
    budgetSummary: {
      complexity: 'standard',
      softRange: [900, 1800] as [number, number],
      hardLimit: 3000,
      finalCharacters: 1250
    }
  };

  const parsedV2 = ImagePromptMetadataSchema.parse(v2Record);
  expect(parsedV2.promptEngineVersion).toBe(2);
  expect(parsedV2.promptDialect).toBe('flux3-klein');
  expect(parsedV2.shotSpec?.camera.shotSize).toBe('medium');
});

test('V1 resolveImagePromptProfile remains completely functional and untouched', () => {
  const v1Flux = resolveImagePromptProfile('nanogpt', 'flux-schnell');
  expect(v1Flux.version).toBe(1);
  expect(v1Flux.family).toBe('flux');
  expect(v1Flux.maxCharacters).toBe(3000);

  const v1ZImage = resolveImagePromptProfile('nanogpt', 'z-image-turbo');
  expect(v1ZImage.negativeMode).toBe('positive-only');
});
