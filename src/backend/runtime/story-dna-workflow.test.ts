import { test, expect } from 'bun:test';
import type { SpindleAPI } from 'lumiverse-spindle-types';
import { handleStoryDnaRequest } from './story-dna-workflow.js';

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
