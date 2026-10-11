import { test, expect } from 'bun:test';
import { sharedStyleWarnings } from './image-styles.js';
import { normalizeConfig } from '../config.js';
const manga = normalizeConfig({}).imageTemplates.find(t => t.id === 'manga-page')!;
test('warns about contradictory Manga/photo or monochrome/color instructions', () => {
  expect(sharedStyleWarnings(manga, 'A natural photograph.', '', '')[0]).toMatch(/photograph/i);
  expect(sharedStyleWarnings(manga, 'A black-and-white manga illustration.', '', '').join(' ')).toMatch(/color/i);
});
test('omitted placeholders and literal shared macros are explained without rewriting prompts', () => {
  expect(sharedStyleWarnings({ ...manga, positive: '{{scene}}' }, 'photo', 'grain', '').join(' ')).toMatch(/not use.*style.*not use.*suffix/s);
  expect(sharedStyleWarnings(manga, '{{scene}}', '', '').join(' ')).toMatch(/literal/);
  expect(sharedStyleWarnings(manga, 'A hand-drawn anime illustration.', '', '')).toEqual([]);
});
