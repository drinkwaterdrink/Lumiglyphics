import {compileModelPrompt} from '../../model-prompt-compiler.js';
import {resolveImagePromptProfileV2,PromptDialectIdSchema} from '../../../../shared/image-prompt-profile-v2.js';
import {resolveImageOutputPlan} from '../../image-output-plan.js';
import {resolveShotSpec} from '../../shot-director.js';
import {createReferencePlan} from '../../../../shared/reference-plan.js';
import type {VisualBrief} from '../../../../shared/image-templates.js';
/** Fixed fictional inputs. No providers, clocks, random seeds or network calls. */
export function goldenOutputs(){const outputs:Record<string,{prompt:string;negativePrompt:string;warnings:string[]}>={};
for(const dialect of PromptDialectIdSchema.options)for(const scenario of ['solo','ensemble','environment','long'] as const){
 const profile={...resolveImagePromptProfileV2('fixture','fixture-model'),dialect,negativePolicy:'native' as const,hardMaxCharacters:scenario==='long'?1800:65000};
 const brief:VisualBrief={scene:scenario==='long'?'Rainy library, brass lamps, red curtains. '.repeat(180):'Rainy library with brass lamps and red curtains',subjects:scenario==='environment'?'':scenario==='ensemble'?'Mira: silver hair, violet eyes, green coat\nJo: black curls, amber eyes, blue jacket':'Mira: silver hair, violet eyes, green coat',action:scenario==='environment'?'an open book resting on an empty desk':'reading an open book beside the window',composition:'eye level, lower dialogue area clear',lighting:'warm lamplight against cool rain',subjectMode:scenario==='environment'?'none':scenario==='ensemble'?'ensemble':'one',framing:scenario==='ensemble'||scenario==='environment'?'wide':'portrait',referencePolicy:scenario==='solo'?'character':'none',sources:['scene context'],conflicts:[]};
 if(scenario==='solo'||scenario==='long')brief.subjectPreparation={name:'Mira',identity:'silver hair, violet eyes',identitySource:'saved appearance',attire:'green coat',attireSource:'picture cue',direction:'reading',shortened:false,subjectsInPositive:true,subjectsInNegative:false};
 const outputPlan=resolveImageOutputPlan({modelId:'fixture-model',requestedRatio:'9:16'}),styleDNA={medium:'watercolor illustration',palette:['muted green and brass'],avoidIntent:['watermark','blurry']};
 const shotSpec=resolveShotSpec({brief,outputPlan,styleDNA});
 const result=compileModelPrompt({brief,outputPlan,styleDNA,shotSpec,profile,referencePlan:createReferencePlan(scenario==='solo'?[{imageId:'reference-mira',role:'identity',subject:'Mira',label:'Mira reference'}]:[])});
 outputs[`${dialect}/${scenario}`]={prompt:result.prompt,negativePrompt:result.negativePrompt??'',warnings:result.warnings};
}return outputs;}
