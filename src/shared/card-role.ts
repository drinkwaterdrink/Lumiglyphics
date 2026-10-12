import { z } from "zod";

export const CardRoleSchema = z.enum(["auto", "character", "scenario"]);
export type CardRole = z.infer<typeof CardRoleSchema>;
export const StoredCardRoleSchema = z.object({
  version: z.literal(1), cardId: z.string().min(1).max(200), role: CardRoleSchema
}).strict();
