/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_FOUNDATION = `
/* =========================================================================
   APERTURE v4 THEME & GEOMETRY
   ========================================================================= */

:root, :host {
  --night: #0c1219;
  --night2: #171f27;
  --ivory: #f3f0e8;
  --dove: #c9d0cb;
  --lime: #e0eeb1;
  --mint: #a8d3c8;
  --steel: #a3b7c9;
  --rust: #eb8974;
  --soft: #767e83;
  --hair: rgba(255, 255, 255, 0.15);
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --caption-opacity: 0.72;
  --caption-blur: 8px;
  --caption-height: 142px;
  --reader-font: 15px;
  --theme-accent: var(--lime);
  --menu-ink: #192b25;
  --menu-muted: #53685f;
  --menu-hair: rgba(53, 80, 69, 0.16);

  /* Aperture Dynamic Reskinning Tokens (defaults to Celestial Emerald) */
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
}

/* Base Utility & Typography */
svg.icon {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  flex-shrink: 0;
}

/* =========================================================================
   CONCENTRIC ORBITAL PATTERNS PER ROUTE SURFACE
   ========================================================================= */

[data-surface],
[data-vn-settings],
.settings-page,
[data-settings-route],
[data-vn-reference-sheet],
[data-vn-dossier-card],
[data-vn-cast-root],
aside[data-vn-workspace],
[data-workspace-content] {
  position: relative;
  isolation: isolate;
}

[data-surface]:before,
[data-vn-settings]:before,
.settings-page:before,
[data-settings-route]:before,
[data-vn-reference-sheet]:before,
[data-vn-dossier-card]:before,
[data-vn-cast-root]:before,
aside[data-vn-workspace]:before,
[data-workspace-content]:before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.95;
}

[data-surface]:after,
[data-vn-settings]:after,
.settings-page:after,
[data-settings-route]:after,
[data-vn-reference-sheet]:after,
[data-vn-dossier-card]:after,
[data-vn-cast-root]:after,
aside[data-vn-workspace]:after,
[data-workspace-content]:after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 175px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--vn-shell-accent, #ffffff) 7%, transparent), transparent);
  pointer-events: none;
  z-index: 0;
}

/* Settings surface orbital lines */
[data-surface="settings"]:before,
[data-surface="reader-settings"]:before,
[data-surface="appearance"]:before,
[data-vn-settings]:before,
.settings-page:before,
[data-settings-route]:before {
  background:
    var(--vn-shell-card-pattern, none),
    repeating-radial-gradient(ellipse at 105% 88%, transparent 0 44px, var(--vn-shell-ring, var(--aperture-ring-color, rgba(160, 205, 185, 0.08))) 45px, transparent 46px);
}

/* World Lens surface orbital lines */
[data-surface="world"]:before,
[data-surface="documents"]:before,
[data-surface="library"]:before,
[data-vn-reference-sheet]:before {
  background:
    var(--vn-shell-card-pattern, none),
    repeating-radial-gradient(circle at -12% 35%, transparent 0 52px, var(--vn-shell-ring, var(--aperture-ring-color, rgba(160, 205, 185, 0.08))) 53px, transparent 54px);
}

/* Character Folio & History orbital lines */
[data-surface="character"]:before,
[data-surface="history"]:before,
[data-vn-dossier-card]:before,
[data-vn-cast-root]:before {
  background:
    var(--vn-shell-card-pattern, none),
    repeating-radial-gradient(ellipse at 108% 18%, transparent 0 49px, var(--vn-shell-ring, var(--aperture-ring-color, rgba(160, 205, 185, 0.08))) 50px, transparent 51px);
}

/* Workspace & Studio orbital lines */
[data-surface="studio"]:before,
[data-surface="art-review"]:before,
[data-surface="workspace"]:before,
aside[data-vn-workspace]:before,
[data-workspace-content]:before {
  background:
    var(--vn-shell-card-pattern, none),
    repeating-radial-gradient(ellipse at 102% 96%, transparent 0 59px, var(--vn-shell-ring, var(--aperture-ring-color, rgba(160, 205, 185, 0.08))) 60px, transparent 61px);
}

/* Unified theme surface gradients driven strictly by active preset tokens */
[data-surface],
[data-vn-settings],
.settings-page,
[data-settings-route],
[data-vn-reference-sheet],
[data-vn-dossier-card],
[data-vn-cast-root],
aside[data-vn-workspace],
[data-workspace-content] {
  background: var(--vn-shell-surface-gradient, var(--aperture-workspace-bg, #101a1e)) !important;
  color: var(--vn-shell-text, #eff4e9) !important;
}

/* =========================================================================
   APERTURE IRIS NAVIGATION (01 - 08)
   ========================================================================= */

.aperture-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: var(--aperture-overlay-bg, #16241f) !important;
  color: var(--aperture-text, #edf3e8) !important;
  display: none !important;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: auto;
  overscroll-behavior: contain;
}

.aperture-overlay.open {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.aperture-overlay:before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-radial-gradient(circle at 91% 88%, transparent 0px, transparent 42px, var(--vn-shell-ring, var(--aperture-ring-color, rgba(160, 205, 185, 0.08))) 43px, transparent 44px) !important;
  opacity: 0.9;
}

.aperture-content {
  position: relative;
  padding: calc(45px + env(safe-area-inset-top, 0px)) 24px calc(40px + env(safe-area-inset-bottom, 0px));
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.aperture-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.aperture-word {
  font-size: 11px;
  letter-spacing: 0.16em;
  font-weight: 750;
  color: var(--aperture-accent, #dcebad) !important;
}

.aperture-title {
  font-family: var(--vn-shell-display-font, Georgia, serif);
  font-size: 38px;
  letter-spacing: -0.04em;
  font-weight: 400;
  line-height: 1.02;
  margin-top: 36px;
  max-width: 320px;
  color: var(--aperture-text, var(--vn-shell-text, inherit)) !important;
}

.aperture-title i {
  font-style: italic;
  color: var(--aperture-accent, var(--vn-shell-accent, inherit));
}

.aperture-links {
  margin-top: 28px;
  border-top: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14));
}

.aperture-link {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  padding: 13px 6px 14px;
  min-height: 56px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.16s ease, transform 0.16s ease, border-color 0.16s ease;
}

.aperture-link .number {
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  color: var(--aperture-accent, var(--vn-shell-accent, #dcebad)) !important;
  width: 28px;
}

.aperture-link span:not(.number) {
  font-family: var(--vn-shell-display-font, Georgia, serif);
  font-size: 21px;
  letter-spacing: -0.02em;
  flex: 1;
}

.aperture-link .icon {
  width: 20px;
  height: 20px;
  opacity: 0.85;
  color: var(--vn-shell-accent, inherit);
}

.aperture-link:hover,
.aperture-link:active {
  background: var(--aperture-ghost-bg, color-mix(in srgb, var(--vn-shell-accent, #ffffff) 12%, transparent));
  border-bottom-color: var(--vn-shell-accent, currentColor);
}

.aperture-link:active {
  transform: scale(0.985);
}

.aperture-foot {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  padding-top: 26px;
  font-size: 10px;
  color: var(--vn-shell-muted, #9cb5a8);
}

.aperture-close {
  border: 1px solid var(--vn-shell-border-strong, var(--vn-shell-border, rgba(255, 255, 255, 0.28)));
  width: 44px;
  height: 44px;
  border-radius: var(--vn-shell-radius, 50%);
  display: grid;
  place-items: center;
  background: var(--vn-shell-button, transparent);
  color: var(--vn-shell-text, inherit);
  cursor: pointer;
}

`;
