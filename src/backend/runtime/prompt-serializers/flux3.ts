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

export function serializeFlux3(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);

  // Subject and Action (P0)
  let subjectText = '';
  if (brief.subjectMode === 'none') {
    const focus = cue?.visualFocus || brief.action || 'scenic view';
    subjectText = `A detailed view featuring ${focus}.`;
  } else if (brief.subjectMode === 'ensemble') {
    subjectText = `An ensemble scene with ${subjects.length} characters: ${subjects.map(s => s.name).join(', ')}. ${brief.action || ''}`.trim();
  } else {
    const main = subjects[0];
    if (main) {
      subjectText = `${main.name}, ${main.action || brief.action || 'in scene'}.`.trim();
    }
  }

  sections.push({
    id: 'subject-action',
    priority: 0,
    required: true,
    compressible: false,
    text: subjectText
  });

  // Appearance & Wardrobe (P0)
  if (subjects.length > 0) {
    const appearanceText = subjects.map(s => {
      const parts = [s.appearance];
      if (s.attire) parts.push(`attired in ${s.attire}`);
      return `${s.name} has ${parts.join(', ')}`;
    }).join('. ') + '.';

    sections.push({
      id: 'appearance-wardrobe',
      priority: 0,
      required: true,
      compressible: false,
      text: appearanceText
    });
  }

  // Spatial relationships (P0)
  const spatialText = formatSpatialPlacements(shotSpec);
  if (spatialText) {
    sections.push({
      id: 'spatial-relationships',
      priority: 0,
      required: true,
      compressible: false,
      text: `${spatialText}.`
    });
  }

  // Environment (P1)
  if (brief.scene) {
    sections.push({
      id: 'environment-setting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Set in ${brief.scene.trim()}.`
    });
  }

  // Camera & framing (P1)
  const cameraText = formatCameraFraming(shotSpec);
  if (cameraText) {
    sections.push({
      id: 'camera-framing',
      priority: 1,
      required: false,
      compressible: true,
      text: `Shot composition: ${cameraText}.`
    });
  }

  // Lighting (P1)
  if (brief.lighting) {
    sections.push({
      id: 'scene-lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Lighting is ${brief.lighting.trim()}.`
    });
  }

  // Visual treatment / Style (P2)
  const styleText = formatStyleDNAProse(styleDNA);
  if (styleText) {
    sections.push({
      id: 'visual-style',
      priority: 2,
      required: false,
      compressible: true,
      text: `Art style: ${styleText}.`
    });
  }

  // Constraints & references (P2 / P3)
  const safeAreaText = formatDialogueSafeArea(shotSpec);
  const refDirectives = formatReferenceDirectives(referencePlan);
  const extras = [...(safeAreaText ? [safeAreaText] : []), ...refDirectives];
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
