import {z} from 'zod';
const id=z.string().trim().min(1).max(128);
export const RuleConditionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('dialogue')}).strict(),
 z.object({kind:z.literal('location_changed')}).strict(),
 z.object({kind:z.literal('template'),templateId:id}).strict(),
 z.object({kind:z.literal('subject'),subjectKind:z.enum(['npc','place','object']),name:z.string().trim().min(1).max(256)}).strict()
]);
const draftShape={id,name:z.string().trim().min(1).max(80),enabled:z.boolean(),priority:z.number().int().min(0).max(100),when:RuleConditionSchema,then:z.discriminatedUnion('kind',[z.object({kind:z.literal('prefer_template'),templateId:id}).strict(),z.object({kind:z.literal('limit_effects'),intensity:z.enum(['gentle','off'])}).strict(),z.object({kind:z.literal('limit_music'),level:z.enum(['quiet','mute'])}).strict(),z.object({kind:z.literal('hold_background')}).strict()])};
export const PresentationRuleDraftSchema=z.object(draftShape).strict().refine(r=>r.when.kind!=='template'||r.then.kind!=='prefer_template'||r.when.templateId!==r.then.templateId,'Choose a different preferred template, or another condition.');
export const PresentationRuleSchema=z.object({...draftShape,scope:z.enum(['user','chat']),savedOrder:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict();
export type PresentationRule=z.infer<typeof PresentationRuleSchema>;
export type PresentationRuleDraft=z.infer<typeof PresentationRuleDraftSchema>;
export const PresentationRuleDocumentSchema=z.object({version:z.literal(1),revision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),rules:z.array(PresentationRuleSchema).max(12).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Rule IDs must be distinct.')}).strict();
export type PresentationRuleDocument=z.infer<typeof PresentationRuleDocumentSchema>;
export const PresentationRuleCatalogSchema=z.object({user:PresentationRuleDocumentSchema.nullable(),chat:PresentationRuleDocumentSchema.nullable(),diagnostics:z.array(z.string().max(300)).max(4)}).strict();
export type PresentationRuleCatalog=z.infer<typeof PresentationRuleCatalogSchema>;
export const PresentationRuleTraceSchema=z.object({matchedRuleIds:z.array(id).max(24),summary:z.string().max(4000)}).strict();
export type PresentationRuleTrace=z.infer<typeof PresentationRuleTraceSchema>;
export const PresentationRuleRequestSchema=z.object({type:z.literal('vn_presentation_rules'),version:z.literal(1),requestId:id,chatId:id.optional(),action:z.enum(['list','save','delete','toggle']),scope:z.enum(['user','chat']).optional(),expectedRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),rule:PresentationRuleDraftSchema.optional(),id:id.optional(),enabled:z.boolean().optional()}).strict().superRefine((r,ctx)=>{
 if(r.action==='list')return;
 if(!r.scope||r.expectedRevision===undefined)ctx.addIssue({code:'custom',message:'Choose a scope and load its current revision.'});
 if(r.scope==='chat'&&!r.chatId)ctx.addIssue({code:'custom',message:'Open a chat for a chat preference.'});
 if(r.action==='save'&&!r.rule)ctx.addIssue({code:'custom',message:'Review a valid rule before saving.'});
 if((r.action==='delete'||r.action==='toggle')&&!r.id)ctx.addIssue({code:'custom',message:'Choose a saved rule.'});
 if(r.action==='toggle'&&r.enabled===undefined)ctx.addIssue({code:'custom',message:'Choose enabled or disabled.'});
});
export type PresentationRuleRequest=z.infer<typeof PresentationRuleRequestSchema>;
export type RuleSubject={kind:'npc'|'place'|'object';name:string};
export type RuleInput={isDialogue:boolean,locationChanged:boolean,templateId:string,enabledTemplateIds:readonly string[],subjects?:readonly RuleSubject[]};
export type RuleDecision={holdBackground?:boolean,preferredTemplateId?:string,selectedRuleId?:string,selectedScope?:'user'|'chat',effectIntensity?:'gentle'|'off',selectedEffectRuleId?:string,selectedEffectScope?:'user'|'chat',musicLevel?:'quiet'|'mute',selectedMusicRuleId?:string,selectedMusicScope?:'user'|'chat',matchedRuleIds:string[],diagnostics:string[]};
/** Conditions always examine the original planner choice; rules never chain. */
export function evaluatePresentationRules(input:RuleInput,rules:readonly PresentationRule[]):RuleDecision{
 const decision:RuleDecision={matchedRuleIds:[],diagnostics:[]};
 const ordered=[...rules].sort((a,b)=>Number(a.scope==='chat')-Number(b.scope==='chat')||a.priority-b.priority||a.savedOrder-b.savedOrder||a.id.localeCompare(b.id));
 for(const rule of ordered){
  if(!rule.enabled)continue;
  const condition=rule.when;
  const matches=condition.kind==='dialogue'?input.isDialogue:condition.kind==='location_changed'?input.locationChanged:condition.kind==='template'?condition.templateId===input.templateId:input.subjects?.some(subject=>subject.kind===condition.subjectKind&&subject.name.trim().toLowerCase()===condition.name.trim().toLowerCase())===true;
  if(!matches)continue;decision.matchedRuleIds.push(rule.id);
  if(rule.then.kind==='hold_background'){decision.holdBackground=true;continue;}
  if(rule.then.kind==='limit_music'){decision.musicLevel=rule.then.level;decision.selectedMusicRuleId=rule.id;decision.selectedMusicScope=rule.scope;continue;}
  if(rule.then.kind==='limit_effects'){decision.effectIntensity=rule.then.intensity;decision.selectedEffectRuleId=rule.id;decision.selectedEffectScope=rule.scope;continue;}
  if(!input.enabledTemplateIds.includes(rule.then.templateId)){decision.diagnostics.push(`${rule.name}: preferred template is disabled or unavailable; skipped.`);continue;}
  decision.preferredTemplateId=rule.then.templateId;decision.selectedRuleId=rule.id;decision.selectedScope=rule.scope;
 }
 return decision;
}
export function describePresentationCondition(condition:PresentationRule['when'],name:(id:string)=>string=(id)=>id):string{
 return condition.kind==='dialogue'?'During attributed dialogue':condition.kind==='location_changed'?'At a confirmed location change':condition.kind==='template'?`When ${name(condition.templateId)} would otherwise be chosen`:condition.subjectKind==='npc'?`When ${condition.name.trim()} is the selected picture subject`:condition.subjectKind==='place'?`At ${condition.name.trim()}`:`When ${condition.name.trim()} is described in the picture paragraph`;
}

export function describePresentationAction(action:PresentationRule['then'],name:(id:string)=>string=(id)=>id):string{return action.kind==='hold_background'?'keep the background until the scene changes':action.kind==='prefer_template'?`prefer ${name(action.templateId)}`:action.kind==='limit_music'?(action.level==='quiet'?'lower background music to 35% of its saved volume':'mute background music'):action.intensity==='gentle'?'limit one-shot effects to Gentle':'disable one-shot effects';}
