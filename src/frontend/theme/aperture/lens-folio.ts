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
  border: 1px solid;
}

body.theme-light .world-sheet-map,
[data-aperture-mode="light"] .world-sheet-map {
  background: #dbe6db;
  border-color: #a9c2b2;
}

body.theme-dark .world-sheet-map,
[data-aperture-mode="dark"] .world-sheet-map {
  background: linear-gradient(145deg, #21362f, #142824);
  border-color: #466c5f;
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
  stroke: #385950;
  stroke-width: 1.2;
  stroke-dasharray: 3 5;
  opacity: 0.52;
}

body.theme-dark .world-map-svg path,
[data-aperture-mode="dark"] .world-map-svg path {
  stroke: #a5c7b3;
  opacity: 0.65;
}

.map-node-pill {
  position: absolute;
  min-width: 86px;
  max-width: 114px;
  padding: 6px 8px 5px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid;
  cursor: pointer;
  transition: transform 0.18s var(--ease), background 0.18s ease;
}

body.theme-light .map-node-pill {
  background: rgba(248, 251, 242, 0.98);
  color: #19352a;
  border-color: #9bb1a5;
  box-shadow: 0 4px 16px rgba(36, 66, 56, 0.14);
}

body.theme-light .map-node-pill.active {
  background: #18362d;
  color: #f7f9ee;
  border-color: #18362d;
  transform: translateY(-3px);
}

body.theme-dark .map-node-pill {
  background: rgba(28, 54, 47, 0.97);
  color: #f3f7e9;
  border-color: #81a395;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.29);
}

body.theme-dark .map-node-pill.active {
  background: #dce9b5;
  color: #1b342b;
  border-color: #ecf4cc;
  box-shadow: 0 10px 25px rgba(7, 18, 15, 0.42), 0 0 0 2px rgba(215, 235, 172, 0.23);
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
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: 10px;
}

body.theme-light .observations-grid {
  border-top-color: rgba(49, 81, 65, 0.18);
}

.observation-cell {
  padding: 10px 6px 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  min-height: 56px;
}

.observation-cell:nth-child(even) {
  padding-left: 12px;
}

body.theme-light .observation-cell {
  border-bottom-color: rgba(53, 79, 63, 0.14);
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
  background: rgba(220, 238, 177, 0.18);
  color: #d6e8aa;
  font-weight: 750;
}

body.theme-light .observation-cell em {
  background: rgba(40, 70, 56, 0.12);
  color: #36634c;
  font-weight: 800;
}

.folio-quote-callout {
  border-left: 2px solid #b7d6ae;
  padding-left: 14px;
  color: #e4ead9;
  font: italic 13.5px/1.5 Georgia, serif;
  margin: 16px 0;
}

body.theme-light .folio-quote-callout {
  color: #273d32;
  border-left-color: #486f58;
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
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
  .aperture-overlay {
    clip-path: none !important;
    opacity: 0;
    visibility: hidden;
  }
  .aperture-overlay.open {
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
  bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  height: var(--caption-height, 146px);
  min-height: 114px !important;
  max-height: calc(100% - 140px) !important;
  padding: 10px 14px 42px !important;
  border: 1px solid rgba(160, 205, 185, 0.28) !important;
  border-radius: 16px !important;
  background: rgba(8, 18, 15, var(--caption-opacity, 0.82)) !important;
  -webkit-backdrop-filter: blur(var(--caption-blur, 14px)) !important;
  backdrop-filter: blur(var(--caption-blur, 14px)) !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  touch-action: pan-y !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
}

/* Draggable Top Resize Grip */
.resize-grip,
[data-vn-sheet-handle] {
  position: absolute !important;
  top: 3px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 44px !important;
  height: 8px !important;
  cursor: ns-resize !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 35 !important;
  touch-action: none !important;
}

.resize-grip span {
  display: block !important;
  width: 32px !important;
  height: 3px !important;
  border-radius: 2px !important;
  background: rgba(220, 238, 177, 0.45) !important;
}

/* Dialogue Header (Speaker, Scene, Expand, Minimize) */
.caption-head,
[data-vn-sheet-header] {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  min-height: 22px !important;
  margin-top: 2px !important;
  margin-bottom: 4px !important;
  padding-bottom: 4px !important;
  border-bottom: 1px solid rgba(160, 205, 185, 0.18) !important;
  flex: none !important;
}

.caption-head .speaker {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.caption-head [data-vn-speaker] {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #dcebad !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.caption-head .caption-split {
  color: #6d8678 !important;
  font-size: 10px !important;
}

.caption-head [data-vn-caption-scene] {
  font-size: 10px !important;
  color: #9cb5a8 !important;
  letter-spacing: 0.06em !important;
}

.caption-head-actions,
[data-vn-sheet-tools] {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.caption-tool {
  width: 22px !important;
  height: 22px !important;
  border-radius: 6px !important;
  border: 1px solid rgba(160, 205, 185, 0.22) !important;
  background: rgba(255, 255, 255, 0.06) !important;
  color: #edf3ea !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.caption-tool:hover {
  background: rgba(220, 238, 177, 0.2) !important;
  border-color: #dcebad !important;
}

.caption-tool svg {
  width: 14px !important;
  height: 14px !important;
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
  scrollbar-color: rgba(220, 238, 177, 0.45) transparent !important;
  padding: 2px 2px 42px !important;
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
  font-size: calc(var(--reader-font, 15px) * var(--vn-text-scale, 1)) !important;
  line-height: calc(1.55 * var(--vn-text-scale, 1)) !important;
  color: var(--aperture-text, #f9faf6) !important;
  font-family: Georgia, 'Times New Roman', serif !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
  margin: 0 !important;
}

/* Integrated Progress Scrubber docked inside Dialogue Card */
.reader-progress {
  position: absolute !important;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  left: 56px !important;
  right: 56px !important;
  width: auto !important;
  max-width: calc(100% - 112px) !important;
  height: 28px !important;
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
  color: #edf3ea !important;
  opacity: 0.85 !important;
  font-size: 9.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  white-space: nowrap !important;
  flex: none !important;
}

.reader-progress [data-vn-scrubber] {
  flex: 1 1 auto !important;
  min-width: 40px !important;
  max-width: 175px !important;
}

/* Previous & Continue buttons integrated inside dialogue card at bottom left & right */
[data-vn-controls] > [data-vn-control="previous"].nav-step-btn {
  position: absolute !important;
  left: 10px !important;
  right: auto !important;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
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
  bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
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

[data-vn-continue]::before {
  display: none !important;
}

/* Dialogue Restore Button (when minimized) */
[data-vn-show-text],
.caption-restore {
  position: absolute !important;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 40px !important;
  height: 40px !important;
  border-radius: 50% !important;
  background: var(--aperture-button-bg, rgba(8, 18, 15, 0.92)) !important;
  border: 1px solid var(--aperture-button-border, rgba(160, 205, 185, 0.35)) !important;
  color: var(--aperture-accent, #dcebad) !important;
  display: grid !important;
  place-items: center !important;
  cursor: pointer !important;
  z-index: 50 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
  transition: all 0.2s ease !important;
}

[data-vn-show-text]:hover,
.caption-restore:hover {
  background: rgba(18, 38, 30, 0.96) !important;
  border-color: #dcebad !important;
  transform: translateX(-50%) scale(1.08) !important;
}

/* Hide Reader Top Header when Workspace or Dossier is Open so they never overlap */
[data-vn-shell][data-vn-workspace] [data-vn-reader-header],
[data-vn-root][data-vn-workspace] [data-vn-reader-header],
[data-vn-workspace-open="true"] [data-vn-reader-header],
[data-vn-shell][data-vn-dossier-open="true"] [data-vn-reader-header],
[data-vn-root][data-vn-dossier-open="true"] [data-vn-reader-header],
[data-vn-dossier-open="true"] [data-vn-reader-header] {
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

[data-vn-interaction]:not([hidden]) {
  position: absolute !important;
  inset: auto 14px calc(var(--caption-height, 142px) + 82px + env(safe-area-inset-bottom, 0px)) 14px !important;
  z-index: 24 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 10px !important;
  max-width: 600px !important;
  margin: 0 auto !important;
  padding: 0 !important;
  background: transparent !important;
  pointer-events: none !important;
}

[data-vn-interaction] > * {
  pointer-events: auto !important;
}

[data-vn-interaction-heading] {
  text-align: center !important;
  margin-bottom: 2px !important;
}

[data-vn-interaction-title] {
  font-family: Georgia, serif !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #dcebad !important;
  margin: 0 0 2px !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7) !important;
}

[data-vn-interaction-hint] {
  font-size: 11px !important;
  color: var(--aperture-muted, #9cb5a8) !important;
  margin: 0 !important;
}

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
  font: 14px/1.5 system-ui, -apple-system, sans-serif !important;
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
  font-size: 9.5px !important;
  line-height: 1.4 !important;
  letter-spacing: 0.105em !important;
  font-weight: 750 !important;
  color: #dcebad !important;
  white-space: nowrap !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8) !important;
}

.caption-split {
  opacity: 0.35 !important;
  padding: 0 4px !important;
  color: #dcebad !important;
}

[data-vn-caption-scene] {
  color: #c9d5b7 !important;
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
  width: 26px !important;
  height: 22px !important;
  display: grid !important;
  place-items: center !important;
  color: #dfefd8 !important;
  opacity: 0.78 !important;
  border-radius: 6px !important;
  border: 0 !important;
  background: transparent !important;
  cursor: pointer !important;
  padding: 0 !important;
}
.caption-tool:hover {
  background: rgba(255, 255, 255, 0.16) !important;
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
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  display: inline-block !important;
  color: #dcebad !important;
  font-size: 9.5px !important;
  font-weight: 750 !important;
  letter-spacing: 0.105em !important;
  line-height: 1.4 !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8) !important;
}

[data-vn-root] [data-vn-dialogue] [data-vn-speaker]::before,
[data-vn-root] [data-vn-dialogue] [data-vn-speaker]::after,
[data-vn-speaker]::before,
[data-vn-speaker]::after {
  display: none !important;
}



.caption-head .speaker {
  display: inline-flex !important;
  align-items: center !important;
  gap: 2px !important;
  white-space: nowrap !important;
}

.caption-head [data-vn-speaker] {
  display: inline !important;
}

`;
