import { describe, expect, test } from "bun:test";
import { restorePreviousImage, turnView, viewRegistry, registerVisualNovelBackend,markAssetReady } from "./controller.js";
import {fingerprintForMessage} from './planner.js';
import { enrichImagePrompt } from "./prompt-rewrite.js";
import { TurnPlanSchema, type AssetJob } from "../../shared/contracts.js";
import type { StoredChatState, StoredTurnRecord } from "./storage.js";
import { turnPath, chatStatePath } from "./storage.js";
import { DEFAULT_CONFIG } from "../../config.js";

const now = new Date().toISOString();
const key = {
  chatId: "chat",
  assistantMessageId: "msg-1",
  swipeId: 0,
  sourceFingerprint: "fp123456",
  revision: 0
};

const plan = TurnPlanSchema.parse({
  schemaVersion: 1,
  key,
  paragraphs: [{ index: 0, sourceIndex: 0, text: "The rain fell quietly over the old farmhouse porch." }],
  scenes: [{
    sceneId: "scene-1",
    revision: 0,
    startParagraph: 0,
    environment: {
      location: "Porch",
      timeOfDay: "night",
      weather: null,
      lighting: "dim lamplight",
      description: "Rainy wooden porch.",
      persistentElements: []
    },
    cast: ["Nadine"],
    continuity: { revision: 0, characters: {}, facts: {} },
    basePrompt: "dim rainy farmhouse porch at night",
    cameraLock: {
      framing: "medium wide",
      angle: "eye level",
      perspective: "fixed",
      lens: "50mm",
      subjectAnchor: "center",
      horizon: "upper third",
      safeDialogueRegion: "lower third",
      aspectRatio: "16:9"
    },
    compositionLock: "Nadine centered",
    activeAssetId: null,
    priorSceneId: null
  }],
  visualCues: [{
    cueId: "cue-1",
    paragraphIndex: 0,
    sceneId: "scene-1",
    sceneRevision: 0,
    kind: "flattened_scene",
    action: null,
    expression: null,
    promptDelta: "Nadine looks toward the door",
    assetJobId: "job-1"
  }],
  choices: [],
  initialContinuity: { revision: 0, characters: {}, facts: {} },
  continuityDeltas: [],
  terminalContinuity: { revision: 0, characters: {}, facts: {} },
  planningStatus: "planned",
  createdAt: now
});

function job(jobId: string, imageId: string, imageUrl: string): AssetJob {
  return {
    jobId,
    ownerTurnKey: key,
    sceneId: "scene-1",
    sceneRevision: 0,
    paragraphIndex: 0,
    promptFingerprint: "fp123456",
    provider: "image:default",
    priority: "visible",
    status: "generated",
    imageId,
    imageUrl,
    error: null,
    queuedAt: now,
    startedAt: now,
    generatedAt: now,
    readyAt: null,
    finishedAt: null
  };
}

function archivedRequest(requestId:string,jobId:string){return {requestId,jobId,paragraphIndex:0,state:'approved' as const,prompt:'Archived prompt',negativePrompt:'',model:'model',provider:'image',connectionId:'connection',parameters:{},referenceSummary:'none',createdAt:now};}
function knownVersion(savedPlan:StoredTurnRecord['plan'],savedJob:AssetJob,versionId:string){return {versionId,imageId:savedJob.imageId!,imageUrl:savedJob.imageUrl!,timestamp:now,prompt:'Archived prompt',negativePrompt:'',provenance:{version:1 as const,job:savedJob,cue:savedPlan.visualCues.find(cue=>cue.assetJobId===savedJob.jobId)!,requestId:'old-request'}};}

describe("Previous Image Versions Restoration & Guided Prompt Enricher", () => {
  test("turnView exposes previousVersions when present on stored record", () => {
    const record: StoredTurnRecord = {
      schemaVersion: 1,
      speaker: "Nadine",
      status: "ready",
      plan,
      jobs: [job("job-1", "img-v2", "/api/v1/images/img-v2")],
      previousVersions: {
        "job-1": [
          {
            versionId: "v_1",
            imageId: "img-v1",
            imageUrl: "/api/v1/images/img-v1",
            timestamp: now
          }
        ]
      },
      updatedAt: now
    };

    const view = turnView(record);
    expect(view.assets[0]?.previousVersions).toBeDefined();
    expect(view.assets[0]?.previousVersions).toHaveLength(1);
    expect(view.assets[0]?.previousVersions![0]?.imageId).toBe("img-v1");
  });

  test("restorePreviousImage swaps imageId and preserves current version into history", async () => {
    const data = new Map<string, unknown>();
    const sent: any[] = [];
    const tPath = turnPath("chat", "msg-1", 0);
    const cPath = chatStatePath("chat");

    const initialRecord: StoredTurnRecord = {
      schemaVersion: 1,
      speaker: "Nadine",
      status: "ready",
      plan,
      jobs: [job("job-1", "img-v2", "/api/v1/images/img-v2")],
      imageRequests:[archivedRequest('old-request','job-1')],
      previousVersions: {
        "job-1": [
          knownVersion(plan,job('job-1','img-v1','/api/v1/images/img-v1'),'v_1')
        ]
      },
      updatedAt: now
    };

    data.set(tPath, initialRecord);
    data.set(cPath, {
      schemaVersion: 1,
      activeTurnPath: tPath,
      latestScene: null,
      terminalContinuity: null,
      updatedAt: now
    } satisfies StoredChatState);

    const spindle: any = {
      userStorage: {
        getJson: async (path: string) => data.get(path) ?? null,
        setJson: async (path: string, val: unknown) => { data.set(path, val); }
      },
      sendToFrontend: (msg: any) => sent.push(msg),
      log: { warn: () => {}, error: () => {} }
    };

    viewRegistry().open(undefined, 'chat');
    await restorePreviousImage(spindle, {
      type: "vn_restore_previous_image",
      chatId: "chat",
      messageId: "msg-1",
      sourceFingerprint: "fp123456",
      jobId: "job-1",
      versionId: "v_1",
      swipeId: 0,
      revision: 0
    });

    const updated = data.get(tPath) as StoredTurnRecord;
    expect(updated.jobs[0]?.imageId).toBe("img-v1");
    expect(updated.jobs[0]?.imageUrl).toBe("/api/v1/images/img-v1");
    expect(updated.jobs[0]?.status).toBe('generated');
    expect(updated.jobs[0]?.readyAt).toBeNull();
    // img-v2 should now be recorded in history
    expect(updated.previousVersions?.["job-1"]?.some(v => v.imageId === "img-v2")).toBe(true);

    // Frontend notification sent
    expect(sent.some(m => m.type === "vn_asset" && m.asset?.imageId === "img-v1")).toBe(true);
    expect(sent.some(m => m.type === "vn_turn")).toBe(true);
  });

  test('restore rejects unknown versions, old revisions and closed readers without writes', async () => {
    const path=turnPath('chat','msg-1',0);
    const data=new Map<string,unknown>([
      [path,{schemaVersion:1,speaker:'Nadine',status:'ready',plan,jobs:[job('job-1','img-v2','/api/v1/images/img-v2')],previousVersions:{'job-1':[{versionId:'v_1',imageId:'img-v1',imageUrl:'/api/v1/images/img-v1',timestamp:now}]},updatedAt:now}],
      [chatStatePath('chat'),{schemaVersion:1,activeTurnPath:path,latestScene:null,terminalContinuity:null,updatedAt:now}],
    ]);
    let writes=0;
    const api:any={userStorage:{getJson:async (p:string)=>data.get(p)??null,setJson:async()=>{writes++;}},sendToFrontend:()=>{},log:{warn:()=>{}}};
    const request={type:'vn_restore_previous_image' as const,chatId:'chat',messageId:'msg-1',sourceFingerprint:'fp123456',swipeId:0,revision:0,jobId:'job-1',versionId:'v_1'};
    viewRegistry().open(undefined,'chat');
    for(const patch of [{versionId:'missing'},{revision:1},{swipeId:1},{jobId:'other'},{sourceFingerprint:'stale'}]) {
      await restorePreviousImage(api,{...request,...patch});
    }
    viewRegistry().close(undefined,'chat');
    await restorePreviousImage(api,request);
    expect(writes).toBe(0);
  });

  for(const timing of ['independent','shared','startup','pre-provider','failed-write','delayed-failed-write'])test(`restoration ownership: ${timing}`,async()=>{
    const shared=timing==='shared'||timing==='pre-provider';
    const chatId=`restore-race-${timing}`,userId=`restore-user-${timing}`,messageId='restore-message';
    const text='Nadine watches the porch.\n\nNadine turns toward the door.';
    const raceKey={...key,chatId,assistantMessageId:messageId,sourceFingerprint:fingerprintForMessage({id:messageId,content:text,swipe_id:0})};
    const racePlan=TurnPlanSchema.parse({...structuredClone(plan),key:raceKey,
      paragraphs:[{index:0,sourceIndex:0,text:'Nadine watches the porch.'},{index:1,sourceIndex:1,text:'Nadine turns toward the door.'}],
      scenes:plan.scenes.map(s=>({...s,character:'Nadine',identityPrompt:'silver hair, green eyes'})),
      visualCues:[0,1].map(i=>({...plan.visualCues[0]!,cueId:`cue-${i}`,assetJobId:`job-${i}`,paragraphIndex:i,character:'Nadine',resolvedIdentity:'silver hair, green eyes',promptDelta:!shared&&i?'looks toward the door':'watches the rain',poseExpressionId:!shared&&i?'smile':'idle'})),
    });
    const jobs=[0,1].map(i=>({...job(`job-${i}`,'old','/api/v1/images/old'),ownerTurnKey:raceKey,promptFingerprint:`fingerprint-${shared?0:i}`,paragraphIndex:i,status:'failed' as const,imageId:null,imageUrl:null,generatedAt:null,finishedAt:now,error:'retry'}));
    const path=turnPath(chatId,messageId,0);
    const data=new Map<string,any>([[path,{schemaVersion:1,speaker:'Nadine',status:'ready',plan:racePlan,jobs,imageRequests:[archivedRequest('old-request','job-0')],previousVersions:{'job-0':[knownVersion(racePlan,{...jobs[0]!,status:'generated',imageId:'saved-art',imageUrl:'/api/v1/images/saved-art',generatedAt:now,readyAt:null,finishedAt:null,error:null},'saved')]},updatedAt:now}],
      [chatStatePath(chatId),{schemaVersion:1,activeTurnPath:path,latestScene:null,terminalContinuity:null,updatedAt:now}],
      ['config.json',{generateImages:true,reviewImages:false,imageConcurrency:2,referenceAnchoring:false,maxImagesPerTurn:2}]]);
    const releases:Array<(value:any)=>void>=[];
    let configPaused=false,providerPaused=false,failRestore=false,restoreWritePaused=false;
    let releaseFailedWrite!:()=>void;
    const failedWriteGate=new Promise<void>(resolve=>{releaseFailedWrite=resolve;});
    let releaseConfig!:()=>void,releaseProvider!:()=>void;
    const configGate=new Promise<void>(resolve=>{releaseConfig=resolve;});
    const providerGate=new Promise<void>(resolve=>{releaseProvider=resolve;});
    let handler!:(payload:unknown,userId:string)=>Promise<void>;
    const api:any={on:()=>{},onFrontendMessage:(fn:any)=>{handler=fn;},
      userStorage:{getJson:async(p:string,options:any)=>{
        if(timing==='startup'&&p==='config.json'&&data.get(path).jobs[0].status==='queued'&&!configPaused){configPaused=true;await configGate;}
        return data.get(p)??options?.fallback??null;
      },setJson:async(p:string,v:any)=>{if(failRestore&&p===path&&v.jobs[0].imageId==='saved-art'){failRestore=false;if(timing==='delayed-failed-write'){restoreWritePaused=true;await failedWriteGate;}throw new Error('Restore write failed');}data.set(p,v);}},
      chat:{getMessages:async()=>[{id:messageId,chat_id:chatId,content:text,is_user:false,name:'Nadine',swipe_id:0}]},
      imageGen:{getConnection:async()=>({provider:'comfyui'}),listConnections:async()=>[{provider:'comfyui',is_default:true}],generate:()=>new Promise(resolve=>releases.push(resolve))},
      generate:{raw:async()=>{throw new Error('Unexpected planning');}},sendToFrontend:()=>{},log:{info:()=>{},warn:()=>{},error:()=>{}}};
    registerVisualNovelBackend(api);
    if(timing==='pre-provider')api.imageGen.listConnections=async()=>{if(data.get(path).jobs[0].status==='queued'&&!providerPaused){providerPaused=true;await providerGate;}return [{provider:'comfyui',is_default:true}];};
    await handler({type:'vn_retry_turn',chatId,messageId},userId);
    try {
      const expectedCalls=shared?1:2;
      const early=timing==='startup'||timing==='pre-provider';
      for(let i=0;i<100&&(early?!(configPaused||providerPaused):releases.length<expectedCalls);i++)await Bun.sleep(10);
      if(!early)expect(releases).toHaveLength(expectedCalls);
      else expect(configPaused||providerPaused).toBe(true);
      const restore=()=>restorePreviousImage(api,{type:'vn_restore_previous_image',chatId,messageId,sourceFingerprint:raceKey.sourceFingerprint,swipeId:0,revision:raceKey.revision,jobId:'job-0',versionId:'saved'},userId);
      if(timing==='failed-write'||timing==='delayed-failed-write'){
        failRestore=true;const pendingRestore=restore();
        // Attach rejection handling before deliberately holding a failing write.
        const failed=pendingRestore.then(()=>null,error=>error as Error);
        if(timing==='failed-write')expect((await failed)?.message).toBe('Restore write failed');
        else {for(let i=0;i<100&&!restoreWritePaused;i++)await Bun.sleep(10);expect(restoreWritePaused).toBe(true);}
        releases[0]!({imageId:'late-art',imageUrl:'/api/v1/images/late-art'});releases[1]!({imageId:'other-art',imageUrl:'/api/v1/images/other-art'});
        if(timing==='delayed-failed-write'){await Bun.sleep(30);releaseFailedWrite();expect((await failed)?.message).toBe('Restore write failed');}
        for(let i=0;i<100&&data.get(path).jobs[1]?.imageId!=='other-art';i++)await Bun.sleep(10);
        expect(data.get(path).jobs[0].imageId).toBe('late-art');
        expect(data.get(path).jobs[1].imageId).toBe('other-art');
        return;
      }
      await restore();
      expect(data.get(path).jobs[0].imageId).toBe('saved-art');
      await markAssetReady(api,{type:'vn_asset_ready',chatId,messageId,jobId:'job-0',sourceFingerprint:raceKey.sourceFingerprint,imageId:'saved-art'},userId);
      if(early){releaseConfig();releaseProvider();for(let i=0;i<100&&releases.length<1;i++)await Bun.sleep(10);expect(releases.length).toBeGreaterThan(0);}
      releases[0]!({imageId:timing==='startup'?'other-art':'late-art',imageUrl:timing==='startup'?'/api/v1/images/other-art':'/api/v1/images/late-art'});
      releases[1]?.({imageId:'other-art',imageUrl:'/api/v1/images/other-art'});
      const otherImage=shared?'late-art':'other-art';
      for(let i=0;i<100&&data.get(path).jobs[1]?.imageId!==otherImage;i++)await Bun.sleep(10);
      expect(data.get(path).jobs[0].imageId).toBe('saved-art');
      expect(data.get(path).jobs[1].imageId).toBe(otherImage);
      expect(data.get(path).jobs[0].status).toBe('browser_ready');
      expect(data.get(path).previousVersions['job-0'].some((v:any)=>v.imageId==='saved-art')).toBe(true);
    } finally {
      releaseConfig();releaseProvider();
      releaseFailedWrite();
      for(const release of releases)release({imageId:'cleanup',imageUrl:'/api/v1/images/cleanup'});
      viewRegistry().close(userId,chatId);
    }
  });

  test("enrichImagePrompt elevates prompt with user guidance and rich photographic details", async () => {
    let calledPrompt = "";
    const spindle: any = {
      generate: {
        raw: async (req: any) => {
          calledPrompt = JSON.stringify(req.messages);
          return {
            content: JSON.stringify({
              prompt: "Nadine Pruitt with longer flowing chestnut hair, wearing a paint-spattered linen apron over a vintage floral midi dress, warm cinematic rim lighting, 35mm lens, atmospheric dusk mist, photorealistic textures",
              negativePrompt: "blurry, deformed, oversaturated, bad anatomy, extra limbs"
            })
          };
        }
      },
      connections: {
        get: async () => ({ id: "conn-1", provider: "openai", model: "gpt-4o" }),
        list: async () => [{ id: "conn-1", provider: "openai", model: "gpt-4o" }]
      }
    };

    const cfg = {
      ...DEFAULT_CONFIG,
      plannerConnectionId: "conn-1",
      plannerModel: "gpt-4o"
    };

    const initialRequest: any = {
      prompt: "Nadine in apron standing on porch",
      negativePrompt: "blur",
      promptProfile: {
        maxCharacters: 3000,
        format: "prose",
        guidance: "Use natural cinematic language.",
        negativeMode: "standard"
      }
    };

    const enriched = await enrichImagePrompt(
      spindle,
      initialRequest,
      undefined,
      cfg,
      "user-1",
      new AbortController().signal,
      "make her hair longer, cinematic rim lighting"
    );

    expect(enriched.prompt).toContain("longer flowing chestnut hair");
    expect(enriched.prompt).toContain("cinematic rim lighting");
    expect(calledPrompt).toContain("make her hair longer, cinematic rim lighting");
  });
});

test('restoring artwork keeps its own subject, template, prompt and generation fingerprint',async()=>{
 const {archiveCurrentImageVersion}=await import('./image-version-provenance.js');const {BUILTIN_IMAGE_TEMPLATES,templateSnapshot}=await import('../../shared/image-templates.js');
 const request=(id:string,prompt:string)=>({requestId:id,jobId:'job-1',paragraphIndex:0,state:'approved' as const,prompt,negativePrompt:'negative '+id,model:'model',provider:'image',connectionId:'connection',parameters:{seed:1},referenceSummary:'none',createdAt:now});
 const planA=TurnPlanSchema.parse({...plan,visualCues:[{...plan.visualCues[0],character:'Nadine',imageTemplate:templateSnapshot(BUILTIN_IMAGE_TEMPLATES.find(t=>t.id==='portrait')!)}]});
 const initial:StoredTurnRecord={schemaVersion:1,speaker:'Nadine',status:'ready',plan:planA,jobs:[job('job-1','image-a','/api/v1/images/image-a')],imageRequests:[request('request-a','Nadine in her coat')],updatedAt:now};
 const previousVersions=archiveCurrentImageVersion(initial,initial.jobs[0]!,undefined);const selected=previousVersions['job-1']![0]!;expect(selected.prompt).toBe('Nadine in her coat');
 const replacement:StoredTurnRecord={...initial,plan:TurnPlanSchema.parse({...planA,visualCues:[{...planA.visualCues[0],character:'Darby',imageTemplate:templateSnapshot(BUILTIN_IMAGE_TEMPLATES.find(t=>t.category==='environment')!)}]}),jobs:[{...job('job-1','image-b','/api/v1/images/image-b'),promptFingerprint:'new-fingerprint'}],imageRequests:[...initial.imageRequests!,request('request-b','Darby in the new scene')],previousVersions};
 const path=turnPath('chat','msg-1',0),data=new Map<string,any>([[path,replacement],[chatStatePath('chat'),{schemaVersion:1,activeTurnPath:path,latestScene:null,terminalContinuity:null,updatedAt:now}]]);const api:any={userStorage:{getJson:async(path:string,options:any)=>data.get(path)??options?.fallback??null,setJson:async(path:string,value:any)=>data.set(path,value)},sendToFrontend(){},log:{warn(){}}};
 viewRegistry().open(undefined,'chat');try{
  await restorePreviousImage(api,{type:'vn_restore_previous_image',chatId:'chat',messageId:'msg-1',sourceFingerprint:key.sourceFingerprint,swipeId:0,revision:0,jobId:'job-1',versionId:selected.versionId});
  const restored=data.get(path) as StoredTurnRecord;expect(restored.jobs[0]?.imageId).toBe('image-a');expect(restored.jobs[0]?.promptFingerprint).toBe('fp123456');expect(restored.plan.visualCues[0]?.character).toBe('Nadine');expect(restored.plan.visualCues[0]?.imageTemplate?.category).toBe('portrait');expect(restored.imageRequests?.at(-1)?.prompt).toBe('Nadine in her coat');expect(restored.imageRequests?.at(-1)?.negativePrompt).toBe('negative request-a');
  const view=turnView(restored);expect(view.assets[0]?.stageAsset?.character).toBe('Nadine');expect(view.assets[0]?.stageAsset?.role).toBe('portrait');expect((view.assets[0]?.previousVersions?.[0] as any)?.provenance).toBeUndefined();
  const other=restored.previousVersions?.['job-1']?.find(version=>version.imageId==='image-b')!;await restorePreviousImage(api,{type:'vn_restore_previous_image',chatId:'chat',messageId:'msg-1',sourceFingerprint:key.sourceFingerprint,swipeId:0,revision:0,jobId:'job-1',versionId:other.versionId});
  expect(data.get(path).jobs[0].imageId).toBe('image-b');expect(data.get(path).plan.visualCues[0].character).toBe('Darby');expect(data.get(path).imageRequests.at(-1).prompt).toBe('Darby in the new scene');
 }finally{viewRegistry().close(undefined,'chat');}
});

test('legacy or changed version provenance never relabels old pixels with current metadata',async()=>{
 const {resolveImageVersion,archiveCurrentImageVersion}=await import('./image-version-provenance.js');
 const j=job('job-1','image-a','/api/v1/images/image-a'),record:StoredTurnRecord={schemaVersion:1,speaker:'Nadine',status:'ready',plan,jobs:[j],imageRequests:[archivedRequest('old-request','job-1')],updatedAt:now};
 const legacy={versionId:'legacy',imageId:'legacy-art',imageUrl:'/api/v1/images/legacy-art',timestamp:now};
 expect(resolveImageVersion(record,j,legacy).notice).toContain('Legacy');
 const version=archiveCurrentImageVersion(record,j,undefined)['job-1']![0]!;
 expect(resolveImageVersion({...record,imageRequests:[]},j,version).notice).toContain('no longer available');
 expect(resolveImageVersion({...record,imageRequests:[{...record.imageRequests![0]!,prompt:'Changed prompt'}]},j,version).notice).toContain('no longer available');
 expect(resolveImageVersion({...record,plan:{...plan,key:{...key,revision:1}}},j,version).notice).toContain('different source');
 const publicView=turnView({...record,previousVersions:{'job-1':[legacy]}}).assets[0]!.previousVersions![0]!;expect(publicView.restorable).toBe(false);expect(publicView.restoreNotice).toContain('Legacy');expect((publicView as any).provenance).toBeUndefined();
 const path=turnPath('chat','msg-1',0),data=new Map<string,any>([[path,{...record,previousVersions:{'job-1':[legacy]}}],[chatStatePath('chat'),{schemaVersion:1,activeTurnPath:path,latestScene:null,terminalContinuity:null,updatedAt:now}]]);let writes=0;const api:any={userStorage:{getJson:async(path:string,options:any)=>data.get(path)??options?.fallback??null,setJson:async()=>{writes++;}},sendToFrontend(){},log:{warn(){}}};
 viewRegistry().open(undefined,'chat');try{await expect(restorePreviousImage(api,{type:'vn_restore_previous_image',chatId:'chat',messageId:'msg-1',sourceFingerprint:key.sourceFingerprint,swipeId:0,revision:0,jobId:'job-1',versionId:'legacy'})).rejects.toThrow('Legacy');expect(writes).toBe(0);expect(data.get(path).jobs[0].imageId).toBe('image-a');}finally{viewRegistry().close(undefined,'chat');}
});
