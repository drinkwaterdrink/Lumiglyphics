import {createUiId} from '../request-id.js';
import type {TurnView,FrontendRequest} from '../../protocol.js';
import {ImageLibraryPageSchema,type ImageLibraryPage,type ImageLibraryRequest,type LibraryImageView} from '../../shared/image-library.js';

const css=`
:host{position:absolute;inset:0;pointer-events:none;z-index:58;color:var(--vn-shell-text,#f4f1e9);font:14px/1.5 system-ui}
*{box-sizing:border-box}[hidden]{display:none!important}button,input,select,textarea{font:inherit;color:inherit}button,select{min-height:44px;border:1px solid var(--vn-shell-border,#53647c);border-radius:8px;background:var(--vn-shell-field,#182334);padding:8px 12px}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}button:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--vn-shell-accent,#b6d9ff);outline-offset:2px}
[data-library-launch]{position:absolute;right:16px;top:140px;pointer-events:auto;width:44px;padding:9px;background:var(--vn-shell-bg,#141c2a)}svg{width:24px;height:24px;display:block;margin:auto}
section{position:absolute;inset:max(76px,calc(env(safe-area-inset-top) + 64px)) 12px max(12px,env(safe-area-inset-bottom));max-width:940px;margin:auto;pointer-events:auto;border:1px solid var(--vn-shell-border,#53647c);border-radius:14px;background:var(--vn-shell-bg,#141c2a);box-shadow:0 12px 48px #0009;display:flex;flex-direction:column;overflow:hidden}
header{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--vn-shell-border,#53647c);flex:none}h2{font-size:18px;margin:0;flex:1}header button{width:44px;padding:0;font-size:24px}.body{overflow:auto;overscroll-behavior:contain;padding:12px 14px;min-height:0;flex:1}[data-library-close]{flex:none}
.filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}label{display:block;color:var(--vn-shell-muted,#b4c1d4);font-size:12px}select{width:100%;font-size:14px}.check{display:flex;align-items:center;gap:8px;min-height:44px;font-size:14px}.check input{width:20px;height:20px}
[data-library-status]{color:var(--vn-shell-muted,#b4c1d4);margin:8px 0;overflow-wrap:anywhere}[data-grid]{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}[data-image-card]{display:flex;flex-direction:column;padding:0;text-align:left;overflow:hidden;min-width:0}[data-image-card] img{width:100%;height:160px;object-fit:contain;background:#0003}[data-image-card] .missing{display:grid;place-items:center;width:100%;height:160px;color:var(--vn-shell-muted,#b4c1d4)}.caption{padding:8px;overflow-wrap:anywhere}.caption strong{display:block}.caption small{display:block;font-size:11px;color:var(--vn-shell-muted,#b4c1d4)}footer{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid var(--vn-shell-border,#53647c)}[data-page-label]{color:var(--vn-shell-muted,#b4c1d4);font-size:12px}
[data-detail]{min-width:0}.viewer-tools{display:flex;gap:8px;justify-content:center;align-items:center;margin-bottom:8px}.viewer-tools button{min-width:44px}[data-image-viewport]{overflow:auto;overscroll-behavior:contain;max-height:55dvh;background:#0003;border-radius:8px}[data-full-image]{display:block;width:100%;max-height:55dvh;object-fit:contain;margin:auto}[data-excerpt]{overflow-wrap:anywhere;white-space:pre-wrap;margin:12px 0}[data-description]{color:var(--vn-shell-muted,#b4c1d4);overflow-wrap:anywhere}details{border-top:1px solid var(--vn-shell-border,#53647c);margin-top:10px}summary{min-height:44px;display:flex;align-items:center;cursor:pointer}textarea{width:100%;min-height:120px;background:var(--vn-shell-field,#182334);border:1px solid var(--vn-shell-border,#53647c);border-radius:8px;padding:8px;font:16px/1.5 ui-monospace,monospace;resize:vertical}.prompt-label{margin:10px 0}.note{color:var(--vn-shell-muted,#b4c1d4);font-size:12px} @media(max-width:480px){section{left:8px;right:8px}.body{padding:10px}.filters{grid-template-columns:1fr 1fr}.filters label:last-child{grid-column:1/-1}[data-library-launch]{right:12px}[data-grid]{grid-template-columns:repeat(2,minmax(0,1fr))}}
button{-webkit-tap-highlight-color:transparent}summary::before{content:'▸';margin-right:8px}details[open]>summary::before{content:'▾'}[data-template-query]{min-width:0;min-height:44px;width:100%;border:1px solid var(--vn-shell-border,#53647c);border-radius:8px;background:var(--vn-shell-field,#182334);padding:8px;color:inherit}

:host([data-open=true]){pointer-events:auto;background:#0005}
[data-history-views]{display:flex;gap:6px;margin:0 0 14px;padding:4px;border-radius:999px;background:rgba(0,0,0,.22);border:1px solid rgba(160,205,185,.25)}[data-history-view]{flex:1;border:0;background:transparent;border-radius:999px;padding:8px 16px;font-weight:650;font-size:12px;color:#a6bfae;cursor:pointer;transition:all .15s ease}[data-history-view][aria-pressed=true]{background:#dcebad;color:#0e1e18;box-shadow:0 2px 10px rgba(0,0,0,.3);font-weight:800}[data-history-return]{flex:none;margin:0 14px 12px;align-self:center;min-width:160px;border-radius:999px;font-weight:600}[data-grid][data-mode=story]{display:flex;flex-direction:column;gap:12px}[data-reply]{padding:16px 18px;border-radius:14px;background:rgba(18,38,30,.55);border:1px solid rgba(160,205,185,.22);border-left:3px solid #dcebad;box-shadow:0 4px 16px rgba(0,0,0,.25)}[data-reply] h3{display:inline-block;margin:0 0 6px;padding:2px 10px;border-radius:999px;background:rgba(220,238,173,.18);color:#dcebad;font-size:11px;font-weight:750;letter-spacing:.06em;text-transform:uppercase}[data-reply-preview]{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin:8px 0;line-height:1.68;font-family:Georgia,serif;font-size:14.5px;color:#f3f7ee}[data-reply] details{border:1px solid rgba(160,205,185,.18);border-radius:10px;padding:4px 12px;background:rgba(0,0,0,.22);margin:8px 0}[data-reply] details p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.72;font-family:Georgia,serif;font-size:14.5px;color:#f3f7ee}[data-reply] details strong{display:inline-block;padding:1px 8px;border-radius:999px;background:rgba(220,238,173,.15);font-size:11px;font-weight:700;color:#dcebad}[data-reply-pictures]{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:8px}[data-reply-pictures] img{height:180px;border-radius:6px}[data-image-card]{border-radius:12px;border:1px solid rgba(160,205,185,.2);background:rgba(18,38,30,.4);transition:transform .15s ease,border-color .15s ease}[data-image-card]:hover{transform:translateY(-2px);border-color:#dcebad}
`;

export type LibraryContext=Pick<TurnView,'chatId'|'messageId'|'swipeId'|'sourceFingerprint'|'revision'>|null;
export function sameLibraryContext(next:LibraryContext,previous:LibraryContext):boolean{
 if(next===previous)return true;
 if(!next||!previous)return false;
 return next.chatId===previous.chatId&&next.messageId===previous.messageId&&next.swipeId===previous.swipeId
  &&next.sourceFingerprint===previous.sourceFingerprint&&next.revision===previous.revision;
}

/** Read-only story image browser. Every response is tied to a fresh request and reading scope. */
export class ImageLibrary{
 private host:HTMLElement;private root:ShadowRoot;
 private context:Pick<TurnView,'chatId'|'messageId'|'swipeId'|'sourceFingerprint'|'revision'>|null=null;
 private cursor=0;private pending='';private timer:ReturnType<typeof setTimeout>|undefined;
 private page:ImageLibraryPage|null=null;private pages:string[]=['0:0'];private pageIndex=0;
 private expanded=new Set<string>();private browseScroll=0;
 private mode:'story'|'images'='images';private opener:HTMLElement|null=null;
 private selected:LibraryImageView|null=null;private zoom=1;private opened=false;
 private searchTimer:ReturnType<typeof setTimeout>|undefined;
 constructor(mount:HTMLElement,private send:(request:FrontendRequest)=>void,private onOpen:(open:boolean)=>void){
  this.host=document.createElement('div');this.host.dataset.imageLibrary='';this.root=this.host.attachShadow({mode:'open'});
  this.root.innerHTML=`<style>${css}</style><button type="button" data-library-launch title="Image library" aria-label="Open image library" aria-expanded="false" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 5-5 4 3 3-5 5 7"/></svg></button><section hidden role="dialog" aria-modal="true" aria-labelledby="library-title"><header><button type="button" data-detail-back hidden aria-label="Back to library" title="Back to library">‹</button><h2 id="library-title">Image library</h2><button type="button" data-library-close aria-label="Close image library" title="Close image library">×</button></header><div class="body"><div data-browse><div class="filters"><label>Story range<select data-range aria-label="Story range"><option value="read">Read so far</option><option value="all">All story images</option></select></label><label>Message versions<select data-versions aria-label="Message versions"><option value="active">Active story</option><option value="all">Include alternate versions</option></select></label><label>Sort<select data-order aria-label="Sort images"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div><label class="check"><input type="checkbox" data-replaced>Include replaced pictures</label><p class="note">Saved pictures from this chat. Viewing never generates an image. Older missing references cannot always be recovered.</p><div data-grid></div></div><div data-detail hidden><div class="viewer-tools"><button type="button" data-zoom-out aria-label="Zoom out" title="Zoom out">−</button><button type="button" data-fit>Fit</button><button type="button" data-zoom-in aria-label="Zoom in" title="Zoom in">+</button><span data-zoom-label>100%</span></div><div data-image-viewport><img data-full-image alt="Selected story image" data-zoom="1"></div><p data-description></p><p data-excerpt></p><details data-prompts><summary>Prompt details</summary><p class="note">Read-only saved wording. Older pictures may have no recorded request.</p><label class="prompt-label">Saved positive prompt<textarea data-positive aria-label="Saved positive prompt" readonly></textarea></label><label class="prompt-label">Saved negative prompt<textarea data-negative aria-label="Saved negative prompt" readonly></textarea></label><button type="button" data-copy>Copy prompt</button></details></div><p data-library-status role="status"></p><button type="button" data-retry hidden>Retry loading</button></div><footer data-library-footer><button type="button" data-page-prev>Previous page</button><span data-page-label>Page 1</span><button type="button" data-page-next>Next page</button></footer></section>`;
  const refresh=document.createElement('button');refresh.type='button';refresh.dataset.refresh='';refresh.textContent='↻';refresh.title='Refresh image library';refresh.setAttribute('aria-label','Refresh image library');this.el<HTMLElement>('header').insertBefore(refresh,this.el<HTMLElement>('[data-library-close]'));
  const filters=document.createElement('details');filters.innerHTML='<summary>Filters</summary><label>Picture type<select data-role aria-label="Picture type"><option value="all">All types</option><option value="scene">Scenes / pages</option><option value="background">Places</option><option value="portrait">Portraits</option></select></label><label class="check">Template name<input data-template-query aria-label="Template name contains" maxlength="64" type="search"></label>';
  this.el<HTMLElement>('[data-browse]').insertBefore(filters,this.el<HTMLElement>('[data-grid]'));
  for(const selector of ['.filters','[data-browse] > .check','[data-browse] > .note']){const control=this.el<HTMLElement>(selector);filters.insertBefore(control,filters.children[1]!);}
  const tabs=document.createElement('nav');tabs.dataset.historyViews='';tabs.setAttribute('aria-label','History views');
  for(const mode of ['story','images'] as const){const button=document.createElement('button');button.type='button';button.dataset.historyView=mode;button.textContent=mode==='story'?'Story':'Images';button.onclick=()=>{this.mode=mode;this.pages=['0:0'];this.pageIndex=0;this.load();};tabs.append(button);}
  this.el<HTMLElement>('[data-browse]').prepend(tabs);
  const returnButton=document.createElement('button');returnButton.type='button';returnButton.dataset.historyReturn='';returnButton.textContent='Back to reader';returnButton.onclick=()=>this.close();this.el<HTMLElement>('section').append(returnButton);
  const dockStyle=document.createElement("style");dockStyle.textContent=DOCKED_LIBRARY_CSS;this.root.append(dockStyle);
  mount.append(this.host);
  this.el<HTMLButtonElement>('[data-library-launch]').onclick=()=>this.open();
  this.el<HTMLButtonElement>('[data-library-close]').onclick=()=>this.close();
  this.el<HTMLButtonElement>('[data-detail-back]').onclick=()=>this.back();
  for(const selector of ['[data-range]','[data-versions]','[data-order]','[data-replaced]','[data-role]'])this.el<HTMLElement>(selector).onchange=()=>{this.pages=['0:0'];this.pageIndex=0;this.load();};
  refresh.onclick=()=>{this.pages=['0:0'];this.pageIndex=0;this.load();};
  this.el<HTMLInputElement>('[data-template-query]').oninput=()=>{clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>{this.pages=['0:0'];this.pageIndex=0;this.load();},300);};
  this.el<HTMLButtonElement>('[data-page-next]').onclick=()=>{if(!this.page?.nextCursor||this.pending)return;this.pages[++this.pageIndex]=this.page.nextCursor;this.load();};
  this.el<HTMLButtonElement>('[data-page-prev]').onclick=()=>{if(this.pageIndex===0||this.pending)return;this.pageIndex--;this.load();};
  this.el<HTMLButtonElement>('[data-retry]').onclick=()=>this.load();
  this.el<HTMLButtonElement>('[data-zoom-in]').onclick=()=>this.setZoom(Math.min(4,this.zoom+.25));
  this.el<HTMLButtonElement>('[data-zoom-out]').onclick=()=>this.setZoom(Math.max(1,this.zoom-.25));
  this.el<HTMLButtonElement>('[data-fit]').onclick=()=>this.setZoom(1);
  this.el<HTMLButtonElement>('[data-copy]').onclick=async()=>{
   if(!this.selected?.prompt)return;
   try{await navigator.clipboard.writeText(`${this.selected.prompt}${this.selected.negativePrompt?'\n\nNegative prompt:\n'+this.selected.negativePrompt:''}`);this.status('Prompt copied.');}
   catch{this.status('Clipboard unavailable. Select the saved wording to copy it.');}
  };
  this.el<HTMLImageElement>('[data-full-image]').onerror=()=>{if(this.selected)this.status('This image could not be loaded. Its saved reference may no longer be available.');};
  for(const type of ['click','pointerdown','pointerup','touchstart','touchend','wheel','keydown'])this.root.addEventListener(type,event=>event.stopPropagation());
  this.root.addEventListener('keydown',event=>{
   const e=event as KeyboardEvent;
   if(e.key==='Escape'){e.preventDefault();this.selected?this.back():this.close();}
   if(this.selected&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!(e.target instanceof HTMLTextAreaElement)){
    const entries=this.page?.entries??[];const idx=entries.findIndex(item=>item.imageId===this.selected?.imageId&&item.paragraphIndex===this.selected?.paragraphIndex&&JSON.stringify(item.key)===JSON.stringify(this.selected?.key));
    const next=idx>=0?entries[idx+(e.key==='ArrowRight'?1:-1)]:undefined;
    if(next){e.preventDefault();this.view(next);}
   }
   if(e.key==='Tab'&&this.opened){    const focusable=[...this.el<HTMLElement>('section').querySelectorAll<HTMLElement>('button:not(:disabled),select,input,summary,textarea')].filter(el=>el.getClientRects().length);
    const first=focusable[0],last=focusable.at(-1);
    if(e.shiftKey&&this.root.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&this.root.activeElement===last){e.preventDefault();first?.focus();}
   }
  });
 }
 useHistoryEntry(){this.mode='story';this.el<HTMLElement>('[data-library-launch]').hidden=true;this.el<HTMLElement>('h2').textContent='History';this.el<HTMLElement>('[data-browse] .note').textContent='Saved replies and pictures from this chat. Browsing never generates images.';this.el<HTMLElement>('[data-library-close]').setAttribute('aria-label','Close history');this.el<HTMLElement>('[data-library-close]').title='Close history';this.el<HTMLElement>('[data-refresh]').setAttribute('aria-label','Refresh history');this.el<HTMLElement>('[data-refresh]').title='Refresh history';this.el<HTMLElement>('[data-detail-back]').setAttribute('aria-label','Back to history');this.el<HTMLElement>('[data-detail-back]').title='Back to history';}
 private el<T extends HTMLElement>(selector:string):T{return this.root.querySelector<T>(selector)!;}
 private status(text:string){this.el<HTMLElement>('[data-library-status]').textContent=text;}
 setContext(turn:TurnView|null,cursor:number){
  const next=turn?{chatId:turn.chatId,messageId:turn.messageId,swipeId:turn.swipeId,sourceFingerprint:turn.sourceFingerprint,revision:turn.revision}:null;
  // F13: five primitive field comparisons instead of two JSON.stringify walks
  // on every turn/asset stream update.
  const changed=!sameLibraryContext(next,this.context)||cursor!==this.cursor;
  this.context=next;this.cursor=cursor;this.el<HTMLButtonElement>('[data-library-launch]').disabled=!next;
  if(!next){this.close();return;}
  if(changed){this.expanded.clear();this.cancel();this.page=null;this.pages=['0:0'];this.pageIndex=0;if(this.opened)this.load();}
 }
 getElement():HTMLElement{return this.host;}
 isOpen():boolean{return this.opened;}
 openWorkspace():void{this.open(this.mode);}
 backWithinWorkspace():boolean{if(!this.selected)return false;this.back();return true;}
 setDocked():void{this.el('section').removeAttribute('aria-modal');}
 private cancel(cancelSearch=true){clearTimeout(this.timer);if(cancelSearch)clearTimeout(this.searchTimer);this.pending='';}
 open(mode: 'story'|'images' = 'images', opener?:HTMLElement){if(!this.context)return;this.mode=mode;this.opener=opener??null;this.opener?.setAttribute('aria-expanded','true');this.pages=['0:0'];this.pageIndex=0;if(!this.context)return;this.opened=true;this.host.dataset.open='true';this.el<HTMLElement>('section').hidden=false;this.el<HTMLElement>('[data-library-launch]').setAttribute('aria-expanded','true');this.onOpen(true);this.load();this.el<HTMLButtonElement>('[data-library-close]').focus();}
 close(){this.opener?.setAttribute('aria-expanded','false');delete this.host.dataset.open;this.cancel();this.selected=null;this.el<HTMLImageElement>('[data-full-image]').removeAttribute('src');this.el<HTMLElement>('section').hidden=true;this.el<HTMLElement>('[data-library-launch]').setAttribute('aria-expanded','false');if(this.opened){this.opened=false;this.onOpen(false);(this.opener??this.el<HTMLButtonElement>('[data-library-launch]')).focus();}}
 private load(){
  if(!this.context||!this.opened)return;this.cancel();this.page=null;this.back(false);this.el<HTMLElement>('[data-grid]').replaceChildren();this.status(this.mode==='story'?'Loading story history…':'Loading saved pictures…');this.el<HTMLElement>('[data-retry]').hidden=true;
  const requestId=createUiId();this.pending=requestId;
  const request:ImageLibraryRequest={type:'vn_image_library',mode:this.mode,chatId:this.context.chatId,requestId,anchor:{messageId:this.context.messageId,swipeId:this.context.swipeId,sourceFingerprint:this.context.sourceFingerprint,paragraphIndex:this.cursor},range:this.el<HTMLSelectElement>('[data-range]').value as 'read'|'all',versions:this.el<HTMLSelectElement>('[data-versions]').value as 'active'|'all',includeReplaced:this.el<HTMLInputElement>('[data-replaced]').checked,order:this.el<HTMLSelectElement>('[data-order]').value as 'newest'|'oldest',role:'all',templateQuery:'',...(this.pages[this.pageIndex]!=='0:0'?{cursor:this.pages[this.pageIndex]}:{})};
  request.role=this.el<HTMLSelectElement>('[data-role]').value as 'all'|'scene'|'background'|'portrait';request.templateQuery=this.el<HTMLInputElement>('[data-template-query]').value.trim();
  this.timer=setTimeout(()=>this.error(this.context?.chatId??'',requestId,'Loading timed out. You can retry.'),15000);this.updatePaging();
  try{this.send(request);}catch(error){this.error(request.chatId,requestId,error instanceof Error?error.message:String(error));}
 }
 receive(chatId:string,requestId:string,input:unknown){
  if(!this.opened||chatId!==this.context?.chatId||requestId!==this.pending)return;
  const parsed=ImageLibraryPageSchema.safeParse(input);if(!parsed.success){this.error(chatId,requestId,'The library response could not be read.');return;}
  if([...parsed.data.entries,...parsed.data.replies].some(e=>e.key.chatId!==chatId)){this.error(chatId,requestId,'The library response belongs to a different chat.');return;}
  this.cancel(false);this.page=parsed.data;this.render();
 }
 error(chatId:string,requestId:string|undefined,message:string){if(!this.opened||chatId!==this.context?.chatId||requestId!==this.pending)return;this.cancel(false);this.status(message);this.el<HTMLElement>('[data-retry]').hidden=false;this.updatePaging();}
 private updatePaging(){this.el<HTMLButtonElement>('[data-page-prev]').disabled=!!this.pending||this.pageIndex===0;this.el<HTMLButtonElement>('[data-page-next]').disabled=!!this.pending||!this.page?.nextCursor;this.el<HTMLElement>('[data-page-label]').textContent=`Page ${this.pageIndex+1}`;}
 private render(){
  const grid=this.el<HTMLElement>('[data-grid]');grid.replaceChildren();grid.dataset.mode=this.mode;
  this.el<HTMLOptionElement>('[data-range] option[value=all]').textContent=this.mode==='story'?'All saved replies':'All story images';
  for(const tab of this.root.querySelectorAll<HTMLElement>('[data-history-view]'))tab.setAttribute('aria-pressed',String(tab.dataset.historyView===this.mode));
  const buildCard=(entryIndex:number,entry:LibraryImageView):HTMLButtonElement=>{
   const button=document.createElement('button');button.type='button';button.dataset.imageCard='';button.dataset.entryIndex=String(entryIndex);button.dataset.replyKey=JSON.stringify(entry.key);button.setAttribute('aria-label',`View ${entry.template??'picture'}, message ${entry.key.assistantMessageId}, paragraph ${entry.paragraphIndex+1}`);
   if(entry.thumbnailUrl){const image=document.createElement('img');image.src=entry.thumbnailUrl;image.alt='';image.loading='lazy';image.decoding='async';image.onerror=()=>{image.remove();const missing=document.createElement('span');missing.className='missing';missing.textContent='Image unavailable';button.prepend(missing);};button.append(image);}
   else{const missing=document.createElement('span');missing.className='missing';missing.textContent='Image unavailable';button.append(missing);}
   const caption=document.createElement('span');caption.className='caption';const title=document.createElement('strong');title.textContent=entry.template??(entry.role==='portrait'?'Portrait':entry.role==='background'?'Place':'Story picture');const detail=document.createElement('small');detail.textContent=`Picture ${entry.paragraphIndex+1} · ${entry.versionLabel}`;caption.append(title,detail);button.append(caption);button.onclick=()=>this.view(entry);
   return button;
  };
  if(this.mode==='story'&&this.page?.replies.length){
   const cardsByReplyKey=new Map<string,HTMLButtonElement[]>();
   const allCards:HTMLButtonElement[]=[];
   for(const [entryIndex,entry] of (this.page?.entries??[]).entries()){
    const card=buildCard(entryIndex,entry);allCards.push(card);
    const key=card.dataset.replyKey!;
    const bucket=cardsByReplyKey.get(key);if(bucket)bucket.push(card);else cardsByReplyKey.set(key,[card]);   }
   for(const reply of this.page.replies){
    const row=document.createElement('article');row.dataset.reply='';
    const title=document.createElement('h3');title.textContent=`Reply ${reply.messageNumber}${reply.versionLabel==='alternate'?' · alternate version':''}`;row.append(title);
    const summary=document.createElement('p');summary.dataset.replyPreview='';summary.textContent=reply.paragraphs[0]?.text??'No text at this reading position.';row.append(summary);
    const details=document.createElement('details');const toggle=document.createElement('summary');toggle.textContent='Read reply';details.append(toggle);const replyKey=JSON.stringify(reply.key);details.open=this.expanded.has(replyKey);details.ontoggle=()=>{if(details.open)this.expanded.add(replyKey);else this.expanded.delete(replyKey);};
    for(const paragraph of reply.paragraphs){const name=document.createElement('strong');name.textContent=paragraph.speaker;const text=document.createElement('p');text.textContent=paragraph.text;details.append(name,text);}
    if(reply.truncated){const note=document.createElement('p');note.className='note';note.textContent='Long reply preview shortened. Read the complete reply in chat.';details.append(note);}
    row.append(details);const pictures=document.createElement('div');pictures.dataset.replyPictures='';
    for(const card of cardsByReplyKey.get(replyKey)??[])pictures.append(card);    if(pictures.childElementCount)row.append(pictures);grid.append(row);
   }
   // Archived pictures without this exact reply snapshot retain their own excerpt.
   // Never imply that a newer edit/replan generated an older picture.
   const versions=new Map<string,HTMLElement>();
   for(const card of allCards){if(card.parentElement)continue;const entry=this.page.entries[Number(card.dataset.entryIndex)];if(!entry)continue;
    let row=versions.get(card.dataset.replyKey!);if(!row){row=document.createElement('article');row.dataset.historyVersion='';const title=document.createElement('h3');title.textContent=`Reply ${entry.messageNumber} · saved image version`;const note=document.createElement('p');note.className='note';note.textContent='Only the original saved image excerpt is available for this version.';row.append(title,note);versions.set(card.dataset.replyKey!,row);grid.append(row);}
    const excerpt=document.createElement('p');excerpt.dataset.replyPreview='';excerpt.textContent=entry.excerpt||'Original excerpt not recorded.';row.append(excerpt,card);
   }
  }else{
   let lastMessage='';
   for(const [entryIndex,entry] of (this.page?.entries??[]).entries()){
    if(entry.key.assistantMessageId!==lastMessage){lastMessage=entry.key.assistantMessageId;const heading=document.createElement('h3');heading.textContent=`Reply ${entry.messageNumber}`;heading.style.cssText='grid-column:1/-1;margin:8px 0 0;font-size:14px';grid.append(heading);}
    grid.append(buildCard(entryIndex,entry));
   }
  }
  this.status(`${(this.page?.entries.length||this.page?.replies.length)?'':this.page?.nextCursor?'No matching pictures in this batch. Continue to the next page.':this.mode==='story'?'No saved replies match these filters.':'No saved pictures match these filters.'} ${this.page?.notice??''}`.trim());this.updatePaging();
 }
 private view(entry:LibraryImageView){
  this.browseScroll=this.el<HTMLElement>('.body').scrollTop;this.selected=entry;this.el<HTMLElement>('[data-browse]').hidden=true;this.el<HTMLElement>('[data-detail]').hidden=false;this.el<HTMLElement>('[data-detail-back]').hidden=false;this.el<HTMLElement>('[data-library-footer]').hidden=true;
  const image=this.el<HTMLImageElement>('[data-full-image]');image.removeAttribute('src');image.hidden=!entry.imageUrl;if(entry.imageUrl)image.src=entry.imageUrl;
  this.el<HTMLElement>('[data-description]').textContent=`Reply ${entry.messageNumber} · Picture ${entry.paragraphIndex+1} · ${entry.template??'Story picture'} · ${entry.versionLabel} · ${entry.model??'Model not recorded'}${entry.provider?' · '+entry.provider:''}`;
  this.el<HTMLElement>('[data-excerpt]').textContent=entry.excerpt||'Source excerpt not recorded.';
  this.el<HTMLTextAreaElement>('[data-positive]').value=entry.prompt??'Prompt not recorded for this picture.';this.el<HTMLTextAreaElement>('[data-negative]').value=entry.negativePrompt??'Negative prompt not recorded.';this.el<HTMLButtonElement>('[data-copy]').disabled=!entry.prompt;this.el<HTMLDetailsElement>('[data-prompts]').open=false;
  this.status(entry.available?'':'This picture is no longer available. Saved details remain readable.');this.setZoom(1);this.el<HTMLButtonElement>('[data-detail-back]').focus();
 }
 private setZoom(value:number){this.zoom=value;const image=this.el<HTMLImageElement>('[data-full-image]');image.dataset.zoom=String(value);image.style.width=`${value*100}%`;image.style.maxHeight=value===1?'55dvh':'none';this.el<HTMLElement>('[data-zoom-label]').textContent=`${Math.round(value*100)}%`;if(value===1){const viewport=this.el<HTMLElement>('[data-image-viewport]');viewport.scrollTop=0;viewport.scrollLeft=0;}}
 private back(focus=true){this.selected=null;this.el<HTMLImageElement>('[data-full-image]').removeAttribute('src');this.el<HTMLElement>('[data-browse]').hidden=false;this.el<HTMLElement>('[data-detail]').hidden=true;this.el<HTMLElement>('[data-detail-back]').hidden=true;this.el<HTMLElement>('[data-library-footer]').hidden=false;if(focus)this.el<HTMLButtonElement>(this.host.dataset.vnWorkspaceTool?'[data-history-views] button':'[data-library-close]').focus();if(this.page)this.render();if(focus)this.el<HTMLElement>('.body').scrollTop=this.browseScroll;}
 destroy(){this.close();this.host.remove();}
}

const DOCKED_LIBRARY_CSS=`
:host([data-vn-workspace-tool]){position:relative;inset:auto;display:block;width:100%;height:100%;z-index:auto;pointer-events:auto;background:transparent}
:host([data-vn-workspace-tool]) [data-library-launch],:host([data-vn-workspace-tool]) [data-library-close],:host([data-vn-workspace-tool]) [data-history-return]{display:none}
:host([data-vn-workspace-tool]) section{position:relative;inset:auto;width:100%;max-width:none;height:100%;max-height:none;margin:0;border:0;border-radius:0;box-shadow:none;background:transparent}
:host([data-vn-workspace-tool]) header{display:none!important}
:host([data-vn-workspace-tool]) footer[data-library-footer]{margin-bottom:calc(76px + env(safe-area-inset-bottom, 0px))!important;background:transparent!important;border-top:1px solid rgba(160,205,185,.2)!important;padding:12px 16px!important}
:host([data-vn-workspace-tool]) footer[data-library-footer] button{min-height:38px;border-radius:999px;padding:6px 16px;background:rgba(22,46,36,.8);border:1px solid rgba(160,205,185,.25);color:#f4f7ee;font-weight:650;font-size:12px}
:host([data-vn-workspace-tool]) footer[data-library-footer] button:hover:not(:disabled){background:rgba(35,75,57,.9);border-color:#dcebad}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-history-views]{background:rgba(35,65,50,.1);border:1px solid rgba(35,65,50,.18)}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-history-view]{color:#244636!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-history-view][aria-pressed=true]{background:#234b39!important;color:#fbfdf7!important;box-shadow:0 2px 8px rgba(35,65,50,.2)}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-reply]{background:#e3ebd9!important;border:1px solid #b6ccbc!important;border-left:4px solid #234b39!important;box-shadow:0 4px 14px rgba(23,43,33,.08)!important;color:#172721!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-reply] h3{background:rgba(35,75,57,.14)!important;color:#234b39!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-reply-preview],:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-reply] details p{color:#172721!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-reply] details{background:#f2f7ec!important;border-color:#b8cdbe!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-reply] details strong{background:rgba(35,75,57,.12)!important;color:#234b39!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) footer[data-library-footer] button{background:#e4ebe0!important;border-color:#b3c5b8!important;color:#1a3327!important}
:is(:host-context(body.theme-light),:host-context([data-aperture-mode="light"]),:host([data-aperture-mode="light"])) [data-page-label]{color:#3b5d4c!important;font-weight:650!important}
:host([data-vn-workspace-tool]) header h2{font-size:13px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;color:#dcebad}
:host([data-vn-workspace-tool]) .body{padding:16px;flex:1}
:host([data-vn-workspace-tool]) .filters{grid-template-columns:1fr}
:host([data-vn-workspace-tool]) [data-grid]{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
:host([data-vn-workspace-tool]) [data-detail-back]{font-size:24px}
`;
