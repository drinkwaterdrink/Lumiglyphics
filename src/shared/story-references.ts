import { z } from 'zod';
import { REFERENCE_FIELDS, referenceFieldMatchesKind } from './reference-fields.js';
export const StoryReferenceSchema = z.object({
 kind: z.enum(['npc','place','object']), name: z.string().trim().min(1).max(256),
 paragraphIndex: z.number().int().nonnegative(),
 field: z.enum(REFERENCE_FIELDS),
 value: z.string().trim().min(1).max(400), evidence: z.string().trim().min(1).max(1200),
}).strict().refine(reference=>referenceFieldMatchesKind(reference.field,reference.kind),{message:'Reference field does not apply to this entity category.'});
export type StoryReference = z.infer<typeof StoryReferenceSchema>;
/** Optional enrichment cannot invalidate the primary plan. Evidence is literal
 * visible prose from this paragraph, never hidden context or inferred biography. */
export function normalizeStoryReferences(value: unknown, paragraphs: readonly {text:string}[]): StoryReference[] {
 if (!Array.isArray(value)) return [];
 const result: StoryReference[] = []; const seen = new Set<string>();
 for (const raw of value.slice(0,128)) {
  const parsed = StoryReferenceSchema.safeParse(raw); if (!parsed.success) continue;
  const r=parsed.data, text=paragraphs[r.paragraphIndex]?.text;
  if (!text || !text.includes(r.evidence) || !r.evidence.includes(r.name) || !r.evidence.includes(r.value)) continue;
  const key=JSON.stringify(r); if(seen.has(key))continue; seen.add(key);
  result.push(r); if(result.length===32)break;
 }
 return result;
}
