export type PromptEditSnapshot={prompt:string;negativePrompt:string;parametersText:string};
const same=(a:PromptEditSnapshot,b:PromptEditSnapshot)=>a.prompt===b.prompt&&a.negativePrompt===b.negativePrompt&&a.parametersText===b.parametersText;
/** Local snapshots only; invalid JSON is preserved verbatim. At most 50 states; drop retained undo text above 1 MiB. A single current draft stays verbatim. */
export class PromptHistory {
 private states:PromptEditSnapshot[];private index=0;private field='';private time=-Infinity;private composing=false;private compositionEdited=false;
 constructor(initial:PromptEditSnapshot){this.states=[{...initial}];}
 get current():PromptEditSnapshot{return {...this.states[this.index]!};}
 get canUndo():boolean{return this.index>0;}get canRedo():boolean{return this.index<this.states.length-1;}
 edit(value:PromptEditSnapshot,field:string,time:number):void{
  if(same(this.current,value))return;
  const merge=!this.canRedo&&this.index>0&&((this.composing&&this.compositionEdited)||(!this.composing&&this.field===field&&time>=this.time&&time-this.time<=500));
  this.states=this.states.slice(0,this.index+1);
  if(merge)this.states[this.index]={...value};else{this.states.push({...value});this.index++;}
  this.field=field;this.time=time;if(this.composing)this.compositionEdited=true;this.trim();
 }
 checkpoint(value:PromptEditSnapshot):void{this.field='';this.time=-Infinity;this.edit(value,'checkpoint',0);this.field='';this.time=-Infinity;}
 private trim():void{let size=this.states.reduce((sum,s)=>sum+2*(s.prompt.length+s.negativePrompt.length+s.parametersText.length),0);while(this.states.length>1&&(this.states.length>50||size>1048576)){const s=this.states.shift()!;size-=2*(s.prompt.length+s.negativePrompt.length+s.parametersText.length);this.index--;}}
 beginComposition():void{this.composing=true;this.compositionEdited=false;this.field='';}
 endComposition():void{this.composing=false;this.compositionEdited=false;this.field='';this.time=-Infinity;}
 undo():PromptEditSnapshot{if(this.canUndo)this.index--;this.field='';this.time=-Infinity;return this.current;}
 redo():PromptEditSnapshot{if(this.canRedo)this.index++;this.field='';this.time=-Infinity;return this.current;}
}
