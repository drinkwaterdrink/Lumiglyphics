import type { VisualBrief } from '../../../shared/image-templates.js';
import type { ImageShotSpec } from '../../../shared/image-shot-spec.js';
import type { StyleDNA } from '../../../shared/style-dna.js';
import type { ReferencePlan, ReferenceItem } from '../../../shared/reference-plan.js';
import type { VisualCue } from '../../../shared/contracts.js';
import { sanitizePoseExpression } from '../../../shared/character.js';

export interface SubjectFact {
  name: string;
  appearance: string;
  attire?: string | undefined;
  action?: string | undefined;
}

/**
 * Cleans embedded NovelAI bracket/emoticon tags inside a brief.action string and removes duplicate trailing pose clauses.
 */
function cleanActionAndDirection(rawAction?: string, rawDirection?: string): string | undefined {
  let act = (rawAction ?? '').trim();
  const dir = (rawDirection ?? '').trim();

  // If act contains raw {{...}} or ^^^ / !? from a stored brief, sanitize its semicolon segments
  if (/\{\{|\[\[|\^\^|!\?|rectangular mouth|wavy mouth/i.test(act)) {
    const segments = act.split(/\s*;\s*/).filter(Boolean);
    const cleanedSegments: string[] = [];
    const seenSegs = new Set<string>();
    for (const seg of segments) {
      const cleanedSeg = /\{\{|\[\[|\^\^|!\?|rectangular mouth|wavy mouth/i.test(seg)
        ? sanitizePoseExpression(seg, {
            keepWeightBrackets: false,
            stripAnimeTropes: true,
            hasActiveSceneAction: segments.length > 1 && segments[0]!.length > 40
          })
        : seg.trim();
      if (!cleanedSeg) continue;
      const norm = cleanedSeg.toLowerCase();
      if (seenSegs.has(norm)) continue;
      seenSegs.add(norm);
      cleanedSegments.push(cleanedSeg);
    }
    act = cleanedSegments.join('; ');
  }

  const cleanDir = /\{\{|\[\[|\^\^|!\?|rectangular mouth|wavy mouth/i.test(dir)
    ? sanitizePoseExpression(dir, {
        keepWeightBrackets: false,
        stripAnimeTropes: true,
        hasActiveSceneAction: act.length > 40
      })
    : dir;

  if (!act && !cleanDir) return undefined;
  if (!cleanDir) return act;
  if (!act) return cleanDir;

  const actLower = act.toLowerCase();
  const dirLower = cleanDir.toLowerCase();
  // Do not append direction if it is already equal to or at the end of brief.action
  if (
    actLower === dirLower ||
    actLower.endsWith(`; ${dirLower}`) ||
    actLower.endsWith(`, ${dirLower}`)
  ) {
    return act;
  }

  return `${act}, ${cleanDir}`;
}

export function parseSubjectsFromBrief(brief: VisualBrief, cue?: VisualCue): SubjectFact[] {
  if (brief.subjectMode === 'none') return [];

  if (brief.subjectMode === 'ensemble') {
    const lines = brief.subjects.split('\n').filter((line: string) => line.includes(':'));
    return lines.map((line: string) => {
      const colon = line.indexOf(':');
      const name = line.slice(0, colon).trim();
      const rest = line.slice(colon + 1).trim();
      return {
        name,
        appearance: rest
      };
    });
  }

  // Single subject
  const name = brief.subjectPreparation?.name || cue?.character || 'Subject';
  const appearance = brief.subjectPreparation?.identity || brief.subjects;
  const attire = brief.subjectPreparation?.attire ?? undefined;
  const action = cleanActionAndDirection(brief.action, brief.subjectPreparation?.direction);

  return [{
    name,
    appearance,
    attire,
    action
  }];
}

export function formatCameraFraming(shotSpec: ImageShotSpec, styleDNA?: StyleDNA): string {
  const parts: string[] = [];
  const customStyleText = [styleDNA?.prefix, styleDNA?.suffix].filter(Boolean).join(' ').toLowerCase();
  const hasCustomLens = Boolean(customStyleText && /\b(?:\d+mm|wide-angle|wide angle|smartphone lens|telephoto|fisheye)\b/i.test(customStyleText));
  const hasCustomDof = Boolean(customStyleText && /\b(?:depth of field|deep focus|shallow focus|background remains in focus|without cinematic lens blur|no bokeh)\b/i.test(customStyleText));
  const hasCustomAngle = Boolean(customStyleText && /\b(?:eye-level|eye level|tilted horizon|off-center framing|low-angle|high-angle|overhead)\b/i.test(customStyleText));

  const sizeMap: Record<string, string> = {
    'extreme-close-up': 'extreme close-up shot',
    'close-up': 'close-up shot',
    'medium-close-up': 'medium close-up framing',
    'medium': 'medium shot',
    'medium-wide': 'medium-wide shot',
    'full-body': 'full-body shot',
    'wide': 'wide shot',
    'establishing': 'wide establishing shot',
    'macro': 'macro detail close-up'
  };
  parts.push(sizeMap[shotSpec.camera.shotSize] || `${shotSpec.camera.shotSize} shot`);

  if (!hasCustomAngle) {
    const angleMap: Record<string, string> = {
      'eye-level': 'eye-level angle',
      'low-angle': 'low-angle viewpoint',
      'high-angle': 'high-angle viewpoint',
      'overhead': 'overhead bird\'s-eye view',
      'ground-level': 'ground-level low perspective',
      'three-quarter': 'three-quarter view',
      'profile': 'side profile view',
      'over-the-shoulder': 'over-the-shoulder perspective'
    };
    parts.push(angleMap[shotSpec.camera.angle] || shotSpec.camera.angle);
  }

  if (!hasCustomLens && shotSpec.camera.lens && shotSpec.camera.lens !== 'unspecified') {
    const lensMap: Record<string, string> = {
      'ultrawide': 'ultrawide lens feel',
      'wide': 'wide-angle lens',
      'normal': 'natural 50mm lens perspective',
      'portrait': 'portrait focal length',
      'telephoto': 'telephoto lens compression',
      'macro': 'macro lens magnification'
    };
    parts.push(lensMap[shotSpec.camera.lens] || `${shotSpec.camera.lens} lens`);
  }

  if (!hasCustomDof && shotSpec.camera.depthOfField) {
    const dofMap: Record<string, string> = {
      'shallow': 'shallow depth of field with gentle background blur',
      'moderate': 'moderate depth of field',
      'deep': 'deep focus across all layers',
      'selective': 'selective crisp focus on the main subject'
    };
    parts.push(dofMap[shotSpec.camera.depthOfField] || `${shotSpec.camera.depthOfField} depth of field`);
  }

  return parts.join(', ');
}

export function formatSpatialPlacements(shotSpec: ImageShotSpec): string {
  if (!shotSpec.composition.subjectPlacements || shotSpec.composition.subjectPlacements.length <= 1) {
    return '';
  }

  const descriptions = shotSpec.composition.subjectPlacements.map((p) => {
    const posParts: string[] = [];
    if (p.depth) posParts.push(`in the ${p.depth}`);
    if (p.horizontal) posParts.push(`on the ${p.horizontal.replace('-', ' ')}`);
    return `${p.subject} positioned ${posParts.join(', ')}`;
  });

  return descriptions.join('; ');
}

export function formatDialogueSafeArea(shotSpec: ImageShotSpec): string | null {
  if (!shotSpec.safeArea) return null;
  const edge = shotSpec.safeArea.edge;
  const pct = Math.round(shotSpec.safeArea.fraction * 100);
  return `Keep faces, hands and key focal action above the ${edge} ${pct}% of the frame; reserve that region as quiet visual space for the dialogue overlay.`;
}

export function formatStyleDNAProse(styleDNA: StyleDNA): string {
  const parts: string[] = [];
  const cleanMedium = styleDNA.medium?.replace(/[,;:\s]+$/, '').trim();
  const cleanPrefix = styleDNA.prefix?.replace(/[,;:\s]+$/, '').trim();
  // If prefix is present and identical to medium, compileModelPrompt emits prefix at P0 so we don't duplicate it here
  if (cleanMedium && cleanMedium !== cleanPrefix) {
    parts.push(cleanMedium);
  }
  if (styleDNA.rendering && styleDNA.rendering.length > 0) parts.push(...styleDNA.rendering);
  if (styleDNA.linework && styleDNA.linework.length > 0) parts.push(...styleDNA.linework);
  if (styleDNA.shading && styleDNA.shading.length > 0) parts.push(...styleDNA.shading);
  if (styleDNA.realism && styleDNA.realism.length > 0) parts.push(...styleDNA.realism);
  if (styleDNA.surface && styleDNA.surface.length > 0) parts.push(...styleDNA.surface);
  if (styleDNA.atmosphere && styleDNA.atmosphere.length > 0) parts.push(...styleDNA.atmosphere);
  if (styleDNA.lightingOverlay?.type) parts.push(styleDNA.lightingOverlay.type);
  if (styleDNA.palette && styleDNA.palette.length > 0) parts.push(`palette of ${styleDNA.palette.join(', ')}`);
  if (styleDNA.texture && styleDNA.texture.length > 0) parts.push(...styleDNA.texture);
  return parts.join(', ');
}

export function formatReferenceDirectives(referencePlan?: ReferencePlan): string[] {
  if (!referencePlan || !referencePlan.references || referencePlan.references.length === 0) {
    return [];
  }

  return referencePlan.references.map((ref: ReferenceItem, idx: number) => {
    const num = idx + 1;
    if (ref.role === 'identity' && ref.subject) {
      return `Use reference image ${num} specifically for ${ref.subject}'s facial identity and hair; follow the scene prompt for current pose, outfit, and setting.`;
    }
    if (ref.role === 'clothing' && ref.subject) {
      return `Use reference image ${num} for ${ref.subject}'s clothing details.`;
    }
    if (ref.role === 'style') {
      return `Use reference image ${num} for overall artistic rendering style.`;
    }
    return `Use reference image ${num} as a visual reference.`;
  });
}
