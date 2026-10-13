import type {VisualNovelConfig} from '../../config.js';
import {renderImageTemplate,resolveImageTemplate,templateSnapshot} from '../../shared/image-templates.js';
/** Reserve actual shared/template wording before asking for scene direction.
 * A target is guidance, not permission to fabricate evidence or pad simple scenes. */
export function imageDetailGuidance(config:VisualNovelConfig):string {
 const templates=config.dynamicImageTemplates?config.imageTemplates.filter(t=>t.enabled):[resolveImageTemplate(config).template];
 const budgets=templates.map(t=>{
  const {revision: _, ...body} = t as typeof t & {revision?:string};
  const output=renderImageTemplate(templateSnapshot(body),{style:config.promptPrefix,suffix:config.promptSuffix,negative:config.negativePrompt,scene:'',subjects:'',action:'',composition:'',lighting:''});
  const fixed=output.prompt.length+output.negativePrompt.length;
  return {templateId:t.id,sharedAndTemplateCharacters:fixed,sceneDirectionBudget:Math.max(0,2900-fixed-(t.subjectMode==='none'?250:700)),directionField:t.category==='environment'?'environment.description':t.category==='detail'?'visualFocus':'visualDescription'};
 });
 return [
  'IMAGE DETAIL: Aim for 2,750–2,900 characters in each finished image prompt (positive + negative combined); the absolute limit is 3,000 CHARACTERS, not tokens. Shared style, suffix, template wording, identity, clothing, environment, framing and negatives all consume that same budget. This is a useful-detail target, not a minimum: no padding or repetitive quality adjectives. Prefer concise negatives and put useful evidenced visual detail in the positive prompt.',
  'Use the available direction budget for concrete visible detail: the exact instant/action, posture and hand-object contact, expression and gaze, spatial relationships, recognizable features, established clothing/material surfaces, depth and environmental landmarks, and the effect of established light. Put the principal subject/action first. Draw evidence only from this reply, authorized context and saved appearance; never invent identity traits, props, dialogue, additional people, events or outcomes to reach a length target. Do not repeat identity, style, camera instructions or environmental facts already in their dedicated fields.',
  'For portrait/action, expand visualDescription into focused natural-language visual direction rather than a single short action label. For environment, put rich people-free visible detail in environment.description; visualDescription must not import character actions. For detail, describe the evidenced focal object and its visible context in visualFocus (maximum 1,000 characters). Keep brief inputs shorter when evidence is sparse. Tags format still needs precise distinct visual facts, not repeated synonyms. Manga direction must describe the supplied beat without inventing a sequence of new events.',
  'Shared style/template reservations and approximate remaining direction budgets: '+JSON.stringify(budgets)+'. If fixed wording exhausts the budget, keep additional direction minimal; do not rewrite user styles or templates. Budget characters, not words. Recalculate the remainder when actual identity, clothing or environment fields exceed their reservation. Leave headroom for the compiler and keep the finished combined total under 3,000.'
 ].join('\n');
}
