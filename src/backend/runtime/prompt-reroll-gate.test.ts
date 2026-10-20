import {expect,test} from 'bun:test';
import {ImageReviewGate} from './image-review.js';
const input={prompt:'Original station portrait',negativePrompt:'blur',parameters:{seed:12}};
test('reroll blocks duplicate approvals and keeps the new prompt waiting for approval',async()=>{
 const records:any[]=[];let finish!:(value:any)=>void;
 const gate=new ImageReviewGate(async record=>{records.push(record);});
 const pending=gate.prepare('job',0,input,{provider:'nanogpt',regeneratePrompt:()=>new Promise(resolve=>{finish=resolve;})},true,new AbortController().signal);
 await Promise.resolve();const old=records.at(-1).requestId;
 const reroll=gate.regenerate(old);
 expect(gate.decide(old,'generate',{})).toBe(false);expect(await gate.regenerate(old)).toBe(false);
 finish({...input,prompt:'A different view of the station'});expect(await reroll).toBe(true);
 const fresh=records.at(-1);expect(fresh.requestId).not.toBe(old);expect(fresh.state).toBe('review');expect(fresh.canRegeneratePrompt).toBe(true);
 expect(gate.decide(old,'generate',{})).toBe(false);expect(gate.decide(fresh.requestId,'generate',{})).toBe(true);expect((await pending).prompt).toBe(fresh.prompt);
});
test('failed rerolls restore the original approval and permit retry or manual editing',async()=>{
 const records:any[]=[];const gate=new ImageReviewGate(async r=>{records.push(r);});
 const pending=gate.prepare('job',0,input,{provider:'nanogpt',regeneratePrompt:async()=>{throw new Error('writer unavailable');}},true,new AbortController().signal);
 await Promise.resolve();const id=records[0].requestId;
 await expect(gate.regenerate(id)).rejects.toThrow('writer unavailable');
 expect(gate.decide(id,'generate',{prompt:'Manually corrected station'})).toBe(true);expect((await pending).prompt).toContain('Manually');
});
test('closing during a reroll makes cancellation final and late text cannot reappear',async()=>{
 const records:any[]=[];let finish!:(value:any)=>void;const controller=new AbortController();
 const gate=new ImageReviewGate(async r=>{records.push(r);});
 const pending=gate.prepare('job',0,input,{provider:'nanogpt',regeneratePrompt:()=>new Promise(resolve=>{finish=resolve;})},true,controller.signal);
 const observed=pending.catch(e=>e);await Promise.resolve();const id=records[0].requestId;
 const reroll=gate.regenerate(id);controller.abort();finish({...input,prompt:'Late prompt'});
 await expect(reroll).rejects.toThrow();expect((await observed).name).toBe('AbortError');expect(records.at(-1).state).toBe('cancelled');expect(await gate.regenerate(id)).toBe(false);
});

test('repair receives edited oversized wording while preserving parameters and approval ownership',async()=>{
 const records:any[]=[];let received:any;
 const gate=new ImageReviewGate(async r=>{records.push(r);});
 const pending=gate.prepare('edited',0,input,{provider:'nanogpt',regeneratePrompt:async draft=>{received=draft;return {...draft,prompt:'A repaired station portrait',negativePrompt:'blur'};}},true,new AbortController().signal);
 await Promise.resolve();const id=records[0].requestId;
 expect(await gate.regenerate(id,{prompt:'Edited appearance. '+'x'.repeat(5000),negativePrompt:'duplicate blur'})).toBe(true);
 expect(received.prompt).toContain('Edited appearance.');expect(received.prompt.length).toBeGreaterThan(3000);expect(received.parameters.seed).toBe(12);
 const fresh=records.at(-1);expect(fresh.state).toBe('review');expect(gate.decide(id,'generate',{})).toBe(false);
 gate.decide(fresh.requestId,'generate',{});expect((await pending).prompt).toBe('A repaired station portrait');
});

test('repairing one picture does not cancel or rewrite another picture in the same batch',async()=>{
 const records:any[]=[];let rewrites=0;const gate=new ImageReviewGate(async r=>{records.push(r);});
 const metadata={provider:'nanogpt',regeneratePrompt:async(draft:any)=>{rewrites++;return {...draft,prompt:'Repaired selected picture'};}};
 const first=gate.prepare('bad',0,input,metadata,true,new AbortController().signal);
 const other=gate.prepare('good',1,{...input,prompt:'Good picture stays unchanged'},metadata,true,new AbortController().signal);
 await Promise.resolve();const bad=records.find(r=>r.jobId==='bad'),good=records.find(r=>r.jobId==='good');
 gate.decide(good.requestId,'generate',{});expect((await other).prompt).toBe('Good picture stays unchanged');
 await gate.regenerate(bad.requestId);expect(rewrites).toBe(1);
 expect(records.filter(r=>r.jobId==='good').at(-1).state).toBe('approved');
 gate.decide(records.filter(r=>r.jobId==='bad').at(-1).requestId,'generate',{});await first;
});
