/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_ROUTE_BAR_READER = `/* =========================================================================
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

`;
