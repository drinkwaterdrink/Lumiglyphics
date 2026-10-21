/** Explicit session queue. No timers, retries or persistence of paid work. */
export class ImageRetryQueue {
 private jobs:string[]=[];private active:string|null=null;private cancelled=false;private requests=new Set<string>();
 constructor(private run:(jobId:string)=>Promise<void>,private blocked:()=>boolean,private changed:()=>void,private failed:(jobId:string,error:unknown)=>void){}
 snapshot(){return {activeJobId:this.cancelled?null:this.active,jobIds:[...this.jobs]};}
 hasRequest(requestId:string){return this.requests.has(requestId);}
 enqueue(requestId:string,jobIds:string[]){
  if(this.cancelled||this.requests.has(requestId))return;
  const additions=[...new Set(jobIds)].filter(id=>id!==this.active&&!this.jobs.includes(id));
  if(this.jobs.length+additions.length+(this.active?1:0)>24)throw new Error('The retry queue is full. Wait for a picture to finish.');
  if(this.requests.size>=128)throw new Error('This retry session has reached its request limit. Reopen the reader.');
  this.requests.add(requestId);this.jobs.push(...additions);this.changed();this.wake();
 }
 clearPending(){this.jobs=[];this.changed();}
 cancel(){this.cancelled=true;this.jobs=[];this.changed();}
 wake(){
  if(this.cancelled||this.active||!this.jobs.length||this.blocked())return;
  const job=this.jobs.shift()!;this.active=job;this.changed();
  void this.run(job).catch(error=>{if(!this.cancelled)this.failed(job,error);}).finally(()=>{this.active=null;this.changed();this.wake();});
 }
}
