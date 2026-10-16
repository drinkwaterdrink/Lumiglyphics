import {z} from 'zod';
const DocumentIdentitySchema=z.object({name:z.string().trim().min(1).max(256),kind:z.enum(['letter','note','journal','notice','phone','terminal']),paragraphIndex:z.number().int().nonnegative()}).strict();
const PassageProposalSchema=z.object({paragraphIndex:z.number().int().nonnegative(),text:z.string().min(1).max(6000),evidence:z.string().min(1).max(10000)}).strict();
export const StoryDocumentSectionSchema=z.object({paragraphIndex:z.number().int().nonnegative(),start:z.number().int().nonnegative(),end:z.number().int().positive(),text:z.string().min(1).max(6000)}).strict();
export const StoryDocumentSchema=DocumentIdentitySchema.extend({id:z.string().min(1).max(256),sections:z.array(StoryDocumentSectionSchema).max(16)}).strict();
export type StoryDocument=z.infer<typeof StoryDocumentSchema>;
/** Optional planner enrichment only identifies literal visible prose. No completion,
 * paraphrase, private-source fallback or repair request is allowed here. */
export function normalizeStoryDocuments(value:unknown,paragraphs:readonly {text:string}[]):StoryDocument[]{
 if(!Array.isArray(value))return [];
 const result:StoryDocument[]=[];const seen=new Set<string>();let characters=0;
 for(const raw of value.slice(0,48)){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const {sections,...identity}=raw as Record<string,unknown>;
  const parsed=DocumentIdentitySchema.safeParse(identity);
  if(!parsed.success||!Array.isArray(sections))continue;
  const doc=parsed.data;
  if(!paragraphs[doc.paragraphIndex]?.text.includes(doc.name)||seen.has(doc.name))continue;
  const passages:StoryDocument['sections']=[];
  for(const item of sections.slice(0,32)){
   const p=PassageProposalSchema.safeParse(item);if(!p.success)continue;
   const s=p.data,text=paragraphs[s.paragraphIndex]?.text;
   if(!text||s.paragraphIndex<doc.paragraphIndex||!s.evidence.includes(doc.name)||!s.evidence.includes(s.text)||!s.text.trim())continue;
   const evidenceStart=text.indexOf(s.evidence),inside=s.evidence.indexOf(s.text);
   if(evidenceStart<0||text.indexOf(s.evidence,evidenceStart+1)>=0||s.evidence.indexOf(s.text,inside+1)>=0)continue;
   const start=evidenceStart+inside,end=start+s.text.length;
   if(passages.some(p=>p.paragraphIndex===s.paragraphIndex&&start<p.end&&end>p.start)||characters+s.text.length>24000)continue;
   passages.push({paragraphIndex:s.paragraphIndex,start,end,text:s.text});characters+=s.text.length;
   if(passages.length===16)break;
  }
  passages.sort((a,b)=>a.paragraphIndex-b.paragraphIndex||a.start-b.start);
  seen.add(doc.name);result.push({...doc,id:`document-${result.length+1}`,sections:passages});
  if(result.length===12)break;
 }
 return result;
}
/** Saved records remain tied to their source offsets. Removing/editing the source
 * never resurrects an old passage; callers separately validate the owning TurnKey. */
export function validateStoryDocuments(value:unknown,paragraphs:readonly {text:string}[]):StoryDocument[]{
 if(!Array.isArray(value))return [];
 const result:StoryDocument[]=[];const ids=new Set<string>(),names=new Set<string>();let characters=0;
 for(const raw of value.slice(0,12)){
  const parsed=StoryDocumentSchema.safeParse(raw);if(!parsed.success)continue;
  const d=parsed.data;
  if(ids.has(d.id)||names.has(d.name)||!paragraphs[d.paragraphIndex]?.text.includes(d.name))continue;
  const sections=d.sections.filter(s=>{
   if(s.paragraphIndex<d.paragraphIndex||s.end!==s.start+s.text.length||paragraphs[s.paragraphIndex]?.text.slice(s.start,s.end)!==s.text||characters+s.text.length>24000)return false;
   characters+=s.text.length;return true;
  });
  ids.add(d.id);names.add(d.name);result.push({...d,sections});
 }
 return result;
}
export function visibleStoryDocuments(documents:readonly StoryDocument[],paragraphIndex:number):StoryDocument[]{
 return documents.filter(d=>d.paragraphIndex<=paragraphIndex).map(d=>({...d,sections:d.sections.filter(s=>s.paragraphIndex<=paragraphIndex).map(s=>({...s}))}));
}
