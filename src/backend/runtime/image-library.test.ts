import {test,expect} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {TurnPlanSchema,AssetJobSchema} from '../../shared/contracts.js';
import {saveTurnRecord,loadTurnRecord,turnPath,type StoredTurnRecord} from './storage.js';
import {fingerprintForMessage} from './planner.js';
import {mergeImageLibrary,readImageLibraryPage} from './image-library.js';
import {isFrontendRequest} from '../../protocol.js';
import {registerVisualNovelBackend} from './controller.js';
import {ImageLibraryArchiveSchema} from '../../shared/image-library.js';

const date='2026-10-13T12:00:00.000Z';
function record(messageId='m1',imageId='image',swipeId=0):StoredTurnRecord{
 const key={chatId:'chat',assistantMessageId:messageId,swipeId,sourceFingerprint:fingerprintForMessage({id:messageId,swipe_id:swipeId,content:'A library.'}),revision:0};
 const plan=TurnPlanSchema.parse({schemaVersion:1,key,paragraphs:[{index:0,sourceIndex:0,text:'A library.'}],scenes:[{sceneId:'scene',revision:0,startParagraph:0,environment:{location:'Library',timeOfDay:'day',weather:null,lighting:'daylight',description:'Book shelves.',persistentElements:[]},cast:[],continuity:{revision:0,characters:{},facts:{}},basePrompt:'library',cameraLock:{framing:'wide',angle:'eye level',perspective:'fixed',lens:'50mm',subjectAnchor:'center',horizon:'upper third',safeDialogueRegion:'lower third',aspectRatio:'16:9'},compositionLock:'shelves',activeAssetId:null,priorSceneId:null}],visualCues:[{cueId:'cue',paragraphIndex:0,sceneId:'scene',sceneRevision:0,kind:'background',assetJobId:'job',promptDelta:'Shelves'}],choices:[],initialContinuity:{revision:0,characters:{},facts:{}},continuityDeltas:[],terminalContinuity:{revision:0,characters:{},facts:{}},planningStatus:'planned',createdAt:date});
 return {schemaVersion:1,speaker:'Narrator',status:'ready',plan,jobs:[AssetJobSchema.parse({jobId:'job',ownerTurnKey:key,sceneId:'scene',sceneRevision:0,paragraphIndex:0,promptFingerprint:'12345678',provider:'provider',status:'generated',imageId,imageUrl:`/api/v1/images/${imageId}`,queuedAt:date,startedAt:date,generatedAt:date})],updatedAt:date,imageRequests:[{requestId:'approved',jobId:'job',paragraphIndex:0,state:'approved',prompt:'Detailed shelves',negativePrompt:'blur',model:'model',provider:'provider',connectionId:'private-connection',parameters:{api_key:'never-copy'},referenceSummary:'none',createdAt:date}]};
}
function fixture(){
 const data=new Map<string,unknown>();let reads=0;const imageCalls:any[]=[];
 const anchor=record('m29');anchor.jobs=[];data.set(`u:${turnPath('chat','m29',0)}`,anchor);
 const messages=Array.from({length:30},(_,i)=>({id:`m${i}`,swipe_id:0,is_user:false,content:'A library.'}));
 const api={userStorage:{getJson:async(path:string,o:any)=>{reads++;return structuredClone(data.get(`${o.userId}:${path}`)??o.fallback);},setJson:async(path:string,value:unknown,o:any)=>{data.set(`${o.userId}:${path}`,structuredClone(value));},list:async(prefix:string,user:string)=>[...data.keys()].filter(p=>p.startsWith(`${user}:${prefix}`)).map(p=>p.slice(user.length+1))},chats:{get:async(_id:string,user:string)=>user==='u'?{id:'chat'}:null},chat:{getMessages:async()=>messages},images:{get:async(id:string,o:any)=>{imageCalls.push([id,o]);return id==='missing'?null:{id,url:`/api/v1/images/${id}?size=sm`,mime_type:'image/png'};}}} as unknown as SpindleAPI;
 return {api,data,messages,imageCalls,reads:()=>reads};
}
const request=(extra:any={})=>({type:'vn_image_library' as const,chatId:'chat',requestId:'r',anchor:{messageId:'m29',swipeId:0,sourceFingerprint:record('m29').plan.key.sourceFingerprint,paragraphIndex:0},range:'read' as const,versions:'active' as const,includeReplaced:false,order:'newest' as const,role:'all' as const,templateQuery:'',...extra});

test('archive preserves old images across replacement/replan without associating later prompts',()=>{
 const old=record();const next=record('m1','replacement');next.imageRequests![0]!.prompt='New shelves';
 const history=ImageLibraryArchiveSchema.parse(mergeImageLibrary(old,next));
 expect(history.entries.map(e=>e.imageId)).toEqual(['image','replacement']);
 expect(history.entries[0]!.prompt).toBe('Detailed shelves');
 expect(JSON.stringify(history)).not.toContain('api_key');expect(JSON.stringify(history)).not.toContain('private-connection');
 const pending=record();pending.imageRequests!.push({...pending.imageRequests![0]!,requestId:'pending',state:'prepared',prompt:'unmade picture'});
 expect(ImageLibraryArchiveSchema.parse(mergeImageLibrary(undefined,pending)).entries[0]!.prompt).toBe('Detailed shelves');
});
test('turn saves retain image history even when a replan has no images',async()=>{
 const {api}=fixture();const old=record();const path=turnPath('chat','m1',0);
 await saveTurnRecord(api,path,old,'u');const next=record();next.jobs=[];next.plan.key.revision++;
 await saveTurnRecord(api,path,next,'u');const loaded=await loadTurnRecord(api,path,'u');
 expect((loaded?.imageLibrary as any).entries[0].imageId).toBe('image');
});
test('paged library reads only a bounded set of turns and verifies thumbnails under originating user',async()=>{
 const f=fixture();for(let i=0;i<30;i++)await saveTurnRecord(f.api,turnPath('chat',`m${i}`,0),record(`m${i}`,`image${i}`),'u');
 const before=f.reads();const first=await readImageLibraryPage(f.api,request(),'u');
 expect(first.entries).toHaveLength(24);expect(first.entries[0]!.key.assistantMessageId).toBe('m29');
 expect(f.reads()-before).toBeLessThanOrEqual(26);expect(f.imageCalls[0]![1]).toEqual({userId:'u',specificity:'sm'});
 const second=await readImageLibraryPage(f.api,request({cursor:first.nextCursor}),'u');expect(second.entries).toHaveLength(6);expect(second.nextCursor).toBeNull();
 expect(new Set([...first.entries,...second.entries].map(e=>e.imageId)).size).toBe(30);
});
test('deleted messages, changed prose and alternate swipes stay out of the active library',async()=>{
 const f=fixture();for(const r of [record('m1'),record('m2','alternate',1),record('gone')])await saveTurnRecord(f.api,turnPath('chat',r.plan.key.assistantMessageId,r.plan.key.swipeId),r,'u');
 f.messages[1]!.content='Edited story';
 expect((await readImageLibraryPage(f.api,request(),'u')).entries).toHaveLength(0);
 const all=await readImageLibraryPage(f.api,request({versions:'all'}),'u');
 expect(all.entries.map(e=>e.imageId)).toEqual(['alternate','image']);
 expect(all.entries.every(e=>e.versionLabel==='alternate')).toBe(true);
});
test('replaced images are opt-in, missing images are truthful and browsing makes no writes',async()=>{
 const f=fixture();await saveTurnRecord(f.api,turnPath('chat','m1',0),record(),'u');await saveTurnRecord(f.api,turnPath('chat','m1',0),record('m1','missing'),'u');
 const before=JSON.stringify([...f.data]);const page=await readImageLibraryPage(f.api,request(),'u');expect(page.entries).toHaveLength(1);expect(page.entries[0]!.available).toBe(false);
 const both=await readImageLibraryPage(f.api,request({includeReplaced:true}),'u');expect(both.entries).toHaveLength(2);expect(both.entries.find(e=>e.imageId==='image')!.versionLabel).toBe('replaced');
 expect(JSON.stringify([...f.data])).toBe(before);
 await expect(readImageLibraryPage(f.api,request(),'other')).rejects.toThrow(/unavailable/i);
});
test('a failed replacement keeps its displayed fallback in the default library',async()=>{
 const f=fixture(),path=turnPath('chat','m1',0);await saveTurnRecord(f.api,path,record(),'u');
 const failed=record();failed.jobs[0]=AssetJobSchema.parse({...failed.jobs[0],status:'failed',imageId:null,imageUrl:null,generatedAt:null,error:'Provider failed',finishedAt:date});failed.previousImages={job:{imageId:'image',imageUrl:'/api/v1/images/image'}};
 await saveTurnRecord(f.api,path,failed,'u');
 const page=await readImageLibraryPage(f.api,request(),'u');expect(page.entries).toHaveLength(1);expect(page.entries[0]!.imageId).toBe('image');expect(page.entries[0]!.versionLabel).toBe('current');
});
test('unsupported archives are preserved; legacy previous images have no invented prompt',()=>{
 const old=record();old.imageLibrary={version:2,entries:['future']};
 expect(mergeImageLibrary(old,record())).toEqual(old.imageLibrary);
 const legacy=record();legacy.previousImages={job:{imageId:'older',imageUrl:'https://expired'}};
 const item=ImageLibraryArchiveSchema.parse(mergeImageLibrary(undefined,legacy)).entries.find(e=>e.imageId==='older')!;
 expect(item.prompt).toBeUndefined();expect(JSON.stringify(item)).not.toContain('expired');
});

test('a malformed prior turn cannot prevent a fresh recovery save',async()=>{
 const f=fixture(),path=turnPath('chat','m1',0);
 f.data.set(`u:${path}`,{plan:{key:record().plan.key},jobs:[null],imageLibrary:{version:2,entries:['future']}});
 await saveTurnRecord(f.api,path,record(),'u');
 expect((await loadTurnRecord(f.api,path,'u'))!.imageLibrary).toEqual({version:2,entries:['future']});
 f.data.set(`u:${path}`,{plan:{key:record().plan.key},jobs:[null]});
 await saveTurnRecord(f.api,path,record(),'u');
 expect((await loadTurnRecord(f.api,path,'u'))!.jobs[0]!.imageId).toBe('image');
});
test('an unreadable prior JSON record does not block saving the recovery and is reported',async()=>{
 const f=fixture(),get=f.api.userStorage.getJson.bind(f.api.userStorage);let fail=true;
 f.api.userStorage.getJson=async(...args:any[])=>{if(fail){fail=false;throw new Error('Invalid prior JSON');}return (get as any)(...args);};
 await saveTurnRecord(f.api,turnPath('chat','m1',0),record(),'u');
 const saved=ImageLibraryArchiveSchema.parse((await loadTurnRecord(f.api,turnPath('chat','m1',0),'u'))!.imageLibrary);
 expect(saved.entries[0]!.imageId).toBe('image');expect(saved.incomplete).toBe(true);
});
test('cache reuse never borrows an old approved request with the same job id',()=>{
 const cached=record('m1','reused');cached.jobs[0]!.provider='cache';
 expect(ImageLibraryArchiveSchema.parse(mergeImageLibrary(undefined,cached)).entries[0]!.prompt).toBeUndefined();
});
test('first saved prompt attribution wins over later reconstructed records',async()=>{
 const f=fixture(),old=record();await saveTurnRecord(f.api,turnPath('chat','m1',0),old,'u');
 const next=record();next.imageRequests![0]!.prompt='Different later wording';await saveTurnRecord(f.api,turnPath('chat','m1',0),next,'u');
 const page=await readImageLibraryPage(f.api,request(),'u');expect(page.entries[0]!.prompt).toBe('Detailed shelves');
});
test('an obsolete anchor fingerprint is rejected instead of returning earlier current images',async()=>{
 const f=fixture();await saveTurnRecord(f.api,turnPath('chat','m1',0),record(),'u');
 await expect(readImageLibraryPage(f.api,request({anchor:{...request().anchor,sourceFingerprint:'obsolete'}}),'u')).rejects.toThrow(/changed/i);
});
for(const kind of ['edit','delete','swipe'] as const)test(`${kind} during thumbnail verification invalidates the page`,async()=>{
 const f=fixture();await saveTurnRecord(f.api,turnPath('chat','m1',0),record(),'u');
 let resolve!:(value:any)=>void,entered!:()=>void;const image=new Promise<any>(done=>resolve=done),started=new Promise<void>(done=>entered=done);
 f.api.images.get=async()=>{entered();return image;};
 const pending=readImageLibraryPage(f.api,request(),'u');await started;
 if(kind==='edit')f.messages[1]!.content='New prose';else if(kind==='delete')f.messages.splice(1,1);else f.messages[1]!.swipe_id=1;
 resolve({id:'image',url:'/api/v1/images/image?size=sm',mime_type:'image/png'});
 await expect(pending).rejects.toThrow(/changed/i);
});
test('library requests reject unsupported scope, cursors and fields',()=>{
 expect(isFrontendRequest(request())).toBe(true);expect(isFrontendRequest(request({cursor:'../secret'}))).toBe(false);
 expect(isFrontendRequest(request({imageUrl:'https://outside'}))).toBe(false);
});

test('registered controller serves the library under the sender scope without generation',async()=>{
 const f=fixture();await saveTurnRecord(f.api,turnPath('chat','m1',0),record(),'u');
 let handler!:(payload:unknown,user:string)=>void;const sent:any[]=[];let paidCalls=0;
 f.api.on=(()=>()=>{}) as any;f.api.onFrontendMessage=fn=>{handler=fn;return ()=>{};};
 f.api.sendToFrontend=(payload,user)=>{sent.push({payload,user});};f.api.log={info:()=>{},warn:()=>{},error:()=>{},debug:()=>{}} as any;
 f.api.imageGen={generate:async()=>{paidCalls++;throw new Error('No generation allowed.');}} as any;
 f.api.generate={quiet:async()=>{paidCalls++;throw new Error('No generation allowed.');}} as any;
 registerVisualNovelBackend(f.api);handler(request(),'u');
 for(let i=0;i<100&&!sent.length;i++)await new Promise(r=>setTimeout(r,1));
 expect(sent[0].user).toBe('u');expect(sent[0].payload.type).toBe('vn_image_library');expect(sent[0].payload.page.entries).toHaveLength(1);expect(paidCalls).toBe(0);
 handler(request({requestId:'other'}),'other');for(let i=0;i<100&&sent.length<2;i++)await new Promise(r=>setTimeout(r,1));
 expect(sent[1].user).toBe('other');expect(sent[1].payload.type).toBe('vn_error');expect(sent[1].payload.requestId).toBe('other');
});
test('range and optional role/template filters cannot expose later paragraphs by default',async()=>{
 const f=fixture();await saveTurnRecord(f.api,turnPath('chat','m1',0),record(),'u');
 const anchor=record('m29');anchor.plan.paragraphs.push({index:1,sourceIndex:1,text:'Future page.'});anchor.jobs[0]!.paragraphIndex=1;await saveTurnRecord(f.api,turnPath('chat','m29',0),anchor,'u');
 expect((await readImageLibraryPage(f.api,request(),'u')).entries.map(e=>e.key.assistantMessageId)).toEqual(['m1']);
 expect((await readImageLibraryPage(f.api,request({range:'all'}),'u')).entries).toHaveLength(2);
 expect((await readImageLibraryPage(f.api,request({role:'portrait'}),'u')).entries).toHaveLength(0);
 expect((await readImageLibraryPage(f.api,request({templateQuery:'not-present'}),'u')).entries).toHaveLength(0);
});
