import { MOBILE_SHEET_DETENTS, mobileSheetDetentHeight, normalizeReaderPreferences, sheetHeight, snapMobileSheetDetent, type ReaderPreferences } from "../../shared/reader-preferences.js";

/** Owns only reader presentation. It cannot advance prose or request an image. */
export class DialogueSheet {
  private preferences = normalizeReaderPreferences(undefined);
  private hidden = false;
  private drag: { id: number; y: number; height: number } | null = null;
  private readonly tools: HTMLElement;
  private readonly handle: HTMLElement;
  private readonly show: HTMLButtonElement;
  private readonly header: HTMLElement;
  private readonly auto: HTMLButtonElement;
  private readonly hide: HTMLButtonElement;
  private readonly expand: HTMLButtonElement;
  private readonly observer: ResizeObserver;
  private readonly abort = new AbortController();

  constructor(private readonly root: HTMLElement, private readonly dialogue: HTMLElement,
    private readonly pause: () => void, private readonly save: (preferences: ReaderPreferences) => void,
    private readonly onToggleAutoPlay?: () => void) {
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
    this.tools.innerHTML = `<button type="button" class="caption-tool" data-action="caption-auto" aria-pressed="false" title="Toggle auto-play (A)" aria-label="Toggle auto-play"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg></button>
      <button type="button" class="caption-tool" data-action="caption-expand" aria-pressed="false" aria-label="Cycle dialogue sheet height" title="Resize dialogue sheet"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg></button>
      <button type="button" class="caption-tool" data-vn-hide-text aria-pressed="false" aria-label="Hide text reader to view full artwork" title="Hide text reader"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
    this.auto = this.tools.querySelector("[data-action='caption-auto']")!;
    this.expand = this.tools.querySelector("[data-action='caption-expand']")!;
    this.hide = this.tools.querySelector("[data-vn-hide-text]")!;

    this.show = document.createElement("button");
    this.show.type = "button";
    this.show.dataset.vnShowText = "";
    this.show.className = "caption-restore";
    this.show.setAttribute("aria-label", "Show text reader");
    this.show.title = "Show text reader";
    this.show.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    this.show.hidden = true;

    const edge = document.createElement("div");
    edge.className = "caption-edge";
    dialogue.prepend(edge);
    dialogue.prepend(this.handle);

    const header = this.header = dialogue.querySelector<HTMLElement>("[data-vn-sheet-header]") || document.createElement("div");
    header.dataset.vnSheetHeader = "";
    header.style.touchAction = "none";
    if (!header.parentElement) dialogue.prepend(header);
    header.append(this.tools);
    root.append(this.show);

    const signal = this.abort.signal;
    this.tools.addEventListener("click", event => event.stopPropagation(), { signal });
    this.auto.addEventListener("click", () => this.onToggleAutoPlay?.(), { signal });
    this.hide.addEventListener("click", () => this.setHidden(!this.hidden), { signal });
    this.expand.addEventListener("click", () => {
      const order: ReaderPreferences["sheetSize"][] = this.isMobileViewport()
        ? ["compact", "reading", "expanded"]
        : ["reading", "expanded"];
      const idx = order.indexOf(this.preferences.sheetSize);
      const next = order[(idx + 1) % order.length]!;
      this.snapToDetent(next);
    }, { signal });
    this.show.addEventListener("click", event => { event.stopPropagation(); this.setHidden(false); this.handle.focus(); }, { signal });

    const onMove = (clientY: number) => {
      if (!this.drag) return;
      const height = Math.min(this.usableHeight(), Math.max(this.minHeightFloor(), this.drag.height + (this.drag.y - clientY) * this.coordinateScale()));
      this.applyOccupiedMetrics(height);
    };
    const onUp = (_clientY: number) => {
      if (!this.drag) return;
      const measured = dialogue.getBoundingClientRect().height || Number.parseFloat(dialogue.style.height) || this.drag.height;
      const height = measured * this.coordinateScale();
      this.cancelDrag();
      this.changeHeight(height);
    };

    const startPointerDrag = (target: HTMLElement, event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.drag = { id: event.pointerId, y: event.clientY, height: dialogue.getBoundingClientRect().height * this.coordinateScale() };
      if (typeof target.setPointerCapture === "function") target.setPointerCapture(event.pointerId);
      this.pause();
    };
    this.handle.addEventListener("pointerdown", event => startPointerDrag(this.handle, event), { signal });
    this.handle.addEventListener("pointermove", event => {
      if (this.drag && this.drag.id === event.pointerId) onMove(event.clientY);
    }, { signal });
    this.handle.addEventListener("pointerup", event => {
      if (this.drag && this.drag.id === event.pointerId) onUp(event.clientY);
    }, { signal });
    this.handle.addEventListener("pointercancel", () => { this.cancelDrag(); this.resize(); }, { signal });

    const isHeaderInteractive = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-vn-sheet-tools], button, a, input, select, textarea"));
    header.addEventListener("pointerdown", event => {
      if (isHeaderInteractive(event.target)) return;
      startPointerDrag(header, event);
    }, { signal });
    header.addEventListener("pointermove", event => {
      if (this.drag && this.drag.id === event.pointerId) onMove(event.clientY);
    }, { signal });
    header.addEventListener("pointerup", event => {
      if (this.drag && this.drag.id === event.pointerId) onUp(event.clientY);
    }, { signal });
    header.addEventListener("pointercancel", () => { this.cancelDrag(); this.resize(); }, { signal });

    window.addEventListener("pointermove", event => {
      if (this.drag && this.drag.id === event.pointerId) {
        event.preventDefault();
        onMove(event.clientY);
      }
    }, { signal, passive: false });
    window.addEventListener("pointerup", event => {
      if (this.drag && this.drag.id === event.pointerId) onUp(event.clientY);
    }, { signal });

    const startTouchDrag = (event: TouchEvent) => {
      if (event.touches[0]) {
        event.preventDefault();
        this.drag = { id: event.touches[0].identifier, y: event.touches[0].clientY, height: dialogue.getBoundingClientRect().height * this.coordinateScale() };
        this.pause();
      }
    };
    this.handle.addEventListener("touchstart", startTouchDrag, { signal, passive: false });
    header.addEventListener("touchstart", event => {
      if (isHeaderInteractive(event.target)) return;
      startTouchDrag(event);
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
    if (this.drag) {
      for (const el of [this.handle, this.header]) {
        if (el && typeof el.hasPointerCapture === "function" && el.hasPointerCapture(this.drag.id) && typeof el.releasePointerCapture === "function") {
          el.releasePointerCapture(this.drag.id);
        }
      }
    }
    this.drag = null;
  }
  private isMobileViewport(): boolean {
    if (this.root.dataset.vnMobileDetent === "true") return true;
    const width = (typeof window !== "undefined" && window.innerWidth > 0) ? window.innerWidth : this.root.clientWidth;
    return width > 0 && width <= 768;
  }
  private minHeightFloor(): number {
    return this.isMobileViewport() ? MOBILE_SHEET_DETENTS.compact : 120;
  }
  private applyOccupiedMetrics(heightPx: number, detent?: ReaderPreferences["sheetSize"]): void {
    const readerHeight = this.root.clientHeight || this.root.getBoundingClientRect().height;
    const usable = this.usableHeight();
    const activeDetent = detent ?? (this.hidden || heightPx <= MOBILE_SHEET_DETENTS.compact + 4
      ? "compact"
      : (this.isMobileViewport()
          ? (heightPx >= mobileSheetDetentHeight("expanded", usable, readerHeight) - 16 ? "expanded" : "reading")
          : this.preferences.sheetSize));
    const occupiedRatio = this.hidden
      ? 0
      : Math.max(0, Math.min(1, heightPx / Math.max(1, readerHeight || heightPx || 1)));
    this.root.dataset.vnSheetDetent = this.hidden ? "compact" : activeDetent;
    this.root.style.setProperty("--vn-dialogue-occupied-ratio", occupiedRatio.toFixed(3));
    this.root.style.setProperty("--vn-sheet-height", `${heightPx}px`);
    this.root.style.setProperty("--caption-height", `${heightPx}px`);
    this.dialogue.style.setProperty("--caption-height", `${heightPx}px`);
    this.dialogue.style.height = `${heightPx}px`;
    this.dialogue.classList?.toggle?.("large-caption", activeDetent === "expanded");
    this.expand.setAttribute("aria-pressed", String(activeDetent === "expanded"));
  }
  getDetent(): ReaderPreferences["sheetSize"] {
    return this.preferences.sheetSize;
  }
  snapToDetent(size: ReaderPreferences["sheetSize"]): void {
    const usable = this.usableHeight();
    const readerHeight = this.root.clientHeight || this.root.getBoundingClientRect().height;
    const targetPx = this.isMobileViewport()
      ? mobileSheetDetentHeight(size, usable, readerHeight)
      : sheetHeight(size, usable);
    this.setPreferences({
      ...this.preferences,
      sheetSize: size,
      heightRatio: usable > 0 ? targetPx / usable : undefined,
    });
    this.save({ ...this.preferences });
  }
  private resize(): void {
    const usable = this.usableHeight();
    const readerHeight = this.root.clientHeight || this.root.getBoundingClientRect().height;
    const minFloor = this.minHeightFloor();
    const h = this.preferences.heightRatio !== undefined
      ? Math.round(Math.min(usable, Math.max(minFloor, usable * this.preferences.heightRatio)))
      : (this.isMobileViewport()
          ? mobileSheetDetentHeight(this.preferences.sheetSize, usable, readerHeight)
          : sheetHeight(this.preferences.sheetSize, usable));
    const kbInset = this.keyboardInset();
    this.root.dataset.vnReplyCompact = String(readerHeight > 0 && readerHeight < 340);
    this.root.style.setProperty("--vn-reader-height", `${readerHeight}px`);
    this.root.style.setProperty("--vn-sheet-keyboard-inset", `${kbInset}px`);
    this.root.style.setProperty("--reader-keyboard-inset", `${kbInset}px`);
    this.applyOccupiedMetrics(h);
  }
  private changeHeight(height: number): void {
    const usable = this.usableHeight();
    const readerHeight = this.root.clientHeight || this.root.getBoundingClientRect().height;
    const clamped = Math.min(usable, Math.max(this.minHeightFloor(), height));
    const nextSize = this.isMobileViewport()
      ? snapMobileSheetDetent(clamped, usable, readerHeight).detent
      : this.preferences.sheetSize;
    this.setPreferences({
      ...this.preferences,
      sheetSize: nextSize,
      heightRatio: clamped / Math.max(1, usable),
    });
    this.save({ ...this.preferences });
  }
  setPreferences(value: ReaderPreferences): void {
    this.preferences = normalizeReaderPreferences(value);
    this.root.dataset.vnAdjustableSheet = String(this.preferences.adjustableSheetEnabled);
    this.root.dataset.vnReaderLayout = this.preferences.layout;
    this.root.style.setProperty("--vn-sheet-opacity", String(this.preferences.backgroundOpacity));
    this.root.style.setProperty("--caption-opacity", String(this.preferences.backgroundOpacity));
    this.tools.hidden = false;
    this.expand.hidden = false;
    this.hide.hidden = false;
    this.resize();
  }
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.root.dataset.vnTextHidden = String(this.hidden);
    this.hide.setAttribute("aria-pressed", String(this.hidden));
    this.show.hidden = !this.hidden;
    this.resize();
    if (this.hidden) { this.pause(); this.show.focus(); }
  }
  isHidden(): boolean { return this.hidden; }
  setAutoPlayActive(active: boolean): void {
    this.auto.setAttribute("aria-pressed", String(active));
    if (active) this.auto.dataset.active = "true";
    else delete this.auto.dataset.active;
  }
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
