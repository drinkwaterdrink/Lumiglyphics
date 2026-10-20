import {resolveImagePromptProfile} from "../../shared/image-prompt-profile.js";
import {expect,test} from 'bun:test';
import {normalizeConfig} from '../../config.js';
import {rewriteImagePrompt,assertEffectivePromptBudget} from './prompt-rewrite.js';
import type {SpindleAPI} from 'lumiverse-spindle-types';
const request={prompt:'A silver-haired traveller waits at a rainy station.',negativePrompt:'blurry, text',parameters:{seed:9,negativePrompt:'old'},connection_id:'image',model:'flux'};
function api(outputs:unknown[]){const calls:any[]=[];return {calls,spindle:{connections:{list:async()=>[{id:'writer',provider:'openrouter',model:'writer',is_default:true}]},generate:{raw:async(r:any)=>{calls.push(r);return outputs.shift();}}} as unknown as SpindleAPI};}
test('reroll uses the writer connection, keeps image parameters and synchronizes prompt copies',async()=>{
 const {spindle,calls}=api([{content:JSON.stringify({prompt:'At the rain-lit station, a silver-haired traveller waits beside wet rails.',negativePrompt:'blurry, text'})}]);
 const result=await rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}), 'u',new AbortController().signal,'reroll');
 expect(result.prompt).not.toBe(request.prompt);expect(result.connection_id).toBe('image');expect(result.parameters?.seed).toBe(9);expect(result.parameters?.negativePrompt).toBe('blurry, text');
 expect(calls[0].connection_id).toBe('writer');expect(calls[0].userId).toBe('u');expect(calls[0].messages[0].content).toContain('2,750');
});
test('oversize output is measured and repaired once rather than dispatched or blindly clipped',async()=>{
 const {spindle,calls}=api([{content:JSON.stringify({prompt:'x'.repeat(3500),negativePrompt:'blurry'})},{content:JSON.stringify({prompt:'Rain at the station.',negativePrompt:'blur'})}]);
 const result=await rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(calls).toHaveLength(2);expect(result.prompt).toBe('Rain at the station.');expect(calls[1].messages.at(-1).content).toContain('3,000');
});
test('abort during rewriting never applies a late result or starts a repair call',async()=>{
 const controller=new AbortController();const {spindle,calls}=api([]);(spindle.generate as any).raw=async()=>{controller.abort();return {content:JSON.stringify({prompt:'late',negativePrompt:''})};};
 await expect(rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',controller.signal,'reroll')).rejects.toThrow();expect(calls).toHaveLength(0);
});
test('an ineffective reroll and repeated invalid output leave the original request intact',async()=>{
 const {spindle}=api([{content:JSON.stringify({prompt:request.prompt,negativePrompt:request.negativePrompt})},{content:'invalid'}]);
 await expect(rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'reroll')).rejects.toThrow();expect(request.parameters.negativePrompt).toBe('old');
});
test('a writer that drops protected appearance is rejected before the corrected result can be used',async()=>{
 const identity='silver hair, green eyes, blue coat';
 const original={...request,prompt:`${identity}. Waiting at the rainy station.`};
 const {spindle,calls}=api([{content:JSON.stringify({prompt:'A dark-haired traveller waits at a station.',negativePrompt:'blur'})},{content:JSON.stringify({prompt:`At the rain-lit station: ${identity}.`,negativePrompt:'blur'})}]);
 const metadata={brief:{subjects:identity},template:{name:'Portrait',category:'portrait'}} as any;
 const rewritten=await rewriteImagePrompt(spindle,original,metadata,normalizeConfig({}),'u',new AbortController().signal,'reroll');
 expect(calls).toHaveLength(2);expect(rewritten.prompt).toContain(identity);expect(rewritten.prompt).not.toContain('dark-haired');
});
test('connection raw prompt overrides are checked against the effective combined budget',()=>{
 expect(()=>assertEffectivePromptBudget({...request,parameters:{rawRequestOverride:{prompt:'x'.repeat(3001)}}})).toThrow('raw');
 expect(()=>assertEffectivePromptBudget({...request,parameters:{rawRequestOverride:JSON.stringify({prompt:'x'.repeat(3001)})}})).toThrow('raw');
 expect(()=>assertEffectivePromptBudget({...request,parameters:{rawRequestOverride:'not json'}})).toThrow('JSON');
 expect(()=>assertEffectivePromptBudget({...request,parameters:{rawRequestOverride:'{"prompt":"Different hidden prompt"}'}})).toThrow('reviewed wording');
 expect(()=>assertEffectivePromptBudget({...request,prompt:'x'.repeat(2800),negativePrompt:'y'.repeat(201)})).toThrow('3,000');
 expect(()=>assertEffectivePromptBudget({...request,parameters:{rawRequestOverride:{aspect_ratio:'9:16'}}})).not.toThrow();
});


test('rewrite uses the frozen small budget and positive-only endpoint guidance',async()=>{
 const promptProfile=resolveImagePromptProfile('nanogpt','blackforestlabs/flux-3/klein/text-to-image',{imagePromptBudgetOverride:true,imagePromptBudget:1000});
 const {spindle,calls}=api([{content:JSON.stringify({prompt:'An empty rain-lit station with a silver-haired traveller.',negativePrompt:''})}]);
 const result=await rewriteImagePrompt(spindle,{...request,promptProfile},undefined,normalizeConfig({imagePromptBudgetOverride:true,imagePromptBudget:8000}),'u',new AbortController().signal,'fit');
 expect(calls[0].messages[0].content).toContain('1,000 combined character ceiling');
 expect(calls[0].messages[0].content).toContain('no native negative field');
 expect(result.promptProfile?.maxCharacters).toBe(1000);expect(result.negativePrompt).toBe('');
});

test('raw override validation follows small and large frozen budgets',()=>{
 const small=resolveImagePromptProfile('nanogpt','z-image-turbo');
 expect(()=>assertEffectivePromptBudget({...request,prompt:'x'.repeat(1201),negativePrompt:'',promptProfile:small})).toThrow('1,200');
 const large=resolveImagePromptProfile('nanogpt','unknown',{imagePromptBudgetOverride:true,imagePromptBudget:6000});
 const prompt='x'.repeat(5000);
 expect(()=>assertEffectivePromptBudget({...request,prompt,negativePrompt:'',promptProfile:large,parameters:{rawRequestOverride:{prompt,negative_prompt:''}}})).not.toThrow();
});

test('ensemble repair can rearrange cast descriptions while preserving each persons appearance',async()=>{
 const subjects='Mira Vale: silver hair, green eyes, blue coat\nJon Reed: black hair, brown eyes, grey jacket';
 const original={...request,prompt:subjects+'\n'+'Rainy station details. '.repeat(240)};
 const result={prompt:'Mira Vale: blue coat; silver hair, green eyes. Jon Reed: grey jacket; black hair, brown eyes. Both wait at the rainy station.',negativePrompt:'blur'};
 const {spindle,calls}=api([{content:JSON.stringify(result)}]);
 const metadata={brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any;
 const rewritten=await rewriteImagePrompt(spindle,original,metadata,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(rewritten.prompt).toBe(result.prompt);expect(calls).toHaveLength(1);
});

test('valid near-ceiling wording is accepted instead of rejected by an artificial safety ceiling',async()=>{
 const prompt='A traveller waits. '+ 'x'.repeat(2950);
 const {spindle}=api([{content:JSON.stringify({prompt,negativePrompt:''})}]);
 const rewritten=await rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(rewritten.prompt.length).toBeLessThanOrEqual(3000);expect(rewritten.prompt).toBe(prompt);
});

test('ensemble repair rejects swapped appearances and recovers the original identity facts',async()=>{
 const subjects='Mira Vale: silver hair, green eyes\nJon Reed: black hair, brown eyes';
 const original={...request,prompt:subjects+' at the station.'};
 const bad={prompt:'Mira Vale: black hair, brown eyes. Jon Reed: silver hair, green eyes.',negativePrompt:''};
 const good={prompt:'Jon Reed: brown eyes, black hair. Mira Vale: green eyes, silver hair. At the station.',negativePrompt:''};
 const {spindle,calls}=api([{content:JSON.stringify(bad)},{content:JSON.stringify(good)}]);
 const metadata={brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any;
 expect((await rewriteImagePrompt(spindle,original,metadata,normalizeConfig({}),'u',new AbortController().signal,'fit')).prompt).toBe(good.prompt);
 expect(calls).toHaveLength(2);expect(calls[1].messages.at(-1).content).toContain('assigned to another person');
});

test('wrapped JSON text blocks are accepted without treating quoted braces as object boundaries',async()=>{
 const text='Here is the prompt:\n```json\n'+JSON.stringify({prompt:'A traveller holds a sign marked "{A}" at the station.',negativePrompt:'blur'})+'\n```';
 const {spindle}=api([{content:[{type:'text',text}]}]);
 expect((await rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit')).prompt).toContain('{A}');
});

test('length repair feeds back the measured candidate and failure reports its actual size',async()=>{
 const bad={prompt:'x'.repeat(3500),negativePrompt:'unique blur'};
 const {spindle,calls}=api([{content:JSON.stringify(bad)},{content:JSON.stringify(bad)}]);
 await expect(rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit')).rejects.toThrow('3,511 combined characters');
 const second=JSON.parse(calls[1].messages[1].content);
 expect(second.previousCandidate.prompt).toBe(bad.prompt);expect(second.targetCombinedCharacters).toBeLessThan(2900);
 expect(request.prompt).toContain('silver-haired');
});
