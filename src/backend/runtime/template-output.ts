import type { ImageOutputRatio } from "../../shared/image-output.js";
import type { ImageTemplateSnapshot } from "../../shared/image-templates.js";
import { ANIMA_OUTPUT_RATIOS, imageOutputRule, KLEIN_OUTPUT_SIZES } from '../../shared/image-model-output.js';

function isAnima(provider: string | null, model: string | undefined): boolean {
  return imageOutputRule(provider, model) === 'anima';
}
/** Normalize known model constraints before preview. Never modify an approved request. */
export function modelOutputParameters(provider: string | null, model: string | undefined, parameters: Record<string, unknown>): Record<string, unknown> {
  const rule = imageOutputRule(provider, model);
  if (!rule || parameters.rawRequestOverride !== undefined) return { ...parameters };
  const result = { ...parameters };
  if (rule === 'klein-square') {
    if (!KLEIN_OUTPUT_SIZES.includes(result.size as typeof KLEIN_OUTPUT_SIZES[number])) result.size = '1024x1024';
    return result;
  }
  const pixels = typeof result.size === 'string' ? /^(\d+)x(\d+)$/.exec(result.size) : null;
  const ratio = result.aspect_ratio ?? result.aspectRatio ?? (pixels ? `${Number(pixels[1]) / gcd(Number(pixels[1]), Number(pixels[2]))}:${Number(pixels[2]) / gcd(Number(pixels[1]), Number(pixels[2]))}` : undefined);
  if (result.size !== '1k' && result.size !== '1.5k') result.size = '1k';
  if (ratio) {
    // Nonstandard pixel dimensions may reduce to an unsupported fraction.
    // Pick the closest published ratio before preview, never after approval.
    const [w, h] = String(ratio).split(':').map(Number);
    const supported = ANIMA_OUTPUT_RATIOS.includes(ratio as typeof ANIMA_OUTPUT_RATIOS[number]) ? ratio
      : Number.isFinite(w) && Number.isFinite(h) && w! > 0 && h! > 0 ? [...ANIMA_OUTPUT_RATIOS].sort((a, b) => {
        const distance = (value: string) => { const [x, y] = value.split(':').map(Number); return Math.abs(Math.log(x! / y!) - Math.log(w! / h!)); };
        return distance(a) - distance(b);
      })[0] : undefined;
    if (!supported) throw new Error('Anima aspectRatio must be a supported W:H ratio, for example "9:16".');
    result.aspectRatio = supported;
    delete result.aspect_ratio;
    result.rawRequestOverride = { aspect_ratio: supported };
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
  // Lumiverse's native applyRawOverride accepts JSON text. Internal generated
  // objects stay editable until this wire boundary; their values do not change.
  if (result.rawRequestOverride && typeof result.rawRequestOverride === 'object' && !Array.isArray(result.rawRequestOverride)) result.rawRequestOverride = JSON.stringify(result.rawRequestOverride);
  return result;
}
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a || 1; }
/** Manual edits get a local error instead of a silent adjustment or paid retry. */
export function assertModelOutputParameters(provider: string | null, model: string | undefined, parameters: Record<string, unknown>): void {
  const rule = imageOutputRule(provider, model);
  if (!rule) return;
  let raw = parameters.rawRequestOverride;
  if (typeof raw === 'string' && raw.trim()) {
    try { raw = JSON.parse(raw); }
    catch { throw new Error('The image connection raw request override must be valid JSON. Correct it in the connection, then prepare a new preview.'); }
  }
  const override = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  // The native adapter always sends size, then merges the raw object. There is
  // no verified precedence for a second resolution field at NanoGPT: validate
  // both rather than letting a valid alias mask an unsupported outgoing size.
  const size = override.size !== undefined ? override.size : parameters.size || '1024x1024';
  const resolutions = override.resolution === undefined ? [size] : [size, override.resolution];
  if (rule === 'klein-square') {
    if (resolutions.some(value => !KLEIN_OUTPUT_SIZES.includes(value as typeof KLEIN_OUTPUT_SIZES[number]))) throw new Error(`FLUX.3 Klein supports square images only (${KLEIN_OUTPUT_SIZES.join(', ')}). Set size to "1024x1024", or correct the connection's raw size/resolution fields, then prepare a new preview. This model cannot generate 9:16.`);
    return;
  }
  if (resolutions.some(value => value !== '1k' && value !== '1.5k')) throw new Error('Anima resolution must be 1k or 1.5k. In Parameters (JSON), set size to "1k" or "1.5k" (or correct the raw size/resolution fields in your connection), then prepare a new preview.');
  const aspect = override.aspect_ratio !== undefined ? override.aspect_ratio : parameters.aspect_ratio ?? parameters.aspectRatio;
  if (aspect !== undefined && !ANIMA_OUTPUT_RATIOS.includes(aspect as typeof ANIMA_OUTPUT_RATIOS[number])) throw new Error('Anima aspectRatio must be a supported ratio, for example "9:16". Correct the ratio and prepare a new preview.');
}

/** Shape defaults use the host adapter's fields, never an unrecognized API field.
 * Extension JSON and raw overrides remain authoritative. Profile shape is the
 * fallback when the template uses connection settings or the adapter is unknown. */
export function templateOutputParameters(template: ImageTemplateSnapshot | undefined, provider: string | null, explicit: Record<string, unknown>, profile: Record<string, unknown>, model?: string): Record<string, unknown> {
  const result = { ...profile, ...explicit };
  if (template?.outputAspectRatio !== "9:16") return result;
  const shapeKeys = ["size", "width", "height", "aspectRatio", "aspect_ratio", "imageGenerationConfig", "image_config", "rawRequestOverride"];
  if (shapeKeys.some(key => explicit[key] !== undefined)) return result;
  // A profile raw override can replace the entire adapter payload. Respect it.
  if (profile.rawRequestOverride !== undefined) return result;
  if (provider === "openrouter" || provider === "google") result.aspectRatio = "9:16";
  else if (provider === "nanogpt") {
    const rule = imageOutputRule(provider, model);
    if (rule === 'anima') {
      result.size = result.size === '1.5k' ? '1.5k' : '1k';
      result.aspectRatio = '9:16';
      delete result.aspect_ratio;
    } else if (rule === 'klein-square') {
      if (!KLEIN_OUTPUT_SIZES.includes(result.size as typeof KLEIN_OUTPUT_SIZES[number])) result.size = '1024x1024';
    } else result.size = "864x1536";
  }
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
    } else if (imageOutputRule(provider, model) === 'klein-square') {
      result.size = KLEIN_OUTPUT_SIZES.includes(parameters.size as typeof KLEIN_OUTPUT_SIZES[number]) ? parameters.size : '1024x1024';
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
