import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief,
  formatCameraFraming,
  formatSpatialPlacements,
  formatDialogueSafeArea,
  formatStyleDNAProse,
  formatReferenceDirectives
} from './helpers.js';

export function serializeSeedream5(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);

  // 1. Subject / action (P0)
  let subjectActionText = '';
  if (brief.subjectMode === 'none') {
    subjectActionText = `A clear view of ${cue?.visualFocus || brief.action || 'the scene'}, without people.`;
  } else if (brief.subjectMode === 'ensemble') {
    const list = subjects.map(s => `${s.name} (${s.appearance}${s.attire ? `, wearing ${s.attire}` : ''})`).join('; ');
    subjectActionText = `An ensemble featuring ${list}. Current action: ${brief.action || 'standing in the scene'}.`;
  } else {
    const main = subjects[0];
    const attire = main?.attire ? `, wearing ${main.attire}` : '';
    subjectActionText = `${main?.name || 'The subject'}, having ${main?.appearance || 'distinct features'}${attire}, is ${main?.action || brief.action || 'shown in the scene'}.`;
  }

  sections.push({
    id: 'subject-action',
    priority: 0,
    required: true,
    compressible: false,
    text: subjectActionText
  });

  // 2. Layout / spatial relationships (P0/P1)
  const spatialText = formatSpatialPlacements(shotSpec);
  if (spatialText) {
    sections.push({
      id: 'spatial-layout',
      priority: 0,
      required: true,
      compressible: false,
      text: `Spatial layout: ${spatialText}.`
    });
  }

  // 3. Environment & Setting (P1)
  if (brief.scene) {
    sections.push({
      id: 'environment',
      priority: 1,
      required: false,
      compressible: true,
      text: `Setting: ${brief.scene.trim()}.`
    });
  }

  // 4. Camera (P1)
  const cameraText = formatCameraFraming(shotSpec);
  if (cameraText) {
    sections.push({
      id: 'camera',
      priority: 1,
      required: false,
      compressible: true,
      text: `Framing: ${cameraText}.`
    });
  }

  // 5. Lighting (P1)
  if (brief.lighting) {
    sections.push({
      id: 'lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Lighting: ${brief.lighting.trim()}.`
    });
  }

  // 6. Visual treatment / style (P2)
  const styleText = formatStyleDNAProse(styleDNA);
  if (styleText) {
    sections.push({
      id: 'visual-treatment',
      priority: 2,
      required: false,
      compressible: true,
      text: `Style: ${styleText}.`
    });
  }

  // Constraints & References (P2/P3)
  const safeArea = formatDialogueSafeArea(shotSpec);
  const refs = formatReferenceDirectives(referencePlan);
  const extras = [...(safeArea ? [safeArea] : []), ...refs];
  if (extras.length > 0) {
    sections.push({
      id: 'constraints',
      priority: 2,
      required: false,
      compressible: true,
      text: extras.join(' ')
    });
  }

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join(' ');

  // Word count guard
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (wordCount > 600) {
    warnings.push(`Seedream 5 Pro prompt word count (${wordCount}) exceeds the recommended 600-word limit; attention may be scattered.`);
  }

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
