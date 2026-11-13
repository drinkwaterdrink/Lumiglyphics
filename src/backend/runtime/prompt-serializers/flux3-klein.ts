import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief,
  formatSceneProse,
  sanitizeQuoteAndUnitNotation,
  formatStyleDNAProse,
  formatDialogueSafeArea,
  formatReferenceDirectives
} from './helpers.js';
import type { VisualBrief } from '../../../shared/image-templates.js';
import type { StyleDNA } from '../../../shared/style-dna.js';
import type { SubjectPlacement } from '../../../shared/image-shot-spec.js';

function resolveKleinPlacement(
  placement: SubjectPlacement | undefined,
  idx: number
): { anchor: string; box: { x_min: number; y_min: number; x_max: number; y_max: number } } {
  const depth = placement?.depth ?? (idx === 0 ? 'foreground' : idx === 1 ? 'midground' : 'background');
  const horiz = placement?.horizontal ?? (idx === 0 ? 'left' : idx === 1 ? 'right' : 'center');
  const xCenterMap: Record<NonNullable<SubjectPlacement['horizontal']>, number> = {
    'far-left': 0.18,
    'left': 0.29,
    'center': 0.50,
    'right': 0.71,
    'far-right': 0.82
  };
  const depthBand: Record<'foreground' | 'midground' | 'background', [number, number, number]> = {
    foreground: [0.16, 0.90, 0.34],
    midground: [0.22, 0.78, 0.26],
    background: [0.14, 0.58, 0.18]
  };
  const [yMin, yMax, width] = depthBand[depth];
  const centerX = xCenterMap[horiz] ?? 0.50;
  const xMin = Number(Math.max(0.04, Math.min(0.96 - width, centerX - width / 2)).toFixed(2));
  const xMax = Number(Math.min(0.96, xMin + width).toFixed(2));
  const horizPhrase = horiz === 'center' ? 'in the center' : `on the ${horiz.replace('-', ' ')}`;
  const baseAnchor = `In the ${depth} ${horizPhrase}`;
  const anchor = placement?.blocking ? `${baseAnchor} (${placement.blocking.replace(/\.+$/, '')})` : baseAnchor;
  return {
    anchor,
    box: { x_min: xMin, y_min: yMin, x_max: xMax, y_max: yMax }
  };
}

/**
 * Checks if the request should follow the photographic or illustration/artwork branch.
 * For real photos, FLUX.3 Klein strictly bans the word "photorealistic" (reserved for CGI).
 */
function isPhotographicMedium(styleDNA?: StyleDNA, brief?: VisualBrief): boolean {
  const text = `${styleDNA?.medium || ''} ${styleDNA?.prefix || ''} ${brief?.scene || ''}`.toLowerCase();
  if (/\b(?:photo|photograph|candid|35mm|film|dslr|smartphone|camera roll|snapshot|raw photo)\b/.test(text)) {
    return true;
  }
  if (/\b(?:illustration|anime|manga|cel[- ]shaded|drawing|digital art|painting|watercolor|gouache|comic)\b/.test(text)) {
    return false;
  }
  return false;
}

/**
 * Extracts optional text in quotes within action or visualFocus for FLUX.3 Klein's typography lock.
 */
function extractQuotedText(text: string): string | null {
  const match = text.match(/['"]([^'"]{1,50})['"]/);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Resolves BFL's exact opening convention prefix for real photos or physical art mediums.
 */
function resolveKleinMediumPrefix(isPhoto: boolean, styleDNA?: StyleDNA, brief?: VisualBrief, shotSize?: string): string {
  if (isPhoto) {
    const text = `${styleDNA?.prefix || ''} ${brief?.scene || ''}`.toLowerCase();
    if (shotSize === 'close-up' || shotSize === 'macro' || shotSize === 'extreme-close-up') {
      return 'Close-up photograph';
    }
    if (/\b(?:smartphone|candid|phone|snapshot|casual|camera roll)\b/.test(text)) {
      return 'Candid handheld smartphone photograph';
    }
    if (/\b(?:studio|portrait session|backdrop)\b/.test(text)) {
      return 'Studio photograph';
    }
    if (/\b(?:outside|outdoor|nature|street|garden|forest|park|beach|sky|harbor|alley|road)\b/.test(text)) {
      return 'Full-color outdoor photograph';
    }
    if (/\b(?:room|loft|library|indoor|interior|kitchen|bedroom|parlor|cafe|laundromat|hall)\b/.test(text)) {
      return 'Full-color indoor photograph';
    }
    return 'Full-color photograph';
  }

  // Artwork / Illustration medium & physical surface
  const medium = styleDNA?.medium?.trim();
  const prefix = styleDNA?.prefix?.trim();
  if (prefix) {
    return sanitizeQuoteAndUnitNotation(prefix);
  }
  if (medium) {
    if (/\bwatercolor\b/i.test(medium)) return `${medium} on rough cold-press watercolor paper`;
    if (/\bgouache\b/i.test(medium)) return `${medium} on textured cardstock with crisp ink linework`;
    if (/\boil\b/i.test(medium)) return `${medium} on coarse linen canvas`;
    return `${medium} on fine archival paper`;
  }
  return 'Editorial visual novel digital illustration with clean cel-shaded linework';
}

/**
 * Serializes prompts according to Black Forest Labs' official 9B Prompt Upsampler (flux-3-image-klein-pup)
 * training distribution and the 7 Golden Rules for FLUX.3 Image Klein on NanoGPT.
 */
export function serializeFlux3Klein(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const parameterHints: Record<string, unknown> = {};

  const subjects = parseSubjectsFromBrief(brief, cue);
  const isPhoto = isPhotographicMedium(styleDNA, brief);
  const cleanScene = formatSceneProse(brief.scene);
  const shotSize = shotSpec?.camera?.shotSize || 'medium';

  // 1. Medium & Style Opening (Rule 1)
  const mediumPrefix = resolveKleinMediumPrefix(isPhoto, styleDNA, brief, shotSize);
  const sceneAtmosphere = brief.lighting
    ? sanitizeQuoteAndUnitNotation(brief.lighting).replace(/\.+$/, '')
    : 'natural ambient lighting';

  // 2. Camera Optics & Lighting (Rules 2, 3, & 6)
  const isShallow = shotSpec?.camera?.depthOfField === 'shallow' ||
    /\b(?:shallow|bokeh|f\/1\.4|portrait lens)\b/i.test(`${styleDNA?.prefix || ''} ${brief.composition || ''}`);
  const opticsText = isShallow
    ? 'shallow depth of field, shot at f/1.4, background rendered as soft circular bokeh shapes and color silhouettes'
    : 'deep edge-to-edge focus across all depth planes from foreground to background';

  const realismGrounding = isPhoto
    ? 'Subtle fabric creases, natural skin texture, and fine surface reflections.'
    : 'Rich volumetric shading and authentic textural contrast.';

  const openingClause = `${mediumPrefix}, set in ${cleanScene || 'the scene'}. Illuminated by ${sceneAtmosphere}. ${opticsText}. ${realismGrounding}`.replace(/\s+/g, ' ').replace(/,\s*\./g, '.').trim();

  sections.push({
    id: 'medium-optics-opening',
    priority: 1,
    required: true,
    compressible: true,
    text: openingClause
  });

  // 3. Main Subject(s) with 6-Part Observable Profile (Rules 4 & 5) and NanoGPT Layout Boxes
  const layoutBoxes: Array<{
    label: string;
    description: string;
    box: { x_min: number; y_min: number; x_max: number; y_max: number };
  }> = [];

  if (brief.subjectMode === 'none' || subjects.length === 0) {
    const focus = cue?.visualFocus || (brief.action ? sanitizeQuoteAndUnitNotation(brief.action) : 'an open architectural setting');
    sections.push({
      id: 'subject-action',
      priority: 0,
      required: true,
      compressible: false,
      text: `An empty scene with clean unbranded surfaces and no people present, centering on ${focus}.`
    });
  } else if (subjects.length === 1) {
    const s = subjects[0]!;
    const label = `subject_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const attireStr = s.attire ? `, wearing ${s.attire}` : '';
    const actionStr = s.action || (brief.action ? sanitizeQuoteAndUnitNotation(brief.action) : 'standing poised in the scene');

    // 0.0 - 1.0 decimal fraction coordinates for NanoGPT
    layoutBoxes.push({
      label,
      description: `${s.name}: ${s.appearance}${attireStr}`,
      box: { x_min: 0.25, y_min: 0.15, x_max: 0.75, y_max: 0.90 }
    });

    const subjectClause = `In the center foreground, <${label}> ${s.name} (${s.appearance}${attireStr}) is ${actionStr.replace(/\.+$/, '')}.`.replace(/\s+/g, ' ').replace(/,\s*\./g, '.');

    sections.push({
      id: 'subject-action',
      priority: 0,
      required: true,
      compressible: false,
      text: subjectClause
    });
  } else {
    // Multi-character ensemble with depth-aware scene staging (or frame-relative anchors fallback)
    const placements = shotSpec.composition.subjectPlacements || [];
    const hasDirectedPlacements = placements.length >= 2;
    const charWidth = Number((0.85 / Math.min(subjects.length, 3)).toFixed(2));
    const ensembleClauses: string[] = [];

    subjects.slice(0, 4).forEach((s, i) => {
      const label = `character_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const attireStr = s.attire ? `, wearing ${s.attire}` : '';

      if (hasDirectedPlacements) {
        const matchedPlacement = placements.find(p => p.subject.trim().toLowerCase() === s.name.trim().toLowerCase()) ?? placements[i];
        const resolved = resolveKleinPlacement(matchedPlacement, i);
        layoutBoxes.push({
          label,
          description: `${s.name}: ${s.appearance}${attireStr}`,
          box: resolved.box
        });
        ensembleClauses.push(`${resolved.anchor}, <${label}> ${s.name} (${s.appearance}${attireStr})`);
      } else {
        const xMin = Number((0.08 + i * charWidth).toFixed(2));
        const xMax = Number(Math.min(0.95, xMin + charWidth - 0.04).toFixed(2));
        const anchor = i === 0
          ? 'Frame-left in the foreground'
          : i === 1
            ? 'Frame-right in the foreground'
            : 'In the center midground';

        layoutBoxes.push({
          label,
          description: `${s.name}: ${s.appearance}${attireStr}`,
          box: { x_min: xMin, y_min: 0.18, x_max: xMax, y_max: 0.90 }
        });

        ensembleClauses.push(`${anchor}, <${label}> ${s.name} (${s.appearance}${attireStr})`);
      }
    });

    if (subjects.length > 4) {
      subjects.slice(4).forEach(s => {
        const attireStr = s.attire ? `, wearing ${s.attire}` : '';
        ensembleClauses.push(`Further in the background, ${s.name} (${s.appearance}${attireStr})`);
      });
    }

    const actionText = brief.action ? ` ${sanitizeQuoteAndUnitNotation(brief.action.trim().replace(/\.+$/, ''))}.` : '.';
    const stagingText = shotSpec.composition.stagingNote ? ` ${shotSpec.composition.stagingNote.trim().replace(/\.+$/, '')}.` : '';
    const ensembleText = `${ensembleClauses.join('; ')}${actionText}${stagingText}`.replace(/\s+/g, ' ').replace(/,\s*\./g, '.');

    sections.push({
      id: 'ensemble-subjects',
      priority: 0,
      required: true,
      compressible: false,
      text: ensembleText
    });
  }

  // 4. Supporting Props & Typography Lock (Rule 8)
  const quoted = extractQuotedText(`${brief.action} ${cue?.visualFocus || ''}`);
  if (quoted) {
    const typographyLabel = 'scene_typography';
    layoutBoxes.push({
      label: typographyLabel,
      description: `Typography reading "${quoted}"`,
      box: { x_min: 0.20, y_min: 0.08, x_max: 0.80, y_max: 0.25 }
    });

    sections.push({
      id: 'typography-lock',
      priority: 1,
      required: false,
      compressible: true,
      text: `Above, <${typographyLabel}> displays clean legible lettering that reads exactly "${quoted}", the only text in the scene.`
    });
  }

  // 5. 1/6th Background Rule (Rule 4)
  if (cleanScene) {
    const backgroundDesc = `In the background, ${cleanScene} forms silhouettes and environmental shapes against ambient atmospheric light gradients.`
      .replace(/\s+/g, ' ')
      .replace(/,\s*\./g, '.');

    sections.push({
      id: 'background-sixth',
      priority: 1,
      required: false,
      compressible: true,
      text: backgroundDesc
    });
  }

  // 6. Dialogue Safe Area & Multi-Reference Directives (P2)
  const constraints: string[] = [];
  const safeAreaText = formatDialogueSafeArea(shotSpec);
  if (safeAreaText) {
    constraints.push(safeAreaText);
  }

  const refDirectives = formatReferenceDirectives(referencePlan);
  if (refDirectives.length > 0) {
    constraints.push(...refDirectives);
  }

  if (constraints.length > 0) {
    sections.push({
      id: 'constraints',
      priority: 2,
      required: false,
      compressible: true,
      text: constraints.join(' ')
    });
  }

  // Populate NanoGPT layout_boxes if layoutBoxes feature is enabled or parameter hint requested
  if (layoutBoxes.length > 0) {
    parameterHints['layout_boxes'] = layoutBoxes;
  }

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join(' ');

  if (prompt.length < 250 && input.complexity !== 'simple') {
    warnings.push('FLUX.3 Klein prompt is short for the scene complexity; Klein produces best results with 140–250 word File-Level captions.');
  }

  const document = createPromptDocument(
    profile.dialect,
    sections,
    [],
    Object.keys(parameterHints).length > 0 ? parameterHints : undefined,
    warnings
  );

  return {
    document,
    prompt,
    negativePrompt: undefined,
    parameterHints: Object.keys(parameterHints).length > 0 ? parameterHints : undefined,
    warnings
  };
}
