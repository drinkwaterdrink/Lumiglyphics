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

/**
 * Sanitize outgoing parameters before network dispatch.
 * 1. For strict text-to-image endpoints, strips lingering reference images so providers don't 413.
 * 2. For image-capable endpoints, validates that total reference payload does not exceed the provider limit.
 */
export function sanitizeImagePayloadParameters<T extends Record<string, unknown>>(
  parameters: T,
  provider: string | null | undefined,
  model: string | null | undefined
): T {
  if (!parameters || typeof parameters !== 'object') return parameters;

  // 1. If provider is NanoGPT (or similar gateway) and model is strictly text-to-image, purge image fields.
  if (provider?.toLowerCase() === 'nanogpt' && isStrictTextToImageModel(provider, model)) {
    return stripDanglingImageReferences(parameters);
  }

  // 2. Otherwise, check reference image sizes
  let totalBytes = 0;
  const references = (parameters.resolvedReferenceImages ?? parameters.resolvedSourceImages ?? parameters.referenceImages) as unknown;

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
    return stripDanglingImageReferences(parameters);
  }

  return parameters;
}
