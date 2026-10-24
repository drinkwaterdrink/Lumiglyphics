import type { SpindleAPI } from 'lumiverse-spindle-types';
import { ContextProposalSchema, type ContextProposal, type ContextSourcesConfig, type ContextSourceStatus } from '../../../shared/context-sources.js';
import { normalizeLumiBooks } from './lumibooks.js';
export type ProviderScope = { userId: string; chatId: string };
export type ProviderEvidence = { status: ContextSourceStatus; proposal?: ContextProposal };
export type RpcReader = (endpoint: string) => Promise<unknown>;

export function optionalRpcReader(spindle: SpindleAPI): RpcReader | undefined {
  const pool = (spindle as unknown as { rpcPool?: { read?: RpcReader } }).rpcPool;
  return typeof pool?.read === 'function' ? endpoint => pool.read!(endpoint) : undefined;
}
export function sourceStatus(provider: ContextSourceStatus['provider'], status: ContextSourceStatus['status']): ProviderEvidence {
  return { status: { provider, status, recordCount: 0, publicFactCount: 0, updatedAt: null, freshness: 'unknown' } };
}
export function proposalEvidence(provider: ContextSourceStatus['provider'], proposal: ContextProposal, now: number): ProviderEvidence {
  return { proposal, status: { provider, status: 'available', recordCount: proposal.entities.length, publicFactCount: Math.min(128, proposal.entities.reduce((n,e) => n + e.facts.filter(f => f.visibility === 'observed').length, 0)), updatedAt: proposal.updatedAt, freshness: now - proposal.updatedAt > 300_000 ? 'stale' : 'current_reference' } };
}
function normalizedScript(value: unknown, scope: ProviderScope, now: number): ProviderEvidence {
  if (value === null) return sourceStatus('lumiscript','cleared');
  const parsed = ContextProposalSchema.safeParse(value);
  if (!parsed.success || parsed.data.chatId !== scope.chatId || parsed.data.userId !== scope.userId || parsed.data.updatedAt > now + 60_000 || parsed.data.entities.reduce((n,e) => n+e.facts.length,0) > 128 || new Set(parsed.data.entities.map(e=>e.id)).size !== parsed.data.entities.length) return sourceStatus('lumiscript','invalid');
  return proposalEvidence('lumiscript', parsed.data, now);
}
/** One concurrent, bounded read per enabled source. No writes, polling, model
 * calls, saved-turn mutation or frontend facts. Late results are discarded. */
export async function collectContextSources(read: RpcReader | undefined, config: ContextSourcesConfig, scope: ProviderScope, signal: AbortSignal, options: { deadlineMs?: number; now?: number } = {}): Promise<ProviderEvidence[]> {
  const now = options.now ?? Date.now();
  const one = async (provider: ContextSourceStatus['provider'], endpoint: string | null): Promise<ProviderEvidence> => {
    if (!endpoint) return sourceStatus(provider,'disabled');
    if (!read || signal.aborted) return sourceStatus(provider,'unavailable');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let abort: () => void = () => {};
    const unavailable = new Promise<ProviderEvidence>(resolve => {
      timer = setTimeout(() => { timedOut = true; resolve(sourceStatus(provider,'timed_out')); }, Math.min(1500, Math.max(1, options.deadlineMs ?? 1500)));
      abort = () => resolve(sourceStatus(provider,'unavailable'));
      signal.addEventListener('abort',abort,{once:true});
    });
    const result = Promise.resolve().then(() => read(endpoint)).then(value => {
      if (timedOut || signal.aborted) return sourceStatus(provider,'unavailable');
      try {
        if (JSON.stringify(value)?.length > 256_000) return sourceStatus(provider,'invalid');
        return provider === 'lumibooks' ? normalizeLumiBooks(value,scope,now) : normalizedScript(value,scope,now);
      } catch { return sourceStatus(provider,'invalid'); }
    }, () => sourceStatus(provider,'unavailable'));
    try { return await Promise.race([result,unavailable]); }
    finally { if(timer) clearTimeout(timer);signal.removeEventListener('abort',abort); }
  };
  return Promise.all([one('lumibooks', config.lumibooks ? `lumi_books.codex.${scope.chatId}` : null), one('lumiscript',config.lumiscriptEndpoint || null)]);
}
