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

.route-bar {
  background: var(--aperture-bottom-bar-bg, rgba(16, 24, 30, 0.95));
  color: var(--aperture-text, #eaf3e4);
  border: 1px solid var(--aperture-bottom-bar-border, rgba(160, 205, 185, 0.24));
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
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
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
  border-radius: min(var(--vn-shell-radius, 12px), 14px);
  background: var(--vn-shell-accent, #dce9b5);
  color: var(--vn-shell-accent-contrast, #1b3124) !important;
  font-size: 11px;
  font-weight: 740;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
}

/* Reserve scrolling room above the persistent route bar */

/* Legacy navigation suppressed offscreen */
[data-vn-navigation] {
  display: none !important;
  visibility: hidden !important;
  position: absolute !important;
  left: -9999px !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 1px !important;
  height: 1px !important;
}

/* Hide legacy elements in APERTURE v4 while allowing TTS mini-player popover when open */
.vn-speech-dock:not([data-open="true"]),
[data-vn-panel-layer] .launcher,
.launcher {
  display: none !important;
}
.vn-speech-dock[data-open="true"] {
  display: block !important;
}

/* Hide duplicate Cast icon in mobile topbar (Cast lives in the bottom navigation bar on mobile) */
@media (max-width: 639px) {
  [data-vn-reader-header] [data-action="cast-toggle"] {
    display: none !important;
  }
}
.round-ghost[data-action="voice-toggle"].speaking {
  border-color: var(--aperture-accent, #dcebad) !important;
  color: var(--aperture-accent, #dcebad) !important;
  box-shadow: 0 0 12px var(--aperture-accent-glow, rgba(220, 238, 173, 0.45)) !important;
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
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  row-gap: 4px !important;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 8px !important;
  background: linear-gradient(180deg, color-mix(in srgb, var(--vn-shell-panel, #060f16) 76%, transparent), transparent) !important;
  border: 0 !important;
  border-bottom: 0 !important;
  z-index: 35 !important;
}
[data-vn-world-strip][hidden] {
  display: none !important;
}
[data-vn-world-strip] {
  flex: 1 0 100% !important;
  order: 10 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-wrap: nowrap !important;
  overflow: hidden !important;
  padding: 2px 10px 2px 42px !important;
  margin: 0 !important;
  font-size: 11px !important;
  line-height: 1.3 !important;
  letter-spacing: 0.02em !important;
  color: color-mix(in srgb, var(--aperture-text, #f4f7f5) 88%, transparent) !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.72) !important;
  pointer-events: none !important;
}
[data-vn-world-strip] .vn-world-glyph {
  display: inline-flex !important;
  align-items: center !important;
  color: var(--vn-accent, #a8d3c8) !important;
  flex: none !important;
}
[data-vn-world-strip] .vn-world-time {
  font-variant-numeric: tabular-nums !important;
  font-weight: 650 !important;
}
[data-vn-world-strip] .vn-world-sep {
  opacity: 0.48 !important;
}
[data-vn-world-strip] .vn-world-weather {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
[data-vn-reader-header] [data-reader-header-actions],
.topbar-actions {
  margin-right: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
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
  color: var(--aperture-text, #f7f9f3) !important;
}

.reading-heading small {
  display: block !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-size: 9px !important;
  color: var(--aperture-muted, #9cb5a8) !important;
  opacity: 0.92 !important;
}

/* Dialogue quote accent harmonized per theme */
.dialogue-quote {
  color: var(--vn-quote-color, var(--aperture-accent, #d68c73)) !important;
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
  padding-bottom: 0 !important;
}
.page-padding {
  padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px)) !important;
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
  bottom: calc(96px + env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-inset, var(--vn-sheet-keyboard-inset, 0px))) !important;
  height: var(--caption-height, 142px);
  min-height: 48px;
  max-height: calc(100% - 160px) !important;
  padding: 16px 14px 8px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
}

:where([data-vn-root]) [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  border: 1px solid var(--aperture-dialogue-border, var(--vn-dialogue-border, rgba(224, 238, 217, 0.32)));
  border-radius: min(var(--vn-shell-radius, 16px), 18px);
  background: var(--aperture-dialogue-bg, var(--vn-dialogue-bg, rgba(4, 13, 17, var(--caption-opacity, 0.72))));
  -webkit-backdrop-filter: blur(var(--caption-blur, 10px));
  backdrop-filter: blur(var(--caption-blur, 10px));
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.caption-edge {
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  transform: scaleY(0.65);
  transform-origin: top;
  background: linear-gradient(90deg, transparent, var(--vn-edge-glow, var(--aperture-accent, rgba(224, 238, 177, 0.48))), transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--vn-edge-glow, var(--aperture-accent, #dcebad)) 55%, transparent);
  pointer-events: none;
}

/* Draggable Top Resize Grip */
.resize-grip {
  position: absolute !important;
  top: -12px;
  left: 0 !important;
  right: 0 !important;
  height: 44px; min-height: 44px;
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
  border-radius: var(--vn-scrubber-radius, 999px);
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 48%, transparent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transition: background 0.2s ease, width 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.resize-grip:hover span,
.resize-grip:active span,
.resize-grip:focus-visible span {
  background: var(--aperture-accent, #dcebad);
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
  flex: 0 0 auto !important;
  min-height: 44px !important;
  touch-action: none !important;
  border-bottom: 1px solid color-mix(in srgb, var(--aperture-accent, #dcebad) 20%, transparent) !important;
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
  color: var(--aperture-accent, #dcebad) !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.caption-split {
  font-size: 10px !important;
  color: color-mix(in srgb, var(--aperture-accent, #dcebad) 45%, transparent) !important;
  font-weight: 400 !important;
}

[data-vn-caption-scene] {
  font-size: 9.5px !important;
  letter-spacing: 0.08em !important;
  color: var(--aperture-muted, #a4b8ad) !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  opacity: 0.9 !important;
}

.caption-head-actions {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex: none !important;
}

.caption-tool {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: grid !important;
  place-items: center !important;
  color: var(--aperture-button-text, #f0f4e7) !important;
  opacity: 0.85 !important;
  border-radius: min(var(--vn-shell-radius, 8px), 10px) !important;
  border: 1px solid var(--aperture-button-border, rgba(255, 255, 255, 0.18)) !important;
  background: color-mix(in srgb, var(--aperture-button-bg, #0d161a) 55%, transparent) !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  padding: 0 !important;
}

.caption-tool:hover {
  background: color-mix(in srgb, var(--aperture-accent, #dcebad) 22%, transparent) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
  color: var(--aperture-accent, #dcebad) !important;
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
  font-size: var(--reader-font, 15px) !important;
  line-height: 1.42;
  letter-spacing: 0;
  word-spacing: normal;
  font-kerning: normal;
  text-align: left;
  user-select: text !important;
  overflow-wrap: break-word !important;
}

:where([data-vn-root]) [data-vn-dialogue-text] {
  color: var(--aperture-text, var(--vn-text, #f9faf6));
  font-family: var(--vn-font-family, Georgia, 'Times New Roman', serif);
  text-shadow: 0 2px 7px rgba(0, 0, 0, 0.82), 0 1px 1px black;
}

/* Dialogue Footer */
[data-vn-dialogue-footer],
.caption-foot {
  display: none !important;
}

/* Dialogue Restore Button (when minimized) */
[data-vn-show-text][hidden],
.caption-restore[hidden] {
  display: none !important;
}
[data-vn-clean-restore]:not([hidden]),
.caption-restore:not([hidden]),
[data-vn-show-text]:not([hidden]) {
  position: absolute !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
  padding: 0 !important;
  border-radius: var(--vn-shell-radius, 50%) !important;
  background: var(--aperture-button-bg, rgba(11, 23, 19, 0.88)) !important;
  border: 1px solid var(--aperture-button-border, rgba(220, 238, 173, 0.42)) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  color: var(--aperture-accent, #dcebad) !important;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55) !important;
  display: grid !important;
  place-items: center !important;
  z-index: 50 !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  transition: background 160ms ease, transform 160ms ease !important;
}

[data-vn-clean-restore]:hover, .caption-restore:hover, [data-vn-show-text]:hover {
  background: var(--aperture-button-hover-bg, rgba(35, 75, 57, 0.92)) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
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
  background: linear-gradient(180deg, color-mix(in srgb, var(--vn-shell-panel, #060f16) 74%, transparent), transparent);
}

.reader-topbar strong {
  font-size: 11px;
  font-weight: 700;
  color: var(--aperture-text, #f7f9f3);
}

.reader-topbar small {
  display: block;
  font-size: 9px;
  color: var(--aperture-muted, #9cb5a8);
  opacity: 0.9;
}

.round-ghost {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50% !important;
  border: 1px solid var(--aperture-button-border, rgba(245, 249, 240, 0.34)) !important;
  background: var(--aperture-ghost-bg, rgba(5, 15, 19, 0.5)) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  display: grid !important;
  place-items: center !important;
  color: var(--aperture-text, #f7f9f3) !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  padding: 0 !important;
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, color 0.16s ease !important;
}

.round-ghost svg {
  width: 17px !important;
  height: 17px !important;
}

.round-ghost:hover {
  background: var(--aperture-button-hover-bg, rgba(21, 36, 42, 0.75)) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
  color: var(--aperture-accent, #dcebad) !important;
}

.round-ghost:active {
  transform: scale(0.92) !important;
  border-color: var(--aperture-accent, #dcebad) !important;
}

.round-ghost[data-action="chat-exit"] {
  border-color: var(--aperture-accent, rgba(245, 249, 240, 0.5)) !important;
  color: var(--aperture-accent, #dcebad) !important;
}

.round-ghost[data-action="chat-exit"]:hover {
  background: var(--aperture-accent, #dcebad) !important;
  color: var(--aperture-accent-contrast, #11241c) !important;
}

/* Hide desktop-only search and focus shortcuts from mobile header */
[data-reader-search],
[data-reader-focus] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* =========================================================================
   APERTURE DEDICATED BOTTOM BAR (History, World Lens, Cast, Settings)
   ========================================================================= */

.reader-actions,
[data-vn-root] .reader-actions {
  position: absolute !important;
  inset: auto 0 0 !important;
  bottom: var(--reader-keyboard-inset, var(--vn-sheet-keyboard-inset, 0px)) !important;
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
[data-vn-clean-restore][hidden],
.caption-foot,
[data-vn-dialogue-footer] {
  display: none !important;
}

/* Symmetrical 4-button navigation inside bottom bar */
.reader-action-row,
[data-vn-controls] {
  position: static !important;
  transform: none !important;
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
  display: block !important;
  font-size: 9.5px !important;
  font-weight: 650 !important;
  letter-spacing: 0.03em !important;
  line-height: 1.05 !important;
  white-space: nowrap !important;
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
