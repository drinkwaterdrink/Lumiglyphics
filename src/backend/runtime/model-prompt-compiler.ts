import type { VisualBrief } from '../../shared/image-templates.js';
import type { ImageShotSpec } from '../../shared/image-shot-spec.js';
import type { StyleDNA } from '../../shared/style-dna.js';
import type { ImagePromptProfileV2 } from '../../shared/image-prompt-profile-v2.js';
import type { ImageOutputPlan } from '../../shared/image-output-plan.js';
import type { ReferencePlan } from '../../shared/reference-plan.js';
import type { PromptDocument, PromptSection } from '../../shared/prompt-document.js';
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

const STYLE_SECTION_IDS = new Set([
  'style',
  'visual-style',
  'visual-treatment',
  'art-direction',
  'sec-visual-treatment',
  'style-tags'
]);

function formatProseSentence(raw: string, capitalizeStart = false): string {
  let cleaned = raw.trim().replace(/^[,;:\s]+/, '').replace(/[,;:\s]+$/, '').trim();
  if (!cleaned) return '';
  if (capitalizeStart && /^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  return cleaned;
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

  const isTagDialect = profile.dialect === 'anima' || profile.dialect === 'generic-tags' || profile.dialect === 'novelai';
  let sections: PromptSection[] = serialized.document.sections.map(sec => {
    // Protect real resolved styles (where styleDNA.preserve is set) from being dropped at Stage 2/3 of budget fitting
    if (styleDNA.preserve && STYLE_SECTION_IDS.has(sec.id)) {
      return { ...sec, priority: 1, compressible: false };
    }
    return sec;
  });

  // 3b. Inject custom Style Prefix at P0 (front-loaded opening authority) and Style Suffix at P0/P1
  const cleanPrefix = styleDNA.prefix?.trim() ?? '';
  if (cleanPrefix) {
    const prefixText = isTagDialect ? cleanPrefix.replace(/[,;:\s]+$/, '') : formatProseSentence(cleanPrefix, true);
    if (prefixText) {
      sections = [
        {
          id: 'style-prefix',
          priority: 0,
          required: true,
          compressible: false,
          text: prefixText
        },
        ...sections
      ];
    }
  }

  const cleanSuffix = styleDNA.suffix?.trim() ?? '';
  if (cleanSuffix) {
    const suffixText = isTagDialect ? cleanSuffix.replace(/^[,;:\s]+/, '').replace(/[,;:\s]+$/, '') : formatProseSentence(cleanSuffix, true);
    if (suffixText) {
      const constraintsIdx = sections.findIndex(s => s.id === 'constraints' || s.id === 'sec-constraints' || s.id === 'references');
      const suffixSection: PromptSection = {
        id: 'style-suffix',
        priority: 0,
        required: true,
        compressible: false,
        text: suffixText
      };
      if (constraintsIdx >= 0) {
        sections = [
          ...sections.slice(0, constraintsIdx),
          suffixSection,
          ...sections.slice(constraintsIdx)
        ];
      } else {
        sections = [...sections, suffixSection];
      }
    }
  }

  const enrichedDocument: PromptDocument = {
    ...serialized.document,
    sections
  };

  // 3c. Merge custom negative prompt or built-in style avoidIntent when supported
  let effectiveNegativePrompt = serialized.negativePrompt;
  if (profile.negativePolicy !== 'positive-only') {
    const customNeg = styleDNA.negative?.trim();
    if (customNeg) {
      effectiveNegativePrompt = effectiveNegativePrompt
        ? `${ customNeg }, ${ effectiveNegativePrompt }`
        : customNeg;
    }
  }

  // 4. Priority-aware budget fitting (preserves P0 identity, action, style prefix/suffix, and wardrobe anchors)
  const negativeLen = effectiveNegativePrompt ? effectiveNegativePrompt.length : 0;
  const positiveTarget = Math.max(100, Math.min(budgetPlan.maxTarget, profile.hardMaxCharacters - negativeLen));
  const fitted = fitPromptDocumentToBudget(enrichedDocument, positiveTarget);

  // 5. Lint the compiled prompt against model-specific rules
  const lint = lintCompiledPrompt({
    prompt: fitted.prompt,
    negativePrompt: effectiveNegativePrompt,
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
    negativePrompt: effectiveNegativePrompt,
    parameterHints: serialized.parameterHints,
    warnings,
    budgetPlan,
    lint
  };
}
