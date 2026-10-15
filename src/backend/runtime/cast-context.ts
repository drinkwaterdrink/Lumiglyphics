import type {SpindleAPI} from 'lumiverse-spindle-types';
import {CastContextScanSchema,CastSetupInputSchema,type CastContextScan} from '../../shared/cast-art.js';
import {loadCastArt,castArtToken} from './cast-art.js';
import {loadConfig,loadCharacterRegistry} from './storage.js';
import {extractSimTracker} from './simtracker.js';
import {fingerprintForMessage} from './planner.js';
import {isUsableIdentity,splitTags,normalizeCharacterName} from '../../shared/identity.js';
/** Explicit read-only scan of recognized evidence; no extraction/model call or canon writes. */
export async function scanCastContext(api:SpindleAPI,chatId:string,userId:string):Promise<CastContextScan>{
 if(!await api.chats.get(chatId,userId))throw new Error('This chat is unavailable.');
 const token=castArtToken(api,chatId,userId),messages=await api.chat.getMessages(chatId);
 const signature=(rows:typeof messages)=>JSON.stringify(rows.map(m=>[m.id,fingerprintForMessage(m)]));
 const before=signature(messages),latest=[...messages].reverse().find(m=>!m.is_user&&m.role!=='system');
 const [config,registry,library]=await Promise.all([loadConfig(api,userId),loadCharacterRegistry(api,chatId,userId),loadCastArt(api,chatId,userId)]);
 const candidates:CastContextScan['candidates']=[],seen=new Set<string>();let omitted=false;
 const add=(name:string,appearance:string,aliases:string[],attire:string,source:string,setup?:unknown)=>{
  name=normalizeCharacterName(name);if(!name||name.length>160||!isUsableIdentity(name,splitTags(appearance)))return;
  const input=CastSetupInputSchema.safeParse(setup??{appearance:appearance.slice(0,2000),aliases:aliases.filter(a=>a.length<=160).slice(0,16),outfits:attire?[{id:'scanned-outfit',name:'Current outfit',description:attire.slice(0,1000)}]:[],defaultOutfitId:attire?'scanned-outfit':null});
  if(!input.success)return;const key=JSON.stringify([name.toLowerCase(),input.data]);if(seen.has(key))return;if(candidates.length>=32){omitted=true;return;}seen.add(key);candidates.push({name,source:source.slice(0,256),setup:input.data});
 };

 const tracker=config.includeSimTrackerContext&&latest?extractSimTracker(messages,latest.id,config.simTrackerMappings):null;
 for(const item of tracker?.cast??[])add(item.name,item.identity,item.aliases,item.attire,`SimTracker · ${tracker!.sourceMessageId??'chat context'}`);
 for(const entry of Object.values(registry))if(!library.characters.some(r=>r.setup&&r.name.toLowerCase()===entry.name.toLowerCase()))add(entry.name,entry.tags,entry.aliases,'','Known story appearance');
 for(const record of library.characters)if(record.setup){const s=record.setup;add(record.name,s.appearance,s.aliases,'','Saved setup',{appearance:s.appearance,aliases:s.aliases,outfits:s.outfits.map(({id,name,description})=>({id,name,description})),defaultOutfitId:s.defaultOutfitId});}
 if(token!==castArtToken(api,chatId,userId)||before!==signature(await api.chat.getMessages(chatId)))throw new Error('Context changed while scanning. Scan again.');
 return CastContextScanSchema.parse({candidates,notice:`Review a source before filling your draft. Nothing has been saved or generated. ${config.includeSimTrackerContext?'Recognized SimTracker context is enabled.':'SimTracker context is disabled in Pictures settings.'} Other extension data is not read through private storage. ${omitted?'Suggestion limit reached (32); additional saved suggestions were omitted. New context is prioritized.':''}`});
}
