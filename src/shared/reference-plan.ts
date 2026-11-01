import { z } from 'zod';

export const ReferenceRoleSchema = z.enum([
  'identity',
  'style',
  'clothing',
  'composition',
  'background'
]);
export type ReferenceRole = z.infer<typeof ReferenceRoleSchema>;

export const ReferenceItemSchema = z.object({
  imageId: z.string().min(1).max(256),
  role: ReferenceRoleSchema,
  subject: z.string().max(256).optional(),
  label: z.string().max(256).optional(),
  dataUrl: z.string().optional(),
  mimeType: z.string().max(64).optional(),
  strength: z.number().min(0).max(1).optional()
}).strict();
export type ReferenceItem = z.infer<typeof ReferenceItemSchema>;

export const ReferencePlanSchema = z.object({
  references: z.array(ReferenceItemSchema).max(16)
}).strict();
export type ReferencePlan = z.infer<typeof ReferencePlanSchema>;

export function createReferencePlan(references: ReferenceItem[] = []): ReferencePlan {
  return ReferencePlanSchema.parse({ references });
}
