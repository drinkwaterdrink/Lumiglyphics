import { z } from 'zod';

export const LocationSpatialAnchorsSchema = z.object({
  lightSourceAxis: z.enum(['left', 'right', 'backlit', 'overhead', 'ambient']).optional(),
  windowOrPortalSide: z.enum(['left', 'right', 'center-back', 'none']).optional(),
  horizonHeight: z.enum(['low', 'mid', 'high']).optional(),
  landmarks: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
}).strict();
export type LocationSpatialAnchors = z.infer<typeof LocationSpatialAnchorsSchema>;

export const LocationDNASchema = z.object({
  id: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().max(160)).max(16).default([]),
  environmentDescription: z.string().trim().max(2000).optional(),
  lighting: z.string().trim().max(500).optional(),
  atmosphere: z.string().trim().max(500).optional(),
  architecture: z.string().trim().max(500).optional(),
  persistentElements: z.array(z.string().trim().max(300)).max(24).default([]),
  spatialAnchors: LocationSpatialAnchorsSchema.optional(),
  locked: z.boolean().optional(),
  referenceImageUrl: z.string().trim().max(2048).optional(),
  connectedLocations: z.array(z.string().trim().max(160)).max(24).optional(),
  loreText: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(2000).optional(),
  autoDiscovered: z.boolean().optional(),
  seenInSwipes: z.array(z.string().trim().max(160)).max(64).optional(),
  lastUpdated: z.number().int().nonnegative().default(() => Date.now()),
}).strict();
export type LocationDNA = z.infer<typeof LocationDNASchema>;

export const ItemDNASchema = z.object({
  id: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().max(160)).max(16).default([]),
  itemType: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000),
  materials: z.string().trim().max(500).optional(),
  distinctiveFeatures: z.array(z.string().trim().max(300)).max(24).default([]),
  colors: z.array(z.string().trim().max(60)).max(12).default([]),
  heldBy: z.string().trim().max(160).optional(),
  locked: z.boolean().optional(),
  referenceImageUrl: z.string().trim().max(2048).optional(),
  loreText: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(2000).optional(),
  autoDiscovered: z.boolean().optional(),
  seenInSwipes: z.array(z.string().trim().max(160)).max(64).optional(),
  lastUpdated: z.number().int().nonnegative().default(() => Date.now()),
}).strict();
export type ItemDNA = z.infer<typeof ItemDNASchema>;

export const ThoughtCabinetEntrySchema = z.object({
  id: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(160),
  category: z.enum(['goal', 'bond', 'quest', 'mystery', 'secret', 'foreshadowing', 'promise', 'conspiracy', 'fact', 'clue']).catch('quest').default('quest'),
  description: z.string().trim().max(1500),
  status: z.enum(['active', 'developing', 'resolved', 'germinating', 'internalized']).catch('active').default('active'),
  linkedEntities: z.array(z.string().trim().max(160)).max(12).optional(),
  seenInSwipes: z.array(z.string().trim().max(160)).max(64).optional(),
  updatedAt: z.number().int().nonnegative().default(() => Date.now()),
}).strict();
export type ThoughtCabinetEntry = z.infer<typeof ThoughtCabinetEntrySchema>;

export const ChapterCodexEntrySchema = z.object({
  id: z.string().trim().min(1).max(256),
  title: z.string().trim().min(1).max(180),
  location: z.string().trim().max(180),
  summary: z.string().trim().max(2000),
  who: z.array(z.string().trim().max(120)).max(16).optional(),
  where: z.string().trim().max(180).optional(),
  whatChanged: z.array(z.string().trim().max(280)).max(12).optional(),
  imageUrl: z.string().trim().max(2048).optional(),
  messageId: z.string().trim().max(160).optional(),
  seenInSwipes: z.array(z.string().trim().max(160)).max(64).optional(),
  timestamp: z.number().int().nonnegative().default(() => Date.now()),
}).strict();
export type ChapterCodexEntry = z.infer<typeof ChapterCodexEntrySchema>;

export const NpcBeliefSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  belief: z.string().trim().min(1).max(400),
  knowsSecret: z.literal(false).default(false),
  seenInSwipes: z.array(z.string().trim().max(160)).max(64).optional(),
  updatedAt: z.number().int().nonnegative().default(() => Date.now()),
}).strict();
export type NpcBelief = z.infer<typeof NpcBeliefSchema>;

export const StoryDocumentLedgerEntrySchema = z.object({
  id: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(256),
  kind: z.string().trim().min(1).max(60),
  aliases: z.array(z.string().trim().max(160)).max(16).default([]),
  visualDetails: z.string().trim().max(800).optional(),
  observations: z.array(z.object({
    paragraphIndex: z.number().int().nonnegative(),
    summary: z.string().trim().max(500).optional(),
    visualDetails: z.array(z.string().trim().max(160)).max(8).optional(),
    material: z.string().trim().max(120).optional(),
    condition: z.string().trim().max(120).optional(),
    evidence: z.string().max(1200),
  }).strict()).max(32).optional(),
  sections: z.array(z.object({
    paragraphIndex: z.number().int().nonnegative(),
    text: z.string().min(1).max(6000),
    messageId: z.string().trim().max(160).optional(),
  }).strict()).max(64).default([]),
  customNotes: z.string().trim().max(4000).optional(),
  sourceMessageIds: z.array(z.string().trim().max(160)).max(64).optional(),
  cachedAsset: z.object({
    imageId: z.string().trim().min(1).max(256),
    imageUrl: z.string().trim().min(1).max(2048),
    contentHash: z.string().trim().min(1).max(160),
  }).strict().optional(),
  locked: z.boolean().optional(),
  autoDiscovered: z.boolean().optional(),
  seenInSwipes: z.array(z.string().trim().max(160)).max(64).optional(),
  lastUpdated: z.number().int().nonnegative().default(() => Date.now()),
}).strict();
export type StoryDocumentLedgerEntry = z.infer<typeof StoryDocumentLedgerEntrySchema>;

export const StoryDNASetSchema = z.object({
  locations: z.record(z.string(), LocationDNASchema).default({}),
  items: z.record(z.string(), ItemDNASchema).default({}),
  documents: z.record(z.string(), StoryDocumentLedgerEntrySchema).optional(),
  customLexicon: z.array(z.object({
    term: z.string().trim().min(2).max(160),
    kind: z.enum(['document', 'place', 'object', 'item', 'npc']),
  }).strict()).max(64).optional(),
  thoughtCabinet: z.array(ThoughtCabinetEntrySchema).max(40).optional(),
  chapterCodex: z.array(ChapterCodexEntrySchema).max(40).optional(),
  npcBeliefs: z.record(z.string(), z.array(NpcBeliefSchema).max(12)).optional(),
  deletedLocations: z.record(z.string(), LocationDNASchema).optional(),
  deletedItems: z.record(z.string(), ItemDNASchema).optional(),
  revision: z.number().int().nonnegative().default(0),
}).strict();
export type StoryDNASet = z.infer<typeof StoryDNASetSchema>;

export function createLocationId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'location';
}

export function createItemId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

const GENERIC_ALIAS_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that',
  'room', 'hall', 'wing', 'floor', 'area', 'place', 'zone', 'site',
  'town', 'city', 'land', 'keep', 'camp', 'shop', 'home', 'house',
  'door', 'gate', 'wall', 'road', 'path', 'street', 'court', 'yard',
  'key', 'keys', 'book', 'page', 'note', 'card', 'ring', 'mask',
  'coat', 'robe', 'bag', 'pack', 'box', 'case', 'cup', 'mug', 'glass',
  'blade', 'sword', 'staff', 'wand', 'coin', 'item', 'thing', 'relic',
  'old', 'new', 'dark', 'light', 'black', 'white', 'red', 'blue',
  'green', 'silver', 'golden', 'gold', 'iron', 'stone', 'crystal',
  'ancient', 'great', 'grand', 'small', 'little', 'lost', 'hidden',
  'secret', 'upper', 'lower', 'north', 'south', 'east', 'west',
  'inner', 'outer', 'high', 'deep', 'royal', 'broken', 'first', 'last',
]);

const TRAILING_CONTAINER_SUFFIXES = new Set([
  'academy', 'manor', 'cathedral', 'tavern', 'inn', 'keep', 'citadel',
  'tower', 'library', 'sanctum', 'chapel', 'market', 'shrine', 'ruins',
  'cavern', 'forest', 'observatory', 'conservatory', 'castle', 'palace',
  'temple', 'monastery', 'courtyard', 'wing', 'hall', 'chamber', 'room',
  'amulet', 'grimoire', 'chalice', 'signet', 'blade', 'sword', 'dagger',
  'relic', 'talisman', 'locket', 'pendant', 'compass', 'lantern', 'scroll',
  'codex', 'crown', 'scepter', 'sceptre', 'medallion', 'ring', 'satchel',
]);

const BOUNDARY_SHORT_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'was', 'were',
  'are', 'her', 'his', 'him', 'she', 'you', 'not', 'but', 'out', 'off', 'all',
  'one', 'two', 'can', 'had', 'has', 'its', 'our', 'who', 'way', 'day', 'man', 'men',
]);

const PERSONAL_HONORIFIC_RE = /^(?:mr|mrs|ms|miss|dr|prof|professor|lady|lord|sir|dame|capt|captain|insp|inspector|det|detective|lt|lieutenant|sgt|sergeant|rev|father|sister|brother)\.?$/i;

export function deriveShortAliases(name: string, existing: readonly string[] = []): string[] {
  const baseName = name.trim();
  const baseLower = baseName.toLowerCase();
  const seen = new Set<string>();
  if (baseLower) seen.add(baseLower);

  const out: string[] = [];
  const push = (raw: string, allowShort = false): void => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    const lower = clean.toLowerCase();
    if (!clean || seen.has(lower)) return;
    if (!allowShort && (clean.length < 3 || GENERIC_ALIAS_WORDS.has(lower) || BOUNDARY_SHORT_STOPWORDS.has(lower))) return;
    seen.add(lower);
    out.push(clean);
  };

  for (const item of existing) {
    if (typeof item === 'string') push(item, true);
  }

  if (baseName) {
    const parenClean = baseName
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/\s*(?:,|—|–|\s-\s).*$/, '')
      .trim();
    if (parenClean && parenClean !== baseName) push(parenClean);

    // Split multi-part dash/colon location or title phrases ("Marten House - Fourth Floor Corridor")
    const splitParts = baseName
      .replace(/\s*\([^)]*\)\s*$/, '')
      .split(/\s*(?:—|–|\s-\s|:\s+)\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitParts.length >= 2) {
      for (const part of splitParts) {
        if (part.length >= 4 && !GENERIC_ALIAS_WORDS.has(part.toLowerCase())) {
          push(part);
        }
      }
    }

    const noArticle = (parenClean || baseName).replace(/^(?:the|an?)\s+/i, '').trim();
    if (noArticle && noArticle.toLowerCase() !== baseLower) {
      push(noArticle);
    }

    const working = noArticle || parenClean || baseName;
    const ofSplit = working.split(/\s+of(?:\s+the)?\s+/i);
    if (ofSplit.length >= 2) {
      const head = ofSplit[0]?.trim() ?? '';
      if (head && !GENERIC_ALIAS_WORDS.has(head.toLowerCase())) {
        push(head);
      }
    }

    const words = working.split(/\s+/);
    if (words.length >= 2) {
      const lastWord = words[words.length - 1]?.toLowerCase() ?? '';
      const prefix = words.slice(0, -1).join(' ');
      if (
        TRAILING_CONTAINER_SUFFIXES.has(lastWord) &&
        prefix.length >= 5 &&
        !prefix.includes("'s") &&
        !prefix.includes('’s') &&
        !GENERIC_ALIAS_WORDS.has(prefix.toLowerCase())
      ) {
        push(prefix);
      } else {
        // Multi-word personal names ("Naomi Vance", "Dr. Marcus Thorne"): derive short name tokens
        const withoutHonorifics = words.filter((w) => !PERSONAL_HONORIFIC_RE.test(w));
        const looksLikePlaceOrObject = words.some((w) => {
          const wl = w.toLowerCase().replace(/[^a-z']/g, '');
          return TRAILING_CONTAINER_SUFFIXES.has(wl) || GENERIC_ALIAS_WORDS.has(wl);
        });
        if (!looksLikePlaceOrObject && withoutHonorifics.length >= 1 && withoutHonorifics.length <= 4) {
          const strippedFull = withoutHonorifics.join(' ');
          if (strippedFull.toLowerCase() !== working.toLowerCase()) {
            push(strippedFull);
          }
          if (withoutHonorifics.length >= 2 && withoutHonorifics.every((w) => /^[\p{Lu}]/u.test(w))) {
            for (const part of withoutHonorifics) {
              const cleanPart = part.replace(/[.,;:!?]+$/, '');
              if (cleanPart.length >= 3 && !GENERIC_ALIAS_WORDS.has(cleanPart.toLowerCase()) && !BOUNDARY_SHORT_STOPWORDS.has(cleanPart.toLowerCase())) {
                push(cleanPart, true);
              }
            }
          }
        }
      }
    }
  }

  return out.slice(0, 12);
}

export function isStoryEntryActiveOnBranch(
  entry: { autoDiscovered?: boolean | undefined; locked?: boolean | undefined; seenInSwipes?: string[] | undefined },
  activeBranchSwipeTags?: ReadonlySet<string> | null
): boolean {
  if (!entry.autoDiscovered || entry.locked) return true;
  if (!entry.seenInSwipes || entry.seenInSwipes.length === 0) return true;
  if (!activeBranchSwipeTags || activeBranchSwipeTags.size === 0) return true;
  return entry.seenInSwipes.some((tag) => activeBranchSwipeTags.has(tag));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesBoundaryCandidate(queryLower: string, candidateRaw: string): boolean {
  const candidate = candidateRaw.trim().toLowerCase();
  if (!candidate) return false;
  if (candidate === queryLower) return true;
  if (candidate.length >= 3 && !GENERIC_ALIAS_WORDS.has(candidate) && !BOUNDARY_SHORT_STOPWORDS.has(candidate)) {
    const candidateRe = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(candidate)}(?:$|[^\\p{L}\\p{N}_])`, 'iu');
    if (candidateRe.test(queryLower)) return true;
  }
  if (queryLower.length >= 3 && !GENERIC_ALIAS_WORDS.has(queryLower) && !BOUNDARY_SHORT_STOPWORDS.has(queryLower)) {
    const queryRe = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(queryLower)}(?:$|[^\\p{L}\\p{N}_])`, 'iu');
    if (queryRe.test(candidate)) return true;
  }
  return false;
}

function splitCompositeLocationParts(raw: string): string[] {
  return raw
    .replace(/\s*\([^)]*\)\s*$/, '')
    .split(/\s*(?:—|–|\s-\s|:\s+)\s*/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isCompositeLocationConflict(query: string, locName: string): boolean {
  const queryParts = splitCompositeLocationParts(query);
  const locParts = splitCompositeLocationParts(locName);
  if (queryParts.length <= 1 && locParts.length <= 1) return false;
  if (queryParts.length > 1 && locParts.length > 1) {
    // Two distinct sub-rooms under the same parent ("Marten House - Hall" vs "Marten House - Lobby") must never merge via parent prefix.
    return queryParts.join(' :: ') !== locParts.join(' :: ');
  }
  if (queryParts.length === 1 && locParts.length > 1) {
    // Querying bare parent ("Marten House") must not match child corridor ("Marten House - Fourth Floor Corridor") via its auto-split parent prefix;
    // still allows matching a distinct leaf name like "Fourth Floor Corridor".
    return locParts[0] === queryParts[0];
  }
  // Querying child corridor ("Marten House - Fourth Floor Corridor") must not fuzzy-match parent building ("Marten House").
  return queryParts[0] === locParts[0];
}

export function findMatchingLocation(
  locations: Record<string, LocationDNA>,
  name: string
): LocationDNA | undefined {
  const query = name.trim().toLowerCase();
  if (!query) return undefined;
  if (locations[query]) return locations[query];
  const directId = createLocationId(query);
  if (locations[directId]) return locations[directId];
  const exactName = Object.values(locations).find(
    (loc) => loc.name.trim().toLowerCase() === query || createLocationId(loc.name) === directId
  );
  if (exactName) return exactName;
  const exactAlias = Object.values(locations).find((loc) => {
    const locParts = splitCompositeLocationParts(loc.name);
    return loc.aliases.some((a) => {
      const aLower = a.trim().toLowerCase();
      if (aLower !== query && createLocationId(a) !== directId) return false;
      // Ignore auto-derived parent building prefix when composite collision applies
      if (loc.autoDiscovered && locParts.length > 1 && aLower === locParts[0]) return false;
      return !isCompositeLocationConflict(query, loc.name) || aLower === locParts.at(-1);
    });
  });
  if (exactAlias) return exactAlias;
  return Object.values(locations).find((loc) => {
    if (isCompositeLocationConflict(query, loc.name)) return false;
    const candidates = [loc.name, ...deriveShortAliases(loc.name, loc.aliases)];
    return candidates.some((candidate) => matchesBoundaryCandidate(query, candidate));
  });
}

export function findMatchingItem(
  items: Record<string, ItemDNA>,
  name: string
): ItemDNA | undefined {
  const query = name.trim().toLowerCase();
  if (!query) return undefined;
  if (items[query]) return items[query];
  const directId = createItemId(query);
  if (items[directId]) return items[directId];
  const exact = Object.values(items).find((item) => {
    if (item.name.trim().toLowerCase() === query) return true;
    if (createItemId(item.name) === directId) return true;
    return item.aliases.some((a) => a.trim().toLowerCase() === query || createItemId(a) === directId);
  });
  if (exact) return exact;
  return Object.values(items).find((item) => {
    const candidates = [item.name, ...deriveShortAliases(item.name, item.aliases)];
    return candidates.some((candidate) => matchesBoundaryCandidate(query, candidate));
  });
}

/** Formats Location DNA into a prompt clause for environment/scene injection */
export function formatLocationDNAToPromptClause(
  dna: LocationDNA,
  options?: { includeLighting?: boolean | undefined; includePersistentElements?: boolean | undefined; optimizeForImagePrompt?: boolean | undefined }
): string {
  const optimize = options?.optimizeForImagePrompt === true;
  const parts: string[] = [];
  if (dna.environmentDescription) parts.push(dna.environmentDescription.trim());
  if (dna.architecture) {
    parts.push(optimize ? `built with ${dna.architecture.trim()}` : `architecture: ${dna.architecture}`);
  }
  if (options?.includeLighting !== false && dna.lighting) {
    parts.push(optimize ? `lit by ${dna.lighting.trim()}` : `lighting: ${dna.lighting}`);
  }
  if (dna.atmosphere) {
    const atm = dna.atmosphere.trim();
    parts.push(optimize ? (/atmosphere|mood|ambience/i.test(atm) ? atm : `${atm} atmosphere`) : `atmosphere: ${dna.atmosphere}`);
  }
  if (options?.includePersistentElements !== false && dna.persistentElements && dna.persistentElements.length > 0) {
    const elems = dna.persistentElements.slice(0, 6).join(', ');
    parts.push(optimize ? `featuring ${elems}` : `features: ${elems}`);
  }
  return parts.join(optimize ? ', ' : '; ');
}

/** Formats Item DNA into a prompt clause for prop/action injection */
export function formatItemDNAToPromptClause(
  dna: ItemDNA,
  options?: { optimizeForImagePrompt?: boolean | undefined }
): string {
  const optimize = options?.optimizeForImagePrompt === true;
  const parts: string[] = [];
  if (dna.description) {
    parts.push(dna.description.trim());
  } else if (optimize && dna.name) {
    parts.push(dna.name.trim());
  }
  if (dna.materials) {
    parts.push(optimize ? `crafted from ${dna.materials.trim()}` : `materials: ${dna.materials}`);
  }
  if (dna.distinctiveFeatures && dna.distinctiveFeatures.length > 0) {
    const feats = dna.distinctiveFeatures.join(', ');
    parts.push(optimize ? `with ${feats}` : feats);
  }
  if (dna.colors && dna.colors.length > 0) {
    if (optimize) {
      const namedColors = dna.colors.map((c) => c.trim()).filter((c) => Boolean(c) && !/^#[0-9a-f]{3,8}$/i.test(c));
      if (namedColors.length > 0) {
        parts.push(`colored in ${namedColors.join(', ')}`);
      }
    } else {
      parts.push(`colors: ${dna.colors.join(', ')}`);
    }
  }
  return parts.join(optimize ? ', ' : '; ');
}

export function formatLocationDNAForImagePrompt(
  dna: LocationDNA,
  options?: { includeLighting?: boolean | undefined; includePersistentElements?: boolean | undefined }
): string {
  return formatLocationDNAToPromptClause(dna, { ...options, optimizeForImagePrompt: true });
}

export function formatItemDNAForImagePrompt(dna: ItemDNA): string {
  return formatItemDNAToPromptClause(dna, { optimizeForImagePrompt: true });
}

export const StoryDnaRequestSchema = z.discriminatedUnion('action', [
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('list'),
    chatId: z.string(),
    requestId: z.string().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('scrub_swipes'),
    chatId: z.string(),
    requestId: z.string().optional(),
    activeSwipeId: z.string().max(160).optional(),
    validSwipeIds: z.array(z.string().max(160)).max(64).optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('save_location'),
    chatId: z.string(),
    requestId: z.string().optional(),
    location: LocationDNASchema,
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('save_item'),
    chatId: z.string(),
    requestId: z.string().optional(),
    item: ItemDNASchema,
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('delete_location'),
    chatId: z.string(),
    requestId: z.string().optional(),
    locationId: z.string(),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('delete_item'),
    chatId: z.string(),
    requestId: z.string().optional(),
    itemId: z.string(),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('autofill_location'),
    chatId: z.string(),
    requestId: z.string().optional(),
    locationId: z.string().optional(),
    locationName: z.string(),
    messageId: z.string().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('autofill_item'),
    chatId: z.string(),
    requestId: z.string().optional(),
    itemId: z.string().optional(),
    itemName: z.string(),
    messageId: z.string().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('generate_item_art'),
    chatId: z.string(),
    requestId: z.string().optional(),
    itemId: z.string(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('restore_location'),
    chatId: z.string(),
    requestId: z.string().optional(),
    locationId: z.string().min(1).max(256),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('restore_item'),
    chatId: z.string(),
    requestId: z.string().optional(),
    itemId: z.string().min(1).max(256),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('merge_location'),
    chatId: z.string(),
    requestId: z.string().optional(),
    sourceId: z.string().min(1).max(256),
    targetId: z.string().min(1).max(256),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('merge_item'),
    chatId: z.string(),
    requestId: z.string().optional(),
    sourceId: z.string().min(1).max(256),
    targetId: z.string().min(1).max(256),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('toggle_route'),
    chatId: z.string(),
    requestId: z.string().optional(),
    fromLocationId: z.string().min(1).max(256),
    toLocationId: z.string().min(1).max(256),
    connected: z.boolean(),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('save_thread'),
    chatId: z.string(),
    requestId: z.string().optional(),
    thread: ThoughtCabinetEntrySchema,
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('delete_thread'),
    chatId: z.string(),
    requestId: z.string().optional(),
    threadId: z.string().min(1).max(256),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('save_document_note'),
    chatId: z.string(),
    requestId: z.string().optional(),
    documentId: z.string().min(1).max(256),
    name: z.string().trim().min(1).max(256),
    kind: z.string().trim().min(1).max(60).optional(),
    note: z.string().max(4000),
    revision: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('vn_story_dna'),
    action: z.literal('add_custom_lexicon'),
    chatId: z.string(),
    requestId: z.string().optional(),
    term: z.string().trim().min(2).max(120),
    kind: z.enum(['place', 'object', 'item', 'document', 'npc']),
    revision: z.number().int().optional(),
  }),
]);

export type StoryDnaRequest = z.infer<typeof StoryDnaRequestSchema>;
export type StoryDnaActionBody<T = StoryDnaRequest> = T extends StoryDnaRequest ? Omit<T, 'type' | 'chatId' | 'requestId'> : never;

function isSwipeEntryActive(
  entry: { autoDiscovered?: boolean | undefined; locked?: boolean | undefined; seenInSwipes?: string[] | undefined },
  activeMessageSwipes: Record<string, string>
): boolean {
  if (!entry.autoDiscovered || entry.locked) return true;
  if (!entry.seenInSwipes || entry.seenInSwipes.length === 0) return true;
  const knownMessageIds = entry.seenInSwipes.map((tag) => tag.split('::')[0] ?? '').filter((id) => Object.prototype.hasOwnProperty.call(activeMessageSwipes, id));
  if (knownMessageIds.length === 0) return true;
  return entry.seenInSwipes.some((tag) => {
    const msgId = tag.split('::')[0] ?? '';
    const activeTag = activeMessageSwipes[msgId];
    return !activeTag || tag === activeTag;
  });
}

export function scrubStoryDNASwipes(
  set: StoryDNASet,
  activeMessageSwipes: Record<string, string>
): StoryDNASet {
  const nextLocations: Record<string, LocationDNA> = {};
  for (const [id, loc] of Object.entries(set.locations)) {
    if (isSwipeEntryActive(loc, activeMessageSwipes)) nextLocations[id] = loc;
  }
  const nextItems: Record<string, ItemDNA> = {};
  for (const [id, item] of Object.entries(set.items)) {
    if (isSwipeEntryActive(item, activeMessageSwipes)) nextItems[id] = item;
  }
  let nextDocuments: Record<string, StoryDocumentLedgerEntry> | undefined;
  if (set.documents) {
    nextDocuments = {};
    for (const [id, doc] of Object.entries(set.documents)) {
      if (isSwipeEntryActive(doc, activeMessageSwipes)) nextDocuments[id] = doc;
    }
  }
  const nextThoughtCabinet = set.thoughtCabinet?.filter((t) =>
    !t.seenInSwipes?.length || isSwipeEntryActive({ autoDiscovered: true, seenInSwipes: t.seenInSwipes }, activeMessageSwipes)
  );
  const nextChapterCodex = set.chapterCodex?.filter((c) =>
    !c.seenInSwipes?.length || isSwipeEntryActive({ autoDiscovered: true, seenInSwipes: c.seenInSwipes }, activeMessageSwipes)
  );
  let nextNpcBeliefs: Record<string, NpcBelief[]> | undefined;
  if (set.npcBeliefs) {
    nextNpcBeliefs = {};
    for (const [npc, entries] of Object.entries(set.npcBeliefs)) {
      const kept = entries.filter((entry) =>
        !entry.seenInSwipes?.length || isSwipeEntryActive({ autoDiscovered: true, seenInSwipes: entry.seenInSwipes }, activeMessageSwipes)
      );
      if (kept.length > 0) nextNpcBeliefs[npc] = kept;
    }
  }
  return StoryDNASetSchema.parse({
    ...set,
    locations: nextLocations,
    items: nextItems,
    ...(nextDocuments !== undefined ? { documents: nextDocuments } : {}),
    ...(nextThoughtCabinet !== undefined ? { thoughtCabinet: nextThoughtCabinet } : {}),
    ...(nextChapterCodex !== undefined ? { chapterCodex: nextChapterCodex } : {}),
    ...(nextNpcBeliefs !== undefined ? { npcBeliefs: nextNpcBeliefs } : {}),
    revision: (set.revision ?? 0) + 1
  });
}

