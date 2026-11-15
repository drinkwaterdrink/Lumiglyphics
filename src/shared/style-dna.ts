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
  },
  'builtin-style:fullmetal-alchemy': {
    medium: 'high-budget 2000s Japanese studio cel anime frame',
    rendering: ['expressive angular anime faces with crisp dual eye highlights', 'gouache-painted European stonework and brass backgrounds'],
    linework: ['decisive tapered dark sepia ink contours', 'clean architectural perspective lines'],
    shading: ['crisp two-tone studio cel shading', 'deep umber cast shadows', 'warm amber key-light edge highlights'],
    palette: ['slate steel', 'burnt amber gold', 'crimson accent', 'charcoal masonry'],
    atmosphere: ['atmospheric industrial steam', 'dramatic alchemical rim contrast'],
    preserve: ['subject identity, uniform or outfit details and dramatic pose', 'scene lighting direction'],
    avoidIntent: ['3D CGI', 'glossy plastic anime skin', 'chibi proportions', 'watercolor bleed', 'flat sterile vector fill']
  },
  'builtin-style:ghibli-pastoral': {
    medium: 'theatrical hand-painted anime cel with storybook gouache scenery',
    rendering: ['luminous hand-painted foliage and cumulus skies', 'gentle analog cel warmth'],
    linework: ['fine warm-brown ink contours'],
    shading: ['soft organic cel shading', 'sunlit bounce illumination'],
    palette: ['sunlit sage green', 'cerulean sky', 'warm cream highlights'],
    atmosphere: ['breathable pastoral air and nostalgic warmth'],
    preserve: ['subject identity and clothing', 'open sky and nature atmosphere'],
    avoidIntent: ['neon cyberpunk bloom', 'heavy black comics ink', 'harsh plastic 3D shading']
  },
  'builtin-style:dark-academia-oil': {
    medium: 'classical chiaroscuro oil painting on linen canvas',
    rendering: ['sculptural oil impasto focal highlights', 'restrained old-master glazing'],
    shading: ['dramatic candlelit chiaroscuro lighting'],
    texture: ['woven linen canvas weave', 'antique mahogany and parchment patina'],
    palette: ['deep burnt umber', 'warm ochre candlelight', 'tarnished brass', 'slate shadow'],
    preserve: ['subject likeness, period fabrics and prop craftsmanship'],
    avoidIntent: ['flat digital airbrushing', 'neon oversaturation', 'anime outlines', 'smooth CGI plastic']
  },
  'builtin-style:ukiyo-neo-ink': {
    medium: 'neo-ukiyo-e carved woodblock print and sumi ink illustration',
    rendering: ['flat mineral pigment planes', 'subtle bokashi tonal ink gradations'],
    linework: ['bold calligraphic woodcut keyblock outlines'],
    texture: ['handmade kozo and washi paper grain'],
    palette: ['Prussian indigo', 'vermilion seal red', 'warm ochre', 'charcoal ink'],
    preserve: ['crisp character silhouettes and scenic layering'],
    avoidIntent: ['photorealistic 3D rendering', 'glossy airbrush gradients', 'photographic bokeh']
  },
  'builtin-style:cinematic-anamorphic': {
    medium: '35mm anamorphic theatrical film still',
    cameraHints: ['widescreen anamorphic depth of field', 'subtle oval background bokeh'],
    realism: ['unretouched photographic optics', 'natural skin texture and worn fabric weaves'],
    rendering: ['organic photochemical film look', 'gentle halation around practical lights'],
    texture: ['fine 35mm film grain'],
    palette: ['tungsten practical warmth against cool twilight shadows'],
    preserve: ['real-world set materiality and subject likeness'],
    avoidIntent: ['glossy beauty retouching', 'plastic poreless skin', 'CGI sheen', 'flat smartphone HDR']
  },
  'builtin-style:noir-chiaroscuro': {
    medium: 'silver-gelatin black-and-white film noir still',
    cameraHints: ['low-angle geometric noir framing', 'deep contrast shadow blocking'],
    realism: ['authentic silver-halide photographic grain', 'unretouched tonal realism'],
    rendering: ['hard Venetian-blind key light', 'wet-surface specular highlights'],
    texture: ['medium silver-halide film grain', 'drifting smoke diffusion'],
    palette: ['monochrome silver gelatin', 'ink-deep black', 'luminous chalk highlight'],
    preserve: ['silhouette clarity and dramatic light beams'],
    avoidIntent: ['color tinting', 'flat low-contrast gray wash', 'cartoon outlines', 'CGI plasticity']
  }
});

export const HISTORICAL_UNTOUCHED_ANIME_PREFIX = 'masterpiece, best quality, anime visual novel scene';

const BUILTIN_STYLE_DEFAULT_AFFIXES: Readonly<Record<string, { positive: string; suffix: string }>> = {
  'builtin-style:neutral': { positive: '', suffix: '' },
  'builtin-style:anime': {
    positive: 'A polished 2D anime illustration.',
    suffix: 'Precise ink contours, flat cel-shaded color regions, expressive but consistent facial construction, and carefully painted background details. Let the scene\'s lighting determine the palette and shadows.'
  },
  'builtin-style:hunter-hand-drawn': {
    positive: 'A Hunter x Hunter-inspired hand-drawn adventure anime illustration.',
    suffix: 'Lively tapered pencil-and-ink contours, angular expressive faces, economical cel shading, and subtly textured painted scenery. Preserve the supplied subject\'s own identity, clothing and proportions. Let the scene determine the mood and colors.'
  },
  'builtin-style:retro-cel': {
    positive: 'A traditional hand-painted anime cel illustration.',
    suffix: 'Confident ink outlines, limited layers of opaque cel shading, painted background texture, restrained colors, subtle analog grain and gentle softness at color boundaries. Keep the important details legible.'
  },
  'builtin-style:ink-manga': {
    positive: 'A black-and-white manga ink illustration.',
    suffix: 'Varied pen weight, clean silhouettes, deliberate black shapes, fine hatching and selective screentone. Use white paper as negative space and retain readable expressions and object details. Follow the template\'s panel and lettering instructions.'
  },
  'builtin-style:photoreal': {
    positive: 'A lifelike natural photograph.',
    suffix: 'Believable optics and perspective; realistic material texture, surface wear and fine detail. For visible people, preserve natural skin texture, small asymmetries and the supplied appearance. Follow the existing scene light, with plausible exposure and restrained color processing.'
  },
  'builtin-style:phone-candid': {
    positive: 'An unposed candid snapshot taken with a cellphone camera.',
    suffix: 'Casual slightly imperfect framing, ordinary phone-wide perspective and mostly deep focus. Natural scene lighting, modest dynamic range, mild shadow noise, subtle JPEG compression and slight exposure or white-balance variation. Preserve real textures; keep the main subject recognizable and important details readable. Let motion softness occur only where movement warrants it.'
  },
  'builtin-style:phone-flash': {
    positive: 'A casual handheld cellphone photograph with direct on-camera flash.',
    suffix: 'Close flash falloff, small specular highlights, candid framing and phone-wide perspective. Ambient scene detail remains visible where exposure permits. Modest sensor noise and compression, believable skin and material textures, and restrained sharpening.'
  },
  'builtin-style:documentary': {
    positive: 'An observational documentary photograph.',
    suffix: 'A believable witness viewpoint, purposeful but unposed framing, authentic surface detail and restrained color correction. Keep the setting legible with moderate depth of field; preserve the scene\'s actual light and the subject\'s established appearance.'
  },
  'builtin-style:film': {
    positive: 'A natural color photograph captured on 35 mm film.',
    suffix: 'Fine organic grain, gentle highlight rolloff, restrained color separation and subtle optical softness. Plausible photographic perspective and natural textures. Preserve the scene\'s lighting, time and mood rather than imposing a new color cast.'
  },
  'builtin-style:watercolor': {
    positive: 'A hand-painted watercolor illustration on textured paper.',
    suffix: 'Transparent layered washes, subtle pigment pooling, softly broken edges and fine pencil or ink accents around important details. Use the scene\'s colors and light, leaving intentional areas of untouched paper. Retain recognizable subject and object shapes.'
  },
  'builtin-style:painterly': {
    positive: 'A hand-painted narrative illustration in gouache.',
    suffix: 'Opaque layered pigment, visible but controlled brushwork, simplified value shapes and carefully rendered focal details. Keep the scene\'s established mood, clothing and objects; use its lighting to organize depth and color.'
  },
  'builtin-style:fullmetal-alchemy': {
    positive: 'A Fullmetal Alchemist-inspired high-budget 2000s Japanese studio anime frame with crisp dark sepia ink linework and sculpted cel shading.',
    suffix: 'Expressive angular anime anatomy and fierce readable eyes with crisp dual highlights; clean tapered dark-umber outlines, strong two-tone cast shadows, rich gouache-painted European stonework, ironwork and brass backdrops with atmospheric steam, and warm amber-gold versus steel-slate contrast.'
  },
  'builtin-style:ghibli-pastoral': {
    positive: 'A nostalgic hand-painted theatrical anime frame uniting expressive cel characters with luminous watercolor-gouache scenery.',
    suffix: 'Warm dappled sunlight, painterly cumulus clouds and botanical brushwork in the environment, fine dark-brown ink contours and soft organic bounced shadow on figures, gentle analog warmth and breathable open sky composition.'
  },
  'builtin-style:dark-academia-oil': {
    positive: 'A classic chiaroscuro oil painting on woven linen canvas with luminous focal impasto and deep umber shadows.',
    suffix: 'Controlled visible oil brushwork carving planes of light across faces, wool, parchment and tarnished brass; warm candlelight against cool shadowed stone, subtle crackle patina and rich tonal depth without muddy blacks.'
  },
  'builtin-style:ukiyo-neo-ink': {
    positive: 'A refined neo-ukiyo-e woodblock print combining bold calligraphic sumi keylines with flat mineral-pigment tonal planes.',
    suffix: 'Authentic carved block registration, subtle vertical bokashi color fades on handmade kozo paper texture, disciplined indigo, vermilion and warm ochre color harmony, clean silhouette choreography and rhythmic negative space.'
  },
  'builtin-style:cinematic-anamorphic': {
    positive: 'An unretouched 35mm theatrical anamorphic film still with grounded practical lighting and organic optical depth.',
    suffix: 'Balanced tungsten-and-twilight color separation, gentle amber halation around practical light sources, subtle oval background bokeh, fine photochemical grain, tactile fabric and natural unvarnished skin texture. Preserve scene staging and continuity.'
  },
  'builtin-style:noir-chiaroscuro': {
    positive: 'A classic black-and-white silver-gelatin film noir still sculpted by stark directional key light and ink-deep shadow.',
    suffix: 'Hard architectural shadow geometry, gleaming wet-pavement or glass specular highlights, curling haze catching beams of light, authentic medium silver-halide film grain and legible silhouette readability across foreground and midground.'
  }
};

export interface ResolvedStyleDNASnapshot {
  styleDNA: StyleDNA;
  source: 'builtin' | 'migrated' | 'custom' | 'legacy-literal';
  isLegacyLiteral: boolean;
  lightingOverlay?: StyleLightingOverlay;
}

/**
 * Resolves semantic StyleDNA with backward-compatible legacy protection.
 * - Built-in styles receive full semantic StyleDNA (and preserve any custom prefix/suffix edits).
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
    const explicitOverride = selectedStyleId !== undefined && selectedStyleId !== null && selectedStyleId !== config.selectedSharedStyleId;
    const defaults = BUILTIN_STYLE_DEFAULT_AFFIXES[targetId];
    const cleanedPrefix = cleanStyleAffix(config.promptPrefix);
    const cleanedSuffix = cleanStyleAffix(config.promptSuffix);
    const isCustomizedPrefix = !explicitOverride
      && cleanedPrefix.length > 0
      && cleanedPrefix !== HISTORICAL_UNTOUCHED_ANIME_PREFIX
      && cleanedPrefix !== cleanStyleAffix(defaults?.positive);
    const isCustomizedSuffix = !explicitOverride
      && cleanedSuffix.length > 0
      && cleanedSuffix !== cleanStyleAffix(defaults?.suffix);
    if (isCustomizedPrefix || isCustomizedSuffix) {
      const inferred = inferPhotographicStyleTraits(
        isCustomizedPrefix ? cleanedPrefix : '',
        isCustomizedSuffix ? cleanedSuffix : ''
      );
      const mergedDNA: StyleDNA = {
        ...dna,
        ...(isCustomizedPrefix ? { prefix: cleanedPrefix, ...(dna.medium ? {} : { medium: cleanedPrefix }) } : {}),
        ...(isCustomizedSuffix ? { suffix: cleanedSuffix } : {}),
        ...(inferred.cameraHints ? { cameraHints: [...new Set([...(dna.cameraHints ?? []), ...inferred.cameraHints])] } : {})
      };
      return {
        styleDNA: mergedDNA,
        source: 'builtin',
        isLegacyLiteral: false,
        ...(mergedDNA.lightingOverlay ? { lightingOverlay: mergedDNA.lightingOverlay } : {})
      };
    }
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
  const cleanedNegative = config.negativePrompt?.trim() ?? '';
  if (cleanedPrefix.length > 0 || cleanedSuffix.length > 0) {
    const inferred = inferPhotographicStyleTraits(cleanedPrefix, cleanedSuffix);
    const legacyDNA: StyleDNA = {
      ...(cleanedPrefix ? { medium: cleanedPrefix, prefix: cleanedPrefix } : {}),
      ...(cleanedSuffix ? { suffix: cleanedSuffix } : {}),
      ...(cleanedNegative && cleanedNegative !== HISTORICAL_UNTOUCHED_ANIME_PREFIX ? { negative: cleanedNegative } : {}),
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
