import type { PromptDocument, PromptSection } from '../../shared/prompt-document.js';
import { assemblePromptSections } from '../../shared/prompt-document.js';
import type { PromptDialectId } from '../../shared/image-prompt-profile-v2.js';

export interface FitPromptResult {
  document: PromptDocument;
  prompt: string;
  fitted: boolean;
  warnings: string[];
}

function resolveSeparator(dialect: PromptDialectId, sections: PromptSection[]): string {
  if (dialect === 'anima' || dialect === 'generic-tags' || dialect === 'novelai') {
    return ', ';
  }
  if (dialect === 'gpt-image-2.5' || dialect === 'nano-banana-2.1') {
    const hasLabeledSections = sections.some(s => s.text.includes('\n'));
    if (hasLabeledSections) return '\n\n';
  }
  return ' ';
}

/**
 * Fits a PromptDocument to a character budget using priority-aware compression.
 * Preserves P0 identity, action, and wardrobe facts under all circumstances.
 * Never performs comma-splitting truncation on natural prose.
 */
export function fitPromptDocumentToBudget(
  document: PromptDocument,
  maxBudget: number
): FitPromptResult {
  const warnings = [...document.warnings];
  const separator = resolveSeparator(document.dialect, document.sections);

  let currentSections = [...document.sections];
  let prompt = assemblePromptSections(currentSections, separator);

  if (prompt.length <= maxBudget) {
    return {
      document,
      prompt,
      fitted: false,
      warnings
    };
  }

  // Stage 1: Drop P3 sections (decorative adjectives, redundant quality wording)
  const hadP3 = currentSections.some(s => s.priority === 3);
  if (hadP3) {
    currentSections = currentSections.filter(s => s.priority !== 3);
    prompt = assemblePromptSections(currentSections, separator);
    if (prompt.length <= maxBudget) {
      warnings.push(`Prompt fitted by removing non-essential decorative detail (${prompt.length}/${maxBudget} chars).`);
      return {
        document: { ...document, sections: currentSections, warnings },
        prompt,
        fitted: true,
        warnings
      };
    }
  }

  // Stage 2: Drop compressible P2 sections (secondary atmosphere, materials)
  currentSections = currentSections.filter(s => !(s.priority === 2 && s.compressible));
  prompt = assemblePromptSections(currentSections, separator);
  if (prompt.length <= maxBudget) {
    warnings.push(`Prompt fitted by compressing secondary visual treatment (${prompt.length}/${maxBudget} chars).`);
    return {
      document: { ...document, sections: currentSections, warnings },
      prompt,
      fitted: true,
      warnings
    };
  }

  // Stage 3: Drop all P2 sections
  currentSections = currentSections.filter(s => s.priority !== 2);
  prompt = assemblePromptSections(currentSections, separator);
  if (prompt.length <= maxBudget) {
    warnings.push(`Prompt fitted by removing secondary style and material sections (${prompt.length}/${maxBudget} chars).`);
    return {
      document: { ...document, sections: currentSections, warnings },
      prompt,
      fitted: true,
      warnings
    };
  }

  // Stage 4: Drop compressible P1 sections (camera/environment detail)
  currentSections = currentSections.filter(s => !(s.priority === 1 && s.compressible));
  prompt = assemblePromptSections(currentSections, separator);
  if (prompt.length <= maxBudget) {
    warnings.push(`Prompt fitted by condensing camera and environment details (${prompt.length}/${maxBudget} chars).`);
    return {
      document: { ...document, sections: currentSections, warnings },
      prompt,
      fitted: true,
      warnings
    };
  }

  // Stage 5: Retain only P0 required sections
  currentSections = currentSections.filter(s => s.priority === 0);
  prompt = assemblePromptSections(currentSections, separator);

  if (prompt.length <= maxBudget) {
    warnings.push(`Prompt fitted to essential core identity, cast, and action only (${prompt.length}/${maxBudget} chars).`);
    return {
      document: { ...document, sections: currentSections, warnings },
      prompt,
      fitted: true,
      warnings
    };
  }

  // P0 alone exceeds budget ceiling! We must NEVER slice or corrupt P0 facts.
  warnings.push(`Essential character identity and scene anchors (${prompt.length} chars) exceed budget ceiling (${maxBudget} chars). Hold for user review.`);

  return {
    document: { ...document, sections: currentSections, warnings },
    prompt,
    fitted: true,
    warnings
  };
}
