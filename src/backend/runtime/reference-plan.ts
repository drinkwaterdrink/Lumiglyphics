import {
  type ReferencePlan,
  type ReferenceItem,
  type ReferenceRole,
  createReferencePlan
} from '../../shared/reference-plan.js';
import {
  estimateBase64Bytes,
  MAX_SAFE_REFERENCE_BYTES,
  NANO_GPT_PAYLOAD_LIMIT_BYTES,
  enforceReferencePayloadBudget,
  type CompressDataUrlFn,
} from '../../shared/image-payload-sanitizer.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import type { VisualCue } from '../../shared/contracts.js';
import type { StoredPortrait } from './storage.js';
import { normalizeCharacterName } from '../../shared/identity.js';
import { areNamesEquivalent, findMatchingCharacterId } from '../../shared/nicknames.js';
import type { CharacterDNA, CharacterDNALibrary } from '../../shared/character-dna.js';

export * from '../../shared/reference-plan.js';

export const MAX_ATTACHED_REFS = 3;

export interface ResolveReferencePlanOptions {
  brief?: VisualBrief | undefined;
  cue?: VisualCue | undefined;
  portraits?: Record<string, StoredPortrait | undefined> | undefined;
  referenceImages?: Array<{ data: string; mimeType?: string; label?: string; role?: ReferenceRole; subject?: string }> | undefined;
  characterDNALibrary?: CharacterDNALibrary | Record<string, CharacterDNA> | undefined;
  maxRefs?: number | undefined;
  maxPerRefBytes?: number | undefined;
  maxTotalBytes?: number | undefined;
  compressDataUrl?: CompressDataUrlFn | undefined;
}

const DATA_IMAGE_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;
const RAW_BASE64_RE = /^[A-Za-z0-9+/=]{16,}$/;

/** Returns a verified pixel data URL, or undefined. Never wraps URLs/paths as base64. */
export function hydrateDataUrlDetailed(raw?: string | null, fallbackMime = 'image/png'): { dataUrl: string; mimeType: string } | undefined {
  const clean = raw?.trim();
  if (!clean) return undefined;
  const m = DATA_IMAGE_URL_RE.exec(clean);
  if (m) return { dataUrl: clean, mimeType: m[1]!.toLowerCase() };
  if (clean.startsWith('/') || clean.startsWith('.') || /^[a-z][a-z0-9+.-]*:/i.test(clean)) return undefined;
  const stripped = clean.replace(/\s+/g, '');
  if (!RAW_BASE64_RE.test(stripped) || stripped.length % 4 === 1) return undefined;
  return { dataUrl: `data:${fallbackMime};base64,${stripped}`, mimeType: fallbackMime };
}

export function hydrateDataUrl(raw?: string | null, mimeType = 'image/png'): string | undefined {
  return hydrateDataUrlDetailed(raw, mimeType)?.dataUrl;
}

const mimeOf = (dataUrl: string, fallback = 'image/png'): string => DATA_IMAGE_URL_RE.exec(dataUrl)?.[1]?.toLowerCase() ?? fallback;

function gatherReferenceCandidates(options: ResolveReferencePlanOptions): Array<ReferenceItem & { priority: number }> {
  const candidates: Array<ReferenceItem & { priority: number }> = [];

  if (options.referenceImages && options.referenceImages.length > 0) {
    for (let i = 0; i < options.referenceImages.length; i++) {
      const item = options.referenceImages[i]!;
      const mimeType = item.mimeType ?? 'image/png';
      const dataUrl = hydrateDataUrl(item.data, mimeType);
      if (!dataUrl) continue;
      candidates.push({
        imageId: `ref-${i + 1}`,
        role: item.role ?? 'identity',
        ...(item.subject ? { subject: item.subject } : {}),
        label: item.label ?? `Reference Image ${i + 1}`,
        dataUrl,
        mimeType,
        priority: item.role === 'identity' ? 1 : item.role === 'clothing' ? 2 : 3,
      });
    }
    return candidates;
  }

  const chars = options.characterDNALibrary
    ? (('characters' in options.characterDNALibrary ? options.characterDNALibrary.characters : options.characterDNALibrary) as Record<string, CharacterDNA>)
    : undefined;

  const findPortraitFor = (name: string): StoredPortrait | undefined => {
    if (!options.portraits || !name) return undefined;
    const normalized = normalizeCharacterName(name);
    return Object.entries(options.portraits).find(([key, p]) => {
      if (!p) return false;
      const strippedKey = key.replace(/^card:/, '');
      const normalizedKey = normalizeCharacterName(strippedKey);
      return normalizedKey === normalized || areNamesEquivalent(strippedKey, name);
    })?.[1];
  };

  if (options.cue) {
    const characterName = options.cue.character || options.brief?.subjectPreparation?.name;
    if (characterName) {
      const normalized = normalizeCharacterName(characterName);

      if (chars) {
        const matchId = findMatchingCharacterId(chars, characterName);
        const dna = matchId ? chars[matchId] : undefined;
        const primaryUrl = hydrateDataUrl(dna?.referenceImageUrl);
        if (dna && primaryUrl) {
          candidates.push({
            imageId: dna.referenceImageId || `ref-${dna.id}-identity`,
            role: 'identity',
            subject: dna.name,
            label: `${dna.name} primary face reference`,
            dataUrl: primaryUrl,
            mimeType: mimeOf(primaryUrl),
            priority: 1,
          });
        }
        const secondaryUrl = hydrateDataUrl(dna?.secondaryReferenceImageUrl);
        if (dna && secondaryUrl) {
          candidates.push({
            imageId: dna.secondaryReferenceImageId || `ref-${dna.id}-attire`,
            role: 'clothing',
            subject: dna.name,
            label: `${dna.name} outfit reference`,
            dataUrl: secondaryUrl,
            mimeType: mimeOf(secondaryUrl),
            priority: 2,
          });
        }
      }

      if (!candidates.some(r => r.subject && areNamesEquivalent(r.subject, characterName) && r.role === 'identity')) {
        const portrait = findPortraitFor(characterName);
        const portraitUrl = hydrateDataUrl(portrait?.data, portrait?.mimeType ?? 'image/png');
        if (portrait && portraitUrl) {
          candidates.push({
            imageId: `portrait-${normalized || 'main'}`,
            role: 'identity',
            subject: characterName,
            label: `${characterName} character portrait`,
            dataUrl: portraitUrl,
            mimeType: portrait.mimeType ?? 'image/png',
            priority: 1,
          });
        }
      }
    }

    if (options.cue.ensembleSubjects && options.cue.ensembleSubjects.length > 0) {
      for (const member of options.cue.ensembleSubjects) {
        if (!member.name || candidates.some(r => r.subject && areNamesEquivalent(r.subject, member.name))) continue;

        if (chars) {
          const matchId = findMatchingCharacterId(chars, member.name);
          const dna = matchId ? chars[matchId] : undefined;
          const memberUrl = hydrateDataUrl(dna?.referenceImageUrl);
          if (dna && memberUrl) {
            candidates.push({
              imageId: dna.referenceImageId || `ref-${dna.id}-identity`,
              role: 'identity',
              subject: dna.name,
              label: `${dna.name} character reference`,
              dataUrl: memberUrl,
              mimeType: mimeOf(memberUrl),
              priority: 2,
            });
            continue;
          }
        }

        const memberPortrait = findPortraitFor(member.name);
        const memberUrl = hydrateDataUrl(memberPortrait?.data, memberPortrait?.mimeType ?? 'image/png');
        if (memberPortrait && memberUrl) {
          candidates.push({
            imageId: `portrait-${normalizeCharacterName(member.name) || 'member'}`,
            role: 'identity',
            subject: member.name,
            label: `${member.name} character portrait`,
            dataUrl: memberUrl,
            mimeType: memberPortrait.mimeType ?? 'image/png',
            priority: 2,
          });
        }
      }
    }
  }

  return candidates;
}

function finalizeAttachedRefs(items: ReadonlyArray<ReferenceItem & { byteSize?: number }>, maxRefs = MAX_ATTACHED_REFS): ReferencePlan {
  const capped = items.slice(0, Math.max(1, Math.min(MAX_ATTACHED_REFS, maxRefs))).map((item, idx) => ({
    ...item,
    wireIndex: idx + 1,
    ...(item.byteSize !== undefined ? { byteSize: item.byteSize } : {}),
  }));
  return createReferencePlan(capped);
}

/**
 * Resolves a bounded, wire-indexed ReferencePlan synchronously (<= 3 refs, <= 1.5MB/ref, < 10MB cumulative).
 * Only attaches refs with hydrated pixel payloads (`dataUrl`) and assigns 1-based `wireIndex`.
 */
export function resolveReferencePlan(options: ResolveReferencePlanOptions): ReferencePlan {
  const maxPerRef = options.maxPerRefBytes ?? MAX_SAFE_REFERENCE_BYTES;
  const maxTotal = options.maxTotalBytes ?? NANO_GPT_PAYLOAD_LIMIT_BYTES;
  const maxRefs = options.maxRefs ?? MAX_ATTACHED_REFS;
  const ordered = gatherReferenceCandidates(options).sort((a, b) => a.priority - b.priority);
  const kept: Array<ReferenceItem & { byteSize: number }> = [];
  let totalBytes = 0;
  for (const candidate of ordered) {
    if (!candidate.dataUrl) continue;
    const byteSize = estimateBase64Bytes(candidate.dataUrl);
    if (byteSize <= 0 || byteSize > maxPerRef) continue;
    if (totalBytes + byteSize >= maxTotal) continue;
    totalBytes += byteSize;
    const { priority: _p, ...rest } = candidate;
    kept.push({ ...rest, byteSize });
    if (kept.length >= maxRefs) break;
  }
  return finalizeAttachedRefs(kept, maxRefs);
}

/**
 * Async variant that invokes an image compressor on oversized references before enforcing the 10MB budget and <= 3 ref cap.
 */
export async function resolveReferencePlanBudgeted(options: ResolveReferencePlanOptions): Promise<ReferencePlan> {
  const candidates = gatherReferenceCandidates(options);
  const accepted = await enforceReferencePayloadBudget(
    candidates,
    options.compressDataUrl,
    options.maxPerRefBytes ?? MAX_SAFE_REFERENCE_BYTES,
    options.maxTotalBytes ?? NANO_GPT_PAYLOAD_LIMIT_BYTES,
  );
  const cleaned = accepted.map(({ priority: _p, ...rest }) => rest);
  return finalizeAttachedRefs(cleaned, options.maxRefs ?? MAX_ATTACHED_REFS);
}
