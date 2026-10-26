import {describe,expect,test} from 'bun:test';
import {APERTURE_CSS} from './aperture-css.js';
import {READER_SHELL_CSS} from './reader-shell-css.js';

describe('APERTURE reader presentation',()=>{
 test('keeps the embedded speech dock in the compact voice card, not reader-wide geometry',()=>{
  expect(READER_SHELL_CSS).toContain('[data-vn-speech-dock]:not([data-vn-speech-embedded])');
  expect(READER_SHELL_CSS).not.toContain('[data-vn-reader-first="true"] [data-vn-speech-dock] {');
 });
 test('keeps scene chips and duplicate paragraph controls out of the artwork-led reader',()=>{
  expect(APERTURE_CSS).toMatch(/\[data-vn-scene-hud\]\s*\{\s*display:none !important;/);
  expect(APERTURE_CSS).toContain('[data-vn-control="previous"]');
  expect(APERTURE_CSS).toContain('[data-vn-control="log"]');
  expect(APERTURE_CSS).toContain('[data-vn-references]');
 });
 test('restores the drawn host-exit chevron at compact widths',()=>{
  expect(READER_SHELL_CSS).toMatch(/\[data-vn-reader-header\] \[data-vn-exit\]::before \{ display:block;/);
 });
});
