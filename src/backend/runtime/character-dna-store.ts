import type {SpindleAPI} from 'lumiverse-spindle-types';
import {DNA_FIELDS,dnaFieldValue} from '../../shared/character-dna-workflow.js';
import {CharacterDNASchema,findCharacterDNA,type CharacterDNA,type CharacterDNALibrary} from '../../shared/character-dna.js';
const pathFor=(chatId:string)=>`chats/${encodeURIComponent(chatId).replace(/%/g,'_')}/character-dna.json`;
const queues=new WeakMap<object,Map<string,Promise<unknown>>>();
type RawLibrary={version?:unknown;revision?:unknown;characters?:unknown;deleted?:unknown};
async function read(spindle:SpindleAPI,chatId:string,userId?:string){
 const raw=await spindle.userStorage?.getJson<unknown>(pathFor(chatId),{fallback:null,...(userId?{userId}:{})});
 if(raw!==null&&raw!==undefined&&(typeof raw!=='object'||![1,2].includes((raw as RawLibrary).version as number)))throw new Error('Unsupported DNA library. Existing data has been preserved.');
 const source=(raw??{}) as RawLibrary;let needsRecovery=source.version===1;const warnings:string[]=[];
 if(source.revision!==undefined&&(!Number.isSafeInteger(source.revision)||(source.revision as number)<0))throw new Error('Invalid DNA library revision. Existing data has been preserved.');
 const characters:Record<string,CharacterDNA>=Object.create(null),deleted:Record<string,CharacterDNA>=Object.create(null);
 for(const [collection,target]of [[source.characters,characters],[source.deleted,deleted]] as const){
  if(collection!==undefined&&(!collection||typeof collection!=='object'||Array.isArray(collection)))throw new Error('Invalid DNA collection. Existing data has been preserved.');
  if(collection&&typeof collection==='object'&&!Array.isArray(collection))for(const value of Object.values(collection)){
   let parsed=CharacterDNASchema.safeParse(value);
   if(!parsed.success&&value&&typeof value==='object'&&'fieldSources'in value){const{fieldSources:_,...primary}=value as Record<string,unknown>;parsed=CharacterDNASchema.safeParse(primary);needsRecovery=true;}
   if(!parsed.success){needsRecovery=true;if(!warnings.length)warnings.push('Some character entries could not be read. Their original data is preserved before saving.');continue;}
   const existing=findCharacterDNA(target,parsed.data.id);if(!existing||parsed.data.lastUpdated>existing.lastUpdated)target[parsed.data.id]=parsed.data;
  }
 }
 return{raw,needsRecovery,library:{version:2,warnings,revision:typeof source.revision==='number'&&Number.isSafeInteger(source.revision)&&source.revision>=0?source.revision:0,characters,deleted} as CharacterDNALibrary};
}
export async function loadCharacterDNALibrary(spindle:SpindleAPI,chatId:string,userId?:string):Promise<CharacterDNALibrary>{return(await read(spindle,chatId,userId)).library;}
/** Queue the read AND mutation, scoped to the originating user/chat. A failed write never advances the revision. */
export async function mutateCharacterDnaLibrary(spindle:SpindleAPI,chatId:string,userId:string|undefined,expectedRevision:number|undefined,mutation:(library:CharacterDNALibrary)=>void):Promise<CharacterDNALibrary>{
 if(!spindle.userStorage)throw new Error('Character DNA storage is unavailable. Your draft has not been saved.');
 let scopes=queues.get(spindle);if(!scopes){scopes=new Map();queues.set(spindle,scopes);}const key=JSON.stringify([userId??null,chatId]);const previous=scopes.get(key)??Promise.resolve();
 const pending=previous.catch(()=>{}).then(async()=>{
  const{raw,needsRecovery,library}=await read(spindle,chatId,userId);if(expectedRevision!==undefined&&expectedRevision!==(library.revision??0))throw new Error('Character DNA changed. Reload the latest profile before applying this draft.');
  mutation(library);library.revision=(library.revision??0)+1;
  const options={indent:2,...(userId?{userId}:{})};
  if(raw!==null&&raw!==undefined) {const backup=`${pathFor(chatId)}.backup`;const saved=await spindle.userStorage!.getJson<unknown>(backup,{fallback:null,...(userId?{userId}:{})});if(saved===null)await spindle.userStorage!.setJson(backup,raw,options);}
  if(needsRecovery&&raw!==null&&raw!==undefined)await spindle.userStorage!.setJson(`${pathFor(chatId)}.recovery-backup`,raw,options);
  await spindle.userStorage!.setJson(pathFor(chatId),library,options);return library;
 });scopes.set(key,pending);try{return await pending;}finally{if(scopes.get(key)===pending)scopes.delete(key);}
}
export async function saveCharacterDNA(spindle:SpindleAPI,chatId:string,dna:CharacterDNA,userId?:string,revision?:number):Promise<CharacterDNALibrary>{
 const parsed=CharacterDNASchema.parse(dna);return mutateCharacterDnaLibrary(spindle,chatId,userId,revision,l=>{
  const activeById=l.characters[parsed.id];
  if(l.deleted?.[parsed.id]||(!activeById&&findCharacterDNA(l.deleted??{},parsed.name)))throw new Error('This character was deleted. Restore it before saving.');
  const existing=findCharacterDNA(l.characters,parsed.id)||findCharacterDNA(l.characters,parsed.name);
  if(existing&&(existing.id!==parsed.id||existing.name!==parsed.name))throw new Error('This character already exists. Open its saved profile or merge identities explicitly.');
  const id=existing?.id??parsed.id;parsed.fieldSources={...existing?.fieldSources,...parsed.fieldSources};
  for(const path of DNA_FIELDS)if(JSON.stringify(existing&&dnaFieldValue(existing,path))!==JSON.stringify(dnaFieldValue(parsed,path)))parsed.fieldSources[path]={classification:'manual',sources:[]};
  l.characters[id]={...parsed,id};
 });
}
export async function getEffectiveCharacterDNA(spindle:SpindleAPI,chatId:string,identity:string,userId?:string):Promise<CharacterDNA|null>{return findCharacterDNA((await loadCharacterDNALibrary(spindle,chatId,userId)).characters,identity)??null;}
