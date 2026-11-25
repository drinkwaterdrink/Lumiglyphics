import type { SpindleAPI } from 'lumiverse-spindle-types';
import {
  LocationDNASchema,
  ItemDNASchema,
  ThoughtCabinetEntrySchema,
  StoryDocumentLedgerEntrySchema,
  StoryDNASetSchema,
  storyLoreThreadId,
  createLocationId,
  createItemId,
  findMatchingLocation,
  type LocationDNA,
  type ItemDNA,
  type ThoughtCabinetEntry,
  type StoryDNASet
} from '../../shared/story-dna.js';

const pathFor = (chatId: string) => `chats/${encodeURIComponent(chatId).replace(/%/g, '_')}/story-dna.json`;
const queues = new WeakMap<object, Map<string, Promise<unknown>>>();

function phase1RollbackCopy(set: StoryDNASet): StoryDNASet | null {
  const { loreEvents, loreHeads, hiddenLoreThreads, worldClocks, ...base } = set;
  const needsCopy = loreEvents || loreHeads || hiddenLoreThreads || worldClocks ||
    base.thoughtCabinet?.some(entry => entry.authored !== undefined) ||
    Object.values(base.documents ?? {}).some(doc => doc.appearances || doc.sections.some(section => section.sourceTurn) ||
      doc.observations?.some(observation => observation.sourceTurn)) ||
    Object.values(base.npcBeliefs ?? {}).some(entries => entries.some(entry => entry.knowledgeStatus !== undefined));
  if (!needsCopy) return null;
  return {
    ...base,
    ...(base.thoughtCabinet ? { thoughtCabinet: base.thoughtCabinet.map(({ authored, ...entry }) => entry) } : {}),
    ...(base.npcBeliefs ? { npcBeliefs: Object.fromEntries(Object.entries(base.npcBeliefs).map(([npc, entries]) =>
      [npc, entries.map(({ knowledgeStatus, ...entry }) => entry)])) } : {}),
    ...(base.documents ? { documents: Object.fromEntries(Object.entries(base.documents).map(([id, doc]) => {
      const { appearances, sections, observations, ...entry } = doc;
      return [id, {
        ...entry, sections: sections.filter(section => !section.sourceTurn),
        ...(observations ? { observations: observations.filter(observation => !observation.sourceTurn) } : {}),
      }];
    })) } : {}),
  };
}

export async function loadStoryDNASet(spindle: SpindleAPI, chatId: string, userId?: string): Promise<StoryDNASet> {
  const storage = spindle.userStorage;
  const path = pathFor(chatId);
  const raw = await storage?.getJson<unknown>(path, { fallback: null, ...(userId ? { userId } : {}) });
  if (raw === null || raw === undefined) {
    // A JSON null or a read fallback can also come from an existing file.
    const stat = await storage?.stat?.(path, userId);
    if (!stat?.exists) return { locations: {}, items: {}, revision: 0 };
  }
  const parsed = StoryDNASetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Saved Story DNA could not be read. The stored data has been preserved.');
  }
  return parsed.data;
}

export async function mutateStoryDNASet(
  spindle: SpindleAPI,
  chatId: string,
  userId: string | undefined,
  expectedRevision: number | undefined,
  mutation: (set: StoryDNASet) => void | false | Promise<void | false>
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
    const set = await loadStoryDNASet(spindle, chatId, userId);
    if (expectedRevision !== undefined && expectedRevision !== (set.revision ?? 0)) {
      throw new Error('Story DNA changed. Reload the latest data before saving.');
    }
    if (await mutation(set) === false) return set;
    set.revision = (set.revision ?? 0) + 1;
    const candidate = StoryDNASetSchema.safeParse(set);
    if (!candidate.success) {
      throw new Error('Story DNA update contains invalid fields. No changes were saved.');
    }
    const options = { indent: 2, ...(userId ? { userId } : {}) };
    const rollback = phase1RollbackCopy(candidate.data);
    if (rollback) {
      // Older strict readers cannot open provenance fields. Save a compatible
      // companion first so a failed backup cannot leave an unprotected upgrade.
      await spindle.userStorage!.setJson(pathFor(chatId).replace(/\.json$/, '.phase1-backup.json'), rollback, options);
    }
    await spindle.userStorage!.setJson(pathFor(chatId), candidate.data, options);
    return candidate.data;
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
    set.locations[id] = { ...parsed, id, autoDiscovered: false, lastUpdated: Date.now() };
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
    set.items[id] = { ...parsed, id, autoDiscovered: false, lastUpdated: Date.now() };
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

function dedupeStrings(values: readonly string[], excludeLower?: ReadonlySet<string>, max = 24): string[] {
  const seen = new Set<string>(excludeLower ? [...excludeLower] : []);
  const out: string[] = [];
  for (const raw of values) {
    const clean = raw.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function joinDistinctText(primary: string | undefined, secondary: string | undefined, max: number): string | undefined {
  const a = primary?.trim() ?? '';
  const b = secondary?.trim() ?? '';
  if (!a && !b) return undefined;
  if (!a) return b.slice(0, max);
  if (!b || a.toLowerCase().includes(b.toLowerCase())) return a.slice(0, max);
  if (b.toLowerCase().includes(a.toLowerCase())) return b.slice(0, max);
  return `${a}\n\n${b}`.slice(0, max);
}

export async function restoreLocationDNA(
  spindle: SpindleAPI,
  chatId: string,
  locationId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const deleted = set.deletedLocations?.[locationId];
    if (!deleted) throw new Error('Deleted location record was not found.');
    set.locations[locationId] = { ...deleted, lastUpdated: Date.now() };
    delete set.deletedLocations![locationId];
  });
}

export async function restoreItemDNA(
  spindle: SpindleAPI,
  chatId: string,
  itemId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const deleted = set.deletedItems?.[itemId];
    if (!deleted) throw new Error('Deleted item record was not found.');
    set.items[itemId] = { ...deleted, lastUpdated: Date.now() };
    delete set.deletedItems![itemId];
  });
}

export async function mergeLocationDNA(
  spindle: SpindleAPI,
  chatId: string,
  sourceId: string,
  targetId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  if (sourceId === targetId) throw new Error('Choose a different location to merge with.');
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const source = set.locations[sourceId];
    const target = set.locations[targetId];
    if (!source || !target) throw new Error('One of the locations to merge no longer exists.');
    const targetNameLower = target.name.trim().toLowerCase();
    const sourceNameLower = source.name.trim().toLowerCase();
    const excludeNames = new Set([targetNameLower, sourceNameLower]);
    const aliases = dedupeStrings(
      [...target.aliases, source.name, ...source.aliases],
      new Set([targetNameLower]),
      16,
    );
    const persistentElements = dedupeStrings(
      [...(target.persistentElements ?? []), ...(source.persistentElements ?? [])],
      undefined,
      24,
    );
    const connectedLocations = dedupeStrings(
      [...(target.connectedLocations ?? []), ...(source.connectedLocations ?? [])],
      excludeNames,
      24,
    );
    const merged: LocationDNA = {
      ...target,
      aliases,
      persistentElements,
      connectedLocations,
      ...((target.environmentDescription || source.environmentDescription)
        ? { environmentDescription: joinDistinctText(target.environmentDescription, source.environmentDescription, 2000) }
        : {}),
      ...((target.architecture || source.architecture)
        ? { architecture: target.architecture?.trim() || source.architecture?.trim() }
        : {}),
      ...((target.lighting || source.lighting)
        ? { lighting: target.lighting?.trim() || source.lighting?.trim() }
        : {}),
      ...((target.atmosphere || source.atmosphere)
        ? { atmosphere: target.atmosphere?.trim() || source.atmosphere?.trim() }
        : {}),
      ...((target.loreText || source.loreText)
        ? { loreText: joinDistinctText(target.loreText, source.loreText, 4000) }
        : {}),
      ...((target.notes || source.notes)
        ? { notes: joinDistinctText(target.notes, source.notes, 2000) }
        : {}),
      ...((target.referenceImageUrl || source.referenceImageUrl)
        ? { referenceImageUrl: target.referenceImageUrl || source.referenceImageUrl }
        : {}),
      seenInSwipes: dedupeStrings([...(target.seenInSwipes ?? []), ...(source.seenInSwipes ?? [])], undefined, 64),
      locked: Boolean(target.locked || source.locked),
      autoDiscovered: false,
      lastUpdated: Date.now(),
    };
    set.locations[targetId] = merged;
    set.deletedLocations ??= {};
    set.deletedLocations[sourceId] = source;
    delete set.locations[sourceId];

    // Remap incoming routes on other locations pointing to source -> target
    for (const [id, other] of Object.entries(set.locations)) {
      if (id === targetId || !other.connectedLocations?.length) continue;
      if (other.connectedLocations.some((c) => c.trim().toLowerCase() === sourceNameLower || createLocationId(c) === sourceId)) {
        other.connectedLocations = dedupeStrings(
          other.connectedLocations.map((c) =>
            c.trim().toLowerCase() === sourceNameLower || createLocationId(c) === sourceId ? target.name : c
          ),
          new Set([other.name.trim().toLowerCase()]),
          24,
        );
      }
    }
  });
}

export async function mergeItemDNA(
  spindle: SpindleAPI,
  chatId: string,
  sourceId: string,
  targetId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  if (sourceId === targetId) throw new Error('Choose a different item to merge with.');
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const source = set.items[sourceId];
    const target = set.items[targetId];
    if (!source || !target) throw new Error('One of the items to merge no longer exists.');
    const targetNameLower = target.name.trim().toLowerCase();
    const targetDesc = target.description?.trim() === target.name.trim() ? '' : target.description;
    const description = joinDistinctText(targetDesc, source.description, 2000) || target.name;
    const merged: ItemDNA = {
      ...target,
      aliases: dedupeStrings([...target.aliases, source.name, ...source.aliases], new Set([targetNameLower]), 16),
      ...((target.itemType || source.itemType) ? { itemType: target.itemType?.trim() || source.itemType?.trim() } : {}),
      description,
      ...((target.materials || source.materials) ? { materials: target.materials?.trim() || source.materials?.trim() } : {}),
      distinctiveFeatures: dedupeStrings([...(target.distinctiveFeatures ?? []), ...(source.distinctiveFeatures ?? [])], undefined, 24),
      colors: dedupeStrings([...(target.colors ?? []), ...(source.colors ?? [])], undefined, 12),
      ...((target.heldBy || source.heldBy) ? { heldBy: target.heldBy?.trim() || source.heldBy?.trim() } : {}),
      ...((target.loreText || source.loreText) ? { loreText: joinDistinctText(target.loreText, source.loreText, 4000) } : {}),
      ...((target.notes || source.notes) ? { notes: joinDistinctText(target.notes, source.notes, 2000) } : {}),
      ...((target.referenceImageUrl || source.referenceImageUrl) ? { referenceImageUrl: target.referenceImageUrl || source.referenceImageUrl } : {}),
      seenInSwipes: dedupeStrings([...(target.seenInSwipes ?? []), ...(source.seenInSwipes ?? [])], undefined, 64),
      locked: Boolean(target.locked || source.locked),
      autoDiscovered: false,
      lastUpdated: Date.now(),
    };
    set.items[targetId] = merged;
    set.deletedItems ??= {};
    set.deletedItems[sourceId] = source;
    delete set.items[sourceId];
  });
}

export async function toggleLocationRoute(
  spindle: SpindleAPI,
  chatId: string,
  fromLocationId: string,
  toLocationId: string,
  connected: boolean,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const fromLoc = set.locations[fromLocationId] ?? findMatchingLocation(set.locations, fromLocationId);
    const toLoc = set.locations[toLocationId] ?? findMatchingLocation(set.locations, toLocationId);
    if (!fromLoc || !toLoc || fromLoc.id === toLoc.id) {
      throw new Error('Select two distinct saved locations to link or unlink a route.');
    }
    const updateSide = (loc: LocationDNA, peer: LocationDNA) => {
      const peerLower = peer.name.trim().toLowerCase();
      const filtered = (loc.connectedLocations ?? []).filter(
        (c) => c.trim().toLowerCase() !== peerLower && createLocationId(c) !== peer.id
      );
      loc.connectedLocations = connected ? dedupeStrings([...filtered, peer.name], undefined, 24) : filtered;
      loc.autoDiscovered = false;
      loc.lastUpdated = Date.now();
    };
    updateSide(fromLoc, toLoc);
    updateSide(toLoc, fromLoc);
  });
}

export async function saveStoryThread(
  spindle: SpindleAPI,
  chatId: string,
  thread: ThoughtCabinetEntry,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  const parsed = ThoughtCabinetEntrySchema.parse(thread);
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const existing = set.thoughtCabinet ?? [];
    const idx = existing.findIndex((t) => t.id === parsed.id);
    const nextEntry: ThoughtCabinetEntry = { ...parsed, authored: true, updatedAt: Date.now() };
    if (set.hiddenLoreThreads) set.hiddenLoreThreads = set.hiddenLoreThreads.filter(id => id !== storyLoreThreadId(parsed.title));
    if (idx >= 0) {
      existing[idx] = nextEntry;
    } else {
      existing.push(nextEntry);
    }
    set.thoughtCabinet = existing.slice(-40);
  });
}

export async function deleteStoryThread(
  spindle: SpindleAPI,
  chatId: string,
  threadId: string,
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const thread = set.thoughtCabinet?.find(item => item.id === threadId);
    const hidden = thread ? storyLoreThreadId(thread.title) : threadId.startsWith('lore:') ? threadId : undefined;
    if (hidden) set.hiddenLoreThreads = [...new Set([...(set.hiddenLoreThreads ?? []), hidden])].slice(-96);
    if (set.thoughtCabinet) set.thoughtCabinet = set.thoughtCabinet.filter(t => t.id !== threadId);
  });
}

export async function saveDocumentTranscriptNote(
  spindle: SpindleAPI,
  chatId: string,
  params: { documentId: string; name: string; kind?: string | undefined; note: string },
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    set.documents ??= {};
    const existing = set.documents[params.documentId];
    const cleanNote = params.note.trim().slice(0, 4000);
    if (existing) {
      if (cleanNote) existing.customNotes = cleanNote;
      else delete existing.customNotes;
      existing.locked = true;
      existing.autoDiscovered = false;
      existing.lastUpdated = Date.now();
    } else {
      set.documents[params.documentId] = StoryDocumentLedgerEntrySchema.parse({
        id: params.documentId,
        name: params.name,
        kind: params.kind ?? 'note',
        aliases: [],
        sections: [],
        ...(cleanNote ? { customNotes: cleanNote } : {}),
        locked: true,
        autoDiscovered: false,
        lastUpdated: Date.now(),
      });
    }
  });
}

export async function addCustomLexiconTerm(
  spindle: SpindleAPI,
  chatId: string,
  params: { term: string; kind: 'place' | 'object' | 'item' | 'document' | 'npc' },
  userId?: string,
  revision?: number
): Promise<StoryDNASet> {
  return mutateStoryDNASet(spindle, chatId, userId, revision, (set) => {
    const clean = params.term.trim();
    if (clean.length < 2) throw new Error('Term must be at least 2 characters.');
    const normalizedKind = params.kind === 'item' ? 'object' : params.kind;
    const list = set.customLexicon ?? [];
    if (!list.some((x) => x.term.toLowerCase() === clean.toLowerCase() && x.kind === normalizedKind)) {
      set.customLexicon = [...list, { term: clean.slice(0, 160), kind: normalizedKind }].slice(-64);
    }
  });
}
