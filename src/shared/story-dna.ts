import { z } from 'zod';

export const LocationDNASchema = z.object({
  id: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().max(160)).max(16).default([]),
  environmentDescription: z.string().trim().max(2000).optional(),
  lighting: z.string().trim().max(500).optional(),
  atmosphere: z.string().trim().max(500).optional(),
  architecture: z.string().trim().max(500).optional(),
  persistentElements: z.array(z.string().trim().max(300)).max(24).default([]),
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

export const StoryDNASetSchema = z.object({
  locations: z.record(z.string(), LocationDNASchema).default({}),
  items: z.record(z.string(), ItemDNASchema).default({}),
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
    if (!allowShort && (clean.length < 4 || GENERIC_ALIAS_WORDS.has(lower))) return;
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

function matchesBoundaryCandidate(queryLower: string, candidateRaw: string): boolean {
  const candidate = candidateRaw.trim().toLowerCase();
  if (!candidate) return false;
  if (candidate === queryLower) return true;
  if (candidate.length >= 5 && !GENERIC_ALIAS_WORDS.has(candidate)) {
    const candidateRe = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(candidate)}(?:$|[^\\p{L}\\p{N}_])`, 'iu');
    if (candidateRe.test(queryLower)) return true;
  }
  if (queryLower.length >= 5 && !GENERIC_ALIAS_WORDS.has(queryLower)) {
    const queryRe = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(queryLower)}(?:$|[^\\p{L}\\p{N}_])`, 'iu');
    if (queryRe.test(candidate)) return true;
  }
  return false;
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
  const exact = Object.values(locations).find((loc) => {
    if (loc.name.trim().toLowerCase() === query) return true;
    if (createLocationId(loc.name) === directId) return true;
    return loc.aliases.some((a) => a.trim().toLowerCase() === query || createLocationId(a) === directId);
  });
  if (exact) return exact;
  return Object.values(locations).find((loc) => {
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
export function formatLocationDNAToPromptClause(dna: LocationDNA): string {
  const parts: string[] = [];
  if (dna.environmentDescription) parts.push(dna.environmentDescription);
  if (dna.architecture) parts.push(`architecture: ${dna.architecture}`);
  if (dna.lighting) parts.push(`lighting: ${dna.lighting}`);
  if (dna.atmosphere) parts.push(`atmosphere: ${dna.atmosphere}`);
  if (dna.persistentElements && dna.persistentElements.length > 0) {
    parts.push(`features: ${dna.persistentElements.slice(0, 6).join(', ')}`);
  }
  return parts.join('; ');
}

/** Formats Item DNA into a prompt clause for prop/action injection */
export function formatItemDNAToPromptClause(dna: ItemDNA): string {
  const parts: string[] = [];
  if (dna.description) parts.push(dna.description);
  if (dna.materials) parts.push(`materials: ${dna.materials}`);
  if (dna.distinctiveFeatures && dna.distinctiveFeatures.length > 0) {
    parts.push(dna.distinctiveFeatures.join(', '));
  }
  if (dna.colors && dna.colors.length > 0) {
    parts.push(`colors: ${dna.colors.join(', ')}`);
  }
  return parts.join('; ');
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
]);

export type StoryDnaRequest = z.infer<typeof StoryDnaRequestSchema>;
export type StoryDnaActionBody<T = StoryDnaRequest> = T extends StoryDnaRequest ? Omit<T, 'type' | 'chatId' | 'requestId'> : never;

