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

/* Light / Dark Mode Tokens */
body.theme-light,
:host-context(body.theme-light),
:host-context([data-aperture-mode="light"]),
:host([data-aperture-mode="light"]),
[data-aperture-mode="light"],
[data-vn-shell][data-aperture-mode="light"],
[data-vn-root][data-aperture-mode="light"] {
  --vn-shell-panel: #eef3e5;
  --vn-shell-field: #ffffff;
  --vn-shell-button: #d8e5d5;
  --vn-shell-text: #172721;
  --vn-shell-muted: #53685f;
  --vn-shell-border: rgba(53, 80, 69, 0.18);
  --vn-shell-accent: #284638;
  --vn-shell-accent-contrast: #f4f7eb;
  background: #e4ecd9;
  color: var(--menu-ink);
}

body.theme-dark,
:host-context(body.theme-dark),
:host-context([data-aperture-mode="dark"]),
:host([data-aperture-mode="dark"]),
[data-aperture-mode="dark"],
[data-vn-shell][data-aperture-mode="dark"],
[data-vn-root][data-aperture-mode="dark"] {
  --vn-shell-panel: #111a1e;
  --vn-shell-field: #182429;
  --vn-shell-button: #23342e;
  --vn-shell-text: #eff4e9;
  --vn-shell-muted: #a4bbb1;
  --vn-shell-border: rgba(220, 238, 217, 0.14);
  --vn-shell-accent: #dce9b5;
  --vn-shell-accent-contrast: #1c3525;
  background: #0b1014;
  color: #eff4e9;
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent);
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
  background: repeating-radial-gradient(ellipse at 105% 88%, transparent 0 44px, rgba(45, 78, 62, 0.08) 45px, transparent 46px);
}
body.theme-dark [data-surface="settings"]:before,
body.theme-dark [data-surface="reader-settings"]:before,
body.theme-dark [data-surface="appearance"]:before,
body.theme-dark [data-vn-settings]:before,
body.theme-dark .settings-page:before,
body.theme-dark [data-settings-route]:before,
[data-aperture-mode="dark"] [data-surface="settings"]:before,
[data-aperture-mode="dark"] [data-surface="reader-settings"]:before,
[data-aperture-mode="dark"] [data-surface="appearance"]:before,
[data-aperture-mode="dark"] [data-vn-settings]:before,
[data-aperture-mode="dark"] .settings-page:before,
[data-aperture-mode="dark"] [data-settings-route]:before {
  background: repeating-radial-gradient(ellipse at 105% 88%, transparent 0 44px, rgba(189, 215, 174, 0.09) 45px, transparent 46px);
}

/* World Lens surface orbital lines */
[data-surface="world"]:before,
[data-surface="documents"]:before,
[data-surface="library"]:before,
[data-vn-reference-sheet]:before {
  background: repeating-radial-gradient(circle at -12% 35%, transparent 0 52px, rgba(45, 78, 62, 0.08) 53px, transparent 54px);
}
body.theme-dark [data-surface="world"]:before,
body.theme-dark [data-surface="documents"]:before,
body.theme-dark [data-surface="library"]:before,
body.theme-dark [data-vn-reference-sheet]:before,
[data-aperture-mode="dark"] [data-surface="world"]:before,
[data-aperture-mode="dark"] [data-surface="documents"]:before,
[data-aperture-mode="dark"] [data-surface="library"]:before,
[data-aperture-mode="dark"] [data-vn-reference-sheet]:before {
  background: repeating-radial-gradient(circle at -12% 35%, transparent 0 52px, rgba(189, 215, 174, 0.09) 53px, transparent 54px);
}

/* Character Folio & History orbital lines */
[data-surface="character"]:before,
[data-surface="history"]:before,
[data-vn-dossier-card]:before,
[data-vn-cast-root]:before {
  background: repeating-radial-gradient(ellipse at 108% 18%, transparent 0 49px, rgba(45, 78, 62, 0.08) 50px, transparent 51px);
}
body.theme-dark [data-surface="character"]:before,
body.theme-dark [data-surface="history"]:before,
body.theme-dark [data-vn-dossier-card]:before,
body.theme-dark [data-vn-cast-root]:before,
[data-aperture-mode="dark"] [data-surface="character"]:before,
[data-aperture-mode="dark"] [data-surface="history"]:before,
[data-aperture-mode="dark"] [data-vn-dossier-card]:before,
[data-aperture-mode="dark"] [data-vn-cast-root]:before {
  background: repeating-radial-gradient(ellipse at 108% 18%, transparent 0 49px, rgba(189, 215, 174, 0.09) 50px, transparent 51px);
}

/* Workspace & Studio orbital lines */
[data-surface="studio"]:before,
[data-surface="art-review"]:before,
[data-surface="workspace"]:before,
aside[data-vn-workspace]:before,
[data-workspace-content]:before {
  background: repeating-radial-gradient(ellipse at 102% 96%, transparent 0 59px, rgba(45, 78, 62, 0.08) 60px, transparent 61px);
}
body.theme-dark [data-surface="studio"]:before,
body.theme-dark [data-surface="art-review"]:before,
body.theme-dark [data-surface="workspace"]:before,
body.theme-dark aside[data-vn-workspace]:before,
body.theme-dark [data-workspace-content]:before,
[data-aperture-mode="dark"] [data-surface="studio"]:before,
[data-aperture-mode="dark"] [data-surface="art-review"]:before,
[data-aperture-mode="dark"] [data-surface="workspace"]:before,
[data-aperture-mode="dark"] aside[data-vn-workspace]:before,
[data-aperture-mode="dark"] [data-workspace-content]:before {
  background: repeating-radial-gradient(ellipse at 102% 96%, transparent 0 59px, rgba(189, 215, 174, 0.09) 60px, transparent 61px);
}

/* Theme gradients on surfaces */
body.theme-light [data-surface],
body.theme-light [data-vn-settings],
body.theme-light .settings-page,
body.theme-light [data-settings-route],
body.theme-light [data-vn-reference-sheet],
body.theme-light [data-vn-dossier-card],
body.theme-light [data-vn-cast-root],
body.theme-light aside[data-vn-workspace],
[data-aperture-mode="light"] [data-surface],
[data-aperture-mode="light"] [data-vn-settings],
[data-aperture-mode="light"] .settings-page,
[data-aperture-mode="light"] [data-settings-route],
[data-aperture-mode="light"] [data-vn-reference-sheet],
[data-aperture-mode="light"] [data-vn-dossier-card],
[data-aperture-mode="light"] [data-vn-cast-root],
[data-aperture-mode="light"] aside[data-vn-workspace] {
  background: linear-gradient(147deg, #eef3e5 0%, #e8eee0 58%, #dce7d3 100%) !important;
  color: #172721 !important;
}

body.theme-dark [data-surface],
body.theme-dark [data-vn-settings],
body.theme-dark .settings-page,
body.theme-dark [data-settings-route],
body.theme-dark [data-vn-reference-sheet],
body.theme-dark [data-vn-dossier-card],
body.theme-dark [data-vn-cast-root],
body.theme-dark aside[data-vn-workspace],
[data-aperture-mode="dark"] [data-surface],
[data-aperture-mode="dark"] [data-vn-settings],
[data-aperture-mode="dark"] .settings-page,
[data-aperture-mode="dark"] [data-settings-route],
[data-aperture-mode="dark"] [data-vn-reference-sheet],
[data-aperture-mode="dark"] [data-vn-dossier-card],
[data-aperture-mode="dark"] [data-vn-cast-root],
[data-aperture-mode="dark"] aside[data-vn-workspace] {
  background: linear-gradient(155deg, #151f20 0%, #101a1e 58%, #0b1419 100%) !important;
  color: #e7eee5 !important;
}

/* =========================================================================
   APERTURE IRIS NAVIGATION (01 - 08)
   ========================================================================= */

.aperture-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: #e2ecca;
  color: #14201f;
  clip-path: circle(0 at 90% 90%);
  visibility: hidden;
  transition: clip-path 0.47s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.47s;
  overflow: auto;
  overscroll-behavior: contain;
}

.aperture-overlay.open {
  visibility: visible;
  clip-path: circle(160% at 90% 90%);
}

.aperture-overlay:before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-radial-gradient(circle at 91% 88%, transparent 0px, transparent 42px, rgba(30, 56, 52, 0.06) 43px, transparent 44px);
  opacity: 0.9;
}

body.theme-dark .aperture-overlay,
[data-aperture-mode="dark"] .aperture-overlay {
  background: #172724;
  color: #edf3e8;
}

body.theme-dark .aperture-overlay:before,
[data-aperture-mode="dark"] .aperture-overlay:before {
  background: repeating-radial-gradient(circle at 91% 88%, transparent 0, transparent 42px, rgba(206, 229, 188, 0.07) 43px, transparent 44px);
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
}

.aperture-title {
  font-family: Georgia, serif;
  font-size: 38px;
  letter-spacing: -0.055em;
  font-weight: 400;
  line-height: 0.98;
  margin-top: 36px;
  max-width: 300px;
}

.aperture-title i {
  font-style: italic;
}

.aperture-links {
  margin-top: 28px;
  border-top: 1px solid rgba(27, 49, 43, 0.25);
}

body.theme-dark .aperture-links,
[data-aperture-mode="dark"] .aperture-links {
  border-top-color: rgba(199, 224, 198, 0.25);
}

.aperture-link {
  width: 100%;
  border: 0;
  border-bottom: 1px solid rgba(27, 49, 43, 0.18);
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  padding: 13px 4px 14px;
  min-height: 56px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.16s ease, transform 0.16s ease;
}

body.theme-dark .aperture-link,
[data-aperture-mode="dark"] .aperture-link {
  border-bottom-color: rgba(199, 224, 198, 0.2);
}

.aperture-link .number {
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  color: #60716a;
  width: 28px;
}

body.theme-dark .aperture-link .number,
[data-aperture-mode="dark"] .aperture-link .number {
  color: #b2c8b7;
}

.aperture-link span:not(.number) {
  font-family: Georgia, serif;
  font-size: 21px;
  letter-spacing: -0.02em;
  flex: 1;
}

.aperture-link .icon {
  width: 20px;
  height: 20px;
  opacity: 0.8;
}

.aperture-link:active {
  background: rgba(208, 220, 189, 0.6);
  transform: scale(0.98);
}

body.theme-dark .aperture-link:active,
[data-aperture-mode="dark"] .aperture-link:active {
  background: rgba(41, 74, 58, 0.6);
}

.aperture-foot {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  padding-top: 26px;
  font-size: 10px;
  color: #5b6b65;
}

body.theme-dark .aperture-foot,
[data-aperture-mode="dark"] .aperture-foot {
  color: #b2c8b7;
}

.aperture-close {
  border: 1px solid #7f9589;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

`;
