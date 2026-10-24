import type {TurnView} from '../../protocol.js';

export type LocalPictureOperations=Pick<TurnView,'chatId'|'messageId'|'sourceFingerprint'|'swipeId'|'revision'> & {
 jobs:Array<{jobId:string;requestId?:string;kind:'prepare'|'rewrite'|'template'}>;
};
export function scopedPictureOperations(turn:TurnView,local?:LocalPictureOperations|null){
 if(!local||local.chatId!==turn.chatId||local.messageId!==turn.messageId||local.sourceFingerprint!==turn.sourceFingerprint||local.swipeId!==turn.swipeId||local.revision!==turn.revision)return new Map<string,LocalPictureOperations['jobs'][number]>();
 return new Map(local.jobs.filter(operation=>{
  const latest=turn.imageRequests?.filter(record=>record.jobId===operation.jobId).at(-1);
  return operation.requestId===latest?.requestId;
 }).map(operation=>[operation.jobId,operation]));
}
