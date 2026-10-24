import type { TurnKey } from './contracts.js';
import type { PresentationEntity, PresentationSnapshot } from './presentation-entities.js';
export type InteractionVerb = 'ask'|'examine'|'approach'|'use'|'custom';
export type InteractionDraft = {entityId:string;verb:InteractionVerb;text:string;origin:'local';key:TurnKey;paragraphIndex:number};
export type DraftMergeMode = 'insert'|'replace';

const CAPABILITY_FIELDS = new Set(['function', 'use', 'capability', 'mechanism', 'controls', 'effect']);

/** Only current public presence enables proximity. Missing capability data never enables Use. */
export function availableInteractionVerbs(entity:PresentationEntity,snapshot:PresentationSnapshot):InteractionVerb[] {
 const known=snapshot.entities.find(e=>e.id===entity.id&&e.kind===entity.kind&&e.name===entity.name&&e.firstParagraph<=snapshot.at.paragraphIndex);
 if(!known)return [];
 if(known.kind!=='npc'){
  const hasVerifiedUse = known.kind === 'object' && (
   known.facts.some(f => f.visibility === 'observed' && CAPABILITY_FIELDS.has(f.field) && (!f.revealedAt || f.revealedAt.paragraphIndex <= snapshot.at.paragraphIndex)) ||
   Boolean(snapshot.stateByEntity[entity.id]?.owner)
  );
  return hasVerifiedUse ? ['examine','use','custom'] : ['examine','custom'];
 }
 const state=snapshot.stateByEntity[entity.id];
 const place=state?.location?snapshot.entities.find(e=>e.kind==='place'&&(e.id===state.location||e.name.toLocaleLowerCase()===state.location!.toLocaleLowerCase())):undefined;
 const present=snapshot.presentEntityIds.includes(entity.id)&&state?.presence!=='absent'&&!(place&&snapshot.locationId&&place.id!==snapshot.locationId);
 return present?['ask','approach','custom']:['custom'];
}
export function buildInteractionDraft(entity:PresentationEntity,verb:InteractionVerb,snapshot:PresentationSnapshot):InteractionDraft|null {
 if(!availableInteractionVerbs(entity,snapshot).includes(verb))return null;
 const name=entity.name.replace(/[\r\n]+/g,' ').trim();
 const text=verb==='ask'?`I ask ${name} about `:verb==='approach'?`I try to approach ${name}.`:verb==='examine'?`I try to examine ${name}.`:verb==='use'?`I try to use ${name} to `:`I want to interact with ${name}: `;
 return {entityId:entity.id,verb,text,origin:'local',key:{...snapshot.at.key},paragraphIndex:snapshot.at.paragraphIndex};
}
export function mergeInteractionDraft(current:string,text:string,mode:DraftMergeMode):string|null {
 if(!text.trim()||text.length>6000)return null;
 const merged=mode==='replace'||!current.trim()?text:`${current}\n\n${text}`;
 return merged.length<=12000?merged:null;
}
