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

export function serializeFlux3Klein(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];
  const parameterHints: Record<string, unknown> = {};

  const subjects = parseSubjectsFromBrief(brief, cue);

  // 1. Principal subject(s) & current action (P0)
  const actionText = brief.action ? brief.action.trim() : '';
  let subjectActionText = '';

  if (brief.subjectMode === 'none') {
    const focus = cue?.visualFocus || (brief.action ? brief.action : 'Detailed visual scene');
    subjectActionText = `A detailed view with no visible people. ${focus}.`.trim();
  } else if (brief.subjectMode === 'ensemble') {
    subjectActionText = `An ensemble scene featuring ${subjects.length} visible characters: ${subjects.map(s => s.name).join(', ')}. ${actionText}`.trim();
  } else {
    const main = subjects[0];
    if (main) {
      const act = (main.action || actionText || '').trim();
      if (act) {
        const firstName = main.name.split(' ')[0] || main.name;
        const nameRegex = new RegExp(`^(?:${main.name}|${firstName})\\s+`, 'i');
        if (nameRegex.test(act)) {
          subjectActionText = `${act}.`.replace(/\.\.+$/, '.');
        } else if (/^(?:is|stands|standing|sits|sitting|walking|running|looking|holding|clutching|reaching|wearing|facing|turned)\b/i.test(act)) {
          subjectActionText = `${main.name} ${act}.`.replace(/\.\.+$/, '.');
        } else {
          subjectActionText = `${main.name} is ${act}.`.replace(/\.\.+$/, '.');
        }
      } else {
        subjectActionText = `${main.name} is present in the scene.`;
      }
    }
  }

  sections.push({
    id: 'subject-action',
    priority: 0,
    required: true,
    compressible: false,
    text: subjectActionText
  });

  // 2. Established appearance & current clothing (P0)
  if (subjects.length > 0) {
    const appearanceLines = subjects.map(s => {
      const parts: string[] = [];
      if (s.appearance) parts.push(s.appearance);
      if (s.attire) parts.push(`wearing ${s.attire}`);
      return `${s.name}: ${parts.join(', ')}`;
    });

    sections.push({
      id: 'appearance-wardrobe',
      priority: 0,
      required: true,
      compressible: false,
      text: appearanceLines.join('. ') + '.'
    });
  }

  // 3. Physical & spatial relationships (P0)
  const spatialText = formatSpatialPlacements(shotSpec);
  if (spatialText) {
    sections.push({
      id: 'spatial-relationships',
      priority: 0,
      required: true,
      compressible: false,
      text: spatialText + '.'
    });
  }

  // Layout boxes parameter hint if feature is enabled and placements have coordinates
  if (profile.features.layoutBoxes && shotSpec.composition.subjectPlacements) {
    const boxes = shotSpec.composition.subjectPlacements
      .filter((p): p is typeof p & { box: [number, number, number, number] } => Boolean(p.box && p.box.length === 4))
      .map(p => ({ label: p.subject, box: p.box }));
    if (boxes.length > 0) {
      parameterHints['layout_boxes'] = boxes;
    }
  }

  // 4. Camera & framing (P1)
  const cameraText = formatCameraFraming(shotSpec);
  if (cameraText) {
    sections.push({
      id: 'camera-framing',
      priority: 1,
      required: false,
      compressible: true,
      text: `Photographed as a ${cameraText}.`
    });
  }

  // 5. Environment & setting (P1)
  if (brief.scene) {
    sections.push({
      id: 'environment-setting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Setting: ${brief.scene.trim()}.`
    });
  }

  // 6. Scene lighting (P1)
  if (brief.lighting) {
    sections.push({
      id: 'scene-lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Lighting: ${brief.lighting.trim()}.`
    });
  }

  // 7. Concrete visual style (P2)
  const styleText = formatStyleDNAProse(styleDNA);
  if (styleText) {
    sections.push({
      id: 'visual-style',
      priority: 2,
      required: false,
      compressible: true,
      text: `Rendered in ${styleText}.`
    });
  }

  // 8. Targeted constraints & references (P2 / P3)
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

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join(' ');

  if (prompt.length < 250 && input.complexity !== 'simple') {
    warnings.push('FLUX.3 Klein prompt is short for the scene complexity; Klein produces best results with complete descriptive captions.');
  }

  const document = createPromptDocument(
    profile.dialect,
    sections,
    negativeSections,
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
