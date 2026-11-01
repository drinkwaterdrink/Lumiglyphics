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

export function serializeGptImage25(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, complexity, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);
  const useSections = complexity === 'complex' || complexity === 'dense';

  if (!useSections) {
    // Simple / standard scene: natural, fluid prose without section headings
    let subjectProse = '';
    if (brief.subjectMode === 'none') {
      subjectProse = `A high quality visual of ${cue?.visualFocus || brief.action || 'the scene'}.`;
    } else {
      const main = subjects[0];
      if (main) {
        const parts = [main.appearance];
        if (main.attire) parts.push(`dressed in ${main.attire}`);
        const act = (main.action || brief.action || 'shown in the scene').trim();
        const firstName = main.name.split(' ')[0] || main.name;
        const nameRegex = new RegExp(`^(?:${main.name}|${firstName})\\s+`, 'i');
        const cleanAct = nameRegex.test(act) ? act.replace(nameRegex, '') : act;
        if (/^(?:is|stands|standing|sits|sitting|walking|running|looking|holding|clutching|reaching|wearing|facing|turned)\b/i.test(cleanAct)) {
          subjectProse = `${main.name} (${parts.join(', ')}) ${cleanAct}.`.replace(/\.\.+$/, '.');
        } else {
          subjectProse = `${main.name} (${parts.join(', ')}) is ${cleanAct}.`.replace(/\.\.+$/, '.');
        }
      }
    }

    sections.push({
      id: 'subject-action',
      priority: 0,
      required: true,
      compressible: false,
      text: subjectProse
    });

    const cameraText = formatCameraFraming(shotSpec);
    const envText = brief.scene ? `in ${brief.scene.trim()}` : '';
    const lightingText = brief.lighting ? `lit by ${brief.lighting.trim()}` : '';

    if (cameraText || envText || lightingText) {
      const sceneSentence = [
        cameraText ? `Captured with a ${cameraText}` : '',
        envText,
        lightingText
      ].filter(Boolean).join(' ') + '.';

      sections.push({
        id: 'camera-environment',
        priority: 1,
        required: false,
        compressible: true,
        text: sceneSentence
      });
    }

    const styleText = formatStyleDNAProse(styleDNA);
    if (styleText) {
      sections.push({
        id: 'visual-treatment',
        priority: 2,
        required: false,
        compressible: true,
        text: `Illustrated in ${styleText}.`
      });
    }

    const safeArea = formatDialogueSafeArea(shotSpec);
    const refs = formatReferenceDirectives(referencePlan);
    const constraints = [...(safeArea ? [safeArea] : []), ...refs];
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
    const document = createPromptDocument(profile.dialect, sections, negativeSections, undefined, warnings);
    return { document, prompt, negativePrompt: undefined, warnings };
  }

  // Complex / Dense scenes: labeled sections
  // IMAGE
  const orientation = shotSpec.output.actualRatio || shotSpec.output.requestedRatio || 'scene';
  sections.push({
    id: 'sec-image',
    priority: 1,
    required: false,
    compressible: true,
    text: `IMAGE\nA complete ${orientation} visual scene illustrating ${brief.action || 'the story moment'}.`
  });

  // SUBJECTS
  let subjectsText = 'SUBJECTS\n';
  if (brief.subjectMode === 'none') {
    subjectsText += 'No human characters present; focus is entirely on the environment and featured objects.';
  } else {
    subjectsText += subjects.map(s => {
      const parts = [s.appearance];
      if (s.attire) parts.push(`attire: ${s.attire}`);
      return `• ${s.name}: ${parts.join(', ')}`;
    }).join('\n');
  }
  sections.push({
    id: 'sec-subjects',
    priority: 0,
    required: true,
    compressible: false,
    text: subjectsText
  });

  // MOMENT
  const actionText = brief.action ? brief.action.trim() : 'Present in the scene.';
  sections.push({
    id: 'sec-moment',
    priority: 0,
    required: true,
    compressible: false,
    text: `MOMENT\n${actionText}`
  });

  // COMPOSITION
  const cameraText = formatCameraFraming(shotSpec);
  const spatialText = formatSpatialPlacements(shotSpec);
  const compLines = [
    `Framing: ${cameraText}.`,
    spatialText ? `Placements: ${spatialText}.` : ''
  ].filter(Boolean);
  sections.push({
    id: 'sec-composition',
    priority: 1,
    required: false,
    compressible: true,
    text: `COMPOSITION\n${compLines.join('\n')}`
  });

  // LIGHTING
  if (brief.lighting || brief.scene) {
    sections.push({
      id: 'sec-lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: `LIGHTING & ENVIRONMENT\nSetting: ${brief.scene || 'unspecified'}\nLighting: ${brief.lighting || 'natural scene illumination'}`
    });
  }

  // VISUAL TREATMENT
  const styleText = formatStyleDNAProse(styleDNA);
  if (styleText) {
    sections.push({
      id: 'sec-visual-treatment',
      priority: 2,
      required: false,
      compressible: true,
      text: `VISUAL TREATMENT\n${styleText}`
    });
  }

  // CONSTRAINTS
  const constraintsList: string[] = [];
  const safeArea = formatDialogueSafeArea(shotSpec);
  if (safeArea) constraintsList.push(`• Dialogue overlay: ${safeArea}`);
  const refs = formatReferenceDirectives(referencePlan);
  refs.forEach(r => constraintsList.push(`• Reference: ${r}`));
  constraintsList.push('• Maintain crisp anatomy, cohesive spatial coherence, and clean focus without extraneous clutter.');

  sections.push({
    id: 'sec-constraints',
    priority: 2,
    required: false,
    compressible: true,
    text: `CONSTRAINTS\n${constraintsList.join('\n')}`
  });

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join('\n\n');
  const document = createPromptDocument(profile.dialect, sections, negativeSections, undefined, warnings);

  return {
    document,
    prompt,
    negativePrompt: undefined,
    warnings
  };
}
