/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
import { VN_SHELL_PRESET_TOKENS_CSS } from "../palette-tokens.js";

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
  z-index: 120 !important;
  background: var(--vn-shell-surface-gradient, var(--aperture-workspace-bg, #101a1e)) !important;
  color: var(--vn-shell-text, var(--aperture-text, #eff4e9)) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

[data-workspace-heading],
aside[data-vn-workspace] > header {
  height: auto !important;
  min-height: calc(56px + env(safe-area-inset-top, 0px)) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  padding: env(safe-area-inset-top, 0px) max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px)) !important;
  background: var(--vn-shell-panel, rgba(15, 23, 42, 0.96)) !important;
  border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14)) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  color: var(--vn-shell-text, #f4f8ee) !important;
  z-index: 2 !important;
  box-sizing: border-box !important;
}

[data-workspace-heading] > div,
aside[data-vn-workspace] > header > div {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

[data-workspace-title],
[data-workspace-heading] h2 {
  font-family: var(--vn-shell-display-font, Georgia, serif) !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  margin: 0 !important;
  color: var(--vn-shell-text, #f4f8ee) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

[data-workspace-subtitle] {
  font-size: 10px !important;
  color: var(--vn-shell-muted, #9cb5a8) !important;
  margin: 2px 0 0 !important;
  letter-spacing: 0.04em !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

[data-workspace-back],
.workspace-back-btn:not(.has-label),
[data-workspace-close] {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50% !important;
  background: var(--vn-shell-button, rgba(255, 255, 255, 0.08)) !important;
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.18)) !important;
  color: var(--vn-shell-text, #edf3ea) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: background 0.15s ease, border-color 0.15s ease !important;
}

[data-workspace-back]:hover,
.workspace-back-btn:not(.has-label):hover,
[data-workspace-close]:hover {
  background: color-mix(in srgb, var(--vn-shell-accent, #38bdf8) 18%, transparent) !important;
  border-color: var(--vn-shell-accent, #38bdf8) !important;
}

.workspace-back-btn.has-label {
  min-height: 44px;
  border-radius: 8px !important;
  padding: 0 12px !important;
  width: auto !important;
  min-width: auto !important;
  background: var(--vn-shell-button, rgba(255, 255, 255, 0.08)) !important;
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.18)) !important;
  color: var(--vn-shell-text, #edf3ea) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
  flex: none !important;
  cursor: pointer !important;
}
.workspace-back-btn.has-label:hover {
  background: color-mix(in srgb, var(--vn-shell-accent, #38bdf8) 18%, transparent) !important;
  border-color: var(--vn-shell-accent, #38bdf8) !important;
}

[data-workspace-content] {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 12px 14px calc(18px + env(safe-area-inset-bottom, 0px)) !important;
  box-sizing: border-box !important;
  position: relative !important;
  z-index: 1 !important;
}

[data-workspace-content]:has(> [data-vn-workspace-tool="history"]),
[data-workspace-content]:has(> [data-vn-workspace-tool="character"]),
[data-workspace-content]:has(> [data-vn-workspace-tool="artwork"]),
[data-workspace-content]:has(> [data-character-folio]),
[data-workspace-content]:has(> .character-folio-surface),
[data-workspace-content]:has(> [data-vn-image-studio]),
[data-surface="history"] [data-workspace-content],
[data-surface="character"] [data-workspace-content],
[data-surface="artwork"] [data-workspace-content],
[data-vn-workspace="history"] [data-workspace-content],
[data-vn-workspace="character"] [data-workspace-content],
[data-vn-workspace="artwork"] [data-workspace-content] {
  padding: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
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
  background: var(--vn-shell-surface-gradient, var(--aperture-workspace-bg, #101a1e)) !important;
  color: var(--vn-shell-text, var(--aperture-text, #eff4e9)) !important;
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
  background: var(--vn-shell-panel, rgba(17, 31, 31, 0.92)) !important;
  border-bottom: 1px solid var(--vn-shell-border, rgba(220, 238, 217, 0.12)) !important;
  backdrop-filter: blur(16px) !important;
  z-index: 10 !important;
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
  background: repeating-radial-gradient(ellipse at 102% 96%, transparent 0 59px, var(--aperture-ring-color, rgba(140, 195, 160, 0.12)) 60px, transparent 61px) !important;
}
[data-vn-reference-sheet]:before,
[data-surface="world"]:before {
  background: repeating-radial-gradient(circle at -12% 35%, transparent 0 52px, var(--aperture-ring-color, rgba(140, 195, 160, 0.12)) 53px, transparent 54px) !important;
}
[data-vn-dossier]:before,
[data-vn-dossier-card]:before,
[data-surface="character"]:before {
  background: repeating-radial-gradient(ellipse at 108% 18%, transparent 0 49px, var(--aperture-ring-color, rgba(140, 195, 160, 0.12)) 50px, transparent 51px) !important;
}
[data-vn-settings]:before,
.settings-page:before,
[data-settings-route]:before,
[data-surface="settings"]:before {
  background: repeating-radial-gradient(ellipse at 105% 88%, transparent 0 44px, var(--vn-shell-ring, var(--aperture-ring-color, rgba(140, 195, 160, 0.12))) 45px, transparent 46px) !important;
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
.map-node-pill {
  background: var(--aperture-accent-surface, rgba(20, 32, 28, 0.95)) !important;
  color: var(--aperture-text, #eff4e9) !important;
  border: 1px solid var(--aperture-button-border, rgba(160, 205, 185, 0.3)) !important;
}
.map-node-pill b {
  color: var(--aperture-text, #eff4e9) !important;
}
.map-node-pill small {
  color: var(--aperture-muted, #9cb5a8) !important;
}
.map-node-pill.active {
  background: var(--aperture-accent, #dce9b5) !important;
  color: var(--aperture-accent-contrast, #1b342b) !important;
  border-color: var(--aperture-accent, #ecf4cc) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.42), 0 0 0 2px var(--aperture-accent-glow, rgba(220, 238, 173, 0.35)) !important;
}
.map-node-pill.active b {
  color: var(--aperture-accent-contrast, #1b342b) !important;
}
.map-node-pill.active small {
  color: var(--aperture-accent-contrast, #385b4b) !important;
  opacity: 0.82 !important;
}
.map-node-pill.active .index-dot {
  background: var(--aperture-accent, #dce9b5) !important;
  border-color: var(--aperture-accent-contrast, #19382f) !important;
}
.world-lens {
  position: relative !important;
  inset: auto !important;
  margin: 10px 0 8px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  background: var(--aperture-workspace-bg, rgba(17, 41, 35, 0.96)) !important;
  color: var(--aperture-text, #f4f7ee) !important;
  border: 1px solid var(--aperture-button-border, #5c8674) !important;
  box-shadow: 0 13px 25px rgba(0, 0, 0, 0.33) !important;
  backdrop-filter: blur(13px) !important;
}
.world-lens h3 {
  color: var(--aperture-text, #f7faf0) !important;
}
.world-lens p {
  color: var(--aperture-muted, #c3d7c8) !important;
}
.world-lens-cta {
  color: var(--aperture-accent, #dfedb1) !important;
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
[data-vn-reference-sheet] > header,
[data-vn-dossier-card] > header {
  position: sticky !important;
  top: 0 !important;
  height: 56px !important;
  min-height: 56px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 16px !important;
  margin: 0 -18px 12px -18px !important;
  background: var(--vn-shell-panel, rgba(15, 23, 42, 0.96)) !important;
  border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14)) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  z-index: 10 !important;
  box-sizing: border-box !important;
  color: var(--vn-shell-text, #f0fdfa) !important;
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
  min-height: 44px;
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

/* Characters & Places Folio Text Contrast — Preset Driven */
.observation-cell span {
  color: var(--vn-shell-muted, #9cb5a8) !important;
  opacity: 1 !important;
  font-weight: 650 !important;
}
.observation-cell strong {
  color: var(--vn-shell-text, #ffffff) !important;
  font-weight: 700 !important;
}
.observation-cell em {
  color: var(--vn-shell-accent, #d6ecad) !important;
  background: color-mix(in srgb, var(--vn-shell-accent, #dcebad) 18%, transparent) !important;
}
[data-vn-dossier-card] dt {
  color: var(--vn-shell-muted, #a8c7b8) !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
[data-vn-dossier-card] dd {
  color: var(--vn-shell-text, #f2f7f0) !important;
  opacity: 1 !important;
}
section[data-reference-current] h3,
section[data-reference-observations] h3 {
  color: var(--vn-shell-accent, #dcebad) !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}
[data-dossier-present-cast] h3 {
  color: var(--vn-shell-accent, #dcebad) !important;
  opacity: 1 !important;
}

/* History Workspace Surface */
[data-surface="history"],
[data-vn-workspace-tool="history"] {
  background: var(--vn-shell-surface-gradient, var(--aperture-workspace-bg, #11241c)) !important;
  color: var(--vn-shell-text, var(--aperture-text, #f3f7ee)) !important;
  height: 100% !important;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
}





/* Aperture Dialogue History & Backlog Replay */
[data-vn-backlog] {
  background: var(--vn-shell-panel, #0d161c) !important;
  border: 1px solid var(--vn-shell-border, rgba(134, 219, 178, 0.22)) !important;
  box-shadow: var(--vn-shell-shadow, 0 24px 64px rgba(0, 0, 0, 0.65)) !important;
  backdrop-filter: blur(16px) !important;
  border-radius: var(--vn-shell-radius, 16px) !important;
}

[data-vn-backlog-item] {
  background: var(--vn-shell-field, rgba(16, 26, 30, 0.75)) !important;
  border: 1px solid var(--vn-shell-border, rgba(134, 219, 178, 0.12)) !important;
  border-radius: min(var(--vn-shell-radius, 12px), 12px) !important;
  padding: 12px 16px !important;
  margin-bottom: 12px !important;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease !important;
}

[data-vn-backlog-item]:hover {
  background: var(--vn-shell-hover-bg, rgba(22, 38, 42, 0.85)) !important;
  border-color: var(--vn-shell-accent, rgba(134, 219, 178, 0.35)) !important;
}

.backlog-item-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 6px !important;
}

[data-vn-backlog-speaker] {
  font-family: var(--vn-shell-display-font, var(--font-header, system-ui, sans-serif)) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: var(--vn-shell-accent, #86dbb2) !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

[data-vn-backlog-text] {
  font-size: 14.5px !important;
  line-height: 1.48 !important;
  color: var(--vn-shell-text, #dbebe2) !important;
  margin: 0 !important;
}

.backlog-jump-btn {
  appearance: none !important;
  background: var(--vn-shell-button, rgba(56, 102, 79, 0.35)) !important;
  border: 1px solid var(--vn-shell-border, rgba(134, 219, 178, 0.35)) !important;
  border-radius: min(var(--vn-shell-radius, 8px), 8px) !important;
  color: var(--vn-shell-accent, #a9e8cb) !important;
  font-size: 11px !important;
  font-weight: 650 !important;
  padding: 3px 10px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  letter-spacing: 0.02em !important;
}

.backlog-jump-btn:hover {
  background: var(--vn-shell-accent, #86dbb2) !important;
  color: var(--vn-shell-accent-contrast, #081218) !important;
  border-color: var(--vn-shell-accent, #86dbb2) !important;
  transform: translateY(-1px) !important;
}

.backlog-jump-btn:active {
  transform: translateY(0) scale(0.97) !important;
}

/* Speaking Voice Button Pulse Animation */
@keyframes aperture-voice-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--vn-shell-accent, #86dbb2) 55%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

[data-action="voice-toggle"].speaking {
  color: var(--vn-shell-accent, #86dbb2) !important;
  background: color-mix(in srgb, var(--vn-shell-accent, #86dbb2) 18%, transparent) !important;
  border-color: var(--vn-shell-accent, #86dbb2) !important;
  animation: aperture-voice-pulse 1.8s infinite !important;
}

/* Theme contrast tokens are driven cleanly through --vn-shell-* variables per preset. */

/* Reading Typography Modes */
[data-vn-root][data-vn-typography="novelist"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="novelist"] [data-vn-backlog-text] {
  font-family: Georgia, "Times New Roman", Garamond, serif !important;
  line-height: 1.46 !important;
}
[data-vn-root][data-vn-typography="modern"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="modern"] [data-vn-backlog-text] {
  font-family: -apple-system, BlinkMacSystemFont, "Outfit", "Inter", "Segoe UI", Roboto, sans-serif !important;
  line-height: 1.42 !important;
}
[data-vn-root][data-vn-typography="retro"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="retro"] [data-vn-backlog-text] {
  font-family: "Courier New", "JetBrains Mono", Consolas, ui-monospace, monospace !important;
  letter-spacing: 0.015em !important;
  word-spacing: normal !important;
  line-height: 1.45 !important;
}
[data-vn-root][data-vn-typography="accessible"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="accessible"] [data-vn-backlog-text] {
  font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
  letter-spacing: 0.02em !important;
  word-spacing: normal !important;
  line-height: 1.56 !important;
}
[data-vn-root][data-vn-typography="cinematic"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="cinematic"] [data-vn-backlog-text] {
  font-family: "Cinzel", "Baskerville", "Palatino Linotype", "Palatino", serif !important;
  letter-spacing: 0.01em !important;
  word-spacing: normal !important;
  line-height: 1.48 !important;
}
[data-vn-root][data-vn-typography="terminal"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="terminal"] [data-vn-backlog-text] {
  font-family: "Share Tech Mono", "Fira Code", "Source Code Pro", Consolas, monospace !important;
  letter-spacing: 0.015em !important;
  word-spacing: normal !important;
  line-height: 1.45 !important;
}
[data-vn-root][data-vn-typography="manga"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="manga"] [data-vn-backlog-text] {
  font-family: "Comic Neue", "Chalkboard SE", "Chalkboard", "Comic Sans MS", -apple-system, sans-serif !important;
  line-height: 1.42 !important;
}
[data-vn-root][data-vn-typography="fantasy"] [data-vn-dialogue-text],
[data-vn-root][data-vn-typography="fantasy"] [data-vn-backlog-text] {
  font-family: "Merriweather", "Crimson Text", "Book Antiqua", Georgia, serif !important;
  line-height: 1.48 !important;
}
[data-vn-root] [data-vn-dialogue-text] {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 1px rgba(0, 0, 0, 0.9);
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
  background: var(--vn-shell-surface-gradient, linear-gradient(180deg, rgba(14, 24, 28, 0.94) 0%, rgba(8, 14, 18, 0.98) 100%));
  border: 1px solid var(--vn-shell-border-strong, var(--vn-shell-border, rgba(134, 219, 178, 0.32)));
  border-radius: var(--vn-shell-radius, 16px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transform: scale(0.95);
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-vn-chapter-card][data-vn-active="true"] .chapter-card-inner {
  transform: scale(1);
}

.chapter-eyebrow {
  display: inline-block;
  font-family: var(--vn-shell-family, system-ui, sans-serif);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.16em;
  color: var(--vn-shell-accent, #86dbb2);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.chapter-title {
  font-family: var(--vn-shell-display-font, Georgia, serif);
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 700;
  color: var(--vn-shell-text, #f4fbf7);
  margin: 0 0 8px;
  line-height: 1.25;
}

.chapter-subtitle {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--vn-shell-muted, #9ab3a6);
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

[data-vn-root][data-vn-effect-intensity="off"] [data-vn-atmosphere],
[data-vn-root][data-vn-atmospheric-lighting="false"] [data-vn-atmosphere] {
  display: none !important;
  opacity: 0 !important;
}

[data-vn-root] {
  opacity: 1 !important;
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
  border-bottom: 1px solid var(--vn-shell-border, rgba(160, 205, 185, 0.16)) !important;
}

[data-vn-backlog-search] {
  flex: 1 !important;
  min-height: 44px;
  padding: 6px 12px !important;
  font-size: 13px !important;
  background: var(--vn-shell-field, rgba(16, 26, 30, 0.7)) !important;
  border: 1px solid var(--vn-shell-border, rgba(160, 205, 185, 0.22)) !important;
  border-radius: min(var(--vn-shell-radius, 8px), 10px) !important;
  color: var(--vn-shell-text, #dbebe2) !important;
}

[data-vn-backlog-search]::placeholder {
  color: var(--vn-shell-muted, #7a9488) !important;
}

.backlog-search-count {
  font-size: 11px !important;
  color: var(--vn-shell-accent, #86dbb2) !important;
  font-weight: 600 !important;
  flex: none !important;
}

/* Anchor Trait Badges */
.tag.anchor-tag {
  background: color-mix(in srgb, var(--vn-shell-accent, #86dbb2) 16%, transparent) !important;
  color: var(--vn-shell-accent, #86dbb2) !important;
  border: 1px solid color-mix(in srgb, var(--vn-shell-accent, #86dbb2) 38%, transparent) !important;
  font-weight: 650 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 8px !important;
  border-radius: 999px !important;
  font-size: 11px !important;
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
  object-position: 50% 30% !important;
}

[data-vn-root] [data-vn-scene-image][data-vn-scene-image-fit="contain"],
[data-vn-scene] [data-vn-scene-image][data-vn-scene-image-fit="contain"] {
  object-fit: contain !important;
}

/* =========================================================================
   UNIFIED PALETTE TOKENS & ARCHITECTURAL TEXT VIEWER STYLES
   ========================================================================= */

${VN_SHELL_PRESET_TOKENS_CSS}

/* 1. Lumiverse (Host Adaptive Obsidian Glass) */
[data-vn-root][data-vn-preset="lumiverse"] [data-vn-dialogue] {
  border-radius: 16px;
  border-color: var(--lumiverse-border, rgba(224, 238, 217, 0.32));
  background: var(--lumiverse-card-bg, rgba(6, 15, 18, var(--caption-opacity, 0.8)));
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
[data-vn-root][data-vn-preset="lumiverse"] [data-vn-dialogue-text] {
  color: var(--lumiverse-text, #eff4e9);
  font-family: var(--vn-font-family, inherit);
}
[data-vn-root][data-vn-preset="lumiverse"] [data-vn-speaker] {
  color: var(--lumiverse-primary, #dcebad);
}

/* 2. Paper Novel / Sage Editorial — Warm Vellum Hardcover Bookplate */
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-dialogue] {
  border-radius: 5px;
  border-color: rgba(138, 47, 35, 0.45);
  background: rgba(248, 242, 229, var(--caption-opacity, 0.94));
  color: #241d17;
  outline: 1px solid rgba(101, 75, 43, 0.32);
  outline-offset: -6px;
  box-shadow: inset 4px 0 0 #8a2f23, 0 16px 40px rgba(34, 20, 8, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.85);
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-dialogue]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(101, 75, 43, 0.025) 0 1px, transparent 1px 18px);
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-dialogue-text] {
  color: #241d17 !important;
  text-shadow: none !important;
  line-height: 1.48;
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-speaker] {
  color: #8a2f23 !important;
  font-variant: small-caps;
}
[data-vn-root][data-vn-preset="paper-novel"] [data-vn-speaker]::before {
  content: "◆ ";
  font-size: 0.85em;
  opacity: 0.9;
}

/* 3. Midnight Noir — Art-Deco Marquee & Stepped Brass OLED */
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-dialogue] {
  border-radius: 3px;
  border-color: rgba(217, 164, 65, 0.56);
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.015) 0 1px, transparent 1px 4px), rgba(4, 6, 12, var(--caption-opacity, 0.95));
  outline: 1px solid rgba(217, 164, 65, 0.24);
  outline-offset: -5px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 236, 196, 0.14);
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-dialogue]::after {
  content: '';
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(217, 164, 65, 0.55);
  clip-path: polygon(0 0, 14px 0, 14px 1px, 1px 1px, 1px 14px, 0 14px, 0 0, 100% 0, 100% 14px, calc(100% - 1px) 14px, calc(100% - 1px) 1px, calc(100% - 14px) 1px, calc(100% - 14px) 0, 100% 0, 100% 100%, calc(100% - 14px) 100%, calc(100% - 14px) calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) calc(100% - 14px), 100% calc(100% - 14px), 100% 100%, 0 100%, 0 calc(100% - 14px), 1px calc(100% - 14px), 1px calc(100% - 1px), 14px calc(100% - 1px), 14px 100%, 0 100%);
  pointer-events: none;
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-dialogue-text] {
  color: #f5f1e6;
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-speaker] {
  color: #efc76e !important;
  font-style: italic;
  letter-spacing: 0.08em !important;
}
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-speaker]::before { content: "— "; opacity: 0.7; }
[data-vn-root][data-vn-preset="midnight-noir"] [data-vn-speaker]::after { content: " —"; opacity: 0.7; }

/* 4. Golden Hour / Solar Dusk — Smoked Amber & Gold Clasp */
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-dialogue] {
  border-radius: 16px;
  border-color: rgba(239, 179, 94, 0.55);
  background: radial-gradient(ellipse 65% 110% at 50% -25%, rgba(255, 200, 120, 0.14), transparent 68%), rgba(28, 18, 9, var(--caption-opacity, 0.9));
  outline: 1px solid rgba(255, 212, 138, 0.28);
  outline-offset: -6px;
  box-shadow: 0 16px 46px rgba(42, 18, 4, 0.5), inset 0 1px 0 rgba(255, 228, 175, 0.22);
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-dialogue]::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  width: 7px;
  height: 7px;
  margin-left: -3.5px;
  background: linear-gradient(135deg, #fff1cf, #d29a52);
  transform: rotate(45deg);
  box-shadow: 0 0 8px rgba(246, 220, 164, 0.75);
  pointer-events: none;
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-dialogue-text] {
  color: #fff5e0;
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-speaker] {
  color: #f8c97d !important;
}
[data-vn-root][data-vn-preset="golden-hour"] [data-vn-speaker]::before { content: "✧ "; }

/* 5. Boxed Console — Tactical Phosphor Hardware Bezel */
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-dialogue] {
  border-radius: 3px;
  border-color: rgba(125, 255, 161, 0.45);
  background: repeating-linear-gradient(0deg, rgba(125, 255, 161, 0.03) 0 1px, transparent 1px 4px), rgba(9, 15, 12, var(--caption-opacity, 0.92));
  outline: 1px solid rgba(125, 255, 161, 0.16);
  outline-offset: -5px;
  box-shadow: inset 3px 0 0 rgba(125, 255, 161, 0.55), 0 14px 36px rgba(0, 0, 0, 0.58);
}
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-dialogue-text] {
  color: #e7f9eb;
  text-shadow: 0 0 6px rgba(125, 255, 161, 0.14);
}
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-speaker] {
  color: #7dffa1 !important;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
}
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-speaker]::before { content: "> "; opacity: 0.78; }
[data-vn-root][data-vn-preset="boxed-console"] [data-vn-speaker]::after { content: "_"; opacity: 0.9; }

/* 6. Yamaku Classic / Cyber Amethyst — Smoked Plum Classic Stage */
[data-vn-root][data-vn-preset="yamaku-classic"] [data-vn-dialogue] {
  border-radius: 6px;
  border-color: rgba(255, 112, 149, 0.44);
  background: linear-gradient(to top, rgba(20, 17, 15, var(--caption-opacity, 0.92)) 0%, rgba(28, 24, 20, 0.65) 100%);
  box-shadow: 0 16px 44px rgba(18, 6, 24, 0.55), inset 0 1px 0 rgba(255, 160, 190, 0.2);
}
[data-vn-root][data-vn-preset="yamaku-classic"] [data-vn-dialogue-text] {
  color: #fef7f9;
}
[data-vn-root][data-vn-preset="yamaku-classic"] [data-vn-speaker] {
  color: #ff7095 !important;
}

/* 7. Literature Club / Rose Blossom — Stitched Stationery */
[data-vn-root][data-vn-preset="literature-club"] [data-vn-dialogue] {
  border-radius: 18px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  outline: 1.5px dashed rgba(232, 80, 124, 0.36);
  outline-offset: -6px;
  background: linear-gradient(to bottom, rgba(255, 166, 206, 0.94) 0%, rgba(236, 148, 191, 0.78) 100%);
  box-shadow: 0 14px 36px rgba(150, 60, 95, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-dialogue]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 1.5px, transparent 1.7px);
  background-size: 16px 16px;
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-dialogue-text] {
  color: #ffffff;
  font-weight: 700;
  text-shadow: 0 1.5px 2px rgba(97, 30, 58, 0.9), 1px 0 2px rgba(97, 30, 58, 0.75);
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-speaker] {
  color: #ffffff !important;
  text-shadow: 0 1px 3px #b8285a !important;
}
[data-vn-root][data-vn-preset="literature-club"] [data-vn-speaker]::before { content: "♡ "; }

/* 8. Astral Glass — Layered Optical Prism & Starlight Brackets */
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-dialogue] {
  border-radius: 16px;
  border-color: rgba(110, 218, 255, 0.34);
  background: radial-gradient(ellipse at 0% 0%, rgba(82, 213, 255, 0.14), transparent 48%), radial-gradient(ellipse at 100% 100%, rgba(167, 139, 250, 0.12), transparent 52%), rgba(8, 20, 38, var(--caption-opacity, 0.86));
  --vn-dialogue-shadow: 0 20px 50px rgba(3, 14, 34, 0.58), inset 0 1px 0 rgba(224, 244, 255, 0.32), inset 0 -1px 0 rgba(139, 155, 250, 0.16), inset 0 0 0 1px rgba(186, 230, 253, 0.08);
  box-shadow: var(--vn-dialogue-shadow);
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-dialogue]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(186, 230, 253, 0.09) 0%, rgba(167, 139, 250, 0.03) 34%, transparent 62%);
  pointer-events: none;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-dialogue]::after {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(141, 228, 255, 0.42);
  clip-path: polygon(0 0, 10px 0, 10px 1px, 1px 1px, 1px 10px, 0 10px, 0 0, 100% 0, 100% 10px, calc(100% - 1px) 10px, calc(100% - 1px) 1px, calc(100% - 10px) 1px, calc(100% - 10px) 0, 100% 0, 100% 100%, calc(100% - 10px) 100%, calc(100% - 10px) calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) calc(100% - 10px), 100% calc(100% - 10px), 100% 100%, 0 100%, 0 calc(100% - 10px), 1px calc(100% - 10px), 1px calc(100% - 1px), 10px calc(100% - 1px), 10px 100%, 0 100%);
  pointer-events: none;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-dialogue-text] {
  color: #eef7ff;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-speaker] {
  color: #52d5ff !important;
}
[data-vn-root][data-vn-preset="astral-glass"] [data-vn-speaker]::before { content: "✦ "; }

/* 9. Neon Rain — Wet Asphalt Cyber Telemetry Plate */
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-dialogue] {
  border-radius: 6px;
  border-color: rgba(45, 212, 191, 0.48);
  background: repeating-linear-gradient(0deg, transparent 0 5px, rgba(45, 212, 191, 0.03) 5px 6px), linear-gradient(125deg, rgba(45, 212, 191, 0.08), transparent 46%, rgba(244, 114, 182, 0.06)), rgba(8, 20, 27, var(--caption-opacity, 0.9));
  box-shadow: inset 3px 0 0 rgba(244, 114, 182, 0.6), 0 16px 44px rgba(2, 16, 24, 0.55), inset 0 1px 0 rgba(94, 234, 212, 0.2);
}
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-dialogue-text] {
  color: #e9fffb;
}
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-speaker] {
  color: #2dd4bf !important;
}
[data-vn-root][data-vn-preset="neon-rain"] [data-vn-speaker]::before { content: "// "; opacity: 0.72; }

/* 10. Obsidian Reliquary — Sterling Silver & Royal Amethyst */
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-dialogue] {
  border-radius: 10px;
  border-color: rgba(201, 168, 248, 0.48);
  background: radial-gradient(ellipse at 50% 0%, rgba(201, 168, 248, 0.14), transparent 65%), repeating-linear-gradient(135deg, transparent 0 22px, rgba(219, 226, 237, 0.025) 22px 23px), rgba(22, 15, 33, var(--caption-opacity, 0.9));
  outline: 1px solid rgba(219, 226, 237, 0.24);
  outline-offset: -6px;
  box-shadow: 0 18px 46px rgba(14, 4, 26, 0.55), inset 0 1px 0 rgba(219, 226, 237, 0.22);
}
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-dialogue-text] {
  color: #f7f2ff;
}
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-speaker] {
  color: #c9a8f8 !important;
}
[data-vn-root][data-vn-preset="obsidian-reliquary"] [data-vn-speaker]::before { content: "❖ "; color: #dbe6f5; }

/* =========================================================================
   ALTERNATE TEXT VIEWER STYLES (Independent of Theme Palette)
   ========================================================================= */

[data-vn-root][data-vn-dialogue-style="cinema-bar"] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  left: 0 !important;
  right: 0 !important;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-inset, var(--vn-sheet-keyboard-inset, 0px))) !important;
  border-radius: 0 !important;
  border-left: 0 !important;
  border-right: 0 !important;
  border-bottom: 0 !important;
  border-top: 1px solid var(--vn-shell-border-strong, var(--aperture-dialogue-border)) !important;
  outline: none !important;
  background: linear-gradient(to top, color-mix(in srgb, var(--vn-shell-panel, #060a10) 94%, black) 0%, color-mix(in srgb, var(--vn-shell-panel, #060a10) 76%, transparent) 72%, transparent 100%) !important;
  box-shadow: none !important;
  backdrop-filter: blur(6px) !important;
  -webkit-backdrop-filter: blur(6px) !important;
  padding-inline: max(18px, 4vw) !important;
}

[data-vn-root][data-vn-dialogue-style="editorial-page"] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  border-radius: 4px !important;
  outline: 1px solid color-mix(in srgb, var(--vn-shell-accent, #dcebad) 26%, transparent) !important;
  outline-offset: -6px !important;
  box-shadow: inset 4px 0 0 var(--vn-shell-accent, #dcebad), 0 16px 40px rgba(0, 0, 0, 0.36) !important;
}
[data-vn-root][data-vn-dialogue-style="editorial-page"] [data-vn-dialogue-text] {
  font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
  line-height: 1.48;
}

[data-vn-root][data-vn-dialogue-style="terminal-hud"] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  border-radius: 2px !important;
  outline: 1px solid var(--vn-shell-border, rgba(160, 205, 185, 0.3)) !important;
  outline-offset: -5px !important;
  background-image: repeating-linear-gradient(0deg, color-mix(in srgb, var(--vn-shell-accent, #dcebad) 3.5%, transparent) 0 1px, transparent 1px 4px) !important;
  box-shadow: inset 3px 0 0 var(--vn-shell-accent, #dcebad), 6px 6px 0 rgba(0, 0, 0, 0.45) !important;
}

[data-vn-root][data-vn-dialogue-style="glass-card"] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  border-radius: 20px !important;
  outline: none !important;
  backdrop-filter: blur(18px) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.2) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.24) !important;
}

`;
