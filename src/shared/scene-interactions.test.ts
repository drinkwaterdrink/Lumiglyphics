import { expect, test } from 'bun:test';
import { availableInteractionVerbs, buildInteractionDraft, mergeInteractionDraft } from './scene-interactions.js';
import type { PresentationSnapshot } from './presentation-entities.js';
const key={chatId:'chat',assistantMessageId:'m1',swipeId:0,sourceFingerprint:'12345678',revision:0};
const npc={id:'n',kind:'npc' as const,name:'Mira',aliases:[],firstParagraph:0,facts:[]};
const snapshot={at:{key,paragraphIndex:0},entities:[npc],stateByEntity:{},presentEntityIds:['n'],locationId:null,speakerEntityId:null,drawableEntityId:null} as PresentationSnapshot;
test('actions create editable intentions without private facts or claimed outcomes',()=>{
 expect(availableInteractionVerbs(npc,snapshot)).toEqual(['ask','approach','custom']);
 const draft=buildInteractionDraft(npc,'ask',snapshot)!;
 expect(draft.text).toBe('I ask Mira about ');
 expect(draft.key).toEqual(key);
 expect(buildInteractionDraft({...npc,kind:'object'},'use',{...snapshot,entities:[{...npc,kind:'object'}]})).toBeNull();
});
test('absent, elsewhere, future and unknown entities cannot acquire proximity actions',()=>{
 expect(availableInteractionVerbs(npc,{...snapshot,stateByEntity:{n:{presence:'absent'}}})).toEqual(['custom']);
 expect(availableInteractionVerbs(npc,{...snapshot,presentEntityIds:[]})).toEqual(['custom']);
 expect(availableInteractionVerbs(npc,{...snapshot,entities:[{...npc,firstParagraph:1}]})).toEqual([]);
 const place={...npc,id:'p',kind:'place' as const,name:'Far away'};
 expect(availableInteractionVerbs(npc,{...snapshot,entities:[npc,place],locationId:'here',stateByEntity:{n:{location:'p'}}})).toEqual(['custom']);
 expect(availableInteractionVerbs({...npc,id:'other'},snapshot)).toEqual([]);
});
test('insert preserves a typed reply and replace is explicit',()=>{
 expect(mergeInteractionDraft('My reply','I examine the key.','insert')).toBe('My reply\n\nI examine the key.');
 expect(mergeInteractionDraft('My reply','I examine the key.','replace')).toBe('I examine the key.');
 expect(mergeInteractionDraft('My reply',' ','replace')).toBeNull();
});
