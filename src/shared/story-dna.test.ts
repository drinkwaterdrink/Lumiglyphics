import { test, expect } from 'bun:test';
import {
  LocationDNASchema,
  ItemDNASchema,
  StoryDNASetSchema,
  createLocationId,
  createItemId,
  findMatchingLocation,
  findMatchingItem,
  formatLocationDNAToPromptClause,
  formatItemDNAToPromptClause,
  type LocationDNA,
  type ItemDNA
} from './story-dna.js';

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
