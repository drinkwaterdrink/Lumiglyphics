import type {TurnKey} from './contracts.js';
import {ReaderPresentationSchema,MAX_PRESENTATION_BYTES,presentationSerializedBytes,samePresentationTurn,type ReaderPresentation,type PresentationSnapshot,type PresentationState} from './presentation-entities.js';

export const presentationParagraphCount=(value:ReaderPresentation):number=>value.version===2?value.paragraphCount:value.snapshots.length;
export const presentationTurnKey=(value:ReaderPresentation):TurnKey|undefined=>value.version===2?value.key:value.snapshots[0]?.at.key;

/** Validate optional data before schema allocations, then enforce source/reveal identity. */
export function parseReaderPresentation(raw:unknown,key?:TurnKey,paragraphCount?:number):ReaderPresentation|undefined {
  try {
    if(!raw||presentationSerializedBytes(raw)>MAX_PRESENTATION_BYTES)return undefined;
    const parsed=ReaderPresentationSchema.safeParse(raw);if(!parsed.success)return undefined;
    const value=parsed.data,ownKey=presentationTurnKey(value);
    if(!ownKey||(key&&!samePresentationTurn(ownKey,key))||(paragraphCount!==undefined&&presentationParagraphCount(value)!==paragraphCount))return undefined;
    if(value.version===1){
      if(!value.snapshots.length)return undefined;
      for(const [index,snapshot] of value.snapshots.entries()){
        if(snapshot.at.paragraphIndex!==index||!samePresentationTurn(snapshot.at.key,ownKey))return undefined;
        const ids=new Set(snapshot.entities.map(e=>e.id));
        if(ids.size!==snapshot.entities.length||snapshot.entities.some(e=>e.firstParagraph>index||e.facts.some(f=>f.entityId!==e.id||f.source.chatId!==ownKey.chatId||f.source.messageId!==ownKey.assistantMessageId||f.source.sourceFingerprint!==ownKey.sourceFingerprint||!f.revealedAt||!samePresentationTurn(f.revealedAt.key,ownKey)||f.revealedAt.paragraphIndex>index)))return undefined;
        if(Object.keys(snapshot.stateByEntity).some(id=>!ids.has(id))||snapshot.presentEntityIds.some(id=>!ids.has(id))||[snapshot.speakerEntityId,snapshot.drawableEntityId,snapshot.locationId].some(id=>id!==null&&!ids.has(id)))return undefined;
      }
    }
    return value;
  } catch {return undefined;}
}

/** One detached cursor view. The compact dictionary is never exposed to consumers. */
export function selectPresentationSnapshot(value:ReaderPresentation,index:number):PresentationSnapshot|undefined {
  if(!Number.isInteger(index)||index<0||index>=presentationParagraphCount(value))return undefined;
  if(value.version===1)return value.snapshots[index]?structuredClone(value.snapshots[index]):undefined;
  if(index>value.availableThrough)return undefined;
  const state:Record<string,PresentationState>=Object.create(null);
  for(const [id,baseline] of Object.entries(value.baseline))state[id]={...baseline};
  for(const change of value.changes){
    if(change.paragraphIndex>index)break;
    const current=state[change.entityId]??(state[change.entityId]={});
    for(const [field,next] of Object.entries(change.changes)){
      if(next===null)delete (current as Record<string,string>)[field];
      else if(next!==undefined)(current as Record<string,string>)[field]=next;
    }
  }
  const entities=value.entities.filter(e=>e.firstParagraph<=index).map(e=>({...e,facts:e.facts.filter(f=>f.revealedAt!.paragraphIndex<=index)}));
  const beat=value.beats[index]!;
  return structuredClone({at:{key:value.key,paragraphIndex:index},locationId:beat.locationId,speakerEntityId:beat.speakerEntityId,drawableEntityId:beat.drawableEntityId,
    entities,presentEntityIds:entities.filter(e=>e.kind==='npc'&&state[e.id]?.presence==='present').map(e=>e.id),
    stateByEntity:Object.fromEntries(entities.map(e=>[e.id,state[e.id]??{}]))});
}

/** A view owns at most four detached snapshots / 1 MB; old turns are collectible. */
export function createPresentationCursor(value:ReaderPresentation):(index:number)=>PresentationSnapshot|undefined {
  const cache=new Map<number,{value:PresentationSnapshot;bytes:number}>();let bytes=0;
  return index=>{
    const hit=cache.get(index);if(hit){cache.delete(index);cache.set(index,hit);return structuredClone(hit.value);}
    const snapshot=selectPresentationSnapshot(value,index);if(!snapshot)return undefined;
    const size=presentationSerializedBytes(snapshot);
    if(size<=1_000_000){
      while(cache.size>=4||bytes+size>1_000_000){const first=cache.keys().next().value!;bytes-=cache.get(first)!.bytes;cache.delete(first);}
      cache.set(index,{value:snapshot,bytes:size});bytes+=size;
    }
    return structuredClone(snapshot);
  };
}
