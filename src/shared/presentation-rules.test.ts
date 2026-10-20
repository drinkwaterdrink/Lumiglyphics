import {test,expect} from 'bun:test';
import {PresentationRuleDocumentSchema,PresentationRuleRequestSchema,PresentationRuleDraftSchema,describePresentationCondition,evaluatePresentationRules,type PresentationRule} from './presentation-rules.js';
const rule=(id:string,scope:'user'|'chat',priority=50,savedOrder=1,templateId='portrait'):PresentationRule=>({id,name:id,scope,enabled:true,priority,savedOrder,when:{kind:'dialogue'},then:{kind:'prefer_template',templateId}});
const input={isDialogue:true,locationChanged:false,templateId:'action',enabledTemplateIds:['portrait','environment','action']};

test('music preferences validate and resolve independently from template and effect actions',()=>{
 const music={...rule('music','chat'),then:{kind:'limit_music',level:'quiet'}} as any;
 const {scope,savedOrder,...draft}=music;expect(PresentationRuleDraftSchema.safeParse(draft).success).toBe(true);
 const effect={...rule('effects','chat'),then:{kind:'limit_effects',intensity:'off'}} as any;
 const decision=evaluatePresentationRules(input,[rule('image','chat'),effect,music]) as any;
 expect(decision.preferredTemplateId).toBe('portrait');expect(decision.effectIntensity).toBe('off');expect(decision.musicLevel).toBe('quiet');
 expect((evaluatePresentationRules(input,[{...music,scope:'user',priority:100,then:{kind:'limit_music',level:'mute'}},music]) as any).musicLevel).toBe('quiet');
 expect(PresentationRuleDraftSchema.safeParse({...draft,then:{kind:'limit_music',level:'loud'}}).success).toBe(false);
});

test('effect limits validate and resolve independently of template choices',()=>{
 const cap={...rule('cap','chat'),then:{kind:'limit_effects',intensity:'off'}} as any;
 expect(PresentationRuleDraftSchema.safeParse({id:cap.id,name:cap.name,enabled:true,priority:50,when:cap.when,then:cap.then}).success).toBe(true);
 const decision=evaluatePresentationRules(input,[rule('image','chat'),cap]);
 expect(decision.preferredTemplateId).toBe('portrait');expect((decision as any).effectIntensity).toBe('off');
 expect(evaluatePresentationRules({...input,isDialogue:false},[cap]) as any).not.toHaveProperty('effectIntensity');
 const gentler={...cap,id:'gentle',priority:99,then:{kind:'limit_effects',intensity:'gentle'}};
 expect((evaluatePresentationRules(input,[cap,gentler]) as any).effectIntensity).toBe('gentle');
 const {scope,savedOrder,...draft}=cap;expect(PresentationRuleDraftSchema.safeParse({...draft,then:{kind:'limit_effects',intensity:'full'}}).success).toBe(false);
});

test('named subject preferences validate names and match exact categories without aliases or partial names',()=>{
 const draft={id:'subject',name:'Library scenes',enabled:true,priority:50,when:{kind:'subject',subjectKind:'place',name:' Library '},then:{kind:'prefer_template',templateId:'environment'}};
 expect(PresentationRuleDraftSchema.safeParse(draft).success).toBe(true);
 expect(PresentationRuleDraftSchema.safeParse({...draft,when:{...draft.when,name:'  '}}).success).toBe(false);
 expect(PresentationRuleDraftSchema.safeParse({...draft,when:{...draft.when,name:'x'.repeat(257)}}).success).toBe(false);
 const r={...draft,scope:'chat',savedOrder:1} as any;
 expect(evaluatePresentationRules({...input,subjects:[{kind:'place',name:'library'}]} as any,[r]).preferredTemplateId).toBe('environment');
 for(const subjects of [undefined,[],[{kind:'npc',name:'Library'}],[{kind:'place',name:'Old Library'}]])expect(evaluatePresentationRules({...input,subjects} as any,[r]).preferredTemplateId).toBeUndefined();
 expect(describePresentationCondition(r.when)).toContain('Library');
});
test('chat preferences beat user preferences; equal-scope priority then save order break ties',()=>{
 const rules=[rule('user','user',100,99,'environment'),rule('early','chat',1,1,'action'),rule('late','chat',1,2,'portrait')];
 const decision=evaluatePresentationRules(input,rules);expect(decision.preferredTemplateId).toBe('portrait');expect(decision.selectedRuleId).toBe('late');expect(rules[0]?.id).toBe('user');
 expect(evaluatePresentationRules(input,[rule('high','chat',80,1,'environment'),rule('low','chat',1,99,'portrait')]).preferredTemplateId).toBe('environment');
});
test('disabled rules and unavailable template actions cannot override a valid preference',()=>{
 const disabled={...rule('disabled','chat',100,4,'environment'),enabled:false};
 const decision=evaluatePresentationRules(input,[rule('valid','user'),disabled,rule('missing','chat',90,2,'manga-page')]);
 expect(decision.preferredTemplateId).toBe('portrait');expect(decision.matchedRuleIds).not.toContain('disabled');expect(decision.diagnostics.join(' ')).toMatch(/missing.*disabled|missing.*unavailable/i);
});
test('conditions use confirmed input; preferences do not chain through changed templates',()=>{
 const location={...rule('location','chat',100,3,'environment'),when:{kind:'location_changed' as const}};
 const template={...rule('template','chat',99,4,'environment'),when:{kind:'template' as const,templateId:'portrait'}};
 expect(evaluatePresentationRules(input,[rule('dialogue','user'),location,template]).preferredTemplateId).toBe('portrait');
 expect(evaluatePresentationRules({...input,locationChanged:true},[location]).preferredTemplateId).toBe('environment');
 expect(evaluatePresentationRules({...input,isDialogue:false},[rule('dialogue','user')]).preferredTemplateId).toBeUndefined();
});
test('strict documents and commands reject unsupported actions, duplicate IDs and oversized scopes',()=>{
 expect(PresentationRuleDocumentSchema.safeParse({version:2,revision:0,rules:[]}).success).toBe(false);
 expect(PresentationRuleDocumentSchema.safeParse({version:1,revision:0,rules:[rule('same','user'),rule('same','user')]}).success).toBe(false);
 expect(PresentationRuleDocumentSchema.safeParse({version:1,revision:0,rules:Array.from({length:13},(_,i)=>rule(String(i),'user'))}).success).toBe(false);
 expect(PresentationRuleRequestSchema.safeParse({type:'vn_presentation_rules',version:1,requestId:'r',action:'delete',scope:'chat',id:'x',expectedRevision:0}).success).toBe(false);
 expect(PresentationRuleRequestSchema.safeParse({type:'vn_presentation_rules',version:1,requestId:'r',action:'save',scope:'user',expectedRevision:0,rule:{...rule('r','user'),then:{kind:'motion_cap',intensity:'off'}}}).success).toBe(false);
});

test('background hold validates independently of image templates and other actions',()=>{
 const hold={...rule('hold','chat'),then:{kind:'hold_background'}} as any;
 const {scope,savedOrder,...draft}=hold;expect(PresentationRuleDraftSchema.safeParse(draft).success).toBe(true);
 expect(evaluatePresentationRules(input,[rule('template','chat'),hold]).holdBackground).toBe(true);
 expect(evaluatePresentationRules({...input,isDialogue:false},[hold]).holdBackground).toBeUndefined();
 expect(evaluatePresentationRules(input,[{...hold,enabled:false}]).holdBackground).toBeUndefined();
});
