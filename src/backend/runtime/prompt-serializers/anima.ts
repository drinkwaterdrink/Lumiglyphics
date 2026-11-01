import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief,
  formatSpatialPlacements,
  formatDialogueSafeArea,
  formatReferenceDirectives
} from './helpers.js';

export function serializeAnima(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);

  // 1. Medium & style tags (P2)
  const styleTags: string[] = [];
  if (styleDNA.medium) styleTags.push(styleDNA.medium.toLowerCase());
  else styleTags.push('anime illustration');
  if (styleDNA.shading && styleDNA.shading.length > 0) {
    styleTags.push(...styleDNA.shading.map((s: string) => s.toLowerCase()));
  }
  if (styleDNA.linework && styleDNA.linework.length > 0) {
    styleTags.push(...styleDNA.linework.map((s: string) => s.toLowerCase()));
  }

  sections.push({
    id: 'style-tags',
    priority: 2,
    required: false,
    compressible: true,
    text: styleTags.join(', ')
  });

  // 2. Subject count & appearance tags (P0)
  const appearanceTags: string[] = [];
  if (brief.subjectMode === 'none') {
    appearanceTags.push('no humans', 'scenery');
  } else if (brief.subjectMode === 'ensemble') {
    appearanceTags.push(`${subjects.length}characters`, 'multiple people');
    subjects.forEach(s => {
      const parts = [s.appearance];
      if (s.attire) parts.push(s.attire);
      appearanceTags.push(`[${s.name}: ${parts.join(', ')}]`);
    });
  } else {
    const main = subjects[0];
    const cat = cue?.subjectCategory;
    const isFemale = cat === 'female' || /\b(woman|girl|female)\b/i.test(brief.subjects);
    const isMale = cat === 'male' || /\b(man|boy|male)\b/i.test(brief.subjects);
    const countTag = isFemale ? '1girl' : isMale ? '1boy' : '1person';
    appearanceTags.push(countTag, 'solo');
    if (main?.appearance) {
      appearanceTags.push(main.appearance.replace(/;\s*|\n+/g, ', '));
    }
  }

  sections.push({
    id: 'subject-tags',
    priority: 0,
    required: true,
    compressible: false,
    text: appearanceTags.join(', ')
  });

  // 3. Clothing tags (P0)
  if (brief.subjectMode !== 'ensemble') {
    const main = subjects[0];
    if (main?.attire) {
      sections.push({
        id: 'clothing-tags',
        priority: 0,
        required: true,
        compressible: false,
        text: main.attire.replace(/;\s*|\n+/g, ', ')
      });
    }
  }

  // 4. Pose & action tags (P0)
  if (brief.action) {
    sections.push({
      id: 'action-tags',
      priority: 0,
      required: true,
      compressible: false,
      text: brief.action.replace(/;\s*|\n+/g, ', ')
    });
  }

  // 5. Shot & framing tags (P1)
  const cameraTags: string[] = [];
  const shotMap: Record<string, string> = {
    'extreme-close-up': 'extreme close-up',
    'close-up': 'close-up',
    'medium-close-up': 'upper body',
    'medium': 'cowboy shot',
    'medium-wide': 'medium shot',
    'full-body': 'full body',
    'wide': 'wide shot',
    'establishing': 'establishing shot',
    'macro': 'macro focus'
  };
  cameraTags.push(shotMap[shotSpec.camera.shotSize] || shotSpec.camera.shotSize);

  const angleMap: Record<string, string> = {
    'eye-level': 'straight-on',
    'low-angle': 'from below, low angle',
    'high-angle': 'from above, high angle',
    'overhead': 'overhead shot',
    'ground-level': 'ground level',
    'three-quarter': 'from side',
    'profile': 'profile',
    'over-the-shoulder': 'over the shoulder'
  };
  if (shotSpec.camera.angle !== 'eye-level') {
    cameraTags.push(angleMap[shotSpec.camera.angle] || shotSpec.camera.angle);
  }

  sections.push({
    id: 'framing-tags',
    priority: 1,
    required: false,
    compressible: true,
    text: cameraTags.join(', ')
  });

  // 6. Scene & Setting tags (P1)
  if (brief.scene) {
    sections.push({
      id: 'scene-tags',
      priority: 1,
      required: false,
      compressible: true,
      text: brief.scene.replace(/;\s*|\n+/g, ', ')
    });
  }

  // 7. Lighting tags (P1)
  if (brief.lighting) {
    sections.push({
      id: 'lighting-tags',
      priority: 1,
      required: false,
      compressible: true,
      text: brief.lighting.replace(/;\s*|\n+/g, ', ')
    });
  }

  // 8. Minimal prose caption ONLY for spatial relations, dialogue safe-area, or references (P1/P2)
  const spatialText = formatSpatialPlacements(shotSpec);
  const safeAreaText = formatDialogueSafeArea(shotSpec);
  const refDirectives = formatReferenceDirectives(input.referencePlan);
  const proseParts = [spatialText, safeAreaText, ...refDirectives].filter(Boolean);
  if (proseParts.length > 0) {
    sections.push({
      id: 'spatial-prose',
      priority: 1,
      required: false,
      compressible: true,
      text: `[Layout: ${proseParts.join('; ')}]`
    });
  }

  // Anima negative prompt
  negativeSections.push({
    id: 'negative-tags',
    priority: 1,
    required: false,
    compressible: true,
    text: 'worst quality, low quality, deformed anatomy, bad hands, missing limbs'
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
