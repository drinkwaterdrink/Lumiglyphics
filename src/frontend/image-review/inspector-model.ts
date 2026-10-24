import type {AssetView} from '../../protocol.js';
import type {ImageRequestRecord} from '../../shared/image-review.js';
type Input={asset?:AssetView|undefined;requestState?:ImageRequestRecord['state']|undefined;planning?:boolean;preparing?:boolean;hasTurn?:boolean;zeroBudget?:boolean;operation?:'rewrite'|'template'|undefined;retryQueued?:boolean;retryRunning?:boolean};
const labels:Record<string,string>={planning:'Planning',idle:'No reply',empty:'No pictures', 'zero-budget':'Disabled',preparing:'Preparing prompt',rewriting:'Rewriting prompt',rebuilding:'Applying template','retry-running':'Retry running','retry-queued':'Retry queued',reused:'Reused',held:'Needs review',failed:'Failed',cancelled:'Cancelled',waiting:'Waiting to generate',generating:'Generating',historical:'Saved',completed:'Ready'};
export function pictureStateLabel(state:ReturnType<typeof inspectorState>):string{return state.kind==='cancelled'&&state.title==='Picture skipped'?'Skipped':labels[state.kind]??state.title;}
export function pictureStateSummary(states:ReturnType<typeof inspectorState>[]):string{
  if(!states.length)return '';
  const counts=new Map<string,number>();
  for(const state of states){const group=['completed','historical','reused'].includes(state.kind)?'ready':state.kind==='preparing'?'preparing':pictureStateLabel(state).toLocaleLowerCase();counts.set(group,(counts.get(group)??0)+1);}
  const order=['ready','needs review','rewriting prompt','applying template','preparing','waiting to generate','generating','retry queued','retry running','failed','cancelled','skipped'];
  return [`${states.length} picture${states.length===1?'':'s'}`,...[...new Set([...order,...counts.keys()])].filter(key=>counts.has(key)).map(key=>`${counts.get(key)} ${key}`)].join(' · ');
}
export function inspectorState(input:Input):{kind:string;title:string;detail:string;action:'generate'|'retry'|'prepare'|null}{
  const {asset,requestState}=input;
  const state=(kind:string,title:string,detail:string,action:'generate'|'retry'|'prepare'|null=null)=>({kind,title,detail,action});
  if(input.planning)return state('planning','Planning this reply…','Picture cues and prompts are not ready yet. You can keep reading.');
  if(!asset){
    if(!input.hasTurn)return state('idle','No reply selected','Open a story reply to inspect its pictures.');
    return input.zeroBudget ? state('zero-budget','New pictures are disabled','The current image budget is zero. This reply has no planned picture requests.') : state('empty','No pictures planned for this reply','No new picture requests were planned. You can keep reading.');
  }
  if(input.operation==='rewrite')return state('rewriting','Rewriting this prompt…','Using story-reader text tokens. Review the new wording before generating an image.');
  if(input.operation==='template')return state('rebuilding','Applying this template…','Preparing new wording and parameters. Your existing picture stays until you approve a replacement.');
  if(input.preparing)return state('preparing','Preparing a prompt…','Wait for a new preview. Image generation still needs your approval.');
  if(input.retryRunning)return state('retry-running','Retry in progress…','One retry attempt is running. Your existing picture stays while a replacement is prepared and generated.');
  if(input.retryQueued)return state('retry-queued','Retry queued','Waiting for current image work or held previews. This retry will use the saved scene and current image settings without review.');
  if(asset.source==='cache')return state('reused','Reused picture','A saved picture was reused without a new image request.');
  if(requestState==='review')return state('held','Ready for your review','Review or edit the prompt, then generate this picture. No image request has been sent.', 'generate');
  if(asset.status==='failed')return state('failed','Picture failed','Quick retry starts another image attempt without review. Edit before retry opens a separate preview.','retry');
  if(asset.status==='cancelled')return state('cancelled',requestState==='skipped'?'Picture skipped':'Picture cancelled','Quick retry queues another attempt without review, or edit a preview first.','retry');
  if(asset.status==='queued'&&requestState)return state('waiting','Waiting to generate','The prompt is prepared and waiting for an image slot. No provider generation is reported yet.');
  if(asset.status==='queued'||asset.status==='generating')return requestState ? state('generating','Generating picture…','The image request has been approved. You can keep reading.') : state('preparing','Preparing a prompt…','Waiting for prompt and reference preparation. Later pictures may depend on an earlier portrait.');
  if(!requestState)return state('historical','Saved picture','The original request is unavailable for this older picture. You can prepare a new preview.','prepare');
  return state('completed','Picture ready','Regenerate immediately without review, or edit a replacement preview first. Your current picture stays while its replacement runs.','prepare');
}
