import type { ImageOutputRatio } from "../../shared/image-output.js";
import type { ImageTemplateSnapshot } from "../../shared/image-templates.js";

const ANIMA_MODELS = new Set(['anima', 'wavespeed-ai/anima/text-to-image', 'wavespeed-ai/anima/text-to-image-lora']);
function isAnima(provider: string | null, model: string | undefined): boolean {
  return provider === 'nanogpt' && ANIMA_MODELS.has((model ?? '').toLowerCase());
}
/** Normalize known model constraints before preview. Never modify an approved request. */
export function modelOutputParameters(provider: string | null, model: string | undefined, parameters: Record<string, unknown>): Record<string, unknown> {
  if (!isAnima(provider, model) || parameters.rawRequestOverride !== undefined) return { ...parameters };
  const result = { ...parameters };
  const pixels = typeof result.size === 'string' ? /^(\d+)x(\d+)$/.exec(result.size) : null;
  const ratio = result.aspect_ratio ?? result.aspectRatio ?? (pixels ? `${Number(pixels[1]) / gcd(Number(pixels[1]), Number(pixels[2]))}:${Number(pixels[2]) / gcd(Number(pixels[1]), Number(pixels[2]))}` : undefined);
  if (result.size !== '1k' && result.size !== '1.5k') result.size = '1k';
  if (ratio) {
    result.aspectRatio = ratio;
    delete result.aspect_ratio;
    result.rawRequestOverride = { aspect_ratio: ratio };
    result._lumiglyphicsAnimaAspect = true;
  }
  return result;
}
/** The editor cannot alter raw overrides. Keep only our generated override in sync
 * with its visible ratio; profile/user overrides never receive this marker. */
export function syncGeneratedAnimaAspect(parameters: Record<string, unknown>): void {
  if (parameters._lumiglyphicsAnimaAspect === true) {
    parameters.rawRequestOverride = { aspect_ratio: parameters.aspectRatio };
  }
}
export function providerOutputParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  const result = { ...parameters };
  delete result._lumiglyphicsAnimaAspect;
  return result;
}
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a || 1; }
/** Manual edits get a local error instead of a silent adjustment or paid retry. */
export function assertModelOutputParameters(provider: string | null, model: string | undefined, parameters: Record<string, unknown>): void {
  if (!isAnima(provider, model)) return;
  const raw = parameters.rawRequestOverride;
  const override = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const resolution = override.resolution ?? override.size ?? parameters.size ?? '1024x1024';
  if (resolution !== '1k' && resolution !== '1.5k') throw new Error('Anima resolution must be 1k or 1.5k. In Parameters (JSON), set size to "1k" or "1.5k" (or correct your raw request override), then prepare a new preview.');
}

/** Shape defaults use the host adapter's fields, never an unrecognized API field.
 * Extension JSON and raw overrides remain authoritative. Profile shape is the
 * fallback when the template uses connection settings or the adapter is unknown. */
export function templateOutputParameters(template: ImageTemplateSnapshot | undefined, provider: string | null, explicit: Record<string, unknown>, profile: Record<string, unknown>): Record<string, unknown> {
  const result = { ...profile, ...explicit };
  if (template?.outputAspectRatio !== "9:16") return result;
  const shapeKeys = ["size", "width", "height", "aspectRatio", "aspect_ratio", "imageGenerationConfig", "image_config", "rawRequestOverride"];
  if (shapeKeys.some(key => explicit[key] !== undefined)) return result;
  // A profile raw override can replace the entire adapter payload. Respect it.
  if (profile.rawRequestOverride !== undefined) return result;
  if (provider === "openrouter" || provider === "google") result.aspectRatio = "9:16";
  else if (provider === "nanogpt") result.size = "864x1536";
  return result;
}

/** Fixed output shape applies after template/profile merging and before review.
 * Raw payloads/workflows cannot be safely inferred; fail locally rather than ignore a fixed shape. */
export function globalOutputParameters(ratio: ImageOutputRatio, provider: string | null, model: string | undefined, parameters: Record<string, unknown>): Record<string, unknown> {
  if (ratio === "default") return { ...parameters };
  if (parameters.rawRequestOverride !== undefined) throw new Error('Fixed generated image shape conflicts with a raw request override. Remove the raw override or select Template / connection default.');
  const result = { ...parameters };
  for (const key of ['size', 'width', 'height', 'resolution', 'aspectRatio', 'aspect_ratio', 'image_config', 'imageGenerationConfig']) delete result[key];
  const [w, h] = ratio.split(':').map(Number) as [number, number];
  if (provider === 'openrouter') result.aspectRatio = ratio;
  else if (provider === 'nanogpt') {
    if (isAnima(provider, model)) {
      result.size = parameters.size === '1.5k' ? '1.5k' : '1k';
      result.aspectRatio = ratio;
    } else {
      const unit = ratio === '1:1' ? 1024 : ratio === '9:16' || ratio === '16:9' ? 96 : 256;
      result.size = `${w * unit}x${h * unit}`;
    }
  } else if (provider === 'novelai') {
    const unit = ratio === '1:1' ? 1024 : ratio === '9:16' || ratio === '16:9' ? 64 : 256;
    result.resolution = `${w * unit}x${h * unit}`;
  } else throw new Error('Fixed generated image shape is not supported by this connection/workflow. Set dimensions in the workflow and select Template / connection default.');
  return result;
}
