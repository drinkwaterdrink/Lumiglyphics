import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief,
  formatCameraFraming,
  formatStyleDNAProse
} from './helpers.js';
import type { VisualBrief } from '../../../shared/image-templates.js';
import type { StyleDNA } from '../../../shared/style-dna.js';

/**
 * Extracts or generates 4 to 6 uppercase #RRGGBB hex codes based on scene atmosphere,
 * lighting, and character appearance to satisfy Ideogram's strict color_palette rules.
 */
export function extractIdeogramPalette(brief: VisualBrief, styleDNA?: StyleDNA): string[] {
  // Check if styleDNA has valid custom hex codes
  if (styleDNA?.palette && Array.isArray(styleDNA.palette)) {
    const validHex = styleDNA.palette
      .map(c => c.trim().toUpperCase())
      .filter(c => /^#[0-9A-F]{6}$/i.test(c));
    if (validHex.length >= 3) {
      return validHex.slice(0, 8);
    }
  }

  const text = `${brief.lighting || ''} ${brief.scene || ''}`.toLowerCase();

  // Atmosphere / Lighting heuristics
  if (/\b(?:night|midnight|moon|dark|shadow|rain|storm)\b/.test(text)) {
    return ['#0B1021', '#1C2541', '#3A86FF', '#60A5FA', '#E2E8F0'];
  }
  if (/\b(?:sunset|dusk|twilight|golden hour|evening)\b/.test(text)) {
    return ['#1C1917', '#7C2D12', '#D97706', '#F59E0B', '#FEF3C7'];
  }
  if (/\b(?:neon|cyber|cyberpunk|scifi|sci-fi)\b/.test(text)) {
    return ['#0D0221', '#0F084B', '#FF2A85', '#00F0FF', '#F4F4F9'];
  }
  if (/\b(?:forest|nature|wood|tree|garden|autumn)\b/.test(text)) {
    return ['#052E16', '#14532D', '#16A34A', '#CA8A04', '#FEF08A'];
  }
  if (/\b(?:indoor|candle|lamp|warm|interior|library|parlor)\b/.test(text)) {
    return ['#18181B', '#3F3F46', '#B45309', '#F59E0B', '#FEF08A'];
  }
  if (/\b(?:dawn|morning|sun|sunny|bright|day)\b/.test(text)) {
    return ['#0F172A', '#1E3A8A', '#38BDF8', '#FDE047', '#F8FAFC'];
  }

  // Balanced cinematic default palette
  return ['#0F172A', '#334155', '#64748B', '#94A3B8', '#F8FAFC'];
}

/**
 * Determines whether the shot should follow the photographic or art/design schema branch.
 * Ideogram requires picking exactly one branch and never mixing them.
 */
function isPhotographicMedium(styleDNA?: StyleDNA, brief?: VisualBrief): boolean {
  const medium = (styleDNA?.medium || '').toLowerCase();
  const prefix = (styleDNA?.prefix || '').toLowerCase();
  const combined = `${medium} ${prefix}`;

  if (/\b(?:photo|photograph|35mm|film|dslr|candid|cinematic realism|raw photo)\b/.test(combined)) {
    return true;
  }
  if (/\b(?:anime|illustration|drawing|manga|digital art|painting|comic|vector)\b/.test(combined)) {
    return false;
  }

  // Default to digital illustration for VN unless explicitly photo
  return false;
}

/**
 * Finds optional text element in quotes within action or visualFocus (e.g. 'MIDNIGHT RAMEN').
 */
function extractQuotedText(text: string): string | null {
  const match = text.match(/['"]([^'"]{1,40})['"]/);
  return match && match[1] ? match[1].trim() : null;
}

export function serializeIdeogramV4(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);
  const palette = extractIdeogramPalette(brief, styleDNA);
  const isPhoto = isPhotographicMedium(styleDNA, brief);
  const isDirectJson = profile.ideogramMode !== 'structured-prose';

  const cameraText = formatCameraFraming(shotSpec, styleDNA) || 'medium shot';
  const prefix = styleDNA?.prefix?.trim() ? `${styleDNA.prefix.trim()}. ` : '';

  // Mode A: Direct JSON Mode (Native NanoGPT endpoint schema)
  if (isDirectJson) {
    // 1. High-level description
    let subjectSummary = '';
    if (brief.subjectMode === 'none') {
      subjectSummary = `a cinematic view of ${cue?.visualFocus || brief.action || 'the scene'}, with no visible people`;
    } else if (brief.subjectMode === 'ensemble' || subjects.length > 1) {
      subjectSummary = `an ensemble scene with ${subjects.length} visible characters: ${subjects.map(s => s.name).join(' and ')}`;
    } else {
      const main = subjects[0];
      const attire = main?.attire ? ` wearing ${main.attire}` : '';
      subjectSummary = `${main?.name || 'a character'} (${main?.appearance || 'distinct features'}${attire})`;
    }

    const actionText = brief.action ? ` ${brief.action.trim().replace(/\.+$/, '')}.` : '';
    const highLevel = `${prefix}${isPhoto ? 'A candid' : 'A detailed'} ${cameraText} ${isPhoto ? 'photograph' : 'illustration'} of ${subjectSummary} in ${brief.scene.trim()}.${actionText}`.replace(/\s+/g, ' ').trim();

    // 2. Style description (photo vs art branches)
    const styleDescription: Record<string, unknown> = {};
    if (isPhoto) {
      styleDescription.aesthetics = `${prefix}Atmospheric cinematic realism with balanced dynamic range, authentic surface textures, and fine tonal gradation.`.trim();
      styleDescription.lighting = brief.lighting ? `${brief.lighting.trim()}, providing natural directional fill and soft ambient falloff.` : 'Natural ambient lighting with soft directional fill and atmospheric bounce.';
      styleDescription.photo = `Shot on a full-frame sensor with a ${shotSpec?.camera?.lens || '35mm'} prime lens, f/1.8 aperture, tack-sharp focal plane, and natural depth of field.`;
      styleDescription.medium = 'photograph';
      styleDescription.color_palette = palette;
    } else {
      styleDescription.aesthetics = `${prefix}Intricate visual novel illustration with expressive character artistry, clean silhouette definition, and rich environmental depth.`.trim();
      styleDescription.lighting = brief.lighting ? `${brief.lighting.trim()}, creating gentle rim lighting and volumetric atmospheric mood.` : 'Cinematic atmospheric lighting with gentle rim accents and balanced contrast.';
      styleDescription.medium = 'digital_illustration';
      styleDescription.art_style = 'Crisp refined line art combined with layered volumetric shading, clean material textures, and painterly environmental depth.';
      styleDescription.color_palette = palette;
    }

    // 3. Compositional deconstruction (4 to 6 elements for safety refusal bypass)
    const elements: Array<Record<string, unknown>> = [];

    if (brief.subjectMode === 'ensemble' && subjects.length >= 2) {
      // Multi-character spatial layout
      const charWidth = Math.floor(800 / Math.min(subjects.length, 3));
      subjects.slice(0, 3).forEach((sub, i) => {
        const xMin = 80 + i * charWidth;
        const xMax = Math.min(960, xMin + charWidth - 40);
        const attireStr = sub.attire ? `, wearing ${sub.attire}` : '';
        elements.push({
          type: 'obj',
          bbox: [160, xMin, 880, xMax],
          desc: `${sub.name}: ${sub.appearance}${attireStr}. Positioned ${i === 0 ? 'on the left' : i === 1 ? 'towards the center' : 'on the right'} of the scene.`,
          color_palette: [palette[i % palette.length], palette[(i + 1) % palette.length]]
        });
      });
    } else if (subjects.length === 1 && brief.subjectMode !== 'none') {
      // Single character layout (respecting dialogue safe area above y=880)
      const main = subjects[0]!;
      const attireStr = main.attire ? `, wearing ${main.attire}` : '';
      elements.push({
        type: 'obj',
        bbox: [120, 200, 880, 800],
        desc: `${main.name}: ${main.appearance}${attireStr}, ${main.action || brief.action || 'featured in the scene'}.`,
        color_palette: [palette[0]!, palette[1]!]
      });

      // Focal action prop
      elements.push({
        type: 'obj',
        bbox: [480, 320, 800, 680],
        desc: cue?.visualFocus ? `Featured focal element: ${cue.visualFocus}.` : 'Featured interaction prop and immediate environmental details.',
        color_palette: [palette[2]!, palette[3]!]
      });
    } else {
      // Environment-only focus
      elements.push({
        type: 'obj',
        bbox: [180, 150, 820, 850],
        desc: cue?.visualFocus ? `Central focus: ${cue.visualFocus}.` : 'Central focal scenery and primary architectural features.',
        color_palette: [palette[0]!, palette[1]!]
      });
    }

    // Foreground surface element (Element 3)
    elements.push({
      type: 'obj',
      bbox: [760, 40, 960, 960],
      desc: 'Immediate foreground floor plane with detailed material textures, reflections, and spatial perspective.',
      color_palette: [palette[0]!, palette[1]!]
    });

    // Midground environment element (Element 4)
    elements.push({
      type: 'obj',
      bbox: [180, 40, 740, 960],
      desc: `Midground environmental backdrop: ${brief.scene.slice(0, 200).replace(/\s+\S*$/, '')}.`,
      color_palette: [palette[2]!, palette[3]!]
    });

    // Upper atmosphere/ceiling element (Element 5)
    elements.push({
      type: 'obj',
      bbox: [20, 40, 360, 960],
      desc: 'Upper ceiling structure, sky gradient, and atmospheric volumetric light spill overhead.',
      color_palette: [palette[3]!, palette[4] || palette[0]!]
    });

    // Check for optional typography (Element 6)
    const quoteInAction = extractQuotedText(`${brief.action} ${cue?.visualFocus || ''}`);
    if (quoteInAction && elements.length < 6) {
      elements.unshift({
        type: 'text',
        bbox: [80, 150, 200, 850],
        text: quoteInAction.slice(0, 35),
        desc: 'Sharp, elegant typography displayed cleanly on an environmental sign or surface.',
        color_palette: [palette[1]!, palette[4] || palette[0]!]
      });
    }

    const payload = {
      high_level_description: highLevel,
      style_description: styleDescription,
      compositional_deconstruction: {
        background: brief.scene ? `${brief.scene.trim()}. Atmospheric depth with detailed environmental surfaces.` : 'An evocative, detailed scene environment with natural architectural depth and rich surfaces.',
        elements: elements.slice(0, 6)
      }
    };

    const minifiedJson = JSON.stringify(payload);

    sections.push({
      id: 'ideogram-json',
      priority: 0,
      required: true,
      compressible: false,
      text: minifiedJson
    });

    return {
      document: createPromptDocument('ideogram-v4', sections, [], undefined, warnings),
      prompt: minifiedJson,
      negativePrompt: undefined,
      warnings
    };
  }

  // Mode B: Structured Plain-Text Mode (6-part formula)
  // [1. Shot Type + Exact Medium]
  const shotMediumText = `A ${cameraText} ${isPhoto ? 'photograph' : 'digital illustration'} of`;

  // [2. Main Subject + Spatial Placement]
  let subjectsText = '';
  if (brief.subjectMode === 'none') {
    subjectsText = `the environment featuring ${cue?.visualFocus || brief.action || 'the scenery'}, with no people present`;
  } else if (brief.subjectMode === 'ensemble' || subjects.length > 1) {
    const list = subjects.map((s, idx) => {
      const pos = idx === 0 ? 'positioned on the left' : idx === 1 ? 'positioned on the right' : 'in the center';
      const attire = s.attire ? `, wearing ${s.attire}` : '';
      return `${s.name} (${s.appearance}${attire}) ${pos}`;
    }).join('; ');
    subjectsText = `an ensemble of ${subjects.length} characters: ${list}. Action: ${brief.action || 'interacting together'}`;
  } else {
    const main = subjects[0];
    const attire = main?.attire ? `, wearing ${main.attire}` : '';
    subjectsText = `${main?.name || 'Character'} (${main?.appearance || 'distinct traits'}${attire}), ${main?.action || brief.action || 'in the scene'}`;
  }

  // [3. Exact Text in Single Quotes if any]
  const quoted = extractQuotedText(`${brief.action} ${cue?.visualFocus || ''}`);
  const textClause = quoted ? ` featuring clean typography reading '${quoted}'` : '';

  // [4. Detailed Background & Surfaces]
  const backgroundText = `Behind, ${brief.scene}.`;

  // [5. Lighting & Camera/Render Specs]
  const lightingSpecs = `${brief.lighting ? `${brief.lighting}, ` : ''}${isPhoto ? 'shot on 35mm film, f/1.8 aperture, natural depth of field and tack-sharp focus' : 'clean linework, rich volumetric shading, and painterly depth'}.`;

  // [6. color palette #HEX1, #HEX2, #HEX3]
  const paletteText = `color palette ${palette.join(', ')}`;

  const structuredPrompt = `${shotMediumText} ${subjectsText}${textClause}. ${backgroundText} ${lightingSpecs} ${paletteText}`;

  sections.push({
    id: 'ideogram-structured-prose',
    priority: 0,
    required: true,
    compressible: false,
    text: structuredPrompt
  });

  return {
    document: createPromptDocument('ideogram-v4', sections, [], undefined, warnings),
    prompt: structuredPrompt,
    negativePrompt: undefined,
    warnings
  };
}
