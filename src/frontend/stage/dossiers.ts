import {normalizeTooltipPreferences,linkEntityMentions,eligibleEntities,selectReaderDossier,entityOverride,type TooltipPreferences} from '../../shared/dossiers.js';
import {ReaderPresentationSchema,samePresentationTurn,type ReaderPresentation,type PresentationEntity} from '../../shared/presentation-entities.js';
import {applyEntityAnchors,clearEntityAnchors,protectedEntityRanges} from './entity-anchors.js';
import {DossierCard,DOSSIER_CSS} from './dossier-card.js';
export class StageDossiers {
 private prefs=normalizeTooltipPreferences({});private presentation:ReaderPresentation|undefined;private paragraphs:readonly string[]=[];private index=-1;
 private card:DossierCard;private tray=document.createElement('button');private ready=false;
 constructor(private root:HTMLElement,private text:HTMLElement,controls:HTMLElement,private hold:()=>void,private release:()=>void,private save:(prefs:TooltipPreferences)=>void) {
  const style=document.createElement('style');style.textContent=DOSSIER_CSS;root.append(style);
  this.card=new DossierCard(root,()=>this.release(),(entity,patch)=>this.updateOverride(entity,patch));
  this.tray.type='button';this.tray.dataset.vnReferences='';this.tray.dataset.vnControl='references';this.tray.innerHTML='<span data-vn-control-icon aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 5.5c-3-2-6.5-2-9-1v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Z"/><path d="M12 5.5v14M6 8h3M6 11h3M15 8h3M15 11h3"/></svg></span>';this.tray.title='Scene references';this.tray.setAttribute('aria-label','Scene references');this.tray.hidden=true;
  this.tray.onclick=event=>{event.stopPropagation();const snapshot=this.snapshot();if(!snapshot)return;this.hold();this.card.openTray(eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId),this.tray,(id,trigger)=>this.open(id,trigger));};controls.append(this.tray);
 }
 isOpen():boolean{return this.card.isOpen();}
 setContext(value:ReaderPresentation|undefined,paragraphs:readonly string[]):void {
  this.card.close();this.index=-1;this.ready=false;this.paragraphs=paragraphs;
  const parsed=ReaderPresentationSchema.safeParse(value);
  this.presentation=parsed.success&&JSON.stringify(parsed.data).length<=512000&&parsed.data.snapshots.length===paragraphs.length&&parsed.data.snapshots.every((s,i)=>s.at.paragraphIndex===i&&samePresentationTurn(s.at.key,parsed.data.snapshots[0]!.at.key))?parsed.data:undefined;
  clearEntityAnchors(this.text);this.tray.hidden=true;
 }
 setPreferences(value:TooltipPreferences):void{const next=normalizeTooltipPreferences(value);if(JSON.stringify(next)===JSON.stringify(this.prefs))return;this.prefs=next;this.card.close();if(this.ready)this.refresh(this.index);else{clearEntityAnchors(this.text);this.tray.hidden=true;}}
 cursor(index:number):void{if(index!==this.index){this.card.close();this.index=index;this.ready=false;this.tray.hidden=true;}}
 private snapshot(){const snapshot=this.presentation?.snapshots[this.index];return snapshot?{...snapshot,entities:snapshot.entities.filter(e=>e.firstParagraph<=this.index)}:undefined;}
 refresh(index:number):void {
  this.cursor(index);this.ready=true;clearEntityAnchors(this.text);
  const snapshot=this.snapshot();const eligible=snapshot?eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId):[];
  this.tray.hidden=!eligible.length;if(!snapshot||!eligible.length)return;
  // Global deterministic 24-link reply cap, evaluated only through this cursor.
  let used=0;const priorIds=new Set<string>();
  for(let i=0;i<index;i++) {
   const s=this.presentation!.snapshots[i]!;
   const anchors=linkEntityMentions(this.paragraphs[i]??'',s.entities,this.prefs,s.at.key.chatId,Math.min(this.prefs.maxLinksPerParagraph,24-used),[],this.prefs.linking==='important'?priorIds:new Set());used+=anchors.length;for(const a of anchors)priorIds.add(a.entityId);
  }
  const anchors=linkEntityMentions(this.text.textContent??'',snapshot.entities,this.prefs,snapshot.at.key.chatId,Math.min(this.prefs.maxLinksPerParagraph,24-used),protectedEntityRanges(this.text),this.prefs.linking==='important'?priorIds:new Set());
  applyEntityAnchors(this.text,anchors,(id,trigger)=>this.open(id,trigger),id=>selectReaderDossier(id,snapshot,'brief')?.facts[0]?.value??'View established story information');
 }
 private open(id:string,trigger:HTMLElement):void {
  const snapshot=this.snapshot();if(!snapshot||!eligibleEntities(snapshot.entities,this.prefs,snapshot.at.key.chatId).some(e=>e.id===id))return;
  const dossier=selectReaderDossier(id,snapshot,this.prefs.detail);if(!dossier)return;this.hold();this.card.open(dossier,this.prefs,snapshot.at.key.chatId,trigger);
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
