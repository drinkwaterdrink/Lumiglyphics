import type {AssetView} from '../../protocol.js';
import type {ImageRequestRecord} from '../../shared/image-review.js';
type Input={asset?:AssetView|undefined;requestState?:ImageRequestRecord['state']|undefined;planning?:boolean;preparing?:boolean;hasTurn?:boolean;zeroBudget?:boolean};
export function inspectorState(input:Input):{kind:string;title:string;detail:string;action:'generate'|'retry'|'prepare'|null}{
  const {asset,requestState}=input;
  const state=(kind:string,title:string,detail:string,action:'generate'|'retry'|'prepare'|null=null)=>({kind,title,detail,action});
  if(input.planning)return state('planning','Planning this reply…','Picture cues and prompts are not ready yet. You can keep reading.');
  if(!asset){
    if(!input.hasTurn)return state('idle','No reply selected','Open a story reply to inspect its pictures.');
    return input.zeroBudget ? state('zero-budget','New pictures are disabled','The current image budget is zero. This reply has no planned picture requests.') : state('empty','No pictures planned for this reply','No new picture requests were planned. You can keep reading.');
  }
  if(input.preparing)return state('preparing','Preparing a prompt…','Wait for a new preview. Image generation still needs your approval.');
  if(asset.source==='cache')return state('reused','Reused picture','A saved picture was reused without a new image request.');
  if(requestState==='review')return state('held','Ready for your review','Review or edit the prompt, then generate this picture. No image request has been sent.', 'generate');
  if(asset.status==='failed')return state('failed','Picture failed','Quick retry starts another image attempt without review. Edit before retry opens a separate preview.','retry');
  if(asset.status==='cancelled')return state('cancelled',requestState==='skipped'?'Picture skipped':'Picture cancelled','Quick retry queues another attempt without review, or edit a preview first.','retry');
  if(asset.status==='queued'||asset.status==='generating')return requestState ? state('generating','Generating picture…','The image request has been approved. You can keep reading.') : state('preparing','Preparing a prompt…','Waiting for prompt and reference preparation. Later pictures may depend on an earlier portrait.');
  if(!requestState)return state('historical','Saved picture','The original request is unavailable for this older picture. You can prepare a new preview.','prepare');
  return state('completed','Picture ready','Regenerate immediately without review, or edit a replacement preview first. Your current picture stays while its replacement runs.','prepare');
}
