import { test, expect } from 'bun:test';
import type { SpindleAPI } from 'lumiverse-spindle-types';
import { handleStoryDnaRequest } from './story-dna-workflow.js';
import {
  filterStoryDnaForActiveBranch,
  harvestTurnStoryDNA,
  isSignificantStoryItem,
} from './story-dna-harvester.js';
import { findMatchingLocation, type StoryDNASet } from '../../shared/story-dna.js';

test('handleStoryDnaRequest > lists, saves location/item, and deletes', async () => {
  const store = new Map<string, unknown>();
  const messages: Array<{ message: any; userId?: string }> = [];

  const mockSpindle = {
    userStorage: {
      async getJson<T>(key: string, opts?: { fallback?: T }): Promise<T | null> {
        return (store.get(key) as T) ?? opts?.fallback ?? null;
      },
      async setJson(key: string, val: unknown): Promise<void> {
        store.set(key, val);
      },
    },
    sendToFrontend(message: any, userId?: string) {
      messages.push({ message, userId });
    },
  } as unknown as SpindleAPI;

  // 1. List initially empty
  await handleStoryDnaRequest(
    mockSpindle,
    { type: 'vn_story_dna', action: 'list', chatId: 'c1', requestId: 'r1' },
    'u1'
  );
  expect(messages.length).toBe(1);
  expect(messages[0].message.type).toBe('vn_story_dna');
  expect(messages[0].message.storyDna.locations).toEqual({});
  expect(messages[0].message.storyDna.items).toEqual({});

  // 2. Save Location DNA
  await handleStoryDnaRequest(
    mockSpindle,
    {
      type: 'vn_story_dna',
      action: 'save_location',
      chatId: 'c1',
      requestId: 'r2',
      location: {
        id: 'cedar-loft',
        name: 'Cedar Loft',
        environmentDescription: 'Cedar beams, high ceiling, harbor view',
        lighting: 'dim afternoon dusk',
        persistentElements: ['leaded hardwood crate', 'clay dust'],
      },
    },
    'u1'
  );
  expect(messages.length).toBe(2);
  const dnaAfterLoc = messages[1].message.storyDna;
  expect(dnaAfterLoc.locations['cedar-loft']).toBeDefined();
  expect(dnaAfterLoc.locations['cedar-loft'].name).toBe('Cedar Loft');

  // 3. Save Item DNA
  await handleStoryDnaRequest(
    mockSpindle,
    {
      type: 'vn_story_dna',
      action: 'save_item',
      chatId: 'c1',
      requestId: 'r3',
      item: {
        id: 'yew-staff',
        name: 'Carved Yew Staff',
        description: 'Carved yew staff encrusted with small raw diamonds and wrapped in living green vines',
        materials: 'yew wood, raw diamonds, vines',
        distinctiveFeatures: ['spiral twist', 'living leaves'],
        colors: ['dark honey brown', 'pale green', 'white glimmer'],
      },
    },
    'u1'
  );
  expect(messages.length).toBe(3);
  const dnaAfterItem = messages[2].message.storyDna;
  expect(dnaAfterItem.items['yew-staff']).toBeDefined();
  expect(dnaAfterItem.items['yew-staff'].name).toBe('Carved Yew Staff');

  // 4. Delete location
  await handleStoryDnaRequest(
    mockSpindle,
    {
      type: 'vn_story_dna',
      action: 'delete_location',
      chatId: 'c1',
      requestId: 'r4',
      locationId: 'cedar-loft',
    },
    'u1'
  );
  expect(messages.length).toBe(4);
  const dnaAfterDel = messages[3].message.storyDna;
  expect(dnaAfterDel.locations['cedar-loft']).toBeUndefined();
  expect(dnaAfterDel.deletedLocations?.['cedar-loft']).toBeDefined();
});

test('isSignificantStoryItem filters mundane props and harvestTurnStoryDNA harvests locations, edges, and significant items', () => {
  expect(isSignificantStoryItem('door')).toBe(false);
  expect(isSignificantStoryItem('old wooden cup')).toBe(false);
  expect(isSignificantStoryItem('rusted iron door')).toBe(false);
  expect(isSignificantStoryItem('enchanted iron door', 'glowing with runic sigils')).toBe(true);
  expect(isSignificantStoryItem('ancient silver heirloom locket', 'passed down for centuries')).toBe(true);
  expect(isSignificantStoryItem('Carved Yew Staff')).toBe(true);

  const set: StoryDNASet = { version: 1, locations: {}, items: {} };
  const plan = {
    scenes: [
      {
        sceneId: 's1',
        startParagraph: 0,
        environment: {
          location: 'Flat 3',
          description: 'An open-plan cedar loft overlooking the dark docks',
          lighting: 'dim amber lantern light',
          timeOfDay: 'midnight',
          weather: 'drizzle',
          persistentElements: ['oak packing crate', 'brass lantern'],
        },
      },
      {
        sceneId: 's2',
        startParagraph: 1,
        priorSceneId: 's1',
        environment: {
          location: 'North Pier',
          description: 'Wet timber pier beside bobbing trawlers',
          persistentElements: ['iron bollard'],
        },
      },
    ],
    storyReferences: [
      { kind: 'object', name: 'wooden cup', field: 'appearance', value: 'just a cup' },
      { kind: 'object', name: 'Carved Yew Staff', field: 'appearance', value: 'Encrusted with uncut diamonds' },
    ],
    visualCues: [
      {
        paragraphIndex: 1,
        character: 'Nadine',
        visualFocus: 'Nadine gripping a glowing brass compass',
        action: { action: 'holding', object: 'Glowing Brass Compass' },
      },
    ],
  } as any;

  const changed = harvestTurnStoryDNA(plan, set, 'm5::0', 'Old Pier');
  expect(changed).toBe(true);
  expect(set.locations['flat-3']?.connectedLocations).toContain('North Pier');
  expect(set.locations['north-pier']?.connectedLocations).toContain('Flat 3');
  expect(set.locations['flat-3']?.autoDiscovered).toBe(true);
  expect(set.locations['flat-3']?.seenInSwipes).toEqual(['m5::0']);

  expect(set.items['carved-yew-staff']).toBeDefined();
  expect(set.items['glowing-brass-compass']).toBeDefined();
  expect(set.items['wooden-cup']).toBeUndefined();
  expect(set.chapterCodex?.map((c) => c.location)).toEqual(['Flat 3', 'North Pier']);

  // Branch filtering removes Swipe-0-only auto-discovered entries when on Swipe 1
  const branchSwipe1 = filterStoryDnaForActiveBranch(set, new Set(['m5::1']));
  expect(Object.keys(branchSwipe1.locations)).toHaveLength(0);
});

test('handleStoryDnaRequest > autofill_location and autofill_item extract context and save unlocked DNA', async () => {
  const store = new Map<string, unknown>();
  const messages: Array<{ message: any; userId?: string }> = [];

  const mockSpindle = {
    userStorage: {
      async getJson<T>(key: string, opts?: { fallback?: T }): Promise<T | null> {
        return (store.get(key) as T) ?? opts?.fallback ?? null;
      },
      async setJson(key: string, val: unknown): Promise<void> {
        store.set(key, val);
      },
    },
    chat: {
      async getMessages() {
        return [
          {
            id: 'm10',
            swipe_id: 0,
            role: 'assistant',
            content: 'Flat 3 smelled of wet cedar and brass oil. The Carved Yew Staff hummed in the corner.',
          },
        ];
      },
    },
    connections: {
      async list() {
        return [{ id: 'planner-1', provider: 'openai', model: 'gpt-test', is_default: true }];
      },
    },
    generate: {
      async raw(opts: any) {
        const sys = opts.messages?.[0]?.content || '';
        if (sys.includes('Scenery DNA')) {
          return {
            content: JSON.stringify({
              environmentDescription: 'Cedar-beamed harbor loft scented with lantern oil',
              lighting: 'Warm amber window glare',
              persistentElements: ['brass workbench'],
            }),
          };
        }
        return {
          content: JSON.stringify({
            itemType: 'arcane staff',
            description: 'Gnarled yew staff humming with latent energy',
            materials: 'ancient yew wood, brass',
          }),
        };
      },
    },
    sendToFrontend(message: any, userId: string) {
      messages.push({ message, userId });
    },
  } as unknown as SpindleAPI;

  await handleStoryDnaRequest(
    mockSpindle,
    {
      type: 'vn_story_dna',
      action: 'autofill_location',
      chatId: 'c1',
      requestId: 'af-loc',
      locationName: 'Flat 3',
    },
    'u1'
  );
  await handleStoryDnaRequest(
    mockSpindle,
    {
      type: 'vn_story_dna',
      action: 'autofill_item',
      chatId: 'c1',
      requestId: 'af-item',
      itemName: 'Carved Yew Staff',
    },
    'u1'
  );

  expect(messages).toHaveLength(2);
  expect(messages[0]!.message.storyDna.locations['flat-3']?.environmentDescription).toContain('Cedar-beamed harbor loft');
  expect(messages[1]!.message.storyDna.items['carved-yew-staff']?.materials).toContain('yew wood');
});

test('Wave 2 > findMatchingLocation separates composite rooms while preserving exact aliases', () => {
  const set: StoryDNASet = {
    revision: 1,
    locations: {
      'marten-corridor': {
        id: 'marten-corridor',
        name: 'Marten House - Fourth Floor Corridor',
        aliases: ['Fourth Floor Corridor'],
        persistentElements: [],
        connectedLocations: [],
        lastUpdated: 1,
      },
      'marten-lobby': {
        id: 'marten-lobby',
        name: 'Marten House - Lobby',
        aliases: ['Lobby'],
        persistentElements: [],
        connectedLocations: [],
        lastUpdated: 2,
      },
    },
    items: {},
  };

  expect(findMatchingLocation(set.locations, 'Marten House - Fourth Floor Corridor')?.id).toBe('marten-corridor');
  expect(findMatchingLocation(set.locations, 'Marten House - Lobby')?.id).toBe('marten-lobby');
  expect(findMatchingLocation(set.locations, 'Marten House - Boiler Room')).toBeUndefined();

  set.locations['marten-house'] = {
    id: 'marten-house',
    name: 'Marten House',
    aliases: [],
    persistentElements: [],
    connectedLocations: [],
    lastUpdated: 3,
  };
  expect(findMatchingLocation(set.locations, 'Marten House')?.id).toBe('marten-house');
  expect(findMatchingLocation(set.locations, 'Marten House - Lobby')?.id).toBe('marten-lobby');
});

test('Wave 2 > handleStoryDnaRequest supports route toggle, merge, restore, threads, lexicon, doc notes, and scrub_swipes', async () => {
  const store = new Map<string, unknown>();
  const messages: Array<{ message: any; userId?: string }> = [];
  const mockSpindle = {
    userStorage: {
      async getJson<T>(key: string, opts?: { fallback?: T }): Promise<T | null> {
        return (store.get(key) as T) ?? opts?.fallback ?? null;
      },
      async setJson(key: string, val: unknown): Promise<void> {
        store.set(key, val);
      },
    },
    chat: {
      async getMessages() {
        return [{ id: 'm1', swipe_id: 1 }];
      },
    },
    sendToFrontend(message: any, userId?: string) {
      messages.push({ message, userId });
    },
  } as unknown as SpindleAPI;

  const dispatch = async (body: Record<string, unknown>) => {
    await handleStoryDnaRequest(mockSpindle, { type: 'vn_story_dna', chatId: 'c2', ...body }, 'u1');
    return messages[messages.length - 1]!.message.storyDna as StoryDNASet;
  };

  await dispatch({
    action: 'save_location',
    location: { id: 'loc-lobby', name: 'Marten House Lobby', aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: 1 },
  });
  await dispatch({
    action: 'save_location',
    location: { id: 'loc-annex', name: 'Lobby Annex', aliases: ['Annex'], persistentElements: [], connectedLocations: ['Stairwell'], lastUpdated: 2 },
  });
  await dispatch({
    action: 'save_location',
    location: { id: 'loc-stairs', name: 'Stairwell', aliases: [], persistentElements: [], connectedLocations: ['Lobby Annex'], lastUpdated: 3 },
  });

  // toggle_route connects & disconnects symmetrically
  let dna = await dispatch({ action: 'toggle_route', fromLocationId: 'loc-lobby', toLocationId: 'loc-stairs', connected: true });
  expect(dna.locations['loc-lobby']?.connectedLocations).toContain('Stairwell');
  expect(dna.locations['loc-stairs']?.connectedLocations).toContain('Marten House Lobby');

  // merge_location remaps incoming routes & preserves aliases & moves source to deletedLocations
  dna = await dispatch({ action: 'merge_location', sourceId: 'loc-annex', targetId: 'loc-lobby' });
  expect(dna.locations['loc-annex']).toBeUndefined();
  expect(dna.deletedLocations?.['loc-annex']?.name).toBe('Lobby Annex');
  expect(dna.locations['loc-lobby']?.aliases).toEqual(expect.arrayContaining(['Lobby Annex', 'Annex']));
  expect(dna.locations['loc-stairs']?.connectedLocations).toContain('Marten House Lobby');
  expect(dna.locations['loc-stairs']?.connectedLocations).not.toContain('Lobby Annex');

  // restore_location recovers deleted entry
  dna = await dispatch({ action: 'restore_location', locationId: 'loc-annex' });
  expect(dna.locations['loc-annex']?.name).toBe('Lobby Annex');
  expect(dna.deletedLocations?.['loc-annex']).toBeUndefined();

  // merge_item & restore_item
  await dispatch({
    action: 'save_item',
    item: { id: 'item-key', name: 'Room Key', aliases: [], description: 'Numbered steel room key', distinctiveFeatures: [], colors: [], lastUpdated: 1 },
  });
  await dispatch({
    action: 'save_item',
    item: { id: 'item-brass', name: 'Brass Tag Key', aliases: ['Tag 47'], description: 'Tarnished brass hotel tag', distinctiveFeatures: [], colors: [], lastUpdated: 2 },
  });
  dna = await dispatch({ action: 'merge_item', sourceId: 'item-brass', targetId: 'item-key' });
  expect(dna.items['item-brass']).toBeUndefined();
  expect(dna.deletedItems?.['item-brass']?.name).toBe('Brass Tag Key');
  expect(dna.items['item-key']?.aliases).toEqual(expect.arrayContaining(['Brass Tag Key', 'Tag 47']));
  dna = await dispatch({ action: 'restore_item', itemId: 'item-brass' });
  expect(dna.items['item-brass']?.name).toBe('Brass Tag Key');

  // save_thread & delete_thread
  dna = await dispatch({
    action: 'save_thread',
    thread: { id: 'th-47', title: 'Knock pipes at ten', category: 'mystery', description: 'Basement maintenance clue', status: 'active', linkedEntities: ['Dorm 47'], updatedAt: 10 },
  });
  expect(dna.thoughtCabinet?.some((t) => t.id === 'th-47' && t.linkedEntities?.includes('Dorm 47'))).toBe(true);
  dna = await dispatch({ action: 'delete_thread', threadId: 'th-47' });
  expect(dna.thoughtCabinet?.some((t) => t.id === 'th-47')).toBe(false);

  // add_custom_lexicon normalizes item -> object
  dna = await dispatch({ action: 'add_custom_lexicon', term: 'Brass Token', kind: 'item' });
  expect(dna.customLexicon).toContainEqual({ term: 'Brass Token', kind: 'object' });

  // save_document_note + scrub_swipes cleans documents and npcBeliefs from inactive swipes
  dna = await dispatch({ action: 'save_document_note', documentId: 'doc-locked', name: 'Pipe Notice', kind: 'notice', note: 'Check Basement' });
  expect(dna.documents?.['doc-locked']?.customNotes).toBe('Check Basement');

  const raw = store.get('chats/c2/story-dna.json') as StoryDNASet;
  raw.documents!['doc-dead'] = {
    id: 'doc-dead',
    name: 'Old Swipe Flyer',
    kind: 'flyer',
    aliases: [],
    sections: [{ paragraphIndex: 0, text: 'Swipe zero text' }],
    autoDiscovered: true,
    seenInSwipes: ['m1::0'],
    lastUpdated: 1,
  };
  raw.documents!['doc-live'] = {
    id: 'doc-live',
    name: 'Active Swipe Slip',
    kind: 'note',
    aliases: [],
    sections: [{ paragraphIndex: 0, text: 'Swipe one text' }],
    autoDiscovered: true,
    seenInSwipes: ['m1::1'],
    lastUpdated: 2,
  };
  raw.npcBeliefs = {
    Naomi: [
      { topic: 'Pipes', belief: 'Dead swipe thought', knowsSecret: false, seenInSwipes: ['m1::0'], updatedAt: 1 },
      { topic: 'Pipes', belief: 'Live swipe thought', knowsSecret: false, seenInSwipes: ['m1::1'], updatedAt: 2 },
    ],
  };

  dna = await dispatch({ action: 'scrub_swipes' });
  expect(dna.documents?.['doc-dead']).toBeUndefined();
  expect(dna.documents?.['doc-live']).toBeDefined();
  expect(dna.documents?.['doc-locked']).toBeDefined();
  expect(dna.npcBeliefs?.Naomi?.map((b) => b.belief)).toEqual(['Live swipe thought']);
});
