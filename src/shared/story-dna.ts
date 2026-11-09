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

export function findMatchingLocation(
  locations: Record<string, LocationDNA>,
  name: string
): LocationDNA | undefined {
  const query = name.trim().toLowerCase();
  if (!query) return undefined;
  if (locations[query]) return locations[query];
  const directId = createLocationId(query);
  if (locations[directId]) return locations[directId];
  return Object.values(locations).find((loc) => {
    if (loc.name.trim().toLowerCase() === query) return true;
    if (createLocationId(loc.name) === directId) return true;
    return loc.aliases.some((a) => a.trim().toLowerCase() === query || createLocationId(a) === directId);
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
  return Object.values(items).find((item) => {
    if (item.name.trim().toLowerCase() === query) return true;
    if (createItemId(item.name) === directId) return true;
    return item.aliases.some((a) => a.trim().toLowerCase() === query || createItemId(a) === directId);
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
]);

export type StoryDnaRequest = z.infer<typeof StoryDnaRequestSchema>;

