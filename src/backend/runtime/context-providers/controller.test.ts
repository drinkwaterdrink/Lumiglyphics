import { test, expect } from 'bun:test';
import { registerVisualNovelBackend } from '../controller.js';
test('source refresh waits for a preceding source configuration save',async()=>{
 let receive!: (payload:unknown,userId:string)=>void;
 let stored:any={contextSources:{lumibooks:true,lumiscriptEndpoint:''},generateImages:false};
 let release!:()=>void;const blocked=new Promise<void>(r=>release=r);let saving=false;let reads=0;
 const sent:any[]=[];
 const spindle={
  on:()=>{},onFrontendMessage:(cb:typeof receive)=>receive=cb,
  userStorage:{getJson:async(_:string,o:any)=>stored??o.fallback,setJson:async(_:string,v:any)=>{saving=true;await blocked;stored=v;}},
  rpcPool:{read:async()=>{reads++;return null;}},
  sendToFrontend:(message:any)=>sent.push(message),log:{info:()=>{},warn:()=>{},error:()=>{}},storage:{list:async()=>[]}
 } as any;
 registerVisualNovelBackend(spindle);
 receive({type:'vn_set_config',patch:{contextSources:{lumibooks:false,lumiscriptEndpoint:''}}},'context-race-user');
 for(let i=0;i<20&&!saving;i++)await new Promise(r=>setTimeout(r,1));
 receive({type:'vn_get_context_sources',chatId:'chat',requestId:'race'},'context-race-user');
 await new Promise(r=>setTimeout(r,10));
 expect(reads).toBe(0);
 expect(sent.some(m=>m.type==='vn_context_sources')).toBe(false);
 release();
 for(let i=0;i<30&&!sent.some(m=>m.type==='vn_context_sources');i++)await new Promise(r=>setTimeout(r,1));
 expect(reads).toBe(0);
 expect(sent.find(m=>m.type==='vn_context_sources')?.report.sources[0].status).toBe('disabled');
});
