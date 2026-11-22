import { expect, test } from 'bun:test';
import type { SpindleAPI } from 'lumiverse-spindle-types';
import type { TurnPlan } from '../../shared/contracts.js';
import { harvestTurnStoryDNA } from './story-dna-harvester.js';
import { loadStoryDNASet, mutateStoryDNASet } from './story-dna-store.js';

const locked = { id: 'keep', name: 'Keep', locked: true, notes: 'Authored note' };

function fixture(initial: unknown, exists = initial !== null) {
  let raw = initial;
  let writes = 0;
  const spindle = { userStorage: {
    getJson: async () => structuredClone(raw),
    stat: async () => ({ exists }),
    setJson: async (_path: string, value: unknown) => { writes++; raw = structuredClone(value); exists = true; },
  } } as unknown as SpindleAPI;
  return { spindle, saved: () => raw, writes: () => writes };
}

test('an unreadable stored library cannot be replaced by a mutation', async () => {
  const raw = { revision: 9, locations: { keep: locked, bad: { id: 'bad', name: 'x'.repeat(161) } }, items: {} };
  const f = fixture(raw);
  await expect(loadStoryDNASet(f.spindle, 'chat', 'user')).rejects.toThrow('Story DNA');
  await expect(mutateStoryDNASet(f.spindle, 'chat', 'user', undefined, () => {})).rejects.toThrow('Story DNA');
  expect(f.writes()).toBe(0);
  expect(f.saved()).toEqual(raw);
});

test('invalid mutation output is rejected without losing a valid legacy library', async () => {
  const raw = { revision: 9, locations: { keep: locked }, items: {} };
  const f = fixture(raw);
  await expect(mutateStoryDNASet(f.spindle, 'chat', 'user', undefined, set => {
    set.locations.keep!.name = 'x'.repeat(161);
  })).rejects.toThrow('Story DNA');
  expect(f.writes()).toBe(0);
  expect(f.saved()).toEqual(raw);
  const next = await mutateStoryDNASet(f.spindle, 'chat', 'user', 9, set => {
    set.locations.keep!.notes = 'Revised note';
  });
  expect(next.revision).toBe(10);
  expect(next.locations.keep).toMatchObject({ locked: true, notes: 'Revised note' });
});

test('only a missing file starts a new library when the read returns null', async () => {
  const missing = fixture(null);
  expect(await loadStoryDNASet(missing.spindle, 'chat', 'user')).toEqual({ revision: 0, locations: {}, items: {} });
  expect((await mutateStoryDNASet(missing.spindle, 'chat', 'user', 0, () => {})).revision).toBe(1);
  const present = fixture(null, true);
  await expect(mutateStoryDNASet(present.spindle, 'chat', 'user', undefined, () => {})).rejects.toThrow('Story DNA');
  expect(present.writes()).toBe(0);
});

test('harvesting an overlong location leaves valid locations readable', async () => {
  const f = fixture({ revision: 9, locations: { keep: locked }, items: {} });
  const plan = { paragraphs: [], visualCues: [], scenes: [{ environment: { location: 'x'.repeat(161) } }, {
    environment: { location: 'Library' },
  }] } as unknown as TurnPlan;
  await mutateStoryDNASet(f.spindle, 'chat', 'user', 9, set => {
    harvestTurnStoryDNA(plan, set, 'm1::0');
  });
  const saved = await loadStoryDNASet(f.spindle, 'chat', 'user');
  expect(saved.revision).toBe(10);
  expect(Object.values(saved.locations).map(loc => loc.name).sort()).toEqual(['Keep', 'Library']);
  expect(saved.locations.keep).toMatchObject(locked);
});

test('a failed storage write does not consume the revision or block retry', async () => {
  const f = fixture({ revision: 9, locations: { keep: locked }, items: {} });
  const storage = f.spindle.userStorage;
  const save = storage.setJson;
  storage.setJson = async () => { throw new Error('Storage offline'); };
  const edit = () => mutateStoryDNASet(f.spindle, 'chat', 'user', 9, set => {
    set.locations.keep!.notes = 'New note';
  });
  await expect(edit()).rejects.toThrow('Storage offline');
  expect((await loadStoryDNASet(f.spindle, 'chat', 'user')).revision).toBe(9);
  storage.setJson = save;
  expect((await edit()).revision).toBe(10);
  expect((await loadStoryDNASet(f.spindle, 'chat', 'user')).locations.keep!.notes).toBe('New note');
});

test('scoped saves preserve Phase 1-readable authored data at the same revision', async () => {
  const files = new Map<string, unknown>();
  const spindle = { userStorage: {
    getJson: async (path: string) => files.get(path) ?? null,
    setJson: async (path: string, value: unknown) => { files.set(path, structuredClone(value)); },
  } } as unknown as SpindleAPI;
  const key = { chatId: 'chat', assistantMessageId: 'm1', sourceFingerprint: 'document-1', swipeId: 0, revision: 0 };
  const saved = await mutateStoryDNASet(spindle, 'chat', 'user', 0, set => {
    set.loreHeads = [key];
    set.thoughtCabinet = [{ id: 'mine', title: 'My thread', description: 'My note', authored: true,
      category: 'goal', status: 'active', updatedAt: 0 }];
  });
  const rollback = files.get('chats/chat/story-dna.phase1-backup.json') as Record<string, unknown>;
  expect(rollback.revision).toBe(saved.revision);
  expect(rollback.loreHeads).toBeUndefined();
  expect(rollback.thoughtCabinet).toEqual([{ id: 'mine', title: 'My thread', description: 'My note',
    category: 'goal', status: 'active', updatedAt: 0 }]);
});
