/**
 * Escaping template for building HTML. Every interpolated value is escaped
 * unless it is already a SafeHtml value (from html`` or raw()), so forgetting
 * to escape is no longer the default. Arrays are joined without separators.
 *
 *   html`<li>${name}</li>`                                  // name is escaped
 *   html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`   // nested values are not escaped twice
 *
 * Read the markup with `.value` when assigning to innerHTML.
 */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

/** Marks a string as trusted HTML. Use only for markup this code generated itself. */
export function raw(value: string): SafeHtml {
  return new SafeHtml(value);
}

export function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return escapeText(String(value));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? "";
  for (let i = 0; i < values.length; i += 1) out += render(values[i]) + (strings[i + 1] ?? "");
  return new SafeHtml(out);
}
