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

  // Style tags (P2)
  if (styleDNA.medium) {
    sections.push({
      id: 'style',
      priority: 2,
      required: false,
      compressible: true,
      text: styleDNA.medium.toLowerCase()
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
