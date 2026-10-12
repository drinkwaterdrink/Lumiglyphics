import { z } from 'zod';

export const ContextSourcesConfigSchema = z.object({
  lumibooks: z.boolean().default(false),
  lumiscriptEndpoint: z.string().max(200).regex(/^$|^lumiscript\.[a-z0-9_-]+\.[a-z0-9_.-]+$/).default(''),
}).strict();
export type ContextSourcesConfig = z.infer<typeof ContextSourcesConfigSchema>;
export function normalizeContextSources(value: unknown): ContextSourcesConfig {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { lumibooks: input.lumibooks === true, lumiscriptEndpoint: typeof input.lumiscriptEndpoint === 'string' && /^lumiscript\.[a-z0-9_-]+\.[a-z0-9_.-]+$/.test(input.lumiscriptEndpoint.trim()) && input.lumiscriptEndpoint.trim().length <= 200 ? input.lumiscriptEndpoint.trim() : '' };
}
export const ContextSourceStatusSchema = z.object({
  provider: z.enum(['lumibooks', 'lumiscript']),
  status: z.enum(['disabled', 'available', 'unavailable', 'timed_out', 'invalid', 'cleared']),
  recordCount: z.number().int().min(0).max(32),
  publicFactCount: z.number().int().min(0).max(128),
  updatedAt: z.number().finite().nonnegative().nullable(),
  freshness: z.enum(['current_reference', 'stale', 'unknown']),
}).strict();
export const ContextSourceReportSchema = z.object({ chatId: z.string().min(1).max(256), requestId: z.string().min(1).max(100), sources: z.array(ContextSourceStatusSchema).max(2) }).strict();
export type ContextSourceStatus = z.infer<typeof ContextSourceStatusSchema>;
export type ContextSourceReport = z.infer<typeof ContextSourceReportSchema>;

/** Optional producers publish data, never executable instructions. Without an
 * explicit observed classification a fact remains unclassified, backend-only. */
export const ContextProposalSchema = z.object({
  version: z.literal(1), chatId: z.string().min(1).max(256), userId: z.string().min(1).max(256),
  updatedAt: z.number().finite().nonnegative(),
  entities: z.array(z.object({
    id: z.string().min(1).max(256), kind: z.enum(['npc','place','object']), name: z.string().min(1).max(256),
    aliases: z.array(z.string().min(1).max(256)).max(12).default([]),
    facts: z.array(z.object({ field: z.enum(['appearance','description','outfit','condition','owner','location']), value: z.string().min(1).max(1200), visibility: z.enum(['observed','private','unclassified']).default('unclassified') }).strict()).max(16).default([]),
  }).strict()).max(32),
}).strict();
export type ContextProposal = z.infer<typeof ContextProposalSchema>;
