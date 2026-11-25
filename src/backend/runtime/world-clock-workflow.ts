import type { SpindleAPI } from 'lumiverse-spindle-types';
import { swipeTurnTag } from '../../shared/character-dna.js';
import type { StoryDnaRequest } from '../../shared/story-dna.js';
import { visibleClockProgress } from '../../shared/world-clocks.js';
import { activeBranchSwipeTags } from './character-dna-workflow.js';
import { fingerprintForMessage } from './planner.js';
import { filterStoryDnaForActiveBranch, sameLoreSource } from './story-dna-projection.js';
import { mutateStoryDNASet } from './story-dna-store.js';
import { loadChatState, loadReadingPosition, loadTurnRecord } from './storage.js';

type ClockRequest = Extract<StoryDnaRequest, { action: 'world_clock' }>;
type HostMessages = Awaited<ReturnType<SpindleAPI['chat']['getMessages']>>;

export function clockFingerprints(messages: HostMessages): ReadonlyMap<string, string> {
  const sources = new Map<string, string>();
  for (const message of messages) {
    if (message.is_user || message.role === 'system') continue;
    sources.set(swipeTurnTag(message.id, message.swipe_id), fingerprintForMessage(message));
  }
  return sources;
}

export async function applyWorldClock(spindle: SpindleAPI, request: ClockRequest, userId: string) {
  const { chatId, command, requestId, readingPosition: position } = request;
  if (!await spindle.chats.get(chatId, userId)) throw new Error('This chat is unavailable.');
  return mutateStoryDNASet(spindle, chatId, userId, undefined, async set => {
    const ledger = set.worldClocks ?? { clocks: [], events: [] };
    if (command.kind === 'create') {
      if (ledger.clocks.some(clock => clock.id === requestId)) return false;
      if (ledger.clocks.length >= 24) throw new Error('This chat has reached its 24-clock limit.');
      ledger.clocks.push({ id: requestId, ...command.clock, paused: false });
      set.worldClocks = ledger;
      return;
    }
    const clock = ledger.clocks.find(entry => entry.id === command.clockId);
    if (!clock) throw new Error('This clock is unavailable.');
    if (command.kind === 'pause') {
      if (clock.paused === command.paused) return false;
      clock.paused = command.paused;
      return;
    }
    if (ledger.events.some(event => event.id === requestId)) return false;
    if (command.kind === 'advance' && clock.paused) throw new Error('Resume this clock before recording progress.');
    if (command.kind === 'correct' && command.value > clock.steps) throw new Error('Enter progress within this clock’s range.');
    if (!position || position.key.chatId !== chatId) throw new Error('Open a prepared passage before updating progress.');
    const [state, savedPosition] = await Promise.all([
      loadChatState(spindle, chatId, userId), loadReadingPosition(spindle, chatId, userId),
    ]);
    const record = await loadTurnRecord(spindle, state.activeTurnPath, userId);
    if (!savedPosition || !sameLoreSource(savedPosition.key, position.key) ||
      savedPosition.paragraphIndex !== position.paragraphIndex || record?.status !== 'ready' ||
      !sameLoreSource(record.plan.key, position.key) || position.paragraphIndex >= record.plan.paragraphs.length) {
      throw new Error('The passage changed. Reopen it before updating progress.');
    }
    const messages = await spindle.chat.getMessages(chatId);
    const fingerprints = clockFingerprints(messages);
    const tag = swipeTurnTag(position.key.assistantMessageId, Number(position.key.swipeId ?? 0));
    const rawFingerprint = fingerprints.get(tag);
    if (!rawFingerprint || rawFingerprint !== (record.source?.rawFingerprint ?? record.plan.key.sourceFingerprint)) {
      throw new Error('The source reply changed. Reopen the current passage.');
    }
    if (command.kind === 'advance' && ledger.events.some(event => event.kind === 'advance' &&
      event.clockId === clock.id && event.position.key.assistantMessageId === position.key.assistantMessageId &&
      event.rawFingerprint === rawFingerprint && event.position.paragraphIndex === position.paragraphIndex)) {
      throw new Error('This passage already contributed to this clock. Use Correct progress to adjust it.');
    }
    const visible = filterStoryDnaForActiveBranch(set, activeBranchSwipeTags(messages), position, fingerprints).worldClocks;
    if (command.kind === 'advance' && visible && visibleClockProgress(visible, clock.id) >= clock.steps) {
      throw new Error('This clock is complete. Use Correct progress to reopen it.');
    }
    if (ledger.events.length >= 512) throw new Error('This chat has reached its clock history limit. Existing progress was preserved.');
    ledger.events.push({
      id: requestId, clockId: clock.id, position, rawFingerprint, kind: command.kind,
      value: command.kind === 'advance' ? 1 : command.value, note: command.note,
    });
  });
}
