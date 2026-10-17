import {samePresentationTurn} from "../../shared/presentation-entities.js";
import {selectReaderDossier} from "../../shared/dossiers.js";
import {readerPresentationFor} from "./entity-projection.js";
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {CastContextScanSchema,CastSetupInputSchema,type CastContextScan} from '../../shared/cast-art.js';
import {loadCastArt,castArtToken} from './cast-art.js';
import {loadConfig,loadCharacterRegistry,loadReadingPosition,loadTurnRecord,turnPath} from './storage.js';
import {scanTrackerCastHistory} from './simtracker.js';
import {fingerprintForMessage} from './planner.js';
import {isUsableIdentity,splitTags,normalizeCharacterName} from '../../shared/identity.js';
/** Explicit read-only scan of recognized evidence; no extraction/model call or canon writes. */
export async function scanCastContext(api:SpindleAPI,chatId:string,userId:string,characterId?:string):Promise<CastContextScan>{
 if(!await api.chats.get(chatId,userId))throw new Error('This chat is unavailable.');
 const token=castArtToken(api,chatId,userId),messages=await api.chat.getMessages(chatId);
 const signature=(rows:typeof messages)=>JSON.stringify(rows.map(m=>[m.id,fingerprintForMessage(m)]));
 const before=signature(messages),latest=[...messages].reverse().find(m=>!m.is_user&&m.role!=='system');
 const [config,registry,library]=await Promise.all([loadConfig(api,userId),loadCharacterRegistry(api,chatId,userId),loadCastArt(api,chatId,userId)]);
 const target=characterId?library.characters.find(record=>record.entityId===characterId):undefined;
 if(characterId&&!target)throw new Error('This character is no longer saved. Refresh the cast list.');
 const targetNames=target?new Set([target.name,...(target.setup?.aliases??[])].map(name=>normalizeCharacterName(name).toLowerCase())):null;
 const candidates:CastContextScan['candidates']=[],seen=new Set<string>();let omitted=false;let referenceNotice='';let referenceScope:{path:string,key:string,position:string}|undefined;
 const add=(name:string,appearance:string,aliases:string[],attire:string,source:string,setup?:unknown,allowNameOnly=false)=>{
  name=normalizeCharacterName(name);if(!name||name.length>160||!allowNameOnly&&!isUsableIdentity(name,splitTags(appearance)))return;
  if(targetNames&&!targetNames.has(name.toLowerCase())&&!aliases.some(alias=>targetNames.has(normalizeCharacterName(alias).toLowerCase())))return;
  const raw=setup??{appearance:appearance.slice(0,2000),aliases:aliases.filter(a=>a.length<=160).slice(0,16),outfits:attire?[{id:'scanned-outfit',name:'Current outfit',description:attire.slice(0,1000)}]:[],defaultOutfitId:attire?'scanned-outfit':null};
  const draft=CastContextScanSchema.safeParse({candidates:[{name,source:source.slice(0,256),setup:raw}],notice:''});
  const input=allowNameOnly?(draft.success?{success:true as const,data:draft.data.candidates[0]!.setup}:{success:false as const}):CastSetupInputSchema.safeParse(raw);
  if(!input.success)return;const key=JSON.stringify([name.toLowerCase(),input.data]);if(seen.has(key))return;if(candidates.length>=32){omitted=true;return;}seen.add(key);candidates.push({name,source:source.slice(0,256),setup:input.data});
 };

 const tracker=config.includeSimTrackerContext&&latest?scanTrackerCastHistory(messages,latest.id,config.simTrackerMappings):[];
 const trackedNames=new Set<string>();
 for(const {character:item,messageId} of tracker){const key=normalizeCharacterName(item.name).toLowerCase();if(trackedNames.has(key)||!isUsableIdentity(item.name,splitTags(item.identity)))continue;trackedNames.add(key);add(item.name,item.identity,item.aliases,item.attire,`SimTracker snapshot · ${messageId}`);}
 const position=await loadReadingPosition(api,chatId,userId).catch(()=>null);
 const referenceMessage=position?messages.find(m=>m.id===position.key.assistantMessageId&&String(m.swipe_id??0)===String(position.key.swipeId??0))??latest:latest;
 if(referenceMessage){
  const path=turnPath(chatId,referenceMessage.id,referenceMessage.swipe_id);
  const saved=await loadTurnRecord(api,path,userId).catch(()=>{referenceNotice='Saved story references could not be read; tracker suggestions remain available.';return null;});
  if(saved&&saved.plan.key.chatId===chatId&&saved.plan.key.assistantMessageId===referenceMessage.id&&String(saved.plan.key.swipeId??0)===String(referenceMessage.swipe_id??0)&&(saved.source?.rawFingerprint??saved.plan.key.sourceFingerprint)===fingerprintForMessage(referenceMessage)){
   referenceScope={path,key:JSON.stringify(saved.plan.key),position:JSON.stringify(position)};
   const index=position&&samePresentationTurn(position.key,saved.plan.key)?position.paragraphIndex:0;
   let presentation;try{presentation=readerPresentationFor(saved.plan,saved.presentation);}catch{referenceNotice='Saved story references could not be read; tracker suggestions remain available.';}
   const snapshot=presentation?.snapshots.find(s=>s.at.paragraphIndex===index&&samePresentationTurn(s.at.key,saved.plan.key));
   if(snapshot)for(const entity of snapshot.entities){
    if(entity.kind!=='npc'||entity.firstParagraph>index)continue;
    const dossier=selectReaderDossier(entity.id,snapshot,'expanded');if(!dossier)continue;
    const visual=dossier.state.appearance||dossier.facts.filter(f=>/^(appearance|description|look|physical description)$/i.test(f.field)).map(f=>f.value).join(', ');
    const appearance=isUsableIdentity(entity.name,splitTags(visual))?visual:'';
    add(entity.name,appearance,entity.aliases,dossier.state.outfit??'',appearance?'Story reference':'Story reference · appearance needed',undefined,true);
   }
  }
 }
 for(const entry of Object.values(registry))if(!library.characters.some(r=>r.setup&&r.name.toLowerCase()===entry.name.toLowerCase()))add(entry.name,entry.tags,entry.aliases,'','Known story appearance');
 for(const record of library.characters)if(record.setup){const s=record.setup;add(record.name,s.appearance,s.aliases,'','Saved setup',{appearance:s.appearance,aliases:s.aliases,outfits:s.outfits.map(({id,name,description})=>({id,name,description})),defaultOutfitId:s.defaultOutfitId});}
 if(referenceScope){const fresh=await loadTurnRecord(api,referenceScope.path,userId).catch(()=>null),currentPosition=await loadReadingPosition(api,chatId,userId).catch(()=>null);if(!fresh||JSON.stringify(fresh.plan.key)!==referenceScope.key||JSON.stringify(currentPosition)!==referenceScope.position)throw new Error('Reading context changed while scanning. Scan again.');}
 if(token!==castArtToken(api,chatId,userId)||before!==signature(await api.chat.getMessages(chatId)))throw new Error('Context changed while scanning. Scan again.');
 return CastContextScanSchema.parse({candidates,notice:`Review a source before filling your draft. Named references with no appearance need a description before saving. Nothing has been saved or generated. ${config.includeSimTrackerContext?'Scanned recent SimTracker snapshots; older outfit details may need updating.':'SimTracker context is disabled in Pictures settings.'} Other extension data is not read through private storage. ${referenceNotice} ${omitted?'Suggestion limit reached (32); additional saved suggestions were omitted. New context is prioritized.':''}`});
}
