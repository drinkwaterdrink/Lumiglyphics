import { test, expect } from 'bun:test';
import { ContextSourceSession } from './session.js';
const cfg={lumibooks:true,lumiscriptEndpoint:''};
const snapshot=(userId:string,chatId:string)=>({userId,chatId,updatedAt:Date.now(),fileStates:{},files:{characters:{entities:[{id:'a',name:'Hidden name',appearance:'secret'}]}}});
test('source reports contain status only and never names or facts',async()=>{
 const session=new ContextSourceSession();
 const result=await session.refresh({rpcPool:{read:async()=>snapshot('u','c')}} as any,cfg,'u','c','r');
 expect(result?.sources[0]?.recordCount).toBe(1);expect(JSON.stringify(result)).not.toContain('secret');expect(JSON.stringify(result)).not.toContain('Hidden name');
});
test('a replacement refresh supersedes late reads and stays isolated by user',async()=>{
 const session=new ContextSourceSession();let resolve!: (v:unknown)=>void;
 const spindle={rpcPool:{read:async()=>new Promise(r=>resolve=r)}} as any;
 const old=session.refresh(spindle,cfg,'u','old','old');
 // Let config/read begin before replacing the request.
 await Promise.resolve();await Promise.resolve();
 const newer=session.refresh({} as any,cfg,'u','new','new');
 resolve(snapshot('u','old'));
 expect(await old).toBeNull();expect((await newer)?.chatId).toBe('new');
 const other=await session.refresh({rpcPool:{read:async()=>snapshot('other','c')}} as any,cfg,'other','c','other');
 expect(other?.sources[0]?.status).toBe('available');
});
test('scope cancellation during configuration load prevents source reads',async()=>{
 const session=new ContextSourceSession();let resolve!: (v:typeof cfg)=>void;let calls=0;
 const config=new Promise<typeof cfg>(r=>resolve=r);
 const result=session.refresh({rpcPool:{read:async()=>{calls++;return null;}}} as any,config,'u','c','r');
 session.cancel('u');resolve(cfg);
 expect(await result).toBeNull();expect(calls).toBe(0);
});
