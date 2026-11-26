import { expect, test } from 'bun:test';
import { DEFAULT_CONFIG } from '../../config.js';
import { adaptImagePrompt } from './prompt-adaptation.js';
import { compileModelPrompt } from './model-prompt-compiler.js';
import { buildV2ImageRequest } from './v2-request-builder.js';
import { resolveImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import { resolveImageOutputPlan } from '../../shared/image-output-plan.js';
import { resolveShotSpec } from './shot-director.js';
import { BUILTIN_IMAGE_TEMPLATES, templateSnapshot } from '../../shared/image-templates.js';
import { turnViewWithAudio } from './controller.js';
import type { VisualCue } from '../../shared/contracts.js';

test('Wave 5: adaptImagePrompt reads promptProfileV2.hardMaxCharacters before V1 promptProfile', async () => {
  const prompt = 'a'.repeat(3500);
  const v2Profile = resolveImagePromptProfileV2('openai', 'flux3-klein', DEFAULT_CONFIG);
  const res = await adaptImagePrompt(
    {} as any,
    {
      prompt,
      model: 'flux3-klein',
      parameters: {},
      promptProfile: { version: 1, family: 'generic', format: 'description', maxCharacters: 3000, negativeMode: 'supported-or-unknown', source: 'catalogue', guidance: '' },
      promptProfileV2: { ...v2Profile, hardMaxCharacters: 4000, negativePolicy: 'positive-only' },
    },
    undefined,
    DEFAULT_CONFIG,
    'user-1',
    new AbortController().signal,
  );
  // Under 4000 V2 hardMaxCharacters -> must NOT trigger rewrite
  expect(res.rewritten).toBe(false);
  expect(res.request.prompt).toBe(prompt);
});

test('Wave 5: compileModelPrompt injects original-reference when originalReference is enabled', () => {
  const profile = resolveImagePromptProfileV2('novelai', 'nai-diffusion-4', DEFAULT_CONFIG);
  const outputPlan = resolveImageOutputPlan({ modelId: 'nai-diffusion-4' });
  const brief = {
    scene: 'A sunlit conservatory.',
    subjects: 'Orin, dark hair.',
    action: 'Reading a book.',
    composition: 'portrait, one visible character',
    lighting: 'Soft afternoon sun.',
    subjectMode: 'one' as const,
    framing: 'portrait' as const,
    referencePolicy: 'character' as const,
    sources: ['test'],
    conflicts: [],
  };
  const shotSpec = resolveShotSpec({ brief, outputPlan });
  const compiled = compileModelPrompt({
    brief,
    shotSpec,
    styleDNA: {},
    profile,
    outputPlan,
    originalReference: true,
    originalCreationName: 'Lumiglyphics',
  });
  expect(compiled.document.sections.some((s) => s.id === 'original-reference')).toBe(true);
  expect(compiled.prompt).toContain('original');
  expect(compiled.prompt).toContain('Lumiglyphics');
});

test('Wave 5: buildV2ImageRequest consumes Wave 4 preferredAspectRatio, preferredFraming, and gated preferredStyleId', () => {
  const template = templateSnapshot(BUILTIN_IMAGE_TEMPLATES.find((t) => t.id === 'portrait')!);
  const profile = resolveImagePromptProfileV2('openai', 'flux3-klein', DEFAULT_CONFIG);
  const cue: VisualCue = {
    cueId: 'cue-1',
    paragraphIndex: 0,
    sceneId: 's1',
    sceneRevision: 0,
    kind: 'sprite',
    action: null,
    expression: null,
    imageTemplate: template,
    promptDelta: '',
    assetJobId: 'job-1',
    preferredAspectRatio: '16:9',
    preferredFraming: 'wide',
    preferredStyleId: 'builtin-style:noir-chiaroscuro',
  };
  const brief = {
    scene: 'Rainy street.',
    subjects: 'Orin.',
    action: 'Walking.',
    composition: 'wide',
    lighting: 'Neon.',
    subjectMode: 'one' as const,
    framing: 'portrait' as const,
    referencePolicy: 'character' as const,
    sources: ['test'],
    conflicts: [],
  };

  // Style override disabled globally -> ignores preferredStyleId 'noir'
  const builtOff = buildV2ImageRequest({
    config: { ...DEFAULT_CONFIG, presentationRulesAllowStyleOverride: false },
    cue,
    brief,
    request: { prompt: '', model: 'flux3-klein', parameters: {} },
    profile,
    styleId: 'builtin-style:anime',
    shadow: { prompt: '' },
    referenceSummary: 'none',
  });
  expect(builtOff.request.outputPlan?.requestedRatio).toBe('16:9');
  expect(builtOff.request.shotSpec?.camera.shotSize).toBe('wide');
  expect(builtOff.request.styleSnapshot?.medium).not.toContain('noir');

  // Style override enabled globally -> applies preferredStyleId 'noir'
  const builtOn = buildV2ImageRequest({
    config: { ...DEFAULT_CONFIG, presentationRulesAllowStyleOverride: true },
    cue,
    brief,
    request: { prompt: '', model: 'flux3-klein', parameters: {} },
    profile,
    styleId: 'builtin-style:anime',
    shadow: { prompt: '' },
    referenceSummary: 'none',
  });
  expect(builtOn.request.styleSnapshot?.medium?.toLowerCase()).toContain('noir');
});

test('Wave 5: turnViewWithAudio populates replyCost only when showReplyCost is enabled', async () => {
  const makeSpindle = (showReplyCost: boolean) => ({
    userStorage: {
      getJson: async (path: string) => (path === 'config.json' ? { ...DEFAULT_CONFIG, showReplyCost } : null),
    },
  } as any);

  const record: any = {
    plan: {
      key: { chatId: 'c1', assistantMessageId: 'm1', swipeId: 0, sourceFingerprint: 'fp12345678', revision: 0 },
      paragraphs: [{ id: 'p0', text: 'Hello world.' }],
      paragraphSpeakers: [null],
      scenes: [{ sceneId: 's1', revision: 0, startParagraph: 0, cast: [], environment: { location: 'Cafe', timeOfDay: null, weather: null, lighting: null, description: '', persistentElements: [] } }],
      visualCues: [],
      audioCues: [],
      effectCues: [],
      choices: [],
      initialContinuity: { location: 'Cafe', timeOfDay: '', weather: '', lighting: '', attire: {} },
      continuityDeltas: [],
      terminalContinuity: { location: 'Cafe', timeOfDay: '', weather: '', lighting: '', attire: {} },
      planningStatus: 'planned',
      replyUsage: { plannerCalls: 1, systemOneCalls: 0, promptTokens: 1200, completionTokens: 300 },
      createdAt: new Date().toISOString(),
    },
    jobs: [
      { jobId: 'j1', status: 'generated', provider: 'nanogpt' },
      { jobId: 'j2', status: 'generated', provider: 'cache' },
    ],
    assets: {},
  };

  const viewOff = await turnViewWithAudio(makeSpindle(false), record, 'u1');
  expect(viewOff.replyCost).toBeUndefined();

  const viewOn = await turnViewWithAudio(makeSpindle(true), record, 'u1');
  expect(viewOn.replyCost).toEqual({
    usage: { plannerCalls: 1, systemOneCalls: 0, promptTokens: 1200, completionTokens: 300 },
    imagesGenerated: 1,
  });
});
