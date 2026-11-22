/**
 * Shared text normalization, multi-tier span grounding, and token-overlap
 * utilities for story documents, entity references, and cross-turn history.
 */

export type SpanRange = { start: number; end: number };

export type GroundedSpanMatch = {
  start: number;
  end: number;
  text: string;
  matchType: 'exact' | 'normalized' | 'fuzzy';
};

export const GROUNDING_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'onto', 'that', 'this', 'these',
  'those', 'was', 'were', 'are', 'is', 'be', 'been', 'being', 'has', 'had', 'have',
  'her', 'his', 'him', 'she', 'he', 'they', 'them', 'their', 'its', 'you', 'your',
  'our', 'who', 'whom', 'whose', 'not', 'but', 'out', 'off', 'all', 'one', 'two',
  'can', 'may', 'will', 'would', 'could', 'should', 'way', 'day', 'too', 'very',
  'over', 'under', 'near', 'about', 'after', 'before', 'between', 'through',
]);

const WIDE_SPACE_RE = /[\u2800\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/;

/** Non-semantic presentation formatting tags stripped when aligning text across presets. */
const BENIGN_INLINE_TAG_RE = /^<\/?(?:i|b|em|strong|u|s|span|small|sub|sup|mark|font|cornflower|amber|crimson|emerald|violet|silver|gold)\b[^>]*>/i;

function normalizeChar(ch: string): string {
  if (ch === '\u2018' || ch === '\u2019' || ch === '\u201A' || ch === '\u2032') return "'";
  if (ch === '\u201C' || ch === '\u201D' || ch === '\u201E' || ch === '\u2033') return '"';
  if (ch === '\u2014' || ch === '\u2013' || ch === '\u2212') return '-';
  if (ch === '\u2026') return '...';
  if (ch === '\r' || ch === '\n' || ch === '\t' || WIDE_SPACE_RE.test(ch)) return ' ';
  return ch;
}

function isWordOrNumChar(ch: string | undefined): boolean {
  return Boolean(ch && /[\p{L}\p{N}]/u.test(ch));
}

function isWordSpace(ch: string | undefined): boolean {
  return !ch || /\s/.test(normalizeChar(ch));
}

/**
 * Normalizes prose for comparison across presets (Braille blanks `\u2800`,
 * wide spaces, curly quotes, em/en dashes, benign inline markup tags,
 * collapsed whitespace, and lowercase).
 */
export function normalizeForGroundMatch(text: string): string {
  if (!text) return '';
  const { normalized } = buildNormalizedIndexMap(text);
  return normalized.trim();
}

type NormalizedIndexMap = {
  normalized: string;
  indexMap: number[];
};

function buildNormalizedIndexMap(raw: string): NormalizedIndexMap {
  const hasBrailleLetters = /[\u2801-\u28FF]/.test(raw);
  const chars: string[] = [];
  const indexMap: number[] = [];
  let pendingSpaceIndex = -1;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]!;

    // Skip non-semantic inline formatting wrappers while preserving inner text.
    if (ch === '<') {
      const slice = raw.slice(i, i + 128);
      const tagMatch = BENIGN_INLINE_TAG_RE.exec(slice);
      if (tagMatch) {
        i += tagMatch[0].length - 1;
        continue;
      }
    }

    // Strip word-boundary Markdown emphasis delimiters (* ** _ ~) without harming snake_case.
    if (ch === '*' || ch === '_' || ch === '~') {
      const prev = i > 0 ? raw[i - 1] : undefined;
      const next = i + 1 < raw.length ? raw[i + 1] : undefined;
      const atLeftBoundary = isWordSpace(prev) || /[(\["'“‘]/.test(prev ?? '');
      const atRightBoundary = isWordSpace(next) || /[.,!?;:\])"'”’]/.test(next ?? '');
      if (atLeftBoundary || atRightBoundary || next === ch || prev === ch) {
        if (ch === '_' && isWordOrNumChar(prev) && isWordOrNumChar(next)) {
          // Keep internal snake_case underscores.
        } else {
          continue;
        }
      }
    }

    const effective = ch === '\u2800' && hasBrailleLetters ? ch : normalizeChar(ch);
    if (effective === ' ') {
      if (chars.length > 0 && pendingSpaceIndex < 0) {
        pendingSpaceIndex = i;
      }
      continue;
    }

    if (pendingSpaceIndex >= 0) {
      chars.push(' ');
      indexMap.push(pendingSpaceIndex);
      pendingSpaceIndex = -1;
    }

    const lowered = effective.toLowerCase();
    for (let k = 0; k < lowered.length; k += 1) {
      chars.push(lowered[k]!);
      indexMap.push(i);
    }
  }

  return { normalized: chars.join(''), indexMap };
}

function overlapsAny(start: number, end: number, claimed?: ReadonlyArray<SpanRange>): boolean {
  if (!claimed?.length) return false;
  return claimed.some((r) => start < r.end && end > r.start);
}

type TokenSpan = { token: string; start: number; end: number };

function tokenizeWithSpans(raw: string): TokenSpan[] {
  const tokens: TokenSpan[] = [];
  const tokenRe = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(raw)) !== null) {
    const token = normalizeForGroundMatch(m[0]);
    if (!token) continue;
    tokens.push({ token, start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

function tokenizeContent(text: string): string[] {
  const norm = normalizeForGroundMatch(text);
  const all = norm.match(/[\p{L}\p{N}]+/gu) ?? [];
  const filtered = all.filter((tok) => tok.length >= 2 && !GROUNDING_STOPWORDS.has(tok));
  return filtered.length > 0 ? filtered : all;
}

/**
 * Aligns a candidate excerpt (`needle`) back to an exact `[start, end]` range
 * inside `paragraphText`, supporting verbatim, preset-normalized, and bounded
 * fuzzy token-window alignment while respecting claimed spans.
 */
export function alignSpanInParagraph(
  paragraphText: string,
  needle: string,
  options: {
    claimedSpans?: ReadonlyArray<SpanRange>;
    minFuzzyScore?: number;
  } = {},
): GroundedSpanMatch | null {
  if (!paragraphText || !needle?.trim()) return null;
  const claimed = options.claimedSpans;

  // 1. Exact substring match
  let searchFrom = 0;
  while (searchFrom <= paragraphText.length - needle.length) {
    const idx = paragraphText.indexOf(needle, searchFrom);
    if (idx < 0) break;
    const end = idx + needle.length;
    if (!overlapsAny(idx, end, claimed)) {
      return { start: idx, end, text: needle, matchType: 'exact' };
    }
    searchFrom = idx + 1;
  }

  // 2. Normalized index-mapped match
  const normNeedle = normalizeForGroundMatch(needle);
  if (!normNeedle) return null;
  const { normalized, indexMap } = buildNormalizedIndexMap(paragraphText);
  let normFrom = 0;
  while (normFrom <= normalized.length - normNeedle.length) {
    const idx = normalized.indexOf(normNeedle, normFrom);
    if (idx < 0) break;
    const normEnd = idx + normNeedle.length - 1;
    const rawStart = indexMap[idx];
    const rawLast = indexMap[normEnd];
    if (rawStart !== undefined && rawLast !== undefined) {
      let rawEnd = rawLast + 1;
      // Extend cleanly past an immediately adjacent closing emphasis/quote if balanced
      while (rawEnd < paragraphText.length && /[\*_'”’"]/.test(paragraphText[rawEnd]!) && needle.trimEnd().endsWith(paragraphText[rawEnd]!)) {
        rawEnd += 1;
      }
      if (rawEnd > rawStart && !overlapsAny(rawStart, rawEnd, claimed)) {
        return {
          start: rawStart,
          end: rawEnd,
          text: paragraphText.slice(rawStart, rawEnd),
          matchType: 'normalized',
        };
      }
    }
    normFrom = idx + 1;
  }

  // 3. Fuzzy token-window match (>= minFuzzyScore) for multi-word excerpts
  const minScore = options.minFuzzyScore ?? 0.82;
  const needleTokens = tokenizeWithSpans(needle).map((t) => t.token);
  if (needleTokens.length < 3) return null;
  const paraTokens = tokenizeWithSpans(paragraphText);
  if (paraTokens.length < Math.ceil(needleTokens.length * minScore)) return null;

  const needleSet = new Set(needleTokens);
  const minWin = Math.max(2, Math.floor(needleTokens.length * 0.75));
  const maxWin = Math.min(paraTokens.length, needleTokens.length + 4);

  let bestScore = 0;
  let bestRange: { start: number; end: number } | null = null;

  for (let i = 0; i < paraTokens.length; i += 1) {
    for (let len = minWin; len <= maxWin && i + len <= paraTokens.length; len += 1) {
      const spanStart = paraTokens[i]!.start;
      const spanEnd = paraTokens[i + len - 1]!.end;
      if (overlapsAny(spanStart, spanEnd, claimed)) continue;

      const winTokens = paraTokens.slice(i, i + len).map((t) => t.token);
      let hits = 0;
      const seenWin = new Set<string>();
      for (const wt of winTokens) {
        if (!seenWin.has(wt) && needleSet.has(wt)) {
          hits += 1;
        }
        seenWin.add(wt);
      }
      const recall = hits / needleSet.size;
      const precision = hits / Math.max(1, seenWin.size);
      // Ordered subsequence bonus preserves word sequence
      let nIdx = 0;
      for (const wt of winTokens) {
        if (nIdx < needleTokens.length && wt === needleTokens[nIdx]) nIdx += 1;
      }
      const orderRatio = nIdx / needleTokens.length;
      const score = recall * 0.55 + precision * 0.25 + orderRatio * 0.2;
      if (score >= minScore && score > bestScore) {
        bestScore = score;
        bestRange = { start: spanStart, end: spanEnd };
      }
    }
  }

  if (bestRange) {
    let end = bestRange.end;
    const trimmedNeedle = needle.trimEnd();
    const tailChar = paragraphText[end];
    if (tailChar && /[.!?]/.test(tailChar) && /[.!?]$/.test(trimmedNeedle)) {
      end += 1;
    }
    return {
      start: bestRange.start,
      end,
      text: paragraphText.slice(bestRange.start, end),
      matchType: 'fuzzy',
    };
  }

  return null;
}

/**
 * Returns true when `needle` is grounded in `haystack` either as a normalized
 * substring or via high token overlap (ignoring trivial stopwords/punctuation).
 */
export function hasTokenOverlap(haystack: string, needle: string, minRatio = 0.8): boolean {
  const normHaystack = normalizeForGroundMatch(haystack);
  const normNeedle = normalizeForGroundMatch(needle);
  if (!normHaystack || !normNeedle) return false;
  if (normHaystack.includes(normNeedle)) return true;

  const needleTokens = tokenizeContent(needle);
  if (needleTokens.length === 0) return false;
  const hayTokenSet = new Set(normalizeForGroundMatch(haystack).match(/[\p{L}\p{N}]+/gu) ?? []);
  let matched = 0;
  for (const tok of needleTokens) {
    if (hayTokenSet.has(tok) || normHaystack.includes(tok)) {
      matched += 1;
    }
  }
  return matched / needleTokens.length >= minRatio;
}

const NEGATION_CUES_REGEX = /\b(?:not|never|no|none|neither|nor|without|refused|denied|failed\s+to|didn['’]t|doesn['’]t|don['’]t|wasn['’]t|weren['’]t|won['’]t|wouldn['’]t|couldn['’]t|can['’]t|cannot|hasn['’]t|haven['’]t|hadn['’]t)\b/i;
const DIRECTIONAL_ACTION_REGEX = /\b([A-Z][a-zA-Z'’\-]+)\b[^.!?]{0,40}?\b(handed|gave|gives|told|tells|promised|promises|killed|kills|attacked|attacks|stole|steals|sent|sends|owed|owes|betrayed|betrays|warned|warns|accused|accuses|forgave|forgives|struck|strikes)\b[^.!?]{0,40}?\b([A-Z][a-zA-Z'’\-]+)\b/;

function bestMatchingClause(haystack: string, needle: string): string {
  const clauses = haystack.split(/(?<=[.!?;])\s+/).map((s) => s.trim()).filter(Boolean);
  if (clauses.length <= 1) return haystack;
  const needleTokens = tokenizeContent(needle);
  let best = clauses[0]!;
  let bestScore = -1;
  for (const clause of clauses) {
    const lower = normalizeForGroundMatch(clause);
    let score = 0;
    for (const tok of needleTokens) {
      if (lower.includes(tok)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = clause;
    }
  }
  return best;
}

/**
 * Validates that a claimed fact is grounded in haystack without flipping
 * negation polarity or reversing directional participant roles (e.g. A handed B vs B handed A).
 */
export function isClaimGroundedInEvidence(haystack: string, needle: string, minRatio = 0.8): boolean {
  if (!hasTokenOverlap(haystack, needle, minRatio)) return false;
  const clause = bestMatchingClause(haystack, needle);
  const hayNegated = NEGATION_CUES_REGEX.test(clause);
  const needleNegated = NEGATION_CUES_REGEX.test(needle);
  if (hayNegated !== needleNegated) return false;

  const needleDir = DIRECTIONAL_ACTION_REGEX.exec(needle);
  const hayDir = DIRECTIONAL_ACTION_REGEX.exec(clause);
  if (needleDir && hayDir) {
    const nSubj = needleDir[1]!.toLowerCase();
    const nObj = needleDir[3]!.toLowerCase();
    const hSubj = hayDir[1]!.toLowerCase();
    const hObj = hayDir[3]!.toLowerCase();
    if (nSubj !== nObj && nSubj === hObj && nObj === hSubj) {
      return false;
    }
  }
  return true;
}
