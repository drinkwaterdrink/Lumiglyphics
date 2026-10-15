import {normalizeTooltipPreferences,type TooltipPreferences} from '../../shared/dossiers.js';
export class TooltipSettingsPanel {
 readonly host=document.createElement('fieldset');private prefs=normalizeTooltipPreferences({});
 constructor(private save:(prefs:TooltipPreferences)=>void){
  this.host.dataset.tooltipSettings='';
  this.host.innerHTML='<legend>Tooltips</legend><label data-check><input type="checkbox" data-tooltip="enabled"><span>Enable story tooltips<small>Use highlighted names or the reference menu to see established information. New replies prepare references in the existing story-reader call; opening cards is local.</small></span></label><div data-tooltip-options><label data-check><input type="checkbox" data-tooltip="npcs"><span>NPCs</span></label><label data-check><input type="checkbox" data-tooltip="locations"><span>Locations</span></label><label data-check><input type="checkbox" data-tooltip="objects"><span>Items / objects</span></label><label>Detail<select data-tooltip="detail"><option value="brief">Brief</option><option value="standard">Standard</option><option value="expanded">Expanded</option></select></label><label>Reference display<select data-tooltip="linking"><option value="menu-only">Menu only — plain story text</option><option value="important">First mention per reply</option><option value="all-known">Known mentions in each paragraph</option></select></label><label>Links per paragraph<input data-tooltip="maxLinksPerParagraph" type="number" min="1" max="6" step="1"></label><small>At most 24 links per reply. Categories and detail update locally. Missing or ambiguous names are left plain; renamed or ambiguous phrases remain plain. The open-book control opens available scene references.</small><button type="button" data-reset-tooltip-overrides>Reset pins, hidden references and notes</button></div>';
  this.host.addEventListener('input',e=>e.stopPropagation());
  this.host.addEventListener('change',event=>{
   event.stopPropagation();const target=event.target as HTMLInputElement|HTMLSelectElement;const field=target.dataset.tooltip;if(!field)return;
   const candidate={...this.prefs,categories:{...this.prefs.categories}};
   if(field==='enabled')candidate.enabled=(target as HTMLInputElement).checked;
   else if(field==='npcs'||field==='locations'||field==='objects')candidate.categories[field]=(target as HTMLInputElement).checked;
   else Object.assign(candidate,{[field]:field==='maxLinksPerParagraph'?Number(target.value):target.value});
   this.prefs=normalizeTooltipPreferences(candidate);this.render();this.save(this.prefs);
  });
  this.host.querySelector<HTMLButtonElement>('[data-reset-tooltip-overrides]')!.onclick=()=>{this.prefs={...this.prefs,overrides:[]};this.save(this.prefs);};this.render();
 }
 setConfig(prefs:TooltipPreferences):void{this.prefs=normalizeTooltipPreferences(prefs);this.render();}
 private render():void{
  for(const key of ['enabled','npcs','locations','objects'] as const)this.host.querySelector<HTMLInputElement>(`[data-tooltip="${key}"]`)!.checked=key==='enabled'?this.prefs.enabled:this.prefs.categories[key];
  for(const key of ['detail','linking','maxLinksPerParagraph'] as const)this.host.querySelector<HTMLInputElement>(`[data-tooltip="${key}"]`)!.value=String(this.prefs[key]);
  this.host.querySelector<HTMLInputElement>('[data-tooltip="maxLinksPerParagraph"]')!.disabled=this.prefs.linking==='menu-only';
  this.host.querySelector<HTMLElement>('[data-tooltip-options]')!.hidden=!this.prefs.enabled;
 }
 destroy():void{this.host.remove();}
}
