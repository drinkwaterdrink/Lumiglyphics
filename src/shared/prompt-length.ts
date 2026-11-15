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

export function assertPromptLengths(prompt: string, negative = '', profile?: ImagePromptProfile | any): void {
  const total = prompt.length + negative.length;
  const isPosOnly = profile?.negativeMode === 'positive-only' || profile?.negativePolicy === 'positive-only';
  const maximum = profile?.hardMaxCharacters ?? profile?.maxCharacters ?? IMAGE_PROMPT_MAX_CHARS;
  if (total > maximum) throw new Error(`Combined positive and negative prompts are ${total.toLocaleString()} characters (${prompt.length.toLocaleString()} positive + ${negative.length.toLocaleString()} negative). Shorten them to ${maximum.toLocaleString()} characters total or fewer; unique details were not silently removed.`);
  if (isPosOnly && negative.trim()) throw new Error('This endpoint requires positive-only wording. Regenerate the prompt to incorporate essential constraints into the positive description, or clear the negative field after reviewing it.');
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
  negativeMode?: 'dual' | 'positive-only' | string,
  options?: { pinnedClauses?: readonly string[]; reserveStyleTail?: boolean }
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
    const pinnedSet = new Set((options?.pinnedClauses ?? []).map(c => c.trim().toLowerCase()).filter(Boolean));
    const isStyleOrQualityTag = (tag: string): boolean =>
      /\b(?:style|aesthetic|palette|cel shading|watercolor|oil painting|anime|illustration|masterpiece|best quality|detailed lighting)\b/i.test(tag)
      || /^by\s+/i.test(tag);
    const isPinnedTag = (tag: string): boolean => {
      if (/\[\[LG_(?:PIN|CAST)_\d+_\d+\]\]/.test(tag)) return true;
      const lower = tag.toLowerCase();
      return [...pinnedSet].some(pin => pin.includes(lower) || lower.includes(pin));
    };

    const reservedCap = Math.min(Math.floor(allowedPositive * 0.25), allowedPositive);
    const reserved: string[] = [];
    let reservedLen = 0;
    // Collect explicit pinned tags first, then optional style tail tags from the back
    for (const tag of tags) {
      if (!isPinnedTag(tag)) continue;
      const nextLen = reservedLen ? reservedLen + 2 + tag.length : tag.length;
      if (nextLen <= reservedCap) {
        reserved.push(tag);
        reservedLen = nextLen;
      }
    }
    if (options?.reserveStyleTail !== false) {
      for (let i = tags.length - 1; i >= 0; i--) {
        const tag = tags[i]!;
        if (reserved.includes(tag) || !isStyleOrQualityTag(tag)) continue;
        const nextLen = reservedLen ? reservedLen + 2 + tag.length : tag.length;
        if (nextLen <= reservedCap) {
          reserved.push(tag);
          reservedLen = nextLen;
        }
      }
    }

    const bodyBudget = Math.max(40, allowedPositive - (reserved.length ? reservedLen + 2 : 0));
    const body: string[] = [];
    let bodyLen = 0;
    for (const tag of tags) {
      if (reserved.includes(tag)) continue;
      const nextLen = bodyLen ? bodyLen + 2 + tag.length : tag.length;
      if (nextLen <= bodyBudget) {
        body.push(tag);
        bodyLen = nextLen;
      } else if (!body.length && bodyBudget > 16) {
        body.push(tag.slice(0, bodyBudget).replace(/\s+\S*$/, '').trim());
        break;
      }
    }
    const combined = [...body, ...reserved].filter(Boolean).join(', ');
    effectivePrompt = combined || effectivePrompt.slice(0, allowedPositive).replace(/\s+\S*$/, '');
  }

  return {
    prompt: effectivePrompt.trim(),
    negativePrompt: effectiveNegative.trim(),
    fitted: true,
  };
}
