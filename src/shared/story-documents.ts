import { z } from 'zod';
import { alignSpanInParagraph, normalizeForGroundMatch, type SpanRange } from './grounding.js';

export const STORY_DOCUMENT_KINDS = [
  'flyer',
  'letter',
  'note',
  'journal',
  'map',
  'poster',
  'receipt',
  'notice',
  'newspaper',
  'pamphlet',
  'phone',
  'terminal',
] as const;
export type StoryDocumentKind = (typeof STORY_DOCUMENT_KINDS)[number];

const DocumentIdentitySchema = z.object({
  name: z.string().trim().min(1).max(256),
  kind: z.enum(STORY_DOCUMENT_KINDS),
  paragraphIndex: z.number().int().nonnegative(),
  aliases: z.array(z.string().trim().min(2).max(160)).max(8).optional(),
  visualDetails: z.string().trim().min(1).max(400).optional(),
}).strict();

const PassageProposalSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(),
  text: z.string().min(1).max(6000),
  evidence: z.string().min(1).max(10000),
}).strict();

export const DocumentObservationSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(),
  summary: z.string().trim().min(1).max(500).optional(),
  visualDetails: z.array(z.string().trim().min(1).max(160)).max(8).optional(),
  material: z.string().trim().min(1).max(120).optional(),
  condition: z.string().trim().min(1).max(120).optional(),
  evidence: z.string().min(1).max(1200),
}).strict();
export type DocumentObservation = z.infer<typeof DocumentObservationSchema>;

export const StoryDocumentSectionSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  text: z.string().min(1).max(6000),
}).strict();

export const StoryDocumentSchema = DocumentIdentitySchema.extend({
  id: z.string().min(1).max(256),
  sections: z.array(StoryDocumentSectionSchema).max(16),
  observations: z.array(DocumentObservationSchema).max(16).optional(),
}).strict();
export type StoryDocument = z.infer<typeof StoryDocumentSchema>;

export type DocumentDropTrace = {
  invalidSchema: number;
  ungroundedName: number;
  droppedSections: number;
  droppedObservations: number;
  accepted: number;
};

const IDIOMATIC_SURFACE_RE = /\b(?:on\s+paper|paper\s+trail|paper\s+tiger|paper\s+over|pushing\s+paper|(?:mak(?:e|es|ing)|made|tak(?:e|es|ing)|took)\s+(?:a\s+)?(?:mental\s+)?note\b|mental\s+note|side\s+note|note\s+to\s+self|note\s+of\s+(?:panic|fear|alarm|warning|sadness|hope|doubt|surprise)|letter\s+of\s+the\s+law|to\s+the\s+letter|red[- ]letter\s+day|map\s+out|on\s+the\s+map|playing\s+card|trump\s+card|short\s+notice|until\s+further\s+notice|at\s+a\s+moment'?s\s+notice|terminal\s+(?:illness|velocity|stage|station))\b/gi;

/**
 * Returns true only when an idiomatic phrase overlaps `[start, end]`, preventing
 * an idiom elsewhere in the same sentence from silencing a real nearby prop.
 */
export function isIdiomaticDocumentMention(paragraphText: string, start: number, end: number): boolean {
  const winStart = Math.max(0, start - 28);
  const winEnd = Math.min(paragraphText.length, end + 28);
  const snippet = paragraphText.slice(winStart, winEnd);
  IDIOMATIC_SURFACE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IDIOMATIC_SURFACE_RE.exec(snippet)) !== null) {
    const mStart = winStart + match.index;
    const mEnd = mStart + match[0].length;
    if (mStart < end && mEnd > start) {
      return true;
    }
  }
  return false;
}

function stableDocumentId(kind: StoryDocumentKind, canonicalKey: string, usedIds: Set<string>): string {
  let hash = 0x811c9dc5;
  const source = `${kind}\0${canonicalKey.toLowerCase()}`;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const base = `doc-${kind}-${hash.toString(16).padStart(8, '0')}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }
  usedIds.add(candidate);
  return candidate;
}

const DOC_KIND_SYNONYMS: Record<string, StoryDocumentKind> = {
  flyer: 'flyer', flier: 'flyer', leaflet: 'flyer', handbill: 'flyer',
  pamphlet: 'pamphlet', brochure: 'pamphlet',
  poster: 'poster', sign: 'poster', signboard: 'poster', plaque: 'poster', bulletin: 'poster', 'bulletin board': 'poster',
  notice: 'notice', missive: 'notice', decree: 'notice', edict: 'notice', warrant: 'notice', contract: 'notice', deed: 'notice', permit: 'notice', certificate: 'notice',
  letter: 'letter', envelope: 'letter', postcard: 'letter', invitation: 'letter', telegram: 'letter', dispatch: 'letter',
  note: 'note', slip: 'note', memo: 'note', 'sticky note': 'note', 'post-it': 'note', inscription: 'note',
  journal: 'journal', diary: 'journal', ledger: 'journal', logbook: 'journal', notebook: 'journal', book: 'journal', tome: 'journal', grimoire: 'journal', codex: 'journal', register: 'journal', roster: 'journal', dossier: 'journal', file: 'journal', folder: 'journal', report: 'journal',
  map: 'map', blueprint: 'schematic' in {} ? 'map' : 'map', schematic: 'map',
  receipt: 'receipt', ticket: 'receipt', voucher: 'receipt', manifest: 'receipt', invoice: 'receipt', menu: 'receipt', passport: 'receipt', timetable: 'receipt', schedule: 'receipt', form: 'receipt', 'racing form': 'receipt', 'intake sheet': 'receipt',
  newspaper: 'newspaper', gazette: 'newspaper', clipping: 'newspaper', article: 'newspaper',
  phone: 'phone', smartphone: 'phone', cellphone: 'phone', handset: 'phone', tablet: 'phone', pager: 'phone', 'text message': 'phone', sms: 'phone', email: 'phone', 'chat log': 'phone',
  terminal: 'terminal', datapad: 'terminal', transcript: 'terminal', whiteboard: 'terminal', clipboard: 'note',
};

export function mapNounToDocumentKind(noun: string): StoryDocumentKind {
  const n = noun.trim().toLowerCase();
  if (DOC_KIND_SYNONYMS[n]) return DOC_KIND_SYNONYMS[n]!;
  if (/fl[yi]er|leaflet|handbill/.test(n)) return 'flyer';
  if (/pamphlet|brochure/.test(n)) return 'pamphlet';
  if (/poster|sign(?:board)?|plaque|bulletin/.test(n)) return 'poster';
  if (/notice|missive|decree|edict|warrant|contract|deed|permit|certificate/.test(n)) return 'notice';
  if (/letter|envelope|postcard|invitation|telegram|dispatch/.test(n)) return 'letter';
  if (/journal|diar(?:y|ies)|ledger|logbook|notebook|book|tome|grimoire|cod(?:ex|ices)|register|roster|dossier|folder|report/.test(n)) return 'journal';
  if (/map|blueprint|schematic/.test(n)) return 'map';
  if (/receipt|ticket|voucher|manifest|invoice|menu|passport|timetable|schedule|form|sheet/.test(n)) return 'receipt';
  if (/newspaper|gazette|clipping|article/.test(n)) return 'newspaper';
  if (/phone|handset|tablet|pager|text\s+message|sms|email|chat\s+log/.test(n)) return 'phone';
  if (/terminal|datapad|transcript|whiteboard/.test(n)) return 'terminal';
  return 'note';
}

function coerceRawDocumentIdentity(raw: Record<string, unknown>): unknown {
  if (raw.visibility === 'private' || raw.visibility === 'hidden' || raw.visibility === 'secret') {
    return raw;
  }
  const rawKind = typeof raw.kind === 'string' ? raw.kind.trim().toLowerCase() : raw.kind;
  const kind = typeof rawKind === 'string'
    ? (STORY_DOCUMENT_KINDS.includes(rawKind as StoryDocumentKind) ? rawKind : mapNounToDocumentKind(rawKind))
    : raw.kind;
  const paragraphIndex = raw.paragraphIndex ?? raw.paragraph_index ?? raw.paragraph;
  return {
    name: raw.name,
    kind,
    paragraphIndex,
    ...(raw.aliases !== undefined ? { aliases: raw.aliases } : {}),
    ...(raw.visualDetails !== undefined ? { visualDetails: raw.visualDetails } : {}),
  };
}

function coerceRawPassage(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  return {
    paragraphIndex: obj.paragraphIndex ?? obj.paragraph_index ?? obj.paragraph,
    text: obj.text,
    evidence: obj.evidence,
  };
}

function formatDocumentDisplayTitle(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  return words.map((w, idx) => {
    const lower = w.toLowerCase();
    if (idx > 0 && (lower === 'of' || lower === 'the' || lower === 'in' || lower === 'on' || lower === 'for' || lower === 'and')) {
      return lower;
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function evidenceHasDuplicateInParagraph(text: string, evidence: string): boolean {
  const first = text.indexOf(evidence);
  if (first >= 0 && text.indexOf(evidence, first + 1) >= 0) return true;
  const normPara = normalizeForGroundMatch(text);
  const normEvid = normalizeForGroundMatch(evidence);
  if (normEvid.length >= 6) {
    const firstNorm = normPara.indexOf(normEvid);
    if (firstNorm >= 0 && normPara.indexOf(normEvid, firstNorm + 1) >= 0) return true;
  }
  return false;
}

/** Optional planner enrichment only identifies literal visible prose & grounded scene observations. */
export function normalizeStoryDocuments(
  value: unknown,
  paragraphs: readonly { text: string }[],
  trace?: DocumentDropTrace,
): StoryDocument[] {
  if (!Array.isArray(value)) return [];
  const result: StoryDocument[] = [];
  const seen = new Set<string>();
  const usedIds = new Set<string>();
  let characters = 0;

  // Map paragraph indices where distinct named documents are introduced so continuation
  // passages don't accidentally attach to the wrong newly introduced document.
  const docsPerParagraph = new Map<number, number>();
  const prelimDocs: Array<{
    doc: z.infer<typeof DocumentIdentitySchema>;
    sections: unknown;
    observations: unknown;
  }> = [];

  for (const raw of value.slice(0, 48)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      if (trace) trace.invalidSchema += 1;
      continue;
    }
    const rawObj = raw as Record<string, unknown>;
    const parsed = DocumentIdentitySchema.safeParse(coerceRawDocumentIdentity(rawObj));
    if (!parsed.success) {
      if (trace) trace.invalidSchema += 1;
      continue;
    }
    const doc = parsed.data;
    const introText = paragraphs[doc.paragraphIndex]?.text;
    if (!introText) {
      if (trace) trace.ungroundedName += 1;
      continue;
    }
    const normIntro = normalizeForGroundMatch(introText);
    const key = doc.name.toLowerCase();
    if (seen.has(key)) continue;

    // Ground canonical title directly or via alias / base noun present in the intro paragraph.
    const baseNounWords = doc.name.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    const headWord = baseNounWords.at(-1);
    const nameGrounded =
      normIntro.includes(normalizeForGroundMatch(doc.name))
      || (doc.aliases ?? []).some((a) => normIntro.includes(normalizeForGroundMatch(a)))
      || Boolean(headWord && new RegExp(`\\b${headWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i').test(normIntro) && normIntro.includes(doc.kind));

    if (!nameGrounded) {
      if (trace) trace.ungroundedName += 1;
      continue;
    }

    seen.add(key);
    docsPerParagraph.set(doc.paragraphIndex, (docsPerParagraph.get(doc.paragraphIndex) ?? 0) + 1);
    prelimDocs.push({ doc, sections: rawObj.sections, observations: rawObj.observations });
    if (prelimDocs.length === 12) break;
  }

  for (const { doc, sections, observations } of prelimDocs) {
    const passages: StoryDocument['sections'] = [];
    const claimedByParagraph = new Map<number, SpanRange[]>();
    const aliases = [doc.name, ...(doc.aliases ?? [])].map((a) => normalizeForGroundMatch(a)).filter(Boolean);

    if (Array.isArray(sections)) {
      for (const item of sections.slice(0, 32)) {
        const p = PassageProposalSchema.safeParse(coerceRawPassage(item));
        if (!p.success) {
          if (trace) trace.droppedSections += 1;
          continue;
        }
        const s = p.data;
        const text = paragraphs[s.paragraphIndex]?.text;
        if (!text || s.paragraphIndex < doc.paragraphIndex || !s.text.trim()) {
          if (trace) trace.droppedSections += 1;
          continue;
        }
        if (evidenceHasDuplicateInParagraph(text, s.evidence)) {
          if (trace) trace.droppedSections += 1;
          continue;
        }

        const normEvid = normalizeForGroundMatch(s.evidence);
        const evidSpan = alignSpanInParagraph(text, s.evidence);
        if (!evidSpan) {
          if (trace) trace.droppedSections += 1;
          continue;
        }

        // On the intro paragraph (or when multiple documents share a later paragraph),
        // require the evidence to mention this document's name/alias. On subsequent
        // sole continuation paragraphs ("It reads: '...'"), allow literal quoted prose.
        const multiDocSameParagraph = s.paragraphIndex > doc.paragraphIndex && (docsPerParagraph.get(s.paragraphIndex) ?? 0) > 1;
        const mentionsDocAlias = aliases.some((a) => a.length >= 2 && normEvid.includes(a));
        if ((s.paragraphIndex === doc.paragraphIndex || multiDocSameParagraph) && !mentionsDocAlias) {
          // On exact intro paragraph, still allow if a reading verb links a pronoun when doc was grounded right there
          const hasReadingCue = /\b(?:reads?|says?|printed|written|inscribed|scrawled|displays?|shows?)\b|^>/i.test(s.evidence);
          if (!(s.paragraphIndex === doc.paragraphIndex && !multiDocSameParagraph && hasReadingCue)) {
            if (trace) trace.droppedSections += 1;
            continue;
          }
        }

        const claimed = claimedByParagraph.get(s.paragraphIndex) ?? [];
        const evidenceWindow = text.slice(evidSpan.start, evidSpan.end);
        const insideSpan = alignSpanInParagraph(evidenceWindow, s.text, {
          claimedSpans: claimed.map((c) => ({ start: c.start - evidSpan.start, end: c.end - evidSpan.start })),
        });
        if (!insideSpan) {
          if (trace) trace.droppedSections += 1;
          continue;
        }

        const start = evidSpan.start + insideSpan.start;
        const end = evidSpan.start + insideSpan.end;
        const groundedText = text.slice(start, end);
        if (!groundedText.trim() || characters + groundedText.length > 24000) {
          if (trace) trace.droppedSections += 1;
          continue;
        }
        claimed.push({ start, end });
        claimedByParagraph.set(s.paragraphIndex, claimed);
        passages.push({ paragraphIndex: s.paragraphIndex, start, end, text: groundedText });
        characters += groundedText.length;
        if (passages.length === 16) break;
      }
    }

    const obsList: DocumentObservation[] = [];
    if (Array.isArray(observations)) {
      for (const item of observations.slice(0, 16)) {
        const o = DocumentObservationSchema.safeParse(item);
        if (!o.success) {
          if (trace) trace.droppedObservations += 1;
          continue;
        }
        const text = paragraphs[o.data.paragraphIndex]?.text;
        if (!text || o.data.paragraphIndex < doc.paragraphIndex || alignSpanInParagraph(text, o.data.evidence) === null) {
          if (trace) trace.droppedObservations += 1;
          continue;
        }
        obsList.push(o.data);
      }
    }

    passages.sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.start - b.start);
    result.push({
      ...doc,
      id: stableDocumentId(doc.kind, doc.name, usedIds),
      sections: passages,
      ...(obsList.length ? { observations: obsList } : {}),
    });
    if (trace) trace.accepted += 1;
  }
  return result;
}

/** Saved records remain tied to their source offsets. Removing/editing the source
 * never resurrects an old passage; callers separately validate the owning TurnKey. */
export function validateStoryDocuments(value: unknown, paragraphs: readonly { text: string }[]): StoryDocument[] {
  if (!Array.isArray(value)) return [];
  const result: StoryDocument[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  let characters = 0;
  for (const raw of value.slice(0, 12)) {
    const parsed = StoryDocumentSchema.safeParse(raw);
    if (!parsed.success) continue;
    const d = parsed.data;
    const introText = paragraphs[d.paragraphIndex]?.text;
    if (ids.has(d.id) || names.has(d.name.toLowerCase()) || !introText) continue;
    const normIntro = normalizeForGroundMatch(introText);
    const aliases = [d.name, ...(d.aliases ?? [])];
    const introMatched = aliases.some((a) => {
      const n = normalizeForGroundMatch(a);
      return Boolean(n && normIntro.includes(n));
    });
    if (!introMatched) continue;

    const sections = d.sections.filter((s) => {
      if (s.paragraphIndex < d.paragraphIndex || s.end !== s.start + s.text.length || paragraphs[s.paragraphIndex]?.text.slice(s.start, s.end) !== s.text || characters + s.text.length > 24000) return false;
      characters += s.text.length;
      return true;
    });
    const observations = (d.observations ?? []).filter(
      (o) => o.paragraphIndex >= d.paragraphIndex && Boolean(paragraphs[o.paragraphIndex]?.text && alignSpanInParagraph(paragraphs[o.paragraphIndex]!.text, o.evidence) !== null)
    );
    ids.add(d.id);
    names.add(d.name.toLowerCase());
    result.push({ ...d, sections, ...(observations.length ? { observations } : {}) });
  }
  return result;
}

export function visibleStoryDocuments(documents: readonly StoryDocument[], paragraphIndex: number): StoryDocument[] {
  return documents.filter((d) => d.paragraphIndex <= paragraphIndex).map((d) => ({
    ...d,
    sections: d.sections.filter((s) => s.paragraphIndex <= paragraphIndex).map((s) => ({ ...s })),
    ...(d.observations ? { observations: d.observations.filter((o) => o.paragraphIndex <= paragraphIndex).map((o) => ({ ...o })) } : {}),
  }));
}

const DOC_MEDIA_NOUN_RE = /\b((?:(?:crumpled|folded|damp|wet|soaked|torn|ripped|yellowed|faded|stained|sealed|handwritten|printed|laminated|weathered|tattered|creased|glowing|cracked|wanted|eviction|ransom|love|sticky|field|blood[- ]?stained|wax[- ]?sealed|train|ferry|boarding|official|crooked|curled|chalked|tarnished|charred|smudged|encrypted|racing|intake|sign[- ]?in|medical|manila|heavy|wooden)\s+)*)((?:bulletin\s+boards?|text\s+messages?|chat\s+logs?|sticky\s+notes?|post-?its?|signboards?|logbooks?|notebooks?|clipboards?|worksheets?|whiteboards?|grimoires?|schematics?|blueprints?|newspapers?|parchments?|timetables?|invitations?|certificates?|transcripts?|flyers?|fliers?|leaflets?|pamphlets?|brochures?|handbills?|posters?|notices?|letters?|envelopes?|missives?|notes?|journals?|diar(?:y|ies)|ledgers?|manifests?|receipts?|tickets?|vouchers?|scrolls?|maps?|gazettes?|datapads?|terminals?(?:\s+(?:screen|readout))?|(?:smart|cell)?phones?|handsets?|tablets?|sms|emails?|pagers?|dossiers?|files?|folders?|reports?|memos?|books?|tomes?|cod(?:ex|ices)|registers?|rosters?|contracts?|deeds?|warrants?|decrees?|edicts?|permits?|passports?|postcards?|telegrams?|dispatches?|bulletins?|signs?|plaques?|inscriptions?|menus?|invoices?|clippings?|documents?|slips?|forms?))\b/gi;
const DOC_MATERIAL_CUE_RE = /\b(purple\s+ink|red\s+ink|blue\s+ink|black\s+ink|faded\s+ink|smear(?:ed|ing)\s+[^.!?;,\n]+|bleed(?:s|ing)\s+across[^.!?;,\n]+|hand-drawn\s+[^.!?;,\n]+|handwritten\s+[^.!?;,\n]+|wax\s+seal|stamped|crest|sketch(?:ed)?\s+[^.!?;,\n]+|list\s+of\s+[^.!?;,\n]+|map\s+(?:of|to)\s+[^.!?;,\n]+|price\s+list)\b/gi;
const SECONDARY_PAPER_ALIAS_RE = /\b(?:the|damp|wet|crumpled|folded|torn|yellowed|faded|stained)\s+(paper|sheet|page|parchment|cardstock|slip)\b/gi;

const AMBIGUOUS_BARE_WORDS = new Set([
  'note', 'notes', 'notice', 'notices', 'file', 'files', 'book', 'books',
  'sign', 'signs', 'slip', 'slips', 'form', 'forms', 'post', 'posts',
  'card', 'cards', 'email', 'emails', 'phone', 'phones', 'report', 'reports',
  'record', 'records', 'pass', 'deed',
]);

const CONDITION_MODIFIER_RE = /\b(crumpled|folded|damp|wet|soaked|torn|ripped|yellowed|faded|stained|sealed|handwritten|printed|tattered|creased|glowing|cracked|curled|chalked|crooked|charred|smudged)\b/i;

function singularizeHead(word: string): string {
  const lower = word.toLowerCase().trim();
  if (lower === 'diaries') return 'diary';
  if (lower === 'codices') return 'codex';
  if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }
  return lower;
}

const DIALOGUE_ATTRIBUTION_RE = /^\s*(?:,?\s*(?:he|she|they|it|someone|a\s+voice|[A-Z][\p{L}']+))\s+(?:said|says|asks?|asked|replied|whispers?|whispered|murmurs?|murmured|mutters?|muttered|adds?|added|calls?|called|snaps?|snapped)\b/u;
const READING_CUE_RE = /\b(?:reads?|reading|says?|printed|written|inscribed|scrawled|scribbled|etched|stamped|titled|labeled|labelled|marked|headed|displays?|displaying|shows?|showing|bears?|lists?|lettering|headline|text)\b/i;

function captureDocumentQuotes(
  text: string,
  paragraphIndex: number,
  doc: StoryDocument,
  claimed: SpanRange[],
): void {
  const tryPush = (rawQuote: string, qStart: number): void => {
    const clean = rawQuote.trim();
    if (clean.length < 2 || clean.length > 2000 || qStart < 0) return;
    const offsetInMatch = rawQuote.indexOf(clean);
    const start = qStart + Math.max(0, offsetInMatch);
    const end = start + clean.length;
    if (claimed.some((r) => start < r.end && end > r.start)) return;
    if (doc.sections.some((s) => s.paragraphIndex === paragraphIndex && s.text === clean)) return;
    if (doc.sections.length >= 16) return;
    doc.sections.push({ paragraphIndex, start, end, text: clean });
    claimed.push({ start, end });
  };

  const hasReadingVerb = READING_CUE_RE.test(text);
  const doubleQuoteRe = /["“]([^"”\n]{2,2000})["”]/g;
  let qm: RegExpExecArray | null;
  while ((qm = doubleQuoteRe.exec(text)) !== null) {
    const afterQuote = text.slice(qm.index + qm[0].length, qm.index + qm[0].length + 48);
    const beforeQuote = text.slice(Math.max(0, qm.index - 40), qm.index);
    if (DIALOGUE_ATTRIBUTION_RE.test(afterQuote)) continue;
    if (/\b(?:says?|asks?|replied|whispered|murmured|called),\s*$/i.test(beforeQuote) && !hasReadingVerb) continue;
    const localContext = text.slice(Math.max(0, qm.index - 70), Math.min(text.length, qm.index + qm[0].length + 40));
    if (!READING_CUE_RE.test(localContext) && !hasReadingVerb) continue;
    tryPush(qm[1]!, qm.index + 1);
  }

  // Also capture single-quoted short codes/inscriptions when directly introduced by a reading verb
  if (hasReadingVerb) {
    const singleQuoteRe = /(?:reads?|says?|stamped|inscribed|scrawled|titled|marked|headed)\s*(?::|,)?\s*['‘]([^'’\n]{2,400})['’]/gi;
    let sqm: RegExpExecArray | null;
    while ((sqm = singleQuoteRe.exec(text)) !== null) {
      const innerStart = sqm.index + sqm[0].indexOf(sqm[1]!);
      tryPush(sqm[1]!, innerStart);
    }
  }

  // Capture contiguous Markdown blockquotes (`> line`) inside the paragraph
  const lines = text.split('\n');
  let offset = 0;
  let blockLines: string[] = [];
  let blockStart = -1;
  const flushBlock = (): void => {
    if (blockLines.length > 0 && blockStart >= 0) {
      tryPush(blockLines.join('\n'), blockStart);
    }
    blockLines = [];
    blockStart = -1;
  };
  for (const line of lines) {
    const bq = /^\s*>\s*(.+)$/.exec(line);
    if (bq && bq[1]?.trim()) {
      const inner = bq[1].trim();
      const lineStart = offset + line.indexOf(inner);
      if (blockStart < 0) blockStart = lineStart;
      blockLines.push(inner);
    } else {
      flushBlock();
    }
    offset += line.length + 1;
  }
  flushBlock();
}

/** Deterministic fallback that detects physical story documents and visual descriptions across adjacent beats. */
export function senseDocumentsDeterministically(paragraphs: readonly { text: string }[]): StoryDocument[] {
  const detected: Array<{
    doc: StoryDocument;
    headNoun: string;
    modifierKey: string;
    lastMentionParagraph: number;
  }> = [];
  const usedIds = new Set<string>();
  const claimedByParagraph = new Map<number, SpanRange[]>();
  let lastDocIndex = -1;

  const getClaimed = (pIdx: number): SpanRange[] => {
    let arr = claimedByParagraph.get(pIdx);
    if (!arr) {
      arr = [];
      claimedByParagraph.set(pIdx, arr);
    }
    return arr;
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i]?.text ?? '';
    if (!text.trim()) continue;
    DOC_MEDIA_NOUN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DOC_MEDIA_NOUN_RE.exec(text)) !== null) {
      let rawModifier = (m[1] ?? '').trim().toLowerCase();
      const rawNoun = (m[2] ?? m[0]).trim();
      let phrase = m[0].trim();
      const headSingular = singularizeHead(rawNoun);
      let start = m.index;
      const end = start + m[0].length;
      if (!rawModifier) {
        const prefixSlice = text.slice(Math.max(0, start - 28), start);
        const adjMatch = /(?:^|[\s,(])([a-z][a-z'-]{2,20})\s+$/i.exec(prefixSlice);
        const adj = adjMatch?.[1]?.trim();
        if (adj && !/^(?:the|and|for|with|from|into|onto|that|this|these|those|some|another|such|each|every|any|one|two|three|several|many|few|same|only|next|last|first|second|third|his|her|their|your|our|was|were|are|has|had|have|read|reads|reading|holding|held|left|found|took|take|saw|see|seen|spotted|beside|under|over|near|above|below|across|around|against|crowded|filled|covered|written|printed|pinned|tucked|slipped)$/i.test(adj)) {
          rawModifier = adj.toLowerCase();
          phrase = `${adj} ${phrase}`;
          start = start - adj.length - 1;
        }
      }
      if (isIdiomaticDocumentMention(text, start, end)) continue;

      const beforeSlice = text.slice(Math.max(0, start - 36), start);
      const afterSlice = text.slice(end, Math.min(text.length, end + 40));
      const surrounding = `${beforeSlice} ${afterSlice}`;

      // Filter ambiguous words when they act as verbs ("She notices his boots", "He files away")
      if (!rawModifier && AMBIGUOUS_BARE_WORDS.has(rawNoun.toLowerCase())) {
        const hasDeterminer = /\b(?:the|a|an|this|that|these|those|my|your|his|her|their|printed|written|chalked|handwritten|curled|folded|pin(?:ned)?|tucked|slipped)\s+$/i.test(beforeSlice);
        const hasDocContext = /\b(?:written|folded|crumpled|pinned|tucked|slipped|left|found|taped|stuck|sticky|ransom|corkboard|bulletin|reads?|says?|printed|stamped|sealed|addressed|desk|table|envelope|door)\b/i.test(surrounding);
        if (!hasDeterminer && !hasDocContext) {
          continue;
        }
        // Reject subject+verb patterns ("Orin notices", "she books a room", "he files taxes") when followed immediately by an object without reading verbs
        if (/\b(?:he|she|they|you|i|[A-Z][a-z]+)\s+$/.test(beforeSlice) && !hasDeterminer && !READING_CUE_RE.test(afterSlice)) {
          continue;
        }
      }

      // If "map" appears as a drawing/diagram smeared or printed on an active paper prop within 2 paragraphs of its latest mention, attach as observation rather than spawning a second doc.
      if (headSingular === 'map' && lastDocIndex >= 0 && detected[lastDocIndex] && i - detected[lastDocIndex]!.lastMentionParagraph <= 2) {
        SECONDARY_PAPER_ALIAS_RE.lastIndex = 0;
        const hasSurfaceBridge = SECONDARY_PAPER_ALIAS_RE.test(text);
        SECONDARY_PAPER_ALIAS_RE.lastIndex = 0;
        if (hasSurfaceBridge || /\b(?:hand[- ]drawn|smear(?:ed|ing)|sketch(?:ed)?|printed|faded|margin|corner)\b/i.test(text.slice(Math.max(0, start - 36), Math.min(text.length, end + 24)))) {
          continue;
        }
      }

      const kind = mapNounToDocumentKind(headSingular);
      const visualMatches = [...text.matchAll(DOC_MATERIAL_CUE_RE)].map((x) => x[0].trim());

      // Match existing instance by exact phrase, alias, OR compatible same-noun reference without conflicting modifier
      const existingEntry = detected.find((entry) => {
        const doc = entry.doc;
        if (doc.name.toLowerCase() === phrase.toLowerCase()) return true;
        if (doc.aliases?.some((a) => a.toLowerCase() === phrase.toLowerCase())) return true;
        if (entry.headNoun === headSingular) {
          if (!rawModifier || rawModifier === entry.modifierKey || entry.modifierKey.includes(rawModifier)) return true;
        }
        return false;
      });

      if (existingEntry) {
        const existing = existingEntry.doc;
        if (!existing.aliases?.some((a) => a.toLowerCase() === phrase.toLowerCase()) && existing.name.toLowerCase() !== phrase.toLowerCase()) {
          existing.aliases = [...(existing.aliases ?? []), phrase].slice(0, 8);
        }
        if (visualMatches.length) {
          existing.visualDetails = [existing.visualDetails, ...visualMatches].filter(Boolean).join(', ').slice(0, 380);
          existing.observations = existing.observations ?? [];
          if (!existing.observations.some((o) => o.paragraphIndex === i)) {
            existing.observations.push({
              paragraphIndex: i,
              summary: visualMatches.join('; ').slice(0, 480),
              visualDetails: visualMatches.slice(0, 6).map((v) => v.slice(0, 150)),
              evidence: text.slice(0, 1100),
            });
          }
        }
        captureDocumentQuotes(text, i, existing, getClaimed(i));
        existingEntry.lastMentionParagraph = i;
        lastDocIndex = detected.indexOf(existingEntry);
        continue;
      }

      const conditionMatch = phrase.match(CONDITION_MODIFIER_RE);
      const displayTitle = formatDocumentDisplayTitle(phrase);
      const doc: StoryDocument = {
        id: stableDocumentId(kind, phrase, usedIds),
        name: displayTitle,
        kind,
        paragraphIndex: i,
        aliases: [...new Set([rawNoun, phrase, displayTitle].filter((s) => s.length >= 2))].slice(0, 8),
        ...(visualMatches.length || conditionMatch ? {
          visualDetails: [...new Set([conditionMatch?.[0], ...visualMatches])].filter(Boolean).join(', ').slice(0, 380),
        } : {}),
        sections: [],
        observations: [{
          paragraphIndex: i,
          ...(visualMatches.length ? { summary: visualMatches.join('; ').slice(0, 480), visualDetails: visualMatches.slice(0, 6).map((v) => v.slice(0, 150)) } : {}),
          ...(conditionMatch ? { condition: conditionMatch[0].toLowerCase() } : {}),
          evidence: text.slice(0, 1100),
        }],
      };
      captureDocumentQuotes(text, i, doc, getClaimed(i));
      detected.push({
        doc,
        headNoun: headSingular,
        modifierKey: rawModifier,
        lastMentionParagraph: i,
      });
      lastDocIndex = detected.length - 1;
      if (detected.length >= 12) return detected.map((d) => d.doc);
    }

    // Anaphoric bridge: "the damp paper, smearing a hand-drawn map..." or continuation quote within 2 paragraphs of latest mention
    if (lastDocIndex >= 0 && detected[lastDocIndex] && i - detected[lastDocIndex]!.lastMentionParagraph <= 2) {
      const targetEntry = detected[lastDocIndex]!;
      const target = targetEntry.doc;
      SECONDARY_PAPER_ALIAS_RE.lastIndex = 0;
      const paperMatch = SECONDARY_PAPER_ALIAS_RE.exec(text);
      const visualMatches = [...text.matchAll(DOC_MATERIAL_CUE_RE)].map((x) => x[0].trim());
      if (paperMatch || visualMatches.length) {
        if (paperMatch) {
          const surfaceAlias = paperMatch[0].trim();
          if (surfaceAlias.length >= 4 && !target.aliases?.some((a) => a.toLowerCase() === surfaceAlias.toLowerCase())) {
            target.aliases = [...(target.aliases ?? []), surfaceAlias].slice(0, 8);
          }
        }
        if (visualMatches.length) {
          target.visualDetails = [target.visualDetails, ...visualMatches].filter(Boolean).join(', ').slice(0, 380);
          target.observations = target.observations ?? [];
          if (target.observations.length < 16 && !target.observations.some((o) => o.paragraphIndex === i)) {
            target.observations.push({
              paragraphIndex: i,
              summary: visualMatches.join('; ').slice(0, 480),
              visualDetails: visualMatches.slice(0, 6).map((v) => v.slice(0, 150)),
              ...(paperMatch ? { material: paperMatch[0].replace(/^the\s+/i, '').trim() } : {}),
              evidence: text.slice(0, 1100),
            });
          }
        }
        targetEntry.lastMentionParagraph = i;
      }
      if (i > target.paragraphIndex && (/\b(?:it|the\s+(?:paper|page|sheet|card))\s+(?:reads?|says?|continues?)\b/i.test(text) || /^\s*>\s+/m.test(text))) {
        captureDocumentQuotes(text, i, target, getClaimed(i));
        targetEntry.lastMentionParagraph = i;
      }
    }
  }
  return detected.slice(0, 12).map((d) => ({
    ...d.doc,
    sections: d.doc.sections.slice(0, 16),
    ...(d.doc.observations ? { observations: d.doc.observations.slice(0, 16) } : {}),
  }));
}

/** Merge two validated StoryDocument arrays without duplicating identical or aliased physical props. */
export function mergeStoryDocuments(
  primary: readonly StoryDocument[],
  secondary: readonly StoryDocument[],
): StoryDocument[] {
  const merged: StoryDocument[] = primary.slice(0, 12).map((doc) => ({
    ...doc,
    sections: doc.sections.slice(0, 16).map((s) => ({ ...s })),
    ...(doc.aliases ? { aliases: [...doc.aliases] } : {}),
    ...(doc.observations ? { observations: doc.observations.slice(0, 16).map((o) => ({ ...o })) } : {}),
  }));
  const usedIds = new Set(merged.map((d) => d.id));

  const docTokens = (doc: StoryDocument): Set<string> => new Set(
    [doc.name, ...(doc.aliases ?? [])]
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && w !== doc.kind),
  );

  const findMatch = (candidate: StoryDocument): StoryDocument | undefined => {
    const names = new Set([candidate.name, ...(candidate.aliases ?? [])].map((s) => s.toLowerCase()));
    const candTokens = docTokens(candidate);
    for (const existing of merged) {
      if (existing.id === candidate.id) return existing;
      const existingNames = [existing.name, ...(existing.aliases ?? [])].map((s) => s.toLowerCase());
      if (existingNames.some((n) => names.has(n))) return existing;
      if (existing.kind === candidate.kind && Math.abs(existing.paragraphIndex - candidate.paragraphIndex) <= 1) {
        // Merge across adjacent paragraphs only when sharing a meaningful descriptor/token
        // or when one uses a bare generic noun like "flyer" / "notice".
        const exTokens = docTokens(existing);
        if (candTokens.size === 0 || exTokens.size === 0 || [...candTokens].some((t) => exTokens.has(t))) {
          return existing;
        }
      }
    }
    return undefined;
  };

  for (const extra of secondary) {
    const match = findMatch(extra);
    if (!match) {
      if (merged.length < 12) {
        const nextId = extra.id && !usedIds.has(extra.id)
          ? extra.id
          : stableDocumentId(extra.kind, extra.name, usedIds);
        usedIds.add(nextId);
        merged.push({
          ...extra,
          id: nextId,
          sections: extra.sections.slice(0, 16).map((s) => ({ ...s })),
          ...(extra.aliases ? { aliases: [...extra.aliases] } : {}),
          ...(extra.observations ? { observations: extra.observations.slice(0, 16).map((o) => ({ ...o })) } : {}),
        });
      }
      continue;
    }

    const aliasSet = new Set([match.name, ...(match.aliases ?? [])].map((a) => a.toLowerCase()));
    const newAliases = [extra.name, ...(extra.aliases ?? [])].filter((a) => {
      const lower = a.toLowerCase();
      if (aliasSet.has(lower)) return false;
      aliasSet.add(lower);
      return true;
    });
    if (newAliases.length) {
      match.aliases = [...(match.aliases ?? []), ...newAliases].slice(0, 8);
    }
    if (!match.visualDetails && extra.visualDetails) {
      match.visualDetails = extra.visualDetails;
    }
    if (extra.observations?.length) {
      match.observations = match.observations ?? [];
      for (const obs of extra.observations) {
        if (match.observations.length >= 16) break;
        if (!match.observations.some((o) => o.paragraphIndex === obs.paragraphIndex)) {
          match.observations.push({ ...obs });
        }
      }
    }
    for (const sec of extra.sections) {
      if (match.sections.length >= 16) break;
      if (!match.sections.some((s) => s.paragraphIndex === sec.paragraphIndex && s.text === sec.text)) {
        match.sections.push({ ...sec });
      }
    }
  }

  return merged;
}

export interface StrictStoryDocumentFilterOptions {
  knownDocumentNames?: readonly string[];
  suppressedNouns?: readonly string[];
  fromSidecarLlm?: boolean;
}

const GENERIC_BARE_DOCUMENT_NOUNS = new Set([
  'note', 'notes', 'letter', 'letters', 'page', 'pages', 'paper', 'papers',
  'sheet', 'sheets', 'card', 'cards', 'book', 'books', 'file', 'files',
  'record', 'records', 'document', 'documents', 'list', 'lists',
  'message', 'messages', 'entry', 'entries', 'line', 'lines',
  'word', 'words', 'text', 'sign', 'signs', 'label', 'labels',
  'form', 'forms', 'report', 'reports', 'script', 'scripts',
  'post', 'posts', 'mail', 'draft', 'drafts', 'copy', 'copies',
]);

/**
 * Filter StoryDocuments for strict readable/inspected quality, removing suppressed nouns
 * and bare generic regex false positives while enforcing schema array bounds.
 */
export function filterStrictStoryDocuments(
  docs: readonly StoryDocument[],
  options: StrictStoryDocumentFilterOptions = {},
): StoryDocument[] {
  const suppressed = new Set(
    (options.suppressedNouns ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const known = new Set(
    (options.knownDocumentNames ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  const result: StoryDocument[] = [];
  for (const doc of docs) {
    if (result.length >= 12) break;
    const lowerName = doc.name.trim().toLowerCase();
    if (!lowerName) continue;
    if (suppressed.has(lowerName) || doc.aliases?.some((a) => suppressed.has(a.trim().toLowerCase()))) {
      continue;
    }

    const normalized: StoryDocument = {
      ...doc,
      sections: doc.sections.slice(0, 16),
      ...(doc.observations ? { observations: doc.observations.slice(0, 16) } : {}),
    };

    if (options.fromSidecarLlm) {
      result.push(normalized);
      continue;
    }

    const bareName = lowerName.replace(/^(?:the|a|an|this|that|my|his|her|their)\s+/i, '').trim();
    const isKnown = known.has(lowerName) || known.has(bareName) || Boolean(doc.aliases?.some((a) => known.has(a.trim().toLowerCase())));
    if (isKnown || normalized.sections.length > 0 || (normalized.observations?.length ?? 0) > 0) {
      result.push(normalized);
      continue;
    }

    if (GENERIC_BARE_DOCUMENT_NOUNS.has(bareName)) {
      continue;
    }

    result.push(normalized);
  }
  return result;
}
