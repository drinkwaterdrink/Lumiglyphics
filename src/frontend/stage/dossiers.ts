import type { ReaderWorkspace } from "./reader-workspace.js";
import {validateStoryDocuments,visibleStoryDocuments} from '../../shared/story-documents.js';
import {stripTextEffectTags} from '../../shared/text-effects.js';
import {availableInteractionVerbs,buildInteractionDraft,mergeInteractionDraft} from '../../shared/scene-interactions.js';
import {referenceEntriesWithHistory,dossierWithHistory,selectEarlierDossier,normalizeTooltipPreferences,linkEntityMentions,eligibleEntities,selectReaderDossier,entityOverride,type TooltipPreferences} from '../../shared/dossiers.js';
import {referenceHistoryFor,type ReferenceHistory} from '../../shared/reference-history.js';
import {ReaderPresentationSchema,samePresentationTurn,type ReaderPresentation,type PresentationEntity} from '../../shared/presentation-entities.js';
import {applyEntityAnchors,clearEntityAnchors,protectedEntityRanges} from './entity-anchors.js';
import {DossierCard,DOSSIER_CSS,DOCKED_DOSSIER_CSS} from './dossier-card.js';
export class StageDossiers {
 private prefs=normalizeTooltipPreferences({});private presentation:ReaderPresentation|undefined;private paragraphs:readonly string[]=[];private index=-1;
 private history:ReferenceHistory|undefined;
 private workspace:ReaderWorkspace|undefined;
 private card:DossierCard;private tray=document.createElement('button');private ready=false;
 constructor(private root:HTMLElement,private text:HTMLElement,controls:HTMLElement,private hold:()=>void,private release:()=>void,private save:(prefs:TooltipPreferences)=>void,private draftTools?:{current:()=>string;apply:(text:string)=>boolean;focus:()=>void},documentOpen?:(open:boolean)=>void) {
  const style=document.createElement('style');style.textContent=DOSSIER_CSS;root.append(style);
  this.card=new DossierCard(root,()=>{this.workspace?.toolClosed("story");this.release();},(entity,patch)=>this.updateOverride(entity,patch),documentOpen);
  this.tray.type='button';this.tray.dataset.vnReferences='';this.tray.dataset.vnControl='references';this.tray.innerHTML='<span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 5.5c-3-2-6.5-2-9-1v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Z"/><path d="M12 5.5v14M6 8h3M6 11h3M15 8h3M15 11h3"/></svg></span>';this.tray.title='Scene references';this.tray.setAttribute('aria-label','Scene references');this.tray.hidden=true;
  this.tray.onclick=event=>{event.stopPropagation();if(this.workspace)this.workspace.open('story',this.tray);else this.openReferences();};controls.append(this.tray);
 }
 connectWorkspace(workspace:ReaderWorkspace,mount:HTMLElement):void {
  this.workspace=workspace;
  const style=document.createElement('style');style.textContent=DOSSIER_CSS+DOCKED_DOSSIER_CSS;mount.append(style);
  this.card.setDocked();
  workspace.register('story',{element:this.card.host,hideAtHome:true,enter:()=>this.openReferences(),leave:()=>this.card.close(),back:()=>this.card.back()});
 }
 private openReferences():void {
  const snapshot=this.snapshot();this.hold();
  this.card.openTray(snapshot?referenceEntriesWithHistory(snapshot,this.prefs,this.history):[],this.tray,(id,trigger)=>this.open(id,trigger),!this.prefs.enabled?'Story references are disabled. You can enable them in Reading settings.':!snapshot?'No established references are available at this reading position.':this.prefs.rememberReferences&&this.history?.truncated?'Showing a limited recent selection of earlier descriptions.':undefined);
 }
 isOpen():boolean{return this.card.isOpen();}
 setContext(value:ReaderPresentation|undefined,paragraphs:readonly string[],history?:ReferenceHistory):void {
  this.card.close();this.card.resetForContext();this.index=-1;this.ready=false;this.paragraphs=paragraphs;
  const parsed=ReaderPresentationSchema.safeParse(value);
  this.presentation=parsed.success&&JSON.stringify(parsed.data).length<=512000&&parsed.data.snapshots.length===paragraphs.length&&parsed.data.snapshots.every((s,i)=>s.at.paragraphIndex===i&&samePresentationTurn(s.at.key,parsed.data.snapshots[0]!.at.key))?parsed.data:undefined;
  if(this.presentation?.documents)this.presentation.documents=validateStoryDocuments(this.presentation.documents,paragraphs.map(text=>({text:stripTextEffectTags(text)})));
  const key=this.presentation?.snapshots[0]?.at.key;this.history=key?referenceHistoryFor(history,key):undefined;
  clearEntityAnchors(this.text);this.tray.hidden=true;
 }
 setHistory(history:ReferenceHistory|undefined):void{const key=this.presentation?.snapshots[0]?.at.key,next=key?referenceHistoryFor(history,key):undefined;if(JSON.stringify(next)===JSON.stringify(this.history))return;this.history=next;this.card.close();if(this.ready)this.refresh(this.index);}
 setPreferences(value:TooltipPreferences):void{const next=normalizeTooltipPreferences(value);if(JSON.stringify(next)===JSON.stringify(this.prefs))return;this.prefs=next;this.card.close();if(this.ready)this.refresh(this.index);else{clearEntityAnchors(this.text);this.tray.hidden=true;}}
 cursor(index:number):void{if(index!==this.index){this.card.close();this.index=index;this.ready=false;this.tray.hidden=true;}}
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
 private open(id:string,trigger:HTMLElement):void {
  const snapshot=this.snapshot();if(!snapshot)return;
  const current=eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId).some(e=>e.id===id);
  const selected=current?selectReaderDossier(id,snapshot,this.prefs.detail,this.prefs.fieldGroups):selectEarlierDossier(id,snapshot,this.prefs,this.history);
  if(!selected)return;const dossier=current?dossierWithHistory(selected,snapshot,this.prefs,this.history):selected;this.hold();
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
  const fromReader=this.workspace?.destination!=='story';
  this.workspace?.open('story',trigger);
  if(fromReader)this.card.clearBack();
  this.card.open(dossier,this.prefs,snapshot.at.key.chatId,trigger,actions,storyDocument);
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
