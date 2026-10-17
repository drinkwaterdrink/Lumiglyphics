import {VisualNovelSettingsPanel} from '../src/frontend/settings/panel.js';
import {DEFAULT_CONFIG} from '../src/config.js';
import type {PresentationRuleCatalog,PresentationRuleRequest} from '../src/shared/presentation-rules.js';
const mount=document.createElement('div');mount.style.cssText='min-height:100vh;background:var(--lumiverse-bg,#08090d)';document.body.append(mount);
const empty=()=>({version:1 as const,revision:0,rules:[]});
const state={chat:'chat-a',requests:[] as PresentationRuleRequest[],hold:false,held:[] as PresentationRuleRequest[],catalog:{user:empty(),chat:empty(),diagnostics:[]} as PresentationRuleCatalog,patches:[] as unknown[]};
const reply=(request:PresentationRuleRequest)=>{
 const doc=request.scope?state.catalog[request.scope]:null;
 if(request.action!=='list'&&doc){
  if(doc.revision!==request.expectedRevision){panel.presentationRulesError('Preferences changed. Refresh the list.',request.requestId);return;}
  const i=doc.rules.findIndex(r=>r.id===(request.rule?.id??request.id));
  if(request.action==='save'){const rule={...request.rule!,scope:request.scope!,savedOrder:doc.revision+1};if(i<0)doc.rules.push(rule);else doc.rules[i]=rule;}
  if(request.action==='toggle')doc.rules[i]!.enabled=request.enabled!;
  if(request.action==='delete')doc.rules.splice(i,1);
  doc.revision++;
 }
 panel.setPresentationRules(request.chatId??'',request.requestId,structuredClone(state.catalog));
};
const panel=new VisualNovelSettingsPanel({mount,getChatId:()=>state.chat,onPresentationRules:request=>{state.requests.push(request);if(state.hold)state.held.push(request);else queueMicrotask(()=>reply(request));},onSave:patch=>state.patches.push(patch),onOpenPreview:()=>{},onRefreshConnections:()=>{},setupStorage:{getItem:()=> '1',setItem:()=>{}}});
panel.setConfig(DEFAULT_CONFIG);panel.openSection('pictures');
(window as any).rulesFixture={state,panel,config:DEFAULT_CONFIG,reply,switchChat:(chat:string)=>{state.chat=chat;state.catalog.chat=empty();panel.clearPresentationRules();}};
