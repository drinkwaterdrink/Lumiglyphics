import { describe, it, expect } from 'bun:test';
import { serializeFlux3Klein } from './flux3-klein.js';
import type { SerializerInput } from './types.js';
import type { VisualBrief } from '../../../shared/image-templates.js';
import { createDefaultShotSpec } from '../../../shared/image-shot-spec.js';
import type { ImageShotSpec } from '../../../shared/image-shot-spec.js';
import type { StyleDNA } from '../../../shared/style-dna.js';
import type { ImagePromptProfileV2 } from '../../../shared/image-prompt-profile-v2.js';
import { createReferencePlan } from '../../../shared/reference-plan.js';

function createMockInput(overrides: Partial<SerializerInput> = {}): SerializerInput {
  const brief: VisualBrief = {
    scene: 'Rainy library with brass lamps and mahogany desks; evening; gentle rain against windows.',
    subjects: 'Aleister Crowley: 18-year-old 5\'11" broad-shouldered man with pale skin, strawberry-blonde hair, glacial blue eyes; wearing a tailored dark coat',
    action: 'reading an open grimoire beside the window',
    composition: 'medium shot, eye level',
    lighting: 'warm amber lamplight mixed with cool rainy twilight',
    subjectMode: 'one',
    framing: 'portrait',
    referencePolicy: 'character',
    sources: ['scene context'],
    conflicts: [],
    subjectPreparation: {
      name: 'Aleister Crowley',
      identity: '18-year-old 5\'11" broad-shouldered man with pale skin, strawberry-blonde hair, glacial blue eyes',
      identitySource: 'saved appearance',
      attire: 'tailored dark coat',
      attireSource: 'picture cue',
      direction: 'reading an open grimoire beside the window',
      shortened: false,
      subjectsInPositive: true,
      subjectsInNegative: false
    }
  };

  const shotSpec = createDefaultShotSpec({
    camera: {
      shotSize: 'medium',
      angle: 'eye-level',
      lens: 'wide',
      depthOfField: 'deep'
    }
  });

  const styleDNA: StyleDNA = {
    medium: 'candid handheld smartphone photograph',
    prefix: 'Candid handheld smartphone snapshot taken at eye-level'
  };

  const profile: ImagePromptProfileV2 = {
    version: 2,
    exactModel: 'blackforestlabs/flux-3/klein/text-to-image',
    dialect: 'flux3-klein',
    family: 'flux',
    capabilitySource: 'catalogue',
    hardMaxCharacters: 10000,
    softBudgets: {
      simple: [900, 1800],
      standard: [1200, 2200],
      complex: [1600, 2600],
      dense: [1800, 3000]
    },
    negativePolicy: 'positive-only',
    features: {
      references: true,
      layoutBoxes: true,
      exactText: true
    },
    outputCapabilities: {
      sizes: ['832x1216'],
      ratios: ['9:16', '16:9', '1:1']
    },
    serializerRevision: '2026.10-rev1'
  };

  return {
    brief,
    shotSpec,
    styleDNA,
    profile,
    referencePlan: createReferencePlan([]),
    complexity: 'standard',
    outputPlan: {
      orientation: 'portrait',
      actualRatio: '9:16',
      parameters: {},
      source: 'catalogue',
      summary: '',
      warnings: []
    },
    ...overrides
  };
}

describe('FLUX.3 Image Klein Native Prompting Engine', () => {
  it('opens with BFL medium prefix and bans the word photorealistic for real photos', () => {
    const input = createMockInput();
    const result = serializeFlux3Klein(input);

    expect(result.prompt).toMatch(/^(?:Full-color|Candid|Studio|Close-up)/i);
    expect(result.prompt.toLowerCase()).not.toContain('photorealistic');
  });

  it('strictly suppresses negative prompts (positive-only)', () => {
    const input = createMockInput();
    const result = serializeFlux3Klein(input);

    expect(result.negativePrompt).toBeUndefined();
  });

  it('generates NanoGPT Layout boxes (JSON) with 0.0-1.0 decimal coordinates and cites labels with angle brackets', () => {
    const input = createMockInput();
    const result = serializeFlux3Klein(input);

    expect(result.parameterHints?.layout_boxes).toBeDefined();
    const boxes = result.parameterHints!.layout_boxes as Array<{
      label: string;
      description: string;
      box: { x_min: number; y_min: number; x_max: number; y_max: number };
    }>;

    expect(boxes.length).toBeGreaterThan(0);
    const box = boxes[0]!.box;
    expect(box.x_min).toBeGreaterThanOrEqual(0);
    expect(box.x_min).toBeLessThanOrEqual(1);
    expect(box.y_max).toBeGreaterThanOrEqual(0);
    expect(box.y_max).toBeLessThanOrEqual(1);

    // Prompt cites <label>
    expect(result.prompt).toContain(`<${boxes[0]!.label}>`);
  });

  it('enforces Black Forest Labs typography lock: double quotes followed by the only text in the scene', () => {
    const input = createMockInput();
    input.brief.action = 'standing in front of a bookstore window sign reading "NIGHT OWL"';
    const result = serializeFlux3Klein(input);

    expect(result.prompt).toContain('"NIGHT OWL", the only text in the scene');
  });

  it('enforces 1/6th Background Rule: describes background as shapes, silhouettes, and lighting', () => {
    const input = createMockInput();
    const result = serializeFlux3Klein(input);

    expect(result.prompt).toContain('In the background,');
    expect(result.prompt).toMatch(/silhouettes|environmental shapes/i);
  });

  it('protects attire so characters are never left unclothed', () => {
    const input = createMockInput();
    input.brief.subjectPreparation!.attire = 'charcoal wool coat over button-down shirt';
    const result = serializeFlux3Klein(input);

    expect(result.prompt).toContain('wearing charcoal wool coat over button-down shirt');
  });

  it('sanitizes height notation like 5\'11" to 5 ft 11 in and prevents unescaped quotes', () => {
    const input = createMockInput();
    const result = serializeFlux3Klein(input);

    expect(result.prompt).toContain('5 ft 11 in');
    expect(result.prompt).not.toMatch(/5'11"/);
  });

  it('handles ensemble scene with frame-relative spatial anchors for multiple characters', () => {
    const input = createMockInput();
    input.brief.subjectMode = 'ensemble';
    input.brief.subjects = 'Aleister: strawberry-blonde hair; wearing dark coat\nMarseline: black raven hair; wearing crimson gown';
    const result = serializeFlux3Klein(input);

    expect(result.prompt).toContain('Frame-left in the foreground');
    expect(result.prompt).toContain('Frame-right in the foreground');
    expect(result.prompt).toContain('Aleister');
    expect(result.prompt).toContain('Marseline');
  });
});
