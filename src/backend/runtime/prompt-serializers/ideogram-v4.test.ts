import { describe, expect, test } from 'bun:test';
import { serializeIdeogramV4, extractIdeogramPalette } from './ideogram-v4.js';
import { resolveImagePromptProfileV2 } from '../../../shared/image-prompt-profile-v2.js';
import { compileModelPrompt } from '../model-prompt-compiler.js';
import type { VisualBrief } from '../../../shared/image-templates.js';
import type { StyleDNA } from '../../../shared/style-dna.js';
import type { ImageShotSpec } from '../../../shared/image-shot-spec.js';
import { resolveShotSpec } from '../shot-director.js';
import { resolveImageOutputPlan } from '../image-output-plan.js';

describe('Ideogram V4 Native Prompting Engine', () => {
  const baseBrief: VisualBrief = {
    scene: 'A rain-soaked cobblestone alleyway in Victorian London with brass streetlamps and brick walls.',
    subjects: 'Marseline Vane: silver hair, violet eyes, athletic build, wearing a heavy charcoal wool coat',
    action: "standing near the entrance of a tavern reading a sign 'THE BLACK CROW'",
    composition: 'upper body portrait; eye-level view; one visible character; keep the lower quarter clear for dialogue',
    lighting: 'warm amber gaslight reflecting on wet cobblestones against deep indigo night shadows',
    subjectMode: 'one',
    framing: 'portrait',
    referencePolicy: 'character',
    sources: ['scene context'],
    conflicts: [],
    subjectPreparation: {
      name: 'Marseline Vane',
      identity: 'silver hair, violet eyes, athletic build',
      identitySource: 'saved appearance',
      attire: 'heavy charcoal wool coat',
      attireSource: 'picture cue',
      direction: 'reading tavern sign',
      shortened: false,
      subjectsInPositive: true,
      subjectsInNegative: false
    }
  };

  const outputPlan = resolveImageOutputPlan({ modelId: 'ideogram/v4/instant', requestedRatio: '9:16' });
  const shotSpec: ImageShotSpec = resolveShotSpec({ brief: baseBrief, outputPlan });

  test('extractIdeogramPalette returns 4 to 6 uppercase hex codes matching atmosphere', () => {
    const palette = extractIdeogramPalette(baseBrief);
    expect(palette.length).toBeGreaterThanOrEqual(4);
    expect(palette.length).toBeLessThanOrEqual(6);
    for (const hex of palette) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  test('Direct JSON Mode outputs minified valid JSON with no markdown fences and exact key ordering', () => {
    const profile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant');
    const result = compileModelPrompt({
      brief: baseBrief,
      shotSpec,
      styleDNA: {},
      outputPlan,
      profile
    });

    // 1. Must start with { and end with } with zero markdown fences
    expect(result.prompt.startsWith('{')).toBe(true);
    expect(result.prompt.endsWith('}')).toBe(true);
    expect(result.prompt.includes('```')).toBe(false);

    // 2. Must parse as valid JSON
    const parsed = JSON.parse(result.prompt);
    expect(parsed).toBeObject();

    // 3. Exact top-level key order
    const topKeys = Object.keys(parsed);
    expect(topKeys).toEqual(['high_level_description', 'style_description', 'compositional_deconstruction']);

    // 4. Style description keys
    const styleKeys = Object.keys(parsed.style_description);
    expect(styleKeys).toContain('aesthetics');
    expect(styleKeys).toContain('lighting');
    expect(styleKeys).toContain('medium');
    expect(styleKeys).toContain('color_palette');

    // 5. Compositional deconstruction has background and 4-6 elements
    const decomp = parsed.compositional_deconstruction;
    expect(decomp.background).toBeString();
    expect(decomp.elements).toBeArray();
    expect(decomp.elements.length).toBeGreaterThanOrEqual(4);
    expect(decomp.elements.length).toBeLessThanOrEqual(6);

    // 6. Each element has valid bounding box coordinates [y_min, x_min, y_max, x_max]
    for (const el of decomp.elements) {
      expect(['obj', 'text']).toContain(el.type);
      expect(el.bbox).toHaveLength(4);
      expect(el.bbox[0]).toBeGreaterThanOrEqual(0);
      expect(el.bbox[2]).toBeLessThanOrEqual(1000);
      expect(el.bbox[0]).toBeLessThanOrEqual(el.bbox[2]); // y_min <= y_max
      expect(el.bbox[1]).toBeLessThanOrEqual(el.bbox[3]); // x_min <= x_max
      expect(el.color_palette).toBeArray();
      for (const hex of el.color_palette) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      }
    }

    // 7. Single-branch positive only (no negative prompt)
    expect(result.negativePrompt).toBeUndefined();
  });

  test('Direct JSON extracts quoted text into a text element', () => {
    const profile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant');
    const result = compileModelPrompt({
      brief: baseBrief,
      shotSpec,
      styleDNA: {},
      outputPlan,
      profile
    });

    const parsed = JSON.parse(result.prompt);
    const textElement = parsed.compositional_deconstruction.elements.find((e: any) => e.type === 'text');
    expect(textElement).toBeDefined();
    expect(textElement.text).toBe('THE BLACK CROW');
  });

  test('Ensemble shot separates multiple characters spatially into distinct bounding boxes', () => {
    const ensembleBrief: VisualBrief = {
      ...baseBrief,
      subjectMode: 'ensemble',
      framing: 'wide',
      subjects: 'Marseline Vane: silver hair, violet eyes, wearing charcoal coat\nAleister: black hair, amber eyes, wearing tailored suit',
      action: 'Marseline and Aleister conferring over an ancient map at the table'
    };

    const profile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant');
    const result = compileModelPrompt({
      brief: ensembleBrief,
      shotSpec,
      styleDNA: {},
      outputPlan,
      profile
    });

    const parsed = JSON.parse(result.prompt);
    const elements = parsed.compositional_deconstruction.elements;
    const marseline = elements.find((e: any) => e.desc && e.desc.includes('Marseline'));
    const aleister = elements.find((e: any) => e.desc && e.desc.includes('Aleister'));

    expect(marseline).toBeDefined();
    expect(aleister).toBeDefined();
    // Distinct horizontal positions
    expect(marseline.bbox[1]).not.toEqual(aleister.bbox[1]);
    expect(marseline.desc).toContain('charcoal coat');
    expect(aleister.desc).toContain('tailored suit');

    // High level description includes character DNA traits and attire, not just bare names
    expect(parsed.high_level_description).toContain('Marseline Vane (silver hair, violet eyes, wearing charcoal coat)');
    expect(parsed.high_level_description).toContain('Aleister (black hair, amber eyes, wearing tailored suit)');
  });

  test('Structured Plain-Text Mode follows the 6-part formula with color palette', () => {
    const profile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant', {
      ideogramPromptMode: 'structured-prose'
    });

    const result = compileModelPrompt({
      brief: baseBrief,
      shotSpec,
      styleDNA: {},
      outputPlan,
      profile
    });

    expect(result.prompt.startsWith('{')).toBe(false);
    expect(result.prompt).toContain('Marseline Vane');
    expect(result.prompt).toContain('charcoal wool coat');
    expect(result.prompt).toContain('color palette #');
    expect(result.prompt).toContain("'THE BLACK CROW'");
    expect(result.negativePrompt).toBeUndefined();
  });

  test('ideogramPromptMode controls mode selection cleanly', () => {
    // 1. Auto mode with Ideogram model -> Direct JSON
    const autoProfile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant', {
      ideogramPromptMode: 'auto'
    });
    expect(autoProfile.dialect).toBe('ideogram-v4');
    expect(autoProfile.ideogramMode).toBe('json');

    // 2. Off mode with Ideogram model -> generic prose
    const offProfile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant', {
      ideogramPromptMode: 'off'
    });
    expect(offProfile.dialect).toBe('generic-prose');

    // 3. Forced JSON mode with a generic model (e.g. FLUX) -> ideogram-v4 JSON
    const forcedJson = resolveImagePromptProfileV2('nanogpt', 'flux-schnell', {
      ideogramPromptMode: 'json'
    });
    expect(forcedJson.dialect).toBe('ideogram-v4');
    expect(forcedJson.ideogramMode).toBe('json');

    // 4. Forced structured-prose with a generic model -> ideogram-v4 structured-prose
    const forcedProse = resolveImagePromptProfileV2('nanogpt', 'flux-schnell', {
      ideogramPromptMode: 'structured-prose'
    });
    expect(forcedProse.dialect).toBe('ideogram-v4');
    expect(forcedProse.ideogramMode).toBe('structured-prose');
  });

  test('Style prompts, prefix, suffix, and named palettes are seamlessly integrated into Ideogram', () => {
    const customStyle: StyleDNA = {
      prefix: 'masterpiece visual novel key visual',
      suffix: 'dramatic rim light, high contrast volumetric fog',
      medium: 'dark fantasy anime illustration',
      palette: ['crimson and gold', 'obsidian black']
    };

    const profile = resolveImagePromptProfileV2('nanogpt', 'ideogram/v4/instant');
    const result = compileModelPrompt({
      brief: baseBrief,
      shotSpec,
      outputPlan,
      profile,
      styleDNA: customStyle
    });

    // 1. Result must still be valid JSON
    expect(result.prompt.startsWith('{')).toBe(true);
    const parsed = JSON.parse(result.prompt);

    // 2. High level incorporates prefix and medium
    expect(parsed.high_level_description).toContain('masterpiece visual novel key visual');
    expect(parsed.high_level_description).toContain('dark fantasy anime illustration');

    // 3. Style description incorporates aesthetics, art_style and suffix
    expect(parsed.style_description.art_style).toContain('dark fantasy anime illustration style');
    expect(parsed.style_description.art_style).toContain('dramatic rim light, high contrast volumetric fog');

    // 4. Palette extracts crimson (#991B1B) and gold (#D97706)
    expect(parsed.style_description.color_palette).toContain('#991B1B');
    expect(parsed.style_description.color_palette).toContain('#D97706');
  });
});
