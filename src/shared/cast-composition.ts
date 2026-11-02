import {selectHeldBackground} from './background-hold.js';
import {samePresentationTurn} from './presentation-entities.js';
import {selectPresentationSnapshot} from './presentation-selectors.js';
import type {AssetView,TurnView} from '../protocol.js';
import type {StageAssetRole} from './stage-assets.js';
export type StageAssetMetadata={role:StageAssetRole;manual?:boolean;sceneId:string;sceneRevision?:number;character?:string;attire?:string|null;displayImageUrl?:string};
export type CastPortrait={name:string;asset:AssetView|null;active:boolean};
export type CastComposition={background:AssetView;portraits:CastPortrait[];otherCast:CastPortrait[];offScene:CastPortrait[];scope:string};
const nameKey=(s:string)=>s.trim().toLocaleLowerCase();
/** Current-turn, cursor-bounded projection. Never borrow a face across a scene,
 * use future cues, or treat a flattened action/manga picture as a portrait. */
export function selectCastComposition(turn:TurnView,index:number,selectedName?:string,absenceDisplay:'hide'|'dim'='hide'):CastComposition|null {
 const visible=turn.assets.filter(a=>a.paragraphIndex<=index).sort((a,b)=>a.paragraphIndex-b.paragraphIndex);
 const latest=visible.at(-1);const sceneId=latest?.stageAsset?.sceneId;
 if(!sceneId||latest?.presentation==='page'||latest?.stageAsset?.role==='scene')return null;
 const sceneRevision=latest?.stageAsset?.sceneRevision??0;
 const local=visible.filter(a=>a.stageAsset?.sceneId===sceneId&&(a.stageAsset.sceneRevision??0)===sceneRevision);
 const usable=(a:AssetView)=>(a.status==='generated'||a.status==='browser_ready')&&Boolean(a.imageUrl||a.imageId)&&!a.previousImage;
 const latestBackground=local.filter(a=>a.stageAsset?.role==='background').at(-1);
 const background=latestBackground?selectHeldBackground(turn,index,latestBackground):undefined;
 if(!background||!usable(background))return null;
 const byName=new Map<string,CastPortrait>();
 const speaker=turn.paragraphSpeakers?.[index]??turn.speaker;
 for(const asset of local){
  if(asset.stageAsset?.role!=='portrait'||!asset.stageAsset.character)continue;
  const name=asset.stageAsset.character;
  if(!byName.has(nameKey(name))&&byName.size>=32){if(nameKey(name)!==nameKey(speaker))continue;byName.delete(byName.keys().next().value!);}
  byName.set(nameKey(name),{name,asset:asset.stageAsset.displayImageUrl?{...asset,imageUrl:asset.stageAsset.displayImageUrl,previousImage:false,status:"generated"}:usable(asset)?asset:null,active:nameKey(name)===nameKey(speaker)});
 }
 const candidate=turn.presentation?selectPresentationSnapshot(turn.presentation,index):undefined;
 const snapshot=candidate&&samePresentationTurn(candidate.at.key,{chatId:turn.chatId,assistantMessageId:turn.messageId,swipeId:turn.swipeId,sourceFingerprint:turn.sourceFingerprint,revision:turn.revision})?candidate:undefined;
 const offScene:CastPortrait[]=[];
 if(snapshot)for(const [key,p] of byName){const entity=snapshot.entities.find(e=>e.kind==='npc'&&nameKey(e.name)===key);if(entity){const state=snapshot.stateByEntity[entity.id];if(state?.outfit && p.asset?.stageAsset?.attire && state.outfit!==p.asset.stageAsset.attire)p.asset=null;
 if(state?.presence==='absent'){
  byName.delete(key);
  if(absenceDisplay==='dim'&&p.asset&&p.asset.paragraphIndex<index&&offScene.length<8){const earlier=selectPresentationSnapshot(turn.presentation!,p.asset.paragraphIndex);if(earlier&&samePresentationTurn(earlier.at.key,snapshot.at.key)&&earlier.stateByEntity[entity.id]?.presence==='present')offScene.push({...p,active:false});}
 }
 }}
 const all=[...byName.values()];
 all.sort((a,b)=>Number(b.active)-Number(a.active)||Number(nameKey(b.name)===nameKey(selectedName??''))-Number(nameKey(a.name)===nameKey(selectedName??'')));
 if(!all.length&&!offScene.length)return null;
 return {background,portraits:all.slice(0,2),otherCast:all.slice(2),offScene,scope:JSON.stringify([turn.chatId,turn.messageId,turn.swipeId,turn.sourceFingerprint,turn.revision,sceneId,sceneRevision])};
}
