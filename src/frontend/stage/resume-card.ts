import type {TurnView} from '../../protocol.js';
import type {ReadingPosition} from '../../shared/reading-position.js';
import {ReadingPositionSchema} from '../../shared/reading-position.js';
import {restoreReadingPosition} from '../host/reading-position.js';
export type ResumeCardModel={key:ReadingPosition['key'];paragraphIndex:number;excerpt:string;speaker:string;location?:string};
/** Previous paragraph only: the saved current paragraph may not have finished revealing. */
export function resumeCardModel(saved:unknown,turn:TurnView):ResumeCardModel|null {
 const parsed=ReadingPositionSchema.safeParse(saved),index=restoreReadingPosition(saved,turn);
 if(!parsed.success||turn.status!=='ready'||index===null||index===0)return null;
 const excerpt=(turn.paragraphs[index-1]??'').slice(0,8000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,240);
 return {key:parsed.data.key,paragraphIndex:index,excerpt,speaker:(turn.paragraphSpeakers?.[index-1]??turn.speaker).slice(0,160),...(turn.location?{location:turn.location.slice(0,160)}:{})};
}
/** A dismissible reading landmark, not a recap generator or story data owner. */
export class ResumeCard {
 readonly element=document.createElement('aside');
 constructor(private readonly onContinue:()=>void){
  this.element.dataset.vnResumeCard='';this.element.hidden=true;this.element.setAttribute('aria-label','Resume reading');
  this.element.style.cssText='position:absolute;z-index:25;top:calc(env(safe-area-inset-top,0px) + 76px);left:12px;right:12px;max-width:520px;margin:0 auto;padding:16px;border:1px solid var(--vn-shell-border,#456);border-radius:16px;background:var(--vn-shell-bg,#101824);color:var(--vn-shell-text,#fff);box-shadow:0 12px 32px #0005;overflow-wrap:anywhere';
  this.element.innerHTML='<strong>Welcome back</strong><p data-resume-place></p><blockquote data-resume-excerpt style="margin:8px 0;font-size:.9em"></blockquote><button type="button" data-resume-continue style="min-height:44px">Continue reading</button>';
  this.element.querySelector('button')!.onclick=()=>{this.clear();this.onContinue();};
  this.element.addEventListener('click',event=>event.stopPropagation());
 }
 show(model:ResumeCardModel|null):void{
  if(!model){this.clear();return;}
  this.element.querySelector('[data-resume-place]')!.textContent=[model.location,model.speaker,`Passage ${model.paragraphIndex+1}`].filter(Boolean).join(' · ');
  this.element.querySelector('[data-resume-excerpt]')!.textContent=model.excerpt?`Previously: ${model.excerpt}`:'Your saved place is ready.';
  this.element.hidden=false;
 }
 clear():void{this.element.hidden=true;this.element.querySelector('[data-resume-excerpt]')!.textContent='';this.element.querySelector('[data-resume-place]')!.textContent='';}
 destroy():void{this.clear();this.element.remove();}
}
