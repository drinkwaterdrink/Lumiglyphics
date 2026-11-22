import { expect, test } from 'bun:test';
import { isClaimGroundedInEvidence } from '../../shared/grounding.js';
import { filterStoryDnaForActiveBranch, harvestTurnStoryDNA } from './story-dna-harvester.js';
import { clampAspectCropRect, fitAspectCropRect } from '../../frontend/stage/reference-cropper.js';
import { resolveShotIntent } from './shot-director.js';
import type { StoryDNASet } from '../../shared/story-dna.js';
import type { TurnPlan } from '../../shared/contracts.js';
import type { VisualBrief } from '../../shared/image-templates.js';

test('Audit #1: isClaimGroundedInEvidence rejects negation polarity flips and swapped participants', () => {
  expect(isClaimGroundedInEvidence('Mara did not sign the ledger.', 'Mara did sign the ledger')).toBe(false);
  expect(isClaimGroundedInEvidence('Mara never signed the contract.', 'Mara signed the contract')).toBe(false);
  expect(isClaimGroundedInEvidence('Jon handed Mara the key.', 'Mara handed Jon the key')).toBe(false);
  expect(isClaimGroundedInEvidence('Jon handed Mara the key.', 'Jon handed Mara the key')).toBe(true);
  expect(isClaimGroundedInEvidence('Mara did not sign the ledger.', 'Mara did not sign the ledger')).toBe(true);
});

test('Audit #2: filterStoryDnaForActiveBranch filters thoughtCabinet, chapterCodex, and npcBeliefs across swipes', () => {
  const baseSet: StoryDNASet = {
    locations: {
      locA: { id: 'locA', name: 'Harbor', aliases: [], autoDiscovered: true, seenInSwipes: ['m1:0'], lastUpdated: 1 },
      locB: { id: 'locB', name: 'Tower', aliases: [], autoDiscovered: true, seenInSwipes: ['m1:1'], lastUpdated: 1 },
    },
    items: {
      itemA: { id: 'itemA', name: 'Compass', aliases: [], autoDiscovered: true, seenInSwipes: ['m1:0'], lastUpdated: 1 },
      itemB: { id: 'itemB', name: 'Dagger', aliases: [], autoDiscovered: true, seenInSwipes: ['m1:1'], lastUpdated: 1 },
    },
    thoughtCabinet: [
      { id: 'tc-a', title: 'Missing Letter', category: 'clue', description: 'Swipe A clue', status: 'germinating', seenInSwipes: ['m1:0'], updatedAt: 1 },
      { id: 'tc-b', title: 'Secret Vault', category: 'secret', description: 'Swipe B secret', status: 'germinating', seenInSwipes: ['m1:1'], updatedAt: 1 },
    ],
    chapterCodex: [
      { id: 'cc-a', chapterTitle: 'Ch 1A', summary: 'Harbor arrival', keyEvents: [], seenInSwipes: ['m1:0'], createdAt: 1 },
      { id: 'cc-b', chapterTitle: 'Ch 1B', summary: 'Tower climb', keyEvents: [], seenInSwipes: ['m1:1'], createdAt: 1 },
    ],
    npcBeliefs: {
      Mara: [
        { topic: 'statedGoals', belief: 'Find the harbor ship', knowsSecret: false, seenInSwipes: ['m1:0'], updatedAt: 1 },
        { topic: 'statedGoals', belief: 'Scale the tower', knowsSecret: false, seenInSwipes: ['m1:1'], updatedAt: 1 },
      ],
    },
    relationships: {},
    sceneHistory: [],
    revision: 1,
    lastUpdated: 1,
  };

  const viewA = filterStoryDnaForActiveBranch(baseSet, new Set(['m1:0']));
  expect(Object.keys(viewA.locations)).toEqual(['locA']);
  expect(Object.keys(viewA.items)).toEqual(['itemA']);
  expect(viewA.thoughtCabinet?.map((t) => t.id)).toEqual(['tc-a']);
  expect(viewA.chapterCodex?.map((c) => c.id)).toEqual(['cc-a']);
  expect(viewA.npcBeliefs?.Mara?.map((b) => b.belief)).toEqual(['Find the harbor ship']);

  const viewB = filterStoryDnaForActiveBranch(baseSet, new Set(['m1:1']));
  expect(viewB.thoughtCabinet?.map((t) => t.id)).toEqual(['tc-b']);
  expect(viewB.chapterCodex?.map((c) => c.id)).toEqual(['cc-b']);
  expect(viewB.npcBeliefs?.Mara?.map((b) => b.belief)).toEqual(['Scale the tower']);
  // Original stored set remains untouched (read-only filtering)
  expect(baseSet.thoughtCabinet).toHaveLength(2);
});

test('Audit #3 & #4: Thought Cabinet prevents cross-paragraph false closes and generates unique IDs past cap 40', () => {
  const set: StoryDNASet = {
    locations: {},
    items: {},
    relationships: {},
    sceneHistory: [],
    thoughtCabinet: [
      { id: 'tc-letter-1', title: 'Missing Letter Mystery', category: 'clue', description: 'Where is the letter?', status: 'germinating', updatedAt: 1 },
    ],
    revision: 1,
    lastUpdated: 1,
  };

  const basePlan = {
    key: { chatId: 'c1', assistantMessageId: 'm1', swipeId: 0, sourceFingerprint: 'fp1', revision: 0 },
    paragraphs: [
      { index: 0, text: 'She glanced at the missing letter envelope on the desk.' },
      { index: 1, text: 'He confessed to cheating at the tavern wager last night.' },
    ],
    paragraphSpeakers: [null, null],
    scenes: [],
    visualCues: [],
    audioCues: [],
    effectCues: [],
    choices: [],
    initialContinuity: { location: '', timeOfDay: '', weather: '', lighting: '', attire: {} },
    continuityDeltas: [],
    terminalContinuity: { location: '', timeOfDay: '', weather: '', lighting: '', attire: {} },
    planningStatus: 'planned',
    createdAt: new Date().toISOString(),
  } as unknown as TurnPlan;

  // Cross-paragraph keyword + unrelated "confessed" must NOT resolve the thread
  harvestTurnStoryDNA(basePlan, set, 'm1:0', null, { mindLedgerEnabled: true });
  expect(set.thoughtCabinet![0]!.status).toBe('internalized');

  // Same-paragraph evidence + resolution verb DOES resolve the thread
  const resolvePlan = {
    ...basePlan,
    paragraphs: [
      { index: 0, text: 'The missing letter mystery was finally solved when she opened the drawer.' },
    ],
    paragraphSpeakers: [null],
  } as unknown as TurnPlan;
  harvestTurnStoryDNA(resolvePlan, set, 'm1:0', null, { mindLedgerEnabled: true });
  expect(set.thoughtCabinet![0]!.status).toBe('resolved');

  // Adding >40 entries for the same entity must produce unique non-colliding IDs
  const bulkSet: StoryDNASet = {
    locations: {},
    items: {},
    relationships: {},
    sceneHistory: [],
    thoughtCabinet: Array.from({ length: 40 }, (_, i) => ({
      id: `tc-mara-${i + 1}`,
      title: `Mara clue ${i + 1}`,
      category: 'clue' as const,
      description: 'Clue',
      status: 'germinating' as const,
      updatedAt: 1,
    })),
    revision: 1,
    lastUpdated: 1,
  };
  const addPlan = {
    ...basePlan,
    storyReferences: [
      { kind: 'npc', name: 'Mara', field: 'significance', value: 'Brand new clue 41', evidence: 'Brand new clue 41', paragraphIndex: 0 },
      { kind: 'npc', name: 'Mara', field: 'risks', value: 'Brand new risk 42', evidence: 'Brand new risk 42', paragraphIndex: 0 },
    ],
  } as unknown as TurnPlan;
  harvestTurnStoryDNA(addPlan, bulkSet, 'm2:0', null, { mindLedgerEnabled: true });
  const ids = bulkSet.thoughtCabinet!.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('Audit #5: locked-aspect cropper preserves exact pixel aspect ratio on extreme 4000x500 images', () => {
  const fitted = fitAspectCropRect(4000, 500, '1:1');
  const pxW = Math.round(fitted.width * 4000);
  const pxH = Math.round(fitted.height * 500);
  expect(Math.abs(pxW - pxH)).toBeLessThanOrEqual(2);

  const clamped = clampAspectCropRect({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, 4000, 500, '1:1');
  const cPxW = Math.round(clamped.width * 4000);
  const cPxH = Math.round(clamped.height * 500);
  expect(Math.abs(cPxW - cPxH)).toBeLessThanOrEqual(2);
});

test('Audit #6: resolveShotIntent distinguishes quiet dialogue/observation from weapon action', () => {
  const makeBrief = (action: string): VisualBrief => ({
    scene: 'A quiet study with a glowing hearth.',
    subjects: 'Mara, silver hair.',
    action,
    composition: 'portrait, one visible character',
    lighting: 'Warm firelight.',
    subjectMode: 'one',
    framing: 'portrait',
    referencePolicy: 'character',
    sources: ['test'],
    conflicts: [],
  });

  expect(resolveShotIntent(makeBrief('She draws a breath and whispers his name.'))).toBe('dialogue');
  expect(resolveShotIntent(makeBrief('Her eyes settle on the fire.'))).toBe('portrait');
  expect(resolveShotIntent(makeBrief('She draws a sword in the doorway.'))).toBe('action');
});
