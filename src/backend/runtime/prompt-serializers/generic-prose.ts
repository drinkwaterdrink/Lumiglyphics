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

export function serializeGenericProse(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, cue } = input;
  const warnings: string[] = ['Model-specific prompting profile unavailable; using conservative generic prompting.'];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);

  // Subject and Action (P0)
  let subjectText = '';
  if (brief.subjectMode === 'none') {
    subjectText = `A view of ${cue?.visualFocus || brief.action || 'the scene'}, no people visible.`;
  } else if (brief.subjectMode === 'ensemble') {
    subjectText = `A group of ${subjects.length} people: ${subjects.map(s => `${s.name} (${s.appearance})`).join(', ')}. Action: ${brief.action || 'together'}.`;
  } else {
    const main = subjects[0];
    const attire = main?.attire ? `, wearing ${main.attire}` : '';
    const rawAct = (main?.action || brief.action || 'in scene').trim();
    const firstName = main?.name ? (main.name.split(' ')[0] || main.name) : '';
    const nameRegex = firstName ? new RegExp(`^(?:${main?.name}|${firstName})\\s+`, 'i') : null;
    const cleanAct = nameRegex && nameRegex.test(rawAct) ? rawAct.replace(nameRegex, '') : rawAct;
    const isNarrativeBlock = cleanAct.includes('. ') || cleanAct.length > 120 || /^[A-Z]/.test(cleanAct);
    if (isNarrativeBlock) {
      subjectText = `Subject: ${main?.name || 'Character'} (${main?.appearance || 'distinct traits'}${attire}). Scene action: ${cleanAct}.`.replace(/\.\.+$/, '.');
    } else {
      subjectText = `${main?.name || 'Character'} with ${main?.appearance || 'distinct traits'}${attire}, currently ${cleanAct}.`.replace(/\.\.+$/, '.');
    }
  }

  sections.push({
    id: 'subject-action',
    priority: 0,
    required: true,
    compressible: false,
    text: subjectText
  });

  if (shotSpec.composition.stagingNote || shotSpec.composition.subjectPlacements.some(p => p.blocking)) {
    const spatialText = formatSpatialPlacements(shotSpec);
    if (spatialText) {
      sections.push({
        id: 'spatial-staging',
        priority: 0,
        required: false,
        compressible: true,
        text: `Scene staging: ${spatialText}.`
      });
    }
  }

  // Camera & Framing (P1)
  const cameraText = formatCameraFraming(shotSpec, styleDNA);
  if (cameraText) {
    sections.push({
      id: 'camera',
      priority: 1,
      required: false,
      compressible: true,
      text: `Framing: ${cameraText}.`
    });
  }

  // Environment (P1)
  if (brief.scene) {
    sections.push({
      id: 'environment',
      priority: 1,
      required: false,
      compressible: true,
      text: `Setting: ${brief.scene.trim()}.`
    });
  }

  // Lighting (P1)
  if (brief.lighting) {
    sections.push({
      id: 'lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Lighting: ${brief.lighting.trim()}.`
    });
  }

  // Style (P2)
  const styleText = formatStyleDNAProse(styleDNA);
  if (styleText) {
    sections.push({
      id: 'style',
      priority: 2,
      required: false,
      compressible: true,
      text: `Art style: ${styleText}.`
    });
  }

  // Dialogue safe area & references (P2)
  const safeArea = formatDialogueSafeArea(shotSpec);
  const refs = formatReferenceDirectives(input.referencePlan);
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
