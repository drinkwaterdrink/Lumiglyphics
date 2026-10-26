import type {AssetView,TurnView} from '../../protocol.js';
import {selectCastComposition,type CastPortrait} from '../../shared/cast-composition.js';
import {preloadAndDecodeVnImage,type VnImageFactory} from './image-loader.js';
const CSS=`
[data-vn-cast]{position:absolute;z-index:28;inset:var(--vn-cast-top,5rem) 1rem auto;pointer-events:none;display:grid;gap:.6rem;justify-items:center}
[data-vn-cast][hidden]{display:none}
[data-vn-cast][data-collapsed=true]{position:absolute;top:calc(14px + env(safe-area-inset-top, 0px));right:calc(192px + env(safe-area-inset-right, 0px));inset:calc(14px + env(safe-area-inset-top, 0px)) calc(192px + env(safe-area-inset-right, 0px)) auto auto;z-index:36;pointer-events:auto;display:block}
[data-vn-cast-portraits]{position:relative;display:flex;gap:.75rem;justify-content:center;max-width:100%;width:min(100%,700px)}
[data-vn-cast-card]{position:relative;margin:0;flex:1 1 0;min-width:0;max-width:320px;overflow:visible;border:none;background:transparent;box-shadow:none;transition:transform 220ms cubic-bezier(.2,.8,.2,1),opacity 220ms ease,filter 220ms ease}
[data-vn-cast-card][data-active=true]{transform:translateY(-6px);filter:drop-shadow(0 0 16px rgba(220,238,173,0.35))}
[data-vn-cast-portraits]:has([data-vn-cast-card][data-active=true]) [data-vn-cast-card][data-active=false]{opacity:.86;filter:brightness(.88) saturate(.92)}
@media(prefers-reduced-motion:reduce){[data-vn-cast-card]{transition:none}[data-vn-cast-card][data-active=true]{transform:none}}
[data-vn-cast-card] img{display:block;width:100%;height:min(clamp(80px,36vh,360px),var(--vn-cast-height,360px));object-fit:contain;background:transparent;filter:drop-shadow(0 14px 28px rgba(0,0,0,0.65))}
[data-vn-cast-placeholder]{height:min(clamp(80px,32vh,320px),var(--vn-cast-height,320px));display:grid;place-content:center;text-align:center;padding:.5rem;box-sizing:border-box;color:#dcebad;background:rgba(11,23,19,0.7);border-radius:12px;font-size:.8rem}
[data-vn-cast-card] figcaption{color:#f4f7ee;font-size:.78rem;font-weight:700;letter-spacing:0.02em;text-align:center;padding:4px 12px;margin:8px auto 0;box-sizing:border-box;height:auto;min-height:28px;width:fit-content;max-width:90%;display:flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(11,23,19,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(220,238,217,0.22);box-shadow:0 4px 12px rgba(0,0,0,0.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-vn-cast-toggle]{pointer-events:auto;min-width:44px;min-height:44px;box-sizing:border-box;font:inherit;cursor:pointer}
[data-vn-cast-toggle=hide]{position:absolute;top:4px;right:4px;inset:4px 4px auto auto;width:44px;height:44px;min-width:44px;min-height:44px;border:none;background:transparent;color:#f4f7ee;cursor:pointer;display:grid;place-items:center;padding:0;z-index:10}
[data-vn-cast-toggle=hide]::before{content:"";position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(11,23,19,0.78);border:1px solid rgba(220,238,217,0.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:background 160ms ease,transform 160ms ease}
[data-vn-cast-toggle=hide]:hover::before{background:rgba(35,75,57,0.92);transform:scale(1.1)}
[data-vn-cast-toggle=hide] svg{position:relative;z-index:1;width:13px;height:13px}
[data-vn-cast-toggle=show]{width:36px;height:36px;min-width:36px;min-height:36px;padding:0;border-radius:50%;border:1px solid rgba(245,249,240,0.34);background:rgba(5,15,19,0.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:inset 0 1px rgba(255,255,255,0.08),0 4px 12px rgba(0,0,0,0.15);display:grid;place-items:center;color:#f7f9f3;cursor:pointer;transition:transform 0.16s ease,background 0.16s ease}
[data-vn-cast-toggle=show]:hover{background:rgba(21,36,42,0.75);transform:translateY(-1px)}
[data-vn-cast-toggle]:focus-visible{outline:2px solid var(--vn-accent,#dcebad);outline-offset:2px}
[data-vn-cast-toggle=hide]:focus-visible{outline-offset:-3px}
[data-vn-cast-tray]{display:flex;flex-wrap:wrap;justify-content:center;gap:.35rem;max-height:5.5rem;overflow:auto;pointer-events:auto}
[data-vn-cast-tray] button{min-height:38px;padding:.35rem .7rem;border:1px solid rgba(220,238,217,0.25);border-radius:999px;background:rgba(11,23,19,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#f4f7ee;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer}
@media(max-height:500px){[data-vn-cast]{inset:var(--vn-cast-top,4rem) 1rem auto}[data-vn-cast-card] img,[data-vn-cast-placeholder]{height:min(clamp(60px,23vh,120px),var(--vn-cast-height,120px))}}
`;
/** Reuses ready art only. No transparent-cutout assumption, storage or provider calls. */
export class CastStage {
 private host=document.createElement('section');private style=document.createElement('style');private enabled=false;private collapsed=false;
 private turn:TurnView|null=null;private index=0;private selected='';private scope='';private epoch=0;private signature='';private structureSignature='';private fitFrame=0;private disposed=false;private observer:ResizeObserver|null=null;
 constructor(private root:HTMLElement,private createImage?:VnImageFactory){this.style.textContent=CSS;this.host.dataset.vnCast='';this.host.hidden=true;this.host.setAttribute('aria-label','Scene cast');root.append(this.style,this.host);}
 setEnabled(enabled:boolean):void{
  if(enabled&&!this.enabled)this.collapsed=false;
  this.enabled=enabled;
  if(enabled&&!this.observer&&typeof ResizeObserver!=='undefined'){
   this.observer=new ResizeObserver(()=>{if(this.fitFrame)return;if(typeof requestAnimationFrame==='function')this.fitFrame=requestAnimationFrame(()=>{this.fitFrame=0;this.fit();});else this.fit();});this.observer.observe(this.root);
   const dialogue=this.root.querySelector('[data-vn-dialogue]');if(dialogue)this.observer.observe(dialogue);
  }else if(!enabled){this.observer?.disconnect();this.observer=null;}
  this.refresh();
 }
 toggle():void{this.collapsed=!this.collapsed;this.refresh();}
 set(turn:TurnView|null,index:number):AssetView|null{this.turn=turn;this.index=index;return this.refresh();}
 private refresh():AssetView|null{
  const rootNode = typeof this.host.getRootNode === 'function' ? this.host.getRootNode() : this.host.ownerDocument;
  const active = (rootNode as Document | ShadowRoot | null)?.activeElement ?? null;
  const keepFocus=Boolean(active&&this.host.contains(active)&&active.hasAttribute('data-vn-cast-toggle'));
  let composition=this.enabled&&this.turn?selectCastComposition(this.turn,this.index,this.selected):null;
  if(!composition){this.clearDisplay();return null;}
  if(composition.scope!==this.scope){this.selected='';this.host.replaceChildren();this.scope=composition.scope;this.structureSignature='';composition=selectCastComposition(this.turn!,this.index)!;}
  const signature=JSON.stringify([composition.scope,composition.portraits,composition.otherCast,this.collapsed]);
  if(signature===this.signature)return composition.background;
  const structureSignature=JSON.stringify([composition.scope,composition.portraits.map(p=>[p.name,p.asset?.imageId??null,p.asset?.imageUrl??null,p.asset?.stageAsset?.attire??null]),composition.otherCast.map(p=>p.name),this.collapsed]);
  this.signature=signature;
  if(structureSignature===this.structureSignature&&!this.collapsed){
   this.syncActiveSpeaker(composition.portraits);
   return composition.background;
  }
  this.structureSignature=structureSignature;const epoch=++this.epoch;this.host.hidden=false;
  this.host.dataset.collapsed=String(this.collapsed);
  if(this.collapsed){this.host.replaceChildren(this.toggleButton('show'));this.fit();if(keepFocus)this.host.querySelector<HTMLButtonElement>('[data-vn-cast-toggle]')?.focus({preventScroll:true});return composition.background;}
  const portraits=document.createElement('div');portraits.dataset.vnCastPortraits='';
  for(const portrait of composition.portraits)this.renderPortrait(portraits,portrait,epoch);
  portraits.lastElementChild?.append(this.toggleButton('hide'));
  const tray=document.createElement('nav');tray.dataset.vnCastTray='';tray.setAttribute('aria-label','Other scene portraits');
  for(const portrait of composition.otherCast){const button=document.createElement('button');button.type='button';button.textContent=portrait.name;button.title=`Show ${portrait.name}`;button.setAttribute("aria-label",button.title);button.onclick=e=>{e.stopPropagation();this.selected=portrait.name;this.refresh();};tray.append(button);}
  this.host.replaceChildren(portraits,tray);this.fit();if(keepFocus)this.host.querySelector<HTMLButtonElement>('[data-vn-cast-toggle]')?.focus({preventScroll:true});return composition.background;
 }
 private syncActiveSpeaker(portraits:readonly CastPortrait[]):void{
  const cards=[...this.host.querySelectorAll<HTMLElement>('[data-vn-cast-card]')];
  for(const [index,portrait] of portraits.entries()){
   const card=cards[index];if(!card)continue;
   card.dataset.active=String(portrait.active);
   const label=card.querySelector('figcaption');
   if(label){
    const toggle=label.querySelector('[data-vn-cast-toggle]');
    label.textContent=portrait.name+(portrait.active?' · speaking':'');
    if(toggle)label.append(toggle);
   }
  }
 }
 private toggleButton(action:'show'|'hide'):HTMLButtonElement {
  const button=document.createElement('button');button.type='button';button.dataset.vnCastToggle=action;button.title=action==='hide'?'Hide cast portraits':'Show cast portraits';button.setAttribute('aria-label',button.title);
  if(action==='hide'){
   button.innerHTML='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  } else {
   button.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg>';
  }
  button.onkeydown=e=>e.stopPropagation();
  button.onclick=e=>{e.preventDefault();e.stopPropagation();this.collapsed=action==='hide';this.refresh();this.host.querySelector<HTMLButtonElement>('[data-vn-cast-toggle]')?.focus({preventScroll:true});};
  return button;
 }
 private renderPortrait(parent:HTMLElement,portrait:CastPortrait,epoch:number):void{
  const existingCards=[...this.host.querySelectorAll<HTMLElement>('[data-vn-cast-card]')];
  const exactOld=existingCards.find(c=>c.dataset.vnCastIdentity===JSON.stringify([portrait.name,portrait.asset?.stageAsset?.attire??null]));
  const sameCharOld=existingCards.find(c=>c.dataset.vnCastCharacter===portrait.name);
  const prior=(exactOld??sameCharOld)?.querySelector('img');
  const card=document.createElement('figure');card.dataset.vnCastCard='';card.dataset.vnCastCharacter=portrait.name;card.dataset.vnCastIdentity=JSON.stringify([portrait.name,portrait.asset?.stageAsset?.attire??null]);card.dataset.active=String(portrait.active);
  const placeholder=document.createElement('div');placeholder.dataset.vnCastPlaceholder='';placeholder.textContent=portrait.asset?'Loading portrait…':'Portrait unavailable';
  const label=document.createElement('figcaption');label.textContent=portrait.name+(portrait.active?' · speaking':'');card.append(prior&&portrait.asset?prior.cloneNode(true):placeholder,label);parent.append(card);
  const url=portrait.asset?.imageUrl;if(!url)return;
  void preloadAndDecodeVnImage(url,this.createImage).then(()=>{
   if(this.disposed||epoch!==this.epoch||!card.isConnected)return;
   const image=document.createElement('img');image.alt=`Portrait of ${portrait.name}`;image.src=url;const content=card.firstElementChild;content?.replaceWith(image);
  }).catch(()=>{if(!this.disposed&&epoch===this.epoch){placeholder.textContent='Portrait unavailable';card.firstElementChild?.replaceWith(placeholder);}});
 }
 private fit():void{
  if(!this.signature||this.disposed)return;
  this.host.style.removeProperty('--vn-cast-top');this.host.hidden=false;
  const root=this.root.getBoundingClientRect(),host=this.host.getBoundingClientRect();
  const dialogue=this.root.querySelector<HTMLElement>('[data-vn-dialogue]');
  const scale=root.width/this.root.clientWidth||1;
  const bottom=dialogue&&dialogue.getClientRects().length?dialogue.getBoundingClientRect().top:root.bottom;
  if(this.collapsed){this.host.style.removeProperty('--vn-cast-top');this.host.hidden=false;return;}
  const tray=this.host.querySelector<HTMLElement>('[data-vn-cast-tray]');
  const room=(bottom-host.top)/scale-64-(tray?.getBoundingClientRect().height??0)/scale;
  this.host.hidden=room<32;
  this.host.style.setProperty('--vn-cast-height',`${Math.max(32,room)}px`);
 }
 private clearDisplay():void{this.epoch++;this.signature='';this.structureSignature='';this.scope='';this.selected='';this.host.hidden=true;this.host.replaceChildren();}
 destroy():void{this.disposed=true;if(this.fitFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.fitFrame);this.observer?.disconnect();this.clearDisplay();this.host.remove();this.style.remove();}
}
