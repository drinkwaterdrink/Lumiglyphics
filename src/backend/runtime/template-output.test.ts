import { test, expect } from 'bun:test';
import { globalOutputParameters, templateOutputParameters, modelOutputParameters, assertModelOutputParameters, providerOutputParameters } from './template-output.js';
import { normalizeConfig } from '../../config.js';
import { templateSnapshot } from '../../shared/image-templates.js';
import { applyImageEdits, safeImageParameters } from './image-review.js';
const manga = () => templateSnapshot(normalizeConfig({}).imageTemplates.find(t => t.id === 'manga-page')!);
const anima = 'wavespeed-ai/anima/text-to-image';
const klein = 'blackforestlabs/flux-3/klein/base/text-to-image';

test('current Anima aliases get portrait tiers without matching unrelated animation or other providers', () => {
  for (const model of ['anima/text-to-image', 'anima/text-to-image-lora', ' WAVESPEED-AI/anima/text-to-image ']) {
    const parameters = globalOutputParameters('9:16', 'nanogpt', model, { size: '1.5k' });
    expect(modelOutputParameters('nanogpt', model, parameters)).toMatchObject({ size: '1.5k', aspectRatio: '9:16', rawRequestOverride: { aspect_ratio: '9:16' } });
  }
});

test('Anima chooses the nearest supported portrait ratio before review and validates later edits', () => {
  const original = { size: '854x1518', seed: 3 };
  expect(modelOutputParameters('nanogpt', 'anima/text-to-image', original)).toMatchObject({ size: '1k', aspectRatio: '9:16', seed: 3 });
  expect(original).toEqual({ size: '854x1518', seed: 3 });
  const prepared = modelOutputParameters('nanogpt', anima, { size: '864x1536' });
  expect(modelOutputParameters('nanogpt', anima, prepared)).toEqual(prepared);
  expect(() => assertModelOutputParameters('nanogpt', anima, { size: '1k', aspectRatio: '5:7' })).toThrow(/ratio/);
  expect(() => assertModelOutputParameters('nanogpt', anima, { rawRequestOverride: '{"size":"864x1536"}' })).toThrow(/1k or 1.5k/);
  expect(() => assertModelOutputParameters('nanogpt', anima, { rawRequestOverride: '{"size":"1.5k","aspect_ratio":"9:16"}' })).not.toThrow();
});

test('provider boundary serializes raw overrides for the native Lumiverse adapter without changing their meaning', () => {
  const prepared = modelOutputParameters('nanogpt', anima, { size: '864x1536' });
  const wire = providerOutputParameters(prepared);
  expect(typeof wire.rawRequestOverride).toBe('string');
  expect(JSON.parse(wire.rawRequestOverride as string)).toEqual({ aspect_ratio: '9:16' });
  expect(wire._lumiglyphicsAnimaAspect).toBeUndefined();
  expect(prepared.rawRequestOverride).toEqual({ aspect_ratio: '9:16' });
  const raw = '{"size":"1536x1536"}';
  expect(providerOutputParameters({ rawRequestOverride: raw }).rawRequestOverride).toBe(raw);
  expect(providerOutputParameters({ rawRequestOverride: { size: '1536x1536' } }).rawRequestOverride).toBe(raw);
});

test('Klein uses a supported square before review instead of unsupported portrait pixels', () => {
  expect(modelOutputParameters('nanogpt', klein, { size: '864x1536', seed: 7 })).toEqual({ size: '1024x1024', seed: 7 });
  expect(globalOutputParameters('9:16', 'nanogpt', klein, { size: '1536x1536', seed: 7 })).toEqual({ size: '1536x1536', seed: 7 });
  expect(globalOutputParameters('9:16', 'nanogpt', klein, {})).toEqual({ size: '1024x1024' });
  for (const size of ['768x768', '1024x1024', '1536x1536', '2048x2048', '4096x4096']) {
    expect(modelOutputParameters('nanogpt', klein, { size })).toEqual({ size });
    expect(() => assertModelOutputParameters('nanogpt', klein, { size })).not.toThrow();
  }
  expect(modelOutputParameters('nanogpt', 'flux-2-klein-4b', { size: '864x1536' })).toEqual({ size: '864x1536' });
  expect(modelOutputParameters('openrouter', klein, { size: '864x1536' })).toEqual({ size: '864x1536' });
});

test('Klein manual edits and custom raw shapes fail locally instead of being silently adjusted', () => {
  expect(() => assertModelOutputParameters('nanogpt', klein, { size: '864x1536' })).toThrow(/square/);
  const custom = { size: '1024x1024', rawRequestOverride: { size: '864x1536' } };
  expect(modelOutputParameters('nanogpt', klein, custom)).toEqual(custom);
  expect(() => assertModelOutputParameters('nanogpt', klein, custom)).toThrow(/square/);
  expect(() => assertModelOutputParameters('nanogpt', klein, { size: '1024x1024', rawRequestOverride: '{"size":"864x1536"}' })).toThrow(/square/);
  expect(() => assertModelOutputParameters('nanogpt', klein, { rawRequestOverride: '{"size":"1536x1536"}' })).not.toThrow();
  expect(() => assertModelOutputParameters('nanogpt', klein, { size: '1024x1024', rawRequestOverride: { resolution: '1536x1536', size: '864x1536' } })).toThrow(/square/);
  expect(() => assertModelOutputParameters('nanogpt', klein, { size: '864x1536', rawRequestOverride: { resolution: '1536x1536' } })).toThrow(/square/);
});

test('Anima validates both raw shape fields so one cannot mask an invalid size', () => {
  expect(() => assertModelOutputParameters('nanogpt', anima, { size: '1k', rawRequestOverride: { resolution: '1.5k', size: '864x1536' } })).toThrow(/1k or 1.5k/);
  expect(() => assertModelOutputParameters('nanogpt', anima, { size: '1k', aspectRatio: '9:16', rawRequestOverride: { aspect_ratio: null } })).toThrow(/ratio/);
});

test('an explicit null raw size cannot fall back to the valid visible size', () => {
  for (const [model, size] of [[klein, '1024x1024'], [anima, '1k']]) {
    expect(() => assertModelOutputParameters('nanogpt', model, { size, rawRequestOverride: { size: null } })).toThrow();
    expect(() => assertModelOutputParameters('nanogpt', model, { size, rawRequestOverride: '{"size":null}' })).toThrow();
  }
});
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
  const parameters = { size: '1024x1024', rawRequestOverride: { size: '1.5k', aspect_ratio: '3:4' } };
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

test('global shape overrides merged template dimensions while preserving other parameters', () => {
  expect(globalOutputParameters('9:16', 'nanogpt', 'flux', { size: '1024x1024', seed: 4 })).toEqual({ size: '864x1536', seed: 4 });
  expect(globalOutputParameters('16:9', 'openrouter', '', { aspectRatio: '9:16', imageSize: '2K' })).toEqual({ aspectRatio: '16:9', imageSize: '2K' });
  expect(globalOutputParameters('9:16', 'novelai', '', { resolution: '1216x832' })).toEqual({ resolution: '576x1024' });
});
test('default preserves parameters and fixed shape rejects unsupported adapters and raw overrides', () => {
  expect(globalOutputParameters('default', 'comfyui', '', { workflow: 'x' })).toEqual({ workflow: 'x' });
  expect(() => globalOutputParameters('9:16', 'comfyui', '', {})).toThrow(/workflow/);
  expect(() => globalOutputParameters('9:16', 'nanogpt', '', { rawRequestOverride: {} })).toThrow(/raw/);
  expect(globalOutputParameters('9:16', 'nanogpt', anima, {size:'1.5k'})).toMatchObject({size:'1.5k',aspectRatio:'9:16'});
});
