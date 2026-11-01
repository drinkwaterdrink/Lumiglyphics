import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief,
  formatCameraFraming,
  formatDialogueSafeArea,
  formatReferenceDirectives
} from './helpers.js';

export function serializeGrokImagine2(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);

  // 1. Subject (P0) - MUST COME FIRST!
  let countDescription = '';
  if (brief.subjectMode === 'none') {
    countDescription = 'A focused scene with no people.';
  } else if (brief.subjectMode === 'ensemble') {
    const memberList = subjects.map(s => {
      const parts = [s.appearance];
      if (s.attire) parts.push(`wearing ${s.attire}`);
      return `${s.name} (${parts.join(', ')})`;
    }).join(' and ');
    countDescription = `${subjects.length} visible characters: ${memberList}.`;
  } else {
    const main = subjects[0];
    const cat = cue?.subjectCategory || 'character';
    const label = cat === 'female' ? 'One visible woman' : cat === 'male' ? 'One visible man' : 'One visible person';
    countDescription = `${label}, named ${main?.name || 'the subject'}, with ${main?.appearance || 'distinct features'}${main?.attire ? `, wearing ${main.attire}` : ''}.`;
  }

  sections.push({
    id: 'subject',
    priority: 0,
    required: true,
    compressible: false,
    text: countDescription
  });

  // 2. Important detail / focal action (P0)
  const actionText = brief.action ? brief.action.trim() : '';
  if (actionText) {
    sections.push({
      id: 'focal-action',
      priority: 0,
      required: true,
      compressible: false,
      text: `Action: ${actionText}.`
    });
  }

  // 3. Environment & physical material information (P1 / P2)
  if (brief.scene) {
    sections.push({
      id: 'environment-materials',
      priority: 1,
      required: false,
      compressible: true,
      text: `Surroundings and physical textures: ${brief.scene.trim()}.`
    });
  }

  // 4. Art direction (P2)
  const artParts: string[] = [];
  if (styleDNA.medium) artParts.push(styleDNA.medium);
  if (styleDNA.rendering?.length) artParts.push(...styleDNA.rendering);
  if (styleDNA.shading?.length) artParts.push(...styleDNA.shading);
  if (artParts.length > 0) {
    sections.push({
      id: 'art-direction',
      priority: 2,
      required: false,
      compressible: true,
      text: `Art direction: ${artParts.join(', ')}.`
    });
  }

  // 5. Light (P1)
  if (brief.lighting) {
    sections.push({
      id: 'light',
      priority: 1,
      required: false,
      compressible: true,
      text: `Lighting: ${brief.lighting.trim()}.`
    });
  }

  // 6. Color palette (P2)
  if (styleDNA.palette && styleDNA.palette.length > 0) {
    sections.push({
      id: 'color',
      priority: 2,
      required: false,
      compressible: true,
      text: `Color palette: ${styleDNA.palette.join(', ')}.`
    });
  }

  // 7. Composition & camera framing & crop (P1)
  const cameraText = formatCameraFraming(shotSpec);
  const safeAreaText = formatDialogueSafeArea(shotSpec);
  const compParts = [
    cameraText ? `Camera framing: ${cameraText}.` : '',
    safeAreaText ? safeAreaText : ''
  ].filter(Boolean);

  if (compParts.length > 0) {
    sections.push({
      id: 'composition-camera',
      priority: 1,
      required: false,
      compressible: true,
      text: compParts.join(' ')
    });
  }

  // References (if any)
  const refs = formatReferenceDirectives(referencePlan);
  if (refs.length > 0) {
    sections.push({
      id: 'references',
      priority: 2,
      required: false,
      compressible: true,
      text: refs.join(' ')
    });
  }

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join(' ');

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
    negativePrompt: undefined,
    warnings
  };
}
