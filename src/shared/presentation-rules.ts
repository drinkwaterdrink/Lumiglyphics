import {z} from 'zod';
import {findReDoSHazard} from './display-rules.js';

const id = z.string().trim().min(1).max(128);

export const BaseRuleConditionSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('dialogue')}).strict(),
  z.object({kind: z.literal('location_changed')}).strict(),
  z.object({kind: z.literal('scene_opening')}).strict(),
  z.object({kind: z.literal('template'), templateId: id}).strict(),
  z.object({kind: z.literal('subject'), subjectKind: z.enum(['npc', 'place', 'object']), name: z.string().trim().min(1).max(256), partialMatch: z.boolean().optional()}).strict(),
  z.object({kind: z.literal('time_of_day'), value: z.enum(['dawn', 'day', 'dusk', 'night', 'any'])}).strict(),
  z.object({kind: z.literal('weather'), value: z.string().trim().min(1).max(80)}).strict(),
  z.object({kind: z.literal('ambient'), value: z.string().trim().min(1).max(80)}).strict(),
  z.object({kind: z.literal('cast_present'), name: z.string().trim().min(1).max(256)}).strict(),
  z.object({kind: z.literal('cast_count'), op: z.enum(['gte', 'eq', 'lte']), count: z.number().int().min(0).max(20)}).strict(),
  z.object({kind: z.literal('speaker_name'), name: z.string().trim().min(1).max(256)}).strict(),
  z.object({kind: z.literal('outfit_matches'), outfit: z.string().trim().min(1).max(256)}).strict(),
  z.object({kind: z.literal('document_revealed'), documentKind: z.string().trim().max(80).optional()}).strict(),
  z.object({kind: z.literal('shot_intent'), intent: z.string().trim().min(1).max(80)}).strict(),
  z.object({kind: z.literal('prose_contains'), pattern: z.string().trim().min(1).max(256), isRegex: z.boolean().optional()}).strict(),
  z.object({kind: z.literal('rpg_state'), key: z.string().trim().min(1).max(80), op: z.enum(['is', 'not', 'gte', 'lte']).optional(), value: z.string().trim().max(80).optional()}).strict(),
  z.object({kind: z.literal('tracker_field'), field: z.string().trim().min(1).max(80), value: z.string().trim().max(120).optional()}).strict()
]);

export type BaseRuleCondition = z.infer<typeof BaseRuleConditionSchema>;

export type RuleCondition =
  | BaseRuleCondition
  | { kind: 'all'; conditions: RuleCondition[] }
  | { kind: 'any'; conditions: RuleCondition[] }
  | { kind: 'not'; condition: RuleCondition };

const Level1ConditionSchema: z.ZodType<RuleCondition> = z.union([
  BaseRuleConditionSchema,
  z.object({kind: z.literal('all'), conditions: z.array(BaseRuleConditionSchema).min(1).max(8)}).strict(),
  z.object({kind: z.literal('any'), conditions: z.array(BaseRuleConditionSchema).min(1).max(8)}).strict(),
  z.object({kind: z.literal('not'), condition: BaseRuleConditionSchema}).strict()
]);

export const RuleConditionSchema: z.ZodType<RuleCondition> = z.union([
  BaseRuleConditionSchema,
  z.object({kind: z.literal('all'), conditions: z.array(Level1ConditionSchema).min(1).max(8)}).strict(),
  z.object({kind: z.literal('any'), conditions: z.array(Level1ConditionSchema).min(1).max(8)}).strict(),
  z.object({kind: z.literal('not'), condition: Level1ConditionSchema}).strict()
]);

export const RuleActionSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('prefer_template'), templateId: id}).strict(),
  z.object({kind: z.literal('limit_effects'), intensity: z.enum(['gentle', 'off'])}).strict(),
  z.object({kind: z.literal('limit_music'), level: z.enum(['quiet', 'mute'])}).strict(),
  z.object({kind: z.literal('hold_background'), mode: z.enum(['stage_backdrop', 'skip_generation']).default('stage_backdrop').optional()}).strict(),
  z.object({kind: z.literal('prefer_aspect_ratio'), ratio: z.enum(['16:9', '9:16', '1:1', '3:2', '4:3', '4:5'])}).strict(),
  z.object({kind: z.literal('prefer_cast_mode'), mode: z.enum(['layered', 'illustrated_scene'])}).strict(),
  z.object({kind: z.literal('prefer_framing'), framing: z.enum(['portrait', 'upper body', 'full body', 'wide', 'close-up'])}).strict(),
  z.object({kind: z.literal('auto_render_document'), render: z.boolean().default(true).optional()}).strict(),
  z.object({kind: z.literal('skip_image_generation'), skip: z.boolean().default(true).optional()}).strict(),
  z.object({kind: z.literal('prefer_style'), styleId: id}).strict()
]);

export type RuleAction = z.infer<typeof RuleActionSchema>;

const draftShape = {
  id,
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(100),
  when: RuleConditionSchema,
  then: RuleActionSchema
};

export const PresentationRuleDraftSchema = z.object(draftShape).strict().refine(
  r => r.when.kind !== 'template' || r.then.kind !== 'prefer_template' || r.when.templateId !== r.then.templateId,
  'Choose a different preferred template, or another condition.'
);

export const PresentationRuleSchema = z.object({
  ...draftShape,
  scope: z.enum(['user', 'chat']),
  savedOrder: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
}).strict();

export type PresentationRule = z.infer<typeof PresentationRuleSchema>;
export type PresentationRuleDraft = z.infer<typeof PresentationRuleDraftSchema>;

export const PresentationRuleDocumentSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  rules: z.array(PresentationRuleSchema).max(48).refine(
    rows => new Set(rows.map(r => r.id)).size === rows.length,
    'Rule IDs must be distinct.'
  )
}).strict();

export type PresentationRuleDocument = z.infer<typeof PresentationRuleDocumentSchema>;

export const PresentationRuleCatalogSchema = z.object({
  user: PresentationRuleDocumentSchema.nullable(),
  chat: PresentationRuleDocumentSchema.nullable(),
  diagnostics: z.array(z.string().max(300)).max(8)
}).strict();

export type PresentationRuleCatalog = z.infer<typeof PresentationRuleCatalogSchema>;

export const PresentationRuleTraceSchema = z.object({
  matchedRuleIds: z.array(id).max(48),
  summary: z.string().max(4000)
}).strict();

export type PresentationRuleTrace = z.infer<typeof PresentationRuleTraceSchema>;

export const PresentationRuleRequestSchema = z.object({
  type: z.literal('vn_presentation_rules'),
  version: z.literal(1),
  requestId: id,
  chatId: id.optional(),
  action: z.enum(['list', 'save', 'delete', 'toggle']),
  scope: z.enum(['user', 'chat']).optional(),
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  rule: PresentationRuleDraftSchema.optional(),
  id: id.optional(),
  enabled: z.boolean().optional()
}).strict().superRefine((r, ctx) => {
  if (r.action === 'list') return;
  if (!r.scope || r.expectedRevision === undefined) ctx.addIssue({code: 'custom', message: 'Choose a scope and load its current revision.'});
  if (r.scope === 'chat' && !r.chatId) ctx.addIssue({code: 'custom', message: 'Open a chat for a chat preference.'});
  if (r.action === 'save' && !r.rule) ctx.addIssue({code: 'custom', message: 'Review a valid rule before saving.'});
  if ((r.action === 'delete' || r.action === 'toggle') && !r.id) ctx.addIssue({code: 'custom', message: 'Choose a saved rule.'});
  if (r.action === 'toggle' && r.enabled === undefined) ctx.addIssue({code: 'custom', message: 'Choose enabled or disabled.'});
});

export type PresentationRuleRequest = z.infer<typeof PresentationRuleRequestSchema>;

export type RuleSubject = { kind: 'npc' | 'place' | 'object'; name: string };

export type RuleInput = {
  isDialogue: boolean;
  locationChanged: boolean;
  isSceneOpening?: boolean;
  templateId: string;
  enabledTemplateIds: readonly string[];
  subjects?: readonly RuleSubject[];
  timeOfDay?: string;
  weather?: string;
  ambient?: string;
  cast?: readonly string[];
  castCount?: number;
  speakerName?: string;
  characterAliases?: Record<string, readonly string[]>;
  activeOutfit?: string;
  revealedDocumentKinds?: readonly string[];
  shotIntent?: string;
  paragraphText?: string;
  rpgState?: Record<string, unknown>;
  trackerFields?: Record<string, unknown>;
  allowStyleOverride?: boolean;
};

export type RuleDecision = {
  holdBackground?: boolean;
  holdBackgroundMode?: 'stage_backdrop' | 'skip_generation';
  preferredTemplateId?: string;
  selectedRuleId?: string;
  selectedScope?: 'user' | 'chat';
  effectIntensity?: 'gentle' | 'off';
  selectedEffectRuleId?: string;
  selectedEffectScope?: 'user' | 'chat';
  musicLevel?: 'quiet' | 'mute';
  selectedMusicRuleId?: string;
  selectedMusicScope?: 'user' | 'chat';
  preferredAspectRatio?: '16:9' | '9:16' | '1:1' | '3:2' | '4:3' | '4:5';
  preferredCastMode?: 'layered' | 'illustrated_scene';
  preferredFraming?: 'portrait' | 'upper body' | 'full body' | 'wide' | 'close-up';
  autoRenderDocument?: boolean;
  skipImageGeneration?: boolean;
  preferredStyleId?: string;
  selectedStyleRuleId?: string;
  selectedStyleScope?: 'user' | 'chat';
  matchedRuleIds: string[];
  diagnostics: string[];
};

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function nameMatches(candidate: string, target: string, aliases?: Record<string, readonly string[]>): boolean {
  const normCand = normalizeText(candidate);
  const normTarget = normalizeText(target);
  if (!normCand || !normTarget) return false;
  if (normCand === normTarget) return true;
  if (aliases) {
    for (const [canonical, list] of Object.entries(aliases)) {
      const normCanon = normalizeText(canonical);
      const isTarget = normTarget === normCanon || list.some(a => normalizeText(a) === normTarget);
      if (isTarget) {
        if (normCand === normCanon || list.some(a => normalizeText(a) === normCand)) return true;
      }
    }
  }
  return false;
}

export function matchCondition(condition: RuleCondition, input: RuleInput): boolean {
  switch (condition.kind) {
    case 'dialogue':
      return input.isDialogue;
    case 'location_changed':
      return input.locationChanged;
    case 'scene_opening':
      return Boolean(input.isSceneOpening);
    case 'template':
      return condition.templateId === input.templateId;
    case 'subject': {
      if (!input.subjects?.length) return false;
      const targetNorm = normalizeText(condition.name);
      return input.subjects.some(s => {
        if (s.kind !== condition.subjectKind) return false;
        const candNorm = normalizeText(s.name);
        if (condition.partialMatch && s.kind === 'place') {
          return candNorm.includes(targetNorm) || targetNorm.includes(candNorm);
        }
        if (s.kind === 'npc') {
          return nameMatches(s.name, condition.name, input.characterAliases);
        }
        return candNorm === targetNorm;
      });
    }
    case 'time_of_day': {
      if (condition.value === 'any') return Boolean(input.timeOfDay?.trim());
      return normalizeText(input.timeOfDay) === normalizeText(condition.value);
    }
    case 'weather': {
      const normW = normalizeText(input.weather);
      const targetW = normalizeText(condition.value);
      return Boolean(normW && (normW === targetW || normW.includes(targetW) || targetW.includes(normW)));
    }
    case 'ambient': {
      const normA = normalizeText(input.ambient);
      const targetA = normalizeText(condition.value);
      return Boolean(normA && (normA === targetA || normA.includes(targetA) || targetA.includes(normA)));
    }
    case 'cast_present': {
      if (!input.cast?.length) return false;
      return input.cast.some(member => nameMatches(member, condition.name, input.characterAliases));
    }
    case 'cast_count': {
      const actual = input.castCount ?? input.cast?.length ?? 0;
      if (condition.op === 'gte') return actual >= condition.count;
      if (condition.op === 'eq') return actual === condition.count;
      return actual <= condition.count;
    }
    case 'speaker_name': {
      if (!input.speakerName?.trim()) return false;
      return nameMatches(input.speakerName, condition.name, input.characterAliases);
    }
    case 'outfit_matches': {
      const normO = normalizeText(input.activeOutfit);
      const targetO = normalizeText(condition.outfit);
      return Boolean(normO && (normO.includes(targetO) || targetO.includes(normO)));
    }
    case 'document_revealed': {
      if (!input.revealedDocumentKinds?.length) return false;
      if (!condition.documentKind || condition.documentKind === 'any') return true;
      const targetKind = normalizeText(condition.documentKind);
      return input.revealedDocumentKinds.some(k => normalizeText(k) === targetKind);
    }
    case 'shot_intent':
      return normalizeText(input.shotIntent) === normalizeText(condition.intent);
    case 'prose_contains': {
      if (!input.paragraphText) return false;
      if (condition.isRegex) {
        if (findReDoSHazard(condition.pattern)) return false;
        try {
          const re = new RegExp(condition.pattern, 'i');
          return re.test(input.paragraphText);
        } catch {
          return false;
        }
      }
      return normalizeText(input.paragraphText).includes(normalizeText(condition.pattern));
    }
    case 'rpg_state': {
      if (!input.rpgState) return false;
      const val = input.rpgState[condition.key];
      if (val === undefined) return false;
      if (!condition.op || condition.op === 'is') return String(val).toLowerCase() === String(condition.value ?? '').toLowerCase();
      if (condition.op === 'not') return String(val).toLowerCase() !== String(condition.value ?? '').toLowerCase();
      const numVal = Number(val);
      const targetNum = Number(condition.value);
      if (isNaN(numVal) || isNaN(targetNum)) return false;
      if (condition.op === 'gte') return numVal >= targetNum;
      if (condition.op === 'lte') return numVal <= targetNum;
      return false;
    }
    case 'tracker_field': {
      if (!input.trackerFields) return false;
      const val = input.trackerFields[condition.field];
      if (val === undefined) return false;
      if (!condition.value) return Boolean(val);
      return String(val).toLowerCase() === condition.value.toLowerCase();
    }
    case 'all':
      return condition.conditions.every(c => matchCondition(c, input));
    case 'any':
      return condition.conditions.some(c => matchCondition(c, input));
    case 'not':
      return !matchCondition(condition.condition, input);
    default:
      return false;
  }
}

/** Conditions always examine the original planner choice; rules never chain. */
export function evaluatePresentationRules(input: RuleInput, rules: readonly PresentationRule[]): RuleDecision {
  const decision: RuleDecision = {matchedRuleIds: [], diagnostics: []};
  const ordered = [...rules].sort(
    (a, b) =>
      Number(a.scope === 'chat') - Number(b.scope === 'chat') ||
      a.priority - b.priority ||
      a.savedOrder - b.savedOrder ||
      a.id.localeCompare(b.id)
  );

  for (const rule of ordered) {
    if (!rule.enabled) continue;
    if (!matchCondition(rule.when, input)) continue;

    decision.matchedRuleIds.push(rule.id);

    switch (rule.then.kind) {
      case 'hold_background':
        decision.holdBackground = true;
        decision.holdBackgroundMode = rule.then.mode ?? 'stage_backdrop';
        break;
      case 'limit_music':
        decision.musicLevel = rule.then.level;
        decision.selectedMusicRuleId = rule.id;
        decision.selectedMusicScope = rule.scope;
        break;
      case 'limit_effects':
        decision.effectIntensity = rule.then.intensity;
        decision.selectedEffectRuleId = rule.id;
        decision.selectedEffectScope = rule.scope;
        break;
      case 'prefer_aspect_ratio':
        decision.preferredAspectRatio = rule.then.ratio;
        break;
      case 'prefer_cast_mode':
        decision.preferredCastMode = rule.then.mode;
        break;
      case 'prefer_framing':
        decision.preferredFraming = rule.then.framing;
        break;
      case 'auto_render_document':
        decision.autoRenderDocument = rule.then.render ?? true;
        break;
      case 'skip_image_generation':
        decision.skipImageGeneration = rule.then.skip ?? true;
        break;
      case 'prefer_style':
        if (input.allowStyleOverride !== true) {
          decision.diagnostics.push(`${rule.name}: Style override disabled globally; skipped.`);
        } else {
          decision.preferredStyleId = rule.then.styleId;
          decision.selectedStyleRuleId = rule.id;
          decision.selectedStyleScope = rule.scope;
        }
        break;
      case 'prefer_template':
        if (!input.enabledTemplateIds.includes(rule.then.templateId)) {
          decision.diagnostics.push(`${rule.name}: preferred template is disabled or unavailable; skipped.`);
        } else {
          decision.preferredTemplateId = rule.then.templateId;
          decision.selectedRuleId = rule.id;
          decision.selectedScope = rule.scope;
        }
        break;
    }
  }
  return decision;
}

export function describePresentationCondition(condition: RuleCondition, name: (id: string) => string = (id) => id): string {
  switch (condition.kind) {
    case 'dialogue':
      return 'During attributed dialogue';
    case 'location_changed':
      return 'At a confirmed location change';
    case 'scene_opening':
      return 'At the opening of a scene or turn';
    case 'template':
      return `When ${name(condition.templateId)} would otherwise be chosen`;
    case 'subject':
      if (condition.subjectKind === 'npc') return `When ${condition.name.trim()} is the picture subject`;
      if (condition.subjectKind === 'place') return `At ${condition.name.trim()}${condition.partialMatch ? ' (partial match)' : ''}`;
      return `When ${condition.name.trim()} is described in the picture paragraph`;
    case 'time_of_day':
      return `During ${condition.value}`;
    case 'weather':
      return `When weather is ${condition.value}`;
    case 'ambient':
      return `When ambient audio is ${condition.value}`;
    case 'cast_present':
      return `When ${condition.name} is present in the scene`;
    case 'cast_count':
      return `When cast size ${condition.op === 'gte' ? '≥' : condition.op === 'lte' ? '≤' : '='} ${condition.count}`;
    case 'speaker_name':
      return `When ${condition.name} is speaking`;
    case 'outfit_matches':
      return `When outfit matches ${condition.outfit}`;
    case 'document_revealed':
      return condition.documentKind ? `When a ${condition.documentKind} is revealed` : 'When any document is revealed';
    case 'shot_intent':
      return `When shot intent is ${condition.intent}`;
    case 'prose_contains':
      return `When prose contains ${condition.isRegex ? `/${condition.pattern}/` : `"${condition.pattern}"`}`;
    case 'rpg_state':
      return `When RPG state [${condition.key}] ${condition.op ?? 'is'} ${condition.value ?? 'set'}`;
    case 'tracker_field':
      return `When tracker field [${condition.field}] ${condition.value ? `= ${condition.value}` : 'is set'}`;
    case 'all':
      return condition.conditions.map(c => describePresentationCondition(c, name)).join(' AND ');
    case 'any':
      return condition.conditions.map(c => describePresentationCondition(c, name)).join(' OR ');
    case 'not':
      return `NOT (${describePresentationCondition(condition.condition, name)})`;
    default:
      return 'When condition matches';
  }
}

export function describePresentationAction(action: RuleAction, name: (id: string) => string = (id) => id): string {
  switch (action.kind) {
    case 'hold_background':
      return action.mode === 'skip_generation'
        ? 'hold background & skip redundant image generation'
        : 'keep the background until the scene changes';
    case 'prefer_template':
      return `prefer ${name(action.templateId)}`;
    case 'limit_music':
      return action.level === 'quiet' ? 'lower background music to 35% of its saved volume' : 'mute background music';
    case 'limit_effects':
      return action.intensity === 'gentle' ? 'limit one-shot effects to Gentle' : 'disable one-shot effects';
    case 'prefer_aspect_ratio':
      return `prefer aspect ratio ${action.ratio}`;
    case 'prefer_cast_mode':
      return `prefer cast mode ${action.mode === 'layered' ? 'Layered Sprites' : 'Illustrated Scene'}`;
    case 'prefer_framing':
      return `prefer ${action.framing} framing`;
    case 'auto_render_document':
      return 'auto-render revealed document';
    case 'skip_image_generation':
      return 'skip image generation for this beat';
    case 'prefer_style':
      return `prefer style ${action.styleId} (optional)`;
  }
}
