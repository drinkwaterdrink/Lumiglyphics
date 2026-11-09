import type { SpindleAPI } from 'lumiverse-spindle-types';
import {
  LocationDNASchema,
  ItemDNASchema,
  StoryDNASetSchema,
  createLocationId,
  createItemId,
  type LocationDNA,
  type ItemDNA,
  type StoryDNASet
} from '../../shared/story-dna.js';

const pathFor = (chatId: string) => `chats/${encodeURIComponent(chatId).replace(/%/g, '_')}/story-dna.json`;
const queues = new WeakMap<object, Map<string, Promise<unknown>>>();

async function read(spindle: SpindleAPI, chatId: string, userId?: string): Promise<{ raw: unknown; set: StoryDNASet }> {
  const raw = await spindle.userStorage?.getJson<unknown>(pathFor(chatId), { fallback: null, ...(userId ? { userId } : {}) });
  if (raw === null || raw === undefined) {
    return { raw: null, set: { locations: {}, items: {}, revision: 0 } };
  }
  const parsed = StoryDNASetSchema.safeParse(raw);
  if (parsed.success) {
    return { raw, set: parsed.data };
  }
  return { raw, set: { locations: {}, items: {}, revision: 0 } };
}

export async function loadStoryDNASet(spindle: SpindleAPI, chatId: string, userId?: string): Promise<StoryDNASet> {
  return (await read(spindle, chatId, userId)).set;
}

export async function mutateStoryDNASet(
  spindle: SpindleAPI,
  chatId: string,
  userId: string | undefined,
  expectedRevision: number | undefined,
  mutation: (set: StoryDNASet) => void
): Promise<StoryDNASet> {
  if (!spindle.userStorage) throw new Error('Story DNA storage is unavailable. Your changes have not been saved.');
  let scopes = queues.get(spindle);
  if (!scopes) {
    scopes = new Map();
    queues.set(spindle, scopes);
  }
  const key = JSON.stringify([userId ?? null, chatId]);
  const previous = scopes.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const { set } = await read(spindle, chatId, userId);
    if (expectedRevision !== undefined && expectedRevision !== (set.revision ?? 0)) {
      throw new Error('Story DNA changed. Reload the latest data before saving.');
    }
    mutation(set);
    set.revision = (set.revision ?? 0) + 1;
    const options = { indent: 2, ...(userId ? { userId } : {}) };
    await spindle.userStorage!.setJson(pathFor(chatId), set, options);
    return set;
  });
  scopes.set(key, pending);
  try {
    return await pending;
  } finally {
    if (scopes.get(key) === pending) scopes.delete(key);
  }
}

export async function saveLocationDNA(
  spindle: SpindleAPI,
  chatId: string,
  loc: LocationDNA,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  const parsed = LocationDNASchema.parse(loc);
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const id = parsed.id || createLocationId(parsed.name);
    set.locations[id] = { ...parsed, id, lastUpdated: Date.now() };
    if (set.deletedLocations?.[id]) delete set.deletedLocations[id];
  });
}

export async function saveItemDNA(
  spindle: SpindleAPI,
  chatId: string,
  item: ItemDNA,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  const parsed = ItemDNASchema.parse(item);
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const id = parsed.id || createItemId(parsed.name);
    set.items[id] = { ...parsed, id, lastUpdated: Date.now() };
    if (set.deletedItems?.[id]) delete set.deletedItems[id];
  });
}

export async function deleteLocationDNA(
  spindle: SpindleAPI,
  chatId: string,
  locationId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const loc = set.locations[locationId];
    if (loc) {
      set.deletedLocations ??= {};
      set.deletedLocations[locationId] = loc;
      delete set.locations[locationId];
    }
  });
}

export async function deleteItemDNA(
  spindle: SpindleAPI,
  chatId: string,
  itemId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const it = set.items[itemId];
    if (it) {
      set.deletedItems ??= {};
      set.deletedItems[itemId] = it;
      delete set.items[itemId];
    }
  });
}
