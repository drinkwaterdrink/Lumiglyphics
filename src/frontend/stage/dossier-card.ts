import {createDocumentReader,DOCUMENT_READER_CSS} from './document-reader.js';
import type {StoryDocument} from '../../shared/story-documents.js';
import {InteractionTray} from './interaction-tray.js';
import type {InteractionDraft,DraftMergeMode} from '../../shared/scene-interactions.js';
import {entityOverride,type ReferenceKind,type referenceEntries,type ReaderDossier,type TooltipPreferences} from '../../shared/dossiers.js';
import {referenceFieldInfo,REFERENCE_FIELD_GROUPS} from '../../shared/reference-fields.js';
export class DossierCard {
 readonly host=document.createElement('div');private returnFocus:HTMLElement|null=null;private trayReturn:(()=>void)|null=null;private query='';private category:ReferenceKind='all';
 constructor(mount:HTMLElement,private closeCallback:()=>void,private update:(entity:ReaderDossier['entity'],patch:{suppressed?:boolean;pinned?:boolean;note?:string})=>boolean,private documentState:(open:boolean)=>void=()=>{}) {
  this.host.dataset.vnDossier='';this.host.hidden=true;
  this.host.addEventListener('click',event=>{event.stopPropagation();if(event.target===this.host)this.close();});
  this.host.addEventListener('pointerdown',event=>event.stopPropagation());
  this.host.addEventListener('wheel',event=>event.stopPropagation());
  this.host.addEventListener('keydown',event=>{
   event.stopPropagation();
   if(event.key==='Escape'){event.preventDefault();this.close();}
   if(event.key==='Tab') {
    const focusable=[...this.host.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,[tabindex]')].filter(e=>e.getClientRects().length>0&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY')&&(e.tabIndex>=0||e.tagName==='SUMMARY')&&!e.hasAttribute('disabled'));
    const current=this.host.getRootNode() as ShadowRoot;
    const index=focusable.indexOf(current.activeElement as HTMLElement);
    if(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===focusable.length-1){event.preventDefault();(event.shiftKey?focusable.at(-1):focusable[0])?.focus();}
   }
  });
  mount.append(this.host);
 }
 isOpen():boolean{return !this.host.hidden;}
 open(dossier:ReaderDossier,prefs:TooltipPreferences,chatId:string,trigger:HTMLElement,actions?:{drafts:InteractionDraft[];current:()=>string;apply:(draft:InteractionDraft,mode:DraftMergeMode)=>boolean;focus:()=>void},storyDocument?:StoryDocument):void {
  this.documentState(false);this.returnFocus=trigger;this.host.replaceChildren();
  const panel=document.createElement('section');panel.dataset.vnDossierCard='';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',`About ${dossier.entity.name}`);
  const header=document.createElement('header'),title=document.createElement('h2');title.textContent=dossier.entity.name;
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close information');close.onclick=()=>this.close();header.append(title,close);panel.append(header);
  if(this.trayReturn){const back=document.createElement('button');back.type='button';back.textContent='‹';back.title='Back to references';back.setAttribute('aria-label','Back to references');back.onclick=()=>this.trayReturn?.();header.insertBefore(back,title);}
  const type=document.createElement('small');type.dataset.referenceKind='';type.textContent=`${dossier.entity.kind==='npc'?'Character':dossier.entity.kind==='place'?'Location':'Item'} · Established story information`;panel.append(type);
  const facts=dossier.facts.filter(f=>f.value.trim()&&prefs.fieldGroups[referenceFieldInfo(f.field).section]!==false);
  const lasting=facts.filter(f=>!referenceFieldInfo(f.field).living);
  const overview=lasting.filter(f=>['overview','identity'].includes(referenceFieldInfo(f.field).section)).slice(0,2);
  if(!overview.length&&lasting.length)overview.push(lasting[0]!);
  const appendFact=(list:HTMLElement,field:string,value:string)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=referenceFieldInfo(field).label;dd.textContent=value;list.append(dt,dd);};
  if(overview.length){const section=document.createElement('section'),list=document.createElement('dl');section.dataset.referenceOverview='';for(const fact of overview)appendFact(list,fact.field,fact.value);section.append(list);panel.append(section);}
  const current=new Map<string,string>();
  for(const fact of facts)if(referenceFieldInfo(fact.field).living)current.set(fact.field,fact.value);
  // Timeline state and extractive observations have independent provenance.
  // Without a state timestamp we cannot decide which conflicting value is newer.
  const observations=facts.filter(f=>referenceFieldInfo(f.field).living&&dossier.state[f.field]?.trim()&&dossier.state[f.field]!==f.value);
  for(const [field,value] of Object.entries(dossier.state))if(value.trim()&&prefs.fieldGroups.state!==false&&prefs.fieldGroups[referenceFieldInfo(field).section]!==false)current.set(field,value);
  if(current.size){const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');section.dataset.referenceCurrent='';heading.textContent=observations.length?'Tracked scene state':'Current state';for(const [field,value] of current)appendFact(list,field,value);section.append(heading,list);panel.append(section);}
  if(observations.length){const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');section.dataset.referenceObservations='';heading.textContent='Story observations';for(const fact of observations){appendFact(list,fact.field,fact.value);const label=list.lastElementChild?.previousElementSibling;if(label&&fact.revealedAt)label.textContent+=` · paragraph ${fact.revealedAt.paragraphIndex+1}`;}section.append(heading,list);panel.append(section);}
  for(const group of REFERENCE_FIELD_GROUPS){const grouped=lasting.filter(f=>referenceFieldInfo(f.field).section===group.id&&!overview.includes(f));if(!grouped.length)continue;
   const section=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('dl');section.dataset.referenceSection=group.id;summary.textContent=group.label;for(const fact of grouped)appendFact(list,fact.field,fact.value);section.append(summary,list);panel.append(section);
  }
  if(!facts.length&&!current.size){const p=document.createElement('p');p.dataset.referenceEmpty='';p.textContent='No additional information is available with these display settings.';panel.append(p);}
  if(facts.length){const sources=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');sources.dataset.referenceSources='';summary.textContent='Sources';
   for(const fact of facts){const item=document.createElement('li');item.textContent=`${referenceFieldInfo(fact.field).label} · ${fact.source.provider}${fact.revealedAt?` · revealed paragraph ${fact.revealedAt.paragraphIndex+1}`:''}`;list.append(item);}sources.append(summary,list);panel.append(sources);
  }
  if(storyDocument){
   if(storyDocument.sections.length){
    const read=document.createElement('button');read.type='button';read.textContent='Read revealed text';read.dataset.vnReadDocument='';
    read.onclick=()=>{
     if(this.host.hidden||panel.parentElement!==this.host)return;
     const reader=createDocumentReader(storyDocument,()=>{if(this.host.hidden||reader.parentElement!==this.host)return;this.open(dossier,prefs,chatId,trigger,actions,storyDocument);this.host.querySelector<HTMLElement>('[data-vn-read-document]')?.focus();},()=>{if(!this.host.hidden&&reader.parentElement===this.host)this.close();});
     this.documentState(true);this.host.replaceChildren(reader);reader.querySelector<HTMLElement>('button')?.focus();
    };panel.append(read);
   }else{const missing=document.createElement('p');missing.textContent='No document text has been revealed. Examining the item is a story action; opening this card does not unlock it.';panel.append(missing);}
  }
  if(actions?.drafts.length)panel.append(new InteractionTray(actions.drafts,actions.current,(draft,mode)=>{if(!actions.apply(draft,mode))return false;this.close();actions.focus();return true;}).host);
  const override=entityOverride(prefs,chatId,dossier.entity);
  const status=document.createElement('p');status.setAttribute('role','status');status.hidden=true;panel.append(status);
  const commit=(patch:{suppressed?:boolean;pinned?:boolean;note?:string})=>{if(this.update(dossier.entity,patch))this.close();else{status.textContent='Reference customization limit reached (64). Reset local reference customizations in Reading settings to make room.';status.hidden=false;}};
  const localActions=document.createElement('div'),pin=document.createElement('button'),suppress=document.createElement('button');localActions.dataset.referenceActions='';
  pin.type=suppress.type='button';pin.textContent=override?.pinned?'Unpin':'Pin reference';pin.setAttribute('aria-pressed',String(override?.pinned===true));
  pin.onclick=()=>{commit({pinned:!override?.pinned});};
  suppress.textContent='Hide this reference';suppress.onclick=()=>{commit({suppressed:true});};localActions.append(pin,suppress);panel.append(localActions);
  const notes=document.createElement('details'),summary=document.createElement('summary');notes.dataset.referenceNotes='';summary.textContent='Local display note';
  const label=document.createElement('label');label.textContent='Your note (does not change the story)';const input=document.createElement('textarea');input.maxLength=600;input.value=override?.note??'';label.append(input);
  const save=document.createElement('button');save.type='button';save.textContent='Save note';save.onclick=()=>{commit({note:input.value});};notes.append(summary,label,save);panel.append(notes);
  if(override?.note){const p=document.createElement('p');p.textContent=`Your note: ${override.note}`;panel.append(p);}
  this.host.append(panel);this.host.hidden=false;close.focus();
 }
 openTray(entries:ReturnType<typeof referenceEntries>,trigger:HTMLElement,open:(id:string,trigger:HTMLElement)=>void):void {
  this.documentState(false);if(!this.isOpen()){this.query='';this.category='all';}
  this.returnFocus=trigger;this.trayReturn=()=>this.openTray(entries,trigger,open);this.host.replaceChildren();const panel=document.createElement('section');panel.dataset.vnDossierCard='';panel.dataset.vnReferenceSheet='';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Scene references');
  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.textContent='Scene references';close.type='button';close.textContent='×';close.title='Close references';close.setAttribute('aria-label','Close information');close.onclick=()=>this.close();header.append(title,close);panel.append(header);
  const filters=document.createElement('div');filters.dataset.referenceFilters='';
  const search=document.createElement('input');search.type='search';search.maxLength=160;search.placeholder='Find a name…';search.setAttribute('aria-label','Search references');search.value=this.query;
  const category=document.createElement('select');category.setAttribute('aria-label','Reference category');
  for(const [value,label] of [['all','All references'],['npc','NPCs'],['place','Locations'],['object','Items']]){const option=document.createElement('option');option.value=value!;option.textContent=label!;category.append(option);}category.value=this.category;filters.append(search,category);panel.append(filters);
  const count=document.createElement('p');count.dataset.referenceCount='';count.setAttribute('role','status');const list=document.createElement('div');list.dataset.referenceList='';panel.append(count,list);
  const render=()=>{this.query=search.value;this.category=category.value as ReferenceKind;list.replaceChildren();
   const filtered=entries.filter(({entity})=>(this.category==='all'||entity.kind===this.category)&&(!this.query.trim()||[entity.name,...entity.aliases].some(name=>name.toLocaleLowerCase().includes(this.query.trim().toLocaleLowerCase()))));
   count.textContent=filtered.length?`${filtered.length} reference${filtered.length===1?'':'s'}`:'No references match. Try another name or category.';
   for(const {entity,pinned,label,current} of filtered){const button=document.createElement('button');button.type='button';button.dataset.referenceCurrent=String(current);button.setAttribute('aria-label',entity.name);button.setAttribute('aria-description',`${pinned?'Pinned. ':''}${label}`);const name=document.createElement('span');name.textContent=entity.name;const detail=document.createElement('small');detail.textContent=`${pinned?'Pinned · ':''}${entity.kind==='npc'?'Character':entity.kind==='place'?'Location':'Item'} · ${label}`;button.append(name,detail);button.onclick=()=>open(entity.id,trigger);list.append(button);}
  };
  search.oninput=render;category.onchange=render;render();this.host.append(panel);this.host.hidden=false;close.focus();
 }

 close():void{this.documentState(false);if(this.host.hidden)return;this.host.hidden=true;this.trayReturn=null;this.query='';this.category='all';const target=this.returnFocus;this.returnFocus=null;if(target?.isConnected)target.focus();else this.host.parentElement?.focus();this.closeCallback();}
 destroy():void{this.documentState(false);this.host.remove();}
}
export const DOSSIER_CSS=`
[data-vn-references][hidden]{display:none!important}
[data-vn-root] [data-vn-references]{min-width:44px!important;min-height:44px!important;width:44px;height:44px;padding:0!important;display:inline-flex;align-items:center;justify-content:center}
[data-vn-references] svg{width:20px;height:20px;display:block;flex:none}
[data-vn-root] [data-entity-anchor]{font:inherit;font-weight:650;color:inherit;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,transparent);border:0;border-bottom:1px dotted var(--vn-accent,#9ec6f0);border-radius:.2em;padding:0 .08em;cursor:pointer;text-align:inherit;display:inline;line-height:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}
[data-vn-root] [data-entity-anchor]:hover{background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 28%,transparent)}
[data-entity-anchor]:focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:3px}
[data-vn-dossier][hidden]{display:none!important}
[data-vn-dossier]{position:absolute;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:#0008;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box}
[data-vn-dossier-card]{box-sizing:border-box;width:min(100%,580px);max-height:min(82dvh,calc(100dvh - 32px));overflow:auto;overscroll-behavior:contain;padding:20px;border:1px solid var(--vn-panel-border,#666);border-radius:18px;background:var(--vn-panel-solid,#171b26);color:var(--vn-chrome-text,var(--vn-text,#eef1f7));box-shadow:0 12px 50px #0008;touch-action:pan-y;font:inherit;line-height:1.55;scroll-padding-top:76px}
[data-vn-dossier-card] header{position:sticky;top:-20px;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-4px 0 0;padding:4px 0 10px;background:var(--vn-panel-solid,#171b26);border-bottom:1px solid var(--vn-panel-border,#666)}
[data-vn-dossier-card] h2{flex:1;min-width:0;margin:0;font-size:1.2em;line-height:1.3;overflow-wrap:anywhere}
[data-vn-dossier-card] button{box-sizing:border-box;font:inherit;min-width:44px;min-height:44px;padding:8px 12px;margin:4px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;cursor:pointer;white-space:normal}
[data-vn-dossier-card] header button{flex:none;margin:0;width:44px;padding:6px;font-size:1.35em;line-height:1}
[data-reference-kind]{display:block;margin:12px 0;font-size:.75em;opacity:.8;line-height:1.5}
[data-vn-dossier-card] dl{margin:0}
[data-vn-dossier-card] dt{font-size:.76em;opacity:.8;margin-top:12px;line-height:1.4;font-weight:600}
[data-vn-dossier-card] dt:first-child{margin-top:0}
[data-vn-dossier-card] dd{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.65}
[data-reference-overview]{padding:14px 16px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 9%,transparent);border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 26%,transparent);border-radius:12px;margin:12px 0 16px}
section[data-reference-current],section[data-reference-observations]{margin:16px 0;padding:0 0 16px;border-bottom:1px solid var(--vn-panel-border,#666)}
section[data-reference-current] h3,section[data-reference-observations] h3{font-size:.85em;letter-spacing:.02em;margin:0 0 12px}
[data-reference-section]{border-bottom:1px solid var(--vn-panel-border,#666)}
[data-reference-section] dl{padding:0 4px 16px}
[data-reference-sources]{font-size:.8em;margin:12px 0;opacity:.85}
[data-reference-sources] ul{list-style:none;margin:0;padding:0 0 12px;overflow-wrap:anywhere}
[data-reference-sources] li+li{margin-top:6px}
[data-reference-actions]{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--vn-panel-border,#666)}
[data-reference-actions] button{margin:0;flex:1}
[data-reference-notes] label{display:block;font-size:.85em}
[data-vn-dossier-card] textarea{display:block;box-sizing:border-box;width:100%;min-height:90px;margin:8px 0;font:inherit;color:inherit;background:#0002;border:1px solid var(--vn-panel-border,#666);border-radius:8px;padding:10px}
[data-vn-dossier-card] summary{box-sizing:border-box;cursor:pointer;min-height:44px;padding:12px 0;font-weight:600;line-height:1.4}
[data-reference-filters]{display:grid;grid-template-columns:minmax(0,1fr) minmax(100px,.65fr);gap:8px;margin:16px 0 8px}
[data-reference-filters] input,[data-reference-filters] select{box-sizing:border-box;min-width:0;width:100%;min-height:44px;font:inherit;font-size:16px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;padding:8px}
[data-vn-reference-sheet]{display:flex;flex-direction:column;overflow:hidden}
[data-vn-reference-sheet] header,[data-reference-filters],[data-reference-count]{flex:none}
[data-reference-list]{min-height:0;overflow:auto;overscroll-behavior:contain}
[data-reference-count]{font-size:.8em;opacity:.75;margin:8px 0}
[data-reference-list]{display:grid;gap:8px;padding:2px 2px 6px}[data-reference-list] button{display:flex;flex-direction:column;text-align:left;margin:0;min-width:0;overflow-wrap:anywhere;gap:4px;padding:12px 14px}[data-reference-list] button>span{font-weight:600}[data-reference-list] small{font-size:.75em;opacity:.8}[data-reference-list] [data-reference-current=true]{border-left:3px solid var(--vn-accent,#9ec6f0)}
[data-vn-dossier-card] :is(button,input,select,textarea,summary):focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
@media(min-width:700px){[data-vn-dossier]{align-items:center}}
@media(max-width:420px){[data-vn-dossier-card]{padding:16px;border-radius:14px}[data-vn-dossier-card] header{top:-16px}[data-reference-filters]{grid-template-columns:1fr}[data-reference-overview]{padding:12px}}
`+DOCUMENT_READER_CSS;
