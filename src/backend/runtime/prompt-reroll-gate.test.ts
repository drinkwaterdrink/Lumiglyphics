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
