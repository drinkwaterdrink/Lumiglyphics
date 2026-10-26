import { normalizeReaderPreferences, sheetHeight, type ReaderPreferences } from "../../shared/reader-preferences.js";

/** Owns only reader presentation. It cannot advance prose or request an image. */
export class DialogueSheet {
  private preferences = normalizeReaderPreferences(undefined);
  private hidden = false;
  private drag: { id: number; y: number; height: number } | null = null;
  private readonly tools: HTMLElement;
  private readonly handle: HTMLElement;
  private readonly show: HTMLButtonElement;
  private readonly header: HTMLElement;
  private readonly hide: HTMLButtonElement;
  private readonly expand: HTMLButtonElement;
  private readonly observer: ResizeObserver;
  private readonly abort = new AbortController();

  constructor(private readonly root: HTMLElement, private readonly dialogue: HTMLElement,
    private readonly pause: () => void, private readonly save: (preferences: ReaderPreferences) => void) {
    this.handle = document.createElement("div");
    this.handle.className = "resize-grip";
    this.handle.dataset.vnSheetHandle = "";
    this.handle.setAttribute("role", "separator");
    this.handle.setAttribute("aria-label", "Drag to resize dialogue panel");
    this.handle.setAttribute("aria-orientation", "horizontal");
    this.handle.tabIndex = 0;
    this.handle.innerHTML = "<span></span>";

    this.tools = document.createElement("div");
    this.tools.dataset.vnSheetTools = "";
    this.tools.className = "caption-head-actions";
    this.tools.innerHTML = `<button type="button" class="caption-tool" data-action="caption-expand" aria-label="Expand dialogue panel"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg></button>
      <button type="button" class="caption-tool" data-vn-hide-text aria-label="Minimize dialogue box" title="Hide text"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>`;
    this.expand = this.tools.querySelector("[data-action='caption-expand']")!;
    this.hide = this.tools.querySelector("[data-vn-hide-text]")!;

    this.show = document.createElement("button");
    this.show.type = "button";
    this.show.dataset.vnShowText = "";
    this.show.className = "caption-restore";
    this.show.setAttribute("aria-label", "Show text");
    this.show.title = "Show text";
    this.show.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    this.show.hidden = true;

    const edge = document.createElement("div");
    edge.className = "caption-edge";
    dialogue.prepend(edge);
    dialogue.prepend(this.handle);

    const header = this.header = dialogue.querySelector<HTMLElement>("[data-vn-sheet-header]") || document.createElement("div");
    header.dataset.vnSheetHeader = "";
    if (!header.parentElement) dialogue.prepend(header);
    header.append(this.tools);
    root.append(this.show);

    const signal = this.abort.signal;
    this.tools.addEventListener("click", event => event.stopPropagation(), { signal });
    this.hide.addEventListener("click", () => this.setHidden(true), { signal });
    this.expand.addEventListener("click", () => {
      const isExpanded = dialogue.classList.contains("large-caption");
      if (isExpanded) {
        dialogue.classList.remove("large-caption");
        dialogue.style.height = "";
        this.expand.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>';
        this.expand.setAttribute("aria-label", "Expand dialogue panel");
        this.resize();
      } else {
        dialogue.classList.add("large-caption");
        dialogue.style.height = "min(65vh, 420px)";
        this.expand.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>';
        this.expand.setAttribute("aria-label", "Reduce dialogue height");
      }
    }, { signal });
    this.show.addEventListener("click", event => { event.stopPropagation(); this.setHidden(false); this.handle.focus(); }, { signal });

    const onMove = (clientY: number) => {
      if (!this.drag) return;
      const height = Math.min(this.usableHeight(), Math.max(120, this.drag.height + (this.drag.y - clientY) * this.coordinateScale()));
      root.style.setProperty("--vn-sheet-height", `${height}px`);
      root.style.setProperty("--caption-height", `${height}px`);
      dialogue.style.setProperty("--caption-height", `${height}px`);
      dialogue.style.height = `${height}px`;
    };
    const onUp = (clientY: number) => {
      if (!this.drag) return;
      const height = dialogue.getBoundingClientRect().height * this.coordinateScale();
      this.cancelDrag();
      this.changeHeight(height);
    };

    this.handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.drag = { id: event.pointerId, y: event.clientY, height: dialogue.getBoundingClientRect().height * this.coordinateScale() };
      if (typeof this.handle.setPointerCapture === "function") this.handle.setPointerCapture(event.pointerId);
      this.pause();
    }, { signal });
    this.handle.addEventListener("pointermove", event => {
      if (this.drag && this.drag.id === event.pointerId) onMove(event.clientY);
    }, { signal });
    this.handle.addEventListener("pointerup", event => {
      if (this.drag && this.drag.id === event.pointerId) onUp(event.clientY);
    }, { signal });
    this.handle.addEventListener("pointercancel", () => { this.cancelDrag(); this.resize(); }, { signal });

    window.addEventListener("pointermove", event => {
      if (this.drag && this.drag.id === event.pointerId) {
        event.preventDefault();
        onMove(event.clientY);
      }
    }, { signal, passive: false });
    window.addEventListener("pointerup", event => {
      if (this.drag && this.drag.id === event.pointerId) onUp(event.clientY);
    }, { signal });

    this.handle.addEventListener("touchstart", event => {
      if (event.touches[0]) {
        event.preventDefault();
        this.drag = { id: event.touches[0].identifier, y: event.touches[0].clientY, height: dialogue.getBoundingClientRect().height * this.coordinateScale() };
        this.pause();
      }
    }, { signal, passive: false });
    window.addEventListener("touchmove", event => {
      if (this.drag && event.touches[0]) {
        event.preventDefault();
        onMove(event.touches[0].clientY);
      }
    }, { signal, passive: false });
    window.addEventListener("touchend", event => {
      if (this.drag && event.changedTouches[0]) {
        onUp(event.changedTouches[0].clientY);
      }
    }, { signal });
    this.handle.addEventListener("keydown", event => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      this.changeHeight(dialogue.getBoundingClientRect().height * this.coordinateScale() + (event.key === "ArrowUp" ? 16 : -16));
    }, { signal });
    this.observer = new ResizeObserver(() => { this.cancelDrag(); this.resize(); });
    this.observer.observe(root);
    window.visualViewport?.addEventListener("resize", this.onResize, { signal });
    window.addEventListener("orientationchange", this.onResize, { signal });
    this.setPreferences(this.preferences);
  }
  private readonly onResize = () => { this.cancelDrag(); this.resize(); };
  private coordinateScale(): number {
    const height = this.root.getBoundingClientRect().height;
    return height > 0 ? (this.root.clientHeight || height) / height : 1;
  }
  private usableHeight(): number {
    const rootHeight = this.root.clientHeight || this.root.getBoundingClientRect().height;
    return Math.max(0, rootHeight - this.keyboardInset() - 112);
  }
  private keyboardInset(): number {
    const viewport = window.visualViewport;
    if (!viewport) return 0;
    // The reader may start below app chrome. Compare screen coordinates before
    // converting to local (host-zoom compensated) CSS pixels.
    return Math.max(0, this.root.getBoundingClientRect().bottom - (viewport.height + viewport.offsetTop)) * this.coordinateScale();
  }
  private cancelDrag(): void {
    if (this.drag && typeof this.handle.hasPointerCapture === "function" && this.handle.hasPointerCapture(this.drag.id) && typeof this.handle.releasePointerCapture === "function") {
      this.handle.releasePointerCapture(this.drag.id);
    }
    this.drag = null;
  }
  private resize(): void {
    const usable = this.usableHeight();
    const h = sheetHeight(this.preferences.sheetSize, usable, this.preferences.heightRatio);
    this.root.style.setProperty("--vn-reader-height", `${this.root.clientHeight || this.root.getBoundingClientRect().height}px`);
    this.root.style.setProperty("--vn-sheet-keyboard-inset", `${this.keyboardInset()}px`);
    this.root.style.setProperty("--vn-sheet-height", `${h}px`);
    this.root.style.setProperty("--caption-height", `${h}px`);
  }
  private changeHeight(height: number): void {
    this.setPreferences({ ...this.preferences, heightRatio: height / Math.max(1, this.usableHeight()) });
    this.save({ ...this.preferences });
  }
  setPreferences(value: ReaderPreferences): void {
    this.preferences = normalizeReaderPreferences(value);
    this.root.dataset.vnAdjustableSheet = String(this.preferences.adjustableSheetEnabled);
    this.root.dataset.vnReaderLayout = this.preferences.layout;
    this.root.style.setProperty("--vn-sheet-opacity", String(this.preferences.backgroundOpacity));
    this.root.style.setProperty("--caption-opacity", String(this.preferences.backgroundOpacity));
    this.tools.hidden = !this.preferences.adjustableSheetEnabled;
    this.hide.hidden = !this.preferences.adjustableSheetEnabled;
    if (!this.preferences.adjustableSheetEnabled) this.setHidden(false);
    this.resize();
  }
  setHidden(hidden: boolean): void {
    this.hidden = hidden && this.preferences.adjustableSheetEnabled;
    this.root.dataset.vnTextHidden = String(this.hidden);
    this.show.hidden = !this.hidden;
    if (this.hidden) { this.pause(); this.show.focus(); }
  }
  isHidden(): boolean { return this.hidden; }
  destroy(): void {
    this.cancelDrag(); this.abort.abort(); this.observer.disconnect();
    const controls = this.header.querySelector("[data-vn-controls]");
    const speaker = this.header.querySelector("[data-vn-speaker]");
    if (controls && speaker) this.dialogue.prepend(controls, speaker);
    else if (controls) this.dialogue.prepend(controls);
    else if (speaker) this.dialogue.prepend(speaker);
    this.header.remove(); this.show.remove();
  }
}
