import {createUiId} from '../request-id.js';
import {LocationArtLibrarySchema,type LocationArtLibrary,type LocationArtAction} from '../../shared/stage-assets.js';

/** Explicit metadata management only. Image generation stays in the existing reviewer. */
export class LocationArtPanel {
 readonly host=document.createElement('fieldset');
 private library:LocationArtLibrary={version:1,locations:[]};
 private loadedChat='';private pending:{chatId:string,requestId:string}|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private selected='';private detail=false;private confirmation:{chatId:string,locationId:string,run:()=>void}|null=null;
 constructor(private chat:()=>string,private send:(chatId:string,requestId:string,action:LocationArtAction)=>void){
  this.host.dataset.locationArt='';
  this.host.innerHTML='<legend>Saved place art</legend><p>Reuse completed environment pictures on later visits. A match requires the same environment, template, style, model, connection and dimensions. This does not reuse portraits or manga pages.</p><button type="button" data-art-refresh>Load saved places</button><div data-art-catalog hidden><label>Place<select data-art-place aria-label="Saved place"></select></label><label>Variant<select data-art-variant aria-label="Saved place variant"></select></label><img data-art-preview alt="Saved environment picture" style="display:block;max-width:100%;max-height:180px;object-fit:contain;margin:12px auto"><p data-art-description></p><button type="button" data-art-select>Prefer this variant</button><button type="button" data-art-forget>Forget this variant</button><button type="button" data-art-forget-place>Forget this place</button><button type="button" data-art-reset>Reset library</button><small>Preferences apply only to compatible future preparations. Forgetting removes the library pointer; existing reader pictures and host images remain. To create replacement art, use Edit and regenerate in Image prompts. Edited prompts stay independent.</small></div><p data-art-status role="status"></p>';
  this.host.dataset.placeWorkspace='';
  this.el('legend').textContent='Places';this.host.querySelector('p')!.textContent='Saved environment pictures for this story. Browsing uses saved metadata and never generates images.';
  const search=document.createElement('label');search.innerHTML='Search places<input type="search" data-place-search aria-label="Search places" placeholder="Search saved places…">';this.host.insertBefore(search,this.el('[data-art-refresh]'));
  const list=document.createElement('div');list.dataset.placeList='';this.host.insertBefore(list,this.el('[data-art-catalog]'));
  const empty=document.createElement('p');empty.dataset.placeEmpty='';this.host.insertBefore(empty,this.el('[data-art-catalog]'));
  const back=document.createElement('button');back.type='button';back.textContent='‹ Places';back.dataset.placeBack='';back.onclick=()=>{this.detail=false;this.cancelConfirm();this.renderList();};this.el('[data-art-catalog]').prepend(back);
  const heading=document.createElement('h3');heading.dataset.placeTitle='';this.el('[data-art-catalog]').insertBefore(heading,this.el('[data-art-place]').closest('label'));
  this.el('[data-art-place]').closest('label')!.hidden=true;
  this.el('[data-art-refresh]').textContent='Reload list';this.el('[data-art-forget-place]').textContent='Remove place entry';this.el('[data-art-reset]').textContent='Reset place library';
  const menu=document.createElement('details');menu.innerHTML='<summary>More place actions</summary>';menu.append(this.el('[data-art-forget-place]'));this.el('[data-art-catalog]').append(menu);
  const listMenu=document.createElement('details');listMenu.innerHTML='<summary>More list actions</summary>';this.host.insertBefore(listMenu,list);listMenu.append(this.el('[data-art-refresh]'),this.el('[data-art-reset]'));
  const confirm=document.createElement('div');confirm.dataset.placeConfirm='';confirm.hidden=true;confirm.setAttribute('role','dialog');confirm.setAttribute('aria-label','Confirm place action');confirm.innerHTML='<p data-place-confirm-text></p><button type="button" data-place-confirm-yes>Confirm removal</button><button type="button" data-place-confirm-no>Stay</button>';this.host.append(confirm);
  this.el('[data-place-confirm-no]').onclick=()=>this.cancelConfirm();this.el('[data-place-confirm-yes]').onclick=()=>{const confirmation=this.confirmation;this.cancelConfirm();if(confirmation&&confirmation.chatId===this.chat()&&confirmation.chatId===this.loadedChat&&confirmation.locationId===this.selected)confirmation.run();else this.status('The story or place changed. Choose the action again.');};
  this.el<HTMLInputElement>('[data-place-search]').oninput=()=>this.renderList();
  const style=document.createElement('style');style.textContent=`[data-place-workspace]{min-inline-size:0!important;min-width:0!important;border:0!important;padding:0!important;color:var(--set-text,var(--vn-shell-text,inherit));font-size:1rem}[data-place-workspace] *{box-sizing:border-box}[data-place-workspace] [hidden]{display:none!important}[data-place-workspace] p,[data-place-workspace] small{overflow-wrap:anywhere;line-height:1.5}[data-place-workspace] small{color:var(--set-muted,var(--vn-shell-muted,inherit))}[data-place-workspace] legend{font-weight:700;font-size:1.2rem;color:var(--set-text,var(--vn-shell-text,inherit))}[data-place-workspace] label{display:block;margin:16px 0 8px;color:var(--set-text,var(--vn-shell-text,inherit))}[data-place-workspace] input,[data-place-workspace] select{display:block;width:100%;min-width:0;min-height:44px;font:inherit;color:var(--set-text,inherit);background:var(--set-field,var(--vn-shell-field,#101a1e));border:1px solid var(--set-border,var(--vn-shell-border,rgba(220,238,217,.16)));border-radius:8px;padding:10px}[data-place-workspace] button,[data-place-workspace] summary{min-height:44px!important;max-width:100%;font:inherit;white-space:normal!important;cursor:pointer;color:var(--set-text,inherit)}[data-place-workspace] button{padding:10px 12px;margin:4px;background:var(--set-hover,var(--vn-shell-button,#23342e));border:1px solid var(--set-border,var(--vn-shell-border,rgba(220,238,217,.16)));border-radius:8px}[data-place-workspace] summary{padding:8px 0;align-content:center;color:var(--set-text,inherit)}[data-place-row]{display:block;width:100%;text-align:left;background:transparent!important;color:var(--set-text,inherit)!important;border-bottom:1px solid var(--set-border,rgba(220,238,217,.16))!important}[data-place-row] strong{color:var(--set-text,inherit)!important}[data-place-row] small{display:block;color:var(--set-muted,var(--vn-shell-muted,inherit))!important}[data-place-confirm]{background:var(--set-surface,var(--vn-shell-panel,#182429));border:1px solid var(--set-accent,var(--vn-shell-accent,#b8a5e4));color:var(--set-text,inherit);border-radius:10px;padding:16px;margin-top:16px}[data-place-workspace] :focus-visible{outline:2px solid var(--set-accent,var(--vn-shell-accent,#b8a5e4));outline-offset:3px}`;this.host.append(style);
  this.el<HTMLButtonElement>('[data-art-refresh]').onclick=()=>this.request({action:'list'});
  this.el<HTMLSelectElement>('[data-art-place]').onchange=()=>{this.cancelConfirm();this.renderVariants();};
  this.el<HTMLSelectElement>('[data-art-variant]').onchange=()=>{this.cancelConfirm();this.renderPreview();};
  for(const [selector,action] of [['[data-art-select]','select'],['[data-art-forget]','forget'],['[data-art-forget-place]','forget']] as const)this.el<HTMLButtonElement>(selector).onclick=()=>{const value:LocationArtAction={action,locationId:this.el<HTMLSelectElement>('[data-art-place]').value,...(selector==='[data-art-forget-place]'?{}:{variantId:this.el<HTMLSelectElement>('[data-art-variant]').value})};if(action==='forget')this.confirm('Remove the selected saved place pointer? Historical reader pictures and host gallery images remain.',()=>this.request(value));else this.request(value);};
  this.el<HTMLButtonElement>('[data-art-reset]').onclick=()=>this.confirm('Reset this story’s entire saved place library? Historical reader pictures and host gallery images remain.',()=>this.request({action:'reset'}));
  for(const type of ['input','change','click'])this.host.addEventListener(type,e=>e.stopPropagation());
  this.renderList();
 }
 ensureLoaded():void{if(!this.pending&&this.loadedChat!==this.chat())this.request({action:'list'});}
 private cancelConfirm():void{this.confirmation=null;this.el('[data-place-confirm]').hidden=true;}
 private confirm(text:string,run:()=>void):void{this.confirmation={chatId:this.loadedChat,locationId:this.selected,run};this.el('[data-place-confirm-text]').textContent=text;this.el('[data-place-confirm]').hidden=false;this.el('[data-place-confirm]').scrollIntoView({block:'nearest'});this.el('[data-place-confirm-no]').focus();}
 private renderList():void{const search=this.el<HTMLInputElement>('[data-place-search]').value.trim().toLocaleLowerCase(),list=this.el('[data-place-list]');list.replaceChildren();for(const record of this.library.locations.filter(r=>r.name.toLocaleLowerCase().includes(search))){const button=document.createElement('button');button.type='button';button.dataset.placeRow='';button.setAttribute('aria-label',`Open ${record.name}`);const name=document.createElement('strong');name.textContent=record.name;const summary=document.createElement('small');summary.textContent=`${record.variants.length} saved variants${record.preferredVariantId?' · Preference saved':''} ›`;button.append(name,summary);button.onclick=()=>{this.selected=record.entityId;this.detail=true;this.cancelConfirm();this.el<HTMLSelectElement>('[data-art-place]').value=record.entityId;this.renderVariants();this.renderList();};list.append(button);}list.hidden=this.detail;this.el('[data-place-search]').closest('label')!.hidden=this.detail;this.el('[data-place-empty]').hidden=this.detail;this.el('[data-place-empty]').textContent=list.childElementCount?'':search?'No matching saved places.':'No saved place pictures yet. Completed environment-template pictures can appear here when compatible picture reuse is enabled in Images.';this.el('[data-art-catalog]').hidden=!this.detail;this.el('[data-place-title]').textContent=this.library.locations.find(r=>r.entityId===this.selected)?.name??'Saved place';}
 private el<T extends HTMLElement>(selector:string):T{return this.host.querySelector<T>(selector)!;}
 private status(text:string):void{this.el('[data-art-status]').textContent=text;}
 private busy(value:boolean):void{for(const e of this.host.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select'))e.disabled=value;}
 private request(action:LocationArtAction):void{
  const chatId=this.chat();if(!chatId){this.status('Open a chat to manage its place art.');return;}
  if(this.pending)return;
  this.cancelConfirm();
  if(action.action!=='list'&&this.loadedChat!==chatId){this.clear();this.status('Chat changed. Load its saved places first.');return;}
  const requestId=createUiId();this.pending={chatId,requestId};this.busy(true);this.status('Loading…');
  this.timer=setTimeout(()=>this.fail('No response yet. Try loading the library again.'),15000);
  try{this.send(chatId,requestId,action);}catch(error){this.fail(error instanceof Error?error.message:String(error));}
 }
 receive(chatId:string,requestId:string,value:LocationArtLibrary):void{
  if(!this.pending||chatId!==this.chat()||chatId!==this.pending.chatId||requestId!==this.pending.requestId)return;
  const parsed=LocationArtLibrarySchema.safeParse(value);if(!parsed.success){this.fail('Invalid library response. Saved data was preserved.');return;}
  this.finish();this.cancelConfirm();this.loadedChat=chatId;this.library=parsed.data;
  const picker=this.el<HTMLSelectElement>('[data-art-place]'),previous=picker.value;picker.replaceChildren();
  for(const r of this.library.locations){const option=document.createElement('option');option.value=r.entityId;option.textContent=`${r.name} (${r.variants.length})`;picker.append(option);}
  if(this.library.locations.some(r=>r.entityId===previous))picker.value=previous;
  if(this.selected&&!this.library.locations.some(r=>r.entityId===this.selected)){this.selected='';this.detail=false;}
  this.renderVariants();this.renderList();
  this.status(this.library.locations.length?`${this.library.locations.length} saved place(s). No generation requested.`:'No saved place art yet. Enable reuse and generate an environment-template picture to start.');
 }
 private renderVariants():void{
  const record=this.library.locations.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-art-place]').value);
  const picker=this.el<HTMLSelectElement>('[data-art-variant]');picker.replaceChildren();
  for(const [i,v] of (record?.variants??[]).entries()){const option=document.createElement('option');option.value=v.id;option.textContent=`Variant ${i+1} · ${v.createdAt.slice(0,16).replace('T',' ')}${record?.preferredVariantId===v.id?' · Preferred':''}`;picker.append(option);}
  if(record?.preferredVariantId)picker.value=record.preferredVariantId;this.renderPreview();
 }
 private renderPreview():void{
  const record=this.library.locations.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-art-place]').value),variant=record?.variants.find(v=>v.id===this.el<HTMLSelectElement>('[data-art-variant]').value);
  this.el('[data-art-description]').textContent=record?.description??'';const image=this.el<HTMLImageElement>('[data-art-preview]');
  image.hidden=!variant;if(variant){image.src=`/api/v1/images/${encodeURIComponent(variant.imageId)}`;image.onerror=()=>{image.hidden=true;this.status('Preview unavailable. Missing images are never reused automatically.');};}else image.removeAttribute('src');
 }
 private finish():void{if(this.timer)clearTimeout(this.timer);this.timer=null;this.pending=null;this.busy(false);}
 fail(error:string,requestId?:string):void{if(requestId&&requestId!==this.pending?.requestId)return;this.finish();this.status(error);}
 notice(error:string):void{this.status(`Picture completed, but place art was not saved: ${error}`);}
 clear():void{this.finish();this.cancelConfirm();this.loadedChat='';this.library={version:1,locations:[]};this.selected='';this.detail=false;this.el<HTMLInputElement>('[data-place-search]').value='';this.el('[data-art-catalog]').hidden=true;this.el<HTMLImageElement>('[data-art-preview]').removeAttribute('src');this.renderList();this.status('Load the current chat’s saved places.');}
 destroy():void{this.finish();this.host.remove();}
}
