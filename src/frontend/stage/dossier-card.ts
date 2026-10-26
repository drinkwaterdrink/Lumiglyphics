import {createDocumentReader,DOCUMENT_READER_CSS} from './document-reader.js';
import type {StoryDocument} from '../../shared/story-documents.js';
import {InteractionTray} from './interaction-tray.js';
import type {InteractionDraft,DraftMergeMode} from '../../shared/scene-interactions.js';
import {entityOverride,type ReferenceKind,type referenceEntries,type ReaderDossier,type TooltipPreferences} from '../../shared/dossiers.js';
import {referenceFieldInfo,REFERENCE_FIELD_GROUPS} from '../../shared/reference-fields.js';

export interface DossierVisualContext {
 imageUrl?: string;
 imageCaption?: string;
 isPresent?: boolean;
 isActiveLocation?: boolean;
 locationName?: string;
 presentCharacters?: Array<{ id: string; name: string }>;
 summarySnippet?: string;
 onSelectEntity?: (id: string, trigger: HTMLElement) => void;
}

function entityInitials(name: string): string {
 const parts = name.trim().split(/[\s·\-]+/).filter(Boolean);
 if (!parts.length) return '?';
 if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
 return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function fallbackSvgForKind(kind: 'npc' | 'place' | 'object', name: string): string {
 const initials = entityInitials(name).replace(/[<>&"']/g, '');
 if (kind === 'npc') {
  return `<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><defs><linearGradient id="vnNpcGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(158,198,240,0.32)"/><stop offset="100%" stop-color="rgba(20,26,42,0.92)"/></linearGradient></defs><rect width="120" height="140" rx="14" fill="url(#vnNpcGrad)"/><circle cx="60" cy="48" r="22" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/><path d="M24 126c4-24 20-38 36-38s32 14 36 38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/><text x="60" y="54" text-anchor="middle" fill="currentColor" font-size="16" font-weight="700" opacity="0.9">${initials}</text></svg>`;
 }
 if (kind === 'place') {
  return `<svg viewBox="0 0 320 130" aria-hidden="true" focusable="false"><defs><linearGradient id="vnPlaceGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(110,168,230,0.28)"/><stop offset="100%" stop-color="rgba(14,20,34,0.95)"/></linearGradient></defs><rect width="320" height="130" rx="14" fill="url(#vnPlaceGrad)"/><circle cx="256" cy="36" r="16" fill="rgba(255,230,170,0.22)"/><path d="M0 105 L68 58 L128 92 L198 44 L272 88 L320 64 L320 130 L0 130 Z" fill="rgba(255,255,255,0.1)"/><path d="M0 116 L96 74 L168 104 L244 66 L320 96 L320 130 L0 130 Z" fill="rgba(255,255,255,0.14)"/></svg>`;
 }
 return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><linearGradient id="vnItemGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(232,190,116,0.28)"/><stop offset="100%" stop-color="rgba(20,24,38,0.94)"/></linearGradient></defs><rect width="120" height="120" rx="14" fill="url(#vnItemGrad)"/><polygon points="60,20 94,60 60,100 26,60" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.34)" stroke-width="1.5"/><circle cx="60" cy="60" r="12" fill="rgba(255,255,255,0.2)"/></svg>`;
}

export class DossierCard {
 readonly host=document.createElement('div');private returnFocus:HTMLElement|null=null;private trayReturn:(()=>void)|null=null;private query='';private category:ReferenceKind='all';private scope='all';private returnLabel='Back to references';private noteDrafts=new Map<string,string>();
 constructor(mount:HTMLElement,private closeCallback:()=>void,private update:(entity:ReaderDossier['entity'],patch:{suppressed?:boolean;pinned?:boolean;note?:string})=>boolean,private documentState:(open:boolean)=>void=()=>{}) {
  this.host.dataset.vnDossier='';this.host.hidden=true;
  this.host.addEventListener('click',event=>{event.stopPropagation();if(event.target===this.host)this.close();});
  this.host.addEventListener('pointerdown',event=>event.stopPropagation());
  this.host.addEventListener('wheel',event=>event.stopPropagation());
  this.host.addEventListener('keydown',event=>{
   if(event.key!=='Tab'||!this.host.dataset.vnWorkspaceActive)event.stopPropagation();
   if(event.key==='Escape'){event.preventDefault();this.close();}
   if(event.key==='Tab'&&!this.host.dataset.vnWorkspaceActive) {
    const focusable=[...this.host.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,[tabindex]')].filter(e=>e.getClientRects().length>0&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY')&&(e.tabIndex>=0||e.tagName==='SUMMARY')&&!e.hasAttribute('disabled'));
    const current=this.host.getRootNode() as ShadowRoot;
    const index=focusable.indexOf(current.activeElement as HTMLElement);
    if(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===focusable.length-1){event.preventDefault();(event.shiftKey?focusable.at(-1):focusable[0])?.focus();}
   }
  });
  mount.append(this.host);
 }
 resetForContext():void{this.query='';this.category='all';this.scope='all';this.trayReturn=null;}
 clearBack():void{this.trayReturn=null;}
 setDocked():void {this.host.dataset.vnWorkspaceTool='story';}
 setWorkspaceActive(active:boolean):void {if(active)this.host.dataset.vnWorkspaceActive='';else delete this.host.dataset.vnWorkspaceActive;}
 back():boolean {
  const documentBack=this.host.querySelector<HTMLButtonElement>('[data-vn-document-reader] button[aria-label="Back to item"]');
  if(documentBack){documentBack.click();return true;}
  if(!this.host.querySelector('[data-vn-reference-sheet]')&&this.trayReturn){this.trayReturn();return true;}
  return false;
 }
 isOpen():boolean{return !this.host.hidden;}
 open(dossier:ReaderDossier,prefs:TooltipPreferences,chatId:string,trigger:HTMLElement,actions?:{drafts:InteractionDraft[];current:()=>string;apply:(draft:InteractionDraft,mode:DraftMergeMode)=>boolean;focus:()=>void},storyDocument?:StoryDocument,visual?:DossierVisualContext):void {
  this.documentState(false);this.returnFocus=trigger;this.host.replaceChildren();
  const kind=dossier.entity.kind;
  const panel=document.createElement('section');panel.dataset.vnDossierCard='';panel.dataset.dossierKind=kind;panel.setAttribute('role','dialog');if(!this.host.dataset.vnWorkspaceActive)panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',`About ${dossier.entity.name}`);  const header=document.createElement('header'),title=document.createElement('h2');title.textContent=dossier.entity.name;
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close information');close.onclick=()=>this.close();header.append(title,close);panel.append(header);
  if(this.trayReturn){const back=document.createElement('button');back.type='button';back.textContent='‹';back.title=this.returnLabel;back.setAttribute('aria-label',this.returnLabel);back.onclick=()=>this.trayReturn?.();header.insertBefore(back,title);}
  const override=entityOverride(prefs,chatId,dossier.entity);
  let currentPinned=override?.pinned===true;

  // Entity-specific Hero Visual Card (Character Portrait Sheet / Location Postcard / Artifact Showcase)
  const hero=document.createElement('div');hero.dataset.dossierHero=kind;
  const figure=document.createElement('figure');figure.dataset.dossierMedia=kind;
  if(visual?.imageUrl){
   figure.dataset.hasImage='true';
   const img=document.createElement('img');img.src=visual.imageUrl;img.alt=visual.imageCaption??dossier.entity.name;img.loading='eager';
   figure.append(img);
   if(visual.imageCaption){const cap=document.createElement('figcaption');cap.textContent=visual.imageCaption;figure.append(cap);}
   figure.title='Click to toggle full artwork view';
   figure.onclick=()=>{figure.dataset.expanded=figure.dataset.expanded==='true'?'false':'true';};
  }else{
   figure.dataset.hasImage='false';
   figure.innerHTML=fallbackSvgForKind(kind,dossier.entity.name);
  }
  const meta=document.createElement('div');meta.dataset.dossierIdentity='';
  const type=document.createElement('small');type.dataset.referenceKind='';
  type.textContent=`${kind==='npc'?'Character':kind==='place'?'Location':'Item'} · Established story information`;
  meta.append(type);
  if(dossier.entity.aliases.length){
   const aliases=document.createElement('div');aliases.dataset.dossierAliases='';
   aliases.textContent=`Also known as: ${dossier.entity.aliases.join(', ')}`;
   meta.append(aliases);
  }
  const badges=document.createElement('div');badges.dataset.dossierBadges='';
  const addBadge=(label:string,tone:string)=>{const b=document.createElement('span');b.dataset.dossierBadge=tone;b.textContent=label;badges.append(b);};
  if(kind==='place'){
   addBadge(visual?.isActiveLocation?'📍 Current scene location':'🗺️ Known location',visual?.isActiveLocation?'active':'muted');
  }else if(kind==='npc'){
   addBadge(visual?.isPresent?'● Present in scene':'○ Mentioned in story',visual?.isPresent?'active':'muted');
   if(visual?.locationName)addBadge(`📍 ${visual.locationName}`,'location');
  }else{
   addBadge(visual?.isPresent?'✦ In current scene':'✦ Story item',visual?.isPresent?'active':'muted');
   if(storyDocument?.sections.length)addBadge('📜 Readable document','location');
  }
  if(currentPinned)addBadge('📌 Pinned','pinned');
  meta.append(badges);
  hero.append(figure,meta);
  panel.append(hero);

  const facts=dossier.facts.filter(f=>f.value.trim()&&prefs.fieldGroups[referenceFieldInfo(f.field).section]!==false);
  const earlier=prefs.rememberReferences?(dossier.earlier??[]).filter(e=>prefs.fieldGroups[referenceFieldInfo(e.reference.field).section]!==false):[];
  const lasting=facts.filter(f=>!referenceFieldInfo(f.field).living);
  const overview=lasting.filter(f=>['overview','identity'].includes(referenceFieldInfo(f.field).section)).slice(0,2);
  if(!overview.length&&lasting.length)overview.push(lasting[0]!);
  const maxFactChars=Math.max(80,Math.min(1200,prefs.maxFactChars??320));
  const appendFact=(list:HTMLElement,field:string,value:string)=>{
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=referenceFieldInfo(field).label;
   if(value.length>maxFactChars){
    const span=document.createElement('span'),toggle=document.createElement('button');
    let expanded=false;span.textContent=`${value.slice(0,maxFactChars).trimEnd()}… `;
    toggle.type='button';toggle.dataset.factExpand='';toggle.textContent='Show full';
    toggle.onclick=()=>{expanded=!expanded;span.textContent=expanded?`${value} `:`${value.slice(0,maxFactChars).trimEnd()}… `;toggle.textContent=expanded?'Show less':'Show full';};
    dd.append(span,toggle);
   }else dd.textContent=value;
   list.append(dt,dd);
  };
  if(overview.length){const section=document.createElement('section'),list=document.createElement('dl');section.dataset.referenceOverview='';for(const fact of overview)appendFact(list,fact.field,fact.value);section.append(list);panel.append(section);}

  // For Location sheets, show Characters Present Here as clickable chips
  if(kind==='place'&&visual?.presentCharacters?.length&&visual.onSelectEntity){
   const castSection=document.createElement('section');castSection.dataset.dossierPresentCast='';
   const castHeading=document.createElement('h3');castHeading.textContent='Characters at this location';
   const castRow=document.createElement('div');castRow.dataset.dossierCastChips='';
   for(const char of visual.presentCharacters){
    const chip=document.createElement('button');chip.type='button';chip.dataset.dossierCastChip='';
    chip.textContent=`👤 ${char.name}`;
    chip.onclick=()=>{
     const prevReturn=this.trayReturn;
     this.trayReturn=()=>{this.trayReturn=prevReturn;this.open(dossier,prefs,chatId,trigger,actions,storyDocument,visual);};
     visual.onSelectEntity!(char.id,trigger);
    };
    castRow.append(chip);
   }
   castSection.append(castHeading,castRow);
   panel.append(castSection);
  }

  const overviewPairs=new Set(overview.map(f=>`${f.field}::${f.value.trim()}`));
  const current=new Map<string,string>();
  for(const fact of facts)if(referenceFieldInfo(fact.field).living&&!overviewPairs.has(`${fact.field}::${fact.value.trim()}`))current.set(fact.field,fact.value);
  // Timeline state and extractive observations have independent provenance.
  // Without a state timestamp we cannot decide which conflicting value is newer.
  const observations=facts.filter(f=>referenceFieldInfo(f.field).living&&dossier.state[f.field]?.trim()&&dossier.state[f.field]!==f.value);
  for(const [field,value] of Object.entries(dossier.state)){
   if(value.trim()&&!overviewPairs.has(`${field}::${value.trim()}`)&&prefs.fieldGroups.state!==false&&prefs.fieldGroups[referenceFieldInfo(field).section]!==false){
    current.set(field,value);
   }
  }
  if(current.size){const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');section.dataset.referenceCurrent='';heading.textContent=observations.length?'Tracked scene state':'Current state';for(const [field,value] of current)appendFact(list,field,value);section.append(heading,list);panel.append(section);}
  if(observations.length){const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');section.dataset.referenceObservations='';heading.textContent='Story observations';for(const fact of observations){appendFact(list,fact.field,fact.value);const label=list.lastElementChild?.previousElementSibling;if(label&&fact.revealedAt)label.textContent+=` · paragraph ${fact.revealedAt.paragraphIndex+1}`;}section.append(heading,list);panel.append(section);}
  for(const group of REFERENCE_FIELD_GROUPS){const grouped=lasting.filter(f=>referenceFieldInfo(f.field).section===group.id&&!overview.includes(f)&&current.get(f.field)?.trim()!==f.value.trim());if(!grouped.length)continue;
   const section=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('dl');section.dataset.referenceSection=group.id;summary.textContent=group.label;for(const fact of grouped)appendFact(list,fact.field,fact.value);section.append(summary,list);panel.append(section);
  }
  if(earlier.length){
   const section=document.createElement('details'),summary=document.createElement('summary'),help=document.createElement('p');section.dataset.referenceEarlier='';summary.textContent=`Earlier in this story · ${earlier.length}`;help.textContent='Descriptions from earlier verified replies. Current scene state is shown separately.';section.append(summary,help);section.open=!facts.length&&!current.size;
   for(const entry of earlier){const list=document.createElement('dl');appendFact(list,entry.reference.field,entry.reference.value);const source=document.createElement('details'),label=document.createElement('summary'),quote=document.createElement('blockquote');label.textContent=`Reply ${entry.replyNumber} · paragraph ${entry.reference.paragraphIndex+1}`;quote.textContent=entry.reference.evidence;source.dataset.earlierSource='';source.append(label,quote);section.append(list,source);}
   panel.append(section);
  }
  if(!facts.length&&!current.size&&!earlier.length){const p=document.createElement('p');p.dataset.referenceEmpty='';p.textContent='No additional information is available with these display settings.';panel.append(p);}
  if(facts.length){const sources=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');sources.dataset.referenceSources='';summary.textContent='Sources';
   for(const fact of facts){const item=document.createElement('li');item.textContent=`${referenceFieldInfo(fact.field).label} · ${fact.source.provider}${fact.revealedAt?` · revealed paragraph ${fact.revealedAt.paragraphIndex+1}`:''}`;list.append(item);}sources.append(summary,list);panel.append(sources);
  }
  if(storyDocument){
   if(storyDocument.sections.length){
    const read=document.createElement('button');read.type='button';read.textContent='Read revealed text';read.dataset.vnReadDocument='';
    read.onclick=()=>{
     if(this.host.hidden||panel.parentElement!==this.host)return;
     const reader=createDocumentReader(storyDocument,()=>{if(this.host.hidden||reader.parentElement!==this.host)return;this.open(dossier,prefs,chatId,trigger,actions,storyDocument,visual);this.host.querySelector<HTMLElement>('[data-vn-read-document]')?.focus();},()=>{if(!this.host.hidden&&reader.parentElement===this.host)this.close();});
     if(this.host.dataset.vnWorkspaceActive)reader.removeAttribute('aria-modal');     this.documentState(true);this.host.replaceChildren(reader);reader.querySelector<HTMLElement>('button')?.focus();
    };panel.append(read);
   }else{const missing=document.createElement('p');missing.textContent='No document text has been revealed. Examining the item is a story action; opening this card does not unlock it.';panel.append(missing);}
  }
  if(actions?.drafts.length)panel.append(new InteractionTray(actions.drafts,actions.current,(draft,mode)=>{if(!actions.apply(draft,mode))return false;this.close();actions.focus();return true;}).host);
  const status=document.createElement('p');status.setAttribute('role','status');status.hidden=true;panel.append(status);
  const commit=(patch:{suppressed?:boolean;pinned?:boolean;note?:string},closeOnSuccess=false):boolean=>{
   if(this.update(dossier.entity,patch)){if(closeOnSuccess)this.close();return true;}
   status.textContent='Reference customization limit reached (64). Reset local reference customizations in Reading settings to make room.';status.hidden=false;return false;
  };
  const localActions=document.createElement('div'),pin=document.createElement('button'),suppress=document.createElement('button');localActions.dataset.referenceActions='';
  pin.type=suppress.type='button';pin.textContent=currentPinned?'Unpin':'Pin reference';pin.setAttribute('aria-pressed',String(currentPinned));
  pin.onclick=()=>{const next=!currentPinned;if(commit({pinned:next})){currentPinned=next;pin.textContent=currentPinned?'Unpin':'Pin reference';pin.setAttribute('aria-pressed',String(currentPinned));status.textContent=currentPinned?'Reference pinned to top of scene references.':'Reference unpinned.';status.hidden=false;}};
  suppress.textContent='Hide this reference';suppress.onclick=()=>{commit({suppressed:true},true);};localActions.append(pin,suppress);panel.append(localActions);
  const notes=document.createElement('details'),summary=document.createElement('summary');notes.dataset.referenceNotes='';summary.textContent='Local display note';
  const label=document.createElement('label');label.textContent='Your note (does not change the story)';const input=document.createElement('textarea');const noteKey=`${chatId}:${dossier.entity.id}`;input.maxLength=600;input.value=this.noteDrafts.get(noteKey)??override?.note??'';input.addEventListener('input',()=>{if(this.noteDrafts.size>=256&&!this.noteDrafts.has(noteKey))this.noteDrafts.delete(this.noteDrafts.keys().next().value!);this.noteDrafts.set(noteKey,input.value);});label.append(input);
  const noteDisplay=document.createElement('p');noteDisplay.dataset.referenceSavedNote='';noteDisplay.hidden=!override?.note;if(override?.note)noteDisplay.textContent=`Your note: ${override.note}`;
  const save=document.createElement('button');save.type='button';save.textContent='Save note';save.onclick=()=>{if(commit({note:input.value})){this.noteDrafts.delete(noteKey);const trimmed=input.value.trim();noteDisplay.hidden=!trimmed;noteDisplay.textContent=trimmed?`Your note: ${input.value}`:'';status.textContent=trimmed?'Local note saved.':'Local note cleared.';status.hidden=false;}};notes.append(summary,label,save);panel.append(notes,noteDisplay);
  this.host.append(panel);this.host.hidden=false;if(this.host.dataset.vnWorkspaceActive){title.tabIndex=-1;title.focus();}else close.focus();
 }
 openCastFolios(entries:ReturnType<typeof referenceEntries>,trigger:HTMLElement,open:(id:string,trigger:HTMLElement)=>void,note:string|undefined,visualResolver:((entity:ReaderDossier['entity'])=>DossierVisualContext)|undefined,summaryResolver:(id:string)=>string|undefined,restoreState=false):void {
  this.documentState(false);if(!restoreState){this.query='';this.category='npc';this.scope='all';}
  this.returnFocus=trigger;this.returnLabel='Back to Character Folio';
  this.trayReturn=()=>this.openCastFolios(entries,trigger,open,note,visualResolver,summaryResolver,true);
  this.host.replaceChildren();const panel=document.createElement('section');panel.dataset.vnDossierCard='';panel.dataset.characterFolios='';panel.setAttribute('role','dialog');if(!this.host.dataset.vnWorkspaceActive)panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Character Folio');
  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.textContent='Known cast';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close Character Folio');close.title='Close Character Folio';close.onclick=()=>this.close();header.append(title,close);panel.append(header);
  const intro=document.createElement('p');intro.dataset.castFolioIntro='';intro.textContent='Characters established in the current reply or earlier revealed references. Profiles show all cursor-safe known details; hidden field groups remain hidden.';panel.append(intro);
  const filters=document.createElement('div');filters.dataset.castFolioFilters='';const search=document.createElement('input');search.type='search';search.maxLength=160;search.placeholder='Find a character…';search.setAttribute('aria-label','Search known cast');search.value=this.query;filters.append(search);
  const earlier=entries.some(entry=>entry.entity.id.startsWith('earlier:'));let scope:HTMLSelectElement|undefined;
  if(earlier){scope=document.createElement('select');scope.dataset.castFolioScope='';scope.setAttribute('aria-label','Cast scope');for(const [value,label] of [['all','Current reply & earlier'],['reply','Current reply only']]){const option=document.createElement('option');option.value=value!;option.textContent=label!;scope.append(option);}scope.value=this.scope;filters.append(scope);}
  panel.append(filters);if(note){const hint=document.createElement('small');hint.dataset.castFolioNote='';hint.textContent=note;panel.append(hint);}
  const count=document.createElement('p');count.dataset.castFolioCount='';count.setAttribute('role','status');const list=document.createElement('div');list.dataset.castFolioList='';panel.append(count,list);
  const render=()=>{this.query=search.value;this.scope=scope?.value??'all';list.replaceChildren();const query=this.query.trim().toLocaleLowerCase();const filtered=entries.filter(entry=>entry.entity.kind==='npc'&&(this.scope==='all'||!entry.entity.id.startsWith('earlier:'))&&(!query||[entry.entity.name,...entry.entity.aliases].some(name=>name.toLocaleLowerCase().includes(query))));
   count.textContent=filtered.length?`${filtered.length} known character${filtered.length===1?'':'s'}`:'No known cast match. Try another name or check the current reading position.';
   for(const entry of filtered){const vis=visualResolver?.(entry.entity),button=document.createElement('button');button.type='button';button.dataset.castFolioRow='';button.dataset.castFolioCurrent=String(entry.current);button.setAttribute('aria-label',`Open folio for ${entry.entity.name}`);button.title=`Open ${entry.entity.name}'s revealed profile`;
    const avatar=document.createElement('span');avatar.dataset.castFolioAvatar='';if(vis?.imageUrl){const image=document.createElement('img');image.src=vis.imageUrl;image.alt='';image.loading='lazy';avatar.append(image);}else avatar.textContent=entityInitials(entry.entity.name);
    const body=document.createElement('span');body.dataset.castFolioCopy='';const name=document.createElement('strong');name.textContent=entry.entity.name;const status=document.createElement('small');status.textContent=entry.label;body.append(name,status);
    const summary=summaryResolver(entry.entity.id);const detail=document.createElement('small');detail.dataset.castFolioSummary='';detail.textContent=summary??'No profile detail has been revealed at this passage.';body.append(detail);
    const arrow=document.createElement('span');arrow.dataset.castFolioArrow='';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';button.append(avatar,body,arrow);button.onclick=()=>open(entry.entity.id,trigger);list.append(button);
   }
  };
  search.oninput=render;if(scope)scope.onchange=render;render();this.host.append(panel);this.host.hidden=false;if(this.host.dataset.vnWorkspaceActive){title.tabIndex=-1;title.focus();}else close.focus();
 }

 openTray(entries:ReturnType<typeof referenceEntries>,trigger:HTMLElement,open:(id:string,trigger:HTMLElement)=>void,note?:string,visualResolver?:(entity:ReaderDossier['entity'])=>DossierVisualContext,titleText='Scene references',restoreState=false):void {
  this.documentState(false);if(!restoreState){this.query='';this.category='all';this.scope='all';}
  this.returnFocus=trigger;this.returnLabel='Back to references';this.trayReturn=()=>this.openTray(entries,trigger,open,note,visualResolver,titleText,true);this.host.replaceChildren();const panel=document.createElement('section');panel.dataset.vnDossierCard='';panel.dataset.vnReferenceSheet='';panel.setAttribute('role','dialog');if(!this.host.dataset.vnWorkspaceActive)panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',titleText);  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.textContent=titleText;close.type='button';close.textContent='×';close.title='Close references';close.setAttribute('aria-label','Close information');close.onclick=()=>this.close();header.append(title,close);panel.append(header);
  const map=document.createElement('section');map.dataset.referenceMap='';map.setAttribute('aria-label','Current scene references');
  const mapHead=document.createElement('div');mapHead.dataset.referenceMapHead='';const mapTitle=document.createElement('h3');mapTitle.textContent='Known in this scene';const mapDescription=document.createElement('p');mapDescription.textContent='Presence and location are shown only when established at this passage.';mapHead.append(mapTitle,mapDescription);
  const orbit=document.createElement('div');orbit.dataset.referenceOrbit='';const links=document.createElementNS('http://www.w3.org/2000/svg','svg');links.setAttribute('viewBox','0 0 100 100');links.setAttribute('aria-hidden','true');links.dataset.referenceOrbitLinks='';const nodes=document.createElement('div');nodes.dataset.referenceOrbitNodes='';const center=document.createElement('div');center.dataset.referenceOrbitCenter='';orbit.append(links,nodes,center);map.append(mapHead,orbit);panel.append(map);
  const filters=document.createElement('div');filters.dataset.referenceFilters='';
  const search=document.createElement('input');search.type='search';search.maxLength=160;search.placeholder='Find a name…';search.setAttribute('aria-label','Search references');search.value=this.query;
  const category=document.createElement('select');category.setAttribute('aria-label','Reference category');
  for(const [value,label] of [['all','All references'],['npc','NPCs'],['place','Locations'],['object','Items & documents']]){if(value!=='all'&&!entries.some(entry=>entry.entity.kind===value))continue;const option=document.createElement('option');option.value=value!;option.textContent=label!;category.append(option);}if(this.category!=='all'&&!entries.some(entry=>entry.entity.kind===this.category))this.category='all';category.value=this.category;filters.append(search,category);panel.append(filters);
  const scope=document.createElement('select');scope.setAttribute('aria-label','Reference scope');scope.dataset.referenceScope='';for(const [value,label] of [['all','Reply & earlier'],['reply','This reply']]){const option=document.createElement('option');option.value=value!;option.textContent=label!;scope.append(option);}scope.value=this.scope;scope.hidden=!entries.some(e=>e.entity.id.startsWith('earlier:'));filters.append(scope);
  if(note){const hint=document.createElement('small');hint.dataset.referenceHistoryNote='';hint.textContent=note;panel.append(hint);}
  const count=document.createElement('p');count.dataset.referenceCount='';count.setAttribute('role','status');const list=document.createElement('div');list.dataset.referenceList='';panel.append(count,list);
  const tabs=document.createElement('div');tabs.dataset.referenceCategories='';tabs.setAttribute('aria-label','Story categories');
  for(const [value,label] of [['all','All'],['npc','People'],['place','Places'],['object','Items & documents']]){if(value!=='all'&&!entries.some(entry=>entry.entity.kind===value))continue;const button=document.createElement('button');button.type='button';button.textContent=label!;button.dataset.referenceCategory=value!;button.onclick=()=>{category.value=value!;render();};tabs.append(button);}
  panel.insertBefore(tabs,filters);
  const render=()=>{for(const button of tabs.querySelectorAll<HTMLElement>('button'))button.setAttribute('aria-pressed',String(button.dataset.referenceCategory===category.value));this.query=search.value;this.category=category.value as ReferenceKind;this.scope=scope.value;list.replaceChildren();
   const filtered=entries.filter(({entity})=>(this.scope==='all'||!entity.id.startsWith('earlier:'))&&(this.category==='all'||entity.kind===this.category)&&(!this.query.trim()||[entity.name,...entity.aliases].some(name=>name.toLocaleLowerCase().includes(this.query.trim().toLocaleLowerCase()))));
   const currentLocation=filtered.find(entry=>entry.current&&entry.entity.kind==='place'&&entry.label==='Current location');
   const present=filtered.filter(entry=>entry!==currentLocation&&entry.current&&!entry.entity.id.startsWith('earlier:')).slice(0,6);
   map.hidden=!currentLocation&&!present.length;nodes.replaceChildren();links.replaceChildren();
   center.textContent=currentLocation?.entity.name??'Current passage';
   mapDescription.textContent=currentLocation?'Lines indicate scene co-presence only, not a social or causal relationship.':'Only established scene presence is shown; map positions are navigational, not geographic.';
   if(currentLocation&&present.length){for(let i=0;i<present.length;i++){const angle=(Math.PI*2*i/present.length)-Math.PI/2,x=50+35*Math.cos(angle),y=50+35*Math.sin(angle),line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1','50');line.setAttribute('y1','50');line.setAttribute('x2',String(x));line.setAttribute('y2',String(y));links.append(line);}}
   for(let i=0;i<present.length;i++){const entry=present[i]!,angle=(Math.PI*2*i/present.length)-Math.PI/2,x=50+35*Math.cos(angle),y=50+35*Math.sin(angle),node=document.createElement('button');node.type='button';node.dataset.referenceOrbitNode=entry.entity.kind;node.style.left=`${x}%`;node.style.top=`${y}%`;node.textContent=entry.entity.name;node.title=`${entry.entity.name} · present in this passage`;node.setAttribute('aria-label',`${entry.entity.name}, present in this passage`);node.onclick=()=>open(entry.entity.id,trigger);nodes.append(node);}
   count.textContent=filtered.length?`${filtered.length} reference${filtered.length===1?'':'s'}`:'No references match. Try another name or category.';
   for(const {entity,pinned,label,current} of filtered){
    const vis=visualResolver?.(entity);
    const button=document.createElement('button');button.type='button';button.dataset.referenceCurrent=String(current);button.dataset.referenceKindItem=entity.kind;button.setAttribute('aria-label',entity.name);button.setAttribute('aria-description',`${pinned?'Pinned. ':''}${label}`);
    const thumb=document.createElement('span');thumb.dataset.referenceThumb=entity.kind;
    if(vis?.imageUrl){const img=document.createElement('img');img.src=vis.imageUrl;img.alt='';img.loading='lazy';thumb.append(img);}
    else{thumb.textContent=entity.kind==='npc'?entityInitials(entity.name):entity.kind==='place'?'📍':'✦';}
    const body=document.createElement('span');body.dataset.referenceRowBody='';
    const name=document.createElement('span');name.dataset.referenceRowTitle='';name.textContent=entity.name;
    const detail=document.createElement('small');detail.textContent=`${pinned?'📌 Pinned · ':''}${entity.kind==='npc'?'Character':entity.kind==='place'?'Location':'Item'} · ${label}`;
    body.append(name,detail);
    if(vis?.summarySnippet){const snippet=document.createElement('small');snippet.dataset.referenceSnippet='';snippet.textContent=vis.summarySnippet.length>90?`${vis.summarySnippet.slice(0,90).trimEnd()}…`:vis.summarySnippet;body.append(snippet);}
    button.append(thumb,body);
    button.onclick=()=>open(entity.id,trigger);
    list.append(button);
   }
  };
  search.oninput=render;category.onchange=render;scope.onchange=render;render();this.host.append(panel);this.host.hidden=false;if(this.host.dataset.vnWorkspaceActive)search.focus();else close.focus();
 }

 close():void{this.documentState(false);if(this.host.hidden)return;this.host.hidden=true;this.trayReturn=null;if(!this.host.dataset.vnWorkspaceActive){this.query='';this.category='all';}const target=this.returnFocus;this.returnFocus=null;if(target?.isConnected)target.focus();else this.host.parentElement?.focus();this.closeCallback();}
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
[data-vn-dossier]{position:absolute;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,7,14,.74);backdrop-filter:blur(6px);padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box}
[data-vn-dossier-card]{box-sizing:border-box;width:min(100%,580px);max-height:min(84dvh,calc(100dvh - 32px));overflow:auto;overscroll-behavior:contain;padding:20px;border:1px solid var(--vn-panel-border,#666);border-radius:18px;background:var(--vn-panel-solid,#171b26);color:var(--vn-chrome-text,var(--vn-text,#eef1f7));box-shadow:0 16px 56px rgba(0,0,0,.65);touch-action:pan-y;font:inherit;line-height:1.55;scroll-padding-top:76px}
[data-vn-dossier-card] header{position:sticky;top:-20px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-4px 0 0;padding:4px 0 10px;background:var(--vn-panel-solid,#171b26);border-bottom:1px solid var(--vn-panel-border,#666)}
[data-vn-dossier-card] h2{flex:1;min-width:0;margin:0;font-size:1.2em;line-height:1.3;overflow-wrap:anywhere}
[data-vn-dossier-card] button{box-sizing:border-box;font:inherit;min-width:44px;min-height:44px;padding:8px 12px;margin:4px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;cursor:pointer;white-space:normal;transition:border-color .15s ease,background-color .15s ease}
[data-vn-dossier-card] button:hover{border-color:var(--vn-accent,#9ec6f0);background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 14%,var(--vn-button-bg,#ffffff0d))}
[data-vn-dossier-card] header button{flex:none;margin:0;width:44px;padding:6px;font-size:1.35em;line-height:1}
[data-dossier-hero]{display:grid;gap:14px;margin:14px 0;padding:12px;border-radius:14px;background:linear-gradient(145deg,color-mix(in srgb,var(--vn-accent,#9ec6f0) 12%,rgba(255,255,255,.03)),rgba(0,0,0,.22));border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 28%,var(--vn-panel-border,#666))}
[data-dossier-hero="npc"],[data-dossier-hero="object"]{grid-template-columns:96px minmax(0,1fr);align-items:center}
[data-dossier-hero="place"]{grid-template-columns:1fr}
[data-dossier-media]{margin:0;position:relative;overflow:hidden;border-radius:12px;border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 35%,transparent);background:rgba(0,0,0,.35);display:grid;place-items:center}
[data-dossier-media="npc"]{width:96px;height:114px}
[data-dossier-media="object"]{width:96px;height:96px}
[data-dossier-media="place"]{width:100%;height:148px}
[data-dossier-media][data-has-image="true"]{cursor:zoom-in}
[data-dossier-media][data-expanded="true"]{grid-column:1 / -1;width:100%;height:auto;max-height:340px;cursor:zoom-out}
[data-dossier-media] img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block}
[data-dossier-media][data-expanded="true"] img{object-fit:contain;max-height:320px;background:rgba(0,0,0,.6)}
[data-dossier-media] svg{width:100%;height:100%;display:block;color:var(--vn-accent,#9ec6f0)}
[data-dossier-media] figcaption{position:absolute;inset:auto 0 0 0;padding:4px 8px;font-size:.68em;background:linear-gradient(transparent,rgba(0,0,0,.82));color:#fff;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
[data-dossier-identity]{display:flex;flex-direction:column;gap:6px;min-width:0}
[data-reference-kind]{display:block;margin:0;font-size:.75em;opacity:.82;line-height:1.4;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--vn-accent,#9ec6f0)}
[data-dossier-aliases]{font-size:.78em;opacity:.8;line-height:1.35}
[data-dossier-badges]{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
[data-dossier-badge]{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:.72em;font-weight:600;line-height:1.25;border:1px solid var(--vn-panel-border,#666);background:rgba(255,255,255,.06)}
[data-dossier-badge="active"]{border-color:color-mix(in srgb,var(--vn-accent,#9ec6f0) 60%,transparent);background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 18%,transparent)}
[data-dossier-badge="location"]{border-color:rgba(140,210,255,.45);background:rgba(140,210,255,.12)}
[data-dossier-badge="pinned"]{border-color:rgba(245,196,98,.55);background:rgba(245,196,98,.16)}
[data-dossier-present-cast]{margin:12px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--vn-panel-border,#666)}
[data-dossier-present-cast] h3{margin:0 0 8px;font-size:.8em;text-transform:uppercase;letter-spacing:.03em;opacity:.85}
[data-dossier-cast-chips]{display:flex;flex-wrap:wrap;gap:6px}
[data-dossier-cast-chip]{margin:0!important;min-height:36px!important;padding:5px 11px!important;border-radius:999px!important;font-size:.8em!important;font-weight:600!important}
[data-vn-dossier-card] dl{margin:0}
[data-vn-dossier-card] dt{font-size:.75em;opacity:.78;margin-top:12px;line-height:1.4;font-weight:650;text-transform:uppercase;letter-spacing:.025em;color:color-mix(in srgb,var(--vn-accent,#9ec6f0) 80%,var(--vn-text,#eef1f7))}
[data-vn-dossier-card] dt:first-child{margin-top:0}
[data-vn-dossier-card] dd{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.62}
[data-vn-dossier-card] [data-fact-expand]{display:inline;min-width:0;min-height:0;padding:1px 6px;margin:0 0 0 4px;font-size:.75em;border-radius:6px;vertical-align:baseline}
[data-reference-overview]{padding:14px 16px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 9%,transparent);border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 26%,transparent);border-radius:12px;margin:12px 0 16px}
section[data-reference-current],section[data-reference-observations]{margin:16px 0;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--vn-panel-border,#666)}
section[data-reference-current] h3,section[data-reference-observations] h3{font-size:.82em;text-transform:uppercase;letter-spacing:.03em;margin:0 0 10px;opacity:.9}
[data-reference-section]{border-bottom:1px solid var(--vn-panel-border,#666)}
[data-reference-section] dl{padding:0 4px 16px}
[data-reference-sources]{font-size:.8em;margin:12px 0;opacity:.85}
[data-reference-sources] ul{list-style:none;margin:0;padding:0 0 12px;overflow-wrap:anywhere}
[data-reference-sources] li+li{margin-top:6px}
[data-reference-earlier]{border-top:1px solid var(--vn-panel-border,#666);margin-top:16px;padding-top:4px}
[data-reference-earlier]>p{font-size:.8em;color:var(--vn-muted-text);line-height:1.5;margin:0 0 14px}
[data-reference-earlier] dl{padding-top:12px}[data-earlier-source]{font-size:.8em;margin-bottom:12px;border-bottom:1px solid var(--vn-panel-border,#666)}
[data-earlier-source] summary{font-weight:400;color:var(--vn-muted-text)}[data-earlier-source] blockquote{margin:0;padding:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}
[data-reference-actions]{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--vn-panel-border,#666)}
[data-reference-actions] button{margin:0;flex:1}
[data-reference-notes] label{display:block;font-size:.85em}
[data-vn-dossier-card] textarea{display:block;box-sizing:border-box;width:100%;min-height:90px;margin:8px 0;font:inherit;color:inherit;background:#0002;border:1px solid var(--vn-panel-border,#666);border-radius:8px;padding:10px}
[data-vn-dossier-card] summary{box-sizing:border-box;cursor:pointer;min-height:44px;padding:12px 0;font-weight:600;line-height:1.4}
[data-reference-filters]{display:grid;grid-template-columns:minmax(0,1fr) minmax(100px,.65fr);gap:8px;margin:16px 0 8px}
[data-reference-filters] input,[data-reference-filters] select{box-sizing:border-box;min-width:0;width:100%;min-height:44px;font:inherit;font-size:16px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;padding:8px}
[data-reference-filters]:has([data-reference-scope]:not([hidden])){grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
[data-reference-filters]:has([data-reference-scope]:not([hidden])) input{grid-column:1 / -1}
[data-reference-history-note]{font-size:.75em;line-height:1.4;color:var(--vn-muted-text)}
[data-vn-reference-sheet]{display:flex;flex-direction:column;overflow:hidden}
[data-vn-reference-sheet] header,[data-reference-filters],[data-reference-count]{flex:none}
[data-reference-list]{min-height:0;overflow:auto;overscroll-behavior:contain;display:grid;gap:8px;padding:2px 2px 6px}
[data-reference-count]{font-size:.8em;opacity:.75;margin:8px 0}
[data-reference-list] button{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;text-align:left;margin:0;min-width:0;overflow-wrap:anywhere;gap:12px;padding:10px 12px;border-radius:12px}
[data-reference-thumb]{width:44px;height:44px;border-radius:10px;overflow:hidden;display:grid;place-items:center;font-weight:700;font-size:.85em;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,rgba(255,255,255,.05));border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 35%,transparent);flex:none}
[data-reference-thumb] img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block}
[data-reference-row-body]{display:flex;flex-direction:column;gap:2px;min-width:0}
[data-reference-row-title]{font-weight:650;font-size:.96em}
[data-reference-list] small{font-size:.75em;opacity:.8;line-height:1.35}
[data-reference-snippet]{opacity:.68!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-reference-list] [data-reference-current=true]{border-left:3px solid var(--vn-accent,#9ec6f0)}
[data-character-folios]>p{margin:10px 0;color:var(--vn-muted-text);line-height:1.55}
[data-cast-folio-filters]{margin:12px 0}
[data-cast-folio-filters] input{box-sizing:border-box;width:100%;min-width:0;min-height:46px;padding:9px 12px;border:1px solid var(--vn-panel-border);border-radius:12px;background:var(--vn-panel-solid);color:var(--vn-text);font:inherit;font-size:16px}
[data-cast-folio-list]{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));align-content:start;gap:12px}
[data-cast-folio-row]{display:grid!important;grid-template-columns:64px minmax(0,1fr) 20px;align-items:center;gap:13px;text-align:left!important;min-width:0;padding:13px!important;border-radius:15px!important;background:color-mix(in srgb,var(--vn-panel-solid) 72%,transparent)!important}
[data-cast-folio-avatar]{display:grid;place-items:center;overflow:hidden;width:64px;height:64px;border:1px solid color-mix(in srgb,var(--vn-accent) 40%,var(--vn-panel-border));border-radius:15px;background:color-mix(in srgb,var(--vn-accent) 13%,var(--vn-panel-solid));color:var(--vn-accent);font:600 16px/1 Georgia,"Iowan Old Style",serif}
[data-cast-folio-avatar] img{width:100%;height:100%;object-fit:cover;object-position:center 20%}
[data-cast-folio-copy]{display:grid;gap:4px;min-width:0}
[data-cast-folio-copy] strong{font:600 16px/1.25 Georgia,"Iowan Old Style",serif;overflow-wrap:anywhere}
[data-cast-folio-copy] small{font-size:11px;line-height:1.45;color:var(--vn-muted-text);overflow-wrap:anywhere}
[data-cast-folio-copy] [data-cast-folio-summary]{color:var(--vn-text);opacity:.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
[data-cast-folio-arrow]{font-size:24px;color:var(--vn-accent);text-align:center}
[data-cast-folio-count]{margin:8px 0;color:var(--vn-muted-text);font-size:11px;letter-spacing:.04em;text-transform:uppercase}
[data-vn-dossier-card] :is(button,input,select,textarea,summary):focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
@media(min-width:700px){[data-vn-dossier]{align-items:center}}
@media(max-width:420px){[data-vn-dossier-card]{padding:16px;border-radius:14px}[data-vn-dossier-card] header{top:-16px}[data-reference-filters]{grid-template-columns:1fr}[data-reference-overview]{padding:12px}[data-dossier-hero="npc"],[data-dossier-hero="object"]{grid-template-columns:76px minmax(0,1fr)}[data-dossier-media="npc"]{width:76px;height:92px}[data-dossier-media="object"]{width:76px;height:76px}}
`+DOCUMENT_READER_CSS;

export const DOCKED_DOSSIER_CSS=`
[data-vn-dossier][data-vn-workspace-active]{position:relative;inset:auto;display:flex;align-items:stretch;padding:0;background:transparent;height:100%;z-index:auto}
[data-vn-workspace-active] [data-vn-dossier-card]{width:100%;max-height:100%;height:100%;border:0;border-radius:0;box-shadow:none;padding:18px;font-size:14px;line-height:1.7}
[data-vn-workspace-active] [data-vn-dossier-card]>header{position:static;top:auto;padding:0 0 14px;background:var(--vn-panel-solid)}
[data-vn-workspace-active] [data-vn-dossier-card]>header button[aria-label^="Close"]{display:none}
[data-vn-workspace-active] [data-vn-reference-sheet]>header{display:none}
[data-reference-categories]{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;padding:5px;border:1px solid var(--vn-panel-border);border-radius:12px;background:color-mix(in srgb,var(--vn-panel-solid) 76%,transparent)}
[data-reference-categories] button{flex:1;min-width:84px;margin:0;font-size:12px;padding:8px 12px;border-color:transparent;background:transparent}
[data-reference-categories] [aria-pressed="true"]{border-color:color-mix(in srgb,var(--vn-accent) 40%,var(--vn-panel-border));color:var(--vn-accent);background:color-mix(in srgb,var(--vn-accent) 12%,var(--vn-panel-solid))}
[data-vn-workspace-active] [data-reference-filters]{grid-template-columns:minmax(0,1fr) minmax(150px,.35fr);gap:10px;margin:12px 0 6px}
[data-vn-workspace-active] [data-reference-filters] input,[data-vn-workspace-active] [data-reference-filters] select{min-height:46px;border-radius:11px;background:var(--vn-panel-solid)}
[data-vn-workspace-active] [data-reference-count]{flex:none;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--vn-muted-text)}
[data-vn-workspace-active] [data-reference-list]{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));align-content:start;gap:12px;padding:4px 2px 24px}
[data-vn-workspace-active] [data-reference-list] button{grid-template-columns:64px minmax(0,1fr);min-height:90px;gap:13px;padding:12px;border:1px solid var(--vn-panel-border);border-radius:14px;background:color-mix(in srgb,var(--vn-panel-solid) 72%,transparent);box-shadow:0 5px 18px rgba(10,20,15,.06);transition:border-color .16s ease,background-color .16s ease,transform .16s ease}
[data-vn-workspace-active] [data-reference-list] button:hover{border-color:var(--vn-accent);background:color-mix(in srgb,var(--vn-accent) 7%,var(--vn-panel-solid));transform:translateY(-1px)}
[data-vn-workspace-active] [data-reference-thumb]{width:64px;height:64px;border-radius:12px;font-size:15px}
[data-vn-workspace-active] [data-reference-row-title]{font:600 16px/1.25 Georgia,"Iowan Old Style",serif}
[data-vn-workspace-active] [data-reference-list] small{font-size:11px}
[data-vn-workspace-active] [data-reference-snippet]{margin-top:3px}
[data-vn-workspace-active] [data-reference-list] [data-reference-current=true]{border-left:1px solid var(--vn-panel-border);box-shadow:inset 3px 0 var(--vn-accent),0 5px 18px rgba(10,20,15,.06)}
[data-vn-workspace-active] [data-vn-dossier-card]:not([data-vn-reference-sheet]){max-width:760px;margin:0 auto;overflow:auto;overscroll-behavior:contain}
[data-vn-workspace-active] [data-reference-map]{margin:4px 0 18px;padding:15px;border:1px solid var(--vn-panel-border);border-radius:18px;background:radial-gradient(ellipse at 50% 42%,color-mix(in srgb,var(--vn-accent) 9%,transparent),transparent 60%),color-mix(in srgb,var(--vn-panel-solid) 74%,transparent)}
[data-vn-workspace-active] [data-character-folios]{display:flex;flex-direction:column;max-width:1040px!important;}
[data-vn-workspace-active] [data-cast-folio-filters]{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.42fr);gap:10px;margin:14px 0 4px}
[data-vn-workspace-active] [data-cast-folio-filters] input,[data-vn-workspace-active] [data-cast-folio-filters] select{min-height:46px;border-radius:11px;background:var(--vn-panel-solid);color:var(--vn-text);border:1px solid var(--vn-panel-border);font:inherit;font-size:16px}
[data-vn-workspace-active] [data-cast-folio-count]{flex:none;color:var(--vn-muted-text)}
[data-vn-workspace-active] [data-cast-folio-list]{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));align-content:start;padding:4px 2px 24px}
[data-vn-workspace-active] [data-cast-folio-row]{min-height:94px;border:1px solid var(--vn-panel-border)!important;box-shadow:0 5px 18px rgba(10,20,15,.06);transition:border-color .16s ease,background-color .16s ease,transform .16s ease}
[data-vn-workspace-active] [data-cast-folio-row]:hover{border-color:var(--vn-accent)!important;background:color-mix(in srgb,var(--vn-accent) 7%,var(--vn-panel-solid))!important;transform:translateY(-1px)}
[data-reference-map-head] h3{margin:0;font:600 17px/1.25 Georgia,"Iowan Old Style",serif;color:var(--vn-text)}
[data-reference-map-head] p{margin:4px 0 0;color:var(--vn-muted-text);font-size:11px;line-height:1.45}
[data-reference-orbit]{position:relative;width:min(100%,620px);height:clamp(218px,33vw,300px);margin:12px auto 0;overflow:hidden;border:1px solid color-mix(in srgb,var(--vn-accent) 18%,transparent);border-radius:16px;background:radial-gradient(circle at 50% 50%,transparent 0 17%,color-mix(in srgb,var(--vn-accent) 8%,transparent) 17.3% 17.7%,transparent 18% 33%,color-mix(in srgb,var(--vn-accent) 8%,transparent) 33.3% 33.7%,transparent 34% 50%)}
[data-reference-orbit-links],[data-reference-orbit-nodes]{position:absolute;inset:0;width:100%;height:100%}
[data-reference-orbit-links] line{stroke:var(--vn-accent);stroke-width:.55;stroke-dasharray:1.8 1.8;opacity:.62}
[data-reference-orbit-center]{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;box-sizing:border-box;width:min(32%,150px);min-height:54px;padding:8px;border:1px solid color-mix(in srgb,var(--vn-accent) 55%,var(--vn-panel-border));border-radius:999px;background:var(--vn-panel-solid);color:var(--vn-text);font:600 12px/1.2 Georgia,"Iowan Old Style",serif;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.12)}
[data-reference-orbit-node]{position:absolute;transform:translate(-50%,-50%);max-width:min(27%,120px);min-width:44px;min-height:36px!important;margin:0!important;padding:5px 9px!important;border-radius:999px!important;background:var(--vn-panel-solid)!important;color:var(--vn-text)!important;border-color:color-mix(in srgb,var(--vn-accent) 42%,var(--vn-panel-border))!important;box-shadow:0 4px 14px rgba(0,0,0,.1);font-size:10px!important;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-reference-orbit-node="npc"]{border-color:color-mix(in srgb,var(--vn-accent) 68%,var(--vn-panel-border))!important}
@media(max-width:560px){[data-vn-workspace-active] [data-cast-folio-filters]{grid-template-columns:1fr}[data-vn-workspace-active] [data-reference-filters]{grid-template-columns:1fr}[data-vn-workspace-active] [data-reference-categories] button{min-width:64px;padding:8px 6px;font-size:11px}[data-vn-workspace-active] [data-reference-map]{padding:11px;margin-bottom:12px}[data-vn-workspace-active] [data-reference-orbit]{height:190px;margin-top:8px}[data-reference-orbit-node]{max-width:31%;font-size:9px!important}}
@media(prefers-reduced-motion:reduce){[data-vn-workspace-active] [data-reference-list] button{transition:none!important;transform:none!important}}
`;
