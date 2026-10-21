import type {VisualNovelConfig} from '../../config.js';
import {VisualCueSchema,type TurnPlan,type VisualCue} from '../../shared/contracts.js';
import {templateSnapshot} from '../../shared/image-templates.js';
import {isUsableIdentity,splitTags,type CharacterAppearanceMap} from '../../shared/identity.js';
import {resolveTemplateIdentity} from './visual-brief.js';
import {projectTurnPresentation} from './entity-projection.js';
const manual=(cue:VisualCue)=>cue.imageTemplateReason==='Manual template selection'||cue.visualSources?.some(s=>s==='manual subject correction'||s==='manual artwork replacement');
/** Fresh-plan candidates only. Presence comes from the existing cursor projection;
 * no cast expansion, extra model call, or changes to prose/continuity. */
export function castAllocationCandidates(plan:TurnPlan,config:VisualNovelConfig,appearances?:CharacterAppearanceMap):{candidates:VisualCue[];reuseOnly:VisualCue[]}|null {
 if(!config.castMode||!config.generateImages||config.useNativeCardImages)return null;
 const environment=config.imageTemplates.find(t=>t.enabled&&t.category==='environment'&&t.subjectMode==='none');
 if(!environment)return null;
 let presentation:ReturnType<typeof projectTurnPresentation>;
 try{presentation=projectTurnPresentation(plan);}catch{return null;}
 if(!presentation)return null;
 const all=[...plan.visualCues,...(plan.cacheCues??[])].sort((a,b)=>a.paragraphIndex-b.paragraphIndex);
 const candidates:VisualCue[]=[],reuseOnly:VisualCue[]=[];
 const usedIds=new Set(all.flatMap(c=>[c.cueId,c.assetJobId]));let paired=false;
 for(const [sceneIndex,scene] of plan.scenes.entries()){
  const local=all.filter(c=>c.sceneId===scene.sceneId&&c.sceneRevision===scene.revision);
  const portraits=local.filter(c=>c.imageTemplate?.category==='portrait'&&c.imageTemplate.subjectMode==='one');
  const present=(cue:VisualCue)=>{
   if(!cue.character)return false;
   const snapshot=presentation!.snapshots[cue.paragraphIndex];
   const entity=snapshot?.entities.find(e=>e.kind==='npc'&&e.name===cue.character);
   const identity=resolveTemplateIdentity(scene,cue,appearances);
   return Boolean(entity&&snapshot?.presentEntityIds.includes(entity.id)&&snapshot.stateByEntity[entity.id]?.presence==='present'&&isUsableIdentity(identity.name,splitTags(identity.identity)));
  };
  // Mixed compositions and uncertain presence keep their established flat flow.
  if(!portraits.length||local.some(c=>manual(c)||!c.imageTemplate||!['portrait','environment'].includes(c.imageTemplate.category)||c.imageTemplate.subjectMode==='ensemble')||portraits.some(c=>!present(c))){candidates.push(...local);continue;}
  paired=true;
  const names=new Set<string>();
  const chosen=[...portraits].sort((a,b)=>Number(plan.paragraphSpeakers[b.paragraphIndex]===b.character)-Number(plan.paragraphSpeakers[a.paragraphIndex]===a.character)||a.paragraphIndex-b.paragraphIndex).filter(c=>{if(names.has(c.character!)||names.size>=2)return false;names.add(c.character!);return true;}).sort((a,b)=>a.paragraphIndex-b.paragraphIndex);
  const first=chosen[0]!;
  let background=local.find(c=>c.imageTemplate?.category==='environment'&&c.imageTemplate.subjectMode==='none'&&c.paragraphIndex<=first.paragraphIndex);
  if(!background){
   let suffix=0;const unique=(kind:string)=>{let id=`cast-${kind}-${sceneIndex}-${plan.key.revision}`;while(usedIds.has(id))id=`cast-${kind}-${sceneIndex}-${plan.key.revision}-${++suffix}`;usedIds.add(id);return id;};
   background=VisualCueSchema.parse({cueId:unique('background-cue'),assetJobId:unique('background-job'),paragraphIndex:scene.startParagraph,sceneId:scene.sceneId,sceneRevision:scene.revision,kind:'background',action:null,expression:null,promptDelta:'',character:null,resolvedIdentity:'',resolvedAttire:null,imageTemplate:templateSnapshot(environment),imageTemplateReason:'Cast view: independent background',visualSources:[]});
  }
  candidates.push(background,...chosen.map(c=>({...c,kind:'sprite' as const})));
  const selected=new Set([background.assetJobId,...chosen.map(c=>c.assetJobId)]);
  reuseOnly.push(...local.filter(c=>!selected.has(c.assetJobId)));
 }
 // Unrecognized scene ownership stays on the normal path, never invented.
 candidates.push(...all.filter(c=>!plan.scenes.some(s=>s.sceneId===c.sceneId&&s.revision===c.sceneRevision)));
 return paired?{candidates:candidates.sort((a,b)=>Number(Boolean(manual(b)))-Number(Boolean(manual(a)))),reuseOnly}:null;
}
