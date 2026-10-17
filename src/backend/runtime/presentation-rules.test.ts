import {test,expect} from 'bun:test';
import {managePresentationRules,readPresentationRuleCatalog} from './presentation-rules.js';
import {applyTemplatePreferences,freshPlanPreferences} from './presentation-rules.js';
import {DEFAULT_CONFIG} from '../../config.js';
import {templateSnapshot} from '../../shared/image-templates.js';

test('template preferences keep cue slots and identities, match original choices and respect manual edits',()=>{
 const scene={sceneId:'s',revision:0,startParagraph:0,environment:{location:'Harbor'},character:'Mira',cast:['Mira'],identityPrompt:'red hair, green eyes'};
 const cue={cueId:'c',sceneId:'s',paragraphIndex:0,imageTemplate:templateSnapshot(DEFAULT_CONFIG.imageTemplates[0]!),resolvedIdentity:'red hair, green eyes'};
 const plan={scenes:[scene],visualCues:[cue,{...cue,cueId:'c2',paragraphIndex:1}],paragraphSpeakers:['Mira',''],cacheCues:[]} as any;
 const rules=[{...draft('place','environment'),scope:'chat',savedOrder:1,when:{kind:'location_changed'}}] as any;
 const before=JSON.stringify(plan);const next=applyTemplatePreferences(plan,DEFAULT_CONFIG,rules,{environment:{location:'Town'}} as any,{});
 expect(next.visualCues[0]!.imageTemplate!.id).toBe('environment');expect(next.visualCues[1]!.imageTemplate!.id).toBe(cue.imageTemplate.id);
 expect(next.visualCues.map(c=>c.cueId)).toEqual(['c','c2']);expect(next.visualCues[0]!.resolvedIdentity).toBe(cue.resolvedIdentity);expect(JSON.stringify(plan)).toBe(before);
 const manual={...plan,visualCues:[{...cue,imageTemplateReason:'Manual template selection'}]};expect(applyTemplatePreferences(manual,DEFAULT_CONFIG,rules,{environment:{location:'Town'}} as any,{}).visualCues[0]!.imageTemplate!.id).toBe(cue.imageTemplate.id);
 expect(applyTemplatePreferences(plan,DEFAULT_CONFIG,rules,{environment:{location:' harbor '}} as any,{}).visualCues[0]!.imageTemplate!.id).toBe(cue.imageTemplate.id);
});

test('portrait rules require a usable identity and dialogue requires attribution',()=>{
 const plan={scenes:[{sceneId:'s',revision:0,startParagraph:0,environment:{location:'Town'},cast:[]}],visualCues:[{cueId:'c',sceneId:'s',paragraphIndex:0,imageTemplate:templateSnapshot(DEFAULT_CONFIG.imageTemplates.find(t=>t.id==='environment')!)}],paragraphSpeakers:['Mira']} as any;
 const rules=[{...draft(),scope:'user' as const,savedOrder:1}];const next=applyTemplatePreferences(plan,DEFAULT_CONFIG,rules,null,{});
 expect(next.visualCues[0]!.imageTemplate!.id).toBe('environment');expect(next.visualCues[0]!.presentationRuleTrace!.summary).toMatch(/identity/i);
 expect(applyTemplatePreferences({...plan,paragraphSpeakers:[null]},DEFAULT_CONFIG,rules,null,{}).visualCues[0]!.presentationRuleTrace).toBeUndefined();
});

test('unusable high-priority portrait does not hide a valid lower preference; traces identify the winning scope',()=>{
 const template=templateSnapshot(DEFAULT_CONFIG.imageTemplates.find(t=>t.id==='action')!);
 const plan={scenes:[{sceneId:'s',revision:0,startParagraph:0,environment:{location:'Town'},cast:[]}],visualCues:[{cueId:'c',sceneId:'s',sceneRevision:0,paragraphIndex:0,imageTemplate:template}],paragraphSpeakers:['Mira']} as any;
 const rules=[{...draft('same','environment'),name:'Account landscape',scope:'user' as const,savedOrder:1},{...draft('same','portrait'),name:'Chat portrait',scope:'chat' as const,savedOrder:1}];
 const next=applyTemplatePreferences(plan,DEFAULT_CONFIG,rules,null,{});
 expect(next.visualCues[0]!.imageTemplate!.id).toBe('environment');expect(next.visualCues[0]!.presentationRuleTrace!.summary).toContain('Account landscape (all chats)');
 expect(next.visualCues[0]!.presentationRuleTrace!.summary).toContain('Chat portrait');
});

test('a stalled optional scope cannot discard the other scope or stall fresh planning',async()=>{
 const f=fixture();await managePresentationRules(f.api,save('user',draft('healthy','environment')),'alice');
 const get=f.api.userStorage.getJson;f.api.userStorage.getJson=(path:string,options:any)=>path.includes('presentation-entities')?new Promise(()=>{}):get(path,options);
 const plan={key:{chatId:'chat'},scenes:[{sceneId:'s',revision:0,startParagraph:0,environment:{location:'Town'},cast:[]}],visualCues:[{cueId:'c',sceneId:'s',sceneRevision:0,paragraphIndex:0,imageTemplate:templateSnapshot(DEFAULT_CONFIG.imageTemplates[0]!)}],paragraphSpeakers:['Mira']} as any;
 const next=await freshPlanPreferences(f.api,plan,DEFAULT_CONFIG,null,{},'alice');
 expect(next.visualCues[0]!.imageTemplate!.id).toBe('environment');expect(next.visualCues[0]!.presentationRuleTrace!.summary).toMatch(/Chat.*timed out/);
});
const draft=(id='r',templateId='portrait')=>({id,name:'Portrait dialogue',enabled:true,priority:50,when:{kind:'dialogue' as const},then:{kind:'prefer_template' as const,templateId}});
function fixture(){const data=new Map<string,any>();const writes:string[]=[];const api={userStorage:{getJson:async(p:string,o:any)=>structuredClone(data.get(o.userId+':'+p)??o.fallback),setJson:async(p:string,v:any,o:any)=>{writes.push(o.userId+':'+p);data.set(o.userId+':'+p,structuredClone(v));}},chats:{get:async()=>({})}} as any;return {api,data,writes};}
const save=(scope:'user'|'chat',rule=draft(),expectedRevision=0)=>({type:'vn_presentation_rules' as const,version:1 as const,requestId:'request',chatId:'chat',action:'save' as const,scope,rule,expectedRevision});
test('rules are opt-in, scoped to user/chat and revisions reject stale edits',async()=>{
 const f=fixture();expect((await readPresentationRuleCatalog(f.api,'chat','alice')).user!.rules).toEqual([]);
 await managePresentationRules(f.api,save('user'),'alice');await managePresentationRules(f.api,save('chat',draft('local','environment')),'alice');
 expect((await readPresentationRuleCatalog(f.api,'other','alice')).user!.rules).toHaveLength(1);expect((await readPresentationRuleCatalog(f.api,'other','alice')).chat!.rules).toHaveLength(0);
 expect((await readPresentationRuleCatalog(f.api,'chat','bob')).user!.rules).toHaveLength(0);
 const before=JSON.stringify([...f.data]);await expect(managePresentationRules(f.api,save('user',draft('stale')),'alice')).rejects.toThrow(/changed|refresh/i);expect(JSON.stringify([...f.data])).toBe(before);
 await managePresentationRules(f.api,{type:'vn_presentation_rules',version:1,requestId:'toggle',chatId:'chat',action:'toggle',scope:'user',id:'r',enabled:false,expectedRevision:1},'alice');
 expect((await readPresentationRuleCatalog(f.api,'chat','alice')).user!.rules[0]!.enabled).toBe(false);
});
test('concurrent writes serialize and unsupported optional documents stay untouched',async()=>{
 const f=fixture();const results=await Promise.allSettled([managePresentationRules(f.api,save('user',draft('first')),'alice'),managePresentationRules(f.api,save('user',draft('second')),'alice')]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await readPresentationRuleCatalog(f.api,'chat','alice')).user!.rules).toHaveLength(1);
 f.data.set('alice:chats/chat/presentation-entities.json',{version:99,rules:['future']});const before=JSON.stringify([...f.data]);
 const catalog=await readPresentationRuleCatalog(f.api,'chat','alice');expect(catalog.user!.rules).toHaveLength(1);expect(catalog.chat).toBeNull();expect(catalog.diagnostics.join(' ')).toMatch(/unavailable/i);
 await expect(managePresentationRules(f.api,save('chat'),'alice')).rejects.toThrow();expect(JSON.stringify([...f.data])).toBe(before);
});
test('disabled templates and unauthorized chats cannot be saved, and rule management calls no generators',async()=>{
 const f=fixture();f.api.chats.get=async()=>null;
 await expect(managePresentationRules(f.api,save('chat'),'alice')).rejects.toThrow(/unavailable/i);expect(f.writes).toHaveLength(0);
 f.api.chats.get=async()=>({});await expect(managePresentationRules(f.api,save('user',draft('manga','manga-page')),'alice')).rejects.toThrow(/enabled|unavailable/i);expect(f.writes).toHaveLength(0);
});
