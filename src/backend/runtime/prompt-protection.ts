import type {ImagePromptMetadata} from '../../shared/image-templates.js';

type SubjectLock={name:string;facts:string[]};
export type PromptProtection={exact:string;facts:string[];subjects:SubjectLock[];minimumCharacters:number};
const canonical=(value:string):string=>value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
/** Words/alnum runs in canonical order. All fact/name comparisons happen on
 *  these token arrays so attached punctuation ("red dress,", "red dress:") can
 *  never masquerade as a missing fact, while partial-token coincidences
 *  ("cat ear" inside "cat earrings") can never masquerade as a match. */
const tokenize=(value:string):string[]=>{
 const text=canonical(value);
 return text?text.split(' '):[];
};
/** True when `needle` occurs as one contiguous, ordered run inside `haystack`. */
function containsTokenSequence(haystack:readonly string[],needle:readonly string[]):boolean{
 if(!needle.length||needle.length>haystack.length)return false;
 outer:for(let start=0;start<=haystack.length-needle.length;start+=1){
  for(let offset=0;offset<needle.length;offset+=1){
   if(haystack[start+offset]!==needle[offset])continue outer;
  }
  return true;
 }
 return false;
}
/** True when `haystack` begins with every token of `prefix`, in order. */
function startsWithTokenSequence(haystack:readonly string[],prefix:readonly string[]):boolean{
 if(!prefix.length||prefix.length>haystack.length)return false;
 return prefix.every((token,index)=>haystack[index]===token);
}/** Ensemble descriptions may be reordered; identity facts must stay with their owner.
 * Single-person fitting permits fact reordering; ordinary rerolls retain exact phrases. */
export function promptProtection(prompt:string,metadata?:ImagePromptMetadata,compactSingle=false):PromptProtection{
 const source=metadata?.brief.subjects.trim()??'';
 const empty:PromptProtection={exact:'',facts:[],subjects:[],minimumCharacters:0};
 if(!source)return empty;
 const original=canonical(prompt),paddedOriginal=` ${original} `;
 if(metadata?.brief.subjectMode!=='ensemble'){
  const tagSource=source.replace(/;\s*|\n+/g,', ').replace(/\s+/g,' ').trim();
  const exact=prompt.includes(source)?source:(tagSource&&prompt.includes(tagSource)?tagSource:'');
  if(!compactSingle&&exact){
   return {...empty,exact,minimumCharacters:exact.length};
  }
  if(compactSingle||!exact){
   // Keep only facts still present in the editing source. Deduplicate the legacy
   // repeated "Wearing" clause, allowing order/punctuation to change, not facts.
   const promptTokens=tokenize(prompt);
   const facts=[...new Map(source.split(/[,;\n]+/).map(value=>value.trim()).filter(value=>containsTokenSequence(promptTokens,tokenize(value))).map(value=>{
    const bare=value.replace(/^wearing\s+/i,'');    return [canonical(bare),bare] as const;
   })).values()];
   return {...empty,facts,minimumCharacters:facts.reduce((sum,fact)=>sum+fact.length+2,0)};
  }
  return {...empty,exact,minimumCharacters:exact.length};
 }
 const originalTokens=tokenize(prompt),subjects:SubjectLock[]=[]; const rows=source.split(/\r?\n/).filter(row=>row.indexOf(':')>0);
 const declarations:Array<{name:string;index:number;end:number}>=[];
 for(const row of rows){
  const name=row.slice(0,row.indexOf(':')).trim();
  if(name.length>160||!canonical(name))continue;
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(const match of prompt.matchAll(new RegExp(escaped+'\\s*:','giu'))){
   if(match.index>0&&/[\p{L}\p{N}]/u.test(prompt[match.index-1]!))continue;
   declarations.push({name,index:match.index,end:match.index+match[0].length});
  }
 }
 declarations.sort((a,b)=>a.index-b.index);
 for(const row of rows){
  const colon=row.indexOf(':');if(colon<1)continue;
  const name=row.slice(0,colon).trim();if(name.length>160||!canonical(name)||!containsTokenSequence(originalTokens,tokenize(name)))continue;  const declared=declarations.find(d=>d.name===name);
  const next=declared?declarations.find(d=>d.index>declared.index):undefined;
  const newline=declared?prompt.indexOf('\n',declared.end):-1;
  const current=declared?prompt.slice(declared.end,Math.min(next?.index??prompt.length,newline<0?prompt.length:newline)).trim():'';
  // Explicit Name: rows are authoritative after edits. A fact appearing under
  // another person must never restore a removed trait from stale metadata.
  const unchanged=declared&&startsWithTokenSequence(tokenize(current),tokenize(row.slice(colon+1)));
  const values=declared&&!unchanged?current:row.slice(colon+1);
  const scopeTokens=declared?tokenize(current):originalTokens;
  const facts=[...new Set(values.split(/[,;\n]+/).map(value=>value.trim()).filter(value=>Boolean(canonical(value))&&containsTokenSequence(scopeTokens,tokenize(value))))];  subjects.push({name,facts});
 }
 // Unrecognized legacy formats retain strict protection, never silently weaken it.
 if(!subjects.length)return {...empty,exact:prompt.includes(source)?source:'',minimumCharacters:prompt.includes(source)?source.length:0};
 return {...empty,subjects,minimumCharacters:subjects.reduce((sum,s)=>sum+s.name.length+2+s.facts.reduce((n,f)=>n+f.length+2,0),0)};
}
export function assertPromptProtection(prompt:string,protection:PromptProtection):void{
 if(protection.exact&&!prompt.includes(protection.exact))throw new Error('The protected identity/outfit phrase was changed or omitted.');
 const promptTokens=tokenize(prompt);
 if(!protection.facts.every(fact=>containsTokenSequence(promptTokens,tokenize(fact))))throw new Error('Required subject appearance or outfit details were omitted or changed. Keep every supplied appearance fact.');
 const mentions: Array<{index:number;subject:number}>=[];
 for(const [subject,lock] of protection.subjects.entries()){
  const nameTokens=tokenize(lock.name);
  for(let start=0;start+nameTokens.length<=promptTokens.length;start+=1){
   if(nameTokens.every((token,offset)=>promptTokens[start+offset]===token))mentions.push({index:start,subject});
  }
 }
 mentions.sort((a,b)=>a.index-b.index);
 for(const [index,lock] of protection.subjects.entries()){
  const owned=mentions.filter(m=>m.subject===index);
  if(!owned.length)throw new Error('A required cast member was omitted from the rewritten prompt.');
  const valid=owned.some(mention=>{
   const next=mentions.find(m=>m.index>mention.index&&m.subject!==index);
   const section=promptTokens.slice(mention.index,next?.index??promptTokens.length);
   return lock.facts.every(fact=>containsTokenSequence(section,tokenize(fact)));  });
  if(!valid)throw new Error('Required cast appearance details were omitted, changed, or assigned to another person. Keep each supplied appearance fact with its named subject.');
 }
}
