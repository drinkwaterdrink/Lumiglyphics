import type {TurnKey} from '../../shared/contracts.js';
import type {SceneHistory} from '../../shared/scene-history.js';

export const historySourceLabel=(key:TurnKey)=>`Turn · Swipe ${typeof key.swipeId==='number'?key.swipeId+1:key.swipeId??'1'} · Rev ${key.revision}`;

/** Current reader only; a range previews selection, explicit buttons perform a validated seek. */
export class SceneScrubber {
 readonly element=document.createElement('div');
 private model:SceneHistory|null=null;
 private page=0;
 private token='';

 constructor(private readonly seek:(key:TurnKey,index:number)=>boolean){
  this.element.dataset.sceneScrubber='';
  this.element.setAttribute('aria-label','Revealed scene history');
 }

 setModel(model:SceneHistory|null,current:number):void{
  const token=model?JSON.stringify(model.key):'';
  if(token!==this.token)this.page=0;
  this.token=token;
  this.model=model;
  this.render(current);
 }

 private render(current:number):void{
  this.element.innerHTML=`<details data-scene-history-details style="margin-bottom:12px;border:1px solid rgba(134,219,178,.18);border-radius:10px;padding:8px 12px;background:rgba(0,0,0,.15)">
    <summary style="font-weight:700;font-size:13px;cursor:pointer;color:var(--vn-shell-accent,#86dbb2);display:flex;align-items:center;justify-content:space-between">
      <span>Scene Navigation &amp; Markers</span>
      <small data-scene-summary-tag style="opacity:0.75;font-weight:500;font-size:11px"></small>
    </summary>
    <div style="margin-top:10px">
      <p data-scene-source style="font-size:12px;opacity:0.8;margin:4px 0 8px"></p>
      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">
        Select revealed passage
        <input data-scene-range aria-label="Revealed passage" type="range" min="0" value="0" style="width:100%;min-height:36px;margin:4px 0">
      </label>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <output data-scene-selected style="font-size:12px;font-weight:600"></output>
        <button type="button" data-scene-seek style="min-height:32px;padding:4px 12px;font-size:12px;border-radius:6px">Read passage</button>
      </div>
      <p data-scene-history-note role="status" style="font-size:11px;opacity:0.7;margin:4px 0"></p>
      <div data-scene-events></div>
      <div data-scene-paging style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px">
        <button type="button" data-scene-prev style="min-height:30px;padding:2px 8px;font-size:11px">Previous markers</button>
        <small data-scene-page style="font-size:11px"></small>
        <button type="button" data-scene-next style="min-height:30px;padding:2px 8px;font-size:11px">Next markers</button>
      </div>
    </div>
  </details>`;

  const q=<T extends HTMLElement>(selector:string)=>this.element.querySelector<T>(selector)!;
  const model=this.model,range=q<HTMLInputElement>('[data-scene-range]'),jump=q<HTMLButtonElement>('[data-scene-seek]'),note=q('[data-scene-history-note]');

  q('[data-scene-source]').textContent=model?`Current reader · ${historySourceLabel(model.key)}`:'Current reader unavailable';
  range.max=String(Math.max(0,model?.through??0));
  range.value=String(Math.min(Math.max(0,current),model?.through??0));
  range.disabled=!model||model.through<0;
  jump.disabled=range.disabled;

  const selected=()=>{
    const text=range.disabled?'No revealed passages':`Passage ${Number(range.value)+1} of ${(model?.through??0)+1} revealed`;
    q('[data-scene-selected]').textContent=text;
    q('[data-scene-summary-tag]').textContent=text;
  };
  selected();
  range.oninput=selected;

  const read=(key:TurnKey,index:number)=>{
    if(!this.seek(key,index))note.textContent='This reading position changed. Reopen History for the current reply.';
  };
  jump.onclick=()=>{if(model&&!jump.disabled)read(model.key,Number(range.value));};

  note.textContent=model?.unavailable?'Scene and presence metadata are not established. Revealed passage navigation is still available.':model?.truncated?'Showing a bounded selection of recorded markers; the range still covers every revealed passage.':'Markers show recorded locations and presence, not inferred relationships.';

  const events=model?.events??[];
  this.page=Math.min(this.page,Math.max(0,Math.ceil(events.length/25)-1));
  for(const event of events.slice(this.page*25,(this.page+1)*25)){
    const button=document.createElement('button');
    button.type='button';
    button.dataset.sceneEvent=event.kind;
    button.textContent=`${event.paragraphIndex+1} · ${event.label}`;
    button.style.cssText='display:block;text-align:left;min-height:36px;width:100%;margin:4px 0;padding:6px 10px;font-size:12px;border-radius:6px;white-space:normal;overflow-wrap:anywhere';
    button.onclick=()=>read(event.key,event.paragraphIndex);
    q('[data-scene-events]').append(button);
  }
  if(!events.length){
    const empty=document.createElement('p');
    empty.style.cssText='font-size:12px;opacity:0.75;margin:4px 0';
    empty.textContent='No scene markers recorded at this passage.';
    q('[data-scene-events]').append(empty);
  }

  const previous=q<HTMLButtonElement>('[data-scene-prev]'),next=q<HTMLButtonElement>('[data-scene-next]'),paging=q<HTMLElement>('[data-scene-paging]');
  if(events.length<=25){
    paging.hidden=true;
  } else {
    paging.hidden=false;
    previous.disabled=this.page===0;
    next.disabled=(this.page+1)*25>=events.length;
    const focusPage=(preferred:string)=>{
      const control=this.element.querySelector<HTMLButtonElement>(preferred)!;
      (control.disabled?this.element.querySelector<HTMLButtonElement>(preferred==='[data-scene-next]'?'[data-scene-prev]':'[data-scene-next]'):control)?.focus();
    };
    previous.onclick=()=>{this.page--;this.render(current);focusPage('[data-scene-prev]');};
    next.onclick=()=>{this.page++;this.render(current);focusPage('[data-scene-next]');};
    q('[data-scene-page]').textContent=`Page ${this.page+1} of ${Math.max(1,Math.ceil(events.length/25))}`;
  }
 }

 clear():void{this.setModel(null,0);}
 destroy():void{this.model=null;this.element.remove();}
}
