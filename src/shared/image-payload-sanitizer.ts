/**
 * Image Payload Sanitizer
 * Technical safeguards against transport/gateway payload limits (e.g. HTTP 413 "Payload Too Large").
 * NOTE: This has ZERO prompt censorship or text filtering. It only ensures binary/base64
 * reference image data does not exceed provider transport thresholds (e.g. Nano-GPT 10 MB ceiling).
 */

export const MAX_SAFE_REFERENCE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
export const NANO_GPT_PAYLOAD_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB hard provider limit

/** Estimate raw byte length from base64 string. */
export function estimateBase64Bytes(base64: string): number {
  if (!base64) return 0;
  // Strip data URL scheme if present
  const comma = base64.indexOf(',');
  const clean = comma >= 0 ? base64.slice(comma + 1) : base64;
  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

/** Check whether a model route is strictly text-to-image and cannot accept input images. */
export function isStrictTextToImageModel(provider: string | null | undefined, model: string | null | undefined): boolean {
  if (!model) return false;
  const norm = model.toLowerCase();
  if (norm.includes('text-to-image') || norm.includes('txt2img')) {
    // If it's explicitly text-to-image (like blackforestlabs/flux-3/klein/base/text-to-image), it must not receive image payloads.
    return true;
  }
  return false;
}

/**
 * Remove any dangling reference/source image fields from parameters when targeting
 * a pure text-to-image route (prevents Nano-GPT from interpreting them as input images).
 */
export function stripDanglingImageReferences<T extends Record<string, unknown>>(parameters: T): T {
  const result: Record<string, unknown> = { ...parameters };
  const keysToRemove = [
    'resolvedReferenceImages',
    'resolvedSourceImages',
    'referenceImages',
    'input_image',
    'image',
    'source_image',
    'init_image'
  ];
  for (const key of keysToRemove) {
    if (key in result) {
      delete result[key];
    }
  }
  return result as T;
}

export function isPositiveOnlyModel(model?: string | null): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.includes('ideogram') ||
    lower.includes('flux-3/klein') ||
    lower.includes('flux-3-klein') ||
    lower.includes('nano-banana') ||
    lower.includes('recraft');
}

/**
 * Sanitize outgoing parameters before network dispatch.
 * 1. For strict text-to-image endpoints, strips lingering reference images so providers don't 413.
 * 2. For single-branch / positive-only models, purges negative prompt parameters so providers don't reject or misguide.
 * 3. For image-capable endpoints, validates that total reference payload does not exceed the provider limit.
 */
export function sanitizeImagePayloadParameters<T extends Record<string, unknown>>(
  parameters: T,
  provider: string | null | undefined,
  model: string | null | undefined
): T {
  if (!parameters || typeof parameters !== 'object') return parameters;

  let result = { ...parameters } as T;

  // 1. Purge negative prompt fields on positive-only models (Ideogram, FLUX.3 Klein, etc.)
  if (isPositiveOnlyModel(model)) {
    delete (result as any).negativePrompt;
    delete (result as any).negative_prompt;
    delete (result as any).negative;
    delete (result as any).uc;
  }

  // 2. If provider is NanoGPT (or similar gateway) and model is strictly text-to-image, purge image fields.
  if (provider?.toLowerCase() === 'nanogpt' && isStrictTextToImageModel(provider, model)) {
    result = stripDanglingImageReferences(result);
  }

  // 3. Otherwise, check reference image sizes
  let totalBytes = 0;
  const references = (result.resolvedReferenceImages ?? result.resolvedSourceImages ?? result.referenceImages) as unknown;

  if (Array.isArray(references)) {
    for (const ref of references) {
      if (typeof ref === 'string') {
        totalBytes += estimateBase64Bytes(ref);
      } else if (ref && typeof ref === 'object' && 'data' in ref && typeof (ref as any).data === 'string') {
        totalBytes += estimateBase64Bytes((ref as any).data);
      }
    }
  }

  // If payload exceeds the hard 10MB NanoGPT ceiling, strip and warn to prevent billing on 413
  if (provider?.toLowerCase() === 'nanogpt' && totalBytes >= NANO_GPT_PAYLOAD_LIMIT_BYTES) {
    return stripDanglingImageReferences(result);
  }

  return result;
}

export type CompressDataUrlFn = (dataUrl: string, maxBytes: number) => Promise<string>;

export interface BudgetedReferenceCandidate {
  dataUrl?: string | undefined;
  priority: number; // lower = higher priority (1 primary, 2 secondary/clothing, 3 location/extra)
}

/**
 * Compress any oversized reference image down below `maxPerRefBytes` (1.5 MB) when a
 * compressor is provided, and trim lowest-priority candidates cleanly so cumulative
 * payload bytes stay below `maxTotalBytes` (10 MB Nano-GPT ceiling).
 */
export async function enforceReferencePayloadBudget<T extends BudgetedReferenceCandidate>(
  candidates: readonly T[],
  compress?: CompressDataUrlFn,
  maxPerRefBytes = MAX_SAFE_REFERENCE_BYTES,
  maxTotalBytes = NANO_GPT_PAYLOAD_LIMIT_BYTES,
): Promise<Array<T & { byteSize: number }>> {
  const prepared: Array<T & { byteSize: number }> = [];
  for (const item of candidates) {
    let dataUrl = item.dataUrl;
    if (!dataUrl) continue;
    let bytes = estimateBase64Bytes(dataUrl);
    if (bytes > maxPerRefBytes && compress) {
      try {
        const compressed = await compress(dataUrl, maxPerRefBytes);
        const compressedBytes = estimateBase64Bytes(compressed);
        if (compressedBytes > 0 && compressedBytes < bytes) {
          dataUrl = compressed;
          bytes = compressedBytes;
        }
      } catch {
        // Keep original measurement and let per-ref guard decide below.
      }
    }
    if (bytes > maxPerRefBytes) continue;
    prepared.push({ ...item, dataUrl, byteSize: bytes });
  }

  const ordered = [...prepared].sort((a, b) => a.priority - b.priority);
  const accepted: Array<T & { byteSize: number }> = [];
  let runningBytes = 0;
  for (const item of ordered) {
    if (runningBytes + item.byteSize >= maxTotalBytes) continue;
    runningBytes += item.byteSize;
    accepted.push(item);
  }
  return accepted;
}
