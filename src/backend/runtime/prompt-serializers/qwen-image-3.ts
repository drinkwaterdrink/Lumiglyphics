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

export function serializeQwenImage3(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const expansionOn = profile.promptExpansion?.enabled ?? true;
  const isQwen21 = profile.exactModel.includes('2.1') || profile.family.includes('2.1');
  const subjects = parseSubjectsFromBrief(brief, cue);

  if (expansionOn) {
    // Shorter, precise prompt to avoid double-expansion by the provider's LLM
    let subjectText = '';
    if (brief.subjectMode === 'none') {
      subjectText = `${cue?.visualFocus || brief.action || 'scenic view'}, no people`;
    } else if (brief.subjectMode === 'ensemble') {
      subjectText = `${subjects.length} characters (${subjects.map(s => `${s.name}: ${s.appearance}`).join(', ')}), ${brief.action || ''}`.trim();
    } else {
      const main = subjects[0];
      const attire = main?.attire ? `, wearing ${main.attire}` : '';
      subjectText = `${main?.name || 'character'} (${main?.appearance || ''}${attire}), ${main?.action || brief.action || 'in scene'}`.trim();
    }

    sections.push({
      id: 'subject-action-compact',
      priority: 0,
      required: true,
      compressible: false,
      text: subjectText
    });

    const cameraText = formatCameraFraming(shotSpec);
    if (cameraText) {
      sections.push({
        id: 'camera',
        priority: 1,
        required: false,
        compressible: true,
        text: cameraText
      });
    }

    if (brief.scene) {
      sections.push({
        id: 'setting',
        priority: 1,
        required: false,
        compressible: true,
        text: brief.scene.trim()
      });
    }

    if (styleDNA.medium) {
      sections.push({
        id: 'style',
        priority: 2,
        required: false,
        compressible: true,
        text: styleDNA.medium
      });
    }

    const safeArea = formatDialogueSafeArea(shotSpec);
    if (safeArea) {
      sections.push({
        id: 'safe-area',
        priority: 2,
        required: false,
        compressible: true,
        text: safeArea
      });
    }

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
  } else {
    // Expansion OFF: fuller self-contained visual brief
    let subjectText = '';
    if (brief.subjectMode === 'none') {
      subjectText = `A detailed composition featuring ${cue?.visualFocus || brief.action || 'the scene'} without people.`;
    } else if (brief.subjectMode === 'ensemble') {
      subjectText = `An ensemble of ${subjects.length} characters: ${subjects.map(s => `${s.name} (${s.appearance}${s.attire ? `, wearing ${s.attire}` : ''})`).join('; ')}. Current action: ${brief.action || 'standing in scene'}.`;
    } else {
      const main = subjects[0];
      const parts = [main?.appearance];
      if (main?.attire) parts.push(`attired in ${main.attire}`);
      subjectText = `${main?.name || 'The subject'} is featured with ${parts.join(', ')}. Action: ${main?.action || brief.action || 'present in the scene'}.`;
    }

    sections.push({
      id: 'subject-action-full',
      priority: 0,
      required: true,
      compressible: false,
      text: subjectText
    });

    const spatialText = formatSpatialPlacements(shotSpec);
    if (spatialText) {
      sections.push({
        id: 'spatial',
        priority: 0,
        required: true,
        compressible: false,
        text: `${spatialText}.`
      });
    }

    const cameraText = formatCameraFraming(shotSpec);
    if (cameraText) {
      sections.push({
        id: 'camera',
        priority: 1,
        required: false,
        compressible: true,
        text: `Framing and camera: ${cameraText}.`
      });
    }

    if (brief.scene) {
      sections.push({
        id: 'environment',
        priority: 1,
        required: false,
        compressible: true,
        text: `Environment: ${brief.scene.trim()}.`
      });
    }

    if (brief.lighting) {
      sections.push({
        id: 'lighting',
        priority: 1,
        required: false,
        compressible: true,
        text: `Lighting: ${brief.lighting.trim()}.`
      });
    }

    const styleText = formatStyleDNAProse(styleDNA);
    if (styleText) {
      sections.push({
        id: 'style',
        priority: 2,
        required: false,
        compressible: true,
        text: `Visual style: ${styleText}.`
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
  }

  // Negative prompt policy
  let negativePrompt: string | undefined = undefined;
  if (!isQwen21 && profile.negativePolicy === 'native') {
    negativeSections.push({
      id: 'native-negative',
      priority: 1,
      required: false,
      compressible: true,
      text: 'blurry, low quality, distorted anatomy, extra limbs, malformed hands, oversaturated, bad proportions'
    });
    negativePrompt = negativeSections.map(s => s.text.trim()).join(', ');
  }

  const prompt = sections.map(s => s.text.trim()).filter(Boolean).join(expansionOn ? ', ' : ' ');

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
