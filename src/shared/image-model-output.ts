/** Verified NanoGPT model rules. Keep matching exact: other Flux/Anima routes
 * and other providers can have different request contracts. */
export const KLEIN_OUTPUT_SIZES = ['768x768', '1024x1024', '1536x1536', '2048x2048', '4096x4096'] as const;
export const ANIMA_OUTPUT_RATIOS = ['1:1', '1:2', '2:1', '1:3', '3:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:21', '21:9'] as const;
const ANIMA_MODELS = new Set(['anima', 'anima/text-to-image', 'anima/text-to-image-lora', 'wavespeed-ai/anima/text-to-image', 'wavespeed-ai/anima/text-to-image-lora']);

export function imageOutputRule(provider: string | null | undefined, model: string | null | undefined): 'anima' | 'klein-square' | null {
  if (provider?.trim().toLowerCase() !== 'nanogpt') return null;
  const id = model?.trim().toLowerCase() ?? '';
  if (ANIMA_MODELS.has(id)) return 'anima';
  return id === 'blackforestlabs/flux-3/klein/base/text-to-image' ? 'klein-square' : null;
}

/** Derived from the recorded request, so old/held previews keep their own size. */
export function modelOutputHelp(provider: string | undefined, model: string | undefined, parameters: Record<string, unknown>): string {
  const rule = imageOutputRule(provider, model);
  if (rule === 'klein-square') return `FLUX.3 Klein supports square images only; 9:16 is unavailable with this model. Visible size field: ${String(parameters.size ?? '1024x1024')}. Supported sizes: ${KLEIN_OUTPUT_SIZES.join(', ')}. A connection's custom raw override takes priority and may change these fields.`;
  if (rule === 'anima') return `Anima uses size "1k" or "1.5k" with a separate aspectRatio (9:16 is supported for text-to-image). Visible size field: ${String(parameters.size ?? '1k')}; framing: ${String(parameters.aspectRatio ?? 'connection default')}. With an image reference, Anima keeps the reference's aspect ratio. A connection's custom raw override takes priority and may change these fields.`;
  return '';
}
