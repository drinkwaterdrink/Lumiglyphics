import type { TurnKey } from '../../shared/turn-key.js';
import { swipeTurnTag } from '../../shared/character-dna.js';
import { createItemId, isStoryEntryActiveOnBranch, storyLoreThreadId, type LocationDNA, type ItemDNA, type StoryDNASet } from '../../shared/story-dna.js';
import type { ReadingPosition } from '../../shared/reading-position.js';

export function sameLoreSource(left: TurnKey | undefined, right: TurnKey | undefined): boolean {
  if (!left || !right) return left === right;
  return left.chatId === right.chatId && left.assistantMessageId === right.assistantMessageId &&
    sourceSwipeTag(left) === sourceSwipeTag(right) && left.sourceFingerprint === right.sourceFingerprint && left.revision === right.revision;
}

function sourceSwipeTag(source: TurnKey): string {
  return swipeTurnTag(source.assistantMessageId, Number(source.swipeId ?? 0) || 0);
}

export function filterStoryDnaForActiveBranch(
  set: StoryDNASet,
  activeTags: ReadonlySet<string>,
  reader?: ReadingPosition,
  clockFingerprints?: ReadonlyMap<string, string>,
): StoryDNASet {
  const branch = [...activeTags];
  const cursorTag = reader ? sourceSwipeTag(reader.key) : undefined;
  if (cursorTag) {
    const at = branch.indexOf(cursorTag);
    activeTags = new Set(at < 0 ? [] : branch.slice(0, at + 1));
  }
  const hasBranch = activeTags.size > 0;
  const heads = new Map((set.loreHeads ?? []).map(key => [sourceSwipeTag(key), key]));
  const hidden = new Set(set.hiddenLoreThreads);
  const isVisible = (key: TurnKey, paragraphIndex: number) => {
    const tag = sourceSwipeTag(key);
    const head = heads.get(tag);
    return activeTags.has(tag) && (!head || sameLoreSource(head, key)) &&
      (!reader || (key.chatId === reader.key.chatId && (key.assistantMessageId !== reader.key.assistantMessageId ||
        (sameLoreSource(key, reader.key) && paragraphIndex <= reader.paragraphIndex))));
  };
  const locations: Record<string, LocationDNA> = Object.create(null);
  const belongsToBranch = (entry: { autoDiscovered?: boolean | undefined; locked?: boolean | undefined; seenInSwipes?: string[] | undefined }) =>
    (!reader || hasBranch || !entry.autoDiscovered || entry.locked) && isStoryEntryActiveOnBranch(entry, activeTags);
  for (const [id, loc] of Object.entries(set.locations)) {
    if (belongsToBranch(loc)) locations[id] = loc;
  }
  const documentKinds = new Map(Object.values(set.documents ?? {}).map(doc => [createItemId(doc.name), doc.kind]));
  const items: Record<string, ItemDNA> = Object.create(null);
  for (const [id, item] of Object.entries(set.items)) {
    if (!belongsToBranch(item)) continue;
    if (item.autoDiscovered && !item.locked && documentKinds.get(id) === item.itemType && item.itemType) {
      const { loreText: _oldTranscript, materials: _oldMaterials, ...prop } = item;
      items[id] = { ...prop, description: `${item.itemType}: ${item.name}` };
    } else items[id] = item;
  }
  let documents: StoryDNASet['documents'];
  if (set.documents) {
    documents = Object.create(null);
    for (const [id, doc] of Object.entries(set.documents)) {
      if (!belongsToBranch(doc) && !doc.customNotes) continue;
      const visible = (entry: { sourceTurn?: TurnKey | undefined; paragraphIndex: number }) =>
        entry.sourceTurn ? isVisible(entry.sourceTurn, entry.paragraphIndex) : !doc.autoDiscovered;
      const { observations, visualDetails, ...entry } = doc;
      const visibleObservations = observations?.filter(visible);
      const details = doc.autoDiscovered
        ? visibleObservations?.flatMap(o => o.visualDetails ?? []).join(', ').slice(0, 800)
        : visualDetails;
      const sections = doc.sections.filter(visible);
      const visibleAppearances = doc.appearances?.filter(appearance => isVisible(appearance.key, appearance.paragraphIndex));
      if (doc.autoDiscovered && doc.appearances?.length && !visibleAppearances?.length && !doc.customNotes) continue;
      if (doc.autoDiscovered && !doc.appearances?.length && !sections.length && !visibleObservations?.length && !doc.customNotes &&
          (doc.sections.some(section => section.sourceTurn) || observations?.some(observation => observation.sourceTurn))) continue;
      documents![id] = {
        ...entry,
        ...(visibleAppearances ? { appearances: visibleAppearances } : {}),
        sections,
        ...(visibleObservations?.length ? { observations: visibleObservations } : {}),
        ...(details ? { visualDetails: details } : {}),
      };
    }
  }
  const visibleDocumentItemIds = new Set(Object.values(documents ?? {}).filter(doc =>
    !doc.appearances || doc.appearances.length > 0).map(doc => createItemId(doc.name)));
  for (const [id, prop] of Object.entries(items)) {
    if (prop.autoDiscovered && !prop.locked && documentKinds.get(id) === prop.itemType && prop.itemType &&
        !visibleDocumentItemIds.has(id)) delete items[id];
  }
  const thoughtCabinet = (set.thoughtCabinet ?? []).filter(
    (entry) => (entry.authored || !hidden.has(storyLoreThreadId(entry.title))) &&
      (entry.authored || !entry.seenInSwipes?.length || entry.seenInSwipes.some((t) => activeTags.has(t)))
  ).map(entry => ({ ...entry }));
  const chapterCodex = set.chapterCodex?.filter(
    (entry) => !entry.seenInSwipes?.length || entry.seenInSwipes.some((t) => activeTags.has(t))
  );
  const npcBeliefs: NonNullable<StoryDNASet['npcBeliefs']> = Object.create(null);
  if (set.npcBeliefs) {
    for (const [npcKey, beliefs] of Object.entries(set.npcBeliefs)) {
      const kept = beliefs.filter(
        (b) => !b.seenInSwipes?.length || b.seenInSwipes.some((t) => activeTags.has(t))
      );
      if (kept.length > 0) npcBeliefs[npcKey] = kept;
    }
  }
  const bySwipe = new Map<string, NonNullable<StoryDNASet['loreEvents']>[number]>();
  for (const event of set.loreEvents ?? []) {
    const tag = sourceSwipeTag(event.key);
    if (!isVisible(event.key, 0)) continue;
    const previous = bySwipe.get(tag);
    if (!previous || previous.key.revision <= event.key.revision) bySwipe.set(tag, event);
  }
  const loreEvents = [...activeTags].flatMap(tag => {
    const event = bySwipe.get(tag);
    if (!event) return [];
    const at = (entry: { paragraphIndex?: number | undefined }) => isVisible(event.key, entry.paragraphIndex ?? event.paragraphIndex);
    return [{
      ...event,
      npcBeliefs: event.npcBeliefs.filter(at),
      threadUpdates: event.threadUpdates.filter(at),
      wardrobeDeltas: isVisible(event.key, event.paragraphIndex) ? event.wardrobeDeltas : [],
    }];
  });
  for (const event of loreEvents) {
    for (const { npc, topic, belief, status } of event.npcBeliefs) {
      const npcKey = Object.keys(npcBeliefs).find(name => name.toLowerCase() === npc.toLowerCase()) ?? npc;
      const previous = (npcBeliefs[npcKey] ?? []).filter(item => item.topic.toLowerCase() !== topic.toLowerCase());
      npcBeliefs[npcKey] = [...previous, {
        topic, belief, ...(status !== undefined ? { knowledgeStatus: status } : {}), knowsSecret: status === 'knows', updatedAt: 0,
        seenInSwipes: [sourceSwipeTag(event.key)],
      }].slice(-12);
    }
    for (const { title, action, summary } of event.threadUpdates) {
      const id = storyLoreThreadId(title);
      if (hidden.has(id)) continue;
      const existing = thoughtCabinet.find(entry => entry.title.toLowerCase() === title.toLowerCase());
      if (existing) {
        if (existing.authored || !existing.seenInSwipes?.length) continue;
        if (action === 'resolve') existing.status = 'resolved';
        else if (action === 'advance' && existing.status !== 'resolved') existing.status = 'internalized';
        if (summary) existing.description = summary;
      } else if (action !== 'resolve') {
        thoughtCabinet.push({ id, title,
          category: 'fact', description: summary || title,
          status: action === 'advance' ? 'internalized' : 'germinating', updatedAt: 0,
          seenInSwipes: [sourceSwipeTag(event.key)] });
      }
    }
  }
  const { loreHeads: _loreHeads, hiddenLoreThreads: _hiddenThreads, ...view } = set;
  const worldClocks = set.worldClocks;
  let clockEvents: NonNullable<StoryDNASet['worldClocks']>['events'] = [];
  if (worldClocks && clockFingerprints && reader) {
    const branchOrder = new Map(branch.map((tag, index) => [tag, index]));
    clockEvents = worldClocks.events.filter(event => {
      const { key, paragraphIndex } = event.position;
      return key.chatId === reader.key.chatId &&
        clockFingerprints.get(sourceSwipeTag(key)) === event.rawFingerprint && isVisible(key, paragraphIndex);
    }).sort((left, right) => (branchOrder.get(sourceSwipeTag(left.position.key)) ?? 0) -
      (branchOrder.get(sourceSwipeTag(right.position.key)) ?? 0) ||
      left.position.paragraphIndex - right.position.paragraphIndex);
  }
  return {
    ...view,
    locations,
    items,
    ...(documents !== undefined ? { documents } : {}),
    thoughtCabinet: thoughtCabinet.slice(-40),
    ...(chapterCodex !== undefined ? { chapterCodex } : {}),
    npcBeliefs,
    ...(set.loreEvents ? { loreEvents } : {}),
    ...(worldClocks ? { worldClocks: { clocks: worldClocks.clocks, events: clockEvents } } : {}),
  };
}
