import { z } from 'zod';
import { ReadingPositionSchema } from './reading-position.js';

const id = z.string().trim().min(1).max(160);
export const WorldClockKindSchema = z.enum(['deadline', 'relationship', 'faction', 'objective']);
export const WorldClockDraftSchema = z.object({
  title: z.string().trim().min(1).max(100),
  kind: WorldClockKindSchema,
  steps: z.number().int().min(2).max(12),
}).strict();
export const WorldClockSchema = WorldClockDraftSchema.extend({
  id,
  paused: z.boolean(),
}).strict();
export const WorldClockEventSchema = z.object({
  id,
  clockId: id,
  position: ReadingPositionSchema,
  rawFingerprint: z.string().min(8).max(256),
  kind: z.enum(['advance', 'correct']),
  value: z.number().int().min(0).max(12),
  note: z.string().trim().min(1).max(280),
}).strict();
export const WorldClockLedgerSchema = z.object({
  clocks: z.array(WorldClockSchema).max(24),
  events: z.array(WorldClockEventSchema).max(512),
}).strict();

export const WorldClockCommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), clock: WorldClockDraftSchema }).strict(),
  z.object({ kind: z.literal('pause'), clockId: id, paused: z.boolean() }).strict(),
  z.object({ kind: z.literal('advance'), clockId: id, note: WorldClockEventSchema.shape.note }).strict(),
  z.object({ kind: z.literal('correct'), clockId: id, note: WorldClockEventSchema.shape.note, value: WorldClockEventSchema.shape.value }).strict(),
]);

export type WorldClockLedger = z.infer<typeof WorldClockLedgerSchema>;
export type WorldClockEvent = z.infer<typeof WorldClockEventSchema>;
export type WorldClockCommand = z.infer<typeof WorldClockCommandSchema>;

/** Uses the ordered, reveal-scoped ledger supplied by Story DNA. */
export function visibleClockProgress(ledger: WorldClockLedger, clockId: string): number {
  const clock = ledger.clocks.find(entry => entry.id === clockId);
  if (!clock) return 0;
  return ledger.events.reduce((progress, event) => event.clockId !== clockId ? progress
    : Math.min(clock.steps, event.kind === 'advance' ? progress + 1 : event.value), 0);
}
