import type { InteractionDraft, DraftMergeMode, InteractionVerb } from '../../shared/scene-interactions.js';
export class InteractionTray {
 readonly host=document.createElement('details');
 constructor(drafts:InteractionDraft[],currentDraft:()=>string,apply:(draft:InteractionDraft,mode:DraftMergeMode)=>boolean) {
  this.host.dataset.vnInteractionDraft='';
  const summary=document.createElement('summary');summary.textContent='Prepare an action';this.host.append(summary);
  const help=document.createElement('p');help.textContent='Choose an intention, edit it, then add it to your reply. Nothing is sent until you press Send at Your turn.';this.host.append(help);
  const choices=document.createElement('div');choices.dataset.vnInteractionVerbs='';
  const labels:Record<InteractionVerb,string>={ask:'Ask',examine:'Examine',approach:'Approach',use:'Use',custom:'Custom'};
  const editor=document.createElement('div');editor.hidden=true;
  const label=document.createElement('label');label.textContent='Your intended action';
  const input=document.createElement('textarea');input.maxLength=6000;input.rows=3;input.setAttribute('aria-label','Action draft');label.append(input);editor.append(label);
  const status=document.createElement('p');status.setAttribute('role','status');editor.append(status);
  let selected:InteractionDraft|null=null,applied=false;
  const insert=document.createElement('button'),replace=document.createElement('button');
  insert.type=replace.type='button';insert.textContent='Insert into reply';replace.textContent='Replace reply draft';
  const commit=(mode:DraftMergeMode)=>{
   if(!selected||applied||!input.value.trim())return;
   if(apply({...selected,text:input.value},mode)){applied=true;insert.disabled=replace.disabled=true;}
   else status.textContent='This scene changed or the draft is too long. Reopen the reference and try again.';
  };
  insert.onclick=()=>commit('insert');replace.onclick=()=>commit('replace');editor.append(insert,replace);
  for(const draft of drafts){const button=document.createElement('button');button.type='button';button.textContent=labels[draft.verb];button.onclick=()=>{selected=draft;applied=false;input.value=draft.text;editor.hidden=false;status.textContent='';insert.disabled=replace.disabled=false;replace.hidden=!currentDraft().trim();input.focus();};choices.append(button);}
  this.host.append(choices,editor);
 }
}
