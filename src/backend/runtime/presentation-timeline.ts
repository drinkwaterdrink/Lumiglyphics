import type { TurnKey } from '../../shared/contracts.js';
import { EntityStateDeltaSchema, PresentationEntitySchema, PresentationStateSchema, samePresentationTurn, type PresentationEntity, type EntityStateDelta, type PresentationSnapshot, type PresentationState } from '../../shared/presentation-entities.js';
export type PresentationBeat={paragraphIndex:number;speakerEntityId:string|null;drawableEntityId:string|null;locationId:string|null};
export type PresentationTimelineInput={key:TurnKey;paragraphCount:number;entities:PresentationEntity[];baseline:Record<string,PresentationState>;deltas:EntityStateDelta[];beats:PresentationBeat[]};

/** Deterministic turn-local projection. Never reads latest external state or writes canon. */
export function buildPresentationTimeline(input:PresentationTimelineInput):PresentationSnapshot[] {
  const count=Math.min(10000,Math.max(0,Math.floor(input.paragraphCount)));
  const entities:PresentationEntity[]=[];const ids=new Set<string>();let facts=0;
  for(const raw of input.entities.slice(0,32)) {
    const parsed=PresentationEntitySchema.safeParse(raw);
    if(!parsed.success || ids.has(parsed.data.id)) continue;
    const entity=parsed.data;
    entity.facts=entity.facts.filter(f=>{
      if(f.entityId!==entity.id || f.visibility!=='observed' || f.source.chatId!==input.key.chatId || f.source.messageId!==input.key.assistantMessageId || f.source.sourceFingerprint!==input.key.sourceFingerprint || !f.revealedAt || !samePresentationTurn(f.revealedAt.key,input.key) || facts>=128) return false;
      facts++;return true;
    });
    entities.push(entity);ids.add(entity.id);
  }
  const state:Record<string,PresentationState>={};
  for(const entity of entities) {
    const base=PresentationStateSchema.safeParse(input.baseline[entity.id]??{});
    state[entity.id]=base.success ? base.data : {};
  }
  const deltas=input.deltas.slice(0,64).flatMap((raw,order)=>{
    const parsed=EntityStateDeltaSchema.safeParse(raw);
    return parsed.success && ids.has(parsed.data.entityId) && samePresentationTurn(parsed.data.at.key,input.key) && parsed.data.at.paragraphIndex<count ? [{delta:parsed.data,order}] : [];
  }).sort((a,b)=>a.delta.at.paragraphIndex-b.delta.at.paragraphIndex || a.order-b.order);
  const beats=[...input.beats].filter(b=>Number.isInteger(b.paragraphIndex)&&b.paragraphIndex>=0&&b.paragraphIndex<count).sort((a,b)=>a.paragraphIndex-b.paragraphIndex);
  let deltaIndex=0;let beatIndex=0;let locationId:string|null=null;let drawableEntityId:string|null=null;
  const result:PresentationSnapshot[]=[];
  for(let paragraphIndex=0;paragraphIndex<count;paragraphIndex++) {
    while(deltas[deltaIndex]?.delta.at.paragraphIndex===paragraphIndex) {
      const delta=deltas[deltaIndex++]!.delta;
      for(const [field,value] of Object.entries(delta.changes)) {
        if(value===null) delete (state[delta.entityId] as Record<string,string>)[field];
        else if(value!==undefined) (state[delta.entityId] as Record<string,string>)[field]=value;
      }
    }
    let speakerEntityId:string|null=null;
    while(beats[beatIndex]?.paragraphIndex===paragraphIndex) {
      const beat=beats[beatIndex++]!;
      locationId=beat.locationId;drawableEntityId=beat.drawableEntityId;speakerEntityId=beat.speakerEntityId;
    }
    const visible=entities.filter(e=>e.firstParagraph<=paragraphIndex);
    const known=new Set(visible.map(e=>e.id));
    const entitiesNow=visible.map(e=>({...e,facts:e.facts.filter(f=>f.revealedAt!.paragraphIndex<=paragraphIndex).map(f=>({...f,visibility:'observed' as const}))}));
    result.push({at:{key:structuredClone(input.key),paragraphIndex},locationId:locationId&&known.has(locationId)?locationId:null,speakerEntityId:speakerEntityId&&known.has(speakerEntityId)?speakerEntityId:null,drawableEntityId:drawableEntityId&&known.has(drawableEntityId)?drawableEntityId:null,presentEntityIds:visible.filter(e=>e.kind==='npc'&&state[e.id]?.presence==='present').map(e=>e.id),stateByEntity:structuredClone(Object.fromEntries(visible.map(e=>[e.id,state[e.id]??{}]))),entities:structuredClone(entitiesNow)});
  }
  return result;
}
