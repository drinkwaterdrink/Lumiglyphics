import { z } from "zod";

export const RPG_MODES = ["off", "lite", "full"] as const;
export type RpgMode = (typeof RPG_MODES)[number];

export function normalizeRpgMode(value: unknown): RpgMode {
  if (typeof value !== "string") return "off";
  const lower = value.trim().toLowerCase();
  return (RPG_MODES as readonly string[]).includes(lower) ? (lower as RpgMode) : "off";
}

export const SkillCheckStatSchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA", "LUCK"]);
export type SkillCheckStat = z.infer<typeof SkillCheckStatSchema>;

export const SkillCheckRollModeSchema = z.enum(["normal", "advantage", "disadvantage"]);
export type SkillCheckRollMode = z.infer<typeof SkillCheckRollModeSchema>;

export const SkillCheckSchema = z.object({
  stat: SkillCheckStatSchema,
  dc: z.number().int().min(5).max(30),
  modifier: z.number().int().min(-10).max(20).default(0),
  rollMode: SkillCheckRollModeSchema.default("normal"),
  reason: z.string().trim().max(160).optional(),
}).strict();
export type SkillCheck = z.infer<typeof SkillCheckSchema>;

export type SkillCheckTier =
  | "critical_success"
  | "success"
  | "partial"
  | "failure"
  | "critical_failure";

export interface SkillCheckOutcome {
  check: SkillCheck;
  rolls: number[];
  natural: number;
  total: number;
  tier: SkillCheckTier;
}

function defaultRollD20(): number {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0]! % 20) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

export function resolveSkillCheck(
  check: SkillCheck,
  rollD20: () => number = defaultRollD20,
): SkillCheckOutcome {
  const clampD20 = (n: number) => Math.max(1, Math.min(20, Math.trunc(n)));
  const r1 = clampD20(rollD20());
  let rolls: number[] = [r1];
  let natural = r1;
  if (check.rollMode === "advantage") {
    const r2 = clampD20(rollD20());
    rolls = [r1, r2];
    natural = Math.max(r1, r2);
  } else if (check.rollMode === "disadvantage") {
    const r2 = clampD20(rollD20());
    rolls = [r1, r2];
    natural = Math.min(r1, r2);
  }
  const total = natural + (check.modifier ?? 0);

  let tier: SkillCheckTier;
  if (natural === 20) {
    tier = "critical_success";
  } else if (natural === 1) {
    tier = "critical_failure";
  } else if (total >= check.dc) {
    tier = "success";
  } else if (total >= check.dc - 3) {
    tier = "partial";
  } else {
    tier = "failure";
  }

  return {
    check,
    rolls,
    natural,
    total,
    tier,
  };
}

export function formatSkillCheckSubmission(submission: string, outcome: SkillCheckOutcome): string {
  const { check, rolls, natural, total, tier } = outcome;
  const modStr = check.modifier >= 0 ? `+${check.modifier}` : `${check.modifier}`;
  const rollStr = rolls.length > 1 ? `2d20(${rolls.join(", ")})->${natural}` : `1d20(${natural})`;
  const tierLabel = tier.toUpperCase();
  return `[SKILL CHECK: ${check.stat} DC ${check.dc} — ${tierLabel} (${rollStr} ${modStr} = ${total} vs DC ${check.dc})] ${submission}`;
}

export const RpgCompanionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  hp: z.number().int().min(0).max(9999).default(100),
  maxHp: z.number().int().min(1).max(9999).default(100),
  affinity: z.number().int().min(-100).max(100).default(0),
  status: z.string().trim().max(120).default("healthy"),
}).strict();
export type RpgCompanion = z.infer<typeof RpgCompanionSchema>;

export const RpgVitalsSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Adventurer"),
  level: z.number().int().min(1).max(100).default(1),
  archetype: z.string().trim().min(1).max(120).default("Wanderer"),
  hp: z.number().int().min(0).max(9999).default(100),
  maxHp: z.number().int().min(1).max(9999).default(100),
  stamina: z.number().int().min(0).max(9999).default(100),
  maxStamina: z.number().int().min(1).max(9999).default(100),
  stress: z.number().int().min(0).max(100).default(0),
  currency: z.string().trim().max(80).default(""),
  inventory: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
  statusEffects: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  companions: z.array(RpgCompanionSchema).max(8).default([]),
}).strict();
export type RpgVitals = z.infer<typeof RpgVitalsSchema>;

export const RpgQuestStatusSchema = z.enum(["active", "completed", "failed"]);
export type RpgQuestStatus = z.infer<typeof RpgQuestStatusSchema>;

export const RpgQuestSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(400),
  status: RpgQuestStatusSchema.default("active"),
  deadlineTurns: z.number().int().min(1).max(999).nullable().default(null),
  turnsElapsed: z.number().int().nonnegative().default(0),
}).strict();
export type RpgQuest = z.infer<typeof RpgQuestSchema>;

export type QuestUrgencyLevel = "overdue" | "due_now" | "imminent" | "approaching" | "relaxed" | "none";

export function computeQuestUrgency(quest: RpgQuest, turnsElapsed = quest.turnsElapsed): QuestUrgencyLevel {
  if (quest.status !== "active" || quest.deadlineTurns === null || quest.deadlineTurns === undefined) return "none";
  const remaining = quest.deadlineTurns - turnsElapsed;
  if (remaining < 0) return "overdue";
  if (remaining === 0) return "due_now";
  if (remaining <= 1) return "imminent";
  if (remaining <= Math.ceil(quest.deadlineTurns * 0.5)) return "approaching";
  return "relaxed";
}

export function computePacingFrustrationMultiplier(turnsWithoutProgress: number, windowTurns = 12): number {
  const safeWindow = Math.max(1, windowTurns);
  const clamped = Math.max(0, turnsWithoutProgress);
  const raw = 1 + Math.pow(clamped / safeWindow, 2);
  return Math.min(3.5, Math.round(raw * 100) / 100);
}

export const RpgLocationNodeSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(300).default(""),
  visits: z.number().int().positive().default(1),
}).strict();
export type RpgLocationNode = z.infer<typeof RpgLocationNodeSchema>;

export const RpgLocationEdgeSchema = z.object({
  from: z.string().trim().min(1).max(120),
  to: z.string().trim().min(1).max(120),
}).strict();
export type RpgLocationEdge = z.infer<typeof RpgLocationEdgeSchema>;

export const RpgAtlasSchema = z.object({
  currentLocationId: z.string().trim().max(120).nullable().default(null),
  nodes: z.array(RpgLocationNodeSchema).max(48).default([]),
  edges: z.array(RpgLocationEdgeSchema).max(96).default([]),
}).strict();
export type RpgAtlas = z.infer<typeof RpgAtlasSchema>;

export const RpgStateSchema = z.object({
  turnCounter: z.number().int().nonnegative().default(0),
  vitals: RpgVitalsSchema,
  quests: z.array(RpgQuestSchema).max(16).default([]),
  atlas: RpgAtlasSchema,
}).strict();
export type RpgState = z.infer<typeof RpgStateSchema>;

export interface RpgTurnUpdate {
  personaName?: string | undefined;
  locations?: ReadonlyArray<{ location: string; description?: string | undefined }> | undefined;
  vitals?: {
    name?: string | undefined;
    level?: number | undefined;
    archetype?: string | undefined;
    hp?: number | undefined;
    maxHp?: number | undefined;
    stamina?: number | undefined;
    maxStamina?: number | undefined;
    stress?: number | undefined;
    currency?: string | undefined;
    inventory?: string[] | undefined;
    statusEffects?: string[] | undefined;
    companions?: RpgCompanion[] | undefined;
  } | undefined;
  quests?: ReadonlyArray<{
    id?: string | undefined;
    title: string;
    objective: string;
    status?: RpgQuestStatus | undefined;
    deadlineTurns?: number | null | undefined;
  }> | undefined;
}

function slugId(prefix: string, text: string): string {
  const slug = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return `${prefix}-${slug || "node"}`;
}

export function reduceRpgState(previous: RpgState | null | undefined, update: RpgTurnUpdate): RpgState {
  const baseVitals = previous?.vitals ?? RpgVitalsSchema.parse({ name: update.personaName || "Adventurer" });
  const maxHp = update.vitals?.maxHp ?? baseVitals.maxHp;
  const maxStamina = update.vitals?.maxStamina ?? baseVitals.maxStamina;
  const nextVitals = RpgVitalsSchema.parse({
    ...baseVitals,
    name: update.vitals?.name?.trim() || update.personaName?.trim() || baseVitals.name,
    ...(update.vitals?.level !== undefined ? { level: update.vitals.level } : {}),
    ...(update.vitals?.archetype ? { archetype: update.vitals.archetype } : {}),
    maxHp,
    hp: Math.min(maxHp, update.vitals?.hp ?? baseVitals.hp),
    maxStamina,
    stamina: Math.min(maxStamina, update.vitals?.stamina ?? baseVitals.stamina),
    ...(update.vitals?.stress !== undefined ? { stress: update.vitals.stress } : {}),
    ...(update.vitals?.currency !== undefined ? { currency: update.vitals.currency } : {}),
    ...(update.vitals?.inventory !== undefined ? { inventory: update.vitals.inventory } : {}),
    ...(update.vitals?.statusEffects !== undefined ? { statusEffects: update.vitals.statusEffects } : {}),
    ...(update.vitals?.companions !== undefined ? { companions: update.vitals.companions } : {}),
  });

  const questMap = new Map<string, RpgQuest>();
  for (const existing of previous?.quests ?? []) {
    questMap.set(existing.id, {
      ...existing,
      turnsElapsed: existing.status === "active" ? existing.turnsElapsed + 1 : existing.turnsElapsed,
    });
  }
  for (const q of update.quests ?? []) {
    const id = q.id?.trim() || slugId("quest", q.title);
    const prev = questMap.get(id);
    questMap.set(
      id,
      RpgQuestSchema.parse({
        id,
        title: q.title,
        objective: q.objective,
        status: q.status ?? prev?.status ?? "active",
        deadlineTurns: q.deadlineTurns !== undefined ? q.deadlineTurns : (prev?.deadlineTurns ?? null),
        turnsElapsed: prev?.turnsElapsed ?? 0,
      }),
    );
  }

  const nodes = [...(previous?.atlas.nodes ?? []).map((n) => ({ ...n }))];
  const edges = [...(previous?.atlas.edges ?? []).map((e) => ({ ...e }))];
  let currentLocationId = previous?.atlas.currentLocationId ?? null;

  for (const loc of update.locations ?? []) {
    const clean = loc.location.trim();
    if (!clean || clean.toLowerCase() === "the current setting") continue;
    const nodeId = slugId("node", clean);
    const existingNode = nodes.find((n) => n.id === nodeId);
    if (existingNode) {
      if (currentLocationId !== nodeId) existingNode.visits += 1;
      if (loc.description && !existingNode.summary) existingNode.summary = loc.description.slice(0, 300);
    } else if (nodes.length < 48) {
      nodes.push({
        id: nodeId,
        label: clean.slice(0, 160),
        summary: (loc.description ?? "").slice(0, 300),
        visits: 1,
      });
    }
    if (currentLocationId && currentLocationId !== nodeId) {
      const hasEdge = edges.some(
        (e) => (e.from === currentLocationId && e.to === nodeId) || (e.from === nodeId && e.to === currentLocationId),
      );
      if (!hasEdge && edges.length < 96) {
        edges.push({ from: currentLocationId, to: nodeId });
      }
    }
    currentLocationId = nodeId;
  }

  return RpgStateSchema.parse({
    turnCounter: (previous?.turnCounter ?? 0) + 1,
    vitals: nextVitals,
    quests: [...questMap.values()].slice(0, 16),
    atlas: {
      currentLocationId,
      nodes,
      edges,
    },
  });
}

export function buildRpgPromptGuidance(state: RpgState | null | undefined, mode: RpgMode): string {
  if (mode === "off") return "";
  const lines: string[] = [
    mode === "lite"
      ? "RPG SKILL CHECKS (LITE MODE):"
      : "STANDALONE RPG STATE & QUEST TRACKING (FULL MODE):",
    "- When generating choices where the outcome is risky, contested, or uncertain, attach an optional `check: { stat: 'STR'|'DEX'|'CON'|'INT'|'WIS'|'CHA'|'LUCK', dc: 5..30, modifier: -10..20, rollMode: 'normal'|'advantage'|'disadvantage', reason?: string }` to that choice.",
    "- If the user's message begins with `[SKILL CHECK: ...]`, honor the rolled tier (`CRITICAL_SUCCESS`, `SUCCESS`, `PARTIAL`, `FAILURE`, `CRITICAL_FAILURE`) honestly in the story consequences without sycophancy.",
  ];
  if (mode === "full") {
    lines.push(
      "- Also return an optional top-level `rpg: { vitals?: { name?, level?, archetype?, hp?, maxHp?, stamina?, maxStamina?, stress?, currency?, inventory?, statusEffects?, companions?: [{ name, hp, maxHp, affinity, status }] }, quests?: [{ id?, title, objective, status?: 'active'|'completed'|'failed', deadlineTurns?: number|null }] }` reflecting any story-established changes to vitals, inventory, companions, or quests.",
    );
    if (state) {
      const activeQuests = state.quests
        .filter((q) => q.status === "active")
        .map((q) => `${q.title} (${computeQuestUrgency(q)})`)
        .join("; ");
      lines.push(
        `- Current RPG Snapshot (Turn ${state.turnCounter}, Pacing Pressure ${computePacingFrustrationMultiplier(state.turnCounter)}x): HP ${state.vitals.hp}/${state.vitals.maxHp}, STA ${state.vitals.stamina}/${state.vitals.maxStamina}, Stress ${state.vitals.stress}/100${activeQuests ? ` | Active Quests: ${activeQuests}` : ""}.`,
      );
    }
  }
  return lines.join("\n");
}
