import type { SpeechStatus } from "./controller.js";

/**
 * Minimal speech dock: Play/Pause + Stop + a truthful status line for the
 * current assistant paragraph. Mounted by the host controller into the overlay
 * root as its own element (no VnStage changes), shown only while the overlay is
 * active AND speech is enabled. Errors/blocked autoplay are displayed here and
 * never thrown into the reading flow.
 */
export type SpeechDockOptions = {
  mount: HTMLElement;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onEnableAndPlay?: () => void;
};

const DOCK_CSS = `
:host {
  position: absolute;
  top: calc(58px + env(safe-area-inset-top, 0px));
  right: max(12px, env(safe-area-inset-right, 0px));
  z-index: 85;
  width: min(310px, calc(100vw - 24px));
  font: 13px/1.4 var(--lumiverse-font-family, system-ui, -apple-system, sans-serif);
  pointer-events: auto;
}
:host(:not([data-open="true"])) {
  display: none !important;
}
[data-dock] {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--aperture-border, rgba(220, 238, 173, 0.28));
  background: var(--aperture-surface-strong, rgba(11, 22, 18, 0.94));
  color: var(--aperture-text, #f4f7ee);
  font-family: var(--vn-shell-family, inherit);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: tts-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes tts-pop {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.tts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tts-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--aperture-accent, #dcebad);
}
.tts-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(160, 195, 175, 0.45);
}
:host([data-playing="true"]) .tts-dot {
  background: var(--aperture-accent, #dcebad);
  box-shadow: 0 0 8px var(--aperture-accent, #dcebad);
}
.tts-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  flex: 1 1 auto;
  border-radius: 999px;
  border: 1px solid rgba(220, 238, 173, 0.28);
  background: rgba(220, 238, 173, 0.12);
  color: var(--aperture-text, #f4f7ee);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;
}
button[data-tts-primary] {
  background: var(--aperture-accent, #dcebad);
  color: var(--aperture-accent-fg, #0d1f17);
  border-color: transparent;
  font-weight: 750;
}
button[data-tts-icon] {
  flex: 0 0 34px;
  min-width: 34px;
  width: 34px;
  height: 34px;
  min-height: 34px;
  padding: 0;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
}
button[data-speech-close] {
  flex: 0 0 26px;
  min-width: 26px;
  width: 26px;
  height: 26px;
  min-height: 26px;
  padding: 0;
  font-size: 15px;
  background: transparent;
  border-color: transparent;
  color: rgba(244, 247, 238, 0.68);
}
button:hover:not(:disabled) {
  border-color: var(--aperture-accent, #dcebad);
  filter: brightness(1.06);
}
button:active:not(:disabled) { transform: scale(0.95); }
button:focus-visible { outline: 2px solid var(--aperture-accent, #dcebad); outline-offset: 2px; }
button:disabled { opacity: 0.42; cursor: default; }
[data-status] {
  font-size: 12px;
  line-height: 1.35;
  color: var(--aperture-muted, rgba(235, 242, 230, 0.78));
  overflow-wrap: anywhere;
}
[data-status]:empty { display: none; }
[data-status][data-tone="error"] { color: var(--lumiverse-danger, #ff9aa8); }
@media (prefers-reduced-motion: reduce) {
  [data-dock] { animation: none; }
  button { transition: none; }
  button:active:not(:disabled) { transform: none; }
}`;

export class SpeechDock {
  private readonly host: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly stopButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly statusEl: HTMLElement;
  private enabled = false;
  private overlayActive = false;
  private playing = false;
  private popoverOpen = false;
  private lastStatus: SpeechStatus = { kind: "off" };

  constructor(private readonly options: SpeechDockOptions) {
    this.host = document.createElement("div");
    this.host.className = "vn-speech-dock";
    const shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = DOCK_CSS;
    const dock = document.createElement("div");
    dock.setAttribute("data-dock", "");
    dock.setAttribute("role", "group");
    dock.setAttribute("aria-label", "Paragraph speech");

    const head = document.createElement("div");
    head.className = "tts-head";
    const title = document.createElement("span");
    title.className = "tts-title";
    const dot = document.createElement("span");
    dot.className = "tts-dot";
    const titleLabel = document.createElement("span");
    titleLabel.textContent = "Voice Reader";
    title.append(dot, titleLabel);

    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.setAttribute("data-speech-close", "");
    this.closeButton.setAttribute("aria-label", "Close voice player");
    this.closeButton.title = "Close voice player";
    this.closeButton.textContent = "×";
    this.closeButton.addEventListener("click", () => {
      this.popoverOpen = false;
      this.sync();
    });
    head.append(title, this.closeButton);

    const controls = document.createElement("div");
    controls.className = "tts-controls";

    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.setAttribute("data-tts-primary", "");
    this.playButton.addEventListener("click", () => {
      if (this.playing) {
        this.options.onPause();
      } else if (!this.enabled && this.options.onEnableAndPlay) {
        this.options.onEnableAndPlay();
      } else {
        this.options.onPlay();
      }
    });

    this.stopButton = document.createElement("button");
    this.stopButton.type = "button";
    this.stopButton.textContent = "■ Stop";
    this.stopButton.setAttribute("aria-label", "Stop speech");
    this.stopButton.addEventListener("click", () => this.options.onStop());

    this.settingsButton = document.createElement("button");
    this.settingsButton.type = "button";
    this.settingsButton.setAttribute("data-tts-icon", "");
    this.settingsButton.setAttribute("aria-label", "Voice settings");
    this.settingsButton.title = "Voice settings";
    this.settingsButton.textContent = "⚙";
    this.settingsButton.addEventListener("click", () => {
      this.popoverOpen = false;
      this.sync();
      this.host.dispatchEvent(new CustomEvent("lumiglyphics:open-voice-settings", {
        bubbles: true,
        composed: true,
      }));
    });

    controls.append(this.playButton, this.stopButton, this.settingsButton);

    this.statusEl = document.createElement("span");
    this.statusEl.setAttribute("data-status", "");
    this.statusEl.setAttribute("role", "status");
    this.statusEl.setAttribute("aria-live", "polite");

    dock.append(head, controls, this.statusEl);
    shadow.append(style, dock);
    this.setStatus({ kind: "off" });
    this.sync();
    this.host.addEventListener("lumiglyphics:speech-toggle", () => {
      this.overlayActive = true;
      this.popoverOpen = !this.popoverOpen;
      this.sync();
    });
    options.mount.appendChild(this.host);
  }

  togglePlay(): void {
    this.overlayActive = true;
    this.popoverOpen = !this.popoverOpen;
    this.sync();
  }

  /** Enabled = the speech setting; the dock stays hidden until opened or actively speaking. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.setStatus(this.lastStatus);
    this.sync();
  }

  setOverlayActive(active: boolean): void {
    this.overlayActive = active;
    if (!active) this.popoverOpen = false;
    this.sync();
  }

  setStatus(status: SpeechStatus): void {
    this.lastStatus = status;
    const wasPlaying = this.playing;
    this.playing = status.kind === "playing";
    this.host.dataset.playing = String(this.playing);
    if (wasPlaying !== this.playing) {
      this.host.dispatchEvent(new CustomEvent("lumiglyphics:speech-state", {
        bubbles: true,
        composed: true,
        detail: { playing: this.playing }
      }));
    }
    this.playButton.textContent = this.playing ? "❚❚ Pause" : "▶ Start";
    this.playButton.setAttribute("aria-label", this.playing ? "Pause speech" : "Play this paragraph");
    this.playButton.disabled = status.kind === "loading";
    this.stopButton.disabled = status.kind === "off" || status.kind === "idle";
    const tone = status.kind === "error" || status.kind === "blocked" || status.kind === "unconfigured" ? "error" : "info";
    this.statusEl.setAttribute("data-tone", tone);
    const desc = describeStatus(status);
    this.statusEl.textContent = desc || (this.enabled ? "Ready to read current passage" : "Tap Start to read aloud");
    this.sync();
  }

  destroy(): void {
    this.host.remove();
  }

  private sync(): void {
    const isOpen = this.overlayActive && (this.popoverOpen || this.playing);
    this.host.dataset.open = isOpen ? "true" : "false";
    this.host.style.display = isOpen ? "block" : "none";
  }
}

export function describeStatus(status: SpeechStatus): string {
  switch (status.kind) {
    case "off": return "";
    case "idle": return status.speaker ? `Speech ready — ${status.speaker}` : "Speech ready";
    case "loading": return "Fetching audio…";
    case "playing": return status.speaker ? `Speaking — ${status.speaker}` : "Speaking";
    case "paused": return "Paused";
    case "blocked": return status.message;
    case "unconfigured": return status.message;
    case "error": return status.message;
  }
}
