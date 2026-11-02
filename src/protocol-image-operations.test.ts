import {expect, test} from 'bun:test';
import {isFrontendRequest} from './protocol.js';

const scope = {chatId:'chat',messageId:'message',sourceFingerprint:'12345678'};
test('regeneration and enrichment validate bounded guidance consistently', () => {
  for (const type of ['vn_regenerate_image_prompt','vn_enrich_image_prompt']) {
    expect(isFrontendRequest({type,...scope,requestId:'request',guidance:'warmer lighting'})).toBe(true);
    expect(isFrontendRequest({type,...scope,requestId:'request',guidance:'x'.repeat(401)})).toBe(false);
    expect(isFrontendRequest({type,...scope,requestId:'request',guidance:123})).toBe(false);
    expect(isFrontendRequest({type,...scope,requestId:'request',edits:{prompt:'edited',parameters:[]}})).toBe(false);
  }
});
test('completed-image enrichment retains explicit operation and direction', () => {
  expect(isFrontendRequest({type:'vn_prepare_image',...scope,jobId:'job',promptOperation:'enrich',guidance:'longer hair',edits:{prompt:'existing prompt'}})).toBe(true);
  expect(isFrontendRequest({type:'vn_prepare_image',...scope,jobId:'job',promptOperation:'invalid'})).toBe(false);
  expect(isFrontendRequest({type:'vn_prepare_image',...scope,jobId:'job',guidance:'x'.repeat(401)})).toBe(false);
});
test('restore uses full identity and saved version selection instead of supplied image URLs', () => {
  const request={type:'vn_restore_previous_image',...scope,swipeId:0,revision:0,jobId:'job',versionId:'v1'};
  expect(isFrontendRequest(request)).toBe(true);
  expect(isFrontendRequest({...request,imageId:'arbitrary',imageUrl:'https://example.invalid/image'})).toBe(false);
  expect(isFrontendRequest({...request,versionId:undefined})).toBe(false);
  expect(isFrontendRequest({...request,swipeId:undefined})).toBe(false);
});
