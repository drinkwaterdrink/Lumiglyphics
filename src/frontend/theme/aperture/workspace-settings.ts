/** Part of the APERTURE stylesheet. aperture-theme.ts joins the parts in order. */
export const APERTURE_CSS_WORKSPACE_SETTINGS = `/* =========================================================================
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

`;
