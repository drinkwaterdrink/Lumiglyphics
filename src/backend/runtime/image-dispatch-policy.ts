import {automaticGenerationAllowed} from '../../shared/generation-policy.js';
type Config={dataSaverMode:boolean;generateImages:boolean};
const aborted=()=>Object.assign(new Error('This image request is no longer active.'),{name:'AbortError'});
/** Event-driven pause at provider dispatch. No timers, browser APIs, or persisted queue. */
export class ImageDispatchPolicy {
 private configs=new Map<string,Config>();private waiters=new Map<string,Set<()=>void>>();
 private token(user:string|undefined){return JSON.stringify(user??null);}
 observe(user:string|undefined,config:Config):void{if(!this.configs.has(this.token(user)))this.update(user,config);}
 update(user:string|undefined,config:Config):void{this.configs.set(this.token(user),{...config});this.notify(user);}
 restrict(user:string|undefined,patch:{dataSaverMode?:boolean;generateImages?:boolean}):void{const prior=this.configs.get(this.token(user))??{generateImages:true,dataSaverMode:false};this.update(user,{...prior,...(patch.dataSaverMode===true?{dataSaverMode:true}:{}),...(patch.generateImages===false?{generateImages:false}:{})});}
 notify(user:string|undefined):void{for(const wake of [...this.waiters.get(this.token(user))??[]])wake();}
 allowed(user:string|undefined,manual:boolean,viewOpen:boolean):boolean{const config=this.configs.get(this.token(user))??{generateImages:true,dataSaverMode:false};return viewOpen&&config.generateImages&&(manual||automaticGenerationAllowed({...config,viewOpen}));}
 get pending():number{return [...this.waiters.values()].reduce((n,s)=>n+s.size,0);}
 wait(user:string|undefined,manual:boolean|(()=>boolean),signal:AbortSignal,isCurrentOpen:()=>boolean,onHeld:()=>void):Promise<void>{
  const token=this.token(user);return new Promise((resolve,reject)=>{
   const finish=(error?:Error)=>{signal.removeEventListener('abort',abort);const set=this.waiters.get(token);set?.delete(check);if(!set?.size)this.waiters.delete(token);error?reject(error):resolve();};
   const abort=()=>finish(aborted());let held=false;
   const check=()=>{if(signal.aborted||!isCurrentOpen()){finish(aborted());return;}const config=this.configs.get(token)??{generateImages:true,dataSaverMode:false};if(!config.generateImages){finish(aborted());return;}if((typeof manual==='function'?manual():manual)||automaticGenerationAllowed({...config,viewOpen:true})){finish();return;}if(!held){held=true;onHeld();}};
   const set=this.waiters.get(token)??new Set();set.add(check);this.waiters.set(token,set);signal.addEventListener('abort',abort,{once:true});check();
  });
 }
}
