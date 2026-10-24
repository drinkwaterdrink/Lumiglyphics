/** Normalize a small, unambiguous writer dialect. Never stringify arrays or
 * flatten unknown visual fields; the normal prompt/identity checks still apply. */
export function promptWriterFields(value:unknown,fallbackNegative:string):{prompt:string;negativePrompt:string}{
 const fail=(reason:string):never=>{throw new Error(`The writer returned invalid prompt fields: ${reason}`);};
 if(!value||typeof value!=='object'||Array.isArray(value))return fail('expected one JSON object.');
 const object=value as Record<string,unknown>;
 const positive=['prompt','positivePrompt','positive_prompt','positive'];
 const negative=['negativePrompt','negative_prompt','negative'];
 const auxiliary=['explanation','notes','reasoning','character_count','characterCount','combinedCharacters','totalCharacters'];
 if(Object.keys(object).some(key=>![...positive,...negative,...auxiliary].includes(key)))return fail('unexpected fields; return prompt and negativePrompt only.');
 const read=(keys:string[],kind:string,optional:boolean):string|undefined=>{
  const values=keys.filter(key=>object[key]!==undefined&&object[key]!==null).map(key=>object[key]);
  if(values.some(item=>typeof item!=='string'))return fail(`${kind} must be text.`);
  const strings=values as string[];
  if(new Set(strings.map(text=>text.trim())).size>1)return fail(`conflicting ${kind} fields; return one version.`);
  const text=strings[0];
  if(text===undefined)return optional?undefined:fail(`${kind} must be text.`);
  if(text.length>65000)return fail(`${kind} exceeds the internal 65,000-character safety limit.`);
  return text;
 };
 const prompt=read(positive,'positive prompt',false)!;
 if(!prompt.trim())return fail('positive prompt must be non-empty text.');
 return {prompt:prompt.trim(),negativePrompt:read(negative,'negative prompt',true)??fallbackNegative};
}
