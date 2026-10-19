import {normalizeTooltipPreferences,type TooltipPreferences} from '../../shared/dossiers.js';
import {REFERENCE_FIELD_GROUPS} from '../../shared/reference-fields.js';
export class TooltipSettingsPanel {
 readonly host=document.createElement('fieldset');private prefs=normalizeTooltipPreferences({});
 constructor(private save:(prefs:TooltipPreferences)=>void){
  this.host.dataset.tooltipSettings='';
  this.host.innerHTML='<legend>Tooltips</legend><label data-check><input type="checkbox" data-tooltip="enabled"><span>Enable story tooltips<small>Use highlighted names or the reference menu to see established information. New replies prepare references in the existing story-reader call; opening cards is local.</small></span></label><div data-tooltip-options><label data-check><input type="checkbox" data-tooltip="actionsEnabled"><span>Action drafts<small>Prepare editable intentions from a reference card. Uses your normal reply box; never sends automatically.</small></span></label><label data-check><input type="checkbox" data-tooltip="npcs"><span>NPCs</span></label><label data-check><input type="checkbox" data-tooltip="locations"><span>Locations</span></label><label data-check><input type="checkbox" data-tooltip="objects"><span>Items / objects</span></label><label>Detail<select data-tooltip="detail"><option value="brief">Brief</option><option value="standard">Standard</option><option value="expanded">Expanded</option></select></label><label>Reference display<select data-tooltip="linking"><option value="menu-only">Menu only — plain story text</option><option value="important">First mention per reply</option><option value="all-known">Known mentions in each paragraph</option></select></label><label>Links per paragraph<input data-tooltip="maxLinksPerParagraph" type="number" min="1" max="6" step="1"></label><small>At most 24 links per reply. Categories and detail update locally. Missing or ambiguous names are left plain; renamed or ambiguous phrases remain plain. The open-book control opens available scene references.</small><button type="button" data-reset-tooltip-overrides>Reset pins, hidden references and notes</button></div>';
  const groups=document.createElement('details'),summary=document.createElement('summary'),help=document.createElement('small');groups.dataset.more='';summary.textContent='Information shown in reference cards';help.textContent='Choose the kinds of established information to display. Empty sections are omitted. These controls update locally.';groups.append(summary,help);
  for(const group of REFERENCE_FIELD_GROUPS){const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');label.dataset.check='';input.type='checkbox';input.dataset.tooltipGroup=group.id;text.textContent=group.label;label.append(input,text);groups.append(label);}
  this.host.querySelector('[data-tooltip-options]')!.insertBefore(groups,this.host.querySelector('[data-reset-tooltip-overrides]'));
  const remember=document.createElement('label');remember.dataset.check='';remember.innerHTML='<input type="checkbox" data-tooltip="rememberReferences"><span>Remember earlier references<small>Keep verified earlier descriptions with their source replies. Older saved replies and histories with dynamic scene macros may not qualify. Current state stays separate.</small></span>';this.host.querySelector('[data-tooltip-options]')!.prepend(remember);
  this.host.addEventListener('input',e=>e.stopPropagation());
  this.host.addEventListener('change',event=>{
   event.stopPropagation();const target=event.target as HTMLInputElement|HTMLSelectElement;const field=target.dataset.tooltip,group=target.dataset.tooltipGroup;if(!field&&!group)return;
   const candidate={...this.prefs,categories:{...this.prefs.categories},fieldGroups:{...this.prefs.fieldGroups}};
   if(group)candidate.fieldGroups[group]=(target as HTMLInputElement).checked;
   else if(field==='rememberReferences')candidate.rememberReferences=(target as HTMLInputElement).checked;
   else if(field==='actionsEnabled')candidate.actionsEnabled=(target as HTMLInputElement).checked;
   else if(field==='enabled')candidate.enabled=(target as HTMLInputElement).checked;
   else if(field==='npcs'||field==='locations'||field==='objects')candidate.categories[field]=(target as HTMLInputElement).checked;
   else if(field)Object.assign(candidate,{[field]:field==='maxLinksPerParagraph'?Number(target.value):target.value});
   this.prefs=normalizeTooltipPreferences(candidate);this.render();this.save(this.prefs);
  });
  this.host.querySelector<HTMLButtonElement>('[data-reset-tooltip-overrides]')!.onclick=()=>{this.prefs={...this.prefs,overrides:[]};this.save(this.prefs);};this.render();
 }
 setConfig(prefs:TooltipPreferences):void{this.prefs=normalizeTooltipPreferences(prefs);this.render();}
 private render():void{
  for(const key of ['enabled','actionsEnabled','npcs','locations','objects'] as const)this.host.querySelector<HTMLInputElement>(`[data-tooltip="${key}"]`)!.checked=key==='enabled'?this.prefs.enabled:key==='actionsEnabled'?this.prefs.actionsEnabled:this.prefs.categories[key];
  this.host.querySelector<HTMLInputElement>('[data-tooltip="rememberReferences"]')!.checked=this.prefs.rememberReferences;
  for(const key of ['detail','linking','maxLinksPerParagraph'] as const)this.host.querySelector<HTMLInputElement>(`[data-tooltip="${key}"]`)!.value=String(this.prefs[key]);
  for(const group of REFERENCE_FIELD_GROUPS)this.host.querySelector<HTMLInputElement>(`[data-tooltip-group="${group.id}"]`)!.checked=this.prefs.fieldGroups[group.id]!==false;
  this.host.querySelector<HTMLInputElement>('[data-tooltip="maxLinksPerParagraph"]')!.disabled=this.prefs.linking==='menu-only';
  this.host.querySelector<HTMLElement>('[data-tooltip-options]')!.hidden=!this.prefs.enabled;
 }
 destroy():void{this.host.remove();}
}
