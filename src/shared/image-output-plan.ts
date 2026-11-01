import { z } from 'zod';
import {
  type ModelOutputCapabilities,
  chooseModelOutput
} from './model-output-capabilities.js';

export const ImageOutputPlanSchema = z.object({
  requestedRatio: z.string().max(32).optional(),
  actualRatio: z.string().max(32).optional(),
  size: z.string().max(64).optional(),
  orientation: z.enum(['square', 'portrait', 'landscape', 'unknown']),
  parameters: z.record(z.string(), z.unknown()),
  source: z.enum(['live', 'catalogue', 'connection', 'raw-override', 'default']),
  summary: z.string().max(1024),
  warnings: z.array(z.string().max(500))
}).strict();
export type ImageOutputPlan = z.infer<typeof ImageOutputPlanSchema>;

export interface ResolveImageOutputPlanOptions {
  capabilities?: ModelOutputCapabilities | undefined;
  parameters?: Record<string, unknown> | undefined;
  requestedRatio?: string | undefined;
  requestedSize?: string | undefined;
  resolutionPreference?: 'standard' | 'high' | 'ultra' | undefined;
  source?: 'live' | 'catalogue' | 'fallback' | undefined;
  modelId?: string | undefined;
}

function parseRatioNumbers(value: unknown): { width: number; height: number; value: number } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d+(?:\.\d+)?)[\:x*](\d+(?:\.\d+)?)$/.exec(value.trim());
  if (!match) return undefined;
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (w <= 0 || h <= 0 || !Number.isFinite(w) || !Number.isFinite(h)) return undefined;
  return { width: w, height: h, value: w / h };
}

export function computeOrientation(
  ratioOrSize: string | undefined
): 'square' | 'portrait' | 'landscape' | 'unknown' {
  if (!ratioOrSize) return 'unknown';
  const parsed = parseRatioNumbers(ratioOrSize);
  if (!parsed) {
    if (ratioOrSize === '1:1' || ratioOrSize === 'square') return 'square';
    if (ratioOrSize.includes('portrait')) return 'portrait';
    if (ratioOrSize.includes('landscape')) return 'landscape';
    return 'unknown';
  }
  const ratio = parsed.value;
  if (Math.abs(ratio - 1.0) < 0.05) return 'square';
  if (ratio > 1.05) return 'landscape';
  return 'portrait';
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function formatRatio(w: number, h: number): string {
  if (Number.isInteger(w) && Number.isInteger(h)) {
    const d = gcd(w, h);
    return `${w / d}:${h / d}`;
  }
  return `${w}:${h}`;
}

function formatRatioFromDimensions(dimensions: string): string | undefined {
  const parsed = parseRatioNumbers(dimensions);
  if (!parsed) return undefined;
  return formatRatio(parsed.width, parsed.height);
}

/**
 * Resolves the actual output geometry before shot composition and prompt compilation.
 * Route constraints (e.g. square-only FLUX.3 Klein) are enforced here with warnings.
 * Raw user overrides remain authoritative and are never modified.
 */
export function resolveImageOutputPlan(options: ResolveImageOutputPlanOptions): ImageOutputPlan {
  const {
    capabilities,
    parameters = {},
    requestedRatio: rawRequestedRatio,
    requestedSize,
    resolutionPreference,
    source = 'fallback',
    modelId = 'unknown'
  } = options;

  const warnings: string[] = [];

  // 1. Raw user overrides are authoritative
  if (parameters.rawRequestOverride !== undefined) {
    const rawOverride = parameters.rawRequestOverride;
    let overrideObj: Record<string, unknown> = {};
    if (typeof rawOverride === 'string') {
      try {
        overrideObj = JSON.parse(rawOverride) as Record<string, unknown>;
      } catch {
        // Leave empty if unparseable
      }
    } else if (rawOverride && typeof rawOverride === 'object') {
      overrideObj = rawOverride as Record<string, unknown>;
    }

    const rawAspect =
      (typeof overrideObj.aspect_ratio === 'string' ? overrideObj.aspect_ratio : undefined) ??
      (typeof overrideObj.aspectRatio === 'string' ? overrideObj.aspectRatio : undefined) ??
      (typeof parameters.aspectRatio === 'string' ? parameters.aspectRatio : undefined);

    const rawSize =
      (typeof overrideObj.size === 'string' ? overrideObj.size : undefined) ??
      (typeof parameters.size === 'string' ? parameters.size : undefined);

    const effectiveRatio = rawAspect ?? (rawSize ? formatRatioFromDimensions(rawSize) : undefined);
    const orientation = computeOrientation(effectiveRatio ?? rawSize);

    return ImageOutputPlanSchema.parse({
      requestedRatio: rawRequestedRatio !== 'default' ? rawRequestedRatio : undefined,
      actualRatio: effectiveRatio,
      size: rawSize,
      orientation,
      parameters: { ...parameters },
      source: 'raw-override',
      summary: 'Custom or model-specific raw output fields retained. Published values are checked before generation.',
      warnings: []
    });
  }

  const requestedRatio =
    rawRequestedRatio && rawRequestedRatio !== 'default' ? rawRequestedRatio : undefined;

  // 2. If capabilities are available, run chooseModelOutput
  if (capabilities) {
    const prepared = chooseModelOutput(capabilities, parameters, requestedRatio, resolutionPreference);
    const preparedParams = prepared.parameters;
    const size = typeof preparedParams.size === 'string' ? preparedParams.size : undefined;

    let actualRatio: string | undefined;
    if (typeof preparedParams.aspectRatio === 'string') {
      actualRatio = preparedParams.aspectRatio;
    } else if (size) {
      actualRatio = formatRatioFromDimensions(size);
    }

    // Check for route-constrained mismatch (e.g. FLUX.3 Klein only supporting square)
    if (requestedRatio && actualRatio) {
      const reqParsed = parseRatioNumbers(requestedRatio);
      const actParsed = parseRatioNumbers(actualRatio);
      if (reqParsed && actParsed && Math.abs(reqParsed.value - actParsed.value) > 0.05) {
        warnings.push(
          `Selected model/route (${modelId}) does not offer requested aspect ratio ${requestedRatio}; mapped to closest supported shape ${actualRatio}.`
        );
      }
    }

    const isKlein = modelId && (/flux[-_.]?3.*klein/i.test(modelId) || modelId.includes('klein'));
    if (isKlein && size && (size === '2048x2048' || size === '4096x4096')) {
      warnings.push(`FLUX.3 Klein at ${size} frequently exceeds provider worker memory or execution limits. 1024×1024 or 1536×1536 recommended.`);
    }

    const orientation = computeOrientation(actualRatio ?? size);
    const planSource = source === 'live' ? 'live' : source === 'catalogue' ? 'catalogue' : 'connection';

    return ImageOutputPlanSchema.parse({
      requestedRatio,
      actualRatio,
      size,
      orientation,
      parameters: preparedParams,
      source: planSource,
      summary: prepared.summary,
      warnings
    });
  }

  // 3. Fallback when no capabilities are published
  const fallbackSize = typeof parameters.size === 'string' ? parameters.size : '1024x1024';
  const fallbackRatio = requestedRatio ?? formatRatioFromDimensions(fallbackSize) ?? '1:1';
  const orientation = computeOrientation(fallbackRatio);

  return ImageOutputPlanSchema.parse({
    requestedRatio,
    actualRatio: fallbackRatio,
    size: fallbackSize,
    orientation,
    parameters: { ...parameters, size: fallbackSize },
    source: 'default',
    summary: `Default geometry (${fallbackRatio}, ${fallbackSize}); endpoint output capabilities unverified.`,
    warnings: requestedRatio ? [`Unverified output capabilities; requested ratio ${requestedRatio} set as default target.`] : []
  });
}
