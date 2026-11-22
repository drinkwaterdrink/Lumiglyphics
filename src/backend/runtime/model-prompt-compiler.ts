import { BUILTIN_IMAGE_TEMPLATES, type VisualBrief, type ImageTemplate } from '../../shared/image-templates.js';
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

export type SubjectPromptMode = 'delta-only' | 'full-prose';

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
  template?: ImageTemplate | undefined;
  modelId?: string | undefined;
  denoiseStrength?: number | undefined;
}

export function resolveSubjectPromptMode(input: {
  profile: ImagePromptProfileV2;
  referencePlan?: ReferencePlan | undefined;
  brief: VisualBrief;
  cue?: VisualCue | undefined;
  modelId?: string | undefined;
  denoiseStrength?: number | undefined;
}): SubjectPromptMode {
  if (!input.profile.features.references) return 'full-prose';
  if (/\/text-to-image$/i.test(input.modelId ?? '')) return 'full-prose';
  if (input.profile.dialect === 'novelai' || input.profile.dialect === 'anima') return 'full-prose';
  if (typeof input.denoiseStrength === 'number' && input.denoiseStrength >= 0.5) return 'full-prose';
  const hasWiredIdentity = Boolean(
    input.referencePlan?.references.some(
      (ref) => ref.role === 'identity' && typeof ref.wireIndex === 'number' && ref.wireIndex >= 1 && Boolean(ref.dataUrl)
    )
  );
  if (!hasWiredIdentity) return 'full-prose';
  const occlusionText = `${input.brief.action ?? ''} ${input.cue?.visualDescription ?? ''}`;
  if (/\b(?:silhouette|back[- ]?view|turned away|from behind|shadowed face)\b/i.test(occlusionText)) {
    return 'full-prose';
  }
  return 'delta-only';
}

function applyDeltaOnlySubjectBrief(brief: VisualBrief, referencePlan?: ReferencePlan): VisualBrief {
  const wiredIdentityRefs = (referencePlan?.references ?? []).filter(
    (ref) => ref.role === 'identity' && typeof ref.wireIndex === 'number' && ref.wireIndex >= 1 && Boolean(ref.dataUrl)
  );
  if (wiredIdentityRefs.length === 0) return brief;
  const primaryRef = wiredIdentityRefs[0]!;
  if (brief.subjectMode === 'one' && brief.subjectPreparation) {
    const attire = brief.subjectPreparation.attire?.trim();
    const subjectName = brief.subjectPreparation.name || primaryRef.subject || 'subject';
    const deltaIdentity = attire
      ? `matching Reference Image ${primaryRef.wireIndex}'s facial identity and hair; wearing ${attire}`
      : `matching Reference Image ${primaryRef.wireIndex}'s facial identity and hair`;
    return {
      ...brief,
      subjects: `${subjectName}, ${deltaIdentity}`,
      subjectPreparation: {
        ...brief.subjectPreparation,
        identity: deltaIdentity,
      },
    };
  }
  if (brief.subjectMode === 'ensemble' && brief.subjects) {
    const lines = brief.subjects.split('\n').map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx <= 0) return line;
      const name = line.slice(0, colonIdx).trim();
      const matched = wiredIdentityRefs.find((r) => r.subject && r.subject.trim().toLowerCase() === name.toLowerCase());
      if (!matched) return line;
      const body = line.slice(colonIdx + 1);
      const attireMatch = body.match(/;\s*(?:wearing|attired in)\s+([^;\n]+)/i);
      const attireClause = attireMatch?.[1] ? `; wearing ${attireMatch[1].trim()}` : '';
      return `${name}: matching Reference Image ${matched.wireIndex}'s facial identity and hair${attireClause}`;
    });
    return { ...brief, subjects: lines.join('\n') };
  }
  return brief;
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


function extractTemplateDirective(template?: ImageTemplate | null): { positiveDirective?: string; negativeDirective?: string } {
  if (!template) return {};
  const builtin = BUILTIN_IMAGE_TEMPLATES.find(b => b.id === template.id);
  let positiveDirective: string | undefined;
  let negativeDirective: string | undefined;

  if (!builtin || template.positive !== builtin.positive) {
    const stripped = template.positive
      .replace(/\{\{(?:style|scene|subjects|action|composition|lighting|suffix|negative)\}\}/gi, '')
      .replace(/^\s*(?:SUBJECT|CAST|SETTING|ACTION|MOMENT|INTERACTION|LIGHTING|SCENE):\s*$/gim, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ')
      .trim();
    if (stripped.length > 0) {
      positiveDirective = stripped;
    }
  }

  if (!builtin || template.negative !== builtin.negative) {
    const strippedNeg = template.negative
      .replace(/\{\{negative\}\}/gi, '')
      .split(/[,;\n]+/)
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .join(', ')
      .trim();
    if (strippedNeg.length > 0) {
      negativeDirective = strippedNeg;
    }
  }

  return {
    ...(positiveDirective !== undefined ? { positiveDirective } : {}),
    ...(negativeDirective !== undefined ? { negativeDirective } : {}),
  };
}

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
    styleDNA = {} as StyleDNA,
    profile,
    outputPlan,
    referencePlan,
    detailLevel = 'auto',
    promptExpansionEnabled = profile.promptExpansion?.enabled,
    userBudgetOverride,
    cue,
    modelId,
    denoiseStrength,
  } = input;

  const subjectPromptMode = resolveSubjectPromptMode({
    profile,
    referencePlan,
    brief,
    cue,
    modelId,
    denoiseStrength,
  });
  const effectiveBrief = subjectPromptMode === 'delta-only'
    ? applyDeltaOnlySubjectBrief(brief, referencePlan)
    : brief;

  // 1. Classify scene complexity
  const complexity: SceneComplexity = classifySceneComplexity({ brief: effectiveBrief, shotSpec, cue });

  // 2. Resolve soft and hard budget ranges
  const budgetPlan: PromptBudgetPlan = resolveUsefulPromptBudget(
    profile,
    complexity,
    promptExpansionEnabled,
    userBudgetOverride,
    detailLevel
  );

  // 3. Dispatch to dialect-specific serializer
  const serializer = getPromptSerializer(profile.dialect);
  const serialized = serializer({
    brief: effectiveBrief,
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
    if (!STYLE_SECTION_IDS.has(sec.id)) return sec;
    // Always protect style sections above generic P2 fluff: locked styles (`styleDNA.preserve`)
    // stay P1 non-compressible, while unlocked styles keep a reservable P1 compressible slice.
    return styleDNA.preserve
      ? { ...sec, priority: 1, compressible: false }
      : { ...sec, priority: 1, compressible: true };
  });

  // 3b. Inject custom Style Prefix at P0 (front-loaded opening authority) and Style Suffix at P0/P1
  const rawPrefix = styleDNA.prefix?.trim() ?? '';
  const cleanPrefix = profile.dialect === 'flux3-klein'
    ? rawPrefix.replace(/\bphotorealistic\b/gi, 'lifelike natural')
    : rawPrefix;
  const isIdeogramJson = profile.dialect === 'ideogram-v4' && profile.ideogramMode !== 'structured-prose';
  const kleinConsumedPrefix = profile.dialect === 'flux3-klein' && sections.some(s => s.id === 'medium-optics-opening' && s.text.toLowerCase().startsWith(cleanPrefix.toLowerCase()));
  if (cleanPrefix && !isIdeogramJson && !kleinConsumedPrefix) {
    const prefixText = isTagDialect ? cleanPrefix.replace(/[,;:\s]+$/, '') : formatProseSentence(cleanPrefix, false);
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

  const activeTemplate = input.template ?? cue?.imageTemplate;
  const templateDirective = extractTemplateDirective(activeTemplate);
  if (templateDirective.positiveDirective && !isIdeogramJson) {
    const directiveText = isTagDialect
      ? templateDirective.positiveDirective.replace(/[,;:\s]+$/, '')
      : formatProseSentence(templateDirective.positiveDirective, true);
    if (directiveText) {
      sections = [
        ...sections.slice(0, cleanPrefix ? 1 : 0),
        {
          id: 'template-directive',
          priority: 0,
          required: true,
          compressible: false,
          text: directiveText
        },
        ...sections.slice(cleanPrefix ? 1 : 0)
      ];
    }
  }

  const rawSuffix = styleDNA.suffix?.trim() ?? '';
  const cleanSuffix = profile.dialect === 'flux3-klein'
    ? rawSuffix.replace(/\bphotorealistic\b/gi, 'lifelike natural')
    : rawSuffix;
  if (cleanSuffix && !isIdeogramJson) {
    const suffixText = isTagDialect ? cleanSuffix.replace(/^[,;:\s]+/, '').replace(/[,;:\s]+$/, '') : formatProseSentence(cleanSuffix, false);
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

  // 3c. Merge custom negative prompt and template negative when supported
  let effectiveNegativePrompt = serialized.negativePrompt;
  if (profile.negativePolicy !== 'positive-only') {
    const customNeg = styleDNA.negative?.trim();
    if (customNeg) {
      effectiveNegativePrompt = effectiveNegativePrompt
        ? `${ customNeg }, ${ effectiveNegativePrompt }`
        : customNeg;
    }
    if (templateDirective.negativeDirective) {
      effectiveNegativePrompt = effectiveNegativePrompt
        ? `${ templateDirective.negativeDirective }, ${ effectiveNegativePrompt }`
        : templateDirective.negativeDirective;
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
