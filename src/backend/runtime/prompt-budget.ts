import { z } from 'zod';
import type { ImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import { promptBudgetTargets, type ImagePromptProfile } from '../../shared/image-prompt-profile.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import type { ImageShotSpec } from '../../shared/image-shot-spec.js';
import type { VisualCue } from '../../shared/contracts.js';

export const SceneComplexitySchema = z.enum([
  'simple',
  'standard',
  'complex',
  'dense'
]);
export type SceneComplexity = z.infer<typeof SceneComplexitySchema>;

export interface ClassifySceneOptions {
  brief: VisualBrief;
  shotSpec?: ImageShotSpec | undefined;
  cue?: VisualCue | undefined;
}

/**
 * Classifies scene visual complexity based on cast count, action, environment, and props.
 */
export function classifySceneComplexity(options: ClassifySceneOptions): SceneComplexity {
  const { brief, shotSpec, cue } = options;

  // 1. Check cast count
  if (brief.subjectMode === 'none') {
    if (shotSpec?.intent === 'detail' || shotSpec?.camera.shotSize === 'macro') {
      return 'simple';
    }
    // Rich environment or establishing shot
    const envLength = (brief.scene?.length ?? 0) + (brief.lighting?.length ?? 0);
    return envLength > 300 ? 'standard' : 'simple';
  }

  if (brief.subjectMode === 'ensemble') {
    // Count ensemble members
    const memberLines = brief.subjects.split('\n').filter(line => line.includes(':'));
    const count = memberLines.length;
    if (count >= 4) return 'dense';
    if (count >= 2) return 'complex';
    return 'standard';
  }

  // Single character cues
  const hasAction = Boolean(brief.action && brief.action.length > 50);
  const actionVal = cue?.action;
  const hasProps = Boolean(typeof actionVal === 'object' && actionVal !== null && 'object' in actionVal && actionVal.object);
  const isActionIntent = shotSpec?.intent === 'action' || shotSpec?.intent === 'confrontation';
  const isDenseIntent = shotSpec?.intent === 'manga-page' || shotSpec?.intent === 'ensemble';

  if (isDenseIntent) return 'dense';

  if (isActionIntent && (hasAction || hasProps)) {
    return 'complex';
  }

  if (hasAction && hasProps) {
    return 'complex';
  }

  if (hasAction || (brief.scene && brief.scene.length > 150)) {
    return 'standard';
  }

  // Simple portrait or reaction
  if (shotSpec?.intent === 'portrait' || shotSpec?.intent === 'reaction') {
    return 'simple';
  }

  return 'standard';
}

export interface PromptBudgetPlan {
  complexity: SceneComplexity;
  softRange: [number, number];
  hardLimit: number;
  maxTarget: number;
  wordCountGuard?: number | undefined;
  userOverrideApplied: boolean;
}

/**
 * Resolves the useful prompt budget using model profile dialect, scene complexity,
 * prompt expansion state, and user overrides.
 * Hard provider limit is an absolute ceiling, not a writing target.
 */
export function resolveUsefulPromptBudget(
  profile: ImagePromptProfileV2,
  complexity: SceneComplexity,
  promptExpansionEnabled?: boolean,
  userBudgetOverride?: number | null
): PromptBudgetPlan {
  const hardLimit = profile.hardMaxCharacters;

  // Choose base soft range from profile or default heuristics
  let softRange: [number, number] = profile.softBudgets[complexity];

  // Qwen expansion-on adjustment: when expansion is on, keep target concise
  if (profile.dialect === 'qwen-image-3' && promptExpansionEnabled) {
    softRange = profile.softBudgets[complexity];
  }

  // Safety headroom below provider hard max
  const headroom = Math.min(100, Math.floor(hardLimit * 0.05));
  const safeHardCeiling = Math.max(100, hardLimit - headroom);

  // Clamped soft max to provider safe ceiling
  let targetMax = Math.min(softRange[1], safeHardCeiling);
  let targetMin = Math.min(softRange[0], targetMax);

  let userOverrideApplied = false;

  // Manual user budget override remains authoritative up to the provider hard max
  if (typeof userBudgetOverride === 'number' && userBudgetOverride > 0) {
    userOverrideApplied = true;
    targetMax = Math.min(userBudgetOverride, safeHardCeiling);
    targetMin = Math.min(targetMin, targetMax);
    softRange = [targetMin, targetMax];
  }

  // Secondary word count guard (e.g. Seedream 5 Pro warns above ~600 words)
  let wordCountGuard: number | undefined;
  if (profile.dialect === 'seedream-5') {
    wordCountGuard = 600;
  }

  return {
    complexity,
    softRange: [targetMin, targetMax],
    hardLimit,
    maxTarget: targetMax,
    wordCountGuard,
    userOverrideApplied
  };
}

/**
 * Character allocations for writer guidance in prompt-rewrite (V1 fallback compatibility).
 * Exact cast blocks are counted after expansion. Scene space is allocated before
 * negatives and supporting detail; sparse evidence must still stay sparse.
 */
export function rewriteBudgetPlan(
  profile: ImagePromptProfile,
  identityCharacters: number,
  negativeCharacters: number,
  target?: number
) {
  const maximum = profile.maxCharacters;
  const minimumSceneCharacters = Math.min(100, Math.floor(maximum * 0.06));
  const generatedLimit = Math.min(
    maximum,
    Math.max(maximum - Math.min(50, Math.floor(maximum * 0.02)), identityCharacters + minimumSceneCharacters)
  );
  const desiredSceneCharacters = Math.min(360, Math.floor(maximum * 0.2));
  const negativeHint = profile.negativeMode === 'positive-only'
    ? 0
    : Math.min(negativeCharacters, 200, Math.floor(maximum * 0.08));
  const feasible = identityCharacters + minimumSceneCharacters <= maximum;
  const preferred = target ?? Math.max(promptBudgetTargets(profile).high, identityCharacters + desiredSceneCharacters + negativeHint);
  const targetCombinedCharacters = Math.min(generatedLimit, Math.max(preferred, identityCharacters + minimumSceneCharacters));
  let remaining = Math.max(0, targetCombinedCharacters - identityCharacters);
  const scenePriorityCharacters = Math.min(desiredSceneCharacters, remaining);
  remaining -= scenePriorityCharacters;
  const negativeTargetCharacters = Math.min(negativeHint, remaining);
  remaining -= negativeTargetCharacters;
  return {
    targetCombinedCharacters,
    generatedLimit,
    identityCharacters,
    minimumSceneCharacters,
    scenePriorityCharacters,
    negativeTargetCharacters,
    supportingDetailCharacters: remaining,
    positiveBeyondIdentityCharacters: Math.max(0, targetCombinedCharacters - identityCharacters - negativeTargetCharacters),
    feasible
  };
}
