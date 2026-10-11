import { test, expect } from 'bun:test';
import { templateOutputParameters } from './template-output.js';
import { normalizeConfig } from '../../config.js';
import { templateSnapshot } from '../../shared/image-templates.js';
const manga = () => templateSnapshot(normalizeConfig({}).imageTemplates.find(t => t.id === 'manga-page')!);
test('Manga requests portrait output through the actual Lumiverse provider fields', () => {
  expect(templateOutputParameters(manga(), 'openrouter', {}, { aspectRatio: '1:1', imageSize: '2K' })).toEqual({ aspectRatio: '9:16', imageSize: '2K' });
  expect(templateOutputParameters(manga(), 'nanogpt', {}, { size: '1024x1024' })).toEqual({ size: '864x1536' });
});
test('explicit dimensions and raw overrides win and unrelated providers remain untouched', () => {
  expect(templateOutputParameters(manga(), 'nanogpt', { size: '512x512' }, {})).toEqual({ size: '512x512' });
  expect(templateOutputParameters(manga(), 'openrouter', { aspectRatio: '4:3' }, {})).toEqual({ aspectRatio: '4:3' });
  expect(templateOutputParameters(manga(), 'openrouter', { rawRequestOverride: { image_config: { aspect_ratio: '3:4' } } }, {})).toEqual({ rawRequestOverride: { image_config: { aspect_ratio: '3:4' } } });
  expect(templateOutputParameters(manga(), 'comfyui', {}, { workflow: 'keep' })).toEqual({ workflow: 'keep' });
});
test('connection shape and old snapshots remain valid without applying portrait defaults', () => {
  expect(templateOutputParameters({ ...manga(), outputAspectRatio: 'connection' }, 'openrouter', {}, { aspectRatio: '1:1' })).toEqual({ aspectRatio: '1:1' });
  expect(templateOutputParameters(undefined, 'nanogpt', {}, { size: '1024x1024' })).toEqual({ size: '1024x1024' });
});
