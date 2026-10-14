import {CastArtLibrarySchema,CastSetupInputSchema,type CastSetupInput,type CastArtLibrary,type CastArtAction,CastGallerySchema,type CastGallery} from '../../shared/cast-art.js';

/** Explicit metadata management only. Image generation stays in the existing reviewer. */
export class CastArtPanel {
 readonly host=document.createElement('fieldset');
 private library:CastArtLibrary={version:1,characters:[]};
 private galleryOffset=0;
 private loadedChat='';private pending:{chatId:string,requestId:string}|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private draft:CastSetupInput|null=null;private newCharacter=false;private newAfterLoad=false;private savedName='';
 private artworkTarget:{characterId:string,outfitId?:string,snapshot:string}|null=null;
 private renderedCharacter='';
 constructor(private chat:()=>string,private send:(chatId:string,requestId:string,action:CastArtAction)=>void,private gallery:(chatId:string,requestId:string,offset:number)=>void,private voice:(name:string)=>void=()=>{}){
  this.host.dataset.castArt='';
  this.host.innerHTML='<legend>Saved portrait art</legend><p>Reuse completed portrait-template pictures across turns. A match requires the same appearance, outfit, scene, template, style, model, connection and dimensions. Action images and manga pages stay independent. Reference-based generation keeps its existing path.</p><button type="button" data-cast-art-refresh>Load saved characters</button><div data-cast-art-catalog hidden><label>Character<select data-cast-art-character aria-label="Saved character"></select></label><label>Variant<select data-cast-art-variant aria-label="Saved character variant"></select></label><img data-cast-art-preview alt="Saved character portrait" style="display:block;max-width:100%;max-height:180px;object-fit:contain;margin:12px auto"><p data-cast-art-description></p><p>For a saved appearance, you can choose a still image from your Lumiverse gallery. It appears only in Cast view for this appearance and outfit; it does not change image prompts or create images.</p><button type="button" data-cast-art-gallery>Choose gallery artwork</button><button type="button" data-cast-art-restore>Use generated portrait</button><div data-cast-art-gallery-panel hidden><div data-cast-art-gallery-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><button type="button" data-cast-art-gallery-prev>Previous images</button><button type="button" data-cast-art-gallery-next>More images</button></div><button type="button" data-cast-art-select>Prefer this variant</button><button type="button" data-cast-art-forget>Forget this variant</button><button type="button" data-cast-art-forget-character>Forget this character</button><button type="button" data-cast-art-reset>Reset library</button><small>Preferences apply only to compatible future preparations. Forgetting removes the library pointer; existing reader pictures and host images remain. To create replacement art, use Edit and regenerate in Image prompts. Edited prompts stay independent.</small></div><p data-cast-art-status role="status"></p>';
  this.el<HTMLElement>('legend').textContent='Cast setup and portraits';
  this.host.querySelector('p')!.textContent='Register actual characters for this chat, even before any portrait is generated. Setup supplies future appearance guidance; it does not put a character into the story or generate pictures.';
  const add=document.createElement('button');add.type='button';add.dataset.castSetupNew='';add.textContent='Add character';this.host.insertBefore(add,this.el('[data-cast-art-catalog]'));
  const editor=document.createElement('details');editor.dataset.castSetup='';
  editor.innerHTML='<summary>Character setup</summary><label>Name<input data-cast-setup-name aria-label="Cast character name" maxlength="160"></label><small>Existing names identify the character. Use aliases for other names.</small><label>Aliases — one per line<textarea data-cast-setup-aliases aria-label="Cast aliases" maxlength="2600" rows="2"></textarea></label><label>Base appearance<textarea data-cast-setup-appearance aria-label="Cast base appearance" maxlength="2000" rows="4" placeholder="Concrete visual details: species, build, hair or fur, eyes, distinguishing features…"></textarea></label><label>Outfit to edit<select data-cast-setup-outfit aria-label="Cast outfit"><option value="">Base appearance / no outfit</option></select></label><div data-cast-setup-outfit-fields hidden><label>Outfit name<input data-cast-setup-outfit-name aria-label="Cast outfit name" maxlength="100"></label><label>Clothing description<textarea data-cast-setup-outfit-description aria-label="Cast clothing description" maxlength="1000" rows="2"></textarea></label><button type="button" data-cast-setup-outfit-remove>Remove outfit</button></div><button type="button" data-cast-setup-outfit-add>Add outfit</button><label>Default outfit guidance<select data-cast-setup-default aria-label="Default cast outfit"></select></label><small>Story clothing can override this guidance. Seven named outfits plus base artwork are supported. Generated portrait variants keep their separate existing limit.</small><button type="button" data-cast-setup-save>Save cast setup</button><button type="button" data-cast-setup-clear>Remove setup guidance</button><hr><img data-cast-setup-preview alt="Supplied cast artwork" hidden style="max-width:100%;max-height:180px;object-fit:contain;display:block;margin:12px auto"><p data-cast-setup-art-help></p><button type="button" data-cast-setup-art>Choose setup artwork</button><button type="button" data-cast-setup-art-clear>Clear setup artwork</button><button type="button" data-cast-setup-voice>Configure voice</button><small>Artwork is display-only in Cast view when a matching portrait cue is present. It is not sent to the image model. Appearance/outfit edits require reassigning artwork before it can be used for the new look. Voice opens the existing Voice controls; nothing is synthesized here.</small>';
  this.host.insertBefore(editor,this.el('[data-cast-art-catalog]'));
  this.host.insertBefore(this.el('[data-cast-art-gallery-panel]'),this.el('[data-cast-art-catalog]'));
  add.onclick=()=>{if(this.loadedChat!==this.chat()){this.newAfterLoad=true;this.request({action:'list'});}else this.startNew();};
  this.el<HTMLButtonElement>('[data-cast-art-refresh]').onclick=()=>this.request({action:'list'});
  this.el<HTMLSelectElement>('[data-cast-art-character]').onchange=()=>this.renderVariants();
  this.el<HTMLSelectElement>('[data-cast-art-variant]').onchange=()=>this.renderPreview();
  for(const [selector,action] of [['[data-cast-art-select]','select'],['[data-cast-art-forget]','forget'],['[data-cast-art-forget-character]','forget']] as const)this.el<HTMLButtonElement>(selector).onclick=()=>this.request({action,characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,...(selector==='[data-cast-art-forget-character]'?{}:{variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value})});
  this.el<HTMLButtonElement>('[data-cast-art-reset]').onclick=()=>this.request({action:'reset'});
  this.el<HTMLButtonElement>('[data-cast-art-gallery]').onclick=()=>{this.artworkTarget=null;this.requestGallery(0);};
  this.el<HTMLButtonElement>('[data-cast-art-gallery-prev]').onclick=()=>this.requestGallery(Math.max(0,this.galleryOffset-12));
  this.el<HTMLButtonElement>('[data-cast-art-gallery-next]').onclick=()=>this.requestGallery(this.galleryOffset+12);
  this.el<HTMLButtonElement>('[data-cast-art-restore]').onclick=()=>this.request({action:'restore',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value});
  this.el<HTMLButtonElement>('[data-cast-setup-save]').onclick=()=>this.saveSetup();
  this.el<HTMLButtonElement>('[data-cast-setup-clear]').onclick=()=>this.request({action:'clear_setup',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value});
  this.el<HTMLButtonElement>('[data-cast-setup-outfit-add]').onclick=()=>{if(!this.draft)return;this.readDraft();if(this.draft.outfits.length>=7){this.status('Seven named outfits are already configured. Remove one to make room.');return;}const outfit={id:crypto.randomUUID(),name:`Outfit ${this.draft.outfits.length+1}`,description:''};this.draft.outfits.push(outfit);this.renderOutfits(outfit.id);};
  this.el<HTMLButtonElement>('[data-cast-setup-outfit-remove]').onclick=()=>{if(!this.draft)return;const id=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value;this.draft.outfits=this.draft.outfits.filter(o=>o.id!==id);if(this.draft.defaultOutfitId===id)this.draft.defaultOutfitId=null;this.renderOutfits('');};
  this.el<HTMLSelectElement>('[data-cast-setup-outfit]').onchange=()=>this.renderOutfitFields();
  for(const selector of ['[data-cast-setup-outfit-name]','[data-cast-setup-outfit-description]'])this.el<HTMLElement>(selector).oninput=()=>this.readDraft();
  this.el<HTMLButtonElement>('[data-cast-setup-art]').onclick=()=>{
   const record=this.selectedRecord();if(!record?.setup||this.newCharacter){this.status('Save the setup before choosing artwork.');return;}
   const draft=CastSetupInputSchema.safeParse(this.readDraft());
   if(!draft.success||JSON.stringify(draft.data)!==JSON.stringify(CastSetupInputSchema.parse({appearance:record.setup.appearance,aliases:record.setup.aliases,outfits:record.setup.outfits.map(({id,name,description})=>({id,name,description})),defaultOutfitId:record.setup.defaultOutfitId}))){this.status('Save your setup edits before assigning artwork.');return;}
   const outfitId=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value;this.artworkTarget={snapshot:JSON.stringify(draft.data),characterId:record.entityId,...(outfitId?{outfitId}:{})};this.requestGallery(0);
  };
  this.el<HTMLButtonElement>('[data-cast-setup-art-clear]').onclick=()=>{const id=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value;this.request({action:'setup_restore',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,...(id?{outfitId:id}:{})});};
  this.el<HTMLButtonElement>('[data-cast-setup-voice]').onclick=()=>{const record=this.selectedRecord();if(record)this.voice(record.name);};
  this.renderSetup();
  for(const type of ['input','change','click'])this.host.addEventListener(type,e=>e.stopPropagation());
 }
 private el<T extends HTMLElement>(selector:string):T{return this.host.querySelector<T>(selector)!;}
 private status(text:string):void{this.el('[data-cast-art-status]').textContent=text;}
 private busy(value:boolean):void{for(const e of this.host.querySelectorAll<HTMLButtonElement|HTMLSelectElement|HTMLInputElement|HTMLTextAreaElement>('button,select,input,textarea'))e.disabled=value;}
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
  if(this.savedName){const saved=this.library.characters.find(r=>r.name.toLocaleLowerCase()===this.savedName.toLocaleLowerCase());if(saved)picker.value=saved.entityId;this.savedName='';}
  this.newCharacter=false;
  this.el('[data-cast-art-catalog]').hidden=!this.library.characters.length;this.renderVariants();
  this.status(this.library.characters.length?`${this.library.characters.length} saved character(s). No generation requested.`:'No cast setup yet. Add a character without generating a portrait.');if(this.newAfterLoad){this.newAfterLoad=false;this.startNew();}return true;
 }
 private renderVariants():void{
  const record=this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value);
  const picker=this.el<HTMLSelectElement>('[data-cast-art-variant]');picker.replaceChildren();
  for(const [i,v] of (record?.variants??[]).entries()){const option=document.createElement('option');option.value=v.id;option.textContent=`Variant ${i+1} · ${v.createdAt.slice(0,16).replace('T',' ')}${record?.preferredVariantId===v.id?' · Preferred':''}`;picker.append(option);}
  if(record?.preferredVariantId)picker.value=record.preferredVariantId;this.newCharacter=false;this.renderPreview();this.renderSetup();
 }
 private renderPreview():void{
  this.el("[data-cast-art-gallery-panel]").hidden=true;
  const record=this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value),variant=record?.variants.find(v=>v.id===this.el<HTMLSelectElement>('[data-cast-art-variant]').value);
  this.el('[data-cast-art-description]').textContent=variant?.description??record?.description??'';const image=this.el<HTMLImageElement>('[data-cast-art-preview]');
  this.el<HTMLButtonElement>('[data-cast-art-restore]').disabled=!variant?.displayImageId;
  for(const selector of ['[data-cast-art-gallery]','[data-cast-art-select]','[data-cast-art-forget]'])this.el<HTMLButtonElement>(selector).disabled=!variant;
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
   const target=this.artworkTarget;
   button.onclick=()=>{if(target){const current=CastSetupInputSchema.safeParse(this.readDraft());if(!current.success||JSON.stringify(current.data)!==target.snapshot){this.status('Save your setup edits before assigning artwork.');return;}if(this.selectedRecord()?.entityId!==target.characterId||this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value!==(target.outfitId??'')){this.status('Selection changed. Choose setup artwork again.');return;}this.request({action:'setup_supply',characterId:target.characterId,...(target.outfitId?{outfitId:target.outfitId}:{}),imageId:item.id});}else this.request({action:'supply',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value,imageId:item.id});};grid.append(button);
  }
  this.el('[data-cast-art-gallery-panel]').hidden=false;
  this.el<HTMLButtonElement>('[data-cast-art-gallery-prev]').disabled=page.offset===0;
  this.el<HTMLButtonElement>('[data-cast-art-gallery-next]').disabled=page.offset+12>=page.total||page.offset+12>10000;
  this.status(page.images.length?'Select artwork for the currently selected appearance.':'No supported still images on this page. Upload PNG, JPEG, WebP or AVIF in Lumiverse’s gallery, or browse another page.');
 }
 private finish():void{if(this.timer)clearTimeout(this.timer);this.timer=null;this.pending=null;this.busy(false);this.updateAvailability();}
 fail(error:string,requestId?:string):void{if(requestId&&requestId!==this.pending?.requestId)return;this.finish();this.status(error);}
 notice(error:string):void{this.status(`Picture completed, but portrait art was not saved: ${error}`);}
 clear():void{this.finish();this.loadedChat='';this.library={version:1,characters:[]};this.draft=null;this.newCharacter=false;this.newAfterLoad=false;this.savedName='';this.artworkTarget=null;this.el('[data-cast-art-gallery-panel]').hidden=true;this.el('[data-cast-art-gallery-grid]').replaceChildren();this.el('[data-cast-art-catalog]').hidden=true;this.el<HTMLImageElement>('[data-cast-art-preview]').removeAttribute('src');this.renderSetup();this.status('Load the current chat’s saved characters.');}
 destroy():void{this.finish();this.host.remove();}

 private selectedRecord(){return this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value);}
 private startNew(){this.newCharacter=true;this.draft={appearance:'',aliases:[],outfits:[],defaultOutfitId:null};this.renderSetup(true);this.el<HTMLDetailsElement>('[data-cast-setup]').open=true;this.el<HTMLInputElement>('[data-cast-setup-name]').focus();}
 private renderSetup(keepDraft=false){
  const record=this.newCharacter?undefined:this.selectedRecord(),setup=record?.setup;
  const selected=record&&record.entityId===this.renderedCharacter?this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value:'';
  this.renderedCharacter=record?.entityId??'';
  if(!keepDraft)this.draft=record?{appearance:setup?.appearance??record.description,aliases:setup?.aliases??[],outfits:setup?.outfits.map(({id,name,description})=>({id,name,description}))??[],defaultOutfitId:setup?.defaultOutfitId??null}:null;
  this.el<HTMLInputElement>('[data-cast-setup-name]').value=record?.name??'';this.el<HTMLInputElement>('[data-cast-setup-name]').readOnly=!!record;
  this.el<HTMLTextAreaElement>('[data-cast-setup-appearance]').value=this.draft?.appearance??'';this.el<HTMLTextAreaElement>('[data-cast-setup-aliases]').value=this.draft?.aliases.join('\n')??'';
  this.el<HTMLElement>('[data-cast-setup]').hidden=!this.draft;
  this.el<HTMLButtonElement>('[data-cast-setup-clear]').disabled=!setup;this.el<HTMLButtonElement>('[data-cast-setup-art]').disabled=!setup;this.el<HTMLButtonElement>('[data-cast-setup-voice]').disabled=!record;
  this.renderOutfits(this.draft?.outfits.some(o=>o.id===selected)?selected:'');
 }
 private readDraft():CastSetupInput|null{
  if(!this.draft)return null;this.draft.appearance=this.el<HTMLTextAreaElement>('[data-cast-setup-appearance]').value.trim();this.draft.aliases=this.el<HTMLTextAreaElement>('[data-cast-setup-aliases]').value.split('\n').map(s=>s.trim()).filter(Boolean);this.draft.defaultOutfitId=this.el<HTMLSelectElement>('[data-cast-setup-default]').value||null;
  const outfit=this.draft.outfits.find(o=>o.id===this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value);
  if(outfit){outfit.name=this.el<HTMLInputElement>('[data-cast-setup-outfit-name]').value.trim();outfit.description=this.el<HTMLTextAreaElement>('[data-cast-setup-outfit-description]').value.trim();}
  return this.draft;
 }
 private renderOutfits(selected:string){
  for(const selector of ['[data-cast-setup-outfit]','[data-cast-setup-default]']){
   const picker=this.el<HTMLSelectElement>(selector);picker.replaceChildren();const base=document.createElement('option');base.value='';base.textContent=selector==='[data-cast-setup-outfit]'?'Base appearance / no outfit':'No default outfit';picker.append(base);
   for(const outfit of this.draft?.outfits??[]){const option=document.createElement('option');option.value=outfit.id;option.textContent=outfit.name;picker.append(option);}
   picker.value=selector==='[data-cast-setup-outfit]'?selected:this.draft?.defaultOutfitId??'';
  }
  this.renderOutfitFields();
 }
 private renderOutfitFields(){
  this.el<HTMLElement>('[data-cast-art-gallery-panel]').hidden=true;this.artworkTarget=null;
  const outfitId=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value,outfit=this.draft?.outfits.find(o=>o.id===outfitId);
  this.el<HTMLElement>('[data-cast-setup-outfit-fields]').hidden=!outfit;this.el<HTMLInputElement>('[data-cast-setup-outfit-name]').value=outfit?.name??'';this.el<HTMLTextAreaElement>('[data-cast-setup-outfit-description]').value=outfit?.description??'';
  const setup=this.newCharacter?undefined:this.selectedRecord()?.setup,target=outfitId?setup?.outfits.find(o=>o.id===outfitId):setup;
  const image=this.el<HTMLImageElement>('[data-cast-setup-preview]');image.hidden=!target?.imageId;if(target?.imageId)image.src=`/api/v1/images/${encodeURIComponent(target.imageId)}`;else image.removeAttribute('src');image.onerror=()=>{image.hidden=true;this.status('Setup artwork is unavailable. Choose another gallery image.');};
  this.el<HTMLElement>('[data-cast-setup-art-help]').textContent=target?.imageId?(target.imageAppearance!==setup?.appearance||('description' in target&&target.imageAttire!==target.description)?'Artwork belongs to the previous look. Reassign it after saving to use it for this appearance.':'Artwork assigned to this saved appearance.'): 'No artwork assigned to this appearance. Save setup, then choose a gallery image.';
  this.el<HTMLButtonElement>('[data-cast-setup-art-clear]').disabled=!target?.imageId;
 }
 private saveSetup(){const setup=CastSetupInputSchema.safeParse(this.readDraft());if(!setup.success){this.status(setup.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));return;}const name=this.el<HTMLInputElement>('[data-cast-setup-name]').value.trim();if(!name){this.status('Enter a character name.');return;}this.savedName=name;this.request({action:'setup',name,setup:setup.data,...(!this.newCharacter&&this.selectedRecord()?{characterId:this.selectedRecord()!.entityId}:{})});}
 private updateAvailability(){
  const record=this.newCharacter?undefined:this.selectedRecord(),variant=record?.variants.find(v=>v.id===this.el<HTMLSelectElement>('[data-cast-art-variant]').value);
  for(const selector of ['[data-cast-art-gallery]','[data-cast-art-select]','[data-cast-art-forget]'])this.el<HTMLButtonElement>(selector).disabled=!variant;
  this.el<HTMLButtonElement>('[data-cast-art-restore]').disabled=!variant?.displayImageId;
  this.el<HTMLButtonElement>('[data-cast-setup-clear]').disabled=!record?.setup;this.el<HTMLButtonElement>('[data-cast-setup-art]').disabled=!record?.setup;this.el<HTMLButtonElement>('[data-cast-setup-voice]').disabled=!record;
 }
}
