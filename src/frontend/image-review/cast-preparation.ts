import type {ImageRequestRecord} from '../../shared/image-review.js';
/** Retained preparation evidence only. Never resolve current cast into an old request. */
export function castPreparation(record:ImageRequestRecord|undefined){
 const brief=record?.imagePromptMetadata?.brief,snapshot=brief?.subjectPreparation;
 const rows:Array<{label:string;value:string}>=[],notes:string[]=[];
 if(!brief)return {rows,notes:['Appearance-source details were not saved for this request. Inspect its prompt wording.']};
 if(brief.subjectMode==='none')return {rows,notes:['This template prepares no character appearance.']};
 if(snapshot){
  rows.push({label:'Subject',value:snapshot.name||'Name not recorded'},{label:'Identity source',value:snapshot.identitySource});
  if(snapshot.identitySource!=='ensemble snapshot'){
   rows.push({label:'Identity before outfit',value:snapshot.identity||'No identity recorded'},{label:'Outfit',value:snapshot.attire?.trim()||'No separate outfit supplied'},{label:'Outfit source',value:snapshot.attireSource});
   rows.push({label:'Pose / expression',value:snapshot.direction||'No separate pose supplied'});
  }else notes.push('Named ensemble descriptions are kept together below. Per-person source precedence was not saved separately.');
  notes.push(snapshot.subjectsInPositive?'The positive template includes the prepared subject block.':'The positive template omits {{subjects}}. Inspect the actual prompt for any manually written appearance.');
  if(snapshot.subjectsInNegative)notes.push('The negative template also contains {{subjects}}; review whether that is intended.');
  if(snapshot.shortened)notes.push('Ingredient previews were shortened for storage. The prepared subject block and final prompt are separate evidence.');
 }else notes.push('This older request has no saved identity/outfit source snapshot. Sources cannot be reconstructed from current settings.');
 rows.push({label:'Prepared subject block',value:brief.subjects||'No subject block recorded'},{label:'Source labels',value:brief.sources.join('\n')||'No source labels recorded'});
 if(brief.conflicts.length)rows.push({label:'Conflicts / preparation notes',value:brief.conflicts.join('\n')});
 notes.push('This block is recorded before template formatting and prompt rewriting. The final edited prompt remains authoritative. A named identity can already contain clothing; an outfit override may replace those clothing details.');
 return {rows,notes};
}
