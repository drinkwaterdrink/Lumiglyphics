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
[data-vn-preparation-preview]{position:absolute;inset:auto 1rem max(1rem,env(safe-area-inset-bottom));z-index:25;max-width:64rem;margin-inline:auto;color:var(--vn-text);font-family:var(--vn-font-family)}
[data-preview-sheet]{border:1px solid var(--vn-dialogue-border);border-radius:1rem;background:var(--vn-dialogue-bg);box-shadow:0 12px 40px #0005;backdrop-filter:blur(16px);padding:1rem}
[data-preview-sheet] header,[data-preview-sheet] footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
[data-preview-sheet] header{padding-bottom:.6rem;border-bottom:1px solid var(--vn-dialogue-border)}
[data-preview-sheet] small{display:block;color:var(--vn-muted-text);font-size:.8rem;margin-top:.25rem;line-height:1.4}
[data-preview-text]{font-size:calc(var(--vn-dialogue-font-size)*var(--vn-text-scale,1));line-height:1.65;max-height:35dvh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:.8rem 0}
[data-vn-preparation-preview] button{min-width:44px;min-height:44px;border:1px solid var(--vn-dialogue-border);border-radius:.65rem;background:transparent;color:inherit;cursor:pointer;font:inherit;touch-action:manipulation}
[data-preview-sheet] nav{display:flex;gap:.5rem}[data-preview-progress]{font-size:.85rem;color:var(--vn-muted-text)}
[data-vn-preparation-preview] button:disabled{opacity:.4;cursor:default}[data-vn-preparation-preview] :focus-visible{outline:2px solid var(--vn-accent);outline-offset:3px}
[data-preview-restore]{background:var(--vn-dialogue-bg)!important;padding:.5rem .9rem}[data-vn-preparation-preview] [hidden]{display:none!important}
@media(max-width:480px){[data-vn-preparation-preview]{inset-inline:.65rem}[data-preview-sheet]{padding:.8rem}}
`;
