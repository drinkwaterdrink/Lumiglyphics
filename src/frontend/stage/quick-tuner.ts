import { THEME_PRESET_IDS, type VisualNovelConfig, type VisualNovelThemePreset } from "../../config.js";
import { normalizeReaderPreferences } from "../../shared/reader-preferences.js";
import { VN_SHELL_PRESET_TOKENS_CSS } from "../theme/palette-tokens.js";

export type QuickTunerDrawerOptions = {
  mount: HTMLElement;
  onPatch: (patch: Partial<VisualNovelConfig>) => void;
};

const PRESET_SHORT_LABELS: Record<VisualNovelThemePreset, string> = {
  lumiverse: "Lumiverse",
  "golden-hour": "Golden Hour",
  "boxed-console": "Boxed",
  "paper-novel": "Paper Novel",
  "midnight-noir": "Noir",
  "yamaku-classic": "Yamaku",
  "literature-club": "Literature",
  "astral-glass": "Astral Glass",
  "neon-rain": "Neon Rain",
  "obsidian-reliquary": "Obsidian",
};

const TUNER_CSS = `
${VN_SHELL_PRESET_TOKENS_CSS}
:host {
  position: absolute;
  inset: 0;
  z-index: 92;
  pointer-events: none;
  font: 13px/1.4 var(--vn-shell-family, system-ui, -apple-system, sans-serif);
  color: var(--vn-shell-text, #f4f7ee);
}
:host(:not([data-open="true"])) {
  display: none !important;
}
.tuner-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px 12px calc(74px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}
.tuner-sheet {
  width: min(460px, 100%);
  max-height: 72dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: min(var(--vn-shell-radius, 18px), 20px);
  border: 1px solid var(--vn-shell-border-strong, var(--vn-shell-border, rgba(255, 255, 255, 0.22)));
  background: var(--vn-shell-surface-gradient, var(--vn-shell-panel, rgba(14, 20, 26, 0.96)));
  box-shadow: var(--vn-shell-shadow, 0 18px 46px rgba(0, 0, 0, 0.6));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tuner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tuner-title {
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vn-shell-accent, #dcebad);
}
.tuner-close {
  min-width: 44px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.16));
  background: var(--vn-shell-button, rgba(255, 255, 255, 0.08));
  color: var(--vn-shell-text, #f4f7ee);
  font-size: 18px;
  cursor: pointer;
}
.tuner-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tuner-pill {
  min-height: 44px;
  min-width: 44px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.18));
  background: var(--vn-shell-field, rgba(255, 255, 255, 0.06));
  color: var(--vn-shell-text, #f4f7ee);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.tuner-pill[aria-pressed="true"] {
  background: var(--vn-shell-accent, #dcebad);
  color: var(--vn-shell-accent-contrast, #0d1f17);
  border-color: transparent;
  font-weight: 750;
}
.tuner-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tuner-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
}
.tuner-field-val {
  color: var(--vn-shell-accent, #dcebad);
  font-variant-numeric: tabular-nums;
}
input[type="range"] {
  width: 100%;
  min-height: 36px;
  accent-color: var(--vn-shell-accent, #dcebad);
}
.tuner-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 2px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.tuner-toggle input {
  width: 20px;
  height: 20px;
  accent-color: var(--vn-shell-accent, #dcebad);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/**
 * Live Quick-Appearance & Audio Tuner Drawer (#14):
 * Slides over the live Reader View for instant preset, opacity, Chromatic Rim,
 * text scale, and ambience/TTS volume adjustments.
 */
export class QuickTunerDrawer {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly closeBtn: HTMLButtonElement;
  private readonly presetButtons = new Map<VisualNovelThemePreset, HTMLButtonElement>();
  private readonly opacityInput: HTMLInputElement;
  private readonly opacityVal: HTMLElement;
  private readonly textScaleInput: HTMLInputElement;
  private readonly textScaleVal: HTMLElement;
  private readonly ambientInput: HTMLInputElement;
  private readonly ambientVal: HTMLElement;
  private readonly ttsInput: HTMLInputElement;
  private readonly ttsVal: HTMLElement;
  private readonly rimCheckbox: HTMLInputElement;
  private openState = false;
  private opener: HTMLElement | null = null;
  private config: VisualNovelConfig | null = null;

  constructor(private readonly options: QuickTunerDrawerOptions) {
    this.host = document.createElement("div");
    this.host.dataset.vnQuickTuner = "";
    this.host.dataset.open = "false";
    this.host.style.display = "none";
    this.shadow = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = TUNER_CSS;

    const backdrop = document.createElement("div");
    backdrop.className = "tuner-backdrop";
    backdrop.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target === backdrop) this.close();
    });

    const sheet = document.createElement("div");
    sheet.className = "tuner-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Quick Look and Audio Tuner");
    sheet.addEventListener("click", (event) => event.stopPropagation());
    sheet.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });

    const head = document.createElement("div");
    head.className = "tuner-head";
    const title = document.createElement("span");
    title.className = "tuner-title";
    title.textContent = "Quick Look & Audio";
    this.closeBtn = document.createElement("button");
    this.closeBtn.type = "button";
    this.closeBtn.className = "tuner-close";
    this.closeBtn.setAttribute("aria-label", "Close Quick Tuner");
    this.closeBtn.textContent = "×";
    this.closeBtn.addEventListener("click", () => this.close());
    head.append(title, this.closeBtn);

    const presetsWrap = document.createElement("div");
    presetsWrap.className = "tuner-presets";
    presetsWrap.setAttribute("role", "group");
    presetsWrap.setAttribute("aria-label", "Theme preset");
    for (const id of THEME_PRESET_IDS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tuner-pill";
      btn.dataset.tunerPreset = id;
      btn.textContent = PRESET_SHORT_LABELS[id];
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        if (!this.config) return;
        this.config = { ...this.config, themePreset: id };
        this.syncUi();
        this.options.onPatch({ themePreset: id });
      });
      this.presetButtons.set(id, btn);
      presetsWrap.appendChild(btn);
    }

    const makeRange = (labelText: string, min: number, max: number, step: number, name: string) => {
      const wrap = document.createElement("label");
      wrap.className = "tuner-field";
      const row = document.createElement("div");
      row.className = "tuner-field-row";
      const lbl = document.createElement("span");
      lbl.textContent = labelText;
      const val = document.createElement("span");
      val.className = "tuner-field-val";
      row.append(lbl, val);
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.dataset.tunerRange = name;
      wrap.append(row, input);
      return { wrap, input, val };
    };

    const op = makeRange("Glass Opacity", 0.25, 1, 0.05, "opacity");
    this.opacityInput = op.input;
    this.opacityVal = op.val;
    this.opacityInput.addEventListener("input", () => {
      if (!this.config) return;
      const v = Number(this.opacityInput.value);
      this.opacityVal.textContent = `${Math.round(v * 100)}%`;
      const nextPrefs = normalizeReaderPreferences({ ...this.config.readerPreferences, backgroundOpacity: v });
      this.config = { ...this.config, readerPreferences: nextPrefs };
      this.options.onPatch({ readerPreferences: nextPrefs });
    });

    const ts = makeRange("Text Scale", 0.85, 1.35, 0.05, "textScale");
    this.textScaleInput = ts.input;
    this.textScaleVal = ts.val;
    this.textScaleInput.addEventListener("input", () => {
      if (!this.config) return;
      const v = Number(this.textScaleInput.value);
      this.textScaleVal.textContent = `${Math.round(v * 100)}%`;
      this.config = { ...this.config, textScale: v };
      this.options.onPatch({ textScale: v });
    });

    const amb = makeRange("Ambience Volume", 0, 1, 0.05, "ambientVolume");
    this.ambientInput = amb.input;
    this.ambientVal = amb.val;
    this.ambientInput.addEventListener("input", () => {
      if (!this.config) return;
      const v = Number(this.ambientInput.value);
      this.ambientVal.textContent = `${Math.round(v * 100)}%`;
      this.config = { ...this.config, ambientVolume: v };
      this.options.onPatch({ ambientVolume: v });
    });

    const tts = makeRange("TTS Volume", 0, 1, 0.05, "ttsVolume");
    this.ttsInput = tts.input;
    this.ttsVal = tts.val;
    this.ttsInput.addEventListener("input", () => {
      if (!this.config) return;
      const v = Number(this.ttsInput.value);
      this.ttsVal.textContent = `${Math.round(v * 100)}%`;
      const nextSpeech = { ...this.config.speech, volume: v };
      this.config = { ...this.config, speech: nextSpeech };
      this.options.onPatch({ speech: nextSpeech });
    });

    const rimLabel = document.createElement("label");
    rimLabel.className = "tuner-toggle";
    const rimText = document.createElement("span");
    rimText.textContent = "Chromatic Rim (adaptive glass tint)";
    this.rimCheckbox = document.createElement("input");
    this.rimCheckbox.type = "checkbox";
    this.rimCheckbox.dataset.tunerRim = "";
    this.rimCheckbox.addEventListener("change", () => {
      if (!this.config) return;
      const nextPrefs = normalizeReaderPreferences({ ...this.config.readerPreferences, adaptiveTint: this.rimCheckbox.checked });
      this.config = { ...this.config, readerPreferences: nextPrefs };
      this.options.onPatch({ readerPreferences: nextPrefs });
    });
    rimLabel.append(rimText, this.rimCheckbox);

    sheet.append(head, presetsWrap, op.wrap, ts.wrap, amb.wrap, tts.wrap, rimLabel);
    backdrop.appendChild(sheet);
    this.shadow.append(style, backdrop);
    options.mount.appendChild(this.host);
  }

  setConfig(config: VisualNovelConfig | null): void {
    this.config = config;
    if (config) {
      this.host.dataset.vnPreset = config.themePreset;
      this.syncUi();
    }
  }

  isOpen(): boolean {
    return this.openState;
  }

  getShadowRoot(): ShadowRoot {
    return this.shadow;
  }

  open(opener?: HTMLElement | null): void {
    this.opener = opener ?? null;
    this.openState = true;
    this.host.dataset.open = "true";
    this.host.style.display = "block";
    this.syncUi();
    this.closeBtn.focus?.({ preventScroll: true });
  }

  close(restoreFocus = true): void {
    if (!this.openState) return;
    this.openState = false;
    this.host.dataset.open = "false";
    this.host.style.display = "none";
    if (restoreFocus) {
      this.opener?.focus?.({ preventScroll: true });
    }
    this.opener = null;
  }

  destroy(): void {
    this.host.remove();
  }

  private syncUi(): void {
    const cfg = this.config;
    if (!cfg) return;
    this.host.dataset.vnPreset = cfg.themePreset;
    for (const [id, btn] of this.presetButtons.entries()) {
      btn.setAttribute("aria-pressed", id === cfg.themePreset ? "true" : "false");
    }
    const opacity = cfg.readerPreferences.backgroundOpacity ?? 0.9;
    this.opacityInput.value = String(opacity);
    this.opacityVal.textContent = `${Math.round(opacity * 100)}%`;

    this.textScaleInput.value = String(cfg.textScale);
    this.textScaleVal.textContent = `${Math.round(cfg.textScale * 100)}%`;

    this.ambientInput.value = String(cfg.ambientVolume);
    this.ambientVal.textContent = `${Math.round(cfg.ambientVolume * 100)}%`;

    const ttsVol = cfg.speech?.volume ?? 1;
    this.ttsInput.value = String(ttsVol);
    this.ttsVal.textContent = `${Math.round(ttsVol * 100)}%`;

    this.rimCheckbox.checked = cfg.readerPreferences.adaptiveTint !== false;
  }
}
