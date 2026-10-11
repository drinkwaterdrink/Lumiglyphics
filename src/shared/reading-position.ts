import { z } from "zod";
import { TurnKeySchema } from "./contracts.js";
export const ReadingPositionSchema = z.object({
  version: z.literal(1), key: TurnKeySchema, paragraphIndex: z.number().int().min(0).max(100000),
}).strict();
export type ReadingPosition = z.infer<typeof ReadingPositionSchema>;
