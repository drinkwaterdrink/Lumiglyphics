import {parseReaderPresentation} from './presentation-selectors.js';
import type {PresentationState} from './presentation-entities.js';
import type {TurnView} from '../protocol.js';import {TurnKeySchema,type TurnKey} from './contracts.js';
export type SceneHistoryEvent={key:TurnKey;paragraphIndex:number;kind:'location'|'presence';label:string;subject?:string;presence?:'present'|'absent';location?:string|null};
export type SceneHistory={key:TurnKey;through:number;events:SceneHistoryEvent[];unavailable:boolean;truncated:boolean};
export function turnHistoryKey(turn:TurnView):TurnKey|null{const parsed=TurnKeySchema.safeParse({chatId:turn.chatId,assistantMessageId:turn.messageId,swipeId:turn.swipeId,sourceFingerprint:turn.sourceFingerprint,revision:turn.revision});return parsed.success?parsed.data:null;}
/** Bounded current-branch history derived only from recorded scene/presence data. */
export function sceneHistoryFor(turn:TurnView,through:number):SceneHistory|null {
 const key=turnHistoryKey(turn);if(!key||!Number.isInteger(through))return null;
 const end=Math.min(through,turn.paragraphs.length-1,9999),model:SceneHistory={key,through:end,events:[],unavailable:true,truncated:through>9999};if(end<0)return model;
 const projection=parseReaderPresentation(turn.presentation,key,turn.paragraphs.length);
 const locations=(turn.sceneLocations??[]).slice(0,10000).filter(entry=>Number.isInteger(entry.paragraphIndex)&&entry.paragraphIndex>=0&&entry.paragraphIndex<=end&&typeof entry.location==='string').sort((a,b)=>a.paragraphIndex-b.paragraphIndex);
 const previousPresence=new Map<string,string>();let previousLocation:string|null|undefined,locationIndex=0,recordedLocation=turn.sceneLocations?null:turn.location?.trim()||null,changeIndex=0;
 const state:Record<string,PresentationState>=projection?.version===2?Object.fromEntries(Object.entries(projection.baseline).map(([id,value])=>[id,{...value}])):Object.create(null);
 model.unavailable=!projection&&!locations.length&&!recordedLocation;if(projection?.version===2&&projection.availableThrough<end)model.truncated=true;
 const add=(event:Omit<SceneHistoryEvent,'key'>)=>{if(model.events.length>=256){model.truncated=true;return false;}model.events.push({key:{...key},...event});return true;};
 for(let index=0;index<=end;index++){
  while(locationIndex<locations.length&&locations[locationIndex]!.paragraphIndex<=index)recordedLocation=locations[locationIndex++]!.location.trim().slice(0,256)||null;
  const snapshot=projection?.version===1?projection.snapshots[index]:undefined;
  if(projection?.version===2)while(changeIndex<projection.changes.length&&projection.changes[changeIndex]!.paragraphIndex<=index){const change=projection.changes[changeIndex++]!,target=state[change.entityId]??(state[change.entityId]={});for(const [field,value]of Object.entries(change.changes)){if(value===null)delete (target as Record<string,string>)[field];else if(value!==undefined)(target as Record<string,string>)[field]=value;}}
  const covered=projection?.version===2?index<=projection.availableThrough:Boolean(snapshot);
  const entities=covered?(snapshot?.entities??(projection?.version===2?projection.entities:[])).filter(entity=>entity.firstParagraph<=index):[];
  const byId=new Map(entities.map(entity=>[entity.id,entity])),states=snapshot?.stateByEntity??state;
  const placeName=(id:string|null|undefined)=>{const place=id?byId.get(id):undefined;return place?.kind==='place'?place.name:null;};
  const locationId=snapshot?.locationId??(projection?.version===2&&covered?projection.beats[index]?.locationId:null),location=placeName(locationId)??recordedLocation;
  if(location!==previousLocation){if(location||previousLocation!==undefined)if(!add({paragraphIndex:index,kind:'location',label:location?`Location: ${location}`:'Location not established',location}))break;previousLocation=location;}
  for(const entity of entities){if(entity.kind!=='npc')continue;const current=states[entity.id],presence=current?.presence??(snapshot?.presentEntityIds.includes(entity.id)?'present':undefined);if(!presence)continue;const personLocation=presence==='present'?placeName(current?.location):null,signature=JSON.stringify([presence,personLocation]);if(previousPresence.get(entity.id)===signature)continue;previousPresence.set(entity.id,signature);if(!add({paragraphIndex:index,kind:'presence',subject:entity.name,presence,location:personLocation,label:`${entity.name} — ${presence==='present'?'Present':'Off scene'}${personLocation?` · ${personLocation}`:''}`}))break;}
  if(model.truncated&&model.events.length>=256)break;
 }return model;
}
