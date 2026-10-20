import type {AssetView,TurnView} from '../protocol.js';
/** Cursor-local selection only. Never schedules, suppresses or changes image jobs. */
export function selectHeldBackground(turn:TurnView,index:number,current:AssetView):AssetView {
 const starts=turn.backgroundHoldStarts;
 const start=starts?.length===turn.paragraphs.length?starts[index]:null;
 if(!Number.isInteger(start)||start===null||start===undefined||start<0||start>index)return current;
 const meta=current.stageAsset;
 if(!meta||meta.role!=='background'||current.presentation==='page'||meta.manual)return current;
 const local=turn.assets.filter(a=>a.paragraphIndex<=index).sort((a,b)=>a.paragraphIndex-b.paragraphIndex);
 // Any intervening incompatible composition is a release barrier, including failed art.
 let barrier=-1;
 for(const a of local){const m=a.stageAsset;if(!m||m.sceneId!==meta.sceneId||(m.sceneRevision??0)!==(meta.sceneRevision??0)||m.role==='scene'||a.presentation==='page')barrier=Math.max(barrier,a.paragraphIndex);}
 const ready=local.filter(a=>a.paragraphIndex>barrier&&a.stageAsset?.role==='background'&&a.stageAsset.sceneId===meta.sceneId&&(a.stageAsset.sceneRevision??0)===(meta.sceneRevision??0)&&!a.previousImage&&(a.status==='generated'||a.status==='browser_ready')&&a.imageUrl);
 const manual=ready.filter(a=>a.stageAsset?.manual).at(-1);
 if(manual)return manual;
 return ready.filter(a=>a.paragraphIndex<=start).at(-1)??ready[0]??current;
}
