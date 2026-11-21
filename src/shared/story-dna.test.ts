import { test, expect } from 'bun:test';
import {
  LocationDNASchema,
  ItemDNASchema,
  StoryDNASetSchema,
  createLocationId,
  createItemId,
  deriveShortAliases,
  isStoryEntryActiveOnBranch,
  scrubStoryDNASwipes,
  findMatchingLocation,
  findMatchingItem,
  formatLocationDNAToPromptClause,
  formatItemDNAToPromptClause,
  type LocationDNA,
  type ItemDNA
} from './story-dna.js';
import { harvestTurnStoryDNA } from '../backend/runtime/story-dna-harvester.js';
import { TurnPlanSchema } from './contracts.js';

test('creates stable ids from names', () => {
  expect(createLocationId('Flat 3')).toBe('flat-3');
  expect(createItemId('Carved Yew Staff')).toBe('carved-yew-staff');
});

test('validates LocationDNA and ItemDNA schemas', () => {
  const loc: LocationDNA = {
    id: 'flat-3',
    name: 'Flat 3',
    aliases: ['Aleister Loft'],
    environmentDescription: 'An open-plan cedar loft with shattered packing debris and lead-lined hardwood crate.',
    lighting: 'gray noon window light through high panes',
    architecture: 'industrial dockside cedar loft',
    persistentElements: ['lead-lined crate', 'brass strapping'],
    lastUpdated: Date.now()
  };
  expect(LocationDNASchema.safeParse(loc).success).toBe(true);

  const item: ItemDNA = {
    id: 'carved-yew-staff',
    name: 'Carved Yew Staff',
    aliases: ['Ancient Yew Staff'],
    itemType: 'staff',
    description: 'carved yew staff encrusted in diamonds wrapped in vines',
    materials: 'aged dark yew wood, rough diamonds, living emerald vines',
    distinctiveFeatures: ['encrusted with unpolished diamonds', 'living coiled vines'],
    colors: ['#2D1B00', '#E0F2FE', '#15803D'],
    lastUpdated: Date.now()
  };
  expect(ItemDNASchema.safeParse(item).success).toBe(true);
});

test('finds matching location and item by name or alias', () => {
  const locations: Record<string, LocationDNA> = {
    'flat-3': {
      id: 'flat-3',
      name: 'Flat 3',
      aliases: ['The Cedar Loft'],
      persistentElements: [],
      lastUpdated: 0
    }
  };
  expect(findMatchingLocation(locations, 'Flat 3')?.id).toBe('flat-3');
  expect(findMatchingLocation(locations, 'the cedar loft')?.id).toBe('flat-3');
  expect(findMatchingLocation(locations, 'Unknown')).toBeUndefined();

  const items: Record<string, ItemDNA> = {
    'carved-yew-staff': {
      id: 'carved-yew-staff',
      name: 'Carved Yew Staff',
      aliases: ['Diamond Staff'],
      description: 'carved yew staff encrusted in diamonds',
      distinctiveFeatures: [],
      colors: [],
      lastUpdated: 0
    }
  };
  expect(findMatchingItem(items, 'Carved Yew Staff')?.id).toBe('carved-yew-staff');
  expect(findMatchingItem(items, 'diamond staff')?.id).toBe('carved-yew-staff');
});

test('formats Location and Item DNA into concise prompt clauses', () => {
  const loc: LocationDNA = {
    id: 'flat-3',
    name: 'Flat 3',
    aliases: [],
    environmentDescription: 'open-plan cedar loft',
    architecture: 'dockside cedar beams',
    lighting: 'soft gray morning light',
    persistentElements: ['lead-lined crate'],
    lastUpdated: 0
  };
  const clause = formatLocationDNAToPromptClause(loc);
  expect(clause).toContain('open-plan cedar loft');
  expect(clause).toContain('architecture: dockside cedar beams');
  expect(clause).toContain('lighting: soft gray morning light');
  expect(clause).toContain('features: lead-lined crate');

  const item: ItemDNA = {
    id: 'carved-yew-staff',
    name: 'Carved Yew Staff',
    aliases: [],
    description: 'carved yew staff encrusted in diamonds wrapped in vines',
    materials: 'yew wood, rough diamonds',
    distinctiveFeatures: ['living coiled vines'],
    colors: ['#2D1B00', '#15803D'],
    lastUpdated: 0
  };
  const itemClause = formatItemDNAToPromptClause(item);
  expect(itemClause).toContain('carved yew staff encrusted in diamonds wrapped in vines');
  expect(itemClause).toContain('materials: yew wood, rough diamonds');
  expect(itemClause).toContain('living coiled vines');
  expect(itemClause).toContain('colors: #2D1B00, #15803D');
});

test('derives short aliases and filters active-branch swipe entries', () => {
  const aliases = deriveShortAliases('Carved Yew Staff of Eldoria (Blessed)', ['Old Staff']);
  expect(aliases).toContain('Old Staff');
  expect(aliases).toContain('Carved Yew Staff of Eldoria');

  const locAliases = deriveShortAliases("Harbor Master's Office — North Pier");
  expect(locAliases.length).toBeGreaterThanOrEqual(1);

  const activeSwipes = new Set(['m2::1']);
  expect(isStoryEntryActiveOnBranch({ autoDiscovered: false, seenInSwipes: ['m2::0'] }, activeSwipes)).toBe(true);
  expect(isStoryEntryActiveOnBranch({ autoDiscovered: true, locked: true, seenInSwipes: ['m2::0'] }, activeSwipes)).toBe(true);
  expect(isStoryEntryActiveOnBranch({ autoDiscovered: true, seenInSwipes: ['m2::0'] }, activeSwipes)).toBe(false);
  expect(isStoryEntryActiveOnBranch({ autoDiscovered: true, seenInSwipes: ['m2::0', 'm2::1'] }, activeSwipes)).toBe(true);

  const scrubbed = scrubStoryDNASwipes(
    StoryDNASetSchema.parse({
      locations: {
        'swipe0-only': { id: 'swipe0-only', name: 'Old Alley', aliases: [], persistentElements: [], autoDiscovered: true, seenInSwipes: ['m2::0'], lastUpdated: 0 },
        'swipe1-kept': { id: 'swipe1-kept', name: 'New Plaza', aliases: [], persistentElements: [], autoDiscovered: true, seenInSwipes: ['m2::1'], lastUpdated: 0 },
        'locked-kept': { id: 'locked-kept', name: 'Vault', aliases: [], persistentElements: [], autoDiscovered: true, locked: true, seenInSwipes: ['m2::0'], lastUpdated: 0 },
      },
      items: {},
      revision: 1,
    }),
    { m2: 'm2::1' }
  );
  expect(scrubbed.locations['swipe0-only']).toBeUndefined();
  expect(scrubbed.locations['swipe1-kept']).toBeDefined();
  expect(scrubbed.locations['locked-kept']).toBeDefined();
});

test('Wave 1: preserves taverns/manors/stations in Location DNA, splits personal names, harvests mentioned places and multi-turn DocumentLedger', () => {
  expect(deriveShortAliases('Naomi Vance')).toEqual(expect.arrayContaining(['Naomi', 'Vance']));
  expect(deriveShortAliases('Marten House - Fourth Floor Corridor')).toEqual(expect.arrayContaining(['Marten House', 'Fourth Floor Corridor']));

  const set = StoryDNASetSchema.parse({ locations: {}, items: {}, revision: 0 });
  const sceneBase = {
    sceneId: 's1', revision: 0, startParagraph: 0,
    environment: { location: 'The Rusty Anchor Tavern', description: 'Warm hearthstone taproom.', lighting: 'amber lanterns', timeOfDay: 'evening', weather: 'rain', persistentElements: ['oak bar'] },
    cast: ['Naomi Vance'], continuity: { revision: 0, characters: {}, facts: {} },
    basePrompt: 'tavern', cameraLock: { framing: 'wide', angle: 'eye level', perspective: 'fixed', lens: '50mm', subjectAnchor: 'center', horizon: 'upper third', safeDialogueRegion: 'lower third', aspectRatio: '16:9' },
    compositionLock: 'centered', activeAssetId: null, priorSceneId: null,
  };
  const plan1 = TurnPlanSchema.parse({
    schemaVersion: 1,
    key: { chatId: 'c1', assistantMessageId: 'msg-1', swipeId: 0, sourceFingerprint: 'fp-12345678', revision: 0 },
    paragraphs: [{ index: 0, sourceIndex: 0, text: 'At The Rusty Anchor Tavern, a crumpled flyer mentions Grand Central Station.' }],
    scenes: [sceneBase],
    visualCues: [],
    choices: [],
    initialContinuity: { revision: 0, characters: {}, facts: {} },
    continuityDeltas: [],
    terminalContinuity: { revision: 0, characters: {}, facts: {} },
    storyReferences: [
      { kind: 'place', name: 'Grand Central Station', paragraphIndex: 0, field: 'publicHistory', value: 'Grand Central Station', evidence: 'At The Rusty Anchor Tavern, a crumpled flyer mentions Grand Central Station.' },
    ],
    storyDocuments: [
      { id: 'doc-flyer-1', name: 'Crumpled Flyer', kind: 'flyer', paragraphIndex: 0, aliases: ['flyer'], sections: [] },
    ],
    planningStatus: 'planned',
    createdAt: new Date().toISOString(),
  });
  harvestTurnStoryDNA(plan1, set, 'msg-1::0', null);
  expect(findMatchingLocation(set.locations, 'The Rusty Anchor Tavern')?.name).toBe('The Rusty Anchor Tavern');
  expect(findMatchingLocation(set.locations, 'Grand Central Station')?.loreText).toContain('publicHistory');
  expect(set.documents?.['doc-flyer-1']?.sections).toEqual([]);

  // Turn 2 reads the back of the same flyer — sections accumulate onto the existing DocumentLedger entry!
  const plan2 = TurnPlanSchema.parse({
    ...plan1,
    key: { chatId: 'c1', assistantMessageId: 'msg-2', swipeId: 0, sourceFingerprint: 'fp-22345678', revision: 0 },
    paragraphs: [{ index: 0, sourceIndex: 0, text: 'You flip the flyer over: "Track 9 closes at midnight."' }],
    storyReferences: [],
    storyDocuments: [
      { id: 'doc-flyer-1', name: 'Crumpled Flyer', kind: 'flyer', paragraphIndex: 0, aliases: ['flyer'], sections: [{ paragraphIndex: 0, start: 23, end: 52, text: 'Track 9 closes at midnight.' }] },
    ],
  });
  harvestTurnStoryDNA(plan2, set, 'msg-2::0', 'The Rusty Anchor Tavern');
  expect(set.documents?.['doc-flyer-1']?.sections.map((s) => s.text)).toEqual(['Track 9 closes at midnight.']);
  expect(set.documents?.['doc-flyer-1']?.sourceMessageIds).toEqual(['msg-1', 'msg-2']);
});
