import {visualSubjectPolicy} from '../../shared/visual-subject-policy.js';
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

const ACTION_VERBS_REGEX = /\b(?:fight|strike|slash|parry|draws?|fires?|shoots?|runs?|sprints?|lunges?|jumps?|leaps?|dodges?|escapes?|climbs?|dances?|swords?|combat|spells?|attacks?|throws?|rushes?|charges?)\b/i;
const REACTION_WORDS_REGEX = /\b(?:gasps?|shock|shocks?|cries?|crying|smiles?|grins?|freezes?|frozen|blushes?|blushing|tears?|glances?|stares?|staring|wide-eyed|stunned|awe|trembles?|hesitates?|flinches?|winces?)\b/i;
const DIALOGUE_WORDS_REGEX = /\b(?:says?|tells?|asks?|speaks?|whispers?|murmurs?|mutters?|answers?|replies?|explains?|argues?|confesses?|calls out)\b/i;
const CONFRONTATION_WORDS_REGEX = /\b(?:glare|glares?|confronts?|threatens?|corners?|surrounds?|draws? weapon|standoff|face-off|blocks? the path|points? (?:a|his|her) (?:blade|gun|wand))\b/i;

const FOREGROUND_DEPTH_REGEX = /\b(?:foreground|closest|in front|nearest|over[- ]the[- ]shoulder|framing the edge|frontmost|lower edge|right beside the camera)\b/i;
const BACKGROUND_DEPTH_REGEX = /\b(?:background|rear|far\b|distant|distance|doorway|entrance|threshold|across the room|behind|corner|stairs|balcony|back wall|hearth|hallway|far side)\b/i;
const MIDGROUND_DEPTH_REGEX = /\b(?:midground|middle|center of the room|at the table|across the desk|counter|booth|couch|sofa|beside the table|middle distance)\b/i;
const EXPLICIT_LINEUP_REGEX = /\b(?:side[- ]by[- ]side|shoulder[- ]to[- ]shoulder|lined up|in a row|standing abreast|walking abreast)\b/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSubjectClue(
  subjectName: string,
  spatialRelationships: readonly string[] | undefined,
  narrativeClauses: readonly string[]
): { clue: string; fromPlannerHint: boolean } | undefined {
  const fullName = subjectName.trim();
  const firstName = fullName.split(/\s+/)[0] || fullName;
  const matchName = (text: string): boolean => {
    if (fullName.length >= 2 && new RegExp(`\\b${escapeRegex(fullName)}\\b`, 'i').test(text)) return true;
    if (firstName.length >= 2 && new RegExp(`\\b${escapeRegex(firstName)}\\b`, 'i').test(text)) return true;
    return false;
  };

  if (spatialRelationships && spatialRelationships.length > 0) {
    const hintMatch = spatialRelationships.find(rel => matchName(rel));
    if (hintMatch) {
      return { clue: hintMatch.trim().slice(0, 240), fromPlannerHint: true };
    }
  }

  const clauseMatch = narrativeClauses.find(clause => clause.length > fullName.length + 8 && matchName(clause));
  if (clauseMatch) {
    return { clue: clauseMatch.trim().slice(0, 240), fromPlannerHint: false };
  }
  return undefined;
}

function inferHorizontalFromClue(clue?: string): SubjectPlacement['horizontal'] | undefined {
  if (!clue) return undefined;
  if (/\bfar[- ]left\b/i.test(clue)) return 'far-left';
  if (/\bfar[- ]right\b/i.test(clue)) return 'far-right';
  if (/\b(?:left|left side|left edge)\b/i.test(clue)) return 'left';
  if (/\b(?:right|right side|right edge)\b/i.test(clue)) return 'right';
  if (/\b(?:center|centre|middle)\b/i.test(clue)) return 'center';
  return undefined;
}

function inferDepthFromClue(clue?: string): SubjectPlacement['depth'] | undefined {
  if (!clue) return undefined;
  if (FOREGROUND_DEPTH_REGEX.test(clue)) return 'foreground';
  if (BACKGROUND_DEPTH_REGEX.test(clue)) return 'background';
  if (MIDGROUND_DEPTH_REGEX.test(clue)) return 'midground';
  return undefined;
}

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

  const narrativeText = `${brief.action} ${cue?.visualDescription ?? ''} ${cue?.visualFocus ?? ''}`.trim();

  // Object/environment mode
  if (brief.subjectMode === 'none') {
    if (
      template?.category === 'detail' ||
      /\b(?:key|book|colander|mug|ring|letter|sword|dagger|device|phone|note|gem|door|window|lock|relic)\b/i.test(
        `${narrativeText} ${brief.scene}`
      )
    ) {
      return 'detail';
    }
    return 'environment';
  }

  // Ensemble mode
  if (brief.subjectMode === 'ensemble') {
    const castCount = visualSubjectPolicy({mode:brief.subjectMode,members:cue?.ensembleSubjects,subjectText:brief.subjects}).count;
    if (castCount === 2) {
      if (CONFRONTATION_WORDS_REGEX.test(narrativeText)) return 'confrontation';
      if (DIALOGUE_WORDS_REGEX.test(narrativeText)) return 'dialogue';
      return 'two-shot';
    }
    return 'ensemble';
  }

  // Single-subject mode
  if (ACTION_VERBS_REGEX.test(narrativeText)) return 'action';
  if (REACTION_WORDS_REGEX.test(narrativeText)) return 'reaction';
  if (DIALOGUE_WORDS_REGEX.test(narrativeText)) return 'dialogue';

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
        angle = pick(['eye-level', 'three-quarter', 'over-the-shoulder'] as const, 1);
        lens = 'normal';
        depthOfField = 'moderate';
        mode = pick(['rule-of-thirds', 'layered-depth'] as const, 2);
        break;
      case 'two-shot':
        shotSize = pick(['medium', 'medium-wide'] as const);
        angle = pick(['three-quarter', 'over-the-shoulder', 'eye-level'] as const, 1);
        lens = pick(['normal', 'wide'] as const, 2);
        depthOfField = 'moderate';
        mode = pick(['layered-depth', 'rule-of-thirds', 'foreground-obstruction'] as const, 3);
        break;
      case 'confrontation':
        shotSize = pick(['medium-wide', 'medium'] as const);
        angle = pick(['three-quarter', 'over-the-shoulder', 'low-angle'] as const, 1);
        lens = pick(['normal', 'wide'] as const, 2);
        depthOfField = 'moderate';
        mode = pick(['layered-depth', 'foreground-obstruction', 'rule-of-thirds'] as const, 3);
        break;
      case 'action':
        shotSize = pick(['medium-wide', 'full-body'] as const);
        angle = pick(['eye-level', 'low-angle', 'three-quarter'] as const, 1);
        lens = pick(['normal', 'wide'] as const, 2);
        depthOfField = pick(['moderate', 'deep'] as const, 3);
        mode = pick(['rule-of-thirds', 'leading-lines', 'layered-depth'] as const, 4);
        break;
      case 'environment':
      case 'establishing':
        shotSize = pick(['wide', 'establishing'] as const);
        angle = pick(['eye-level', 'high-angle'] as const, 1);
        lens = pick(['wide', 'ultrawide'] as const, 2);
        depthOfField = 'deep';
        mode = pick(['layered-depth', 'frame-within-frame', 'leading-lines'] as const, 3);
        break;
      case 'detail':
        shotSize = pick(['close-up', 'macro'] as const);
        angle = pick(['eye-level', 'overhead', 'profile'] as const, 1);
        lens = pick(['macro', 'telephoto'] as const, 2);
        depthOfField = pick(['selective', 'shallow'] as const, 3);
        mode = pick(['centered', 'rule-of-thirds'] as const, 4);
        break;
      case 'ensemble':
        shotSize = pick(['wide', 'medium-wide', 'establishing'] as const);
        angle = pick(['three-quarter', 'eye-level', 'high-angle', 'over-the-shoulder'] as const, 1);
        lens = pick(['wide', 'normal'] as const, 2);
        depthOfField = pick(['deep', 'moderate'] as const, 3);
        mode = pick(['layered-depth', 'frame-within-frame', 'leading-lines', 'rule-of-thirds'] as const, 4);
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

    const fullNarrative = `${brief.action} ${cue?.visualDescription ?? ''} ${cue?.expression ?? ''} ${brief.scene}`.trim();

    // Context-driven kinetic / perspective cues before planner hint override
    if (/\b(?:kneels?|kneeling|crouched|crawling|fallen|on the floor|looms? over|towering)\b/i.test(fullNarrative) && intent !== 'detail') {
      angle = intent === 'action' ? 'ground-level' : 'low-angle';
    } else if (/\b(?:from above|balcony|staircase|overlooking|across the hall|crowded room)\b/i.test(fullNarrative) && (intent === 'ensemble' || intent === 'environment' || intent === 'establishing')) {
      angle = 'high-angle';
    } else if (/\b(?:doorway|archway|through the|framed by|over (?:his|her|their) shoulder)\b/i.test(fullNarrative) && intent !== 'portrait' && intent !== 'reaction') {
      if (intent === 'two-shot' || intent === 'dialogue' || intent === 'confrontation') angle = 'over-the-shoulder';
      mode = 'frame-within-frame';
    }

    if (/\b(?:screams?|shatters?|weeps?|sobbing|terrified|horrified|catastrophic|devastating|executes?|unleashes?|betrayal)\b/i.test(fullNarrative)) {
      if (intent === 'reaction') { shotSize = 'close-up'; depthOfField = 'shallow'; }
      else if (intent === 'action' || intent === 'confrontation') { angle = 'low-angle'; }
    }

    // Planner hint overrides (highest semantic precedence before style/manual overrides)
    if (cue?.shotHint?.preferredShotSize) shotSize = cue.shotHint.preferredShotSize;
    if (cue?.shotHint?.preferredAngle) angle = cue.shotHint.preferredAngle;
    if (cue?.shotHint?.preferredCompositionMode) mode = cue.shotHint.preferredCompositionMode;

    // Precedence 3: Intentionally selected style camera hints (override generic narrative defaults so smartphone/deep-focus styles never get portrait/bokeh overrides)
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
      if (hint.includes('eye-level')) {
        angle = 'eye-level';
      }
    }

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
      if (previousShot.camera.shotSize === shotSize && previousShot.camera.angle === angle) {
        angle = angle === 'eye-level' ? 'three-quarter' : 'eye-level';
      }
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
  const lineupNarrative = `${brief.action} ${cue?.visualDescription ?? ''}`;
  const explicitLineupRequested =
    manualOverrides.mode === 'lateral-ensemble' ||
    cue?.shotHint?.preferredCompositionMode === 'lateral-ensemble' ||
    EXPLICIT_LINEUP_REGEX.test(lineupNarrative);

  if (orientation === 'portrait') {
    // 9:16 favors vertical depth and stacked subject blocking
    if (mode === 'lateral-ensemble' || ((intent === 'ensemble' || intent === 'two-shot') && !cue?.shotHint?.preferredCompositionMode)) {
      mode = 'layered-depth';
    }
    if (intent === 'action' && shotSize === 'medium') shotSize = 'full-body';
  } else if (orientation === 'landscape') {
    // 16:9 / 21:9 widescreen uses horizontal room for depth and environmental staging unless lineup is explicit
    if (explicitLineupRequested && (intent === 'ensemble' || intent === 'two-shot') && !manualOverrides.mode && !cue?.shotHint?.preferredCompositionMode) {
      mode = 'lateral-ensemble';
    } else if (mode === 'lateral-ensemble' && !explicitLineupRequested) {
      mode = 'layered-depth';
    }
  } else if (orientation === 'square') {
    // 1:1 favors centralized or layered composition
    if (mode === 'lateral-ensemble') mode = 'layered-depth';
  }

  // Subject Placements
  const subjectPlacements: SubjectPlacement[] = [];
  let stagingNote: string | undefined = cue?.shotHint?.sceneStagingNote?.trim() || undefined;
  const focusTarget = cue?.shotHint?.focalSubject?.trim() || cue?.character || undefined;

  if (brief.subjectMode === 'ensemble' && cue?.ensembleSubjects && cue.ensembleSubjects.length > 0) {
    const narrativeClauses = `${cue.visualDescription ?? ''}; ${brief.action ?? ''}`
      .split(/[.;\n]+/)
      .map(part => part.trim())
      .filter(Boolean);
    const relationships = cue.shotHint?.spatialRelationships;

    const fallbackHorizontalPool: Array<SubjectPlacement['horizontal']> =
      orientation === 'portrait'
        ? ['center', 'left', 'right', 'center']
        : ['left', 'right', 'center', 'far-right', 'far-left'];
    const defaultDepthCycle: Array<NonNullable<SubjectPlacement['depth']>> =
      cue.ensembleSubjects.length === 2
        ? ['foreground', 'midground']
        : ['foreground', 'midground', 'background', 'midground', 'background'];

    const usedSlots = new Set<string>();
    const focalLower = focusTarget?.toLowerCase();

    cue.ensembleSubjects.forEach((sub, i) => {
      const matched = findSubjectClue(sub.name, relationships, narrativeClauses);
      const isFocal = Boolean(focalLower && sub.name.toLowerCase().includes(focalLower));
      const inferredDepth =
        inferDepthFromClue(matched?.clue) ??
        (isFocal && i === 0 ? 'foreground' : defaultDepthCycle[i % defaultDepthCycle.length]!);

      let chosenHorizontal = inferHorizontalFromClue(matched?.clue);
      if (!chosenHorizontal) {
        const startOffset = (seed + i) % fallbackHorizontalPool.length;
        for (let step = 0; step < fallbackHorizontalPool.length; step++) {
          const candidate = fallbackHorizontalPool[(startOffset + step) % fallbackHorizontalPool.length]!;
          if (!usedSlots.has(`${inferredDepth}:${candidate}`)) {
            chosenHorizontal = candidate;
            break;
          }
        }
        chosenHorizontal ??= fallbackHorizontalPool[i % fallbackHorizontalPool.length]!;
      }
      usedSlots.add(`${inferredDepth}:${chosenHorizontal}`);

      const scale: NonNullable<SubjectPlacement['scale']> =
        inferredDepth === 'foreground'
          ? (isFocal && cue.ensembleSubjects!.length <= 2 && angle === 'over-the-shoulder' ? 'dominant' : 'large')
          : inferredDepth === 'midground'
            ? 'medium'
            : 'small';

      subjectPlacements.push({
        subject: sub.name,
        horizontal: chosenHorizontal,
        depth: inferredDepth,
        scale,
        ...(matched?.clue ? { blocking: matched.clue } : {})
      });
    });

    if (!stagingNote && !explicitLineupRequested && subjectPlacements.length >= 2) {
      const distinctDepths = new Set(subjectPlacements.map(p => p.depth));
      if (distinctDepths.size >= 2 || subjectPlacements.some(p => p.blocking)) {
        stagingNote = 'Stage characters naturally across room depths interacting with each other and props rather than facing the camera in a row.';
      }
    }
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
      ...(focusTarget ? { focusTarget } : {})
    },
    composition: {
      mode,
      subjectPlacements,
      ...(stagingNote ? { stagingNote } : {})
    },
    ...(manualOverrides.crop ? { crop: manualOverrides.crop } : {}),
    ...(safeArea ? { safeArea } : {}),
    source: manualOverrides.shotSize || manualOverrides.angle ? 'manual' : cue?.shotHint ? 'planner' : 'deterministic-fallback',
    revision
  });
}
