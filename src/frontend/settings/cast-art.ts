import {createUiId} from '../request-id.js';
import {setupAppearance,CastContextScanSchema,type CastContextScan,CastArtLibrarySchema,CastSetupInputSchema,type CastSetupInput,type CastArtLibrary,type CastArtAction,CastGallerySchema,type CastGallery} from '../../shared/cast-art.js';
import {characterAppearanceKey} from '../../shared/identity.js';

/** Explicit metadata management only. Image generation stays in the existing reviewer. */
export class CastArtPanel {
 readonly host=document.createElement('fieldset');
 private library:CastArtLibrary={version:1,characters:[]};
 private galleryOffset=0;
 private loadedChat='';private pending:{chatId:string,requestId:string}|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private draft:CastSetupInput|null=null;private newCharacter=false;private newAfterLoad=false;private savedName='';
 private scan:CastContextScan|null=null;private scanAfterLoad=false;
 private artworkTarget:{characterId:string,outfitId?:string,snapshot:string}|null=null;
 private renderedCharacter='';
 private baseline='';private confirmAction:(()=>void)|null=null;
 constructor(private chat:()=>string,private send:(chatId:string,requestId:string,action:CastArtAction)=>void,private gallery:(chatId:string,requestId:string,offset:number)=>void,private voice:(name:string)=>void=()=>{}){
  this.host.dataset.castArt='';
  this.host.innerHTML='<legend>Saved portrait art</legend><p>Reuse completed portrait-template pictures across turns. A match requires the same appearance, outfit, scene, template, style, model, connection and dimensions. Action images and manga pages stay independent. Reference-based generation keeps its existing path.</p><button type="button" data-cast-art-refresh>Load saved characters</button><div data-cast-art-catalog hidden><label>Character<select data-cast-art-character aria-label="Saved character"></select></label><label>Variant<select data-cast-art-variant aria-label="Saved character variant"></select></label><img data-cast-art-preview alt="Saved character portrait" style="display:block;max-width:100%;max-height:180px;object-fit:contain;margin:12px auto"><p data-cast-art-description></p><p>For a saved appearance, you can choose a still image from your Lumiverse gallery. It appears only in Cast view for this appearance and outfit; it does not change image prompts or create images.</p><button type="button" data-cast-art-gallery>Choose gallery artwork</button><button type="button" data-cast-art-restore>Use generated portrait</button><div data-cast-art-gallery-panel hidden><div data-cast-art-gallery-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><button type="button" data-cast-art-gallery-prev>Previous images</button><button type="button" data-cast-art-gallery-next>More images</button></div><button type="button" data-cast-art-select>Prefer this variant</button><button type="button" data-cast-art-forget>Forget this variant</button><button type="button" data-cast-art-forget-character>Forget this character</button><button type="button" data-cast-art-reset>Reset library</button><small>Preferences apply only to compatible future preparations. Forgetting removes the library pointer; existing reader pictures and host images remain. To create replacement art, use Edit and regenerate in Image prompts. Edited prompts stay independent.</small></div><p data-cast-art-status role="status"></p>';
  this.el<HTMLElement>('legend').textContent='Cast setup and portraits';
  this.host.querySelector('p')!.textContent='Register actual characters for this chat, even before any portrait is generated. Setup supplies future appearance guidance; it does not put a character into the story or generate pictures.';
  const add=document.createElement('button');add.type='button';add.dataset.castSetupNew='';add.textContent='Add character';this.host.insertBefore(add,this.el('[data-cast-art-catalog]'));
  const editor=document.createElement('details');editor.dataset.castSetup='';
  editor.innerHTML='<summary>Character setup</summary><label>Name<input data-cast-setup-name aria-label="Cast character name" maxlength="160"></label><small>Existing names identify the character. Use aliases for other names.</small><label>Aliases — one per line<textarea data-cast-setup-aliases aria-label="Cast aliases" maxlength="2600" rows="2"></textarea></label><label>Base appearance<textarea data-cast-setup-appearance aria-label="Cast base appearance" maxlength="2000" rows="4" placeholder="Concrete visual details: species, build, hair or fur, eyes, distinguishing features…"></textarea></label><label>Outfit to edit<select data-cast-setup-outfit aria-label="Cast outfit"><option value="">Base appearance / no outfit</option></select></label><div data-cast-setup-outfit-fields hidden><label>Outfit name<input data-cast-setup-outfit-name aria-label="Cast outfit name" maxlength="100"></label><label>Clothing description<textarea data-cast-setup-outfit-description aria-label="Cast clothing description" maxlength="1000" rows="2"></textarea></label><button type="button" data-cast-setup-outfit-remove>Remove outfit</button></div><button type="button" data-cast-setup-outfit-add>Add outfit</button><label>Default outfit guidance<select data-cast-setup-default aria-label="Default cast outfit"></select></label><small>Story clothing can override this guidance. Seven named outfits plus base artwork are supported. Generated portrait variants keep their separate existing limit.</small><button type="button" data-cast-setup-save>Save cast setup</button><button type="button" data-cast-setup-clear>Remove setup guidance</button><hr><img data-cast-setup-preview alt="Supplied cast artwork" hidden style="max-width:100%;max-height:180px;object-fit:contain;display:block;margin:12px auto"><p data-cast-setup-art-help></p><button type="button" data-cast-setup-art>Choose setup artwork</button><button type="button" data-cast-setup-art-clear>Clear setup artwork</button><button type="button" data-cast-setup-voice>Configure voice</button><small>Artwork is display-only in Cast view when a matching portrait cue is present. It is not sent to the image model. Appearance/outfit edits require reassigning artwork before it can be used for the new look. Voice opens the existing Voice controls; nothing is synthesized here.</small>';
  this.host.insertBefore(editor,this.el('[data-cast-art-catalog]'));
  for(const input of this.host.querySelectorAll<HTMLInputElement>('input:not([type])'))input.type='text';
  this.host.insertBefore(this.el('[data-cast-art-gallery-panel]'),this.el('[data-cast-art-catalog]'));
  const scanPanel=document.createElement('details');scanPanel.dataset.castContext='';scanPanel.innerHTML='<summary>Fill from context</summary><p>Scan saved story appearances, revealed NPC references and enabled SimTracker snapshots. Review a source, fill your draft, then save to apply it to future image prompts.</p><button type="button" data-cast-scan>Scan context</button><div data-cast-scan-results hidden><label>Character and source<select aria-label="Scanned character source" data-cast-scan-source></select></label><label>Source preview<textarea aria-label="Scanned character preview" data-cast-scan-preview readonly rows="5"></textarea></label><button type="button" data-cast-scan-fill>Fill empty fields</button><button type="button" data-cast-scan-replace>Replace appearance</button></div><p data-cast-scan-notice role="status"></p>';
  this.host.insertBefore(scanPanel,editor);
  this.el<HTMLButtonElement>('[data-cast-scan]').onclick=()=>{if(this.loadedChat!==this.chat()){this.scanAfterLoad=true;this.request({action:'list'});}else this.request({action:'scan'});};
  this.el<HTMLSelectElement>('[data-cast-scan-source]').onchange=()=>this.previewScan();
  this.el<HTMLButtonElement>('[data-cast-scan-fill]').onclick=()=>this.fillScan(false);
  this.el<HTMLButtonElement>('[data-cast-scan-replace]').onclick=()=>this.fillScan(true);
  add.onclick=()=>{if(this.loadedChat!==this.chat()){this.newAfterLoad=true;this.request({action:'list'});}else this.startNew();};
  this.el<HTMLButtonElement>('[data-cast-art-refresh]').onclick=()=>this.request({action:'list'});
  this.el<HTMLSelectElement>('[data-cast-art-character]').onchange=()=>this.renderVariants();
  this.el<HTMLSelectElement>('[data-cast-art-variant]').onchange=()=>this.renderPreview();
  for(const [selector,action] of [['[data-cast-art-select]','select'],['[data-cast-art-forget]','forget'],['[data-cast-art-forget-character]','forget']] as const)this.el<HTMLButtonElement>(selector).onclick=()=>this.guardedRequest({action,characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,...(selector==='[data-cast-art-forget-character]'?{}:{variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value})});
  this.el<HTMLButtonElement>('[data-cast-art-reset]').onclick=()=>this.request({action:'reset'});
  this.el<HTMLButtonElement>('[data-cast-art-gallery]').onclick=()=>{this.artworkTarget=null;this.requestGallery(0);};
  this.el<HTMLButtonElement>('[data-cast-art-gallery-prev]').onclick=()=>this.requestGallery(Math.max(0,this.galleryOffset-12));
  this.el<HTMLButtonElement>('[data-cast-art-gallery-next]').onclick=()=>this.requestGallery(this.galleryOffset+12);
  this.el<HTMLButtonElement>('[data-cast-art-restore]').onclick=()=>this.guardedRequest({action:'restore',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value});
  this.el<HTMLButtonElement>('[data-cast-setup-save]').onclick=()=>this.saveSetup();
  this.el<HTMLButtonElement>('[data-cast-setup-clear]').onclick=()=>this.request({action:'clear_setup',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value});
  this.el<HTMLButtonElement>('[data-cast-setup-outfit-add]').onclick=()=>{if(!this.draft)return;this.readDraft();if(this.draft.outfits.length>=7){this.status('Seven named outfits are already configured. Remove one to make room.');return;}const outfit={id:createUiId(),name:`Outfit ${this.draft.outfits.length+1}`,description:''};this.draft.outfits.push(outfit);this.renderOutfits(outfit.id);};
  this.el<HTMLButtonElement>('[data-cast-setup-outfit-remove]').onclick=()=>{if(!this.draft)return;const id=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value;this.draft.outfits=this.draft.outfits.filter(o=>o.id!==id);if(this.draft.defaultOutfitId===id)this.draft.defaultOutfitId=null;this.renderOutfits('');};
  this.el<HTMLSelectElement>('[data-cast-setup-outfit]').onchange=()=>this.renderOutfitFields();
  for(const selector of ['[data-cast-setup-outfit-name]','[data-cast-setup-outfit-description]'])this.el<HTMLElement>(selector).oninput=()=>this.readDraft();
  this.el<HTMLButtonElement>('[data-cast-setup-art]').onclick=()=>{
   const record=this.selectedRecord();if(!record?.setup||this.newCharacter){this.status('Save the setup before choosing artwork.');return;}
   const draft=CastSetupInputSchema.safeParse(this.readDraft());
   if(!draft.success||JSON.stringify(draft.data)!==JSON.stringify(CastSetupInputSchema.parse({appearance:record.setup.appearance,aliases:record.setup.aliases,outfits:record.setup.outfits.map(({id,name,description})=>({id,name,description})),defaultOutfitId:record.setup.defaultOutfitId}))){this.status('Save your setup edits before assigning artwork.');return;}
   const outfitId=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value;this.artworkTarget={snapshot:JSON.stringify(draft.data),characterId:record.entityId,...(outfitId?{outfitId}:{})};this.requestGallery(0);
  };
  this.el<HTMLButtonElement>('[data-cast-setup-art-clear]').onclick=()=>{const id=this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value;this.guardedRequest({action:'setup_restore',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,...(id?{outfitId:id}:{})});};
  this.el<HTMLButtonElement>('[data-cast-setup-voice]').onclick=()=>{const record=this.selectedRecord();if(record)this.voice(record.name);};
  this.organize();this.renderSetup();
  for(const type of ['input','change','click'])this.host.addEventListener(type,e=>e.stopPropagation());
 }
 private organize():void{
  this.host.dataset.castWorkspace='';
  const style=document.createElement('style');style.textContent=`
   [data-cast-workspace]{min-width:0!important;padding:0!important;border:0!important}
   [data-cast-workspace] legend{font-weight:700;margin-bottom:8px}
   [data-cast-workspace] p,[data-cast-workspace] small{line-height:1.5;overflow-wrap:anywhere}
   [data-cast-workspace] small{display:block;color:var(--set-muted,#aeb0c0);margin:6px 0 12px}
   [data-cast-workspace] label{display:block;margin:12px 0 6px}
   [data-cast-workspace] input,[data-cast-workspace] select,[data-cast-workspace] textarea{width:100%;min-width:0;box-sizing:border-box;font:inherit}
   [data-cast-workspace] textarea{font-size:16px;line-height:1.5;resize:vertical;min-height:86px}
   [data-cast-workspace] summary{min-height:44px;align-content:center;cursor:pointer;font-weight:650}
   [data-cast-workspace] details{border-top:1px solid var(--set-border,#454655);margin-top:12px;padding-top:4px}
   [data-cast-workspace] button{min-height:44px!important;width:auto;max-width:100%;white-space:normal!important}
   [data-cast-tools],[data-cast-edit-actions]{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
   [data-cast-tools] button,[data-cast-edit-actions] button{flex:1 1 120px;margin:0!important}
   [data-cast-guidance]{border-left:3px solid var(--set-accent,#b8a5e4);padding:8px 12px;margin:16px 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.94rem}
   [data-cast-draft-status]{font-size:.85rem;font-weight:600;color:var(--set-muted,#b9b6c8)}
   [data-cast-confirm]{border:1px solid var(--set-border,#555);padding:12px;border-radius:10px;margin:12px 0}
   [data-cast-workspace] [hidden]{display:none!important}
  `;this.host.append(style);
  this.host.querySelector('legend')!.textContent='Cast';
  this.host.querySelector('p')!.textContent='Keep a consistent appearance for each character in this chat. Scan for suggestions, review, then save.';
  const catalog=this.el('[data-cast-art-catalog]'),editor=this.el<HTMLDetailsElement>('[data-cast-setup]'),scan=this.el<HTMLDetailsElement>('[data-cast-context]');
  const toolbar=document.createElement('div');toolbar.dataset.castTools='';
  const scanAll=document.createElement('button');scanAll.type='button';scanAll.textContent='Scan all characters';scanAll.dataset.castScanAll='';
  toolbar.append(this.el('[data-cast-art-refresh]'),scanAll,this.el('[data-cast-setup-new]'));this.host.insertBefore(toolbar,scan);
  this.el('[data-cast-art-refresh]').textContent='Refresh cast';
  const picker=this.el<HTMLSelectElement>('[data-cast-art-character]'),characterLabel=picker.closest('label')!;characterLabel.dataset.castPicker='';
  this.host.insertBefore(characterLabel,scan);
  const actions=document.createElement('div');actions.dataset.castEditActions='';
  const scanOne=document.createElement('button');scanOne.type='button';scanOne.textContent='Scan this character';scanOne.dataset.castScanOne='';
  const remove=this.el<HTMLButtonElement>('[data-cast-art-forget-character]');remove.textContent='Remove character';actions.append(scanOne,remove);this.host.insertBefore(actions,scan);
  const confirm=document.createElement('div');confirm.dataset.castConfirm='';confirm.hidden=true;confirm.innerHTML='<p data-cast-confirm-text></p><div data-cast-edit-actions><button type="button" data-cast-confirm-yes>Confirm</button><button type="button" data-cast-confirm-no>Keep editing</button></div>';this.host.insertBefore(confirm,scan);
  const guidance=document.createElement('div');guidance.dataset.castGuidance='';guidance.setAttribute('aria-label','Saved image prompt guidance');this.host.insertBefore(guidance,scan);
  this.host.insertBefore(editor,scan);editor.querySelector('summary')!.textContent='Edit appearance';
  const aliases=document.createElement('details');aliases.innerHTML='<summary>Other names / aliases</summary>';aliases.append(this.el('[data-cast-setup-aliases]').closest('label')!);editor.insertBefore(aliases,this.el('[data-cast-setup-outfit]').closest('label'));
  const outfits=document.createElement('details');outfits.dataset.castOutfits='';outfits.innerHTML='<summary>Outfits</summary>';
  for(const node of [this.el('[data-cast-setup-outfit]').closest('label')!,this.el('[data-cast-setup-outfit-fields]'),this.el('[data-cast-setup-outfit-add]'),this.el('[data-cast-setup-default]').closest('label')!])outfits.append(node);
  editor.insertBefore(outfits,this.el('[data-cast-setup-save]'));
  const saveRow=document.createElement('div');saveRow.dataset.castEditActions='';saveRow.append(this.el('[data-cast-setup-save]'),this.el('[data-cast-setup-clear]'));editor.insertBefore(saveRow,editor.querySelector('hr'));
  this.el('[data-cast-setup-save]').dataset.primary='';
  for(const small of editor.querySelectorAll('small')){if(small.textContent?.startsWith('Story clothing'))outfits.append(small);else if(small.textContent?.startsWith('Artwork is display-only'))small.remove();}
  const status=document.createElement('p');status.dataset.castDraftStatus='';status.setAttribute('role','status');editor.insertBefore(status,saveRow);
  const art=document.createElement('details');art.innerHTML='<summary>Artwork and voice (display only)</summary>';
  for(const selector of ['[data-cast-setup-preview]','[data-cast-setup-art-help]','[data-cast-setup-art]','[data-cast-setup-art-clear]','[data-cast-setup-voice]'])art.append(this.el(selector));
  const artHelp=document.createElement('small');artHelp.textContent='Artwork changes Cast view only; it is not an image-model reference. The saved appearance above supplies prompt guidance. Voice opens your existing voice controls.';art.append(artHelp);editor.append(art);editor.querySelector('hr')?.remove();
  const library=document.createElement('details');library.dataset.castPortraitLibrary='';library.innerHTML='<summary>Saved portraits &amp; advanced cleanup</summary>';this.host.insertBefore(library,catalog);library.append(catalog);
  this.el('[data-cast-art-description]').insertAdjacentHTML('beforebegin','<small>Portrait snapshot below: historical artwork metadata, not the current saved appearance used for new prompts.</small>');
  const intro=scan.querySelector('p')!;intro.textContent='Suggestions from saved story appearances, revealed NPC tooltips and enabled SimTracker snapshots. Scanning is read-only and uses no model calls.';
  const scanCharacter=document.createElement('label');scanCharacter.innerHTML='Found character<select data-cast-scan-character aria-label="Scanned character"></select>';this.el('[data-cast-scan-results]').prepend(scanCharacter);
  const importButton=document.createElement('button');importButton.type='button';importButton.dataset.castScanImport='';importButton.textContent='Open this character';this.el('[data-cast-scan-results]').append(importButton);
  const sourceLabel=this.el('[data-cast-scan-source]').closest('label')!;sourceLabel.childNodes[0]!.textContent='Description source';
  scanOne.onclick=()=>{const record=this.selectedRecord();if(!record||this.newCharacter)return;scan.open=true;this.request({action:'scan',characterId:record.entityId});};
  scanAll.onclick=()=>{scan.open=true;this.el<HTMLButtonElement>('[data-cast-scan]').click();};
  this.el<HTMLSelectElement>('[data-cast-scan-character]').onchange=()=>{this.cancelConfirm();this.renderScanSources();};
  this.el<HTMLSelectElement>('[data-cast-scan-source]').onchange=()=>{this.cancelConfirm();this.previewScan();};
  importButton.onclick=()=>this.openScannedCharacter();
  picker.onchange=()=>{const next=picker.value;picker.value=this.renderedCharacter;this.guardEdits(()=>{picker.value=next;this.renderVariants();this.renderScanSources();});};
  this.el<HTMLButtonElement>('[data-cast-setup-new]').onclick=()=>this.guardEdits(()=>{if(this.loadedChat!==this.chat()){this.newAfterLoad=true;this.request({action:'list'});}else this.startNew();});
  this.el<HTMLButtonElement>('[data-cast-art-refresh]').onclick=()=>this.guardEdits(()=>this.request({action:'list'}));
  for(const [selector,action] of [['[data-cast-art-forget]','forget'],['[data-cast-art-forget-character]','forget'],['[data-cast-art-reset]','reset'],['[data-cast-setup-clear]','clear_setup']] as const){
   this.el<HTMLButtonElement>(selector).onclick=()=>{const record=this.selectedRecord();if(action!=='reset'&&!record)return;const request:CastArtAction={action,...(record?{characterId:record.entityId}:{}),...(selector==='[data-cast-art-forget]'?{variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value}:{})};this.confirm(`${action==='clear_setup'?'Remove saved appearance guidance? Story / tracker appearance may be used again.':action==='reset'?'Remove all saved cast setups and portrait links in this chat?':selector==='[data-cast-art-forget]'?'Remove this saved portrait link?':`Remove ${record!.name} and their saved appearance, outfits and portrait links?`} Unsaved edits will be discarded. Story / tracker descriptions and gallery images are kept; scanning can find the character again.`,()=>this.request(request),'Remove');};
  }
  this.el<HTMLButtonElement>('[data-cast-confirm-no]').onclick=()=>this.cancelConfirm();
  this.el<HTMLButtonElement>('[data-cast-confirm-yes]').onclick=()=>{const action=this.confirmAction;this.cancelConfirm();if(this.loadedChat===this.chat())action?.();else{this.clear();this.status('Chat changed. Refresh the cast first.');}};
  for(const event of ['input','change','click'])editor.addEventListener(event,()=>this.renderGuidance());
 }
 private snapshot():string{return JSON.stringify({name:this.el<HTMLInputElement>('[data-cast-setup-name]').value,setup:this.readDraft()});}
 private dirty():boolean{return !!this.draft&&this.snapshot()!==this.baseline;}
 private cancelConfirm():void{this.confirmAction=null;this.el('[data-cast-confirm]').hidden=true;}
 private confirm(text:string,action:()=>void,label:string):void{this.confirmAction=action;this.el('[data-cast-confirm-text]').textContent=text;this.el('[data-cast-confirm-yes]').textContent=label;this.el('[data-cast-confirm]').hidden=false;this.el('[data-cast-confirm]').scrollIntoView({block:'nearest'});}
 private guardEdits(action:()=>void):void{if(this.dirty())this.confirm('Discard unsaved appearance or outfit edits before continuing?',action,'Discard edits');else{this.cancelConfirm();action();}}
 private guardedRequest(action:CastArtAction):void{this.guardEdits(()=>this.request(action));}
 private renderGuidance():void{
  const record=this.newCharacter?undefined:this.selectedRecord();
  this.el('[data-cast-picker]').hidden=!this.library.characters.length;
  this.el<HTMLButtonElement>('[data-cast-scan-one]').disabled=!!this.pending||!record;
  this.el<HTMLButtonElement>('[data-cast-art-forget-character]').disabled=!!this.pending||!record;
  this.el('[data-cast-guidance]').textContent=record?.setup?`Saved appearance for ${record.name}'s pictures\n${setupAppearance(record.setup)}\n\nUsed when this character is pictured, ahead of learned appearance. Scene clothing and per-picture corrections can override. See Image prompts for the final wording; already prepared pictures keep their prompts.`:this.newCharacter?'New character — not saved yet. Enter or scan an appearance, then save.':record?'No saved appearance override. Story / tracker evidence supplies this character’s look. Scan to inspect available descriptions, then save a consistent baseline.':this.loadedChat!==this.chat()?'Saved characters have not loaded yet. Refresh cast to retry, or scan for context suggestions.':'No saved characters yet. Scan all characters to discover them, or add one manually.';
  this.el('[data-cast-draft-status]').textContent=this.dirty()?'Unsaved changes — image prompts still use the saved appearance above.':record?.setup?'Saved for future picture preparations.':this.draft?'No saved override yet.':'Choose a character, scan context, or add one.';
 }
 private el<T extends HTMLElement>(selector:string):T{return this.host.querySelector<T>(selector)!;}
 ensureLoaded():void{if(!this.pending&&this.loadedChat!==this.chat())this.request({action:'list'});}
 private status(text:string):void{this.el('[data-cast-art-status]').textContent=text;}
 private busy(value:boolean):void{for(const e of this.host.querySelectorAll<HTMLButtonElement|HTMLSelectElement|HTMLInputElement|HTMLTextAreaElement>('button,select,input,textarea'))e.disabled=value;}
 private request(action:CastArtAction):void{
  const chatId=this.chat();if(!chatId){this.status('Open a chat to manage its portrait art.');return;}
  if(this.pending)return;
  if(action.action!=='list'&&this.loadedChat!==chatId){this.clear();this.status('Chat changed. Load its saved characters first.');return;}
  this.cancelConfirm();
  const requestId=createUiId();this.pending={chatId,requestId};this.busy(true);this.status('Loading…');
  this.timer=setTimeout(()=>this.fail('No response yet. Try loading the library again.'),15000);
  try{this.send(chatId,requestId,action);}catch(error){this.fail(error instanceof Error?error.message:String(error));}
 }
 receive(chatId:string,requestId:string,value:CastArtLibrary):boolean{
  if(!this.pending||chatId!==this.chat()||chatId!==this.pending.chatId||requestId!==this.pending.requestId)return false;
  const parsed=CastArtLibrarySchema.safeParse(value);if(!parsed.success){this.fail('Invalid library response. Saved data was preserved.');return false;}
  this.finish();this.cancelConfirm();this.loadedChat=chatId;this.library=parsed.data;
  const picker=this.el<HTMLSelectElement>('[data-cast-art-character]'),previous=picker.value;picker.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Choose a character';picker.append(empty);
  for(const r of this.library.characters){const option=document.createElement('option');option.value=r.entityId;option.textContent=r.name;picker.append(option);}
  picker.value=this.library.characters.some(r=>r.entityId===previous)?previous:this.library.characters[0]?.entityId??'';
  if(this.savedName){const saved=this.library.characters.find(r=>characterAppearanceKey(r.name)===characterAppearanceKey(this.savedName));if(saved)picker.value=saved.entityId;this.savedName='';}
  this.newCharacter=false;
  this.el('[data-cast-art-catalog]').hidden=!this.library.characters.length;this.renderVariants();
  this.status(this.library.characters.length?`${this.library.characters.length} saved character(s). No generation requested.`:'No cast setup yet. Add a character without generating a portrait.');if(this.scanAfterLoad){this.scanAfterLoad=false;this.request({action:'scan'});}if(this.newAfterLoad){this.newAfterLoad=false;this.startNew();}return true;
 }
 private renderVariants():void{
  const record=this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value);
  const picker=this.el<HTMLSelectElement>('[data-cast-art-variant]');picker.replaceChildren();
  for(const [i,v] of (record?.variants??[]).entries()){const option=document.createElement('option');option.value=v.id;option.textContent=`Variant ${i+1} · ${v.createdAt.slice(0,16).replace('T',' ')}${record?.preferredVariantId===v.id?' · Preferred':''}`;picker.append(option);}
  if(record?.preferredVariantId)picker.value=record.preferredVariantId;this.newCharacter=false;this.renderPreview();this.renderSetup();this.el<HTMLDetailsElement>('[data-cast-setup]').open=true;
  const found=this.el<HTMLSelectElement>('[data-cast-scan-character]');if(record&&[...found.options].some(option=>option.value===characterAppearanceKey(record.name)))found.value=characterAppearanceKey(record.name);this.renderScanSources();
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
  this.cancelConfirm();
  const requestId=createUiId();this.pending={chatId,requestId};this.busy(true);this.status('Loading gallery…');
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
   button.onclick=()=>{if(target){const current=CastSetupInputSchema.safeParse(this.readDraft());if(!current.success||JSON.stringify(current.data)!==target.snapshot){this.status('Save your setup edits before assigning artwork.');return;}if(this.selectedRecord()?.entityId!==target.characterId||this.el<HTMLSelectElement>('[data-cast-setup-outfit]').value!==(target.outfitId??'')){this.status('Selection changed. Choose setup artwork again.');return;}this.request({action:'setup_supply',characterId:target.characterId,...(target.outfitId?{outfitId:target.outfitId}:{}),imageId:item.id});}else this.guardedRequest({action:'supply',characterId:this.el<HTMLSelectElement>('[data-cast-art-character]').value,variantId:this.el<HTMLSelectElement>('[data-cast-art-variant]').value,imageId:item.id});};grid.append(button);
  }
  this.el('[data-cast-art-gallery-panel]').hidden=false;
  this.el<HTMLButtonElement>('[data-cast-art-gallery-prev]').disabled=page.offset===0;
  this.el<HTMLButtonElement>('[data-cast-art-gallery-next]').disabled=page.offset+12>=page.total||page.offset+12>10000;
  this.status(page.images.length?'Select artwork for the currently selected appearance.':'No supported still images on this page. Upload PNG, JPEG, WebP or AVIF in Lumiverse’s gallery, or browse another page.');
 }
 private finish():void{if(this.timer)clearTimeout(this.timer);this.timer=null;this.pending=null;this.busy(false);this.updateAvailability();}
 fail(error:string,requestId?:string):void{if(requestId&&requestId!==this.pending?.requestId)return;this.finish();this.status(error);}
 notice(error:string):void{this.status(`Picture completed, but portrait art was not saved: ${error}`);}
 clear():void{this.cancelConfirm();this.el<HTMLSelectElement>('[data-cast-scan-character]').replaceChildren();this.scan=null;this.scanAfterLoad=false;this.el('[data-cast-scan-results]').hidden=true;this.el('[data-cast-scan-notice]').textContent='';this.el<HTMLTextAreaElement>('[data-cast-scan-preview]').value='';this.el<HTMLSelectElement>('[data-cast-scan-source]').replaceChildren();this.finish();this.loadedChat='';this.library={version:1,characters:[]};this.draft=null;this.newCharacter=false;this.newAfterLoad=false;this.savedName='';this.artworkTarget=null;this.el('[data-cast-art-gallery-panel]').hidden=true;this.el('[data-cast-art-gallery-grid]').replaceChildren();this.el('[data-cast-art-catalog]').hidden=true;this.el<HTMLImageElement>('[data-cast-art-preview]').removeAttribute('src');this.renderSetup();this.status('Load the current chat’s saved characters.');}
 destroy():void{this.finish();this.host.remove();}

 receiveScan(chatId:string,requestId:string,value:CastContextScan):boolean{
  if(!this.pending||chatId!==this.chat()||chatId!==this.pending.chatId||requestId!==this.pending.requestId)return false;
  const parsed=CastContextScanSchema.safeParse(value);if(!parsed.success){this.fail('Invalid context response. Nothing was changed.');return false;}
  this.finish();this.scan=parsed.data;const picker=this.el<HTMLSelectElement>('[data-cast-scan-character]');picker.replaceChildren();
  const names=new Map<string,string>();for(const candidate of this.scan.candidates){const record=this.library.characters.find(r=>this.candidateMatches(r,candidate));const name=record?.name??candidate.name;names.set(characterAppearanceKey(name),name);}
  for(const [key,name] of names){const option=document.createElement('option');option.value=key;option.textContent=name;picker.append(option);}
  const selected=this.selectedRecord();if(selected&&names.has(characterAppearanceKey(selected.name)))picker.value=characterAppearanceKey(selected.name);
  this.el('[data-cast-scan-results]').hidden=!this.scan.candidates.length;this.el('[data-cast-scan-notice]').textContent=this.scan.candidates.length?this.scan.notice:'No usable character descriptions found. Prepare a story reply or enable SimTracker context, or enter an appearance manually.';
  this.renderScanSources();this.status('Context scan complete. Nothing saved or generated.');if(this.scan.candidates.length)this.el('[data-cast-scan-character]').scrollIntoView({block:'center'});return true;
 }
 private candidateMatches(record:CastArtLibrary['characters'][number],candidate:CastContextScan['candidates'][number]):boolean{
  const names=[record.name,...(record.setup?.aliases??[])].map(characterAppearanceKey);return [candidate.name,...candidate.setup.aliases].some(name=>names.includes(characterAppearanceKey(name)));
 }
 private renderScanSources():void{
  const name=this.el<HTMLSelectElement>('[data-cast-scan-character]').value,picker=this.el<HTMLSelectElement>('[data-cast-scan-source]');const previous=picker.value;picker.replaceChildren();
  for(const [index,candidate] of (this.scan?.candidates??[]).entries()){
   const record=this.library.characters.find(r=>this.candidateMatches(r,candidate));if(characterAppearanceKey(record?.name??candidate.name)!==name)continue;
   const option=document.createElement('option');option.value=String(index);option.textContent=candidate.source;picker.append(option);
  }
  if([...picker.options].some(option=>option.value===previous))picker.value=previous;this.previewScan();
 }
 private openScannedCharacter():void{
  const candidate=this.scanCandidate();if(!candidate)return;
  this.guardEdits(()=>{const record=this.library.characters.find(r=>this.candidateMatches(r,candidate));if(record){this.el<HTMLSelectElement>('[data-cast-art-character]').value=record.entityId;this.renderVariants();this.status('Character opened. Choose a source and replace or fill the draft, then save.');}else{this.startNew();this.fillScan(false);}this.el<HTMLDetailsElement>('[data-cast-setup]').open=true;this.el('[data-cast-setup]').scrollIntoView({block:'nearest'});});
 }
 private scanCandidate(){const value=this.el<HTMLSelectElement>('[data-cast-scan-source]').value;return value===''?undefined:this.scan?.candidates[Number(value)];}
 private previewScan(){const candidate=this.scanCandidate();this.el<HTMLButtonElement>('[data-cast-scan-replace]').disabled=!candidate?.setup.appearance.trim();for(const selector of ['[data-cast-scan-fill]','[data-cast-scan-import]'])this.el<HTMLButtonElement>(selector).disabled=!candidate;this.el<HTMLTextAreaElement>('[data-cast-scan-preview]').value=candidate?`${candidate.name}
${candidate.setup.appearance||'No visual description available. Add an appearance before saving.'}
${candidate.setup.outfits.map(o=>o.name+': '+o.description).join('\n')}`:'';}
 private fillScan(replace:boolean){
  const candidate=this.scanCandidate();if(!candidate)return;if(replace&&!candidate.setup.appearance.trim()){this.status('No appearance is available from this source. Your existing description was kept.');return;}
  if(!this.draft)this.startNew();const name=this.el<HTMLInputElement>('[data-cast-setup-name]').value.trim();
  if(name&&characterAppearanceKey(name)!==characterAppearanceKey(candidate.name)&&!(this.selectedRecord()&&!this.newCharacter&&this.candidateMatches(this.selectedRecord()!,candidate))){this.status('Use Open this character to switch to this suggestion. Your edits were kept.');return;}
  const draft=this.readDraft()!;if(replace||!draft.appearance)draft.appearance=candidate.setup.appearance;
  if(!draft.aliases.length)draft.aliases=[...candidate.setup.aliases];
  if(!draft.outfits.length){draft.outfits=structuredClone(candidate.setup.outfits);draft.defaultOutfitId=candidate.setup.defaultOutfitId;}
  this.renderSetup(true);this.el<HTMLInputElement>('[data-cast-setup-name]').value=name||candidate.name;this.el<HTMLDetailsElement>('[data-cast-setup]').open=true;
  this.renderGuidance();this.status('Draft filled. Review and Save cast setup to apply it to future image prompts. Existing prepared pictures keep their prompts.');this.el('[data-cast-setup-appearance]').scrollIntoView({block:'center'});
 }
 private selectedRecord(){return this.library.characters.find(r=>r.entityId===this.el<HTMLSelectElement>('[data-cast-art-character]').value);}
 private startNew(){this.newCharacter=true;this.el<HTMLSelectElement>('[data-cast-art-character]').value='';this.draft={appearance:'',aliases:[],outfits:[],defaultOutfitId:null};this.renderSetup(true);this.baseline=this.snapshot();this.renderGuidance();this.el<HTMLDetailsElement>('[data-cast-setup]').open=true;this.el<HTMLInputElement>('[data-cast-setup-name]').focus();}
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
  if(!keepDraft)this.baseline=this.snapshot();this.renderGuidance();
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
  this.renderGuidance();
 }
}
