import type {TurnView} from '../../protocol.js';
import type {TurnKey} from '../../shared/contracts.js';
import type {SceneHistoryEvent} from '../../shared/scene-history.js';
import {turnHistoryKey} from '../../shared/scene-history.js';
import {relationshipObservations,type RelationshipObservation} from '../../shared/relationship-observations.js';
import {historySourceLabel} from './scene-scrubber.js';

/** Default-off derived view. It has no transport, persistence or canon mutation capability. */
export class RelationshipTracker {
 readonly element=document.createElement('div');
 private observations:RelationshipObservation[]=[];
 private presence:SceneHistoryEvent[]=[];
 private page=0;
 private presencePage=0;
 private token='';

 constructor(private readonly seek:(key:TurnKey,index:number)=>boolean){
  this.element.dataset.relationshipTracker='';
  this.element.hidden=true;
  this.element.setAttribute('aria-label','Relationship and presence history');
 }

 disable():void{
  this.observations=[];
  this.presence=[];
  this.token='';
  this.page=0;
  this.presencePage=0;
  this.element.replaceChildren();
  this.element.hidden=true;
 }

 setContext(turn:TurnView|null,index:number,enabled:boolean,events:SceneHistoryEvent[]):void{
  if(!enabled||!turn){this.disable();return;}
  const key=turnHistoryKey(turn),token=JSON.stringify([key,index]);
  if(this.token!==token){this.page=0;this.presencePage=0;}
  this.token=token;
  this.observations=relationshipObservations(turn,index,true);
  this.presence=events.filter(event=>event.paragraphIndex<=index);
  this.element.hidden=false;
  this.render();
 }

 private render():void{
  this.element.innerHTML=`<details data-relationship-details style="margin-bottom:12px;border:1px solid rgba(134,219,178,.18);border-radius:10px;padding:8px 12px;background:rgba(0,0,0,.15)">
    <summary style="font-weight:700;font-size:13px;cursor:pointer;color:var(--vn-shell-accent,#86dbb2);display:flex;align-items:center;justify-content:space-between">
      <span>Observed Relationships &amp; Notes</span>
      <small style="opacity:0.75;font-weight:500;font-size:11px">${this.observations.length} observed</small>
    </summary>
    <div style="margin-top:10px">
      <p style="font-size:11px;opacity:0.75;margin:2px 0 8px">Exact observed story quotes from visible passages.</p>
      <div data-relationship-statements></div>
      <nav data-rel-pages aria-label="Relationship statement pages"></nav>
      <details data-presence-history style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px">
        <summary style="font-size:12px;cursor:pointer;opacity:0.85">Presence &amp; location log (${this.presence.length})</summary>
        <div data-presence-events style="margin-top:6px"></div>
        <nav data-presence-pages aria-label="Presence history pages"></nav>
      </details>
    </div>
  </details>`;

  const quotes=this.element.querySelector<HTMLElement>('[data-relationship-statements]')!;
  for(const observation of this.observations.slice(this.page*10,(this.page+1)*10)){
    const row=document.createElement('article');
    row.dataset.relationshipScope=observation.provenance;
    row.style.cssText='padding:8px 10px;margin:6px 0;background:rgba(0,0,0,0.2);border-radius:8px;border-left:3px solid var(--vn-shell-accent,#86dbb2)';
    const title=document.createElement('strong');
    title.textContent=observation.subject;
    title.style.cssText='font-size:12px;color:var(--vn-shell-accent,#86dbb2)';
    const quote=document.createElement('blockquote');
    quote.textContent=observation.statement;
    quote.style.cssText='margin:4px 0;font-size:13px;font-style:italic;white-space:pre-wrap;overflow-wrap:anywhere';
    const source=document.createElement('small');
    source.style.cssText='display:block;opacity:0.7;font-size:11px';
    source.textContent=`${observation.provenance==='story'?'Current turn':`Earlier reply ${observation.replyNumber}`} · ${historySourceLabel(observation.key)} · Passage ${observation.paragraphIndex+1}`;
    row.append(title,quote,source);
    if(observation.provenance==='story'){
      const read=document.createElement('button');
      read.type='button';
      read.textContent='Read passage';
      read.style.cssText='margin-top:4px;min-height:28px;padding:2px 8px;font-size:11px;border-radius:4px';
      read.onclick=()=>this.seek(observation.key,observation.paragraphIndex);
      row.append(read);
    }
    quotes.append(row);
  }

  if(!this.observations.length){
    const empty=document.createElement('p');
    empty.dataset.relationshipUnknown='';
    empty.style.cssText='font-size:12px;opacity:0.7;margin:4px 0';
    empty.textContent='No explicit relationship statements observed at this passage.';
    quotes.append(empty);
  }

  const list=this.element.querySelector<HTMLElement>('[data-presence-events]')!;
  for(const event of this.presence.slice(this.presencePage*20,(this.presencePage+1)*20)){
    const p=document.createElement('p');
    p.style.cssText='font-size:11px;margin:3px 0;opacity:0.8';
    p.textContent=`Passage ${event.paragraphIndex+1} · ${event.label}`;
    list.append(p);
  }
  if(!this.presence.length){
    list.textContent='No presence events recorded.';
  }

  const pages=(selector:string,total:number,size:number,index:number,change:(page:number)=>void)=>{
    const host=this.element.querySelector<HTMLElement>(selector)!;
    if(total<=size){host.hidden=true;return;}
    host.hidden=false;
    const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('small');
    prev.type=next.type='button';
    prev.textContent='Previous';
    next.textContent='Next';
    prev.style.cssText=next.style.cssText='min-height:28px;padding:2px 8px;font-size:11px;border-radius:4px';
    prev.disabled=index===0;
    next.disabled=(index+1)*size>=total;
    label.textContent=`Page ${index+1} of ${Math.max(1,Math.ceil(total/size))}`;
    label.style.fontSize='11px';
    const move=(page:number,forward:boolean)=>{
      change(page);
      const buttons=this.element.querySelectorAll<HTMLButtonElement>(`${selector} button`),preferred=buttons[forward?1:0];
      (preferred?.disabled?buttons[forward?0:1]:preferred)?.focus();
    };
    prev.onclick=()=>move(index-1,false);
    next.onclick=()=>move(index+1,true);
    host.append(prev,label,next);
    host.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px';
  };

  pages('[data-rel-pages]',this.observations.length,10,this.page,page=>{this.page=page;this.render();});
  pages('[data-presence-pages]',this.presence.length,20,this.presencePage,page=>{this.presencePage=page;this.render();this.element.querySelector<HTMLDetailsElement>('[data-presence-history]')!.open=true;});
 }

 destroy():void{this.disable();this.element.remove();}
}
