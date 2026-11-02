import type { SpindleAPI } from 'lumiverse-spindle-types';
import {
  CharacterDNASchema,
  CharacterDNALibrarySchema,
  createEmptyCharacterDNA,
  extractDNAPartsFromText,
  mergeCharacterDNA,
  type CharacterDNA,
  type CharacterDNALibrary
} from '../../shared/character-dna.js';
import { scanTrackerCastHistory } from './simtracker.js';
import { loadConfig, loadReadingPosition, loadTurnRecord, turnPath } from './storage.js';
import { readerPresentationFor } from './entity-projection.js';
import { selectReaderDossier } from '../../shared/dossiers.js';
import { samePresentationTurn } from '../../shared/presentation-entities.js';

export {loadCharacterDNALibrary,saveCharacterDNA,getEffectiveCharacterDNA} from './character-dna-store.js';
import {getEffectiveCharacterDNA} from './character-dna-store.js';

export interface HarvestOptions {
  userId?: string;
  cardDescription?: string;
  cardTags?: string[];
  recentMessagesLimit?: number;
}

/**
 * Gathers evidence across character cards, SimTracker, story references/dossiers,
 * and chat messages to construct or update a character's DNA profile.
 */
export async function harvestCharacterDNA(
  spindle: SpindleAPI,
  chatId: string,
  characterName: string,
  options: HarvestOptions = {}
): Promise<CharacterDNA> {
  const normalizedName = characterName.trim();
  const existing = await getEffectiveCharacterDNA(spindle, chatId, normalizedName, options.userId);
  if (existing?.locked) {
    return existing;
  }

  const base = existing ?? createEmptyCharacterDNA(normalizedName);
  const collectedSnippets: string[] = [];
  const sourcesFound: string[] = [];

  // 1. Character Card context
  if (options.cardDescription) {
    collectedSnippets.push(options.cardDescription);
    sourcesFound.push('Character card');
  }
  if (options.cardTags && options.cardTags.length > 0) {
    collectedSnippets.push(options.cardTags.join(', '));
  }

  // 2. SimTracker snapshots
  try {
    const config = await loadConfig(spindle, options.userId);
    const messages = await spindle.chat?.getMessages?.(chatId);
    if (config.includeSimTrackerContext && messages && messages.length > 0) {
      const latest = [...messages].reverse().find(m => !m.is_user && m.role !== 'system');
      if (latest) {
        const tracker = scanTrackerCastHistory(messages, latest.id, config.simTrackerMappings);
        const match = tracker.find(t => t.character.name.trim().toLowerCase() === normalizedName.toLowerCase());
        if (match) {
          if (match.character.identity) collectedSnippets.push(match.character.identity);
          if (match.character.attire) collectedSnippets.push(`wearing ${match.character.attire}`);
          sourcesFound.push('SimTracker');
        }
      }
    }
  } catch {
    // Non-fatal if tracker scan is unavailable
  }

  // 3. Saved Story References & Dossiers
  try {
    const position = await loadReadingPosition(spindle, chatId, options.userId).catch(() => null);
    const messages = await spindle.chat?.getMessages?.(chatId);
    const referenceMessage = position && messages
      ? messages.find(m => m.id === position.key.assistantMessageId && String(m.swipe_id ?? 0) === String(position.key.swipeId ?? 0))
      : messages?.filter(m => !m.is_user).pop();

    if (referenceMessage) {
      const path = turnPath(chatId, referenceMessage.id, referenceMessage.swipe_id);
      const saved = await loadTurnRecord(spindle, path, options.userId).catch(() => null);
      if (saved) {
        const index = position && samePresentationTurn(position.key, saved.plan.key) ? position.paragraphIndex : 0;
        const presentation = readerPresentationFor(saved.plan, saved.presentation);
        const snapshot = presentation ? selectPresentationSnapshot(presentation,index) : undefined;
        if (snapshot) {
          const entity = snapshot.entities.find(e => e.kind === 'npc' && e.name.trim().toLowerCase() === normalizedName.toLowerCase());
          if (entity) {
            const dossier = selectReaderDossier(entity.id, snapshot, 'expanded');
            if (dossier) {
              if (dossier.state.appearance) collectedSnippets.push(dossier.state.appearance);
              if (dossier.state.outfit) collectedSnippets.push(`wearing ${dossier.state.outfit}`);
              for (const fact of dossier.facts) {
                if (/^(appearance|description|look|physical description|features|hair|eyes)$/i.test(fact.field)) {
                  collectedSnippets.push(fact.value);
                }
              }
              sourcesFound.push('Story reference codex');
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal if story reference reading is unavailable
  }

  // 4. Chat passages mentioning the character
  try {
    const messages = await spindle.chat?.getMessages?.(chatId);
    if (messages && messages.length > 0) {
      const limit = options.recentMessagesLimit ?? 8;
      const recent = messages.slice(-limit);
      const nameRegex = new RegExp(`\\b${normalizedName}\\b`, 'i');
      for (const msg of recent) {
        if (msg.content && nameRegex.test(msg.content)) {
          // Extract sentences mentioning the character
          const sentences = msg.content.split(/(?<=[.!?])\s+/);
          for (const s of sentences) {
            if (nameRegex.test(s) && /(hair|eyes|tall|short|dress|coat|wore|wearing|face|skin|build|features)/i.test(s)) {
              collectedSnippets.push(s.trim());
              if (!sourcesFound.includes('Chat narrative')) {
                sourcesFound.push('Chat narrative');
              }
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal
  }

  // Combine snippets and extract DNA
  const combinedText = collectedSnippets.join('\n');
  const extracted = extractDNAPartsFromText(combinedText);

  const merged = mergeCharacterDNA(base, {
    ...extracted,
    sourceSummary: sourcesFound.length > 0 ? sourcesFound.join(' · ') : 'Direct heuristics'
  });

  return merged;
}

/**
 * Builds a prompt for the story LLM to auto-fill or enrich Character DNA.
 */
export function buildCharacterDNAAutoFillPrompt(characterName: string, knownContext: string): string {
  return `You are a visual continuity expert analyzing story text to establish consistent visual DNA for the character: "${characterName}".

Given the story context below, output a pure JSON object (and nothing else) describing this character's physical visual appearance.
Do not invent wild traits that contradict the text; fill in unspecified details only if they are natural and consistent with the established genre.

JSON format required:
{
  "name": "${characterName}",
  "hair": {
    "color": "hair color (e.g. raven black, ash blonde, chestnut)",
    "length": "hair length (e.g. shoulder-length, waist-length, short cropped)",
    "style": "hair style (e.g. messy waves, neat bob, high ponytail)"
  },
  "eyes": {
    "color": "eye color (e.g. hazel, deep brown, ice blue)",
    "shape": "eye shape (e.g. almond-shaped, wide, sharp)"
  },
  "build": {
    "height": "height impression (e.g. petite, tall, medium)",
    "bodyType": "body type (e.g. slender, athletic, curvy hourglass, stocky)",
    "bust": "chest or bust proportions (e.g. full bust with natural cleavage, or broad muscular chest)",
    "hipsGlutes": "waist and hip proportions (e.g. narrow waist and curvy hips, or toned athletic waist)",
    "skinTone": "complexion (e.g. fair with freckles, sun-kissed olive, deep bronze)",
    "gender": "apparent gender",
    "species": "species (e.g. human, elf, kitsune)",
    "age": "apparent age (e.g. late 20s, early 30s, distinguished 50s)"
  },
  "faceFeatures": "facial structure (e.g. heart-shaped face, high cheekbones, soft full lips)",
  "demeanor": "typical posture, vibe and expression (e.g. guarded posture, shy glance, wry smirk)",
  "signatureOutfit": "characteristic or default garment description",
  "distinguishingFeatures": ["specific scars, freckles, tattoos, accessories, markings"],
  "colorPalette": ["3 to 5 complementary color names or hex codes for their design"]
}

STORY CONTEXT:
${knownContext.slice(0, 4000)}

Output only the JSON:`;
}

/**
 * Safely parses the output of the LLM Auto-Fill response into a partial CharacterDNA.
 */
export function parseCharacterDNALlmOutput(llmResponse: string): Partial<CharacterDNA> | null {
  try {
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]);
    if (!data || typeof data !== 'object') return null;

    const partial: Partial<CharacterDNA> = {
      hair: {},
      eyes: {},
      build: {},
      distinguishingFeatures: [],
      colorPalette: []
    };

    if (data.hair && typeof data.hair === 'object') {
      if (typeof data.hair.color === 'string') partial.hair!.color = data.hair.color.trim();
      if (typeof data.hair.length === 'string') partial.hair!.length = data.hair.length.trim();
      if (typeof data.hair.style === 'string') partial.hair!.style = data.hair.style.trim();
    }

    if (data.eyes && typeof data.eyes === 'object') {
      if (typeof data.eyes.color === 'string') partial.eyes!.color = data.eyes.color.trim();
      if (typeof data.eyes.shape === 'string') partial.eyes!.shape = data.eyes.shape.trim();
    }

    if (data.build && typeof data.build === 'object') {
      if (typeof data.build.height === 'string') partial.build!.height = data.build.height.trim();
      if (typeof data.build.bodyType === 'string') partial.build!.bodyType = data.build.bodyType.trim();
      if (typeof data.build.bust === 'string') partial.build!.bust = data.build.bust.trim();
      if (typeof data.build.hipsGlutes === 'string') partial.build!.hipsGlutes = data.build.hipsGlutes.trim();
      if (typeof data.build.skinTone === 'string') partial.build!.skinTone = data.build.skinTone.trim();
      if (typeof data.build.gender === 'string') partial.build!.gender = data.build.gender.trim();
      if (typeof data.build.species === 'string') partial.build!.species = data.build.species.trim();
      if (typeof data.build.age === 'string') partial.build!.age = data.build.age.trim();
    }

    if (typeof data.faceFeatures === 'string') {
      partial.faceFeatures = data.faceFeatures.trim();
    }
    if (typeof data.demeanor === 'string') {
      partial.demeanor = data.demeanor.trim();
    }

    if (typeof data.signatureOutfit === 'string') {
      partial.signatureOutfit = data.signatureOutfit.trim();
    }

    if (Array.isArray(data.distinguishingFeatures)) {
      partial.distinguishingFeatures = data.distinguishingFeatures.filter((f: unknown) => typeof f === 'string' && f.trim().length > 0).map((f: string) => f.trim());
    }

    if (Array.isArray(data.colorPalette)) {
      partial.colorPalette = data.colorPalette.filter((c: unknown) => typeof c === 'string' && c.trim().length > 0).map((c: string) => c.trim());
    }

    return partial;
  } catch {
    return null;
  }
}
import {selectPresentationSnapshot} from '../../shared/presentation-selectors.js';
