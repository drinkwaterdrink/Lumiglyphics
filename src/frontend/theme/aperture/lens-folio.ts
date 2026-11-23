/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_LENS_FOLIO = `/* =========================================================================
   WORLD LENS & CHARACTER FOLIO (Screens 2, 4, 5)
   ========================================================================= */

.world-sheet-map {
  margin-top: 12px;
  height: auto;
  min-height: 0;
  border-radius: 6px 6px 22px 22px;
  position: relative;
  overflow: visible;
  background: var(--vn-shell-field, #0f1e2e);
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14));
}

.world-map-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.world-map-svg path {
  fill: none;
  stroke: var(--vn-shell-accent, #2dd4bf);
  stroke-width: 1.2;
  stroke-dasharray: 3 5;
  opacity: 0.4;
}

.map-node-pill {
  position: absolute;
  min-width: 86px;
  max-width: 114px;
  padding: 6px 8px 5px;
  text-align: left;
  border-radius: 8px;
  background: var(--vn-shell-panel, rgba(15, 23, 42, 0.95));
  color: var(--vn-shell-text, #f0fdfa);
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.18));
  box-shadow: var(--vn-shell-shadow, 0 8px 22px rgba(0, 0, 0, 0.35));
  cursor: pointer;
  transition: transform 0.18s var(--ease), background 0.18s ease;
}

.map-node-pill.active {
  background: var(--vn-shell-accent, #2dd4bf);
  color: var(--vn-shell-accent-contrast, #0b1922);
  border-color: var(--vn-shell-accent, #2dd4bf);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35), 0 0 0 2px color-mix(in srgb, var(--vn-shell-accent, #2dd4bf) 35%, transparent);
  transform: translateY(-3px);
}

.map-node-pill b {
  display: block;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-node-pill small {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  opacity: 0.75;
}

/* Character Folio Hero (Screen 5) */
.folio-hero-card {
  height: 290px;
  position: relative;
  background: #3b464c;
  overflow: hidden;
  border-radius: 4px;
}

.folio-hero-card img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 18%;
  filter: saturate(0.65) contrast(1.06);
}

.folio-hero-card:after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 32%, rgba(7, 13, 18, 0.2) 55%, rgba(5, 13, 15, 0.88) 100%);
}

.folio-hero-label {
  position: absolute;
  z-index: 2;
  bottom: 26px;
  left: 18px;
  font-family: Georgia, serif;
  font-size: 38px;
  letter-spacing: -0.05em;
  color: #fff !important;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.8);
}

.folio-hero-sub {
  position: absolute;
  z-index: 2;
  left: 20px;
  bottom: 10px;
  font-size: 10px;
  color: #deebdb !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

/* 2-Column Verified Observations Grid */
.observations-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.2));
  margin-top: 10px;
}

.observation-cell {
  padding: 10px 6px 10px 0;
  border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.18));
  min-height: 56px;
}

.observation-cell:nth-child(even) {
  padding-left: 12px;
}

.observation-cell span {
  display: block;
  font-size: 10px;
  margin-bottom: 4px;
  opacity: 0.75;
}

.observation-cell strong {
  font-size: 12px;
  font-weight: 600;
  display: block;
  white-space: normal !important;
  word-break: break-word !important;
  overflow: visible !important;
  line-height: 1.45 !important;
}

.observation-cell em {
  font-size: 9px;
  font-style: normal;
  margin-left: 5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--vn-shell-accent, #dcebad) 18%, transparent);
  color: var(--vn-shell-accent, #dcebad);
  font-weight: 750;
}

.folio-quote-callout {
  border-left: 2px solid var(--vn-shell-accent, #b7d6ae);
  padding-left: 14px;
  color: var(--vn-shell-text, #e4ead9);
  font: italic 13.5px/1.5 Georgia, serif;
  margin: 16px 0;
}

/* =========================================================================
   RESPONSIVENESS & TOUCH TARGET POLISH (360px - 430px)
   ========================================================================= */

@media (max-width: 380px) {
  .reader-topbar {
    padding-left: 8px;
    padding-right: 8px;
    gap: 4px;
  }
  .round-ghost {
    width: 34px;
    height: 34px;
  }
  .reader-action-grid {
    grid-template-columns: minmax(28px, 0.6fr) repeat(4, minmax(34px, 1fr)) minmax(46px, 0.9fr);
    gap: 1px;
  }
  .reader-action-grid > .action span {
    font-size: 8px;
  }
  .route-bar .route-name {
    font-size: 9px;
  }
  .route-bar .route-actions .dock-settings {
    width: 44px;
  }
  .route-bar .route-actions .menu-key {
    min-width: 80px;
    padding: 0 7px;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Letter effects already pause through their own motion gate. Keep their
     original duration so per-letter delays retain the frozen rainbow hues. */
  *:not([data-vn-text-fx-ch]), *::before, *::after {
    animation-duration: 0.001ms !important;
  }
  *, *::before, *::after {
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
  .aperture-overlay {
    display: none !important;
    opacity: 0;
  }
  .aperture-overlay.open {
    display: block !important;
    opacity: 1;
    visibility: visible;
  }
}

/* =========================================================================
   APERTURE UNIFIED READER DIALOGUE & INTEGRATED BOTTOM NAVIGATION
   ========================================================================= */

/* =========================================================================
   APERTURE UNIFIED READER DIALOGUE & INTEGRATED CONTROLS
   ========================================================================= */

/* Symmetrical, perfectly centered dialogue card with 8px gap above bottom bar */
[data-vn-dialogue],
[data-vn-root] [data-vn-dialogue],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-dialogue],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue] {
  position: absolute !important;
  z-index: 30 !important;
  left: 10px !important;
  right: 10px !important;
  width: auto !important;
  max-width: none !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  top: auto !important;
  bottom: calc(66px + env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-inset, var(--vn-sheet-keyboard-inset, 0px))) !important;
  height: var(--caption-height, 184px);
  min-height: 76px;
  max-height: calc(100% - 130px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
  padding: 12px 16px 11px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  touch-action: pan-y !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  transition: box-shadow 0.4s ease, border-color 0.4s ease, opacity 0.24s ease, transform 0.24s ease !important;
}

:where([data-vn-root]) [data-vn-dialogue] {
  border: 1px solid color-mix(in srgb, var(--vn-scene-rim-tint, var(--aperture-accent, #c4b5fd)) 28%, var(--aperture-dialogue-border, var(--vn-dialogue-border, rgba(255, 255, 255, 0.16))));
  border-radius: min(var(--vn-shell-radius, 20px), 22px);
  background: var(--aperture-dialogue-bg, var(--vn-dialogue-bg, rgba(8, 14, 22, var(--caption-opacity, 0.84))));
  -webkit-backdrop-filter: blur(var(--caption-blur, 18px));
  backdrop-filter: blur(var(--caption-blur, 18px));
  box-shadow: var(--vn-dialogue-shadow, 0 18px 46px rgba(0, 0, 0, 0.45)), 0 4px 28px var(--vn-atmosphere-glow, rgba(0, 0, 0, 0.32)), inset 0 1px 0 color-mix(in srgb, var(--vn-scene-rim-tint, #ffffff) 32%, rgba(255, 255, 255, 0.22));
}

/* Draggable Top Resize Grip — narrow centered handle so it never blocks top-right Play/Hide tools */
.resize-grip,
[data-vn-sheet-handle] {
  position: absolute !important;
  top: -10px !important;
  left: 50% !important;
  right: auto !important;
  width: 68px !important;
  transform: translateX(-50%) !important;
  min-width: 68px;
  height: 22px;
  cursor: ns-resize !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 25 !important;
  touch-action: none !important;
}

.resize-grip span {
  display: block !important;
  width: 32px !important;
  height: 3px !important;
  border-radius: var(--vn-scrubber-radius, 999px) !important;
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 48%, transparent) !important;
}

/* Dialogue Header (Speaker Avatar, Speaker Name, Location Pin & Scene, Play/Hide Pill) */
.caption-head,
[data-vn-sheet-header] {
  position: relative !important;
  z-index: 38 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  min-height: 34px !important;
  touch-action: none !important;
  margin-top: 0 !important;
  margin-bottom: 2px !important;
  padding-bottom: 6px !important;
  border-bottom: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 14%, rgba(255, 255, 255, 0.08)) !important;
  flex: none !important;
}

.caption-head .speaker {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  white-space: nowrap !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

.speaker-avatar,
[data-vn-speaker-avatar] {
  position: relative !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  border-radius: 50% !important;
  overflow: visible !important;
  flex: none !important;
  display: inline-grid !important;
  place-items: center !important;
  cursor: pointer !important;
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 18%, var(--vn-shell-panel, rgba(15, 23, 42, 0.85))) !important;
  border: 1.5px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 68%, var(--vn-shell-border-strong, rgba(255, 255, 255, 0.45))) !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 34%, transparent) !important;
  color: var(--aperture-accent, #c4b5fd) !important;
  font-size: 13px !important;
  font-weight: 750 !important;
}

[data-vn-speaker-avatar]::after {
  content: "";
  position: absolute;
  inset: -6px;
}

[data-vn-speaker-avatar][data-resonance="warmth"] {
  border-color: #f472b6 !important;
  box-shadow: 0 0 14px rgba(244, 114, 182, 0.48) !important;
}
[data-vn-speaker-avatar][data-resonance="trust"] {
  border-color: #34d399 !important;
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.42) !important;
}
[data-vn-speaker-avatar][data-resonance="tension"] {
  border-color: #f87171 !important;
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.48) !important;
}

[data-vn-speaker-avatar][hidden] {
  display: none !important;
}

[data-vn-speaker-avatar] img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  object-position: center 20% !important;
  display: block !important;
}

.caption-head [data-vn-speaker] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
  color: var(--aperture-text, #f8fafc) !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
}

.caption-head .caption-split {
  display: inline-flex !important;
  align-items: center !important;
  color: color-mix(in srgb, var(--aperture-muted, #94a3b8) 85%, transparent) !important;
  margin-left: 3px !important;
  flex: none !important;
}

.caption-head [data-vn-caption-scene] {
  flex: 0 0 auto;
  min-width: 0;
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--aperture-muted, #9cb5a8) !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.caption-head .speaker:has([data-vn-speaker]:not([hidden])) [data-vn-caption-scene] {
  max-width: 45%;
}

.caption-head-actions,
[data-vn-sheet-tools],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-sheet-tools] {
  position: relative !important;
  z-index: 45 !important;
  pointer-events: auto !important;
  width: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 2px !important;
  margin-left: auto !important;
  padding: 2px 5px !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--aperture-button-bg, #131b26) 72%, rgba(255, 255, 255, 0.05)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, rgba(255, 255, 255, 0.14)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.caption-tool,
[data-vn-hide-text],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-sheet-tools] button,
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-hide-text] {
  position: relative !important;
  width: 30px;
  height: 26px;
  min-width: 30px;
  min-height: 26px;
  border-radius: 999px !important;
  border: 0 !important;
  background: transparent !important;
  color: var(--aperture-button-text, #edf3ea) !important;
  opacity: 0.86 !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
  cursor: pointer !important;
  transition: color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease !important;
}

.caption-tool::after,
[data-vn-hide-text]::after {
  content: "";
  position: absolute;
  inset: -10px -8px;
}

.caption-tool:hover,
[data-vn-hide-text]:hover,
.caption-tool[data-active="true"] {
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, transparent) !important;
  color: var(--aperture-accent, #c4b5fd) !important;
  opacity: 1 !important;
}

.caption-tool svg,
[data-vn-hide-text] svg {
  width: 14px !important;
  height: 14px !important;
}

/* Scrollable Copy */
.scroll-copy,
[data-vn-dialogue] .scroll-copy {
  position: relative !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y !important;
  overscroll-behavior: contain !important;
  scrollbar-width: thin !important;
  scrollbar-color: color-mix(in srgb, var(--aperture-accent, #dcebad) 45%, transparent) transparent !important;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 4px, #000 calc(100% - 8px), transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 4px, #000 calc(100% - 8px), transparent 100%);
  padding: 5px 4px 5px !important;
  margin: 0 !important;
}

/* Word-by-word TTS & Auto-Read highlight effect — single soft aura pill */
::highlight(vn-tts-word) {
  background-color: transparent;
  color: var(--aperture-tts-word-ink, #ffffff);
}

::highlight(vn-tts-spoken) {
  color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 24%, var(--aperture-text, #ffffff));
}

.vn-tts-word-aura,
[data-vn-tts-aura] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  pointer-events: none !important;
  z-index: 0 !important;
  border-radius: 5px !important;
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 17%, transparent) !important;
  border-bottom: 1.5px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 72%, transparent) !important;
  box-shadow: 0 1px 10px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, transparent) !important;
  transition: transform 72ms cubic-bezier(0.22, 1, 0.36, 1), width 72ms ease, height 72ms ease, opacity 120ms ease !important;
}

.vn-tts-word-aura[hidden] {
  display: none !important;
}

.caption-tool[data-action="caption-auto"][data-active="true"] {
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 26%, transparent) !important;
  color: var(--aperture-accent, #c4b5fd) !important;
  box-shadow: 0 0 12px var(--aperture-accent-glow, rgba(167, 139, 250, 0.48)) !important;
  opacity: 1 !important;
  animation: vn-auto-pulse 1.8s ease-in-out infinite !important;
}

@keyframes vn-auto-pulse {
  0%, 100% {
    box-shadow: 0 0 10px var(--aperture-accent-glow, rgba(167, 139, 250, 0.42));
  }
  50% {
    box-shadow: 0 0 18px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 65%, transparent);
  }
}

[data-vn-dialogue-text],
[data-vn-root] [data-vn-dialogue-text],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-dialogue-text],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue-text],
[data-vn-root]:not([data-vn-adjustable-sheet="true"]) [data-vn-dialogue-text] {
  position: relative !important;
  z-index: 1 !important;
  overflow: visible !important;
  overflow-y: visible !important;
  overscroll-behavior: auto !important;
  max-height: none !important;
  height: auto !important;
  flex: none !important;
  touch-action: pan-y !important;
  user-select: text !important;
  font-size: var(--reader-font, 16px) !important;
  line-height: 1.5;
  letter-spacing: 0.005em;
  word-spacing: normal;
  font-kerning: normal;
  text-align: left;
  margin: 0 !important;
}

:where([data-vn-root]) [data-vn-dialogue-text] {
  color: var(--aperture-text, var(--vn-text, #f9faf6));
  font-family: var(--vn-font-family, Georgia, 'Times New Roman', serif);
  text-shadow: var(--aperture-text-shadow, 0 1px 3px rgba(0, 0, 0, 0.8));
}

/* Integrated Luminous Constellation Progress Track & Step Navigation Row inside Dialogue Card Footer */
.reader-progress {
  position: static !important;
  width: 100% !important;
  max-width: none !important;
  height: 46px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin: 2px 0 0 !important;
  padding: 5px 0 0 !important;
  border-top: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 10%, rgba(255, 255, 255, 0.05)) !important;
  box-sizing: border-box !important;
  flex: none !important;
  z-index: 45 !important;
  pointer-events: auto !important;
}

.reader-passage-picker {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border-radius: 999px;
}
.reader-passage-picker select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.reader-passage-picker select:disabled { cursor: default; }
.reader-passage-picker:focus-within {
  outline: 2px solid var(--aperture-accent, #c4b5fd);
  outline-offset: -2px;
}

.reader-progress [data-vn-step-left] {
  padding: 4px 12px !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--aperture-button-bg, #131a26) 78%, rgba(255, 255, 255, 0.05)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 24%, rgba(255, 255, 255, 0.14)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  color: var(--aperture-text, #f1f5f9) !important;
  opacity: 0.96 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  font-variant-numeric: tabular-nums !important;
  letter-spacing: 0.04em !important;
  white-space: nowrap !important;
  flex: none !important;
}

.reader-progress [data-vn-step-right] {
  display: none !important;
}

.reader-progress [data-vn-scrubber] {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 260px;
  display: flex;
  justify-content: center;
  height: 100%;
  margin: 0 auto;
  touch-action: none;
}

.reader-progress [data-vn-scrubber]::before {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: 50%;
  height: 1.5px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--aperture-accent, #c4b5fd) 34%, transparent), rgba(255, 255, 255, 0.08));
  pointer-events: none;
}

.reader-progress [data-vn-scrub-dot] {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  max-width: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.reader-progress [data-vn-scrub-dot]::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(55%, 6px);
  height: 5px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: var(--reader-tick-color, color-mix(in srgb, var(--aperture-text, #fff) 26%, #172136));
  pointer-events: none;
}

.reader-progress [data-vn-scrub-dot]:focus-visible {
  outline: 2px solid var(--aperture-accent, #c4b5fd);
  outline-offset: -2px;
  border-radius: 999px;
}
.reader-progress [data-vn-scrub-dot]:disabled { cursor: default; opacity: 0.55; }
.reader-progress [data-vn-scrub-dot][data-read="true"] {
  --reader-tick-color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 63%, #172136);
}
.reader-progress [data-vn-scrub-dot]:is([data-has-cue="true"], [data-art-state="ready"])::before {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 65%, transparent);
}
.reader-progress [data-vn-scrub-dot]:is(:focus-visible, :hover:not(:disabled))::before {
  --reader-tick-color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 75%, #fff);
}
.reader-progress [data-vn-scrub-dot][data-active="true"] {
  flex-grow: 3;
  max-width: 34px;
}
.reader-progress [data-vn-scrub-dot][data-active="true"]::before {
  width: min(88%, 28px);
  height: 6px;
  background: linear-gradient(90deg, var(--aperture-accent, #a78bfa), color-mix(in srgb, var(--aperture-accent, #a78bfa) 62%, #fff));
  box-shadow: 0 0 8px var(--aperture-accent-glow, rgba(167, 139, 250, 0.62));
}
.reader-progress [data-vn-scrub-dot][data-art-state="generating"]::before {
  opacity: 0.8;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 34%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
  .reader-progress [data-vn-scrub-dot][data-art-state="generating"]::before {
    animation: vn-art-shimmer 1.4s ease-in-out infinite;
  }
}
@keyframes vn-art-shimmer {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}

/* Previous & Continue circular buttons paired cleanly on the right side of the dialogue card footer */
.reader-step-nav {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex: none !important;
}

.reader-step-nav > [data-vn-control="previous"].nav-step-btn,
.reader-step-nav > [data-vn-continue].nav-step-btn,
[data-vn-root][data-vn-adjustable-sheet="true"] .reader-step-nav > [data-vn-continue],
[data-vn-control="previous"].nav-step-btn,
[data-vn-continue].nav-step-btn,
[data-vn-continue].action.advance {
  position: relative !important;
  inset: auto !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  transform: none !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: color-mix(in srgb, var(--aperture-button-bg, rgba(19, 26, 38, 0.85)) 78%, rgba(255, 255, 255, 0.05)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 26%, rgba(255, 255, 255, 0.16)) !important;
  color: var(--aperture-button-text, #f8fafc) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 2px 8px rgba(0, 0, 0, 0.35) !important;
  cursor: pointer !important;
  z-index: 45 !important;
  transition: background 0.16s ease, transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, color 0.16s ease !important;
}

[data-vn-control="previous"].nav-step-btn::after,
[data-vn-continue].nav-step-btn::after {
  content: "";
  position: absolute;
  inset: -6px;
}

[data-vn-control="previous"].nav-step-btn:hover:not(:disabled),
[data-vn-continue].nav-step-btn:hover:not(:disabled),
[data-vn-continue].action.advance:hover:not(:disabled) {
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, var(--aperture-button-hover-bg, rgba(30, 41, 59, 0.92))) !important;
  border-color: var(--aperture-accent, #c4b5fd) !important;
  color: var(--aperture-accent, #c4b5fd) !important;
  box-shadow: 0 0 12px var(--aperture-accent-glow, rgba(167, 139, 250, 0.38)) !important;
  transform: scale(1.06) !important;
}

[data-vn-continue]::before,
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-continue]::before {
  display: none !important;
}

/* Dialogue Restore Button (when minimized) & Full-Picture Mode */
[data-vn-show-text][hidden],
.caption-restore[hidden] {
  display: none !important;
}

:is([data-vn-root][data-vn-text-hidden="true"], [data-vn-root][data-vn-hud-hidden="true"], [data-vn-shell][data-vn-hud-hidden="true"], [data-vn-root][data-vn-clean-view="true"], [data-vn-shell][data-vn-clean-view="true"]) [data-vn-dialogue],
:is([data-vn-root][data-vn-text-hidden="true"], [data-vn-root][data-vn-hud-hidden="true"], [data-vn-shell][data-vn-hud-hidden="true"], [data-vn-root][data-vn-clean-view="true"], [data-vn-shell][data-vn-clean-view="true"]) .reader-progress,
:is([data-vn-root][data-vn-text-hidden="true"], [data-vn-root][data-vn-hud-hidden="true"], [data-vn-shell][data-vn-hud-hidden="true"], [data-vn-root][data-vn-clean-view="true"], [data-vn-shell][data-vn-clean-view="true"]) [data-vn-control="previous"].nav-step-btn,
:is([data-vn-root][data-vn-text-hidden="true"], [data-vn-root][data-vn-hud-hidden="true"], [data-vn-shell][data-vn-hud-hidden="true"], [data-vn-root][data-vn-clean-view="true"], [data-vn-shell][data-vn-clean-view="true"]) [data-vn-continue].nav-step-btn {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(14px) !important;
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

:is([data-vn-root][data-vn-hud-hidden="true"], [data-vn-shell][data-vn-hud-hidden="true"], [data-vn-root][data-vn-clean-view="true"], [data-vn-shell][data-vn-clean-view="true"]) :is([data-vn-reader-header], .route-bar, .reader-actions, [data-vn-controls], [data-vn-scrubber]) {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(-8px) !important;
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

[data-vn-status-stack] {
  top: calc(74px + env(safe-area-inset-top, 0px)) !important;
  z-index: 26 !important;
}

[data-vn-root][data-vn-phase="awaiting-input"]:has([data-vn-input]:focus) [data-vn-dialogue],
[data-vn-root][data-vn-phase="awaiting-input"]:has([data-vn-input]:focus) .reader-progress {
  opacity: 0 !important;
  pointer-events: none !important;
}

[data-vn-bond-banner] {
  position: absolute;
  top: calc(64px + env(safe-area-inset-top, 0px));
  inset-inline-end: max(14px, env(safe-area-inset-right, 0px));
  z-index: 34;
  display: grid;
  gap: 2px;
  max-width: min(320px, 85vw);
  padding: 10px 14px;
  border: 1px solid var(--vn-shell-border-strong, rgba(160,205,185,0.45));
  border-radius: 14px;
  background: var(--vn-shell-panel, rgba(15,23,42,0.94));
  color: var(--vn-shell-text, #f8fafc);
  box-shadow: var(--vn-shell-shadow, 0 12px 28px rgba(0,0,0,0.45));
  backdrop-filter: blur(14px);
  overflow-wrap: anywhere;
}
[data-vn-bond-banner] strong { font-size: 13px; }
[data-vn-bond-banner] small { font-size: 11px; color: var(--vn-shell-muted, #cbd5e1); }
[data-vn-bond-tier] {
  color: var(--aperture-accent, #c4b5fd);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
@media (prefers-reduced-motion: no-preference) {
  [data-vn-root]:not([data-vn-effect-intensity="off"]) [data-vn-bond-banner] {
    animation: vn-bond-enter 240ms ease-out both;
  }
}
@keyframes vn-bond-enter {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* #1 Subtle Ken Burns Camera Parallax (GPU transform-only, disabled under reduced-motion) */
@keyframes vn-kb-drift {
  0% { transform: translate3d(0%, 0%, 0) scale(1); }
  50% { transform: translate3d(-1.1%, -0.8%, 0) scale(1.035); }
  100% { transform: translate3d(0%, 0%, 0) scale(1); }
}
@keyframes vn-kb-establish {
  0% { transform: translate3d(-1.4%, 0%, 0) scale(1.02); }
  50% { transform: translate3d(1.4%, -0.6%, 0) scale(1.04); }
  100% { transform: translate3d(-1.4%, 0%, 0) scale(1.02); }
}
@keyframes vn-kb-closeup {
  0% { transform: translate3d(0%, 0.4%, 0) scale(1); }
  50% { transform: translate3d(0%, -0.8%, 0) scale(1.045); }
  100% { transform: translate3d(0%, 0.4%, 0) scale(1); }
}
@keyframes vn-kb-shoulder {
  0% { transform: translate3d(0.9%, 0%, 0) scale(1.015); }
  50% { transform: translate3d(-0.9%, -0.5%, 0) scale(1.038); }
  100% { transform: translate3d(0.9%, 0%, 0) scale(1.015); }
}
[data-vn-scene][data-vn-ken-burns="drift"] {
  --reader-camera-shot: vn-kb-drift 22s ease-in-out infinite;
}
[data-vn-scene][data-vn-ken-burns="establishing"] {
  --reader-camera-shot: vn-kb-establish 24s ease-in-out infinite;
}
[data-vn-scene][data-vn-ken-burns="close_up"] {
  --reader-camera-shot: vn-kb-closeup 18s ease-in-out infinite;
}
[data-vn-scene][data-vn-ken-burns="over_shoulder"] {
  --reader-camera-shot: vn-kb-shoulder 20s ease-in-out infinite;
}
@keyframes vn-kb-gentle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.012); }
}
@media (prefers-reduced-motion: no-preference) {
  [data-vn-root]:not([data-vn-effect-intensity="off"], [data-vn-camera-enabled="false"])
    [data-vn-scene][data-vn-ken-burns] [data-vn-scene-image][data-vn-layer="active"] {
    animation: var(--reader-camera-cap, var(--reader-camera-shot));
  }
}
[data-vn-root]:is([data-vn-effect-intensity="gentle"], [data-vn-camera-intensity="gentle"]) {
  --reader-camera-cap: vn-kb-gentle 28s ease-in-out infinite;
}

[data-vn-show-text]:not([hidden]),
.caption-restore:not([hidden]) {
  position: absolute !important;
  bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50% !important;
  background: var(--aperture-button-bg, rgba(8, 18, 15, 0.92)) !important;
  border: 1px solid var(--aperture-button-border, rgba(220, 238, 173, 0.45)) !important;
  color: var(--aperture-accent, #dcebad) !important;
  display: grid !important;
  place-items: center !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  z-index: 50 !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5) !important;
  transition: all 0.2s ease !important;
}

[data-vn-show-text]:not([hidden]):hover,
.caption-restore:not([hidden]):hover {
  background: var(--aperture-button-hover-bg, rgba(18, 38, 30, 0.96)) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
  transform: translateX(-50%) scale(1.08) !important;
}

/* Hide Reader Top Header when Workspace, Dossier or CG Gallery is Open so they never overlap */
[data-vn-shell][data-vn-workspace] [data-vn-reader-header],
[data-vn-root][data-vn-workspace] [data-vn-reader-header],
[data-vn-workspace-open="true"] [data-vn-reader-header],
[data-vn-shell][data-vn-dossier-open="true"] [data-vn-reader-header],
[data-vn-root][data-vn-dossier-open="true"] [data-vn-reader-header],
[data-vn-dossier-open="true"] [data-vn-reader-header],
[data-vn-shell][data-vn-gallery-open="true"] [data-vn-reader-header],
[data-vn-root][data-vn-gallery-open="true"] [data-vn-reader-header],
[data-vn-gallery-open="true"] [data-vn-reader-header],
body[data-vn-gallery-open="true"] [data-vn-reader-header] {
  display: none !important;
}

/* Hide stray reference icon and legacy auto/skip controls from bottom row */
[data-vn-controls] > [data-vn-control="references"],
[data-vn-controls] > [data-vn-references],
[data-vn-controls] > [data-vn-control="auto"],
[data-vn-controls] > [data-vn-control="skip"] {
  display: none !important;
}

/* =========================================================================
   INTERACTION SECTION ("What do you do?") - Cohesive Aperture Theme
   ========================================================================= */

[data-vn-interaction][hidden],
[hidden] {
  display: none !important;
}

/* Reserve reply space without changing the saved reading-panel size. */
[data-vn-root][data-vn-phase="awaiting-input"]{
 --caption-height:max(114px,min(var(--vn-sheet-height,142px),calc((var(--vn-reader-height,100dvh) - 180px) * .45)))!important;
}
[data-vn-root][data-vn-phase="awaiting-input"][data-vn-reply-compact="true"] .reader-caption[data-vn-dialogue]:not([hidden]):not([data-hidden="true"]){display:none!important}
[data-vn-root][data-vn-phase="awaiting-input"][data-vn-reply-compact="true"] [data-vn-interaction]:not([hidden]){bottom:104px!important}
[data-vn-interaction]:not([hidden]) {
  position: absolute !important;
  inset: calc(70px + env(safe-area-inset-top, 0px)) 14px calc(var(--caption-height, 142px) + 104px + env(safe-area-inset-bottom, 0px)) 14px !important;
  z-index: 34 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  justify-content: safe flex-end !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  scrollbar-width: thin;
  gap: 10px !important;
  max-width: 600px !important;
  margin: 0 auto !important;
  padding: 6px 0 !important;
  background: transparent !important;
  pointer-events: auto !important;
}

[data-vn-interaction] > * {
  flex-shrink: 0 !important;
  pointer-events: auto !important;
}

[data-vn-interaction-heading] {
  text-align: center !important;
  margin-bottom: 2px !important;
  padding: 4px 10px !important;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  background: var(--vn-shell-panel, #111a1e) !important;
  border: 1px solid var(--vn-shell-border, #9cb5a8);
}

[data-vn-interaction-title] {
  font-family: var(--vn-font-family, Georgia, serif);
  font-size: 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: var(--vn-shell-text, #eff4e9) !important;
  margin: 0 0 2px !important;
  text-shadow: none !important;
}

[data-vn-interaction-hint] {
  font-size: 11px !important;
  color: var(--vn-shell-muted, #9cb5a8) !important;
  text-shadow: none !important;
  margin: 0 !important;
}

[data-vn-interaction]:focus-visible{outline:2px solid var(--vn-shell-accent,#dcebad);outline-offset:2px}

[data-vn-input-form] {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  width: 100% !important;
  background: var(--aperture-input-form-bg, rgba(11, 24, 18, 0.92)) !important;
  border: 1px solid var(--aperture-choice-border, rgba(160, 205, 185, 0.28)) !important;
  border-radius: 14px !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  padding: 10px 12px !important;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45) !important;
  box-sizing: border-box !important;
}

[data-vn-input] {
  width: 100% !important;
  box-sizing: border-box !important;
  min-height: 48px !important;
  max-height: 120px !important;
  background: var(--aperture-input-bg, rgba(6, 14, 11, 0.8)) !important;
  border: 1px solid var(--aperture-choice-border, rgba(160, 205, 185, 0.22)) !important;
  border-radius: 10px !important;
  color: var(--aperture-text, #f5f9f2) !important;
  font: 16px/1.5 system-ui, -apple-system, sans-serif !important;
  padding: 8px 10px !important;
  resize: vertical !important;
}

[data-vn-input]:focus {
  outline: 2px solid var(--aperture-accent, #dcebad) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
}

[data-vn-input-form] button[type="submit"] {
  align-self: flex-end !important;
  padding: 6px 18px !important;
  border-radius: 999px !important;
  background: var(--aperture-accent, #dcebad) !important;
  color: var(--aperture-accent-contrast, #11241c) !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  border: 0 !important;
  cursor: pointer !important;
  transition: transform 0.15s ease, background 0.15s ease !important;
}

[data-vn-input-form] button[type="submit"]:hover {
  background: var(--aperture-accent-hover, #ecf8cd) !important;
  transform: translateY(-1px) !important;
}

/* The reply area owns scrolling; a second list viewport can clip a full choice. */
[data-vn-interaction] [data-vn-choice-list]{max-height:none!important;overflow:visible!important}

[data-vn-choice-list] {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  width: 100% !important;
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

[data-vn-choice-list] button {
  width: 100% !important;
  padding: 10px 14px !important;
  background: var(--aperture-choice-bg, rgba(11, 24, 18, 0.92)) !important;
  border: 1px solid var(--aperture-choice-border, rgba(160, 205, 185, 0.28)) !important;
  border-radius: 12px !important;
  color: var(--aperture-text, #f5f9f2) !important;
  font-size: 13.5px !important;
  text-align: left !important;
  cursor: pointer !important;
  backdrop-filter: blur(12px) !important;
  transition: background 0.15s ease, border-color 0.15s ease !important;
}

/* Keep the existing terminal, paper and deco markers clear of the label. */
:is([data-vn-preset="boxed-console"],[data-vn-preset="paper-novel"],[data-vn-preset="midnight-noir"]) [data-vn-choice]{padding-inline:40px!important}

[data-vn-choice-list] button:hover {
  background: var(--aperture-choice-hover-bg, rgba(35, 75, 57, 0.95)) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
}

/* Resume notice suppressed in clean reader */
[data-vn-resume-notice] {
  display: none !important;
}



/* Suppress auto & skip from bottom 6-button grid */
[data-vn-controls] > [data-vn-control="auto"],
[data-vn-controls] > [data-vn-control="skip"] {
  display: none !important;
}

/* Override any high-specificity legacy speaker positioning */
[data-vn-root] [data-vn-dialogue] [data-vn-speaker],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-speaker],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-speaker],
[data-vn-dialogue] [data-vn-speaker],
[data-vn-speaker] {
  position: static !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  inset: auto !important;
  transform: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  display: block !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
  line-height: 1.25 !important;
  white-space: nowrap !important;
}

:where([data-vn-root]) [data-vn-speaker] {
  color: var(--aperture-text, var(--vn-text, #f8fafc));
}

[data-vn-root] [data-vn-dialogue] [data-vn-speaker][hidden],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-speaker][hidden],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-speaker][hidden],
[data-vn-dialogue] [data-vn-speaker][hidden],
.caption-head [data-vn-speaker][hidden],
.caption-head .caption-split[hidden],
[data-vn-speaker][hidden] {
  display: none !important;
}

@media(max-width:600px){
 [data-vn-reader-header] .reading-heading { min-width:0;overflow:hidden; }
}
`;
