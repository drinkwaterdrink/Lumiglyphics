import { test, expect } from 'bun:test';
import type { SpindleAPI } from 'lumiverse-spindle-types';
import { handleStoryDnaRequest } from './story-dna-workflow.js';
import {
  filterStoryDnaForActiveBranch,
  harvestTurnStoryDNA,
  isSignificantStoryItem,
} from './story-dna-harvester.js';
import type { StoryDNASet } from '../../shared/story-dna.js';

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
