import type {ImageRequestRecord} from '../../shared/image-review.js';
import {preparedBrief,type BriefDraft} from './prepared-brief.js';
import {castPreparation} from './cast-preparation.js';
import {sharedStylePreparation} from './shared-style-preparation.js';
export type BriefDestination='prompt'|'subject'|'template'|'output';
export const PREPARED_BRIEF_CSS=`
[data-prepared-brief]{margin:12px 0;border-top:1px solid var(--edge)}
[data-prepared-brief] p{font-size:12px;line-height:1.5;margin:8px 0}
:is([data-brief-rows],[data-cast-rows],[data-style-rows]){display:grid;grid-template-columns:80px minmax(0,1fr);gap:8px 12px;margin:12px 0;font-size:13px}
:is([data-brief-rows],[data-cast-rows],[data-style-rows]) dt{color:var(--vn-shell-muted,#bbc);font-weight:500}
:is([data-brief-rows],[data-cast-rows],[data-style-rows]) dd{margin:0;min-width:0;max-height:10em;overflow:auto;overflow-wrap:anywhere;white-space:pre-wrap}
:is([data-brief-rows],[data-cast-rows],[data-style-rows]) dd:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[data-brief-links]{margin:12px 0}[data-brief-links] button{font-size:12px;flex:1 1 110px}
`;
/** Read-only projection. Navigation never submits or changes a draft. */
export class PreparedBriefView{
 readonly element=document.createElement('details');
 private note=document.createElement('p');private rows=document.createElement('dl');private output=document.createElement('p');private compatibility=document.createElement('div');
 private rowsKey='';private compatibilityKey='';
 private castContent=document.createElement('div');private castKey='';
 private styleContent=document.createElement('div');private styleKey='';
 constructor(private navigate:(destination:BriefDestination)=>void){
  this.element.dataset.preparedBrief='';
  const summary=document.createElement('summary');summary.textContent='Prepared picture brief';
  this.note.dataset.briefNote='';this.note.setAttribute('role','status');this.rows.dataset.briefRows='';this.output.dataset.briefOutput='';
  const links=document.createElement('div');links.className='row';links.dataset.briefLinks='';
  for(const [destination,label] of [['prompt','Edit wording'],['subject','Correct subject'],['template','Template'],['output','Output settings']] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.briefLink=destination;button.onclick=()=>this.navigate(destination);links.append(button);}
  const capabilities=document.createElement('details');const title=document.createElement('summary');title.textContent='Why these model settings?';capabilities.append(title,this.compatibility);
  const cast=document.createElement('details'),castTitle=document.createElement('summary');cast.dataset.castPreparation='';castTitle.textContent='Appearance & prompt sources';cast.append(castTitle,this.castContent);
  const style=document.createElement('details'),styleTitle=document.createElement('summary');style.dataset.stylePreparation='';styleTitle.textContent='Shared style at preparation';style.append(styleTitle,this.styleContent);
  this.element.append(summary,this.note,this.rows,cast,style,this.output,links,capabilities);
 }
 render(record:ImageRequestRecord|undefined,draft:BriefDraft,available:Record<BriefDestination,boolean>){
  this.element.hidden=!record;if(!record)return;
  const view=preparedBrief(record,draft);
  this.note.textContent=!view.rows.length?'Preparation notes were not saved for this request. The prompt below remains available.':view.changed?'Your draft differs from the saved request. These preparation notes have not been reinterpreted; the edited prompt below is authoritative.':'Saved preparation notes. The prompt below is authoritative; these notes are not a separate instruction layer.';
  // Avoid replacing a focused navigation control during input events.
  const rowsKey=JSON.stringify(view.rows);
  if(rowsKey!==this.rowsKey){this.rowsKey=rowsKey;this.rows.replaceChildren(...view.rows.flatMap(row=>{const label=document.createElement('dt'),value=document.createElement('dd');label.textContent=row.label;value.textContent=row.value;if(row.value.length>280){value.tabIndex=0;value.setAttribute('aria-label',row.label);}return [label,value];}));}
  this.output.textContent=view.output;
  const compatibilityKey=JSON.stringify(view.compatibility);
  if(compatibilityKey!==this.compatibilityKey){this.compatibilityKey=compatibilityKey;this.compatibility.replaceChildren(...view.compatibility.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));}
  const cast=castPreparation(record),castKey=JSON.stringify(cast);
  if(castKey!==this.castKey){
    this.castKey=castKey;const list=document.createElement('dl');list.dataset.castRows='';
    for(const row of cast.rows){const label=document.createElement('dt'),value=document.createElement('dd');label.textContent=row.label;value.textContent=row.value;if(row.value.length>280){value.tabIndex=0;value.setAttribute('aria-label',row.label);}list.append(label,value);}
    this.castContent.replaceChildren(list,...cast.notes.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
  }
  const style=sharedStylePreparation(record.imagePromptMetadata?.sharedStyle),styleKey=JSON.stringify(style);
  if(styleKey!==this.styleKey){
    this.styleKey=styleKey;const list=document.createElement('dl');list.dataset.styleRows='';
    for(const row of style.rows){const label=document.createElement('dt'),value=document.createElement('dd');label.textContent=row.label;value.textContent=row.value;if(row.value.length>280){value.tabIndex=0;value.setAttribute('aria-label',row.label);}list.append(label,value);}
    this.styleContent.replaceChildren(list,...style.notes.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
  }
  for(const button of this.element.querySelectorAll<HTMLButtonElement>('[data-brief-link]'))button.disabled=!available[button.dataset.briefLink as BriefDestination];
 }
}
