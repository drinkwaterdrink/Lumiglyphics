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
  bust: z.string().trim().max(100).optional(),
  hipsGlutes: z.string().trim().max(100).optional(),
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
  faceFeatures: z.string().trim().max(200).optional(),
  demeanor: z.string().trim().max(200).optional(),
  signatureOutfit: z.string().trim().max(1000).default(''),
  activeOutfit: z.string().trim().max(1000).optional(),
  distinguishingFeatures: z.array(z.string().trim().max(200)).max(24).default([]),
  colorPalette: z.array(z.string().trim().max(60)).max(12).default([]),
  locked: z.boolean().default(false),
  sourceSummary: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().trim().max(5000000).optional(),
  referenceImageUrl: z.string().trim().max(5000000).optional(),
  secondaryReferenceImageUrl: z.string().trim().max(5000000).optional(),
  referenceImageId: z.string().trim().max(256).optional(),
  secondaryReferenceImageId: z.string().trim().max(256).optional(),
  lastUpdated: z.number().int().nonnegative().default(() => Date.now()),
  fieldSources:z.record(z.string(),z.object({classification:z.enum(['evidence','inferred','generated','manual']),sources:z.array(z.string().max(1000)).max(8)}).strict()).optional()
}).strict();
export type CharacterDNA = z.infer<typeof CharacterDNASchema>;

export const CharacterDNALibrarySchema = z.object({
  version: z.union([z.literal(1),z.literal(2)]),
  revision: z.number().int().nonnegative().optional(),
  deleted: z.record(z.string(),CharacterDNASchema).optional(),
  warnings:z.array(z.string().max(500)).max(8).optional(),
  characters: z.record(z.string(), CharacterDNASchema).default({})
}).strict();
export type CharacterDNALibrary = z.infer<typeof CharacterDNALibrarySchema>;

/** Identity matching is exact after Unicode/case/whitespace normalization, never fuzzy by surname. */
export const dnaNameKey=(value:string)=>value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ');
export function findCharacterDNA(records:Record<string,CharacterDNA>,identity:string):CharacterDNA|undefined{
  const key=dnaNameKey(identity);
  const all=Object.values(records);const direct=all.find(c=>dnaNameKey(c.id)===key)||all.find(c=>dnaNameKey(c.name)===key);if(direct)return direct;const aliases=all.filter(c=>c.aliases.some(a=>dnaNameKey(a)===key));return aliases.length===1?aliases[0]:undefined;
}

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

const SKIN_WORD_RE = /\b(skin|complexion)\b/i;
const DANGLING_PREPOSITION_RE = /^(?:for|on|to|in|of|at|by|from)\b/i;
const NON_VISUAL_DEMEANOR_RE = /\b(?:wit|humou?r|sarcas\w*|pragmati\w*|precision|intellect\w*|cynic\w*|deadpan|monotone|voice|speech|accent|vocab\w*|philosoph\w*|ideolog\w*|morality|ambition|loyalty|temperament|mindset|logic\w*|calculat\w*)\b/i;
const VISUAL_POSTURE_CUE_RE = /\b(?:eyes|gaze|stare|posture|stance|shoulders|smile|smirk|frown|brow|expression|coiled|tense|slouched|upright|watchful|guarded|poised|relaxed|rigid|alert|scowl|glare)\b/i;
const STOP_WORDS = new Set([
  'with', 'under', 'over', 'her', 'his', 'their', 'the', 'a', 'an', 'and', 'of', 'in', 'on', 'for', 'to', 'frame', 'body', 'build', 'very', 'slightly'
]);

function formatAgeClause(rawAge?: string): string {
  const age = rawAge?.trim() ?? '';
  if (!age) return '';
  if (/^\d{1,3}$/.test(age)) return `${age}-year-old`;
  return age;
}

function formatGenderSpecies(gender?: string, species?: string): string {
  const g = gender?.trim() ?? '';
  const s = species?.trim() ?? '';
  return [g, s].filter(Boolean).join(' ');
}

function formatBustClause(rawBust?: string, asWithClause = false): string {
  const bust = rawBust?.trim() ?? '';
  if (!bust) return '';
  if (DANGLING_PREPOSITION_RE.test(bust)) return '';
  const clean = bust.replace(/^with\s+/i, '').trim();
  if (!clean) return '';
  return asWithClause ? `with ${clean}` : clean;
}

function formatSkinClause(rawSkin?: string, asWithClause = false): string {
  const skin = rawSkin?.trim() ?? '';
  if (!skin) return '';
  const clean = skin.replace(/^with\s+/i, '').trim();
  if (!clean) return '';
  const suffixed = SKIN_WORD_RE.test(clean) ? clean : `${clean} skin`;
  return asWithClause ? `with ${suffixed}` : suffixed;
}

function formatHairClause(hair: CharacterHairDNA): string {
  const lengthRaw = hair.length?.trim() ?? '';
  const styleRaw = hair.style?.trim() ?? '';
  const colorRaw = hair.color?.trim() ?? '';
  if (!lengthRaw && !styleRaw && !colorRaw) return '';

  const lengthCore = lengthRaw.replace(/\s+length$/i, '').trim();
  const styleLower = styleRaw.toLowerCase();
  const effectiveLength = lengthCore && (!styleLower || !styleLower.includes(lengthCore.toLowerCase()))
    ? lengthRaw
    : '';

  const hasHairWord = /\bhair\b/i.test(styleRaw) || /\bhair\b/i.test(colorRaw) || /\bhair\b/i.test(effectiveLength);
  const baseParts = [effectiveLength, styleRaw, colorRaw ? (hasHairWord ? colorRaw : `${colorRaw} hair`) : (hasHairWord ? '' : 'hair')].filter(Boolean);
  return baseParts.join(' ').replace(/\s+/g, ' ').trim();
}

function filterVisualDemeanor(rawDemeanor?: string): string {
  const demeanor = rawDemeanor?.trim() ?? '';
  if (!demeanor) return '';
  const subClauses = demeanor
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(clause => {
      if (!NON_VISUAL_DEMEANOR_RE.test(clause)) return true;
      return VISUAL_POSTURE_CUE_RE.test(clause);
    });
  return subClauses.join(', ');
}

function contentTokens(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function deduplicateDescriptiveClauses(rawClauses: string[], isFirstIdentityClause = false): string[] {
  const result: string[] = [];
  const seenPhrases = new Set<string>();
  const seenTokens = new Set<string>();

  rawClauses.forEach((raw, idx) => {
    // Keep the opening identity clause intact while recording all its tokens
    if (idx === 0 && isFirstIdentityClause) {
      const trimmed = raw.trim();
      if (trimmed) {
        seenPhrases.add(trimmed.toLowerCase().replace(/\s+/g, ' '));
        contentTokens(trimmed).forEach(t => seenTokens.add(t));
        result.push(trimmed);
      }
      return;
    }

    const subParts = raw.split(/\s*;\s*|\s*,\s*/).map(s => s.trim()).filter(Boolean);
    for (const part of subParts) {
      const norm = part.toLowerCase().replace(/\s+/g, ' ');
      if (seenPhrases.has(norm)) continue;

      const tokens = contentTokens(part);
      if (tokens.length === 0) continue;

      if (!/^wearing\b/i.test(part) && seenTokens.size > 0) {
        const overlapCount = tokens.filter(t => seenTokens.has(t)).length;
        if (overlapCount === tokens.length || (tokens.length >= 3 && overlapCount / tokens.length >= 0.75)) {
          continue;
        }
      }

      seenPhrases.add(norm);
      tokens.forEach(t => seenTokens.add(t));
      result.push(part);
    }
  });

  return result;
}

/**
 * Formats a CharacterDNA record into comma-separated tags suitable for image prompt generation.
 */
export function formatCharacterDNAToTags(dna: CharacterDNA): string[] {
  const tags: string[] = [];
  const isMale = dna.build.gender?.toLowerCase() === 'man' || dna.build.gender?.toLowerCase() === 'male';

  const age = formatAgeClause(dna.build.age);
  if (age) tags.push(age);
  const genderSpecies = formatGenderSpecies(dna.build.gender, dna.build.species);
  if (genderSpecies) tags.push(genderSpecies);

  const skin = formatSkinClause(dna.build.skinTone, false);
  if (skin) tags.push(skin);

  if (dna.build.height || dna.build.bodyType) {
    tags.push([dna.build.height, dna.build.bodyType].filter(Boolean).join(' '));
  }

  if (dna.build.bust && (!isMale || /chest|shoulder|pec/i.test(dna.build.bust))) {
    const bust = formatBustClause(dna.build.bust, false);
    if (bust) tags.push(bust);
  }
  if (dna.build.hipsGlutes && !isMale) {
    tags.push(dna.build.hipsGlutes);
  }

  if (dna.faceFeatures) tags.push(dna.faceFeatures);

  const hairText = formatHairClause(dna.hair);
  if (hairText) tags.push(hairText);

  const eyeParts = [dna.eyes.shape, dna.eyes.color ? `${dna.eyes.color} eyes` : 'eyes'].filter(Boolean);
  if (dna.eyes.color || dna.eyes.shape) {
    tags.push(eyeParts.join(' '));
  }

  if (dna.distinguishingFeatures && dna.distinguishingFeatures.length > 0) {
    tags.push(...dna.distinguishingFeatures);
  }

  const dedupedTags = Array.from(new Set(tags.filter(Boolean)));

  const currentOutfit = dna.activeOutfit || dna.signatureOutfit;
  if (currentOutfit) {
    dedupedTags.push(currentOutfit.startsWith('wearing ') ? currentOutfit : `wearing ${currentOutfit}`);
  }

  const visualDemeanor = filterVisualDemeanor(dna.demeanor);
  if (visualDemeanor) dedupedTags.push(visualDemeanor);

  return dedupedTags.filter(Boolean);
}

/**
 * Formats a CharacterDNA record into a cohesive descriptive clause for natural-language prompt models (like FLUX, Grok, Recraft).
 */
export function formatCharacterDNAToPromptClause(dna: CharacterDNA): string {
  const rawClauses: string[] = [];
  const isMale = dna.build.gender?.toLowerCase() === 'man' || dna.build.gender?.toLowerCase() === 'male';

  const identityBits: string[] = [];
  const age = formatAgeClause(dna.build.age);
  if (age) identityBits.push(age);

  let inferredHeight = dna.build.height?.trim() ?? '';
  if (!inferredHeight && dna.distinguishingFeatures?.length) {
    for (const feat of dna.distinguishingFeatures) {
      const m = feat.match(/^\b(tall|petite|short|statuesque|towering)\b/i);
      if (m?.[1]) {
        inferredHeight = m[1].toLowerCase();
        break;
      }
    }
  }

  if (inferredHeight || dna.build.bodyType) {
    identityBits.push([inferredHeight, dna.build.bodyType].filter(Boolean).join(' '));
  }
  const genderSpecies = formatGenderSpecies(dna.build.gender, dna.build.species);
  if (genderSpecies) identityBits.push(genderSpecies);

  if (dna.build.bust && (!isMale || /chest|shoulder|pec/i.test(dna.build.bust))) {
    const bust = formatBustClause(dna.build.bust, true);
    if (bust) identityBits.push(bust);
  }
  if (dna.build.hipsGlutes && !isMale) {
    identityBits.push(dna.build.hipsGlutes);
  }
  const skin = formatSkinClause(dna.build.skinTone, true);
  if (skin) identityBits.push(skin);

  const hasIdentityLead = identityBits.length > 0;
  if (hasIdentityLead) {
    rawClauses.push(identityBits.join(' ').replace(/\s+/g, ' ').trim());
  }

  if (dna.faceFeatures) rawClauses.push(dna.faceFeatures);
  const hairText = formatHairClause(dna.hair);
  if (hairText) rawClauses.push(hairText);

  if (dna.eyes.color || dna.eyes.shape) {
    rawClauses.push([dna.eyes.shape, dna.eyes.color ? `${dna.eyes.color} eyes` : 'eyes'].filter(Boolean).join(' '));
  }

  if (dna.distinguishingFeatures && dna.distinguishingFeatures.length > 0) {
    rawClauses.push(...dna.distinguishingFeatures);
  }

  const deduped = deduplicateDescriptiveClauses(rawClauses, hasIdentityLead);

  const currentOutfit = dna.activeOutfit || dna.signatureOutfit;
  if (currentOutfit) {
    deduped.push(currentOutfit.startsWith('wearing ') ? currentOutfit : `wearing ${currentOutfit}`);
  }

  const visualDemeanor = filterVisualDemeanor(dna.demeanor);
  if (visualDemeanor) {
    deduped.push(visualDemeanor);
  }

  return deduped.filter(Boolean).join(', ');
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

  // Age extraction
  const ageMatch = text.match(/\b(?:in (?:her|his|their)\s+)?(late \d0s|early \d0s|mid \d0s|twenties|thirties|forties|fifties|\d{1,2}[- ]years?[- ]old)\b/i);
  if (ageMatch?.[1]) partial.build!.age = ageMatch[1];

  // Bust / Chest extraction
  const bustMatch = text.match(/\b(full bust|modest chest|ample cleavage|broad chest|defined pecs|petite bust|flat chest|heavy bust)\b/i);
  if (bustMatch?.[1]) partial.build!.bust = bustMatch[1];

  // Hips / Glutes / Waist extraction
  const hipsMatch = text.match(/\b(curvy hips|wide hips|shapely glutes|narrow waist|hourglass figure|slender hips|toned waist)\b/i);
  if (hipsMatch?.[1]) partial.build!.hipsGlutes = hipsMatch[1];

  // Face features
  const faceMatch = text.match(/\b(high cheekbones|sharp jawline|heart-shaped face|round face|dimples|soft full lips|delicate jaw)\b/i);
  if (faceMatch?.[1]) partial.faceFeatures = faceMatch[1];

  // Demeanor / Expression
  const demeanorMatch = text.match(/\b(guarded posture|shy gaze|wry smirk|stoic expression|confident stance|warm smile|piercing stare)\b/i);
  if (demeanorMatch?.[1]) partial.demeanor = demeanorMatch[1];

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
