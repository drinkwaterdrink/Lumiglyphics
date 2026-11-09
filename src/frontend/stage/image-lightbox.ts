/**
 * Interactive Image Lightbox with touch gesture pinch-to-zoom (Android/mobile),
 * zoom level toggle button (Fit / 100% / 200%), mousewheel zoom, click/drag pan,
 * and keyboard navigation.
 */

export type LightboxItem = {
  imageUrl: string;
  title?: string | undefined;
  caption?: string | undefined;
  storyExcerpt?: string | undefined;
};

export class ImageLightbox {
  readonly host: HTMLElement;
  private readonly img: HTMLImageElement;
  private readonly captionEl: HTMLElement;
  private readonly zoomBtn: HTMLButtonElement;
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly exportBtn: HTMLButtonElement;
  private readonly deleteBtn: HTMLButtonElement;

  private items: LightboxItem[] = [];
  private activeIndex = -1;
  private isOpen = false;

  // Zoom & Pan state
  private scale = 1.0;
  private zoomMode: 'fit' | '100' | '200' = 'fit';
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  // Pinch touch state
  private initialPinchDist = 0;
  private initialPinchScale = 1;
  private lastTapTime = 0;

  onDelete?: (item: LightboxItem, index: number) => void;
  onClose?: () => void;

  constructor(mountParent?: HTMLElement) {
    this.host = document.createElement('div');
    this.host.className = 'vn-interactive-lightbox';
    this.host.setAttribute('data-cg-lightbox', '');
    this.host.hidden = true;
    this.host.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 100050;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
    `;

    // Top control bar
    const topBar = document.createElement('div');
    topBar.className = 'lightbox-topbar';
    topBar.style.cssText = `
      position: absolute;
      top: calc(14px + env(safe-area-inset-top, 0px));
      left: 14px;
      right: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      z-index: 100060;
      pointer-events: auto;
    `;

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'lightbox-btn lightbox-back-btn';
    backBtn.setAttribute('data-cg-lightbox-back', '');
    backBtn.innerHTML = '← <span>Back</span>';
    backBtn.style.cssText = this.btnStyle();
    backBtn.onclick = () => this.close();

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

    this.zoomBtn = document.createElement('button');
    this.zoomBtn.type = 'button';
    this.zoomBtn.className = 'lightbox-btn lightbox-zoom-btn';
    this.zoomBtn.textContent = '🔍 Fit';
    this.zoomBtn.title = 'Toggle Zoom (Fit / 100% / 200%)';
    this.zoomBtn.style.cssText = this.btnStyle();
    this.zoomBtn.onclick = () => this.cycleZoom();

    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.className = 'lightbox-btn';
    this.prevBtn.setAttribute('data-cg-prev', '');
    this.prevBtn.innerHTML = '◀ <span>Prev</span>';
    this.prevBtn.style.cssText = this.btnStyle();
    this.prevBtn.onclick = () => this.step(-1);

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.className = 'lightbox-btn';
    this.nextBtn.setAttribute('data-cg-next', '');
    this.nextBtn.innerHTML = '<span>Next</span> ▶';
    this.nextBtn.style.cssText = this.btnStyle();
    this.nextBtn.onclick = () => this.step(1);

    this.exportBtn = document.createElement('button');
    this.exportBtn.type = 'button';
    this.exportBtn.className = 'lightbox-btn';
    this.exportBtn.setAttribute('data-cg-download', '');
    this.exportBtn.innerHTML = '📥 <span>Save</span>';
    this.exportBtn.style.cssText = this.btnStyle();
    this.exportBtn.onclick = () => this.exportCurrent();

    this.deleteBtn = document.createElement('button');
    this.deleteBtn.type = 'button';
    this.deleteBtn.className = 'lightbox-btn lightbox-del-btn';
    this.deleteBtn.setAttribute('data-cg-delete', '');
    this.deleteBtn.innerHTML = '🗑️';
    this.deleteBtn.title = 'Delete picture';
    this.deleteBtn.style.cssText = this.btnStyle('rgba(239, 68, 68, 0.25)', 'rgba(239, 68, 68, 0.45)', '#fca5a5');
    this.deleteBtn.onclick = () => this.deleteCurrent();

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-btn lightbox-close-btn';
    closeBtn.setAttribute('data-cg-lightbox-close', '');
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close';
    closeBtn.style.cssText = this.btnStyle() + 'width:38px;padding:0;text-align:center;justify-content:center;';
    closeBtn.onclick = () => this.close();

    actions.append(this.zoomBtn, this.prevBtn, this.nextBtn, this.exportBtn, this.deleteBtn, closeBtn);
    topBar.append(backBtn, actions);

    // Image viewport & img container
    const viewport = document.createElement('div');
    viewport.className = 'lightbox-viewport';
    viewport.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: grab;
    `;

    this.img = document.createElement('img');
    this.img.className = 'lightbox-img';
    this.img.setAttribute('data-cg-lightbox-img', '');
    this.img.alt = 'Artwork preview';
    this.img.style.cssText = `
      max-width: 94vw;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9);
      transition: transform 0.08s ease-out;
      transform-origin: center center;
      will-change: transform;
      pointer-events: auto;
    `;

    viewport.append(this.img);

    // Caption / Story excerpt footer
    this.captionEl = document.createElement('div');
    this.captionEl.className = 'lightbox-caption';
    this.captionEl.setAttribute('data-cg-lightbox-quote', '');
    this.captionEl.style.cssText = `
      position: absolute;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      left: 20px;
      right: 20px;
      max-width: 820px;
      margin: 0 auto;
      text-align: center;
      font-size: 13px;
      font-style: italic;
      color: rgba(241, 245, 249, 0.92);
      text-shadow: 0 2px 6px rgba(0,0,0,0.85);
      pointer-events: none;
      line-height: 1.5;
    `;

    this.host.append(topBar, viewport, this.captionEl);
    if (mountParent) mountParent.append(this.host);
    else if (typeof document !== 'undefined' && document.body) document.body.append(this.host);

    this.attachEvents(viewport);
  }

  private btnStyle(bg = 'rgba(255, 255, 255, 0.12)', border = 'rgba(255, 255, 255, 0.2)', color = '#fff'): string {
    return `
      min-height: 38px;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid ${border};
      background: ${bg};
      color: ${color};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
  }

  private attachEvents(viewport: HTMLElement): void {
    // Mouse drag pan
    viewport.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.startX = e.clientX - this.translateX;
      this.startY = e.clientY - this.translateY;
      viewport.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.isOpen) return;
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      viewport.style.cursor = 'grab';
    });

    // Mouse wheel zoom
    viewport.addEventListener('wheel', (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.15 : 0.85;
      this.scale = Math.max(0.3, Math.min(4.5, this.scale * delta));
      this.updateZoomModeLabel();
      this.applyTransform();
    }, { passive: false });

    // Touch gesture pinch-to-zoom & pan for Android / Mobile
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // Pinch start
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (!t0 || !t1) return;
        const dist = Math.hypot(
          t0.clientX - t1.clientX,
          t0.clientY - t1.clientY
        );
        this.initialPinchDist = dist;
        this.initialPinchScale = this.scale;
      } else if (e.touches.length === 1) {
        const t0 = e.touches[0];
        if (!t0) return;
        // Double tap check
        const now = Date.now();
        if (now - this.lastTapTime < 320) {
          this.cycleZoom();
          this.lastTapTime = 0;
          return;
        }
        this.lastTapTime = now;

        // Single touch pan start
        this.isDragging = true;
        this.startX = t0.clientX - this.translateX;
        this.startY = t0.clientY - this.translateY;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (!this.isOpen) return;
      if (e.touches.length === 2 && this.initialPinchDist > 0) {
        // Pinching
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (!t0 || !t1) return;
        const dist = Math.hypot(
          t0.clientX - t1.clientX,
          t0.clientY - t1.clientY
        );
        const factor = dist / this.initialPinchDist;
        this.scale = Math.max(0.4, Math.min(4.5, this.initialPinchScale * factor));
        this.updateZoomModeLabel();
        this.applyTransform();
        e.preventDefault();
      } else if (e.touches.length === 1 && this.isDragging) {
        const t0 = e.touches[0];
        if (!t0) return;
        // Dragging
        this.translateX = t0.clientX - this.startX;
        this.translateY = t0.clientY - this.startY;
        this.applyTransform();
        e.preventDefault();
      }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        this.initialPinchDist = 0;
      }
      if (e.touches.length === 0) {
        this.isDragging = false;
      }
    });

    // Keyboard bindings
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowLeft') {
        this.step(-1);
      } else if (e.key === 'ArrowRight') {
        this.step(1);
      } else if (e.key === '+' || e.key === '=') {
        this.scale = Math.min(4.5, this.scale * 1.25);
        this.updateZoomModeLabel();
        this.applyTransform();
      } else if (e.key === '-' || e.key === '_') {
        this.scale = Math.max(0.4, this.scale * 0.8);
        this.updateZoomModeLabel();
        this.applyTransform();
      } else if (e.key === '0') {
        this.resetTransform();
      }
    });
  }

  private applyTransform(): void {
    this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  private resetTransform(): void {
    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 0;
    this.zoomMode = 'fit';
    this.zoomBtn.innerHTML = '🔍 Fit';
    this.applyTransform();
  }

  private cycleZoom(): void {
    if (this.zoomMode === 'fit') {
      this.zoomMode = '100';
      this.scale = 1.6; // 100% detail zoom
      this.zoomBtn.textContent = '🔍 100%';
    } else if (this.zoomMode === '100') {
      this.zoomMode = '200';
      this.scale = 2.6; // 200% high detail zoom
      this.zoomBtn.textContent = '🔍 200%';
    } else {
      this.resetTransform();
      return;
    }
    this.applyTransform();
  }

  private updateZoomModeLabel(): void {
    if (Math.abs(this.scale - 1.0) < 0.15) {
      this.zoomMode = 'fit';
      this.zoomBtn.innerHTML = '🔍 Fit';
    } else if (Math.abs(this.scale - 1.6) < 0.25) {
      this.zoomMode = '100';
      this.zoomBtn.innerHTML = '🔍 100%';
    } else if (this.scale >= 2.0) {
      this.zoomMode = '200';
      this.zoomBtn.innerHTML = '🔍 200%';
    } else {
      this.zoomBtn.textContent = `🔍 ${Math.round(this.scale * 100)}%`;
    }
  }

  get hidden(): boolean {
    return Boolean(this.host.hidden);
  }
  set hidden(val: boolean) {
    this.host.hidden = val;
    if (val) {
      this.close();
    }
  }
  get isOpenState(): boolean {
    return this.isOpen;
  }

  open(items: LightboxItem[] | string, index = 0): void {
    if (typeof items === 'string') {
      this.items = [{ imageUrl: items }];
      this.activeIndex = 0;
    } else {
      this.items = items;
      this.activeIndex = Math.max(0, Math.min(items.length - 1, index));
    }
    this.isOpen = true;
    this.host.hidden = false;
    this.renderCurrent();
  }

  close(): void {
    this.isOpen = false;
    this.host.hidden = true;
    this.resetTransform();
    this.onClose?.();
  }

  private renderCurrent(): void {
    const item = this.items[this.activeIndex];
    if (!item) return;

    this.resetTransform();
    this.img.src = item.imageUrl;

    const captionText = item.storyExcerpt ? `“${item.storyExcerpt}”` : (item.caption || item.title || '');
    this.captionEl.textContent = captionText;
    this.captionEl.style.display = captionText ? 'block' : 'none';

    this.prevBtn.style.display = this.items.length > 1 ? 'inline-flex' : 'none';
    this.nextBtn.style.display = this.items.length > 1 ? 'inline-flex' : 'none';
    this.deleteBtn.style.display = this.onDelete ? 'inline-flex' : 'none';
  }

  private step(delta: number): void {
    if (this.items.length <= 1) return;
    this.activeIndex = (this.activeIndex + delta + this.items.length) % this.items.length;
    this.renderCurrent();
  }

  private exportCurrent(): void {
    const item = this.items[this.activeIndex];
    if (!item?.imageUrl) return;
    const a = document.createElement('a');
    a.href = item.imageUrl;
    a.download = `lumiglyphics-artwork-${Date.now()}.png`;
    a.click();
  }

  private deleteCurrent(): void {
    const item = this.items[this.activeIndex];
    if (!item) return;
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('Delete this picture?')) return;
    const idx = this.activeIndex;
    this.items = this.items.filter((_, i) => i !== idx);
    this.onDelete?.(item, idx);
    if (this.items.length === 0) {
      this.close();
    } else {
      this.activeIndex = Math.min(this.activeIndex, this.items.length - 1);
      this.renderCurrent();
    }
  }
}
