import {LocationArtLibrarySchema,type LocationArtLibrary,type LocationArtAction} from '../../shared/stage-assets.js';

/** Explicit metadata management only. Image generation stays in the existing reviewer. */
export class LocationArtPanel {
 readonly host=document.createElement('fieldset');
 private library:LocationArtLibrary={version:1,locations:[]};
 private loadedChat='';private pending:{chatId:string,requestId:string}|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 constructor(private chat:()=>string,private send:(chatId:string,requestId:string,action:LocationArtAction)=>void){
  this.host.dataset.locationArt='';
  this.host.innerHTML='<legend>Saved place art</legend><p>Reuse completed environment pictures on later visits. A match requires the same environment, template, style, model, connection and dimensions. This does not reuse portraits or manga pages.</p><button type="button" data-art-refresh>Load saved places</button><div data-art-catalog hidden><label>Place<select data-art-place aria-label="Saved place"></select></label><label>Variant<select data-art-variant aria-label="Saved place variant"></select></label><img data-art-preview alt="Saved environment picture" style="display:block;max-width:100%;max-height:180px;object-fit:contain;margin:12px auto"><p data-art-description></p><button type="button" data-art-select>Prefer this variant</button><button type="button" data-art-forget>Forget this variant</button><button type="button" data-art-forget-place>Forget this place</button><button type="button" data-art-reset>Reset library</button><small>Preferences apply only to compatible future preparations. Forgetting removes the library pointer; existing reader pictures and host images remain. To create replacement art, use Edit and regenerate in Image prompts. Edited prompts stay independent.</small></div><p data-art-status role="status"></p>';
  this.el<HTMLButtonElement>('[data-art-refresh]').onclick=()=>this.request({action:'list'});
  this.el<HTMLSelectElement>('[data-art-place]').onchange=()=>this.renderVariants();
  this.el<HTMLSelectElement>('[data-art-variant]').onchange=()=>this.renderPreview();
  for(const [selector,action] of [['[data-art-select]','select'],['[data-art-forget]','forget'],['[data-art-forget-place]','forget']] as const)this.el<HTMLButtonElement>(selector).onclick=()=>this.request({action,locationId:this.el<HTMLSelectElement>('[data-art-place]').value,...(selector==='[data-art-forget-place]'?{}:{variantId:this.el<HTMLSelectElement>('[data-art-variant]').value})});
  this.el<HTMLButtonElement>('[data-art-reset]').onclick=()=>this.request({action:'reset'});
  for(const type of ['input','change','click'])this.host.addEventListener(type,e=>e.stopPropagation());
 }
 private el<T extends HTMLElement>(selector:string):T{return this.host.querySelector<T>(selector)!;}
 private status(text:string):void{this.el('[data-art-status]').textContent=text;}
 private busy(value:boolean):void{for(const e of this.host.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select'))e.disabled=value;}
 private request(action:LocationArtAction):void{
  const chatId=this.chat();if(!chatId){this.status('Open a chat to manage its place art.');return;}
  if(this.pending)return;
  if(action.action!=='list'&&this.loadedChat!==chatId){this.clear();this.status('Chat changed. Load its saved places first.');return;}
  const requestId=crypto.randomUUID();this.pending={chatId,requestId};this.busy(true);this.status('Loading…');
  this.timer=setTimeout(()=>this.fail('No response yet. Try loading the library again.'),15000);
  try{this.send(chatId,requestId,action);}catch(error){this.fail(error instanceof Error?error.message:String(error));}
 }
 receive(chatId:string,requestId:string,value:LocationArtLibrary):void{
  if(!this.pending||chatId!==this.chat()||chatId!==this.pending.chatId||requestId!==this.pending.requestId)return;
  const parsed=LocationArtLibrarySchema.safeParse(value);if(!parsed.success){this.fail('Invalid library response. Saved data was preserved.');return;}
  this.finish();this.loadedChat=chatId;this.library=parsed.data;
  const picker=this.el<HTMLSelectElement>('[data-art-place]'),previous=picker.value;picker.replaceChildren();
  for(const r of this.library.locations){const option=document.createElement('option');option.value=r.entityId;option.textContent=`${r.name} (${r.variants.length})`;picker.append(option);}
  if(this.library.locations.some(r=>r.entityId===previous))picker.value=previous;
  this.el('[data-art-catalog]').hidden=!this.library.locations.length;this.renderVariants();
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
 fail(error:string):void{this.finish();this.status(error);}
 notice(error:string):void{this.status(`Picture completed, but place art was not saved: ${error}`);}
 clear():void{this.finish();this.loadedChat='';this.library={version:1,locations:[]};this.el('[data-art-catalog]').hidden=true;this.el<HTMLImageElement>('[data-art-preview]').removeAttribute('src');this.status('Load the current chat’s saved places.');}
 destroy():void{this.finish();this.host.remove();}
}
