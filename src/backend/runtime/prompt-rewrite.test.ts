import {resolveImagePromptProfile} from "../../shared/image-prompt-profile.js";
import {expect,test} from 'bun:test';
import {normalizeConfig} from '../../config.js';
import {rewriteImagePrompt,assertEffectivePromptBudget} from './prompt-rewrite.js';
import type {SpindleAPI} from 'lumiverse-spindle-types';
const request={prompt:'A silver-haired traveller waits at a rainy station.',negativePrompt:'blurry, text',parameters:{seed:9,negativePrompt:'old'},connection_id:'image',model:'flux'};
function api(outputs:unknown[]){const calls:any[]=[];return {calls,spindle:{connections:{list:async()=>[{id:'writer',provider:'openrouter',model:'writer',is_default:true}]},generate:{raw:async(r:any)=>{calls.push(r);return outputs.shift();}}} as unknown as SpindleAPI};}

test('writer receives only literal scene priorities retained in the current editable draft',async()=>{
 const action='Mira hands Jon the sealed letter.';
 const original={...request,prompt:action+' At the rainy station.'};
 const {spindle,calls}=api([{content:JSON.stringify({prompt:'Mira gives Jon the sealed letter at the rainy station.',negativePrompt:''})}]);
 await rewriteImagePrompt(spindle,original,{brief:{subjects:'',action,composition:'Old portrait framing'},template:{name:'Scene',category:'action'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(JSON.parse(calls[0].messages[1].content).scenePriorities).toEqual([{field:'action',text:action}]);
 expect(JSON.stringify(calls)).not.toContain('Old portrait framing');
});

test('writer receives an expanded-character priority budget that is recalculated after rejection',async()=>{
 const subjects='Mira: silver hair\nJon: black hair';
 const {spindle,calls}=api([]);
 (spindle.generate as any).raw=async(r:any)=>{
  calls.push(r);const context=JSON.parse(r.messages[1].content);
  return {content:JSON.stringify({prompt:context.brief.subjects+(calls.length===1?'x'.repeat(4000):' Both wait beside wet rails.'),negativePrompt:''})};
 };
 const original={...request,prompt:subjects+' Both wait beside wet rails.'};
 const result=await rewriteImagePrompt(spindle,original,{brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit');
 const first=JSON.parse(calls[0].messages[1].content),second=JSON.parse(calls[1].messages[1].content);
 expect(first.priorityBudget.identityCharacters).toBe(subjects.length);
 expect(first.priorityBudget.scenePriorityCharacters).toBe(360);
 expect(first.priorityBudget.positiveBeyondIdentityCharacters).toBe(first.targetCombinedCharacters-first.priorityBudget.negativeTargetCharacters-subjects.length);
 expect(second.priorityBudget.targetCombinedCharacters).toBe(second.targetCombinedCharacters);
 expect(second.priorityBudget.targetCombinedCharacters).toBeLessThan(first.priorityBudget.targetCombinedCharacters);
 expect(calls[0].messages[0].content).toContain('scenePriorityCharacters');
 expect(result.parameters?.seed).toBe(9);
 expect(result.prompt).toContain(subjects);
});

test('common unambiguous writer field variants fit without repeated clicks',async()=>{
 for(const fields of [
  {positive_prompt:'A silver-haired traveller waits at the station.',negative_prompt:'blur',explanation:'Compressed repeated wording.'},
  {positivePrompt:'A silver-haired traveller waits at the station.',negativePrompt:null},
  {prompt:'A silver-haired traveller waits at the station.'},
 ]){
  const {spindle,calls}=api([{content:JSON.stringify(fields)}]);
  const result=await rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit');
  expect(result.prompt).toContain('silver-haired');expect(calls).toHaveLength(1);
  expect(result.negativePrompt).toBe('negative_prompt' in fields?'blur':request.negativePrompt);
 }
});
test('ambiguous writer alternatives and invalid field types remain blocked with useful diagnostics',async()=>{
 for(const fields of [{prompt:'First scene',positive_prompt:'Different scene',negativePrompt:''},{prompt:['not','a string'],negativePrompt:''},{prompt:'A traveller waits.',negativePrompt:['blur']}]){
  const {spindle}=api(Array.from({length:2},()=>({content:JSON.stringify(fields)})));
  await expect(rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit')).rejects.toThrow(/(?:conflicting|must be text)/);
 }
});
test('normalizing writer fields cannot bypass the frozen model budget',async()=>{
 const {spindle,calls}=api(Array.from({length:2},()=>({content:JSON.stringify({positive_prompt:'x'.repeat(3500),negative_prompt:'no watermark',explanation:'Shortened.'})})));
 await expect(rewriteImagePrompt(spindle,request,undefined,normalizeConfig({}),'u',new AbortController().signal,'fit')).rejects.toThrow('limit is 3,000');
 expect(calls).toHaveLength(2);
 expect(JSON.parse(calls[1].messages[1].content).previousCandidate.negativePrompt).toBe('no watermark');
});

test('fit materializes immutable cast blocks after rewriting and never sends markers as image text',async()=>{
 const subjects='Mira Vale: silver hair, blue coat, standing beside Jon Reed\nJon Reed: black hair, grey jacket';
 const {spindle,calls}=api([]);
 (spindle.generate as any).raw=async(r:any)=>{calls.push(r);const context=JSON.parse(r.messages[1].content);return {content:JSON.stringify({prompt:context.brief.subjects+'\nAt a rain-lit station, both wait beside wet rails.',negativePrompt:''})};};
 const result=await rewriteImagePrompt(spindle,{...request,prompt:subjects+'\n'+'Atmosphere. '.repeat(300)},{brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(calls).toHaveLength(1);expect(result.prompt).toContain(subjects);expect(result.prompt).not.toContain('[[LG_CAST');expect(result.prompt.length).toBeLessThan(3000);
});

test('a rejected freeform cast rewrite is corrected with anchors in the same fit operation',async()=>{
 const subjects='Mira: silver hair\nJon: black hair';const {spindle,calls}=api([]);
 (spindle.generate as any).raw=async(r:any)=>{calls.push(r);const context=JSON.parse(r.messages[1].content);return {content:JSON.stringify({prompt:calls.length===1?'Mira with black hair and Jon with silver hair.':context.brief.subjects+' At the station.',negativePrompt:''})};};
 const result=await rewriteImagePrompt(spindle,{...request,prompt:subjects+' at the station.'},{brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(calls).toHaveLength(2);expect(result.prompt).toContain(subjects);expect(calls[1].messages.at(-1).content).toContain('EVERY immutable identity anchor');
});

test('expanded identity characters count toward the actual budget and cannot hide behind short markers',async()=>{
 const subjects='Mira: '+'silver hair '.repeat(18);const {spindle,calls}=api([]);
 (spindle.generate as any).raw=async(r:any)=>{calls.push(r);const context=JSON.parse(r.messages[1].content);return {content:JSON.stringify({prompt:context.brief.subjects+'x'.repeat(1080),negativePrompt:''})};};
 await expect(rewriteImagePrompt(spindle,{...request,prompt:subjects,promptProfile:resolveImagePromptProfile('nanogpt','z-image-turbo')},{brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit')).rejects.toThrow('limit is 1,200');
 expect(calls).toHaveLength(2);
});

test('impossible locked identity budgets explain the conflict before spending writer tokens',async()=>{
 const subjects='Mira: '+('distinctive silver hair '.repeat(55));const {spindle,calls}=api([]);
 await expect(rewriteImagePrompt(spindle,{...request,prompt:subjects,promptProfile:resolveImagePromptProfile('nanogpt','z-image-turbo')},{brief:{subjects,subjectMode:'ensemble'},template:{name:'Full scene',category:'custom'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit')).rejects.toThrow('Clicking Fit again cannot resolve');
 expect(calls).toHaveLength(0);
});

test('rewrite context does not reintroduce stale scene evidence after manual edits',async()=>{
 const {spindle,calls}=api([{content:JSON.stringify({prompt:'A traveller in the forest.',negativePrompt:''})}]);
 await rewriteImagePrompt(spindle,{...request,prompt:'A traveller in the forest.'},{brief:{subjects:'',subjectMode:'none',scene:'old beach',action:'old action'},template:{name:'Environment',category:'environment'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit');
 const context=JSON.parse(calls[0].messages[1].content);
 expect(context.prompt).toContain('forest');expect(JSON.stringify(context)).not.toContain('old beach');expect(context.brief.scene).toBeUndefined();
});

test('Z-Image fitting can reorder single-subject facts and collapse repeated outfit wording',async()=>{
 const subjects='One visible woman; silver hair, green eyes, blue coat; Wearing blue coat';
 const original={...request,model:'z-image-turbo',promptProfile:resolveImagePromptProfile('nanogpt','z-image-turbo'),prompt:subjects+' at the station. '+'Wet rails. '.repeat(160)};
 const good={prompt:'One visible woman waits at the station: blue coat, green eyes, silver hair. Wet rails reflect soft daylight.',negativePrompt:''};
 const {spindle,calls}=api([{content:JSON.stringify(good)}]);
 const metadata={brief:{subjects,subjectMode:'one'},template:{name:'Portrait',category:'portrait'}} as any;
 const result=await rewriteImagePrompt(spindle,original,metadata,normalizeConfig({}),'u',new AbortController().signal,'fit');
 expect(result.prompt).toBe(good.prompt);expect(calls).toHaveLength(1);
 expect(calls[0].messages[0].content).toContain('no native negative field');
 expect(result.prompt.length+result.negativePrompt!.length).toBeLessThanOrEqual(1200);
});

test('single-subject fitting still rejects missing identity facts',async()=>{
 const subjects='One visible woman; silver hair, green eyes, blue coat';
 const original={...request,prompt:subjects+' at the station.'};
 const {spindle}=api(Array.from({length:2},()=>({content:JSON.stringify({prompt:'One visible woman, green eyes, blue coat at the station.',negativePrompt:''})})));
 await expect(rewriteImagePrompt(spindle,original,{brief:{subjects,subjectMode:'one'},template:{name:'Portrait',category:'portrait'}} as any,normalizeConfig({}),'u',new AbortController().signal,'fit')).rejects.toThrow('appearance');
});
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
