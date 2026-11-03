import {parseReaderPresentation,selectPresentationSnapshot} from './presentation-selectors.js';
import {referenceHistoryFor} from './reference-history.js';
import {turnHistoryKey} from './scene-history.js';
import {stripTextEffectTags} from './text-effects.js';
import type {TurnView} from '../protocol.js';import type {TurnKey} from './contracts.js';
export type RelationshipObservation={key:TurnKey;paragraphIndex:number;subject:string;statement:string;provenance:'story'|'earlier-story';replyNumber?:number};
/** Optional read-only statements; no scores, social inference, model calls or canon writes. */
export function relationshipObservations(turn:TurnView,index:number,enabled:boolean):RelationshipObservation[]{
 if(!enabled)return [];const key=turnHistoryKey(turn);if(!key||!Number.isInteger(index)||index<0||index>=turn.paragraphs.length)return [];
 const observations:RelationshipObservation[]=[],seen=new Set<string>();
 const add=(item:RelationshipObservation)=>{const token=JSON.stringify([item.key,item.paragraphIndex,item.subject,item.statement]);if(!seen.has(token)&&observations.length<64){seen.add(token);observations.push(item);}};
 const projection=parseReaderPresentation(turn.presentation,key,turn.paragraphs.length),snapshot=projection?selectPresentationSnapshot(projection,projection.version===2?Math.min(index,projection.availableThrough):index):undefined;
 for(const entity of snapshot?.entities??[]){if(entity.kind!=='npc')continue;for(const fact of entity.facts){if(fact.field!=='relationships'||fact.visibility!=='observed'||fact.source.provider!=='story'||!fact.revealedAt||fact.revealedAt.paragraphIndex>index)continue;
  const paragraph=turn.paragraphs[fact.revealedAt.paragraphIndex];if(!paragraph||paragraph.length>12000)continue;const visible=stripTextEffectTags(paragraph);
  const sentence=(visible.match(/[^.!?。！？\n]+[.!?。！？]?/gu)??[]).map(text=>text.trim()).find(text=>text.length<=1200&&text.includes(entity.name)&&text.includes(fact.value));if(!sentence)continue;
  add({key:{...key},paragraphIndex:fact.revealedAt.paragraphIndex,subject:entity.name,statement:sentence,provenance:'story'});
 }}
 const history=referenceHistoryFor(turn.referenceHistory,key);
 for(const entry of history?.entries??[]){const reference=entry.reference;if(reference.kind!=='npc'||reference.field!=='relationships'||!reference.evidence.includes(reference.name)||!reference.evidence.includes(reference.value))continue;add({key:{...entry.sourceKey},paragraphIndex:reference.paragraphIndex,subject:reference.name,statement:reference.evidence,provenance:'earlier-story',replyNumber:entry.replyNumber});}
 return observations;
}
