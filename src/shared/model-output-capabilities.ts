import {z} from 'zod';

function ratio(value:unknown):{value:number;label:string}|undefined{
 if(typeof value!=='string')return;
 const match=/^(\d+(?:\.\d+)?)[\:x*](\d+(?:\.\d+)?)$/.exec(value);
 if(!match)return;
 const w=Number(match[1]),h=Number(match[2]);if(w<=0||h<=0||w>16384||h>16384)return;
 const divisor=(a:number,b:number):number=>b?divisor(b,a%b):a;
 const d=Number.isInteger(w)&&Number.isInteger(h)?divisor(w,h):1;
 return {value:w/h,label:`${w/d}:${h/d}`};
}
function validSize(value:string):boolean{
 if(['auto','default','auto_1K','auto_1.5K','auto_2K'].includes(value))return true;
 if(/^(?:[1-9]|1[0-6])(?:\.5)?k$/i.test(value))return true;
 return ratio(value)!==undefined;
}
export const ModelOutputCapabilitiesSchema=z.object({
 sizes:z.array(z.string().max(48).refine(validSize)).min(1).max(64),
 ratios:z.array(z.string().max(32).refine(value=>value==='auto'||Boolean(value.includes(':')&&ratio(value)))).min(1).max(32).optional(),
}).strict();
export type ModelOutputCapabilities=z.infer<typeof ModelOutputCapabilitiesSchema>;
export function parseOutputCapabilities(value:unknown):ModelOutputCapabilities|undefined{
 const p=value as {resolutions?:unknown;aspect_ratio?:unknown}|null;
 const parsed=ModelOutputCapabilitiesSchema.safeParse({sizes:p?.resolutions,...(p?.aspect_ratio!==undefined?{ratios:p.aspect_ratio}:{})});
 return parsed.success?parsed.data:undefined;
}
export function parseModelOutputCatalog(value:unknown):Map<string,ModelOutputCapabilities>{
 const data=(value as {data?:unknown}|null)?.data,result=new Map<string,ModelOutputCapabilities>();
 if(!Array.isArray(data)||data.length>2000)return result;
 for(const item of data){if(typeof item?.id!=='string'||item.id.length>256)continue;const caps=parseOutputCapabilities(item.supported_parameters);if(caps)result.set(item.id,caps);}
 return result;
}
const area=(size:unknown):number|undefined=>{const m=typeof size==='string'?/^(\d+)[x*](\d+)$/.exec(size):null;return m?Number(m[1])*Number(m[2]):undefined;};
function closest(values:readonly string[],target:number,preferredArea=1024*1024):string|undefined{
 return values.filter(value=>ratio(value)).sort((a,b)=>{
  const delta=Math.abs(Math.log(ratio(a)!.value/target))-Math.abs(Math.log(ratio(b)!.value/target));
  return Math.abs(delta)>1e-10?delta:Math.abs(Math.log((area(a)??preferredArea)/preferredArea))-Math.abs(Math.log((area(b)??preferredArea)/preferredArea));
 })[0];
}
/** Adapt before review only. Native raw payloads remain authoritative and are validated later. */
export function chooseModelOutput(capabilities:ModelOutputCapabilities,parameters:Record<string,unknown>,requestedRatio?:string):{parameters:Record<string,unknown>;summary:string}{
 if(parameters.rawRequestOverride!==undefined)return {parameters:{...parameters},summary:'Custom or model-specific raw output fields retained. Published values are checked before generation.'};
 const result={...parameters},sizes=capabilities.sizes;
 const requested=ratio(requestedRatio)??ratio(parameters.aspect_ratio??parameters.aspectRatio)??ratio(parameters.size);
 const current=typeof parameters.size==='string'?parameters.size:'';
 let size:string|undefined;
 const requestedArea=area(current)??1024*1024;
 // Prefer framing, then the nearest existing pixel area. Tier-only routes keep a valid tier.
 if(requested&&!capabilities.ratios)size=closest(sizes,requested.value,requestedArea);
 size??=sizes.includes(current)?current:undefined;
 size??=sizes.find(value=>value.toLowerCase()==='1k')??sizes.find(value=>/^\d+(?:\.\d+)?k$/i.test(value));
 size??=closest(sizes,requested?.value??1,requestedArea)??sizes[0]!;
 result.size=size;
 delete result.width;delete result.height;delete result.resolution;
 let actual=ratio(size);
 if(capabilities.ratios&&requested){
  const chosen=closest(capabilities.ratios,requested.value);
  if(chosen){
   result.aspectRatio=chosen;delete result.aspect_ratio;
   // The host's NanoGPT adapter forwards size, but separate ratios need this native field.
   result.rawRequestOverride={aspect_ratio:chosen};result._lumiglyphicsCatalogOutput=true;actual=ratio(chosen);
  }
 }
 if(!capabilities.ratios){delete result.aspectRatio;delete result.aspect_ratio;}
 const prefix=requested?`Requested ${requested.label}; `:'';
 const summary=`${prefix}prepared ${size}${actual?` (${actual.label})`:''}.${actual&&requested&&Math.abs(Math.log(actual.value/requested.value))>1e-6?' Closest published shape; this endpoint does not offer the requested ratio.':!actual&&requested?' The model controls the shape; this size does not guarantee the requested ratio.':''}`;
 return {parameters:result,summary};
}
/** Validate exactly the fields the host adapter sends, including user raw escape hatches. */
export function assertCapabilityOutput(capabilities:ModelOutputCapabilities,parameters:Record<string,unknown>):void{
 let raw=parameters.rawRequestOverride;
 if(typeof raw==='string'&&raw.trim()){try{raw=JSON.parse(raw);}catch{throw new Error('Raw image parameters must be valid JSON. Prepare a new preview after correcting the connection.');}}
 const override=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 const size=Object.hasOwn(override,'size')?override.size:parameters.size??'1024x1024';
 if(typeof size!=='string'||!capabilities.sizes.includes(size))throw new Error(`Unsupported model size ${String(size)}. Published values: ${capabilities.sizes.join(', ')}. Prepare a new preview or edit the size before generating.`);
 if(override.resolution!==undefined&&!capabilities.sizes.includes(String(override.resolution)))throw new Error(`Unsupported model resolution ${String(override.resolution)}. Published values: ${capabilities.sizes.join(', ')}.`);
 const aspect=Object.hasOwn(override,'aspect_ratio')?override.aspect_ratio:Object.hasOwn(override,'aspectRatio')?override.aspectRatio:parameters.aspect_ratio??parameters.aspectRatio;
 if(capabilities.ratios&&aspect!==undefined&&!capabilities.ratios.includes(String(aspect)))throw new Error(`Unsupported model aspect ratio ${String(aspect)}. Published ratios: ${capabilities.ratios.join(', ')}.`);
}
