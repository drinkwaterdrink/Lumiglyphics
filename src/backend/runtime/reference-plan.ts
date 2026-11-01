import {
  type ReferencePlan,
  type ReferenceItem,
  type ReferenceRole,
  createReferencePlan
} from '../../shared/reference-plan.js';
import type { VisualBrief } from '../../shared/image-templates.js';
import type { VisualCue } from '../../shared/contracts.js';
import type { StoredPortrait } from './storage.js';
import { normalizeCharacterName } from '../../shared/identity.js';

export * from '../../shared/reference-plan.js';

export interface ResolveReferencePlanOptions {
  brief?: VisualBrief | undefined;
  cue?: VisualCue | undefined;
  portraits?: Record<string, StoredPortrait | undefined> | undefined;
  referenceImages?: Array<{ data: string; mimeType?: string; label?: string; role?: ReferenceRole }> | undefined;
}

/**
 * Resolves an explicit ReferencePlan for the scene.
 * Only includes references that are genuinely attached.
 * Never writes "use the reference image" when no image is being supplied.
 */
export function resolveReferencePlan(options: ResolveReferencePlanOptions): ReferencePlan {
  const references: ReferenceItem[] = [];

  // 1. Explicit reference images passed directly
  if (options.referenceImages && options.referenceImages.length > 0) {
    for (let i = 0; i < options.referenceImages.length; i++) {
      const item = options.referenceImages[i]!;
      references.push({
        imageId: `ref-${i + 1}`,
        role: item.role ?? 'identity',
        label: item.label ?? `Reference Image ${i + 1}`,
        mimeType: item.mimeType ?? 'image/png'
      });
    }
    return createReferencePlan(references);
  }

  // 2. Character portrait reference from cue/brief
  if (options.cue && options.portraits) {
    const characterName = options.cue.character || options.brief?.subjectPreparation?.name;
    if (characterName) {
      const normalized = normalizeCharacterName(characterName);
      // Check for matching portrait
      const portrait = Object.entries(options.portraits).find(([key, p]) => {
        if (!p) return false;
        const normalizedKey = normalizeCharacterName(key.replace(/^card:/, ''));
        return normalizedKey === normalized;
      })?.[1];

      if (portrait && portrait.data) {
        references.push({
          imageId: `portrait-${normalized || 'main'}`,
          role: 'identity',
          subject: characterName,
          label: `${characterName} character portrait`,
          mimeType: portrait.mimeType ?? 'image/png'
        });
      }
    }
  }

  return createReferencePlan(references);
}
