import {CastArtLibrarySchema,type CastArtLibrary,type CastArtAction,CastGallerySchema,type CastGallery} from '../../shared/cast-art.js';

/** Explicit metadata management only. Image generation stays in the existing reviewer. */
export class CastArtPanel {
 readonly host=document.createElement('fieldset');
 private library:CastArtLibrary={version:1,characters:[]};
 private galleryOffset=0;
 private loadedChat='';private pending:{chatId:string,requestId:string}|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 constructor(private chat:()=>string,private send:(chatId:string,requestId:string,action:CastArtAction)=>void,private gallery:(chatId:string,requestId:string,offset:number)=>void){
  this.host.dataset.castArt='';
  this.host.innerHTML='<legend>Saved portrait art</legend><p>Reuse completed portrait-template pictures across turns. A match requires the same appearance, outfit, scene, template, style, model, connection and dimensions. Action images and manga pages stay independent. Reference-based generation keeps its existing path.</p><button type="button" data-cast-art-refresh>Load saved characters</button><div data-cast-art-catalog hidden><label>Character<select data-cast-art-character aria-label="Saved character"></select></label><label>Variant<select data-cast-art-variant aria-label="Saved character variant"></select></label><img data-cast-art-preview alt="Saved character portrait" style="display:block;max-width:100%;max-height:180px;object-fit:contain;margin:12px auto"><p data-cast-art-description></p><p>For a saved appearance, you can choose a still image from your Lumiverse gallery. It appears only in Cast view for this appearance and outfit; it does not change image prompts or create images.</p><button type="button" data-cast-art-gallery>Choose gallery artwork</button><button type="button" data-cast-art-restore>Use generated portrait</button><div data-cast-art-gallery-panel hidden><div data-cast-art-gallery-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><button type="button" data-cast-art-gallery-prev>Previous images</button><button type="button" data-cast-art-gallery-next>More images</button></div><button type="button" data-cast-art-select>Prefer this variant</button><button type="button" data-cast-art-forget>Forget this variant</button><button type="button" data-cast-art-forget-character>Forget this character</button><button type="button" data-cast-art-reset>Reset library</button><small>Preferences apply only to compatible future preparations. Forgetting removes the library pointer; existing reader pictures and host images remain. To create replacement art, use Edit and regenerate in Image prompts. Edited prompts stay independent.</small></div><p data-cast-art-status role="status"></p>';
  this.el<HTMLButtonElement>('[data-cast-art-refresh]').onclick=()=>this.request({action:'list'});
  this.el<HTMLSelectElement>('[data-cast-art-character]').onchange=()=>this.renderVariants();
  this.el<HTMLSelectElement>('[data-cast-art-variant]').onchange=()=>this.renderPreview();
  for(const [selector,action] of [['[data-cast-art-select]','select'],['[data-cast-art-forget]','forget'],['[data-cast-art-forget-character]','forget']] as const)this.el<HTMLButtonElement>(selector).onclick=()=>this.request({action,characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,...(selector==='[data-cast-art-forget-character]'?{}:{variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value})});
  this.el<HTMLButtonElement>('[data-cast-art-reset]').onclick=()=>this.request({action:'reset'});
  this.el<HTMLButtonElement>('[data-cast-art-gallery]').onclick=()=>this.requestGallery(0);
  this.el<HTMLButtonElement>('[data-cast-art-gallery-prev]').onclick=()=>this.requestGallery(Math.max(0,this.galleryOffset-12));
  this.el<HTMLButtonElement>('[data-cast-art-gallery-next]').onclick=()=>this.requestGallery(this.galleryOffset+12);
  this.el<HTMLButtonElement>('[data-cast-art-restore]').onclick=()=>this.request({action:'restore',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value});
  for(const type of ['input','change','click'])this.host.addEventListener(type,e=>e.stopPropagation());
 }
 private el<T extends HTMLElement>(selector:string):T{return this.host.querySelector<T>(selector)!;}
 private status(text:string):void{this.el('[data-cast-art-status]').textContent=text;}
 private busy(value:boolean):void{for(const e of this.host.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select'))e.disabled=value;}
 private request(action:CastArtAction):void{
  const chatId=this.chat();if(!chatId){this.status('Open a chat to manage its portrait art.');return;}
  if(this.pending)return;
  if(action.action!=='list'&&this.loadedChat!==chatId){this.clear();this.status('Chat changed. Load its saved characters first.');return;}
  const requestId=crypto.randomUUID();this.pending={chatId,requestId};this.busy(true);this.status('Loading…');
  this.timer=setTimeout(()=>this.fail('No response yet. Try loading the library again.'),15000);
  try{this.send(chatId,requestId,action);}catch(error){this.fail(error instanceof Error?error.message:String(error));}
 }
 receive(chatId:string,requestId:string,value:CastArtLibrary):boolean{
  if(!this.pending||chatId!==this.chat()||chatId!==this.pending.chatId||requestId!==this.pending.requestId)return false;
  const parsed=CastArtLibrarySchema.safeParse(value);if(!parsed.success){this.fail('Invalid library response. Saved data was preserved.');return false;}
  this.finish();this.loadedChat=chatId;this.library=parsed.data;
  const picker=this.el<HTMLSelectElement>('[data-cast-art-character]'),previous=picker.value;picker.replaceChildren();
  for(const r of this.library.characters){const option=document.createElement('option');option.value=r.entityId;option.textContent=`${r.name} (${r.variants.length})`;picker.append(option);}
  if(this.library.characters.some(r=>r.entityId===previous))picker.value=previous;
  this.el('[data-cast-art-catalog]').hidden=!this.library.characters.length;this.renderVariants();
  this.status(this.library.characters.length?`${this.library.characters.length} saved character(s). No generation requested.`:'No saved portrait art yet. Enable reuse and generate a portrait-template picture to start.');return true;
 }
 private renderVariants():void{
  const record=this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value);
  const picker=this.el<HTMLSelectElement>('[data-cast-art-variant]');picker.replaceChildren();
  for(const [i,v] of (record?.variants??[]).entries()){const option=document.createElement('option');option.value=v.id;option.textContent=`Variant ${i+1} · ${v.createdAt.slice(0,16).replace('T',' ')}${record?.preferredVariantId===v.id?' · Preferred':''}`;picker.append(option);}
  if(record?.preferredVariantId)picker.value=record.preferredVariantId;this.renderPreview();
 }
 private renderPreview():void{
  this.el("[data-cast-art-gallery-panel]").hidden=true;
  const record=this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value),variant=record?.variants.find(v=>v.id===this.el<HTMLSelectElement>('[data-cast-art-variant]').value);
  this.el('[data-cast-art-description]').textContent=variant?.description??record?.description??'';const image=this.el<HTMLImageElement>('[data-cast-art-preview]');
  this.el<HTMLButtonElement>('[data-cast-art-restore]').disabled=!variant?.displayImageId;
  image.hidden=!variant;if(variant){image.src=`/api/v1/images/${encodeURIComponent(variant.displayImageId??variant.imageId)}`;image.onerror=()=>{image.hidden=true;this.status('Preview unavailable. Missing images are never reused automatically.');};}else image.removeAttribute('src');
 }
 private requestGallery(offset:number):void{
  const chatId=this.chat();if(this.pending)return;
  if(!chatId||this.loadedChat!==chatId){this.clear();this.status('Load this chat’s saved characters first.');return;}
  const requestId=crypto.randomUUID();this.pending={chatId,requestId};this.busy(true);this.status('Loading gallery…');
  this.timer=setTimeout(()=>this.fail('No gallery response yet. Try again.'),15000);
  try{this.gallery(chatId,requestId,offset);}catch(e){this.fail(String(e));}
 }
 receiveGallery(chatId:string,requestId:string,value:CastGallery):void{
  if(!this.pending||chatId!==this.chat()||chatId!==this.pending.chatId||requestId!==this.pending.requestId)return;
  const parsed=CastGallerySchema.safeParse(value);if(!parsed.success){this.fail('Invalid gallery response.');return;}
  this.finish();const page=parsed.data;this.galleryOffset=page.offset;
  const grid=this.el('[data-cast-art-gallery-grid]');grid.replaceChildren();
  for(const item of page.images){
   const button=document.createElement('button');button.type='button';button.style.cssText='min-width:0;min-height:44px;display:grid;gap:4px;overflow:hidden';button.setAttribute('aria-label',`Use ${item.name||'gallery image'}`);
   const image=document.createElement('img');image.src=item.url;image.alt='';image.loading='lazy';image.style.cssText='width:100%;height:96px;object-fit:contain';image.onerror=()=>image.hidden=true;
   const name=document.createElement('span');name.textContent=item.name||'Gallery image';name.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap';button.append(image,name);
   button.onclick=()=>this.request({action:'supply',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value,imageId:item.id});grid.append(button);
  }
  this.el('[data-cast-art-gallery-panel]').hidden=false;
  this.el<HTMLButtonElement>('[data-cast-art-gallery-prev]').disabled=page.offset===0;
  this.el<HTMLButtonElement>('[data-cast-art-gallery-next]').disabled=page.offset+12>=page.total||page.offset+12>10000;
  this.status(page.images.length?'Select artwork for the currently selected appearance.':'No supported still images on this page. Upload PNG, JPEG, WebP or AVIF in Lumiverse’s gallery, or browse another page.');
 }
 private finish():void{if(this.timer)clearTimeout(this.timer);this.timer=null;this.pending=null;this.busy(false);}
 fail(error:string,requestId?:string):void{if(requestId&&requestId!==this.pending?.requestId)return;this.finish();this.status(error);}
 notice(error:string):void{this.status(`Picture completed, but portrait art was not saved: ${error}`);}
 clear():void{this.finish();this.loadedChat='';this.library={version:1,characters:[]};this.el('[data-cast-art-gallery-panel]').hidden=true;this.el('[data-cast-art-gallery-grid]').replaceChildren();this.el('[data-cast-art-catalog]').hidden=true;this.el<HTMLImageElement>('[data-cast-art-preview]').removeAttribute('src');this.status('Load the current chat’s saved characters.');}
 destroy():void{this.finish();this.host.remove();}
}
