import {registerVisualNovelBackend} from "./controller.js";
import {test,expect} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {scanCastContext} from './cast-context.js';
import {manageCastArt} from './cast-art.js';
import {loadCharacterAppearance} from './storage.js';
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
 const f=fixture();f.data.set('u:chats/chat/cast-art.json',{version:1,characters:Array.from({length:32},(_,i)=>({entityId:'old'+i,name:'Saved '+i,description:'black hair, green eyes',artRevision:0,preferredVariantId:null,variants:[],setup:{appearance:'black hair, green eyes',aliases:[],outfits:[],defaultOutfitId:null}}))});
 const scan=await scanCastContext(f.api,'chat','u');expect(scan.candidates[0]!.name).toBe('Rena');expect(scan.candidates).toHaveLength(32);expect(scan.notice).toMatch(/limit|omitted/i);
});
