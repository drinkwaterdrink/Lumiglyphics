import {expect,test} from 'bun:test';
import {DisplayRuleExecutor,type DisplayWorker} from './display-rule-executor.js';
class WorkerStub implements DisplayWorker{
 onmessage:((event:{data:any})=>void)|null=null;onerror:(()=>void)|null=null;terminated=false;job:any;
 constructor(private respond=true){queueMicrotask(()=>this.onmessage?.({data:{ready:true}}));}
 postMessage(job:any){this.job=job;if(this.respond)queueMicrotask(()=>this.onmessage?.({data:{generation:job.generation,text:'changed',issues:[]}}));}
 terminate(){this.terminated=true;}
}
test('execution occurs off-thread and always terminates the owned worker',async()=>{const w=new WorkerStub();const e=new DisplayRuleExecutor(()=>w);const result=await e.evaluate({text:'hello',rulesSource:'/hello/ => changed',generation:'a'});expect(result.text).toBe('changed');expect(w.terminated).toBe(true);});
test('unavailable workers preserve text and report a visible fallback reason',async()=>{const e=new DisplayRuleExecutor(()=>{throw new Error('blocked');});const r=await e.evaluate({text:'hello',rulesSource:'/hello/ => hidden',generation:'a'});expect(r.text).toBe('hello');expect(r.issues[0]?.message).toContain('unavailable');});
test('a hung rule is terminated, and cancellation settles obsolete work',async()=>{const w=new WorkerStub(false),e=new DisplayRuleExecutor(()=>w,{timeoutMs:5});const r=await e.evaluate({text:'hello',rulesSource:'/hello/ => hidden',generation:'a'});expect(w.terminated).toBe(true);expect(r.text).toBe('hello');expect(r.issues[0]?.message).toContain('deadline');const abort=new AbortController();const e2=new DisplayRuleExecutor(()=>new WorkerStub(false));const pending=e2.evaluate({text:'hello',rulesSource:'/hello/ => hidden',generation:'old'},abort.signal);abort.abort();await expect(pending).rejects.toThrow('cancelled');});
