import { VN_SHELL_PRESET_TOKENS_CSS } from "../theme/palette-tokens.js";

export type QuickDirectorCommand =
  | { kind: "regenerate"; label: string; guidance: string }
  | { kind: "shot"; label: string; guidance: string }
  | { kind: "relight"; label: string; guidance: string }
  | { kind: "outfit"; label: string; guidance: string; charId: string; wardrobeKey: string; outfit: string };

export type QuickDirectorOutfitOption = {
  charId: string;
  charName: string;
  key: string;
  outfit: string;
  active: boolean;
};

export type QuickDirectorPopoverOptions = {
  mount: HTMLElement;
  onDirect: (command: QuickDirectorCommand) => void;
};

const DIRECTOR_CSS = `
${VN_SHELL_PRESET_TOKENS_CSS}
:host {
  position: absolute;
  inset: 0;
  z-index: 91;
  pointer-events: none;
  font: 13px/1.4 var(--vn-shell-family, system-ui, -apple-system, sans-serif);
  color: var(--vn-shell-text, #f4f7ee);
}
:host(:not([data-open="true"])) {
  display: none !important;
}
.dir-backdrop {
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
.dir-sheet {
  width: min(440px, 100%);
  max-height: 70dvh;
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
  gap: 10px;
}
.dir-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dir-title {
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vn-shell-accent, #dcebad);
}
.dir-close {
  min-width: 44px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.16));
  background: var(--vn-shell-button, rgba(255, 255, 255, 0.08));
  color: var(--vn-shell-text, #f4f7ee);
  font-size: 18px;
  cursor: pointer;
}
.dir-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vn-shell-muted, #9cb5a8);
}
.dir-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dir-pill {
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
.dir-pill.primary,
.dir-pill[aria-pressed="true"] {
  background: var(--vn-shell-accent, #dcebad);
  color: var(--vn-shell-accent-contrast, #0d1f17);
  border-color: transparent;
  font-weight: 750;
}
.dir-empty {
  font-size: 12px;
  color: var(--vn-shell-muted, #9cb5a8);
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
 * In-Reader Quick-Director Popover (#3): Steer or reshoot the current passage's scene.
 */
export class QuickDirectorPopover {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly closeBtn: HTMLButtonElement;
  private readonly outfitRow: HTMLElement;
  private openState = false;
  private opener: HTMLElement | null = null;

  constructor(private readonly options: QuickDirectorPopoverOptions) {
    this.host = document.createElement("div");
    this.host.dataset.vnQuickDirector = "";
    this.host.dataset.open = "false";
    this.host.style.display = "none";
    this.shadow = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = DIRECTOR_CSS;

    const backdrop = document.createElement("div");
    backdrop.className = "dir-backdrop";
    backdrop.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target === backdrop) this.close();
    });

    const sheet = document.createElement("div");
    sheet.className = "dir-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Quick Director");
    sheet.addEventListener("click", (event) => event.stopPropagation());
    sheet.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });

    const head = document.createElement("div");
    head.className = "dir-head";
    const title = document.createElement("span");
    title.className = "dir-title";
    title.textContent = "Steer / Reshoot Scene";
    this.closeBtn = document.createElement("button");
    this.closeBtn.type = "button";
    this.closeBtn.className = "dir-close";
    this.closeBtn.setAttribute("aria-label", "Close Quick Director");
    this.closeBtn.textContent = "×";
    this.closeBtn.addEventListener("click", () => this.close());
    head.append(title, this.closeBtn);

    const regenRow = document.createElement("div");
    regenRow.className = "dir-row";
    const regenBtn = document.createElement("button");
    regenBtn.type = "button";
    regenBtn.className = "dir-pill primary";
    regenBtn.dataset.dirAction = "regenerate";
    regenBtn.textContent = "↻ Regenerate Scene";
    regenBtn.addEventListener("click", () => {
      this.options.onDirect({ kind: "regenerate", label: "Regenerate", guidance: "Fresh composition with stronger detail" });
      this.close();
    });
    regenRow.appendChild(regenBtn);

    const makeGroup = (heading: string, items: Array<{ label: string; kind: "shot" | "relight"; guidance: string }>) => {
      const wrap = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.className = "dir-label";
      lbl.textContent = heading;
      const row = document.createElement("div");
      row.className = "dir-row";
      for (const item of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dir-pill";
        btn.dataset.dirKind = item.kind;
        btn.dataset.dirLabel = item.label;
        btn.textContent = item.label;
        btn.addEventListener("click", () => {
          this.options.onDirect({ kind: item.kind, label: item.label, guidance: item.guidance });
          this.close();
        });
        row.appendChild(btn);
      }
      wrap.append(lbl, row);
      return wrap;
    };

    const shotGroup = makeGroup("Switch Shot", [
      { label: "Close-up", kind: "shot", guidance: "Frame as an intimate close-up portrait focusing on facial expression" },
      { label: "Medium", kind: "shot", guidance: "Frame as a balanced medium waist-up shot showing gesture and posture" },
      { label: "Wide", kind: "shot", guidance: "Frame as a wide establishing shot showcasing the full environment" },
      { label: "Over-Shoulder", kind: "shot", guidance: "Frame as a dramatic over-the-shoulder perspective shot" },
    ]);

    const relightGroup = makeGroup("Relight", [
      { label: "Golden Hour", kind: "relight", guidance: "Relight with warm golden hour sunlight and long soft shadows" },
      { label: "Noir", kind: "relight", guidance: "Relight in high-contrast noir chiaroscuro shadows and crisp rim light" },
      { label: "Candlelight", kind: "relight", guidance: "Relight with warm flickering candlelight glow and intimate shadows" },
      { label: "Moonlit", kind: "relight", guidance: "Relight with cool silver moonlight and soft nocturnal contrast" },
    ]);

    const outfitWrap = document.createElement("div");
    const outfitLbl = document.createElement("div");
    outfitLbl.className = "dir-label";
    outfitLbl.textContent = "Swap Outfit";
    this.outfitRow = document.createElement("div");
    this.outfitRow.className = "dir-row";
    outfitWrap.append(outfitLbl, this.outfitRow);

    sheet.append(head, regenRow, shotGroup, relightGroup, outfitWrap);
    backdrop.appendChild(sheet);
    this.shadow.append(style, backdrop);
    options.mount.appendChild(this.host);
    this.setOutfits([]);
  }

  setOutfits(outfits: ReadonlyArray<QuickDirectorOutfitOption>): void {
    this.outfitRow.replaceChildren();
    if (outfits.length === 0) {
      const empty = document.createElement("span");
      empty.className = "dir-empty";
      empty.textContent = "No wardrobe states saved for the active speaker yet.";
      this.outfitRow.appendChild(empty);
      return;
    }
    for (const opt of outfits) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dir-pill";
      btn.dataset.dirOutfit = opt.key;
      btn.setAttribute("aria-pressed", opt.active ? "true" : "false");
      btn.textContent = `${opt.charName}: ${opt.key}`;
      btn.addEventListener("click", () => {
        this.options.onDirect({
          kind: "outfit",
          label: opt.key,
          guidance: `Change ${opt.charName}'s outfit to: ${opt.outfit}`,
          charId: opt.charId,
          wardrobeKey: opt.key,
          outfit: opt.outfit,
        });
        this.close();
      });
      this.outfitRow.appendChild(btn);
    }
  }

  setPreset(preset: string): void {
    this.host.dataset.vnPreset = preset;
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
    this.closeBtn.focus?.({ preventScroll: true });
  }

  close(restoreFocus = true): void {
    if (!this.openState) return;
    this.openState = false;
    this.host.dataset.open = "false";
    this.host.style.display = "none";
    if (restoreFocus) this.opener?.focus?.({ preventScroll: true });
    this.opener = null;
  }

  destroy(): void {
    this.host.remove();
  }
}
