import {characterAppearanceKey,distillVisualTags,isUsableIdentity} from '../../shared/identity.js';
import type {CardRole} from '../../shared/card-role.js';

const words=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const mentioned=(text:string,name:string)=>Boolean(words(name))&&(` ${words(text)} `).includes(` ${words(name)} `);
/** Picture-local recovery only: a planner-declared, literally named persona may
 * replace an unresolved wrapper. Never seed the NPC roster or borrow a body. */
export function scenarioPersonaSubject(input:{role:CardRole;cardName:string;cardHasIdentity:boolean;currentName:string;currentIdentity:string;cueName:string|null|undefined;visible:string[];paragraph:string;persona:{name:string;description:string}|null}){
 const persona=input.persona;
 if(input.role==='character'||input.currentIdentity.trim()||!persona?.name.trim())return null;
 const key=characterAppearanceKey(persona.name),card=characterAppearanceKey(input.cardName);
 if(key===card)return null;
 const personaLabel=(name:string)=>characterAppearanceKey(name)===key||['user','player','persona','{{user}}'].includes(name.trim().toLowerCase());
 if(!input.visible.some(personaLabel)||!mentioned(input.paragraph,persona.name))return null;
 const focus=characterAppearanceKey(input.currentName);
 const cue=input.cueName?.trim()??'';
 if(cue&&!personaLabel(cue)&&characterAppearanceKey(cue)!==card)return null;
 if(input.role==='auto'){
  if(input.cardHasIdentity||!card||focus!==card||mentioned(input.paragraph,input.cardName))return null;
 }else if(focus&&focus!==card&&focus!=='protagonist'&&focus!==key)return null;
 const tags=distillVisualTags(persona.description);
 return isUsableIdentity(persona.name,tags)?{name:persona.name.trim(),identity:tags.join(', ')}:null;
}
