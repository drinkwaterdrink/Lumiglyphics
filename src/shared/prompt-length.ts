import type {ImagePromptProfile} from './image-prompt-profile.js';
export const IMAGE_PROMPT_MAX_CHARS = 3000;

/** Preserve normal prompts verbatim. For overlong prompts, remove only
 * whitespace at line boundaries and exact duplicate lines, never unique facts.
 */
export function compactPromptText(text: string, force = false): string {
  if (!force && text.length <= IMAGE_PROMPT_MAX_CHARS) return text;
  const seen = new Set<string>();
  return text.split(/\r?\n/).map(line => line.trim()).filter(line => {
    if (!line || seen.has(line)) return false;
    seen.add(line); return true;
  }).join('\n');
}

/** Negative exclusions may repeat across shared style and scene templates.
 * Remove exact duplicates only; never discard a unique exclusion. */
export function compactNegativePrompt(text: string): string {
  const seen = new Set<string>();
  return compactPromptText(text, true).split(',').map(part => part.trim()).filter(part => {
    const key = part.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).join(', ');
}

export function assertPromptLengths(prompt: string, negative = '', profile?:ImagePromptProfile): void {
  const total = prompt.length + negative.length;
  const maximum=profile?.maxCharacters??IMAGE_PROMPT_MAX_CHARS;
  if (total > maximum) throw new Error(`Combined positive and negative prompts are ${total.toLocaleString()} characters (${prompt.length.toLocaleString()} positive + ${negative.length.toLocaleString()} negative). Shorten them to ${maximum.toLocaleString()} characters total or fewer; unique details were not silently removed.`);
  if(profile?.negativeMode==='positive-only'&&negative.trim())throw new Error('This endpoint requires positive-only wording. Regenerate the prompt to incorporate essential constraints into the positive description, or clear the negative field after reviewing it.');
}

/**
 * Fits a prompt and its negative exclusions into a target character budget.
 * Handles positive-only endpoints, preserves immutable identity anchors and traits,
 * deduplicates repetitive tags, and safely trims decorative suffixes down to budget
 * at phrase/comma boundaries so generation can proceed reliably.
 */
export function fitPromptToBudget(
  prompt: string,
  negative = '',
  maxCharacters = IMAGE_PROMPT_MAX_CHARS,
  negativeMode?: 'dual' | 'positive-only' | string
): { prompt: string; negativePrompt: string; fitted: boolean } {
  let effectiveNegative = negativeMode === 'positive-only' ? '' : compactNegativePrompt(negative);
  let effectivePrompt = compactPromptText(prompt, true);

  if (effectivePrompt.length + effectiveNegative.length <= maxCharacters) {
    return { prompt: effectivePrompt, negativePrompt: effectiveNegative, fitted: false };
  }

  // Deduplicate tags while preserving order, anchors and weighting
  const deduplicateTags = (text: string): string => {
    const seen = new Set<string>();
    const tags = text.split(/,\s*|\r?\n/).map(t => t.trim()).filter(Boolean);
    const result: string[] = [];
    for (const tag of tags) {
      const lower = tag.toLowerCase();
      // Keep anchors and weighted expressions intact, deduplicate ordinary repetitive tags
      const isAnchorOrWeight = tag.startsWith('(') || tag.includes(':') || tag.startsWith('[') || tag.includes('anchor');
      if (isAnchorOrWeight || !seen.has(lower)) {
        if (!isAnchorOrWeight) seen.add(lower);
        result.push(tag);
      }
    }
    return result.join(', ');
  };

  effectivePrompt = deduplicateTags(effectivePrompt);
  if (effectiveNegative) {
    effectiveNegative = deduplicateTags(effectiveNegative);
  }

  if (effectivePrompt.length + effectiveNegative.length <= maxCharacters) {
    return { prompt: effectivePrompt, negativePrompt: effectiveNegative, fitted: true };
  }

  // Cap negative exclusions first if they consume more than 15% of the total budget
  const maxNegative = negativeMode === 'positive-only' ? 0 : Math.min(effectiveNegative.length, Math.floor(maxCharacters * 0.15));
  if (effectiveNegative.length > maxNegative) {
    const negTags = effectiveNegative.split(/,\s*/);
    let curNeg = '';
    for (const tag of negTags) {
      const candidate = curNeg ? `${curNeg}, ${tag}` : tag;
      if (candidate.length <= maxNegative) {
        curNeg = candidate;
      } else {
        break;
      }
    }
    effectiveNegative = curNeg;
  }

  const allowedPositive = Math.max(100, maxCharacters - effectiveNegative.length);
  if (effectivePrompt.length > allowedPositive) {
    const tags = effectivePrompt.split(/,\s*|\r?\n/).map(t => t.trim()).filter(Boolean);
    let curPrompt = '';
    for (const tag of tags) {
      const candidate = curPrompt ? `${curPrompt}, ${tag}` : tag;
      if (candidate.length <= allowedPositive) {
        curPrompt = candidate;
      } else {
        break;
      }
    }
    effectivePrompt = curPrompt || effectivePrompt.slice(0, allowedPositive).replace(/\s+\S*$/, '');
  }

  return {
    prompt: effectivePrompt.trim(),
    negativePrompt: effectiveNegative.trim(),
    fitted: true,
  };
}
