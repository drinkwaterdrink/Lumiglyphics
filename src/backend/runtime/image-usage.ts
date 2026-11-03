import {ImageActivityEventSchema,type ImageActivity,type ImageActivityInput} from '../../shared/image-usage.js';
type Scope={snapshot:ImageActivity;seen:Set<string>;attempts:Map<string,string>};
/** Memory-only, per-user/chat session segments. Eviction starts a visibly new segment. */
export class ImageUsageLedger {
 private scopes=new Map<string,Scope>();
 private scope(user:string|undefined,chat:string):Scope {
  const token=JSON.stringify([user??null,chat]);let scope=this.scopes.get(token);
  if(!scope){scope={snapshot:{version:1,sessionId:crypto.randomUUID(),since:new Date().toISOString(),totals:{attempts:0,succeeded:0,failed:0,cancelUnknown:0,inFlight:0,held:0,skipped:0,cacheReuses:0,restores:0},price:'unavailable',events:[]},seen:new Set(),attempts:new Map()};this.scopes.set(token,scope);if(this.scopes.size>32)this.scopes.delete(this.scopes.keys().next().value!);}
  return scope;
 }
 record(user:string|undefined,input:ImageActivityInput):ImageActivity {
  const event=ImageActivityEventSchema.parse({...input,at:new Date().toISOString()}),scope=this.scope(user,event.key.chatId),totals=scope.snapshot.totals;
  const token=JSON.stringify([event.key,event.jobId,event.requestId,event.attemptId,event.kind]);if(scope.seen.has(token))return structuredClone(scope.snapshot);
  const attempt=JSON.stringify([event.key,event.jobId,event.requestId,event.attemptId]),status=scope.attempts.get(attempt);
  if(event.kind.startsWith('provider-')||event.kind==='cancel-unknown'){
   if(!event.requestId||!event.attemptId)return structuredClone(scope.snapshot);
   if(event.kind==='provider-start'){if(status)return structuredClone(scope.snapshot);scope.attempts.set(attempt,'pending');totals.attempts++;totals.inFlight++;}
   else {if(!status||status==='provider-success'||status==='provider-failure')return structuredClone(scope.snapshot);if(status==='pending')totals.inFlight--;else if(status==='cancel-unknown')totals.cancelUnknown--;scope.attempts.set(attempt,event.kind);if(event.kind==='provider-success')totals.succeeded++;else if(event.kind==='provider-failure')totals.failed++;else totals.cancelUnknown++;}
  }else {const field={held:'held',skipped:'skipped','cache-reuse':'cacheReuses',restore:'restores'}[event.kind as 'held'|'skipped'|'cache-reuse'|'restore'] as 'held'|'skipped'|'cacheReuses'|'restores';totals[field]++;}
  scope.seen.add(token);if(scope.seen.size>2048)scope.seen.delete(scope.seen.values().next().value!);
  // Keep pending provider ownership until its result/abort arrives; terminal IDs are bounded.
  if(scope.attempts.size>1024)for(const [id,state]of scope.attempts){if(state!=='pending'){scope.attempts.delete(id);break;}}
  scope.snapshot.events.push(event);if(scope.snapshot.events.length>128)scope.snapshot.events.shift();return structuredClone(scope.snapshot);
 }
 snapshot(user:string|undefined,chat:string):ImageActivity{return structuredClone(this.scope(user,chat).snapshot);}
}
