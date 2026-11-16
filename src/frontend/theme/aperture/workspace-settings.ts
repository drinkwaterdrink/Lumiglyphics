/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_WORKSPACE_SETTINGS = `/* =========================================================================
   WORKSPACE DASHBOARD (Screen 3)
   ========================================================================= */

.workspace-scene-card {
  padding: 22px 18px;
  margin: 18px 0 18px;
  border-radius: min(var(--vn-shell-radius, 16px), 18px);
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(135deg, color-mix(in srgb, var(--vn-shell-accent, #dcebad) 14%, var(--vn-shell-panel, #111a1e)) 0%, var(--vn-shell-field, #182429) 100%);
  color: var(--vn-shell-text, #f0f6e9);
  border: 1px solid var(--vn-shell-border-strong, var(--vn-shell-border, rgba(160, 205, 185, 0.22)));
  box-shadow: var(--vn-shell-shadow, inset 0 1px rgba(255, 255, 255, 0.16));
}

.workspace-scene-card .micro {
  font-size: 10px;
  letter-spacing: 0.15em;
  font-weight: 800;
  color: var(--vn-shell-accent, #dcebad);
}

.workspace-scene-card h2 {
  font-family: var(--vn-shell-display-font, Georgia, serif);
  font-size: 28px;
  margin: 18px 0 4px;
  line-height: 1.2;
  font-weight: 400;
}

.workspace-scene-card p {
  font-size: 11px;
  margin: 0 0 16px;
  color: var(--vn-shell-muted, inherit);
}

.workspace-scene-card .btn {
  padding: 0 16px;
  height: 44px;
  border-radius: min(var(--vn-shell-radius, 11px), 12px);
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  cursor: pointer;
  background: var(--vn-shell-accent, #dcebad);
  color: var(--vn-shell-accent-contrast, #11241c);
}

.workspace-scene-orbit {
  position: absolute;
  right: -25px;
  top: -46px;
  border: 1px solid var(--vn-shell-accent, currentColor);
  width: 185px;
  height: 185px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.2;
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
  border-radius: min(var(--vn-shell-radius, 16px), 18px);
  border: 1px solid var(--vn-shell-border, rgba(160, 205, 185, 0.22));
  background: linear-gradient(143deg, color-mix(in srgb, var(--vn-shell-accent, #dcebad) 10%, var(--vn-shell-field, #182429)), var(--vn-shell-panel, #111a1e));
  min-height: 164px;
  margin-bottom: 20px;
}

.settings-intro .settings-kicker {
  position: relative;
  z-index: 2;
  font-size: 9px;
  letter-spacing: 0.15em;
  font-weight: 800;
  color: var(--vn-shell-accent, #dcebad);
}

.settings-intro h1 {
  margin: 18px 0 6px;
  position: relative;
  z-index: 2;
  font-family: var(--vn-shell-display-font, Georgia, serif);
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
  color: var(--vn-shell-muted, inherit);
}

.settings-intro-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 2;
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid var(--vn-shell-border, rgba(160, 205, 185, 0.16));
  font-size: 8px;
  letter-spacing: 0.09em;
  color: var(--vn-shell-muted, #9cb5a8);
}

.settings-orbit {
  position: absolute;
  right: -45px;
  top: -21px;
  width: 220px;
  height: 166px;
  fill: none;
  stroke: var(--vn-shell-accent, #dcebad);
  stroke-width: 0.75;
  opacity: 0.24;
  pointer-events: none;
}

.settings-orbit-point {
  fill: var(--vn-shell-accent, #dcebad);
  stroke: none;
}

/* Appearance Preview with Mini Rings */
.appearance-surface-preview {
  height: 132px;
  margin: 16px 0 20px;
  background: var(--vn-shell-surface-gradient, var(--aperture-workspace-bg, #14252c));
  color: var(--vn-shell-text, #e9f4e8);
  position: relative;
  border-radius: min(var(--vn-shell-radius, 14px), 16px);
  overflow: hidden;
  border: 1px solid var(--vn-shell-border-strong, var(--vn-shell-border, rgba(241, 251, 224, 0.24)));
  box-shadow: var(--vn-shell-shadow, 0 11px 23px rgba(0, 0, 0, 0.22));
  padding: 12px 14px;
}

.appearance-mini-rings {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: var(--vn-shell-ring, rgba(210, 233, 214, 0.18));
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
  color: var(--vn-shell-muted, #d4e5d5);
}

.preview-caption-mini {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  padding: 8px 12px 10px;
  background: var(--aperture-dialogue-bg, rgba(4, 13, 18, var(--caption-opacity, 0.72)));
  backdrop-filter: blur(var(--caption-blur, 8px));
  -webkit-backdrop-filter: blur(var(--caption-blur, 8px));
  border-radius: min(var(--vn-shell-radius, 9px), 12px);
  border: 1px solid var(--aperture-dialogue-border, rgba(240, 248, 223, 0.2));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.09);
}

.preview-caption-mini span {
  color: var(--vn-shell-accent, #d8e8b8);
  font-size: 8px;
  letter-spacing: 0.12em;
  font-weight: 800;
}

.preview-caption-mini p {
  font: 12.5px/1.3 var(--vn-shell-family, Georgia, serif);
  margin: 5px 0 0;
  color: var(--vn-shell-text, #f7f6ed);
}

`;
