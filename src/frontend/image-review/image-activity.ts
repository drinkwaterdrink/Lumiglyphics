import type {TurnView} from '../../protocol.js';
import type {ImageRequestRecord} from '../../shared/image-review.js';
import {ImageActivitySchema,type ImageActivity} from '../../shared/image-usage.js';
import {samePresentationTurn} from '../../shared/presentation-entities.js';
import {turnHistoryKey} from '../../shared/scene-history.js';
/** Session-segment activity, separate from saved reply totals and price estimates. */
export class ImageActivityPanel {
 readonly element=document.createElement('div');private activity:ImageActivity|null=null;private chatId='';private saver=false;private turn:TurnView|null=null;private request:ImageRequestRecord|undefined;
 constructor(private approve:(request:ImageRequestRecord)=>void){this.element.dataset.imageActivity='';this.element.style.cssText='min-width:0;overflow-wrap:anywhere;padding:10px 0';this.render();}
 setActivity(chatId:string,input:unknown):void{const parsed=ImageActivitySchema.safeParse(input);if(!parsed.success||parsed.data.events.some(event=>event.key.chatId!==chatId))return;this.chatId=chatId;this.activity=parsed.data;this.render();}
 setSaver(enabled:boolean):void{this.saver=enabled;this.render();}
 setContext(turn:TurnView|null,request:ImageRequestRecord|undefined):void{if(!turn||this.chatId&&this.chatId!==turn.chatId){this.activity=null;this.chatId=turn?.chatId??'';}this.turn=turn;this.request=request;this.render();}
 get waiting():boolean{const key=this.turn?turnHistoryKey(this.turn):null,request=this.request,last=this.activity?.events.filter(event=>event.jobId===request?.jobId&&event.requestId===request?.requestId&&key&&samePresentationTurn(event.key,key)).at(-1);return this.saver&&request?.state==='prepared'&&last?.kind==='held';}
 private render():void{
  const open=this.element.querySelector<HTMLDetailsElement>('[data-image-events]')?.open??false;
  this.element.innerHTML='<p data-data-saver-status></p><p data-image-activity-summary></p><button type="button" data-dispatch-held hidden style="min-height:44px;max-width:100%;white-space:normal">Generate this waiting picture</button><details data-image-events><summary>Recent image activity</summary><p data-image-session></p><p>Provider attempts count calls sent, including retries. Cache reuse and restores make no new image call. Completion and billing after cancellation can be unknown. Price unavailable.</p><ol data-image-event-list></ol></details>';
  this.element.querySelector('[data-data-saver-status]')!.textContent=this.saver?'Data saver on · Automatic image calls wait. Calls already sent may finish and bill. You can still approve individual pictures.':'Data saver off · Automatic images follow your reader and review settings.';
  const activity=this.activity,totals=activity?.totals;
  this.element.querySelector('[data-image-activity-summary]')!.textContent=totals?`Image activity · ${totals.attempts} provider attempts · ${totals.succeeded} succeeded · ${totals.failed} failed · ${totals.inFlight} awaiting result · ${totals.cancelUnknown} cancelled, completion unknown · ${totals.cacheReuses} cache reuses · ${totals.restores} restores. Price unavailable.`:'Image activity unavailable for this session. Price unavailable.';
  this.element.querySelector('[data-image-session]')!.textContent=activity?`This chat, current backend session segment since ${activity.since}. Latest 24 events shown; older saved images are not retroactively counted.`:'Activity appears when the backend reports this chat.';
  const labels={'provider-start':'Provider call sent','provider-success':'Provider returned an image','provider-failure':'Provider call failed','cancel-unknown':'Cancelled; provider completion unknown',held:'Waiting before dispatch',skipped:'Skipped before dispatch','cache-reuse':'Reused saved or shared artwork',restore:'Restored a saved version'};
  for(const event of activity?.events.slice(-24).reverse()??[]){const item=document.createElement('li');item.style.cssText='margin:8px 0;overflow-wrap:anywhere';item.textContent=`${labels[event.kind]} · Reply ${event.key.assistantMessageId} · Swipe ${typeof event.key.swipeId==='number'?event.key.swipeId+1:event.key.swipeId??'default'} · Revision ${event.key.revision} · Job ${event.jobId}`;item.title=`${event.at}${event.requestId?` · Request ${event.requestId}`:''}${event.attemptId?` · Attempt ${event.attemptId}`:''}`;this.element.querySelector('[data-image-event-list]')!.append(item);}
  const key=this.turn?turnHistoryKey(this.turn):null,request=this.request,button=this.element.querySelector<HTMLButtonElement>('[data-dispatch-held]')!;
  button.hidden=!this.waiting;button.onclick=()=>{const current=this.turn?turnHistoryKey(this.turn):null;if(request&&key&&current&&this.request?.requestId===request.requestId&&this.turn&&samePresentationTurn(current,key)&&this.waiting){button.disabled=true;this.approve(request);}};
  this.element.querySelector<HTMLDetailsElement>('[data-image-events]')!.open=open;
 }
}
