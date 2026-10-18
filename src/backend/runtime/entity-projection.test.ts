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

test('rich profile observations reveal in order and preserve their exact source identity',()=>{
 const plan=fixture();
 plan.paragraphs[1]!.text='Mira is the harbor pilot. Mira speaks in a low rasp.';
 plan.paragraphs[3]!.text='Library provides free charts. Library was built in 1902.';
 plan.paragraphs[5]!.text='Black Key opens the north gate. Black Key came from the old ferry.';
 plan.storyReferences=[
  {kind:'npc',name:'Mira',paragraphIndex:1,field:'role',value:'harbor pilot',evidence:'Mira is the harbor pilot.'},
  {kind:'npc',name:'Mira',paragraphIndex:1,field:'voice',value:'low rasp',evidence:'Mira speaks in a low rasp.'},
  {kind:'place',name:'Library',paragraphIndex:3,field:'services',value:'free charts',evidence:'Library provides free charts.'},
  {kind:'place',name:'Library',paragraphIndex:3,field:'publicHistory',value:'built in 1902',evidence:'Library was built in 1902.'},
  {kind:'object',name:'Black Key',paragraphIndex:5,field:'function',value:'opens the north gate',evidence:'Black Key opens the north gate.'},
  {kind:'object',name:'Black Key',paragraphIndex:5,field:'provenance',value:'old ferry',evidence:'Black Key came from the old ferry.'},
 ];
 const result=projectTurnPresentation(plan)!;
 expect(result.snapshots[0]!.entities.find(e=>e.name==='Mira')!.facts.some(f=>f.field==='role')).toBe(false);
 const role=result.snapshots[1]!.entities.find(e=>e.name==='Mira')!.facts.find(f=>f.field==='role')!;
 expect(role.value).toBe('harbor pilot');
 expect(role.source).toEqual({provider:'story',recordId:'message',chatId:'chat',messageId:'message',sourceFingerprint:'12345678',observedAt:'2026-10-11T00:00:00Z'});
 expect(role.revealedAt).toEqual({key:plan.key,paragraphIndex:1});
 expect(result.snapshots[4]!.entities.some(e=>e.name==='Black Key')).toBe(false);
 expect(result.snapshots[5]!.entities.find(e=>e.name==='Black Key')!.facts.map(f=>f.field)).toEqual(['function','provenance']);
 expect(readerPresentationFor(plan,result)).toEqual(result);
});

test('explicit item ownership and condition change only from their observed paragraph',()=>{
 const plan=fixture();
 plan.paragraphs[1]!.text='Black Key is owned by Mira. Black Key is intact.';
 plan.paragraphs[4]!.text='Black Key is owned by Theo. Black Key is cracked.';
 plan.storyReferences=[
  {kind:'object',name:'Black Key',paragraphIndex:1,field:'owner',value:'Mira',evidence:'Black Key is owned by Mira.'},
  {kind:'object',name:'Black Key',paragraphIndex:1,field:'condition',value:'intact',evidence:'Black Key is intact.'},
  {kind:'object',name:'Black Key',paragraphIndex:4,field:'owner',value:'Theo',evidence:'Black Key is owned by Theo.'},
  {kind:'object',name:'Black Key',paragraphIndex:4,field:'condition',value:'cracked',evidence:'Black Key is cracked.'},
 ];
 const result=projectTurnPresentation(plan)!;
 const key=result.snapshots[1]!.entities.find(e=>e.name==='Black Key')!;
 expect(result.snapshots[3]!.stateByEntity[key.id]).toEqual({owner:'Mira',condition:'intact'});
 expect(result.snapshots[4]!.stateByEntity[key.id]).toEqual({owner:'Theo',condition:'cracked'});
 expect(result.snapshots[4]!.entities.find(e=>e.id===key.id)!.facts.filter(f=>f.field==='owner').map(f=>f.value)).toEqual(['Mira','Theo']);
});

test('optional item state enrichment preserves a valid full continuity budget',()=>{
 const plan=fixture();
 plan.paragraphs=Array.from({length:67},(_,index)=>({index,sourceIndex:index,text:'Story'}));
 plan.scenes=[plan.scenes[0]!];
 plan.visualCues=[];
 plan.continuityDeltas=Array.from({length:63},(_,paragraphIndex)=>({paragraphIndex,delta:{characterUpdates:{Mira:{wardrobe:{coat:`outfit ${paragraphIndex}`}}},forgetCharacters:[],factUpdates:{}}}));
 plan.paragraphs[64]!.text='Black Key is owned by Mira.';
 plan.paragraphs[65]!.text='Black Key is owned by Theo.';
 plan.storyReferences=[
  {kind:'object',name:'Black Key',paragraphIndex:64,field:'owner',value:'Mira',evidence:'Black Key is owned by Mira.'},
  {kind:'object',name:'Black Key',paragraphIndex:65,field:'owner',value:'Theo',evidence:'Black Key is owned by Theo.'},
 ];
 const result=projectTurnPresentation(plan)!;
 const key=result.snapshots[64]!.entities.find(e=>e.name==='Black Key')!;
 expect(result.snapshots[64]!.stateByEntity[key.id]!.owner).toBe('Mira');
 expect(result.snapshots[65]!.stateByEntity[key.id]!.owner).toBe('Theo');
 expect(result.snapshots[66]!.stateByEntity[key.id]!.owner).toBe('Theo');
});

test('a long quoted ownership description stays a fact without invalidating state projection',()=>{
 const plan=fixture();const owner='x'.repeat(300);
 plan.paragraphs[1]!.text=`Black Key is owned by ${owner}.`;
 plan.storyReferences=[{kind:'object',name:'Black Key',paragraphIndex:1,field:'owner',value:owner,evidence:plan.paragraphs[1]!.text}];
 const result=projectTurnPresentation(plan)!;
 const key=result.snapshots[1]!.entities.find(e=>e.name==='Black Key')!;
 expect(key.facts[0]!.value).toBe(owner);
 expect(result.snapshots[1]!.stateByEntity[key.id]!.owner).toBeUndefined();
});
