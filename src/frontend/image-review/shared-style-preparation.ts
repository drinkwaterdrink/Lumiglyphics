import type {SharedStyleSnapshot} from '../../shared/shared-style-snapshot.js';

export function sharedStylePreparation(snapshot:SharedStyleSnapshot|undefined){
 const rows:Array<{label:string;value:string}>=[],notes:string[]=[];
 if(!snapshot)return {rows,notes:['Shared-style preparation settings are unavailable for this request. Current settings are not substituted.']};
 const preset=snapshot.presetName??(snapshot.presetId===null?'Preset choice not recorded':snapshot.presetId===''?'No preset selected':`${snapshot.presetId} (label unavailable at preparation)`);
 rows.push({label:'Preset',value:preset+(snapshot.matchesPreset===false?' (customized)':'')});
 if(snapshot.matchesPreset===false)notes.push('Preset-controlled wording had been customized at preparation; the saved words below take precedence over the label.');
 for(const [label,field] of [['Style prefix',snapshot.prefix],['Suffix',snapshot.suffix],['Shared negative',snapshot.negative]] as const){
  const usage=[field.positiveOccurrences?`positive ×${field.positiveOccurrences}`:'',field.negativeOccurrences?`negative ×${field.negativeOccurrences}`:''].filter(Boolean).join(' · ')||'Not referenced by this template';
  rows.push({label,value:`${field.text.trim()?field.text:'(Empty)'}\n\n${field.characters.toLocaleString()} configured characters · ${usage}`});
  if(field.shortened)notes.push(`${label}: only the first ${field.text.length.toLocaleString()} of ${field.characters.toLocaleString()} characters were saved for display. The actual prompt was not shortened by this snapshot.`);
 }
 notes.push('Saved inputs and template placeholder usage at preparation. Model adaptation, rewriting and manual edits may change their wording or placement; the final prompt is authoritative. This snapshot does not reapply style settings.');
 return {rows,notes};
}
