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

export const ChoiceRequirementsSchema = z.object({
  flags: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
  items: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
}).strict();
export type ChoiceRequirements = z.infer<typeof ChoiceRequirementsSchema>;

export const RpgCompanionDeltaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  affinityDelta: z.number().int().min(-100).max(100).default(0),
  status: z.string().trim().max(120).optional(),
}).strict();

export const RpgDeltasSchema = z.object({
  hpDelta: z.number().int().min(-9999).max(9999).optional(),
  staminaDelta: z.number().int().min(-9999).max(9999).optional(),
  stressDelta: z.number().int().min(-100).max(100).optional(),
  itemsAdded: z.array(z.string().trim().min(1).max(160)).max(12).optional(),
  itemsRemoved: z.array(z.string().trim().min(1).max(160)).max(12).optional(),
  flagsSet: z.record(z.string().trim().min(1).max(120), z.boolean()).optional(),
  flagsCleared: z.array(z.string().trim().min(1).max(120)).max(16).optional(),
  companionAffinityDeltas: z.array(RpgCompanionDeltaSchema).max(8).optional(),
}).strict();
export type RpgDeltas = z.infer<typeof RpgDeltasSchema>;

export const RpgStateSchema = z.object({
  turnCounter: z.number().int().nonnegative().default(0),
  turnsSinceProgress: z.number().int().nonnegative().default(0),
  vitals: RpgVitalsSchema,
  quests: z.array(RpgQuestSchema).max(16).default([]),
  atlas: RpgAtlasSchema,
  flags: z.record(z.string().trim().min(1).max(120), z.boolean()).default({}),
}).strict();
export type RpgState = z.infer<typeof RpgStateSchema>;

export interface RpgTurnUpdate {
  personaName?: string | undefined;
  dramaticProgress?: boolean | undefined;
  locations?: ReadonlyArray<{ location: string; description?: string | undefined }> | undefined;
  rpgDeltas?: RpgDeltas | undefined;
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
  const deltas = update.rpgDeltas;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.trunc(n)));

  const baseHp = update.vitals?.hp !== undefined ? update.vitals.hp : baseVitals.hp;
  const baseStamina = update.vitals?.stamina !== undefined ? update.vitals.stamina : baseVitals.stamina;
  const baseStress = update.vitals?.stress !== undefined ? update.vitals.stress : baseVitals.stress;
  const nextHp = clamp(baseHp + (deltas?.hpDelta ?? 0), 0, maxHp);
  const nextStamina = clamp(baseStamina + (deltas?.staminaDelta ?? 0), 0, maxStamina);
  const nextStress = clamp(baseStress + (deltas?.stressDelta ?? 0), 0, 100);

  let nextInventory = [...(update.vitals?.inventory ?? baseVitals.inventory)];
  let progressed = Boolean(update.dramaticProgress);
  if (deltas?.itemsRemoved?.length) {
    const removeSet = new Set(deltas.itemsRemoved.map((item) => item.trim().toLowerCase()));
    nextInventory = nextInventory.filter((item) => !removeSet.has(item.trim().toLowerCase()));
  }
  if (deltas?.itemsAdded?.length) {
    for (const added of deltas.itemsAdded) {
      const clean = added.trim();
      if (clean && !nextInventory.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
        nextInventory.push(clean);
        progressed = true;
      }
    }
  }
  nextInventory = nextInventory.slice(0, 24);

  const companionMap = new Map<string, RpgCompanion>();
  for (const comp of update.vitals?.companions ?? baseVitals.companions) {
    companionMap.set(comp.name.trim().toLowerCase(), { ...comp });
  }
  for (const delta of deltas?.companionAffinityDeltas ?? []) {
    const key = delta.name.trim().toLowerCase();
    const existing = companionMap.get(key);
    if (existing) {
      existing.affinity = clamp(existing.affinity + delta.affinityDelta, -100, 100);
      if (delta.status) existing.status = delta.status;
    } else {
      companionMap.set(key, RpgCompanionSchema.parse({
        name: delta.name,
        affinity: clamp(delta.affinityDelta, -100, 100),
        ...(delta.status ? { status: delta.status } : {}),
      }));
    }
  }

  const nextFlags: Record<string, boolean> = { ...(previous?.flags ?? {}) };
  for (const key of deltas?.flagsCleared ?? []) {
    delete nextFlags[key];
  }
  for (const [k, v] of Object.entries(deltas?.flagsSet ?? {})) {
    if (nextFlags[k] !== v) progressed = true;
    nextFlags[k] = v;
  }
  const trimmedFlags = Object.fromEntries(Object.entries(nextFlags).slice(-64));

  const nextVitals = RpgVitalsSchema.parse({
    ...baseVitals,
    name: update.vitals?.name?.trim() || update.personaName?.trim() || baseVitals.name,
    ...(update.vitals?.level !== undefined ? { level: update.vitals.level } : {}),
    ...(update.vitals?.archetype ? { archetype: update.vitals.archetype } : {}),
    maxHp,
    hp: nextHp,
    maxStamina,
    stamina: nextStamina,
    stress: nextStress,
    ...(update.vitals?.currency !== undefined ? { currency: update.vitals.currency } : {}),
    inventory: nextInventory,
    ...(update.vitals?.statusEffects !== undefined ? { statusEffects: update.vitals.statusEffects } : {}),
    companions: [...companionMap.values()].slice(0, 8),
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
    const nextStatus = q.status ?? prev?.status ?? "active";
    if (!prev || (prev.status !== "completed" && nextStatus === "completed") || prev.objective !== q.objective) progressed = true;
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
      if (currentLocationId !== nodeId) progressed = true;
      if (currentLocationId !== nodeId) existingNode.visits += 1;
      if (loc.description && !existingNode.summary) existingNode.summary = loc.description.slice(0, 300);
    } else if (nodes.length < 48) {
      progressed = true;
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
    turnsSinceProgress: progressed ? 0 : ((previous?.turnsSinceProgress ?? 0) + 1),
    vitals: nextVitals,
    quests: [...questMap.values()].slice(0, 16),
    atlas: {
      currentLocationId,
      nodes,
      edges,
    },
    flags: trimmedFlags,
  });
}

export interface SkillCheckModifierSource {
  label: string;
  delta: number;
  advantage?: boolean;
}

export function evaluateContextualSkillCheckDetailed(
  check: SkillCheck,
  vitals?: RpgVitals | null,
): { check: SkillCheck; sources: SkillCheckModifierSource[] } {
  const sources: SkillCheckModifierSource[] = [];
  if (check.modifier) sources.push({ label: "Base", delta: check.modifier });
  if (!vitals) return { check, sources };
  let mod = check.modifier ?? 0;
  let rollMode = check.rollMode ?? "normal";
  if (vitals.stress >= 80) {
    mod -= 1;
    sources.push({ label: "High Stress", delta: -1 });
  }
  if (vitals.stamina <= 15 && (check.stat === "STR" || check.stat === "DEX" || check.stat === "CON")) {
    mod -= 1;
    sources.push({ label: "Low Stamina", delta: -1 });
  }
  if ((check.stat === "CHA" || check.stat === "WIS") && vitals.companions.some((c) => c.affinity >= 50)) {
    mod += 1;
    sources.push({ label: "Companion Bond", delta: 1 });
  }
  // High companion bond (>= 75) grants tactical/emotional edge -> advantage on relational/insight checks
  if ((check.stat === "CHA" || check.stat === "WIS") && vitals.companions.some((c) => c.affinity >= 75)) {
    if (rollMode === "normal") rollMode = "advantage";
    else if (rollMode === "disadvantage") rollMode = "normal";
    sources.push({ label: "Bond Advantage", delta: 0, advantage: true });
  }
  // Matching key inventory gear lends +1 or advantage when check reason references the item
  const reasonLower = (check.reason ?? "").toLowerCase();
  const matchingGear = vitals.inventory.find((item) => {
    const normalized = typeof item === "string" ? item.trim().toLowerCase() : "";
    return normalized.length >= 3 && reasonLower.includes(normalized);
  });
  if (matchingGear) {
    mod += 1;
    if (rollMode === "normal") rollMode = "advantage";
    sources.push({ label: `Gear: ${matchingGear}`, delta: 1, advantage: true });
  }
  const clampedMod = Math.max(-10, Math.min(20, mod));
  return { check: { ...check, modifier: clampedMod, rollMode }, sources };
}

export function evaluateContextualSkillCheck(check: SkillCheck, vitals?: RpgVitals | null): SkillCheck {
  return evaluateContextualSkillCheckDetailed(check, vitals).check;
}

export function evaluateChoiceGate(
  requires: ChoiceRequirements | undefined,
  customReason: string | undefined,
  state: RpgState | null | undefined,
): { locked: boolean; lockedReason: string | null } {
  if (!requires) return { locked: false, lockedReason: null };
  const flags = state?.flags ?? {};
  const inventory = (state?.vitals.inventory ?? []).map((item) => item.trim().toLowerCase());
  for (const requiredFlag of requires.flags ?? []) {
    if (!flags[requiredFlag]) {
      return { locked: true, lockedReason: customReason?.trim() || `Requires ${requiredFlag.replace(/[_-]+/g, " ")}` };
    }
  }
  for (const requiredItem of requires.items ?? []) {
    const needle = requiredItem.trim().toLowerCase();
    const hasItem = inventory.some((owned) => owned === needle || owned.includes(needle));
    if (!hasItem) {
      return { locked: true, lockedReason: customReason?.trim() || `Requires ${requiredItem}` };
    }
  }
  return { locked: false, lockedReason: null };
}

/** Static RPG schema & choice instructions (KV-cache safe for system prompt). */
export function buildRpgStaticRules(mode: RpgMode): string {
  if (mode === "off") return "";
  const lines: string[] = [
    mode === "lite"
      ? "RPG SKILL CHECKS (LITE MODE):"
      : "STANDALONE RPG STATE & QUEST TRACKING (FULL MODE):",
    "- When generating choices where the outcome is risky, contested, or uncertain, attach an optional `check: { stat: 'STR'|'DEX'|'CON'|'INT'|'WIS'|'CHA'|'LUCK', dc: 5..30, modifier: -10..20, rollMode: 'normal'|'advantage'|'disadvantage', reason?: string }` to that choice.",
    "- Choices may optionally declare `requires: { flags?: string[], items?: string[] }`, `lockedReason?: string`, and `setsFlags?: Record<string, boolean>` for gated story paths.",
    "- If the user's message begins with `[SKILL CHECK: ...]`, honor the rolled tier (`CRITICAL_SUCCESS`, `SUCCESS`, `PARTIAL`, `FAILURE`, `CRITICAL_FAILURE`) honestly in the story consequences without sycophancy.",
  ];
  if (mode === "full") {
    lines.push(
      "- Also return optional `rpg: { vitals?, quests? }` AND additive `rpgDeltas: { hpDelta?, staminaDelta?, stressDelta?, itemsAdded?, itemsRemoved?, flagsSet?, flagsCleared?, companionAffinityDeltas?: [{ name, affinityDelta, status? }] }` reflecting story-established state changes.",
    );
  }
  return lines.join("\n");
}

export interface RpgSnapshotOptions {
  activeCast?: readonly string[] | undefined;
  thoughtCabinet?: ReadonlyArray<{ title: string; status: string }> | undefined;
  npcBeliefs?: Record<string, ReadonlyArray<{ fact: string; knowsSecret: boolean }>> | undefined;
  maxChars?: number | undefined;
}

/** Dynamic per-turn RPG snapshot (routed to user turn delta bus so system prompt stays static, <= 480 chars). */
export function buildRpgTurnSnapshot(
  state: RpgState | null | undefined,
  mode: RpgMode,
  options?: RpgSnapshotOptions,
): string {
  if (mode !== "full" || !state) return "";
  const cap = Math.max(160, Math.min(960, Math.trunc(options?.maxChars ?? 480)));
  const pressure = computePacingFrustrationMultiplier(state.turnsSinceProgress ?? state.turnCounter);
  const locId = state.atlas?.currentLocationId ?? null;
  const locLabel = locId
    ? ((state.atlas?.nodes ?? []).find((n) => n.id === locId)?.label ?? locId).trim().slice(0, 32)
    : "none";
  const v = state.vitals ?? { hp: 0, maxHp: 0, stamina: 0, maxStamina: 0, stress: 0, inventory: [], companions: [] };
  const header = `[STATE] T${state.turnCounter ?? 0} P${pressure}x @ ${locLabel} | HP:${v.hp}/${v.maxHp} STA:${v.stamina}/${v.maxStamina} STR:${v.stress}`;

  const segments: string[] = [header];
  let used = header.length;

  const packSegment = (prefix: string, tokens: string[]): void => {
    if (tokens.length === 0) return;
    const fitted: string[] = [];
    const sep = " | ";
    let len = used + sep.length + prefix.length;
    if (len + 4 > cap) return;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i]!;
      const itemLen = (fitted.length > 0 ? 1 : 0) + tok.length;
      const overflowReserve = i < tokens.length - 1 ? 5 : 0; // ",+99"
      if (len + itemLen + overflowReserve <= cap) {
        fitted.push(tok);
        len += itemLen;
      } else {
        const remaining = tokens.length - fitted.length;
        if (fitted.length > 0 && remaining > 0) {
          const suffix = `,+${remaining}`;
          if (len + suffix.length <= cap) {
            segments.push(`${prefix}${fitted.join(",")}${suffix}`);
            used = len + suffix.length;
            return;
          }
        }
        break;
      }
    }
    if (fitted.length > 0) {
      segments.push(`${prefix}${fitted.join(",")}`);
      used = len;
    }
  };

  const activeFlags = Object.entries(state.flags ?? {})
    .filter(([, on]) => on)
    .map(([k]) => k.trim().slice(0, 24))
    .sort();
  packSegment("Flags:", activeFlags);

  const gear = (v.inventory ?? []).map((item) => item.trim().slice(0, 18)).filter(Boolean);
  packSegment("Gear:", gear);

  const companions = v.companions ?? [];
  if (companions.length > 0) {
    const castSet = new Set((options?.activeCast ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean));
    const sorted = [...companions].sort((a, b) => {
      const aCast = castSet.has(a.name.trim().toLowerCase()) ? 1 : 0;
      const bCast = castSet.has(b.name.trim().toLowerCase()) ? 1 : 0;
      if (aCast !== bCast) return bCast - aCast;
      return b.affinity - a.affinity;
    });
    const partyTokens = sorted.map((c) => {
      const aff = c.affinity >= 0 ? `+${c.affinity}` : `${c.affinity}`;
      const st = c.status && c.status !== "healthy" ? `,${c.status.trim().slice(0, 10)}` : "";
      return `${c.name.trim().slice(0, 14)}(aff:${aff}${st})`;
    });
    packSegment("Party:", partyTokens);
  }

  const activeQuests = (state.quests ?? [])
    .filter((q) => q.status === "active")
    .map((q) => `${q.title.trim().slice(0, 26)}(${computeQuestUrgency(q)})`);
  packSegment("Q:", activeQuests);

  const openThoughts = (options?.thoughtCabinet ?? [])
    .filter((t) => t.status !== "resolved")
    .slice(0, 3)
    .map((t) => t.title.trim().slice(0, 24))
    .filter(Boolean);
  packSegment("Threads:", openThoughts);

  if (options?.npcBeliefs) {
    const castSet = new Set((options.activeCast ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean));
    const beliefTokens: string[] = [];
    for (const [npc, entries] of Object.entries(options.npcBeliefs)) {
      if (castSet.size > 0 && !castSet.has(npc.trim().toLowerCase())) continue;
      for (const entry of entries) {
        if (entry.knowsSecret) continue;
        beliefTokens.push(`${npc.trim().slice(0, 10)}:${entry.fact.trim().slice(0, 22)}`);
        if (beliefTokens.length >= 3) break;
      }
      if (beliefTokens.length >= 3) break;
    }
    packSegment("Beliefs:", beliefTokens);
  }

  return segments.join(" | ").slice(0, cap);
}

export function buildRpgPromptGuidance(state: RpgState | null | undefined, mode: RpgMode): string {
  return [buildRpgStaticRules(mode), buildRpgTurnSnapshot(state, mode)].filter(Boolean).join("\n");
}
