/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_LENS_FOLIO = `/* =========================================================================
   WORLD LENS & CHARACTER FOLIO (Screens 2, 4, 5)
   ========================================================================= */

.world-sheet-map {
  margin-top: 16px;
  height: calc(min(48vh, 380px));
  min-height: 280px;
  border-radius: 6px 6px 22px 22px;
  position: relative;
  overflow: hidden;
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

/* Symmetrical, perfectly centered dialogue card */
[data-vn-dialogue],
[data-vn-root] [data-vn-dialogue],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-dialogue],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue] {
  position: absolute !important;
  z-index: 30 !important;
  left: 14px !important;
  right: 14px !important;
  width: auto !important;
  max-width: none !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  top: auto !important;
  bottom: calc(104px + env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-inset, var(--vn-sheet-keyboard-inset, 0px))) !important;
  height: var(--caption-height, 146px);
  min-height: 48px;
  max-height: calc(100% - 148px) !important;
  padding: 8px 14px 9px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  touch-action: pan-y !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
}

:where([data-vn-root]) [data-vn-dialogue] {
  border: 1px solid var(--aperture-dialogue-border, var(--vn-dialogue-border, rgba(160, 205, 185, 0.28)));
  border-radius: min(var(--vn-shell-radius, 16px), 18px);
  background: var(--aperture-dialogue-bg, var(--vn-dialogue-bg, rgba(8, 18, 15, var(--caption-opacity, 0.82))));
  -webkit-backdrop-filter: blur(var(--caption-blur, 14px));
  backdrop-filter: blur(var(--caption-blur, 14px));
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

/* Draggable Top Resize Grip */
.resize-grip,
[data-vn-sheet-handle] {
  position: absolute !important;
  top: -20px;
  left: 50% !important;
  transform: translateX(-50%) !important;
  min-width: 72px;
  height: 44px;
  cursor: ns-resize !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 35 !important;
  touch-action: none !important;
}

.resize-grip span {
  display: block !important;
  width: 28px !important;
  height: 2.5px !important;
  border-radius: var(--vn-scrubber-radius, 2px) !important;
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 58%, transparent) !important;
}

/* Dialogue Header (Speaker, Scene, Auto, Minimize) */
.caption-head,
[data-vn-sheet-header] {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  min-height: 26px !important;
  touch-action: none !important;
  margin-top: 0 !important;
  margin-bottom: 3px !important;
  padding-bottom: 4px !important;
  border-bottom: 1px solid color-mix(in srgb, var(--aperture-accent, #dcebad) 16%, transparent) !important;
  flex: none !important;
}

.caption-head .speaker {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}

.caption-head [data-vn-speaker] {
  font-size: 12px !important;
  font-weight: 750 !important;
  color: var(--aperture-accent, #dcebad) !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.caption-head .caption-split {
  color: color-mix(in srgb, var(--aperture-accent, #dcebad) 42%, transparent) !important;
  font-size: 9px !important;
}

.caption-head [data-vn-caption-scene] {
  font-size: 9.5px !important;
  color: var(--aperture-muted, #9cb5a8) !important;
  letter-spacing: 0.06em !important;
}

.caption-head-actions,
[data-vn-sheet-tools],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-sheet-tools] {
  position: static !important;
  width: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 2px !important;
  margin-left: auto !important;
  padding: 1px 3px !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--aperture-button-bg, #0e1e18) 38%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #dcebad) 18%, transparent) !important;
}

.caption-tool,
[data-vn-hide-text],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-sheet-tools] button,
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-hide-text] {
  position: relative !important;
  width: 28px;
  height: 24px;
  min-width: 28px;
  min-height: 24px;
  border-radius: 999px !important;
  border: 0 !important;
  background: transparent !important;
  color: var(--aperture-button-text, #edf3ea) !important;
  opacity: 0.82 !important;
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
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 22%, transparent) !important;
  color: var(--aperture-accent, #dcebad) !important;
  opacity: 1 !important;
}

.caption-tool svg,
[data-vn-hide-text] svg {
  width: 13.5px !important;
  height: 13.5px !important;
}

/* Scrollable Copy */
.scroll-copy,
[data-vn-dialogue] .scroll-copy {
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
  padding: 2px 2px 6px !important;
  margin: 0 !important;
}

[data-vn-dialogue-text],
[data-vn-root] [data-vn-dialogue-text],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-dialogue-text],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue-text],
[data-vn-root]:not([data-vn-adjustable-sheet="true"]) [data-vn-dialogue-text] {
  overflow: visible !important;
  overflow-y: visible !important;
  overscroll-behavior: auto !important;
  max-height: none !important;
  height: auto !important;
  flex: none !important;
  touch-action: pan-y !important;
  user-select: text !important;
  font-size: var(--reader-font, 15px) !important;
  line-height: 1.42;
  margin: 0 !important;
}

:where([data-vn-root]) [data-vn-dialogue-text] {
  color: var(--aperture-text, var(--vn-text, #f9faf6));
  font-family: var(--vn-font-family, Georgia, 'Times New Roman', serif);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* Integrated Progress Scrubber docked inside Dialogue Card */
.reader-progress {
  position: absolute !important;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
  left: 72px !important;
  right: 72px !important;
  width: auto !important;
  max-width: calc(100% - 144px) !important;
  height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  margin: 0 auto !important;
  z-index: 45 !important;
  pointer-events: auto !important;
}

.reader-progress [data-vn-step-left],
.reader-progress [data-vn-step-right],
.reader-progress small {
  color: var(--aperture-text, #edf3ea) !important;
  opacity: 0.85 !important;
  font-size: 9.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  white-space: nowrap !important;
  flex: none !important;
}

.reader-progress [data-vn-scrubber] {
  flex: 1 1 auto !important;
  min-width: 48px !important;
  max-width: 210px !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 3px !important;
  overflow: hidden !important;
  height: 18px !important;
}

.reader-progress [data-vn-scrub-dot] {
  flex: 1 1 0 !important;
  width: auto !important;
  min-width: 3px !important;
  max-width: 9px !important;
  height: 5px !important;
  min-height: 5px !important;
  border-radius: var(--vn-scrubber-radius, 999px) !important;
  padding: 0 !important;
  border: 0 !important;
  background: color-mix(in srgb, var(--aperture-text, #ffffff) 24%, transparent) !important;
  transition: flex 0.18s ease, background-color 0.16s ease, box-shadow 0.16s ease !important;
}

.reader-progress [data-vn-scrub-dot][data-read="true"] {
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 52%, transparent) !important;
}

.reader-progress [data-vn-scrub-dot][data-active="true"] {
  flex: 2.4 1 0 !important;
  min-width: 10px !important;
  max-width: 20px !important;
  height: 6px !important;
  background: var(--aperture-accent, #dcebad) !important;
  box-shadow: 0 0 8px var(--aperture-accent-glow, rgba(220, 238, 173, 0.45)) !important;
}

/* Previous & Continue buttons integrated inside dialogue card at bottom left & right */
[data-vn-controls] > [data-vn-control="previous"].nav-step-btn {
  position: absolute !important;
  left: 10px !important;
  right: auto !important;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: var(--aperture-button-bg, rgba(14, 30, 24, 0.92)) !important;
  border: 1px solid var(--aperture-button-border, rgba(160, 205, 185, 0.3)) !important;
  color: var(--aperture-button-text, #edf3ea) !important;
  cursor: pointer !important;
  z-index: 45 !important;
  transition: background 0.16s ease, transform 0.16s ease, border-color 0.16s ease !important;
}

[data-vn-controls] > [data-vn-control="previous"].nav-step-btn:hover:not(:disabled) {
  background: var(--aperture-button-hover-bg, rgba(35, 75, 57, 0.95)) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
}

[data-vn-continue].nav-step-btn,
[data-vn-continue].action.advance {
  position: absolute !important;
  right: 10px !important;
  left: auto !important;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: var(--aperture-accent, #dcebad) !important;
  border: 1px solid var(--aperture-accent, #dcebad) !important;
  color: var(--aperture-accent-contrast, #11241c) !important;
  cursor: pointer !important;
  font-weight: 700 !important;
  z-index: 45 !important;
  box-shadow: 0 2px 10px var(--aperture-accent-glow, rgba(220, 238, 173, 0.35)) !important;
  transition: background 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease !important;
}

[data-vn-continue].nav-step-btn:hover:not(:disabled),
[data-vn-continue].action.advance:hover:not(:disabled) {
  background: var(--aperture-accent-hover, #ecf8cd) !important;
  transform: scale(1.06) !important;
}

[data-vn-continue]::before,
[data-vn-continue]::after {
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

:where([data-vn-root]) [data-vn-dialogue] {
  box-shadow: var(--vn-dialogue-shadow, 0 18px 46px rgba(0, 0, 0, 0.45)), 0 4px 28px var(--vn-atmosphere-glow, rgba(0, 0, 0, 0.32)), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

[data-vn-dialogue] {
  transition: box-shadow 0.4s ease, border-color 0.4s ease, opacity 0.24s ease, transform 0.24s ease !important;
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

[data-vn-scrubber] [data-vn-scrub-dot].active {
  box-shadow: 0 0 12px var(--vn-atmosphere-glow, var(--aperture-accent, #8ae9b3)) !important;
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

/* Dialogue caption head & speaker */
.caption-head {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 6px !important;
  min-height: 22px !important;
  border-bottom: 1px solid rgba(228, 240, 218, 0.15) !important;
  padding-bottom: 3px !important;
  margin-bottom: 4px !important;
}

[data-vn-speaker], .speaker {
  font-size: 12px !important;
  line-height: 1.4 !important;
  letter-spacing: 0.105em !important;
  font-weight: 750 !important;
  color: var(--aperture-accent, #dcebad) !important;
  white-space: nowrap !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8) !important;
}

.caption-split {
  opacity: 0.35 !important;
  padding: 0 4px !important;
  color: var(--aperture-accent, #dcebad) !important;
}

[data-vn-caption-scene] {
  color: var(--aperture-muted, #c9d5b7) !important;
  font-size: 9px !important;
  letter-spacing: 0.08em !important;
  opacity: 0.8 !important;
}

.caption-head-actions {
  display: flex !important;
  align-items: center !important;
  gap: 3px !important;
}

.caption-tool {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: grid !important;
  place-items: center !important;
  color: var(--aperture-text, #dfefd8) !important;
  opacity: 0.78 !important;
  border-radius: min(var(--vn-shell-radius, 8px), 10px) !important;
  border: 0 !important;
  background: transparent !important;
  cursor: pointer !important;
  padding: 0 !important;
}
.caption-tool:hover {
  background: color-mix(in srgb, var(--aperture-accent, #ffffff) 16%, transparent) !important;
  color: var(--aperture-accent, #ffffff) !important;
  opacity: 1 !important;
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
  padding: 2px 8px !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #dcebad) 24%, transparent) !important;
  border-radius: var(--vn-scrubber-radius, 999px) !important;
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 11%, transparent) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  display: inline-flex !important;
  align-items: center !important;
  font-size: 12px !important;
  font-weight: 750 !important;
  letter-spacing: 0.08em !important;
  line-height: 1.2 !important;
}

:where([data-vn-root]) [data-vn-speaker] {
  color: var(--aperture-accent, var(--vn-accent, #dcebad));
}



.caption-head .speaker {
  display: inline-flex !important;
  align-items: center !important;
  gap: 2px !important;
  white-space: nowrap !important;
}

.caption-head [data-vn-speaker] {
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  padding: 2px 8px !important;
  border-radius: var(--vn-scrubber-radius, 999px) !important;
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 12%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #dcebad) 26%, transparent) !important;
}

/* Compact sleek header action icons with generous invisible 44px touch reach */
[data-vn-reader-header] .round-ghost {
  position: relative !important;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  flex-shrink: 0 !important;
}
[data-vn-reader-header] .round-ghost::after {
  content: "";
  position: absolute;
  inset: -6px;
}
[data-vn-reader-header] .round-ghost svg {
  width: 15px !important;
  height: 15px !important;
}
@media(max-width:600px){
 [data-vn-reader-header] .reading-heading { min-width:0;overflow:hidden; }
}
`;
