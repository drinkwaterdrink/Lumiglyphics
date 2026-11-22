/**
 * Chromatic Rim (#2): samples the loaded scene image via a 16x16 offscreen canvas
 * and produces a luminance- and saturation-clamped RGB string for subtle glass
 * edge tinting. Degrades cleanly to `null` on CORS-tainted or headless images.
 */

export function clampRimRgb(r: number, g: number, b: number): string {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));

  // Convert to HSL-like lightness/saturation clamp so tint never blows out contrast
  const max = Math.max(cr, cg, cb) / 255;
  const min = Math.min(cr, cg, cb) / 255;
  const l = (max + min) / 2;
  const avg = (cr + cg + cb) / 3;

  // Desaturate overly neon samples toward 58% max chroma
  const satMix = max - min > 0.58 ? 0.65 : 1;
  let mr = avg + (cr - avg) * satMix;
  let mg = avg + (cg - avg) * satMix;
  let mb = avg + (cb - avg) * satMix;

  // Keep perceived brightness inside a tasteful mid-bright rim band [0.36, 0.72]
  if (l < 0.36) {
    const lift = (0.36 - l) * 255;
    mr = Math.min(255, mr + lift);
    mg = Math.min(255, mg + lift);
    mb = Math.min(255, mb + lift);
  } else if (l > 0.72) {
    const scale = 0.72 / Math.max(0.01, l);
    mr *= scale;
    mg *= scale;
    mb *= scale;
  }

  return `rgb(${Math.round(Math.max(0, Math.min(255, mr)))}, ${Math.round(Math.max(0, Math.min(255, mg)))}, ${Math.round(Math.max(0, Math.min(255, mb)))})`;
}

export function extractSceneRimTint(img: HTMLImageElement | null | undefined): string | null {
  if (!img || typeof document === "undefined") return null;
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  if (w <= 0 || h <= 0) return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 0;
      if (a < 32) continue;
      rSum += data[i] ?? 0;
      gSum += data[i + 1] ?? 0;
      bSum += data[i + 2] ?? 0;
      count += 1;
    }
    if (count === 0) return null;
    return clampRimRgb(rSum / count, gSum / count, bSum / count);
  } catch {
    // Tainted cross-origin canvas or unsupported headless runtime
    return null;
  }
}
