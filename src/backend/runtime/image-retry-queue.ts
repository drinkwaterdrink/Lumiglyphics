/** Explicit session queue. No timers, retries or persistence of paid work. */
export class ImageRetryQueue {
 private jobs:string[]=[];private active:string|null=null;private cancelled=false;private requests=new Set<string>();
 private jobPriority=new Map<string,number>();private seq=0;
 constructor(private run:(jobId:string)=>Promise<void>,private blocked:()=>boolean,private changed:()=>void,private failed:(jobId:string,error:unknown)=>void){}
 snapshot(){return {activeJobId:this.cancelled?null:this.active,jobIds:[...this.jobs]};}
 hasRequest(requestId:string){return this.requests.has(requestId);}
 markRequest(requestId:string){if(!this.cancelled&&!this.requests.has(requestId)){if(this.requests.size>=128)throw new Error('This retry session has reached its request limit. Reopen the reader.');this.requests.add(requestId);}}
 enqueue(requestId:string,jobIds:string[],priorityJobIds?:string[]){
  if(this.cancelled||this.requests.has(requestId))return;
  const additions=[...new Set(jobIds)].filter(id=>id!==this.active&&!this.jobs.includes(id));
  if(additions.length===0)return;
  if(this.jobs.length+additions.length+(this.active?1:0)>24)throw new Error('The retry queue is full. Wait for a picture to finish.');
  if(this.requests.size>=128)throw new Error('This retry session has reached its request limit. Reopen the reader.');
  this.requests.add(requestId);
  const priorityMap=new Map<string,number>((priorityJobIds??[]).map((id,idx)=>[id,idx]));
  for(const id of additions){
   this.jobPriority.set(id,priorityMap.has(id)?priorityMap.get(id)!:1_000_000+(++this.seq));
  }
  this.jobs.push(...additions);
  this.jobs.sort((a,b)=>(this.jobPriority.get(a)??Number.MAX_SAFE_INTEGER)-(this.jobPriority.get(b)??Number.MAX_SAFE_INTEGER));
  this.changed();this.wake();
 }
 clearPending(){this.jobs=[];this.requests.clear();this.jobPriority.clear();this.changed();}
 cancel(){this.cancelled=true;this.jobs=[];this.requests.clear();this.jobPriority.clear();this.changed();}
 wake(){
  if(this.cancelled||this.active||!this.jobs.length||this.blocked())return;
  this.jobs.sort((a,b)=>(this.jobPriority.get(a)??Number.MAX_SAFE_INTEGER)-(this.jobPriority.get(b)??Number.MAX_SAFE_INTEGER));
  const job=this.jobs.shift()!;this.jobPriority.delete(job);this.active=job;this.changed();
  void this.run(job).catch(error=>{if(!this.cancelled)this.failed(job,error);}).finally(()=>{this.active=null;this.changed();this.wake();});
 }
}
