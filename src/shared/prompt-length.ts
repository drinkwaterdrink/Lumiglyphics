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

export function assertPromptLengths(prompt: string, negative = ''): void {
  const total = prompt.length + negative.length;
  if (total > IMAGE_PROMPT_MAX_CHARS) throw new Error(`Combined positive and negative prompts are ${total.toLocaleString()} characters (${prompt.length.toLocaleString()} positive + ${negative.length.toLocaleString()} negative). Shorten them to 3,000 characters total or fewer; unique details were not silently removed.`);
}
