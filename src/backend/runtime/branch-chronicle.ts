import type { SpindleAPI } from 'lumiverse-spindle-types';
import type { TurnView } from '../../protocol.js';
import {
  BranchChronicleRequestSchema, BranchChronicleResultSchema,
  type BranchChronicleRequest, type BranchChronicleResult, type ChronicleSide,
} from '../../shared/branch-chronicle.js';
import { samePresentationTurn } from '../../shared/presentation-entities.js';
import type { ReadingPosition } from '../../shared/reading-position.js';
import { sceneHistoryFor } from '../../shared/scene-history.js';
import type { TurnKey } from '../../shared/turn-key.js';
import { fingerprintForMessage } from './planner.js';
import {
  loadChronicle, loadConfig, loadReadingPosition, loadTurnRecord, turnPath, updateChronicle,
  type StoredTurnRecord,
} from './storage.js';

type HostMessage = Awaited<ReturnType<SpindleAPI['chat']['getMessages']>>[number];
type Source = { status: 'missing' | 'changed' } | {
  status: 'ready'; record: StoredTurnRecord; replyNumber: number; swipeTimestamp?: number;
};

function sameStoredTurn(stored: TurnKey, expected: TurnKey): boolean {
  return String(stored.swipeId ?? 0) === String(expected.swipeId ?? 0)
    && samePresentationTurn({ ...stored, swipeId: expected.swipeId }, expected);
}

function chronicleSource(
  position: ReadingPosition, record: StoredTurnRecord | null, messages: readonly HostMessage[],
  bookmarkedTimestamp?: number,
): Source {
  const { key, paragraphIndex } = position;
  const replyIndex = messages.findIndex(message => message.id === key.assistantMessageId);
  const message = messages[replyIndex];
  if (!message || !record) return { status: 'missing' };
  if (!sameStoredTurn(record.plan.key, key) || record.status !== 'ready'
    || paragraphIndex >= record.plan.paragraphs.length) return { status: 'changed' };

  const swipeId = Number(key.swipeId ?? 0);
  if (!Number.isSafeInteger(swipeId) || swipeId < 0) return { status: 'changed' };
  const content = swipeId === message.swipe_id ? message.content : message.swipes?.[swipeId];
  if (typeof content !== 'string') return { status: 'missing' };
  const timestamp = message.swipe_dates?.[swipeId];
  const swipeTimestamp = typeof timestamp === 'number' && Number.isSafeInteger(timestamp) && timestamp >= 0 ? timestamp : undefined;
  if (bookmarkedTimestamp !== undefined && swipeTimestamp !== undefined && swipeTimestamp !== bookmarkedTimestamp) {
    return { status: 'changed' };
  }
  const fingerprint = fingerprintForMessage({ id: message.id, swipe_id: swipeId, content });
  if (fingerprint !== (record.source?.rawFingerprint ?? key.sourceFingerprint)) return { status: 'changed' };
  return { status: 'ready', record, replyNumber: replyIndex + 1, ...(swipeTimestamp === undefined ? {} : { swipeTimestamp }) };
}

function snapshot(source: Source, position: ReadingPosition, viewFor: (record: StoredTurnRecord) => TurnView, showChoices: boolean): ChronicleSide {
  if (source.status !== 'ready') return { status: source.status };
  const { record } = source;
  const through = position.paragraphIndex;
  const view = viewFor(record);
  const history = sceneHistoryFor(view, through);
  const pictures = record.jobs.flatMap(job =>
    job.paragraphIndex <= through && job.imageId && (job.status === 'browser_ready' || job.status === 'generated')
      && sameStoredTurn(job.ownerTurnKey, position.key)
      ? [{ passage: job.paragraphIndex + 1, provider: job.provider.slice(0, 256), imageId: job.imageId.slice(0, 256) }]
      : [],
  );
  return {
    status: 'ready',
    passage: (view.paragraphs[through] ?? '').slice(0, 4000),
    facts: [...new Set(history?.events.map(event => event.label.slice(0, 1000)) ?? [])],
    completeFacts: Boolean(history && !history.unavailable && !history.truncated),
    choices: showChoices && through === view.paragraphs.length - 1
      ? view.choices.slice(0, 32).map(choice => ({ label: choice.label.slice(0, 512), locked: Boolean(choice.disabled) }))
      : [],
    pictures: pictures.slice(0, 128),
    morePictures: pictures.length > 128,
  };
}

export async function readBranchChronicle(
  api: SpindleAPI, input: BranchChronicleRequest, userId: string,
  viewFor: (record: StoredTurnRecord) => TurnView,
): Promise<BranchChronicleResult> {
  const request = BranchChronicleRequestSchema.parse(input);
  const { chatId } = request;
  if (!await api.chats.get(chatId, userId)) throw new Error('This chat is unavailable.');
  const readRecord = ({ key }: ReadingPosition) =>
    loadTurnRecord(api, turnPath(chatId, key.assistantMessageId, key.swipeId), userId);
  const readMessages = async () =>
    (await api.chat.getMessages(chatId)).filter(message => !message.is_user && message.role !== 'system');

  switch (request.action) {
    case 'list':
      return { bookmarks: (await loadChronicle(api, chatId, userId)).bookmarks };
    case 'remove': {
      const saved = await updateChronicle(api, chatId, userId, document => {
        const bookmarks = document.bookmarks.filter(bookmark => bookmark.id !== request.bookmarkId);
        return bookmarks.length === document.bookmarks.length ? document : { ...document, bookmarks };
      });
      return { bookmarks: saved.bookmarks };
    }
    case 'bookmark': {
      const { position } = request;
      const current = await loadReadingPosition(api, chatId, userId);
      if (position.key.chatId !== chatId || !current || !samePresentationTurn(current.key, position.key)
        || current.paragraphIndex !== position.paragraphIndex) {
        throw new Error('The reading position changed. Reopen History from the passage and try again.');
      }
      const record = await readRecord(position);
      const messages = await readMessages();
      const source = chronicleSource(position, record, messages);
      if (source.status !== 'ready' || messages[source.replyNumber - 1]?.swipe_id !== Number(position.key.swipeId ?? 0)) {
        throw new Error('This passage no longer matches the active reply.');
      }
      const saved = await updateChronicle(api, chatId, userId, document => {
        if (document.bookmarks.some(bookmark => bookmark.id === request.requestId
          || (samePresentationTurn(bookmark.position.key, position.key) && bookmark.position.paragraphIndex === position.paragraphIndex))) {
          return document;
        }
        if (document.bookmarks.length >= 100) throw new Error('This chat has 100 bookmarks. Remove one to add another.');
        const bookmark = {
          id: request.requestId, position, replyNumber: source.replyNumber,
          ...(source.swipeTimestamp === undefined ? {} : { swipeTimestamp: source.swipeTimestamp }),
        };
        return { ...document, bookmarks: [bookmark, ...document.bookmarks] };
      });
      return { bookmarks: saved.bookmarks };
    }
    case 'compare': {
      const { bookmarks } = await loadChronicle(api, chatId, userId);
      const first = bookmarks.find(bookmark => bookmark.id === request.firstId);
      const second = bookmarks.find(bookmark => bookmark.id === request.secondId);
      if (!first || !second || first === second) throw new Error('Choose two distinct saved bookmarks.');
      const [firstRecord, secondRecord, config] = await Promise.all([
        readRecord(first.position), readRecord(second.position), loadConfig(api, userId),
      ]);
      const messages = await readMessages();
      const showChoices = config.mode === 'cyoa';
      return BranchChronicleResultSchema.parse({
        bookmarks,
        comparison: [
          snapshot(chronicleSource(first.position, firstRecord, messages, first.swipeTimestamp), first.position, viewFor, showChoices),
          snapshot(chronicleSource(second.position, secondRecord, messages, second.swipeTimestamp), second.position, viewFor, showChoices),
        ],
      });
    }
  }
}
