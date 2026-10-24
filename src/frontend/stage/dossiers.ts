import {validateStoryDocuments,visibleStoryDocuments} from '../../shared/story-documents.js';
import {stripTextEffectTags} from '../../shared/text-effects.js';
import {availableInteractionVerbs,buildInteractionDraft,mergeInteractionDraft} from '../../shared/scene-interactions.js';
import {referenceEntriesWithHistory,dossierWithHistory,selectEarlierDossier,normalizeTooltipPreferences,linkEntityMentions,eligibleEntities,selectReaderDossier,entityOverride,type TooltipPreferences} from '../../shared/dossiers.js';
import {referenceHistoryFor,type ReferenceHistory} from '../../shared/reference-history.js';
import {ReaderPresentationSchema,samePresentationTurn,type ReaderPresentation,type PresentationEntity} from '../../shared/presentation-entities.js';
import type {AssetView,TurnView} from '../../protocol.js';
import {applyEntityAnchors,clearEntityAnchors,protectedEntityRanges} from './entity-anchors.js';
import {DossierCard,DOSSIER_CSS,type DossierVisualContext} from './dossier-card.js';

export class StageDossiers {
 private prefs=normalizeTooltipPreferences({});private presentation:ReaderPresentation|undefined;private paragraphs:readonly string[]=[];private index=-1;
 private history:ReferenceHistory|undefined;private turnMedia:TurnView|null=null;
 private card:DossierCard;private tray=document.createElement('button');private ready=false;
 constructor(private root:HTMLElement,private text:HTMLElement,controls:HTMLElement,private hold:()=>void,private release:()=>void,private save:(prefs:TooltipPreferences)=>void,private draftTools?:{current:()=>string;apply:(text:string)=>boolean;focus:()=>void},documentOpen?:(open:boolean)=>void,private dossierOpen?:(open:boolean)=>void,private displayedImageUrl?:()=>string|null) {
  const style=document.createElement('style');style.textContent=DOSSIER_CSS;root.append(style);
  this.card=new DossierCard(root,()=>{this.dossierOpen?.(false);this.release();},(entity,patch)=>this.updateOverride(entity,patch),documentOpen);
  this.tray.type='button';this.tray.dataset.vnReferences='';this.tray.dataset.vnControl='references';this.tray.innerHTML='<span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 5.5c-3-2-6.5-2-9-1v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Z"/><path d="M12 5.5v14M6 8h3M6 11h3M15 8h3M15 11h3"/></svg></span>';this.tray.title='Scene references (R)';this.tray.setAttribute('aria-label','Scene references');this.tray.hidden=true;
  this.tray.onclick=event=>{event.stopPropagation();this.openTrayFromStage();};controls.append(this.tray);
 }
 isOpen():boolean{return this.card.isOpen();}
 setTurnMedia(turn:TurnView|null):void{this.turnMedia=turn;}
 openTrayFromStage():boolean{
  const snapshot=this.snapshot();if(!snapshot||this.tray.hidden)return false;
  const entries=referenceEntriesWithHistory(snapshot,this.prefs,this.history);if(!entries.length)return false;
  this.hold();this.dossierOpen?.(true);
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
  this.card.close();this.dossierOpen?.(false);this.index=-1;this.ready=false;this.paragraphs=paragraphs;
  const parsed=ReaderPresentationSchema.safeParse(value);
  this.presentation=parsed.success&&JSON.stringify(parsed.data).length<=512000&&parsed.data.snapshots.length===paragraphs.length&&parsed.data.snapshots.every((s,i)=>s.at.paragraphIndex===i&&samePresentationTurn(s.at.key,parsed.data.snapshots[0]!.at.key))?parsed.data:undefined;
  if(this.presentation?.documents)this.presentation.documents=validateStoryDocuments(this.presentation.documents,paragraphs.map(text=>({text:stripTextEffectTags(text)})));
  const key=this.presentation?.snapshots[0]?.at.key;this.history=key?referenceHistoryFor(history,key):undefined;
  clearEntityAnchors(this.text);this.tray.hidden=true;
 }
 setHistory(history:ReferenceHistory|undefined):void{const key=this.presentation?.snapshots[0]?.at.key,next=key?referenceHistoryFor(history,key):undefined;if(JSON.stringify(next)===JSON.stringify(this.history))return;this.history=next;this.card.close();this.dossierOpen?.(false);if(this.ready)this.refresh(this.index);}
 setPreferences(value:TooltipPreferences):void{const next=normalizeTooltipPreferences(value);if(JSON.stringify(next)===JSON.stringify(this.prefs))return;this.prefs=next;this.card.close();this.dossierOpen?.(false);if(this.ready)this.refresh(this.index);else{clearEntityAnchors(this.text);this.tray.hidden=true;}}
 cursor(index:number):void{if(index!==this.index){this.card.close();this.dossierOpen?.(false);this.index=index;this.ready=false;this.tray.hidden=true;}}
 private snapshot(){const snapshot=this.presentation?.snapshots[this.index];return snapshot?{...snapshot,entities:snapshot.entities.filter(e=>e.firstParagraph<=this.index)}:undefined;}
 refresh(index:number):void {
  this.cursor(index);this.ready=true;clearEntityAnchors(this.text);
  const snapshot=this.snapshot();const eligible=snapshot?eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId):[];
  this.tray.hidden=!snapshot||!referenceEntriesWithHistory(snapshot,this.prefs,this.history).length;if(!snapshot||!eligible.length||this.prefs.linking==='menu-only')return;
  // Global deterministic 24-link reply cap, evaluated only through this cursor.
  let used=0;const priorIds=new Set<string>();
  for(let i=0;i<index;i++) {
   const s=this.presentation!.snapshots[i]!;
   const anchors=linkEntityMentions(this.paragraphs[i]??'',s.entities,this.prefs,s.at.key.chatId,Math.min(this.prefs.maxLinksPerParagraph,24-used),[],this.prefs.linking==='important'?priorIds:new Set());used+=anchors.length;for(const a of anchors)priorIds.add(a.entityId);
  }
  const anchors=linkEntityMentions(this.text.textContent??'',snapshot.entities,this.prefs,snapshot.at.key.chatId,Math.min(this.prefs.maxLinksPerParagraph,24-used),protectedEntityRanges(this.text),this.prefs.linking==='important'?priorIds:new Set());
  applyEntityAnchors(this.text,anchors,(id,trigger)=>this.open(id,trigger),id=>selectReaderDossier(id,snapshot,'brief',this.prefs.fieldGroups)?.facts[0]?.value??'View established story information');
 }
 private resolveVisualContext(entity:PresentationEntity):DossierVisualContext {
  const snapshot=this.snapshot();
  const isPresent=Boolean(snapshot?.presentEntityIds.includes(entity.id));
  const isActiveLocation=Boolean(snapshot?.locationId&&snapshot.locationId===entity.id);
  const eligible=snapshot?eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId):[];
  const activePlace=snapshot?.locationId?eligible.find(e=>e.kind==='place'&&e.id===snapshot.locationId):undefined;
  const locationName=entity.kind!=='place'?activePlace?.name:undefined;
  const presentCharacters=entity.kind==='place'&&isActiveLocation?eligible.filter(e=>e.kind==='npc'&&snapshot!.presentEntityIds.includes(e.id)).map(e=>({id:e.id,name:e.name})):[];
  let imageUrl:string|undefined;
  let imageCaption:string|undefined;
  const names=new Set([entity.name,...entity.aliases].map(n=>n.trim().toLocaleLowerCase()).filter(Boolean));
  const urlOf=(a:AssetView)=>a.stageAsset?.displayImageUrl??a.imageUrl;
  const readyAssets=(this.turnMedia?.assets??[]).filter(a=>(a.status==='generated'||a.status==='browser_ready')&&Boolean(urlOf(a))&&a.paragraphIndex<=Math.max(0,this.index));
  const allReadyAssets=(this.turnMedia?.assets??[]).filter(a=>(a.status==='generated'||a.status==='browser_ready')&&Boolean(urlOf(a)));
  const pool=readyAssets.length?readyAssets:allReadyAssets;
  if(entity.kind==='npc'){
   const portrait=[...pool].reverse().find(a=>a.stageAsset?.role==='portrait'&&a.stageAsset.character&&names.has(a.stageAsset.character.trim().toLocaleLowerCase()));
   if(portrait&&urlOf(portrait)){imageUrl=urlOf(portrait);imageCaption=`${entity.name}${portrait.stageAsset?.attire?` · ${portrait.stageAsset.attire}`:''}`;}
   else{
    const beat=[...pool].reverse().find(a=>{const snap=this.presentation?.snapshots[a.paragraphIndex];return snap&&(snap.drawableEntityId===entity.id||snap.presentEntityIds.includes(entity.id));});
    if(beat&&urlOf(beat)){imageUrl=urlOf(beat);imageCaption=`Scene view · ${entity.name}`;}
    else if(isPresent&&this.displayedImageUrl?.()){imageUrl=this.displayedImageUrl()!;imageCaption=`Current scene · ${entity.name}`;}
   }
  }else if(entity.kind==='place'){
   const bg=[...pool].reverse().find(a=>{const snap=this.presentation?.snapshots[a.paragraphIndex];return (a.stageAsset?.role==='background'||a.stageAsset?.role==='scene'||!a.stageAsset)&&(snap?.locationId===entity.id||isActiveLocation);});
   if(bg&&urlOf(bg)){imageUrl=urlOf(bg);imageCaption=`Location view · ${entity.name}`;}
   else if(isActiveLocation&&this.displayedImageUrl?.()){imageUrl=this.displayedImageUrl()!;imageCaption=`Current location · ${entity.name}`;}
  }else{
   const prop=[...pool].reverse().find(a=>a.paragraphIndex===entity.firstParagraph||this.presentation?.snapshots[a.paragraphIndex]?.drawableEntityId===entity.id);
   if(prop&&urlOf(prop)){imageUrl=urlOf(prop);imageCaption=`Scene detail · ${entity.name}`;}
   else if(isPresent&&this.displayedImageUrl?.()){imageUrl=this.displayedImageUrl()!;imageCaption=`Current scene · ${entity.name}`;}
  }
  const summaryFact=snapshot?selectReaderDossier(entity.id,snapshot,'brief',this.prefs.fieldGroups)?.facts[0]?.value:undefined;
  return {
   ...(imageUrl?{imageUrl}:{}),
   ...(imageCaption?{imageCaption}:{}),
   isPresent,
   isActiveLocation,
   ...(locationName?{locationName}:{}),
   ...(presentCharacters.length?{presentCharacters}:{}),
   ...(summaryFact?{summarySnippet:summaryFact}:{}),
   onSelectEntity:(targetId,trigger)=>this.open(targetId,trigger),
  };
 }
 private open(id:string,trigger:HTMLElement):void {
  const snapshot=this.snapshot();if(!snapshot)return;
  const current=eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId).some(e=>e.id===id);
  const selected=current?selectReaderDossier(id,snapshot,this.prefs.detail,this.prefs.fieldGroups,this.prefs.maxFactsPerEntity):selectEarlierDossier(id,snapshot,this.prefs,this.history);
  if(!selected)return;const dossier=current?dossierWithHistory(selected,snapshot,this.prefs,this.history):selected;this.hold();this.dossierOpen?.(true);
  const actions=current&&this.prefs.actionsEnabled&&this.draftTools?{
   drafts:availableInteractionVerbs(dossier.entity,snapshot).flatMap(verb=>{const draft=buildInteractionDraft(dossier.entity,verb,snapshot);return draft?[draft]:[];}),
   current:this.draftTools.current,focus:this.draftTools.focus,
   apply:(draft:import('../../shared/scene-interactions.js').InteractionDraft,mode:import('../../shared/scene-interactions.js').DraftMergeMode)=>{
    const now=this.snapshot();if(!now||!this.ready||!this.prefs.enabled||!this.prefs.actionsEnabled||!samePresentationTurn(now.at.key,draft.key)||now.at.paragraphIndex!==draft.paragraphIndex)return false;
    const entity=eligibleEntities(now.entities,this.prefs,now.at.key.chatId).find(e=>e.id===draft.entityId);
    if(!entity||!buildInteractionDraft(entity,draft.verb,now))return false;
    const text=mergeInteractionDraft(this.draftTools!.current(),draft.text,mode);return text!==null&&this.draftTools!.apply(text);
   }
  }:undefined;
  const storyDocument=current&&dossier.entity.kind==='object'?visibleStoryDocuments(this.presentation?.documents??[],this.index).find(d=>d.name===dossier.entity.name):undefined;
  this.card.open(dossier,this.prefs,snapshot.at.key.chatId,trigger,actions,storyDocument,this.resolveVisualContext(dossier.entity));
 }
 private updateOverride(entity:PresentationEntity,patch:{suppressed?:boolean;pinned?:boolean;note?:string}):boolean {
  const snapshot=this.snapshot();if(!snapshot)return false;const chatId=snapshot.at.key.chatId;
  const existing=entityOverride(this.prefs,chatId,entity);
  if(!existing&&this.prefs.overrides.length>=64)return false;
  const override={chatId,kind:entity.kind,name:entity.name,suppressed:false,pinned:false,note:'',...existing,...patch};
  this.prefs={...this.prefs,overrides:[override,...this.prefs.overrides.filter(o=>!(o.chatId===chatId&&o.kind===entity.kind&&o.name===entity.name))].slice(0,64)};
  this.save(this.prefs);this.refresh(this.index);return true;
 }
 destroy():void{this.card.destroy();this.tray.remove();}
}
