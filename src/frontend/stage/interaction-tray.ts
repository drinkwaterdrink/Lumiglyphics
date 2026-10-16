import type { InteractionDraft, DraftMergeMode, InteractionVerb } from '../../shared/scene-interactions.js';
/** Shared editable intention; deliberately has no provider ID, odds or Send action. */
export class ReplyDraftEditor {
 readonly host=document.createElement('div');
 private input=document.createElement('textarea');
 private status=document.createElement('p');
 private insert=document.createElement('button');private replace=document.createElement('button');
 private applied=false;
 constructor(private currentDraft:()=>string,private apply:(text:string,mode:DraftMergeMode)=>boolean,onCancel?:()=>void){
  this.host.hidden=true;this.host.dataset.vnDraftEditor='';
  for(const name of ['click','pointerdown','keydown','wheel'])this.host.addEventListener(name,event=>event.stopPropagation());
  const label=document.createElement('label');label.textContent='Your intended action';
  this.input.maxLength=6000;this.input.rows=3;this.input.setAttribute('aria-label','Action draft');label.append(this.input);this.host.append(label);
  this.status.setAttribute('role','status');this.host.append(this.status);
  this.insert.type=this.replace.type='button';this.insert.textContent='Insert into reply';this.replace.textContent='Replace reply draft';
  const commit=(mode:DraftMergeMode)=>{
   if(this.applied||!this.input.value.trim())return;
   if(this.apply(this.input.value,mode)){this.applied=true;this.insert.disabled=this.replace.disabled=true;}
   else this.status.textContent='This scene or move changed, or the draft is too long. Reopen it and try again.';
  };
  this.insert.onclick=()=>commit('insert');this.replace.onclick=()=>commit('replace');this.host.append(this.insert,this.replace);
  if(onCancel){const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=onCancel;this.host.append(cancel);}
 }
 open(text:string):void {this.applied=false;this.input.value=text;this.host.hidden=false;this.status.textContent='';this.insert.disabled=this.replace.disabled=false;this.replace.hidden=!this.currentDraft().trim();this.input.focus();}
 close():void{this.host.hidden=true;}
}
export class InteractionTray {
 readonly host=document.createElement('details');
 constructor(drafts:InteractionDraft[],currentDraft:()=>string,apply:(draft:InteractionDraft,mode:DraftMergeMode)=>boolean) {
  this.host.dataset.vnInteractionDraft='';
  const summary=document.createElement('summary');summary.textContent='Prepare an action';this.host.append(summary);
  const help=document.createElement('p');help.textContent='Choose an intention, edit it, then add it to your reply. Nothing is sent until you press Send at Your turn.';this.host.append(help);
  const choices=document.createElement('div');choices.dataset.vnInteractionVerbs='';
  const labels:Record<InteractionVerb,string>={ask:'Ask',examine:'Examine',approach:'Approach',use:'Use',custom:'Custom'};
  let selected:InteractionDraft|null=null;
  const editor=new ReplyDraftEditor(currentDraft,(text,mode)=>!!selected&&apply({...selected,text},mode));
  for(const draft of drafts){const button=document.createElement('button');button.type='button';button.textContent=labels[draft.verb];button.onclick=()=>{selected=draft;editor.open(draft.text);};choices.append(button);}
  this.host.append(choices,editor.host);
 }
}
