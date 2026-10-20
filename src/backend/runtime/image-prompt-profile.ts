import type {SpindleAPI} from 'lumiverse-spindle-types';
import type {VisualNovelConfig} from '../../config.js';
import {parsePromptCapabilities,resolveImagePromptProfile,type ImagePromptProfile} from '../../shared/image-prompt-profile.js';
import {parseModelOutputCatalog,chooseModelOutput,type ModelOutputCapabilities} from '../../shared/model-output-capabilities.js';
import type {ImageGenerationRequest} from './image-review.js';

// Public, unauthenticated metadata only. Never forward user prompts or connection credentials.
type Catalog={prompts:Map<string,number>;outputs:Map<string,ModelOutputCapabilities>};
const caches=new WeakMap<SpindleAPI,{until:number;value:Catalog;pending?:Promise<Catalog>}>();
async function capabilities(spindle:SpindleAPI):Promise<Catalog>{
 let cache=caches.get(spindle);if(cache&&cache.until>Date.now())return cache.pending??cache.value;
 cache={until:Date.now()+60000,value:cache?.value??{prompts:new Map(),outputs:new Map()}};caches.set(spindle,cache);
 const current=cache;
 current.pending=(async()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const response=await Promise.race([Promise.resolve().then(()=>spindle.cors('https://api.nano-gpt.com/api/v1/images/models',{method:'GET'})),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Model discovery timeout')),2000);})]) as {status?:number;body?:unknown};
   if(response?.status!==undefined&&(response.status<200||response.status>=300))throw new Error('Model discovery unavailable');
   const raw=response?.body??response;
   if(typeof raw==='string'&&raw.length>2000000)throw new Error('Model discovery too large');
   const body=typeof raw==='string'?JSON.parse(raw):raw;
   if(!body||typeof body!=='object'||!Array.isArray((body as {data?:unknown}).data)||(body as {data:unknown[]}).data.length>2000)throw new Error('Invalid model discovery response');
   current.value={prompts:parsePromptCapabilities(body),outputs:parseModelOutputCatalog(body)};current.until=Date.now()+3600000;
  }catch{current.value={prompts:new Map(),outputs:new Map()};current.until=Date.now()+60000;}finally{if(timer)clearTimeout(timer);delete current.pending;}
  return current.value;
 })();return current.pending;
}
export async function loadImagePromptProfile(spindle:SpindleAPI,config:VisualNovelConfig,provider:string|null|undefined,model:string|null|undefined):Promise<ImagePromptProfile>{
 const live=config.automaticImagePromptSettings&&provider?.toLowerCase()==='nanogpt'&&typeof spindle.cors==='function'?await capabilities(spindle):undefined;
 return resolveImagePromptProfile(provider,model,config,live?.prompts,live?.outputs);
}
export async function plannerImagePromptProfile(spindle:SpindleAPI,config:VisualNovelConfig,userId?:string):Promise<ImagePromptProfile>{
 try{
  const id=config.imageConnectionId?.split('::')[0];
  const selected=id&&typeof spindle.imageGen?.getConnection==='function'?await spindle.imageGen.getConnection(id,userId):typeof spindle.imageGen?.listConnections==='function'?(await spindle.imageGen.listConnections(userId)).find(c=>c.is_default):undefined;
  return await loadImagePromptProfile(spindle,config,selected?.provider,config.imageModel||selected?.model);
 }catch{return resolveImagePromptProfile(undefined,config.imageModel,config);}
}

/** Resolve size before review; never revisit the live catalogue for an approved request. */
export function prepareCapabilityOutput(request:ImageGenerationRequest,requestedRatio?:string):ImageGenerationRequest{
 const profile=request.promptProfile;if(!profile?.output)return request;
 const prepared=chooseModelOutput(profile.output,request.parameters??{},requestedRatio);
 const parameters=prepared.parameters;
 const managed=parameters.rawRequestOverride===undefined||parameters._lumiglyphicsCatalogOutput===true||parameters._lumiglyphicsAnimaAspect===true||parameters._lumiglyphicsQwenOutput===true;
 return {...request,parameters,promptProfile:{...profile,outputManaged:managed,outputSummary:`${profile.outputSource==='live'?'Live catalogue':'Catalogue snapshot'}: ${prepared.summary}`}};
}
