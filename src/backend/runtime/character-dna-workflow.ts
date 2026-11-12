import {isScenarioTitle} from '../../shared/card-role.js';
import {scanTrackerCastHistory} from './simtracker.js';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {createEmptyCharacterDNA,findCharacterDNA,extractDNAPartsFromText,type CharacterDNA} from '../../shared/character-dna.js';
import {applyDnaChanges,dnaFieldValue,DNA_FIELDS,type DnaRequest,type DnaProposal} from '../../shared/character-dna-workflow.js';
import {loadCharacterDNALibrary,saveCharacterDNA,mutateCharacterDnaLibrary} from './character-dna-store.js';
import {collectCharacterDnaEvidence,proposeCharacterDna} from './character-dna-autofill.js';
import {loadConfig,loadReadingPosition,purgeDeletedCharacterFromStorage} from './storage.js';
type Session={abort?:AbortController;proposal?:DnaProposal;target?:CharacterDNA;created?:number;contextKey?:string};
const sessions=new WeakMap<object,Map<string,Session>>();
export async function handleCharacterDnaRequest(spindle:SpindleAPI,request:DnaRequest,userId:string):Promise<void>{
 let map=sessions.get(spindle);if(!map){map=new Map();sessions.set(spindle,map);}const scope=JSON.stringify([userId,request.chatId]);for(const[key,state]of map)if(Date.now()-(state.created??0)>300000){state.abort?.abort();map.delete(key);}if(map.size>=64&&!map.has(scope)){const oldest=map.keys().next().value!;map.get(oldest)?.abort?.abort();map.delete(oldest);}const previous=map.get(scope);
 const reply=async(proposal?:DnaProposal)=>spindle.sendToFrontend({type:'vn_character_dna',chatId:request.chatId,requestId:request.requestId,library:await loadCharacterDNALibrary(spindle,request.chatId,userId),...(proposal?{proposal}:{})},userId);
 try{
  if(request.action==='list'){
    try {
      const config = await loadConfig(spindle, userId);
      if (config.includeSimTrackerContext) {
        const messages = await spindle.chat?.getMessages?.(request.chatId).catch(() => []);
        if (messages && messages.length > 0) {
          const tracker = scanTrackerCastHistory(messages, undefined, config.simTrackerMappings);
          if (tracker && tracker.length > 0) {
            const library = await loadCharacterDNALibrary(spindle, request.chatId, userId);
            const toAdd: CharacterDNA[] = [];
            for (const item of tracker) {
              const charName = item.character.name.trim();
              if (!charName || isScenarioTitle(charName)) continue;
              if (library.deleted?.[charName] || findCharacterDNA(library.deleted ?? {}, charName)) continue;
              if (!findCharacterDNA(library.characters, charName)) {
                const dna = createEmptyCharacterDNA(charName);
                dna.aliases = item.character.aliases ?? [];
                if (item.character.attire) dna.activeOutfit = item.character.attire;
                if (item.character.identity) {
                  const parts = extractDNAPartsFromText(item.character.identity);
                  if (parts.hair?.color) dna.hair.color = parts.hair.color;
                  if (parts.hair?.length) dna.hair.length = parts.hair.length;
                  if (parts.hair?.style) dna.hair.style = parts.hair.style;
                  if (parts.eyes?.color) dna.eyes.color = parts.eyes.color;
                  if (parts.eyes?.shape) dna.eyes.shape = parts.eyes.shape;
                  if (parts.build?.gender) dna.build.gender = parts.build.gender;
                  if (parts.build?.species) dna.build.species = parts.build.species;
                  if (parts.build?.height) dna.build.height = parts.build.height;
                  if (parts.build?.bodyType) dna.build.bodyType = parts.build.bodyType;
                }
                toAdd.push(dna);
              }
            }
            if (toAdd.length > 0) {
              await mutateCharacterDnaLibrary(spindle, request.chatId, userId, library.revision ?? 0, l => {
                for (const dna of toAdd) {
                  if (!l.characters[dna.id] && !l.deleted?.[dna.id] && !findCharacterDNA(l.deleted ?? {}, dna.name)) {
                    l.characters[dna.id] = dna;
                  }
                }
              });
            }
          }
        }
      }
    } catch {
      // Non-fatal if context scan fails
    }
    await reply();
    return;
  }
  if(request.action==='cancel'){previous?.abort?.abort();map.delete(scope);return;}
  if(['propose','autofill','harvest'].includes(request.action)&&'characterName'in request){
   previous?.abort?.abort();const state:Session={abort:new AbortController(),created:Date.now()};map.set(scope,state);
   const library=await loadCharacterDNALibrary(spindle,request.chatId,userId);
   const active=findCharacterDNA(library.characters,request.characterId??request.characterName);
   if(!active&&findCharacterDNA(library.deleted??{},request.characterId??request.characterName))throw new Error('This character was deleted. Restore it first.');
   const target=active??createEmptyCharacterDNA(request.characterName,request.characterId);
   if(target.locked)throw new Error('Unlock this character’s DNA before auto-filling.');
   const config=await loadConfig(spindle,userId);const input={chatId:request.chatId,userId,target,config,signal:state.abort!.signal};
   const evidence=await collectCharacterDnaEvidence(spindle,input);state.contextKey=evidence.contextKey??'null';
   const proposal=await proposeCharacterDna(spindle,{...input,evidence,revision:library.revision??0,...(request.fields?{fields:request.fields}:{})});
   if(map.get(scope)!==state||state.abort!.signal.aborted)return;
   state.proposal=proposal;state.target=target;await reply(proposal);return;
  }
  if(request.action==='apply'){
   const state=previous,p=state?.proposal;if(!p||p.id!==request.proposalId||!state?.target||Date.now()-(state.created??0)>300000)throw new Error('This proposal expired. Auto-fill again to review fresh suggestions.');
   const position=await loadReadingPosition(spindle,request.chatId,userId);if(state.contextKey!==JSON.stringify(position?{key:position.key,paragraphIndex:position.paragraphIndex}:null))throw new Error('The story context changed. Request fresh DNA suggestions.');
   const selected=p.changes.filter(c=>request.fields.includes(c.path));if(selected.length!==new Set(request.fields).size)throw new Error('Choose fields from this proposal only.');
   await mutateCharacterDnaLibrary(spindle,request.chatId,userId,p.baseRevision,l=>{
    if(l.deleted?.[p.characterId])throw new Error('This character was deleted.');
    const target=l.characters[p.characterId]??state.target!;if(target.locked)throw new Error('Unlock DNA before applying suggestions.');
    const next=applyDnaChanges(target,selected);next.fieldSources={...target.fieldSources};for(const c of selected)next.fieldSources[c.path]={classification:c.classification,sources:c.sourceRefs.map(id=>{const e=p.evidence.find(e=>e.id===id)!;return `${e.source}: ${e.text}`.slice(0,1000);})};next.lastUpdated=Date.now();l.characters[p.characterId]=next;
   });map.delete(scope);await reply();return;
  }
  previous?.abort?.abort();map.delete(scope);
  if(request.action==='save'){await saveCharacterDNA(spindle,request.chatId,request.dna,userId,request.revision);await reply();return;}
  if(request.action==='delete'||request.action==='restore'){
   let deletedRecord: CharacterDNA | undefined;
   await mutateCharacterDnaLibrary(spindle,request.chatId,userId,request.revision,l=>{l.deleted??={};if(request.action==='delete'){const record=l.characters[request.characterId]??request.dna;if(!record||record.id!==request.characterId)throw new Error('Character no longer exists.');l.deleted[record.id]=record;delete l.characters[record.id];deletedRecord=record;}else{const record=l.deleted[request.characterId];if(!record)throw new Error('Character is not deleted.');l.characters[record.id]=record;delete l.deleted[record.id];}});
   if(request.action==='delete'&&deletedRecord){await purgeDeletedCharacterFromStorage(spindle,request.chatId,deletedRecord.name,deletedRecord.aliases??[],userId);}
   await reply();return;
  }
  if(request.action==='merge'){
   await mutateCharacterDnaLibrary(spindle,request.chatId,userId,request.revision,l=>{
    const target=l.characters[request.characterId],other=l.characters[request.otherId];if(!target||!other||target.id===other.id)throw new Error('Select two saved characters to merge.');if(target.locked||other.locked)throw new Error('Unlock both characters before merging.');
    let next=target;for(const path of DNA_FIELDS){const current=dnaFieldValue(next,path),value=dnaFieldValue(other,path);if((!current||(Array.isArray(current)&&!current.length))&&value){next=applyDnaChanges(next,[{path,value,classification:'generated',sourceRefs:[]}]);next.fieldSources={...next.fieldSources,[path]:other.fieldSources?.[path]??{classification:'manual',sources:[`Merged from ${other.name}`]}};}}
    next.aliases=[...new Set([...target.aliases,other.name,...other.aliases])].filter(n=>n!==target.name).slice(0,16);l.characters[target.id]=next;l.deleted??={};l.deleted[other.id]=other;delete l.characters[other.id];
   });await reply();
  }
 }catch(error){spindle.sendToFrontend({type:'vn_error',operation:'vn_character_dna',chatId:request.chatId,requestId:request.requestId,error:error instanceof Error?error.message:'Character DNA could not be updated. Your saved profile is unchanged.'},userId);}
}
