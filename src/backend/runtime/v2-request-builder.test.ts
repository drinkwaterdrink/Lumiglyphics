import {test,expect} from 'bun:test';
import {buildV2ImageRequest} from './v2-request-builder.js';
import {normalizeConfig} from '../../config.js';
import {resolveImagePromptProfileV2} from '../../shared/image-prompt-profile-v2.js';
import {templateSnapshot,type VisualBrief,type ImagePromptMetadata} from '../../shared/image-templates.js';
import type {VisualCue} from '../../shared/contracts.js';
const config=normalizeConfig({imagePromptEngineVersion:2,promptPrefix:'watercolor illustration',selectedSharedStyleId:''});
function fixture(mode:'one'|'none'|'ensemble'='one',fixed=false){
 const template=templateSnapshot({...config.imageTemplates[0]!,subjectMode:mode,cameraPolicy:fixed?'fixed':'directed',category:mode==='none'?'environment':'portrait'});
 const cue={cueId:'cue',assetJobId:'job',paragraphIndex:0,sceneId:'scene',sceneRevision:1,kind:'flattened_scene',action:null,expression:null,promptDelta:'',character:'Mira',ensembleSubjects:mode==='ensemble'?[{name:'Mira',appearance:'silver hair'},{name:'Jo',appearance:'black curls'}]:undefined,imageTemplate:template} as VisualCue;
 const brief:VisualBrief={scene:'A quiet library.',subjects:mode==='none'?'':mode==='ensemble'?'Mira: silver hair, green coat\nJo: black curls, blue jacket':'Mira: silver hair, green coat',subjectMode:mode,action:'reading beside a window',composition:'eye level',lighting:'warm lamplight',framing:'portrait',referencePolicy:'none',sources:['story'],conflicts:[]};
 const metadata:ImagePromptMetadata={template,brief,selectionReason:'Fixture selection',format:'description',trackerStatus:'not_found'};
 const request={prompt:'Preserve original page wording.',negativePrompt:'Original negative.',model:'fixture-model',connection_id:'fixture-connection',parameters:{seed:42,width:1024,height:1024},owner_chat_id:'chat',userId:'user'};
 return {config,cue,brief,metadata,request,profile:resolveImagePromptProfileV2('fixture','fixture-model'),styleId:'',shadow:{prompt:request.prompt,negativePrompt:request.negativePrompt},referenceSummary:'No extension reference'};
}
test('V2 builder is detached and preserves transport fields, negative ownership and shadow wording',()=>{const input=fixture(),before=structuredClone(input),result=buildV2ImageRequest(input);expect(input).toEqual(before);expect(result.request).toMatchObject({connection_id:'fixture-connection',owner_chat_id:'chat',userId:'user',parameters:{seed:42}});expect(result.request.prompt).toContain('Mira');expect(result.metadata?.shadowPrompt?.v1Prompt).toBe(input.request.prompt);expect(result.metadata?.shadowPrompt?.v1NegativePrompt).toBe(input.request.negativePrompt);expect(result.metadata?.shadowPrompt?.v2Prompt).toBe(result.request.prompt);expect(result.metadata?.budgetSummary?.finalCharacters).toBe(result.request.prompt.length+(result.request.negativePrompt?.length??0));});
test('fixed and manga templates retain their original page prompt and negatives',()=>{const input=fixture('one',true);const {revision:_,...template}=input.cue.imageTemplate!;input.cue.imageTemplate=templateSnapshot({...template,intent:'manga-page'});const result=buildV2ImageRequest(input);expect(result.request.prompt).toBe(input.request.prompt);expect(result.request.negativePrompt).toBe(input.request.negativePrompt);expect(result.metadata?.shadowPrompt).toBeUndefined();expect(result.metadata?.promptEngineVersion).toBe(2);});
test('none, solo and ensemble requests preserve the depicted subject boundary',()=>{const none=buildV2ImageRequest(fixture('none')).request.prompt;expect(none).not.toContain('Mira');expect(none).not.toContain('Jo');const solo=buildV2ImageRequest(fixture()).request.prompt;expect(solo).toContain('Mira');expect(solo).not.toContain('Jo');const ensemble=buildV2ImageRequest(fixture('ensemble')).request.prompt;expect(ensemble).toContain('Mira');expect(ensemble).toContain('Jo');});
test('manual rebuild revision, camera and fit-to-model budgets stay explicit',()=>{const input=fixture(),result=buildV2ImageRequest({...input,previousShotRevision:3,rebuild:{reframe:true,fitToModel:true,manualCamera:{shotSize:'close-up',angle:'low-angle',dialogueSafeArea:'always'}}});expect(result.request.shotSpec?.revision).toBe(4);expect(result.request.shotSpec?.camera.shotSize).toBe('close-up');expect(result.request.shotSpec?.camera.angle).toBe('low-angle');expect(result.request.shotSpec?.safeArea?.reason).toBe('dialogue-overlay');expect(result.metadata?.budgetSummary?.hardLimit).toBeLessThanOrEqual(input.profile.hardMaxCharacters);});

test('compatible picture rebuild retains prior lens/depth without changing manual camera priority',()=>{
 const input=fixture(),first=buildV2ImageRequest(input).request;
 const shotSpec={...first.shotSpec!,camera:{...first.shotSpec!.camera,lens:'telephoto' as const,depthOfField:'selective' as const}};
 const previousShot={cue:input.cue,shotSpec,styleDNA:first.styleSnapshot!};
 const result=buildV2ImageRequest({...input,previousShot} as any);
 expect(result.request.shotSpec?.camera.lens).toBe('telephoto');expect(result.request.shotSpec?.camera.depthOfField).toBe('selective');
 const manual=buildV2ImageRequest({...input,previousShot,rebuild:{manualCamera:{lensFeel:'wide',depth:'deep'}}} as any);
 expect(manual.request.shotSpec?.camera.lens).toBe('wide');expect(manual.request.shotSpec?.camera.depthOfField).toBe('deep');
});
test('reframe and incompatible shot context keep deterministic current framing',()=>{
 const input=fixture(),baseline=buildV2ImageRequest(input),shotSpec={...baseline.request.shotSpec!,camera:{...baseline.request.shotSpec!.camera,lens:'telephoto' as const,depthOfField:'selective' as const}};
 const previousShot={cue:input.cue,shotSpec,styleDNA:baseline.request.styleSnapshot!};
 for(const patch of [{cue:{...input.cue,sceneId:'other'}},{cue:{...input.cue,character:'Jo'}},{cue:{...input.cue,sceneRevision:99}},{cue:{...input.cue,assetJobId:'other'}},{cue:{...input.cue,paragraphIndex:9}},{styleDNA:{...previousShot.styleDNA,cameraHints:['wide']}},{shotSpec:{...shotSpec,revision:99}},{shotSpec:{...shotSpec,output:{...shotSpec.output,orientation:'landscape'}}},{shotSpec:{...shotSpec,version:99}},{cue:{...input.cue,imageTemplate:{...input.cue.imageTemplate!,revision:99}}}]){
  expect(buildV2ImageRequest({...input,previousShot:{...previousShot,...patch}} as any).request.shotSpec).toEqual(baseline.request.shotSpec);
 }
 expect(buildV2ImageRequest({...input,previousShot,rebuild:{reframe:true}} as any).request.shotSpec).toEqual(buildV2ImageRequest({...input,rebuild:{reframe:true}}).request.shotSpec);
 expect(input.request).not.toHaveProperty('shotSpec');
});
