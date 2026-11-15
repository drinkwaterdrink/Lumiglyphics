import {ImageVersionSchema,type ImageVersion} from '../../shared/image-version-history.js';
import type {AssetView} from '../../protocol.js';
import {sceneImageCandidatesFor,loadVnImageCandidates} from '../stage/image-loader.js';
export function comparisonVersions(value:unknown):ImageVersion[]{if(!Array.isArray(value))return [];const result:ImageVersion[]=[];const seen=new Set<string>();for(const entry of value.slice(-1000)){const parsed=ImageVersionSchema.safeParse(entry);if(parsed.success&&!seen.has(parsed.data.versionId)){seen.add(parsed.data.versionId);result.push(parsed.data);}}return result.slice(-50);}
/** Selection and slider have no transport callback. Restore remains a separate owner/action. */
export class VersionComparison {
 readonly element=document.createElement('details');private scope='';private signature='';private asset:AssetView|undefined;private versions:ImageVersion[]=[];private load:AbortController|null=null;private dragging=false;
 constructor(){
  this.element.dataset.versionComparison='';
  this.element.innerHTML='<summary>Compare saved artwork</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0"><label>Saved version<select data-compare-version aria-label="Saved version to compare"></select></label><label>Comparison view<select data-compare-mode aria-label="Comparison view"><option value="wipe">Split Curtain</option><option value="side">Side by side</option></select></label></div><div data-compare-images style="position:relative;height:260px;background:var(--vn-shell-field,#17212c);overflow:hidden;border-radius:10px;border:1px solid var(--edge,rgba(255,255,255,.15));touch-action:pan-y;user-select:none"><img data-compare-current alt="Current picture" hidden><img data-compare-saved alt="Saved version" hidden><span data-compare-badge-left style="position:absolute;top:8px;left:8px;z-index:4;padding:2px 8px;border-radius:999px;background:rgba(0,0,0,0.68);color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;pointer-events:none">SAVED</span><span data-compare-badge-right style="position:absolute;top:8px;right:8px;z-index:4;padding:2px 8px;border-radius:999px;background:rgba(0,0,0,0.68);color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;pointer-events:none">CURRENT</span><div data-compare-divider style="position:absolute;top:0;bottom:0;left:50%;width:2px;background:var(--accent,#dcebad);box-shadow:0 0 8px rgba(0,0,0,.6);z-index:5;cursor:ew-resize;transform:translateX(-1px)"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:999px;background:var(--accent,#dcebad);color:#0f2019;display:grid;place-items:center;font-size:13px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.45)">⇔</span></div></div><label data-compare-range-label>Drag curtain or slide to reveal saved version<input data-compare-range type="range" min="0" max="100" value="50" aria-label="Reveal saved version"></label><small data-compare-value>50%</small><p data-compare-status role="status"></p><small>Comparing never restores or generates an image. Use the separate Restore button to change the active picture.</small>';
  this.select.onchange=()=>{this.signature='';this.render();};
  this.element.addEventListener('toggle',()=>{if(this.element.open)this.render();else{this.load?.abort();this.load=null;this.signature='';}});
  this.element.querySelector<HTMLInputElement>('[data-compare-range]')!.oninput=()=>this.layout();
  this.element.querySelector<HTMLSelectElement>('[data-compare-mode]')!.onchange=()=>this.layout();
  const images = this.element.querySelector<HTMLElement>('[data-compare-images]');
  const updateFromPointer = (clientX: number) => {
   if (!images) return;
   const rect = typeof images.getBoundingClientRect === 'function' ? images.getBoundingClientRect() : null;
   if (!rect || rect.width <= 0) return;
   const pct = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
   const range = this.element.querySelector<HTMLInputElement>('[data-compare-range]');
   if (range) range.value = String(pct);
   this.layout();
  };
  images?.addEventListener('pointerdown', (e) => {
   if (this.element.querySelector<HTMLSelectElement>('[data-compare-mode]')?.value === 'side') return;
   this.dragging = true;
   const ev = e as PointerEvent;
   if (typeof ev.clientX === 'number') updateFromPointer(ev.clientX);
  });
  images?.addEventListener('pointermove', (e) => {
   if (!this.dragging) return;
   const ev = e as PointerEvent;
   if (typeof ev.clientX === 'number') updateFromPointer(ev.clientX);
  });
  images?.addEventListener('pointerup', () => { this.dragging = false; });
  images?.addEventListener('pointercancel', () => { this.dragging = false; });
  this.layout();
 }
 private get select():HTMLSelectElement{return this.element.querySelector('[data-compare-version]')!;}
 setContext(scope:string,asset:AssetView|undefined):void{if(scope!==this.scope){this.scope=scope;this.signature='';this.load?.abort();this.element.open=false;for(const image of this.element.querySelectorAll('img')){image.hidden=true;image.removeAttribute('src');}this.element.querySelector('[data-compare-status]')!.textContent='';}this.asset=asset;this.versions=comparisonVersions(asset?.previousVersions);const selected=this.select.value;this.select.replaceChildren(...this.versions.map((version,index)=>{const option=document.createElement('option');option.value=version.versionId;option.textContent=`Version ${index+1} · ${version.timestamp.slice(0,10)}`;return option;}));if(this.versions.some(v=>v.versionId===selected))this.select.value=selected;this.element.hidden=!this.versions.length;if(this.element.open)this.render();}
 private layout():void{
  const side=this.element.querySelector<HTMLSelectElement>('[data-compare-mode]')!.value==='side';
  const amount=this.element.querySelector<HTMLInputElement>('[data-compare-range]')!.value;
  const images=this.element.querySelector<HTMLElement>('[data-compare-images]')!;
  images.style.display=side?'grid':'block';
  images.style.gridTemplateColumns='1fr 1fr';
  const divider = this.element.querySelector<HTMLElement>('[data-compare-divider]');
  if (divider) {
   divider.hidden = side;
   divider.style.left = `${amount}%`;
  }
  const badgeLeft = this.element.querySelector<HTMLElement>('[data-compare-badge-left]');
  const badgeRight = this.element.querySelector<HTMLElement>('[data-compare-badge-right]');
  if (badgeLeft) badgeLeft.textContent = side ? 'CURRENT' : 'SAVED';
  if (badgeRight) badgeRight.textContent = side ? 'SAVED' : 'CURRENT';
  for(const [index,image] of Array.from(images.querySelectorAll('img')).entries()){
   image.style.cssText=`width:100%;height:260px;min-width:0;object-fit:contain;position:${side?'relative':'absolute'};inset:0;pointer-events:none;`;
   image.style.clipPath=!side&&index===1?`inset(0 ${100-Number(amount)}% 0 0)`:'none';
  }
  this.element.querySelector<HTMLElement>('[data-compare-range-label]')!.hidden=side;
  this.element.querySelector<HTMLElement>('[data-compare-value]')!.textContent=side?'Current | Saved':`${amount}% saved version`;
 }
 private render():void{const version=this.versions.find(v=>v.versionId===this.select.value),candidates=this.asset?sceneImageCandidatesFor(this.asset):[];const signature=JSON.stringify([this.scope,candidates,version?.versionId,version?.imageId,version?.imageUrl]);if(signature===this.signature)return;this.signature=signature;this.load?.abort();const controller=new AbortController();this.load=controller;const current=this.element.querySelector<HTMLImageElement>('[data-compare-current]')!,saved=this.element.querySelector<HTMLImageElement>('[data-compare-saved]')!,status=this.element.querySelector<HTMLElement>('[data-compare-status]')!;current.hidden=true;saved.hidden=true;current.removeAttribute('src');saved.removeAttribute('src');if(!version||!candidates.length){status.textContent='Comparison unavailable: both current and saved artwork are required.';return;}status.textContent='Loading comparison…';void Promise.all([loadVnImageCandidates(candidates,undefined,controller.signal),loadVnImageCandidates([`/api/v1/images/${encodeURIComponent(version.imageId)}`,version.imageUrl],undefined,controller.signal)]).then(([currentUrl,savedUrl])=>{if(controller.signal.aborted||this.load!==controller)return;current.src=currentUrl;saved.src=savedUrl;current.hidden=false;saved.hidden=false;status.textContent='Current picture and selected saved version. Both images fit within the same comparison area.';this.layout();}).catch(()=>{if(!controller.signal.aborted){status.textContent='Comparison unavailable: an image could not be loaded. The active picture is unchanged.';controller.abort();}});}
 destroy():void{this.load?.abort();this.element.remove();}
}
