import type {ImageRequestRecord} from '../../shared/image-review.js';
import {preparedBrief,promptEngineSummary,type BriefDraft,type PromptEngineSummary} from './prepared-brief.js';
import {castPreparation} from './cast-preparation.js';
import {sharedStylePreparation} from './shared-style-preparation.js';
export type BriefDestination='prompt'|'subject'|'template'|'output';
export const PREPARED_BRIEF_CSS=`
[data-prepared-brief]{margin:12px 0;border-top:1px solid var(--edge)}
[data-prepared-brief] p{font-size:12px;line-height:1.5;margin:8px 0}
:is([data-brief-rows],[data-cast-rows],[data-style-rows],[data-engine-rows]){display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px 12px;margin:12px 0;font-size:13px}
:is([data-brief-rows],[data-cast-rows],[data-style-rows],[data-engine-rows]) dt{color:var(--vn-shell-muted,#bbc);font-weight:500}
:is([data-brief-rows],[data-cast-rows],[data-style-rows],[data-engine-rows]) dd{margin:0;min-width:0;max-height:10em;overflow:auto;overflow-wrap:anywhere;white-space:pre-wrap}
:is([data-brief-rows],[data-cast-rows],[data-style-rows],[data-engine-rows]) dd:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[data-brief-links]{margin:12px 0}[data-brief-links] button{font-size:12px;flex:1 1 110px}
[data-engine-pill]{display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;border-radius:12px;background:rgba(220,235,173,0.15);color:var(--accent);margin-bottom:8px}
[data-engine-warning]{color:#ffaa88;font-size:12px;margin:4px 0}
[data-shadow-box]{margin:8px 0;padding:8px;border-radius:6px;background:var(--vn-shell-field,rgba(0,0,0,0.3));border:1px solid var(--edge)}
[data-shadow-box] textarea{width:100%;min-height:60px;font:12px monospace;background:transparent;border:none;color:inherit;resize:vertical}
`;
/** Read-only projection. Navigation never submits or changes a draft. */
export class PreparedBriefView{
 readonly element=document.createElement('details');
 private briefSummary=document.createElement('summary');
 private note=document.createElement('p');private rows=document.createElement('dl');private output=document.createElement('p');private compatibility=document.createElement('div');
 private rowsKey='';private compatibilityKey='';
 private castContent=document.createElement('div');private castKey='';
 private styleContent=document.createElement('div');private styleKey='';
 private engineDetails=document.createElement('details');private engineContent=document.createElement('div');private engineKey='';
 constructor(private navigate:(destination:BriefDestination)=>void){
  this.element.dataset.preparedBrief='';
  this.briefSummary.textContent='Prepared picture brief';
  this.note.dataset.briefNote='';this.note.setAttribute('role','status');this.rows.dataset.briefRows='';this.output.dataset.briefOutput='';
  const links=document.createElement('div');links.className='row';links.dataset.briefLinks='';
  for(const [destination,label] of [['prompt','Edit wording'],['subject','Correct subject'],['template','Template'],['output','Output settings']] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.briefLink=destination;button.onclick=()=>this.navigate(destination);links.append(button);}
  
  this.engineDetails.dataset.engineDetails='';
  const engineTitle=document.createElement('summary');engineTitle.textContent='Prompt Engine v2 & Model Dialect';
  this.engineDetails.append(engineTitle,this.engineContent);

  const capabilities=document.createElement('details');const title=document.createElement('summary');title.textContent='Why these model settings?';capabilities.append(title,this.compatibility);
  const cast=document.createElement('details'),castTitle=document.createElement('summary');cast.dataset.castPreparation='';castTitle.textContent='Appearance & prompt sources';cast.append(castTitle,this.castContent);
  const style=document.createElement('details'),styleTitle=document.createElement('summary');style.dataset.stylePreparation='';styleTitle.textContent='Shared style at preparation';style.append(styleTitle,this.styleContent);
  this.element.append(this.briefSummary,this.note,this.rows,this.engineDetails,cast,style,this.output,links,capabilities);
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

  // Prompt Engine v2 Summary Card
  const summary=promptEngineSummary(record,draft);
  this.briefSummary.textContent = summary ? `Prepared picture brief [Engine: ${summary.version===2?'V2':'V1'} · ${summary.dialect}]` : 'Prepared picture brief';
  const engineKey=JSON.stringify(summary);
  if(engineKey!==this.engineKey){
    this.engineKey=engineKey;
    if(!summary){
      this.engineDetails.hidden=true;
    }else{
      this.engineDetails.hidden=false;
      const container=document.createElement('div');
      const badge=document.createElement('div');
      badge.dataset.enginePill='';
      badge.textContent=`Engine: ${summary.version===2?'V2 Model-Aware':'V1 Legacy'} · ${summary.dialect}`;
      container.append(badge);

      const list=document.createElement('dl');
      list.dataset.engineRows='';
      const fields:Array<[string,string]>=[
        ['Model', summary.model],
        ['Dialect', summary.dialect],
        ['Output', summary.output],
        ['Shot size', summary.shot.size],
        ['Camera angle', summary.shot.angle],
        ['Lens feel', summary.shot.lens],
        ['Composition', `${summary.shot.composition} (${summary.shot.source})`],
        ['Depth of field', summary.shot.depth],
        ['Safe area', summary.shot.dialogueSafeArea],
        ['Style', summary.style],
        ['Prompt budget', `${summary.prompt.characters.toLocaleString()} chars (useful: ${summary.prompt.softRange}, max: ${summary.prompt.hardLimit.toLocaleString()})`],
        ['Negative mode', summary.negativePolicy],
        ...(summary.promptExpansion ? [['Expansion', summary.promptExpansion] as [string,string]] : []),
        ['References', summary.references]
      ];

      for(const [label,value] of fields){
        const dt=document.createElement('dt');dt.textContent=label;
        const dd=document.createElement('dd');dd.textContent=value;
        list.append(dt,dd);
      }
      container.append(list);

      if(summary.warnings.length>0){
        const warnSection=document.createElement('div');
        warnSection.dataset.engineWarnings='';
        for(const warn of summary.warnings){
          const p=document.createElement('p');
          p.dataset.engineWarning='';
          p.textContent=`⚠ ${warn}`;
          warnSection.append(p);
        }
        container.append(warnSection);
      }

      if(summary.shadowPrompt){
        const shadowDetails=document.createElement('details');
        shadowDetails.dataset.shadowCompare='';
        const shadowSummary=document.createElement('summary');
        shadowSummary.textContent='Shadow comparison: V1 vs V2';
        const shadowBox=document.createElement('div');
        shadowBox.dataset.shadowBox='';
        shadowBox.innerHTML=`
          <small>V1 Template Prompt:</small>
          <textarea readonly data-shadow-v1></textarea>
          ${summary.shadowPrompt.v2Prompt ? '<small style="margin-top:8px;display:block">V2 Compiled Prompt:</small><textarea readonly data-shadow-v2></textarea>' : ''}
          <div class="row" style="margin-top:6px">
            <button type="button" data-copy-v1>Copy V1</button>
            ${summary.shadowPrompt.v2Prompt ? '<button type="button" data-copy-v2>Copy V2</button>' : ''}
          </div>
        `;
        const v1Area=shadowBox.querySelector<HTMLTextAreaElement>('[data-shadow-v1]')!;
        v1Area.value=summary.shadowPrompt.v1Prompt;
        shadowBox.querySelector<HTMLButtonElement>('[data-copy-v1]')!.onclick=()=>navigator.clipboard.writeText(summary.shadowPrompt!.v1Prompt);
        if(summary.shadowPrompt.v2Prompt){
          const v2Area=shadowBox.querySelector<HTMLTextAreaElement>('[data-shadow-v2]')!;
          v2Area.value=summary.shadowPrompt.v2Prompt;
          shadowBox.querySelector<HTMLButtonElement>('[data-copy-v2]')!.onclick=()=>navigator.clipboard.writeText(summary.shadowPrompt!.v2Prompt!);
        }
        shadowDetails.append(shadowSummary,shadowBox);
        container.append(shadowDetails);
      }

      this.engineContent.replaceChildren(container);
    }
  }

  for(const button of this.element.querySelectorAll<HTMLButtonElement>('[data-brief-link]'))button.disabled=!available[button.dataset.briefLink as BriefDestination];
 }
}
