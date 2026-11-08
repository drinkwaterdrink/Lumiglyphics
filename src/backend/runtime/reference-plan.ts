import {
  type ReferencePlan,
  type ReferenceItem,
  type ReferenceRole,
  createReferencePlan
} from '../../shared/reference-plan.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import type { VisualCue } from '../../shared/contracts.js';
import type { StoredPortrait } from './storage.js';
import { normalizeCharacterName } from '../../shared/identity.js';
import { areNamesEquivalent, findMatchingCharacterId } from '../../shared/nicknames.js';
import type { CharacterDNA, CharacterDNALibrary } from '../../shared/character-dna.js';

export * from '../../shared/reference-plan.js';

export interface ResolveReferencePlanOptions {
  brief?: VisualBrief | undefined;
  cue?: VisualCue | undefined;
  portraits?: Record<string, StoredPortrait | undefined> | undefined;
  referenceImages?: Array<{ data: string; mimeType?: string; label?: string; role?: ReferenceRole }> | undefined;
  characterDNALibrary?: CharacterDNALibrary | Record<string, CharacterDNA> | undefined;
}

/**
 * Resolves an explicit ReferencePlan for the scene.
 * Only includes references that are genuinely attached.
 * Never writes "use the reference image" when no image is being supplied.
 * Supports multiple references (primary face identity + secondary outfit / attire) and nickname matching.
 */
export function resolveReferencePlan(options: ResolveReferencePlanOptions): ReferencePlan {
  const references: ReferenceItem[] = [];

  // 1. Explicit reference images passed directly
  if (options.referenceImages && options.referenceImages.length > 0) {
    for (let i = 0; i < options.referenceImages.length; i++) {
      const item = options.referenceImages[i]!;
      references.push({
        imageId: `ref-${i + 1}`,
        role: item.role ?? 'identity',
        label: item.label ?? `Reference Image ${i + 1}`,
        mimeType: item.mimeType ?? 'image/png'
      });
    }
    return createReferencePlan(references);
  }

  const chars = options.characterDNALibrary
    ? (('characters' in options.characterDNALibrary ? options.characterDNALibrary.characters : options.characterDNALibrary) as Record<string, CharacterDNA>)
    : undefined;

  // Helper to find a stored portrait by character name, with nickname equivalence
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

  // 2. Character portrait reference from cue/brief (Primary character)
  if (options.cue) {
    const characterName = options.cue.character || options.brief?.subjectPreparation?.name;
    if (characterName) {
      const normalized = normalizeCharacterName(characterName);

      // Check Character DNA for explicitly selected references
      if (chars) {
        const matchId = findMatchingCharacterId(chars, characterName);
        const dna = matchId ? chars[matchId] : undefined;
        if (dna?.referenceImageUrl) {
          references.push({
            imageId: dna.referenceImageId || `ref-${dna.id}-identity`,
            role: 'identity',
            subject: dna.name,
            label: `${dna.name} primary face reference`,
            dataUrl: dna.referenceImageUrl,
            mimeType: 'image/png'
          });
        }
        if (dna?.secondaryReferenceImageUrl) {
          references.push({
            imageId: dna.secondaryReferenceImageId || `ref-${dna.id}-attire`,
            role: 'clothing',
            subject: dna.name,
            label: `${dna.name} outfit reference`,
            dataUrl: dna.secondaryReferenceImageUrl,
            mimeType: 'image/png'
          });
        }
      }

      // Check for matching stored portrait if primary reference wasn't already added
      if (!references.some(r => r.subject && areNamesEquivalent(r.subject, characterName) && r.role === 'identity')) {
        const portrait = findPortraitFor(characterName);
        if (portrait && portrait.data) {
          references.push({
            imageId: `portrait-${normalized || 'main'}`,
            role: 'identity',
            subject: characterName,
            label: `${characterName} character portrait`,
            mimeType: portrait.mimeType ?? 'image/png'
          });
        }
      }
    }

    // 3. Ensemble / Cast member references
    if (options.cue.ensembleSubjects && options.cue.ensembleSubjects.length > 0) {
      for (const member of options.cue.ensembleSubjects) {
        if (!member.name || references.some(r => r.subject && areNamesEquivalent(r.subject, member.name))) continue;
        if (references.length >= 8) break; // Keep within model reference ceiling

        // Check DNA first
        if (chars) {
          const matchId = findMatchingCharacterId(chars, member.name);
          const dna = matchId ? chars[matchId] : undefined;
          if (dna?.referenceImageUrl) {
            references.push({
              imageId: dna.referenceImageId || `ref-${dna.id}-identity`,
              role: 'identity',
              subject: dna.name,
              label: `${dna.name} character reference`,
              dataUrl: dna.referenceImageUrl,
              mimeType: 'image/png'
            });
            continue;
          }
        }

        // Check stored portraits
        const memberPortrait = findPortraitFor(member.name);
        if (memberPortrait && memberPortrait.data) {
          references.push({
            imageId: `portrait-${normalizeCharacterName(member.name) || 'member'}`,
            role: 'identity',
            subject: member.name,
            label: `${member.name} character portrait`,
            mimeType: memberPortrait.mimeType ?? 'image/png'
          });
        }
      }
    }
  }

  return createReferencePlan(references);
}
