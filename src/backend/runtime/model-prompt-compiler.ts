import type { VisualBrief } from '../../shared/image-templates.js';
import type { ImageShotSpec } from '../../shared/image-shot-spec.js';
import type { StyleDNA } from '../../shared/style-dna.js';
import type { ImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import type { ImageOutputPlan } from '../../shared/image-output-plan.js';
import type { ReferencePlan } from '../../shared/reference-plan.js';
import type { PromptDocument } from '../../shared/prompt-document.js';
import type { VisualCue } from '../../shared/contracts.js';
import {
  classifySceneComplexity,
  resolveUsefulPromptBudget,
  type SceneComplexity,
  type PromptBudgetPlan
} from './prompt-budget.js';
import { getPromptSerializer } from './prompt-serializers/index.js';
import { fitPromptDocumentToBudget } from './prompt-fit-v2.js';
import { lintCompiledPrompt, type PromptLintResult } from './prompt-lint.js';

export interface ModelPromptCompilerInput {
  brief: VisualBrief;
  shotSpec: ImageShotSpec;
  styleDNA: StyleDNA;
  profile: ImagePromptProfileV2;
  outputPlan: ImageOutputPlan;
  referencePlan?: ReferencePlan | undefined;
  detailLevel?: 'auto' | 'compact' | 'standard' | 'detailed' | undefined;
  promptExpansionEnabled?: boolean | undefined;
  userBudgetOverride?: number | null | undefined;
  cue?: VisualCue | undefined;
}

export interface ModelPromptCompilerResult {
  document: PromptDocument;
  prompt: string;
  negativePrompt?: string | undefined;
  parameterHints?: Record<string, unknown> | undefined;
  warnings: string[];
  budgetPlan: PromptBudgetPlan;
  lint: PromptLintResult;
}

/**
 * Compiles a visual scene into a model-tailored prompt according to Image Prompt Engine V2.
 * Understands scene once, directs shot once, preserves identity once, then translates into target dialect.
 */
export function compileModelPrompt(input: ModelPromptCompilerInput): ModelPromptCompilerResult {
  const {
    brief,
    shotSpec,
    styleDNA,
    profile,
    outputPlan,
    referencePlan,
    detailLevel = 'auto',
    promptExpansionEnabled = profile.promptExpansion?.enabled,
    userBudgetOverride,
    cue
  } = input;

  // 1. Classify scene complexity
  const complexity: SceneComplexity = classifySceneComplexity({ brief, shotSpec, cue });

  // 2. Resolve soft and hard budget ranges
  const budgetPlan: PromptBudgetPlan = resolveUsefulPromptBudget(
    profile,
    complexity,
    promptExpansionEnabled,
    userBudgetOverride
  );

  // 3. Dispatch to dialect-specific serializer
  const serializer = getPromptSerializer(profile.dialect);
  const serialized = serializer({
    brief,
    shotSpec,
    styleDNA,
    profile,
    outputPlan,
    referencePlan,
    complexity,
    detailLevel,
    cue
  });

  // 4. Priority-aware budget fitting (preserves P0 identity, action, and wardrobe anchors)
  const negativeLen = serialized.negativePrompt ? serialized.negativePrompt.length : 0;
  const positiveTarget = Math.max(100, Math.min(budgetPlan.maxTarget, profile.hardMaxCharacters - negativeLen));
  const fitted = fitPromptDocumentToBudget(serialized.document, positiveTarget);

  // 5. Lint the compiled prompt against model-specific rules
  const lint = lintCompiledPrompt({
    prompt: fitted.prompt,
    negativePrompt: serialized.negativePrompt,
    document: fitted.document,
    profile,
    brief,
    shotSpec,
    referencePlan,
    cue
  });

  // 6. Aggregate warnings
  const warnings = [...new Set([
    ...serialized.warnings,
    ...fitted.warnings,
    ...lint.warnings
  ])];

  return {
    document: fitted.document,
    prompt: fitted.prompt,
    negativePrompt: serialized.negativePrompt,
    parameterHints: serialized.parameterHints,
    warnings,
    budgetPlan,
    lint
  };
}
