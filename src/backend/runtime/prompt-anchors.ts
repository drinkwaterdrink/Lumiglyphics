import type {PromptProtection} from './prompt-protection.js';

export type PromptAnchors={
  entries:Array<{token:string;text:string}>;
  pinnedEntries?:Array<{token:string;text:string}>;
  expandedCharacters:number;
  maskedPrompt:string;
};

/**
 * Sanitize a user-pinned Prompt Studio clause before embedding it into a target
 * diffusion dialect (strips leading negative directives for positive-only models
 * and rewrites `"photorealistic"` to `"lifelike natural"` for FLUX.3 Klein).
 */
export function sanitizePinnedClauseForDialect(clause:string,dialect?:string):string {
  let clean=clause.replace(/\s+/g,' ').trim();
  if(!clean)return '';
  const positiveOnly=dialect==='flux3-klein'||dialect==='ideogram-v4';
  if(positiveOnly){
    clean=clean.replace(/^--no\s+/i,'').replace(/^(?:without|avoid|no)\s+/i,'').trim();
  }
  if(dialect==='flux3-klein'){
    clean=clean.replace(/\bphotorealistic\b/gi,'lifelike natural');
  }
  return clean;
}

/** The writer controls visual direction, not the spelling/ownership of identity
 * or user-pinned clauses. Expand opaque markers locally before budget checks. */
export function createPromptAnchors(
  prompt:string,
  protection:PromptProtection,
  pinnedClauses?:readonly string[],
  options?:{dialect?:string;maxPinnedCharacters?:number}
):PromptAnchors{
 const blocks=protection.exact?[protection.exact]:protection.subjects.length?
  protection.subjects.map(subject=>`${subject.name}: ${subject.facts.join(', ')}`):protection.facts.length?[protection.facts.join('; ')]:[];
 let namespace=0;while(prompt.includes(`[[LG_CAST_${namespace}_`)||prompt.includes(`[[LG_PIN_${namespace}_`))namespace++;
 const entries=blocks.map((text,index)=>({token:`[[LG_CAST_${namespace}_${index}]]`,text}));
 let maskedPrompt=prompt;
 for(const entry of [...entries].sort((a,b)=>b.text.length-a.text.length)){
  if(maskedPrompt.includes(entry.text)){
   maskedPrompt=maskedPrompt.split(entry.text).join(entry.token);
   continue;
  }
  const commaVariant=entry.text.replace(/;\s+/g,', ');
  if(maskedPrompt.includes(commaVariant)){
   maskedPrompt=maskedPrompt.split(commaVariant).join(entry.token);
   continue;
  }
  const semiVariant=entry.text.replace(/,\s+/g,'; ');
  if(maskedPrompt.includes(semiVariant)){
   maskedPrompt=maskedPrompt.split(semiVariant).join(entry.token);
  }
 }

 const pinnedEntries:Array<{token:string;text:string}>=[];
 const maxPinnedBudget=options?.maxPinnedCharacters??750;
 let usedPinnedChars=0;
 const seenPinned=new Set<string>();
 for(const rawClause of pinnedClauses??[]){
  const text=sanitizePinnedClauseForDialect(rawClause,options?.dialect);
  if(!text)continue;
  const key=text.toLowerCase();
  if(seenPinned.has(key))continue;
  if(entries.some(e=>e.text.toLowerCase().includes(key)))continue;
  if(usedPinnedChars>0&&usedPinnedChars+text.length>maxPinnedBudget)continue;
  seenPinned.add(key);
  const token=`[[LG_PIN_${namespace}_${pinnedEntries.length}]]`;
  if(maskedPrompt.includes(text)){
   maskedPrompt=maskedPrompt.split(text).join(token);
  }else if(rawClause.trim()&&maskedPrompt.includes(rawClause.trim())){
   maskedPrompt=maskedPrompt.split(rawClause.trim()).join(token);
  }else{
   maskedPrompt=maskedPrompt.trim()?`${maskedPrompt.trim()}, ${token}`:token;
  }
  pinnedEntries.push({token,text});
  usedPinnedChars+=text.length;
 }

 const allEntries=[...entries,...pinnedEntries];
 return {
  entries,
  ...(pinnedEntries.length?{pinnedEntries}:{}),
  expandedCharacters:allEntries.reduce((sum,entry)=>sum+entry.text.length+1,0)-(allEntries.length?1:0),
  maskedPrompt
 };
}
export function expandPromptAnchors(prompt:string,anchors:PromptAnchors,negative=''):{prompt:string;usedAnchors:boolean}{
 const castMarker=/\[\[LG_CAST_\d+_\d+\]\]/g;
 const pinMarker=/\[\[LG_PIN_\d+_\d+\]\]/g;
 if(negative.includes('[[LG_CAST_'))throw new Error('Identity anchors belong in the positive prompt, never the negative prompt.');
 if(negative.includes('[[LG_PIN_'))throw new Error('Pinned clauses belong in the positive prompt, never the negative prompt.');
 if(prompt.replace(castMarker,'').includes('[[LG_CAST_'))throw new Error('Malformed identity anchor in the rewritten prompt. Copy the supplied tokens exactly.');
 if(prompt.replace(pinMarker,'').includes('[[LG_PIN_'))throw new Error('Malformed pinned clause token in the rewritten prompt. Copy the supplied tokens exactly.');
 const suppliedCast=[...prompt.matchAll(castMarker)].map(match=>match[0]);
 const suppliedPins=[...prompt.matchAll(pinMarker)].map(match=>match[0]);
 const pinned=anchors.pinnedEntries??[];
 if(!suppliedCast.length&&!suppliedPins.length){
  for(const p of pinned){
   if(!prompt.toLowerCase().includes(p.text.toLowerCase())){
    throw new Error(`Required pinned clause "${p.text}" was omitted from the rewritten prompt.`);
   }
  }
  return {prompt,usedAnchors:false};
 }
 for(const token of suppliedCast)if(!anchors.entries.some(entry=>entry.token===token))throw new Error('Unknown identity anchor in the rewritten prompt.');
 for(const token of suppliedPins)if(!pinned.some(entry=>entry.token===token))throw new Error('Unknown pinned clause anchor in the rewritten prompt.');
 for(const entry of anchors.entries){
  const count=suppliedCast.filter(token=>token===entry.token).length;
  if(!count)throw new Error(`Required identity anchor ${entry.token} is missing. Include every supplied anchor exactly once.`);
  if(count!==1)throw new Error(`Include identity anchor ${entry.token} exactly once.`);
 }
 for(const entry of pinned){
  const count=suppliedPins.filter(token=>token===entry.token).length;
  if(!count)throw new Error(`Required pinned clause ${entry.token} is missing. Include every supplied pinned token exactly once.`);
  if(count!==1)throw new Error(`Include pinned clause ${entry.token} exactly once.`);
 }
 for(const entry of [...anchors.entries,...pinned])prompt=prompt.replace(entry.token,()=>entry.text);
 return {prompt,usedAnchors:suppliedCast.length>0};
}
