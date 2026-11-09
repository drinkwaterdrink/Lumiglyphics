import type { SpindleAPI } from 'lumiverse-spindle-types';
import {
  type StoryDNASet,
  StoryDnaRequestSchema,
  type StoryDnaRequest
} from '../../shared/story-dna.js';
import {
  loadStoryDNASet,
  saveLocationDNA,
  saveItemDNA,
  deleteLocationDNA,
  deleteItemDNA
} from './story-dna-store.js';

export { StoryDnaRequestSchema, type StoryDnaRequest };

export async function handleStoryDnaRequest(
  spindle: SpindleAPI,
  rawRequest: unknown,
  userId: string
): Promise<void> {
  const request = StoryDnaRequestSchema.parse(rawRequest);
  const reply = async (storyDna: StoryDNASet) => {
    spindle.sendToFrontend({
      type: 'vn_story_dna',
      chatId: request.chatId,
      requestId: request.requestId,
      storyDna,
    }, userId);
  };

  try {
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
