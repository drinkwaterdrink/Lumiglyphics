import type {VisualNovelConfig} from '../../config.js';
import type {VisualCue} from '../../shared/contracts.js';
import type {VisualBrief,ImagePromptMetadata} from '../../shared/image-templates.js';
import type {ImagePromptProfileV2} from '../../shared/image-prompt-profile-v2.js';
import {resolveStyleDNA,type StyleDNA} from '../../shared/style-dna.js';
import {ImageShotSpecSchema,type ImageShotSpec} from '../../shared/image-shot-spec.js';
import {resolveImageOutputPlan} from './image-output-plan.js';
import {resolveShotSpec,type ShotDirectorInput} from './shot-director.js';
import {resolveReferencePlan} from './reference-plan.js';
import {compileModelPrompt} from './model-prompt-compiler.js';
import type {ImageGenerationRequest,RebuildOptions} from './image-review.js';
import type {StoredPortrait} from './storage.js';

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
 planParameters?:Record<string,unknown>|undefined;
 previousShotRevision?:number|undefined;
 /** Caller-owned snapshot for this exact picture, never selected by completion order. */
 previousShot?:{cue:VisualCue;shotSpec:ImageShotSpec;styleDNA:StyleDNA}|undefined;
 rebuild?:RebuildOptions|undefined;
 shadow:Pick<ImageGenerationRequest,'prompt'|'negativePrompt'>;
 referenceSummary:string;
}

function manualCameraOverrides(camera:RebuildOptions['manualCamera']):ShotDirectorInput['manualOverrides'] {
 if(!camera)return undefined;
 type Overrides=NonNullable<ShotDirectorInput['manualOverrides']>;
 return {
  ...(camera.shotSize?{shotSize:camera.shotSize as NonNullable<Overrides['shotSize']>}:{}),
  ...(camera.angle?{angle:camera.angle as NonNullable<Overrides['angle']>}:{}),
  ...(camera.lensFeel?{lens:camera.lensFeel as NonNullable<Overrides['lens']>}:{}),
  ...(camera.composition?{mode:camera.composition as NonNullable<Overrides['mode']>}:{}),
  ...(camera.depth?{depthOfField:camera.depth as NonNullable<Overrides['depthOfField']>}:{}),
  ...(camera.dialogueSafeArea==='always'?{safeArea:{edge:'bottom',fraction:0.25,reason:'dialogue-overlay'}}:{})
 };
}

/** Pure V2 assembly. Profile lookup, source ownership, review and dispatch stay with the caller. */
export function buildV2ImageRequest(input:V2ImageRequestInput):{request:ImageGenerationRequest;metadata:ImagePromptMetadata|undefined} {
 const {config,cue,profile,rebuild}=input;
 const request={...input.request,parameters:{...input.request.parameters}};
 const metadata=input.metadata?structuredClone(input.metadata):undefined;
 const outputPlan=resolveImageOutputPlan({capabilities:profile.outputCapabilities,parameters:input.planParameters??request.parameters,requestedRatio:config.imageOutputAspectRatio!=='default'?config.imageOutputAspectRatio:cue.imageTemplate?.outputAspectRatio==='9:16'?'9:16':undefined,resolutionPreference:config.imageResolutionPreference,source:profile.capabilitySource,modelId:request.model});
 const styleSnapshot=resolveStyleDNA(config,input.styleId);
 const overrides=manualCameraOverrides(rebuild?.manualCamera);
 const previous=input.previousShot;
 const parsedPrevious=previous?ImageShotSpecSchema.safeParse(previous.shotSpec):undefined;
 const samePicture=previous&&previous.cue.assetJobId===cue.assetJobId&&previous.cue.sceneId===cue.sceneId&&previous.cue.sceneRevision===cue.sceneRevision&&previous.cue.paragraphIndex===cue.paragraphIndex&&
  previous.cue.character===cue.character&&JSON.stringify(previous.cue.ensembleSubjects)===JSON.stringify(cue.ensembleSubjects)&&JSON.stringify(previous.cue.imageTemplate)===JSON.stringify(cue.imageTemplate);
 const continuity=parsedPrevious?.success&&samePicture&&!rebuild?.reframe&&cue.imageTemplate?.cameraPolicy!=='fixed'&&
  JSON.stringify(previous.styleDNA)===JSON.stringify(styleSnapshot.styleDNA)&&parsedPrevious.data.output.orientation===outputPlan.orientation&&parsedPrevious.data.output.actualRatio===outputPlan.actualRatio
  ?parsedPrevious.data:undefined;
 const shotSpec=resolveShotSpec({brief:input.brief,outputPlan,template:cue.imageTemplate,cue,styleDNA:styleSnapshot.styleDNA,dialogueSafeAreaSetting:rebuild?.manualCamera?.dialogueSafeArea??config.dialogueSafeArea,...(continuity?{previousShot:continuity}:{}),isDialogueOverlayTarget:!cue.visualSources?.includes('location art')&&!cue.visualSources?.includes('cast art'),revision:(input.previousShotRevision??0)+(rebuild?.reframe?1:0),...(overrides&&Object.keys(overrides).length?{manualOverrides:overrides}:{})});
 request.promptProfileV2=profile;request.outputPlan=outputPlan;request.shotSpec=shotSpec;request.styleSnapshot=styleSnapshot.styleDNA;
 request.parameters={...request.parameters,...outputPlan.parameters};
 if(cue.imageTemplate?.cameraPolicy!=='fixed'){
  const referencePlan=resolveReferencePlan({brief:input.metadata?.brief,cue,portraits:input.portraits});
  const compiled=compileModelPrompt({brief:input.brief,shotSpec,styleDNA:styleSnapshot.styleDNA,profile,outputPlan,referencePlan,detailLevel:rebuild?.fitToModel?'compact':config.imagePromptDetail,promptExpansionEnabled:profile.promptExpansion?.enabled,userBudgetOverride:rebuild?.fitToModel?Math.min(profile.softBudgets.standard[0],profile.hardMaxCharacters):config.imagePromptBudgetOverride?config.imagePromptBudget:null,cue});
  request.prompt=compiled.prompt;
  if(compiled.negativePrompt!==undefined)request.negativePrompt=compiled.negativePrompt;
  if(compiled.parameterHints)request.parameters={...request.parameters,...compiled.parameterHints};
  if(metadata){
   metadata.budgetSummary={complexity:compiled.budgetPlan.complexity,softRange:compiled.budgetPlan.softRange,hardLimit:compiled.budgetPlan.hardLimit,finalCharacters:request.prompt.length+(request.negativePrompt?.length??0)};
   metadata.promptLintWarnings=compiled.warnings;metadata.referenceSummary=input.referenceSummary;
   metadata.shadowPrompt={v1Prompt:input.shadow.prompt,...(input.shadow.negativePrompt!==undefined?{v1NegativePrompt:input.shadow.negativePrompt}:{}),v2Prompt:compiled.prompt,...(compiled.negativePrompt!==undefined?{v2NegativePrompt:compiled.negativePrompt}:{})};
  }
 }
 if(metadata){metadata.promptEngineVersion=2;metadata.promptDialect=profile.dialect;metadata.serializerRevision=profile.serializerRevision;metadata.outputPlan=outputPlan;metadata.shotSpec=shotSpec;metadata.styleSnapshot=styleSnapshot.styleDNA;}
 return {request,metadata};
}
