import {expect,test} from 'bun:test';
import {createReferenceLinkBudget,normalizeTooltipPreferences} from './dossiers.js';
import type {ReaderPresentationV2} from './presentation-entities.js';
const key={chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0};
const projection={version:2,key,paragraphCount:30,availableThrough:29,entities:[{id:'m',kind:'npc',name:'Mira',aliases:[],firstParagraph:1,facts:[]}],baseline:{},changes:[],beats:Array.from({length:30},(_,paragraphIndex)=>({paragraphIndex,locationId:null,drawableEntityId:null,speakerEntityId:null}))} satisfies ReaderPresentationV2;
test('prefix link accounting respects reveals, backward seeks and the global cap',()=>{
  const paragraphs=Array.from({length:30},()=> 'Mira waits.');
  const budget=createReferenceLinkBudget(projection,paragraphs,normalizeTooltipPreferences({enabled:true,linking:'all-known'}));
  expect(budget(1).used).toBe(0);
  expect(budget(3).used).toBe(2);
  expect(budget(30).used).toBe(24);
  expect(budget(2).used).toBe(1);
  expect(budget(1).priorIds.size).toBe(0);
});
test('important-only links retain first mention identity without counting future matches',()=>{
  const budget=createReferenceLinkBudget(projection,['Mira waits.','Mira waits.','Mira waits.'],normalizeTooltipPreferences({enabled:true,linking:'important'}));
  expect(budget(3).used).toBe(1);
  expect([...budget(3).priorIds]).toEqual(['m']);
  expect(budget(0).used).toBe(0);
  expect(budget(1).priorIds.size).toBe(0);
});
