import type {SpindleAPI} from 'lumiverse-spindle-types';
import {PresentationRuleRequestSchema,type PresentationRuleCatalog,type PresentationRuleRequest} from '../../shared/presentation-rules.js';
import {loadConfig,loadPresentationRuleDocument,updatePresentationRuleDocument} from './storage.js';
import {evaluatePresentationRules,type PresentationRule} from '../../shared/presentation-rules.js';
import type {VisualNovelConfig} from '../../config.js';
import type {TurnPlan,SceneState,VisualCue} from '../../shared/contracts.js';
import {templateSnapshot} from '../../shared/image-templates.js';
import {isUsableIdentity,splitTags,type CharacterAppearanceMap} from '../../shared/identity.js';
import {resolveTemplateIdentity} from './visual-brief.js';

/** Pure, fresh-plan-only transformation. It cannot add slots or alter continuity. */
export function applyTemplatePreferences(plan:TurnPlan,config:VisualNovelConfig,rules:readonly PresentationRule[],previous:SceneState|null,appearances:CharacterAppearanceMap,diagnostics:readonly string[]=[]):TurnPlan{
 const normalize=(value:string|undefined)=>value?.trim().toLowerCase().replace(/\s+/g,' ')??'';
 const sceneKey=(cue:Pick<VisualCue,'sceneId'|'sceneRevision'>)=>`${cue.sceneId}:${cue.sceneRevision}`;
 const first=new Map<string,string>();
 for(const cue of [...plan.visualCues,...(plan.cacheCues??[])].sort((a,b)=>a.paragraphIndex-b.paragraphIndex))if(!first.has(sceneKey(cue)))first.set(sceneKey(cue),cue.cueId);
 const apply=(cue:VisualCue):VisualCue=>{
  if(!cue.imageTemplate||cue.imageTemplateReason==='Manual template selection'||cue.visualSources?.includes('manual subject correction'))return cue;
  const index=plan.scenes.findIndex(s=>s.sceneId===cue.sceneId&&s.revision===cue.sceneRevision);
  const scene=plan.scenes[index]??plan.scenes.find(s=>s.sceneId===cue.sceneId);if(!scene)return cue;
  const prior=index>0?plan.scenes[index-1]:previous;
  const location=normalize(scene.environment.location),before=normalize(prior?.environment.location);
  const identity=resolveTemplateIdentity(scene,cue,appearances);
  const usable=Boolean(identity.name&&isUsableIdentity(identity.name,splitTags(identity.identity)));
  const enabled=config.imageTemplates.filter(t=>t.enabled&&(t.subjectMode==='none'||usable));
  const decision=evaluatePresentationRules({isDialogue:Boolean(plan.paragraphSpeakers[cue.paragraphIndex]?.trim()),locationChanged:Boolean(location&&before&&location!==before&&first.get(sceneKey(cue))===cue.cueId),templateId:cue.imageTemplate.id,enabledTemplateIds:enabled.map(t=>t.id)},rules);
  if(!decision.matchedRuleIds.length&&!diagnostics.length)return cue;
  const target=enabled.find(t=>t.id===decision.preferredTemplateId);
  const winning=[...rules].reverse().find(r=>r.id===decision.selectedRuleId&&r.scope===decision.selectedScope&&r.then.templateId===target?.id);
  const outcome=target?`Applied ${target.name}${winning?` from ${winning.name} (${winning.scope==='chat'?'this chat':'all chats'})`:''}.`:'Kept the planner template.';
  const summary=[outcome,...diagnostics,...decision.diagnostics,...(!usable&&decision.matchedRuleIds.some(id=>rules.some(r=>r.id===id&&config.imageTemplates.some(t=>t.id===r.then.templateId&&t.subjectMode==='one')))?['Character preferences need a usable identity; existing subject guidance was kept.']:[])].join('\n').slice(0,4000);
  return {...cue,...(target?{imageTemplate:templateSnapshot(target),imageTemplateReason:`Saved preference: ${target.name}`.slice(0,300)}:{}),presentationRuleTrace:{matchedRuleIds:decision.matchedRuleIds,summary}};
 };
 return {...plan,visualCues:plan.visualCues.map(apply),...(plan.cacheCues?{cacheCues:plan.cacheCues.map(apply)}:{})};
}

/** Optional storage must never hold scene preparation open indefinitely. */
export async function freshPlanPreferences(api:SpindleAPI,plan:TurnPlan,config:VisualNovelConfig,previous:SceneState|null,appearances:CharacterAppearanceMap,userId?:string):Promise<TurnPlan>{
 if(!userId||!api.userStorage?.getJson)return plan;
 const catalog=await readPresentationRuleCatalog(api,plan.key.chatId,userId);
 return applyTemplatePreferences(plan,config,[...(catalog.user?.rules??[]),...(catalog.chat?.rules??[])],previous,appearances,catalog.diagnostics);
}

export async function readPresentationRuleCatalog(api:SpindleAPI,chatId:string|undefined,userId:string):Promise<PresentationRuleCatalog>{
 const diagnostics:string[]=[];
 const read=async(scope:'user'|'chat')=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const label=scope==='chat'?'Chat':'Account';
  try{return await Promise.race([
   loadPresentationRuleDocument(api,scope,chatId,userId),
   new Promise<null>(resolve=>{timer=setTimeout(()=>{diagnostics.push(`${label} preferences timed out; other scopes and planner defaults remain available.`);resolve(null);},1500);})
  ]);}catch{diagnostics.push(`${label} preferences unavailable; stored data was preserved.`);return null;}
  finally{if(timer)clearTimeout(timer);}
 };
 const [user,chat]=await Promise.all([read('user'),chatId?read('chat'):Promise.resolve(null)]);
 return {user,chat,diagnostics};
}
export async function managePresentationRules(api:SpindleAPI,raw:PresentationRuleRequest,userId:string):Promise<PresentationRuleCatalog>{
 const request=PresentationRuleRequestSchema.parse(raw);
 if(request.chatId&&!await api.chats.get(request.chatId,userId))throw new Error('This chat is unavailable.');
 if(request.action!=='list'){
  if(request.action==='save'){
   const config=await loadConfig(api,userId);
   if(!config.imageTemplates.some(template=>template.id===request.rule!.then.templateId&&template.enabled))throw new Error('Choose an enabled, available image template before saving this preference.');
  }
  await updatePresentationRuleDocument(api,request.scope!,request.chatId,userId,request.expectedRevision!,current=>{
   const rules=[...current.rules];const id=request.action==='save'?request.rule!.id:request.id!;
   const index=rules.findIndex(rule=>rule.id===id);
   if(request.action==='save'){
    if(index<0&&rules.length>=12)throw new Error('This scope already has 12 preferences. Remove one to make room.');
    const savedOrder=Math.max(0,...rules.map(rule=>rule.savedOrder))+1;
    const rule={...request.rule!,scope:request.scope!,savedOrder};if(index<0)rules.push(rule);else rules[index]=rule;
   }else{
    if(index<0)throw new Error('This preference no longer exists. Refresh the list.');
    if(request.action==='delete')rules.splice(index,1);else rules[index]={...rules[index]!,enabled:request.enabled!};
   }
   return {version:1,revision:current.revision+1,rules};
  });
 }
 return readPresentationRuleCatalog(api,request.chatId,userId);
}
