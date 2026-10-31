/**
 * APERTURE v4 Design System & Theme Styles
 * Faithful reproduction of the approved APERTURE v4 visual design tokens,
 * concentric orbital backdrops, iris navigation, refined reader dialogue,
 * World Lens cartography, Character Folios, Workspace, and Settings.
 */

export const APERTURE_ICONS = {
  menu: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  close: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  back: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  book: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>`,
  world: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/></svg>`,
  cast: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19c0-3 3-5 5.5-5s5.5 2 5.5 5M15 14c2.2 0 4.5 1.4 4.5 4.5"/></svg>`,
  image: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
  history: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m12 2 9 4.9-9 4.9L3 6.9 12 2ZM3 11.8l9 4.9 9-4.9M3 16.7l9 4.9 9-4.9"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m12 3 2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/></svg>`,
  panel: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16M9 9h3M9 13h3"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  up: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`,
  down: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
  min: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M5 12h14"/></svg>`,
  search: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  grip: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="9" cy="8" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="16" r="1.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="16" r="1.5"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  document: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  info: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  play: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  check: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
};

export const APERTURE_THEME_CSS = `
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

/* =========================================================================
   PERSISTENT COMPACT BOTTOM ROUTE BAR (.route-bar)
   ========================================================================= */

.route-bar {
  position: absolute;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  left: 11px;
  right: 11px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 17px;
  padding: 5px 7px 5px 14px;
  z-index: 100;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 32px rgba(18, 45, 31, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

body.theme-light .route-bar,
[data-aperture-mode="light"] .route-bar {
  background: rgba(236, 244, 226, 0.96);
  color: #243b2c;
  border: 1px solid rgba(51, 78, 60, 0.22);
}

body.theme-dark .route-bar,
[data-aperture-mode="dark"] .route-bar {
  background: rgba(25, 43, 40, 0.95);
  color: #eaf3e4;
  border: 1px solid rgba(189, 215, 174, 0.24);
}

.route-bar .route-name {
  font-size: 10px;
  letter-spacing: 0.115em;
  font-weight: 750;
  max-width: 145px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-bar .route-step {
  font-size: 9px;
  white-space: nowrap;
  opacity: 0.8;
  margin-top: 2px;
}

.route-bar .route-actions {
  display: flex;
  gap: 3px;
  align-items: center;
}

.route-bar .route-actions button {
  width: 38px;
  height: 40px;
  border: 0;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
}

.route-bar .route-actions button:hover {
  background: rgba(94, 139, 101, 0.14);
}

.route-bar .route-actions button:active {
  transform: scale(0.94);
}

.route-bar .route-actions .dock-settings {
  width: 52px;
  display: flex;
  gap: 2px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.route-bar .route-actions .dock-settings span {
  font-size: 8px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.025em;
}

.route-bar .route-actions .menu-key {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: auto;
  min-width: 92px;
  padding: 0 12px;
  border-radius: 12px;
  background: #223d2f;
  color: #eff6e8 !important;
  font-size: 11px;
  font-weight: 740;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

body.theme-dark .route-bar .route-actions .menu-key,
[data-aperture-mode="dark"] .route-bar .route-actions .menu-key {
  background: #dce9b5;
  color: #1b3124 !important;
}

/* Reserve scrolling room above the persistent route bar */

/* Legacy navigation suppressed offscreen */
[data-vn-navigation] {
  position: absolute !important;
  left: -9999px !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 1px !important;
  height: 1px !important;
}

/* Route bar visibility: suppressed on reader, active on workspace */
.route-bar[hidden],
[hidden].route-bar,
.route-bar[hidden],
.route-bar:not([data-active="true"]),
[data-vn-shell]:not([data-vn-workspace]) .route-bar,
[data-vn-shell]:not([data-vn-workspace]) > .route-bar,
:not([data-vn-workspace]) > .route-bar,
[data-vn-root] .route-bar,
[data-vn-reader-first="true"]:not([data-vn-workspace]) .route-bar {
  display: none !important;
}
[data-vn-workspace] .route-bar:not([hidden]) {
  display: flex !important;
}

/* Hide legacy elements in APERTURE v4 */
.vn-speech-dock,
[data-vn-speech-dock],
[data-dock],
[data-vn-panel-layer] .launcher,
.launcher {
  display: none !important;
}

[data-vn-shell] > [data-vn-exit] {
  position: absolute !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* Full bleed artwork on reader */
[data-vn-reader-first="true"] [data-vn-theme-host] {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: 0 !important;
}

/* Reader topbar */
.reader-topbar,
[data-vn-reader-header].reader-topbar {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 10px !important;
  background: linear-gradient(180deg, rgba(3, 10, 15, 0.72), transparent) !important;
  border: 0 !important;
  border-bottom: 0 !important;
  z-index: 35 !important;
}
[data-vn-reader-header] [data-reader-header-actions],
.topbar-actions {
  margin-right: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.reading-heading {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  overflow: hidden !important;
  padding-left: 6px !important;
}

.reading-heading strong {
  display: block !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #f7f9f3 !important;
}

.reading-heading small {
  display: block !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-size: 9px !important;
  color: #e3eee9 !important;
  opacity: 0.84 !important;
}

/* Dialogue quote terracotta */
.dialogue-quote {
  color: #d68c73 !important;
}

/* World Lens: hide duplicate vertical list to fix icon ghosting */
[data-vn-reference-sheet] [data-reference-list] {
  display: none !important;
}

/* Character Folio: transparent overview container */
[data-reference-overview] {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* Workspace bottom padding */
aside[data-vn-workspace] {
  padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important;
}
.page-padding, [data-workspace-content] {
  padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important;
}

.page-padding, [data-workspace-content] {
  padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
}

/* =========================================================================
   APERTURE REFINED READER DIALOGUE & CONTROLS
   ========================================================================= */

/* Ensure narrative occupies the full viewport and never collapses or pins to top:0 */
[data-vn-narrative]:not([hidden]):not([data-hidden="true"]),
[data-vn-root] [data-vn-narrative]:not([hidden]):not([data-hidden="true"]),
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-narrative]:not([hidden]):not([data-hidden="true"]),
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-narrative]:not([hidden]):not([data-hidden="true"]) {
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
  pointer-events: none !important;
  z-index: 20 !important;
  display: block !important;
  box-sizing: border-box !important;
}

[data-vn-narrative][hidden],
[data-vn-narrative][data-hidden="true"],
[data-vn-root] [data-vn-narrative][hidden],
[data-vn-root] [data-vn-narrative][data-hidden="true"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

[data-vn-dialogue][hidden],
[data-vn-root] [data-vn-dialogue][hidden],
[data-vn-dialogue][data-hidden="true"],
[data-vn-root] [data-vn-dialogue][data-hidden="true"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Dock dialogue firmly to bottom of viewport above bottom action bar */
[data-vn-dialogue]:not([hidden]):not([data-hidden="true"]),
[data-vn-root] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]),
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]),
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  position: absolute !important;
  z-index: 22 !important;
  left: 15px !important;
  right: 15px !important;
  top: auto !important;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
  height: var(--caption-height, 142px);
  min-height: 100px !important;
  max-height: calc(100% - 160px) !important;
  padding: 16px 14px 8px !important;
  border: 1px solid rgba(224, 238, 217, 0.32) !important;
  border-radius: 16px !important;
  background: rgba(4, 13, 17, var(--caption-opacity, 0.72)) !important;
  -webkit-backdrop-filter: blur(var(--caption-blur, 8px)) !important;
  backdrop-filter: blur(var(--caption-blur, 8px)) !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
}

[data-vn-dialogue]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(137deg, rgba(255, 255, 255, 0.052), transparent 40%, rgba(210, 237, 190, 0.028));
}

.caption-edge {
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(224, 238, 177, 0.46), transparent);
  pointer-events: none;
}

/* Draggable Top Resize Grip */
.resize-grip {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 24px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  cursor: ns-resize !important;
  touch-action: none !important;
  z-index: 25 !important;
}

.resize-grip span {
  width: 48px;
  height: 4px;
  border-radius: 999px;
  background: rgba(220, 238, 177, 0.45);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transition: background 0.2s ease, width 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.resize-grip:hover span,
.resize-grip:active span,
.resize-grip:focus-visible span {
  background: #dcebad;
  width: 64px;
  transform: scaleY(1.2);
}

/* Dialogue Head: Speaker + Actions */
[data-vn-sheet-header] {
  display: flex !important;
  gap: 6px !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  flex: 0 0 24px !important;
  min-height: 24px !important;
  border-bottom: 1px solid rgba(228, 240, 218, 0.15) !important;
  padding-bottom: 3px !important;
  margin-bottom: 2px !important;
}

.speaker {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

[data-vn-speaker] {
  font-size: 11px !important;
  line-height: 1.4 !important;
  letter-spacing: 0.11em !important;
  font-weight: 800 !important;
  margin: 0 !important;
  color: #dcebad !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8) !important;
}

.caption-split {
  font-size: 10px !important;
  color: rgba(220, 238, 177, 0.4) !important;
  font-weight: 400 !important;
}

[data-vn-caption-scene] {
  font-size: 9.5px !important;
  letter-spacing: 0.08em !important;
  color: #a4b8ad !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  opacity: 0.85 !important;
}

.caption-head-actions {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex: none !important;
}

.caption-tool {
  width: 26px !important;
  height: 24px !important;
  display: grid !important;
  place-items: center !important;
  color: #f0f4e7 !important;
  opacity: 0.85 !important;
  border-radius: 6px !important;
  border: 1px solid rgba(220, 238, 177, 0.18) !important;
  background: rgba(255, 255, 255, 0.05) !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  padding: 0 !important;
}

.caption-tool:hover {
  background: rgba(220, 238, 177, 0.22) !important;
  border-color: #dcebad !important;
  opacity: 1 !important;
}

.caption-tool svg {
  width: 14px !important;
  height: 14px !important;
}

/* Scrollable Copy */
.scroll-copy {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y !important;
  overscroll-behavior: contain !important;
  scrollbar-width: thin !important;
  padding: 2px 0 6px !important;
}

[data-vn-dialogue-text] {
  flex: 1;
  min-height: 0;
  max-height: none;
  margin: 0;
  font-size: calc(var(--reader-font, 15px) * var(--vn-text-scale, 1)) !important;
  line-height: calc(1.55 * var(--vn-text-scale, 1)) !important;
  letter-spacing: 0;
  color: var(--aperture-text, #f9faf6) !important;
  font-family: Georgia, 'Times New Roman', serif;
  text-shadow: 0 2px 7px rgba(0, 0, 0, 0.82), 0 1px 1px black;
  user-select: text !important;
  overflow-wrap: break-word !important;
}

/* Dialogue Footer */
[data-vn-dialogue-footer],
.caption-foot {
  display: none !important;
}
}

/* Dialogue Restore Button (when minimized) */
[data-vn-clean-restore], .caption-restore, [data-vn-show-text] {
  position: absolute !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px)) !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  background: rgba(11, 23, 19, 0.8) !important;
  border: 1px solid rgba(220, 238, 217, 0.28) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  color: #f4f7ee !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45) !important;
  display: grid !important;
  place-items: center !important;
  z-index: 35 !important;
  cursor: pointer !important;
  transition: background 160ms ease, transform 160ms ease !important;
}

[data-vn-clean-restore]:hover, .caption-restore:hover, [data-vn-show-text]:hover {
  background: rgba(35, 75, 57, 0.92) !important;
  transform: translateX(-50%) scale(1.08) !important;
}

[data-vn-dialogue].large-caption {
  height: min(65vh, 420px) !important;
  max-height: calc(100% - 90px) !important;
  transition: height 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* Reader Top Bar Controls */
.reader-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 12px 10px;
  gap: 7px;
  z-index: 35;
  background: linear-gradient(180deg, rgba(3, 10, 15, 0.66), transparent);
}

.reader-topbar strong {
  font-size: 11px;
  font-weight: 700;
  color: #f7f9f3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.reader-topbar small {
  display: block;
  font-size: 9px;
  color: #e3eee9;
  opacity: 0.84;
}

.round-ghost {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(245, 249, 240, 0.34);
  background: rgba(5, 15, 19, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.15);
  display: grid;
  place-items: center;
  color: #f7f9f3;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.16s ease, background 0.16s ease;
}

.round-ghost:hover {
  background: rgba(21, 36, 42, 0.75);
}

.round-ghost:active {
  transform: scale(0.93);
}

.round-ghost.chat-exit {
  width: auto;
  min-width: 58px;
  padding: 0 9px;
  border-radius: 18px;
  display: flex;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
}

/* =========================================================================
   APERTURE DEDICATED BOTTOM BAR (History, World Lens, Cast, Settings)
   ========================================================================= */

.reader-actions,
[data-vn-root] .reader-actions {
  position: absolute !important;
  inset: auto 0 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
  z-index: 40 !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 12px calc(env(safe-area-inset-bottom, 0px)) !important;
  margin: 0 !important;
  pointer-events: auto !important;
  background: var(--aperture-bottom-bar-bg, rgba(7, 16, 13, 0.94)) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  backdrop-filter: blur(16px) !important;
  border-top: 1px solid var(--aperture-bottom-bar-border, rgba(160, 205, 185, 0.16)) !important;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.45) !important;
  box-sizing: border-box !important;
}

/* Hide legacy clean-restore unless active, and hide dialogue footer passage label */
[data-vn-clean-restore],
[data-vn-clean-restore][hidden],
.caption-foot,
[data-vn-dialogue-footer] {
  display: none !important;
}

/* Symmetrical 4-button navigation inside bottom bar */
.reader-action-row,
[data-vn-controls] {
  position: static !important;
  display: flex !important;
  flex-direction: row !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  height: 100% !important;
  box-sizing: border-box !important;
}

.reader-action-row > .action:not(.nav-step-btn) {
  height: 44px !important;
  width: 68px !important;
  min-width: 58px !important;
  max-width: 76px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 3px !important;
  border-radius: 8px !important;
  background: transparent !important;
  border: 0 !important;
  color: var(--aperture-muted, #9cb5a8) !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: all 0.15s ease !important;
}

.reader-action-row > .action:not(.nav-step-btn):hover {
  background: var(--aperture-button-hover-bg, rgba(220, 238, 177, 0.08)) !important;
  color: var(--aperture-accent, #dcebad) !important;
}

.reader-action-row > .action:not(.nav-step-btn) [data-vn-control-label] {
  font-size: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em !important;
  line-height: 1 !important;
}

.reader-action-row > .action:not(.nav-step-btn) [data-vn-control-icon] svg {
  width: 18px !important;
  height: 18px !important;
}

[data-vn-controls] > .nav-step-btn:disabled,
[data-vn-controls] > .nav-step-btn[aria-disabled="true"] {
  opacity: 0.3 !important;
  pointer-events: none !important;
}

/* =========================================================================
   WORKSPACE DASHBOARD (Screen 3)
   ========================================================================= */

.workspace-scene-card {
  padding: 22px 18px;
  margin: 18px 0 18px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(81, 118, 91, 0.22);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.25), 0 10px 28px rgba(16, 39, 29, 0.12);
}

body.theme-light .workspace-scene-card,
[data-aperture-mode="light"] .workspace-scene-card {
  background: linear-gradient(135deg, #e1edd9 0%, #d6e5cc 100%);
  color: #243a2e;
}

body.theme-dark .workspace-scene-card,
[data-aperture-mode="dark"] .workspace-scene-card {
  background: linear-gradient(134deg, #29473a 0%, #172f2d 98%);
  color: #f0f6e9;
  border-color: #607f67;
}

.workspace-scene-card .micro {
  font-size: 10px;
  letter-spacing: 0.15em;
  font-weight: 800;
}

body.theme-light .workspace-scene-card .micro { color: #47634f; }
body.theme-dark .workspace-scene-card .micro { color: #d5e3c7; }

.workspace-scene-card h2 {
  font-family: Georgia, serif;
  font-size: 28px;
  margin: 18px 0 4px;
  line-height: 1.2;
  font-weight: 400;
}

.workspace-scene-card p {
  font-size: 11px;
  margin: 0 0 16px;
  opacity: 0.85;
}

.workspace-scene-card .btn {
  padding: 0 16px;
  height: 40px;
  border-radius: 11px;
  font-size: 11.5px;
  font-weight: 680;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  cursor: pointer;
}

body.theme-light .workspace-scene-card .btn {
  background: #183a2c;
  color: #f2f7e9;
}

body.theme-dark .workspace-scene-card .btn {
  background: #e0ebb9;
  color: #1c3425;
}

.workspace-scene-orbit {
  position: absolute;
  right: -25px;
  top: -46px;
  border: 1px solid currentColor;
  width: 185px;
  height: 185px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.18;
}

.workspace-scene-orbit:after {
  content: '';
  position: absolute;
  inset: 28px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.6;
}

/* =========================================================================
   SETTINGS APERTURE HERO CARD (Screen 6)
   ========================================================================= */

.settings-intro {
  position: relative;
  overflow: hidden;
  padding: 19px 18px 15px;
  border-radius: 16px;
  border: 1px solid rgba(57, 85, 66, 0.18);
  background: linear-gradient(143deg, rgba(255, 255, 255, 0.48), rgba(220, 234, 213, 0.49));
  min-height: 164px;
  margin-bottom: 20px;
}

body.theme-dark .settings-intro,
[data-aperture-mode="dark"] .settings-intro {
  background: linear-gradient(143deg, rgba(56, 78, 63, 0.34), rgba(24, 42, 40, 0.32));
  border-color: rgba(204, 226, 186, 0.18);
}

.settings-intro .settings-kicker {
  position: relative;
  z-index: 2;
  font-size: 9px;
  letter-spacing: 0.15em;
  font-weight: 800;
  color: #436454;
}

body.theme-dark .settings-intro .settings-kicker { color: #c2d9ad; }

.settings-intro h1 {
  margin: 18px 0 6px;
  position: relative;
  z-index: 2;
  font-family: Georgia, serif;
  font-size: 30px;
  font-weight: 400;
}

.settings-intro p {
  position: relative;
  z-index: 2;
  max-width: 270px;
  font-size: 11px;
  line-height: 1.45;
  margin: 0;
  opacity: 0.85;
}

.settings-intro-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 2;
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid rgba(56, 90, 67, 0.14);
  font-size: 8px;
  letter-spacing: 0.09em;
  color: #4e6a5a;
}

body.theme-dark .settings-intro-foot {
  border-color: rgba(209, 227, 185, 0.16);
  color: #a8c0b1;
}

.settings-orbit {
  position: absolute;
  right: -45px;
  top: -21px;
  width: 220px;
  height: 166px;
  fill: none;
  stroke: #53755e;
  stroke-width: 0.75;
  opacity: 0.22;
  pointer-events: none;
}

.settings-orbit-point {
  fill: #8aa57e;
  stroke: none;
}

/* Appearance Preview with Mini Rings */
.appearance-surface-preview {
  height: 132px;
  margin: 16px 0 20px;
  background: linear-gradient(138deg, #304b49 0%, #192a2c 56%, #14252c 100%);
  color: #e9f4e8;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(241, 251, 224, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.13), 0 11px 23px rgba(37, 66, 50, 0.08);
  padding: 12px 14px;
}

.appearance-mini-rings {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: rgba(210, 233, 214, 0.18);
  stroke-width: 1;
  pointer-events: none;
}

.preview-appearance-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
  font-size: 9px;
  letter-spacing: 0.125em;
  color: #d4e5d5;
}

.preview-caption-mini {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  padding: 8px 12px 10px;
  background: rgba(4, 13, 18, var(--caption-opacity, 0.72));
  backdrop-filter: blur(var(--caption-blur, 8px));
  -webkit-backdrop-filter: blur(var(--caption-blur, 8px));
  border-radius: 9px;
  border: 1px solid rgba(240, 248, 223, 0.2);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.09);
}

.preview-caption-mini span {
  color: #d8e8b8;
  font-size: 8px;
  letter-spacing: 0.12em;
  font-weight: 800;
}

.preview-caption-mini p {
  font: 12.5px/1.3 Georgia, serif;
  margin: 5px 0 0;
  color: #f7f6ed;
}

/* =========================================================================
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

/* =========================================================================
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
