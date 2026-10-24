import {test,expect} from 'bun:test';
import {captureReferenceLineage,readReferenceHistory,referenceMessages,preserveReferenceLineage} from './reference-history.js';
import {TurnPlanSchema} from '../../shared/contracts.js';
import {fingerprintForMessage} from './planner.js';
import {turnPath,loadTurnRecord,type StoredTurnRecord} from './storage.js';
import type {SpindleAPI} from 'lumiverse-spindle-types';
const msg=(id:string,content:string,is_user=false)=>({id,content,is_user,name:is_user?'Player':'Narrator',swipe_id:0,parent_message_id:null,branch_id:null});
function plan(message:ReturnType<typeof msg>,chatId='c'){
 const continuity={revision:0,characters:{},facts:{}};
 const scene={sceneId:'s',revision:0,startParagraph:0,environment:{location:'Hall',description:'Stone hall',timeOfDay:null,weather:null,lighting:null,persistentElements:[]},cast:[],continuity,basePrompt:'hall',cameraLock:{framing:'wide',angle:'eye level',perspective:'fixed',lens:'50mm',subjectAnchor:'center',horizon:'upper third',safeDialogueRegion:'lower third',aspectRatio:'16:9'},compositionLock:'hall',activeAssetId:null,priorSceneId:null};
 return TurnPlanSchema.parse({schemaVersion:1,key:{chatId,assistantMessageId:message.id,swipeId:0,sourceFingerprint:fingerprintForMessage(message),revision:0},paragraphs:[{index:0,sourceIndex:0,text:message.content}],scenes:[scene],visualCues:[],choices:[],initialContinuity:continuity,continuityDeltas:[],terminalContinuity:continuity,planningStatus:'planned',createdAt:'2026-10-18T00:00:00Z'});
}
async function fixture(){
 const messages=[msg('one','Mira has silver hair.'),msg('user','Continue.',true),msg('two','Mira opens the door.')];
 const old=plan(messages[0]!),current=plan(messages[2]!);
 old.storyReferences=[{kind:'npc',name:'Mira',paragraphIndex:0,field:'appearance',value:'silver hair',evidence:messages[0]!.content}];
 const record=async(p:typeof old):Promise<StoredTurnRecord>=>({schemaVersion:1,status:'ready',speaker:'Narrator',jobs:[],plan:p,updatedAt:p.createdAt,referenceLineage:await captureReferenceLineage(messages,p)});
 const prior=await record(old),target=await record(current),data=new Map([[turnPath('c','one',0),prior]]);let reads=0;
 const api={chat:{getMessages:async()=>messages},userStorage:{getJson:async(path:string,options:any)=>{expect(options.userId).toBe('user');reads++;return data.get(path)??options.fallback;}}} as unknown as SpindleAPI;
 return {messages,prior,target,data,api,reads:()=>reads};
}
test('verified earlier observations retain original source and never become current state',async()=>{
 const f=await fixture(),history=await readReferenceHistory(f.api,f.target,'user');
 expect(history?.entries).toHaveLength(1);expect(history?.entries[0]).toMatchObject({sourceKey:f.prior.plan.key,replyNumber:1,reference:{name:'Mira',field:'appearance',value:'silver hair'}});
 expect(history?.target).toEqual(f.target.plan.key);expect(JSON.stringify(history)).not.toContain('stateByEntity');
});
test('changed ancestor, intervening user text, swipe or branch invalidates the captured target',async()=>{
 for(const change of [(f:any)=>f.messages[0].content+=' edited',(f:any)=>f.messages[1].content='Different choice',(f:any)=>f.messages[0].swipe_id=1,(f:any)=>f.messages[2].branch_id='fork',(f:any)=>f.messages[2].parent_message_id='other']){
  const f=await fixture();change(f);expect(await readReferenceHistory(f.api,f.target,'user')).toBeUndefined();
 }
});
test('legacy and unsupported certificates stay unavailable, without backfilling storage',async()=>{
 const f=await fixture();delete f.target.referenceLineage;expect(await readReferenceHistory(f.api,f.target,'user')).toBeUndefined();expect(f.reads()).toBe(0);
 f.target.referenceLineage={version:99};expect(await readReferenceHistory(f.api,f.target,'user')).toBeUndefined();
});
test('dynamic macro ancestry is not certified while name-display ancestry stays bounded',async()=>{
 const f=await fixture();f.messages[0]!.content='{{#if {{getvar::route}}}}Mira has silver hair.{{/if}}';
 expect(await captureReferenceLineage(f.messages,f.target.plan)).toBeUndefined();
 f.messages[0]!.content='Welcome, {{user}}.';expect(await captureReferenceLineage(f.messages,f.target.plan)).toBeDefined();
});
test('missing/invalid sources and unsupported optional source data do not block the target',async()=>{
 for(const change of [(f:any)=>f.data.clear(),(f:any)=>f.prior.referenceLineage={version:99},(f:any)=>f.prior.plan.storyReferences[0].evidence='Invented silver hair',(f:any)=>f.prior.plan.key.revision++]){
  const f=await fixture();change(f);const history=await readReferenceHistory(f.api,f.target,'user');expect(history?.entries).toEqual([]);expect(f.target.status).toBe('ready');
 }
 const future={version:99,opaque:['keep']};expect(preserveReferenceLineage(future,undefined)).toBe(future);
});
test('later replies are outside the anchor and cannot supply future descriptions',async()=>{
 const f=await fixture();f.messages.push(msg('future','Rowan has black hair.'));const history=await readReferenceHistory(f.api,f.target,'user');
 expect(history?.entries.map(e=>e.reference.name)).toEqual(['Mira']);expect(history?.targetReplyNumber).toBe(2);
});
test('a history change during deferred optional storage reads rejects the result',async()=>{
 const f=await fixture();let release!:(value:StoredTurnRecord)=>void;let started=false;
 f.api.userStorage.getJson=async()=>{started=true;return await new Promise(resolve=>{release=resolve;}) as any;};
 const result=readReferenceHistory(f.api,f.target,'user');while(!started)await new Promise(resolve=>setTimeout(resolve,1));
 f.messages[1]!.content='A different branch choice';release(f.prior);expect(await result).toBeUndefined();
});
test('an optional read deadline returns without invalidating the primary record',async()=>{
 const f=await fixture();f.api.chat.getMessages=async()=>new Promise(()=>{});
 expect(await readReferenceHistory(f.api,f.target,'user',5)).toBeUndefined();expect(f.target.status).toBe('ready');
});
test('prefix validation bounds message count, text, duplicate ids and malformed native metadata',()=>{
 expect(referenceMessages(Array.from({length:1025},(_,i)=>msg(String(i),'text')),'1024')).toBeUndefined();
 expect(referenceMessages(Array.from({length:9},(_,i)=>msg(String(i),'a'.repeat(500000))),'8')).toBeUndefined();
 expect(referenceMessages([msg('same','one'),msg('same','two')],'same')).toHaveLength(1);
 expect(referenceMessages([msg('same','one'),msg('same','two'),msg('last','end')],'last')).toBeUndefined();
 expect(referenceMessages([{...msg('m','text'),swipe_id:'bad'}],'m')).toBeUndefined();
});
test('newest descriptive observations win while temporary state and macro-bearing sources are excluded',async()=>{
 const messages=[msg('old','Mira has silver hair and a blue coat.'),msg('middle','Mira has black hair.'),msg('last','Mira walks.')];
 const records=await Promise.all(messages.map(async message=>{const p=plan(message);p.storyReferences=message.id==='old'?[{kind:'npc',name:'Mira',field:'appearance',value:'silver hair',paragraphIndex:0,evidence:message.content},{kind:'npc',name:'Mira',field:'outfit',value:'blue coat',paragraphIndex:0,evidence:message.content}]:message.id==='middle'?[{kind:'npc',name:'Mira',field:'appearance',value:'black hair',paragraphIndex:0,evidence:message.content}]:[];return {schemaVersion:1 as const,status:'ready' as const,speaker:'Narrator',jobs:[],plan:p,updatedAt:p.createdAt,referenceLineage:await captureReferenceLineage(messages,p)};}));
 const api={chat:{getMessages:async()=>messages},userStorage:{getJson:async(path:string)=>records.find(r=>turnPath('c',r.plan.key.assistantMessageId,0)===path)}} as unknown as SpindleAPI;
 const history=await readReferenceHistory(api,records[2]!,'user');expect(history?.entries.map(e=>e.reference.value)).toEqual(['black hair']);expect(history?.entries[0]?.sourceKey.assistantMessageId).toBe('middle');
 messages[1]!.content='{{user}} notices Mira has black hair.';records[1]!.plan=plan(messages[1]!);records[1]!.plan.storyReferences=[{kind:'npc',name:'Mira',field:'appearance',value:'black hair',paragraphIndex:0,evidence:'Mira has black hair.'}];
 records[1]!.referenceLineage=await captureReferenceLineage(messages,records[1]!.plan);records[2]!.referenceLineage=await captureReferenceLineage(messages,records[2]!.plan);
 expect((await readReferenceHistory(api,records[2]!,'user'))?.entries.map(e=>e.reference.value)).toEqual(['silver hair']);
});
test('a changed literal target cannot be certified against an older planning input',async()=>{
 const f=await fixture();f.messages[2]!.content='Mira takes a different route.';
 expect(await captureReferenceLineage(f.messages,f.target.plan)).toBeUndefined();
});
test('macro display targets require their original raw input and certificates preserve immutable snapshots',async()=>{
 const messages=[msg('old','Mira has silver hair.'),msg('new','Hello {{user}}.')],p=plan(messages[1]!);p.key.sourceFingerprint='resolved123';p.paragraphs[0]!.text='Hello Trent.';
 expect(await captureReferenceLineage(messages,p)).toBeUndefined();expect(await captureReferenceLineage(messages,p,'a different raw input')).toBeUndefined();
 expect(await captureReferenceLineage(messages,p,messages[1]!.content)).toBeDefined();
 const f=await fixture(),pending=captureReferenceLineage(f.messages,f.target.plan);f.messages[0]!.content='Edited while hashing';f.target.referenceLineage=await pending;
 expect(await readReferenceHistory(f.api,f.target,'user')).toBeUndefined();
});
test('storage keeps future optional lineage data without weakening the saved turn',async()=>{
 const f=await fixture(),future={version:99,opaque:['preserve']};f.prior.referenceLineage=future;
 const loaded=await loadTurnRecord(f.api,turnPath('c','one',0),'user');expect(loaded?.referenceLineage).toEqual(future);expect(loaded?.plan.key).toEqual(f.prior.plan.key);
});
test('history bounds prior record reads and returned observations and labels truncation',async()=>{
 const messages=Array.from({length:18},(_,i)=>msg(`m${i}`,Array.from({length:32},(_,j)=>`Person_${i}_${j} has hair_${j}.`).join(' ')));messages.push(msg('target','The story continues.'));
 const records=await Promise.all(messages.map(async message=>{const p=plan(message);if(message.id!=='target'){const i=Number(message.id.slice(1));p.storyReferences=Array.from({length:32},(_,j)=>({kind:'npc',name:`Person_${i}_${j}`,field:'appearance',value:`hair_${j}`,evidence:`Person_${i}_${j} has hair_${j}.`,paragraphIndex:0}));}return {schemaVersion:1 as const,status:'ready' as const,speaker:'Narrator',jobs:[],plan:p,updatedAt:p.createdAt,referenceLineage:await captureReferenceLineage(messages,p)};}));
 let reads=0;const api={chat:{getMessages:async()=>messages},userStorage:{getJson:async(path:string)=>{reads++;return records.find(r=>turnPath('c',r.plan.key.assistantMessageId,0)===path);}}} as unknown as SpindleAPI;
 const history=await readReferenceHistory(api,records.at(-1)!,'user');expect(reads).toBe(16);expect(history?.entries).toHaveLength(128);expect(history?.truncated).toBe(true);expect(history?.entries.some(e=>e.sourceKey.assistantMessageId==='m0')).toBe(false);
});

test('optional history bounds concurrent reads and stops before parsing late records',async()=>{
 const messages=Array.from({length:17},(_,i)=>msg(`bounded-${i}`,'Mira walks.'));
 const targetPlan=plan(messages.at(-1)!);
 const target={schemaVersion:1,status:'ready',speaker:'Narrator',jobs:[],plan:targetPlan,updatedAt:targetPlan.createdAt,referenceLineage:await captureReferenceLineage(messages,targetPlan)} as StoredTurnRecord;
 let reads=0,parsed=0;const releases:Array<()=>void>=[];
 const api={chat:{getMessages:async()=>messages},userStorage:{getJson:async()=>{reads++;await new Promise<void>(resolve=>releases.push(resolve));return {get plan(){parsed++;throw new Error('Late validation');},speaker:'Narrator'};}}} as unknown as SpindleAPI;
 expect(await readReferenceHistory(api,target,'user',100)).toBeUndefined();
 const started=reads;releases.forEach(release=>release());await new Promise(resolve=>setTimeout(resolve,15));
 expect(started).toBeGreaterThan(0);expect(started).toBeLessThanOrEqual(2);expect(reads).toBe(started);expect(parsed).toBe(0);
});
