import { z } from 'zod';
export const TRACKER_MAPPING_FIELDS = ['identity','attire','sceneState','world','time','date','temperature','weather'] as const;
const blocked = new Set(['__proto__','constructor','prototype']);
const pathSchema = z.string().trim().min(1).max(128).refine(path => {
 const parts=path.split('.');return parts.length<=6 && parts.every(part=>/^[a-zA-Z_][a-zA-Z0-9_ -]*$/.test(part)&&!blocked.has(part.toLowerCase()));
},'Use dotted field names, without expressions or reserved properties.');
const paths = z.array(pathSchema).max(6).default([]);
export const TrackerMappingsSchema=z.object({
  identity:paths,
  attire:paths,
  sceneState:paths,
  world:paths,
  time:paths.optional().default([]),
  date:paths.optional().default([]),
  temperature:paths.optional().default([]),
  weather:paths.optional().default([]),
}).strict();
export type TrackerMappings=z.infer<typeof TrackerMappingsSchema>;
export function normalizeTrackerMappings(value:unknown):TrackerMappings {
 const input=value && typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 return Object.fromEntries(TRACKER_MAPPING_FIELDS.map(field=>[field,Array.isArray(input[field])?[...new Set((input[field] as unknown[]).slice(0,64).filter(p=>pathSchema.safeParse(p).success).map(p=>(p as string).trim()))].slice(0,6):[]])) as TrackerMappings;
}
/** Own properties and scalar data only. Never evaluate macros, templates, scripts
 * or serialize arbitrary objects (which can contain hidden fields). */
export function readMappedTrackerValues(record:unknown, paths:readonly string[]):string[] {
 const result:string[]=[];
 for(const path of paths.slice(0,6)) {
  const parsed=pathSchema.safeParse(path);if(!parsed.success)continue;
  let value:unknown=record;
  for(const part of parsed.data.split('.')) {
   if(!value||typeof value!=='object'||Array.isArray(value)){value=undefined;break;}
   const obj=value as Record<string,unknown>;
   if(Object.prototype.hasOwnProperty.call(obj,part)){value=obj[part];}
   else{const lp=part.toLowerCase();const mk=Object.keys(obj).find(k=>k.toLowerCase()===lp&&!blocked.has(k.toLowerCase()));if(mk!==undefined){value=obj[mk];}else{value=undefined;break;}}
  }
  for(const item of (Array.isArray(value)?value.slice(0,8):[value])) {
   const text=typeof item==='string'?item.trim().slice(0,500):typeof item==='number'&&Number.isFinite(item)?String(item):'';
   if(text&&!result.includes(text))result.push(text);
  }
 }
 return result;
}
