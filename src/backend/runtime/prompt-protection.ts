import type {ImagePromptMetadata} from '../../shared/image-templates.js';

type SubjectLock={name:string;facts:string[]};
export type PromptProtection={exact:string;subjects:SubjectLock[];minimumCharacters:number};
const canonical=(value:string):string=>value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
/** Ensemble descriptions may be reordered; identity facts must stay with their owner.
 * Legacy single-person previews retain their existing exact-phrase protection. */
export function promptProtection(prompt:string,metadata?:ImagePromptMetadata):PromptProtection{
 const source=metadata?.brief.subjects.trim()??'';
 const empty:PromptProtection={exact:'',subjects:[],minimumCharacters:0};
 if(!source)return empty;
 if(metadata?.brief.subjectMode!=='ensemble'){
  const exact=prompt.includes(source)?source:'';return {...empty,exact,minimumCharacters:exact.length};
 }
 const original=canonical(prompt),subjects:SubjectLock[]=[];
 for(const row of source.split(/\r?\n/)){
  const colon=row.indexOf(':');if(colon<1)continue;
  const name=row.slice(0,colon).trim();if(name.length>160||!canonical(name)||!(` ${original} `).includes(` ${canonical(name)} `))continue;
  const facts=[...new Set(row.slice(colon+1).split(/[,;\n]+/).map(value=>value.trim()).filter(value=>Boolean(canonical(value))&&original.includes(canonical(value))))];
  subjects.push({name,facts});
 }
 // Unrecognized legacy formats retain strict protection, never silently weaken it.
 if(!subjects.length)return {...empty,exact:prompt.includes(source)?source:'',minimumCharacters:prompt.includes(source)?source.length:0};
 return {exact:'',subjects,minimumCharacters:subjects.reduce((sum,s)=>sum+s.name.length+2+s.facts.reduce((n,f)=>n+f.length+2,0),0)};
}
export function assertPromptProtection(prompt:string,protection:PromptProtection):void{
 if(protection.exact&&!prompt.includes(protection.exact))throw new Error('The protected identity/outfit phrase was changed or omitted.');
 const text=` ${canonical(prompt)} `;
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
