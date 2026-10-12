import type { SpindleAPI } from 'lumiverse-spindle-types';
import type { ContextSourcesConfig, ContextSourceReport } from '../../../shared/context-sources.js';
import { collectContextSources, optionalRpcReader } from './index.js';

/** Ephemeral status only. There is no retained imported evidence to leak into a
 * different chat, overwrite a saved turn, or survive a source disable/wipe. */
export class ContextSourceSession {
  private pending = new Map<string, AbortController>();
  cancel(userId: string): void { this.pending.get(userId)?.abort(); this.pending.delete(userId); }
  async refresh(spindle: SpindleAPI, config: ContextSourcesConfig | Promise<ContextSourcesConfig>, userId: string, chatId: string, requestId: string): Promise<ContextSourceReport | null> {
    this.cancel(userId);
    const abort=new AbortController();this.pending.set(userId,abort);
    try {
      const resolved=await config;
      if(abort.signal.aborted)return null;
      const results=await collectContextSources(optionalRpcReader(spindle),resolved,{userId,chatId},abort.signal);
      if(abort.signal.aborted || this.pending.get(userId)!==abort) return null;
      // Facts/names stay backend-only until a later explicit reference policy.
      return {chatId,requestId,sources:results.map(e=>e.status)};
    } catch(error) { if(abort.signal.aborted)return null;throw error; }
    finally { if(this.pending.get(userId)===abort)this.pending.delete(userId); }
  }
}
