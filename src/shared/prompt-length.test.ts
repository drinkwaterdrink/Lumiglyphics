import { expect, test } from 'bun:test';
import { compactPromptText, assertPromptLengths, IMAGE_PROMPT_MAX_CHARS } from './prompt-length.js';
test('caps count UTF-16 characters conservatively and never silently drops unique details',()=>{
 expect(IMAGE_PROMPT_MAX_CHARS).toBe(3000);
 expect(()=>assertPromptLengths('x'.repeat(3000),'')).not.toThrow();
 expect(()=>assertPromptLengths('x'.repeat(3001),'')).toThrow('3,000');
 expect(()=>assertPromptLengths('ok','x'.repeat(3001))).toThrow('negative');
 const unique='x'.repeat(3111);expect(compactPromptText(unique)).toBe(unique);
});
test('compaction removes repeated lines and whitespace only when over limit',()=>{
 const line='Character identity: silver hair, green eyes.';
 expect(compactPromptText(Array(100).fill(line).join('\n'))).toBe(line);
 expect(compactPromptText('  Keep exact dialogue  ')).toBe('  Keep exact dialogue  ');
});

test('positive and negative share one 3000 character budget',()=>{
 expect(()=>assertPromptLengths('x'.repeat(2800),'y'.repeat(200))).not.toThrow();
 expect(()=>assertPromptLengths('x'.repeat(2800),'y'.repeat(201))).toThrow('Combined');
});
