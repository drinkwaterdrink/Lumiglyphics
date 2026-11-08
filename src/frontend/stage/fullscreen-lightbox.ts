/**
 * Edge-to-edge Fullscreen Image Lightbox for History & Artwork Review Studio.
 */

export interface LightboxOptions {
  src: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  prompt?: string | undefined;
  negativePrompt?: string | undefined;
}

const LIGHTBOX_CSS = `
.vn-lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: none;
  flex-direction: column;
  background: rgba(4, 8, 12, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  user-select: none;
  touch-action: pan-y;
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
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.vn-lightbox-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.45);
}
.vn-lightbox-btn.active {
  background: #7c9cff;
  border-color: #7c9cff;
  color: #0d121f;
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
  overflow: auto;
  overscroll-behavior: contain;
  padding: 68px 16px 24px;
  cursor: zoom-in;
}
.vn-lightbox-viewport.zoomed {
  cursor: grab;
}
.vn-lightbox-img {
  max-width: 95vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center center;
}
.vn-lightbox-info-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 40vh;
  overflow-y: auto;
  padding: 16px 20px max(16px, env(safe-area-inset-bottom));
  background: rgba(10, 16, 24, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  color: #e0e5ed;
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
  private zoomLevel = 1;
  private infoOpen = false;
  private currentOptions: LightboxOptions | null = null;
  private touchStartY = 0;
  private touchStartX = 0;

  constructor() {
    this.backdrop = document.createElement("div");
    this.backdrop.className = "vn-lightbox-backdrop";
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
          <button type="button" class="vn-lightbox-btn" data-action="zoom-toggle" title="Toggle zoom">100%</button>
          <button type="button" class="vn-lightbox-btn" data-action="info-toggle" title="Prompt details">Info</button>
          <button type="button" class="vn-lightbox-btn vn-lightbox-close" data-action="close" aria-label="Close" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div class="vn-lightbox-viewport" data-viewport>
        <img class="vn-lightbox-img" alt="Fullscreen image" />
      </div>
      <div class="vn-lightbox-info-drawer" hidden data-drawer></div>
    `;

    this.backdrop.append(style, content);

    this.titleEl = this.backdrop.querySelector(".vn-lightbox-title")!;
    this.subtitleEl = this.backdrop.querySelector(".vn-lightbox-subtitle")!;
    this.img = this.backdrop.querySelector(".vn-lightbox-img")!;
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
    } else if (e.key === "+" || e.key === "=") {
      this.setZoom(Math.min(3, this.zoomLevel + 0.5));
    } else if (e.key === "-") {
      this.setZoom(Math.max(1, this.zoomLevel - 0.5));
    }
  };

  private wireEvents(): void {
    const viewport = this.backdrop.querySelector("[data-viewport]") as HTMLElement;
    const zoomBtn = this.backdrop.querySelector('[data-action="zoom-toggle"]') as HTMLButtonElement;
    const infoBtn = this.backdrop.querySelector('[data-action="info-toggle"]') as HTMLButtonElement;
    const closeBtn = this.backdrop.querySelector('[data-action="close"]') as HTMLButtonElement;

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    viewport.addEventListener("click", (e) => {
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

    // Touch gesture: swipe down to dismiss
    this.backdrop.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.touchStartY = e.touches[0]!.clientY;
        this.touchStartX = e.touches[0]!.clientX;
      }
    }, { passive: true });

    this.backdrop.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1 && this.zoomLevel === 1) {
        const deltaY = e.changedTouches[0]!.clientY - this.touchStartY;
        const deltaX = Math.abs(e.changedTouches[0]!.clientX - this.touchStartX);
        if (deltaY > 70 && deltaX < 120) {
          this.close();
        }
      }
    }, { passive: true });
  }

  private setZoom(level: number): void {
    this.zoomLevel = level;
    const viewport = this.backdrop.querySelector("[data-viewport]") as HTMLElement;
    const zoomBtn = this.backdrop.querySelector('[data-action="zoom-toggle"]') as HTMLButtonElement;

    if (level > 1) {
      this.img.style.transform = `scale(${level})`;
      this.img.style.maxWidth = "none";
      this.img.style.maxHeight = "none";
      viewport.classList.add("zoomed");
      zoomBtn.textContent = `${Math.round(level * 100)}%`;
    } else {
      this.img.style.transform = "none";
      this.img.style.maxWidth = "95vw";
      this.img.style.maxHeight = "85vh";
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
    this.infoDrawer.hidden = !this.infoOpen;
  }

  public show(options: LightboxOptions): void {
    this.currentOptions = options;
    this.titleEl.textContent = options.title ?? "Story Artwork";
    this.subtitleEl.textContent = options.subtitle ?? "";
    this.subtitleEl.hidden = !options.subtitle;

    this.img.src = options.src;
    this.setZoom(1);
    this.infoOpen = false;
    this.infoDrawer.hidden = true;

    let infoHtml = "";
    if (options.prompt) {
      infoHtml += `<strong>Positive Prompt:</strong><pre>${this.escapeHtml(options.prompt)}</pre>`;
    }
    if (options.negativePrompt) {
      infoHtml += `<div style="margin-top:10px"><strong>Negative Prompt:</strong><pre>${this.escapeHtml(options.negativePrompt)}</pre></div>`;
    }
    this.infoDrawer.innerHTML = infoHtml || "<p style='margin:0;opacity:0.7'>No recorded prompt metadata.</p>";

    const infoBtn = this.backdrop.querySelector('[data-action="info-toggle"]') as HTMLButtonElement;
    infoBtn.hidden = !options.prompt && !options.negativePrompt;

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
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
