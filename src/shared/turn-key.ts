import { z } from 'zod';

const identifier = z.string().trim().min(1).max(256);
const nonNegativeInteger = z.number().int().nonnegative();

export const TurnKeySchema = z.object({
  chatId: identifier,
  assistantMessageId: identifier,
  swipeId: z.union([identifier, nonNegativeInteger]).nullable().default(null),
  sourceFingerprint: z.string().trim().min(8).max(256),
  revision: nonNegativeInteger,
}).strict();
export type TurnKey = z.infer<typeof TurnKeySchema>;
