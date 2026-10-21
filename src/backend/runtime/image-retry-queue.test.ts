import {test,expect} from 'bun:test';
import {ImageRetryQueue} from './image-retry-queue.js';
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
test('queued image retries are serial, deduplicated, bounded and continue after one fails',async()=>{
 const calls:string[]=[];const releases:Array<()=>void>=[];
 const q=new ImageRetryQueue(async id=>{calls.push(id);await new Promise<void>(r=>releases.push(r));if(id==='b')throw Error('failed');},()=>false,()=>{},()=>{});
 q.enqueue('request-1',['a','b','a']);q.enqueue('request-2',['a','c']);
 expect(calls).toEqual(['a']);expect(q.snapshot()).toEqual({activeJobId:'a',jobIds:['b','c']});
 releases.shift()!();await flush();expect(calls).toEqual(['a','b']);releases.shift()!();await flush();expect(calls).toEqual(['a','b','c']);releases.shift()!();await flush();
 q.enqueue('request-1',['a']);expect(calls).toEqual(['a','b','c']);
});
test('busy existing batch delays retries until wake; clear prevents later queued spending',async()=>{
 let busy=true;const calls:string[]=[];const q=new ImageRetryQueue(async id=>{calls.push(id);},()=>busy,()=>{},()=>{});
 q.enqueue('one',['a','b']);expect(calls).toEqual([]);busy=false;q.wake();await flush();expect(calls).toEqual(['a','b']);
 busy=true;q.enqueue('two',['c']);q.cancel();busy=false;q.wake();await flush();expect(calls).toEqual(['a','b']);
});

test('queue bounds and cancellation snapshots do not advertise cancelled requests as running',async()=>{
 let release!:()=>void;const q=new ImageRetryQueue(async()=>new Promise<void>(r=>release=r),()=>false,()=>{},()=>{});
 q.enqueue('large',Array.from({length:24},(_,i)=>String(i)));
 expect(()=>q.enqueue('overflow',['extra'])).toThrow(/full/);
 q.clearPending();expect(q.snapshot()).toEqual({activeJobId:'0',jobIds:[]});
 q.cancel();expect(q.snapshot()).toEqual({activeJobId:null,jobIds:[]});release();await flush();
});
