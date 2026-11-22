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
  background: var(--aperture-bottom-bar-bg, rgba(16, 24, 30, 0.95));
  color: var(--aperture-text, #eaf3e4);
  border: 1px solid var(--aperture-bottom-bar-border, rgba(160, 205, 185, 0.24));
}

.route-bar > :first-child {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
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

@media (max-width: 390px) {
  .route-bar {
    left: 8px;
    right: 8px;
    gap: 8px;
    padding: 5px 6px 5px 10px;
  }
  .route-bar .route-actions .menu-key {
    min-width: 44px;
    padding: 0 10px;
  }
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

/* Reader topbar — unified frosted pill bar that follows --caption-opacity */
.reader-topbar,
[data-vn-reader-header].reader-topbar {
  position: absolute !important;
  top: calc(8px + env(safe-area-inset-top, 0px)) !important;
  left: 10px !important;
  right: 10px !important;
  height: auto !important;
  min-height: 46px !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 6px !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--aperture-bottom-bar-bg, var(--vn-shell-panel, #0a1018)) calc(var(--caption-opacity, 0.84) * 100%), transparent) !important;
  -webkit-backdrop-filter: blur(calc(var(--caption-opacity, 0.84) * 20px)) !important;
  backdrop-filter: blur(calc(var(--caption-opacity, 0.84) * 20px)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) calc(var(--caption-opacity, 0.84) * 26%), rgba(255, 255, 255, 0.1)) !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, calc(var(--caption-opacity, 0.84) * 0.55)), inset 0 1px 0 rgba(255, 255, 255, calc(var(--caption-opacity, 0.84) * 0.18)) !important;
  z-index: 35 !important;
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease !important;
}
[data-vn-reader-header]:has([data-vn-world-strip]:not([hidden])) .reading-heading {
  display: none !important;
}
[data-vn-world-strip][hidden] {
  display: none !important;
}
[data-vn-world-strip] {
  flex: 1 1 auto !important;
  order: 1 !important;
  min-width: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: none !important;
  padding: 4px 8px !important;
  min-height: 30px !important;
  margin: 0 !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  line-height: 1.3 !important;
  letter-spacing: 0.01em !important;
  color: color-mix(in srgb, var(--aperture-text, #f4f7f5) 92%, transparent) !important;
  text-shadow: var(--aperture-text-shadow, 0 1px 3px rgba(0, 0, 0, 0.72)) !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  border-radius: 999px !important;
  transition: background 0.15s ease !important;
}
[data-vn-world-strip]::-webkit-scrollbar {
  display: none !important;
}
[data-vn-world-strip] .vn-world-glyph {
  display: none !important;
}
[data-vn-world-strip] .vn-world-token {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  white-space: nowrap !important;
  flex: none !important;
}
[data-vn-world-strip] .vn-world-token-icon {
  display: inline-flex !important;
  align-items: center !important;
  color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 85%, var(--aperture-text, #ffffff)) !important;
  opacity: 0.88 !important;
}
[data-vn-world-strip] .vn-world-sep {
  opacity: 0.48 !important;
  font-weight: 300 !important;
  margin: 0 1px !important;
  flex: none !important;
}
[data-reader-header-actions] {
  order: 2 !important;
  flex: none !important;
}
[data-vn-world-strip]:hover,
[data-vn-world-strip][aria-expanded="true"] {
  background: color-mix(in srgb, var(--aperture-accent, #a8d3c8) 12%, rgba(6, 15, 22, 0.48)) !important;
}
[data-vn-world-strip] .vn-world-doc-badge {
  margin-left: 4px !important;
  padding: 1px 6px !important;
  border-radius: 999px !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  background: color-mix(in srgb, var(--aperture-accent, #a8d3c8) 22%, rgba(0, 0, 0, 0.45)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #a8d3c8) 45%, transparent) !important;
  color: var(--aperture-text, #f4f7f5) !important;
  flex: none !important;
}
[data-vn-world-strip] .vn-world-chevron {
  margin-left: 2px !important;
  opacity: 0.65 !important;
  font-size: 10px !important;
  flex: none !important;
}
[data-vn-scene-postcard] {
  position: fixed !important;
  top: calc(74px + env(safe-area-inset-top, 0px)) !important;
  left: 14px !important;
  right: 14px !important;
  max-width: 380px !important;
  z-index: 255 !important;
  padding: 12px 14px !important;
  border-radius: 14px !important;
  background: var(--vn-shell-panel, rgba(12, 22, 28, 0.94)) !important;
  border: 1px solid var(--vn-shell-border-strong, rgba(168, 211, 200, 0.35)) !important;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.62) !important;
  backdrop-filter: blur(18px) !important;
  -webkit-backdrop-filter: blur(18px) !important;
  color: var(--vn-shell-text, #f1f5f9) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  pointer-events: auto !important;
}
[data-vn-scene-postcard] header {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}
[data-vn-scene-postcard] .vn-postcard-thumb {
  width: 48px !important;
  height: 48px !important;
  border-radius: 10px !important;
  overflow: hidden !important;
  flex: none !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(255, 255, 255, 0.08) !important;
  font-size: 18px !important;
}
[data-vn-scene-postcard] .vn-postcard-thumb img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
}
[data-vn-scene-postcard] .vn-postcard-title {
  flex: 1 !important;
  min-width: 0 !important;
}
[data-vn-scene-postcard] .vn-postcard-title strong {
  display: block !important;
  font-size: 14px !important;
  font-weight: 700 !important;
}
[data-vn-scene-postcard] .vn-postcard-title small {
  display: block !important;
  font-size: 11px !important;
  opacity: 0.78 !important;
}
[data-vn-scene-postcard] .vn-postcard-close {
  min-width: 44px !important;
  min-height: 44px !important;
  border-radius: 50% !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  background: transparent !important;
  color: inherit !important;
  cursor: pointer !important;
  font-size: 16px !important;
}
[data-vn-scene-postcard] .vn-postcard-pills {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
}
[data-vn-scene-postcard] .vn-postcard-pill {
  font-size: 11px !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: inherit !important;
}
[data-vn-scene-postcard] button.vn-postcard-pill {
  min-height: 44px !important;
  cursor: pointer !important;
}
[data-vn-scene-postcard] .vn-postcard-cta {
  width: 100% !important;
  min-height: 44px !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: var(--vn-shell-accent, #a8d3c8) !important;
  color: var(--vn-shell-accent-contrast, #0b1922) !important;
  font-weight: 750 !important;
  font-size: 12px !important;
  cursor: pointer !important;
}
[data-vn-world-strip] .vn-world-time {
  font-variant-numeric: tabular-nums !important;
  font-weight: 650 !important;
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

/* World Lens: show unified vertical directory list cleanly */
[data-vn-reference-sheet] [data-reference-list] {
  max-height: none !important;
  overflow: visible !important;
}

/* Character Folio: transparent overview container */
[data-reference-overview] {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* Workspace bottom padding */
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

/* Dock dialogue firmly above bottom action bar with a clean 8px gap */
[data-vn-dialogue]:not([hidden]):not([data-hidden="true"]),
[data-vn-root] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]),
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]),
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  position: absolute !important;
  z-index: 30 !important;
  left: 10px !important;
  right: 10px !important;
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
  transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
}

:where([data-vn-root]) [data-vn-dialogue]:not([hidden]):not([data-hidden="true"]) {
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 24%, var(--aperture-dialogue-border, var(--vn-dialogue-border, rgba(255, 255, 255, 0.16))));
  border-radius: min(var(--vn-shell-radius, 20px), 22px);
  background: var(--aperture-dialogue-bg, var(--vn-dialogue-bg, rgba(8, 14, 22, var(--caption-opacity, 0.84))));
  -webkit-backdrop-filter: blur(calc(var(--caption-opacity, 0.84) * 20px));
  backdrop-filter: blur(calc(var(--caption-opacity, 0.84) * 20px));
  box-shadow: 0 20px 48px rgba(0, 0, 0, calc(var(--caption-opacity, 0.84) * 0.62)), 0 0 24px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 8%, transparent), inset 0 1px 0 rgba(255, 255, 255, calc(var(--caption-opacity, 0.84) * 0.2));
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

/* Draggable Top Resize Grip — centered pill only so it never covers top-right tools */
.resize-grip {
  position: absolute !important;
  top: -10px !important;
  left: 50% !important;
  right: auto !important;
  width: 68px !important;
  transform: translateX(-50%) !important;
  height: 22px; min-height: 22px;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  cursor: ns-resize !important;
  touch-action: none !important;
  z-index: 25 !important;
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

/* Dialogue Footer */
[data-vn-dialogue-footer],
.caption-foot {
  display: none !important;
}

/* Dialogue Restore Button (when minimized) */
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

[data-vn-reader-header] .round-ghost {
  position: relative !important;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  flex-shrink: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  color: color-mix(in srgb, var(--aperture-text, #f7f9f3) 86%, transparent) !important;
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

[data-vn-reader-header] .round-ghost:hover {
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 16%, transparent) !important;
  border-color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 34%, transparent) !important;
  color: var(--aperture-accent, #c4b5fd) !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 24%, transparent) !important;
}

[data-vn-reader-header] .round-ghost.vn-pyramid-menu-btn {
  color: var(--aperture-accent, #c4b5fd) !important;
  background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, transparent), transparent 72%) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 34%, rgba(255, 255, 255, 0.12)) !important;
  box-shadow: 0 0 14px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 20%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

[data-vn-reader-header] .round-ghost.vn-pyramid-menu-btn svg {
  width: 18px !important;
  height: 18px !important;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 48%, transparent));
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), filter 0.22s ease !important;
}

[data-vn-reader-header] .round-ghost.vn-pyramid-menu-btn:hover svg {
  transform: translateY(-1px) scale(1.08);
  filter: drop-shadow(0 0 8px var(--aperture-accent, #c4b5fd));
}

.round-ghost[hidden] {
  display: none !important;
}

/* Hide desktop-only focus shortcut from mobile header */
[data-reader-focus] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* =========================================================================
   APERTURE DEDICATED BOTTOM BAR (Left Icons + Permanent Inline Message Bar)
   ========================================================================= */

.reader-actions,
[data-vn-root] .reader-actions {
  position: absolute !important;
  inset: auto 10px calc(8px + env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-inset, var(--vn-sheet-keyboard-inset, 0px))) 10px !important;
  left: 10px !important;
  right: 10px !important;
  height: 50px !important;
  z-index: 40 !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  padding: 0 6px 0 12px !important;
  margin: 0 !important;
  border-radius: 999px !important;
  pointer-events: auto !important;
  background: color-mix(in srgb, var(--aperture-bottom-bar-bg, var(--vn-shell-panel, #0b1018)) calc(var(--caption-opacity, 0.84) * 100%), transparent) !important;
  -webkit-backdrop-filter: blur(calc(var(--caption-opacity, 0.84) * 20px)) !important;
  backdrop-filter: blur(calc(var(--caption-opacity, 0.84) * 20px)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) calc(var(--caption-opacity, 0.84) * 24%), rgba(255, 255, 255, 0.1)) !important;
  box-shadow: 0 14px 36px rgba(0, 0, 0, calc(var(--caption-opacity, 0.84) * 0.58)), 0 0 20px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 6%, transparent), inset 0 1px 0 rgba(255, 255, 255, calc(var(--caption-opacity, 0.84) * 0.18)) !important;
  box-sizing: border-box !important;
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease !important;
}

/* Hide legacy clean-restore unless active, and hide dialogue footer passage label */
[data-vn-clean-restore][hidden],
.caption-foot,
[data-vn-dialogue-footer] {
  display: none !important;
}

/* Left icon navigation cluster inside bottom bar — seamless, no nested box */
.reader-action-row,
[data-vn-controls],
[data-vn-root] [data-vn-controls],
[data-vn-root][data-vn-preset] [data-vn-controls],
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-controls],
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-controls] {
  position: static !important;
  transform: none !important;
  display: inline-flex !important;
  flex-direction: row !important;
  justify-content: flex-start !important;
  align-items: center !important;
  gap: 4px !important;
  flex: 0 0 auto !important;
  width: auto !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  height: 100% !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-sizing: border-box !important;
}

.reader-action-row > .action:not(.nav-step-btn) {
  position: relative !important;
  height: 38px !important;
  width: 38px !important;
  min-width: 38px !important;
  max-width: 40px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  color: color-mix(in srgb, var(--aperture-text, #f1f5f9) 84%, transparent) !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease !important;
}

/* Strictly limit bottom toolbar to the 4 primary icons: Settings, World Lens, Char Folio, History */
[data-vn-controls] > :not([data-vn-control="settings"]):not([data-vn-control="lens"]):not([data-vn-control="cast"]):not([data-vn-control="log"]),
[data-vn-root] [data-vn-controls] > :not([data-vn-control="settings"]):not([data-vn-control="lens"]):not([data-vn-control="cast"]):not([data-vn-control="log"]),
[data-vn-root][data-vn-preset] [data-vn-controls] > :not([data-vn-control="settings"]):not([data-vn-control="lens"]):not([data-vn-control="cast"]):not([data-vn-control="log"]),
[data-vn-root][data-vn-adjustable-sheet="true"] [data-vn-controls] > :not([data-vn-control="settings"]):not([data-vn-control="lens"]):not([data-vn-control="cast"]):not([data-vn-control="log"]),
[data-vn-root][data-vn-adjustable-sheet="true"][data-vn-reader-layout] [data-vn-controls] > :not([data-vn-control="settings"]):not([data-vn-control="lens"]):not([data-vn-control="cast"]):not([data-vn-control="log"]) {
  display: none !important;
}

.reader-action-row > .action:not(.nav-step-btn)::after {
  content: "";
  position: absolute;
  inset: -4px;
}

.reader-action-row > .action:not(.nav-step-btn):hover {
  background: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 14%, transparent) !important;
  border-color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 32%, transparent) !important;
  color: var(--aperture-accent, #c4b5fd) !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, transparent) !important;
  transform: translateY(-1px) !important;
}

.reader-action-row > .action:not(.nav-step-btn):active {
  transform: scale(0.94) !important;
}

.reader-action-row > .action:not(.nav-step-btn) [data-vn-control-label] {
  display: none !important;
}

.reader-action-row > .action:not(.nav-step-btn) [data-vn-control-icon] svg {
  width: 18px !important;
  height: 18px !important;
}

/* Right permanent inline Message pill */
.reader-inline-composer,
[data-vn-inline-composer] {
  flex: 1 1 auto !important;
  min-width: 118px !important;
  height: 38px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 3px 4px 3px 14px !important;
  margin: 0 !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--vn-shell-field, #141b26) 76%, rgba(255, 255, 255, 0.05)) !important;
  border: 1px solid color-mix(in srgb, var(--aperture-accent, #c4b5fd) 22%, rgba(255, 255, 255, 0.14)) !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.36) !important;
  box-sizing: border-box !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease !important;
}

.reader-inline-composer:focus-within,
[data-vn-inline-composer]:focus-within {
  border-color: color-mix(in srgb, var(--aperture-accent, #c4b5fd) 68%, rgba(255, 255, 255, 0.35)) !important;
  box-shadow: 0 0 16px color-mix(in srgb, var(--aperture-accent, #c4b5fd) 26%, transparent), inset 0 1px 2px rgba(0, 0, 0, 0.25) !important;
  background: color-mix(in srgb, var(--vn-shell-field, #141b26) 88%, rgba(255, 255, 255, 0.07)) !important;
}

[data-vn-inline-message] {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: var(--aperture-text, #f8fafc) !important;
  font-size: 13px !important;
  font-family: inherit !important;
  line-height: 1.2 !important;
  padding: 0 !important;
  margin: 0 !important;
}

[data-vn-inline-message]::placeholder {
  color: color-mix(in srgb, var(--aperture-muted, #94a3b8) 78%, transparent) !important;
}
@media (pointer: coarse) {
  [data-vn-inline-message] {
    font-size: 16px !important;
  }
}

[data-vn-inline-send] {
  position: relative !important;
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  border-radius: 50% !important;
  border: 0 !important;
  flex: none !important;
  display: grid !important;
  place-items: center !important;
  cursor: pointer !important;
  padding: 0 !important;
  background: linear-gradient(135deg, var(--aperture-accent, #a78bfa), color-mix(in srgb, var(--aperture-accent, #a78bfa) 74%, #818cf8)) !important;
  color: var(--aperture-accent-contrast, #0f172a) !important;
  box-shadow: 0 2px 12px var(--aperture-accent-glow, rgba(167, 139, 250, 0.45)), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease !important;
}

[data-vn-inline-send]::after {
  content: "";
  position: absolute;
  inset: -7px;
}

[data-vn-inline-send] svg {
  width: 14px !important;
  height: 14px !important;
  transform: translate(-0.5px, 0.5px);
}

[data-vn-inline-send]:hover:not(:disabled) {
  transform: scale(1.06) !important;
  box-shadow: 0 4px 16px var(--aperture-accent-glow, rgba(167, 139, 250, 0.68)), inset 0 1px 0 rgba(255, 255, 255, 0.45) !important;
}

[data-vn-inline-send]:active:not(:disabled) {
  transform: scale(0.94) !important;
}

[data-vn-inline-send]:disabled {
  opacity: 0.78 !important;
}

.nav-step-btn:disabled,
.nav-step-btn[aria-disabled="true"] {
  opacity: 0.32 !important;
  pointer-events: none !important;
}

`;
