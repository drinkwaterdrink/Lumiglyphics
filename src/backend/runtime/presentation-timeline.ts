import type { TurnKey } from '../../shared/contracts.js';
import { EntityStateDeltaSchema, PresentationEntitySchema, PresentationStateSchema, samePresentationTurn, type PresentationEntity, type EntityStateDelta, type PresentationSnapshot, type PresentationState } from '../../shared/presentation-entities.js';
import {ReaderPresentationV2Schema,MAX_PRESENTATION_BYTES,presentationSerializedBytes,MAX_PRESENTATION_CHANGES,MAX_PRESENTATION_PARAGRAPHS,type ReaderPresentationV2} from '../../shared/presentation-entities.js';
import type {StoryDocument} from '../../shared/story-documents.js';
export type PresentationBeat={paragraphIndex:number;speakerEntityId:string|null;drawableEntityId:string|null;locationId:string|null};
export type PresentationTimelineInput={key:TurnKey;paragraphCount:number;entities:PresentationEntity[];baseline:Record<string,PresentationState>;deltas:EntityStateDelta[];beats:PresentationBeat[]};

/** Store each observed fact and state change once, with a dense cursor index. */
export function buildCompactPresentation(input:PresentationTimelineInput,documents:StoryDocument[]=[],warnings:NonNullable<ReaderPresentationV2['warnings']>=[]):ReaderPresentationV2 {
  const count=Math.min(MAX_PRESENTATION_PARAGRAPHS,input.paragraphCount);
  const notices=new Set(warnings);
  if(count<input.paragraphCount)notices.add('paragraph-budget');
  if(input.entities.length>32)notices.add('entity-budget');
  const entities:ReaderPresentationV2['entities']=[];const ids=new Set<string>();let facts=0;
  for(const raw of input.entities.slice(0,32)){
    const parsed=PresentationEntitySchema.safeParse(raw);
    if(!parsed.success||ids.has(parsed.data.id)||parsed.data.firstParagraph>=count)continue;
    const entity=parsed.data;
    const observed=entity.facts.filter(f=>{
      if(f.visibility!=='observed'||f.entityId!==entity.id||f.source.chatId!==input.key.chatId||f.source.messageId!==input.key.assistantMessageId||f.source.sourceFingerprint!==input.key.sourceFingerprint||!f.revealedAt||!samePresentationTurn(f.revealedAt.key,input.key)||f.revealedAt.paragraphIndex<entity.firstParagraph||f.revealedAt.paragraphIndex>=count)return false;
      if(facts>=128){notices.add('fact-budget');return false;}facts++;return true;
    }).map(f=>({...f,visibility:'observed' as const}));
    entities.push({...entity,facts:observed});ids.add(entity.id);
  }
  const baseline:Record<string,PresentationState>=Object.create(null);
  for(const entity of entities){const parsed=PresentationStateSchema.safeParse(input.baseline[entity.id]??{});baseline[entity.id]=parsed.success?parsed.data:{};}
  const changesByBeat=new Map<number,Map<string,EntityStateDelta['changes']>>();
  for(const raw of input.deltas){
    const parsed=EntityStateDeltaSchema.safeParse(raw);
    if(!parsed.success||!ids.has(parsed.data.entityId)||!samePresentationTurn(parsed.data.at.key,input.key)||parsed.data.at.paragraphIndex>=count)continue;
    const p=parsed.data.at.paragraphIndex;
    const bucket=changesByBeat.get(p)??new Map<string,EntityStateDelta['changes']>();changesByBeat.set(p,bucket);
    bucket.set(parsed.data.entityId,{...bucket.get(parsed.data.entityId),...parsed.data.changes});
  }
  const state=structuredClone(baseline),changes:ReaderPresentationV2['changes']=[];
  for(const [paragraphIndex,bucket] of [...changesByBeat].sort((a,b)=>a[0]-b[0]))for(const [entityId,patch] of bucket){
    const current=state[entityId]??(state[entityId]={}),effective:EntityStateDelta['changes']={};
    for(const [field,next] of Object.entries(patch)){
      if(next===undefined)continue;
      const record=current as Record<string,string>;
      if(next===null){if(record[field]!==undefined){(effective as Record<string,unknown>)[field]=null;delete record[field];}}
      else if(record[field]!==next){(effective as Record<string,unknown>)[field]=next;record[field]=next;}
    }
    if(Object.keys(effective).length)changes.push({entityId,paragraphIndex,changes:effective});
  }
  const sourceBeats=new Map(input.beats.map(beat=>[beat.paragraphIndex,beat]));
  const beats=Array.from({length:count},(_,paragraphIndex)=>sourceBeats.get(paragraphIndex)??{paragraphIndex,locationId:null,speakerEntityId:null,drawableEntityId:null});
  const raw:ReaderPresentationV2={version:2,key:structuredClone(input.key),paragraphCount:input.paragraphCount,availableThrough:count-1,entities,baseline,changes:changes.slice(0,MAX_PRESENTATION_CHANGES),beats,...(documents.length?{documents}:{}),...(notices.size?{warnings:[...notices]}:{})};
  if(changes.length>MAX_PRESENTATION_CHANGES)notices.add('change-budget');
  const through=(index:number):ReaderPresentationV2=>{
    const keptEntities=entities.filter(e=>e.firstParagraph<=index).map(e=>({...e,facts:e.facts.filter(f=>f.revealedAt!.paragraphIndex<=index)}));
    const known=new Set(keptEntities.map(e=>e.id));
    return {...raw,availableThrough:index,entities:keptEntities,baseline:Object.fromEntries(Object.entries(baseline).filter(([id])=>known.has(id))),changes:raw.changes.filter(c=>c.paragraphIndex<=index),beats:beats.slice(0,index+1),...(documents.length?{documents:documents.filter(d=>d.paragraphIndex<=index).map(d=>({...d,sections:d.sections.filter(s=>s.paragraphIndex<=index)}))}:{}),...(notices.size?{warnings:[...notices]}:{})};
  };
  if(presentationSerializedBytes(raw)<=MAX_PRESENTATION_BYTES)return ReaderPresentationV2Schema.parse(raw);
  notices.add('byte-budget');
  let low=-1,high=count-1;
  while(low<high){const mid=Math.ceil((low+high)/2);if(presentationSerializedBytes(through(mid))<=MAX_PRESENTATION_BYTES)low=mid;else high=mid-1;}
  return ReaderPresentationV2Schema.parse(through(low));
}

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
