import { z } from 'zod';
import type { VisualNovelConfig } from '../config.js';

export const StyleLightingOverlaySchema = z.object({
  type: z.string().min(1).max(200),
  intentional: z.boolean()
}).strict();
export type StyleLightingOverlay = z.infer<typeof StyleLightingOverlaySchema>;

export const StyleDNASchema = z.object({
  medium: z.string().max(10000).optional(),
  prefix: z.string().max(10000).optional(),
  suffix: z.string().max(10000).optional(),
  negative: z.string().max(10000).optional(),
  rendering: z.array(z.string().max(2000)).max(32).optional(),
  linework: z.array(z.string().max(2000)).max(32).optional(),
  shading: z.array(z.string().max(2000)).max(32).optional(),
  texture: z.array(z.string().max(2000)).max(32).optional(),
  palette: z.array(z.string().max(2000)).max(32).optional(),
  realism: z.array(z.string().max(2000)).max(32).optional(),
  surface: z.array(z.string().max(2000)).max(32).optional(),
  atmosphere: z.array(z.string().max(2000)).max(32).optional(),
  cameraHints: z.array(z.string().max(2000)).max(32).optional(),
  lightingOverlay: StyleLightingOverlaySchema.optional(),
  preserve: z.array(z.string().max(2000)).max(32).optional(),
  avoidIntent: z.array(z.string().max(2000)).max(32).optional()
}).strict();
export type StyleDNA = z.infer<typeof StyleDNASchema>;

export function cleanStyleAffix(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^[,;:\s]+/, '')
    .replace(/[,;:\s]+$/, '')
    .trim();
}

export function inferPhotographicStyleTraits(prefix: string, suffix: string): Partial<StyleDNA> {
  const combined = `${prefix} ${suffix}`.trim();
  if (!combined) return {};

  const cameraHints: string[] = [];
  if (/\b(?:24mm|26mm|28mm|wide-angle|wide angle|smartphone lens|phone-wide|iphone|cellphone|camera roll)\b/i.test(combined)) {
    cameraHints.push('phone-wide perspective');
  }
  if (/\b(?:deep depth of field|deep focus|background remains in focus|everything in focus|without cinematic lens blur|no bokeh)\b/i.test(combined)) {
    cameraHints.push('deep focus');
  }
  if (/\b(?:eye-level|eye level)\b/i.test(combined)) {
    cameraHints.push('eye-level');
  }
  if (/\b(?:tilted horizon|off-center|candid|handheld|unposed|snapshot)\b/i.test(combined)) {
    cameraHints.push('candid handheld framing');
  }

  return cameraHints.length > 0 ? { cameraHints } : {};
}

export function isPhotorealOrCandidStyle(styleDNA?: StyleDNA): boolean {
  if (!styleDNA) return false;
  if (styleDNA.realism && styleDNA.realism.length > 0) return true;
  const text = [styleDNA.medium, styleDNA.prefix, styleDNA.suffix].filter(Boolean).join(' ');
  return /\b(?:photo|photograph|photoreal\w*|iphone|smartphone|cellphone|camera roll|snapshot|candid|35mm|dslr|documentary|unretouched)\b/i.test(text);
}

export function createEmptyStyleDNA(partial?: Partial<StyleDNA>): StyleDNA {
  return StyleDNASchema.parse({
    ...partial
  });
}

export function parseStyleDNA(value: unknown): StyleDNA | undefined {
  const parsed = StyleDNASchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export const BUILTIN_STYLE_DNA: Readonly<Record<string, StyleDNA>> = Object.freeze({
  'builtin-style:neutral': {
    preserve: ['scene-defined lighting', 'scene-defined palette', 'scene-defined environment']
  },
  'builtin-style:anime': {
    medium: '2D anime illustration',
    rendering: ['consistent facial construction', 'painted background detail'],
    linework: ['precise tapered ink contours'],
    shading: ['flat cel-shaded color regions'],
    palette: ['scene-defined color palette and shadows'],
    preserve: ['scene-defined lighting and palette', 'subject identity and proportions'],
    avoidIntent: ['3D CGI surfaces', 'glossy plastic shading', 'inconsistent linework']
  },
  'builtin-style:hunter-hand-drawn': {
    medium: 'hand-drawn adventure anime illustration',
    rendering: ['angular expressive faces', 'subtly textured painted scenery'],
    linework: ['lively tapered pencil-and-ink contours'],
    shading: ['economical cel shading'],
    preserve: ['subject identity, clothing and proportions', 'scene-defined mood and colors'],
    avoidIntent: ['3D CGI', 'glossy plastic shading']
  },
  'builtin-style:retro-cel': {
    medium: 'traditional hand-painted anime cel illustration',
    rendering: ['painted background texture', 'subtle analog softness at color boundaries'],
    linework: ['confident opaque ink outlines'],
    shading: ['limited layers of opaque cel shading'],
    texture: ['subtle analog film grain'],
    palette: ['restrained analog color palette'],
    preserve: ['scene lighting and atmosphere'],
    avoidIntent: ['glossy digital gradients', 'heavy blur', '3D CGI']
  },
  'builtin-style:ink-manga': {
    medium: 'black-and-white manga ink illustration',
    rendering: ['deliberate black shapes', 'fine hatching', 'selective screentone'],
    linework: ['varied pen weight and expressive ink lines'],
    palette: ['monochrome high-contrast black ink and white paper negative space'],
    preserve: ['readable expressions and object details'],
    avoidIntent: ['muddy grayscale', 'inconsistent ink weight', 'color']
  },
  'builtin-style:photoreal': {
    medium: 'lifelike natural photograph',
    realism: ['natural skin texture and fine asymmetries', 'realistic material texture and surface wear'],
    surface: ['believable microtexture without artificial smoothing'],
    cameraHints: ['natural photographic perspective', 'plausible optical depth'],
    preserve: ['available scene lighting', 'plausible exposure and restrained color processing'],
    avoidIntent: ['illustration', '3D CGI', 'waxy skin', 'beauty filter retouching', 'artificial edge halos']
  },
  'builtin-style:phone-candid': {
    medium: 'casual cellphone snapshot',
    cameraHints: ['phone-wide perspective', 'slightly imperfect handheld framing', 'deep focus'],
    texture: ['mild shadow sensor noise', 'subtle JPEG compression'],
    realism: ['natural skin and material texture', 'modest dynamic range'],
    preserve: ['available ambient scene lighting', 'natural unposed moments'],
    avoidIntent: ['studio glamour lighting', 'exaggerated cinematic bokeh', 'beauty filters', 'plastic skin']
  },
  'builtin-style:phone-flash': {
    medium: 'casual cellphone photograph with direct on-camera flash',
    cameraHints: ['phone-wide perspective', 'candid handheld framing', 'deep focus'],
    lightingOverlay: {
      type: 'harsh direct camera flash with close falloff and specular highlights',
      intentional: true
    },
    texture: ['modest sensor noise', 'subtle compression'],
    realism: ['believable skin and material textures', 'restrained sharpening'],
    preserve: ['ambient scene detail in background where exposure permits'],
    avoidIntent: ['fashion editorial retouching', 'plastic skin', 'exaggerated lens flare']
  },
  'builtin-style:documentary': {
    medium: 'observational documentary photograph',
    cameraHints: ['believable witness viewpoint', 'purposeful unposed framing', 'moderate depth of field'],
    realism: ['authentic surface detail', 'natural human posture and expressions'],
    preserve: ['scene actual light', 'subject established appearance', 'legible setting'],
    avoidIntent: ['glamour retouching', 'artificial posing', 'excessively blurred surroundings']
  },
  'builtin-style:film': {
    medium: 'natural 35mm film color photograph',
    texture: ['fine organic film grain', 'subtle optical softness'],
    palette: ['gentle highlight rolloff', 'restrained analog color separation'],
    cameraHints: ['plausible photographic perspective and focal length'],
    preserve: ['scene lighting, time of day and mood'],
    avoidIntent: ['heavy grain obscuring detail', 'exaggerated light leaks', 'waxy textures']
  },
  'builtin-style:watercolor': {
    medium: 'hand-painted watercolor on textured paper',
    rendering: ['transparent layered washes', 'subtle pigment pooling', 'softly broken edges'],
    linework: ['fine pencil or ink accents around important details'],
    texture: ['tactile cold-press paper grain with intentional untouched negative space'],
    preserve: ['scene light and color harmony'],
    avoidIntent: ['glossy 3D rendering', 'muddy washes', 'illegible subject shapes']
  },
  'builtin-style:painterly': {
    medium: 'narrative gouache illustration',
    rendering: ['opaque layered pigment', 'controlled brushwork', 'simplified value shapes'],
    shading: ['planar light and shadow blocking'],
    preserve: ['scene established mood, clothing and objects', 'scene lighting organizing depth'],
    avoidIntent: ['plastic CGI surfaces', 'uniform airbrush smoothing', 'muddy values']
  }
});

export const HISTORICAL_UNTOUCHED_ANIME_PREFIX = 'masterpiece, best quality, anime visual novel scene';

export interface ResolvedStyleDNASnapshot {
  styleDNA: StyleDNA;
  source: 'builtin' | 'migrated' | 'custom' | 'legacy-literal';
  isLegacyLiteral: boolean;
  lightingOverlay?: StyleLightingOverlay;
}

/**
 * Resolves semantic StyleDNA with backward-compatible legacy protection.
 * - Built-in styles receive full semantic StyleDNA.
 * - Untouched historical default prefix ("masterpiece, best quality, anime visual novel scene")
 *   is cleanly migrated to the semantic built-in anime style.
 * - Custom user styles/presets retain both their positive prefix, suffix, and negative prompt,
 *   while also inferring optical camera hints (such as 26mm smartphone wide lens or deep DOF)
 *   so the Shot Director never injects contradictory lens or bokeh instructions.
 */
export function resolveStyleDNA(
  config: VisualNovelConfig,
  selectedStyleId?: string | null
): ResolvedStyleDNASnapshot {
  const targetId = selectedStyleId ?? config.selectedSharedStyleId;

  // 1. Built-in styles
  if (targetId && Object.hasOwn(BUILTIN_STYLE_DNA, targetId)) {
    const dna = BUILTIN_STYLE_DNA[targetId]!;
    return {
      styleDNA: dna,
      source: 'builtin',
      isLegacyLiteral: false,
      ...(dna.lightingOverlay ? { lightingOverlay: dna.lightingOverlay } : {})
    };
  }

  // 1b. User custom preset from config.promptPresets
  if (targetId && config.promptPresets) {
    const customPreset = config.promptPresets.find(p => p.id === targetId);
    if (customPreset) {
      const cleanedPrefix = cleanStyleAffix(customPreset.positive);
      const cleanedSuffix = cleanStyleAffix(customPreset.suffix);
      const cleanedNegative = customPreset.negative?.trim() || '';
      const inferred = inferPhotographicStyleTraits(cleanedPrefix, cleanedSuffix);
      const legacyDNA: StyleDNA = {
        ...(cleanedPrefix ? { medium: cleanedPrefix, prefix: cleanedPrefix } : {}),
        ...(cleanedSuffix ? { suffix: cleanedSuffix } : {}),
        ...(cleanedNegative ? { negative: cleanedNegative } : {}),
        ...inferred,
        preserve: ['scene-defined lighting', 'custom literal preset wording']
      };
      return {
        styleDNA: legacyDNA,
        source: 'custom',
        isLegacyLiteral: true
      };
    }
  }

  // 2. Untouched historical default prefix migration
  const normalizedPrefix = config.promptPrefix?.trim() ?? '';
  if (
    normalizedPrefix === HISTORICAL_UNTOUCHED_ANIME_PREFIX &&
    (!config.promptSuffix || config.promptSuffix.trim() === '')
  ) {
    const animeDNA = BUILTIN_STYLE_DNA['builtin-style:anime']!;
    return {
      styleDNA: animeDNA,
      source: 'migrated',
      isLegacyLiteral: false
    };
  }

  // 3. User custom preset or custom prefix/suffix: preserve as legacy-literal
  const cleanedPrefix = cleanStyleAffix(config.promptPrefix);
  const cleanedSuffix = cleanStyleAffix(config.promptSuffix);
  if (cleanedPrefix.length > 0 || cleanedSuffix.length > 0) {
    const inferred = inferPhotographicStyleTraits(cleanedPrefix, cleanedSuffix);
    const hasCustomCameraOrSuffix = cleanedSuffix.length > 0 || Boolean(inferred.cameraHints?.length);
    const legacyDNA: StyleDNA = {
      ...(cleanedPrefix ? { medium: cleanedPrefix, ...(hasCustomCameraOrSuffix ? { prefix: cleanedPrefix } : {}) } : {}),
      ...(cleanedSuffix ? { suffix: cleanedSuffix } : {}),
      ...inferred,
      preserve: ['scene-defined lighting', 'custom literal prefix/suffix wording']
    };
    return {
      styleDNA: legacyDNA,
      source: 'legacy-literal',
      isLegacyLiteral: true
    };
  }

  // 4. Default for clean installs without custom prefix
  const defaultAnime = BUILTIN_STYLE_DNA['builtin-style:anime']!;
  return {
    styleDNA: defaultAnime,
    source: 'builtin',
    isLegacyLiteral: false
  };
}
