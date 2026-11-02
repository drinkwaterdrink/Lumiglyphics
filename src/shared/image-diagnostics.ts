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

/** Versioned display projection. It deliberately cannot carry prompts, secrets or raw reasoning. */
export type PictureExplanation={version:1;cue?:{kind:'flattened_scene'|'background'|'sprite';paragraphIndex:number};template?:string;framing?:import('./image-templates.js').ImageTemplate['framing'];selection?:'manual';identity?:NonNullable<import('./image-templates.js').VisualBrief['subjectPreparation']>['identitySource'];sources:string[];cache?:'reused'|'provider';review?:import('./image-review.js').ImageRequestRecord['state']};
export function pictureExplanation(input:{cue?:VisualCue|undefined;metadata?:import('./image-templates.js').ImagePromptMetadata|undefined;reviewState?:import('./image-review.js').ImageRequestRecord['state']|undefined;cached?:boolean}):PictureExplanation {
 const {cue,metadata,reviewState,cached}=input;
 const sourceLabels:Record<string,string>={'scene context':'Scene context','saved appearance':'Saved appearance','character DNA matrix':'Character DNA','named cast and persona appearance snapshot':'Visible cast snapshot','manual subject correction':'Manual subject correction','manual artwork replacement':'Manual artwork replacement'};
 const template=metadata?.template??cue?.imageTemplate;
 const sources=[...new Set((metadata?.brief.sources??cue?.visualSources??[]).slice(0,24).map(source=>sourceLabels[source]).filter((value):value is string=>Boolean(value)))];
 const identity=metadata?.brief.subjectPreparation?.identitySource;
 return {version:1,sources,...(cue?{cue:{kind:cue.kind,paragraphIndex:cue.paragraphIndex}}:{}),...(template?{template:template.name.slice(0,80),framing:template.framing}:{}),...(metadata?.selectionReason==='Manual template selection'||cue?.imageTemplateReason==='Manual template selection'?{selection:'manual' as const}:{}),...(identity?{identity}:{}),...(cached===undefined?{}:{cache:cached?'reused' as const:'provider' as const}),...(reviewState?{review:reviewState}:{})};
}
