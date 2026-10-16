import {createDocumentReader,DOCUMENT_READER_CSS} from './document-reader.js';
import type {StoryDocument} from '../../shared/story-documents.js';
import {InteractionTray} from './interaction-tray.js';
import type {InteractionDraft,DraftMergeMode} from '../../shared/scene-interactions.js';
import {entityOverride,type ReferenceKind,type referenceEntries,type ReaderDossier,type TooltipPreferences} from '../../shared/dossiers.js';
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
  const type=document.createElement('small');type.textContent=dossier.entity.kind==='npc'?'Character':dossier.entity.kind==='place'?'Location':'Item';panel.append(type);
  const list=document.createElement('dl');
  for(const fact of dossier.facts){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=fact.field;dd.textContent=fact.value;const source=document.createElement('small');source.textContent=`Source: ${fact.source.provider} · revealed paragraph ${(fact.revealedAt?.paragraphIndex??0)+1}`;dd.append(source);list.append(dt,dd);}
  for(const [field,value] of Object.entries(dossier.state)){if(dossier.facts.some(f=>f.field===field&&f.value===value))continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=field;dd.textContent=value;list.append(dt,dd);}
  if(!list.children.length){const p=document.createElement('p');p.textContent='No additional facts have been revealed yet.';panel.append(p);}else panel.append(list);
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
  const localActions=document.createElement('div'),pin=document.createElement('button'),suppress=document.createElement('button');
  pin.type=suppress.type='button';pin.textContent=override?.pinned?'Unpin':'Pin reference';pin.setAttribute('aria-pressed',String(override?.pinned===true));
  pin.onclick=()=>{commit({pinned:!override?.pinned});};
  suppress.textContent='Hide this reference';suppress.onclick=()=>{commit({suppressed:true});};localActions.append(pin,suppress);panel.append(localActions);
  const notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Local display note';
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
   for(const {entity,pinned,label} of filtered){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',entity.name);button.setAttribute('aria-description',`${pinned?'Pinned. ':''}${label}`);const name=document.createElement('span');name.textContent=entity.name;const detail=document.createElement('small');detail.textContent=`${pinned?'Pinned · ':''}${label}`;button.append(name,detail);button.onclick=()=>open(entity.id,trigger);list.append(button);}
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
[data-vn-dossier]{position:absolute;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:#0008;padding:16px;box-sizing:border-box}
[data-vn-dossier-card]{box-sizing:border-box;width:min(100%,540px);max-height:75dvh;overflow:auto;overscroll-behavior:contain;padding:20px;border:1px solid var(--vn-panel-border,#666);border-radius:18px;background:var(--vn-panel-solid,#171b26);color:var(--vn-chrome-text,var(--vn-text,#eef1f7));box-shadow:0 12px 50px #0008;touch-action:pan-y;font:inherit}
[data-vn-dossier-card] header{display:flex;align-items:center;justify-content:space-between;gap:12px}
[data-vn-dossier-card] h2{margin:0;font-size:1.2em;overflow-wrap:anywhere}
[data-vn-dossier-card] button{font:inherit;min-height:44px;padding:8px 12px;margin:4px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;cursor:pointer}
[data-vn-dossier-card] dt{text-transform:capitalize;font-size:.8em;opacity:.72;margin-top:12px}
[data-vn-dossier-card] dd{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap}
[data-vn-dossier-card] dd small{display:block;font-size:.72em;opacity:.65;margin-top:5px}
[data-vn-dossier-card] textarea{display:block;box-sizing:border-box;width:100%;min-height:90px;margin:8px 0;font:inherit;color:inherit;background:#0002;border:1px solid var(--vn-panel-border,#666);border-radius:8px;padding:10px}
[data-vn-dossier-card] summary{cursor:pointer;padding:12px 0}
[data-reference-filters]{display:grid;grid-template-columns:minmax(0,1fr) minmax(100px,.65fr);gap:8px;margin:16px 0 8px}
[data-reference-filters] input,[data-reference-filters] select{box-sizing:border-box;min-width:0;width:100%;min-height:44px;font:inherit;font-size:16px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;padding:8px}
[data-vn-reference-sheet]{display:flex;flex-direction:column;overflow:hidden}
[data-vn-reference-sheet] header,[data-reference-filters],[data-reference-count]{flex:none}
[data-reference-list]{min-height:0;overflow:auto;overscroll-behavior:contain}
[data-reference-count]{font-size:.8em;opacity:.75;margin:8px 0}
[data-reference-list]{display:grid;gap:6px}[data-reference-list] button{display:flex;flex-direction:column;text-align:left;margin:0;min-width:0;overflow-wrap:anywhere;gap:3px}[data-reference-list] small{font-size:.75em;opacity:.75}
[data-vn-dossier-card] :is(button,input,select,textarea):focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
@media(min-width:700px){[data-vn-dossier]{align-items:center}}
`+DOCUMENT_READER_CSS;
