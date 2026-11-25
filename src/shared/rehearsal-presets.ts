import { z } from 'zod';

const name = z.string().trim().min(1).max(48);
export const RehearsalLookSchema = z.object({
  camera: z.enum(['off', 'gentle', 'full']),
  lighting: z.boolean(),
  captionOpacity: z.number().min(0).max(1),
}).strict();
export const RehearsalPresetSchema = RehearsalLookSchema.extend({ name }).strict();
export const REHEARSAL_PRESET_LIMIT = 12;
export type RehearsalLook = z.infer<typeof RehearsalLookSchema>;
export type RehearsalPreset = z.infer<typeof RehearsalPresetSchema>;
export const RehearsalCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), preset: RehearsalPresetSchema }).strict(),
  z.object({ action: z.literal('apply'), name }).strict(),
  z.object({ action: z.literal('remove'), name }).strict(),
]);
export type RehearsalCommand = z.infer<typeof RehearsalCommandSchema>;
export const RehearsalRequestSchema = z.object({
  type: z.literal('vn_rehearsal_preset'),
  chatId: z.string().min(1).max(256),
  requestId: z.string().min(1).max(160),
  command: RehearsalCommandSchema,
}).strict();
