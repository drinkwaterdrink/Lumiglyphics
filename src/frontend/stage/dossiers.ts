import { sceneImageUrlFor } from "./image-loader.js";
import type { ReaderWorkspace } from "./reader-workspace.js";
import {validateStoryDocuments,visibleStoryDocuments} from '../../shared/story-documents.js';
import {stripTextEffectTags} from '../../shared/text-effects.js';
import {availableInteractionVerbs,buildInteractionDraft,buildSyntheticInteractionDraft,mergeInteractionDraft,type DraftMergeMode,type InteractionDraft} from '../../shared/scene-interactions.js';
import {referenceEntriesWithHistory,dossierWithHistory,selectEarlierDossier,normalizeTooltipPreferences,linkEntityMentions,createReferenceLinkBudget,eligibleEntities,selectReaderDossier,entityOverride,applyOverrideFactEdits,type TooltipPreferences} from '../../shared/dossiers.js';
import {referenceHistoryFor,type ReferenceHistory} from '../../shared/reference-history.js';
import {samePresentationTurn,type ReaderPresentation,type PresentationEntity,type PresentationSnapshot} from '../../shared/presentation-entities.js';
import {parseReaderPresentation,presentationTurnKey,createPresentationCursor} from '../../shared/presentation-selectors.js';
import {
  findMatchingItem,
  findMatchingLocation,
  formatItemDNAToPromptClause,
  formatLocationDNAToPromptClause,
  type StoryDnaActionBody,
  type StoryDNASet,
} from '../../shared/story-dna.js';
import { findCharacterDNA, type CharacterDNA } from '../../shared/character-dna.js';
import type {AssetView,DocumentAssetView,TurnView} from '../../protocol.js';
import type { StoryDocument } from '../../shared/story-documents.js';
import {applyEntityAnchors,clearEntityAnchors,protectedEntityRanges} from './entity-anchors.js';
import {DossierCard,DOSSIER_CSS,DOCKED_DOSSIER_CSS,type DossierSceneHubContext,type DossierVisualContext} from './dossier-card.js';
export class StageDossiers {
 private prefs=normalizeTooltipPreferences({});private presentation:ReaderPresentation|undefined;private paragraphs:readonly string[]=[];private index=-1;
 private history:ReferenceHistory|undefined;
 private storyDna:StoryDNASet={locations:{},items:{},revision:0};
 private storyDnaRequester?:(body:StoryDnaActionBody)=>void;
 private characterDnaLibrary:Record<string,CharacterDNA>={};
 private characterDnaSaver?:(dna:CharacterDNA)=>void;
 private tooltipPopover:HTMLElement|null=null;
 private tooltipDismissCleanup:(()=>void)|null=null;
 private documentAssets:Record<string,DocumentAssetView>={};
 private documentArtBusy=new Set<string>();
 private documentArtErrors=new Map<string,string>();
 private documentArtRequester?:(documentId:string,throughParagraphIndex:number,forceRegenerate?:boolean)=>void;
 private lightboxOpener?:(imageUrl:string,alt:string)=>void;
 private snapshotAt:(index:number)=>PresentationSnapshot|undefined=()=>undefined;
 private priorLinks:(index:number)=>{used:number;priorIds:Set<string>}=()=>({used:0,priorIds:new Set()});
 private resetLinkBudget():void{this.priorLinks=this.presentation?createReferenceLinkBudget(this.presentation,this.paragraphs,this.prefs):()=>({used:0,priorIds:new Set()});}
 private workspace:ReaderWorkspace|undefined;
 private workspaceMounted=false;
 private turnMedia:TurnView|null=null; private card:DossierCard;private tray=document.createElement('button');private ready=false;
 constructor(private root:HTMLElement,private text:HTMLElement,controls:HTMLElement,private hold:()=>void,private release:()=>void,private save:(prefs:TooltipPreferences)=>void,private draftTools?:{current:()=>string;apply:(text:string)=>boolean;focus:()=>void},documentOpen?:(open:boolean)=>void,private dossierOpen?:(open:boolean)=>void,private displayedImageUrl?:()=>string|null) {
  const style=document.createElement('style');style.textContent=DOSSIER_CSS;root.append(style);
  this.card=new DossierCard(root,()=>{this.dossierOpen?.(false);this.workspace?.toolClosed("story");this.release();},(entity,patch)=>this.updateOverride(entity,patch),documentOpen);
  this.card.setDocumentOptionsResolver((docId)=>({
   asset:this.documentAssets[docId]??null,
   busy:this.documentArtBusy.has(docId),
   ...(this.documentArtErrors.get(docId)?{error:this.documentArtErrors.get(docId)!}:{}),
   ...(this.documentArtRequester?{
    onGenerate:(regenerate:boolean)=>{
     this.documentArtBusy.add(docId);
     this.documentArtErrors.delete(docId);
     this.card.refreshDocumentStage(docId);
     this.documentArtRequester?.(docId,Math.max(0,this.index),regenerate);
    },
   }:{}),
   ...(this.lightboxOpener?{
    onLightbox:(asset)=>this.lightboxOpener?.(asset.imageUrl,'Document closeup'),
   }:{}),
  }));
  this.tray.type='button';this.tray.dataset.vnReferences='';this.tray.dataset.vnControl='references';this.tray.innerHTML='<span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 5.5c-3-2-6.5-2-9-1v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Z"/><path d="M12 5.5v14M6 8h3M6 11h3M15 8h3M15 11h3"/></svg></span>';this.tray.title='Scene references';this.tray.setAttribute('aria-label','Scene references');this.tray.hidden=true;
  this.tray.onclick=event=>{event.stopPropagation();this.dismissTooltipPopover();if(this.workspace)this.workspace.open('story',this.tray);else this.openReferences();};controls.append(this.tray);
 }
 setStoryDna(storyDna:StoryDNASet):void {
  this.storyDna=storyDna;
  this.card.setStoryDna(storyDna);
 }
 setStoryDnaRequester(fn:(body:StoryDnaActionBody)=>void):void {
  this.storyDnaRequester=fn;
  this.card.setStoryDnaRequester(fn);
 }
 setStoryDnaError(error:string):void {
  this.card.setStoryDnaError(error);
 }
 setDocumentArtRequester(fn:(documentId:string,throughParagraphIndex:number,forceRegenerate?:boolean)=>void):void {
  this.documentArtRequester=fn;
 }
 setLightboxOpener(fn:(imageUrl:string,alt:string)=>void):void {
  this.lightboxOpener=fn;
 }
 applyDocumentImageStatus(msg:{documentId:string;contentHash:string;status:'generating'|'ready'|'failed';imageId?:string;imageUrl?:string;error?:string}):void {
  if(msg.status==='generating'){
   this.documentArtBusy.add(msg.documentId);
   this.documentArtErrors.delete(msg.documentId);
  }else if(msg.status==='ready'&&msg.imageId&&msg.imageUrl){
   this.documentArtBusy.delete(msg.documentId);
   this.documentArtErrors.delete(msg.documentId);
   this.documentAssets={
    ...this.documentAssets,
    [msg.documentId]:{documentId:msg.documentId,contentHash:msg.contentHash,imageId:msg.imageId,imageUrl:msg.imageUrl},
   };
   if(this.tooltipPopover?.dataset.docId===msg.documentId){
    const thumb=this.tooltipPopover.querySelector<HTMLElement>('.vn-inline-tooltip-thumb');
    if(thumb){thumb.replaceChildren();const img=document.createElement('img');img.src=msg.imageUrl;img.alt='';thumb.append(img);}
   }
  }else if(msg.status==='failed'){
   this.documentArtBusy.delete(msg.documentId);
   if(msg.error)this.documentArtErrors.set(msg.documentId,msg.error);
  }
  this.card.refreshDocumentStage(msg.documentId);
 }
 setCharacterDnaLibrary(library:Record<string,CharacterDNA>):void {
  this.characterDnaLibrary={...library};
  if(this.card.isOpen())this.card.setSceneHubContext(this.buildSceneHubContext(this.snapshot()));
 }
 setCharacterDnaSaver(fn:(dna:CharacterDNA)=>void):void {
  this.characterDnaSaver=fn;
 }
 connectWorkspace(workspace:ReaderWorkspace,mount:HTMLElement):void {
  if(this.workspaceMounted&&this.workspace===workspace)return;
  this.workspace=workspace;this.workspaceMounted=true;
  const style=document.createElement('style');style.textContent=DOSSIER_CSS+DOCKED_DOSSIER_CSS;mount.append(style);
  this.card.setDocked();
  if(this.folioOpener)this.card.setFolioOpener((charName)=>{this.workspace?.open('character');this.folioOpener?.(charName);});
  workspace.register('story',{element:this.card.host,hideAtHome:true,enter:()=>this.openReferences(),leave:()=>this.card.close(),back:()=>this.card.back()});
 }
 private folioOpener?: (charName: string) => void;
 private npcActionToolsHandler?: (tools: { drafts: InteractionDraft[]; current: () => string; focus: () => void; apply: (draft: InteractionDraft, mode: DraftMergeMode) => boolean } | null, charName?: string) => void;
 setNpcActionToolsHandler(fn: (tools: { drafts: InteractionDraft[]; current: () => string; focus: () => void; apply: (draft: InteractionDraft, mode: DraftMergeMode) => boolean } | null, charName?: string) => void): void {
  this.npcActionToolsHandler = fn;
 }
 buildNpcActionTools(charName: string): { drafts: InteractionDraft[]; current: () => string; focus: () => void; apply: (draft: InteractionDraft, mode: DraftMergeMode) => boolean } | null {
  const snapshot = this.snapshot();
  if (!snapshot || !this.ready || !this.prefs.enabled || !this.prefs.actionsEnabled || !this.draftTools) return null;
  const targetKey = charName.trim().toLocaleLowerCase();
  if (!targetKey) return null;
  const entity = eligibleEntities(snapshot.entities, this.prefs, snapshot.at.key.chatId).find(
   (e) => e.kind === 'npc' && [e.name, ...e.aliases].some((alias) => alias.trim().toLocaleLowerCase() === targetKey),
  );
  if (!entity) return null;
  const drafts = availableInteractionVerbs(entity, snapshot).flatMap((verb) => {
   const draft = buildInteractionDraft(entity, verb, snapshot);
   return draft ? [draft] : [];
  });
  if (drafts.length === 0) return null;
  const tools = this.draftTools;
  return {
   drafts,
   current: tools.current,
   focus: tools.focus,
   apply: (draft, mode) => {
    const now = this.snapshot();
    if (!now || !this.ready || !this.prefs.enabled || !this.prefs.actionsEnabled || !samePresentationTurn(now.at.key, draft.key) || now.at.paragraphIndex !== draft.paragraphIndex) return false;
    const liveEntity = eligibleEntities(now.entities, this.prefs, now.at.key.chatId).find((e) => e.id === draft.entityId);
    if (!liveEntity || !buildInteractionDraft(liveEntity, draft.verb, now)) return false;
    const text = mergeInteractionDraft(tools.current(), draft.text, mode);
    return text !== null && tools.apply(text);
   },
  };
 }
 private matchStoryDocument(entity: PresentationEntity, docs: readonly StoryDocument[]): StoryDocument | undefined {
  const names = new Set([entity.name, ...entity.aliases].map((n) => n.trim().toLocaleLowerCase()).filter(Boolean));
  return docs.find((d) => {
   if (names.has(d.name.trim().toLocaleLowerCase())) return true;
   return (d.aliases ?? []).some((a) => names.has(a.trim().toLocaleLowerCase()));
  });
 }
 setFolioOpener(fn: (charName: string) => void): void {
  this.folioOpener = fn;
  this.card.setFolioOpener((charName) => {
    this.npcActionToolsHandler?.(this.buildNpcActionTools(charName), charName);
    fn(charName);
    this.workspace?.open('character');
  });
 }
 private buildSceneHubContext(snapshot:PresentationSnapshot|undefined):DossierSceneHubContext {
  const eligible=snapshot?eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId):[];
  const activePlace=snapshot?.locationId?eligible.find(e=>e.kind==='place'&&e.id===snapshot.locationId):eligible.find(e=>e.kind==='place');
  const firstStoredLoc=Object.values(this.storyDna.locations)[0];
  const activeLocationName=activePlace?.name??firstStoredLoc?.name;
  const locationDna=activeLocationName?findMatchingLocation(this.storyDna.locations,activeLocationName):undefined;
  const locationImageUrl=locationDna?.referenceImageUrl??(activePlace?this.resolveVisualContext(activePlace).imageUrl:this.displayedImageUrl?.()??undefined);
  const npcList=eligible.filter(e=>e.kind==='npc');
  const sortedCast=[...npcList].sort((a,b)=>Number(snapshot!.presentEntityIds.includes(b.id))-Number(snapshot!.presentEntityIds.includes(a.id)));
  const presentCast=sortedCast.map(e=>{
   const matchedChar=findCharacterDNA(this.characterDnaLibrary,e.name);
   const hasWardrobe=Boolean(matchedChar?.wardrobeStates&&Object.keys(matchedChar.wardrobeStates).length>0);
   return {
    id:e.id,
    name:e.name,
    imageUrl:this.resolveVisualContext(e).imageUrl,
    present:Boolean(snapshot?.presentEntityIds.includes(e.id)),
    ...(matchedChar?{dnaId:matchedChar.id}:{}),
    ...(hasWardrobe?{wardrobeStates:matchedChar!.wardrobeStates,activeWardrobeKey:matchedChar!.activeWardrobeKey,activeOutfit:matchedChar!.activeOutfit}:{}),
   };
  });
  const activeItems=eligible.filter(e=>e.kind==='object').map(e=>({id:e.id,name:e.name,imageUrl:this.resolveVisualContext(e).imageUrl}));
  return {
   ...(activePlace?{activeLocationId:activePlace.id}:{}),
   ...(activeLocationName?{activeLocationName}:{}),
   ...(locationImageUrl?{locationImageUrl}:{}),
   ...(locationDna?{locationDna}:{}),
   presentCast,
   activeItems,
   ...(this.characterDnaSaver?{onSelectWardrobe:(charIdOrName:string,key:string,outfit:string)=>{
     const target=this.characterDnaLibrary[charIdOrName]??findCharacterDNA(this.characterDnaLibrary,charIdOrName);
     if(!target)return;
     const nextDna:CharacterDNA={...target,activeWardrobeKey:key,activeOutfit:outfit,lastUpdated:Date.now()};
     this.characterDnaLibrary={...this.characterDnaLibrary,[target.id]:nextDna};
     this.characterDnaSaver?.(nextDna);
     if(this.card.isOpen())this.card.setSceneHubContext(this.buildSceneHubContext(this.snapshot()));
   }}:{}),
  };
 }
 private mergedTrayEntries(snapshot:PresentationSnapshot|undefined) {
  const base=snapshot?referenceEntriesWithHistory(snapshot,this.prefs,this.history):[];
  const merged=[...base];
  for (const loc of Object.values(this.storyDna.locations)) {
   if (base.some(e=>e.entity.kind==='place'&&Boolean(findMatchingLocation({[loc.id]:loc}, e.entity.name)))) continue;
   const desc=formatLocationDNAToPromptClause(loc) || loc.notes || 'Saved location profile.';
   merged.push({
    entity:{id:`dna:loc:${loc.id}`,kind:'place',name:loc.name,aliases:loc.aliases,firstParagraph:0,facts:desc?[{id:`dna_loc_${loc.id}`,entityId:`dna:loc:${loc.id}`,field:'description',value:desc,visibility:'observed',source:{provider:'user' as any,recordId:loc.id,chatId:snapshot?.at.key.chatId??'local',messageId:'story-dna',sourceFingerprint:'dna',observedAt:loc.lastUpdated},revealedAt:{key:snapshot?.at.key??({chatId:'local',assistantMessageId:'0',swipeId:0,sourceFingerprint:'0'} as any),paragraphIndex:0}}]:[]},
    current:false,
    pinned:false,
    label:desc,
    overview:desc,
    earlier:false,
   } as any);
  }
  for (const item of Object.values(this.storyDna.items)) {
   if (base.some(e=>e.entity.kind==='object'&&Boolean(findMatchingItem({[item.id]:item}, e.entity.name)))) continue;
   const desc=formatItemDNAToPromptClause(item) || item.description || 'Saved item profile.';
   merged.push({
    entity:{id:`dna:item:${item.id}`,kind:'object',name:item.name,aliases:item.aliases,firstParagraph:0,facts:desc?[{id:`dna_item_${item.id}`,entityId:`dna:item:${item.id}`,field:'description',value:desc,visibility:'observed',source:{provider:'user' as any,recordId:item.id,chatId:snapshot?.at.key.chatId??'local',messageId:'story-dna',sourceFingerprint:'dna',observedAt:item.lastUpdated},revealedAt:{key:snapshot?.at.key??({chatId:'local',assistantMessageId:'0',swipeId:0,sourceFingerprint:'0'} as any),paragraphIndex:0}}]:[]},
    current:false,
    pinned:false,
    label:desc,
    overview:desc,
    earlier:false,
   } as any);
  }
  return merged;
 }
 private openReferences():void {
  const snapshot=this.snapshot();this.hold();this.dismissTooltipPopover();
  this.card.setSceneHubContext(this.buildSceneHubContext(snapshot));
  this.card.openTray(this.mergedTrayEntries(snapshot),this.tray,(id,trigger)=>this.open(id,trigger),!this.prefs.enabled?'Story references are disabled. You can enable them in Reading settings.':this.limitationNote()??(!snapshot&&!Object.keys(this.storyDna.locations).length&&!Object.keys(this.storyDna.items).length?'No established references are available at this reading position.':this.prefs.rememberReferences&&this.history?.truncated?'Showing a limited recent selection of earlier descriptions.':undefined),entity=>this.resolveVisualContext(entity));
 }
 private limitationNote():string|undefined {
  if(this.presentation?.version!==2||!this.presentation.warnings?.length)return undefined;
  return this.presentation.availableThrough<this.presentation.paragraphCount-1?`Story references are available through paragraph ${this.presentation.availableThrough+1} of ${this.presentation.paragraphCount} for this long reply.`:'Some additional story references were omitted in this long reply.';
 }
 isOpen():boolean{return this.card.isOpen();}
 setTurnMedia(turn:TurnView|null):void{
  this.turnMedia=turn;
  this.setDocumentAssets(turn?.documentAssets);
 }
 setDocumentAssets(assets?:Record<string,DocumentAssetView>):void{
  this.documentAssets={...(assets??{})};
  this.documentArtBusy.clear();
  this.documentArtErrors.clear();
 }
 openTrayFromStage():boolean{
  const snapshot=this.snapshot();if(this.tray.hidden&&!Object.keys(this.storyDna.locations).length&&!Object.keys(this.storyDna.items).length)return false;
  const entries=this.mergedTrayEntries(snapshot);if(!entries.length)return false;
  this.hold();this.dossierOpen?.(true);this.dismissTooltipPopover();
  this.card.setSceneHubContext(this.buildSceneHubContext(snapshot));
  if(this.workspace){this.workspace.open('story',this.root.querySelector<HTMLElement>('[data-vn-control="lens"]')??this.tray);return true;}
  this.card.openTray(entries,this.tray,(id,trigger)=>this.open(id,trigger),this.prefs.rememberReferences&&this.history?.truncated?'Showing a limited recent selection of earlier descriptions.':undefined,entity=>this.resolveVisualContext(entity));
  return true;
 }
 openEntityFromStage(id:string,trigger:HTMLElement):void{this.open(id,trigger);}
 sceneHudEntries():Array<{id:string;name:string;kind:'npc'|'place'|'object';pinned:boolean}>{
  if(!this.ready||!this.prefs.enabled)return [];
  const snapshot=this.snapshot();if(!snapshot)return [];
  const entries=referenceEntriesWithHistory(snapshot,this.prefs,this.history).filter(e=>e.current);
  const places=entries.filter(e=>e.entity.kind==='place'&&snapshot.locationId&&e.entity.id===snapshot.locationId);
  const others=entries.filter(e=>!(e.entity.kind==='place'&&snapshot.locationId&&e.entity.id===snapshot.locationId));
  return [...places,...others].slice(0,6).map(e=>({id:e.entity.id,name:e.entity.name,kind:e.entity.kind,pinned:e.pinned}));
 }
 setContext(value:ReaderPresentation|undefined,paragraphs:readonly string[],history?:ReferenceHistory):void {
  this.dismissTooltipPopover();
  this.card.close();this.card.resetForContext();this.index=-1;this.ready=false;this.paragraphs=paragraphs;
  this.presentation=parseReaderPresentation(value,undefined,paragraphs.length);
  this.snapshotAt=this.presentation?createPresentationCursor(this.presentation):()=>undefined;
  this.resetLinkBudget();
  if(this.presentation?.documents)this.presentation.documents=validateStoryDocuments(this.presentation.documents,paragraphs.map(text=>({text:stripTextEffectTags(text)})));
  const key=this.presentation?presentationTurnKey(this.presentation):undefined;this.history=key?referenceHistoryFor(history,key):undefined;
  clearEntityAnchors(this.text);this.tray.hidden=true;
 }
 patchLore(value:ReaderPresentation|undefined,paragraphs:readonly string[],history?:ReferenceHistory):void {
  this.paragraphs=paragraphs;
  this.presentation=parseReaderPresentation(value,undefined,paragraphs.length);
  this.snapshotAt=this.presentation?createPresentationCursor(this.presentation):()=>undefined;
  this.resetLinkBudget();
  if(this.presentation?.documents)this.presentation.documents=validateStoryDocuments(this.presentation.documents,paragraphs.map(text=>({text:stripTextEffectTags(text)})));
  const key=this.presentation?presentationTurnKey(this.presentation):undefined;
  this.history=key?referenceHistoryFor(history,key):undefined;
  if(this.ready&&this.index>=0)this.refresh(this.index);
 }
 setHistory(history:ReferenceHistory|undefined):void{const key=this.presentation?presentationTurnKey(this.presentation):undefined,next=key?referenceHistoryFor(history,key):undefined;if(JSON.stringify(next)===JSON.stringify(this.history))return;this.history=next;this.dismissTooltipPopover();this.card.close();this.dossierOpen?.(false);if(this.ready)this.refresh(this.index);}
 setPreferences(value:TooltipPreferences):void{const next=normalizeTooltipPreferences(value);if(JSON.stringify(next)===JSON.stringify(this.prefs))return;this.prefs=next;this.resetLinkBudget();this.dismissTooltipPopover();this.card.close();this.dossierOpen?.(false);if(this.ready)this.refresh(this.index);else{clearEntityAnchors(this.text);this.tray.hidden=true;}}
 cursor(index:number):void{if(index!==this.index){this.dismissTooltipPopover();this.card.close();this.dossierOpen?.(false);this.npcActionToolsHandler?.(null);this.index=index;this.ready=false;this.tray.hidden=true;}}
 private snapshot(){return this.snapshotAt(this.index);}
 private dismissTooltipPopover():void {
  if(this.tooltipDismissCleanup){this.tooltipDismissCleanup();this.tooltipDismissCleanup=null;}
  if(this.tooltipPopover){this.tooltipPopover.remove();this.tooltipPopover=null;}
 }
 private showTooltipPopover(id:string,trigger:HTMLElement):void {
  const snapshot=this.snapshot();if(!snapshot){this.open(id,trigger);return;}
  if(this.tooltipPopover?.dataset.entityId===id){this.dismissTooltipPopover();return;}
  this.dismissTooltipPopover();
  const current=eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId).some(e=>e.id===id);
  const rawSelected=current?selectReaderDossier(id,snapshot,this.prefs.detail,this.prefs.fieldGroups,this.prefs.maxFactsPerEntity):selectEarlierDossier(id,snapshot,this.prefs,this.history);
  if(!rawSelected){this.open(id,trigger);return;}
  const selected=applyOverrideFactEdits(rawSelected,entityOverride(this.prefs,snapshot.at.key.chatId,rawSelected.entity));
  const entity=selected.entity;
  const visual=this.resolveVisualContext(entity);
  const matchedDoc=current&&entity.kind==='object'
   ? this.matchStoryDocument(entity,visibleStoryDocuments(this.presentation?.documents??[],Math.max(0,this.index)))
   : undefined;
  const docAsset=matchedDoc?this.documentAssets[matchedDoc.id]:undefined;

  const pop=document.createElement('div');
  pop.className='vn-inline-tooltip-popover';
  pop.dataset.entityId=id;
  if(matchedDoc)pop.dataset.docId=matchedDoc.id;
  pop.setAttribute('role','dialog');
  pop.setAttribute('aria-label',`${entity.name} quick summary`);
  pop.addEventListener('click',e=>e.stopPropagation());
  const head=document.createElement('div');head.className='vn-inline-tooltip-head';
  const thumb=document.createElement('div');thumb.className='vn-inline-tooltip-thumb';
  const thumbUrl=docAsset?.imageUrl??visual.imageUrl;
  if(thumbUrl){const img=document.createElement('img');img.src=thumbUrl;img.alt='';thumb.append(img);}
  else thumb.textContent=matchedDoc?'📄':entity.kind==='npc'?'👤':entity.kind==='place'?'📍':'✦';
  const title=document.createElement('div');title.className='vn-inline-tooltip-title';
  const strong=document.createElement('strong');strong.textContent=entity.name;
  const small=document.createElement('small');small.textContent=matchedDoc?`${matchedDoc.kind.charAt(0).toUpperCase()+matchedDoc.kind.slice(1)} · Document`:entity.kind==='npc'?'Character':entity.kind==='place'?'Location DNA':'Item / Artifact';
  title.append(strong,small);
  const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='vn-inline-tooltip-close';closeBtn.textContent='×';closeBtn.setAttribute('aria-label','Close summary');closeBtn.onclick=()=>this.dismissTooltipPopover();
  head.append(thumb,title,closeBtn);
  const body=document.createElement('p');body.className='vn-inline-tooltip-body';
  const matchedLoc=entity.kind==='place'?findMatchingLocation(this.storyDna.locations,entity.name):undefined;
  const matchedItem=entity.kind==='object'?findMatchingItem(this.storyDna.items,entity.name):undefined;
  const dnaSummary=matchedLoc?formatLocationDNAToPromptClause(matchedLoc):matchedItem?formatItemDNAToPromptClause(matchedItem):'';
  const docObsSummary=matchedDoc?(matchedDoc.visualDetails||matchedDoc.observations?.find(o=>Boolean(o.summary))?.summary||''):'';
  const docQuote=matchedDoc?.sections[0]?.text?`“${matchedDoc.sections[0].text.slice(0,140)}”`:'';
  const factLines=selected.facts.slice(0,2).map(f=>f.value);
  body.textContent=(matchedDoc?[docObsSummary,docQuote,...factLines]:[dnaSummary,...factLines]).filter(Boolean).slice(0,2).join('\n')||(visual.summarySnippet??'Established story reference.');
  const cta=document.createElement('button');cta.type='button';cta.className='vn-inline-tooltip-cta';
  cta.textContent=matchedDoc?'Inspect / Read Document →':entity.kind==='npc'?'Open in Character Folio →':'Inspect & Edit DNA in World Lens →';
  cta.onclick=()=>{
   this.dismissTooltipPopover();
   if(matchedDoc){
    this.hold();this.dossierOpen?.(true);
    if(this.workspace&&this.workspace.destination!=='story'){this.workspace.open('story',trigger);this.card.clearBack();}
    this.card.openDocument(matchedDoc,()=>this.open(id,trigger),trigger);
    return;
   }
   if(entity.kind==='npc'&&this.folioOpener){
    this.npcActionToolsHandler?.(this.buildNpcActionTools(entity.name), entity.name);
    this.folioOpener(entity.name);
    this.workspace?.open('character');
   }
   else this.open(id,trigger);
  };
  pop.append(head,body,cta);
  this.root.append(pop);
  const rect=typeof trigger.getBoundingClientRect==='function'?trigger.getBoundingClientRect():null;
  const stageRect=typeof this.root.getBoundingClientRect==='function'?this.root.getBoundingClientRect():null;
  const viewW=(stageRect&&stageRect.width>0)?stageRect.right:(typeof window!=='undefined'?window.innerWidth:1024);
  const viewLeft=(stageRect&&stageRect.width>0)?stageRect.left:0;
  const viewTop=(stageRect&&stageRect.height>0)?stageRect.top:0;
  const viewBottom=(stageRect&&stageRect.height>0)?stageRect.bottom:(typeof window!=='undefined'?window.innerHeight:720);
  const popW=pop.offsetWidth||310;
  const popH=pop.offsetHeight||168;
  if(rect&&(rect.width>0||rect.height>0)){
   const fitsAbove=(rect.top-viewTop)>=(popH+18);
   const top=fitsAbove
    ? Math.max(viewTop+10,rect.top-popH-10)
    : Math.min(viewBottom-popH-10,Math.max(viewTop+10,rect.bottom+8));
   const left=Math.max(viewLeft+10,Math.min(viewW-popW-10,rect.left));
   pop.style.top=`${top}px`;pop.style.left=`${left}px`;
  }else{
   pop.style.top=`${viewTop+56}px`;pop.style.left=`${viewLeft+16}px`;
  }
  this.tooltipPopover=pop;
  const doc=this.root.ownerDocument;
  const onDocClick=()=>{this.dismissTooltipPopover();};
  const onKeyDown=(e:KeyboardEvent)=>{if(e.key==='Escape')this.dismissTooltipPopover();};
  doc?.addEventListener?.('click',onDocClick);
  doc?.addEventListener?.('keydown',onKeyDown);
  this.tooltipDismissCleanup=()=>{doc?.removeEventListener?.('click',onDocClick);doc?.removeEventListener?.('keydown',onKeyDown);};
 }
 refresh(index:number):void {
  this.cursor(index);this.ready=true;clearEntityAnchors(this.text);
  const snapshot=this.snapshot();const eligible=snapshot?eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId):[];
  this.tray.hidden=!snapshot||!this.mergedTrayEntries(snapshot).length;if(!snapshot||!eligible.length||this.prefs.linking==='menu-only')return;
  // Global deterministic 24-link reply cap, evaluated only through this cursor.
  const {used,priorIds}=this.priorLinks(index);
  const visibleDocs=visibleStoryDocuments(this.presentation?.documents??[],Math.max(0,index));
  const docEntityIds=new Set(eligible.filter(e=>e.kind==='object'&&Boolean(this.matchStoryDocument(e,visibleDocs))).map(e=>e.id));
  const anchors=linkEntityMentions(this.text.textContent??'',snapshot.entities,this.prefs,snapshot.at.key.chatId,Math.min(this.prefs.maxLinksPerParagraph,24-used),protectedEntityRanges(this.text),this.prefs.linking==='important'?priorIds:new Set());
  applyEntityAnchors(this.text,anchors,(id,trigger)=>this.showTooltipPopover(id,trigger),id=>{
   const raw=selectReaderDossier(id,snapshot,'brief',this.prefs.fieldGroups);
   const edited=raw?applyOverrideFactEdits(raw,entityOverride(this.prefs,snapshot.at.key.chatId,raw.entity)):undefined;
   return edited?.facts[0]?.value??'View established story information';
  },id=>docEntityIds.has(id));
 }
 private resolveVisualContext(entity:PresentationEntity):DossierVisualContext {
  const snapshot=this.snapshot();
  const isPresent=Boolean(snapshot?.presentEntityIds.includes(entity.id));
  const isActiveLocation=Boolean(snapshot?.locationId&&snapshot.locationId===entity.id);
  const eligible=snapshot?eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId):[];
  const activePlace=snapshot?.locationId?eligible.find(e=>e.kind==='place'&&e.id===snapshot.locationId):undefined;
  const locationName=entity.kind!=='place'?activePlace?.name:undefined;
  const presentCharacters=entity.kind==='place'&&isActiveLocation?eligible.filter(e=>e.kind==='npc'&&snapshot!.presentEntityIds.includes(e.id)).map(e=>({id:e.id,name:e.name})):[];
  const matchedLoc=entity.kind==='place'?findMatchingLocation(this.storyDna.locations,entity.name):undefined;
  const matchedItem=entity.kind==='object'?findMatchingItem(this.storyDna.items,entity.name):undefined;
  let imageUrl:string|undefined=matchedLoc?.referenceImageUrl??matchedItem?.referenceImageUrl;
  let imageCaption:string|undefined;
  const names=new Set([entity.name,...entity.aliases].map(n=>n.trim().toLocaleLowerCase()).filter(Boolean));
  const urlOf=(a:AssetView)=>a.stageAsset?.displayImageUrl??sceneImageUrlFor(a)??undefined;
  const readyAssets=(this.turnMedia?.assets??[]).filter(a=>(a.status==='generated'||a.status==='browser_ready')&&Boolean(urlOf(a))&&a.paragraphIndex<=Math.max(0,this.index));
  const pool=readyAssets;
  if(!imageUrl&&entity.kind==='npc'){
   const portrait=[...pool].reverse().find(a=>a.stageAsset?.role==='portrait'&&a.stageAsset.character&&names.has(a.stageAsset.character.trim().toLocaleLowerCase()));
   if(portrait&&urlOf(portrait)){imageUrl=urlOf(portrait);imageCaption=`${entity.name}${portrait.stageAsset?.attire?` · ${portrait.stageAsset.attire}`:''}`;}
   else{
    const beat=[...pool].reverse().find(a=>{const snap=this.snapshotAt(a.paragraphIndex);return snap&&(snap.drawableEntityId===entity.id||snap.presentEntityIds.includes(entity.id));});
    if(beat&&urlOf(beat)){imageUrl=urlOf(beat);imageCaption=`Scene view · ${entity.name}`;}
    else if(isPresent&&this.displayedImageUrl?.()){imageUrl=this.displayedImageUrl()!;imageCaption=`Current scene · ${entity.name}`;}
   }
  }else if(!imageUrl&&entity.kind==='place'){
   const bg=[...pool].reverse().find(a=>{const snap=this.snapshotAt(a.paragraphIndex);return (a.stageAsset?.role==='background'||a.stageAsset?.role==='scene'||!a.stageAsset)&&snap?.locationId===entity.id;});
   if(bg&&urlOf(bg)){imageUrl=urlOf(bg);imageCaption=`Location view · ${entity.name}`;}
   else if(isActiveLocation&&this.displayedImageUrl?.()){imageUrl=this.displayedImageUrl()!;imageCaption=`Current location · ${entity.name}`;}
  }else if(!imageUrl){
   const prop=[...pool].reverse().find(a=>a.paragraphIndex===entity.firstParagraph||this.snapshotAt(a.paragraphIndex)?.drawableEntityId===entity.id);
   if(prop&&urlOf(prop)){imageUrl=urlOf(prop);imageCaption=`Scene detail · ${entity.name}`;}
   else if(isPresent&&this.displayedImageUrl?.()){imageUrl=this.displayedImageUrl()!;imageCaption=`Current scene · ${entity.name}`;}
  }
  const briefRaw=snapshot?selectReaderDossier(entity.id,snapshot,'brief',this.prefs.fieldGroups):undefined;
  const briefEdited=briefRaw&&snapshot?applyOverrideFactEdits(briefRaw,entityOverride(this.prefs,snapshot.at.key.chatId,entity)):briefRaw;
  const summaryFact=(matchedLoc?formatLocationDNAToPromptClause(matchedLoc):matchedItem?formatItemDNAToPromptClause(matchedItem):'')||briefEdited?.facts[0]?.value;
  const anchorFact=entity.facts.find(f=>f.field==='anchors'||f.field==='anchor_traits'||f.field==='visual_anchors');const anchors=anchorFact?anchorFact.value.split(/[,;\n]/).map(a=>a.trim()).filter(Boolean):undefined;
  return {
   ...(imageUrl?{imageUrl}:{}),
   ...(imageCaption?{imageCaption}:{}),
   isPresent,
   isActiveLocation,
   ...(locationName?{locationName}:{}),
   ...(presentCharacters.length?{presentCharacters}:{}),
   ...(matchedLoc?.connectedLocations?.length?{connectedLocations:matchedLoc.connectedLocations}:{}),
   ...(summaryFact?{summarySnippet:summaryFact}:{}),
   ...(anchors&&anchors.length?{anchors}:{}),
   onSelectEntity:(targetId,trigger)=>this.open(targetId,trigger),
  };
 }
 private open(id:string,trigger:HTMLElement):void {
  this.dismissTooltipPopover();
  const snapshot=this.snapshot();
  if(id.startsWith('dna:loc:')||id.startsWith('dna:item:')){
   const isLoc=id.startsWith('dna:loc:');
   const slug=id.slice(isLoc?'dna:loc:'.length:'dna:item:'.length);
   const loc=isLoc?this.storyDna.locations[slug]:undefined;
   const item=!isLoc?this.storyDna.items[slug]:undefined;
   if(loc||item){
    const entity:PresentationEntity=loc
     ?{id,kind:'place',name:loc.name,aliases:loc.aliases,firstParagraph:0,facts:[]}
     :{id,kind:'object',name:item!.name,aliases:item!.aliases,firstParagraph:0,facts:[]};
    const rawSynthetic={entity,facts:[],overview:[],earlier:[],state:{}} as unknown as NonNullable<ReturnType<typeof selectReaderDossier>>;
    const synthetic=snapshot?applyOverrideFactEdits(rawSynthetic,entityOverride(this.prefs,snapshot.at.key.chatId,entity)):rawSynthetic;
    const syntheticActions=this.prefs.actionsEnabled&&this.draftTools?{
     drafts:buildSyntheticInteractionDraft(entity,snapshot?.at.key,snapshot?.at.paragraphIndex??Math.max(0,this.index)),
     current:this.draftTools.current,focus:this.draftTools.focus,
     apply:(draft:InteractionDraft,mode:DraftMergeMode)=>{
      if(!this.prefs.enabled||!this.prefs.actionsEnabled||!this.draftTools)return false;
      const text=mergeInteractionDraft(this.draftTools.current(),draft.text,mode);
      return text!==null&&this.draftTools.apply(text);
     }
    }:undefined;
    const itemDocument=!isLoc?this.matchStoryDocument(entity,visibleStoryDocuments(this.presentation?.documents??[],Math.max(0,this.index))):undefined;
    this.hold();this.dossierOpen?.(true);
    if(this.workspace&&this.workspace.destination!=='story'){this.workspace.open('story',trigger);this.card.clearBack();}
    this.card.open(synthetic as unknown as NonNullable<ReturnType<typeof selectReaderDossier>>,this.prefs,snapshot?.at.key.chatId??'local',trigger,syntheticActions,itemDocument,this.resolveVisualContext(entity));
   }
   return;
  }
  if(!snapshot)return;
  const current=eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId).some(e=>e.id===id);
  const selected=current?selectReaderDossier(id,snapshot,this.prefs.detail,this.prefs.fieldGroups,this.prefs.maxFactsPerEntity):selectEarlierDossier(id,snapshot,this.prefs,this.history);
  if(!selected)return;
  if(selected.entity.kind==='npc'&&this.folioOpener){
   this.npcActionToolsHandler?.(this.buildNpcActionTools(selected.entity.name), selected.entity.name);
   this.folioOpener(selected.entity.name);
   this.workspace?.open('character');
   return;
  }
  const rawDossier=current?dossierWithHistory(selected,snapshot,this.prefs,this.history):selected;
  const dossier=applyOverrideFactEdits(rawDossier,entityOverride(this.prefs,snapshot.at.key.chatId,rawDossier.entity));this.hold();this.dossierOpen?.(true);
  const actions=current&&this.prefs.actionsEnabled&&this.draftTools?{
   drafts:availableInteractionVerbs(dossier.entity,snapshot).flatMap(verb=>{const draft=buildInteractionDraft(dossier.entity,verb,snapshot);return draft?[draft]:[];}),
   current:this.draftTools.current,focus:this.draftTools.focus,
   apply:(draft:InteractionDraft,mode:DraftMergeMode)=>{
    const now=this.snapshot();if(!now||!this.ready||!this.prefs.enabled||!this.prefs.actionsEnabled||!samePresentationTurn(now.at.key,draft.key)||now.at.paragraphIndex!==draft.paragraphIndex)return false;
    const entity=eligibleEntities(now.entities,this.prefs,now.at.key.chatId).find(e=>e.id===draft.entityId);
    if(!entity||!buildInteractionDraft(entity,draft.verb,now))return false;
    const text=mergeInteractionDraft(this.draftTools!.current(),draft.text,mode);return text!==null&&this.draftTools!.apply(text);
   }
  }:undefined;
  const storyDocument=current&&dossier.entity.kind==='object'?this.matchStoryDocument(dossier.entity,visibleStoryDocuments(this.presentation?.documents??[],this.index)):undefined;

  // Inline story links must enter the workspace before exposing its docked card.
  if(this.workspace&&this.workspace.destination!=='story'){this.workspace.open('story',trigger);this.card.clearBack();}
  this.card.open(dossier,this.prefs,snapshot.at.key.chatId,trigger,actions,storyDocument,this.resolveVisualContext(dossier.entity));
 }
 private updateOverride(entity:PresentationEntity,patch:{suppressed?:boolean;pinned?:boolean;note?:string;factEdits?:Record<string,string|null>}):boolean {
  const snapshot=this.snapshot();if(!snapshot)return false;const chatId=snapshot.at.key.chatId;
  const existing=entityOverride(this.prefs,chatId,entity);
  if(!existing&&this.prefs.overrides.length>=64)return false;
  const {factEdits:patchFactEdits,...restPatch}=patch;
  const mergedFactEdits=patchFactEdits?{...(existing?.factEdits??{}),...patchFactEdits}:existing?.factEdits;
  const override={chatId,kind:entity.kind,name:entity.name,suppressed:false,pinned:false,note:'',...existing,...restPatch,...(mergedFactEdits?{factEdits:mergedFactEdits}:{})};
  this.prefs={...this.prefs,overrides:[override,...this.prefs.overrides.filter(o=>!(o.chatId===chatId&&o.kind===entity.kind&&o.name===entity.name))].slice(0,64)};
  this.resetLinkBudget();
  this.save(this.prefs);this.refresh(this.index);return true;
 }
 destroy():void{this.dismissTooltipPopover();this.card.destroy();this.tray.remove();}
}
