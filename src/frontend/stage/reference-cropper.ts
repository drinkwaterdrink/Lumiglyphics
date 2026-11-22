import type { CropAspect, NormalizedCropRect, ReferenceCropMeta } from '../../shared/character-dna.js';
import { trapFocusWithin } from '../image-review/focus-trap.js';

export type { CropAspect, NormalizedCropRect, ReferenceCropMeta };

const MIN_SIZE = 0.08;
const round4 = (n: number) => Number(n.toFixed(4));

export function clampCropRect(rect: NormalizedCropRect): NormalizedCropRect {
  const fin = (v: number, d: number) => (Number.isFinite(v) ? v : d);
  const width = Math.max(MIN_SIZE, Math.min(1, fin(rect.width, 1)));
  const height = Math.max(MIN_SIZE, Math.min(1, fin(rect.height, 1)));
  const x = Math.max(0, Math.min(1 - width, fin(rect.x, 0)));
  const y = Math.max(0, Math.min(1 - height, fin(rect.y, 0)));
  return { x: round4(x), y: round4(y), width: round4(width), height: round4(height) };
}

export function aspectRatioValue(aspect: CropAspect): number | null {
  return aspect === '1:1' ? 1 : aspect === '3:4' ? 3 / 4 : aspect === '2:3' ? 2 / 3 : null;
}

/** Clamps a crop rect in image pixel space so locked aspect ratios never distort on extreme wide/tall images. */
export function clampAspectCropRect(
  rect: NormalizedCropRect,
  imgWidth: number,
  imgHeight: number,
  aspect: CropAspect,
): NormalizedCropRect {
  const ratio = aspectRatioValue(aspect);
  if (!ratio) return clampCropRect(rect);
  const wImg = Math.max(1, Number.isFinite(imgWidth) ? imgWidth : 1000);
  const hImg = Math.max(1, Number.isFinite(imgHeight) ? imgHeight : 1000);
  const fin = (v: number, d: number) => (Number.isFinite(v) ? v : d);

  const maxPxW = Math.min(wImg, hImg * ratio);
  const minShortPx = Math.max(1, Math.min(wImg, hImg) * MIN_SIZE);
  const minPxW = Math.min(maxPxW, Math.max(minShortPx, minShortPx * ratio));

  const desiredPxW = fin(rect.width, 1) * wImg;
  const pxW = Math.max(minPxW, Math.min(maxPxW, desiredPxW));
  const pxH = pxW / ratio;

  const width = Math.min(1, pxW / wImg);
  const height = Math.min(1, pxH / hImg);
  const x = Math.max(0, Math.min(1 - width, fin(rect.x, 0)));
  const y = Math.max(0, Math.min(1 - height, fin(rect.y, 0)));
  return { x: round4(x), y: round4(y), width: round4(width), height: round4(height) };
}

/** Largest aspect-correct rect at `scale` of the limiting side, centred on `center` (normalized). */
export function fitAspectCropRect(
  imgWidth: number,
  imgHeight: number,
  aspect: CropAspect,
  center: { x: number; y: number } = { x: 0.5, y: 0.42 },
  scale = 0.78,
): NormalizedCropRect {
  const s = Math.max(0.15, Math.min(1, scale));
  const ratio = aspectRatioValue(aspect);
  if (!ratio) return clampCropRect({ x: center.x - s / 2, y: center.y - s / 2, width: s, height: s });
  const wImg = Math.max(1, imgWidth);
  const hImg = Math.max(1, imgHeight);
  const maxPxW = Math.min(wImg, hImg * ratio);
  const pxW = maxPxW * s;
  const pxH = pxW / ratio;
  const width = pxW / wImg;
  const height = pxH / hImg;
  return clampAspectCropRect({ x: center.x - width / 2, y: center.y - height / 2, width, height }, wImg, hImg, aspect);
}

export function computeExportDimensions(cropPxW: number, cropPxH: number, maxEdge = 1024): { width: number; height: number } {
  const w = Math.max(1, Math.round(cropPxW));
  const h = Math.max(1, Math.round(cropPxH));
  const cap = Math.max(64, Math.round(maxEdge));
  if (w <= cap && h <= cap) return { width: w, height: h };
  return w >= h
    ? { width: cap, height: Math.max(1, Math.round((h / w) * cap)) }
    : { width: Math.max(1, Math.round((w / h) * cap)), height: cap };
}

export interface ReferenceCropperOptions {
  sourceUrl: string;
  sourceImageId?: string | undefined;
  slot: 'face' | 'outfit';
  initialMeta?: ReferenceCropMeta | undefined;
  characterName?: string | undefined;
  mount?: HTMLElement | undefined;
  onConfirm: (result: { dataUrl: string; cropMeta: ReferenceCropMeta; usedFullImage: boolean }) => void;
  onCancel?: (() => void) | undefined;
}

const BTN = 'min-height:44px;padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);color:inherit;font-size:12px;font-weight:600;cursor:pointer;';

/**
 * Interactive crop modal. Lets the user pull one person out of a two-shot or crowd CG
 * and returns a compact data URL (<=1024px edge, WebP 0.9 with PNG fallback).
 * The source image is never modified.
 */
export function openReferenceCropperModal(options: ReferenceCropperOptions): { close: () => void; element: HTMLElement } {
  let aspect: CropAspect = options.initialMeta?.aspect ?? (options.slot === 'face' ? '1:1' : '3:4');
  let imgW = 1000, imgH = 1000;
  let rect: NormalizedCropRect = options.initialMeta?.rect ? clampCropRect(options.initialMeta.rect) : fitAspectCropRect(imgW, imgH, aspect);
  let loaded: HTMLImageElement | null = null;
  let objectUrl: string | null = null;
  let closed = false;
  const fetchAbort = typeof AbortController === 'function' ? new AbortController() : null;
  const previousFocus = (document as any).activeElement as HTMLElement | null;
  const slotLabel = options.slot === 'face' ? 'Face' : 'Outfit';
  const title = `Crop ${slotLabel} Reference${options.characterName ? ` · ${options.characterName}` : ''}`;

  const overlay = document.createElement('div');
  overlay.dataset.vnReferenceCropper = options.slot;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(4,9,16,0.88);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

  const modal = document.createElement('div');
  modal.style.cssText = 'width:min(560px,100%);max-height:92vh;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:14px;background:var(--vn-shell-panel,#0f172a);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.16));color:var(--vn-shell-text,#f1f5f9);';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
  const h3 = document.createElement('h3');
  h3.style.cssText = 'margin:0;font-size:15px;';
  h3.textContent = `✂️ ${title}`;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.dataset.cropperClose = '';
  closeBtn.setAttribute('aria-label', 'Cancel crop');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = BTN + 'width:44px;padding:0;font-size:18px;';
  header.append(h3, closeBtn);

  const hint = document.createElement('p');
  hint.style.cssText = 'margin:0;font-size:12px;opacity:0.8;line-height:1.45;';
  hint.textContent = 'Drag the frame onto one character, then resize with the corner handle or slider. The original gallery picture stays untouched.';

  const aspectRow = document.createElement('div');
  aspectRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

  const viewport = document.createElement('div');
  viewport.dataset.cropperViewport = '';
  viewport.style.cssText = 'position:relative;height:300px;background:#05080f;border-radius:10px;overflow:hidden;touch-action:none;user-select:none;display:flex;align-items:center;justify-content:center;';
  const stageBox = document.createElement('div');
  stageBox.style.cssText = 'position:relative;width:280px;height:280px;';
  const img = document.createElement('img');
  img.alt = '';
  img.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
  const box = document.createElement('div');
  box.dataset.cropperBox = '';
  box.style.cssText = 'position:absolute;box-sizing:border-box;border:2px solid #38bdf8;box-shadow:0 0 0 9999px rgba(0,0,0,0.58);cursor:move;background-image:linear-gradient(to right,transparent 33%,rgba(255,255,255,.25) 33%,rgba(255,255,255,.25) calc(33% + 1px),transparent calc(33% + 1px),transparent 66%,rgba(255,255,255,.25) 66%,rgba(255,255,255,.25) calc(66% + 1px),transparent calc(66% + 1px)),linear-gradient(to bottom,transparent 33%,rgba(255,255,255,.25) 33%,rgba(255,255,255,.25) calc(33% + 1px),transparent calc(33% + 1px),transparent 66%,rgba(255,255,255,.25) 66%,rgba(255,255,255,.25) calc(66% + 1px),transparent calc(66% + 1px));';
  const handle = document.createElement('div');
  handle.dataset.cropHandle = 'se';
  handle.style.cssText = 'position:absolute;right:-11px;bottom:-11px;width:22px;height:22px;border-radius:50%;background:#38bdf8;border:2px solid #041624;cursor:nwse-resize;';
  box.append(handle);
  stageBox.append(img, box);
  viewport.append(stageBox);

  const zoomRow = document.createElement('label');
  zoomRow.style.cssText = 'display:flex;align-items:center;gap:10px;font-size:12px;';
  zoomRow.textContent = 'Frame size';
  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.dataset.cropperScale = '';
  zoom.min = '15';
  zoom.max = '100';
  zoom.style.cssText = 'flex:1;min-height:44px;';
  zoomRow.append(zoom);

  const sync = () => {
    rect = clampAspectCropRect(rect, imgW, imgH, aspect);
    box.style.left = `${rect.x * 100}%`;
    box.style.top = `${rect.y * 100}%`;
    box.style.width = `${rect.width * 100}%`;
    box.style.height = `${rect.height * 100}%`;
    zoom.value = String(Math.round(Math.max(rect.width, rect.height) * 100));
    for (const b of aspectRow.querySelectorAll<HTMLButtonElement>('button[data-crop-aspect]')) {
      const on = b.dataset.cropAspect === aspect;
      b.setAttribute('aria-pressed', String(on));
      b.style.borderColor = on ? '#38bdf8' : 'rgba(255,255,255,0.16)';
    }
  };
  const refit = (scale: number) => {
    rect = fitAspectCropRect(imgW, imgH, aspect, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, scale);
    sync();
  };

  for (const [id, label] of [['1:1', '1:1 Face'], ['3:4', '3:4 Portrait'], ['2:3', '2:3 Full Body'], ['free', 'Free']] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.cropAspect = id;
    b.textContent = label;
    b.style.cssText = BTN;
    b.onclick = () => { aspect = id; refit(Number(zoom.value) / 100 || 0.78); };
    aspectRow.append(b);
  }
  zoom.oninput = () => refit(Number(zoom.value) / 100);

  let mode: 'move' | 'resize' | null = null;
  let sx = 0, sy = 0, start = rect;
  box.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    mode = (e.target as HTMLElement | null)?.dataset?.cropHandle === 'se' ? 'resize' : 'move';
    sx = e.clientX; sy = e.clientY; start = { ...rect };
    box.setPointerCapture?.(e.pointerId);
  });
  box.addEventListener('pointermove', (e: PointerEvent) => {
    if (!mode) return;
    const dx = (e.clientX - sx) / Math.max(40, stageBox.offsetWidth || 280);
    const dy = (e.clientY - sy) / Math.max(40, stageBox.offsetHeight || 280);
    if (mode === 'move') {
      rect = { ...start, x: start.x + dx, y: start.y + dy };
    } else {
      const width = Math.max(MIN_SIZE, Math.min(1 - start.x, start.width + dx));
      const ratio = aspectRatioValue(aspect);
      const height = ratio ? width / (ratio / (imgW / imgH)) : Math.max(MIN_SIZE, Math.min(1 - start.y, start.height + dy));
      rect = clampAspectCropRect({ x: start.x, y: start.y, width: Math.min(1 - start.x, Math.max(MIN_SIZE, start.width + dx)), height: ratio ? (Math.min(1 - start.x, Math.max(MIN_SIZE, start.width + dx)) * imgW / ratio) / imgH : Math.min(1 - start.y, Math.max(MIN_SIZE, start.height + dy)) }, imgW, imgH, aspect);
    }
    sync();
  });
  const end = () => { mode = null; };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);

  const render = (r: NormalizedCropRect): string | null => {
    if (!loaded) return null;
    try {
      const px = Math.round(r.x * imgW), py = Math.round(r.y * imgH);
      const pw = Math.max(1, Math.min(imgW - px, Math.round(r.width * imgW)));
      const ph = Math.max(1, Math.min(imgH - py, Math.round(r.height * imgH)));
      const dims = computeExportDimensions(pw, ph, 1024);
      const canvas = document.createElement('canvas');
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext?.('2d');
      if (!ctx) return null;
      ctx.drawImage(loaded, px, py, pw, ph, 0, 0, dims.width, dims.height);
      const webp = canvas.toDataURL('image/webp', 0.9);
      if (webp.startsWith('data:image/webp')) return webp;
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const statusEl = document.createElement('div');
  statusEl.dataset.cropperStatus = '';
  statusEl.setAttribute('role', 'status');
  statusEl.style.cssText = 'font-size:12px;color:var(--vn-shell-muted,#94a3b8);min-height:16px;';
  statusEl.textContent = 'Loading image…';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;';
  const fullBtn = document.createElement('button');
  fullBtn.type = 'button';
  fullBtn.dataset.cropperUseFull = '';
  fullBtn.textContent = 'Use Full Image (No Crop)';
  fullBtn.style.cssText = BTN;
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.dataset.cropperCancel = '';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = BTN;
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.dataset.cropperApply = '';
  applyBtn.disabled = true;
  applyBtn.textContent = 'Loading image…';
  applyBtn.style.cssText = BTN + 'background:var(--vn-shell-accent,#38bdf8);color:var(--vn-shell-accent-contrast,#041624);border:none;';
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;gap:8px;';
  right.append(cancelBtn, applyBtn);
  footer.append(fullBtn, right);

  modal.append(header, hint, aspectRow, viewport, zoomRow, statusEl, footer);
  overlay.append(modal);

  const onWindowKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    if (e.key === 'Tab') {
      trapFocusWithin(modal, e, (document as any).activeElement ?? null);
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    try { fetchAbort?.abort(); } catch { /* ignore */ }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', onWindowKeyDown, true);
    }
    if (objectUrl) { try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ } objectUrl = null; }
    overlay.remove();
    previousFocus?.focus?.();
  };
  const cancel = () => { close(); options.onCancel?.(); };
  const confirm = (r: NormalizedCropRect, full: boolean) => {
    let dataUrl: string;
    if (full) {
      dataUrl = options.sourceUrl;
    } else {
      const rendered = render(r);
      if (!rendered) {
        statusEl.textContent = 'Unable to export cropped region (image still loading or cross-origin restricted). Try "Use Full Image".';
        statusEl.style.color = '#f87171';
        return;
      }
      dataUrl = rendered;
    }
    close();
    options.onConfirm({
      dataUrl,
      cropMeta: {
        ...(options.sourceImageId ? { sourceImageId: options.sourceImageId } : {}),
        ...(options.sourceUrl.startsWith('data:') ? {} : { sourceUrl: options.sourceUrl.slice(0, 2048) }),
        rect: r,
        aspect: full ? 'free' : aspect,
      },
      usedFullImage: full,
    });
  };
  closeBtn.onclick = cancel;
  cancelBtn.onclick = cancel;
  fullBtn.onclick = () => confirm({ x: 0, y: 0, width: 1, height: 1 }, true);
  applyBtn.onclick = () => confirm(clampCropRect(rect), false);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cancel();
  });
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', onWindowKeyDown, true);
  }

  const show = (src: string) => {
    if (closed) return;
    img.onload = () => {
      if (closed) return;
      loaded = img;
      imgW = Math.max(1, img.naturalWidth || 1000);
      imgH = Math.max(1, img.naturalHeight || 1000);
      const edge = 280;
      stageBox.style.width = `${imgW >= imgH ? edge : Math.round((imgW / imgH) * edge)}px`;
      stageBox.style.height = `${imgW >= imgH ? Math.round((imgH / imgW) * edge) : edge}px`;
      if (!options.initialMeta?.rect) rect = fitAspectCropRect(imgW, imgH, aspect);
      applyBtn.disabled = false;
      applyBtn.textContent = `✂️ Apply ${slotLabel} Crop`;
      statusEl.textContent = `${imgW} × ${imgH}px ready`;
      statusEl.style.color = 'var(--vn-shell-muted,#94a3b8)';
      sync();
    };
    img.onerror = () => {
      if (closed) return;
      applyBtn.disabled = true;
      applyBtn.textContent = `✂️ Apply ${slotLabel} Crop`;
      statusEl.textContent = 'Image failed to load for cropping. You can still use Full Image or Cancel.';
      statusEl.style.color = '#f87171';
    };
    img.src = src;
  };
  if (options.sourceUrl.startsWith('data:') || typeof fetch !== 'function') {
    show(options.sourceUrl);
  } else {
    // Fetching as a same-origin Blob keeps the canvas untainted so it can be exported.
    fetch(options.sourceUrl, { credentials: 'include', ...(fetchAbort ? { signal: fetchAbort.signal } : {}) })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        const created = URL.createObjectURL(blob);
        if (closed) { try { URL.revokeObjectURL(created); } catch { /* ignore */ } return; }
        objectUrl = created;
        show(objectUrl);
      })
      .catch(() => { if (!closed) show(options.sourceUrl); });
  }

  sync();
  (options.mount ?? document.body ?? document.documentElement)?.append(overlay);
  (applyBtn.disabled ? fullBtn : applyBtn).focus?.();
  return { close, element: overlay };
}
