import {expect,test} from 'bun:test';
import type {TurnPlan} from '../../shared/contracts.js';
import {projectTurnPresentation,readerPresentationFor} from './entity-projection.js';
import {selectPresentationSnapshot} from '../../shared/presentation-selectors.js';

function plan(count:number):TurnPlan {
  return {key:{chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0},createdAt:'2026-11-01T00:00:00Z',
    paragraphs:Array.from({length:count},(_,index)=>({index,sourceIndex:index,text:'Mira waits.'})),paragraphSpeakers:[],
    scenes:[{startParagraph:0,cast:['Mira'],environment:{location:'Library',description:'Rainy windows'}}],visualCues:[],
    initialContinuity:{revision:0,characters:{},facts:{}},continuityDeltas:Array.from({length:count},(_,paragraphIndex)=>({paragraphIndex,delta:{characterUpdates:{Mira:{wardrobe:{coat:`coat ${paragraphIndex}`}}},forgetCharacters:[],factUpdates:{}}})),
  } as unknown as TurnPlan;
}
test('compact projection preserves 65+ state changes and more than 256 paragraphs',()=>{
  for(const count of [64,65,300]){
    const source=plan(count),value=projectTurnPresentation(source);
    expect(value?.version).toBe(2);
    const last=selectPresentationSnapshot(value!,count-1)!;
    const mira=last.entities.find(e=>e.name==='Mira')!;
    expect(last.stateByEntity[mira.id]?.outfit).toBe(`coat: coat ${count-1}`);
    expect(selectPresentationSnapshot(value!,0)?.stateByEntity[mira.id]?.outfit).toBe('coat: coat 0');
    expect(readerPresentationFor(source,value)).toEqual(value);
    expect(JSON.stringify(value).length).toBeLessThan(512000);
    expect(Object.hasOwn(value!,'snapshots')).toBe(false);
  }
});
test('projection stores facts once rather than once per paragraph',()=>{
  const source=plan(60);source.continuityDeltas=[];
  source.visualCues=Array.from({length:6},(_,index)=>({paragraphIndex:index,character:`Person ${index}`,resolvedIdentity:'x'.repeat(400)})) as TurnPlan['visualCues'];
  const value=projectTurnPresentation(source)!;
  const serialized=JSON.stringify(value);
  expect(serialized.split('x'.repeat(400)).length-1).toBeLessThanOrEqual(12);
  expect(selectPresentationSnapshot(value,0)?.entities.some(e=>e.name==='Person 5')).toBe(false);
  expect(selectPresentationSnapshot(value,59)?.entities.some(e=>e.name==='Person 5')).toBe(true);
});
test('UTF-8 byte pressure keeps an explicit valid prefix instead of losing all references',()=>{
  const source=plan(2500);
  for(const delta of source.continuityDeltas)delta.delta.characterUpdates.Mira!.wardrobe={coat:'雪'.repeat(900)+delta.paragraphIndex};
  const value=projectTurnPresentation(source)!;
  expect(new TextEncoder().encode(JSON.stringify(value)).length).toBeLessThanOrEqual(2_000_000);
  expect(value.warnings).toContain('byte-budget');
  expect(value.availableThrough).toBeGreaterThan(0);
  expect(value.availableThrough).toBeLessThan(2499);
  expect(selectPresentationSnapshot(value,value.availableThrough)).toBeDefined();
  expect(selectPresentationSnapshot(value,value.availableThrough+1)).toBeUndefined();
});
