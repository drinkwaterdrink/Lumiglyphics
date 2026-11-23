import { reviewStoryAutofill, type ReadAutofillScope } from "./story-dna-autofill-review.js";
import type { SpindleAPI } from 'lumiverse-spindle-types';
import {
  type StoryDNASet,
  StoryDnaRequestSchema,
  type StoryDnaRequest,
  scrubStoryDNASwipes,
} from '../../shared/story-dna.js';
import {
  loadStoryDNASet,
  saveLocationDNA,
  saveItemDNA,
  deleteLocationDNA,
  deleteItemDNA,
  restoreLocationDNA,
  restoreItemDNA,
  mergeLocationDNA,
  mergeItemDNA,
  toggleLocationRoute,
  saveStoryThread,
  deleteStoryThread,
  saveDocumentTranscriptNote,
  addCustomLexiconTerm,
  mutateStoryDNASet,
} from './story-dna-store.js';
import { activeBranchSwipeTags, activeMessageSwipeMap } from './character-dna-workflow.js';
import { generateItemPropArtwork } from './document-art.js';
import { loadReadingPosition, loadTurnRecord, turnPath } from './storage.js';
import { sameLoreSource } from './story-dna-projection.js';
import {
  autofillItemDNA,
  autofillLocationDNA,
  filterStoryDnaForActiveBranch,
} from './story-dna-harvester.js';

export { StoryDnaRequestSchema, type StoryDnaRequest };

export async function handleStoryDnaRequest(
  spindle: SpindleAPI,
  rawRequest: unknown,
  userId: string,
  readAutofillScope?: ReadAutofillScope,
): Promise<void> {
  const request = StoryDnaRequestSchema.parse(rawRequest);
  const reply = async (storyDna: StoryDNASet) => {
    const msgs = typeof spindle.chat?.getMessages === 'function'
      ? await spindle.chat.getMessages(request.chatId).catch(() => [])
      : [];
    const position = request.action === 'list' && request.readingPosition
      ? request.readingPosition : await loadReadingPosition(spindle, request.chatId, userId);
    const branch = activeBranchSwipeTags(msgs);
    if (position) {
      const key = position.key;
      const record = key.chatId === request.chatId
        ? await loadTurnRecord(spindle, turnPath(request.chatId, key.assistantMessageId, key.swipeId), userId).catch(() => null)
        : null;
      if (!record || !sameLoreSource(record.plan.key, key)) branch.clear();
    }
    const filtered = filterStoryDnaForActiveBranch(storyDna, branch, position ?? undefined);
    spindle.sendToFrontend({
      type: 'vn_story_dna',
      chatId: request.chatId,
      requestId: request.requestId,
      storyDna: filtered,
    }, userId);
  };

  try {
    if (request.action === 'review_autofill' || request.action === 'apply_autofill') {
      if (!readAutofillScope) throw new Error('Open a prepared reply before running autofill.');
      const proposal = await reviewStoryAutofill(spindle, request, userId, readAutofillScope);
      spindle.sendToFrontend({
        type: 'vn_story_autofill', chatId: request.chatId, requestId: request.requestId,
        result: proposal ? { proposal } : { saved: true },
      }, userId);
      return;
    }
    if (request.action === 'list') {
      const storyDna = await loadStoryDNASet(spindle, request.chatId, userId);
      await reply(storyDna);
      return;
    }
    if (request.action === 'save_location') {
      const storyDna = await saveLocationDNA(spindle, request.chatId, request.location, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'save_item') {
      const storyDna = await saveItemDNA(spindle, request.chatId, request.item, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'delete_location') {
      const storyDna = await deleteLocationDNA(spindle, request.chatId, request.locationId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'delete_item') {
      const storyDna = await deleteItemDNA(spindle, request.chatId, request.itemId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'restore_location') {
      const storyDna = await restoreLocationDNA(spindle, request.chatId, request.locationId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'restore_item') {
      const storyDna = await restoreItemDNA(spindle, request.chatId, request.itemId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'merge_location') {
      const storyDna = await mergeLocationDNA(spindle, request.chatId, request.sourceId, request.targetId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'merge_item') {
      const storyDna = await mergeItemDNA(spindle, request.chatId, request.sourceId, request.targetId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'toggle_route') {
      const storyDna = await toggleLocationRoute(spindle, request.chatId, request.fromLocationId, request.toLocationId, request.connected, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'save_thread') {
      const storyDna = await saveStoryThread(spindle, request.chatId, request.thread, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'delete_thread') {
      const storyDna = await deleteStoryThread(spindle, request.chatId, request.threadId, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'save_document_note') {
      const storyDna = await saveDocumentTranscriptNote(spindle, request.chatId, {
        documentId: request.documentId,
        name: request.name,
        kind: request.kind,
        note: request.note,
      }, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'add_custom_lexicon') {
      const storyDna = await addCustomLexiconTerm(spindle, request.chatId, {
        term: request.term,
        kind: request.kind,
      }, userId, request.revision);
      await reply(storyDna);
      return;
    }
    if (request.action === 'autofill_location') {
      const current = await loadStoryDNASet(spindle, request.chatId, userId);
      const drafted = await autofillLocationDNA(spindle, {
        chatId: request.chatId,
        userId,
        locationId: request.locationId,
        locationName: request.locationName,
        messageId: request.messageId,
        set: current,
      });
      const storyDna = await saveLocationDNA(spindle, request.chatId, drafted, userId, current.revision ?? 0);
      await reply(storyDna);
      return;
    }
    if (request.action === 'generate_item_art') {
      const storyDna = await generateItemPropArtwork({
        spindle,
        chatId: request.chatId,
        itemId: request.itemId,
        userId,
      });
      await reply(storyDna);
      return;
    }
    if (request.action === 'autofill_item') {
      const current = await loadStoryDNASet(spindle, request.chatId, userId);
      const drafted = await autofillItemDNA(spindle, {
        chatId: request.chatId,
        userId,
        itemId: request.itemId,
        itemName: request.itemName,
        messageId: request.messageId,
        set: current,
      });
      const storyDna = await saveItemDNA(spindle, request.chatId, drafted, userId, current.revision ?? 0);
      await reply(storyDna);
      return;
    }

    if (request.action === 'scrub_swipes') {
      const msgs = ((await spindle.chat?.getMessages?.(request.chatId)) ?? []) as Parameters<typeof activeBranchSwipeTags>[0];
      const activeMap = activeMessageSwipeMap(activeBranchSwipeTags(msgs), request.activeSwipeId);
      const updated = Object.keys(activeMap).length > 0
        ? await mutateStoryDNASet(spindle, request.chatId, userId, undefined, (set) => {
            const scrubbed = scrubStoryDNASwipes(set, activeMap);
            set.locations = scrubbed.locations;
            set.items = scrubbed.items;
            if (scrubbed.documents !== undefined) set.documents = scrubbed.documents;
            set.thoughtCabinet = scrubbed.thoughtCabinet;
            set.chapterCodex = scrubbed.chapterCodex;
            if (scrubbed.npcBeliefs !== undefined) set.npcBeliefs = scrubbed.npcBeliefs;
          })
        : await loadStoryDNASet(spindle, request.chatId, userId);
      await reply(updated);
      return;
    }
  } catch (error) {
    spindle.sendToFrontend({
      type: 'vn_error',
      operation: 'vn_story_dna',
      chatId: request.chatId,
      requestId: request.requestId,
      error: error instanceof Error ? error.message : 'Story DNA could not be updated.',
    }, userId);
  }
}
