import type {VisualNovelConfig} from '../../config.js';
import type {VisualCue} from '../../shared/contracts.js';
import type {VisualBrief,ImagePromptMetadata} from '../../shared/image-templates.js';
import type {ImagePromptProfileV2} from '../../shared/image-prompt-profile-v2.js';
import {resolveStyleDNA,type StyleDNA} from '../../shared/style-dna.js';
import {ImageShotSpecSchema,type ImageShotSpec} from '../../shared/image-shot-spec.js';
import {resolveImageOutputPlan} from './image-output-plan.js';
import {resolveShotSpec,type ShotDirectorInput} from './shot-director.js';
import {createReferencePlan, resolveReferencePlan} from './reference-plan.js';
import {compileModelPrompt} from './model-prompt-compiler.js';
import type {ImageGenerationRequest,RebuildOptions} from './image-review.js';
import type {StoredPortrait} from './storage.js';
import type {CharacterDNA, CharacterDNALibrary} from '../../shared/character-dna.js';

export interface V2ImageRequestInput {
 config:VisualNovelConfig;
 cue:VisualCue;
 brief:VisualBrief;
 request:ImageGenerationRequest;
 profile:ImagePromptProfileV2;
 metadata?:ImagePromptMetadata|undefined;
 /** Intentionally explicit: initial selection and template/style rebuild have different precedence. */
 styleId:string|null|undefined;
 portraits?:Record<string,StoredPortrait|undefined>|undefined;
 characterDNALibrary?:CharacterDNALibrary|Record<string,CharacterDNA>|undefined;
 planParameters?:Record<string,unknown>|undefined;
 previousShotRevision?:number|undefined;
 /** Caller-owned snapshot for this exact picture, never selected by completion order. */
 previousShot?:{cue:VisualCue;shotSpec:ImageShotSpec;styleDNA:StyleDNA}|undefined;
 /** Earlier beat snapshot in the same scene for cross-beat camera choreography continuity. */
 previousSceneShot?:{cue:VisualCue;shotSpec:ImageShotSpec;styleDNA:StyleDNA}|undefined;
 shotTransitionMode?:'same-picture'|'cross-beat'|'reframe'|undefined;
 rebuild?:RebuildOptions|undefined;
 shadow:Pick<ImageGenerationRequest,'prompt'|'negativePrompt'>;
 referenceSummary:string;
}

function manualCameraOverrides(camera:RebuildOptions['manualCamera']):ShotDirectorInput['manualOverrides'] {
 if(!camera)return undefined;
 type Overrides=NonNullable<ShotDirectorInput['manualOverrides']>;
 const focalPoint=camera.focalPoint&&Number.isFinite(camera.focalPoint.x)&&Number.isFinite(camera.focalPoint.y)
  ?{x:Math.max(0,Math.min(100,Math.round(camera.focalPoint.x))),y:Math.max(0,Math.min(100,Math.round(camera.focalPoint.y)))}
  :undefined;
 return {
  ...(camera.shotSize?{shotSize:camera.shotSize as NonNullable<Overrides['shotSize']>}:{}),
  ...(camera.angle?{angle:camera.angle as NonNullable<Overrides['angle']>}:{}),
  ...(camera.lensFeel?{lens:camera.lensFeel as NonNullable<Overrides['lens']>}:{}),
  ...(camera.composition?{mode:camera.composition as NonNullable<Overrides['mode']>}:{}),
  ...(camera.depth?{depthOfField:camera.depth as NonNullable<Overrides['depthOfField']>}:{}),
  ...(camera.dialogueSafeArea==='always'?{safeArea:{edge:'bottom',fraction:0.25,reason:'dialogue-overlay'}}:{}),
  ...(focalPoint?{focalPoint}:{})
 };
}

/** Pure V2 assembly. Profile lookup, source ownership, review and dispatch stay with the caller. */
export function buildV2ImageRequest(input:V2ImageRequestInput):{request:ImageGenerationRequest;metadata:ImagePromptMetadata|undefined;referencePlan?:ReturnType<typeof resolveReferencePlan>} {
 const {config,cue,profile,rebuild}=input;
 const request={...input.request,parameters:{...input.request.parameters}};
 const metadata=input.metadata?structuredClone(input.metadata):undefined;
 const outputPlan=resolveImageOutputPlan({capabilities:profile.outputCapabilities,parameters:input.planParameters??request.parameters,requestedRatio:config.imageOutputAspectRatio!=='default'?config.imageOutputAspectRatio:cue.imageTemplate?.outputAspectRatio==='9:16'?'9:16':undefined,resolutionPreference:config.imageResolutionPreference,source:profile.capabilitySource,modelId:request.model});
 const styleSnapshot=resolveStyleDNA(config,input.styleId);
 const effectiveStyleDNA:StyleDNA={...styleSnapshot.styleDNA};
 if(cue.imageTemplate&&!input.styleId&&cue.imageTemplate.positive.includes('{{style}}')&&!cue.imageTemplate.positive.includes('{{suffix}}')){
  delete effectiveStyleDNA.suffix;
 }
 const overrides=manualCameraOverrides(rebuild?.manualCamera);
 const previous=input.previousShot;
 const scenePrev=input.previousSceneShot;
 const parsedPrevious=previous?ImageShotSpecSchema.safeParse(previous.shotSpec):undefined;
 const parsedScenePrev=scenePrev?ImageShotSpecSchema.safeParse(scenePrev.shotSpec):undefined;
 const samePicture=previous&&previous.cue.assetJobId===cue.assetJobId&&previous.cue.sceneId===cue.sceneId&&previous.cue.sceneRevision===cue.sceneRevision&&previous.cue.paragraphIndex===cue.paragraphIndex&&
  previous.cue.character===cue.character&&JSON.stringify(previous.cue.ensembleSubjects)===JSON.stringify(cue.ensembleSubjects)&&JSON.stringify(previous.cue.imageTemplate)===JSON.stringify(cue.imageTemplate);
 const sameSceneBeat=Boolean(!samePicture&&scenePrev&&scenePrev.cue.sceneId===cue.sceneId&&scenePrev.cue.sceneRevision===cue.sceneRevision);
 const shotTransitionMode:'same-picture'|'cross-beat'|'reframe'=input.shotTransitionMode??(samePicture?'same-picture':sameSceneBeat?'cross-beat':'same-picture');
 const prevSource=samePicture?previous:sameSceneBeat?scenePrev:(input.shotTransitionMode==='reframe'?previous:undefined);
 const prevParsed=samePicture?parsedPrevious:sameSceneBeat?parsedScenePrev:(input.shotTransitionMode==='reframe'?parsedPrevious:undefined);
 const continuity=prevParsed?.success&&prevSource&&(!rebuild?.reframe||input.shotTransitionMode==='reframe')&&cue.imageTemplate?.cameraPolicy!=='fixed'&&
  JSON.stringify(prevSource.styleDNA)===JSON.stringify(styleSnapshot.styleDNA)&&prevParsed.data.output.orientation===outputPlan.orientation&&prevParsed.data.output.actualRatio===outputPlan.actualRatio
  ?prevParsed.data:undefined;
 const shotSpec=resolveShotSpec({brief:input.brief,outputPlan,template:cue.imageTemplate,cue,styleDNA:effectiveStyleDNA,dialogueSafeAreaSetting:rebuild?.manualCamera?.dialogueSafeArea??config.dialogueSafeArea,...(continuity?{previousShot:continuity,shotTransitionMode}:{}),isDialogueOverlayTarget:!cue.visualSources?.includes('location art')&&!cue.visualSources?.includes('cast art'),revision:(input.previousShotRevision??0)+(rebuild?.reframe?1:0),...(overrides&&Object.keys(overrides).length?{manualOverrides:overrides}:{})});
 request.promptProfileV2=profile;request.outputPlan=outputPlan;request.shotSpec=shotSpec;request.styleSnapshot=styleSnapshot.styleDNA;
 request.parameters={...request.parameters,...outputPlan.parameters};
 let builtReferencePlan: ReturnType<typeof resolveReferencePlan> | undefined;
 if(cue.imageTemplate?.cameraPolicy!=='fixed'||Boolean(rebuild?.manualCamera||rebuild?.fitToModel||input.styleId)){
  const isTextToImageModel=/\/text-to-image$/i.test(request.model??'');
  const referencePayloadSupported=!isTextToImageModel&&(profile.features.references===true||profile.dialect==='novelai'||['comfyui','swarmui'].some(p=>(profile.family??'').toLowerCase().includes(p)));
  const referencePlan=referencePayloadSupported?resolveReferencePlan({brief:input.metadata?.brief,cue,portraits:input.portraits,characterDNALibrary:input.characterDNALibrary}):createReferencePlan([]);
  builtReferencePlan=referencePlan;
  const compiled=compileModelPrompt({brief:input.brief,shotSpec,styleDNA:effectiveStyleDNA,profile,outputPlan,referencePlan,detailLevel:rebuild?.fitToModel?'compact':config.imagePromptDetail,promptExpansionEnabled:profile.promptExpansion?.enabled,userBudgetOverride:rebuild?.fitToModel?Math.min(profile.softBudgets.standard[0],profile.hardMaxCharacters):config.imagePromptBudgetOverride?config.imagePromptBudget:null,cue,modelId:request.model,denoiseStrength:typeof request.parameters?.strength==='number'?request.parameters.strength:typeof request.parameters?.denoise==='number'?request.parameters.denoise:undefined});
  request.prompt=compiled.prompt;
  if(compiled.negativePrompt!==undefined){
    request.negativePrompt=compiled.negativePrompt;
  }else if(profile.negativePolicy==='positive-only'||profile.dialect==='ideogram-v4'||profile.dialect==='flux3-klein'){
    delete request.negativePrompt;
    if(request.parameters){
      delete request.parameters.negativePrompt;
      delete request.parameters.negative_prompt;
      delete request.parameters.negative;
    }
  }
  if(compiled.parameterHints)request.parameters={...request.parameters,...compiled.parameterHints};
  if(config.spatialFrustumEnabled===false&&request.parameters&&'layout_boxes' in request.parameters){
   delete request.parameters.layout_boxes;
  }
  if(metadata){
   metadata.budgetSummary={complexity:compiled.budgetPlan.complexity,softRange:compiled.budgetPlan.softRange,hardLimit:compiled.budgetPlan.hardLimit,finalCharacters:request.prompt.length+(request.negativePrompt?.length??0)};
   metadata.promptLintWarnings=compiled.warnings;metadata.referenceSummary=input.referenceSummary;
   metadata.shadowPrompt={v1Prompt:input.shadow.prompt,...(input.shadow.negativePrompt!==undefined?{v1NegativePrompt:input.shadow.negativePrompt}:{}),v2Prompt:compiled.prompt,...(compiled.negativePrompt!==undefined?{v2NegativePrompt:compiled.negativePrompt}:{})};
  }
 }
 if(metadata){metadata.promptEngineVersion=2;metadata.promptDialect=profile.dialect;metadata.serializerRevision=profile.serializerRevision;metadata.outputPlan=outputPlan;metadata.shotSpec=shotSpec;metadata.styleSnapshot=styleSnapshot.styleDNA;}
 return {request,metadata,...(builtReferencePlan?{referencePlan:builtReferencePlan}:{})};
}
