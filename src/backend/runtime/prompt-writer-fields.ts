/** Normalize a small, unambiguous writer dialect. Never stringify arrays or
 * flatten unknown visual fields; the normal prompt/identity checks still apply. */
export function promptWriterFields(value:unknown,fallbackNegative:string):{prompt:string;negativePrompt:string}{
 const fail=(reason:string):never=>{throw new Error(`The writer returned invalid prompt fields: ${reason}`);};
 if(!value||typeof value!=='object'||Array.isArray(value))return fail('expected one JSON object.');
 const object=value as Record<string,unknown>;

 // Native Ideogram Direct JSON mode support: if the returned object has high_level_description,
 // it is already a fully formed Ideogram prompt schema.
 if ('high_level_description' in object || 'compositional_deconstruction' in object) {
  return { prompt: JSON.stringify(object), negativePrompt: '' };
 }

 const positive=['prompt','positivePrompt','positive_prompt','positive'];
 const negative=['negativePrompt','negative_prompt','negative'];
 const auxiliary=['explanation','notes','reasoning','character_count','characterCount','combinedCharacters','totalCharacters'];
 if(Object.keys(object).some(key=>![...positive,...negative,...auxiliary].includes(key)))return fail('unexpected fields; return prompt and negativePrompt only.');
 const read=(keys:string[],kind:string,optional:boolean):string|undefined=>{
  const values=keys.filter(key=>object[key]!==undefined&&object[key]!==null).map(key=>object[key]);
  if(values.some(item=>{
   // If prompt is a nested Ideogram Direct JSON object, stringify it
   if (item && typeof item === 'object' && !Array.isArray(item) && ('high_level_description' in (item as Record<string, unknown>))) {
    return false;
   }
   return typeof item!=='string';
  }))return fail(`${kind} must be text.`);
  const strings=values.map(item=>(item && typeof item === 'object') ? JSON.stringify(item) : String(item));
  if(new Set(strings.map(text=>text.trim())).size>1)return fail(`conflicting ${kind} fields; return one version.`);
  const text=strings[0];
  if(text===undefined)return optional?undefined:fail(`${kind} must be text.`);
  if(text.length>65000)return fail(`${kind} exceeds the internal 65,000-character safety limit.`);
  return text;
 };
 const prompt=read(positive,'positive prompt',false)!;
 if(!prompt.trim())return fail('positive prompt must be non-empty text.');
 const isIdeogramPrompt = prompt.trim().startsWith('{') && prompt.includes('high_level_description');
 return {prompt:prompt.trim(),negativePrompt:isIdeogramPrompt ? '' : (read(negative,'negative prompt',true)??fallbackNegative)};
}
