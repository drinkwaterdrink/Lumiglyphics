import {compileDisplayRules,type DisplayRuleIssue} from '../../shared/display-rules.js';
export type DisplayWorker={onmessage:((event:{data:any})=>void)|null;onerror:(()=>void)|null;postMessage(data:unknown):void;terminate():void};
export type DisplayEvaluation={text:string;issues:DisplayRuleIssue[];generation:string};
export const DISPLAY_EXECUTION_LIMIT=100000;
/** Self-contained worker program: no imports, dynamic code constructor or host access. */
function displayWorkerProgram(){
 const host=globalThis as any,limit=100000;
 host.onmessage=({data}:any)=>{
  let text=data.text as string;const issues:any[]=[];
  try{for(const rule of data.rules){
   const pattern=new RegExp(rule.source,rule.flags);let size=0,end=0;
   text=text.replace(pattern,(...args:any[])=>{
    const groups=typeof args.at(-1)==='object'?args.at(-1):undefined;
    const offset=args.at(groups?-3:-2) as number,original=args.at(groups?-2:-1) as string;
    const captures=args.slice(1,groups?-3:-2);const match=args[0] as string;
    size+=offset-end;end=offset+match.length;let expanded='',cursor=0;
    const append=(part:string)=>{size+=part.length;if(size>limit)throw new Error('output-limit');expanded+=part;};
    for(const token of (rule.replacement as string).matchAll(/\$(\$|&|`|'|<[^>]*>|[0-9]{1,2})/g)){
     append(rule.replacement.slice(cursor,token.index));const t=token[1]!;let value=token[0];
     if(t==='$')value='$';else if(t==='&')value=match;else if(t==='`')value=original.slice(0,offset);else if(t==="'")value=original.slice(end);
     else if(t.startsWith('<')){if(groups)value=groups[t.slice(1,-1)]??'';}
     else{const n=Number(t);if(n>0&&n<=captures.length)value=captures[n-1]??'';else if(t.length===2&&Number(t[0])>0&&Number(t[0])<=captures.length)value=(captures[Number(t[0])-1]??'')+t[1];}
     append(value);cursor=token.index!+token[0].length;
    }
    append(rule.replacement.slice(cursor));return expanded;
   });
   if(text.length>limit)throw new Error('output-limit');
  }}catch(error){text=data.text;issues.push({line:0,message:error instanceof Error&&error.message==='output-limit'?'Display rule output exceeded the 100,000-character limit.':'A display rule could not run.'});}
  host.postMessage({text,issues,generation:data.generation});
 };
 host.postMessage({ready:true});
}
function defaultWorker():DisplayWorker{
 const url=URL.createObjectURL(new Blob([`(${displayWorkerProgram.toString()})();`],{type:'text/javascript'}));
 try{const worker=new Worker(url),terminate=worker.terminate.bind(worker);worker.terminate=()=>{terminate();URL.revokeObjectURL(url);};return worker as unknown as DisplayWorker;}catch(error){URL.revokeObjectURL(url);throw error;}
}
/** A stage owns at most one live worker. New work preempts obsolete paragraphs instead of building a queue. */
export class DisplayRuleExecutor{
 private cancelCurrent:(()=>void)|null=null;private disposed=false;
 constructor(private createWorker:()=>DisplayWorker=defaultWorker,private options:{timeoutMs?:number;startupMs?:number}={}){}
 async evaluate(input:{text:string;rulesSource:string;generation:string},signal?:AbortSignal):Promise<DisplayEvaluation>{
  this.cancelCurrent?.();const cancelled=()=>new Error('Display rule execution cancelled.');if(this.disposed||signal?.aborted)throw cancelled();
  const fallback=(message:string):DisplayEvaluation=>({text:input.text,generation:input.generation,issues:[{line:0,message}]});
  if(!input.rulesSource.trim())return{text:input.text,generation:input.generation,issues:[]};
  if(input.text.length>DISPLAY_EXECUTION_LIMIT||input.rulesSource.length>20000)return fallback('Display rule input exceeded its size limit; original text is shown.');
  const compiled=compileDisplayRules(input.rulesSource);if(!compiled.rules.length)return{text:input.text,generation:input.generation,issues:compiled.issues};
  let worker:DisplayWorker;try{worker=this.createWorker();}catch{return fallback('Display rule workers are unavailable; original text is shown.');}
  return new Promise((resolve,reject)=>{
   let settled=false,started=false;let execution:ReturnType<typeof setTimeout>|undefined;
   const finish=(result?:DisplayEvaluation,error?:Error)=>{if(settled)return;settled=true;clearTimeout(startup);if(execution!==undefined)clearTimeout(execution);signal?.removeEventListener('abort',abort);worker.terminate();if(this.cancelCurrent===abort)this.cancelCurrent=null;if(error)reject(error);else resolve(result!);};
   const abort=()=>finish(undefined,cancelled());this.cancelCurrent=abort;
   const startup=setTimeout(()=>finish(fallback('Display rule worker startup exceeded its deadline; original text is shown.')),this.options.startupMs??1000);
   worker.onerror=()=>finish(fallback('Display rule workers are unavailable; original text is shown.'));
   worker.onmessage=({data})=>{
    if(settled)return;
    if(data?.ready&&!started){started=true;clearTimeout(startup);execution=setTimeout(()=>finish(fallback('Display rule execution exceeded its deadline; original text is shown.')),this.options.timeoutMs??50);try{worker.postMessage({text:input.text,generation:input.generation,rules:compiled.rules.map(r=>({source:r.pattern.source,flags:r.pattern.flags,replacement:r.replacement,line:r.line}))});}catch{finish(fallback('Display rule workers are unavailable; original text is shown.'));}return;}
    if(data?.generation!==input.generation)return;
    if(typeof data.text!=='string'||data.text.length>DISPLAY_EXECUTION_LIMIT||!Array.isArray(data.issues)){finish(fallback('Invalid display rule output; original text is shown.'));return;}
    finish({text:data.text,generation:input.generation,issues:[...compiled.issues,...data.issues.filter((i:any)=>Number.isInteger(i?.line)&&typeof i?.message==='string').slice(0,8).map((i:any)=>({line:i.line,message:i.message.slice(0,500)}))]});
   };
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
 }
 dispose():void{this.disposed=true;this.cancelCurrent?.();}
}
