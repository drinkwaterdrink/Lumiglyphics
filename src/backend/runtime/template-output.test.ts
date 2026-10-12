import { test, expect } from 'bun:test';
import { templateOutputParameters, modelOutputParameters, assertModelOutputParameters } from './template-output.js';
import { normalizeConfig } from '../../config.js';
import { templateSnapshot } from '../../shared/image-templates.js';
import { applyImageEdits, safeImageParameters } from './image-review.js';
const manga = () => templateSnapshot(normalizeConfig({}).imageTemplates.find(t => t.id === 'manga-page')!);
const anima = 'wavespeed-ai/anima/text-to-image';
test('Anima uses supported resolution tiers and carries portrait framing separately', () => {
  expect(modelOutputParameters('nanogpt', anima, { size: '864x1536' })).toEqual({ size: '1k', aspectRatio: '9:16', rawRequestOverride: { aspect_ratio: '9:16' }, _lumiglyphicsAnimaAspect: true });
  expect(modelOutputParameters('nanogpt', anima, { size: '1.5k', seed: 2 })).toEqual({ size: '1.5k', seed: 2 });
  expect(modelOutputParameters('nanogpt', anima, { size: '1.5k', aspectRatio: '9:16' })).toEqual({ size: '1.5k', aspectRatio: '9:16', rawRequestOverride: { aspect_ratio: '9:16' }, _lumiglyphicsAnimaAspect: true });
  expect(modelOutputParameters('nanogpt', anima, {})).toEqual({ size: '1k' });
  expect(modelOutputParameters('nanogpt', 'animation-model', { size: '864x1536' })).toEqual({ size: '864x1536' });
  expect(modelOutputParameters('openrouter', anima, { size: '864x1536' })).toEqual({ size: '864x1536' });
});
test('visible Anima aspect edits update only generated overrides', () => {
  const parameters = modelOutputParameters('nanogpt', anima, { size: '864x1536' });
  expect(safeImageParameters(parameters)).toEqual({ size: '1k', aspectRatio: '9:16' });
  const edited = applyImageEdits({ prompt: 'scene', model: anima, parameters }, { parameters: { size: '1.5k', aspectRatio: '1:1' } });
  expect(edited.parameters?.rawRequestOverride).toEqual({ aspect_ratio: '1:1' });
  expect(edited.parameters?.size).toBe('1.5k');
  const custom = applyImageEdits({ prompt: 'scene', parameters: { rawRequestOverride: { aspect_ratio: '3:4' } } }, { parameters: { aspectRatio: '1:1' } });
  expect(custom.parameters?.rawRequestOverride).toEqual({ aspect_ratio: '3:4' });
  expect(() => applyImageEdits({ prompt: 'scene' }, { parameters: { _lumiglyphicsAnimaAspect: true } })).toThrow();
});
test('Anima raw overrides remain authoritative and invalid reviewed resolutions fail locally', () => {
  const parameters = { size: '1024x1024', rawRequestOverride: { resolution: '1.5k', aspect_ratio: '3:4' } };
  expect(modelOutputParameters('nanogpt', anima, parameters)).toEqual(parameters);
  expect(() => assertModelOutputParameters('nanogpt', anima, parameters)).not.toThrow();
  expect(() => assertModelOutputParameters('nanogpt', anima, { size: '864x1536' })).toThrow(/1k or 1.5k/);
  expect(() => assertModelOutputParameters('nanogpt', anima, { size: '1k', rawRequestOverride: { resolution: '2k' } })).toThrow(/1k or 1.5k/);
});
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
