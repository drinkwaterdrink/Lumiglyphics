import type { Choice, Paragraph } from "../../shared/contracts.js";
import { isTextEffectId } from "../../shared/text-effects.js";
import { escapePanelText, extractPanelSpans, maskPanelSpans, panelHash, MAX_PANELS, MAX_PANEL_HTML, MAX_PANEL_TOTAL, type PanelArtifact, type PanelSpan } from "../../shared/panels.js";

export type PrepareNarrativeOptions = {
  ignoredTags?: readonly string[];
  smartProseFilter?: boolean;
  smartDialogueExtraction?: boolean;
};

export type DetectedSceneMetadata = {
  location?: string;
  title?: string;
  timeOfDay?: string;
  atmosphere?: string;
  lighting?: string;
  weather?: string;
};

export type DetectedSpeakerInfo = {
  paragraphIndex: number;
  speaker: string;
};

export const BUILTIN_HEURISTIC_TAGS: readonly string[] = [
  "chapter",
  "chapter_header",
  "chapter-header",
  "chapter_info",
  "chapter-info",
  "chapter_heading",
  "chapter-heading",
  "scene_heading",
  "scene-heading",
  "scene_header",
  "scene-header",
  "scene_info",
  "scene-info",
  "scene",
  "setting",
  "location_header",
  "location-header",
  "location",
  "environment",
  "atmosphere",
  "think",
  "thought",
  "reasoning",
  "reflection",
  "metadata",
  "narrative_notes",
  "narrative-notes",
  "system",
  "system_prompt",
  "system-prompt",
  "context",
  "ooc",
  "author_note",
  "author-note",
  "cognition_trace",
  "cognition-trace",
  "cognition",
  "neural_dock",
  "neural-dock",
  "parasite_feed",
  "parasite-feed",
  "subject_status",
  "subject-status",
  "deep_archive",
  "deep-archive",
  "memory_spine",
  "memory-spine",
  "peripheral_processes",
  "peripheral-processes",
  "subvocal_leakage",
  "subvocal-leakage",
  "affective_state",
  "affective-state",
  "relationship_mesh",
  "relationship-mesh",
  "latent_threads",
  "latent-threads",
  "network_organisms",
  "network-organisms",
  "world_body",
  "world-body",
  "field_ledger",
  "field-ledger",
  "details",
  "summary",
  "tracker",
  "sim_tracker",
  "sim-tracker",
  "simulation",
  "sim",
  "status_block",
  "status-block",
  "hud",
];

function cleanAttributeOrText(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/^["'“”]|["'“”]$/g, "").replace(/<[^>]+>/g, "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 160) : undefined;
}

export function extractDetectedSceneMetadata(content: string): DetectedSceneMetadata | undefined {
  let location: string | undefined;
  let title: string | undefined;
  let timeOfDay: string | undefined;
  let atmosphere: string | undefined;
  let lighting: string | undefined;
  let weather: string | undefined;

  // 1. XML attribute-style tags: <scene_header location="..." time="..." ...>
  const tagAttrRegex = /<(?:[a-zA-Z0-9_-]+_)?(?:scene[-_]?header|scene[-_]?info|scene|setting|location[-_]?header|environment|atmosphere|chapter[-_]?header|chapter)\b([^>]*)\/?>/gi;
  for (const match of content.matchAll(tagAttrRegex)) {
    const attrs = match[1] || "";
    for (const attrMatch of attrs.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      const key = attrMatch[1]!.toLowerCase().replace(/[-_]/g, "");
      const val = cleanAttributeOrText(attrMatch[2] ?? attrMatch[3] ?? attrMatch[4]);
      if (!val) continue;
      if (["location", "place", "setting", "area"].includes(key) && !location) location = val;
      else if (["title", "chaptertitle"].includes(key) && !title) title = val;
      else if (["time", "timeofday", "tod"].includes(key) && !timeOfDay) timeOfDay = val;
      else if (["atmosphere", "mood", "ambience", "ambient"].includes(key) && !atmosphere) atmosphere = val;
      else if (["lighting", "light"].includes(key) && !lighting) lighting = val;
      else if (["weather"].includes(key) && !weather) weather = val;
    }
  }

  // 2. Structured body inside scene tags or bracket lines:
  // e.g. <scene_header>Location: Old Town | Time: Midnight</scene_header> or [Scene: Location: Old Town | Time: Midnight]
  const structuredBlocks: string[] = [];
  for (const match of content.matchAll(/<(?:[a-zA-Z0-9_-]+_)?(?:scene[-_]?header|scene[-_]?info|scene|setting|location[-_]?header|environment|atmosphere|chapter[-_]?header|chapter)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+_)?(?:scene[-_]?header|scene[-_]?info|scene|setting|location[-_]?header|environment|atmosphere|chapter[-_]?header|chapter)>/gi)) {
    if (match[1]) structuredBlocks.push(match[1]);
  }
  for (const match of content.matchAll(/\[(?:Scene|Location|Setting|Environment|Atmosphere|Chapter)\b[:\s]([^\]]+)\]/gi)) {
    if (match[1]) structuredBlocks.push(match[1]);
  }

  for (const block of structuredBlocks) {
    const locMatch = block.match(/(?:location|place|setting|area)\s*[:=]\s*([^|\n;]+)/i);
    if (locMatch && !location) location = cleanAttributeOrText(locMatch[1]);

    const titleMatch = block.match(/(?:title|chapter[-_]?title)\s*[:=]\s*([^|\n;]+)/i);
    if (titleMatch && !title) title = cleanAttributeOrText(titleMatch[1]);

    const timeMatch = block.match(/(?:time(?:_of_day)?|tod)\s*[:=]\s*([^|\n,;]+)/i);
    if (timeMatch && !timeOfDay) timeOfDay = cleanAttributeOrText(timeMatch[1]);

    const atmoMatch = block.match(/(?:atmosphere|mood|ambience|ambient)\s*[:=]\s*([^|\n,;]+)/i);
    if (atmoMatch && !atmosphere) atmosphere = cleanAttributeOrText(atmoMatch[1]);

    const lightMatch = block.match(/(?:lighting|light)\s*[:=]\s*([^|\n,;]+)/i);
    if (lightMatch && !lighting) lighting = cleanAttributeOrText(lightMatch[1]);

    const weatherMatch = block.match(/(?:weather)\s*[:=]\s*([^|\n,;]+)/i);
    if (weatherMatch && !weather) weather = cleanAttributeOrText(weatherMatch[1]);

    if (!location && !locMatch) {
      const parts = block.split(/[|,]/).map((p) => p.trim()).filter(Boolean);
      if (parts[0] && !/^(?:time|lighting|weather|atmosphere)/i.test(parts[0])) {
        location = cleanAttributeOrText(parts[0]);
      }
      if (parts[1] && !timeOfDay && !/^(?:lighting|weather|atmosphere)/i.test(parts[1])) {
        timeOfDay = cleanAttributeOrText(parts[1]);
      }
    }
  }

  // 3. Single-line pseudo-tags like <scene header: Grand Library> or <location: Old Town>
  const pseudoTagMatch = content.match(/<(?:scene[-_\s]+header|scene[-_]?info|location|setting|chapter[-_]?header|chapter)\s*:\s*([^>]+)>/i);
  if (pseudoTagMatch && !location) {
    const parts = pseudoTagMatch[1]!.split(/[|,]/).map((p) => p.trim()).filter(Boolean);
    if (parts[0]) location = cleanAttributeOrText(parts[0]);
    if (parts[1] && !timeOfDay) timeOfDay = cleanAttributeOrText(parts[1]);
  }

  // 4. Spatial / Location indicators in status or continuity blocks (e.g. <b>Spatial</b>: Registry Hall counter — ...)
  if (!location) {
    const spatialMatch = content.match(/(?:<b>\s*)?(?:spatial|location|setting)\s*(?:<\/b>)?\s*[:=]\s*([^|\n<;]+)/i);
    if (spatialMatch && spatialMatch[1]) {
      const rawLoc = spatialMatch[1].trim();
      const cleanLoc = rawLoc.split(/[—–\-,;]/)[0]?.trim();
      if (cleanLoc && cleanLoc.length > 2 && cleanLoc.length < 80) {
        location = cleanAttributeOrText(cleanLoc);
      }
    }
  }

  if (!location && !title && !timeOfDay && !atmosphere && !lighting && !weather) return undefined;
  return {
    ...(location ? { location } : {}),
    ...(title ? { title } : {}),
    ...(timeOfDay ? { timeOfDay } : {}),
    ...(atmosphere ? { atmosphere } : {}),
    ...(lighting ? { lighting } : {}),
    ...(weather ? { weather } : {}),
  };
}

export type PreparedNarrative = {
  paragraphs: Paragraph[];
  choices: Choice[];
  panels: PanelArtifact[];
  detectedSceneMetadata?: DetectedSceneMetadata;
  detectedSpeakers?: DetectedSpeakerInfo[];
};

type RawChoice = { id?: string | undefined; label: string; submission: string };

function splitBlocks(content: string): Array<{ sourceIndex: number; text: string }> {
  const blocks: Array<{ sourceIndex: number; text: string }> = [];
  let current: string[] = [];
  let sourceIndex = 0;
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim()) current.push(line);
    else if (current.length > 0) {
      blocks.push({ sourceIndex, text: current.join("\n") });
      sourceIndex += 1;
      current = [];
    }
  }
  if (current.length > 0) blocks.push({ sourceIndex, text: current.join("\n") });
  return blocks;
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1]!.toLocaleLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return attributes;
}

function cleanChoiceLine(value: string): string {
  return value.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s*)/, "").trim();
}

function extractChoices(content: string): { text: string; choices: RawChoice[] } {
  const choices: RawChoice[] = [];
  const text = content.replace(/<Choice\b([^>]*)>([\s\S]*?)<\/Choice>/gi, (_match, attributeSource: string, body: string) => {
    const attributes = parseAttributes(attributeSource);
    const nonemptyLines = body.split(/\r?\n/).map(cleanChoiceLine).filter(Boolean);
    const isList = nonemptyLines.length > 1 || /^\s*(?:[-*+]\s+|\d+[.)]\s*)/m.test(body);
    if (isList) {
      for (const line of nonemptyLines) choices.push({ label: line, submission: line });
    } else {
      const label = cleanChoiceLine(body);
      if (label) {
        const rawSubmission = (attributes.value ?? attributes.message ?? attributes.prompt ?? "").trim();
        const isNumeric = /^\s*(?:\d+|choice[_-]?\d+|option\s*\d+)\s*$/i.test(rawSubmission);
        const submission = (rawSubmission && !isNumeric) ? rawSubmission : label;
        choices.push({
          id: attributes.id?.trim() || undefined,
          label,
          submission
        });
      }
    }
    return "\n\n";
  });
  return { text, choices };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripIgnoredTags(content: string, tags: readonly string[]): string {
  let output = content;
  for (const rawTag of tags) {
    const tag = rawTag.trim().replace(/^[<\[]|[>\]]$/g, "").replace(/^\//, "");
    if (!tag) continue;
    const name = escapeRegExp(tag);
    output = output
      .replace(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, "gi"), "")
      .replace(new RegExp(`<\\/?${name}\\b[^>]*>`, "gi"), "")
      .replace(new RegExp(`\\[${name}\\b[^\\]]*\\][\\s\\S]*?\\[\\/${name}\\]`, "gi"), "")
      .replace(new RegExp(`\\[\\/?${name}\\b[^\\]]*\\]`, "gi"), "");
  }
  return output;
}

// Inline card image tags supported across RisuAI, LumiRealm, and custom card formats:
// - Direct assignments: `<img="name">`, `<pimg="name">`, `<img=name>`, `<pimg=name>`
// - Attributes: `<img cmd="name">`, `<img src="name">`, `<pimg cmd="name">`, `<pimg src="name">`
//   Supports double/single/curly quotes or unquoted, with extra attributes and whitespace.
// - CBS/Risu macro tokens: `{{img::name}}`
const INLINE_IMG_REGEX =
  /<p?img\s*=\s*["'“”][^"'“”]+["'“”]\s*\/?>|<p?img\s*=\s*[^\s"'“”>][^\s>]*?[\s>]|<p?img\b[^>]*?\b(?:cmd|src)\s*=\s*["'“”][^"'“”]+["'“”][^>]*?\/?>|<p?img\b[^>]*?\b(?:cmd|src)\s*=\s*[^\s"'“”>]+[^>]*?\/?>|\{\{img::[^\}]+\}\}/gi;

/** Extract the referenced asset/expression name from any supported inline image tag. */
export function extractTagAssetName(tag: string): string {
  const direct =
    tag.match(/^<p?img\s*=\s*["'“”]([^"'“”]+)["'“”]\s*\/?>/i) ||
    tag.match(/^<p?img\s*=\s*([^\s"'“”>][^\s>]*?)[\s>]/i);
  if (direct?.[1]) return direct[1].trim();

  const macro = tag.match(/^\{\{img::([^\}]+)\}\}/i);
  if (macro?.[1]) return macro[1].trim();

  // For attribute-based tags, prefer `cmd` (the card expression/costume command) over `src`
  const cmd =
    tag.match(/\bcmd\s*=\s*["'“”]([^"'“”]+)["'“”]/i) ||
    tag.match(/\bcmd\s*=\s*([^\s"'“”>]+)/i);
  if (cmd?.[1]) return cmd[1].trim();

  const src =
    tag.match(/\bsrc\s*=\s*["'“”]([^"'“”]+)["'“”]/i) ||
    tag.match(/\bsrc\s*=\s*([^\s"'“”>]+)/i);
  if (src?.[1]) return src[1].trim();

  return "";
}

/**
 * Extract inline card asset references like `<img cmd="asset_name">`, `<img="asset_name">`,
 * `<pimg="asset_name">` (RisuAI/LumiRealm), `<img src="asset_name">`, or `{{img::asset_name}}`.
 */
export function extractInlineCardImages(text: string): { text: string; assetNames: string[] } {
  const assetNames: string[] = [];
  const cleaned = text.replace(INLINE_IMG_REGEX, (match) => {
    const name = extractTagAssetName(match);
    if (name) assetNames.push(name);
    return "";
  });
  return { text: cleaned, assetNames };
}

/**
 * Extract inline card asset references along with their target paragraphIndex in the plan.
 */
export function extractInlineCardImagesWithParagraphs(
  content: string,
  paragraphs: readonly Paragraph[],
): Array<{ name: string; paragraphIndex: number }> {
  const blocks = splitBlocks(content);
  const sourceToPara = new Map<number, number>();
  for (const paragraph of paragraphs) {
    sourceToPara.set(paragraph.sourceIndex, paragraph.index);
  }

  const results: Array<{ name: string; paragraphIndex: number }> = [];
  let lastKnownParaIndex = 0;
  let sawParagraph = false;

  for (const block of blocks) {
    const mapped = sourceToPara.get(block.sourceIndex);
    if (mapped !== undefined) {
      lastKnownParaIndex = mapped;
      sawParagraph = true;
    }

    const matches = [...block.text.matchAll(INLINE_IMG_REGEX)];
    if (matches.length === 0) continue;

    // An inline image marker depicts the preceding paragraph (the dialogue or
    // narration line it annotates). If the block produced no visible paragraph
    // (e.g. a standalone `<img=...>` line), fall back to the last paragraph we
    // have seen, which is still the line the expression belongs to.
    const paragraphIndex = sawParagraph ? lastKnownParaIndex : 0;

    for (const match of matches) {
      const name = extractTagAssetName(match[0]);
      if (name) {
        results.push({ name, paragraphIndex });
      }
    }
  }

  return results;
}

/** Tags the reader renders on purpose: basic formatting, image references and
 *  the closed text-effect catalogue (<shake>, <wave>, ...). Anything else that
 *  looks like a preset tag is removed from prose, keeping the text inside. */
const PROSE_FORMATTING_TAGS = new Set(["b", "i", "em", "strong", "u", "s", "br", "small", "sub", "sup", "mark", "img", "pimg"]);

export function stripUnknownInlineTags(text: string): string {
  return text.replace(/<\/?([A-Za-z][\w-]*)(?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))*\s*\/?>/g, (match, name: string) => {
    const lower = name.toLowerCase();
    return PROSE_FORMATTING_TAGS.has(lower) || isTextEffectId(lower) ? match : "";
  });
}

function cleanNarrativeBlock(block: string, smartProseFilter = true): string {
  // Strip caption pipes like | <"😏:caption"> or | <'caption'>
  let text = block.replace(/\|\s*<[^>]+>/g, "");

  // Strip inline card expression tags so they don't count as narrative lines
  const { text: withoutInlineImages } = extractInlineCardImages(text);
  // Preset tags wrapped around a sentence (for example a note-bearing action tag) carry no
  // story text of their own, so the smart filter drops the tag and keeps the words.
  const withoutInlineTags = smartProseFilter ? stripUnknownInlineTags(withoutInlineImages) : withoutInlineImages;
  return withoutInlineTags
    .replace(/CARDDATA:.*$/gim, "")
    .replace(/<Update Log\b[\s\S]*?<\/Update Log>/gi, "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^\s*\|\s*$/.test(trimmed)) return false;
      if (/^\[(?:Scene|Location|Setting|Time|Atmosphere|Environment|Lighting|Weather|System|Status|OOC|Date|FLOOR|RESERVEDFLOOR|Note)\b/i.test(trimmed)) return false;
      if (/^<\s*(?:scene[-_]?header|scene[-_\s]+header|scene[-_]?info|location[-_]?header|setting|environment|atmosphere|suggestion|scene\s+seed=|check|think|thought|reasoning|reflection|metadata|ooc|narrative[-_]?notes|author[-_]?note)\b/i.test(trimmed)) return false;
      if (/^<[A-Za-z_-]+(?:\s+[A-Za-z_-]+)*\s*:[^>]+>$/i.test(trimmed)) return false;
      if (smartProseFilter) {
        if (/^[─—–*_=\-]{3,}$/.test(trimmed)) return false;
        if (/^(?:🎲\s*|🎯\s*)?(?:Roll|Check|Dice|Difficulty|DC|Result)\s*[:=]/i.test(trimmed)) return false;
        if (/^\[(?:Affinity|Stats?|Status|Inventory|Roll|Dice|Check|Turn|Take|Dynamic|Clock|Track|HP|MP|EXP|Level)\b[^\]]*\]$/i.test(trimmed)) return false;
        if (/^\[[^\]]+:\s*[^\]]+\]$/.test(trimmed)) return false;
        if (/^<\/?(?:details|summary|div|span|p|section|header|footer|aside)\b[^>]*>$/i.test(trimmed)) return false;
        if (/^<\/?(?:[a-zA-Z0-9_-]+_)?(?:trace|dock|archive|status|stats|inventory|spine|feed|ledger|tracker|variables|hud|matrix|protocol|state|quest|log|chapter)\b[^>]*>$/i.test(trimmed)) return false;
      }
      return true;
    })
    .join("\n")
    .trim();
}

function stableChoiceId(label: string, index: number): string {
  let hash = 0x811c9dc5;
  const source = `${index}\0${label}`;
  for (let offset = 0; offset < source.length; offset += 1) {
    hash ^= source.charCodeAt(offset);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `choice-${hash.toString(16).padStart(8, "0")}`;
}

/** Tags whose blocks are never treated as structured sidecars: panels and
 *  status cards (handled elsewhere), choices, images and speech tags. */
const SIDECAR_EXEMPT_TAGS = new Set([
  "choice", "img", "pimg", "panel", "card", "details", "summary", "think", "thought",
  "status", "stats", "inventory", "hero", "world_voice", "tracker", "dialogue", "speech",
  "say", "line", "voice", "quote", "talk", "message",
]);

const STRUCTURED_LINE_PATTERNS: readonly RegExp[] = [
  /^\s*[-*+]?\s*\[[ xX~-]\]\s/,                       // checklist item: - [x] Check: PASS
  /^\s*\[[^\]\n]{1,120}\](\s*\([^)\n]*\))?\s*$/,        // bracketed heading: [I. Staging & Continuity]
  /^\s*[A-Za-z][A-Za-z0-9 &/'().-]{0,40}:\s*\S/,         // short "Key: value" line
  /^\s*"[^"\n]{1,60}"\s*:/,                             // JSON-style key
  /^\s*[{}\[\],]+\s*$/,                                // JSON structure
];

const TAG_ONLY_LINE = /^\s*<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>\s*$/;

function isStructuredLine(line: string): boolean {
  return STRUCTURED_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

/** True when a block body is mostly metadata: at least two real lines, and at
 *  least 60% of them structured. Lines that are only tags are ignored, so a
 *  sidecar that nests other tags is judged on its content. */
export function isStructuredSidecarBody(body: string): boolean {
  const lines = body.split("\n").map((line) => line.trim()).filter((line) => line && !/^<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>$/.test(line));
  if (lines.length < 2) return false;
  const structured = lines.filter(isStructuredLine).length;
  return structured / lines.length >= 0.6;
}

/** Finds non-prose sidecar blocks (wardrobe, scene_cast, sola_hud, ...) that
 *  the tag list does not name, plus lines that are only a tag. Returns ranges
 *  in the original content. Prose wrapped in a tag is never returned. */
export function findStructuredSidecarRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const match of content.matchAll(/<([A-Za-z][\w-]*)(\s[^<>]*)?>([\s\S]*?)<\/\1\s*>/g)) {
    const name = match[1]!.toLowerCase();
    if (SIDECAR_EXEMPT_TAGS.has(name) || BUILTIN_HEURISTIC_TAGS.includes(name)) continue;
    if (!isStructuredSidecarBody(match[3] ?? "")) continue;
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  let offset = 0;
  for (const line of content.split("\n")) {
    const match = TAG_ONLY_LINE.exec(line);
    const tag = /^\s*<\/?([A-Za-z][\w-]*)/.exec(line)?.[1]?.toLowerCase();
    if (match && tag && !SIDECAR_EXEMPT_TAGS.has(tag) && tag !== "choice" && tag !== "img") {
      ranges.push({ start: offset, end: offset + line.length });
    }
    offset += line.length + 1;
  }
  return ranges;
}

export function prepareNarrative(content: string, options: PrepareNarrativeOptions = {}): PreparedNarrative {
  content = content.replace(/\r\n?/g, "\n");
  const smartProseFilter = options.smartProseFilter !== false;
  const smartDialogueExtraction = options.smartDialogueExtraction !== false;

  const detectedSceneMetadata = extractDetectedSceneMetadata(content);

  // 1. Extract custom preset dialogue/thought tags before masking/tag-stripping
  const extractedSpeakers = new Map<string, string>();
  if (smartDialogueExtraction) {
    const unwrapTag = (_match: string, prefix: string | undefined, tagKind: string, attrSource: string, body: string) => {
      const speakerMatch = attrSource.match(/(?:speaker|name|character)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const speaker = (speakerMatch ? speakerMatch[1] ?? speakerMatch[2] ?? speakerMatch[3] ?? "" : "").trim();
      const isCustomTag = Boolean(prefix) || (tagKind.toLowerCase() !== "thought" && tagKind.toLowerCase() !== "think") || Boolean(speaker);
      if (!isCustomTag) {
        // Plain untagged <thought> without speaker attribute is LLM internal chain-of-thought; leave for heuristic stripping
        return _match;
      }
      const cleanBody = body.trim();
      if (cleanBody) {
        for (const line of cleanBody.split(/\r?\n\s*\r?\n/)) {
          const trimmedLine = line.trim();
          if (trimmedLine && speaker) extractedSpeakers.set(trimmedLine, speaker);
        }
        return `\n\n${cleanBody}\n\n`;
      }
      return "\n\n";
    };

    // 1a. Known dialogue/speech tags with optional prefixes (e.g. <eidos_dialogue>, <custom_speech>, <say>, <line>, <voice>)
    content = content.replace(
      /<([a-zA-Z0-9_-]+_)?(dialogue|dialog|speech|thought|think|line|say|speak|voice|quote|talk|message)\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+_)?(?:dialogue|dialog|speech|thought|think|line|say|speak|voice|quote|talk|message)>/gi,
      unwrapTag
    );

    // 1b. Any arbitrary XML tag with explicit speaker= or character= attribute (e.g. <npc character="Grimbald">"..."</npc>)
    content = content.replace(
      /<([a-zA-Z0-9_-]+)\b([^>]*\b(?:speaker|character)\s*=[^>]*)>([\s\S]*?)<\/\1\s*>/gi,
      (_match, tagName: string, attrSource: string, body: string) => {
        return unwrapTag(_match, undefined, tagName, attrSource, body);
      }
    );
  }

  const spans: PanelSpan[] = extractPanelSpans(content);
  const hidden: Array<{ start: number; end: number }> = [];

  // 2. Structural & pattern-based metadata masking if smartProseFilter is active
  if (smartProseFilter) {
    for (const match of content.matchAll(/<!--[\s\S]*?-->/g)) {
      hidden.push({ start: match.index, end: match.index + match[0].length });
    }
    for (const match of content.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/gi)) {
      hidden.push({ start: match.index, end: match.index + match[0].length });
    }
    for (const match of content.matchAll(/```(?:json|yaml|yml|state|meta|tracker|status)[\s\S]*?```/gi)) {
      hidden.push({ start: match.index, end: match.index + match[0].length });
    }
    const DYNAMIC_METADATA_PATTERN =
      /<(?:[a-zA-Z0-9_-]+_)?(?:trace|dock|archive|status|stats|inventory|spine|feed|ledger|tracker|variables|metadata|params|memory|context|audit|matrix|protocol|analysis|scratchpad|hud|state|system|ooc|notes|log|reflection|reasoning|pre_response|inner_monologue|world_info|quest|chapter)\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9_-]+_)?(?:trace|dock|archive|status|stats|inventory|spine|feed|ledger|tracker|variables|metadata|params|memory|context|audit|matrix|protocol|analysis|scratchpad|hud|state|system|ooc|notes|log|reflection|reasoning|pre_response|inner_monologue|world_info|quest|chapter)\s*>/gi;
    for (const match of content.matchAll(DYNAMIC_METADATA_PATTERN)) {
      hidden.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  if (smartProseFilter) {
    for (const range of findStructuredSidecarRanges(content)) hidden.push(range);
  }

  const effectiveIgnoredTags = Array.from(new Set([
    ...BUILTIN_HEURISTIC_TAGS,
    ...(options.ignoredTags ?? [])
  ]));

  for (const raw of effectiveIgnoredTags) {
    const tag = raw.trim().replace(/^[<\[]|[>\]]$/g, "").replace(/^\//, "");
    if (!tag) continue;
    const name = escapeRegExp(tag);
    const pattern = new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}\\s*>|<\\/?${name}\\b[^>]*>|\\[${name}\\b[^\\]]*\\][\\s\\S]*?\\[\\/${name}\\]|\\[\\/?${name}\\b[^\\]]*\\]`, "gi");
    for (const match of content.matchAll(pattern)) {
      const range = { start: match.index, end: match.index + match[0].length };
      hidden.push(range);
      const nestedCards = spans.filter((span) => span.start < range.end && range.start < span.end);
      for (const card of nestedCards) spans.splice(spans.indexOf(card), 1);
      // Reasoning/private metadata is not a status-card source.
      if (/^(?:status|stats|inventory|hero|world_voice|tracker)$/i.test(tag)
        && match[0].length < MAX_PANEL_HTML / 6 && spans.length < MAX_PANELS) {
        spans.push({ ...range, html: nestedCards.length ? nestedCards.map((card) => card.html).join("\n") : `<pre>${escapePanelText(match[0])}</pre>`, title: tag, followKey: `tag:${tag.toLowerCase()}` });
      }
    }
  }
  // Multiple entities using the same marker cannot safely share a following pin.
  for (const span of spans) if (span.followKey && spans.filter((other) => other.followKey === span.followKey).length > 1) {
    const key = span.followKey;
    for (const other of spans) if (other.followKey === key) delete other.followKey;
  }
  let total = 0;
  const retained = spans.filter((span) => { if (span.html.length > MAX_PANEL_HTML || total + span.html.length > MAX_PANEL_TOTAL) return false; total += span.html.length; return true; });
  spans.splice(0, spans.length, ...retained);
  const masked = maskPanelSpans(content, [...spans, ...hidden]);
  const paragraphs: Paragraph[] = [];
  const rawChoices: RawChoice[] = [];
  const paragraphEnds: number[] = [];
  let offset = 0;
  for (const block of splitBlocks(content)) {
    const start = content.indexOf(block.text, offset);
    offset = start + block.text.length;
    const extracted = extractChoices(masked.slice(start, offset));
    rawChoices.push(...extracted.choices);
    const text = cleanNarrativeBlock(stripIgnoredTags(extracted.text, effectiveIgnoredTags), smartProseFilter);
    if (text) {
      paragraphs.push({ index: paragraphs.length, sourceIndex: block.sourceIndex, text });
      paragraphEnds.push(offset);
    }
  }
  if (!paragraphs.length && spans.length) paragraphs.push({ index: 0, sourceIndex: 0, text: "A new panel is available in Panels." });

  const detectedSpeakers: DetectedSpeakerInfo[] = [];
  if (extractedSpeakers.size > 0) {
    for (const paragraph of paragraphs) {
      let matchedSpeaker = extractedSpeakers.get(paragraph.text);
      if (!matchedSpeaker) {
        for (const [dialogueText, speaker] of extractedSpeakers.entries()) {
          if (paragraph.text === dialogueText || paragraph.text.includes(dialogueText) || dialogueText.includes(paragraph.text)) {
            matchedSpeaker = speaker;
            break;
          }
        }
      }
      if (matchedSpeaker) {
        detectedSpeakers.push({
          paragraphIndex: paragraph.index,
          speaker: matchedSpeaker,
        });
      }
    }
  }

  const panels = spans.sort((a, b) => a.start - b.start).slice(0, MAX_PANELS).map((span, index): PanelArtifact => ({
    id: `panel-${index}-${panelHash(span.html)}`,
    title: span.title,
    html: span.html,
    paragraphIndex: Math.min(Math.max(0, paragraphs.length - 1), paragraphEnds.filter((end) => end <= span.start).length),
    ...(span.followKey ? { followKey: span.followKey } : {}),
  }));
  const unlocksAfterParagraph = Math.max(0, paragraphs.length - 1);
  const usedIds = new Set<string>();
  const choices = rawChoices.map((choice, index): Choice => {
    const baseId = choice.id || stableChoiceId(choice.label, index);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return { id, label: choice.label, submission: choice.submission, source: "authored", unlocksAfterParagraph };
  });
  return {
    paragraphs,
    choices,
    panels,
    ...(detectedSceneMetadata ? { detectedSceneMetadata } : {}),
    ...(detectedSpeakers.length > 0 ? { detectedSpeakers } : {}),
  };
}
