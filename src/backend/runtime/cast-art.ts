import type {SpindleAPI} from 'lumiverse-spindle-types';
import {CastArtLibrarySchema,type CastArtLibrary,type CastArtAction} from '../../shared/cast-art.js';
import {canonicalJson} from '../core/scene-image-cache.js';

type Runtime={tails:Map<string,Promise<void>>,epochs:Map<string,number>};
const runtimes=new WeakMap<object,Runtime>();
function runtime(api:SpindleAPI):Runtime{let r=runtimes.get(api);if(!r){r={tails:new Map(),epochs:new Map()};runtimes.set(api,r);}return r;}
function scope(chat:string,user?:string){return canonicalJson([user??null,chat]);}
function path(chat:string){return `chats/${encodeURIComponent(chat).replaceAll('%','_')}/cast-art.json`;}
function options(userId?:string){return userId?{userId}:undefined;}
export function castArtToken(api:SpindleAPI,chat:string,user?:string){return runtime(api).epochs.get(scope(chat,user))??0;}
async function transaction<T>(api:SpindleAPI,chat:string,user:string|undefined,work:()=>Promise<T>):Promise<T>{
 const r=runtime(api),key=scope(chat,user),previous=r.tails.get(key)??Promise.resolve();
 const current=previous.then(work,work),tail=current.then(()=>undefined,()=>undefined);r.tails.set(key,tail);
 try{return await current;}finally{if(r.tails.get(key)===tail)r.tails.delete(key);}
}
export async function loadCastArt(api:SpindleAPI,chat:string,user?:string):Promise<CastArtLibrary>{
 const raw=await api.userStorage.getJson<unknown>(path(chat),{fallback:null,...options(user)});
 if(raw===null)return {version:1,characters:[]};
 const parsed=CastArtLibrarySchema.safeParse(raw);
 if(!parsed.success)throw new Error('Saved cast art has an unsupported or invalid format; it was preserved.');
 return parsed.data;
}
export type CastArtIdentity={character:string,description:string,requestFingerprint:string,appearanceFingerprint:string};
const characterId=(name:string)=>name.trim().toLowerCase();
function variantId(art:CastArtIdentity&{imageId:string}):string{
 const text=canonicalJson(art);
 const hash=(source:string)=>{let value=0x811c9dc5;for(let i=0;i<source.length;i++)value=Math.imul(value^source.charCodeAt(i),0x01000193)>>>0;return value.toString(16).padStart(8,'0');};
 return `cast:${hash(text)}${hash(text.split('').reverse().join(''))}:${text.length}`;
}
export async function findCastArt(api:SpindleAPI,chat:string,identity:CastArtIdentity,user?:string):Promise<{imageId:string,imageUrl:string}|null>{
 const token=castArtToken(api,chat,user);
 const library=await loadCastArt(api,chat,user);
 if(token!==castArtToken(api,chat,user))return null;
 const record=library.characters.find(r=>r.entityId===characterId(identity.character));if(!record)return null;
 const compatible=record.variants.filter(v=>v.requestFingerprint===identity.requestFingerprint&&v.appearanceFingerprint===identity.appearanceFingerprint);
 compatible.sort((a,b)=>Number(b.id===record.preferredVariantId)-Number(a.id===record.preferredVariantId)||b.createdAt.localeCompare(a.createdAt));
 for(const v of compatible){
  // Resolve existence under the originating user; never reuse stale signed URLs.
  try{const image=await api.images.get(v.imageId,user);if(token!==castArtToken(api,chat,user))return null;if(image)return {imageId:v.imageId,imageUrl:`/api/v1/images/${encodeURIComponent(v.imageId)}`};}catch{/* unverifiable => normal generation */}
 }
 return null;
}
export async function saveCastArt(api:SpindleAPI,chat:string,art:CastArtIdentity&{imageId:string},user?:string,guard:{token?:number,signal?:AbortSignal}={}):Promise<boolean>{
 const token=guard.token??castArtToken(api,chat,user);
 return transaction(api,chat,user,async()=>{
  if(guard.signal?.aborted||token!==castArtToken(api,chat,user))return false;
  const library=await loadCastArt(api,chat,user),entityId=characterId(art.character);
  let record=library.characters.find(r=>r.entityId===entityId);
  if(!record){if(library.characters.length>=128)throw new Error('Cast art limit reached (128 characters). Forget a character to make room.');record={entityId,name:art.character,artRevision:0,description:art.description,preferredVariantId:null,variants:[]};library.characters.push(record);}
  if(record.variants.some(v=>v.imageId===art.imageId&&v.requestFingerprint===art.requestFingerprint&&v.appearanceFingerprint===art.appearanceFingerprint))return true;
  if(record.variants.length>=8)throw new Error('Cast art limit reached (8 variants per character). Forget a variant to make room.');
  const createdAt=new Date().toISOString();
  record.variants.push({id:variantId(art),imageId:art.imageId,requestFingerprint:art.requestFingerprint,appearanceFingerprint:art.appearanceFingerprint,approved:true,createdAt,description:art.description});record.artRevision++;
  if(guard.signal?.aborted||token!==castArtToken(api,chat,user))return false;
  await api.userStorage.setJson(path(chat),CastArtLibrarySchema.parse(library),options(user));return true;
 });
}
export async function manageCastArt(api:SpindleAPI,chat:string,action:CastArtAction,user?:string):Promise<CastArtLibrary>{
 if(action.action==='list')return transaction(api,chat,user,()=>loadCastArt(api,chat,user));
 const r=runtime(api),key=scope(chat,user);r.epochs.set(key,castArtToken(api,chat,user)+1);
 return transaction(api,chat,user,async()=>{
  const library=await loadCastArt(api,chat,user);
  if(action.action==='reset')library.characters=[];
  else{
   const record=library.characters.find(r=>r.entityId===action.characterId);if(!record)throw new Error('This character is no longer saved. Refresh the list.');
   if(action.action==='select'){
    if(!record.variants.some(v=>v.id===action.variantId))throw new Error('This variant is no longer saved. Refresh the list.');record.preferredVariantId=action.variantId!;
   }else if(action.variantId){record.variants=record.variants.filter(v=>v.id!==action.variantId);if(record.preferredVariantId===action.variantId)record.preferredVariantId=null;if(!record.variants.length)library.characters=library.characters.filter(r=>r!==record);}
   else library.characters=library.characters.filter(r=>r!==record);
  }
  await api.userStorage.setJson(path(chat),CastArtLibrarySchema.parse(library),options(user));return library;
 });
}
