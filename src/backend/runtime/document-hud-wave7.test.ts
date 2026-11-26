import { describe, expect, test } from 'bun:test';
import { DEFAULT_CONFIG } from '../../config.js';
import { atmosphereForPosition } from '../../shared/scene-atmosphere.js';
import { TurnPlanSchema } from '../../shared/contracts.js';
import { extractProseAtmosphereDelta, prepareNarrative } from '../core/paragraphs.js';
import { buildDocumentPropPromptInput, generateDocumentPropArtwork } from './document-art.js';
import { extractSimTracker } from './simtracker.js';

function baseTurnPlan() {
  return TurnPlanSchema.parse({
    schemaVersion: 1,
    key: {
      chatId: 'chat-w7',
      assistantMessageId: 'msg-1',
      swipeId: 0,
      sourceFingerprint: 'fp-w7-document',
      revision: 1,
    },
    paragraphs: [
      { index: 0, sourceIndex: 0, text: 'A crumpled flyer catches against your boot on the wet flagstones.' },
      { index: 1, sourceIndex: 1, text: 'Purple ink bleeds across the damp paper, smearing a hand-drawn map.' },
      { index: 2, sourceIndex: 2, text: 'At the bottom, legible text reads: "Meet at Pier 9."' },
    ],
    paragraphSpeakers: [null, null, null],
    scenes: [{
      sceneId: 'scene-1',
      revision: 1,
      startParagraph: 0,
      environment: {
        location: 'Gallowsmere Terminus platform',
        timeOfDay: 'night',
        weather: 'steady cold rain',
        lighting: 'dim platform lamps casting copper streaks',
        description: 'Iron-ribbed covered arcade with wet dark flagstones in steady rain.',
        persistentElements: ['wet flagstones', 'station lamps'],
      },
      cast: [],
      character: null,
      attire: null,
      continuity: { revision: 1, characters: {} },
      basePrompt: 'station platform, rain, dim copper lamps',
      identityPrompt: null,
      cameraLock: {
        framing: 'wide',
        angle: 'eye level',
        perspective: 'straight-on',
        lens: null,
        subjectAnchor: 'scene',
        horizon: 'upper third',
        safeDialogueRegion: 'bottom quarter',
        aspectRatio: '16:9',
      },
      compositionLock: 'centered',
      activeAssetId: null,
      priorSceneId: null,
    }],
    visualCues: [],
    audioCues: [],
    effectCues: [],
    choices: [],
    initialContinuity: { revision: 1, characters: {} },
    continuityDeltas: [],
    terminalContinuity: { revision: 1, characters: {} },
    storyDocuments: [{
      id: 'document-1',
      name: 'crumpled flyer',
      kind: 'flyer',
      paragraphIndex: 0,
      aliases: ['flyer', 'damp paper'],
      visualDetails: 'crumpled, purple ink bleeding',
      observations: [
        { paragraphIndex: 0, condition: 'crumpled', evidence: 'A crumpled flyer catches against your boot on the wet flagstones.' },
        { paragraphIndex: 1, summary: 'purple ink; hand-drawn map', material: 'damp paper', evidence: 'Purple ink bleeds across the damp paper, smearing a hand-drawn map.' },
      ],
      sections: [
        { paragraphIndex: 2, start: 35, end: 51, text: 'Meet at Pier 9.' },
      ],
    }],
    planningStatus: 'planned',
    createdAt: new Date().toISOString(),
  });
}

describe('Wave 7 Council B & C: Prop Art Gating + World Clock/Weather Telemetry', () => {
  test('buildDocumentPropPromptInput enforces strict anti-spoiler cutoff by paragraphIndex', () => {
    const plan = baseTurnPlan();
    const doc = plan.storyDocuments![0]!;

    const atP1 = buildDocumentPropPromptInput({ doc, plan, throughParagraphIndex: 1, config: DEFAULT_CONFIG });
    expect(atP1.prompt.toLowerCase()).toContain('crumpled flyer');
    expect(atP1.prompt.toLowerCase()).toContain('purple ink');
    expect(atP1.prompt).not.toContain('Meet at Pier 9');

    const atP2 = buildDocumentPropPromptInput({ doc, plan, throughParagraphIndex: 2, config: DEFAULT_CONFIG });
    expect(atP2.prompt).toContain('Meet at Pier 9');
    expect(atP2.contentHash).not.toBe(atP1.contentHash);
  });

  test('extractSimTracker extracts clock time, date, unit-preserved temperature, and weather + supports custom paths', () => {
    const msg = {
      id: 'm1',
      content: `<tracker>
worldData:
  location: Station Platform
  time: "21:48"
  date: "October 14"
  temperature: "54°F"
  weather: "Steady cold rain"
  nested:
    celsius: "12°C"
characters: []
</tracker>`,
    };
    const ev = extractSimTracker([msg], 'm1');
    expect(ev.status).toBe('detected');
    expect(ev.worldAtmosphere).toEqual({
      source: 'simtracker',
      time: '21:48',
      date: 'October 14',
      temperature: '54°F',
      weather: 'Steady cold rain',
    });

    const mapped = extractSimTracker([msg], 'm1', {
      identity: [],
      world: [],
      attire: [],
      sceneState: [],
      time: [],
      date: [],
      temperature: ['nested.celsius'],
      weather: [],
    });
    expect(mapped.worldAtmosphere?.temperature).toBe('12°C');
  });

  test('extractProseAtmosphereDelta ignores quoted speech and detects narration time/temp/weather', () => {
    const quotedOnly = '"It was 95°F yesterday at 3:15 PM in a thunderstorm," she joked.';
    expect(extractProseAtmosphereDelta(quotedOnly)).toEqual({});

    const narrated = 'By 10:15 PM on Friday, heavy rain rattled the eaves as the air fell to 11°C.';
    const delta = extractProseAtmosphereDelta(narrated);
    expect(delta.time).toBe('10:15 PM');
    expect(delta.date).toBe('Friday');
    expect(delta.temperature).toBe('11°C');
    expect(delta.weather).toBe('Heavy rain');
  });

  test('extractDetectedSceneMetadata extracts [Time/Date/Temp] header tags cleanly', () => {
    const prepared = prepareNarrative('[Time: 9:48 PM | Date: Oct 14 | Temp: 54°F | Weather: Rain]\n\nThe train pulls in.');
    expect(prepared.detectedSceneMetadata?.time).toBe('9:48 PM');
    expect(prepared.detectedSceneMetadata?.date).toBe('Oct 14');
    expect(prepared.detectedSceneMetadata?.temperature).toBe('54°F');
    expect(prepared.detectedSceneMetadata?.weather).toBe('Rain');
  });

  test('atmosphereForPosition replays timeline accurately and returns null when empty', () => {
    expect(atmosphereForPosition({}, 0)).toBeNull();
    const entries = [
      { paragraphIndex: 0, time: '9:48 PM', weather: 'Rain', temperature: '54°F' },
      { paragraphIndex: 2, time: '10:05 PM', indoor: true },
    ];
    expect(atmosphereForPosition({ worldAtmosphere: entries }, 1)?.time).toBe('9:48 PM');
    const at2 = atmosphereForPosition({ worldAtmosphere: entries }, 2);
    expect(at2?.time).toBe('10:05 PM');
    expect(at2?.weather).toBe('Rain');
    expect(at2?.indoor).toBe(true);
  });

  test('generateDocumentPropArtwork forwards userId to operator-scoped imageGen & storage APIs', async () => {
    const plan = baseTurnPlan();
    let seenGenerateInput: Record<string, unknown> | undefined;
    let seenListUserId: string | undefined;
    let seenStorageUserId: string | undefined;
    const mockSpindle = {
      userStorage: {
        getJson: async () => null,
        setJson: async (_path: string, _val: unknown, opts?: { userId?: string }) => {
          seenStorageUserId = opts?.userId;
        },
      },
      imageGen: {
        listConnections: async (userId?: string) => {
          seenListUserId = userId;
          return [{ id: 'conn-default', provider: 'openai', model: 'gpt-image-1', is_default: true }];
        },
        generate: async (req: Record<string, unknown>) => {
          seenGenerateInput = req;
          return { imageId: 'img-doc-1', imageDataUrl: 'data:image/png;base64,AA==', model: 'gpt-image-1', provider: 'openai' };
        },
      },
      images: {
        get: async () => null,
      },
    } as never;

    const res = await generateDocumentPropArtwork({
      spindle: mockSpindle,
      chatId: 'chat-w7',
      plan,
      documentId: 'document-1',
      throughParagraphIndex: 1,
      userId: 'user-operator-42',
    });

    expect(res.imageId).toBe('img-doc-1');
    expect(seenListUserId).toBe('user-operator-42');
    expect(seenGenerateInput?.userId).toBe('user-operator-42');
    expect(seenGenerateInput?.connection_id).toBe('conn-default');
    expect(seenStorageUserId).toBe('user-operator-42');
  });
});
