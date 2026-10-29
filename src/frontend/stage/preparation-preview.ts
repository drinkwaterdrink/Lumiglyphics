import {type NarrativePreview,previewCursorForTurn} from '../../shared/preparation-preview.js';
import {formatDialogueText} from './rich-text.js';

/** A read-only temporary surface. It has no submission, audio, image or storage side effects. */
export class PreparationPreview {
 readonly host=document.createElement('section');
 private preview:NarrativePreview|null=null;
 private index=0;
 private collapsed=false;
 constructor(mount:HTMLElement){
  this.host.dataset.vnPreparationPreview='';this.host.hidden=true;this.host.setAttribute('aria-label','Read reply while preparing');
  this.host.innerHTML=`<button type="button" data-preview-restore hidden>Read reply while preparing</button><div data-preview-sheet><header><span><strong>Reply preview</strong><small>Pictures and references are still being prepared.</small></span><button type="button" data-preview-collapse aria-label="Hide reply preview" title="Hide reply preview">⌄</button></header><div data-preview-text tabindex="0" aria-label="Reply paragraph"></div><footer><span data-preview-progress></span><nav aria-label="Preview paragraphs"><button type="button" data-preview-previous aria-label="Previous preview paragraph">‹</button><button type="button" data-preview-next aria-label="Next preview paragraph">›</button></nav></footer></div>`;
  const style=document.createElement('style');style.textContent=PREVIEW_CSS;this.host.append(style);
  this.host.addEventListener('click',event=>{
   event.stopPropagation();const target=event.target as HTMLElement;
   if(target.closest('[data-preview-collapse]')){this.collapsed=true;this.render();}
   else if(target.closest('[data-preview-restore]')){this.collapsed=false;this.render();this.host.querySelector<HTMLElement>('[data-preview-text]')?.focus();}
   else if(target.closest('[data-preview-previous]'))this.move(-1);
   else if(target.closest('[data-preview-next]'))this.move(1);
  });
  this.host.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();this.move(event.key==='ArrowRight'?1:-1);}});
  for(const name of ['pointerdown','wheel'] as const)this.host.addEventListener(name,event=>event.stopPropagation());
  mount.append(this.host);
 }
 show(preview:NarrativePreview):void {
  const retained=this.preview?previewCursorForTurn(this.preview,this.index,preview):null;
  this.index=retained??0;this.preview=preview;if(retained===null)this.collapsed=false;this.host.querySelector('small')!.textContent='Pictures and references are still being prepared.';this.host.hidden=false;this.render();
 }
 cursorFor(turn:Pick<NarrativePreview,'chatId'|'messageId'|'swipeId'|'sourceFingerprint'|'paragraphs'>):number|null{return this.preview?previewCursorForTurn(this.preview,this.index,turn):null;}
 stopped():void{if(this.preview)this.host.querySelector('small')!.textContent='Preparation stopped. You can still read this reply.';}
  isActive(): boolean { return !this.host.hidden && this.preview !== null; }
 clear():void{this.host.hidden=true;if(!this.preview)return;this.preview=null;this.index=0;this.host.querySelector('[data-preview-text]')!.textContent='';}
 private move(delta:number):void{if(!this.preview)return;this.index=Math.max(0,Math.min(this.preview.paragraphs.length-1,this.index+delta));this.render();}
 private render():void{
  if(!this.preview)return;
  this.host.querySelector<HTMLElement>('[data-preview-sheet]')!.hidden=this.collapsed;
  this.host.querySelector<HTMLElement>('[data-preview-restore]')!.hidden=!this.collapsed;
  const body=this.host.querySelector<HTMLElement>('[data-preview-text]')!;
  // The same escaped Markdown renderer as the reader; preset tags are text, never executable HTML.
  body.innerHTML=formatDialogueText(this.preview.paragraphs[this.index]!);body.scrollTop=0;
  this.host.querySelector('[data-preview-progress]')!.textContent=`${this.index+1} / ${this.preview.paragraphs.length}`;
  this.host.querySelector<HTMLButtonElement>('[data-preview-previous]')!.disabled=this.index===0;
  this.host.querySelector<HTMLButtonElement>('[data-preview-next]')!.disabled=this.index===this.preview.paragraphs.length-1;
 }
}
const PREVIEW_CSS=`
[data-vn-preparation-preview]:not([hidden]){position:absolute;inset:auto 15px calc(96px + env(safe-area-inset-bottom, 0px));z-index:25;max-width:44rem;margin-inline:auto;color:var(--vn-shell-text, #f5f9f2);font-family:var(--vn-shell-family, inherit)}
[data-vn-preparation-preview][hidden]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
[data-preview-sheet]{border:1px solid var(--vn-shell-border, rgba(224, 238, 217, 0.32));border-radius:16px;background:var(--vn-shell-panel, rgba(4, 13, 17, 0.88));box-shadow:0 16px 48px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);padding:1rem 1.15rem}
[data-preview-sheet] header,[data-preview-sheet] footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
[data-preview-sheet] header{padding-bottom:.6rem;border-bottom:1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.12))}
[data-preview-sheet] small{display:block;color:var(--vn-shell-muted, #94a3b8);font-size:.78rem;margin-top:.2rem;line-height:1.4;font-family:system-ui,-apple-system,sans-serif}
[data-preview-text]{font-size:15px;line-height:1.65;max-height:35dvh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:.8rem 0;color:var(--vn-shell-text, #f9faf6)}
[data-vn-preparation-preview] button{min-width:36px;min-height:36px;border:1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14));border-radius:10px;background:rgba(255,255,255,0.06);color:var(--vn-shell-text, #eaf1e3);cursor:pointer;font:inherit;touch-action:manipulation;transition:background .15s ease,border-color .15s ease}
[data-vn-preparation-preview] button:hover:not(:disabled){background:rgba(255,255,255,0.12);border-color:var(--accent, #6366f1)}
[data-preview-sheet] nav{display:flex;gap:.5rem}[data-preview-progress]{font-size:.82rem;color:var(--vn-shell-muted, #94a3b8);font-family:system-ui,-apple-system,sans-serif}
[data-vn-preparation-preview] button:disabled{opacity:.35;cursor:default}[data-vn-preparation-preview] :focus-visible{outline:2px solid var(--accent, #6366f1);outline-offset:2px}
[data-preview-restore]{background:var(--vn-shell-panel, rgba(4,13,17,0.92))!important;border:1px solid var(--vn-shell-border, rgba(224,238,217,0.3))!important;border-radius:999px!important;padding:.5rem 1rem;font-size:12px;color:var(--vn-shell-text, #dcebad);backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,0.35)}[data-vn-preparation-preview] [hidden]{display:none!important}
@media(max-width:480px){[data-vn-preparation-preview]{inset-inline:.65rem}[data-preview-sheet]{padding:.8rem}}
`;
