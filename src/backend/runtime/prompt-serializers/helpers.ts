import type { VisualBrief } from '../../../shared/image-templates.js';
import type { ImageShotSpec } from '../../../shared/image-shot-spec.js';
import type { StyleDNA } from '../../../shared/style-dna.js';
import type { ReferencePlan, ReferenceItem } from '../../../shared/reference-plan.js';
import type { VisualCue } from '../../../shared/contracts.js';

export interface SubjectFact {
  name: string;
  appearance: string;
  attire?: string | undefined;
  action?: string | undefined;
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
  const action = [brief.action, brief.subjectPreparation?.direction].filter(Boolean).join(', ') || undefined;

  return [{
    name,
    appearance,
    attire,
    action
  }];
}

export function formatCameraFraming(shotSpec: ImageShotSpec): string {
  const parts: string[] = [];

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

  if (shotSpec.camera.lens && shotSpec.camera.lens !== 'unspecified') {
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

  if (shotSpec.camera.depthOfField) {
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
  if (styleDNA.medium) parts.push(styleDNA.medium);
  if (styleDNA.rendering && styleDNA.rendering.length > 0) parts.push(...styleDNA.rendering);
  if (styleDNA.linework && styleDNA.linework.length > 0) parts.push(...styleDNA.linework);
  if (styleDNA.shading && styleDNA.shading.length > 0) parts.push(...styleDNA.shading);
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
