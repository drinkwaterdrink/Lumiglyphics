import { test, expect } from 'bun:test';
import { collectContextSources, optionalRpcReader } from './index.js';
import { normalizeLumiBooks } from './lumibooks.js';
import { normalizeContextSources } from '../../../shared/context-sources.js';
const scope={userId:'u',chatId:'c'};
const config={lumibooks:true,lumiscriptEndpoint:'lumiscript.story.state'};
const snapshot=()=>({...scope,updatedAt:1000,fileStates:{},files:{characters:{entities:[{id:'char:a',name:'Aleister',appearance:'dark hair',notes:'secret',aliases:['Al'],noInject:false}]},locations:{entities:[]},things:{entities:[]}}});
test('absent and disabled sources never become required or invoke a read',async()=>{
 let calls=0;
 const disabled=await collectContextSources(async()=>{calls++;return null;},normalizeContextSources({}),scope,new AbortController().signal);
 expect(calls).toBe(0);expect(disabled.map(e=>e.status.status)).toEqual(['disabled','disabled']);
 expect(optionalRpcReader({} as any)).toBeUndefined();
 expect((await collectContextSources(undefined,config,scope,new AbortController().signal)).every(e=>e.status.status==='unavailable')).toBe(true);
});
test('codex reference evidence respects scope, disabled/frozen files and record flags',()=>{
 const value=snapshot();
 const available=normalizeLumiBooks(value,scope,1100);
 expect(available.status.recordCount).toBe(1);expect(available.status.publicFactCount).toBe(0);
 expect(available.proposal?.entities[0]?.facts).toEqual([{field:'appearance',value:'dark hair',visibility:'unclassified'}]);
 expect(JSON.stringify(available)).not.toContain('secret');
 for(const flag of ['noInject','frozen','other']) expect(normalizeLumiBooks({...value,fileStates:{characters:flag}},scope,1100).status.recordCount).toBe(0);
 value.files.characters.entities[0]!.noInject=true;
 expect(normalizeLumiBooks(value,scope,1100).status.recordCount).toBe(0);
 expect(normalizeLumiBooks({...value,userId:'other'},scope,1100).status.status).toBe('invalid');
 expect(normalizeLumiBooks({...value,chatId:'other'},scope,1100).status.status).toBe('invalid');
 expect(normalizeLumiBooks(null,scope,1100).status.status).toBe('cleared');
});
test('normalized scripts are versioned, bounded and explicitly classified',async()=>{
 const proposal={version:1,...scope,updatedAt:1000,entities:[{id:'a',kind:'npc',name:'Aleister',facts:[{field:'appearance',value:'dark hair',visibility:'observed'},{field:'condition',value:'secret',visibility:'private'}]}]};
 const read=async(e:string)=>e.startsWith('lumi_books')?snapshot():proposal;
 const evidence=await collectContextSources(read,config,scope,new AbortController().signal,{now:1100});
 expect(evidence[1]!.status.publicFactCount).toBe(1);
 for(const bad of [{...proposal,version:2},{...proposal,userId:'other'},{...proposal,entities:[...proposal.entities,...proposal.entities]},{...proposal,updatedAt:100_000}]) {
  const result=await collectContextSources(async()=>bad,{...config,lumibooks:false},scope,new AbortController().signal,{now:1100});
  expect(result[1]!.status.status).toBe('invalid');
 }
});
test('revocation and null wipes clear source contributions on the next collection',async()=>{
 const read=async()=>{throw new Error('private provider error');};
 const unavailable=await collectContextSources(read,config,scope,new AbortController().signal);
 expect(unavailable.every(e=>e.status.status==='unavailable'&&!e.proposal)).toBe(true);
 expect(JSON.stringify(unavailable)).not.toContain('private provider error');
 const cleared=await collectContextSources(async()=>null,config,scope,new AbortController().signal);
 expect(cleared.every(e=>e.status.status==='cleared'&&!e.proposal)).toBe(true);
});
test('aborted late reads never return evidence from a previous scope',async()=>{
 let release!: (v:unknown)=>void;const pending=new Promise(resolve=>release=resolve);const abort=new AbortController();
 const result=collectContextSources(async()=>pending,config,scope,abort.signal);
 abort.abort();release(snapshot());
 expect((await result).every(e=>e.status.status==='unavailable'&&!e.proposal)).toBe(true);
});
test('source age is labeled and endpoint config cannot select arbitrary extensions',()=>{
 expect(normalizeLumiBooks(snapshot(),scope,400_000).status.freshness).toBe('stale');
 expect(normalizeContextSources({lumiscriptEndpoint:'other.write',lumibooks:'true'})).toEqual({lumibooks:false,lumiscriptEndpoint:''});
});
test('reads have a bounded deadline and late results cannot replace the timeout report',async()=>{
 let release!: (v:unknown)=>void;const deferred=new Promise(r=>release=r);
 const pending=collectContextSources(async()=>deferred,config,scope,new AbortController().signal,{deadlineMs:5});
 const [result]=await Promise.all([pending,new Promise(resolve=>setTimeout(resolve,20))]);
 expect(result.every(e=>e.status.status==='timed_out'&&!e.proposal)).toBe(true);
 release(snapshot());await Promise.resolve();
 expect(result.every(e=>e.status.status==='timed_out'&&!e.proposal)).toBe(true);
});
