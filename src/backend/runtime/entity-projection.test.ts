import { expect,test } from 'bun:test';
import type { TurnPlan } from '../../shared/contracts.js';
import { projectTurnPresentation,readerPresentationFor } from './entity-projection.js';
// Projection uses only these validated-plan fields; no provider/model calls.
function fixture():TurnPlan {
 return {key:{chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0},createdAt:'2026-10-11T00:00:00Z',paragraphs:Array.from({length:10},(_,index)=>({index,sourceIndex:index,text:'Story'})),paragraphSpeakers:[null,'Radio',null,null,null,null,null,null,'Mira',null],scenes:[{startParagraph:0,cast:['Mira'],environment:{location:'Library',description:'Rainy windows'}},{startParagraph:9,cast:[],environment:{location:'Courtyard',description:'A stone yard'}}],visualCues:[{paragraphIndex:0,character:'Mira',resolvedIdentity:'silver hair'}],initialContinuity:{revision:0,characters:{Mira:{present:true,appearance:{hair:'silver'},wardrobe:{coat:'wool',boots:'black'},pose:null,expression:null,props:[]}},facts:{secret:'Do not export'}},continuityDeltas:[{paragraphIndex:8,delta:{characterUpdates:{Mira:{wardrobe:{coat:'uniform'}}},forgetCharacters:[],factUpdates:{}}}]} as unknown as TurnPlan;
}
test('projection uses reveal order, preserves partial wardrobe updates and separates radio speaker',()=>{
 const result=projectTurnPresentation(fixture())!;
 const person=result.snapshots[0]!.entities.find(e=>e.name==='Mira')!;
 expect(result.snapshots[7]?.stateByEntity[person.id]?.outfit).toBe('coat: wool, boots: black');
 expect(result.snapshots[8]?.stateByEntity[person.id]?.outfit).toBe('boots: black, coat: uniform');
 expect(result.snapshots[0]?.entities.some(e=>e.name==='Radio')).toBe(false);
 const radio=result.snapshots[1]!.entities.find(e=>e.name==='Radio')!;
 expect(result.snapshots[1]?.speakerEntityId).toBe(radio.id);
 expect(result.snapshots[1]?.drawableEntityId).toBe(person.id);
 expect(result.snapshots[1]?.presentEntityIds).not.toContain(radio.id);
 expect(result.snapshots[9]?.presentEntityIds).not.toContain(person.id);
 expect(result.snapshots[9]?.drawableEntityId).toBeNull();
 expect(JSON.stringify(result)).not.toContain('Do not export');
});
test('old turns derive without migration resets, unknown versions and stale snapshots are unavailable',()=>{
 const plan=fixture();const saved=projectTurnPresentation(plan)!;
 expect(readerPresentationFor(plan)?.version).toBe(1);
 expect(readerPresentationFor(plan,{version:2})).toBeUndefined();
 expect(readerPresentationFor({...plan,key:{...plan.key,swipeId:1}},saved)).toBeUndefined();
 expect(readerPresentationFor(plan,{version:1,snapshots:[]})).toBeUndefined();
 plan.paragraphs=Array.from({length:257},()=>plan.paragraphs[0]!);
 expect(projectTurnPresentation(plan)).toBeUndefined();
});
test('oversize delta projection is unavailable rather than freezing later state',()=>{
 const plan=fixture();plan.paragraphs=Array.from({length:67},(_,index)=>({index,sourceIndex:index,text:'Story'}));
 plan.scenes=[plan.scenes[0]!,{...plan.scenes[1]!,startParagraph:66}];
 plan.continuityDeltas=Array.from({length:65},(_,paragraphIndex)=>({paragraphIndex,delta:{characterUpdates:{Mira:{wardrobe:{coat:`outfit ${paragraphIndex}`}}},forgetCharacters:[],factUpdates:{}}}));
 expect(projectTurnPresentation(plan)).toBeUndefined();
});
test('saved public facts cannot bypass source or reveal-time validation',()=>{
 const plan=fixture();const foreign=projectTurnPresentation(plan)!;
 foreign.snapshots[0]!.entities[0]!.facts[0]!.source.chatId='other';
 expect(readerPresentationFor(plan,foreign)).toBeUndefined();
 const future=projectTurnPresentation(plan)!;
 future.snapshots[0]!.entities[0]!.facts[0]!.revealedAt!.paragraphIndex=99;
 expect(readerPresentationFor(plan,future)).toBeUndefined();
});
test('a character entering through a continuity change leaves when the scene changes',()=>{
 const plan=fixture();plan.continuityDeltas[0]!.delta.characterUpdates.Visitor={present:true};
 const result=projectTurnPresentation(plan)!;
 const visitor=result.snapshots[8]!.entities.find(e=>e.name==='Visitor')!;
 expect(result.snapshots[8]?.presentEntityIds).toContain(visitor.id);
 expect(result.snapshots[9]?.presentEntityIds).not.toContain(visitor.id);
});
