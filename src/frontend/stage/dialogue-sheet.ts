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
    this.tools = document.createElement("div");
    this.tools.dataset.vnSheetTools = "";
    this.tools.innerHTML = `<div class="resize-grip" data-vn-sheet-handle role="separator" aria-label="Drag to resize dialogue panel" aria-orientation="horizontal" tabindex="0"><span></span></div>
      <div class="caption-head-actions">
        <button type="button" class="caption-tool" data-action="caption-expand" aria-label="Expand dialogue panel"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg></button>
        <button type="button" class="caption-tool" data-vn-hide-text aria-label="Minimize dialogue box" title="Hide text"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg></button>
      </div>`;
    this.handle = this.tools.querySelector("[data-vn-sheet-handle]")!;
    this.expand = this.tools.querySelector("[data-action='caption-expand']")!;
    this.hide = this.tools.querySelector("[data-vn-hide-text]")!;

    this.show = document.createElement("button");
    this.show.type = "button";
    this.show.dataset.vnShowText = "";
    this.show.className = "caption-restore";
    this.show.setAttribute("aria-label", "Show text");
    this.show.title = "Show text";
    this.show.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6c-3-2-7-2-9-1v15c2-1 6-1 9 1 3-2 7-2 9-1V5c-2-1-6-1-9 1Zm0 0v15"/></svg> <span>Show dialogue ↗</span>';
    this.show.hidden = true;

    const edge = document.createElement("div");
    edge.className = "caption-edge";
    dialogue.prepend(edge);

    const header = this.header = document.createElement("div");
    header.dataset.vnSheetHeader = "";
    const controls = dialogue.querySelector("[data-vn-controls]");
    const speaker = dialogue.querySelector("[data-vn-speaker]");
    dialogue.prepend(header);
    if (speaker) header.append(speaker);
    if (controls) header.append(controls);
    header.append(this.tools);
    root.append(this.show);

    const signal = this.abort.signal;
    this.tools.addEventListener("click", event => event.stopPropagation(), { signal });
    this.hide.addEventListener("click", () => this.setHidden(true), { signal });
    this.expand.addEventListener("click", () => {
      const isExpanded = dialogue.classList.contains("large-caption");
      if (isExpanded) {
        dialogue.classList.remove("large-caption");
        this.expand.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>';
        this.expand.setAttribute("aria-label", "Expand dialogue panel");
      } else {
        dialogue.classList.add("large-caption");
        this.expand.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>';
        this.expand.setAttribute("aria-label", "Reduce dialogue height");
      }
    }, { signal });
    this.show.addEventListener("click", event => { event.stopPropagation(); this.setHidden(false); this.handle.focus(); }, { signal });
    this.handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.drag = { id: event.pointerId, y: event.clientY, height: dialogue.getBoundingClientRect().height * this.coordinateScale() };
      if (typeof this.handle.setPointerCapture === "function") this.handle.setPointerCapture(event.pointerId);
      this.pause();
    }, { signal });
    this.handle.addEventListener("pointermove", event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const height = Math.min(this.usableHeight(), Math.max(142, this.drag.height + (this.drag.y - event.clientY) * this.coordinateScale()));
      root.style.setProperty("--vn-sheet-height", `${height}px`);
      root.style.setProperty("--caption-height", `${height}px`);
    }, { signal });
    this.handle.addEventListener("pointerup", event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const height = dialogue.getBoundingClientRect().height * this.coordinateScale();
      this.cancelDrag();
      this.changeHeight(height);
    }, { signal });
    this.handle.addEventListener("pointercancel", () => { this.cancelDrag(); this.resize(); }, { signal });
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
