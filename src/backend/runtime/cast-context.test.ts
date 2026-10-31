import {TurnPlanSchema,AssetJobSchema} from "../../shared/contracts.js";
import {fingerprintForMessage} from "./planner.js";
import {registerVisualNovelBackend} from "./controller.js";
import {test,expect} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {scanCastContext} from './cast-context.js';
import {manageCastArt} from './cast-art.js';
import {loadCharacterAppearance,type StoredTurnRecord} from './storage.js';
import {resolveTemplateIdentity} from './visual-brief.js';
function fixture(){
 const data=new Map<string,any>();const messages:any[]=[{id:'m1',is_user:false,swipe_id:0,content:'<tracker>{"characters":[{"name":"Rena","appearance":{"summary":"silver fur, blue eyes, fox ears"},"clothing":"red coat","aliases":["Ren"]}]}</tracker>'}];
 const api={userStorage:{getJson:async(p:string,o:any)=>structuredClone(data.get(`${o?.userId}:${p}`)??o.fallback),setJson:async(p:string,v:any,o:any)=>data.set(`${o?.userId}:${p}`,structuredClone(v))},chats:{get:async(_:string,user:string)=>user==='u'?{}:null},chat:{getMessages:async()=>messages},log:{warn:()=>{}}} as unknown as SpindleAPI;
 data.set('u:config.json',{includeSimTrackerContext:true});return {api,data,messages};
}
test('context scan returns editable tracker appearance and separate outfit without writes',async()=>{
 const f=fixture(),before=JSON.stringify([...f.data]);const scan=await scanCastContext(f.api,'chat','u');
 expect(scan.candidates[0]!.name).toBe('Rena');expect(scan.candidates[0]!.setup.appearance).toContain('silver fur');expect(scan.candidates[0]!.setup.outfits[0]!.description).toBe('red coat');expect(scan.candidates[0]!.source).toContain('SimTracker');expect(JSON.stringify([...f.data])).toBe(before);
 const candidate=scan.candidates[0]!;await manageCastArt(f.api,'chat',{action:'setup',name:candidate.name,setup:candidate.setup},'u');
 const appearances=await loadCharacterAppearance(f.api,'u','chat');
 expect(resolveTemplateIdentity({character:'Scenario narrator',cast:[]} as any,{character:'Rena',resolvedIdentity:'old dark hair'} as any,appearances).identity).toContain('silver fur');
});
test('disabled tracker sources stay out and another user cannot scan a chat',async()=>{
 const f=fixture();f.data.set('u:config.json',{includeSimTrackerContext:false});expect((await scanCastContext(f.api,'chat','u')).candidates).toHaveLength(0);
 await expect(scanCastContext(f.api,'chat','other')).rejects.toThrow(/unavailable/i);
});
test('scan names come from registered appearances, not scenario card titles or empty tracker entries',async()=>{
 const f=fixture();f.messages[0].content='<tracker>{"characters":[{"name":"Empty"}]}</tracker>';f.data.set('u:chats/chat/characters.json',{Mira:'silver hair, green eyes'});
 const scan=await scanCastContext(f.api,'chat','u');expect(scan.candidates.map(c=>c.name)).toEqual(['Mira']);
});

test('changing story context during a scan invalidates its suggestions',async()=>{
 const f=fixture();let reads=0;f.api.chat.getMessages=async()=>{if(++reads===2)f.messages[0].content='A new reply.';return f.messages;};
 await expect(scanCastContext(f.api,'chat','u')).rejects.toThrow(/changed/i);
});

test('registered scan handler returns scoped candidates without image or model calls',async()=>{
 const f=fixture();let handler!:(payload:any,user:string)=>void;const sent:any[]=[];let paidCalls=0;
 f.api.on=(()=>()=>{}) as any;f.api.onFrontendMessage=callback=>{handler=callback;return ()=>{};};f.api.sendToFrontend=(payload,user)=>sent.push({payload,user});f.api.log={info:()=>{},warn:()=>{},error:()=>{},debug:()=>{}} as any;
 f.api.imageGen={generate:async()=>{paidCalls++;throw new Error('Not allowed.');}} as any;f.api.generate={quiet:async()=>{paidCalls++;throw new Error('Not allowed.');}} as any;
 registerVisualNovelBackend(f.api);handler({type:'vn_cast_art',version:1,action:'scan',chatId:'chat',requestId:'r'},'u');
 for(let i=0;i<100&&!sent.length;i++)await new Promise(resolve=>setTimeout(resolve,1));
 expect(sent[0].user).toBe('u');expect(sent[0].payload.type).toBe('vn_cast_context');expect(sent[0].payload.scan.candidates[0].name).toBe('Rena');expect(paidCalls).toBe(0);
});

test('new tracker characters remain importable when saved cast fills the suggestion limit',async()=>{
 const f=fixture();f.data.set('u:chats/chat/cast-art.json',{version:1,characters:Array.from({length:32},(_,i)=>({entityId:'old'+i,name:'Saved '+i,description:'black hair, green eyes',artRevision:0,preferredVariantId:null,variants:[],setup:{appearance:'black hair, green eyes',aliases:[],outfits:[],defaultOutfitId:null,anchors:[]}}))});
 const scan=await scanCastContext(f.api,'chat','u');expect(scan.candidates[0]!.name).toBe('Rena');expect(scan.candidates).toHaveLength(32);expect(scan.notice).toMatch(/limit|omitted/i);
});

test('cast scan includes NPCs from recent tracker snapshots alongside a player-only latest snapshot',async()=>{
 const f=fixture();f.messages.unshift({id:'older',is_user:false,swipe_id:0,content:'<tracker>{"characters":[{"name":"NPC","appearance":"silver hair, green eyes","clothing":"blue coat"}]}</tracker>'});f.messages[1].content='<tracker>{"characters":[{"name":"Player","appearance":{"summary":"black hair, brown eyes"}}]}</tracker>';
 const scan=await scanCastContext(f.api,'chat','u');expect(scan.candidates.map(c=>c.name)).toContain('NPC');expect(scan.candidates.map(c=>c.name)).toContain('Player');
});

test('scan reads multiple tracker blocks with newest usable appearance per NPC',async()=>{
 const f=fixture();f.messages[0].content='<tracker>{"characters":[{"name":"NPC","appearance":"red hair, green eyes"}]}</tracker><tracker>characters:\n  NPC:\n    appearance: silver hair, green eyes\n  Player:\n    appearance: black hair, brown eyes</tracker>';
 const scan=await scanCastContext(f.api,'chat','u');const npcs=scan.candidates.filter(c=>c.name==='NPC');expect(npcs).toHaveLength(1);expect(npcs[0]!.setup.appearance).toContain('silver hair');
});
test('tracker history window is bounded and name-only newer records do not erase an older appearance',async()=>{
 const f=fixture();const old={id:'older',swipe_id:0,is_user:false,content:'<tracker>{"NPC":{"appearance":"silver hair, green eyes"}}</tracker>'};f.messages.unshift(old);f.messages[1].content='<tracker>{"characters":[{"name":"NPC"}]}</tracker>';
 expect((await scanCastContext(f.api,'chat','u')).candidates.map(c=>c.name)).toContain('NPC');
 f.messages.splice(1,0,...Array.from({length:30},(_,i)=>({id:'plain'+i,swipe_id:0,is_user:false,content:'Ordinary story text.'})));
 expect((await scanCastContext(f.api,'chat','u')).candidates.map(c=>c.name)).not.toContain('NPC');
});

const date='2026-10-14T12:00:00.000Z';
test('a selected-character scan filters before the limit and recognizes saved aliases',async()=>{
 const f=fixture();await manageCastArt(f.api,'chat',{action:'setup',name:'Rena',setup:{appearance:'silver fur, blue eyes',aliases:['Ren'],outfits:[],defaultOutfitId:null,anchors:[]}},'u');
 f.messages[0].content='<tracker>'+JSON.stringify({characters:[{name:'Ren',appearance:'white fur, blue eyes'}]})+'</tracker>';
 for(let batch=0;batch<2;batch++)f.messages.push({id:'new'+batch,is_user:false,content:'<tracker>'+JSON.stringify({characters:Array.from({length:20},(_,i)=>({name:'Other '+batch+' '+i,appearance:'brown hair, green eyes'}))})+'</tracker>'});
 const before=JSON.stringify([...f.data]);
 const scan=await scanCastContext(f.api,'chat','u','rena');
 expect(scan.candidates.some(c=>c.name==='Ren'&&c.source.includes('SimTracker'))).toBe(true);
 expect(scan.candidates.every(c=>['Ren','Rena'].includes(c.name))).toBe(true);
 expect(JSON.stringify([...f.data])).toBe(before);
 await expect(scanCastContext(f.api,'chat','u','missing')).rejects.toThrow(/no longer|refresh/i);
});
function storyRecord(messageId='m1',imageId='image',swipeId=0):StoredTurnRecord{
 const key={chatId:'chat',assistantMessageId:messageId,swipeId,sourceFingerprint:fingerprintForMessage({id:messageId,swipe_id:swipeId,content:'A library.'}),revision:0};
 const plan=TurnPlanSchema.parse({schemaVersion:1,key,paragraphs:[{index:0,sourceIndex:0,text:'A library.'}],scenes:[{sceneId:'scene',revision:0,startParagraph:0,environment:{location:'Library',timeOfDay:'day',weather:null,lighting:'daylight',description:'Book shelves.',persistentElements:[]},cast:[],continuity:{revision:0,characters:{},facts:{}},basePrompt:'library',cameraLock:{framing:'wide',angle:'eye level',perspective:'fixed',lens:'50mm',subjectAnchor:'center',horizon:'upper third',safeDialogueRegion:'lower third',aspectRatio:'16:9'},compositionLock:'shelves',activeAssetId:null,priorSceneId:null}],visualCues:[{cueId:'cue',paragraphIndex:0,sceneId:'scene',sceneRevision:0,kind:'background',assetJobId:'job',promptDelta:'Shelves'}],choices:[],initialContinuity:{revision:0,characters:{},facts:{}},continuityDeltas:[],terminalContinuity:{revision:0,characters:{},facts:{}},planningStatus:'planned',createdAt:date});
 return {schemaVersion:1,speaker:'Narrator',status:'ready',plan,jobs:[AssetJobSchema.parse({jobId:'job',ownerTurnKey:key,sceneId:'scene',sceneRevision:0,paragraphIndex:0,promptFingerprint:'12345678',provider:'provider',status:'generated',imageId,imageUrl:`/api/v1/images/${imageId}`,queuedAt:date,startedAt:date,generatedAt:date})],updatedAt:date,imageRequests:[{requestId:'approved',jobId:'job',paragraphIndex:0,state:'approved',prompt:'Detailed shelves',negativePrompt:'blur',model:'model',provider:'provider',connectionId:'private-connection',parameters:{api_key:'never-copy'},referenceSummary:'none',createdAt:date}]};
}
test('NPCs visible in tooltips are included even when the learned registry contains only the player',async()=>{
 const f=fixture();f.messages[0].content='A library.';const saved=storyRecord('m1');saved.jobs=[];const key=saved.plan.key;
 const entity=(id:string,name:string,appearance:string,at=0)=>({id,kind:'npc',name,aliases:[],firstParagraph:at,facts:appearance?[{id:'fact'+id,entityId:id,field:'appearance',value:appearance,visibility:'observed',source:{provider:'story',recordId:'m1',chatId:'chat',messageId:'m1',sourceFingerprint:key.sourceFingerprint,observedAt:date},revealedAt:{key,paragraphIndex:at}}]:[]});
 saved.presentation={version:1,snapshots:[{at:{key,paragraphIndex:0},entities:[entity('npc','Mira','silver hair, green eyes'),entity('name-only','Robin','')],stateByEntity:{},presentEntityIds:['npc'],locationId:null,speakerEntityId:null,drawableEntityId:null}]};
 f.data.set('u:turns/chat/m1/0.json',saved);f.data.set('u:chats/chat/characters.json',{Player:'black hair, brown eyes'});
 const scan=await scanCastContext(f.api,'chat','u');expect(scan.candidates.find(c=>c.name==='Mira')!.setup.appearance).toContain('silver hair');
 expect(scan.candidates.find(c=>c.name==='Robin')!.setup.appearance).toBe('');expect(scan.candidates.some(c=>c.name==='Not yet revealed')).toBe(false);
 await expect(manageCastArt(f.api,'chat',{action:'setup',name:'Robin',setup:scan.candidates.find(c=>c.name==='Robin')!.setup},'u')).rejects.toThrow();
});

test('invalid tooltip projections and malformed optional saved turns do not block tracker results',async()=>{
 const f=fixture();const saved=storyRecord('m1');saved.source={version:2,rawFingerprint:fingerprintForMessage(f.messages[0])};
 saved.presentation={version:1,snapshots:[{at:{key:saved.plan.key,paragraphIndex:0},entities:[{id:'bad',kind:'npc',name:'Future NPC',aliases:[],firstParagraph:5,facts:[]}],stateByEntity:{},presentEntityIds:[],locationId:null,speakerEntityId:null,drawableEntityId:null}]};
 f.data.set('u:turns/chat/m1/0.json',saved);const scan=await scanCastContext(f.api,'chat','u');expect(scan.candidates.map(c=>c.name)).toContain('Rena');expect(scan.candidates.some(c=>c.name==='Future NPC')).toBe(false);
 f.data.set('u:turns/chat/m1/0.json',{speaker:'Narrator',plan:{broken:true}});const recovered=await scanCastContext(f.api,'chat','u');expect(recovered.candidates.map(c=>c.name)).toContain('Rena');expect(recovered.notice).toContain('could not be read');
});
