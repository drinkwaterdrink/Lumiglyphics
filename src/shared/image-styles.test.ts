import { test, expect } from 'bun:test';
import { BUILTIN_SHARED_STYLES, applySharedStyle } from './image-styles.js';
import { normalizeConfig } from '../config.js';
import { renderImageTemplate, templateSnapshot } from './image-templates.js';
test('shared styles contain the requested editable looks and no scene placeholders', () => {
  expect(BUILTIN_SHARED_STYLES.map(s => s.id)).toContain('builtin-style:phone-candid');
  expect(BUILTIN_SHARED_STYLES.map(s => s.id)).toContain('builtin-style:hunter-hand-drawn');
  for (const style of BUILTIN_SHARED_STYLES) {
    expect(style.positive + style.suffix).not.toMatch(/\{\{|1girl|solo|masterpiece|8K/);
    expect(style.description.length).toBeGreaterThan(10);
    expect(style.positive.length).toBeLessThan(220);
  }
});
test('style application restores three fields while legacy presets preserve the current suffix', () => {
  expect(applySharedStyle({ positive: 'ink', suffix: '', negative: '' }, 'keep')).toEqual({ promptPrefix: 'ink', promptSuffix: '', negativePrompt: '' });
  expect(applySharedStyle({ positive: 'ink', negative: 'blur' }, 'keep')).toEqual({ promptPrefix: 'ink', promptSuffix: 'keep', negativePrompt: 'blur' });
  const config = normalizeConfig({ promptPresets: [{ id: 'x', name: 'Mine', positive: 'ink', suffix: 'paper grain', negative: '' }] });
  expect(config.promptPresets[0]?.suffix).toBe('paper grain');
});
test('suffix is literal user text, placed only by its placeholder and never recursively expanded', () => {
  const template = templateSnapshot(normalizeConfig({}).imageTemplates[0]!);
  const values = { style: 'Photograph.', subjects: 'A fox', action: 'leaping', scene: 'courtyard', composition: '', lighting: '', suffix: 'Subtle grain. {{scene}}', negative: '' };
  expect(renderImageTemplate(template, values).prompt).toContain('Subtle grain. {{scene}}');
  expect(renderImageTemplate({ ...template, positive: '{{subjects}}' }, values).prompt).toBe('A fox');
});
