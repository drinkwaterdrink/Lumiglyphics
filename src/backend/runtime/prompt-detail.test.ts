import {expect,test} from 'bun:test';
import {normalizeConfig} from '../../config.js';
import {imageDetailGuidance,imageDirectionBudgets} from './prompt-detail.js';
import {resolveImagePromptProfile,promptBudgetTargets} from '../../shared/image-prompt-profile.js';
test('detail guidance budgets combined output and grounds expansion',()=>{
 const guidance=imageDetailGuidance(normalizeConfig({}));
 expect(guidance).toContain('2,750–2,900');expect(guidance).toContain('positive + negative');expect(guidance).toContain('not tokens');
 expect(guidance).toContain('never invent');expect(guidance).toContain('visualDescription');
 expect(guidance).toContain('no padding');
});
test('large shared styles reduce the direction budget and manga reserves its scaffold',()=>{
 const plain=imageDetailGuidance(normalizeConfig({}));
 const large=imageDetailGuidance(normalizeConfig({promptPrefix:'x'.repeat(1800)}));
 const manga=imageDetailGuidance(normalizeConfig({defaultImageTemplateId:'manga-page'}));
 expect(large).not.toBe(plain);expect(large).toContain('Shared style');expect(manga).toContain('manga-page');
});
test('small-model planning leaves scene direction space instead of spending a fixed ensemble guess',()=>{
 const config=normalizeConfig({defaultImageTemplateId:'ensemble'});
 const profile=resolveImagePromptProfile('nanogpt','z-image-turbo');
 const [budget]=imageDirectionBudgets(config,profile);
 expect(budget).toBeDefined();
 expect(budget!.templateId).toBe('ensemble');
 expect(budget!.sceneDirectionBudget).toBeGreaterThan(0);
 expect(budget!.identityReservation).toBeLessThan(1800);
 expect(budget!.sharedAndTemplateCharacters+budget!.identityReservation+budget!.sceneDirectionBudget).toBe(promptBudgetTargets(profile).high);
});
test('fixed wording that exhausts a target has no fabricated negative remaining budget',()=>{
 const config=normalizeConfig({promptPrefix:'x'.repeat(4000)});
 const [budget]=imageDirectionBudgets(config,resolveImagePromptProfile('nanogpt','z-image-turbo'));
 expect(budget!.sceneDirectionBudget).toBe(0);
 expect(budget!.identityReservation).toBe(0);
});
