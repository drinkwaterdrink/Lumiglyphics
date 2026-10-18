import type { VisualCue } from './contracts.js';

export type ImageDiagnostic = {
  status: 'resolved' | 'no_people' | 'needs_subject' | 'needs_appearance' | 'generation_failed' | 'unavailable';
  subject?: string;
  template?: string;
  tracker: string;
  planner?: 'model' | 'fallback';
  explanation: string;
};

/** A bounded projection of the resolved cue, never another identity resolver.
 * Intentionally excludes chat text, appearance bodies, provider errors and secrets.
 */
export function imageDiagnostic(cue: VisualCue | undefined, failed: boolean): ImageDiagnostic {
  const common = { tracker: cue?.trackerStatus ?? 'unavailable',
    ...(cue?.imageTemplate?.name ? { template: cue.imageTemplate.name.slice(0, 120) } : {}),
    ...(cue?.character ? { subject: cue.character.slice(0, 160) } : {}) };
  if (!cue) return { ...common, status: 'unavailable', explanation: 'This older picture has no resolved subject metadata.' };
  if (cue.imageTemplate?.subjectMode === 'ensemble') return {...common,status:failed?'generation_failed':'resolved',explanation:'Ensemble scene uses the named visible cast and persona descriptions. Review the prepared cast blocks; character references and single-person portrait reuse are omitted.'};
  if (cue.imageTemplate?.subjectMode !== 'none') {
    if (!cue.character && !cue.characterId) return { ...common, status: 'needs_subject', explanation: 'No person was selected. Choose a named character, or use a no-people template.' };
    if (cue.resolvedIdentity !== undefined && !cue.resolvedIdentity.trim()) return { ...common, status: 'needs_appearance', explanation: 'The selected person has no usable visual description. Supply appearance details for this picture. Another character will not be substituted.' };
    if (cue.resolvedIdentity === undefined) return { ...common, status: 'unavailable', explanation: 'This older cue has no resolved appearance metadata. Inspect its recorded request rather than assuming the description was verified.' };
  }
  if (failed) return { ...common, status: 'generation_failed', explanation: 'Subject checks did not identify a missing appearance. Inspect the request and technical error; changing the subject may not fix a provider or preparation failure.' };
  return { ...common, status: cue.imageTemplate?.subjectMode === 'none' ? 'no_people' : 'resolved', explanation: cue.imageTemplate?.subjectMode === 'none' ? 'This template does not need character appearance or character references.' : 'A visual subject is available. This does not guarantee provider support or image quality.' };
}
