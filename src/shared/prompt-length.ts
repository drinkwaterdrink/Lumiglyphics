export const IMAGE_PROMPT_MAX_CHARS = 3000;

/** Preserve normal prompts verbatim. For overlong prompts, remove only
 * whitespace at line boundaries and exact duplicate lines, never unique facts.
 */
export function compactPromptText(text: string): string {
  if (text.length <= IMAGE_PROMPT_MAX_CHARS) return text;
  const seen = new Set<string>();
  return text.split(/\r?\n/).map(line => line.trim()).filter(line => {
    if (!line || seen.has(line)) return false;
    seen.add(line); return true;
  }).join('\n');
}

export function assertPromptLengths(prompt: string, negative = ''): void {
  for (const [label, value] of [['Positive', prompt], ['Negative', negative]] as const) {
    if (value.length > IMAGE_PROMPT_MAX_CHARS) throw new Error(`${label} prompt is ${value.length} characters. Shorten it to 3,000 characters or fewer; unique details were not silently removed.`);
  }
}
