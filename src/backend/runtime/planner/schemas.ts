import { z } from "zod";
import {
  CameraLockSchema,
  PlannerShotHintSchema,
  SceneBoundaryProposalSchema,
  StageEffectSchema,
  SubjectCategorySchema
} from "../../../shared/contracts.js";
import { ActionPropSchema } from "../../../shared/action-prop.js";
import { SkillCheckSchema, RpgQuestStatusSchema, RpgCompanionSchema } from "../../../shared/rpg-state.js";

export const PlannerEnvironmentChangesSchema = z.object({
  description: z.string().trim().min(1).optional(),
  lighting: z.string().trim().nullable().optional(),
  timeOfDay: z.string().trim().nullable().optional(),
  weather: z.string().trim().nullable().optional(),
  addElements: z.array(z.string().trim().min(1)).default([]),
  removeElements: z.array(z.string().trim().min(1)).default([]),
  replaceElements: z.array(z.object({
    from: z.string().trim().min(1),
    to: z.string().trim().min(1)
  }).strict()).default([]),
  clearElements: z.boolean().default(false),
  clearLighting: z.boolean().default(false),
  clearWeather: z.boolean().default(false)
}).strict();
export type PlannerEnvironmentChanges = z.infer<typeof PlannerEnvironmentChangesSchema>;

export const PlannerEnvironmentInputSchema = z.object({
  location: z.string().trim().min(1).default("the current setting"),
  timeOfDay: z.string().trim().nullable().default(null),
  weather: z.string().trim().nullable().default(null),
  lighting: z.string().trim().nullable().default(null),
  description: z.string().trim().min(1).default("A coherent visual-novel environment in a visual novel scene."),
  persistentElements: z.array(z.string().trim()).default([]),
  removedElements: z.array(z.string().trim()).default([])
}).strict();
export type PlannerEnvironmentInput = z.infer<typeof PlannerEnvironmentInputSchema>;

export type PlannerEnvironmentProposal = {
  location?: string | undefined;
  timeOfDay?: string | null | undefined;
  weather?: string | null | undefined;
  lighting?: string | null | undefined;
  description?: string | undefined;
  persistentElements?: string[] | undefined;
  removedElements?: string[] | undefined;
  changes?: PlannerEnvironmentChanges | null | undefined;
};

export const PlannerSceneSchema = z.object({
  startParagraph: z.number().int().nonnegative(),
  boundary: SceneBoundaryProposalSchema,
  environment: PlannerEnvironmentInputSchema,
  environmentChanges: PlannerEnvironmentChangesSchema.optional(),
  cast: z.array(z.string().trim().min(1)).default([]),
  character: z.string().trim().nullable().optional(),
  characterId: z.string().trim().nullable().optional(),
  attire: z.string().trim().nullable().optional(),
  ambient: z.string().trim().nullable().optional(),
  basePrompt: z.string().trim().min(1),
  compositionLock: z.string().trim().min(1).default("Character centered with clear negative space behind the dialogue window.")
}).strict();

export const PlannerCueSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(),
  templateId: z.string().max(96).optional(),
  templateReason: z.string().max(300).optional(),
  visualDescription: z.string().max(4000).optional(),
  visualFocus: z.string().max(1000).optional(),
  visibleCharacters: z.array(z.string().trim().min(1).max(256)).max(16).optional(),
  action: z.union([ActionPropSchema, z.string().trim()]).nullable().optional(),
  expression: z.string().trim().nullable().optional(),
  character: z.string().trim().nullable().optional(),
  characterId: z.string().trim().nullable().optional(),
  attire: z.string().trim().nullable().optional(),
  shotHint: PlannerShotHintSchema.optional(),
  promptDelta: z.string().trim().optional(),
  effect: z.string().trim().nullable().optional(),
  bgm: z.string().trim().nullable().optional(),
  sfx: z.string().trim().nullable().optional()
}).strict();

export const PlannerChoiceSchema = z.object({
  label: z.string().trim().min(1),
  submission: z.string().trim().min(1),
  check: SkillCheckSchema.optional()
}).strict();

export const PlannerRpgUpdateSchema = z.object({
  vitals: z.object({
    name: z.string().max(120).optional(),
    level: z.number().int().min(1).max(100).optional(),
    archetype: z.string().max(120).optional(),
    hp: z.number().int().min(0).max(9999).optional(),
    maxHp: z.number().int().min(1).max(9999).optional(),
    stamina: z.number().int().min(0).max(9999).optional(),
    maxStamina: z.number().int().min(1).max(9999).optional(),
    stress: z.number().int().min(0).max(100).optional(),
    currency: z.string().max(80).optional(),
    inventory: z.array(z.string().max(160)).max(24).optional(),
    statusEffects: z.array(z.string().max(120)).max(12).optional(),
    companions: z.array(RpgCompanionSchema).max(8).optional()
  }).optional(),
  quests: z.array(z.object({
    id: z.string().max(120).optional(),
    title: z.string().trim().min(1).max(200),
    objective: z.string().trim().min(1).max(400),
    status: RpgQuestStatusSchema.optional(),
    deadlineTurns: z.number().int().min(1).max(999).nullable().optional()
  })).max(16).optional()
}).optional();

export const PlannerCharacterSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  characterId: z.string().trim().nullable().optional(),
  aliases: z.array(z.string().trim().min(1)).default([]),
  subjectCategory: SubjectCategorySchema.default("unknown")
}).strict();

export const PlannerSpeakerSchema = z.object({
  paragraphIndex: z.number().int().min(0),
  name: z.string().trim().min(1)
});

export const PlannerOutputSchema = z.object({
  storyReferences: z.unknown().optional(),
  storyDocuments: z.unknown().optional(),
  scenes: z.array(PlannerSceneSchema).default([]),
  cues: z.array(PlannerCueSchema).default([]),
  effects: z.array(z.object({ paragraphIndex: z.number().int().nonnegative(), effect: StageEffectSchema })).default([]),
  choices: z.array(PlannerChoiceSchema).max(6).default([]),
  characters: z.array(PlannerCharacterSchema).default([]),
  speakers: z.array(PlannerSpeakerSchema).default([]),
  rpg: PlannerRpgUpdateSchema
}).strict();

export type HintMessage = { id: string; is_user: boolean; metadata?: Record<string, unknown> };

export function readGameHints(metadata: Record<string, unknown> | undefined): string | null {
  const hints = metadata?.vn_hints;
  if (!hints || typeof hints !== "object") return null;
  const h = hints as { moods?: unknown; notes?: unknown };
  const lines: string[] = [];
  if (h.moods && typeof h.moods === "object") {
    for (const [name, mood] of Object.entries(h.moods as Record<string, unknown>).slice(0, 12)) {
      if (typeof mood === "string" && mood.trim()) lines.push(`- ${name.slice(0, 80)}: ${mood.trim().slice(0, 160)}`);
    }
  }
  if (Array.isArray(h.notes)) {
    for (const note of h.notes.slice(0, 6)) if (typeof note === "string" && note.trim()) lines.push(`- ${note.trim().slice(0, 240)}`);
  }
  return lines.length ? lines.join("\n") : null;
}

export function gameHintsForTurn(messages: readonly HintMessage[], messageId: string): string {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index < 0) return "";
  const own = readGameHints(messages[index]!.metadata);
  if (own) return own;
  const previous = messages[index - 1];
  return previous?.is_user ? readGameHints(previous.metadata) ?? "" : "";
}

export const FIXED_CAMERA = CameraLockSchema.parse({
  framing: "upper body",
  angle: "eye level",
  perspective: "straight-on",
  lens: null,
  subjectAnchor: "primary speaking character centered",
  horizon: "stable horizon at the upper middle third",
  safeDialogueRegion: "lower quarter free of faces and important objects",
  aspectRatio: "16:9"
});

export function stableHash(source: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${left.toString(16).padStart(8, "0")}${right.toString(16).padStart(8, "0")}`;
}

export function id(prefix: string, source: string): string {
  return `${prefix}-${stableHash(source)}`;
}

export function isAttireReset(attire: string | null | undefined): boolean {
  if (!attire) return false;
  const lower = attire.trim().toLowerCase();
  return ["baseline", "default", "original", "reset", "normal"].includes(lower);
}

export const BOUNDARY_REASONS = ["initial", "location_change", "major_time_jump", "environment_replacement", "forced", "none"] as const;

export function normalizeBoundaryReason(value: unknown): string {
  if (typeof value !== "string") return "none";
  const text = value.trim().toLowerCase().replace(/[\s]+/g, "_");
  if ((BOUNDARY_REASONS as readonly string[]).includes(text)) return text;
  if (/initial|first|start|greeting|opening/.test(text)) return "initial";
  if (/location|place|setting|move|teleport|travel|leave|arriv/.test(text)) return "location_change";
  if (/time_jump|time|skip|later|next_day|morning|evening|passes|jump/.test(text)) return "major_time_jump";
  if (/environment|weather|structure|replace|rebuild|interior|exterior/.test(text)) return "environment_replacement";
  if (/forced|override|hard|reset/.test(text)) return "forced";
  return "none";
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  if (typeof value === "number") return value !== 0;
  return false;
}
