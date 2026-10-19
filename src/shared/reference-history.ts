import {z} from 'zod';
import {TurnKeySchema,type TurnKey} from './contracts.js';
import {StoryReferenceSchema} from './story-references.js';
import {samePresentationTurn} from './presentation-entities.js';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const ReferenceLineageSchema=z.object({version:z.literal(1),key:TurnKeySchema,messageCount:z.number().int().min(1).max(1024),prefixDigest:digest,paragraphDigest:digest}).strict();
export type ReferenceLineage=z.infer<typeof ReferenceLineageSchema>;
const retainedFields=new Set(['description','appearance','role','affiliations','relationships','mannerisms','voice','history','layout','surroundings','customs','publicHistory','provenance','function','limits','significance']);
export function retainableReferenceField(field:string):boolean{return retainedFields.has(field);}
export const HistoricalReferenceSchema=z.object({sourceKey:TurnKeySchema,replyNumber:z.number().int().min(1).max(1024),reference:StoryReferenceSchema}).strict().refine(entry=>retainableReferenceField(entry.reference.field));
export type HistoricalReference=z.infer<typeof HistoricalReferenceSchema>;
export const ReferenceHistorySchema=z.object({version:z.literal(1),target:TurnKeySchema,targetReplyNumber:z.number().int().min(1).max(1024),entries:z.array(HistoricalReferenceSchema).max(128),truncated:z.boolean()}).strict().refine(history=>history.entries.every(entry=>entry.sourceKey.chatId===history.target.chatId&&entry.sourceKey.assistantMessageId!==history.target.assistantMessageId&&entry.replyNumber<history.targetReplyNumber));
export type ReferenceHistory=z.infer<typeof ReferenceHistorySchema>;
/** Independent optional enrichment; current-turn facts retain their original stricter validator. */
export function referenceHistoryFor(value:unknown,key:TurnKey):ReferenceHistory|undefined {
 try{if(value===undefined||JSON.stringify(value).length>256000)return undefined;const parsed=ReferenceHistorySchema.safeParse(value);return parsed.success&&samePresentationTurn(parsed.data.target,key)?parsed.data:undefined;}catch{return undefined;}
}
