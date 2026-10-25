/** APERTURE's focused reader layer. Loaded after the selected preset and before user CSS. */
export const APERTURE_CSS = `
[data-vn-root][data-vn-aperture="true"] {
  --vn-accent: #587c73;
  --vn-accent-contrast: #fbfaf5;
  --vn-text: #26322f;
  --vn-muted-text: #5e6c67;
  --vn-dialogue-bg: rgba(248, 247, 240, .94);
  --vn-dialogue-border: rgba(76, 105, 95, .3);
  --vn-dialogue-width: min(72rem, calc(100 * var(--vn-vw, 1vw) - 2rem));
  --vn-font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --vn-dialogue-font-size: clamp(1rem, 1.05 * var(--vn-vw, 1vw) + .72rem, 1.28rem);
  --vn-chrome-bg: rgba(250, 249, 244, .92);
  --vn-chrome-border: rgba(75, 103, 93, .28);
  --vn-chrome-hover: rgba(83, 122, 108, .1);
  --vn-chrome-text: #344a43;
  --vn-panel-bg: rgba(248, 247, 240, .95);
  --vn-panel-solid: #f8f7f0;
  --vn-panel-border: rgba(75, 103, 93, .28);
  --vn-focus-ring: #32715d;
}
[data-vn-root][data-vn-aperture="true"][data-vn-aperture-appearance="dark"] {
  --vn-accent: #9ac2ae;
  --vn-accent-contrast: #14201c;
  --vn-text: #edf2ed;
  --vn-muted-text: #b5c2ba;
  --vn-dialogue-bg: rgba(25, 34, 31, .94);
  --vn-dialogue-border: rgba(159, 194, 174, .3);
  --vn-chrome-bg: rgba(27, 37, 33, .94);
  --vn-chrome-border: rgba(159, 194, 174, .28);
  --vn-chrome-hover: rgba(159, 194, 174, .12);
  --vn-chrome-text: #c6dfd0;
  --vn-panel-bg: rgba(25, 34, 31, .96);
  --vn-panel-solid: #19221f;
  --vn-panel-border: rgba(159, 194, 174, .28);
  --vn-focus-ring: #b8dfc8;
}
[data-vn-root][data-vn-aperture="true"] [data-vn-dialogue] {
  border: 1px solid var(--vn-dialogue-border);
  border-radius: 1rem;
  color: var(--vn-text);
  box-shadow: 0 12px 34px rgba(15, 27, 22, .2), 0 1px 0 rgba(255,255,255,.3) inset;
  backdrop-filter: blur(18px) saturate(1.08);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-dialogue]::before {
  border-radius: inherit;
  background: var(--vn-dialogue-bg);
  opacity: var(--vn-sheet-opacity) !important;
}
[data-vn-root][data-vn-aperture="true"] [data-vn-dialogue-text] { color: var(--vn-text); }
[data-vn-root][data-vn-aperture="true"] [data-vn-speaker] {
  color: var(--vn-text);
  background: var(--vn-panel-solid);
  border: 1px solid var(--vn-dialogue-border);
  border-radius: 999px;
}
[data-vn-root][data-vn-aperture="true"] [data-vn-controls] {
  border: 1px solid var(--vn-dialogue-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--vn-panel-solid) 86%, transparent);
  backdrop-filter: blur(12px);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-controls] [data-vn-control] {
  color: var(--vn-text);
  border-radius: 999px;
}
[data-vn-root][data-vn-aperture="true"] [data-vn-controls] [data-vn-control]:hover,
[data-vn-root][data-vn-aperture="true"] [data-vn-controls] [data-vn-control]:focus-visible {
  background: var(--vn-chrome-hover);
  color: var(--vn-accent);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-continue] {
  border-color: var(--vn-dialogue-border);
  background: var(--vn-panel-solid);
  color: var(--vn-text);
  box-shadow: 0 3px 12px rgba(15, 27, 22, .16);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-continue]:hover { border-color: var(--vn-accent); color: var(--vn-accent); }
[data-vn-root][data-vn-aperture="true"] [data-vn-sheet-tools] button,
[data-vn-root][data-vn-aperture="true"] [data-vn-hide-text] { color: var(--vn-text); }
[data-vn-root][data-vn-aperture="true"] [data-vn-choice],
[data-vn-root][data-vn-aperture="true"] [data-vn-input] {
  border-color: var(--vn-dialogue-border);
  background: var(--vn-panel-solid);
  color: var(--vn-text);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-submit] {
  border-color: var(--vn-accent);
  background: var(--vn-accent);
  color: var(--vn-accent-contrast);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-backlog] {
  background: var(--vn-panel-solid);
  color: var(--vn-text);
  border-color: var(--vn-panel-border);
}
[data-vn-root][data-vn-aperture="true"] [data-vn-scene] { inset: 0; bottom: 0; }
[data-vn-root][data-vn-aperture="true"][data-vn-adjustable-sheet="true"] [data-vn-narrative],
[data-vn-root][data-vn-aperture="true"][data-vn-adjustable-sheet="true"] [data-vn-interaction] {
  bottom: calc(4.35rem + env(safe-area-inset-bottom) + var(--vn-sheet-keyboard-inset, 0px));
}
[data-vn-root][data-vn-aperture="true"][data-vn-adjustable-sheet="true"] [data-vn-narrative] { height: calc(var(--vn-sheet-height) + 3rem); }
[data-vn-root][data-vn-aperture="true"][data-vn-reader-layout="image-first"] [data-vn-scene] { bottom: 0; }
[data-vn-root][data-vn-aperture="true"][data-vn-adjustable-sheet="true"] [data-vn-show-text] {
  bottom: calc(4.7rem + env(safe-area-inset-bottom) + var(--vn-sheet-keyboard-inset, 0px));
}
[data-vn-root][data-vn-aperture="true"] [data-vn-dialogue] { max-height: calc(100dvh - 7rem - env(safe-area-inset-top)); }
@media (prefers-reduced-motion: reduce) {
  [data-vn-root][data-vn-aperture="true"] *,
  [data-vn-root][data-vn-aperture="true"] *::before,
  [data-vn-root][data-vn-aperture="true"] *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
`;
