import type { ContextProposal } from '../../../shared/context-sources.js';
import { proposalEvidence, sourceStatus, type ProviderEvidence, type ProviderScope } from './index.js';
const record = (v: unknown): Record<string,unknown> | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,unknown> : null;

/** Published Codex files have no viewpoint/reveal classification. Retain
 * bounded reference evidence as unclassified; never promote it into history. */
export function normalizeLumiBooks(value: unknown, scope: ProviderScope, now: number): ProviderEvidence {
  if(value === null) return sourceStatus('lumibooks','cleared');
  const input=record(value), files=record(input?.files), states=record(input?.fileStates);
  if(!input || input.chatId!==scope.chatId || input.userId!==scope.userId || !files || !states || typeof input.updatedAt!=='number' || !Number.isFinite(input.updatedAt) || input.updatedAt<0 || input.updatedAt>now+60_000) return sourceStatus('lumibooks','invalid');
  const entities: ContextProposal['entities']=[];const ids=new Set<string>();
  for(const [file,kind] of [['characters','npc'],['locations','place'],['things','object']] as const) {
    // Published rendered codex also excludes frozen files. Fail closed on unknown states.
    if(states[file]!==undefined && states[file]!=='on') continue;
    const list=record(files[file])?.entities;
    if(!Array.isArray(list)) { if(list!==undefined) return sourceStatus('lumibooks','invalid');continue; }
    for(const raw of list.slice(0,256)) {
      if(entities.length>=32) break;
      const e=record(raw);if(!e || e.noInject===true || e.noInject==='true' || e.noinject===true || e.noinject==='true') continue;
      if(typeof e.id!=='string' || !e.id.trim() || e.id.length>256 || typeof e.name!=='string' || !e.name.trim() || e.name.length>256 || ids.has(e.id)) continue;
      ids.add(e.id);
      const aliases=Array.isArray(e.aliases) ? e.aliases.filter((a):a is string=>typeof a==='string'&&a.length>0&&a.length<=256).slice(0,12) : [];
      const facts: ContextProposal['entities'][number]['facts']=[];
      for(const field of ['appearance','description','status'] as const) if(typeof e[field]==='string' && (e[field] as string).trim()) facts.push({field:field==='status'?'condition':field,value:(e[field] as string).slice(0,1200),visibility:'unclassified'});
      entities.push({id:e.id,kind,name:e.name,aliases,facts});
    }
  }
  return proposalEvidence('lumibooks',{version:1,...scope,updatedAt:input.updatedAt,entities},now);
}
