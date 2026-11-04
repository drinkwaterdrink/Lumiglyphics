import {AssetJobSchema,VisualCueSchema} from './contracts.js';
import {z} from 'zod';

/** Optional artwork history is bounded independently of primary story/jobs. */
export const MAX_IMAGE_VERSIONS = 50;
const id=z.string().min(1).max(256);
export const ImageVersionProvenanceSchema=z.object({version:z.literal(1),job:AssetJobSchema,cue:VisualCueSchema,requestId:id}).strict().refine(value=>JSON.stringify(value).length<=200000);
export const ImageVersionSchema=z.object({
  versionId:id,imageId:id,
  imageUrl:z.string().min(1).max(8192).refine(value=>/^(?:\/(?!\/)|https?:\/\/|blob:)/.test(value)&&!/[\s"'<>\u0000-\u001f]/.test(value)),
  timestamp:z.string().max(64).refine(value=>Number.isFinite(Date.parse(value))),
  prompt:z.string().max(65000).optional(),
  negativePrompt:z.string().max(65000).optional(),
  provenance:ImageVersionProvenanceSchema.optional().catch(undefined),
}).strict();
export type ImageVersion=z.infer<typeof ImageVersionSchema>;
export type ImageVersionHistory=Record<string,ImageVersion[]>;

/** Legacy lists are oldest-first; corrupt neighbors never invalidate a turn. */
export function normalizeImageVersionHistory(value:unknown):ImageVersionHistory {
  const result:ImageVersionHistory=Object.create(null);
  if(!value||typeof value!=='object'||Array.isArray(value))return result;
  for(const [jobId,raw] of Object.entries(value).slice(0,256)) {
    if(!jobId||jobId.length>256||!Array.isArray(raw))continue;
    const seenImages=new Set<string>(),seenVersions=new Set<string>();
    const versions:ImageVersion[]=[];
    for(const item of raw.slice(-1000).reverse()) {
      const parsed=ImageVersionSchema.safeParse(item);
      if(!parsed.success||seenImages.has(parsed.data.imageId)||seenVersions.has(parsed.data.versionId))continue;
      seenImages.add(parsed.data.imageId);seenVersions.add(parsed.data.versionId);versions.push(parsed.data);
      if(versions.length===MAX_IMAGE_VERSIONS)break;
    }
    if(versions.length)result[jobId]=versions.reverse();
  }
  return result;
}

export function archiveImageVersion(history:unknown,jobId:string,version:ImageVersion):ImageVersionHistory {
  const next=normalizeImageVersionHistory(history);
  const parsed=ImageVersionSchema.safeParse(version);
  if(!parsed.success||next[jobId]?.some(v=>v.imageId===version.imageId))return next;
  next[jobId]=[...(next[jobId]??[]),parsed.data].slice(-MAX_IMAGE_VERSIONS);
  return next;
}
