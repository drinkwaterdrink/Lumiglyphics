import type { PromptDocument } from './prompt-document.js';
import type { ImagePromptProfileV2 } from './image-prompt-profile-v2.js';
import type { VisualBrief } from './image-templates.js';
import type { ImageShotSpec } from './image-shot-spec.js';
import type { ReferencePlan } from './reference-plan.js';
import type { VisualCue } from './contracts.js';

export interface PromptLintOptions {
  prompt: string;
  negativePrompt?: string | undefined;
  document?: PromptDocument;
  profile: ImagePromptProfileV2;
  brief?: VisualBrief|undefined;
  shotSpec?: ImageShotSpec;
  referenceAttachmentKnown?: boolean;
  referencePlan?: ReferencePlan | undefined;
  cue?: VisualCue | undefined;
}

export interface PromptLintResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function lintCompiledPrompt(options: PromptLintOptions): PromptLintResult {
  const { prompt, negativePrompt, profile, referencePlan } = options;
  const brief=options.brief??{subjectMode:'none',subjects:''};
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalLength = prompt.length + (negativePrompt?.length ?? 0);

  // 1. Hard budget exceeded (blocking)
  if (totalLength > profile.hardMaxCharacters) {
    errors.push(`Hard prompt character limit exceeded: ${totalLength} / ${profile.hardMaxCharacters} characters.`);
  }

  // 2. Unsupported negative prompt for positive-only model
  if (profile.negativePolicy === 'positive-only' && negativePrompt && negativePrompt.trim().length > 0) {
    warnings.push(`Model "${profile.exactModel}" uses a positive-only policy, but a separate negative prompt was provided.`);
  }

  // 3. Missing visible character in ensemble
  if (brief.subjectMode === 'ensemble' && brief.subjects) {
    const lines = brief.subjects.split('\n').filter(line => line.includes(':'));
    for (const line of lines) {
      const name = line.slice(0, line.indexOf(':')).trim();
      if (name && !prompt.toLowerCase().includes(name.toLowerCase())) {
        warnings.push(`Ensemble character "${name}" was not found in the compiled prompt.`);
      }
    }
  }

  // 4. Cast count mismatch (e.g. ensemble marked as solo)
  if (brief.subjectMode === 'ensemble') {
    const memberCount = brief.subjects.split('\n').filter(line => line.includes(':')).length;
    if (memberCount > 1 && /\b(solo|1girl|1boy|1person)\b/i.test(prompt)) {
      warnings.push(`Ensemble scene with ${memberCount} characters contains a solo/single-subject tag.`);
    }
  }

  // 5. Grok Imagine 2.0 starts with style instead of subject
  if (profile.dialect === 'grok-imagine-2') {
    const trimmed = prompt.trim().toLowerCase();
    const bannedStyleStarters = [
      'cinematic',
      'masterpiece',
      'anime illustration',
      'oil painting',
      'photograph',
      'digital art',
      'film grain',
      'atmospheric illustration',
      '2d anime'
    ];
    for (const starter of bannedStyleStarters) {
      if (trimmed.startsWith(starter)) {
        warnings.push(`Grok Imagine 2.0 prompt begins with style "${starter}"; xAI guidelines require subject-first ordering.`);
        break;
      }
    }
  }

  // 6. Suspiciously sparse FLUX.3 Klein prompt
  if (profile.dialect === 'flux3-klein' && prompt.length < 250 && brief.subjectMode !== 'none') {
    warnings.push(`FLUX.3 Klein prompt is short (${prompt.length} chars); BFL guidelines recommend full scene captions.`);
  }

  // 7. Giant prose essay sent to Anima
  if (profile.dialect === 'anima' && prompt.length > 1200 && !prompt.includes(',')) {
    warnings.push(`Anima prompt is long uninterrupted prose (${prompt.length} chars); Anima expects tag-first hybrid syntax.`);
  }

  // 8. Excessive Seedream verbosity (> 600 words)
  if (profile.dialect === 'seedream-5') {
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > 600) {
      warnings.push(`Seedream 5 Pro prompt word count (${wordCount}) exceeds the recommended 600-word limit; attention may be scattered.`);
    }
  }

  // 9. Claimed reference that is not attached
  const referencesAttached = referencePlan?.references && referencePlan.references.length > 0;
  if (options.referenceAttachmentKnown!==false && !referencesAttached && /reference image \d+|use the reference/i.test(prompt)) {
    warnings.push('Prompt refers to reference images, but no reference images are attached to this request.');
  }

  // 10. Contradictory camera directions
  const lower = prompt.toLowerCase();
  if (lower.includes('close-up') && lower.includes('wide establishing shot')) {
    warnings.push('Prompt contains contradictory camera framing directions (close-up and wide establishing shot).');
  }
  if (lower.includes('overhead') && lower.includes('ground-level')) {
    warnings.push('Prompt contains contradictory camera angle directions (overhead and ground-level).');
  }

  // 11. Qwen Image 3 double expansion risk
  if (profile.dialect === 'qwen-image-3' && profile.promptExpansion?.enabled && prompt.length > 1000) {
    warnings.push(`Qwen Image 3 prompt is long (${prompt.length} chars) with prompt expansion enabled; double expansion may occur.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
