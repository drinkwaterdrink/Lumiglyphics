import {expect,test} from 'bun:test';
import {normalizeConfig} from '../../config.js';
import {imageDetailGuidance} from './prompt-detail.js';
test('detail guidance budgets combined output and grounds expansion',()=>{
 const guidance=imageDetailGuidance(normalizeConfig({}));
 expect(guidance).toContain('2,500–2,800');expect(guidance).toContain('positive + negative');
 expect(guidance).toContain('never invent');expect(guidance).toContain('visualDescription');
 expect(guidance).toContain('no padding');
});
test('large shared styles reduce the direction budget and manga reserves its scaffold',()=>{
 const plain=imageDetailGuidance(normalizeConfig({}));
 const large=imageDetailGuidance(normalizeConfig({promptPrefix:'x'.repeat(1800)}));
 const manga=imageDetailGuidance(normalizeConfig({defaultImageTemplateId:'manga-page'}));
 expect(large).not.toBe(plain);expect(large).toContain('Shared style');expect(manga).toContain('manga-page');
});
