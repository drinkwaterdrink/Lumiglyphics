/**
 * Edge-to-edge Fullscreen Image Lightbox for History & Artwork Review Studio.
 */
import { trapFocusWithin } from "../image-review/focus-trap.js";
import { escapeHtml } from "../../shared/html-escape.js";

export interface LightboxGalleryItem {
  src: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  prompt?: string | undefined;
  negativePrompt?: string | undefined;
}

export interface LightboxOptions extends LightboxGalleryItem {
  gallery?: readonly LightboxGalleryItem[] | undefined;
  galleryIndex?: number | undefined;
  themeSource?: HTMLElement | undefined;
  onDelete?: ((item: LightboxGalleryItem, index: number) => void) | undefined;
  onSetFaceRef?: ((item: LightboxGalleryItem, index: number) => void) | undefined;
  onSetOutfitRef?: ((item: LightboxGalleryItem, index: number) => void) | undefined;
}

const LIGHTBOX_CSS = `
.vn-lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: none;
  flex-direction: column;
  background: color-mix(in srgb, var(--vn-shell-panel, #04080c) 94%, #000);
  color: var(--vn-shell-text, #f4f6fb);
  font-family: var(--vn-shell-family, system-ui);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  user-select: none;
  touch-action: none;
}
.vn-lightbox-backdrop.open {
  display: flex !important;
  animation: vn-lightbox-fade-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
}
.vn-lightbox-backdrop[hidden] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
@keyframes vn-lightbox-fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
.vn-lightbox-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(12px, env(safe-area-inset-top)) 16px 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 70%, transparent 100%);
  pointer-events: auto;
}
.vn-lightbox-title-group {
  min-width: 0;
  color: #f4f6fb;
}
.vn-lightbox-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vn-lightbox-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vn-lightbox-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 12px;
  flex-shrink: 0;
}
.vn-lightbox-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.25));
  background: var(--vn-shell-button, rgba(255, 255, 255, 0.12));
  color: var(--vn-shell-text, #fff);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.vn-lightbox-btn:hover {
  background: color-mix(in srgb, var(--vn-shell-accent, #9ec6f0) 20%, var(--vn-shell-button, rgba(255, 255, 255, 0.25)));
  border-color: var(--vn-shell-accent, rgba(255, 255, 255, 0.45));
}
.vn-lightbox-btn.active {
  background: var(--vn-shell-accent, #7c9cff);
  border-color: var(--vn-shell-accent, #7c9cff);
  color: var(--vn-shell-accent-contrast, #0d121f);
}
.vn-lightbox-close {
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.35);
}
.vn-lightbox-close:hover,
.vn-lightbox-close:active {
  background: rgba(255, 80, 80, 0.75);
  border-color: rgba(255, 80, 80, 0.9);
}
.vn-lightbox-viewport {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: 68px 16px 24px;
  cursor: zoom-in;
  touch-action: none;
}
.vn-lightbox-viewport.zoomed {
  cursor: grab;
}
.vn-lightbox-viewport.zoomed:active {
  cursor: grabbing;
}
.vn-lightbox-img {
  max-width: 95vw;
  max-height: 82vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
  transition: transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center center;
  will-change: transform;
}
.vn-lightbox-rail {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 16px max(12px, env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--vn-shell-panel, #080c12) 88%, #000);
  border-top: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14));
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.vn-lightbox-rail::-webkit-scrollbar {
  display: none;
}
.vn-lightbox-rail[hidden] {
  display: none !important;
}
.vn-lightbox-rail-item {
  flex: 0 0 auto;
  min-width: 48px;
  min-height: 48px;
  width: 56px;
  height: 56px;
  padding: 2px;
  border-radius: 8px;
  border: 2px solid var(--vn-shell-border, rgba(255, 255, 255, 0.2));
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}
.vn-lightbox-rail-item[aria-current="true"] {
  border-color: var(--vn-shell-accent, #9ec6f0);
  box-shadow: 0 0 0 1px var(--vn-shell-accent, #9ec6f0);
}
.vn-lightbox-rail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 5px;
  display: block;
}
.vn-lightbox-info-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 40dvh;
  overflow-y: auto;
  padding: 16px 20px max(16px, env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--vn-shell-panel, #0a1018) 96%, #000);
  border-top: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.14));
  color: var(--vn-shell-text, #e0e5ed);
  font-size: 13px;
  line-height: 1.5;
  backdrop-filter: blur(20px);
  z-index: 25;
  animation: vn-lightbox-slide-up 180ms ease;
}
@keyframes vn-lightbox-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.vn-lightbox-info-drawer pre {
  margin: 6px 0 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  color: #a8b8d0;
}
`;

export class FullscreenLightbox {
  private static instance: FullscreenLightbox | null = null;
  private backdrop: HTMLElement;
  private img: HTMLImageElement;
  private titleEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private infoDrawer: HTMLElement;
  private railEl: HTMLElement;
  private zoomLevel = 1;
  private panX = 0;
  private panY = 0;
  private infoOpen = false;
  private currentOptions: LightboxOptions | null = null;
  private galleryItems: readonly LightboxGalleryItem[] = [];
  private galleryIndex = 0;
  private touchStartY = 0;
  private touchStartX = 0;
  private panStartX = 0;
  private panStartY = 0;
  private isPanning = false;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private previousFocus: HTMLElement | null = null;

  constructor() {
    this.backdrop = document.createElement("div");
    this.backdrop.className = "vn-lightbox-backdrop";
    this.backdrop.setAttribute("role", "dialog");
    this.backdrop.setAttribute("aria-modal", "true");
    this.backdrop.setAttribute("aria-label", "Image viewer");
    this.backdrop.hidden = true;
    this.backdrop.style.display = "none";

    const style = document.createElement("style");
    style.textContent = LIGHTBOX_CSS;

    const content = document.createElement("div");
    content.style.display = "contents";
    content.innerHTML = `
      <div class="vn-lightbox-header">
        <div class="vn-lightbox-title-group">
          <h3 class="vn-lightbox-title"></h3>
          <div class="vn-lightbox-subtitle"></div>
        </div>
        <div class="vn-lightbox-actions">
          <button type="button" class="vn-lightbox-btn" data-action="face-ref" hidden title="Set as face reference">Face Ref</button>
          <button type="button" class="vn-lightbox-btn" data-action="outfit-ref" hidden title="Set as outfit reference">Outfit Ref</button>
          <button type="button" class="vn-lightbox-btn" data-action="delete" hidden title="Delete image">Delete</button>
          <button type="button" class="vn-lightbox-btn" data-action="zoom-toggle" title="Toggle zoom">100%</button>
          <button type="button" class="vn-lightbox-btn" data-action="info-toggle" aria-expanded="false" title="Prompt details">Info</button>
          <button type="button" class="vn-lightbox-btn vn-lightbox-close" data-action="close" aria-label="Close" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div class="vn-lightbox-viewport" data-viewport>
        <img class="vn-lightbox-img" alt="Fullscreen image" />
      </div>
      <div class="vn-lightbox-rail" hidden data-rail aria-label="Gallery navigation"></div>
      <div class="vn-lightbox-info-drawer" hidden data-drawer></div>
    `;

    this.backdrop.append(style, content);

    this.titleEl = this.backdrop.querySelector(".vn-lightbox-title")!;
    this.subtitleEl = this.backdrop.querySelector(".vn-lightbox-subtitle")!;
    this.img = this.backdrop.querySelector(".vn-lightbox-img")!;
    this.railEl = this.backdrop.querySelector("[data-rail]")!;
    this.infoDrawer = this.backdrop.querySelector("[data-drawer]")!;

    this.wireEvents();
  }

  public static open(options: LightboxOptions): FullscreenLightbox {
    if (!FullscreenLightbox.instance) {
      FullscreenLightbox.instance = new FullscreenLightbox();
    }
    FullscreenLightbox.instance.show(options);
    return FullscreenLightbox.instance;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    } else if (e.key === "Tab") {
      trapFocusWithin(this.backdrop, e, (document as unknown as { activeElement?: Element | null }).activeElement ?? null);
    } else if (e.key === "+" || e.key === "=") {
      this.setZoom(Math.min(4, this.zoomLevel + 0.5));
    } else if (e.key === "-") {
      this.setZoom(Math.max(1, this.zoomLevel - 0.5));
    } else if (e.key === "ArrowRight" && this.galleryItems.length > 1) {
      e.preventDefault();
      this.selectGalleryItem((this.galleryIndex + 1) % this.galleryItems.length);
    } else if (e.key === "ArrowLeft" && this.galleryItems.length > 1) {
      e.preventDefault();
      this.selectGalleryItem((this.galleryIndex - 1 + this.galleryItems.length) % this.galleryItems.length);
    }
  };

  private wireEvents(): void {
    const viewport = this.backdrop.querySelector("[data-viewport]") as HTMLElement;
    const faceBtn = this.backdrop.querySelector('[data-action="face-ref"]') as HTMLButtonElement;
    const outfitBtn = this.backdrop.querySelector('[data-action="outfit-ref"]') as HTMLButtonElement;
    const deleteBtn = this.backdrop.querySelector('[data-action="delete"]') as HTMLButtonElement;
    const zoomBtn = this.backdrop.querySelector('[data-action="zoom-toggle"]') as HTMLButtonElement;
    faceBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const item = this.galleryItems[this.galleryIndex] ?? this.currentOptions;
      if (item && this.currentOptions?.onSetFaceRef) { this.currentOptions.onSetFaceRef(item, this.galleryIndex); }
    });
    outfitBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const item = this.galleryItems[this.galleryIndex] ?? this.currentOptions;
      if (item && this.currentOptions?.onSetOutfitRef) { this.currentOptions.onSetOutfitRef(item, this.galleryIndex); }
    });
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const item = this.galleryItems[this.galleryIndex] ?? this.currentOptions;
      if (item && this.currentOptions?.onDelete) { this.currentOptions.onDelete(item, this.galleryIndex); this.close(); }
    });
    const infoBtn = this.backdrop.querySelector('[data-action="info-toggle"]') as HTMLButtonElement;
    const closeBtn = this.backdrop.querySelector('[data-action="close"]') as HTMLButtonElement;

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    let suppressNextClick = false;
    viewport.addEventListener("click", (e) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      if (e.target === viewport) {
        this.close();
      } else if (e.target === this.img) {
        this.toggleZoom();
      }
    });

    this.backdrop.addEventListener("click", (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    zoomBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleZoom();
    });

    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleInfo();
    });

    const touchDist = (t: TouchList) =>
      Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY);

    viewport.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        this.isPanning = false;
        this.pinchStartDist = touchDist(e.touches);
        this.pinchStartZoom = this.zoomLevel;
      } else if (e.touches.length === 1) {
        this.pinchStartDist = 0;
        this.touchStartY = e.touches[0]!.clientY;
        this.touchStartX = e.touches[0]!.clientX;
        if (this.zoomLevel > 1) {
          this.isPanning = true;
          this.panStartX = this.panX;
          this.panStartY = this.panY;
        }
      }
    }, { passive: true });

    viewport.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && this.pinchStartDist > 0) {
        const nextZoom = Math.min(4, Math.max(1, this.pinchStartZoom * (touchDist(e.touches) / this.pinchStartDist)));
        this.setZoom(nextZoom);
      } else if (e.touches.length === 1 && this.isPanning && this.zoomLevel > 1) {
        const dx = e.touches[0]!.clientX - this.touchStartX;
        const dy = e.touches[0]!.clientY - this.touchStartY;
        if (Math.hypot(dx, dy) > 6) suppressNextClick = true;
        this.panX = this.panStartX + dx;
        this.panY = this.panStartY + dy;
        this.applyTransform();
      }
    }, { passive: true });

    viewport.addEventListener("touchend", (e) => {
      if (e.touches.length < 2) this.pinchStartDist = 0;
      if (e.touches.length === 0) this.isPanning = false;
      if (e.changedTouches.length === 1 && this.zoomLevel === 1) {
        const deltaY = e.changedTouches[0]!.clientY - this.touchStartY;
        const deltaX = e.changedTouches[0]!.clientX - this.touchStartX;
        if (deltaY > 70 && Math.abs(deltaY) > Math.abs(deltaX) * 1.4) {
          this.close();
          return;
        }
        if (this.galleryItems.length > 1 && Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          suppressNextClick = true;
          const nextIdx = deltaX < 0
            ? (this.galleryIndex + 1) % this.galleryItems.length
            : (this.galleryIndex - 1 + this.galleryItems.length) % this.galleryItems.length;
          this.selectGalleryItem(nextIdx);
        }
      }
    }, { passive: true });
  }

  private applyTransform(): void {
    if (this.zoomLevel > 1) {
      this.img.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.zoomLevel})`;
    } else {
      this.img.style.transform = "translate3d(0, 0, 0) scale(1)";
    }
  }

  private setZoom(level: number): void {
    this.zoomLevel = level;
    if (level <= 1) {
      this.panX = 0;
      this.panY = 0;
    }
    const viewport = this.backdrop.querySelector("[data-viewport]") as HTMLElement;
    const zoomBtn = this.backdrop.querySelector('[data-action="zoom-toggle"]') as HTMLButtonElement;

    this.applyTransform();
    if (level > 1) {
      viewport.classList.add("zoomed");
      zoomBtn.textContent = `${Math.round(level * 100)}%`;
    } else {
      viewport.classList.remove("zoomed");
      zoomBtn.textContent = "Fit";
    }
  }

  private toggleZoom(): void {
    if (this.zoomLevel === 1) {
      this.setZoom(2);
    } else {
      this.setZoom(1);
    }
  }

  private toggleInfo(): void {
    this.infoOpen = !this.infoOpen;
    const infoBtn = this.backdrop.querySelector('[data-action="info-toggle"]') as HTMLButtonElement;
    infoBtn.classList.toggle("active", this.infoOpen);
    infoBtn.setAttribute("aria-expanded", String(this.infoOpen));
    this.infoDrawer.hidden = !this.infoOpen;
  }

  private applyThemeTokens(themeSource?: HTMLElement): void {
    if (typeof getComputedStyle !== "function") return;
    const source = themeSource ?? document.querySelector<HTMLElement>("[data-vn-root], [data-vn-shell]") ?? document.documentElement;
    if (!source) return;
    const style = getComputedStyle(source);
    const props = [
      "--vn-shell-bg",
      "--vn-shell-panel",
      "--vn-shell-button",
      "--vn-shell-text",
      "--vn-shell-muted",
      "--vn-shell-border",
      "--vn-shell-accent",
      "--vn-shell-accent-contrast",
      "--vn-shell-family",
    ];
    for (const prop of props) {
      const value = style.getPropertyValue(prop).trim();
      if (value) this.backdrop.style.setProperty(prop, value);
    }
  }

  private renderGalleryRail(): void {
    if (this.galleryItems.length <= 1) {
      this.railEl.hidden = true;
      this.railEl.replaceChildren();
      return;
    }
    this.railEl.hidden = false;
    this.railEl.replaceChildren(...this.galleryItems.map((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vn-lightbox-rail-item";
      btn.setAttribute("aria-label", item.title || `Image ${idx + 1}`);
      btn.setAttribute("aria-current", idx === this.galleryIndex ? "true" : "false");
      const thumb = document.createElement("img");
      thumb.src = item.src;
      thumb.alt = "";
      btn.append(thumb);
      btn.onclick = (e) => {
        e.stopPropagation();
        this.selectGalleryItem(idx);
      };
      return btn;
    }));
  }

  private selectGalleryItem(index: number): void {
    const item = this.galleryItems[index];
    if (!item) return;
    this.galleryIndex = index;
    this.presentItem(item);
    this.renderGalleryRail();
  }

  private presentItem(item: LightboxGalleryItem): void {
    this.titleEl.textContent = item.title ?? "Story Artwork";
    this.subtitleEl.textContent = item.subtitle ?? "";
    this.subtitleEl.hidden = !item.subtitle;

    this.img.src = item.src;
    this.setZoom(1);
    this.infoOpen = false;
    this.infoDrawer.hidden = true;

    let infoHtml = "";
    if (item.prompt) {
      infoHtml += `<strong>Positive Prompt:</strong><pre>${escapeHtml(item.prompt)}</pre>`;
    }
    if (item.negativePrompt) {
      infoHtml += `<div style="margin-top:10px"><strong>Negative Prompt:</strong><pre>${escapeHtml(item.negativePrompt)}</pre></div>`;
    }
    this.infoDrawer.innerHTML = infoHtml || "<p style='margin:0;opacity:0.7'>No recorded prompt metadata.</p>";

    const infoBtn = this.backdrop.querySelector('[data-action="info-toggle"]') as HTMLButtonElement;
    infoBtn.classList.remove("active");
    infoBtn.hidden = !item.prompt && !item.negativePrompt;
  }

  public show(options: LightboxOptions): void {
    this.previousFocus = (document as unknown as { activeElement?: HTMLElement | null }).activeElement ?? null;
    this.currentOptions = options;
    const faceBtn = this.backdrop.querySelector('[data-action="face-ref"]') as HTMLButtonElement | null;
    const outfitBtn = this.backdrop.querySelector('[data-action="outfit-ref"]') as HTMLButtonElement | null;
    const deleteBtn = this.backdrop.querySelector('[data-action="delete"]') as HTMLButtonElement | null;
    if (faceBtn) faceBtn.hidden = !options.onSetFaceRef;
    if (outfitBtn) outfitBtn.hidden = !options.onSetOutfitRef;
    if (deleteBtn) deleteBtn.hidden = !options.onDelete;
    this.applyThemeTokens(options.themeSource);
    this.galleryItems = options.gallery && options.gallery.length > 0 ? options.gallery : [];
    const requestedIdx = options.galleryIndex ?? 0;
    this.galleryIndex = this.galleryItems.length > 0
      ? Math.min(Math.max(0, requestedIdx), this.galleryItems.length - 1)
      : 0;
    this.presentItem(options);
    this.renderGalleryRail();

    if (!this.backdrop.parentNode) {
      document.body.appendChild(this.backdrop);
    }

    this.backdrop.hidden = false;
    this.backdrop.classList.add("open");
    this.backdrop.style.display = "flex";
    this.backdrop.style.pointerEvents = "auto";
    this.backdrop.tabIndex = -1;
    this.backdrop.focus();

    window.removeEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  public close(): void {
    window.removeEventListener("keydown", this.handleKeyDown);

    this.backdrop.classList.remove("open");
    this.backdrop.hidden = true;
    this.backdrop.style.display = "none";
    this.backdrop.style.pointerEvents = "none";
    this.img.removeAttribute("src");
    this.currentOptions = null;

    if (this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    const returnTo = this.previousFocus;
    this.previousFocus = null;
    returnTo?.focus?.();
  }
}
