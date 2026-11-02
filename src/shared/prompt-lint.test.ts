import {expect,test} from 'bun:test';
import {lintCompiledPrompt} from './prompt-lint.js';
import {lintCompiledPrompt as backendLint} from '../backend/runtime/prompt-lint.js';
import {resolveImagePromptProfileV2} from './image-prompt-profile-v2.js';
test('client and backend lint agree without rewriting creative text',()=>{const options={prompt:'Mira, close-up and wide establishing shot',negativePrompt:'blur',profile:resolveImagePromptProfileV2('test','generic'),referenceAttachmentKnown:false};const before=JSON.stringify(options);expect(lintCompiledPrompt(options)).toEqual(backendLint(options));expect(lintCompiledPrompt(options).warnings).toContain('Prompt contains contradictory camera framing directions (close-up and wide establishing shot).');expect(JSON.stringify(options)).toBe(before);});
test('unknown frontend reference attachment never fabricates a missing reference warning',()=>{const options={prompt:'Use the reference image 1',profile:resolveImagePromptProfileV2('test','generic')};expect(lintCompiledPrompt(options).warnings.length).toBe(1);expect(lintCompiledPrompt({...options,referenceAttachmentKnown:false}).warnings).toEqual([]);});
