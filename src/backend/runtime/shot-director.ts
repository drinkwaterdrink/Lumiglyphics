import {
  type ImageShotSpec,
  type ShotIntent,
  type ShotSize,
  type CameraAngle,
  type LensFeel,
  type CompositionMode,
  type SubjectPlacement,
  type ShotSafeArea,
  ImageShotSpecSchema
} from '../../shared/image-shot-spec.js';
import type { VisualBrief, ImageTemplate } from '../../shared/image-templates.js';
import type { VisualCue } from '../../shared/contracts.js';
import type { ImageOutputPlan } from '../../shared/image-output-plan.js';
import type { StyleDNA } from '../../shared/style-dna.js';

export interface ShotDirectorInput {
  brief: VisualBrief;
  outputPlan: ImageOutputPlan;
  template?: ImageTemplate | undefined;
  cue?: VisualCue | undefined;
  previousShot?: ImageShotSpec | undefined;
  manualOverrides?: Partial<ImageShotSpec['camera'] & {
    intent?: ShotIntent;
    mode?: CompositionMode;
    safeArea?: ShotSafeArea;
    crop?: string;
  }> | undefined;
  styleDNA?: StyleDNA | undefined;
  dialogueSafeAreaSetting?: 'auto' | 'always' | 'off' | undefined;
  isDialogueOverlayTarget?: boolean | undefined;
  revision?: number | undefined;
  cueHash?: string | undefined;
}

function stringHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

const ACTION_VERBS_REGEX = /\b(?:fight|strike|slash|parry|draws?|fires?|shoots?|runs?|sprints?|lunges?|jumps?|leaps?|dodges?|escapes?|climbs?|dances?|swords?|combat|spells?|attacks?)\b/i;
const REACTION_WORDS_REGEX = /\b(?:gasps?|shock|shocks?|cries?|crying|smiles?|grins?|freezes?|frozen|blushes?|blushing|tears?|glances?|stares?|staring|wide-eyed|stunned|awe|trembles?|hesitates?)\b/i;
const DIALOGUE_WORDS_REGEX = /\b(?:says?|tells?|asks?|speaks?|whispers?|murmurs?|mutters?|answers?|replies?|explains?|argues?)\b/i;
const CONFRONTATION_WORDS_REGEX = /\b(?:glare|glares?|confronts?|threatens?|corners?|surrounds?|draws? weapon|standoff|face-off)\b/i;

/**
 * Resolves semantic intent from brief, cue, template, and narrative evidence.
 */
export function resolveShotIntent(
  brief: VisualBrief,
  template?: ImageTemplate,
  cue?: VisualCue,
  manualIntent?: ShotIntent
): ShotIntent {
  if (manualIntent) return manualIntent;
  if (cue?.shotHint?.intent) return cue.shotHint.intent;
  if (template?.intent) return template.intent;

  // Object/environment mode
  if (brief.subjectMode === 'none') {
    if (
      template?.category === 'detail' ||
      /\b(?:key|book|colander|mug|ring|letter|sword|dagger|device|phone|note|gem|door|window)\b/i.test(
        brief.action + ' ' + brief.scene
      )
    ) {
      return 'detail';
    }
    return 'environment';
  }

  // Ensemble mode
  if (brief.subjectMode === 'ensemble') {
    const castCount = cue?.ensembleSubjects?.length ?? (brief.subjects.match(/:/g)?.length || 3);
    if (castCount === 2) {
      if (CONFRONTATION_WORDS_REGEX.test(brief.action)) return 'confrontation';
      if (DIALOGUE_WORDS_REGEX.test(brief.action)) return 'dialogue';
      return 'two-shot';
    }
    return 'ensemble';
  }

  // Single-subject mode
  if (ACTION_VERBS_REGEX.test(brief.action)) return 'action';
  if (REACTION_WORDS_REGEX.test(brief.action)) return 'reaction';
  if (DIALOGUE_WORDS_REGEX.test(brief.action)) return 'dialogue';

  return 'portrait';
}

/**
 * Shot Director: Generates dynamic, scene-aware, aspect-ratio-aware ImageShotSpec.
 * Completely deterministic based on cue evidence, stable hash, and revision.
 */
export function resolveShotSpec(input: ShotDirectorInput): ImageShotSpec {
  const {
    brief,
    outputPlan,
    template,
    cue,
    previousShot,
    manualOverrides = {},
    styleDNA,
    dialogueSafeAreaSetting = 'auto',
    isDialogueOverlayTarget = true,
    revision = 0,
    cueHash
  } = input;

  const intent = resolveShotIntent(brief, template, cue, manualOverrides.intent);

  // Stable seed for deterministic variation
  const seedString = `${cueHash ?? (brief.scene + '|' + brief.subjects + '|' + brief.action)}:${revision}:${intent}`;
  const seed = stringHash(seedString);
  const pick = <T>(options: readonly T[], offset = 0): T => {
    return options[Math.abs(seed + offset) % options.length]!;
  };

  // Precedence 1: Manual Overrides
  // Precedence 2: Fixed custom template
  const isFixedTemplate = template?.cameraPolicy === 'fixed';

  let shotSize: ShotSize;
  let angle: CameraAngle;
  let lens: LensFeel;
  let depthOfField: 'deep' | 'moderate' | 'shallow' | 'selective';
  let mode: CompositionMode;

  if (isFixedTemplate) {
    // Translate fixed template framing directly
    switch (template.framing) {
      case 'portrait':
        shotSize = 'close-up';
        angle = 'eye-level';
        lens = 'portrait';
        depthOfField = 'moderate';
        mode = 'centered';
        break;
      case 'upper body':
        shotSize = 'medium';
        angle = 'eye-level';
        lens = 'normal';
        depthOfField = 'moderate';
        mode = 'centered';
        break;
      case 'full body':
        shotSize = 'full-body';
        angle = 'eye-level';
        lens = 'normal';
        depthOfField = 'moderate';
        mode = 'rule-of-thirds';
        break;
      case 'wide':
        shotSize = 'wide';
        angle = 'eye-level';
        lens = 'wide';
        depthOfField = 'deep';
        mode = 'layered-depth';
        break;
      case 'close-up':
        shotSize = 'close-up';
        angle = 'eye-level';
        lens = 'macro';
        depthOfField = 'selective';
        mode = 'centered';
        break;
    }
  } else {
    // Deterministic Shot Rules
    switch (intent) {
      case 'reaction':
        shotSize = pick(['close-up', 'medium-close-up'] as const);
        angle = pick(['eye-level', 'three-quarter'] as const, 1);
        lens = pick(['portrait', 'normal'] as const, 2);
        depthOfField = pick(['shallow', 'moderate'] as const, 3);
        mode = pick(['centered', 'rule-of-thirds'] as const, 4);
        break;
      case 'portrait':
        shotSize = pick(['medium-close-up', 'medium'] as const);
        angle = pick(['eye-level', 'three-quarter'] as const, 1);
        lens = pick(['portrait', 'normal'] as const, 2);
        depthOfField = 'moderate';
        mode = pick(['rule-of-thirds', 'centered'] as const, 3);
        break;
      case 'dialogue':
        shotSize = 'medium';
        angle = pick(['eye-level', 'three-quarter'] as const, 1);
        lens = 'normal';
        depthOfField = 'moderate';
        mode = pick(['rule-of-thirds', 'layered-depth'] as const, 2);
        break;
      case 'two-shot':
        shotSize = pick(['medium', 'medium-wide'] as const);
        angle = pick(['eye-level', 'three-quarter'] as const, 1);
        lens = pick(['normal', 'wide'] as const, 2);
        depthOfField = 'moderate';
        mode = pick(['layered-depth', 'lateral-ensemble'] as const, 3);
        break;
      case 'confrontation':
        shotSize = pick(['medium-wide', 'medium'] as const);
        angle = pick(['three-quarter', 'over-the-shoulder', 'low-angle'] as const, 1);
        lens = pick(['normal', 'wide'] as const, 2);
        depthOfField = 'moderate';
        mode = pick(['layered-depth', 'rule-of-thirds'] as const, 3);
        break;
      case 'action':
        shotSize = pick(['medium-wide', 'full-body'] as const);
        angle = pick(['eye-level', 'low-angle'] as const, 1);
        lens = pick(['normal', 'wide'] as const, 2);
        depthOfField = pick(['moderate', 'deep'] as const, 3);
        mode = pick(['rule-of-thirds', 'leading-lines'] as const, 4);
        break;
      case 'environment':
      case 'establishing':
        shotSize = pick(['wide', 'establishing'] as const);
        angle = pick(['eye-level', 'high-angle'] as const, 1);
        lens = pick(['wide', 'ultrawide'] as const, 2);
        depthOfField = 'deep';
        mode = pick(['layered-depth', 'frame-within-frame'] as const, 3);
        break;
      case 'detail':
        shotSize = pick(['close-up', 'macro'] as const);
        angle = pick(['eye-level', 'overhead', 'profile'] as const, 1);
        lens = pick(['macro', 'telephoto'] as const, 2);
        depthOfField = pick(['selective', 'shallow'] as const, 3);
        mode = pick(['centered', 'rule-of-thirds'] as const, 4);
        break;
      case 'ensemble':
        shotSize = pick(['medium-wide', 'wide'] as const);
        angle = 'eye-level';
        lens = pick(['wide', 'normal'] as const, 1);
        depthOfField = pick(['deep', 'moderate'] as const, 2);
        mode = pick(['lateral-ensemble', 'layered-depth'] as const, 3);
        break;
      case 'manga-page':
        shotSize = 'full-body';
        angle = 'eye-level';
        lens = 'normal';
        depthOfField = 'moderate';
        mode = 'layered-depth';
        break;
      default:
        shotSize = 'medium';
        angle = 'eye-level';
        lens = 'normal';
        depthOfField = 'moderate';
        mode = 'centered';
        break;
    }

    // Precedence 3: Intentionally selected style camera hints
    if (styleDNA?.cameraHints && styleDNA.cameraHints.length > 0) {
      const hint = styleDNA.cameraHints.join(' ').toLowerCase();
      if (hint.includes('phone-wide') || hint.includes('wide')) {
        lens = 'wide';
      }
      if (hint.includes('telephoto') || hint.includes('portrait')) {
        lens = 'portrait';
      }
      if (hint.includes('deep focus')) {
        depthOfField = 'deep';
      }
      if (hint.includes('moderate depth')) {
        depthOfField = 'moderate';
      }
    }

    // Planner hint overrides
    if (cue?.shotHint?.preferredShotSize) shotSize = cue.shotHint.preferredShotSize;
    if (cue?.shotHint?.preferredAngle) angle = cue.shotHint.preferredAngle;

    // Shot Continuity: Weak continuity evidence from previousShot
    if (
      previousShot &&
      revision === previousShot.revision &&
      cue?.character &&
      previousShot.intent === intent
    ) {
      // Maintain consistent lens and depth across matching beats
      lens = previousShot.camera.lens;
      depthOfField = previousShot.camera.depthOfField;
    }
  }

  // Precedence 1: Manual Overrides
  if (manualOverrides.shotSize) shotSize = manualOverrides.shotSize;
  if (manualOverrides.angle) angle = manualOverrides.angle;
  if (manualOverrides.lens) lens = manualOverrides.lens;
  if (manualOverrides.depthOfField) depthOfField = manualOverrides.depthOfField;
  if (manualOverrides.mode) mode = manualOverrides.mode;

  // Aspect-Ratio-Aware Composition Adjustments
  const orientation = outputPlan.orientation;
  if (orientation === 'portrait') {
    // 9:16 favors vertical depth and stacked subject blocking
    if (mode === 'lateral-ensemble') mode = 'layered-depth';
    if (intent === 'action' && shotSize === 'medium') shotSize = 'full-body';
  } else if (orientation === 'landscape') {
    // 16:9 and 21:9 favor lateral arrangements
    if (intent === 'ensemble' || intent === 'two-shot') {
      mode = 'lateral-ensemble';
    }
  } else if (orientation === 'square') {
    // 1:1 favors centralized or layered composition
    if (mode === 'lateral-ensemble') mode = 'layered-depth';
  }

  // Subject Placements
  const subjectPlacements: SubjectPlacement[] = [];
  if (brief.subjectMode === 'ensemble' && cue?.ensembleSubjects && cue.ensembleSubjects.length > 0) {
    const count = cue.ensembleSubjects.length;
    const horizontalOptions: Array<SubjectPlacement['horizontal']> =
      orientation === 'portrait'
        ? ['center', 'left', 'right', 'center']
        : ['far-left', 'left', 'center', 'right', 'far-right'];

    cue.ensembleSubjects.forEach((sub, i) => {
      subjectPlacements.push({
        subject: sub.name,
        horizontal: horizontalOptions[i % horizontalOptions.length],
        depth: i === 0 ? 'foreground' : i === 1 ? 'midground' : 'background',
        scale: i === 0 ? 'large' : 'medium'
      });
    });
  } else if (brief.subjectMode === 'one' && cue?.character) {
    subjectPlacements.push({
      subject: cue.character,
      horizontal: mode === 'rule-of-thirds' ? pick(['left', 'right'] as const, 5) : 'center',
      depth: 'foreground',
      scale: shotSize === 'close-up' || shotSize === 'extreme-close-up' ? 'dominant' : 'large'
    });
  }

  // Dialogue Safe Area Policy
  let safeArea: ShotSafeArea | undefined;
  if (manualOverrides.safeArea !== undefined) {
    safeArea = manualOverrides.safeArea;
  } else if (dialogueSafeAreaSetting === 'always') {
    safeArea = {
      edge: 'bottom',
      fraction: 0.25,
      reason: 'dialogue-overlay'
    };
  } else if (dialogueSafeAreaSetting === 'auto') {
    const isExcluded =
      !isDialogueOverlayTarget ||
      template?.safeAreaPolicy === 'none' ||
      intent === 'environment' ||
      intent === 'detail' ||
      intent === 'manga-page';

    if (!isExcluded) {
      safeArea = {
        edge: 'bottom',
        fraction: 0.25,
        reason: 'dialogue-overlay'
      };
    }
  }

  return ImageShotSpecSchema.parse({
    version: 1,
    intent,
    output: {
      requestedRatio: outputPlan.requestedRatio,
      actualRatio: outputPlan.actualRatio,
      orientation: outputPlan.orientation
    },
    camera: {
      shotSize,
      angle,
      lens,
      depthOfField,
      ...(cue?.character ? { focusTarget: cue.character } : {})
    },
    composition: {
      mode,
      subjectPlacements
    },
    ...(manualOverrides.crop ? { crop: manualOverrides.crop } : {}),
    ...(safeArea ? { safeArea } : {}),
    source: manualOverrides.shotSize || manualOverrides.angle ? 'manual' : cue?.shotHint ? 'planner' : 'deterministic-fallback',
    revision
  });
}
