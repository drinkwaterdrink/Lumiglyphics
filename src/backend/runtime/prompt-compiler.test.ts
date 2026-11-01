import { describe, it, expect } from 'bun:test';
import { compileModelPrompt } from './model-prompt-compiler.js';
import { classifySceneComplexity, resolveUsefulPromptBudget } from './prompt-budget.js';
import { fitPromptDocumentToBudget } from './prompt-fit-v2.js';
import { lintCompiledPrompt } from './prompt-lint.js';
import { resolveImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import { resolveImageOutputPlan } from './image-output-plan.js';
import { resolveShotSpec } from './shot-director.js';
import { resolveStyleDNA } from '../../shared/style-dna.js';
import { createReferencePlan } from '../../shared/reference-plan.js';
import { createPromptDocument } from '../../shared/prompt-document.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import { DEFAULT_CONFIG } from '../../config.js';

function createMockBrief(overrides: Partial<VisualBrief> = {}): VisualBrief {
  return {
    scene: 'Old stone library, towering oak shelves, dust motes floating in afternoon light',
    subjects: 'Marseline: silver-white hair, violet eyes, slender build; wearing a dark velvet scholar coat',
    action: 'reading an ancient leather-bound grimoire at a wooden study desk',
    composition: 'medium shot; eye-level view; one visible character; keep the lower quarter clear for dialogue',
    lighting: 'warm amber afternoon sunlight streaming through stained glass',
    subjectMode: 'one',
    framing: 'portrait',
    referencePolicy: 'character',
    sources: ['scene context'],
    conflicts: [],
    subjectPreparation: {
      name: 'Marseline',
      identity: 'silver-white hair, violet eyes, slender build',
      identitySource: 'saved appearance',
      attire: 'dark velvet scholar coat',
      attireSource: 'picture cue',
      direction: 'focused on reading',
      shortened: false,
      subjectsInPositive: true,
      subjectsInNegative: false
    },
    ...overrides
  };
}

describe('Model-Aware Prompt Engine v2: Compiler & Budgeting', () => {
  it('classifies scene complexity accurately', () => {
    const simpleBrief = createMockBrief({
      subjectMode: 'none',
      action: 'A single brass key resting on a wooden table',
      scene: 'Wooden table surface',
      lighting: 'Candlelight'
    });
    expect(classifySceneComplexity({ brief: simpleBrief })).toBe('simple');

    const standardBrief = createMockBrief();
    expect(classifySceneComplexity({ brief: standardBrief })).toBe('standard');

    const complexBrief = createMockBrief({
      subjectMode: 'ensemble',
      subjects: 'Marseline: silver hair\nRoland: scarred warrior in steel plate',
      action: 'clashing steel blades in a desperate duel'
    });
    expect(classifySceneComplexity({ brief: complexBrief })).toBe('complex');

    const denseBrief = createMockBrief({
      subjectMode: 'ensemble',
      subjects: 'A: red hair\nB: blue hair\nC: blonde hair\nD: dark hair\nE: green hair',
      action: 'celebrating a banquet'
    });
    expect(classifySceneComplexity({ brief: denseBrief })).toBe('dense');
  });

  it('resolves useful prompt budget with safe headroom and model-specific heuristics', () => {
    const kleinProfile = resolveImagePromptProfileV2('nanogpt', 'blackforestlabs/flux-3/klein/text-to-image');
    const budget = resolveUsefulPromptBudget(kleinProfile, 'standard');
    expect(budget.softRange[0]).toBeGreaterThanOrEqual(900);
    expect(budget.softRange[1]).toBeLessThanOrEqual(kleinProfile.hardMaxCharacters);
    expect(budget.hardLimit).toBe(kleinProfile.hardMaxCharacters);

    // Qwen 3 expansion-on has a compact budget
    const qwenProfile = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3-pro');
    const qwenBudget = resolveUsefulPromptBudget(qwenProfile, 'simple', true);
    expect(qwenBudget.softRange[1]).toBeLessThanOrEqual(750);

    // User manual budget override is authoritative up to hard limit
    const overridden = resolveUsefulPromptBudget(kleinProfile, 'standard', false, 1500);
    expect(overridden.maxTarget).toBe(1500);
    expect(overridden.userOverrideApplied).toBe(true);
  });

  it('priority-aware budget fitting drops P3 before P2 and preserves P0 identity anchors', () => {
    const doc = createPromptDocument('flux3-klein', [
      { id: 'identity', priority: 0, required: true, compressible: false, text: 'Marseline with silver-white hair and violet eyes in a velvet coat' },
      { id: 'camera', priority: 1, required: false, compressible: true, text: 'Captured in medium-shot eye-level framing' },
      { id: 'style', priority: 2, required: false, compressible: true, text: 'Rendered in fine cel-shaded linework with soft painted textures' },
      { id: 'fluff', priority: 3, required: false, compressible: true, text: 'A breathtakingly beautiful, hyperdetailed, stunning artistic masterpiece' }
    ]);

    // Fit to a budget that requires dropping P3
    const fitted = fitPromptDocumentToBudget(doc, 180);
    expect(fitted.fitted).toBe(true);
    expect(fitted.prompt).toContain('Marseline');
    expect(fitted.prompt).not.toContain('masterpiece');
  });

  it('compiles FLUX.3 Klein prompt as a full descriptive caption', () => {
    const brief = createMockBrief();
    const profile = resolveImagePromptProfileV2('nanogpt', 'blackforestlabs/flux-3/klein/text-to-image');
    const outputPlan = resolveImageOutputPlan({ capabilities: profile.outputCapabilities, source: 'catalogue', modelId: profile.exactModel });
    const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
    const shotSpec = resolveShotSpec({ brief, outputPlan, styleDNA: styleSnapshot.styleDNA });

    const result = compileModelPrompt({
      brief,
      shotSpec,
      styleDNA: styleSnapshot.styleDNA,
      profile,
      outputPlan,
      cue: { subjectCategory: 'female' } as any
    });

    expect(result.prompt).toContain('Marseline');
    expect(result.prompt).toContain('silver-white hair');
    expect(result.prompt).toContain('velvet scholar coat');
    expect(result.prompt).not.toContain('masterpiece, best quality');
    expect(result.document.sections.find(s => s.id === 'subject-action')?.priority).toBe(0);
  });

  it('enforces subject-first ordering for Grok Imagine 2.0', () => {
    const brief = createMockBrief();
    const profile = resolveImagePromptProfileV2('nanogpt', 'xai/grok-imagine-image/v2.0/text-to-image');
    const outputPlan = resolveImageOutputPlan({ capabilities: profile.outputCapabilities, source: 'catalogue', modelId: profile.exactModel });
    const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
    const shotSpec = resolveShotSpec({ brief, outputPlan, styleDNA: styleSnapshot.styleDNA });

    const result = compileModelPrompt({
      brief,
      shotSpec,
      styleDNA: styleSnapshot.styleDNA,
      profile,
      outputPlan,
      cue: { subjectCategory: 'female' } as any
    });

    // Subject must appear at the beginning of the prompt, not preceded by style words
    expect(result.prompt).toMatch(/^(One visible woman|One visible person|One visible character|Marseline)/i);
    expect(result.prompt).not.toMatch(/^(cinematic|masterpiece|anime illustration|atmospheric)/i);
  });

  it('compiles GPT Image 2.5 with labeled sections for complex scenes and clean prose for simple scenes', () => {
    const profile = resolveImagePromptProfileV2('nanogpt', 'openai/gpt-image-2.5/flare/text-to-image');
    const outputPlan = resolveImageOutputPlan({ capabilities: profile.outputCapabilities, source: 'catalogue', modelId: profile.exactModel });
    const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);

    // Simple scene -> clean natural prose without forced headings
    const simpleBrief = createMockBrief({ subjectMode: 'none', action: 'Ancient golden coin', scene: 'Velvet cushion' });
    const simpleShot = resolveShotSpec({ brief: simpleBrief, outputPlan, styleDNA: styleSnapshot.styleDNA });
    const simpleResult = compileModelPrompt({
      brief: simpleBrief,
      shotSpec: simpleShot,
      styleDNA: styleSnapshot.styleDNA,
      profile,
      outputPlan
    });
    expect(simpleResult.prompt).not.toContain('SUBJECTS\n');

    // Complex ensemble scene -> structured labeled sections
    const complexBrief = createMockBrief({
      subjectMode: 'ensemble',
      subjects: 'Marseline: silver hair\nRoland: scarred knight in plate',
      action: 'confronting each other in the library hall'
    });
    const complexShot = resolveShotSpec({ brief: complexBrief, outputPlan, styleDNA: styleSnapshot.styleDNA });
    const complexResult = compileModelPrompt({
      brief: complexBrief,
      shotSpec: complexShot,
      styleDNA: styleSnapshot.styleDNA,
      profile,
      outputPlan
    });
    expect(complexResult.prompt).toContain('SUBJECTS');
    expect(complexResult.prompt).toContain('MOMENT');
    expect(complexResult.prompt).toContain('COMPOSITION');
  });

  it('compiles Qwen Image 3 with native negative prompt and respects prompt expansion', () => {
    const brief = createMockBrief();
    const profile = resolveImagePromptProfileV2('nanogpt', 'qwen-image-3-pro');
    const outputPlan = resolveImageOutputPlan({ capabilities: profile.outputCapabilities, source: 'catalogue', modelId: profile.exactModel });
    const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
    const shotSpec = resolveShotSpec({ brief, outputPlan, styleDNA: styleSnapshot.styleDNA });

    const result = compileModelPrompt({
      brief,
      shotSpec,
      styleDNA: styleSnapshot.styleDNA,
      profile,
      outputPlan,
      promptExpansionEnabled: true
    });

    expect(result.negativePrompt).toBeDefined();
    expect(result.negativePrompt?.length).toBeGreaterThan(5);
    // Compact prompt when expansion is on
    expect(result.prompt.length).toBeLessThan(800);
  });

  it('compiles Anima with tag-first hybrid syntax', () => {
    const brief = createMockBrief();
    const profile = resolveImagePromptProfileV2('nanogpt', 'anima/text-to-image');
    const outputPlan = resolveImageOutputPlan({ capabilities: profile.outputCapabilities, source: 'catalogue', modelId: profile.exactModel });
    const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
    const shotSpec = resolveShotSpec({ brief, outputPlan, styleDNA: styleSnapshot.styleDNA });

    const result = compileModelPrompt({
      brief,
      shotSpec,
      styleDNA: styleSnapshot.styleDNA,
      profile,
      outputPlan,
      cue: { subjectCategory: 'female' } as any
    });

    expect(result.prompt).toContain(',');
    expect(result.prompt).toContain('1girl');
    expect(result.prompt).toContain('solo');
    expect(result.negativePrompt).toBeDefined();
  });

  it('prompt linter flags unattached references and hard limit violations', () => {
    const brief = createMockBrief();
    const profile = resolveImagePromptProfileV2('nanogpt', 'blackforestlabs/flux-3/klein/text-to-image');
    const outputPlan = resolveImageOutputPlan({ capabilities: profile.outputCapabilities, source: 'catalogue', modelId: profile.exactModel });
    const styleSnapshot = resolveStyleDNA(DEFAULT_CONFIG);
    const shotSpec = resolveShotSpec({ brief, outputPlan, styleDNA: styleSnapshot.styleDNA });
    const doc = createPromptDocument('flux3-klein');

    const lintBadRef = lintCompiledPrompt({
      prompt: 'A portrait of Marseline, use reference image 1 for her face.',
      document: doc,
      profile,
      brief,
      shotSpec,
      referencePlan: createReferencePlan([]) // Empty!
    });
    expect(lintBadRef.warnings.some(w => w.includes('no reference images are attached'))).toBe(true);

    const lintLimit = lintCompiledPrompt({
      prompt: 'A'.repeat(profile.hardMaxCharacters + 50),
      document: doc,
      profile,
      brief,
      shotSpec
    });
    expect(lintLimit.valid).toBe(false);
    expect(lintLimit.errors.some(e => e.includes('Hard prompt character limit exceeded'))).toBe(true);
  });
});
