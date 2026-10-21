import {test,expect} from 'bun:test';
import {DEFAULT_CONFIG} from '../../config.js';
import {templateSnapshot} from '../../shared/image-templates.js';
import type {TurnPlan,VisualCue} from '../../shared/contracts.js';
import {castAllocationCandidates} from './cast-allocation.js';
import {prepareAssetJobs} from './images.js';
import {SceneImageCache} from '../core/scene-image-cache.js';
const template=(id:string)=>templateSnapshot(DEFAULT_CONFIG.imageTemplates.find(t=>t.id===id)!);
export function castPlan():TurnPlan {
 const cues=['Mira','Rin','Sol'].map((name,p)=>({cueId:`c${p}`,assetJobId:`j${p}`,paragraphIndex:p,sceneId:'s',sceneRevision:0,kind:'flattened_scene',action:null,expression:null,promptDelta:'',character:name,resolvedIdentity:`${name==='Mira'?'silver':'black'} hair, green eyes`,resolvedAttire:'red coat',poseExpressionId:'smile',imageTemplate:template('portrait')})) as VisualCue[];
 return {schemaVersion:1,key:{chatId:'chat',assistantMessageId:'reply',swipeId:0,sourceFingerprint:'fingerprint',revision:0},paragraphs:[0,1,2].map(index=>({index,sourceIndex:index,text:'A quiet library.'})),paragraphSpeakers:['Mira','Rin','Sol'],scenes:[{sceneId:'s',revision:0,startParagraph:0,cast:['Mira','Rin','Sol'],environment:{location:'Library',description:'Oak shelves',timeOfDay:'night',weather:null,lighting:'lamplight',persistentElements:[]},continuity:{revision:0,characters:{},facts:{}},basePrompt:'Library',compositionLock:'center',cameraLock:{framing:'medium',angle:'eye level',perspective:'straight-on',lens:null,subjectAnchor:'center',horizon:'upper third',safeDialogueRegion:'lower quarter',aspectRatio:'9:16'},activeAssetId:null,priorSceneId:null}],visualCues:cues,initialContinuity:{revision:0,characters:{},facts:{}},continuityDeltas:[],terminalContinuity:{revision:0,characters:{},facts:{}},planningStatus:'planned',choices:[],audioCues:[],createdAt:'2026-10-20T00:00:00Z'};
}
test('cast allocation uses one background and at most two already selected present subjects',()=>{
 const plan=castPlan(),before=JSON.stringify(plan);const next=castAllocationCandidates(plan,{...DEFAULT_CONFIG,castMode:true})!;
 expect(next.candidates.map(c=>c.imageTemplate?.category)).toEqual(['environment','portrait','portrait']);
 expect(next.candidates.map(c=>c.paragraphIndex)).toEqual([0,0,1]);
 const bg=next.candidates[0]!;expect(bg.character).toBeNull();expect(bg.resolvedIdentity).toBe('');expect(bg.action).toBeNull();expect(bg.ensembleSubjects).toBeUndefined();
 expect(new Set(next.candidates.map(c=>c.assetJobId)).size).toBe(3);expect(next.reuseOnly.some(c=>c.character==='Sol')).toBe(true);expect(JSON.stringify(plan)).toBe(before);
 expect(castAllocationCandidates(plan,DEFAULT_CONFIG)).toBeNull();
});
test('manual, ensemble, manga, absent/unknown subjects and disabled environment retain their existing flow',()=>{
 for(const patch of [{imageTemplate:template('manga-page')},{imageTemplate:template('ensemble')},{imageTemplateReason:'Manual template selection'},{character:'Radio'}]){
  const plan=castPlan();plan.visualCues[0]={...plan.visualCues[0]!,...patch};expect(castAllocationCandidates(plan,{...DEFAULT_CONFIG,castMode:true})).toBeNull();
 }
 const absent=castPlan();absent.continuityDeltas=[{paragraphIndex:1,delta:{characterUpdates:{Rin:{present:false}},forgetCharacters:[],factUpdates:{}}}];expect(castAllocationCandidates(absent,{...DEFAULT_CONFIG,castMode:true})).toBeNull();
 expect(castAllocationCandidates(castPlan(),{...DEFAULT_CONFIG,castMode:true,imageTemplates:DEFAULT_CONFIG.imageTemplates.filter(t=>t.category!=='environment')})).toBeNull();
});
test('cast allocation respects one shared allowance and creates no provider requests during admission',async()=>{
 let calls=0;const api={userStorage:{getJson:async(_p:string,o:any)=>o.fallback},imageGen:{listConnections:async()=>[{id:'nano',provider:'nanogpt',model:'qwen-image',is_default:true}],getConnection:async()=>({id:'nano',provider:'nanogpt',model:'qwen-image'}),generate:async()=>{calls++;return {imageId:'unexpected'};}}} as any;
 for(const budget of [1,2,3]){
  const plan=castPlan();const jobs=await prepareAssetJobs(api,plan,{...DEFAULT_CONFIG,castMode:true,maxImagesPerTurn:budget,referenceAnchoring:false},undefined,new SceneImageCache(),'u');
  expect(jobs.filter(j=>j.provider!=='cache')).toHaveLength(budget);
  expect(plan.visualCues[0]?.imageTemplate?.category).toBe('environment');
 }
 expect(calls).toBe(0);
});
