import { expect, test } from 'bun:test';
import {
  resolveShotIntent,
  resolveShotSpec
} from './shot-director.js';
import {
  resolveStyleDNA,
  BUILTIN_STYLE_DNA,
  HISTORICAL_UNTOUCHED_ANIME_PREFIX
} from '../../shared/style-dna.js';
import { resolveImageOutputPlan } from '../../shared/image-output-plan.js';
import {
  type VisualBrief,
  type ImageTemplate,
  BUILTIN_IMAGE_TEMPLATES
} from '../../shared/image-templates.js';
import type { VisualCue } from '../../shared/contracts.js';
import { DEFAULT_CONFIG, type VisualNovelConfig } from '../../config.js';

function createMockBrief(overrides?: Partial<VisualBrief>): VisualBrief {
  return {
    scene: 'Pruitt kitchen; wooden counters, jars, quiet rain outside; daylight',
    subjects: 'One visible woman; Nadine Pruitt, tired expression, brown hair tied back; beige apron over white sleeveless shirt',
    action: 'Standing over the colander, looking up with sudden realization',
    composition: 'medium; eye-level',
    lighting: 'soft diffused daylight from the rain outside',
    subjectMode: 'one',
    framing: 'portrait',
    referencePolicy: 'character',
    sources: ['Story evidence'],
    conflicts: [],
    ...overrides
  };
}

function createMockCue(overrides?: Partial<VisualCue>): VisualCue {
  return {
    cueId: 'cue:test:1',
    paragraphIndex: 1,
    sceneId: 'scene:test:1',
    sceneRevision: 1,
    kind: 'flattened_scene',
    action: null,
    expression: null,
    character: 'Nadine Pruitt',
    assetJobId: 'job:test:1',
    promptDelta: '',
    ...overrides
  };
}

test('Shot Director resolves correct intent for all narrative beats', () => {
  // Reaction
  const reactionBrief = createMockBrief({ action: 'She gasps in shock and freezes, wide-eyed' });
  expect(resolveShotIntent(reactionBrief)).toBe('reaction');

  // Dialogue
  const dialogueBrief = createMockBrief({ action: 'She whispers softly, explaining what happened to Randy' });
  expect(resolveShotIntent(dialogueBrief)).toBe('dialogue');

  // Action
  const actionBrief = createMockBrief({ action: 'He draws his sword and slashes forward in a sudden combat strike' });
  expect(resolveShotIntent(actionBrief)).toBe('action');

  // Environment
  const envBrief = createMockBrief({ subjectMode: 'none', action: '', scene: 'Rain falling on the pine forest and open gravel road' });
  expect(resolveShotIntent(envBrief)).toBe('environment');

  // Detail / Prop
  const detailBrief = createMockBrief({ subjectMode: 'none', action: 'A tarnished brass key resting on the wooden table' });
  expect(resolveShotIntent(detailBrief)).toBe('detail');

  // Two-shot (ensemble with 2 members)
  const twoShotBrief = createMockBrief({
    subjectMode: 'ensemble',
    subjects: 'Nadine: apron\nRandy: soaked jacket',
    action: 'Both standing near the counter in silence'
  });
  const twoShotCue = createMockCue({
    ensembleSubjects: [
      { name: 'Nadine', appearance: 'apron' },
      { name: 'Randy', appearance: 'soaked jacket' }
    ]
  });
  expect(resolveShotIntent(twoShotBrief, undefined, twoShotCue)).toBe('two-shot');

  // Confrontation (2 members with hostile action)
  const confrontationCue = createMockCue({
    ensembleSubjects: [
      { name: 'Hero', appearance: 'armor' },
      { name: 'Villain', appearance: 'cloak' }
    ]
  });
  const confrontationBrief = createMockBrief({
    subjectMode: 'ensemble',
    action: 'The two glare in a tense standoff with weapons ready'
  });
  expect(resolveShotIntent(confrontationBrief, undefined, confrontationCue)).toBe('confrontation');

  // 3-person and 5-person ensemble
  const threePersonCue = createMockCue({
    ensembleSubjects: [
      { name: 'Alice', appearance: 'look1' },
      { name: 'Bob', appearance: 'look2' },
      { name: 'Charlie', appearance: 'look3' }
    ]
  });
  expect(resolveShotIntent(twoShotBrief, undefined, threePersonCue)).toBe('ensemble');

  const fivePersonCue = createMockCue({
    ensembleSubjects: [
      { name: '1', appearance: '' }, { name: '2', appearance: '' },
      { name: '3', appearance: '' }, { name: '4', appearance: '' },
      { name: '5', appearance: '' }
    ]
  });
  expect(resolveShotIntent(twoShotBrief, undefined, fivePersonCue)).toBe('ensemble');
});

test('Shot Director produces curated camera framing per intent', () => {
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });

  // Reaction -> close-up or medium-close-up
  const reactionSpec = resolveShotSpec({
    brief: createMockBrief({ action: 'She gasps in shock' }),
    outputPlan,
    cue: createMockCue()
  });
  expect(['close-up', 'medium-close-up']).toContain(reactionSpec.camera.shotSize);
  expect(['shallow', 'moderate']).toContain(reactionSpec.camera.depthOfField);

  // Action -> medium-wide or full-body, normal/wide lens
  const actionSpec = resolveShotSpec({
    brief: createMockBrief({ action: 'He runs and lunges with his blade in swift combat' }),
    outputPlan,
    cue: createMockCue()
  });
  expect(['medium-wide', 'full-body']).toContain(actionSpec.camera.shotSize);
  expect(['normal', 'wide']).toContain(actionSpec.camera.lens);

  // Environment -> wide or establishing, deep focus
  const envSpec = resolveShotSpec({
    brief: createMockBrief({ subjectMode: 'none', action: '' }),
    outputPlan,
    cue: createMockCue()
  });
  expect(['wide', 'establishing']).toContain(envSpec.camera.shotSize);
  expect(envSpec.camera.depthOfField).toBe('deep');

  // Detail -> close-up or macro, selective/shallow
  const detailSpec = resolveShotSpec({
    brief: createMockBrief({ subjectMode: 'none', action: 'The brass key on the sill' }),
    outputPlan,
    cue: createMockCue()
  });
  expect(['close-up', 'macro']).toContain(detailSpec.camera.shotSize);
  expect(['selective', 'shallow']).toContain(detailSpec.camera.depthOfField);
});

test('Aspect ratio awareness adapts composition mode and framing', () => {
  // 9:16 vertical
  const portraitPlan = resolveImageOutputPlan({ requestedRatio: '9:16' });
  const portraitSpec = resolveShotSpec({
    brief: createMockBrief({
      subjectMode: 'ensemble',
      action: 'Standing together in the doorway'
    }),
    outputPlan: portraitPlan,
    cue: createMockCue({
      ensembleSubjects: [
        { name: 'A', appearance: 'first' },
        { name: 'B', appearance: 'second' }
      ]
    })
  });
  // 9:16 favors layered vertical depth over lateral spread
  expect(portraitSpec.composition.mode).toBe('layered-depth');
  expect(portraitSpec.output.orientation).toBe('portrait');

  // 16:9 landscape
  const landscapePlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const landscapeSpec = resolveShotSpec({
    brief: createMockBrief({
      subjectMode: 'ensemble',
      action: 'Sitting along the tavern bar table'
    }),
    outputPlan: landscapePlan,
    cue: createMockCue({
      ensembleSubjects: [
        { name: 'A', appearance: 'first' },
        { name: 'B', appearance: 'second' }
      ]
    })
  });
  expect(landscapeSpec.composition.mode).toBe('lateral-ensemble');
  expect(landscapeSpec.output.orientation).toBe('landscape');

  // 1:1 square
  const squarePlan = resolveImageOutputPlan({ requestedRatio: '1:1' });
  const squareSpec = resolveShotSpec({
    brief: createMockBrief(),
    outputPlan: squarePlan,
    cue: createMockCue()
  });
  expect(squareSpec.output.orientation).toBe('square');
});

test('Dialogue safe area policy behaves accurately under auto, always, and off', () => {
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const brief = createMockBrief();
  const cue = createMockCue();

  // Auto for normal dialogue stage target -> enabled
  const autoSpec = resolveShotSpec({
    brief,
    outputPlan,
    cue,
    dialogueSafeAreaSetting: 'auto',
    isDialogueOverlayTarget: true
  });
  expect(autoSpec.safeArea).toBeDefined();
  expect(autoSpec.safeArea?.edge).toBe('bottom');
  expect(autoSpec.safeArea?.fraction).toBe(0.25);

  // Auto for standalone / cast art target -> disabled
  const castArtSpec = resolveShotSpec({
    brief,
    outputPlan,
    cue,
    dialogueSafeAreaSetting: 'auto',
    isDialogueOverlayTarget: false
  });
  expect(castArtSpec.safeArea).toBeUndefined();

  // Auto for environment or detail shots -> disabled
  const envSpec = resolveShotSpec({
    brief: createMockBrief({ subjectMode: 'none', action: '' }),
    outputPlan,
    cue,
    dialogueSafeAreaSetting: 'auto',
    isDialogueOverlayTarget: true
  });
  expect(envSpec.safeArea).toBeUndefined();

  // Always setting -> enabled even for detail
  const alwaysSpec = resolveShotSpec({
    brief: createMockBrief({ subjectMode: 'none', action: 'Key on sill' }),
    outputPlan,
    cue,
    dialogueSafeAreaSetting: 'always',
    isDialogueOverlayTarget: false
  });
  expect(alwaysSpec.safeArea).toBeDefined();

  // Off setting -> disabled
  const offSpec = resolveShotSpec({
    brief,
    outputPlan,
    cue,
    dialogueSafeAreaSetting: 'off',
    isDialogueOverlayTarget: true
  });
  expect(offSpec.safeArea).toBeUndefined();
});

test('Manual camera overrides take highest precedence', () => {
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const spec = resolveShotSpec({
    brief: createMockBrief(),
    outputPlan,
    cue: createMockCue(),
    manualOverrides: {
      shotSize: 'extreme-close-up',
      angle: 'low-angle',
      lens: 'ultrawide',
      depthOfField: 'selective',
      mode: 'symmetrical'
    }
  });

  expect(spec.camera.shotSize).toBe('extreme-close-up');
  expect(spec.camera.angle).toBe('low-angle');
  expect(spec.camera.lens).toBe('ultrawide');
  expect(spec.camera.depthOfField).toBe('selective');
  expect(spec.composition.mode).toBe('symmetrical');
  expect(spec.source).toBe('manual');
});

test('Fixed custom templates preserve author framing without dynamic variation', () => {
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const customFixedTemplate: ImageTemplate = {
    id: 'my-custom-portrait',
    name: 'Custom Close Portrait',
    category: 'custom',
    enabled: true,
    useWhen: 'When I want exact close-up framing',
    positive: '{{style}}\n{{subjects}}\n{{action}}',
    negative: '{{negative}}',
    subjectMode: 'one',
    framing: 'close-up',
    referencePolicy: 'character',
    cameraPolicy: 'fixed'
  };

  const spec = resolveShotSpec({
    brief: createMockBrief({ action: 'Swinging a heavy battleaxe in combat' }), // action would normally be wide
    outputPlan,
    template: customFixedTemplate,
    cue: createMockCue()
  });

  // Because cameraPolicy is fixed, close-up framing is strictly preserved
  expect(spec.camera.shotSize).toBe('close-up');
  expect(spec.camera.lens).toBe('macro');
});

test('Shot Director is strictly deterministic and reframe revision produces stable alternation', () => {
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const brief = createMockBrief();
  const cue = createMockCue();

  // Same input twice -> identical spec
  const specA = resolveShotSpec({ brief, outputPlan, cue, revision: 0 });
  const specB = resolveShotSpec({ brief, outputPlan, cue, revision: 0 });
  expect(specA).toEqual(specB);

  // Reframe (revision 1) alters camera framing while remaining completely deterministic
  const specRev1_A = resolveShotSpec({ brief, outputPlan, cue, revision: 1 });
  const specRev1_B = resolveShotSpec({ brief, outputPlan, cue, revision: 1 });
  expect(specRev1_A).toEqual(specRev1_B);
  expect(specRev1_A.revision).toBe(1);
});

test('Previous shot provides weak continuity when same focal subject and intent persist', () => {
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const brief1 = createMockBrief({ action: 'She looks at the window thoughtfully' });
  const cue1 = createMockCue({ character: 'Nadine' });

  const shot1 = resolveShotSpec({ brief: brief1, outputPlan, cue: cue1, revision: 0 });

  const brief2 = createMockBrief({ action: 'She continues looking outside in silence' });
  const cue2 = createMockCue({ character: 'Nadine' });

  const shot2 = resolveShotSpec({
    brief: brief2,
    outputPlan,
    cue: cue2,
    previousShot: shot1,
    revision: 0
  });

  expect(shot2.camera.lens).toBe(shot1.camera.lens);
  expect(shot2.camera.depthOfField).toBe(shot1.camera.depthOfField);
});

test('All 12 built-in styles resolve valid semantic StyleDNA', () => {
  for (const style of BUILTIN_IMAGE_TEMPLATES) {
    // Check built-in style IDs
    const styleIds = [
      'builtin-style:neutral',
      'builtin-style:anime',
      'builtin-style:hunter-hand-drawn',
      'builtin-style:retro-cel',
      'builtin-style:ink-manga',
      'builtin-style:photoreal',
      'builtin-style:phone-candid',
      'builtin-style:phone-flash',
      'builtin-style:documentary',
      'builtin-style:film',
      'builtin-style:watercolor',
      'builtin-style:painterly'
    ];

    for (const id of styleIds) {
      const resolved = resolveStyleDNA(DEFAULT_CONFIG, id);
      expect(resolved.source).toBe('builtin');
      expect(resolved.isLegacyLiteral).toBe(false);
      expect(resolved.styleDNA).toBeDefined();
    }
  }
});

test('Historical untouched default prefix migrates to anime StyleDNA', () => {
  const configWithUntouched: VisualNovelConfig = {
    ...DEFAULT_CONFIG,
    selectedSharedStyleId: null,
    promptPrefix: HISTORICAL_UNTOUCHED_ANIME_PREFIX,
    promptSuffix: ''
  };

  const resolved = resolveStyleDNA(configWithUntouched);
  expect(resolved.source).toBe('migrated');
  expect(resolved.isLegacyLiteral).toBe(false);
  expect(resolved.styleDNA.medium).toBe('2D anime illustration');
  expect(resolved.styleDNA.linework).toContain('precise tapered ink contours');
});

test('Custom user styles are preserved in legacy-literal mode without silent modification', () => {
  const configWithCustomStyle: VisualNovelConfig = {
    ...DEFAULT_CONFIG,
    selectedSharedStyleId: null,
    promptPrefix: 'My personal custom cyberpunk neon synthwave style',
    promptSuffix: 'sharp reflections, high contrast'
  };

  const resolved = resolveStyleDNA(configWithCustomStyle);
  expect(resolved.source).toBe('legacy-literal');
  expect(resolved.isLegacyLiteral).toBe(true);
  expect(resolved.styleDNA.preserve).toContain('custom literal prefix/suffix wording');
});

test('Lighting overlay precedence: direct flash provides intentional lighting overlay', () => {
  const flashResolved = resolveStyleDNA(DEFAULT_CONFIG, 'builtin-style:phone-flash');
  expect(flashResolved.lightingOverlay).toBeDefined();
  expect(flashResolved.lightingOverlay?.intentional).toBe(true);
  expect(flashResolved.lightingOverlay?.type).toContain('direct camera flash');

  const animeResolved = resolveStyleDNA(DEFAULT_CONFIG, 'builtin-style:anime');
  expect(animeResolved.lightingOverlay).toBeUndefined();
});

test('a two-person ensemble remains a two-shot when a character description contains another colon',()=>{expect(resolveShotIntent(createMockBrief({subjectMode:'ensemble',subjects:'Mira: silver hair, tattoo: compass\nJo: black curls',action:'standing by a window'}))).toBe('two-shot');});

test('Smart photo prompt generator deduplicates Character DNA, strips NovelAI brackets, separates multi-subject action, and preserves custom style prefix + suffix', async () => {
  const { formatCharacterDNAToPromptClause, CharacterDNASchema } = await import('../../shared/character-dna.js');
  const { buildVisualBrief } = await import('./visual-brief.js');
  const { compileModelPrompt } = await import('./model-prompt-compiler.js');
  const { resolveImagePromptProfileV2 } = await import('../../shared/image-prompt-profile-v2.js');
  const { SceneStateSchema, VisualCueSchema } = await import('../../shared/contracts.js');

  const dna = CharacterDNASchema.parse({
    id: 'marseline-vane',
    name: 'Marseline Vane',
    locked: true,
    build: {
      age: '19',
      bodyType: 'razor-lean, angular',
      gender: 'woman',
      species: 'human',
      bust: 'for her lean frame',
      skinTone: 'hollow-cheeked, pale complexion with violet fatigue circles'
    },
    faceFeatures: 'wide crooked mouth; violet fatigue circles, pretty',
    hair: {
      length: 'bob length',
      style: 'hacked bob with lead sinker rattails',
      color: 'oil-slick navy'
    },
    eyes: {
      shape: 'heavy-lidded',
      color: 'slate gray'
    },
    distinguishingFeatures: [
      'scarred knuckles',
      'tall razor-lean angular frame',
      'violet fatigue circles under slate eyes'
    ],
    signatureOutfit: 'pinstripe wool waistcoat over tight medical linen, olive canvas slacks, mismatched boots',
    demeanor: 'sparse deadpan, cold pragmatic precision, dry wit; watchful and coiled'
  });

  const clause = formatCharacterDNAToPromptClause(dna);
  expect(clause).toContain('19-year-old');
  expect(clause).not.toContain('with for her lean frame');
  expect(clause).not.toContain('circles skin');
  expect(clause).not.toContain('bob length hacked bob');
  expect(clause).not.toContain('dry wit');
  expect(clause).not.toContain('cold pragmatic precision');
  expect((clause.match(/violet fatigue circles/gi) ?? []).length).toBe(1);

  const customPrefix = 'An unedited, candid iPhone 11 camera roll snapshot, taken handheld from a casual eye-level perspective with a 26mm wide-angle smartphone lens. This captures a natural, non-professional moment with a spontaneous snap aesthetic,';
  const customSuffix = ', taken with a slightly tilted horizon and casual, off-center framing. The small smartphone sensor captures a deep depth of field where the background remains in focus, showing messy everyday clutter and realistic, lived-in ambient details without cinematic lens blur. Natural lighting, possibly with overexposed white window highlights or a direct handheld flash that casts flat shadows and creates subtle oily skin shine. Unretouched skin with visible pores, natural facial asymmetry, and stray flyaway hairs. Captured on the iPhone\'s auto-exposure, leading to faint digital chroma and luminance noise in the shadows, unpolished color science, and mild mobile image processing. Slightly soft focus and minor motion blur from handheld movement, with unedited JPEG compression and no professional grading.';
  const customNegative = '8k, masterpiece, cinematic lighting, studio lighting, bokeh, blurred background, professional grading, fashion editorial retouching, plastic skin, poreless, smooth skin, symmetrical framing, exaggerated lens flare, watermark, logo, digital art, rendering, 3D';

  const config: VisualNovelConfig = {
    ...DEFAULT_CONFIG,
    selectedSharedStyleId: 'custom-candid',
    promptPresets: [
      {
        id: 'custom-candid',
        name: 'Realistic candid cellphone shot',
        positive: customPrefix,
        suffix: customSuffix,
        negative: customNegative
      }
    ],
    promptPrefix: customPrefix,
    promptSuffix: customSuffix,
    negativePrompt: customNegative
  };

  const scene = SceneStateSchema.parse({
    sceneId: 'loft-1',
    revision: 1,
    startParagraph: 0,
    environment: {
      location: 'Larkward',
      description: 'Open-plan corner loft of cedar and starch gone arctic: the sheared hardwood crate lid fallen against the hallway wall, sheet-lead and horsehair felt cradle exposed, soot-blackened ceramic urn with a tarnished filigree and carved-ivory cocoon chalice standing in it, draft inverted, frost-white breath pluming from three mouths',
      timeOfDay: 'late morning, near noon',
      weather: 'thin harbor mist outside',
      lighting: 'gray street light dulled by sudden cold, breath fogging in the air, seams of dark amber sap catching a wet gleam',
      persistentElements: [
        'gray-black hardwood crate with brass strapping',
        'sheared lid of kiln-cured wood and gray lead sheeting on the floor runner',
        'soapstone cocoon-urn in horsehair and black pitch bed',
        'three bolted brass collars with wax-sealed apertures',
        'drift-timber dining table',
        'east berth velvet tool mat and disassembled brass pistol',
        'galley corner with teacups',
        'suitcase near south berth'
      ]
    },
    cast: ['Marseline Vane'],
    character: 'Marseline Vane',
    identityPrompt: 'Marseline Vane',
    attire: null,
    basePrompt: 'loft',
    compositionLock: 'close-up',
    continuity: { revision: 1, characters: {}, facts: {} },
    cameraLock: { framing: 'close-up', angle: 'eye level', perspective: 'straight-on', lens: null, subjectAnchor: 'center', horizon: 'stable', safeDialogueRegion: 'lower quarter', aspectRatio: '16:9' }
  });

  const cue = VisualCueSchema.parse({
    cueId: 'cue-1',
    paragraphIndex: 0,
    sceneId: 'loft-1',
    sceneRevision: 1,
    kind: 'flattened_scene',
    assetJobId: 'job-1',
    character: 'Marseline Vane',
    poseExpressionId: 'shocked',
    visualDescription: "At the open crate, a tall broad-shouldered young man in water-dark work jeans and heavy boots has lunged forward off balance, both work-hardened hands and one flat right palm slammed against the calcified rim of a soot-blackened ceramic urn as it shifts in its rotting felt cradle. His shoulders crowd the frame, head down, the cold already whitening his breath. Beside and behind him Marseline Vane has staggered back from the crate, bandaged ribs hitting her work table edge, one arm thrown out, the brass tray of screws skidding off the pine boards. At the far right, near the hearth grate, only Kallirrhoe Tskhin's small pale scrambling shape is caught low in the boards, bells shrieking. The loft's gray light has gone flat and frigid; through the cracked seam no visible aura, only the collapsing temperature and the swelling dark of the urn's flared mouth between the man's hand and his face."
  });

  const brief = buildVisualBrief(config, scene, cue, undefined, { 'marseline-vane': dna });
  const styleSnapshot = resolveStyleDNA(config);
  const outputPlan = resolveImageOutputPlan({ requestedRatio: '16:9' });
  const shotSpec = resolveShotSpec({ brief, outputPlan, cue, styleDNA: styleSnapshot.styleDNA, dialogueSafeAreaSetting: 'off' });
  const profile = resolveImagePromptProfileV2('fixture', 'unknown-generic-model');
  const compiled = compileModelPrompt({ brief, shotSpec, styleDNA: styleSnapshot.styleDNA, profile, outputPlan, cue });

  // 1. Prefix is front-loaded at the very start of the prompt
  expect(compiled.prompt.startsWith('An unedited, candid iPhone 11 camera roll snapshot')).toBe(true);
  // 2. Suffix is preserved in the compiled prompt
  expect(compiled.prompt).toContain('The small smartphone sensor captures a deep depth of field where the background remains in focus');
  expect(compiled.prompt).toContain('Unretouched skin with visible pores');
  // 3. No NovelAI brackets or anime emoticons or doubled pose
  expect(compiled.prompt).not.toContain('{{');
  expect(compiled.prompt).not.toContain('^^^');
  expect(compiled.prompt).not.toContain('rectangular mouth');
  expect((compiled.prompt.match(/wide-eyed, confused/g) ?? []).length).toBe(1);
  // 4. No conflicting portrait lens or moderate depth of field in Framing
  expect(compiled.prompt).not.toContain('portrait focal length');
  expect(compiled.prompt).not.toContain('moderate depth of field');
  // 5. No literary "no visible aura" negation or unmentioned room-wide prop clutter
  expect(compiled.prompt).not.toContain('no visible aura');
  expect(compiled.prompt).not.toContain('galley corner with teacups');
  // 6. Negative prompt is preserved
  expect(compiled.negativePrompt).toContain('plastic skin, poreless');
});
