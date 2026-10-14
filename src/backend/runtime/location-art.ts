import type {SpindleAPI} from 'lumiverse-spindle-types';
import {LocationArtLibrarySchema,type LocationArtLibrary,type LocationArtAction} from '../../shared/stage-assets.js';
import {canonicalJson} from '../core/scene-image-cache.js';

type Runtime={tails:Map<string,Promise<void>>,epochs:Map<string,number>};
const runtimes=new WeakMap<object,Runtime>();
function runtime(api:SpindleAPI):Runtime{let r=runtimes.get(api);if(!r){r={tails:new Map(),epochs:new Map()};runtimes.set(api,r);}return r;}
function scope(chat:string,user?:string){return canonicalJson([user??null,chat]);}
function path(chat:string){return `chats/${encodeURIComponent(chat).replaceAll('%','_')}/location-art.json`;}
function options(userId?:string){return userId?{userId}:undefined;}
export function locationArtToken(api:SpindleAPI,chat:string,user?:string){return runtime(api).epochs.get(scope(chat,user))??0;}
async function transaction<T>(api:SpindleAPI,chat:string,user:string|undefined,work:()=>Promise<T>):Promise<T>{
 const r=runtime(api),key=scope(chat,user),previous=r.tails.get(key)??Promise.resolve();
 const current=previous.then(work,work),tail=current.then(()=>undefined,()=>undefined);r.tails.set(key,tail);
 try{return await current;}finally{if(r.tails.get(key)===tail)r.tails.delete(key);}
}
export async function loadLocationArt(api:SpindleAPI,chat:string,user?:string):Promise<LocationArtLibrary>{
 const raw=await api.userStorage.getJson<unknown>(path(chat),{fallback:null,...options(user)});
 if(raw===null)return {version:1,locations:[]};
 const parsed=LocationArtLibrarySchema.safeParse(raw);
 if(!parsed.success)throw new Error('Saved location art has an unsupported or invalid format; it was preserved.');
 return parsed.data;
}
export type LocationArtIdentity={location:string,description:string,requestFingerprint:string,environmentFingerprint:string};
const locationId=(name:string)=>name.trim().toLowerCase();
function variantId(art:LocationArtIdentity&{imageId:string}):string{
 const text=canonicalJson(art);
 const hash=(source:string)=>{let value=0x811c9dc5;for(let i=0;i<source.length;i++)value=Math.imul(value^source.charCodeAt(i),0x01000193)>>>0;return value.toString(16).padStart(8,'0');};
 return `place:${hash(text)}${hash(text.split('').reverse().join(''))}:${text.length}`;
}
export async function findLocationArt(api:SpindleAPI,chat:string,identity:LocationArtIdentity,user?:string):Promise<{imageId:string,imageUrl:string}|null>{
 const token=locationArtToken(api,chat,user);
 const library=await loadLocationArt(api,chat,user);
 if(token!==locationArtToken(api,chat,user))return null;
 const record=library.locations.find(r=>r.entityId===locationId(identity.location));if(!record)return null;
 const compatible=record.variants.filter(v=>v.requestFingerprint===identity.requestFingerprint&&v.environmentFingerprint===identity.environmentFingerprint);
 compatible.sort((a,b)=>Number(b.id===record.preferredVariantId)-Number(a.id===record.preferredVariantId)||b.createdAt.localeCompare(a.createdAt));
 for(const v of compatible){
  if(token!==locationArtToken(api,chat,user))return null;
  // Resolve existence under the originating user; never reuse stale signed URLs.
  try{const image=await api.images.get(v.imageId,user);if(token!==locationArtToken(api,chat,user))return null;if(image)return {imageId:v.imageId,imageUrl:`/api/v1/images/${encodeURIComponent(v.imageId)}`};}catch{/* unverifiable => normal generation */}
 }
 return null;
}
export async function saveLocationArt(api:SpindleAPI,chat:string,art:LocationArtIdentity&{imageId:string},user?:string,guard:{token?:number,signal?:AbortSignal}={}):Promise<boolean>{
 const token=guard.token??locationArtToken(api,chat,user);
 return transaction(api,chat,user,async()=>{
  if(guard.signal?.aborted||token!==locationArtToken(api,chat,user))return false;
  const library=await loadLocationArt(api,chat,user),entityId=locationId(art.location);
  let record=library.locations.find(r=>r.entityId===entityId);
  if(!record){if(library.locations.length>=128)throw new Error('Location art limit reached (128 places). Forget a place to make room.');record={entityId,name:art.location,artRevision:0,description:art.description,preferredVariantId:null,variants:[]};library.locations.push(record);}
  if(record.variants.some(v=>v.imageId===art.imageId&&v.requestFingerprint===art.requestFingerprint&&v.environmentFingerprint===art.environmentFingerprint))return true;
  if(record.variants.length>=8)throw new Error('Location art limit reached (8 variants per place). Forget a variant to make room.');
  const createdAt=new Date().toISOString();
  record.variants.push({id:variantId(art),imageId:art.imageId,requestFingerprint:art.requestFingerprint,environmentFingerprint:art.environmentFingerprint,approved:true,createdAt});record.artRevision++;
  if(guard.signal?.aborted||token!==locationArtToken(api,chat,user))return false;
  await api.userStorage.setJson(path(chat),LocationArtLibrarySchema.parse(library),options(user));return true;
 });
}
export async function manageLocationArt(api:SpindleAPI,chat:string,action:LocationArtAction,user?:string):Promise<LocationArtLibrary>{
 if(action.action==='list')return transaction(api,chat,user,()=>loadLocationArt(api,chat,user));
 const r=runtime(api),key=scope(chat,user);r.epochs.set(key,locationArtToken(api,chat,user)+1);
 return transaction(api,chat,user,async()=>{
  const library=await loadLocationArt(api,chat,user);
  if(action.action==='reset')library.locations=[];
  else{
   const record=library.locations.find(r=>r.entityId===action.locationId);if(!record)throw new Error('This location is no longer saved. Refresh the list.');
   if(action.action==='select'){
    if(!record.variants.some(v=>v.id===action.variantId))throw new Error('This variant is no longer saved. Refresh the list.');record.preferredVariantId=action.variantId!;
   }else if(action.variantId){record.variants=record.variants.filter(v=>v.id!==action.variantId);if(record.preferredVariantId===action.variantId)record.preferredVariantId=null;if(!record.variants.length)library.locations=library.locations.filter(r=>r!==record);}
   else library.locations=library.locations.filter(r=>r!==record);
  }
  await api.userStorage.setJson(path(chat),LocationArtLibrarySchema.parse(library),options(user));return library;
 });
}
