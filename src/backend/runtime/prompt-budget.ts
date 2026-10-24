import {promptBudgetTargets,type ImagePromptProfile} from '../../shared/image-prompt-profile.js';

/** Character allocations for writer guidance, not semantic validation or quotas.
 * Exact cast blocks are counted after expansion. Scene space is allocated before
 * negatives and supporting detail; sparse evidence must still stay sparse. */
export function rewriteBudgetPlan(profile:ImagePromptProfile,identityCharacters:number,negativeCharacters:number,target?:number){
 const maximum=profile.maxCharacters;
 const minimumSceneCharacters=Math.min(100,Math.floor(maximum*.06));
 // Headroom helps the writer, but must not become a stricter provider ceiling.
 const generatedLimit=Math.min(maximum,Math.max(maximum-Math.min(50,Math.floor(maximum*.02)),identityCharacters+minimumSceneCharacters));
 const desiredSceneCharacters=Math.min(360,Math.floor(maximum*.2));
 const negativeHint=profile.negativeMode==='positive-only'?0:Math.min(negativeCharacters,200,Math.floor(maximum*.08));
 const feasible=identityCharacters+minimumSceneCharacters<=maximum;
 const preferred=target??Math.max(promptBudgetTargets(profile).high,identityCharacters+desiredSceneCharacters+negativeHint);
 const targetCombinedCharacters=Math.min(generatedLimit,Math.max(preferred,identityCharacters+minimumSceneCharacters));
 let remaining=Math.max(0,targetCombinedCharacters-identityCharacters);
 const scenePriorityCharacters=Math.min(desiredSceneCharacters,remaining);remaining-=scenePriorityCharacters;
 const negativeTargetCharacters=Math.min(negativeHint,remaining);remaining-=negativeTargetCharacters;
 return {targetCombinedCharacters,generatedLimit,identityCharacters,minimumSceneCharacters,scenePriorityCharacters,
  negativeTargetCharacters,supportingDetailCharacters:remaining,
  positiveBeyondIdentityCharacters:Math.max(0,targetCombinedCharacters-identityCharacters-negativeTargetCharacters),feasible};
}
