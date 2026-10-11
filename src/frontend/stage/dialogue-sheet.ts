import { normalizeReaderPreferences, sheetHeight, type ReaderPreferences } from "../../shared/reader-preferences.js";

/** Owns only reader presentation. It cannot advance prose or request an image. */
export class DialogueSheet {
  private preferences = normalizeReaderPreferences(undefined);
  private hidden = false;
  private drag: { id: number; y: number; height: number } | null = null;
  private readonly tools: HTMLElement;
  private readonly handle: HTMLButtonElement;
  private readonly show: HTMLButtonElement;
  private readonly header: HTMLElement;
  private readonly hide: HTMLButtonElement;
  private readonly observer: ResizeObserver;
  private readonly abort = new AbortController();

  constructor(private readonly root: HTMLElement, private readonly dialogue: HTMLElement,
    private readonly pause: () => void, private readonly save: (preferences: ReaderPreferences) => void) {
    this.tools = document.createElement("div");
    this.tools.dataset.vnSheetTools = "";
    this.tools.innerHTML = `<button type="button" data-vn-sheet-handle aria-label="Resize text panel" title="Drag to resize; arrow keys also adjust height"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10V4h6M4 4l6 6M14 20h6v-6M20 20l-6-6"/></svg></button>
      <button type="button" data-vn-hide-text aria-label="Hide text" title="Hide text"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`;
    this.handle = this.tools.querySelector("button")!;
    this.show = document.createElement("button");
    this.show.type = "button";
    this.show.dataset.vnShowText = "";
    this.show.setAttribute("aria-label", "Show text");
    this.show.title = "Show text";
    this.show.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
    this.show.hidden = true;
    const header = this.header = document.createElement("div");
    header.dataset.vnSheetHeader = "";
    const controls = dialogue.querySelector("[data-vn-controls]")!;
    const speaker = dialogue.querySelector("[data-vn-speaker]")!;
    dialogue.prepend(header);
    this.hide = this.tools.querySelector("[data-vn-hide-text]")!;
    header.append(this.tools, speaker, controls, this.hide);
    root.append(this.show);
    const signal = this.abort.signal;
    this.tools.addEventListener("click", event => event.stopPropagation(), { signal });
    this.hide.addEventListener("click", () => this.setHidden(true), { signal });
    this.show.addEventListener("click", event => { event.stopPropagation(); this.setHidden(false); this.handle.focus(); }, { signal });
    this.handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.drag = { id: event.pointerId, y: event.clientY, height: dialogue.getBoundingClientRect().height * this.coordinateScale() };
      this.handle.setPointerCapture(event.pointerId);
      this.pause();
    }, { signal });
    this.handle.addEventListener("pointermove", event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const height = Math.min(this.usableHeight(), Math.max(224, this.drag.height + (this.drag.y - event.clientY) * this.coordinateScale()));
      root.style.setProperty("--vn-sheet-height", `${height}px`);
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
    const viewport = window.visualViewport;
    const scale = this.coordinateScale();
    return Math.max(0, Math.min(rootHeight, viewport ? viewport.height * scale : rootHeight) - 112);
  }
  private cancelDrag(): void {
    if (this.drag && this.handle.hasPointerCapture(this.drag.id)) this.handle.releasePointerCapture(this.drag.id);
    this.drag = null;
  }
  private resize(): void {
    const rootHeight = this.root.clientHeight || this.root.getBoundingClientRect().height;
    const viewport = window.visualViewport;
    const inset = viewport ? Math.max(0, rootHeight - viewport.height * this.coordinateScale()) : 0;
    this.root.style.setProperty("--vn-sheet-keyboard-inset", `${inset}px`);
    this.root.style.setProperty("--vn-sheet-height", `${sheetHeight(this.preferences.sheetSize, this.usableHeight(), this.preferences.heightRatio)}px`);
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
    this.dialogue.prepend(this.header.querySelector("[data-vn-controls]")!, this.header.querySelector("[data-vn-speaker]")!);
    this.header.remove(); this.show.remove();
  }
}
