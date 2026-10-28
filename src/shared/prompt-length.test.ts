import { expect, test } from 'bun:test';
import { compactPromptText, assertPromptLengths, fitPromptToBudget, IMAGE_PROMPT_MAX_CHARS } from './prompt-length.js';

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

test('fitPromptToBudget fits overlong prompts deterministically to target budget', () => {
 const anchors = '(silver hair:1.2), (emerald eyes:1.1)';
 const filler = Array(150).fill('masterpiece, ultra high quality, dramatic lighting, detailed background').join(', ');
 const overlongPrompt = `${anchors}, ${filler}`;
 const overlongNegative = 'worst quality, normal quality, blurry, duplicate, extra limbs, low res, ' + 'extra negative text, '.repeat(50);

 const result = fitPromptToBudget(overlongPrompt, overlongNegative, 3000);
 expect(result.fitted).toBe(true);
 expect(result.prompt.length + result.negativePrompt.length).toBeLessThanOrEqual(3000);
 expect(result.prompt).toContain('(silver hair:1.2)');
 expect(result.prompt).toContain('(emerald eyes:1.1)');
 expect(() => assertPromptLengths(result.prompt, result.negativePrompt)).not.toThrow();
});

test('fitPromptToBudget handles positive-only mode', () => {
 const prompt = 'A brave knight in armor, castle background, sunset glow, epic composition';
 const negative = 'blurry, bad anatomy';
 const result = fitPromptToBudget(prompt, negative, 1200, 'positive-only');
 expect(result.negativePrompt).toBe('');
 expect(result.prompt.length).toBeLessThanOrEqual(1200);
 expect(() => assertPromptLengths(result.prompt, result.negativePrompt, { version: 1, family: 'sdxl', format: 'tags', maxCharacters: 1200, negativeMode: 'positive-only', source: 'catalogue', guidance: '' })).not.toThrow();
});
