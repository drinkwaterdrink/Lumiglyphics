import { z } from 'zod';
import type { SceneState, VisualCue } from '../../shared/contracts.js';
import type { PromptDocument, PromptSection } from '../../shared/prompt-document.js';
import { createPromptDocument } from '../../shared/prompt-document.js';

export const LocationDNASchema = z.object({
  name: z.string().trim().max(200),
  architecturalFeatures: z.array(z.string().trim().max(200)).max(16).default([]),
  dominantMaterials: z.array(z.string().trim().max(100)).max(12).default([]),
  prominentProps: z.array(z.string().trim().max(200)).max(16).default([]),
  lightingAtmosphere: z.string().trim().max(500).default('')
}).strict();
export type LocationDNA = z.infer<typeof LocationDNASchema>;

export const CharacterVisualStateSchema = z.object({
  name: z.string().trim().max(160),
  present: z.boolean().default(true),
  activeAttire: z.string().trim().max(1000).default(''),
  temporaryConditions: z.array(z.string().trim().max(200)).max(16).default([]),
  carriedProps: z.array(z.string().trim().max(100)).max(12).default([])
}).strict();
export type CharacterVisualState = z.infer<typeof CharacterVisualStateSchema>;

export const VisualContinuitySnapshotSchema = z.object({
  chatId: z.string().trim().max(200),
  location: LocationDNASchema,
  characters: z.record(z.string(), CharacterVisualStateSchema).default({}),
  environmentalConditions: z.array(z.string().trim().max(200)).max(16).default([]),
  lastUpdated: z.number().int().nonnegative().default(() => Date.now())
}).strict();
export type VisualContinuitySnapshot = z.infer<typeof VisualContinuitySnapshotSchema>;

/**
 * Heuristically extracts Location DNA (architectural features, materials, background props) from scene state and narrative text.
 */
export function extractLocationDNA(scene: SceneState, narrativeText = ''): LocationDNA {
  const env = scene.environment;
  const locationName = env.location || 'Scene Location';
  const combined = `${env.description || ''} ${env.persistentElements.join(' ')} ${narrativeText}`.toLowerCase();

  const features: string[] = [];
  const materials: string[] = [];
  const props: string[] = [];

  // Architectural cues
  const archKeywords = [
    'doorway', 'porch', 'threshold', 'window', 'balcony', 'corridor',
    'hallway', 'archway', 'staircase', 'fireplace', 'hearth', 'counter',
    'bookshelf', 'veranda', 'courtyard', 'terrace', 'screen door'
  ];
  for (const kw of archKeywords) {
    if (combined.includes(kw)) {
      const regex = new RegExp(`([^.;,\n]*\\b${kw}\\b[^.;,\n]*)`, 'i');
      const match = narrativeText.match(regex);
      if (match?.[1] && match[1].length < 120) {
        features.push(match[1].trim());
      } else {
        features.push(kw);
      }
    }
  }

  // Dominant materials
  const matKeywords = [
    'pine', 'pine wood', 'weathered wood', 'oak', 'brick', 'stone', 'marble',
    'brass', 'cobblestone', 'iron', 'glass', 'concrete', 'tile', 'canvas', 'bamboo'
  ];
  for (const mat of matKeywords) {
    if (new RegExp(`\\b${mat}\\b`, 'i').test(combined)) {
      materials.push(mat === 'pine' ? 'pine wood' : mat);
    }
  }

  // Prominent background props
  const propMatches = combined.match(/\b(mugs?|dishes|books?|papers?|lanterns?|candles?|bottles?|towels?|pottery|plants?|flowers?|curtains?)\b/gi);
  if (propMatches) {
    for (const p of [...new Set(propMatches.map(m => m.toLowerCase()))].slice(0, 6)) {
      const regex = new RegExp(`([^.;,\n]*\\b${p}\\b[^.;,\n]*)`, 'i');
      const match = narrativeText.match(regex);
      if (match?.[1] && match[1].length < 100) {
        props.push(match[1].trim());
      } else {
        props.push(p);
      }
    }
  }

  const lightingAtmosphere = [env.timeOfDay, env.weather, env.lighting].filter(Boolean).join(', ') || 'ambient lighting';

  return LocationDNASchema.parse({
    name: locationName,
    architecturalFeatures: [...new Set(features)].slice(0, 8),
    dominantMaterials: [...new Set(materials)].slice(0, 6),
    prominentProps: [...new Set(props)].slice(0, 8),
    lightingAtmosphere
  });
}

/**
 * Extracts temporary physical conditions (e.g. rain mist on bare feet, clay smudges, sweat, bruises) from text.
 */
export function extractTemporaryConditions(characterName: string, text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const nameFirst = (characterName.split(' ')[0] || characterName).toLowerCase();
  const conditions: string[] = [];

  // Patterns for physical states
  const patterns = [
    /(?:rain mist|soaked|drenched|wet from the rain)/i,
    /(?:clay|mud|dirt|soot|dust|slip)[^.;,\n]*(?:smudges?|caked|on (?:her|his|their|the) (?:hands|arms|forearms|face|hem|feet|nails))/i,
    /(?:bare feet|barefoot)/i,
    /(?:blushing|ears gone pink|neck gone pink|flushed cheeks?)/i,
    /(?:bruised?|scraped?|bleeding|bandaged?)[^.;,\n]*(?:cheek|arm|forehead|hand|shoulder|lip)?/i,
    /(?:sweat glistening|beads of sweat|windblown hair)/i
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match?.[0]) {
      conditions.push(match[0].trim());
    }
  }

  return [...new Set(conditions)].slice(0, 6);
}

/**
 * Updates visual continuity from turn to turn.
 */
export function buildVisualContinuity(
  chatId: string,
  scene: SceneState,
  narrativeText = '',
  prior?: VisualContinuitySnapshot | null
): VisualContinuitySnapshot {
  const location = extractLocationDNA(scene, narrativeText);
  const characters: Record<string, CharacterVisualState> = {};

  const presentNames = scene.cast.length > 0 ? scene.cast : (scene.character ? [scene.character] : []);

  for (const name of presentNames) {
    const norm = name.trim().toLowerCase();
    const priorChar = prior?.characters[norm];
    const temporary = extractTemporaryConditions(name, narrativeText);

    characters[norm] = CharacterVisualStateSchema.parse({
      name,
      present: true,
      activeAttire: scene.attire || priorChar?.activeAttire || '',
      temporaryConditions: temporary.length > 0 ? temporary : (priorChar?.temporaryConditions ?? []),
      carriedProps: priorChar?.carriedProps ?? []
    });
  }

  const environmentalConditions = [
    scene.environment.weather,
    scene.environment.timeOfDay
  ].filter(Boolean) as string[];

  return VisualContinuitySnapshotSchema.parse({
    chatId,
    location,
    characters,
    environmentalConditions,
    lastUpdated: Date.now()
  });
}

/**
 * Formats Location DNA into a natural prompt phrase for P1 background architecture.
 */
export function formatLocationDNAToClause(loc: LocationDNA): string {
  const parts: string[] = [];
  if (loc.name) parts.push(`Setting: ${loc.name}`);
  if (loc.architecturalFeatures.length > 0) parts.push(loc.architecturalFeatures.join(', '));
  if (loc.dominantMaterials.length > 0) parts.push(`features ${loc.dominantMaterials.join(' and ')}`);
  if (loc.prominentProps.length > 0) parts.push(`with visible ${loc.prominentProps.join(', ')}`);
  if (loc.lightingAtmosphere) parts.push(loc.lightingAtmosphere);
  return parts.join('; ');
}

/**
 * Injects active visual continuity (temporary states and location DNA) into a compiled PromptDocument.
 */
export function injectContinuityIntoPromptDocument(
  doc: PromptDocument,
  continuity: VisualContinuitySnapshot,
  primaryCharacterName?: string
): PromptDocument {
  const sections = [...doc.sections];
  const charKey = (primaryCharacterName || '').trim().toLowerCase();
  const charState = continuity.characters[charKey] || Object.values(continuity.characters)[0];

  // 1. Temporary conditions -> P0 (append to subject-action or appearance-wardrobe)
  if (charState && charState.temporaryConditions.length > 0) {
    const existingP0 = sections.find(s => s.id === 'subject-action' || s.id === 'appearance-wardrobe');
    if (existingP0) {
      const conditionsText = charState.temporaryConditions.join(', ');
      if (!existingP0.text.includes(conditionsText)) {
        existingP0.text = `${existingP0.text.replace(/\.\s*$/, '')}, with ${conditionsText}.`;
      }
    }
  }

  // 2. Location DNA & Architecture -> P1 (append or enhance environment section)
  const locClause = formatLocationDNAToClause(continuity.location);
  if (locClause) {
    const envSection = sections.find(s => s.id === 'environment' || s.id === 'location-setting');
    if (envSection) {
      if (!envSection.text.includes(continuity.location.name)) {
        envSection.text = `${locClause}. ${envSection.text}`;
      }
    } else {
      sections.push({
        id: 'location-continuity',
        priority: 1,
        required: false,
        compressible: true,
        text: locClause + '.'
      });
    }
  }

  return createPromptDocument(
    doc.dialect,
    sections,
    doc.negativeSections,
    doc.parameterHints,
    doc.warnings
  );
}
