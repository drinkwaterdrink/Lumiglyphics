import { TEXT_EFFECT_IDS, isTextEffectId } from "../../shared/text-effects.js";

export type CustomRegexRule = {
  pattern: RegExp;
  replacement: string;
};

/**
 * Parse custom regex rules from user settings.
 * Supports:
 *   /pattern/flags => replacement
 *   pattern => replacement
 */
export function parseCustomRegexRules(input: string | undefined): CustomRegexRule[] {
  if (!input) return [];
  const rules: CustomRegexRule[] = [];
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

    const regexMatch = trimmed.match(/^\/(.+)\/([a-z]*)\s*=>\s*(.*)$/);
    if (regexMatch) {
      try {
        const pattern = new RegExp(regexMatch[1]!, regexMatch[2] || "g");
        rules.push({ pattern, replacement: regexMatch[3] ?? "" });
        continue;
      } catch {
        // Skip invalid regex
      }
    }

    const simpleMatch = trimmed.split("=>");
    if (simpleMatch.length >= 2) {
      try {
        const rawPattern = simpleMatch[0]!.trim();
        const replacement = simpleMatch.slice(1).join("=>").trim();
        const pattern = new RegExp(rawPattern, "g");
        rules.push({ pattern, replacement });
      } catch {
        // Skip invalid regex
      }
    }
  }
  return rules;
}

/**
 * Escape HTML special characters (&, <, >) for safe rendering.
 * Quotes (' and ") do not have syntactic meaning in HTML text nodes
 * and are preserved so dialogue quotes remain natural.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Parse standard Markdown syntax:
 * - Bold + Italic: ***text***, ___text___, **_text_**, __*text*__
 * - Bold: **text**, __text__
 * - Italic: *text*, _text_
 * - Strikethrough: ~~text~~
 * - Inline code: `text`
 */
function parseMarkdown(text: string): string {
  // 1. Triple formatting (bold + italic)
  let md = text
    .replace(/\*\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/(^|[^\w])___([^\s_](?:[\s\S]*?[^\s_])?)___(?=[^\w]|$)/g, "$1<strong><em>$2</em></strong>")
    .replace(/\*\*_(.+?)_\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/__\*(.+?)\*__/g, "<strong><em>$1</em></strong>");

  // 2. Bold (**text** or __text__)
  md = md
    .replace(/\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w])__([^\s_](?:[\s\S]*?[^\s_])?)__(?=[^\w]|$)/g, "$1<strong>$2</strong>");

  // 3. Italic (*text* or _text_)
  md = md
    .replace(/\*([^\s*](?:[\s\S]*?[^\s*])?)\*/g, "<em>$1</em>")
    .replace(/(^|[^\w])_([^\s_](?:[\s\S]*?[^\s_])?)_(?=[^\w]|$)/g, "$1<em>$2</em>");

  // 4. Strikethrough (~~text~~)
  md = md.replace(/~~([^\s~](?:[\s\S]*?[^\s~])?)~~/g, "<del>$1</del>");

  // 5. Inline code (`text`)
  md = md.replace(/`([^`]+)`/g, "<code>$1</code>");

  return md;
}

const ALLOWED_TAGS = new Set([
  "font",
  "span",
  "em",
  "strong",
  "b",
  "i",
  "del",
  "s",
  "u",
  "mark",
  "ruby",
  "rt",
  "rp",
  "code",
  "small",
  "sub",
  "sup",
  "br",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  font: new Set(["color", "style", "face", "size"]),
  span: new Set(["class", "style", "data-vn-text-fx"]),
  em: new Set(["class", "style"]),
  strong: new Set(["class", "style"]),
  b: new Set(["class", "style"]),
  i: new Set(["class", "style"]),
  code: new Set(["class", "style"]),
  mark: new Set(["class", "style"]),
};

// Story markup is untrusted. Keep a deliberately small CSS language rather
// than trying to recognize every spelling of CSS functions that can fetch.
// In particular, no escapes, comments, entities, custom properties, var(),
// font shorthands or arbitrary classes/font names cross this boundary.
const NAMED_COLORS = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor").split(" "));
const GENERIC_FONTS = /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded)$/i;
const TEXT_LENGTH = /^(?:0|-?(?:\d{1,3}(?:\.\d{1,3})?|\.\d{1,3})(?:px|em|rem|%))$/i;

function isTextColor(value: string): boolean {
  if (NAMED_COLORS.has(value.toLowerCase()) || /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return true;
  const functional = /^(rgb|rgba|hsl|hsla)\(([^()]+)\)$/i.exec(value);
  if (!functional) return false;
  const body = functional[2]!.trim();
  let parts: string[];
  if (body.includes(",")) {
    if (body.includes("/")) return false;
    parts = body.split(",").map((part) => part.trim());
  } else {
    const groups = body.split("/");
    if (groups.length > 2) return false;
    parts = groups[0]!.trim().split(/\s+/);
    if (parts.length !== 3) return false;
    if (groups[1] !== undefined) parts.push(groups[1].trim());
  }
  if (parts.length !== 3 && parts.length !== 4) return false;
  const channel = (part: string, max: number, percentOnly = false) => {
    if (!/^(?:\d{1,3}(?:\.\d{1,3})?|\.\d{1,3})%?$/.test(part)) return false;
    const percent = part.endsWith("%");
    return (!percentOnly || percent) && Number.parseFloat(part) <= (percent ? 100 : max);
  };
  const hsl = functional[1]!.toLowerCase().startsWith("hsl");
  return parts.slice(0, 3).every((part, index) => channel(part, hsl ? 360 : 255, hsl && index > 0))
    && (parts[3] === undefined || channel(parts[3], 1));
}

const TEXT_STYLE_VALUES: Record<string, (value: string) => boolean> = {
  color: isTextColor,
  "background-color": isTextColor,
  "text-decoration-color": isTextColor,
  "font-family": (value) => GENERIC_FONTS.test(value),
  "font-weight": (value) => /^(?:normal|bold|bolder|lighter|[1-9]00)$/.test(value),
  "font-style": (value) => /^(?:normal|italic|oblique)$/.test(value),
  "font-size": (value) => TEXT_LENGTH.test(value) || /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/.test(value),
  "font-variant": (value) => /^(?:normal|small-caps)$/.test(value),
  "letter-spacing": (value) => value === "normal" || TEXT_LENGTH.test(value),
  "word-spacing": (value) => value === "normal" || TEXT_LENGTH.test(value),
  "line-height": (value) => value === "normal" || TEXT_LENGTH.test(value) || /^(?:\d{1,2}(?:\.\d{1,3})?|\.\d{1,3})$/.test(value),
  "text-decoration": (value) => /^(?:none|(?:underline|overline|line-through)(?: (?:underline|overline|line-through))*)$/.test(value),
  "text-decoration-line": (value) => /^(?:none|(?:underline|overline|line-through)(?: (?:underline|overline|line-through))*)$/.test(value),
  "text-decoration-style": (value) => /^(?:solid|double|dotted|dashed|wavy)$/.test(value),
  "text-transform": (value) => /^(?:none|capitalize|uppercase|lowercase)$/.test(value),
  "vertical-align": (value) => /^(?:baseline|sub|super|text-top|text-bottom|middle|top|bottom)$/.test(value) || TEXT_LENGTH.test(value),
  "text-shadow": (value) => value === "none" || value.split(",").every((shadow) => {
    const parts = shadow.trim().split(/\s+/);
    if (isTextColor(parts[0] ?? "")) parts.shift();
    else if (isTextColor(parts.at(-1) ?? "")) parts.pop();
    return parts.length >= 2 && parts.length <= 3 && parts.every((part) => TEXT_LENGTH.test(part));
  }),
};

function sanitizeTextStyle(style: string): string {
  return style.split(";").flatMap((declaration) => {
    const match = /^\s*([a-z-]+)\s*:\s*([^:]+?)\s*$/i.exec(declaration);
    if (!match) return [];
    const property = match[1]!.toLowerCase();
    const value = match[2]!.trim();
    // Reject syntax outside this tiny grammar before property validation.
    if (/[^a-z\d#.%+\-(),\/\s]/i.test(value) || /\/\*|\*\//.test(value)) return [];
    const validate = Object.hasOwn(TEXT_STYLE_VALUES, property) ? TEXT_STYLE_VALUES[property] : undefined;
    return validate?.(value) ? [`${property}:${value}`] : [];
  }).join(";");
}

/**
 * Safely restore allowed HTML tags and sanitize their attributes.
 * Prevents XSS (scripts, event handlers, javascript: URIs, untrusted tags).
 */
function sanitizeAndRestoreAllowedHtml(escapedText: string): string {
  // Matches escaped tags: &lt;tag-name ...&gt; or &lt;/tag-name&gt;
  return escapedText.replace(/&lt;(\/?[a-zA-Z][a-zA-Z0-9]*)(.*?)&gt;/gs, (fullMatch, rawTag: string, rawAttrs: string) => {
    const isClosing = rawTag.startsWith("/");
    const tagName = (isClosing ? rawTag.slice(1) : rawTag).toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      return fullMatch;
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    if (tagName === "br") {
      return "<br>";
    }

    const allowedAttrSet = ALLOWED_ATTRS[tagName];
    if (!allowedAttrSet) {
      return `<${tagName}>`;
    }

    // Extract attributes: name="val", name='val', name=val
    const attrRegex = /([a-zA-Z_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    const safeAttrs: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = match[1]!.toLowerCase();
      if (!allowedAttrSet.has(attrName)) continue;

      let val = match[2] ?? match[3] ?? match[4] ?? "";

      if (attrName === "style") {
        val = sanitizeTextStyle(val);
        if (!val) continue;
      } else if (attrName === "data-vn-text-fx") {
        // Only catalogue ids; anything else drops the attribute.
        val = val.trim().toLowerCase();
        if (!isTextEffectId(val)) continue;
      } else if (attrName === "class") {
        val = val.split(/\s+/).filter((token) => token === "vn-transmission").join(" ");
        if (!val) continue;
      } else if (attrName === "face") {
        if (!GENERIC_FONTS.test(val)) continue;
      } else if (attrName === "color") {
        if (!isTextColor(val)) continue;
      } else if (attrName === "size") {
        if (!/^[+-]?[1-7]$/.test(val)) continue;
      }

      safeAttrs.push(`${attrName}="${val}"`);
    }

    const attrStr = safeAttrs.length > 0 ? ` ${safeAttrs.join(" ")}` : "";
    return `<${tagName}${attrStr}>`;
  });
}

// Escaped effect tags (`&lt;shake&gt;`, `&lt;/Shake&gt;`) or an inline code
// span, which is skipped so `<shake>` inside backticks stays literal.
const ESCAPED_TEXT_EFFECT_TOKEN = new RegExp(
  `<code\\b[^>]*>[\\s\\S]*?<\\/code>|&lt;\\s*(\\/?)\\s*(${TEXT_EFFECT_IDS.join("|")})\\s*&gt;`,
  "gi",
);

/**
 * Turn escaped catalogue tags into effect spans. Tags are paired with a
 * stack, so output is always balanced: a closing tag closes the nearest open
 * tag with the same id (inner unclosed tags are dropped), stray closing tags
 * and tags left open at the end are dropped. An unclosed tag therefore never
 * swallows the rest of the paragraph or breaks later markup.
 */
function restoreTextEffectTags(escapedText: string): string {
  if (escapedText.indexOf("&lt;") === -1) return escapedText;
  type Token = { start: number; end: number; closing: boolean; id: string };
  const tokens: Token[] = [];
  for (const match of escapedText.matchAll(ESCAPED_TEXT_EFFECT_TOKEN)) {
    if (match[2] === undefined) continue; // code span
    tokens.push({
      start: match.index,
      end: match.index + match[0].length,
      closing: match[1] === "/",
      id: match[2].toLowerCase(),
    });
  }
  if (tokens.length === 0) return escapedText;
  const replacement = new Map<Token, string>();
  const open: Token[] = [];
  for (const token of tokens) {
    replacement.set(token, "");
    if (!token.closing) {
      open.push(token);
      continue;
    }
    let depth = open.length - 1;
    while (depth >= 0 && open[depth]!.id !== token.id) depth -= 1;
    if (depth < 0) continue; // stray closing tag
    // Tags opened after the matching one were never closed: drop them.
    open.length = depth + 1;
    const opener = open.pop()!;
    replacement.set(opener, `<span data-vn-text-fx="${opener.id}">`);
    replacement.set(token, "</span>");
  }
  let output = "";
  let cursor = 0;
  for (const token of tokens) {
    output += escapedText.slice(cursor, token.start) + replacement.get(token);
    cursor = token.end;
  }
  return output + escapedText.slice(cursor);
}

/**
 * Format raw paragraph text for rich display:
 * 1. Strip inline image tags (<img="name">, {{img::name}})
 * 2. Apply user custom display regex rules
 * 3. Escape HTML special characters
 * 4. Parse markdown syntax (**bold**, *italic*, _italic_, ~~strike~~, `code`)
 * 5. Sanitize and allow safe HTML tags (<font>, <span>, <em>, etc.)
 * 6. Turn paired text effect tags (<shake>, <rainbow>, ... see
 *    src/shared/text-effects.ts) into `<span data-vn-text-fx="id">`.
 *    Display regex rules run first, so a rule may emit these tags too.
 */
export type DialogueFormatOptions = {
  stripMarkdown?: boolean;
  forceQuotes?: boolean;
  hasSpeaker?: boolean;
};

function stripMarkdown(text: string): string {
  // Strip metadata tags like **Time**: ..., **Location**: ...
  let md = text
    .replace(/(?:\*\*|__)?(?:Time|Location|Costume|Scene|Date|Setting)(?:\*\*)?\s*:[^\n]*(?:\r?\n|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Triple formatting (bold + italic)
  md = md
    .replace(/\*\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*\*/g, "$1")
    .replace(/(^|[^\w])___([^\s_](?:[\s\S]*?[^\s_])?)___(?=[^\w]|$)/g, "$1$2")
    .replace(/\*\*_(.+?)_\*\*/g, "$1")
    .replace(/__\*(.+?)\*__/g, "$1");

  // 2. Bold (**text** or __text__)
  md = md
    .replace(/\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*/g, "$1")
    .replace(/(^|[^\w])__([^\s_](?:[\s\S]*?[^\s_])?)__(?=[^\w]|$)/g, "$1$2");

  // 3. Italic (*text* or _text_)
  md = md
    .replace(/\*([^\s*](?:[\s\S]*?[^\s*])?)\*/g, "$1")
    .replace(/(^|[^\w])_([^\s_](?:[\s\S]*?[^\s_])?)_(?=[^\w]|$)/g, "$1$2");

  // 4. Strikethrough (~~text~~)
  md = md.replace(/~~([^\s~](?:[\s\S]*?[^\s~])?)~~/g, "$1");

  // 5. Inline code (`text`)
  md = md.replace(/`([^`]+)`/g, "$1");

  return md;
}

function applyDialogueQuotes(text: string, hasSpeaker: boolean): string {
  const trimmed = text.trim();
  if (!trimmed || !hasSpeaker) return text;
  if (/[“"”「」]/.test(trimmed)) return text;
  return `"${trimmed}"`;
}

export function formatDialogueText(
  rawText: string,
  regexRules: CustomRegexRule[] = [],
  options: DialogueFormatOptions = {},
): string {
  if (!rawText) return "";

  // 1. Strip inline card images / asset markers
  let text = rawText
    .replace(/<img\s*=\s*["'][^"']+["']\s*\/?>/gi, "")
    .replace(/<img\b[^>]*?\bsrc\s*=\s*["'][^"']+["'][^>]*?\/?>/gi, "")
    .replace(/\{\{img::[^\}]+\}\}/gi, "");

  // 2. Apply custom regex rules
  for (const { pattern, replacement } of regexRules) {
    try {
      text = text.replace(pattern, replacement);
    } catch {
      // Ignore rule execution failures
    }
  }

  // 3. Escape HTML special characters
  let formatted = escapeHtml(text);

  // 4. Parse or strip markdown syntax
  if (options.stripMarkdown) {
    formatted = stripMarkdown(formatted);
  } else {
    formatted = parseMarkdown(formatted);
  }

  // 5. Apply quotes if necessary for spoken dialogue
  if (options.forceQuotes) {
    formatted = applyDialogueQuotes(formatted, Boolean(options.hasSpeaker));
  }

  // 6. Restore sanitized safe tags
  formatted = sanitizeAndRestoreAllowedHtml(formatted);

  // 7. Paired text effect tags become effect spans (unpaired ones are dropped)
  formatted = restoreTextEffectTags(formatted);

  return formatted;
}

