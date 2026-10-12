import { z } from "zod";

export const SubjectCorrectionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("character"), name: z.string().trim().min(1).max(160),
    appearance: z.string().trim().max(2000).optional(), saveAppearance: z.boolean()
  }).strict(),
  z.object({ kind: z.literal("environment"), templateId: z.string().trim().min(1).max(100) }).strict()
]);
export type SubjectCorrection = z.infer<typeof SubjectCorrectionSchema>;
