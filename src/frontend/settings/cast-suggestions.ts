import type {CastSetupInput} from '../../shared/cast-art.js';
import {characterAppearanceKey} from '../../shared/identity.js';
export type CastSuggestionField='appearance'|'aliases'|'outfits';
/** Explicit field selection, never a save. Existing outfit choices remain authoritative. */
export function applyCastSuggestion(draft:CastSetupInput,source:CastSetupInput,field:CastSuggestionField,createId:()=>string){
 const setup=structuredClone(draft),notices:string[]=[];
 if(field==='appearance'){
  if(source.appearance.trim())setup.appearance=source.appearance;
  else notices.push('This source has no appearance. Existing wording was kept.');
 }
 if(field==='aliases'){
  const seen=new Set(setup.aliases.map(characterAppearanceKey));let full=false;
  for(const alias of source.aliases){const key=characterAppearanceKey(alias);if(!key||seen.has(key))continue;if(setup.aliases.length>=16){full=true;continue;}setup.aliases.push(alias);seen.add(key);}
  if(full)notices.push('The 16-alias limit is reached. Remaining suggestions stay in the source.');
 }
 if(field==='outfits'){
  const key=(name:string)=>name.trim().replace(/\s+/g,' ').toLocaleLowerCase();
  const names=new Map(setup.outfits.map(outfit=>[key(outfit.name),outfit]));const ids=new Set(setup.outfits.map(outfit=>outfit.id));let full=false;
  for(const outfit of source.outfits){
   const existing=names.get(key(outfit.name));
   if(existing){if(existing.description!==outfit.description)notices.push(`Kept your ${existing.name} outfit; the source has different wording. Review it in Outfits if you want to replace it.`);continue;}
   if(setup.outfits.length>=7){full=true;continue;}
   const id=createId();if(ids.has(id)){notices.push(`Could not add ${outfit.name} because its new identifier collided. Try again.`);continue;}
   const added={id,name:outfit.name,description:outfit.description};setup.outfits.push(added);ids.add(id);names.set(key(outfit.name),added);
  }
  if(full)notices.push('The seven-outfit limit is reached. Remaining suggestions stay in the source.');
 }
 return {setup,notices,changed:JSON.stringify(setup)!==JSON.stringify(draft)};
}
