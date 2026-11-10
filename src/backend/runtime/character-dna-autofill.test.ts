import {it,expect} from 'bun:test';
import {createEmptyCharacterDNA} from '../../shared/character-dna.js';
import {collectCharacterDnaEvidence,proposeCharacterDna,targetDnaPassages} from './character-dna-autofill.js';
it('matches complete literal Unicode names rather than substrings or regex syntax',()=>{
 expect(targetDnaPassages('Hannah has red hair.',['Ann'])).toEqual([]);
 expect(targetDnaPassages('李雨 enters. She has hazel eyes.',['李雨']).join(' ')).toContain('hazel');
 expect(targetDnaPassages('A.+ is a woman.',['A.+']).join(' ')).toContain('woman');
});
it('rejects unsupported output after one format repair and never saves or calls images',async()=>{
 let calls=0;const s:any={connections:{list:async()=>[{id:'t',provider:'openai',model:'m',is_default:true}]},generate:{raw:async()=>{calls++;return{content:'{"changes":[{"path":"id","value":"intruder","classification":"generated","sourceRefs":[]}]}'};}}};
 await expect(proposeCharacterDna(s,{chatId:'c',userId:'u',target:createEmptyCharacterDNA('Nadine'),config:{} as any,signal:new AbortController().signal,revision:0,evidence:{evidence:[],statuses:[]}})).rejects.toThrow('invalid proposal');expect(calls).toBe(2);
 const target=createEmptyCharacterDNA('Nadine');target.locked=true;await expect(proposeCharacterDna(s,{chatId:'c',userId:'u',target,config:{} as any,signal:new AbortController().signal,revision:0,evidence:{evidence:[],statuses:[]}})).rejects.toThrow('Unlock');expect(calls).toBe(2);
});
it('does not dispatch a text request when cancellation wins the connection-to-generation boundary',async()=>{
 const cancel=new AbortController();let calls=0;
 const s:any={connections:{list:async()=>{queueMicrotask(()=>queueMicrotask(()=>queueMicrotask(()=>cancel.abort())));return[{id:'t',provider:'openai',model:'m',is_default:true}];}},generate:{raw:async()=>{calls++;return{content:'{"changes":[]}'};}}};
 await expect(proposeCharacterDna(s,{chatId:'c',userId:'u',target:createEmptyCharacterDNA('Nadine'),config:{} as any,signal:cancel.signal,revision:0,evidence:{evidence:[],statuses:[]}})).rejects.toThrow('cancelled');expect(calls).toBe(0);
});
it('collects scenario, enabled lore, tracker and Codex evidence without writing a profile',async()=>{
 const calls:string[]=[];const s:any={userStorage:{getJson:async(_:string,o:any)=>o?.fallback??null},chat:{getMessages:async()=>[{id:'m',content:'Darby is a boy. Nadine steps forward. She is in her mid forties.',is_user:false}]},chats:{get:async()=>({character_id:'card'})},characters:{get:async()=>({name:'Scenario',description:'Nadine Pruitt works here.',scenario:'Nadine has hazel eyes.',tags:[]})},personas:{getActive:async()=>null},world_books:{getActivated:async()=>{calls.push('lore');return[];}},rpcPool:{read:async()=>{calls.push('codex');return null;}}};
 const config:any={includeCharacterContext:true,includePersonaContext:false,includeLorebookContext:true,includeSimTrackerContext:false,contextSources:{lumibooks:true,lumiscriptEndpoint:''}};
 const evidence=await collectCharacterDnaEvidence(s,{chatId:'c',userId:'u',target:createEmptyCharacterDNA('Nadine'),config,signal:new AbortController().signal});
 expect(calls).toEqual(['lore','codex']);expect(evidence.evidence.map(e=>e.text).join('\n')).toContain('mid forties');expect(evidence.evidence.map(e=>e.text).join('\n')).toContain('hazel');
});
it('calls the text model for a scoped proposal, normalizes gender and never auto-saves',async()=>{
 const calls:any[]=[];const target=createEmptyCharacterDNA('Nadine');
 const s:any={connections:{list:async()=>[{id:'text',provider:'openai',model:'m',type:'text',enabled:true}]},generate:{raw:async(r:any)=>{calls.push(r);return{content:JSON.stringify({changes:[{path:'build.gender',value:'female',classification:'inferred',sourceRefs:['story:0']},{path:'hair.color',value:'auburn',classification:'generated',sourceRefs:[]}]})};}}};
 const config:any={plannerConnectionId:'text'};
 const result=await proposeCharacterDna(s,{chatId:'c',userId:'u',target,config,signal:new AbortController().signal,revision:0,evidence:{evidence:[{id:'story:0',source:'Story',text:'Nadine enters. She greets Darby.',kind:'context'}],statuses:[]},fields:['build.gender','hair.color']});
 expect(calls).toHaveLength(1);expect(calls[0].userId).toBe('u');expect(result.changes[0]?.value).toBe('woman');expect(result.changes[1]?.classification).toBe('generated');
});

it('uses canonical saved reader paragraphs for tagged dialogue and never sends unread or filtered text',async()=>{
 const {TurnPlanSchema}=await import('../../shared/contracts.js');const {fingerprintForMessage}=await import('./planner.js');
 const source='<dialogue speaker="Nadine">Nadine opens the door.</dialogue><status>Nadine secret tracker payload.</status><dialogue speaker="Nadine">Nadine reveals her hidden silver hair.</dialogue>';
 const key={chatId:'c',assistantMessageId:'m',swipeId:0,sourceFingerprint:fingerprintForMessage({id:'m',swipe_id:0,content:source}),revision:2};
 const plan=TurnPlanSchema.parse({schemaVersion:1,key,paragraphs:[{index:0,sourceIndex:0,text:'Nadine opens the door.'},{index:1,sourceIndex:1,text:'Nadine reveals her hidden silver hair.'}],scenes:[{sceneId:'s',revision:0,startParagraph:0,environment:{location:'Room',timeOfDay:'day',weather:null,lighting:'daylight',description:'Room',persistentElements:[]},cast:['Nadine'],continuity:{revision:0,characters:{},facts:{}},basePrompt:'room',cameraLock:{framing:'wide',angle:'eye level',perspective:'fixed',lens:'50mm',subjectAnchor:'center',horizon:'upper third',safeDialogueRegion:'lower third',aspectRatio:'16:9'},compositionLock:'center',activeAssetId:null,priorSceneId:null}],visualCues:[],choices:[],initialContinuity:{revision:0,characters:{},facts:{}},continuityDeltas:[],terminalContinuity:{revision:0,characters:{},facts:{}},planningStatus:'planned',createdAt:new Date().toISOString()});
 let record:any={schemaVersion:1,speaker:'Nadine',status:'ready',plan,jobs:[],source:{version:2,rawFingerprint:key.sourceFingerprint},updatedAt:new Date().toISOString()};let message=source,swipe=0,index=0;
 const api:any={userStorage:{getJson:async(path:string,options:any)=>path.endsWith('reading-position.json')?{version:1,key,paragraphIndex:index}:path.startsWith('turns/')?record:options?.fallback??null},chat:{getMessages:async()=>[{id:'m',swipe_id:swipe,content:message,is_user:false},{id:'future',swipe_id:0,content:'Nadine reveals a future scar.',is_user:false}]},chats:{get:async()=>({character_id:null})},personas:{getActive:async()=>null}};
 const collect=()=>collectCharacterDnaEvidence(api,{chatId:'c',userId:'u',target:createEmptyCharacterDNA('Nadine'),config:{includeCharacterContext:false,includePersonaContext:false,includeLorebookContext:false,includeSimTrackerContext:false,contextSources:{lumibooks:false,lumiscriptEndpoint:''}} as any,signal:new AbortController().signal});
 let result=await collect();let story=result.evidence.filter(e=>e.source.startsWith('Story ')).map(e=>e.text).join(' ');expect(story).toContain('opens the door');expect(story).not.toMatch(/silver|secret tracker|future scar/);
 index=1;result=await collect();expect(result.evidence.map(e=>e.text).join(' ')).toContain('silver hair');
 index=0;message='Nadine has edited blue hair.';result=await collect();expect(result.evidence.filter(e=>e.source.startsWith('Story '))).toEqual([]);
 message=source;record={...record,plan:{...plan,key:{...key,revision:3}}};result=await collect();expect(result.evidence.filter(e=>e.source.startsWith('Story '))).toEqual([]);
 record=null;result=await collect();expect(result.evidence.filter(e=>e.source.startsWith('Story '))).toEqual([]);
 swipe=1;result=await collect();expect(result.evidence.filter(e=>e.source.startsWith('Story '))).toEqual([]);
});


it('matches SimTracker character using aliases, tracker2 tags, and word boundaries', async () => {
  const s: any = {
    chat: {
      getMessages: async () => [{
        id: 'msg1',
        content: 'Conversation.\n<tracker2>\ncharacters:\n  Lady Marseline Vane:\n    aliases: [Mars, Vane]\n    appearance: tall with thick black hair and bronze eyes\n    attire: linen work shirt with rolled sleeves\n</tracker2>',
        is_user: false
      }]
    },
    chats: { get: async () => ({ character_id: null }) },
    personas: { getActive: async () => null },
    userStorage: { getJson: async () => null }
  };
  const target = createEmptyCharacterDNA('Marseline');
  target.aliases = ['Vane'];
  const config: any = { includeSimTrackerContext: true, includeCharacterContext: false, includeLorebookContext: false };
  const evidence = await collectCharacterDnaEvidence(s, { chatId: 'c', userId: 'u', target, config, signal: new AbortController().signal });
  const trackerEv = evidence.evidence.find(e => e.source === 'SimTracker');
  expect(trackerEv).toBeDefined();
  expect(trackerEv?.text).toContain('bronze eyes');
  expect(trackerEv?.text).toContain('linen work shirt');
  expect(evidence.statuses.find(s => s.source === 'SimTracker')?.status).toBe('available');
});

it('sanitizes generic everyday casual attire fallbacks during proposal', async () => {
  const target = createEmptyCharacterDNA('Cassidy');
  const s: any = {
    connections: { list: async () => [{ id: 'text', provider: 'openai', model: 'm', type: 'text', enabled: true }] },
    generate: {
      raw: async () => ({
        content: JSON.stringify({
          changes: [
            { path: 'signatureOutfit', value: 'everyday casual attire', classification: 'generated', sourceRefs: [] },
            { path: 'activeOutfit', value: 'casual clothes', classification: 'generated', sourceRefs: [] }
          ]
        })
      })
    }
  };
  const result = await proposeCharacterDna(s, {
    chatId: 'c', userId: 'u', target, config: { plannerConnectionId: 'text' } as any,
    signal: new AbortController().signal, revision: 0,
    evidence: { evidence: [], statuses: [] },
    fields: ['signatureOutfit', 'activeOutfit']
  });
  expect(result.changes.find(c => c.path === 'signatureOutfit')?.value).toBe('');
  expect(result.changes.find(c => c.path === 'activeOutfit')?.value).toBe('');
});