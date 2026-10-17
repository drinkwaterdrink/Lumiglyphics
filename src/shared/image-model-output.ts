/** Verified NanoGPT model rules. Keep matching exact: other Flux/Anima routes
 * and other providers can have different request contracts. */
export const KLEIN_OUTPUT_SIZES = ['768x768', '1024x1024', '1536x1536', '2048x2048', '4096x4096'] as const;
export const ANIMA_OUTPUT_RATIOS = ['1:1', '1:2', '2:1', '1:3', '3:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:21', '21:9'] as const;
/** NanoGPT public model catalog, verified 2026-10-17. */
export const QWEN_TURBO_OUTPUT_RATIOS = ['1:1','3:2','16:9','21:9','9:16','2:3','3:4','4:5'] as const;
const ANIMA_MODELS = new Set(['anima', 'anima/text-to-image', 'anima/text-to-image-lora', 'wavespeed-ai/anima/text-to-image', 'wavespeed-ai/anima/text-to-image-lora']);

export function imageOutputRule(provider: string | null | undefined, model: string | null | undefined): 'anima' | 'klein-square' | 'qwen-turbo' | null {
  if (provider?.trim().toLowerCase() !== 'nanogpt') return null;
  const id = model?.trim().toLowerCase() ?? '';
  if (ANIMA_MODELS.has(id)) return 'anima';
  if (id === 'qwen-image-2.1-turbo') return 'qwen-turbo';
  return id === 'blackforestlabs/flux-3/klein/base/text-to-image' ? 'klein-square' : null;
}

/** Derived from the recorded request, so old/held previews keep their own size. */
export function modelOutputHelp(provider: string | undefined, model: string | undefined, parameters: Record<string, unknown>): string {
  const rule = imageOutputRule(provider, model);
  if (rule === 'qwen-turbo') return `Qwen Image 2.1 Turbo uses size "1k" or "2k" and separate framing (${String(parameters.aspectRatio ?? '1:1')}). 9:16 is supported. Other requested shapes use the closest supported ratio before review. The prepared resolution is ${String(parameters.size ?? '1k')}. Custom connection raw overrides take priority; prepare a new preview after changing connection settings.`;
  if (rule === 'klein-square') return `FLUX.3 Klein supports square images only; 9:16 is unavailable with this model. Visible size field: ${String(parameters.size ?? '1024x1024')}. Supported sizes: ${KLEIN_OUTPUT_SIZES.join(', ')}. A connection's custom raw override takes priority and may change these fields.`;
  if (rule === 'anima') return `Anima uses size "1k" or "1.5k" with a separate aspectRatio (9:16 is supported for text-to-image). Visible size field: ${String(parameters.size ?? '1k')}; framing: ${String(parameters.aspectRatio ?? 'connection default')}. With an image reference, Anima keeps the reference's aspect ratio. A connection's custom raw override takes priority and may change these fields.`;
  return '';
}
