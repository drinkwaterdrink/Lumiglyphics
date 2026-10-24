import type {ImageRequestRecord} from '../../shared/image-review.js';
export type BriefDraft={prompt:string;negativePrompt:string;parameters?:Record<string,unknown>};
export function preparedBrief(record:ImageRequestRecord|undefined,draft?:BriefDraft){
 const rows:Array<{label:string;value:string}>=[],metadata=record?.imagePromptMetadata,profile=record?.promptProfile;
 if(metadata)for(const [label,value] of [['Subjects',metadata.brief.subjects],['Moment',metadata.brief.action],['Scene',metadata.brief.scene],['Composition',metadata.brief.composition],['Framing',metadata.brief.framing],['Lighting',metadata.brief.lighting],['Template',metadata.template.name]] as const){if(value.trim())rows.push({label,value});}
 const parameters=draft?draft.parameters:record?.parameters;
 const changed=Boolean(record&&draft&&(draft.prompt!==record.prompt||draft.negativePrompt!==record.negativePrompt||parameters===undefined||JSON.stringify(parameters)!==JSON.stringify(record.parameters)));
 const custom=profile?.outputManaged===false||parameters?.rawRequestOverride!==undefined;
 const size=typeof parameters?.size==='string'?parameters.size:undefined;
 const ratio=typeof parameters?.aspectRatio==='string'?parameters.aspectRatio:typeof parameters?.aspect_ratio==='string'?parameters.aspect_ratio:undefined;
 const output=custom?'Custom raw settings take priority. Inspect Parameters and references.':parameters===undefined?'Output settings could not be read. Check Parameters and references.':[size?`Size: ${size}`:'Size: connection default',ratio?`Aspect ratio: ${ratio}`:''].filter(Boolean).join(' · ');
 const compatibility:string[]=[];
 if(profile){
  const source={live:'Provider metadata captured for this request',catalogue:'Bundled provider catalogue',manual:'Manual ceiling',fallback:'Conservative fallback; endpoint limit is unverified'}[profile.source];
  compatibility.push(`${source}: ${profile.maxCharacters.toLocaleString()} combined characters.${profile.providerLimit!==undefined?` Known provider ceiling: ${profile.providerLimit.toLocaleString()}.`:''}`);
  compatibility.push(profile.negativeMode==='positive-only'?'This route requires positive-only wording. Essential constraints belong in the positive description.':'Negative prompt support is model/provider dependent.');
  compatibility.push(`Model-family guidance: ${profile.family} · ${profile.format}. This is writing guidance, not a quality guarantee.`);
  if(profile.output){
   const outputSource=profile.outputSource==='live'?'provider metadata captured for this request':profile.outputSource==='catalogue'?'bundled catalogue':'source not recorded';
   compatibility.push(`Output choices: ${outputSource}. Host forwarding still depends on your connection.`);
   if(profile.outputSummary)compatibility.push(`Saved output decision: ${profile.outputSummary}${changed?' Your current draft settings are shown separately above.':''}`);
   const square=profile.output.ratios?profile.output.ratios.every(value=>value==='1:1'):profile.output.sizes.every(value=>{const match=/^(\d+)x(\d+)$/.exec(value);return Boolean(match&&match[1]===match[2]);});
   if(square)compatibility.push('This route lists only square outputs. Portrait framing instructions cannot change its supported dimensions.');
  }else compatibility.push('Supported output sizes are not recorded for this request. Connection settings remain authoritative.');
 }else compatibility.push('Legacy request: no model capability profile was saved. Endpoint support is unverified.');
 return {rows,changed,output,compatibility};
}
