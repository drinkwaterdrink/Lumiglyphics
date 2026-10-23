import type {PromptProtection} from './prompt-protection.js';

export type PromptAnchors={entries:Array<{token:string;text:string}>;expandedCharacters:number;maskedPrompt:string};
/** The writer controls visual direction, not the spelling/ownership of identity
 * clauses. Expand opaque markers locally, before measuring the real request. */
export function createPromptAnchors(prompt:string,protection:PromptProtection):PromptAnchors{
 const blocks=protection.exact?[protection.exact]:protection.subjects.length?
  protection.subjects.map(subject=>`${subject.name}: ${subject.facts.join(', ')}`):protection.facts.length?[protection.facts.join('; ')]:[];
 let namespace=0;while(prompt.includes(`[[LG_CAST_${namespace}_`))namespace++;
 const entries=blocks.map((text,index)=>({token:`[[LG_CAST_${namespace}_${index}]]`,text}));
 let maskedPrompt=prompt;
 for(const entry of [...entries].sort((a,b)=>b.text.length-a.text.length))if(maskedPrompt.includes(entry.text))maskedPrompt=maskedPrompt.split(entry.text).join(entry.token);
 return {entries,expandedCharacters:entries.reduce((sum,entry)=>sum+entry.text.length+1,0)-(entries.length?1:0),maskedPrompt};
}
export function expandPromptAnchors(prompt:string,anchors:PromptAnchors,negative=''):{prompt:string;usedAnchors:boolean}{
 const marker=/\[\[LG_CAST_\d+_\d+\]\]/g;
 if(negative.includes('[[LG_CAST_'))throw new Error('Identity anchors belong in the positive prompt, never the negative prompt.');
 if(prompt.replace(marker,'').includes('[[LG_CAST_'))throw new Error('Malformed identity anchor in the rewritten prompt. Copy the supplied tokens exactly.');
 const supplied=[...prompt.matchAll(marker)].map(match=>match[0]);
 if(!supplied.length)return {prompt,usedAnchors:false}; // Legacy complete-prompt responses still receive strict fact validation.
 for(const token of supplied)if(!anchors.entries.some(entry=>entry.token===token))throw new Error('Unknown identity anchor in the rewritten prompt.');
 for(const entry of anchors.entries){
  const count=supplied.filter(token=>token===entry.token).length;
  if(!count)throw new Error(`Required identity anchor ${entry.token} is missing. Include every supplied anchor exactly once.`);
  if(count!==1)throw new Error(`Include identity anchor ${entry.token} exactly once.`);
 }
 for(const entry of anchors.entries)prompt=prompt.replace(entry.token,()=>entry.text);
 return {prompt,usedAnchors:true};
}
