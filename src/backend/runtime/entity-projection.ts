import {validateStoryDocuments} from '../../shared/story-documents.js';
import { normalizeStoryReferences } from "../../shared/story-references.js";
import { stripTextEffectTags } from "../../shared/text-effects.js";
import { applyContinuityDelta } from '../core/continuity.js';
import type { TurnPlan } from '../../shared/contracts.js';
import { MAX_PRESENTATION_PARAGRAPHS, type ReaderPresentation,type ReaderPresentationV2, type PresentationEntity, type EntityStateDelta, type PresentationState, type EvidenceSource } from '../../shared/presentation-entities.js';
import {parseReaderPresentation} from '../../shared/presentation-selectors.js';
import { buildCompactPresentation, type PresentationBeat } from './presentation-timeline.js';
import { deriveShortAliases } from '../../shared/story-dna.js';
import { isScenarioTitle } from '../../shared/card-role.js';
import { isSignificantStoryItem } from './story-dna-harvester.js';
import type { ContextProposal } from '../../shared/context-sources.js';

const COMPANION_CODEX_FIELDS = new Set([
  'appearance', 'description', 'outfit', 'condition', 'role', 'affiliations',
  'relationships', 'mannerisms', 'voice', 'history', 'layout', 'routes',
  'surroundings', 'customs', 'services', 'publicHistory', 'risks',
  'provenance', 'function', 'limits', 'access', 'owner', 'significance'
]);

export interface ProjectPresentationOptions {
  companionProposals?: readonly (ContextProposal & { provider?: 'lumibooks' | 'lumiscript' })[];
  maxFactsPerEntity?: number;
  maxFactChars?: number;
}

/** Derive the first foundation from already validated planner output. No extra
 * LLM request, private tracker scraping, generated biography or changed image prompt. */
export function projectTurnPresentation(plan:TurnPlan, options?: ProjectPresentationOptions):ReaderPresentationV2|undefined {
  if(!plan.paragraphs.length)return undefined;
  const warnings=new Set<NonNullable<ReaderPresentationV2['warnings']>[number]>();
  let continuity=structuredClone(plan.initialContinuity);
  const describe=(fields:Record<string,string>)=>Object.entries(fields).map(([k,v])=>`${k}: ${v}`).join(', ').slice(0,1200);
  const entities:PresentationEntity[]=[];
  const byName=new Map<string,PresentationEntity>();
  const baseline:Record<string,PresentationState>=Object.create(null);const deltas:EntityStateDelta[]=[];
  const source={provider:'story' as const,recordId:plan.key.assistantMessageId,chatId:plan.key.chatId,messageId:plan.key.assistantMessageId,sourceFingerprint:plan.key.sourceFingerprint,observedAt:plan.createdAt};
  const anchor=(paragraphIndex:number)=>({key:plan.key,paragraphIndex});
  const entity=(kind:PresentationEntity['kind'],name:string,at:number):PresentationEntity|null=>{
    const trimmed=name.trim();if(!trimmed||trimmed.length>256||(kind==='npc'&&isScenarioTitle(trimmed)))return null;
    const stripped=trimmed.replace(/^(?:the|an?)\s+/i,'').trim();
    const mapKey=`${kind}:${trimmed.toLowerCase()}`;
    const strippedKey=kind==='npc'?null:`${kind}:${stripped.toLowerCase()}`;
    const existing=byName.get(mapKey) ?? (strippedKey ? byName.get(strippedKey) : undefined);
    if(existing){existing.firstParagraph=Math.min(existing.firstParagraph,at);byName.set(mapKey,existing);return existing;}
    if(entities.length>=32){warnings.add('entity-budget');return null;}
    const value:PresentationEntity={id:`e${entities.length+1}`,kind,name:trimmed,aliases:deriveShortAliases(trimmed),firstParagraph:at,facts:[]};
    entities.push(value);byName.set(mapKey,value);
    if(strippedKey&&strippedKey!==mapKey&&!byName.has(strippedKey))byName.set(strippedKey,value);
    const prior=kind==='npc' ? (continuity.characters[trimmed] ?? Object.entries(continuity.characters).find(([k])=>k.toLowerCase()===trimmed.toLowerCase())?.[1]) : undefined;
    baseline[value.id]=prior ? {appearance:describe(prior.appearance),outfit:describe(prior.wardrobe)} : {};
    return value;
  };
  const change=(e:PresentationEntity,at:number,changes:EntityStateDelta['changes'])=>{deltas.push({entityId:e.id,at:anchor(at),changes});};
  let factCount=0;
  const fact=(e:PresentationEntity,at:number,field:string,value:string)=>{
    if(value.trim()){if(factCount<128)e.facts.push({id:`f${++factCount}`,entityId:e.id,field,value:value.slice(0,1200),visibility:'observed',source,revealedAt:anchor(at)});else warnings.add('fact-budget');}
  };
  const strippedParagraphs=plan.paragraphs.map(p=>({text:stripTextEffectTags(p.text)}));
  const documents=validateStoryDocuments(plan.storyDocuments,strippedParagraphs);
  const references=normalizeStoryReferences(plan.storyReferences,strippedParagraphs,{
    paragraphSpeakers:plan.paragraphSpeakers,
    detectedLocation:plan.scenes[0]?.environment.location??null,
    sourceIndexes:plan.paragraphs.map(p=>p.sourceIndex),
  });
  const itemStates:Array<{entityId:string;at:number;field:'owner'|'condition';value:string}>=[];
  const beats:PresentationBeat[]=[];
  let locationId:string|null=null;let drawableEntityId:string|null=null;
  let cast=new Set<string>();
  const groupAt=<T>(items:readonly T[],at:(item:T)=>number):Map<number,T[]>=>{
    const grouped=new Map<number,T[]>();for(const item of items){const index=at(item);if(index>=MAX_PRESENTATION_PARAGRAPHS)continue;const bucket=grouped.get(index)??[];bucket.push(item);grouped.set(index,bucket);}return grouped;
  };
  const scenesAt=groupAt(plan.scenes,s=>s.startParagraph),continuityAt=groupAt(plan.continuityDeltas,d=>d.paragraphIndex),cuesAt=groupAt(plan.visualCues,c=>c.paragraphIndex),documentsAt=groupAt(documents,d=>d.paragraphIndex),referencesAt=groupAt(references,r=>r.paragraphIndex);
  // One pass in reveal order prevents a later scene from declaring early facts.
  for(let at=0;at<Math.min(plan.paragraphs.length,MAX_PRESENTATION_PARAGRAPHS);at++) {
    for(const scene of scenesAt.get(at)??[]) {
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
    for(const delta of continuityAt.get(at)??[]) {
      continuity=applyContinuityDelta(continuity,delta.delta);
      for(const [name,patch] of Object.entries(delta.delta.characterUpdates)) {
        const person=entity('npc',name,at);if(!person)continue;
        const changes:EntityStateDelta['changes']={};
        if(patch.present!==undefined){changes.presence=patch.present?'present':'absent';changes.location=patch.present?locationId:null;if(patch.present)cast.add(person.id);else cast.delete(person.id);}
        if(patch.appearance)changes.appearance=describe(continuity.characters[name]!.appearance);
        if(patch.wardrobe)changes.outfit=describe(continuity.characters[name]!.wardrobe);
        if(Object.keys(changes).length)change(person,at,changes);
      }
      for(const name of delta.delta.forgetCharacters){const person=byName.get(`npc:${name.toLowerCase()}`)??byName.get(`npc:${name}`);if(person){change(person,at,{presence:'absent',location:null});cast.delete(person.id);}}
    }
    const speaker=plan.paragraphSpeakers[at];
    const speaking=speaker ? entity('npc',speaker,at) : null;
    for(const cue of cuesAt.get(at)??[]) {
      // Only the explicitly drawable cue subject; a speaker is never substituted.
      const person=cue.character ? entity('npc',cue.character,at) : null;
      drawableEntityId=person?.id??null;
      if(person && cue.resolvedIdentity){fact(person,at,'appearance',cue.resolvedIdentity);change(person,at,{appearance:cue.resolvedIdentity.slice(0,1200)});}
      if(person && cue.attire)change(person,at,{outfit:cue.attire.slice(0,1200)});
      const actionObj = typeof cue.action === 'object' && cue.action !== null ? cue.action.object : undefined;
      if (actionObj && isSignificantStoryItem(actionObj, cue.visualFocus ?? cue.visualDescription)) {
        const propObj = entity('object', actionObj, at);
        if (propObj) {
          fact(propObj, at, 'description', cue.visualFocus?.trim() || actionObj);
          if (cue.character?.trim()) fact(propObj, at, 'owner', cue.character.trim());
        }
      }
    }
    for(const document of documentsAt.get(at)??[]){
      const docEntity=entity('object',document.name,at);
      if(docEntity){
        if(document.aliases?.length){
          const seen=new Set([docEntity.name.toLowerCase(),...docEntity.aliases.map(a=>a.toLowerCase())]);
          for(const alias of document.aliases){const k=alias.toLowerCase();if(!seen.has(k)){seen.add(k);docEntity.aliases.push(alias);}}
        }
        const obsNote=document.observations?.find(o=>o.paragraphIndex===at)?.summary||document.visualDetails;
        if(obsNote)fact(docEntity,at,'appearance',obsNote.slice(0,320));
        const preview=document.sections.map(s=>s.text.trim()).filter(Boolean).join(' ').slice(0,320);
        fact(docEntity,at,'significance',preview||obsNote||`${document.kind} noticed in scene`);
      }
    }
    for(const reference of referencesAt.get(at)??[]) {
      const subject=entity(reference.kind,reference.name,at);
      if(subject){
        fact(subject,at,reference.field,reference.value);
        if(reference.kind==='object'&&(reference.field==='owner'||reference.field==='condition')&&(reference.field!=='owner'||reference.value.length<=256))itemStates.push({entityId:subject.id,at,field:reference.field,value:reference.value});
      }
    }
    beats.push({paragraphIndex:at,locationId,drawableEntityId,speakerEntityId:speaking?.id??null});
  }
  if (options?.companionProposals?.length) {
    const maxCompanionFacts = Math.max(1, Math.min(32, options.maxFactsPerEntity ?? 8));
    const maxCompanionChars = Math.max(80, Math.min(1200, options.maxFactChars ?? 320));
    const proposedEntities = options.companionProposals.flatMap(p => p.entities.map(entity => ({ entity, provider: p.provider ?? 'lumibooks', updatedAt: p.updatedAt })));
    for (const target of entities) {
      if (factCount >= 128) break;
      const matchingEntities = proposedEntities.filter(({ entity: e }) =>
        e.kind === target.kind &&
        (e.name.trim().toLocaleLowerCase() === target.name.toLocaleLowerCase() ||
          e.aliases.some(a => a.trim().toLocaleLowerCase() === target.name.toLocaleLowerCase()))
      );
      let added = 0;
      for (const { entity: propEntity, provider } of matchingEntities) {
        for (const prop of propEntity.facts) {
          if (added >= maxCompanionFacts || factCount >= 128) break;
          if (!COMPANION_CODEX_FIELDS.has(prop.field)) continue;
          if (prop.visibility !== 'observed' && !(provider === 'lumibooks' && prop.visibility !== 'private')) continue;
          const trimmedValue = prop.value.trim().slice(0, maxCompanionChars);
          if (!trimmedValue || target.facts.some(f => f.field === prop.field && f.value === trimmedValue)) continue;
          const companionSource: EvidenceSource = {
            provider,
            recordId: propEntity.id,
            chatId: plan.key.chatId,
            messageId: plan.key.assistantMessageId,
            sourceFingerprint: plan.key.sourceFingerprint,
            observedAt: plan.createdAt,
          };
          target.facts.push({
            id: `f${++factCount}`,
            entityId: target.id,
            field: prop.field,
            value: trimmedValue,
            visibility: 'observed',
            source: companionSource,
            revealedAt: anchor(target.firstParagraph),
          });
          added++;
        }
      }
    }
  }
  // Sparse item observations share the same reveal index as continuity state.
  // At most 32 optional references. Keep item observations outside the required
  // continuity delta budget, replaying them into detached cursor snapshots.
  // Original facts/source anchors remain intact when an owner/condition changes.
  for(const item of itemStates)deltas.push({entityId:item.entityId,at:anchor(item.at),changes:{[item.field]:item.value}});
  return buildCompactPresentation({key:plan.key,paragraphCount:plan.paragraphs.length,entities,baseline,deltas,beats},documents,[...warnings]);
}

/** Unsupported versions remain saved but unavailable. Old turns derive locally. */
export function readerPresentationFor(plan:TurnPlan,saved?:unknown):ReaderPresentation|undefined {
  if(saved===undefined)return projectTurnPresentation(plan);
  const parsed=parseReaderPresentation(saved,plan.key,plan.paragraphs.length);
  if(!parsed)return undefined;
  if(parsed.documents)parsed.documents=validateStoryDocuments(parsed.documents,plan.paragraphs.map(p=>({text:stripTextEffectTags(p.text)})));
  return parsed;
}
