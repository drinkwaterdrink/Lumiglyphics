import type {ImagePromptMetadata} from '../../shared/image-templates.js';

type SubjectLock={name:string;facts:string[]};
export type PromptProtection={exact:string;facts:string[];subjects:SubjectLock[];minimumCharacters:number};
const canonical=(value:string):string=>value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
/** Ensemble descriptions may be reordered; identity facts must stay with their owner.
 * Single-person fitting permits fact reordering; ordinary rerolls retain exact phrases. */
export function promptProtection(prompt:string,metadata?:ImagePromptMetadata,compactSingle=false):PromptProtection{
 const source=metadata?.brief.subjects.trim()??'';
 const empty:PromptProtection={exact:'',facts:[],subjects:[],minimumCharacters:0};
 if(!source)return empty;
 if(metadata?.brief.subjectMode!=='ensemble'){
  if(compactSingle){
   // Keep only facts still present in the editing source. Deduplicate the legacy
   // repeated "Wearing" clause, allowing order/punctuation to change, not facts.
   const original=canonical(prompt);
   const facts=[...new Map(source.split(/[,;\n]+/).map(value=>value.trim()).filter(value=>canonical(value)&&original.includes(canonical(value))).map(value=>{
    const bare=value.replace(/^wearing\s+/i,'');
    return [canonical(bare),bare] as const;
   })).values()];
   return {...empty,facts,minimumCharacters:facts.reduce((sum,fact)=>sum+fact.length+2,0)};
  }
  const exact=prompt.includes(source)?source:'';return {...empty,exact,minimumCharacters:exact.length};
 }
 const original=canonical(prompt),subjects:SubjectLock[]=[];
 const rows=source.split(/\r?\n/).filter(row=>row.indexOf(':')>0);
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
  const name=row.slice(0,colon).trim();if(name.length>160||!canonical(name)||!(` ${original} `).includes(` ${canonical(name)} `))continue;
  const declared=declarations.find(d=>d.name===name);
  const next=declared?declarations.find(d=>d.index>declared.index):undefined;
  const newline=declared?prompt.indexOf('\n',declared.end):-1;
  const current=declared?prompt.slice(declared.end,Math.min(next?.index??prompt.length,newline<0?prompt.length:newline)).trim():'';
  // Explicit Name: rows are authoritative after edits. A fact appearing under
  // another person must never restore a removed trait from stale metadata.
  const unchanged=declared&&(`${canonical(current)} `).startsWith(`${canonical(row.slice(colon+1))} `);
  const values=declared&&!unchanged?current:row.slice(colon+1);
  const scope=declared?canonical(current):original;
  const facts=[...new Set(values.split(/[,;\n]+/).map(value=>value.trim()).filter(value=>Boolean(canonical(value))&&scope.includes(canonical(value))))];
  subjects.push({name,facts});
 }
 // Unrecognized legacy formats retain strict protection, never silently weaken it.
 if(!subjects.length)return {...empty,exact:prompt.includes(source)?source:'',minimumCharacters:prompt.includes(source)?source.length:0};
 return {...empty,subjects,minimumCharacters:subjects.reduce((sum,s)=>sum+s.name.length+2+s.facts.reduce((n,f)=>n+f.length+2,0),0)};
}
export function assertPromptProtection(prompt:string,protection:PromptProtection):void{
 if(protection.exact&&!prompt.includes(protection.exact))throw new Error('The protected identity/outfit phrase was changed or omitted.');
 const text=` ${canonical(prompt)} `;
 if(!protection.facts.every(fact=>text.includes(` ${canonical(fact)} `)))throw new Error('Required subject appearance or outfit details were omitted or changed. Keep every supplied appearance fact.');
 const mentions: Array<{index:number;subject:number}>=[];
 for(const [subject,lock] of protection.subjects.entries()){
  const needle=` ${canonical(lock.name)} `;let start=0,index:number;
  while((index=text.indexOf(needle,start))!==-1){mentions.push({index,subject});start=index+needle.length-1;}
 }
 mentions.sort((a,b)=>a.index-b.index);
 for(const [index,lock] of protection.subjects.entries()){
  const owned=mentions.filter(m=>m.subject===index);
  if(!owned.length)throw new Error('A required cast member was omitted from the rewritten prompt.');
  const valid=owned.some(mention=>{
   const next=mentions.find(m=>m.index>mention.index&&m.subject!==index);
   const section=text.slice(mention.index,next?.index??text.length);
   return lock.facts.every(fact=>section.includes(canonical(fact)));
  });
  if(!valid)throw new Error('Required cast appearance details were omitted, changed, or assigned to another person. Keep each supplied appearance fact with its named subject.');
 }
}
