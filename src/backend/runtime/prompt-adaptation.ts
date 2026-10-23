import type {SpindleAPI} from 'lumiverse-spindle-types';
import type {VisualNovelConfig} from '../../config.js';
import type {ImagePromptMetadata} from '../../shared/image-templates.js';
import {compactImageRequest,type ImageGenerationRequest} from './image-review.js';
import {rewriteImagePrompt} from './prompt-rewrite.js';

/** One adaptation policy for new pictures and template replacements. Failure
 * returns the intact draft to review; it never starts an image request. */
export async function adaptImagePrompt(spindle:SpindleAPI,input:ImageGenerationRequest,metadata:ImagePromptMetadata|undefined,config:VisualNovelConfig,userId:string|undefined,signal:AbortSignal,skip=false):Promise<{request:ImageGenerationRequest;rewritten:boolean;error?:string}>{
 const request=compactImageRequest(input),profile=request.promptProfile;
 if(skip||!(request.prompt.length+(request.negativePrompt?.length??0)>(profile?.maxCharacters??3000)||profile?.negativeMode==='positive-only'&&Boolean(request.negativePrompt?.trim())))return {request,rewritten:false};
 try{
  return {request:await rewriteImagePrompt(spindle,request,metadata,config,userId,signal,'fit'),rewritten:true};
 }catch(error){
  if(signal.aborted){const aborted=new Error('Prompt adaptation cancelled.');aborted.name='AbortError';throw aborted;}
  const reason=error instanceof Error?error.message:'';
  const safe=/^(?:Required cast identity details|Prompt repair failed|Configure a story-reader text connection)/.test(reason)?reason.slice(0,1000):'Automatic model adaptation could not finish. Your complete draft is retained. Check the story-reader connection, then use Fit to budget or edit the prompt.';
  spindle.log?.warn?.('Image prompt adaptation failed; retaining the original for review.');
  return {request,rewritten:false,error:safe};
 }
}
