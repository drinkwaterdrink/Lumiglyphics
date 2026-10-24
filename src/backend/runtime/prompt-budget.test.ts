import {expect,test} from 'bun:test';
import {rewriteBudgetPlan} from './prompt-budget.js';
import {resolveImagePromptProfile} from '../../shared/image-prompt-profile.js';

test('allocates real identity characters before scene priorities, negatives and supporting detail',()=>{
 const profile=resolveImagePromptProfile('nanogpt','z-image-turbo');
 const plan=rewriteBudgetPlan(profile,700,500);
 expect(plan.identityCharacters).toBe(700);
 expect(plan.scenePriorityCharacters).toBe(240);
 expect(plan.negativeTargetCharacters).toBe(0);
 expect(plan.identityCharacters+plan.scenePriorityCharacters+plan.negativeTargetCharacters+plan.supportingDetailCharacters).toBe(plan.targetCombinedCharacters);
 expect(plan.positiveBeyondIdentityCharacters).toBe(plan.targetCombinedCharacters-700);
});
test('native negatives get a small adaptive allowance, never a required filler quota',()=>{
 const profile=resolveImagePromptProfile('nanogpt','unknown');
 expect(rewriteBudgetPlan(profile,100,800).negativeTargetCharacters).toBe(200);
 expect(rewriteBudgetPlan(profile,100,15).negativeTargetCharacters).toBe(15);
 expect(rewriteBudgetPlan(profile,100,0).negativeTargetCharacters).toBe(0);
});
test('tight ensembles spend remaining space on scene before negatives or decorative detail',()=>{
 const profile=resolveImagePromptProfile('nanogpt','unknown',{imagePromptBudgetOverride:true,imagePromptBudget:1000});
 const plan=rewriteBudgetPlan(profile,850,500);
 expect(plan.targetCombinedCharacters).toBeLessThanOrEqual(980);
 expect(plan.scenePriorityCharacters).toBe(130);
 expect(plan.negativeTargetCharacters).toBe(0);
 expect(plan.supportingDetailCharacters).toBe(0);
 expect(plan.minimumSceneCharacters).toBe(60);
});
test('safety headroom yields to a feasible identity and scene rather than creating a false conflict',()=>{
 const profile=resolveImagePromptProfile('nanogpt','unknown');
 const plan=rewriteBudgetPlan(profile,2900,200);
 expect(plan.feasible).toBe(true);
 expect(plan.targetCombinedCharacters).toBe(3000);
 expect(plan.scenePriorityCharacters).toBe(100);
 expect(plan.negativeTargetCharacters).toBe(0);
});
test('impossible budgets are marked before writing; accounting stays bounded at every supported ceiling',()=>{
 for(const max of [256,1000,1200,3000,8000,50000]){
  const profile=resolveImagePromptProfile('nanogpt','unknown',{imagePromptBudgetOverride:true,imagePromptBudget:max});
  for(const identity of [0,Math.floor(max*.5),max-1,max+500]){
   const plan=rewriteBudgetPlan(profile,identity,500);
   expect(plan.scenePriorityCharacters).toBeGreaterThanOrEqual(0);
   expect(plan.negativeTargetCharacters).toBeGreaterThanOrEqual(0);
   expect(plan.supportingDetailCharacters).toBeGreaterThanOrEqual(0);
   if(plan.feasible){
    expect(plan.targetCombinedCharacters).toBeLessThanOrEqual(plan.generatedLimit);
    expect(plan.scenePriorityCharacters).toBeGreaterThanOrEqual(plan.minimumSceneCharacters);
    expect(identity+plan.scenePriorityCharacters+plan.negativeTargetCharacters+plan.supportingDetailCharacters).toBe(plan.targetCombinedCharacters);
   }else expect(identity+plan.minimumSceneCharacters).toBeGreaterThan(plan.generatedLimit);
  }
 }
});
