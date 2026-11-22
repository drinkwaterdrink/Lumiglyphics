import { expect, test } from 'bun:test';
import { DEFAULT_CONFIG } from '../../config.js';
import { buildDocumentPropPromptInput, generateDocumentPropArtwork, generateItemPropArtwork } from './document-art.js';
import { renderEntityStockIcon } from '../../frontend/stage/entity-icons.js';
import type { TurnPlan } from '../../shared/contracts.js';

function makePlan(): TurnPlan {
  return {
    schemaVersion: 1,
    key: { chatId: 'chat-doc', assistantMessageId: 'msg-1', swipeId: 0, sourceFingerprint: 'fp12345678', revision: 0 },
    paragraphs: [{ id: 'p0', index: 0, sourceIndex: 0, text: 'She opened the leather ledger on the counter.' }],
    paragraphSpeakers: [null],
    scenes: [
      {
        sceneId: 's1',
        revision: 0,
        startParagraph: 0,
        cast: [],
        environment: {
          location: 'Marten House',
          timeOfDay: 'evening',
          weather: 'rain',
          lighting: 'warm lamp light',
          description: 'A quiet study.',
          persistentElements: [],
        },
      },
    ],
    visualCues: [],
    audioCues: [],
    effectCues: [],
    choices: [],
    initialContinuity: { location: 'Marten House', timeOfDay: 'evening', weather: 'rain', lighting: 'warm lamp light', attire: {} },
    continuityDeltas: [],
    terminalContinuity: { location: 'Marten House', timeOfDay: 'evening', weather: 'rain', lighting: 'warm lamp light', attire: {} },
    planningStatus: 'planned',
    createdAt: new Date().toISOString(),
  } as unknown as TurnPlan;
}

test('Document prompt builder uses straight-on deep-focus flat-lay framing and legible text directives', () => {
  const plan = makePlan();
  const built = buildDocumentPropPromptInput({
    doc: {
      id: 'doc-ledger-1',
      name: 'Harbor Ledger',
      kind: 'journal',
      paragraphIndex: 0,
      sections: [{ paragraphIndex: 0, text: 'Oct 14 — Crate #9: 400 silver' }],
      visualDetails: 'inked columns on cream paper',
    },
    plan,
    throughParagraphIndex: 0,
    config: DEFAULT_CONFIG,
  });

  expect(built.prompt.toLowerCase()).toContain('flat-lay');
  expect(built.prompt).toContain('Oct 14 — Crate #9: 400 silver');
  expect(built.prompt.toLowerCase()).not.toContain('shallow depth of field');
  expect(built.negativePrompt?.toLowerCase()).toContain('closed book');
});

test('generateDocumentPropArtwork falls back to StoryDNASet.documents for earlier-turn docs and uses documentImageModel override', async () => {
  const sent: any[] = [];
  const store: Record<string, unknown> = {
    'config.json': { ...DEFAULT_CONFIG, documentImageModel: 'ideogram-v4', imageModel: 'anime-v1' },
    'chats/chat-doc/story-dna.json': {
      locations: {},
      items: {},
      documents: {
        'doc-map-04ca4fae': {
          id: 'doc-map-04ca4fae',
          name: 'Folded Timetable',
          kind: 'map',
          sections: [{ paragraphIndex: 0, text: 'Train 04:15 -> North Pier' }],
          visualDetails: 'folded schedule',
          lastUpdated: 1,
        },
      },
      revision: 1,
    },
  };

  const spindle: any = {
    userStorage: {
      getJson: async (path: string, opts?: { fallback?: unknown }) => (path in store ? structuredClone(store[path]) : (opts?.fallback ?? null)),
      setJson: async (path: string, val: unknown) => { store[path] = structuredClone(val); },
    },
    imageGen: {
      generate: async (req: any) => { sent.push(req); return { imageId: 'doc-img-99' }; },
    },
  };

  const res = await generateDocumentPropArtwork({
    spindle,
    chatId: 'chat-doc',
    plan: makePlan(), // does NOT contain doc-map-04ca4fae directly
    documentId: 'doc-map-04ca4fae',
    throughParagraphIndex: 0,
    userId: 'u1',
  });

  expect(res.imageId).toBe('doc-img-99');
  expect(res.imageUrl).toBe('/api/v1/images/doc-img-99');
  expect(sent).toHaveLength(1);
  expect(sent[0].model).toBe('ideogram-v4');
  expect(sent[0].prompt).toContain('Train 04:15 -> North Pier');
});

test('generateItemPropArtwork renders artifact art and persists referenceImageUrl on ItemDNA', async () => {
  const sent: any[] = [];
  const store: Record<string, unknown> = {
    'config.json': DEFAULT_CONFIG,
    'chats/chat-doc/story-dna.json': {
      locations: {},
      items: {
        'flaming-longsword': {
          id: 'flaming-longsword',
          name: 'Flaming Longsword',
          aliases: ['Emberblade'],
          description: 'A runed steel blade wreathed in bright orange flames.',
          distinctiveFeatures: ['glowing fuller', 'charred leather hilt'],
          colors: ['orange', 'obsidian'],
          autoDiscovered: false,
          lastUpdated: 1,
        },
      },
      revision: 1,
    },
  };

  const spindle: any = {
    userStorage: {
      getJson: async (path: string, opts?: { fallback?: unknown }) => (path in store ? structuredClone(store[path]) : (opts?.fallback ?? null)),
      setJson: async (path: string, val: unknown) => { store[path] = structuredClone(val); },
    },
    imageGen: {
      generate: async (req: any) => { sent.push(req); return { imageId: 'sword-art-42' }; },
    },
  };

  const updated = await generateItemPropArtwork({
    spindle,
    chatId: 'chat-doc',
    itemId: 'flaming-longsword',
    userId: 'u1',
  });

  expect(sent).toHaveLength(1);
  expect(sent[0].prompt).toContain('Flaming Longsword');
  expect(updated.items['flaming-longsword']?.referenceImageUrl).toBe('/api/v1/images/sword-art-42');
});

test('renderEntityStockIcon emits valid duotone SVG icons for all entity and document kinds', () => {
  for (const [kind, sub] of [
    ['npc', ''],
    ['place', ''],
    ['object', 'Flaming Longsword'],
    ['object', 'Brass Key'],
    ['document', 'journal'],
    ['document', 'map'],
    ['document', 'phone'],
    ['document', 'letter'],
    ['thread', ''],
  ] as const) {
    const svg = renderEntityStockIcon(kind, sub);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('viewBox="0 0 24 24"');
  }
});
