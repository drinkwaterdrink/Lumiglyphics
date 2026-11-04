import {archiveImageVersion,normalizeImageVersionHistory,type ImageVersion} from '../../shared/image-version-history.js';
import type {StoredTurnRecord} from './storage.js';
import type {AssetJob} from '../../shared/contracts.js';
import {turnKeyEquals} from '../core/guards.js';

/** Capture only a completed image and its immutable approved request. No provider/storage effects. */
export function archiveCurrentImageVersion(record:StoredTurnRecord,job:AssetJob,history:unknown){
 if(!job.imageId||!job.imageUrl)return normalizeImageVersionHistory(history);
 const cue=[...record.plan.visualCues,...(record.plan.cacheCues??[])].find(cue=>cue.assetJobId===job.jobId);
 const request=record.imageRequests?.filter(request=>request.jobId===job.jobId&&request.state==='approved').at(-1);
 return archiveImageVersion(history,job.jobId,{versionId:crypto.randomUUID(),imageId:job.imageId,imageUrl:job.imageUrl,timestamp:job.generatedAt??new Date().toISOString(),
  ...(request?{prompt:request.prompt,negativePrompt:request.negativePrompt}:{}),
  ...(cue&&request&&['generated','browser_ready'].includes(job.status)?{provenance:{version:1 as const,job,cue,requestId:request.requestId}}:{})});
}
export function resolveImageVersion(record:StoredTurnRecord,job:AssetJob,version:ImageVersion){
 const saved=version.provenance;
 if(!saved)return {notice:'Legacy version: subject, template and prompt provenance are unavailable. Restore is disabled.'};
 if(!turnKeyEquals(record.plan.key,saved.job.ownerTurnKey)||saved.job.jobId!==job.jobId||saved.job.sceneId!==job.sceneId||saved.job.sceneRevision!==job.sceneRevision||saved.job.paragraphIndex!==job.paragraphIndex||saved.job.imageId!==version.imageId||saved.job.imageUrl!==version.imageUrl||saved.cue.assetJobId!==job.jobId||saved.cue.sceneId!==job.sceneId||saved.cue.sceneRevision!==job.sceneRevision||saved.cue.paragraphIndex!==job.paragraphIndex)return {notice:'This version belongs to a different source, scene or picture.'};
 const request=record.imageRequests?.find(request=>request.requestId===saved.requestId&&request.jobId===job.jobId&&request.state==='approved'&&request.prompt===version.prompt&&request.negativePrompt===version.negativePrompt);
 if(!request)return {notice:'This version’s approved prompt metadata is no longer available. Restore is disabled.'};
 return {value:{job:saved.job,cue:saved.cue,request}};
}
/** Internal cue/job snapshots never cross the frontend boundary. */
export function imageVersionView(record:StoredTurnRecord,job:AssetJob,version:ImageVersion){
 const {provenance:_,...visible}=version,result=resolveImageVersion(record,job,version);
 return {...visible,restorable:Boolean(result.value),...(result.notice?{restoreNotice:result.notice}:{})};
}
