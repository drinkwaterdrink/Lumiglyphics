import type {SpindleAPI} from 'lumiverse-spindle-types';
import type {TurnPlan} from '../../shared/contracts.js';
import {ReferenceLineageSchema,ReferenceHistorySchema,retainableReferenceField,type ReferenceLineage,type ReferenceHistory,type HistoricalReference} from '../../shared/reference-history.js';
import {samePresentationTurn} from '../../shared/presentation-entities.js';
import {normalizeStoryReferences} from '../../shared/story-references.js';
import {stripTextEffectTags} from '../../shared/text-effects.js';
import {loadTurnRecord,turnPath,type StoredTurnRecord} from './storage.js';
import {fingerprintForMessage} from './planner.js';
import {needsResolution} from './message-text.js';

type Message={id:string;content:string;name:string;role:string;is_user:boolean;swipe_id:number;parent_message_id:string|null;branch_id:string|null};
type Frame={message:Message;prefixDigest:string;messageCount:number;replyNumber:number};
const MAX_PREFIX=1024,MAX_TEXT=4_000_000,MAX_RECORDS=16;
export function preserveReferenceLineage(previous:unknown,next:ReferenceLineage|undefined):unknown{return previous!==undefined&&(previous as {version?:unknown}|null)?.version!==1?previous:next;}
/** Copy primitive values before planning/storage awaits; never retain mutable host objects. */
export function referenceMessages(messages:readonly unknown[],targetId:string):Message[]|undefined {
 const output:Message[]=[];let size=0;const ids=new Set<string>();
 for(const raw of messages){
  if(!raw||typeof raw!=='object')return undefined;const m=raw as Record<string,unknown>;
  if(typeof m.id!=='string'||!m.id||m.id.length>256||ids.has(m.id)||typeof m.content!=='string'||m.content.length>1_000_000)return undefined;
  const role=typeof m.role==='string'?m.role:m.is_user?'user':'assistant';
  if(!['assistant','user','system'].includes(role)||m.is_user!==undefined&&typeof m.is_user!=='boolean'||role==='assistant'&&m.is_user===true||role==='user'&&m.is_user===false)return undefined;
  const swipe=m.swipe_id??0;if(typeof swipe!=='number'||!Number.isSafeInteger(swipe)||swipe<0)return undefined;
  for(const field of ['name','parent_message_id','branch_id'])if(m[field]!==undefined&&m[field]!==null&&(typeof m[field]!=='string'||String(m[field]).length>256))return undefined;
  // Name/image display macros cannot choose branches. Everything else is unproven ancestry.
  const macros=m.content.replace(/\{\{\s*(?:user|persona|char|character)\s*\}\}|\{\{\s*img\s*::[^{}]*\}\}/gi,'');
  if(macros.includes('{{')||macros.includes('}}'))return undefined;
  size+=m.content.length;if(size>MAX_TEXT||output.length>=MAX_PREFIX)return undefined;ids.add(m.id);
  output.push({id:m.id,content:m.content,name:typeof m.name==='string'?m.name:'',role,is_user:role==='user'||m.is_user===true,swipe_id:swipe,parent_message_id:typeof m.parent_message_id==='string'?m.parent_message_id:null,branch_id:typeof m.branch_id==='string'?m.branch_id:null});
  if(m.id===targetId)return output;
 }return undefined;
}
async function hash(text:string):Promise<string>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');}
async function frames(messages:readonly Message[],chatId:string):Promise<Frame[]> {
 let prefix=await hash(JSON.stringify([1,chatId])),replyNumber=0;const result:Frame[]=[];
 for(const [index,message] of messages.entries()){
  prefix=await hash(JSON.stringify([prefix,message]));if(!message.is_user&&message.role!=='system')replyNumber++;
  result.push({message,prefixDigest:prefix,messageCount:index+1,replyNumber});
 }return result;
}
async function matches(record:StoredTurnRecord,frame:Frame):Promise<boolean>{
 const parsed=ReferenceLineageSchema.safeParse(record.referenceLineage);if(!parsed.success)return false;const certificate=parsed.data;
 if(!needsResolution(frame.message.content)&&record.plan.key.sourceFingerprint!==fingerprintForMessage(frame.message))return false;
 return samePresentationTurn(certificate.key,record.plan.key)&&record.plan.key.assistantMessageId===frame.message.id&&String(record.plan.key.swipeId??0)===String(frame.message.swipe_id)&&certificate.prefixDigest===frame.prefixDigest&&certificate.messageCount===frame.messageCount&&certificate.paragraphDigest===await hash(JSON.stringify(record.plan.paragraphs.map(p=>p.text)));
}
export async function captureReferenceLineage(messages:readonly unknown[],plan:TurnPlan,expectedRawContent?:string):Promise<ReferenceLineage|undefined>{
 try{const snapshot=referenceMessages(messages,plan.key.assistantMessageId);if(!snapshot)return undefined;const frame=(await frames(snapshot,plan.key.chatId)).at(-1)!;
  if(frame.message.is_user||frame.message.role==='system'||String(frame.message.swipe_id)!==String(plan.key.swipeId??0))return undefined;
  if(expectedRawContent!==undefined&&frame.message.content!==expectedRawContent)return undefined;
  if(needsResolution(frame.message.content)){if(expectedRawContent===undefined)return undefined;}
  else if(plan.key.sourceFingerprint!==fingerprintForMessage(frame.message))return undefined;
  return ReferenceLineageSchema.parse({version:1,key:plan.key,messageCount:frame.messageCount,prefixDigest:frame.prefixDigest,paragraphDigest:await hash(JSON.stringify(plan.paragraphs.map(p=>p.text)))});
 }catch{return undefined;}
}
async function collect(api:SpindleAPI,target:StoredTurnRecord,userId:string|undefined,deadline:number):Promise<ReferenceHistory|undefined>{
 if(!ReferenceLineageSchema.safeParse(target.referenceLineage).success)return undefined;
 const key=target.plan.key;
 const snapshot=referenceMessages(await api.chat.getMessages(key.chatId),key.assistantMessageId);if(!snapshot)return undefined;
 const lineage=await frames(snapshot,key.chatId),last=lineage.at(-1)!;if(Date.now()>=deadline||!await matches(target,last))return undefined;
 const eligible=lineage.slice(0,-1).filter(frame=>!frame.message.is_user&&frame.message.role!=='system');
 const selected=eligible.slice(-MAX_RECORDS),entries:HistoricalReference[]=[];let truncated=eligible.length>MAX_RECORDS;
 if(Date.now()>=deadline)return undefined;
 const loaded=await Promise.allSettled(selected.map(frame=>loadTurnRecord(api,turnPath(key.chatId,frame.message.id,frame.message.swipe_id),userId)));
 if(Date.now()>=deadline)return undefined;
 // Newest compatible description per exact kind/name/field. No alias/casing inference.
 const seen=new Set<string>();
 for(let index=selected.length-1;index>=0;index--){
  const outcome=loaded[index]!,frame=selected[index]!;if(outcome.status!=='fulfilled'||!outcome.value)continue;const record=outcome.value;
  if(record.plan.key.chatId!==key.chatId||needsResolution(frame.message.content)||record.plan.key.sourceFingerprint!==fingerprintForMessage(frame.message)||!await matches(record,frame))continue;
  for(const reference of normalizeStoryReferences(record.plan.storyReferences,record.plan.paragraphs.map(p=>({text:stripTextEffectTags(p.text)}))).reverse()){
   if(!retainableReferenceField(reference.field)||!stripTextEffectTags(frame.message.content).includes(reference.evidence))continue;
   const identity=JSON.stringify([reference.kind,reference.name,reference.field]);if(seen.has(identity))continue;seen.add(identity);
   if(entries.length>=128){truncated=true;continue;}
   entries.push({sourceKey:record.plan.key,replyNumber:frame.replyNumber,reference});
  }
 }
 const fresh=referenceMessages(await api.chat.getMessages(key.chatId),key.assistantMessageId);if(!fresh||JSON.stringify(fresh)!==JSON.stringify(snapshot))return undefined;
 const parsed=ReferenceHistorySchema.safeParse({version:1,target:key,targetReplyNumber:last.replyNumber,entries,truncated});
 return parsed.success&&JSON.stringify(parsed.data).length<=256000?parsed.data:undefined;
}
/** Optional reads are bounded and fail closed without touching primary turn state. */
export async function readReferenceHistory(api:SpindleAPI,target:StoredTurnRecord,userId?:string,deadlineMs=750):Promise<ReferenceHistory|undefined>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 const duration=Math.max(1,Math.min(750,deadlineMs));
 try{return await Promise.race([collect(api,target,userId,Date.now()+duration).catch(()=>undefined),new Promise<undefined>(resolve=>{timer=setTimeout(()=>resolve(undefined),duration);})]);}finally{clearTimeout(timer);}
}
