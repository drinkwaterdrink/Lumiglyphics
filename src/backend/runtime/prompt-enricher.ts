import type { VisualBrief } from '../../shared/image-templates.js';
import type { ImageShotSpec } from '../../shared/image-shot-spec.js';
import type { CharacterDNA } from '../../shared/character-dna.js';
import type { LocationDNA } from './visual-continuity.js';
import type { PromptDocument, PromptSection } from '../../shared/prompt-document.js';
import { createPromptDocument } from '../../shared/prompt-document.js';
import type { PromptDialectId } from '../../shared/image-prompt-profile-v2.js';

export function isHighCapacityModel(modelName = ''): boolean {
  const lower = modelName.toLowerCase();
  return /recraft|grok|flux.*pro|midjourney|ideogram/i.test(lower);
}

export function getMaxBudgetForModel(modelName = '', detailLevel: 'standard' | 'detailed' | 'ultra' = 'standard'): number {
  const isHigh = isHighCapacityModel(modelName);
  if (detailLevel === 'ultra') {
    return isHigh ? 9800 : 3800;
  }
  if (detailLevel === 'detailed') {
    return isHigh ? 5000 : 2500;
  }
  return isHigh ? 2500 : 1500;
}

export interface EnrichmentContext {
  brief: VisualBrief;
  shotSpec?: ImageShotSpec;
  characterDNA?: CharacterDNA;
  locationDNA?: LocationDNA;
  detailLevel?: 'standard' | 'detailed' | 'ultra';
}

/**
 * Builds an LLM instruction prompt for expanding a concise visual brief into
 * vivid, tactile visual description taking full advantage of high-capacity models like Recraft 4.1.
 */
export function buildPromptEnrichmentPrompt(context: EnrichmentContext): string {
  const { brief, shotSpec, characterDNA, locationDNA, detailLevel = 'detailed' } = context;
  const targetChars = detailLevel === 'ultra' ? '4000 to 8000' : '2000 to 4000';

  return `You are a master visual director and cinematographer crafting an evocative, dense image generation prompt for an ultra-high-capacity image model (10,000-character capacity).

Write an expansive, sensory, tactile visual description (${targetChars} characters) depicting the exact scene below.

CINEMATIC INSTRUCTIONS:
1. SUBJECT & ATTIRE: Describe fine fabric weaves, drape, wrinkles, textures (canvas, linen, wool, embroidery), skin micro-details, hair flyaways, catchlights in the eyes, exact posture, and subtle gestures.
2. ENVIRONMENT & ARCHITECTURE: Describe architectural materials, wood grain, masonry textures, weathered surfaces, dust particles or rain droplets, reflections on glass or wet wood.
3. LIGHTING & VOLUMETRICS: Describe the precise light direction, color temperature, atmospheric haze, volumetric light shafts, deep shadows, and ambient bounce.
4. CAMERA & COMPOSITION: Specify photographic depth, lens bokeh, focal length (e.g. 50mm f/1.4 or 85mm portrait), camera angle, and spatial framing.
5. NO FLUFF: Do not write meta-commentary, intros, or summaries. Output only the pure descriptive prompt text.

SCENE SPECIFICATION:
- Setting: ${brief.scene}
- Action / Moment: ${brief.action}
- Subject(s): ${brief.subjects}
${characterDNA ? `- Character Visual DNA: ${characterDNA.name} (${JSON.stringify(characterDNA.hair)}, ${JSON.stringify(characterDNA.eyes)}, build: ${JSON.stringify(characterDNA.build)}, outfit: ${characterDNA.signatureOutfit})` : ''}
${locationDNA ? `- Location DNA: ${locationDNA.name} (features: ${locationDNA.architecturalFeatures.join(', ')}, materials: ${locationDNA.dominantMaterials.join(', ')}, props: ${locationDNA.prominentProps.join(', ')})` : ''}
${shotSpec ? `- Camera Framing: ${shotSpec.camera.shotSize}, angle: ${shotSpec.camera.angle}, lens: ${shotSpec.camera.lens}` : ''}
- Lighting: ${brief.lighting}

Output pure enriched descriptive prose:`;
}

/**
 * Integrates enriched descriptive prose into a compiled PromptDocument.
 */
export function applyPromptEnrichment(
  baseDocument: PromptDocument,
  enrichedText: string,
  targetDialect: PromptDialectId
): PromptDocument {
  const trimmed = enrichedText.trim().replace(/^["'`]|["'`]$/g, '');
  if (!trimmed) return baseDocument;

  const sections: PromptSection[] = [];

  // P0: The primary enriched visual passage
  sections.push({
    id: 'enriched-cinematic-prose',
    priority: 0,
    required: true,
    compressible: false,
    text: trimmed
  });

  // Preserve essential parameter hints or secondary sections from base document if any
  for (const sec of baseDocument.sections) {
    if (sec.id === 'style-medium' || sec.id === 'shared-style-dna' || sec.id === 'camera-framing') {
      sections.push({
        ...sec,
        priority: 1,
        compressible: true
      });
    }
  }

  return createPromptDocument(
    targetDialect,
    sections,
    baseDocument.negativeSections,
    baseDocument.parameterHints,
    baseDocument.warnings
  );
}
