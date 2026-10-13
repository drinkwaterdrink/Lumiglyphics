import type {AssetView,TurnView} from '../../protocol.js';
import {selectCastComposition,type CastPortrait} from '../../shared/cast-composition.js';
import {preloadAndDecodeVnImage,type VnImageFactory} from './image-loader.js';
const CSS=`
[data-vn-cast]{position:absolute;z-index:3;inset:5rem 1rem auto;pointer-events:none;display:grid;gap:.6rem;justify-items:center}
[data-vn-cast][hidden]{display:none}
[data-vn-cast-portraits]{display:flex;gap:.75rem;justify-content:center;max-width:100%;width:min(100%,700px)}
[data-vn-cast-card]{margin:0;flex:1 1 0;min-width:0;max-width:320px;overflow:hidden;border:1px solid var(--vn-dialogue-border);border-radius:.8rem;background:var(--vn-panel-solid);box-shadow:0 .4rem 1.5rem #0004}
[data-vn-cast-card][data-active=true]{border-color:var(--vn-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--vn-accent) 50%,transparent),0 .4rem 1.5rem #0004}
[data-vn-cast-card] img{display:block;width:100%;height:min(clamp(80px,32vh,320px),var(--vn-cast-height,320px));object-fit:contain;background:var(--vn-panel)}
[data-vn-cast-placeholder]{height:min(clamp(80px,32vh,320px),var(--vn-cast-height,320px));display:grid;place-content:center;text-align:center;padding:.5rem;box-sizing:border-box;color:var(--vn-muted);font-size:.8rem}
[data-vn-cast-card] figcaption{color:var(--vn-text);font-size:.8rem;font-weight:650;text-align:center;padding:.45rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-vn-cast-tray]{display:flex;flex-wrap:wrap;justify-content:center;gap:.35rem;max-height:5.5rem;overflow:auto;pointer-events:auto}
[data-vn-cast-tray] button{min-height:44px;padding:.4rem .7rem;border:1px solid var(--vn-dialogue-border);border-radius:.6rem;background:var(--vn-panel-solid);color:var(--vn-text);font:inherit;font-size:.8rem;cursor:pointer}
@media(max-height:500px){[data-vn-cast]{inset:4rem 1rem auto}[data-vn-cast-card] img,[data-vn-cast-placeholder]{height:min(clamp(60px,23vh,120px),var(--vn-cast-height,120px))}}
`;
/** Reuses ready art only. No transparent-cutout assumption, storage or provider calls. */
export class CastStage {
 private host=document.createElement('section');private style=document.createElement('style');private enabled=false;
 private turn:TurnView|null=null;private index=0;private selected='';private scope='';private epoch=0;private signature='';private disposed=false;private observer:ResizeObserver|null=null;
 constructor(private root:HTMLElement,private createImage?:VnImageFactory){this.style.textContent=CSS;this.host.dataset.vnCast='';this.host.hidden=true;this.host.setAttribute('aria-label','Scene cast');root.append(this.style,this.host);}
 setEnabled(enabled:boolean):void{
  this.enabled=enabled;
  if(enabled&&!this.observer&&typeof ResizeObserver!=='undefined'){
   this.observer=new ResizeObserver(()=>this.fit());this.observer.observe(this.root);
   const dialogue=this.root.querySelector('[data-vn-dialogue]');if(dialogue)this.observer.observe(dialogue);
  }else if(!enabled){this.observer?.disconnect();this.observer=null;}
  this.refresh();
 }
 set(turn:TurnView|null,index:number):AssetView|null{this.turn=turn;this.index=index;return this.refresh();}
 private refresh():AssetView|null{
  let composition=this.enabled&&this.turn?selectCastComposition(this.turn,this.index,this.selected):null;
  if(!composition){this.clearDisplay();return null;}
  if(composition.scope!==this.scope){this.selected='';this.host.replaceChildren();this.scope=composition.scope;composition=selectCastComposition(this.turn!,this.index)!;}
  const signature=JSON.stringify([composition.scope,composition.portraits,composition.otherCast]);
  if(signature===this.signature)return composition.background;
  this.signature=signature;const epoch=++this.epoch;this.host.hidden=false;
  const portraits=document.createElement('div');portraits.dataset.vnCastPortraits='';
  for(const portrait of composition.portraits)this.renderPortrait(portraits,portrait,epoch);
  const tray=document.createElement('nav');tray.dataset.vnCastTray='';tray.setAttribute('aria-label','Other scene portraits');
  for(const portrait of composition.otherCast){const button=document.createElement('button');button.type='button';button.textContent=portrait.name;button.title=`Show ${portrait.name}`;button.setAttribute("aria-label",button.title);button.onclick=e=>{e.stopPropagation();this.selected=portrait.name;this.refresh();};tray.append(button);}
  this.host.replaceChildren(portraits,tray);this.fit();return composition.background;
 }
 private renderPortrait(parent:HTMLElement,portrait:CastPortrait,epoch:number):void{
  const old=[...this.host.querySelectorAll<HTMLElement>('[data-vn-cast-card]')].find(c=>c.dataset.vnCastIdentity===JSON.stringify([portrait.name,portrait.asset?.stageAsset?.attire??null]));
  const prior=old?.querySelector('img');
  const card=document.createElement('figure');card.dataset.vnCastCard='';card.dataset.vnCastIdentity=JSON.stringify([portrait.name,portrait.asset?.stageAsset?.attire??null]);card.dataset.active=String(portrait.active);
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
  this.host.hidden=false;
  const root=this.root.getBoundingClientRect(),host=this.host.getBoundingClientRect();
  const dialogue=this.root.querySelector<HTMLElement>('[data-vn-dialogue]');
  const scale=root.width/this.root.clientWidth||1;
  const bottom=dialogue&&dialogue.getClientRects().length?dialogue.getBoundingClientRect().top:root.bottom;
  const tray=this.host.querySelector<HTMLElement>('[data-vn-cast-tray]');
  const room=(bottom-host.top)/scale-40-(tray?.getBoundingClientRect().height??0)/scale;
  this.host.hidden=room<32;
  this.host.style.setProperty('--vn-cast-height',`${Math.max(32,room)}px`);
 }
 private clearDisplay():void{this.epoch++;this.signature='';this.scope='';this.selected='';this.host.hidden=true;this.host.replaceChildren();}
 destroy():void{this.disposed=true;this.observer?.disconnect();this.clearDisplay();this.host.remove();this.style.remove();}
}
