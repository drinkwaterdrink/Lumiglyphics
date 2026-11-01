import { describe, it, expect } from 'bun:test';
import {
  sceneImageIdentityFor
} from './images.js';
import {
  sceneImageCacheKey,
  sceneIdentityDigest
} from '../core/scene-image-cache.js';
import {
  ImagePromptMetadataSchema,
  templateSnapshot,
  BUILTIN_IMAGE_TEMPLATES,
  type VisualBrief
} from '../../shared/image-templates.js';
import { promptEngineSummary } from '../../frontend/image-review/prepared-brief.js';
import { resolveShotSpec } from './shot-director.js';
import { compileModelPrompt } from './model-prompt-compiler.js';
import { resolveImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import { resolveImageOutputPlan } from './image-output-plan.js';
import { resolveStyleDNA, BUILTIN_STYLE_DNA } from '../../shared/style-dna.js';
import { DEFAULT_CONFIG, type VisualNovelConfig } from '../../config.js';
import type { SceneState, VisualCue } from '../../shared/contracts.js';
import type { ImageRequestRecord } from '../../shared/image-review.js';

describe('Phase 4: Cache Migration, Review UX, Iteration Actions & Finalization', () => {
  const mockScene: SceneState = {
    sceneId: 'scene-1',
    priorSceneId: 'initial',
    environment: {
      location: 'Moonlit Courtyard',
      description: 'Ancient mossy courtyard under the full moon.',
      timeOfDay: 'night',
      weather: 'clear',
      lighting: 'cool silver moonlight',
      persistentElements: ['stone archway', 'mossy flagstones']
    },
    mood: 'mysterious',
    tempo: 'moderate',
    importance: 'normal',
    cast: ['Marseline'],
    activeCharacters: ['Marseline'],
    activeInteractions: [],
    turnCount: 1
  };

  const mockCue: VisualCue = {
    paragraphIndex: 0,
    character: 'Marseline',
    subjectCategory: 'named-character',
    shotHint: 'medium',
    imageTemplate: templateSnapshot(BUILTIN_IMAGE_TEMPLATES[0]!),
    imageTemplateReason: 'Narrative focus'
  };

  it('1. Cache identity migration: differentiates V1 and V2 keys without collision', () => {
    const v1Config: VisualNovelConfig = {
      ...DEFAULT_CONFIG,
      imagePromptEngineVersion: 1,
      imageModel: 'blackforestlabs/flux-3/klein/text-to-image'
    };

    const v2Config: VisualNovelConfig = {
      ...DEFAULT_CONFIG,
      imagePromptEngineVersion: 2,
      imageModel: 'blackforestlabs/flux-3/klein/text-to-image'
    };

    const identityV1 = sceneImageIdentityFor(v1Config, mockScene, mockCue, undefined, 'nanogpt');
    const identityV2 = sceneImageIdentityFor(v2Config, mockScene, mockCue, undefined, 'nanogpt');

    expect(identityV1.promptEngineVersion).toBeUndefined();
    expect(identityV2.promptEngineVersion).toBe(2);
    expect(identityV2.serializerRevision).toBeDefined();
    expect(identityV2.shotSpecDigest).toBeDefined();
    expect(identityV2.styleDnaDigest).toBeDefined();
    expect(identityV2.outputPlanDigest).toBeDefined();

    const keyV1 = sceneImageCacheKey(identityV1);
    const keyV2 = sceneImageCacheKey(identityV2);

    expect(keyV1).not.toBe(keyV2);
    expect(sceneIdentityDigest(identityV1)).not.toBe(sceneIdentityDigest(identityV2));
  });

  it('2. ImagePromptMetadataSchema non-destructively supports warnings, references, and shadow prompt', () => {
    const v1Record = {
      template: templateSnapshot(BUILTIN_IMAGE_TEMPLATES[0]!),
      selectionReason: 'Story beat',
      format: 'description' as const,
      brief: {
        scene: 'The kitchen',
        subjects: 'Nadine Pruitt',
        action: 'Holding a colander',
        composition: 'Eye level',
        lighting: 'Dim rain light',
        subjectMode: 'one' as const,
        framing: 'portrait' as const,
        referencePolicy: 'character' as const,
        sources: ['Story'],
        conflicts: []
      },
      trackerStatus: 'not_found' as const
    };

    // V1 parses cleanly
    const parsedV1 = ImagePromptMetadataSchema.parse(v1Record);
    expect(parsedV1.template.id).toBe('portrait');
    expect(parsedV1.shadowPrompt).toBeUndefined();
    expect(parsedV1.promptLintWarnings).toBeUndefined();

    // V2 with extended metadata parses cleanly
    const v2Record = {
      ...v1Record,
      promptEngineVersion: 2 as const,
      promptDialect: 'flux3-klein',
      promptLintWarnings: ['Negative prompt omitted for FLUX.3 positive-only route.'],
      referenceSummary: 'captured portrait: Nadine Pruitt (img_123)',
      shadowPrompt: {
        v1Prompt: 'A portrait of Nadine Pruitt holding a colander in the kitchen.',
        v1NegativePrompt: 'low quality, blurry',
        v2Prompt: 'Nadine Pruitt holding a colander in a dim kitchen under rain light.',
        v2NegativePrompt: undefined
      }
    };

    const parsedV2 = ImagePromptMetadataSchema.parse(v2Record);
    expect(parsedV2.promptEngineVersion).toBe(2);
    expect(parsedV2.promptLintWarnings).toHaveLength(1);
    expect(parsedV2.referenceSummary).toContain('captured portrait: Nadine Pruitt');
    expect(parsedV2.shadowPrompt?.v1Prompt).toContain('A portrait of Nadine Pruitt');
    expect(parsedV2.shadowPrompt?.v2Prompt).toContain('Nadine Pruitt holding a colander');
  });

  it('3. Reframe iteration action increments revision and alternates composition', () => {
    const brief: VisualBrief = {
      scene: 'Sunlit library courtyard',
      subjects: 'Marseline: silver braided hair in scholar robes',
      action: 'studying an ancient illuminated tome',
      composition: 'medium; eye-level',
      lighting: 'soft morning sunlight',
      subjectMode: 'one',
      framing: 'medium',
      referencePolicy: 'character',
      sources: ['library scene'],
      conflicts: []
    };

    const outputPlan = resolveImageOutputPlan({
      requestedRatio: '1:1',
      modelId: 'blackforestlabs/flux-3/klein/text-to-image'
    });

    const shot0 = resolveShotSpec({
      brief,
      outputPlan,
      revision: 0
    });

    const shot1 = resolveShotSpec({
      brief,
      outputPlan,
      revision: 1
    });

    expect(shot0.revision).toBe(0);
    expect(shot1.revision).toBe(1);
    // Revision changes the deterministic seed, altering composition or camera parameters
    expect(`${shot0.camera.shotSize}:${shot0.camera.angle}:${shot0.composition.mode}:${shot0.revision}`)
      .not.toBe(`${shot1.camera.shotSize}:${shot1.camera.angle}:${shot1.composition.mode}:${shot1.revision}`);
  });

  it('4. Manual Camera Overrides set source to "manual" and respect user controls', () => {
    const brief: VisualBrief = {
      scene: 'Sunlit library courtyard',
      subjects: 'Marseline: silver braided hair in scholar robes',
      action: 'studying an ancient illuminated tome',
      composition: 'medium; eye-level',
      lighting: 'soft morning sunlight',
      subjectMode: 'one',
      framing: 'medium',
      referencePolicy: 'character',
      sources: ['library scene'],
      conflicts: []
    };

    const outputPlan = resolveImageOutputPlan({
      requestedRatio: '1:1',
      modelId: 'blackforestlabs/flux-3/klein/text-to-image'
    });

    const manualShot = resolveShotSpec({
      brief,
      outputPlan,
      manualOverrides: {
        shotSize: 'extreme-close-up',
        angle: 'low-angle',
        lens: 'telephoto',
        mode: 'symmetrical',
        depthOfField: 'shallow',
        safeArea: { edge: 'bottom', fraction: 0.25, reason: 'dialogue-overlay' }
      }
    });

    expect(manualShot.source).toBe('manual');
    expect(manualShot.camera.shotSize).toBe('extreme-close-up');
    expect(manualShot.camera.angle).toBe('low-angle');
    expect(manualShot.camera.lens).toBe('telephoto');
    expect(manualShot.composition.mode).toBe('symmetrical');
    expect(manualShot.camera.depthOfField).toBe('shallow');
    expect(manualShot.safeArea?.edge).toBe('bottom');
  });

  it('5. Change Style recompiles StyleDNA while preserving scene facts and ShotSpec', () => {
    const brief: VisualBrief = {
      scene: 'Sunlit library courtyard',
      subjects: 'Marseline: silver braided hair in scholar robes',
      action: 'studying an ancient illuminated tome',
      composition: 'medium; eye-level',
      lighting: 'soft morning sunlight',
      subjectMode: 'one',
      framing: 'medium',
      referencePolicy: 'character',
      sources: ['library scene'],
      conflicts: []
    };

    const profile = resolveImagePromptProfileV2('nanogpt', 'openai/gpt-image-2.5/flare/text-to-image');
    const outputPlan = resolveImageOutputPlan({ requestedRatio: '1:1', modelId: profile.exactModel });
    const shotSpec = resolveShotSpec({ brief, outputPlan });

    const animeStyle = resolveStyleDNA(DEFAULT_CONFIG, 'builtin-style:anime');
    const photoStyle = resolveStyleDNA(DEFAULT_CONFIG, 'builtin-style:photoreal');

    const animePrompt = compileModelPrompt({
      brief,
      shotSpec,
      styleDNA: animeStyle.styleDNA,
      profile,
      outputPlan
    });

    const photoPrompt = compileModelPrompt({
      brief,
      shotSpec,
      styleDNA: photoStyle.styleDNA,
      profile,
      outputPlan
    });

    // Both retain scene facts and character
    expect(animePrompt.prompt).toContain('Marseline');
    expect(animePrompt.prompt).toContain('ancient illuminated tome');
    expect(photoPrompt.prompt).toContain('Marseline');
    expect(photoPrompt.prompt).toContain('ancient illuminated tome');

    // Distinct styles
    expect(animePrompt.prompt).toContain('anime');
    expect(photoPrompt.prompt).toContain('photograph');
  });

  it('6. PromptEngineSummary extracts complete compact summary for Review UX', () => {
    const mockRecord: ImageRequestRecord = {
      requestId: 'req-1',
      jobId: 'job-1',
      paragraphIndex: 0,
      state: 'review',
      prompt: 'A polished 2D anime illustration of Marseline studying a tome.',
      negativePrompt: '3D CGI, plastic',
      model: 'blackforestlabs/flux-3/klein/text-to-image',
      provider: 'nanogpt',
      connectionId: 'conn-1',
      parameters: {},
      referenceSummary: 'captured portrait: Marseline (img_01)',
      createdAt: new Date().toISOString(),
      promptProfileV2: resolveImagePromptProfileV2('nanogpt', 'blackforestlabs/flux-3/klein/text-to-image'),
      imagePromptMetadata: {
        template: templateSnapshot(BUILTIN_IMAGE_TEMPLATES[0]!),
        selectionReason: 'Key scene beat',
        format: 'description',
        brief: {
          scene: 'Library',
          subjects: 'Marseline',
          action: 'studying',
          composition: 'medium',
          lighting: 'morning light',
          subjectMode: 'one',
          framing: 'medium',
          referencePolicy: 'character',
          sources: [],
          conflicts: []
        },
        trackerStatus: 'not_found',
        promptEngineVersion: 2,
        promptDialect: 'flux3-klein',
        shotSpec: resolveShotSpec({
          brief: {
            scene: 'Library',
            subjects: 'Marseline',
            action: 'studying',
            composition: 'medium',
            lighting: 'morning light',
            subjectMode: 'one',
            framing: 'medium',
            referencePolicy: 'character',
            sources: [],
            conflicts: []
          },
          outputPlan: resolveImageOutputPlan({ requestedRatio: '1:1', modelId: 'blackforestlabs/flux-3/klein/text-to-image' })
        }),
        styleSnapshot: BUILTIN_STYLE_DNA['builtin-style:anime'],
        outputPlan: resolveImageOutputPlan({ requestedRatio: '1:1', modelId: 'blackforestlabs/flux-3/klein/text-to-image' }),
        budgetSummary: {
          complexity: 'standard',
          softRange: [1200, 2200],
          hardLimit: 3000,
          finalCharacters: 850
        },
        promptLintWarnings: ['Warning: dialogue safe area active'],
        referenceSummary: 'captured portrait: Marseline (img_01)',
        shadowPrompt: {
          v1Prompt: 'Old V1 prompt',
          v2Prompt: 'New V2 prompt'
        }
      }
    };

    const summary = promptEngineSummary(mockRecord);
    expect(summary).toBeDefined();
    expect(summary!.version).toBe(2);
    expect(summary!.model).toContain('blackforestlabs/flux-3/klein');
    expect(summary!.dialect).toBe('flux3-klein');
    expect(summary!.output).toContain('1:1');
    expect(summary!.shot.size).toBeDefined();
    expect(summary!.style).toBe('2D anime illustration');
    expect(summary!.prompt.hardLimit).toBe(3000);
    expect(summary!.references).toContain('captured portrait: Marseline');
    expect(summary!.warnings.length).toBeGreaterThanOrEqual(1);
    expect(summary!.shadowPrompt?.v1Prompt).toBe('Old V1 prompt');
    expect(summary!.shadowPrompt?.v2Prompt).toBe('New V2 prompt');
  });
});
