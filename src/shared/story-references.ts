import { z } from 'zod';
import { deriveShortAliases, matchesBoundaryCandidate } from './story-dna.js';
import { REFERENCE_FIELDS, referenceFieldMatchesKind, type ReferenceField } from './reference-fields.js';
import { GROUNDING_STOPWORDS, alignSpanInParagraph, isClaimGroundedInEvidence, normalizeForGroundMatch } from './grounding.js';

export const StoryReferenceSchema = z.object({
 kind: z.enum(['npc','place','object']), name: z.string().trim().min(1).max(256),
 paragraphIndex: z.number().int().nonnegative(),
 field: z.enum(REFERENCE_FIELDS),
 value: z.string().trim().min(1).max(400), evidence: z.string().trim().min(1).max(1200),
}).strict().refine(reference=>referenceFieldMatchesKind(reference.field,reference.kind),{message:'Reference field does not apply to this entity category.'});
export type StoryReference = z.infer<typeof StoryReferenceSchema>;

export type LoreDropTrace = {
  invalidSchema: number;
  missingParagraph: number;
  ungroundedEvidence: number;
  ungroundedName: number;
  ungroundedValue: number;
  accepted: number;
};

export type NormalizeStoryReferencesOptions = {
  paragraphSpeakers?: readonly (string | null)[] | undefined;
  detectedLocation?: string | null | undefined;
  sourceIndexes?: readonly number[] | undefined;
  trace?: LoreDropTrace | undefined;
};

const REFERENCE_KIND_SYNONYMS: Record<string, 'npc' | 'place' | 'object'> = {
  npc: 'npc',
  character: 'npc',
  person: 'npc',
  place: 'place',
  location: 'place',
  setting: 'place',
  area: 'place',
  room: 'place',
  building: 'place',
  object: 'object',
  item: 'object',
  artifact: 'object',
  relic: 'object',
  weapon: 'object',
  prop: 'object',
  document: 'object',
};

const REFERENCE_FIELD_SYNONYMS: Record<string, ReferenceField> = {
  material: 'materials',
  color: 'colors',
  features: 'distinctiveFeatures',
  feature: 'distinctiveFeatures',
  goal: 'statedGoals',
  goals: 'statedGoals',
  affiliation: 'affiliations',
  relationship: 'relationships',
  mannerism: 'mannerisms',
  route: 'routes',
  custom: 'customs',
  service: 'services',
  risk: 'risks',
  limit: 'limits',
  persistent: 'persistentElements',
};

function coerceRawStoryReference(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  // Reject explicitly private/secret records immediately (never strip privacy markers).
  if (obj.visibility === 'private' || obj.visibility === 'secret') return raw;

  const rawKind = typeof obj.kind === 'string' ? obj.kind.trim().toLowerCase() : obj.kind;
  const kind = typeof rawKind === 'string' ? (REFERENCE_KIND_SYNONYMS[rawKind] ?? rawKind) : obj.kind;

  const rawField = typeof obj.field === 'string' ? obj.field.trim() : obj.field;
  let field = typeof rawField === 'string'
    ? (REFERENCE_FIELD_SYNONYMS[rawField.toLowerCase()] ?? REFERENCE_FIELD_SYNONYMS[rawField] ?? rawField)
    : obj.field;
  if (kind === 'place' && field === 'history') {
    field = 'publicHistory';
  }
  if (kind === 'place' && (field === 'provenance' || field === 'significance')) {
    field = 'publicHistory';
  }

  const paragraphIndex = obj.paragraphIndex ?? obj.paragraph_index ?? obj.paragraph;
  return {
    kind,
    name: obj.name,
    paragraphIndex,
    field,
    value: obj.value,
    evidence: obj.evidence,
  };
}

function collectCandidateNames(name: string): string[] {
  const out = new Set<string>();
  const trimmed = name.trim();
  if (trimmed) out.add(trimmed.toLowerCase());
  for (const alias of deriveShortAliases(trimmed)) {
    const lower = alias.toLowerCase();
    if (lower.length >= 3 && !GROUNDING_STOPWORDS.has(lower)) {
      out.add(lower);
    }
  }
  return [...out];
}

function matchesAnyCandidateInText(normText: string, candidates: readonly string[]): boolean {
  for (const cand of candidates) {
    if (!cand || cand.length < 3) continue;
    if (cand.length >= 4 && normText.includes(cand)) return true;
    if (matchesBoundaryCandidate(normText, cand)) return true;
  }
  return false;
}

/** Optional enrichment cannot invalidate the primary plan. Evidence is literal
 * visible prose from this paragraph, never hidden context or inferred biography. */
export function normalizeStoryReferences(
  value: unknown,
  paragraphs: readonly { text: string }[],
  options: NormalizeStoryReferencesOptions = {},
): StoryReference[] {
  if (!Array.isArray(value)) return [];
  const result: StoryReference[] = [];
  const seen = new Set<string>();
  const trace = options.trace;

  for (const raw of value.slice(0, 128)) {
    const parsed = StoryReferenceSchema.safeParse(coerceRawStoryReference(raw));
    if (!parsed.success) {
      if (trace) trace.invalidSchema += 1;
      continue;
    }
    const r = parsed.data;
    const paragraph = paragraphs[r.paragraphIndex]?.text;
    if (!paragraph) {
      if (trace) trace.missingParagraph += 1;
      continue;
    }

    const normPara = normalizeForGroundMatch(paragraph);
    const normEvid = normalizeForGroundMatch(r.evidence);
    const evidGrounded = Boolean(
      normEvid
      && (normPara.includes(normEvid) || normEvid.includes(normPara) || alignSpanInParagraph(paragraph, r.evidence) !== null)
    );
    if (!evidGrounded) {
      if (trace) trace.ungroundedEvidence += 1;
      continue;
    }

    const candidates = collectCandidateNames(r.name);
    let nameGrounded = matchesAnyCandidateInText(normPara, candidates) || matchesAnyCandidateInText(normEvid, candidates);

    // Cross-beat subject inheritance: smart beat segmentation often splits a long
    // paragraph so the pronoun/detail beat no longer repeats the entity name.
    if (!nameGrounded) {
      const targetSourceIndex = options.sourceIndexes?.[r.paragraphIndex];
      const speaker = r.kind === 'npc' ? options.paragraphSpeakers?.[r.paragraphIndex]?.trim().toLowerCase() : undefined;
      const detectedLoc = r.kind === 'place' ? options.detectedLocation?.trim().toLowerCase() : undefined;
      if (speaker && candidates.some((c) => speaker === c || speaker.includes(c) || c.includes(speaker))) {
        nameGrounded = true;
      } else if (detectedLoc && candidates.some((c) => detectedLoc === c || matchesBoundaryCandidate(detectedLoc, c))) {
        nameGrounded = true;
      } else {
        for (let back = r.paragraphIndex - 1; back >= Math.max(0, r.paragraphIndex - 2); back -= 1) {
          const sameSource = targetSourceIndex !== undefined && options.sourceIndexes?.[back] === targetSourceIndex;
          const prevText = paragraphs[back]?.text;
          if (!prevText) continue;
          const prevNorm = normalizeForGroundMatch(prevText);
          if ((sameSource || r.paragraphIndex - back <= 2) && matchesAnyCandidateInText(prevNorm, candidates)) {
            nameGrounded = true;
            break;
          }
        }
      }
    }

    if (!nameGrounded) {
      if (trace) trace.ungroundedName += 1;
      continue;
    }

    const valGrounded = isClaimGroundedInEvidence(r.evidence, r.value, 0.8) || isClaimGroundedInEvidence(paragraph, r.value, 0.8);
    if (!valGrounded) {
      if (trace) trace.ungroundedValue += 1;
      continue;
    }

    const key = JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(r);
    if (trace) trace.accepted += 1;
    if (result.length === 32) break;
  }
  return result;
}
