import {expect,test} from 'bun:test';
import {resolveImagePromptProfile,parsePromptCapabilities} from './image-prompt-profile.js';
import {assertPromptLengths} from './prompt-length.js';

test('provider routes have exact limits and family detection never invents limits',()=>{
 expect(resolveImagePromptProfile('nanogpt','z-image-turbo').maxCharacters).toBe(1200);
 expect(resolveImagePromptProfile('nanogpt','qwen-image').maxCharacters).toBe(3000);
 expect(resolveImagePromptProfile('other','z-image-turbo').source).toBe('fallback');
 for(const id of ['flux-dev','qwen-image-2.1-turbo','anima/text-to-image','grok-imagine','gpt-image-1','nano-banana','seedream','minimax-h3','muse'])expect(resolveImagePromptProfile('nanogpt',id).family).not.toBe('generic');
 expect(resolveImagePromptProfile('nanogpt','anima/text-to-image').source).toBe('fallback');
});
test('manual ceiling can expand unknown models but cannot bypass verified provider limits',()=>{
 expect(resolveImagePromptProfile('nanogpt','unknown',{imagePromptBudgetOverride:true,imagePromptBudget:8000}).maxCharacters).toBe(8000);
 expect(resolveImagePromptProfile('nanogpt','z-image-turbo',{imagePromptBudgetOverride:true,imagePromptBudget:8000}).maxCharacters).toBe(1200);
 expect(resolveImagePromptProfile('nanogpt','z-image-turbo',{imagePromptBudgetOverride:true,imagePromptBudget:700}).maxCharacters).toBe(700);
});
test('metadata is bounded, exact and does not interpret unknown or token limits as characters',()=>{
 const parse=(max:unknown,status='known',unit='utf16_code_units')=>parsePromptCapabilities({data:[{id:'example',supported_parameters:{max_prompt_characters:max,prompt_length:{status,unit}}}]});
 expect(parse(8000).get('example')).toBe(8000);
 expect(parse(8000,'unknown').size).toBe(0);expect(parse(8000,'known','tokens').size).toBe(0);
 expect(parse(-5).size).toBe(0);expect(parse(1e9).size).toBe(0);
});
test('validator uses the frozen profile for smaller and larger combined budgets',()=>{
 const small=resolveImagePromptProfile('nanogpt','z-image-turbo');
 expect(()=>assertPromptLengths('x'.repeat(1150),'y'.repeat(51),small)).toThrow('1,200');
 const large=resolveImagePromptProfile('nanogpt','unknown',{imagePromptBudgetOverride:true,imagePromptBudget:6000});
 expect(()=>assertPromptLengths('x'.repeat(5000),'',large)).not.toThrow();
 expect(()=>assertPromptLengths('x'.repeat(5900),'y'.repeat(101),large)).toThrow('6,000');
});


test('known Flux routes get positive-only guidance without treating unrelated providers as equivalent',()=>{
 for(const id of ['flux-2-dev','flux-2-klein-4b','black-forest-labs/flux-3/text-to-image','blackforestlabs/flux-3/klein/text-to-image'])expect(resolveImagePromptProfile('nanogpt',id).negativeMode).toBe('positive-only');
 expect(resolveImagePromptProfile('other','flux-2-dev').negativeMode).toBe('supported-or-unknown');
 expect(resolveImagePromptProfile('nanogpt','flux-2-mystery').negativeMode).toBe('supported-or-unknown');
 expect(resolveImagePromptProfile('nanogpt','flux-2-dev',{automaticImagePromptSettings:false}).output).toBeUndefined();
});
