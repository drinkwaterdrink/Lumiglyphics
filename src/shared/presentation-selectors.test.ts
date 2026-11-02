import {expect,test} from 'bun:test';
import {ReaderPresentationSchema} from './presentation-entities.js';
import {selectPresentationSnapshot,parseReaderPresentation,createPresentationCursor} from './presentation-selectors.js';
const key={chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0};
const source={provider:'story',recordId:'message',chatId:'chat',messageId:'message',sourceFingerprint:'12345678',observedAt:'2026-11-01T00:00:00Z'};
function compact():any {return {version:2,key,paragraphCount:3,availableThrough:2,entities:[{id:'mira',kind:'npc',name:'Mira',aliases:[],firstParagraph:1,facts:[{id:'hair',entityId:'mira',field:'appearance',value:'silver hair',visibility:'observed',source,revealedAt:{key,paragraphIndex:2}}]}],baseline:{mira:{outfit:'coat'}},changes:[{entityId:'mira',paragraphIndex:1,changes:{presence:'present'}},{entityId:'mira',paragraphIndex:2,changes:{outfit:'uniform'}}],beats:[{paragraphIndex:0,locationId:null,drawableEntityId:null,speakerEntityId:null},{paragraphIndex:1,locationId:null,drawableEntityId:'mira',speakerEntityId:'mira'},{paragraphIndex:2,locationId:null,drawableEntityId:'mira',speakerEntityId:null}]};}
test('cursor snapshots reveal facts in order and never share mutable state',()=>{
  const value=ReaderPresentationSchema.parse(compact());
  const cursor=createPresentationCursor(value);
  expect(cursor(0)?.entities).toEqual([]);
  const first=cursor(1)!;expect(first.entities[0]?.facts).toEqual([]);
  expect(first.presentEntityIds).toEqual(['mira']);
  const last=cursor(2)!;expect(last.entities[0]?.facts[0]?.value).toBe('silver hair');
  last.stateByEntity.mira!.outfit='mutated';last.entities[0]!.facts[0]!.value='mutated';
  expect(cursor(2)?.stateByEntity.mira?.outfit).toBe('uniform');
  expect(cursor(1)?.stateByEntity.mira?.outfit).toBe('coat');
  expect(selectPresentationSnapshot(value,-1)).toBeUndefined();
  expect(selectPresentationSnapshot(value,3)).toBeUndefined();
});
test('invalid entity links, private/foreign/future facts and stale turn identities are rejected',()=>{
  for(const mutate of [
    (v:any)=>{v.entities[0].facts[0].visibility='private';},
    (v:any)=>{v.entities[0].facts[0].source.chatId='foreign';},
    (v:any)=>{v.entities[0].facts[0].revealedAt.paragraphIndex=8;},
    (v:any)=>{v.changes[0].entityId='missing';},
    (v:any)=>{v.beats[0].drawableEntityId='mira';},
  ]){const value=compact();mutate(value);expect(parseReaderPresentation(value,key,3)).toBeUndefined();}
  expect(parseReaderPresentation(compact(),{...key,swipeId:1},3)).toBeUndefined();
  expect(parseReaderPresentation({version:99},key,3)).toBeUndefined();
});
test('legacy v1 snapshots remain readable with detached selection',()=>{
  const value:any={version:1,snapshots:[{at:{key,paragraphIndex:0},entities:[],stateByEntity:{},presentEntityIds:[],locationId:null,drawableEntityId:null,speakerEntityId:null}]};
  expect(parseReaderPresentation(value,key,1)?.version).toBe(1);
  expect(selectPresentationSnapshot(value,0)?.at).toEqual({key,paragraphIndex:0});
});
