import { TRACKER_MAPPING_FIELDS, TrackerMappingsSchema, normalizeTrackerMappings, type TrackerMappings } from '../../shared/tracker-mappings.js';
/** Explicit save keeps incomplete mobile field paths out of live settings. */
export class TrackerMappingsPanel {
 readonly host=document.createElement('details');
 private dirty=false;
 private config=normalizeTrackerMappings({});
 constructor(private save:(value:TrackerMappings)=>void) {
  this.host.dataset.trackerMappings='';
  const fields=[['identity','Appearance fields','custom.look, features.visual'],['attire','Clothing fields','custom.outfit'],['sceneState','Scene-state fields','custom.position, custom.condition'],['world','World fields','custom.environment']];
  this.host.innerHTML='<summary>Custom SimTracker fields</summary><small>Standard tracker fields work automatically. Add up to six dotted paths per row, separated by commas. Character paths start inside a character entry (including its stats); world paths start inside worldData. Only plain values are read.</small>'+fields.map(([key,label,hint])=>`<label>${label}<input type="text" data-mapping="${key}" placeholder="${hint}" maxlength="780" autocomplete="off" spellcheck="false"></label>`).join('')+'<small>Appearance and scene-state values supplement standard fields. Mapped clothing takes priority when found; otherwise standard clothing is used. Choose visible fields only; values may be included in future image planning. Existing prepared prompts stay unchanged.</small><div><button type="button" data-save-mappings>Save mappings</button><button type="button" data-reset-mappings>Use standard fields</button></div><p data-mapping-status role="status"></p>';
  this.host.addEventListener('input',e=>{e.stopPropagation();this.dirty=true;this.status('Unsaved mappings.');});
  this.host.addEventListener('change',e=>e.stopPropagation());
  this.host.querySelector<HTMLButtonElement>('[data-save-mappings]')!.onclick=()=>{
   const candidate=Object.fromEntries(TRACKER_MAPPING_FIELDS.map(field=>[field,this.input(field).value.split(/[,\n]/).map(p=>p.trim()).filter(Boolean)]));
   const result=TrackerMappingsSchema.safeParse(candidate);
   if(!result.success){this.status('Use up to six dotted field paths per row. Expressions, brackets and reserved properties are not supported.');return;}
   this.config=normalizeTrackerMappings(result.data);this.dirty=false;this.render();this.save(this.config);this.status('Mappings saved. Applies to future preparations when SimTracker visual context is enabled.');
  };
  this.host.querySelector<HTMLButtonElement>('[data-reset-mappings]')!.onclick=()=>{
   this.config=normalizeTrackerMappings({});this.dirty=false;this.render();this.save(this.config);this.status('Using standard tracker fields.');
  };
  this.render();
 }
 private input(field:string):HTMLInputElement{return this.host.querySelector<HTMLInputElement>(`[data-mapping="${field}"]`)!;}
 private status(value:string):void{this.host.querySelector<HTMLElement>('[data-mapping-status]')!.textContent=value;}
 private render():void{for(const field of TRACKER_MAPPING_FIELDS)this.input(field).value=this.config[field].join(', ');}
 setConfig(value:TrackerMappings):void{this.config=normalizeTrackerMappings(value);if(!this.dirty)this.render();}
 destroy():void{this.host.remove();}
}
