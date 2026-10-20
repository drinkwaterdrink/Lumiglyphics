import type {SpindleAPI} from 'lumiverse-spindle-types';
import type {VisualNovelConfig} from '../../config.js';
import {parsePromptCapabilities,resolveImagePromptProfile,type ImagePromptProfile} from '../../shared/image-prompt-profile.js';

// Public, unauthenticated metadata only. Never forward user prompts or connection credentials.
const caches=new WeakMap<SpindleAPI,{until:number;value:Map<string,number>;pending?:Promise<Map<string,number>>}>();
async function capabilities(spindle:SpindleAPI):Promise<Map<string,number>>{
 let cache=caches.get(spindle);if(cache&&cache.until>Date.now())return cache.pending??cache.value;
 cache={until:Date.now()+60000,value:cache?.value??new Map()};caches.set(spindle,cache);
 const current=cache;
 current.pending=(async()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const response=await Promise.race([spindle.cors('https://api.nano-gpt.com/api/v1/images/models',{method:'GET'}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Model discovery timeout')),2000);})]) as {status?:number;body?:unknown};
   if(response?.status!==undefined&&(response.status<200||response.status>=300))throw new Error('Model discovery unavailable');
   const raw=response?.body??response;
   if(typeof raw==='string'&&raw.length>2000000)throw new Error('Model discovery too large');
   current.value=parsePromptCapabilities(typeof raw==='string'?JSON.parse(raw):raw);current.until=Date.now()+3600000;
  }catch{current.until=Date.now()+60000;}finally{if(timer)clearTimeout(timer);delete current.pending;}
  return current.value;
 })();return current.pending;
}
export async function loadImagePromptProfile(spindle:SpindleAPI,config:VisualNovelConfig,provider:string|null|undefined,model:string|null|undefined):Promise<ImagePromptProfile>{
 const live=config.automaticImagePromptSettings&&provider?.toLowerCase()==='nanogpt'&&typeof spindle.cors==='function'?await capabilities(spindle):undefined;
 return resolveImagePromptProfile(provider,model,config,live);
}
export async function plannerImagePromptProfile(spindle:SpindleAPI,config:VisualNovelConfig,userId?:string):Promise<ImagePromptProfile>{
 try{
  const id=config.imageConnectionId?.split('::')[0];
  const selected=id&&typeof spindle.imageGen?.getConnection==='function'?await spindle.imageGen.getConnection(id,userId):typeof spindle.imageGen?.listConnections==='function'?(await spindle.imageGen.listConnections(userId)).find(c=>c.is_default):undefined;
  return await loadImagePromptProfile(spindle,config,selected?.provider,config.imageModel||selected?.model);
 }catch{return resolveImagePromptProfile(undefined,config.imageModel,config);}
}
