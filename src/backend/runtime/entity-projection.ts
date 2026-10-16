import {validateStoryDocuments} from '../../shared/story-documents.js';
import { normalizeStoryReferences } from "../../shared/story-references.js";
import { stripTextEffectTags } from "../../shared/text-effects.js";
import { applyContinuityDelta } from '../core/continuity.js';
import type { TurnPlan } from '../../shared/contracts.js';
import { ReaderPresentationSchema, samePresentationTurn, type ReaderPresentation, type PresentationEntity, type EntityStateDelta, type PresentationState } from '../../shared/presentation-entities.js';
import { buildPresentationTimeline, type PresentationBeat } from './presentation-timeline.js';

/** Derive the first foundation from already validated planner output. No extra
 * LLM request, private tracker scraping, generated biography or changed image prompt. */
export function projectTurnPresentation(plan:TurnPlan):ReaderPresentation|undefined {
  if(plan.paragraphs.length>256)return undefined;
  let continuity=structuredClone(plan.initialContinuity);
  const describe=(fields:Record<string,string>)=>Object.entries(fields).map(([k,v])=>`${k}: ${v}`).join(', ').slice(0,1200);
  const entities:PresentationEntity[]=[];
  const byName=new Map<string,PresentationEntity>();
  const baseline:Record<string,PresentationState>={};const deltas:EntityStateDelta[]=[];let overflow=false;
  const source={provider:'story' as const,recordId:plan.key.assistantMessageId,chatId:plan.key.chatId,messageId:plan.key.assistantMessageId,sourceFingerprint:plan.key.sourceFingerprint,observedAt:plan.createdAt};
  const anchor=(paragraphIndex:number)=>({key:plan.key,paragraphIndex});
  const entity=(kind:PresentationEntity['kind'],name:string,at:number):PresentationEntity|null=>{
    const trimmed=name.trim();if(!trimmed||trimmed.length>256)return null;
    const mapKey=`${kind}:${trimmed}`;
    const existing=byName.get(mapKey);
    if(existing){existing.firstParagraph=Math.min(existing.firstParagraph,at);return existing;}
    if(entities.length>=32)return null;
    // Exact names only. Case variants/ambiguous aliases are not silently merged.
    const value:PresentationEntity={id:`e${entities.length+1}`,kind,name:trimmed,aliases:[],firstParagraph:at,facts:[]};
    entities.push(value);byName.set(mapKey,value);
    const prior=kind==='npc' ? continuity.characters[trimmed] : undefined;
    baseline[value.id]=prior ? {appearance:describe(prior.appearance),outfit:describe(prior.wardrobe)} : {};
    return value;
  };
  const change=(e:PresentationEntity,at:number,changes:EntityStateDelta['changes'])=>{if(deltas.length<64)deltas.push({entityId:e.id,at:anchor(at),changes});else overflow=true;};
  let factCount=0;
  const fact=(e:PresentationEntity,at:number,field:string,value:string)=>{
    if(value.trim()&&factCount<128)e.facts.push({id:`f${++factCount}`,entityId:e.id,field,value:value.slice(0,1200),visibility:'observed',source,revealedAt:anchor(at)});
  };
  const documents=validateStoryDocuments(plan.storyDocuments,plan.paragraphs.map(p=>({text:stripTextEffectTags(p.text)})));
  const references=normalizeStoryReferences(plan.storyReferences,plan.paragraphs.map(p=>({text:stripTextEffectTags(p.text)})));
  const beats:PresentationBeat[]=[];
  let locationId:string|null=null;let drawableEntityId:string|null=null;
  let cast=new Set<string>();
  // One pass in reveal order prevents a later scene from declaring early facts.
  for(let at=0;at<plan.paragraphs.length;at++) {
    for(const scene of plan.scenes.filter(s=>s.startParagraph===at)) {
      drawableEntityId=null;
      const place=entity('place',scene.environment.location,at);
      locationId=place?.id??null;
      if(place)fact(place,at,'impression',scene.environment.description);
      const nextCast=new Set<string>();
      for(const name of scene.cast) {
        const person=entity('npc',name,at);if(!person)continue;
        nextCast.add(person.id);change(person,at,{presence:'present',location:locationId});
      }
      for(const id of cast)if(!nextCast.has(id)){const prior=entities.find(e=>e.id===id);if(prior)change(prior,at,{presence:'absent',location:null});}
      cast=nextCast;
    }
    for(const delta of plan.continuityDeltas.filter(d=>d.paragraphIndex===at)) {
      continuity=applyContinuityDelta(continuity,delta.delta);
      for(const [name,patch] of Object.entries(delta.delta.characterUpdates)) {
        const person=entity('npc',name,at);if(!person)continue;
        const changes:EntityStateDelta['changes']={};
        if(patch.present!==undefined){changes.presence=patch.present?'present':'absent';changes.location=patch.present?locationId:null;if(patch.present)cast.add(person.id);else cast.delete(person.id);}
        if(patch.appearance)changes.appearance=describe(continuity.characters[name]!.appearance);
        if(patch.wardrobe)changes.outfit=describe(continuity.characters[name]!.wardrobe);
        if(Object.keys(changes).length)change(person,at,changes);
      }
      for(const name of delta.delta.forgetCharacters){const person=byName.get(`npc:${name}`);if(person){change(person,at,{presence:'absent',location:null});cast.delete(person.id);}}
    }
    const speaker=plan.paragraphSpeakers[at];
    const speaking=speaker ? entity('npc',speaker,at) : null;
    for(const cue of plan.visualCues.filter(c=>c.paragraphIndex===at)) {
      // Only the explicitly drawable cue subject; a speaker is never substituted.
      const person=cue.character ? entity('npc',cue.character,at) : null;
      drawableEntityId=person?.id??null;
      if(person && cue.resolvedIdentity){fact(person,at,'appearance',cue.resolvedIdentity);change(person,at,{appearance:cue.resolvedIdentity.slice(0,1200)});}
      if(person && cue.attire)change(person,at,{outfit:cue.attire.slice(0,1200)});
    }
    for(const document of documents.filter(d=>d.paragraphIndex===at))entity('object',document.name,at);
    for(const reference of references.filter(r=>r.paragraphIndex===at)) {
      const subject=entity(reference.kind,reference.name,at);
      if(subject)fact(subject,at,reference.field,reference.value);
    }
    beats.push({paragraphIndex:at,locationId,drawableEntityId,speakerEntityId:speaking?.id??null});
  }
  if(overflow)return undefined;
  const result=ReaderPresentationSchema.parse({version:1,...(documents.length?{documents}:{}),snapshots:buildPresentationTimeline({key:plan.key,paragraphCount:plan.paragraphs.length,entities,baseline,deltas,beats})});
  return JSON.stringify(result).length<=512000 ? result : undefined;
}

/** Unsupported versions remain saved but unavailable. Old turns derive locally. */
export function readerPresentationFor(plan:TurnPlan,saved?:unknown):ReaderPresentation|undefined {
  if(saved===undefined)return projectTurnPresentation(plan);
  if(JSON.stringify(saved).length>512000)return undefined;
  const parsed=ReaderPresentationSchema.safeParse(saved);
  if(!parsed.success || parsed.data.snapshots.length!==plan.paragraphs.length || parsed.data.snapshots.some((s,i)=>s.at.paragraphIndex!==i||!samePresentationTurn(s.at.key,plan.key)))return undefined;
  for(const snapshot of parsed.data.snapshots) {
    const ids=new Set(snapshot.entities.map(e=>e.id));
    if(snapshot.entities.some(e=>e.firstParagraph>snapshot.at.paragraphIndex || e.facts.some(f=>f.entityId!==e.id || f.source.chatId!==plan.key.chatId || f.source.messageId!==plan.key.assistantMessageId || f.source.sourceFingerprint!==plan.key.sourceFingerprint || !f.revealedAt || !samePresentationTurn(f.revealedAt.key,plan.key) || f.revealedAt.paragraphIndex>snapshot.at.paragraphIndex)))return undefined;
    if(Object.keys(snapshot.stateByEntity).some(id=>!ids.has(id)) || snapshot.presentEntityIds.some(id=>!ids.has(id)) || [snapshot.speakerEntityId,snapshot.drawableEntityId,snapshot.locationId].some(id=>id!==null&&!ids.has(id)))return undefined;
  }
  if(parsed.data.documents)parsed.data.documents=validateStoryDocuments(parsed.data.documents,plan.paragraphs.map(p=>({text:stripTextEffectTags(p.text)})));
  return parsed.data;
}
