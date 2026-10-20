import {expect,test} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {normalizeConfig} from '../../config.js';
import {loadImagePromptProfile} from './image-prompt-profile.js';

test('public metadata is cached, model scoped, and fetched without private context',async()=>{
 const calls:any[]=[];
 const spindle={cors:async(...args:any[])=>{calls.push(args);return {status:200,body:JSON.stringify({data:[{id:'custom-model',supported_parameters:{max_prompt_characters:8000,prompt_length:{status:'known',unit:'unicode_code_points'}}}]})};}} as unknown as SpindleAPI;
 const config=normalizeConfig({});
 const profile=await loadImagePromptProfile(spindle,config,'nanogpt','custom-model');
 expect(profile.maxCharacters).toBe(8000);expect(profile.source).toBe('live');
 expect((await loadImagePromptProfile(spindle,config,'nanogpt','unlisted')).source).toBe('fallback');
 expect(calls).toEqual([['https://api.nano-gpt.com/api/v1/images/models',{method:'GET'}]]);
});
test('discovery failure and malformed metadata use a safe catalogue or fallback',async()=>{
 const spindle={cors:async()=>{throw new Error('offline');}} as unknown as SpindleAPI;
 expect((await loadImagePromptProfile(spindle,normalizeConfig({}),'nanogpt','z-image-turbo')).maxCharacters).toBe(1200);
 expect((await loadImagePromptProfile(spindle,normalizeConfig({}),'nanogpt','anima')).maxCharacters).toBe(3000);
 const bad={cors:async()=>({status:200,body:'invalid'})} as unknown as SpindleAPI;
 expect((await loadImagePromptProfile(bad,normalizeConfig({}),'nanogpt','unknown')).source).toBe('fallback');
});
test('manual-only mode makes no discovery call and preserves format preference',async()=>{
 const spindle={cors:async()=>{throw new Error('must not fetch');}} as unknown as SpindleAPI;
 const profile=await loadImagePromptProfile(spindle,normalizeConfig({automaticImagePromptSettings:false,imagePromptBudgetOverride:true,imagePromptBudget:6000,imagePromptFormat:'tags'}),'nanogpt','anima');
 expect(profile.maxCharacters).toBe(6000);expect(profile.format).toBe('tags');
});


test('live output discovery supplies native sizes even when the prompt ceiling is unknown',async()=>{
 const spindle={cors:async()=>({status:200,body:{data:[{id:'private-route',supported_parameters:{max_prompt_characters:null,prompt_length:{status:'unknown'},resolutions:['1k','2k'],aspect_ratio:['1:1','9:16']}}]}})} as unknown as SpindleAPI;
 const profile=await loadImagePromptProfile(spindle,normalizeConfig({}),'nanogpt','private-route');
 expect(profile.maxCharacters).toBe(3000);expect(profile.source).toBe('fallback');
 expect(profile.output).toEqual({sizes:['1k','2k'],ratios:['1:1','9:16']});expect(profile.outputSource).toBe('live');
});

test('expired discovery cannot be presented as live after a refresh failure',async()=>{
 let offline=false;const now=Date.now,base=now();let time=base;
 const spindle={cors:async()=>{if(offline)throw new Error('offline');return {data:[{id:'custom',supported_parameters:{max_prompt_characters:8000,prompt_length:{status:'known',unit:'utf16_code_units'},resolutions:['1k']}}]};}} as unknown as SpindleAPI;
 try{
  Date.now=()=>time;
  expect((await loadImagePromptProfile(spindle,normalizeConfig({}),'nanogpt','custom')).source).toBe('live');
  time+=3600001;offline=true;
  const profile=await loadImagePromptProfile(spindle,normalizeConfig({}),'nanogpt','custom');
  expect(profile.source).toBe('fallback');expect(profile.maxCharacters).toBe(3000);expect(profile.output).toBeUndefined();
 }finally{Date.now=now;}
});
