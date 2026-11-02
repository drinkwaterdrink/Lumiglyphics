import type {PictureExplanation} from '../../shared/image-diagnostics.js';
/** Human wording from the bounded recorded DTO only; never interpret raw prompts or story context. */
export function describePictureExplanation(value:PictureExplanation|undefined):string {
 const missing='Not recorded';
 if(!value||value.version!==1)return missing;
 const review={review:'Held for your review',prepared:'Preview prepared',approved:'Approved',skipped:'Skipped',cancelled:'Cancelled'};
 return [`Passage: ${value.cue?value.cue.paragraphIndex+1:missing}`,`Cue: ${value.cue?({flattened_scene:'Scene illustration',background:'Background',sprite:'Character portrait'}[value.cue.kind]??missing):missing}`,`Template: ${value.template??missing}`,`Template choice: ${value.selection==='manual'?'Selected manually':missing}`,`Framing: ${value.framing??missing}`,`Appearance source: ${value.identity??missing}`,`Other recorded sources: ${value.sources?.length?value.sources.join(', '):missing}`,`Image path: ${value.cache==='reused'?'Reused a compatible saved picture':value.cache==='provider'?'Prepared for image generation':missing}`,`Review: ${value.review?review[value.review]??missing:missing}`].join('\n');
}
