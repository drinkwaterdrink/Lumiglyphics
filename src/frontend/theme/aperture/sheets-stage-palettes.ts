/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_SHEETS_STAGE_PALETTES = `/* =========================================================================
   CANONICAL FULL-SCREEN SHEET GEOMETRY FOR WORKSPACE, FOLIO & LENS
   ========================================================================= */

/* Ensure workspace covers full viewport */
aside[data-vn-workspace] {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  z-index: 60 !important;
  background: linear-gradient(155deg, #151f20 0%, #101a1e 58%, #0b1419 100%) !important;
  color: #eff4e9 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

body.theme-light aside[data-vn-workspace],
[data-aperture-mode="light"] aside[data-vn-workspace] {
  background: linear-gradient(147deg, #eef3e5 0%, #e8eee0 58%, #dce7d3 100%) !important;
  color: #172721 !important;
}

[data-workspace-heading],
aside[data-vn-workspace] > header {
  height: 56px !important;
  min-height: 56px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  padding: 0 16px !important;
  background: rgba(17, 35, 28, 0.94) !important;
  border-bottom: 1px solid rgba(220, 238, 217, 0.14) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  color: #f4f8ee !important;
  z-index: 2 !important;
  box-sizing: border-box !important;
}

:is(body.theme-light, [data-aperture-mode="light"], [data-vn-shell][data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-workspace-heading], aside[data-vn-workspace] > header) {
  background: rgba(238, 243, 229, 0.96) !important;
  border-bottom: 1px solid rgba(35, 75, 57, 0.16) !important;
  color: #152c22 !important;
}

[data-workspace-heading] > div,
aside[data-vn-workspace] > header > div {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

[data-workspace-title],
[data-workspace-heading] h2 {
  font-family: Georgia, serif !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  margin: 0 !important;
  color: #f4f8ee !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

:is(body.theme-light, [data-aperture-mode="light"], [data-vn-shell][data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-workspace-title], [data-workspace-heading] h2) {
  color: #152c22 !important;
}

[data-workspace-subtitle] {
  font-size: 10px !important;
  color: #9cb5a8 !important;
  margin: 2px 0 0 !important;
  letter-spacing: 0.04em !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

:is(body.theme-light, [data-aperture-mode="light"], [data-vn-shell][data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-workspace-subtitle] {
  color: #385b4b !important;
}

[data-workspace-back],
.workspace-back-btn,
[data-workspace-close] {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  min-height: 34px !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(220, 238, 217, 0.18) !important;
  color: #edf3ea !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: background 0.15s ease, border-color 0.15s ease !important;
}

[data-workspace-back]:hover,
.workspace-back-btn:hover,
[data-workspace-close]:hover {
  background: rgba(220, 238, 177, 0.16) !important;
  border-color: #dcebad !important;
}

:is(body.theme-light, [data-aperture-mode="light"], [data-vn-shell][data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-workspace-back], .workspace-back-btn, [data-workspace-close]) {
  background: rgba(0, 0, 0, 0.05) !important;
  border-color: rgba(35, 75, 57, 0.18) !important;
  color: #1a3327 !important;
}

[data-workspace-content] {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 16px 18px calc(80px + env(safe-area-inset-bottom, 0px)) !important;
  box-sizing: border-box !important;
  position: relative !important;
  z-index: 1 !important;
}

/* Character Folio & World Lens full-bleed modal overhaul */
[data-vn-dossier] {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  z-index: 50 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  background: linear-gradient(155deg, #151f20 0%, #101a1e 58%, #0b1419 100%) !important;
  color: #eff4e9 !important;
}

body.theme-light [data-vn-dossier],
[data-aperture-mode="light"] [data-vn-dossier] {
  background: linear-gradient(147deg, #eef3e5 0%, #e8eee0 58%, #dce7d3 100%) !important;
  color: #172721 !important;
}

[data-vn-dossier-card] {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 18px calc(80px + env(safe-area-inset-bottom, 0px)) !important;
  box-sizing: border-box !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  background: transparent !important;
  position: relative !important;
  z-index: 1 !important;
}

[data-vn-dossier-card] header {
  position: sticky !important;
  top: 0 !important;
  height: 56px !important;
  min-height: 56px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 18px !important;
  margin: 0 -18px 12px -18px !important;
  background: rgba(17, 31, 31, 0.92) !important;
  border-bottom: 1px solid rgba(220, 238, 217, 0.12) !important;
  backdrop-filter: blur(16px) !important;
  z-index: 10 !important;
}

body.theme-light [data-vn-dossier-card] header {
  background: rgba(234, 241, 226, 0.92) !important;
  border-bottom: 1px solid rgba(61, 86, 75, 0.12) !important;
}

[data-vn-dossier-card] header h2 {
  font-family: Georgia, serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  margin: 0 !important;
  color: inherit !important;
  outline: none !important;
}

/* Character Folio Hero Card Edge-to-Edge */
.folio-hero-card {
  height: 280px !important;
  margin: -12px -18px 14px -18px !important;
  border-radius: 0 !important;
  position: relative !important;
  overflow: hidden !important;
}

.folio-hero-card [data-dossier-media] {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: 0 !important;
  border: 0 !important;
  background: transparent !important;
}

.folio-hero-card img {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center 18% !important;
}

.folio-hero-card:after {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(transparent 25%, rgba(7, 13, 18, 0.25) 55%, rgba(5, 13, 15, 0.92) 100%) !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.folio-hero-label {
  position: absolute !important;
  bottom: 28px !important;
  left: 20px !important;
  font-family: Georgia, serif !important;
  font-size: 38px !important;
  letter-spacing: -0.05em !important;
  color: #fff !important;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.8) !important;
  z-index: 2 !important;
}

.folio-hero-sub {
  position: absolute !important;
  left: 21px !important;
  bottom: 10px !important;
  font-size: 10px !important;
  letter-spacing: 0.08em !important;
  color: #deebdb !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8) !important;
  z-index: 2 !important;
}

/* Orbital Lines Unconditional Visibility in Dark and Light Modes */
aside[data-vn-workspace]:before,
[data-workspace-content]:before,
[data-vn-dossier]:before,
[data-vn-dossier-card]:before,
[data-vn-reference-sheet]:before,
[data-vn-settings]:before,
.settings-page:before,
[data-settings-route]:before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  z-index: 0 !important;
  opacity: 1 !important;
}

/* Dark Mode Radial Lines (Default) */
aside[data-vn-workspace]:before,
[data-workspace-content]:before {
  background: repeating-radial-gradient(ellipse at 102% 96%, transparent 0 59px, rgba(140, 195, 160, 0.12) 60px, transparent 61px) !important;
}
[data-vn-reference-sheet]:before,
[data-surface="world"]:before {
  background: repeating-radial-gradient(circle at -12% 35%, transparent 0 52px, rgba(140, 195, 160, 0.12) 53px, transparent 54px) !important;
}
[data-vn-dossier]:before,
[data-vn-dossier-card]:before,
[data-surface="character"]:before {
  background: repeating-radial-gradient(ellipse at 108% 18%, transparent 0 49px, rgba(140, 195, 160, 0.12) 50px, transparent 51px) !important;
}
[data-vn-settings]:before,
.settings-page:before,
[data-settings-route]:before,
[data-surface="settings"]:before {
  background: repeating-radial-gradient(ellipse at 105% 88%, transparent 0 44px, rgba(140, 195, 160, 0.12) 45px, transparent 46px) !important;
}

/* Light Mode Radial Lines */
body.theme-light aside[data-vn-workspace]:before,
body.theme-light [data-workspace-content]:before,
[data-aperture-mode="light"] aside[data-vn-workspace]:before,
[data-aperture-mode="light"] [data-workspace-content]:before {
  background: repeating-radial-gradient(ellipse at 102% 96%, transparent 0 59px, rgba(45, 78, 62, 0.08) 60px, transparent 61px) !important;
}
body.theme-light [data-vn-reference-sheet]:before,
body.theme-light [data-surface="world"]:before,
[data-aperture-mode="light"] [data-vn-reference-sheet]:before,
[data-aperture-mode="light"] [data-surface="world"]:before {
  background: repeating-radial-gradient(circle at -12% 35%, transparent 0 52px, rgba(45, 78, 62, 0.08) 53px, transparent 54px) !important;
}
body.theme-light [data-vn-dossier]:before,
body.theme-light [data-vn-dossier-card]:before,
body.theme-light [data-surface="character"]:before,
[data-aperture-mode="light"] [data-vn-dossier]:before,
[data-aperture-mode="light"] [data-vn-dossier-card]:before,
[data-aperture-mode="light"] [data-surface="character"]:before {
  background: repeating-radial-gradient(ellipse at 108% 18%, transparent 0 49px, rgba(45, 78, 62, 0.08) 50px, transparent 51px) !important;
}
body.theme-light [data-vn-settings]:before,
body.theme-light .settings-page:before,
body.theme-light [data-settings-route]:before,
body.theme-light [data-surface="settings"]:before,
[data-aperture-mode="light"] [data-vn-settings]:before,
[data-aperture-mode="light"] .settings-page:before,
[data-aperture-mode="light"] [data-settings-route]:before,
[data-aperture-mode="light"] [data-surface="settings"]:before {
  background: repeating-radial-gradient(ellipse at 105% 88%, transparent 0 44px, rgba(45, 78, 62, 0.08) 45px, transparent 46px) !important;
}

/* Hide reader header when workspace is open */
[data-vn-shell][data-vn-workspace] [data-vn-reader-header],
[data-vn-workspace] [data-vn-reader-header] {
  display: none !important;
}

/* Hide duplicate settings header when inside workspace */
[data-workspace-content] [data-workspace-header],
[data-vn-settings] [data-workspace-header] {
  display: none !important;
}

/* Hide floating scene hud / location pin on reader */
[data-vn-scene-hud] {
  display: none !important;
}

/* Dialogue box layout & footer */
[data-vn-dialogue] {
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
}
.caption-foot,
[data-vn-dialogue-footer] {
  display: none !important;
}

/* World Lens active node, lens preview card, and CTA */
.map-node-pill.active {
  background: #dce9b5 !important;
  color: #1b342b !important;
  border-color: #ecf4cc !important;
  box-shadow: 0 10px 25px rgba(7, 18, 15, 0.42), 0 0 0 2px rgba(215, 235, 172, 0.23) !important;
}
.map-node-pill.active b {
  color: #1b342b !important;
}
.map-node-pill.active small {
  color: #385b4b !important;
}
.map-node-pill.active .index-dot {
  background: #dce9b5 !important;
  border-color: #19382f !important;
}
.world-lens {
  position: relative !important;
  inset: auto !important;
  margin: 10px 0 8px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  background: rgba(17, 41, 35, 0.96) !important;
  color: #f4f7ee !important;
  border: 1px solid #5c8674 !important;
  box-shadow: 0 13px 25px rgba(0, 0, 0, 0.33) !important;
  backdrop-filter: blur(13px) !important;
}
.world-lens h3 {
  color: #f7faf0 !important;
}
.world-lens p {
  color: #c3d7c8 !important;
}
.world-lens-cta {
  color: #dfedb1 !important;
  background: transparent !important;
  border: 0 !important;
  text-decoration: underline !important;
  text-underline-offset: 3px !important;
  cursor: pointer !important;
  font-weight: 700 !important;
  font-size: 11px !important;
  padding: 0 !important;
}

/* World Lens Sheet layout override */
[data-vn-reference-sheet] {
  display: block !important;
  overflow-y: auto !important;
  height: auto !important;
  max-height: none !important;
}
[data-vn-reference-sheet] > header {
  display: none !important;
}
.chip-row,
[data-reference-filters] {
  display: flex !important;
  flex: none !important;
  flex-wrap: nowrap !important;
  gap: 8px !important;
  margin: 12px 0 14px !important;
  min-height: 38px !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
}
.chip {
  flex: 0 0 auto !important;
  height: 34px !important;
  min-width: 68px !important;
  padding: 0 16px !important;
  border-radius: 999px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}
.observation-cell.observation-cell-wide {
  grid-column: 1 / -1 !important;
  padding-left: 0 !important;
}

/* Characters & Places Folio Text Contrast - Dark Mode */
.observation-cell span {
  color: #9cb5a8 !important;
  opacity: 1 !important;
  font-weight: 650 !important;
}
.observation-cell strong {
  color: #ffffff !important;
  font-weight: 700 !important;
}
.observation-cell em {
  color: #d6ecad !important;
  background: rgba(220, 238, 177, 0.2) !important;
}
[data-vn-dossier-card] dt {
  color: #a8c7b8 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
[data-vn-dossier-card] dd {
  color: #f2f7f0 !important;
  opacity: 1 !important;
}
section[data-reference-current] h3,
section[data-reference-observations] h3 {
  color: #dcebad !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
[data-dossier-present-cast] h3 {
  color: #dcebad !important;
  opacity: 1 !important;
}

/* History Workspace Surface */
[data-surface="history"],
[data-vn-workspace-tool="history"] {
  background: #11241c !important;
  color: #f3f7ee !important;
}

/* Light mode specific rules for World Lens & Folio */
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-vn-shell], [data-vn-root], [data-vn-dossier], [data-vn-dossier-card], [data-vn-reference-sheet], aside[data-vn-workspace], [data-vn-settings], .settings-page, [data-surface="history"], [data-vn-workspace-tool="history"]) {
  background: linear-gradient(147deg, #eef3e5 0%, #e8eee0 58%, #dce7d3 100%) !important;
  color: #172721 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-image-studio], [data-image-studio] section, .settings-page, [data-vn-settings] section, [data-vn-workspace] section) {
  background: #eef3e5 !important;
  color: #172721 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-image-studio] header, .settings-page header, [data-vn-settings] header) {
  background: #e4ebe0 !important;
  border-color: #bccdc0 !important;
  color: #172721 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-sheet-map {
  background: #dbe6db !important;
  border-color: #a9c2b2 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-map-svg path {
  stroke: #385950 !important;
  opacity: 0.52 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .map-node-pill {
  background: rgba(248, 251, 242, 0.98) !important;
  color: #19352a !important;
  border-color: #9bb1a5 !important;
  box-shadow: 0 4px 17px rgba(36, 66, 56, 0.15) !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .map-node-pill b {
  color: #19352a !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .map-node-pill small {
  color: #4e6e60 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .map-node-pill.active {
  background: #18362d !important;
  color: #f7f9ee !important;
  border-color: #18362d !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .map-node-pill.active b {
  color: #f7f9ee !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .map-node-pill.active small {
  color: #d3e6d8 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-lens {
  position: relative !important;
  inset: auto !important;
  margin: 10px 0 8px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  background: rgba(251, 252, 245, 0.97) !important;
  color: #19362a !important;
  border: 1px solid #c0cec2 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-lens h3 {
  color: #19362a !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-lens p {
  color: #455e51 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-lens-cta {
  color: #2b604b !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-strip button {
  background: #fbfdf5 !important;
  color: #1b392e !important;
  border: 1px solid #a3baaa !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-strip button b {
  color: #1c382f !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .world-strip button small {
  color: #546c5f !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .chip {
  color: #274638 !important;
  border-color: #8da997 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .chip.active {
  color: #f6f9eb !important;
  border-color: #244c38 !important;
  background: #244c38 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .observation-cell span {
  color: #2b5946 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .observation-cell strong {
  color: #12241d !important;
  font-weight: 700 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .observation-cell em {
  color: #1d4d38 !important;
  background: rgba(56, 102, 79, 0.15) !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-dossier-card] dt {
  color: #2b5946 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-dossier-card] dd {
  color: #142820 !important;
  opacity: 1 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) section[data-reference-current] h3,
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) section[data-reference-observations] h3 {
  color: #1e4533 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-reference-overview] {
  background: rgba(225, 238, 222, 0.85) !important;
  border: 1px solid rgba(86, 128, 107, 0.35) !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-dossier-present-cast] {
  background: rgba(225, 238, 222, 0.85) !important;
  border-color: rgba(86, 128, 107, 0.35) !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-dossier-present-cast] h3 {
  color: #1e4533 !important;
  opacity: 1 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-dossier-cast-chip] {
  color: #153226 !important;
  background: #e5eee2 !important;
  border-color: #8dafa0 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-reference-list] button {
  background: #fbfdf7 !important;
  border-color: #9cb5a7 !important;
  color: #142820 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-reference-row-title] {
  color: #142820 !important;
}
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-reference-snippet] {
  color: #3b5a4b !important;
  opacity: 1 !important;
}

/* Aperture Dialogue History & Backlog Replay */
[data-vn-backlog] {
  background: linear-gradient(180deg, rgba(8, 14, 18, 0.96) 0%, rgba(13, 22, 28, 0.98) 100%) !important;
  border: 1px solid rgba(134, 219, 178, 0.22) !important;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(16px) !important;
  border-radius: 16px !important;
}

[data-vn-backlog-item] {
  background: rgba(16, 26, 30, 0.75) !important;
  border: 1px solid rgba(134, 219, 178, 0.12) !important;
  border-radius: 12px !important;
  padding: 12px 16px !important;
  margin-bottom: 12px !important;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease !important;
}

[data-vn-backlog-item]:hover {
  background: rgba(22, 38, 42, 0.85) !important;
  border-color: rgba(134, 219, 178, 0.28) !important;
}

.backlog-item-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 6px !important;
}

[data-vn-backlog-speaker] {
  font-family: var(--font-header, system-ui, sans-serif) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #86dbb2 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

[data-vn-backlog-text] {
  font-size: 14.5px !important;
  line-height: 1.65 !important;
  color: #dbebe2 !important;
  margin: 0 !important;
}

.backlog-jump-btn {
  appearance: none !important;
  background: rgba(56, 102, 79, 0.35) !important;
  border: 1px solid rgba(134, 219, 178, 0.35) !important;
  border-radius: 6px !important;
  color: #a9e8cb !important;
  font-size: 11px !important;
  font-weight: 650 !important;
  padding: 3px 10px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  letter-spacing: 0.02em !important;
}

.backlog-jump-btn:hover {
  background: rgba(134, 219, 178, 0.25) !important;
  color: #ffffff !important;
  border-color: #86dbb2 !important;
  transform: translateY(-1px) !important;
}

.backlog-jump-btn:active {
  transform: translateY(0) scale(0.97) !important;
}

/* Speaking Voice Button Pulse Animation */
@keyframes aperture-voice-pulse {
  0% { box-shadow: 0 0 0 0 rgba(134, 219, 178, 0.6); }
  70% { box-shadow: 0 0 0 8px rgba(134, 219, 178, 0); }
  100% { box-shadow: 0 0 0 0 rgba(134, 219, 178, 0); }
}

[data-action="voice-toggle"].speaking {
  color: #86dbb2 !important;
  background: rgba(134, 219, 178, 0.18) !important;
  border-color: #86dbb2 !important;
  animation: aperture-voice-pulse 1.8s infinite !important;
}

/* Light Mode Overrides for Backlog */
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-backlog] {
  background: rgba(246, 250, 244, 0.98) !important;
  border-color: rgba(86, 128, 107, 0.35) !important;
  box-shadow: 0 24px 64px rgba(18, 38, 29, 0.22) !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-backlog-item] {
  background: #ffffff !important;
  border-color: rgba(86, 128, 107, 0.25) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-backlog-item]:hover {
  background: #f4f8f2 !important;
  border-color: rgba(86, 128, 107, 0.45) !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-backlog-speaker] {
  color: #184e36 !important;
  font-weight: 700 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-backlog-text] {
  color: #142820 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .backlog-jump-btn {
  background: #e5eee2 !important;
  border-color: #8dafa0 !important;
  color: #153226 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .backlog-jump-btn:hover {
  background: #2b5946 !important;
  border-color: #2b5946 !important;
  color: #ffffff !important;
}

/* Extension-wide Light Mode Text & Contrast Guarantee for Settings, Folios, Places & Workspaces */
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-cast-workspace], [data-place-workspace], [data-image-studio], [data-vn-panel-layer], [data-reader-workspace], [data-folio-body]) {
  color: #142820 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-cast-workspace], [data-place-workspace], [data-image-studio], [data-vn-panel-layer]) :is(p, span, label, small, strong, em, dt, dd, h2, h3, h4) {
  color: #142820 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-cast-workspace], [data-place-workspace], [data-image-studio], [data-vn-panel-layer]) :is(small, .muted, [data-muted]) {
  color: #4b6b5d !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-cast-workspace], [data-place-workspace], [data-image-studio], [data-vn-panel-layer]) :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea) {
  background-color: #ffffff !important;
  color: #142820 !important;
  border-color: rgba(86, 128, 107, 0.35) !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-cast-workspace], [data-place-workspace], [data-image-studio], [data-vn-panel-layer]) :is(button:not([data-action="voice-toggle"]):not(.launcher)) {
  background-color: #e5eee2 !important;
  color: #142820 !important;
  border-color: rgba(86, 128, 107, 0.35) !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) :is([data-cast-workspace], [data-place-workspace], [data-image-studio], [data-vn-panel-layer]) :is(button:not([data-action="voice-toggle"]):not(.launcher)):hover {
  background-color: #d6e4d2 !important;
  border-color: #56806b !important;
}

/* Reading Typography Modes */
[data-vn-root][data-vn-typography="novelist"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="novelist"] [data-vn-backlog-text] {
  font-family: Georgia, "Times New Roman", Garamond, serif !important;
  line-height: 1.7 !important;
}
[data-vn-root][data-vn-typography="modern"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="modern"] [data-vn-backlog-text] {
  font-family: -apple-system, BlinkMacSystemFont, "Outfit", "Inter", "Segoe UI", Roboto, sans-serif !important;
  line-height: 1.6 !important;
}
[data-vn-root][data-vn-typography="retro"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="retro"] [data-vn-backlog-text] {
  font-family: "Courier New", "JetBrains Mono", Consolas, ui-monospace, monospace !important;
  letter-spacing: 0.03em !important;
  line-height: 1.65 !important;
}
[data-vn-root][data-vn-typography="accessible"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="accessible"] [data-vn-backlog-text] {
  font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
  letter-spacing: 0.04em !important;
  line-height: 1.85 !important;
}

/* Cinematic Chapter Card Splash */
[data-vn-chapter-card] {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 45;
  pointer-events: auto;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity 0.45s ease;
}

[data-vn-chapter-card][data-vn-active="true"] {
  opacity: 1;
}

[data-vn-chapter-card]::before,
[data-vn-chapter-card]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 52px;
  background: #000000;
  z-index: 1;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
[data-vn-chapter-card]::before { top: 0; transform: translateY(-100%); }
[data-vn-chapter-card]::after { bottom: 0; transform: translateY(100%); }
[data-vn-chapter-card][data-vn-active="true"]::before,
[data-vn-chapter-card][data-vn-active="true"]::after {
  transform: translateY(0);
}

.chapter-card-inner {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 24px 32px;
  max-width: min(90%, 540px);
  background: linear-gradient(180deg, rgba(14, 24, 28, 0.94) 0%, rgba(8, 14, 18, 0.98) 100%);
  border: 1px solid rgba(134, 219, 178, 0.32);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transform: scale(0.95);
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-vn-chapter-card][data-vn-active="true"] .chapter-card-inner {
  transform: scale(1);
}

.chapter-eyebrow {
  display: inline-block;
  font-family: var(--font-header, system-ui, sans-serif);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.16em;
  color: #86dbb2;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.chapter-title {
  font-family: Georgia, "Cinzel", serif;
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 700;
  color: #f4fbf7;
  margin: 0 0 8px;
  line-height: 1.25;
}

.chapter-subtitle {
  font-size: 13.5px;
  line-height: 1.5;
  color: #9ab3a6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Dynamic Atmospheric Scene Tint. Scoped to the tint overlay only: the scene
   container also carries data-vn-atmosphere (for the descendant rules below),
   and the generic opacity:0 here would otherwise hide the whole picture layer. */
[data-vn-atmosphere]:not([data-vn-scene]) {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  opacity: 0;
  transition: opacity 1.2s ease, background-color 1.2s ease;
  mix-blend-mode: soft-light;
}

[data-vn-scene][data-vn-atmosphere="warm_amber"] [data-vn-atmosphere] {
  opacity: 0.35;
  background: radial-gradient(circle at 60% 40%, rgba(255, 160, 60, 0.55) 0%, rgba(220, 90, 20, 0.3) 70%, transparent 100%);
}

[data-vn-scene][data-vn-atmosphere="nocturne"] [data-vn-atmosphere] {
  opacity: 0.4;
  background: radial-gradient(circle at 50% 20%, rgba(80, 140, 255, 0.45) 0%, rgba(15, 30, 70, 0.55) 80%, rgba(5, 10, 25, 0.75) 100%);
}

[data-vn-scene][data-vn-atmosphere="cold_mist"] [data-vn-atmosphere] {
  opacity: 0.36;
  background: linear-gradient(180deg, rgba(160, 200, 220, 0.35) 0%, rgba(110, 150, 175, 0.28) 100%);
}

[data-vn-scene][data-vn-atmosphere="neon_violet"] [data-vn-atmosphere] {
  opacity: 0.34;
  background: linear-gradient(135deg, rgba(230, 60, 160, 0.35) 0%, rgba(90, 40, 220, 0.35) 60%, rgba(20, 200, 220, 0.28) 100%);
}

[data-vn-scene][data-vn-atmosphere="danger_crimson"] [data-vn-atmosphere] {
  opacity: 0.42;
  background: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.45) 0%, rgba(120, 10, 20, 0.6) 80%, rgba(20, 0, 5, 0.75) 100%);
  animation: sentimentPulseCrimson 3.5s ease-in-out infinite alternate;
}

[data-vn-scene][data-vn-atmosphere="sepia_flashback"] [data-vn-atmosphere] {
  opacity: 0.38;
  background: radial-gradient(ellipse at center, rgba(217, 119, 6, 0.35) 0%, rgba(120, 70, 20, 0.45) 75%, rgba(45, 25, 10, 0.65) 100%);
  filter: sepia(0.35) contrast(1.05);
}

[data-vn-scene][data-vn-atmosphere="romance_rose"] [data-vn-atmosphere] {
  opacity: 0.35;
  background: radial-gradient(circle at 50% 60%, rgba(244, 63, 94, 0.35) 0%, rgba(225, 29, 72, 0.22) 65%, transparent 100%);
  animation: sentimentBreathRose 4s ease-in-out infinite alternate;
}

@keyframes sentimentPulseCrimson {
  0% { opacity: 0.28; }
  100% { opacity: 0.46; }
}

@keyframes sentimentBreathRose {
  0% { opacity: 0.25; }
  100% { opacity: 0.38; }
}

/* Backlog Search Bar */
.backlog-search-row {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 8px 16px !important;
  border-bottom: 1px solid rgba(134, 219, 178, 0.14) !important;
}

[data-vn-backlog-search] {
  flex: 1 !important;
  min-height: 34px !important;
  padding: 6px 12px !important;
  font-size: 13px !important;
  background: rgba(16, 26, 30, 0.7) !important;
  border: 1px solid rgba(134, 219, 178, 0.22) !important;
  border-radius: 8px !important;
  color: #dbebe2 !important;
}

[data-vn-backlog-search]::placeholder {
  color: #7a9488 !important;
}

.backlog-search-count {
  font-size: 11px !important;
  color: #86dbb2 !important;
  font-weight: 600 !important;
  flex: none !important;
}

/* Light Mode Overrides for Search Bar & Chapter Card */
:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) [data-vn-backlog-search] {
  background: #ffffff !important;
  border-color: rgba(86, 128, 107, 0.35) !important;
  color: #142820 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .chapter-card-inner {
  background: linear-gradient(180deg, rgba(246, 250, 244, 0.98) 0%, rgba(235, 244, 232, 0.98) 100%) !important;
  border-color: rgba(86, 128, 107, 0.35) !important;
  box-shadow: 0 24px 64px rgba(18, 38, 29, 0.25) !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .chapter-title {
  color: #142820 !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .chapter-subtitle {
  color: #4b6b5d !important;
}

/* Anchor Trait Badges */
.tag.anchor-tag {
  background: rgba(134, 219, 178, 0.18) !important;
  color: #86dbb2 !important;
  border: 1px solid rgba(134, 219, 178, 0.35) !important;
  font-weight: 650 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 8px !important;
  border-radius: 999px !important;
  font-size: 11px !important;
}

:is(:host-context(body.theme-light), :host-context([data-aperture-mode="light"]), :host([data-aperture-mode="light"]), body.theme-light, [data-aperture-mode="light"], [data-vn-root][data-aperture-mode="light"]) .tag.anchor-tag {
  background: #e2ede5 !important;
  color: #184e36 !important;
  border-color: #8dafa0 !important;
}




/* =========================================================================
   APERTURE FULLSCREEN STAGE SCENE & IMAGE OVERLAY
   ========================================================================= */

/* VN Scene & Fullscreen Stage Background:
   The visual novel scene MUST always span 100% of the viewport (top: 0, bottom: 0, inset: 0).
   The dialogue box floats over the bottom portion of the image as a semi-transparent glassmorphic sheet.
   The user can hide the dialogue sheet at any time with the hide button to view the full uncluttered artwork. */
[data-vn-root] [data-vn-scene],
[data-vn-root][data-vn-adjustable-sheet] [data-vn-scene],
[data-vn-root][data-vn-reader-layout] [data-vn-scene],
[data-vn-root][data-vn-reader-layout="image-first"] [data-vn-scene],
[data-vn-scene] {
  position: absolute !important;
  inset: 0 !important;
  top: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  z-index: 1 !important;
}

[data-vn-root] [data-vn-scene-image],
[data-vn-scene] [data-vn-scene-image] {
  position: absolute !important;
  inset: 0 !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  object-fit: cover !important;
  object-position: center center !important;
}

[data-vn-root] [data-vn-scene-image][data-vn-scene-image-fit="contain"],
[data-vn-scene] [data-vn-scene-image][data-vn-scene-image-fit="contain"] {
  object-fit: contain !important;
}

/* =========================================================================
   APERTURE THEME SUITE PALETTES (Full UI Reskinning)
   ========================================================================= */

/* 1. Aperture Obsidian / Emerald (Host Default) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="lumiverse"],
[data-vn-root][data-vn-preset="lumiverse"] {
  --aperture-accent: #dcebad;
  --aperture-accent-hover: #ecf8cd;
  --aperture-accent-contrast: #11241c;
  --aperture-accent-glow: rgba(220, 238, 173, 0.35);
  --aperture-text: #eff4e9;
  --aperture-muted: #9cb5a8;
  --aperture-dialogue-bg: rgba(4, 13, 17, var(--caption-opacity, 0.76));
  --aperture-dialogue-border: rgba(224, 238, 217, 0.32);
  --aperture-bottom-bar-bg: rgba(7, 16, 13, 0.94);
  --aperture-bottom-bar-border: rgba(160, 205, 185, 0.16);
  --aperture-button-bg: rgba(14, 30, 24, 0.92);
  --aperture-button-border: rgba(160, 205, 185, 0.3);
  --aperture-button-text: #edf3ea;
  --aperture-button-hover-bg: rgba(35, 75, 57, 0.95);
  --aperture-input-form-bg: rgba(11, 24, 18, 0.92);
  --aperture-input-bg: rgba(6, 14, 11, 0.8);
  --aperture-choice-bg: rgba(11, 24, 18, 0.92);
  --aperture-choice-border: rgba(160, 205, 185, 0.28);
  --aperture-choice-hover-bg: rgba(35, 75, 57, 0.95);
  --vn-shell-panel: #111a1e;
  --vn-shell-field: #182429;
  --vn-shell-button: #23342e;
  --vn-shell-text: #eff4e9;
  --vn-shell-muted: #a4bbb1;
  --vn-shell-border: rgba(220, 238, 217, 0.14);
  --vn-shell-accent: #dce9b5;
  --vn-shell-accent-contrast: #1c3525;
}
[data-vn-root][data-vn-preset="lumiverse"] [data-vn-dialogue] {
  border-color: rgba(224, 238, 217, 0.32) !important;
  background: rgba(4, 13, 17, var(--caption-opacity, 0.76)) !important;
}
[data-vn-root][data-vn-preset="lumiverse"] [data-vn-speaker] {
  color: #e0eeb1 !important;
  background: rgba(12, 24, 20, 0.9) !important;
  border-color: rgba(224, 238, 217, 0.35) !important;
}

/* 2. Aperture Sage Editorial (Modern Light) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="paper-novel"],
[data-vn-root][data-vn-preset="paper-novel"] {
  --aperture-accent: #24533e;
  --aperture-accent-hover: #1a3e2e;
  --aperture-accent-contrast: #f4f7eb;
  --aperture-accent-glow: rgba(36, 83, 62, 0.25);
  --aperture-text: #172721;
  --aperture-muted: #53685f;
  --aperture-dialogue-bg: rgba(246, 248, 244, var(--caption-opacity, 0.92));
  --aperture-dialogue-border: rgba(46, 96, 71, 0.38);
  --aperture-bottom-bar-bg: rgba(238, 243, 232, 0.96);
  --aperture-bottom-bar-border: rgba(53, 80, 69, 0.2);
  --aperture-button-bg: rgba(225, 234, 218, 0.95);
  --aperture-button-border: rgba(46, 96, 71, 0.3);
  --aperture-button-text: #172721;
  --aperture-button-hover-bg: rgba(205, 220, 196, 0.98);
  --aperture-input-form-bg: rgba(244, 247, 240, 0.95);
  --aperture-input-bg: rgba(255, 255, 255, 0.9);
  --aperture-choice-bg: rgba(240, 245, 235, 0.95);
  --aperture-choice-border: rgba(46, 96, 71, 0.25);
  --aperture-choice-hover-bg: rgba(220, 235, 212, 0.98);
  --vn-shell-panel: #eef3e5;
  --vn-shell-field: #ffffff;
  --vn-shell-button: #d8e5d5;
  --vn-shell-text: #172721;
  --vn-shell-muted: #53685f;
  --vn-shell-border: rgba(53, 80, 69, 0.18);
  --vn-shell-accent: #24533e;
  --vn-shell-accent-contrast: #f4f7eb;
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-dialogue] {
  border-color: rgba(46, 96, 71, 0.38) !important;
  background: rgba(246, 248, 244, var(--caption-opacity, 0.92)) !important;
  color: #172721 !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-dialogue-text] {
  color: #172721 !important;
  text-shadow: none !important;
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-speaker] {
  color: #1a4f36 !important;
  background: #e7efe4 !important;
  border-color: rgba(46, 96, 71, 0.4) !important;
}

/* 3. Aperture Midnight OLED (Ultra Dark Mint) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="midnight-noir"],
[data-vn-root][data-vn-preset="midnight-noir"] {
  --aperture-accent: #6ee7b7;
  --aperture-accent-hover: #a7f3d0;
  --aperture-accent-contrast: #021a11;
  --aperture-accent-glow: rgba(110, 231, 183, 0.35);
  --aperture-text: #f8fafc;
  --aperture-muted: #94a3b8;
  --aperture-dialogue-bg: rgba(0, 0, 0, var(--caption-opacity, 0.94));
  --aperture-dialogue-border: rgba(110, 231, 183, 0.38);
  --aperture-bottom-bar-bg: rgba(2, 3, 5, 0.96);
  --aperture-bottom-bar-border: rgba(110, 231, 183, 0.2);
  --aperture-button-bg: rgba(10, 15, 13, 0.94);
  --aperture-button-border: rgba(110, 231, 183, 0.3);
  --aperture-button-text: #f8fafc;
  --aperture-button-hover-bg: rgba(20, 40, 30, 0.95);
  --aperture-input-form-bg: rgba(5, 8, 7, 0.95);
  --aperture-input-bg: rgba(0, 0, 0, 0.9);
  --aperture-choice-bg: rgba(8, 12, 10, 0.94);
  --aperture-choice-border: rgba(110, 231, 183, 0.28);
  --aperture-choice-hover-bg: rgba(18, 38, 28, 0.96);
  --vn-shell-panel: #07090b;
  --vn-shell-field: #0e1215;
  --vn-shell-button: #13221b;
  --vn-shell-text: #f8fafc;
  --vn-shell-muted: #80998f;
  --vn-shell-border: rgba(110, 231, 183, 0.18);
  --vn-shell-accent: #6ee7b7;
  --vn-shell-accent-contrast: #021a11;
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-dialogue] {
  border-color: rgba(110, 231, 183, 0.38) !important;
  background: rgba(0, 0, 0, var(--caption-opacity, 0.94)) !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(110, 231, 183, 0.15) !important;
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-dialogue-text] {
  color: #f8fafc !important;
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-speaker] {
  color: #6ee7b7 !important;
  background: #050508 !important;
  border-color: rgba(110, 231, 183, 0.4) !important;
}

/* 4. Aperture Solar Dusk (Warm Amber) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="golden-hour"],
[data-vn-root][data-vn-preset="golden-hour"] {
  --aperture-accent: #f59e0b;
  --aperture-accent-hover: #fbbf24;
  --aperture-accent-contrast: #241403;
  --aperture-accent-glow: rgba(245, 158, 11, 0.35);
  --aperture-text: #fef3c7;
  --aperture-muted: #d97706;
  --aperture-dialogue-bg: rgba(26, 17, 8, var(--caption-opacity, 0.88));
  --aperture-dialogue-border: rgba(245, 158, 11, 0.45);
  --aperture-bottom-bar-bg: rgba(18, 12, 6, 0.95);
  --aperture-bottom-bar-border: rgba(245, 158, 11, 0.22);
  --aperture-button-bg: rgba(32, 20, 10, 0.94);
  --aperture-button-border: rgba(245, 158, 11, 0.32);
  --aperture-button-text: #fef3c7;
  --aperture-button-hover-bg: rgba(55, 34, 15, 0.95);
  --aperture-input-form-bg: rgba(28, 18, 9, 0.95);
  --aperture-input-bg: rgba(15, 9, 4, 0.88);
  --aperture-choice-bg: rgba(28, 18, 9, 0.94);
  --aperture-choice-border: rgba(245, 158, 11, 0.3);
  --aperture-choice-hover-bg: rgba(55, 34, 15, 0.96);
  --vn-shell-panel: #1a1208;
  --vn-shell-field: #241a0e;
  --vn-shell-button: #352210;
  --vn-shell-text: #fef3c7;
  --vn-shell-muted: #d4a359;
  --vn-shell-border: rgba(245, 158, 11, 0.22);
  --vn-shell-accent: #f59e0b;
  --vn-shell-accent-contrast: #241403;
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-dialogue] {
  border-color: rgba(245, 158, 11, 0.45) !important;
  background: rgba(26, 17, 8, var(--caption-opacity, 0.86)) !important;
  box-shadow: 0 16px 44px rgba(45, 22, 6, 0.4), inset 0 1px 0 rgba(254, 215, 170, 0.2) !important;
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-dialogue-text] {
  color: #fef3c7 !important;
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-speaker] {
  color: #fbbf24 !important;
  background: #24160a !important;
  border-color: rgba(245, 158, 11, 0.4) !important;
}

/* 5. Aperture Minimal Slate (Studio Slate / Ice Blue) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="boxed-console"],
[data-vn-root][data-vn-preset="boxed-console"] {
  --aperture-accent: #94a3b8;
  --aperture-accent-hover: #cbd5e1;
  --aperture-accent-contrast: #0f172a;
  --aperture-accent-glow: rgba(148, 163, 184, 0.35);
  --aperture-text: #f1f5f9;
  --aperture-muted: #64748b;
  --aperture-dialogue-bg: rgba(15, 23, 42, var(--caption-opacity, 0.88));
  --aperture-dialogue-border: rgba(148, 163, 184, 0.35);
  --aperture-bottom-bar-bg: rgba(10, 15, 28, 0.95);
  --aperture-bottom-bar-border: rgba(148, 163, 184, 0.2);
  --aperture-button-bg: rgba(22, 32, 54, 0.92);
  --aperture-button-border: rgba(148, 163, 184, 0.3);
  --aperture-button-text: #f1f5f9;
  --aperture-button-hover-bg: rgba(35, 48, 78, 0.95);
  --aperture-input-form-bg: rgba(18, 27, 48, 0.94);
  --aperture-input-bg: rgba(9, 13, 24, 0.85);
  --aperture-choice-bg: rgba(18, 27, 48, 0.92);
  --aperture-choice-border: rgba(148, 163, 184, 0.25);
  --aperture-choice-hover-bg: rgba(35, 48, 78, 0.95);
  --vn-shell-panel: #0f172a;
  --vn-shell-field: #1e293b;
  --vn-shell-button: #334155;
  --vn-shell-text: #f1f5f9;
  --vn-shell-muted: #94a3b8;
  --vn-shell-border: rgba(148, 163, 184, 0.22);
  --vn-shell-accent: #94a3b8;
  --vn-shell-accent-contrast: #0f172a;
}
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-dialogue] {
  border-color: rgba(148, 163, 184, 0.35) !important;
  background: rgba(15, 23, 42, var(--caption-opacity, 0.88)) !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-dialogue-text] {
  color: #f1f5f9 !important;
}
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-speaker] {
  color: #94a3b8 !important;
  background: #1e293b !important;
  border-color: rgba(148, 163, 184, 0.4) !important;
}

/* 6. Aperture Cyber Amethyst (Vibrant Violet Neon) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="yamaku-classic"],
[data-vn-root][data-vn-preset="yamaku-classic"] {
  --aperture-accent: #c084fc;
  --aperture-accent-hover: #e879f9;
  --aperture-accent-contrast: #1e0836;
  --aperture-accent-glow: rgba(192, 132, 252, 0.38);
  --aperture-text: #faf5ff;
  --aperture-muted: #a855f7;
  --aperture-dialogue-bg: rgba(20, 10, 36, var(--caption-opacity, 0.88));
  --aperture-dialogue-border: rgba(192, 132, 252, 0.42);
  --aperture-bottom-bar-bg: rgba(14, 7, 26, 0.95);
  --aperture-bottom-bar-border: rgba(192, 132, 252, 0.22);
  --aperture-button-bg: rgba(28, 14, 48, 0.92);
  --aperture-button-border: rgba(192, 132, 252, 0.32);
  --aperture-button-text: #faf5ff;
  --aperture-button-hover-bg: rgba(48, 22, 82, 0.95);
  --aperture-input-form-bg: rgba(24, 12, 42, 0.94);
  --aperture-input-bg: rgba(12, 5, 22, 0.85);
  --aperture-choice-bg: rgba(24, 12, 42, 0.92);
  --aperture-choice-border: rgba(192, 132, 252, 0.28);
  --aperture-choice-hover-bg: rgba(48, 22, 82, 0.95);
  --vn-shell-panel: #150a22;
  --vn-shell-field: #200e35;
  --vn-shell-button: #341755;
  --vn-shell-text: #faf5ff;
  --vn-shell-muted: #b97dec;
  --vn-shell-border: rgba(192, 132, 252, 0.24);
  --vn-shell-accent: #c084fc;
  --vn-shell-accent-contrast: #1e0836;
}
[data-vn-root][data-vn-preset="yamaku-classic"] [data-vn-dialogue] {
  border-color: rgba(192, 132, 252, 0.42) !important;
  background: rgba(20, 10, 36, var(--caption-opacity, 0.88)) !important;
  box-shadow: 0 16px 44px rgba(35, 10, 60, 0.4), inset 0 1px 0 rgba(233, 213, 255, 0.2) !important;
}
[data-vn-root][data-vn-preset="yamaku-classic"] [data-vn-dialogue-text] {
  color: #faf5ff !important;
}
[data-vn-root][data-vn-preset="yamaku-classic"] [data-vn-speaker] {
  color: #c084fc !important;
  background: #1c0d32 !important;
  border-color: rgba(192, 132, 252, 0.4) !important;
}

/* 7. Aperture Rose Blossom (Pastel Elegance) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="literature-club"],
[data-vn-root][data-vn-preset="literature-club"] {
  --aperture-accent: #fb7185;
  --aperture-accent-hover: #fda4af;
  --aperture-accent-contrast: #280710;
  --aperture-accent-glow: rgba(251, 113, 133, 0.38);
  --aperture-text: #fff1f2;
  --aperture-muted: #f43f5e;
  --aperture-dialogue-bg: rgba(35, 12, 24, var(--caption-opacity, 0.86));
  --aperture-dialogue-border: rgba(251, 113, 133, 0.42);
  --aperture-bottom-bar-bg: rgba(24, 8, 16, 0.95);
  --aperture-bottom-bar-border: rgba(251, 113, 133, 0.22);
  --aperture-button-bg: rgba(45, 14, 28, 0.92);
  --aperture-button-border: rgba(251, 113, 133, 0.32);
  --aperture-button-text: #fff1f2;
  --aperture-button-hover-bg: rgba(70, 20, 42, 0.95);
  --aperture-input-form-bg: rgba(40, 13, 26, 0.94);
  --aperture-input-bg: rgba(18, 5, 12, 0.85);
  --aperture-choice-bg: rgba(40, 13, 26, 0.92);
  --aperture-choice-border: rgba(251, 113, 133, 0.28);
  --aperture-choice-hover-bg: rgba(70, 20, 42, 0.95);
  --vn-shell-panel: #200a15;
  --vn-shell-field: #2e0f1f;
  --vn-shell-button: #44142d;
  --vn-shell-text: #fff1f2;
  --vn-shell-muted: #e78297;
  --vn-shell-border: rgba(251, 113, 133, 0.22);
  --vn-shell-accent: #fb7185;
  --vn-shell-accent-contrast: #280710;
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-dialogue] {
  border-color: rgba(251, 113, 133, 0.42) !important;
  background: rgba(35, 12, 24, var(--caption-opacity, 0.86)) !important;
  box-shadow: 0 16px 40px rgba(60, 10, 30, 0.35), inset 0 1px 0 rgba(254, 205, 211, 0.2) !important;
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-dialogue-text] {
  color: #fff1f2 !important;
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-speaker] {
  color: #fb7185 !important;
  background: #2a0e1c !important;
  border-color: rgba(251, 113, 133, 0.4) !important;
}

/* 8. Aperture Astral Glass (Cosmic Cyan & Deep Blue) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="astral-glass"],
[data-vn-root][data-vn-preset="astral-glass"] {
  --aperture-accent: #38bdf8;
  --aperture-accent-hover: #7dd3fc;
  --aperture-accent-contrast: #032030;
  --aperture-accent-glow: rgba(56, 189, 248, 0.38);
  --aperture-text: #f0f9ff;
  --aperture-muted: #0284c7;
  --aperture-dialogue-bg: rgba(8, 20, 36, var(--caption-opacity, 0.88));
  --aperture-dialogue-border: rgba(56, 189, 248, 0.38);
  --aperture-bottom-bar-bg: rgba(5, 14, 25, 0.95);
  --aperture-bottom-bar-border: rgba(56, 189, 248, 0.2);
  --aperture-button-bg: rgba(12, 28, 48, 0.92);
  --aperture-button-border: rgba(56, 189, 248, 0.3);
  --aperture-button-text: #f0f9ff;
  --aperture-button-hover-bg: rgba(20, 48, 80, 0.95);
  --aperture-input-form-bg: rgba(10, 24, 42, 0.94);
  --aperture-input-bg: rgba(4, 11, 20, 0.85);
  --aperture-choice-bg: rgba(10, 24, 42, 0.92);
  --aperture-choice-border: rgba(56, 189, 248, 0.25);
  --aperture-choice-hover-bg: rgba(20, 48, 80, 0.95);
  --vn-shell-panel: #061528;
  --vn-shell-field: #0a203c;
  --vn-shell-button: #11335c;
  --vn-shell-text: #f0f9ff;
  --vn-shell-muted: #64b5f6;
  --vn-shell-border: rgba(56, 189, 248, 0.22);
  --vn-shell-accent: #38bdf8;
  --vn-shell-accent-contrast: #032030;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-dialogue] {
  border-color: rgba(56, 189, 248, 0.38) !important;
  background: rgba(8, 20, 36, var(--caption-opacity, 0.88)) !important;
  box-shadow: 0 16px 44px rgba(6, 25, 50, 0.4), inset 0 1px 0 rgba(186, 230, 253, 0.2) !important;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-dialogue-text] {
  color: #f0f9ff !important;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-speaker] {
  color: #38bdf8 !important;
  background: #091a2e !important;
  border-color: rgba(56, 189, 248, 0.4) !important;
}

/* 9. Aperture Neon Rain (Electric Mint & Cyberpunk Indigo) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="neon-rain"],
[data-vn-root][data-vn-preset="neon-rain"] {
  --aperture-accent: #2dd4bf;
  --aperture-accent-hover: #5eead4;
  --aperture-accent-contrast: #022420;
  --aperture-accent-glow: rgba(45, 212, 191, 0.38);
  --aperture-text: #f0fdfa;
  --aperture-muted: #0d9488;
  --aperture-dialogue-bg: rgba(12, 20, 32, var(--caption-opacity, 0.9));
  --aperture-dialogue-border: rgba(45, 212, 191, 0.4);
  --aperture-bottom-bar-bg: rgba(8, 14, 22, 0.95);
  --aperture-bottom-bar-border: rgba(45, 212, 191, 0.22);
  --aperture-button-bg: rgba(14, 26, 38, 0.92);
  --aperture-button-border: rgba(45, 212, 191, 0.32);
  --aperture-button-text: #f0fdfa;
  --aperture-button-hover-bg: rgba(22, 45, 60, 0.95);
  --aperture-input-form-bg: rgba(13, 22, 34, 0.94);
  --aperture-input-bg: rgba(6, 11, 18, 0.85);
  --aperture-choice-bg: rgba(13, 22, 34, 0.92);
  --aperture-choice-border: rgba(45, 212, 191, 0.28);
  --aperture-choice-hover-bg: rgba(22, 45, 60, 0.95);
  --vn-shell-panel: #0a131e;
  --vn-shell-field: #101e2e;
  --vn-shell-button: #193248;
  --vn-shell-text: #f0fdfa;
  --vn-shell-muted: #6ee7b7;
  --vn-shell-border: rgba(45, 212, 191, 0.24);
  --vn-shell-accent: #2dd4bf;
  --vn-shell-accent-contrast: #022420;
}
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-dialogue] {
  border-color: rgba(45, 212, 191, 0.4) !important;
  background: rgba(12, 20, 32, var(--caption-opacity, 0.9)) !important;
  box-shadow: 0 16px 44px rgba(10, 25, 35, 0.4), inset 0 1px 0 rgba(204, 251, 241, 0.2) !important;
}
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-dialogue-text] {
  color: #f0fdfa !important;
}
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-speaker] {
  color: #2dd4bf !important;
  background: #091722 !important;
  border-color: rgba(45, 212, 191, 0.4) !important;
}

/* 10. Aperture Obsidian Reliquary (Crimson & Gold) */
:is([data-vn-root], [data-vn-shell], :host, body)[data-vn-preset="obsidian-reliquary"],
[data-vn-root][data-vn-preset="obsidian-reliquary"] {
  --aperture-accent: #f59e0b;
  --aperture-accent-hover: #fbbf24;
  --aperture-accent-contrast: #241202;
  --aperture-accent-glow: rgba(245, 158, 11, 0.38);
  --aperture-text: #fffbeb;
  --aperture-muted: #dc2626;
  --aperture-dialogue-bg: rgba(28, 8, 12, var(--caption-opacity, 0.9));
  --aperture-dialogue-border: rgba(220, 38, 38, 0.45);
  --aperture-bottom-bar-bg: rgba(18, 5, 8, 0.96);
  --aperture-bottom-bar-border: rgba(220, 38, 38, 0.22);
  --aperture-button-bg: rgba(32, 9, 14, 0.94);
  --aperture-button-border: rgba(220, 38, 38, 0.35);
  --aperture-button-text: #fffbeb;
  --aperture-button-hover-bg: rgba(55, 15, 24, 0.95);
  --aperture-input-form-bg: rgba(30, 8, 13, 0.95);
  --aperture-input-bg: rgba(15, 4, 7, 0.88);
  --aperture-choice-bg: rgba(30, 8, 13, 0.94);
  --aperture-choice-border: rgba(220, 38, 38, 0.3);
  --aperture-choice-hover-bg: rgba(55, 15, 24, 0.96);
  --vn-shell-panel: #1a060a;
  --vn-shell-field: #260a0f;
  --vn-shell-button: #3d1018;
  --vn-shell-text: #fffbeb;
  --vn-shell-muted: #e57373;
  --vn-shell-border: rgba(220, 38, 38, 0.24);
  --vn-shell-accent: #f59e0b;
  --vn-shell-accent-contrast: #241202;
}
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-dialogue] {
  border-color: rgba(220, 38, 38, 0.45) !important;
  background: rgba(28, 8, 12, var(--caption-opacity, 0.9)) !important;
  box-shadow: 0 16px 44px rgba(40, 5, 10, 0.45), inset 0 1px 0 rgba(254, 202, 202, 0.2) !important;
}
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-dialogue-text] {
  color: #fffbeb !important;
}
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-speaker] {
  color: #f59e0b !important;
  background: #24080d !important;
  border-color: rgba(220, 38, 38, 0.45) !important;
}

`;
