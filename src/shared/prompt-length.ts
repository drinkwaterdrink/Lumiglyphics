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
