import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief
} from './helpers.js';

export function serializeGenericTags(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, cue } = input;
  const warnings: string[] = ['Model-specific prompting profile unavailable; using conservative generic prompting.'];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);

  // Subject tags (P0)
  const tags: string[] = [];
  if (brief.subjectMode === 'none') {
    tags.push('no humans', 'scenery');
  } else if (brief.subjectMode === 'ensemble') {
    tags.push(`${subjects.length}characters`, 'multiple people');
    subjects.forEach(s => tags.push(s.name, s.appearance));
  } else {
    const main = subjects[0];
    const cat = cue?.subjectCategory;
    const countTag = cat === 'female' ? '1girl' : cat === 'male' ? '1boy' : '1person';
    tags.push(countTag);
    if (main?.appearance) tags.push(main.appearance.replace(/;\s*|\n+/g, ', '));
    if (main?.attire) tags.push(main.attire.replace(/;\s*|\n+/g, ', '));
  }

  sections.push({
    id: 'subjects',
    priority: 0,
    required: true,
    compressible: false,
    text: tags.join(', ')
  });

  // Action tags (P0)
  if (brief.action) {
    sections.push({
      id: 'action',
      priority: 0,
      required: true,
      compressible: false,
      text: brief.action.replace(/;\s*|\n+/g, ', ')
    });
  }

  // Camera & framing (P1)
  sections.push({
    id: 'camera',
    priority: 1,
    required: false,
    compressible: true,
    text: `${shotSpec.camera.shotSize}, ${shotSpec.camera.angle}`
  });

  // Scene tags (P1)
  if (brief.scene) {
    sections.push({
      id: 'scene',
      priority: 1,
      required: false,
      compressible: true,
      text: brief.scene.replace(/;\s*|\n+/g, ', ')
    });
  }

  // Lighting tags (P1)
  if (brief.lighting) {
    sections.push({
      id: 'lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: brief.lighting.replace(/;\s*|\n+/g, ', ').toLowerCase()
    });
  }

  // Style tags (P2)
  const styleTags: string[] = [];
  if (styleDNA.medium) styleTags.push(styleDNA.medium.toLowerCase());
  else if (styleDNA.realism && styleDNA.realism.length > 0) styleTags.push('photographic');
  if (styleDNA.rendering && styleDNA.rendering.length > 0) {
    styleTags.push(...styleDNA.rendering.map((s: string) => s.toLowerCase()));
  }
  if (styleDNA.linework && styleDNA.linework.length > 0) {
    styleTags.push(...styleDNA.linework.map((s: string) => s.toLowerCase()));
  }
  if (styleDNA.shading && styleDNA.shading.length > 0) {
    styleTags.push(...styleDNA.shading.map((s: string) => s.toLowerCase()));
  }
  if (styleDNA.palette && styleDNA.palette.length > 0) {
    styleTags.push(...styleDNA.palette.map((s: string) => s.toLowerCase()));
  }
  if (styleDNA.atmosphere && styleDNA.atmosphere.length > 0) {
    styleTags.push(...styleDNA.atmosphere.map((s: string) => s.toLowerCase()));
  }
  if (styleTags.length > 0) {
    sections.push({
      id: 'style',
      priority: 2,
      required: false,
      compressible: true,
      text: [...new Set(styleTags)].join(', ')
    });
  }

  // Conservative negative tags
  negativeSections.push({
    id: 'negative',
    priority: 1,
    required: false,
    compressible: true,
    text: 'worst quality, low quality, deformed, extra limbs'
  });

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join(', ');
  const negativePrompt = negativeSections.map(s => s.text.trim()).join(', ');

  const document = createPromptDocument(
    profile.dialect,
    sections,
    negativeSections,
    undefined,
    warnings
  );

  return {
    document,
    prompt,
    negativePrompt,
    warnings
  };
}
