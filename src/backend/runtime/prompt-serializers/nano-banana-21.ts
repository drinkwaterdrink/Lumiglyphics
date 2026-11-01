import { createPromptDocument, type PromptSection } from '../../../shared/prompt-document.js';
import type { SerializerInput, SerializerResult } from './types.js';
import {
  parseSubjectsFromBrief,
  formatCameraFraming,
  formatDialogueSafeArea,
  formatStyleDNAProse,
  formatReferenceDirectives
} from './helpers.js';

export function serializeNanoBanana21(input: SerializerInput): SerializerResult {
  const { brief, shotSpec, styleDNA, profile, referencePlan, complexity, cue } = input;
  const warnings: string[] = [];
  const sections: PromptSection[] = [];
  const negativeSections: PromptSection[] = [];

  const subjects = parseSubjectsFromBrief(brief, cue);
  const useStructuredLayout = complexity === 'complex' || complexity === 'dense';

  if (!useStructuredLayout) {
    // Simple / standard scene: rich natural language
    let subjectAction = '';
    if (brief.subjectMode === 'none') {
      subjectAction = `A detailed view featuring ${cue?.visualFocus || brief.action || 'the scene'}, free of any bystanders or extra people.`;
    } else {
      const main = subjects[0];
      const attire = main?.attire ? `wearing ${main.attire}` : '';
      subjectAction = `${main?.name || 'The subject'}, distinguished by ${main?.appearance || 'unique characteristics'} and ${attire || 'regular clothes'}, is ${main?.action || brief.action || 'standing in the scene'}.`;
    }

    sections.push({
      id: 'subject-action',
      priority: 0,
      required: true,
      compressible: false,
      text: subjectAction
    });

    const cameraText = formatCameraFraming(shotSpec);
    if (cameraText) {
      sections.push({
        id: 'camera',
        priority: 1,
        required: false,
        compressible: true,
        text: `Camera perspective: ${cameraText}.`
      });
    }

    if (brief.scene) {
      sections.push({
        id: 'setting',
        priority: 1,
        required: false,
        compressible: true,
        text: `Environment and background: ${brief.scene.trim()}.`
      });
    }

    if (brief.lighting) {
      sections.push({
        id: 'lighting',
        priority: 1,
        required: false,
        compressible: true,
        text: `Lighting atmosphere: ${brief.lighting.trim()}.`
      });
    }

    const styleText = formatStyleDNAProse(styleDNA);
    if (styleText) {
      sections.push({
        id: 'style',
        priority: 2,
        required: false,
        compressible: true,
        text: `Render style: ${styleText}.`
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

  // Complex / Dense: structured spatial hierarchy
  const ratio = shotSpec.output.actualRatio || shotSpec.output.requestedRatio || 'scene';
  sections.push({
    id: 'header',
    priority: 1,
    required: false,
    compressible: true,
    text: `Create one coherent ${ratio} scene.`
  });

  // Placements into foreground, midground, background
  const placements = shotSpec.composition.subjectPlacements || [];
  const fg = placements.filter(p => p.depth === 'foreground').map(p => p.subject).join(', ');
  const mg = placements.filter(p => p.depth === 'midground').map(p => p.subject).join(', ');
  const bg = placements.filter(p => p.depth === 'background').map(p => p.subject).join(', ');

  sections.push({
    id: 'foreground',
    priority: 1,
    required: false,
    compressible: true,
    text: `Foreground:\n${fg ? `${fg} in the foreground with focal clarity.` : 'Clean foreground leading into the scene.'}`
  });

  sections.push({
    id: 'midground',
    priority: 1,
    required: false,
    compressible: true,
    text: `Midground:\n${mg ? `${mg} in the midground.` : 'Main focal area.'}`
  });

  sections.push({
    id: 'background',
    priority: 1,
    required: false,
    compressible: true,
    text: `Background:\n${bg ? `${bg} positioned in the background.` : ''} ${brief.scene || 'atmospheric background depth'}`.trim()
  });

  // Action / Moment
  if (brief.action) {
    sections.push({
      id: 'action-moment',
      priority: 0,
      required: true,
      compressible: false,
      text: `Action:\n${brief.action.trim()}`
    });
  }

  // Characters
  let charactersText = 'Characters:\n';
  if (brief.subjectMode === 'none') {
    charactersText += 'Empty scene with no human figures or characters.';
  } else {
    charactersText += subjects.map(s => {
      const parts = [s.appearance];
      if (s.attire) parts.push(`attired in ${s.attire}`);
      return `• ${s.name}: ${parts.join(', ')}`;
    }).join('\n');
  }
  sections.push({
    id: 'characters',
    priority: 0,
    required: true,
    compressible: false,
    text: charactersText
  });

  // Camera
  const cameraText = formatCameraFraming(shotSpec);
  sections.push({
    id: 'camera',
    priority: 1,
    required: false,
    compressible: true,
    text: `Camera:\n${cameraText}.`
  });

  // Lighting
  if (brief.lighting) {
    sections.push({
      id: 'lighting',
      priority: 1,
      required: false,
      compressible: true,
      text: `Lighting:\n${brief.lighting.trim()}.`
    });
  }

  // Preserve & Style
  const styleText = formatStyleDNAProse(styleDNA);
  const safeArea = formatDialogueSafeArea(shotSpec);
  const refs = formatReferenceDirectives(referencePlan);
  const preserveLines = [
    styleText ? `Visual medium: ${styleText}.` : '',
    safeArea ? safeArea : '',
    ...refs,
    'Semantic negative: an uncluttered scene free of stray artifacts, deformed limbs, or extra unlisted characters.'
  ].filter(Boolean);

  sections.push({
    id: 'preserve',
    priority: 2,
    required: false,
    compressible: true,
    text: `Preserve:\n${preserveLines.join('\n')}`
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
