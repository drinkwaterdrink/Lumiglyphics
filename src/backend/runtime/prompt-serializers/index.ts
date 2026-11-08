import type { PromptDialectId } from '../../../shared/image-prompt-profile-v2.js';
import type { PromptSerializer } from './types.js';
import { serializeFlux3Klein } from './flux3-klein.js';
import { serializeFlux3 } from './flux3.js';
import { serializeGptImage25 } from './gpt-image-25.js';
import { serializeGrokImagine2 } from './grok-imagine-2.js';
import { serializeQwenImage3 } from './qwen-image-3.js';
import { serializeNanoBanana21 } from './nano-banana-21.js';
import { serializeSeedream5 } from './seedream-5.js';
import { serializeAnima } from './anima.js';
import { serializeGenericProse } from './generic-prose.js';
import { serializeGenericTags } from './generic-tags.js';
import { serializeIdeogramV4 } from './ideogram-v4.js';

export * from './types.js';
export * from './helpers.js';
export { serializeFlux3Klein } from './flux3-klein.js';
export { serializeFlux3 } from './flux3.js';
export { serializeGptImage25 } from './gpt-image-25.js';
export { serializeGrokImagine2 } from './grok-imagine-2.js';
export { serializeQwenImage3 } from './qwen-image-3.js';
export { serializeNanoBanana21 } from './nano-banana-21.js';
export { serializeSeedream5 } from './seedream-5.js';
export { serializeAnima } from './anima.js';
export { serializeGenericProse } from './generic-prose.js';
export { serializeGenericTags } from './generic-tags.js';
export { serializeIdeogramV4 } from './ideogram-v4.js';

const SERIALIZER_MAP: Record<PromptDialectId, PromptSerializer> = {
  'flux3-klein': serializeFlux3Klein,
  'flux3': serializeFlux3,
  'gpt-image-2.5': serializeGptImage25,
  'grok-imagine-2': serializeGrokImagine2,
  'qwen-image-3': serializeQwenImage3,
  'nano-banana-2.1': serializeNanoBanana21,
  'seedream-5': serializeSeedream5,
  'anima': serializeAnima,
  'novelai': serializeAnima,
  'generic-prose': serializeGenericProse,
  'generic-tags': serializeGenericTags,
  'ideogram-v4': serializeIdeogramV4
};

export function getPromptSerializer(dialect: PromptDialectId): PromptSerializer {
  return SERIALIZER_MAP[dialect] ?? serializeGenericProse;
}
