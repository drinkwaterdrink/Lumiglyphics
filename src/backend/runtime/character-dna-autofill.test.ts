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
