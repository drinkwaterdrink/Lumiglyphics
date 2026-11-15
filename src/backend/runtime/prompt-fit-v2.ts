import type { PromptDocument, PromptSection } from '../../shared/prompt-document.js';
import { assemblePromptSections } from '../../shared/prompt-document.js';
import type { PromptDialectId } from '../../shared/image-prompt-profile-v2.js';

export interface FitPromptResult {
  document: PromptDocument;
  prompt: string;
  fitted: boolean;
  warnings: string[];
}

const PROTECTED_STYLE_IDS = new Set([
  'style',
  'style-tags',
  'visual-style',
  'visual-treatment',
  'art-direction',
  'sec-visual-treatment'
]);

function deduplicateAndBoundText(raw: string, maxChars: number): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const looksLikeTagList = trimmed.includes(',') && !/[.!?](?:\s|$)/.test(trimmed);
  if (looksLikeTagList) {
    const tags = trimmed.split(/,\s*/).map(t => t.trim()).filter(Boolean);
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const tag of tags) {
      const norm = tag.toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      const next = kept.length ? `${kept.join(', ')}, ${tag}` : tag;
      if (next.length <= maxChars) kept.push(tag);
    }
    return kept.join(', ');
  }
  // First deduplicate repeated sentences/clauses in verbose environment blocks
  const parts = trimmed.split(/(?<=[.!?])\s+|\s*;\s*/).map(p => p.trim()).filter(Boolean);
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const cleanPart = part.replace(/\.{2,}$/, '.');
    const normalized = cleanPart.replace(/^(?:Setting|Environment|Background|Lighting|Style|Visual medium):\s*/i, '').replace(/[.!?,;:\s]+$/g, '').toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueParts.push(cleanPart);
  }
  const deduped = (uniqueParts.length > 0 ? uniqueParts.join(' ') : trimmed).replace(/\s+/g, ' ').trim();
  if (deduped.length <= maxChars) return deduped;
  if (maxChars <= 24) return '';
  const slice = deduped.slice(0, maxChars);
  const sentenceBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('; '), slice.lastIndexOf(', '));
  if (sentenceBreak > Math.floor(maxChars * 0.45)) {
    return slice.slice(0, sentenceBreak + 1).replace(/[,;\s]+$/, '').trim();
  }
  const wordBreak = slice.lastIndexOf(' ');
  return (wordBreak > Math.floor(maxChars * 0.4) ? slice.slice(0, wordBreak) : slice).replace(/[,;\s]+$/, '').trim();
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

  // Stage 1.5: Deduplicate & proportionally trim bloated compressible P1/P2 prose sections
  // (e.g. oversized scenery descriptions) BEFORE dropping Style, Lighting, or Camera.
  const oversizeThreshold = Math.max(180, Math.floor(maxBudget * 0.28));
  const bloatedIndices = currentSections
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.compressible && !s.required && s.priority !== 0 && !PROTECTED_STYLE_IDS.has(s.id) && s.text.length > oversizeThreshold);

  if (bloatedIndices.length > 0) {
    const excess = prompt.length - maxBudget;
    let remainingReduction = excess;
    const adjusted = currentSections.map(s => ({ ...s }));
    // Largest bloated sections shrink first
    bloatedIndices.sort((a, b) => b.s.text.length - a.s.text.length);
    for (const { idx } of bloatedIndices) {
      if (remainingReduction <= 0) break;
      const sec = adjusted[idx]!;
      const minKeep = Math.max(90, Math.floor(maxBudget * 0.14));
      const desired = Math.max(minKeep, sec.text.length - remainingReduction - 8);
      const compacted = deduplicateAndBoundText(sec.text, desired);
      if (compacted && compacted.length < sec.text.length) {
        remainingReduction -= (sec.text.length - compacted.length);
        sec.text = compacted;
      }
    }
    const candidatePrompt = assemblePromptSections(adjusted, separator);
    if (candidatePrompt.length <= maxBudget) {
      warnings.push(`Prompt fitted by condensing oversized environment or secondary details while preserving style and lighting (${candidatePrompt.length}/${maxBudget} chars).`);
      return {
        document: { ...document, sections: adjusted, warnings },
        prompt: candidatePrompt,
        fitted: true,
        warnings
      };
    }
    currentSections = adjusted;
    prompt = candidatePrompt;
  }

  // Stage 2: Drop non-style compressible P2 sections (secondary atmosphere, safe-area extras)
  const nonStyleP2 = currentSections.filter(s => !(s.priority === 2 && s.compressible && !PROTECTED_STYLE_IDS.has(s.id)));
  if (nonStyleP2.length < currentSections.length) {
    currentSections = nonStyleP2;
    prompt = assemblePromptSections(currentSections, separator);
    if (prompt.length <= maxBudget) {
      warnings.push(`Prompt fitted by compressing secondary visual treatment while preserving primary style (${prompt.length}/${maxBudget} chars).`);
      return {
        document: { ...document, sections: currentSections, warnings },
        prompt,
        fitted: true,
        warnings
      };
    }
  }

  // Stage 2.5: Condense long style sections proportionally before dropping style outright
  const longStyleIdx = currentSections.findIndex(s => s.priority === 2 && s.compressible && PROTECTED_STYLE_IDS.has(s.id) && s.text.length > 140);
  if (longStyleIdx !== -1 && prompt.length - maxBudget > 0) {
    const styleSec = currentSections[longStyleIdx]!;
    const trimmedStyle = deduplicateAndBoundText(styleSec.text, Math.max(100, styleSec.text.length - (prompt.length - maxBudget) - 8));
    if (trimmedStyle && trimmedStyle.length < styleSec.text.length) {
      currentSections = currentSections.map((s, idx) => idx === longStyleIdx ? { ...s, text: trimmedStyle } : s);
      prompt = assemblePromptSections(currentSections, separator);
      if (prompt.length <= maxBudget) {
        warnings.push(`Prompt fitted by condensing style phrasing to stay within budget (${prompt.length}/${maxBudget} chars).`);
        return {
          document: { ...document, sections: currentSections, warnings },
          prompt,
          fitted: true,
          warnings
        };
      }
    }
  }

  // Stage 3: Drop remaining non-style P2 sections; keep a reserved style slice
  // until compressible P1 environment/camera fluff has been shed.
  const withoutUnprotectedP2 = currentSections.filter(s => s.priority !== 2 || PROTECTED_STYLE_IDS.has(s.id));
  if (withoutUnprotectedP2.length < currentSections.length) {
    currentSections = withoutUnprotectedP2;
    prompt = assemblePromptSections(currentSections, separator);
    if (prompt.length <= maxBudget) {
      warnings.push(`Prompt fitted by removing non-essential secondary sections while preserving primary style (${prompt.length}/${maxBudget} chars).`);
      return {
        document: { ...document, sections: currentSections, warnings },
        prompt,
        fitted: true,
        warnings
      };
    }
  }

  // Stage 4: Drop compressible P1 sections (camera/environment extras) before style
  const withoutCompressibleP1 = currentSections.filter(s => !(s.priority === 1 && s.compressible && !PROTECTED_STYLE_IDS.has(s.id)));
  if (withoutCompressibleP1.length < currentSections.length) {
    currentSections = withoutCompressibleP1;
    prompt = assemblePromptSections(currentSections, separator);
    if (prompt.length <= maxBudget) {
      warnings.push(`Prompt fitted by condensing camera and environment details while preserving primary style (${prompt.length}/${maxBudget} chars).`);
      return {
        document: { ...document, sections: currentSections, warnings },
        prompt,
        fitted: true,
        warnings
      };
    }
  }

  // Stage 4.25: Condense protected style down to a reserved slice (>= 48 chars or ~16% of budget)
  const reservedStyleIdx = currentSections.findIndex(s => PROTECTED_STYLE_IDS.has(s.id) && s.compressible && s.text.length > 48);
  if (reservedStyleIdx !== -1 && prompt.length > maxBudget) {
    const styleSec = currentSections[reservedStyleIdx]!;
    const minStyleSlice = Math.max(48, Math.floor(maxBudget * 0.16));
    const trimmedStyle = deduplicateAndBoundText(styleSec.text, Math.max(minStyleSlice, styleSec.text.length - (prompt.length - maxBudget) - 8));
    if (trimmedStyle && trimmedStyle.length < styleSec.text.length) {
      currentSections = currentSections.map((s, idx) => idx === reservedStyleIdx ? { ...s, text: trimmedStyle } : s);
      prompt = assemblePromptSections(currentSections, separator);
      if (prompt.length <= maxBudget) {
        warnings.push(`Prompt fitted with reserved style slice (${prompt.length}/${maxBudget} chars).`);
        return {
          document: { ...document, sections: currentSections, warnings },
          prompt,
          fitted: true,
          warnings
        };
      }
    }
  }

  // Stage 4.5: Drop unprotected P2 style sections only as a last resort before P0
  currentSections = currentSections.filter(s => s.priority !== 2);
  prompt = assemblePromptSections(currentSections, separator);
  if (prompt.length <= maxBudget) {
    warnings.push(`Prompt fitted by removing remaining secondary style sections (${prompt.length}/${maxBudget} chars).`);
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
