import { z } from 'zod';
import { PromptDialectIdSchema, type PromptDialectId } from './image-prompt-profile-v2.js';

export const PromptPrioritySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);
export type PromptPriority = z.infer<typeof PromptPrioritySchema>;

export const PromptSectionSchema = z.object({
  id: z.string().min(1).max(100),
  priority: PromptPrioritySchema,
  required: z.boolean(),
  compressible: z.boolean(),
  text: z.string().max(65000)
}).strict();
export type PromptSection = z.infer<typeof PromptSectionSchema>;

export const PromptDocumentSchema = z.object({
  dialect: PromptDialectIdSchema,
  sections: z.array(PromptSectionSchema).max(64),
  negativeSections: z.array(PromptSectionSchema).max(32),
  parameterHints: z.record(z.string(), z.unknown()).optional(),
  warnings: z.array(z.string().max(1000)).max(64)
}).strict();
export type PromptDocument = z.infer<typeof PromptDocumentSchema>;

export function createPromptDocument(
  dialect: PromptDialectId,
  sections: PromptSection[] = [],
  negativeSections: PromptSection[] = [],
  parameterHints?: Record<string, unknown>,
  warnings: string[] = []
): PromptDocument {
  return PromptDocumentSchema.parse({
    dialect,
    sections,
    negativeSections,
    ...(parameterHints ? { parameterHints } : {}),
    warnings
  });
}

export function assemblePromptSections(sections: PromptSection[], separator: string = '\n\n'): string {
  return sections
    .map(s => s.text.trim())
    .filter(text => text.length > 0)
    .join(separator);
}
