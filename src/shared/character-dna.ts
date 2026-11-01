import { z } from 'zod';

export const CharacterHairDNASchema = z.object({
  color: z.string().trim().max(100).optional(),
  length: z.string().trim().max(100).optional(),
  style: z.string().trim().max(100).optional()
}).strict();
export type CharacterHairDNA = z.infer<typeof CharacterHairDNASchema>;

export const CharacterEyesDNASchema = z.object({
  color: z.string().trim().max(100).optional(),
  shape: z.string().trim().max(100).optional()
}).strict();
export type CharacterEyesDNA = z.infer<typeof CharacterEyesDNASchema>;

export const CharacterBuildDNASchema = z.object({
  height: z.string().trim().max(100).optional(),
  bodyType: z.string().trim().max(100).optional(),
  skinTone: z.string().trim().max(100).optional(),
  gender: z.string().trim().max(100).optional(),
  species: z.string().trim().max(100).optional(),
  age: z.string().trim().max(100).optional()
}).strict();
export type CharacterBuildDNA = z.infer<typeof CharacterBuildDNASchema>;

export const CharacterDNASchema = z.object({
  id: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().max(160)).max(16).default([]),
  hair: CharacterHairDNASchema.default({}),
  eyes: CharacterEyesDNASchema.default({}),
  build: CharacterBuildDNASchema.default({}),
  signatureOutfit: z.string().trim().max(1000).default(''),
  activeOutfit: z.string().trim().max(1000).optional(),
  distinguishingFeatures: z.array(z.string().trim().max(200)).max(24).default([]),
  colorPalette: z.array(z.string().trim().max(60)).max(12).default([]),
  locked: z.boolean().default(false),
  sourceSummary: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().trim().max(2000).optional(),
  lastUpdated: z.number().int().nonnegative().default(() => Date.now())
}).strict();
export type CharacterDNA = z.infer<typeof CharacterDNASchema>;

export const CharacterDNALibrarySchema = z.object({
  version: z.literal(1),
  characters: z.record(z.string(), CharacterDNASchema).default({})
}).strict();
export type CharacterDNALibrary = z.infer<typeof CharacterDNALibrarySchema>;

export function createEmptyCharacterDNA(name: string, id?: string): CharacterDNA {
  const normalizedId = (id || name).trim().toLowerCase().replace(/\s+/g, '-');
  return CharacterDNASchema.parse({
    id: normalizedId || 'unnamed-character',
    name: name.trim() || 'Unnamed Character',
    aliases: [],
    hair: {},
    eyes: {},
    build: {},
    signatureOutfit: '',
    distinguishingFeatures: [],
    colorPalette: [],
    locked: false,
    lastUpdated: Date.now()
  });
}

/**
 * Formats a CharacterDNA record into comma-separated tags suitable for image prompt generation.
 */
export function formatCharacterDNAToTags(dna: CharacterDNA): string[] {
  const tags: string[] = [];

  // Build / Species / Gender
  if (dna.build.gender || dna.build.species) {
    tags.push([dna.build.gender, dna.build.species].filter(Boolean).join(' '));
  }
  if (dna.build.skinTone) tags.push(`${dna.build.skinTone} skin`);
  if (dna.build.height || dna.build.bodyType) {
    tags.push([dna.build.height, dna.build.bodyType].filter(Boolean).join(' '));
  }

  // Hair
  const hairParts = [dna.hair.length, dna.hair.style, dna.hair.color ? `${dna.hair.color} hair` : 'hair'].filter(Boolean);
  if (dna.hair.color || dna.hair.length || dna.hair.style) {
    tags.push(hairParts.join(' '));
  }

  // Eyes
  const eyeParts = [dna.eyes.shape, dna.eyes.color ? `${dna.eyes.color} eyes` : 'eyes'].filter(Boolean);
  if (dna.eyes.color || dna.eyes.shape) {
    tags.push(eyeParts.join(' '));
  }

  // Distinguishing features
  if (dna.distinguishingFeatures && dna.distinguishingFeatures.length > 0) {
    tags.push(...dna.distinguishingFeatures);
  }

  // Outfits
  const currentOutfit = dna.activeOutfit || dna.signatureOutfit;
  if (currentOutfit) {
    tags.push(currentOutfit.startsWith('wearing ') ? currentOutfit : `wearing ${currentOutfit}`);
  }

  return tags.filter(Boolean);
}

/**
 * Formats a CharacterDNA record into a cohesive descriptive clause for natural-language prompt models (like FLUX, Grok, Recraft).
 */
export function formatCharacterDNAToPromptClause(dna: CharacterDNA): string {
  const parts: string[] = [];

  // Physical foundation
  const identityBits: string[] = [];
  if (dna.build.height || dna.build.bodyType) identityBits.push([dna.build.height, dna.build.bodyType].filter(Boolean).join(' '));
  if (dna.build.gender || dna.build.species) identityBits.push([dna.build.gender, dna.build.species].filter(Boolean).join(' '));
  if (dna.build.skinTone) identityBits.push(`with ${dna.build.skinTone} skin`);

  if (identityBits.length > 0) {
    parts.push(identityBits.join(' '));
  }

  // Hair & Eyes
  const facialBits: string[] = [];
  if (dna.hair.color || dna.hair.length || dna.hair.style) {
    facialBits.push([dna.hair.length, dna.hair.style, dna.hair.color ? `${dna.hair.color} hair` : 'hair'].filter(Boolean).join(' '));
  }
  if (dna.eyes.color || dna.eyes.shape) {
    facialBits.push([dna.eyes.shape, dna.eyes.color ? `${dna.eyes.color} eyes` : 'eyes'].filter(Boolean).join(' '));
  }
  if (facialBits.length > 0) {
    parts.push(facialBits.join(', '));
  }

  // Distinguishing marks
  if (dna.distinguishingFeatures && dna.distinguishingFeatures.length > 0) {
    parts.push(dna.distinguishingFeatures.join(', '));
  }

  // Outfit
  const currentOutfit = dna.activeOutfit || dna.signatureOutfit;
  if (currentOutfit) {
    parts.push(currentOutfit.startsWith('wearing ') ? currentOutfit : `wearing ${currentOutfit}`);
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Heuristically extracts physical traits from descriptive text (e.g. card descriptions, SimTracker, or codex).
 */
export function extractDNAPartsFromText(text: string): Partial<CharacterDNA> {
  if (!text || typeof text !== 'string') return {};
  const lower = text.toLowerCase();
  const partial: Partial<CharacterDNA> = {
    hair: {},
    eyes: {},
    build: {},
    distinguishingFeatures: [],
    colorPalette: []
  };

  // Hair extraction
  const hairColorMatch = lower.match(/\b(silver|blonde|blond|brunette|brown|black|raven|red|auburn|ginger|golden|platinum|white|gray|grey|pink|blue|green|purple)\s+hair\b/i);
  if (hairColorMatch?.[1]) partial.hair!.color = hairColorMatch[1];

  const hairLengthMatch = lower.match(/\b(short|long|shoulder-length|waist-length|cropped|pixie|medium-length)(?:\s+[a-z-]+){0,3}\s+(?:hair|curls|locks|tresses)\b/i);
  if (hairLengthMatch?.[1]) partial.hair!.length = hairLengthMatch[1];

  const hairStyleMatch = lower.match(/\b(ponytail|twintails|braids?|pigtails?|messy|wavy|curly|straight|bob|bun|undercut|spiky)(?:\s+[a-z-]+){0,3}\s+(?:hair|curls|locks|tresses)\b/i);
  if (hairStyleMatch?.[1]) partial.hair!.style = hairStyleMatch[1];

  // Eyes extraction
  const eyeColorMatch = lower.match(/\b(hazel|amber|dark brown|brown|sky blue|blue|emerald|green|gray|grey|violet|purple|golden|crimson|red)\s+eyes\b/i);
  if (eyeColorMatch?.[1]) partial.eyes!.color = eyeColorMatch[1];

  const eyeShapeMatch = lower.match(/\b(almond-shaped|sharp|large expressive|round|narrow|upturned|downturned)(?:\s+[a-z-]+){0,2}\s+eyes\b/i);
  if (eyeShapeMatch?.[1]) partial.eyes!.shape = eyeShapeMatch[1];

  // Build / Gender / Species
  const genderMatch = lower.match(/\b(woman|girl|female|man|boy|male|non-binary|androgynous)\b/i);
  if (genderMatch?.[1]) partial.build!.gender = genderMatch[1];

  const speciesMatch = lower.match(/\b(human|elf|elven|dwarf|dwarven|kitsune|demon|angel|catgirl|foxgirl|beastkin|vampire|android)\b/i);
  if (speciesMatch?.[1]) partial.build!.species = speciesMatch[1];

  const heightMatch = lower.match(/\b(petite|tall|short|compact|towering|statuesque)\b/i);
  if (heightMatch?.[1]) partial.build!.height = heightMatch[1];

  const bodyTypeMatch = lower.match(/\b(slender|athletic|muscular|curvy|stocky|lean|delicate)\b/i);
  if (bodyTypeMatch?.[1]) partial.build!.bodyType = bodyTypeMatch[1];

  const skinMatch = lower.match(/\b(fair|pale|porcelain|tan|tanned|sun-kissed|olive|bronze|dark|brown|ebony)\s+skin\b/i);
  if (skinMatch?.[1]) partial.build!.skinTone = skinMatch[1];

  // Distinguishing marks
  const features: string[] = [];
  if (/\bfreckles\b/i.test(lower)) features.push('freckles');
  if (/\bglasses|spectacles\b/i.test(lower)) features.push('glasses');
  if (/\bscar\b/i.test(lower)) {
    const scarMatch = lower.match(/\b([a-z\-]+ scar|scar across [a-z]+)\b/i);
    if (scarMatch?.[1]) {
      features.push(scarMatch[1]);
    } else {
      features.push('scar');
    }
  }
  if (/\btattoo\b/i.test(lower)) features.push('tattoo');
  if (/\bhorns?\b/i.test(lower)) features.push('horns');
  if (/\btail\b/i.test(lower)) features.push('tail');
  if (/\bpointed ears|elf ears\b/i.test(lower)) features.push('pointed elf ears');
  if (features.length > 0) partial.distinguishingFeatures = features;

  // Outfit heuristic
  const wearingMatch = text.match(/(?:wearing|wears|dressed in|clad in)\s+([^.;,\n]+(?:,\s*[^.;,\n]+){0,2})/i);
  if (wearingMatch?.[1]) {
    partial.signatureOutfit = wearingMatch[1].trim();
  }

  return partial;
}

/**
 * Merges an incoming DNA patch into a baseline DNA record.
 * If base is locked and overrideLocked is false, locked traits are preserved.
 */
export function mergeCharacterDNA(base: CharacterDNA, patch: Partial<CharacterDNA>, overrideLocked = false): CharacterDNA {
  if (base.locked && !overrideLocked) {
    return base;
  }

  return CharacterDNASchema.parse({
    ...base,
    ...patch,
    hair: {
      ...base.hair,
      ...(patch.hair ?? {})
    },
    eyes: {
      ...base.eyes,
      ...(patch.eyes ?? {})
    },
    build: {
      ...base.build,
      ...(patch.build ?? {})
    },
    aliases: Array.from(new Set([...base.aliases, ...(patch.aliases ?? [])])).slice(0, 16),
    distinguishingFeatures: Array.from(new Set([...base.distinguishingFeatures, ...(patch.distinguishingFeatures ?? [])])).slice(0, 24),
    colorPalette: Array.from(new Set([...base.colorPalette, ...(patch.colorPalette ?? [])])).slice(0, 12),
    signatureOutfit: patch.signatureOutfit !== undefined ? patch.signatureOutfit : base.signatureOutfit,
    activeOutfit: patch.activeOutfit !== undefined ? patch.activeOutfit : base.activeOutfit,
    locked: patch.locked !== undefined ? patch.locked : base.locked,
    lastUpdated: Date.now()
  });
}
