import { projectTurnPresentation } from "./entity-projection.js";
import {PresentationRuleDocumentSchema,type PresentationRuleDocument} from '../../shared/presentation-rules.js';
import {mergeImageLibrary} from './image-library.js';
import {loadCastArt} from './cast-art.js';
import {setupAppearance,type CastArtRecord} from '../../shared/cast-art.js';
import { CardRoleSchema, StoredCardRoleSchema, type CardRole } from "../../shared/card-role.js";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { ReadingPositionSchema, type ReadingPosition } from "../../shared/reading-position.js";
import type { ImageRequestRecord } from "../../shared/image-review.js";
import { safeImageHistory } from "./image-review.js";
import { normalizeConfig, type VisualNovelConfig } from "../../config.js";
import { AssetJobSchema, SceneStateSchema, TurnPlanSchema, type AssetJob, type SceneState, type TurnPlan } from "../../shared/contracts.js";
import {
  normalizeSingleCharacter
} from "../core/visual-state.js";
import {
  SINGLE_CHARACTER_SCHEMA_VERSION,
  type SingleCharacterState
} from "../../shared/character.js";
import {
  appearanceMapKeyFor,
  characterAppearanceKey,
  distillVisualTags,
  hasIdentityDocumentNoise,
  isUsableIdentity,
  mergeCharacterDeclarations,
  normalizeCharacterName,
  normalizeCharacterRegistry,
  splitTags,
  subjectCategoryFromTags,
  toUsableTags,
  type CharacterAppearanceMap,
  type CharacterDeclaration,
  type CharacterRegistry,
  type RegistryMergeReport
} from "../../shared/identity.js";

export type StoredTurnRecord = {
  /** Additive bounded image occurrence history; future formats are preserved. */
  imageLibrary?: unknown;
  /** Versioned projection; unsupported future data is preserved, not reset. */
  presentation?: unknown;
  schemaVersion: 1;
  correctionRequestIds?: string[];
  imageRecoveryRequestIds?: string[];
  replanRequestIds?: string[];
  forceImageReview?: boolean;
  plannerMode?: 'model' | 'fallback';
  cardRole?: CardRole;
  cardId?: string;
  speaker: string;
  userSpeaker?: string;
  status: "planning" | "ready" | "failed" | "cancelled";
  plan: TurnPlan;
  jobs: AssetJob[];
  imageRequests?: ImageRequestRecord[];
  previousImages?: Record<string, { imageId: string; imageUrl: string }>;
  error?: string;
  updatedAt: string;
  /**
   * The exact narrative text the plan was built from (macro-resolved and
   * cleaned; inline `<img>`/`<pimg>` tags intact). `plan.paragraphs` indexes
   * derive from this string. Absent on records stored before intake v2.
   */
  resolvedSourceText?: string;
  /**
   * Intake bookkeeping. `version: 2` means `plan.key.sourceFingerprint` is a
   * selection fingerprint (resolved text with volatile macros masked) and
   * `rawFingerprint` hashes the stored message text it came from. Records
   * without it were fingerprinted on raw (pre-macro) or fully resolved text.
   */
  source?: { version: 2; rawFingerprint: string };
  settingsSnapshot?: Record<string, unknown>;
  attempts?: Array<{
    attemptNumber: number;
    timestamp: string;
    settings: Record<string, unknown>;
    error?: string | null;
  }>;
};

export type StoredChatState = {
  schemaVersion: 1;
  activeTurnPath: string | null;
  latestScene: SceneState | null;
  terminalContinuity: TurnPlan["terminalContinuity"] | null;
  updatedAt: string;
};

const writeTails = new Map<string, Promise<void>>();

function safeSegment(value: string): string {
  return encodeURIComponent(value).replaceAll("%", "_");
}

function scopedKey(userId: string | undefined, path: string): string {
  return `${userId ?? "owner"}:${path}`;
}

async function serializedWrite(taskKey: string, writer: () => Promise<void>): Promise<void> {
  const previous = writeTails.get(taskKey) ?? Promise.resolve();
  const current = previous.then(writer, writer);
  const tail = current.then(() => undefined, () => undefined);
  writeTails.set(taskKey, tail);
  try {
    await current;
  } finally {
    if (writeTails.get(taskKey) === tail) writeTails.delete(taskKey);
  }
}

function userOptions(userId?: string): { userId: string } | undefined {
  return userId ? { userId } : undefined;
}

function presentationRulePath(scope:'user'|'chat',chatId?:string):string{
 if(scope==='chat'&&!chatId)throw new Error('Open a chat to manage chat preferences.');
 return scope==='user'?'presentation-rules.json':`chats/${safeSegment(chatId!)}/presentation-entities.json`;
}
export async function loadPresentationRuleDocument(spindle:SpindleAPI,scope:'user'|'chat',chatId:string|undefined,userId:string):Promise<PresentationRuleDocument>{
 const raw=await spindle.userStorage.getJson(presentationRulePath(scope,chatId),{fallback:{version:1,revision:0,rules:[]},userId});
 const value=PresentationRuleDocumentSchema.safeParse(raw);
 if(!value.success||value.data.rules.some(rule=>rule.scope!==scope))throw new Error(`${scope==='chat'?'Chat':'Account'} presentation preferences are unavailable or use an unsupported format. Stored data was preserved.`);
 return value.data;
}
/** Reuse the shared storage queue; revision check and mutation are one operation. */
export async function updatePresentationRuleDocument(spindle:SpindleAPI,scope:'user'|'chat',chatId:string|undefined,userId:string,expectedRevision:number,change:(current:PresentationRuleDocument)=>PresentationRuleDocument):Promise<PresentationRuleDocument>{
 const path=presentationRulePath(scope,chatId);let saved!:PresentationRuleDocument;
 await serializedWrite(scopedKey(userId,path),async()=>{
  const current=await loadPresentationRuleDocument(spindle,scope,chatId,userId);
  if(current.revision!==expectedRevision)throw new Error('Presentation preferences changed in another editor. Refresh, review your draft, and save again.');
  saved=PresentationRuleDocumentSchema.parse(change(current));
  await spindle.userStorage.setJson(path,saved,{userId,indent:2});
 });return saved;
}

export function turnPath(chatId: string, messageId: string, swipeId: string | number | null): string {
  return `turns/${safeSegment(chatId)}/${safeSegment(messageId)}/${safeSegment(String(swipeId ?? 0))}.json`;
}

export function chatStatePath(chatId: string): string {
  return `chats/${safeSegment(chatId)}/state.json`;
}

export async function loadReadingPosition(spindle: SpindleAPI, chatId: string, userId?: string): Promise<ReadingPosition | null> {
  const raw = await spindle.userStorage.getJson<unknown>(`chats/${safeSegment(chatId)}/reading-position.json`, { fallback: null, ...(userOptions(userId) ?? {}) });
  const parsed = ReadingPositionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
export async function saveReadingPosition(spindle: SpindleAPI, position: ReadingPosition, userId?: string): Promise<void> {
  const parsed = ReadingPositionSchema.parse(position);
  const path = `chats/${safeSegment(parsed.key.chatId)}/reading-position.json`;
  await serializedWrite(scopedKey(userId, path), () => spindle.userStorage.setJson(path, parsed, userOptions(userId)));
}

/** Path of the persisted single-character visual state for a chat. */
export function singleCharacterStatePath(chatId: string): string {
  return `chats/${safeSegment(chatId)}/visual-state.json`;
}


/**
 * Migrate an arbitrary stored value into a `SingleCharacterState`.
 *
 * Handles the old `{ schemaVersion: 1, profiles }` visual-profile records (the
 * first profile, or `protagonistName` when supplied, becomes the frozen
 * protagonist; the description is split into normalized tags) as well as
 * already-migrated new-style records. `environment` overrides the stored /
 * default descriptor (e.g. the latest scene's `environment.description`).
 */
export function migrateVisualProfilesToSingleCharacter(
  raw: unknown,
  options: { protagonistName?: string; environment?: string } = {}
): SingleCharacterState {
  const normalized = normalizeSingleCharacter(raw, options.protagonistName);
  const rawTags = normalized.protagonist.tags.join(", ");
  // Old Cue builds could persist an entire markdown card as appearance. Never
  // promote that document into canonical memory; leave the name key repairable.
  const tags = hasIdentityDocumentNoise(rawTags)
    ? []
    : toUsableTags(normalized.protagonist.name, normalized.protagonist.tags);
  const state = { ...normalized, protagonist: { name: normalized.protagonist.name, tags } };
  if (options.environment && options.environment.trim()) {
    return { ...state, environment: options.environment.trim() };
  }
  return state;
}

/**
 * Load the single-character visual state for a chat, migrating any legacy
 * v1 profile record present at the path. Returns the empty state when nothing
 * is stored yet.
 */
export async function loadSingleCharacterState(
  spindle: SpindleAPI,
  chatId: string,
  userId?: string
): Promise<SingleCharacterState> {
  const raw = await spindle.userStorage.getJson<unknown>(singleCharacterStatePath(chatId), {
    fallback: null,
    ...(userOptions(userId) ?? {})
  });
  return migrateVisualProfilesToSingleCharacter(raw);
}

/**
 * Persist the single-character visual state for a chat.
 *
 * Freeze rule: once a protagonist is seeded (a non-empty `name`), later saves
 * NEVER overwrite `protagonist` — the identity block is frozen. Only
 * `environment` and `updatedAt` change on subsequent turns. A brand-new chat
 * (no stored protagonist, or a stored legacy record whose migrated protagonist
 * is empty) adopts the incoming protagonist exactly once.
 */
export async function saveSingleCharacterState(
  spindle: SpindleAPI,
  chatId: string,
  state: SingleCharacterState,
  userId?: string,
  isCurrent: () => boolean = () => true
): Promise<void> {
  const path = singleCharacterStatePath(chatId);
  await serializedWrite(scopedKey(userId, path), async () => {
    const existingRaw = await spindle.userStorage.getJson<unknown>(path, {
      fallback: null,
      ...(userOptions(userId) ?? {})
    });
    const existing = migrateVisualProfilesToSingleCharacter(existingRaw);
    if (manualOwnsName(await manualCastRecords(spindle, chatId, userId), state.protagonist.name)) {
      // Setup is reversible presentation guidance, never a learned identity seed.
      state = { ...state, protagonist: existing.protagonist };
    }
    // Freeze only a USEABLE appearance baseline. A poisoned name-only / empty
    // state is not frozen, so it can be repaired once a richer identity exists.
    const existingName = normalizeCharacterName(existing.protagonist.name);
    const existingUsable = isUsableIdentity(existingName, existing.protagonist.tags);
    const incomingName = normalizeCharacterName(state.protagonist.name);
    const incomingUsable = isUsableIdentity(incomingName, state.protagonist.tags);
    const sameCharacter = characterAppearanceKey(existingName) === characterAppearanceKey(incomingName);
    let protagonist: SingleCharacterState["protagonist"];
    if (sameCharacter && existingUsable) {
      // Continuing the same character: freeze initial seed to prevent prompt drift
      protagonist = { name: existing.protagonist.name, tags: toUsableTags(existing.protagonist.name, existing.protagonist.tags) };
    } else if (incomingUsable) {
      // New character or first usable identity: adopt incoming
      protagonist = { name: state.protagonist.name, tags: toUsableTags(state.protagonist.name, state.protagonist.tags) };
    } else if (existingUsable) {
      protagonist = { name: existing.protagonist.name, tags: toUsableTags(existing.protagonist.name, existing.protagonist.tags) };
    } else {
      // Neither source carries a real appearance baseline. Keep the existing name
      // as the memory key, but NEVER inject the name as an appearance tag.
      const name = incomingName || existingName;
      protagonist = { name, tags: [] };
    }
    if (!isCurrent()) return;
    await spindle.userStorage.setJson(path, {
      schemaVersion: SINGLE_CHARACTER_SCHEMA_VERSION,
      protagonist,
      environment: state.environment,
      updatedAt: new Date().toISOString()
    }, {
      indent: 2,
      ...(userOptions(userId) ?? {})
    });
  });
}

/** Path of the durable global character-appearance map (name -> canonical tags). */
export function characterAppearancePath(): string {
  return "character-appearance.json";
}

/** Marker path recording that the one-time chat-state appearance migration ran. */
export function appearanceMigrationMarkerPath(): string {
  return "character-appearance-migrated.json";
}

/** Normalize a raw stored map into usable entries only (never name-only / degraded). */
function normalizeAppearanceMap(raw: unknown): CharacterAppearanceMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const map: CharacterAppearanceMap = {};
  for (const [name, rawTags] of Object.entries(raw as Record<string, unknown>)) {
    const cleanName = normalizeCharacterName(name);
    if (typeof rawTags !== "string" || hasIdentityDocumentNoise(rawTags)) continue;
    const tags = splitTags(rawTags);
    if (!cleanName || !isUsableIdentity(cleanName, tags)) continue;
    map[name] = toUsableTags(cleanName, tags).join(", ");
  }
  return map;
}

/**
 * Runtime callers pass chatId to isolate appearance memory. The legacy global
 * API remains readable, but is never imported into a chat by name alone.
 */
export async function loadCharacterAppearance(
  spindle: SpindleAPI,
  userId?: string,
  chatId?: string
): Promise<CharacterAppearanceMap> {
  if (chatId) {
    const map=normalizeAppearanceMap(await spindle.userStorage.getJson<unknown>(`chats/${safeSegment(chatId)}/characters.json`, { fallback: {}, ...(userOptions(userId) ?? {}) }));
    for(const record of await manualCastRecords(spindle,chatId,userId)){const key=appearanceMapKeyFor(map,record.name);if(key)delete map[key];map[record.name]=setupAppearance(record.setup!);}
    return map;
  }
  const raw = await spindle.userStorage.getJson<unknown>(characterAppearancePath(), {
    fallback: {},
    ...(userOptions(userId) ?? {})
  });
  const base = normalizeAppearanceMap(raw);
  return migrateCharacterAppearanceStates(spindle, base, userId);
}

/** Persist the global character-appearance map (serialized). */
export async function saveCharacterAppearance(
  spindle: SpindleAPI,
  map: CharacterAppearanceMap,
  userId?: string
): Promise<void> {
  const path = characterAppearancePath();
  const normalized = normalizeAppearanceMap(map);
  await serializedWrite(scopedKey(userId, path), () => spindle.userStorage.setJson(path, normalized, {
    indent: 2,
    ...(userOptions(userId) ?? {})
  }));
}

/**
 * Merge a resolved single-character identity into the selected map. Preserves an
 * existing usable baseline exactly; only fills missing entries or repairs
 * degraded (name-only / empty) entries. Names are memory keys, never tags.
 */
export async function mergeCharacterAppearanceFromState(
  spindle: SpindleAPI,
  state: SingleCharacterState,
  userId?: string,
  chatId?: string,
  isCurrent: () => boolean = () => true
): Promise<void> {
  const name = normalizeCharacterName(state.protagonist.name);
  if (chatId && manualOwnsName(await manualCastRecords(spindle, chatId, userId), name)) return;
  const tags = toUsableTags(name, state.protagonist.tags);
  if (!name || tags.length === 0) return;
  const path = chatId ? `chats/${safeSegment(chatId)}/characters.json` : characterAppearancePath();
  await serializedWrite(scopedKey(userId, path), async () => {
    const existingRaw = await spindle.userStorage.getJson<unknown>(path, {
      fallback: {},
      ...(userOptions(userId) ?? {})
    });
    const existing = normalizeAppearanceMap(existingRaw);
    const existingKey = appearanceMapKeyFor(existing, name);
    if (existingKey && isUsableIdentity(name, splitTags(existing[existingKey] ?? ""))) return;
    if (existingKey) delete existing[existingKey];
    existing[name] = tags.join(", ");
    if (!isCurrent()) return;
    await spindle.userStorage.setJson(path, existing, {
      indent: 2,
      ...(userOptions(userId) ?? {})
    });
  });
}

/**
 * Merge planner-extracted characters into the selected appearance map.
 * Ensures characters introduced across scenes are remembered for subsequent turns.
 */
export async function mergePlannerCharacters(
  spindle: SpindleAPI,
  characters: Array<{ name: string; description: string }>,
  userId?: string,
  chatId?: string,
  isCurrent: () => boolean = () => true
): Promise<void> {
  if (!characters || characters.length === 0) return;
  const manual = chatId ? await manualCastRecords(spindle, chatId, userId) : [];
  const path = chatId ? `chats/${safeSegment(chatId)}/characters.json` : characterAppearancePath();
  await serializedWrite(scopedKey(userId, path), async () => {
    const existingRaw = await spindle.userStorage.getJson<unknown>(path, {
      fallback: {},
      ...(userOptions(userId) ?? {})
    });
    const existing = normalizeAppearanceMap(existingRaw);
    let changed = false;
    for (const char of characters) {
      const name = normalizeCharacterName(char.name);
      if (!name || manualOwnsName(manual, name)) continue;
      const key = characterAppearanceKey(name);
      if (!key) continue;
      const tags = distillVisualTags(char.description);
      if (tags.length === 0) continue;
      const existingKey = appearanceMapKeyFor(existing, name);
      if (!existingKey || !isUsableIdentity(name, splitTags(existing[existingKey] ?? ""))) {
        if (existingKey) delete existing[existingKey];
        existing[name] = tags.join(", ");
        changed = true;
      }
    }
    if (changed) {
      if (!isCurrent()) return;
      await spindle.userStorage.setJson(path, existing, {
        indent: 2,
        ...(userOptions(userId) ?? {})
      });
    }
  });
}


/* ------------------------------------------------------------------ *
 * Per-chat character registry: stable ids, explicit aliases, subject class.
 * ------------------------------------------------------------------ */

export const CHARACTER_REGISTRY_SCHEMA_VERSION = 1 as const;

export type StoredCharacterRegistry = {
  schemaVersion: typeof CHARACTER_REGISTRY_SCHEMA_VERSION;
  characters: CharacterRegistry;
  updatedAt: string;
};

/** Path of the per-chat character registry. */
export function characterRegistryPath(chatId: string): string {
  return `chats/${safeSegment(chatId)}/character-registry.json`;
}

/**
 * Reset one chat's durable identity state (frozen protagonist visual state,
 * character registry, per-chat appearance roster) to the empty pre-greeting
 * baseline. Called only when a multi-scene greeting is replanned under a
 * different scene selection while it is the chat's sole assistant turn: the
 * discarded scene produced that state, and the predecessor state of such a
 * chat is empty by definition. Global appearance memory is not touched.
 */
export async function resetChatIdentityState(spindle: SpindleAPI, chatId: string, userId?: string): Promise<void> {
  const options = userOptions(userId);
  const writes: Array<[string, unknown]> = [
    [singleCharacterStatePath(chatId), null],
    [characterRegistryPath(chatId), {}],
    [chatRosterPath(chatId), {}]
  ];
  for (const [path, value] of writes) {
    await serializedWrite(scopedKey(userId, path), () => spindle.userStorage.setJson(path, value, { ...(options ?? {}) }));
  }
}

function chatRosterPath(chatId: string): string {
  return `chats/${safeSegment(chatId)}/characters.json`;
}

/**
 * Backward-compatible registry read. Chats created before the registry existed
 * have only `characters.json` (name -> tags) and `visual-state.json`; those
 * names are promoted to canonical entries with derived ids, no aliases, and a
 * subject category taken only from explicit gender words in the tags. Nothing
 * is written on load.
 */
async function loadLearnedCharacterRegistry(
  spindle: SpindleAPI,
  chatId: string,
  userId?: string
): Promise<CharacterRegistry> {
  const options = { fallback: null, ...(userOptions(userId) ?? {}) };
  const raw = await spindle.userStorage.getJson<unknown>(characterRegistryPath(chatId), options);
  const stored = normalizeCharacterRegistry(raw);
  const declarations: CharacterDeclaration[] = [];
  const rosterRaw = await spindle.userStorage.getJson<unknown>(chatRosterPath(chatId), { fallback: {}, ...(userOptions(userId) ?? {}) });
  for (const [name, tags] of Object.entries(normalizeAppearanceMap(rosterRaw))) declarations.push({ name, tags });
  const visualRaw = await spindle.userStorage.getJson<unknown>(singleCharacterStatePath(chatId), options);
  const visual = migrateVisualProfilesToSingleCharacter(visualRaw);
  if (normalizeCharacterName(visual.protagonist.name)) declarations.push({ name: visual.protagonist.name, tags: visual.protagonist.tags });
  return mergeCharacterDeclarations(stored, declarations).registry;
}

export async function loadCharacterRegistry(spindle: SpindleAPI, chatId: string, userId?: string): Promise<CharacterRegistry> {
  let registry = await loadLearnedCharacterRegistry(spindle, chatId, userId);
  for(const record of await manualCastRecords(spindle,chatId,userId)){
    const setup=record.setup!;
    registry=mergeCharacterDeclarations(registry,[{name:record.name,tags:setupAppearance(setup),aliases:setup.aliases}]).registry;
    const entry=Object.values(registry).find(e=>characterAppearanceKey(e.name)===characterAppearanceKey(record.name));
    if(entry){entry.tags=setupAppearance(setup);entry.aliases=setup.aliases.filter(alias=>!Object.values(registry).some(other=>other.id!==entry.id&&[other.name,...other.aliases].some(n=>characterAppearanceKey(n)===characterAppearanceKey(alias))));entry.subjectCategory=subjectCategoryFromTags(setup.appearance);}
  }
  return registry;
}

function manualOwnsName(records: CastArtRecord[], name: string): boolean {
  const key = characterAppearanceKey(name);
  return records.some(record => [record.name, ...record.setup!.aliases].some(value => characterAppearanceKey(value) === key));
}

async function manualCastRecords(spindle:SpindleAPI,chatId:string,userId?:string):Promise<CastArtRecord[]>{
 try{return (await loadCastArt(spindle,chatId,userId)).characters.filter(record=>record.setup!==undefined);}
 catch{spindle.log?.warn?.('Manual cast setup is unavailable; saved identity state remains intact.');return [];}
}

/**
 * Merge explicit declarations into the persisted registry (serialized
 * read-merge-write). Existing ids, canonical names and usable baselines are
 * never rewritten; aliases owned by another entry are rejected and reported.
 */
export async function mergeCharacterRegistry(
  spindle: SpindleAPI,
  chatId: string,
  declarations: readonly CharacterDeclaration[],
  userId?: string,
  isCurrent: () => boolean = () => true
): Promise<RegistryMergeReport> {
  const path = characterRegistryPath(chatId);
  let report: RegistryMergeReport = { registry: {}, changed: false, rejectedAliases: [], rejectedSubjects: [] };
  await serializedWrite(scopedKey(userId, path), async () => {
    const existing = await loadLearnedCharacterRegistry(spindle, chatId, userId);
    const existingRaw = await spindle.userStorage.getJson<unknown>(path, { fallback: null, ...(userOptions(userId) ?? {}) });
    const manual = await manualCastRecords(spindle, chatId, userId);
    report = mergeCharacterDeclarations(existing, declarations.filter(entry => !manualOwnsName(manual, entry.name)).map(entry => ({...entry, aliases: entry.aliases?.filter(alias => !manualOwnsName(manual, alias))})));
    // Persist when anything changed, or when legacy sources were promoted for the first time.
    const promoted = !existingRaw && Object.keys(existing).length > 0;
    if (!report.changed && !promoted) return;
    const record: StoredCharacterRegistry = {
      schemaVersion: CHARACTER_REGISTRY_SCHEMA_VERSION,
      characters: report.registry,
      updatedAt: new Date().toISOString()
    };
    if (!isCurrent()) return;
    await spindle.userStorage.setJson(path, record, { indent: 2, ...(userOptions(userId) ?? {}) });
  });
  return report;
}

/** Persist a whole resolved registry (e.g. the planner's merged result) without dropping entries. */
export async function saveCharacterRegistry(
  spindle: SpindleAPI,
  chatId: string,
  registry: CharacterRegistry,
  userId?: string,
  isCurrent: () => boolean = () => true
): Promise<RegistryMergeReport> {
  const declarations: CharacterDeclaration[] = Object.values(registry).map((entry) => ({
    name: entry.name,
    characterId: entry.id,
    aliases: entry.aliases,
    tags: entry.tags,
    subjectCategory: entry.subjectCategory
  }));
  return mergeCharacterRegistry(spindle, chatId, declarations, userId, isCurrent);
}

/**
 * One-time batch migration/repair. Lists every `chats/<id>/visual-state.json`,
 * selects the richest usable identity per character name, merges it into (and
 * never degrades) the global map, and repairs poisoned name-only chat states.
 * Safe to call repeatedly; guarded by a persisted marker.
 */
export async function migrateCharacterAppearanceStates(
  spindle: SpindleAPI,
  base: CharacterAppearanceMap,
  userId?: string
): Promise<CharacterAppearanceMap> {
  const markerPath = appearanceMigrationMarkerPath();
  let marked = false;
  try {
    marked = await spindle.userStorage.getJson<boolean>(markerPath, {
      fallback: false,
      ...(userOptions(userId) ?? {})
    });
  } catch {
    marked = false;
  }
  if (marked) return base;

  let chatPaths: string[] = [];
  if (typeof spindle.userStorage.list === "function") {
    try {
      const listed = await spindle.userStorage.list("chats/", userId);
      chatPaths = (Array.isArray(listed) ? listed : []).filter((file) => file.endsWith("visual-state.json"));
    } catch {
      chatPaths = [];
    }
  }

  const candidates = new Map<string, { name: string; tags: string[] }>();
  for (const [name, rawTags] of Object.entries(base)) {
    const key = characterAppearanceKey(name);
    const tags = splitTags(rawTags);
    if (key && isUsableIdentity(name, tags)) candidates.set(key, { name, tags });
  }
  const chatStates = new Map<string, SingleCharacterState>();
  for (const file of chatPaths) {
    let raw: unknown;
    try {
      raw = await spindle.userStorage.getJson<unknown>(file, {
        fallback: null,
        ...(userOptions(userId) ?? {})
      });
    } catch {
      continue;
    }
    const state = migrateVisualProfilesToSingleCharacter(raw);
    chatStates.set(file, state);
    const key = characterAppearanceKey(state.protagonist.name);
    if (!key || !isUsableIdentity(state.protagonist.name, state.protagonist.tags)) continue;
    const tags = toUsableTags(state.protagonist.name, state.protagonist.tags);
    const existing = candidates.get(key);
    if (!existing || tags.length > existing.tags.length) {
      candidates.set(key, { name: state.protagonist.name, tags });
    }
  }

  const next: CharacterAppearanceMap = {};
  for (const [, candidate] of candidates) {
    if (candidate.tags.length) next[candidate.name] = candidate.tags.join(", ");
  }
  for (const [name, tags] of Object.entries(base)) {
    const key = characterAppearanceKey(name);
    if (!next[key]) next[name] = tags;
  }

  // Repair poisoned chat states with the richest usable baseline per name.
  for (const [file, state] of chatStates) {
    if (isUsableIdentity(state.protagonist.name, state.protagonist.tags)) continue;
    const key = characterAppearanceKey(state.protagonist.name);
    const best = candidates.get(key);
    if (!best || best.tags.length === 0) continue;
    await serializedWrite(scopedKey(userId, file), () => spindle.userStorage.setJson(file, {
      schemaVersion: SINGLE_CHARACTER_SCHEMA_VERSION,
      protagonist: { name: best.name, tags: [...best.tags] },
      environment: state.environment,
      updatedAt: new Date().toISOString()
    }, {
      indent: 2,
      ...(userOptions(userId) ?? {})
    }));
  }

  if (JSON.stringify(next) !== JSON.stringify(base)) {
    await saveCharacterAppearance(spindle, next, userId);
  }
  await serializedWrite(scopedKey(userId, markerPath), () => spindle.userStorage.setJson(markerPath, true, {
    indent: 2,
    ...(userOptions(userId) ?? {})
  }));
  return next;
}

export async function loadConfig(spindle: SpindleAPI, userId?: string): Promise<VisualNovelConfig> {
  const raw = await spindle.userStorage.getJson<unknown>("config.json", {
    fallback: {},
    ...(userOptions(userId) ?? {})
  });
  return normalizeConfig(raw);
}

export async function updateConfig(
  spindle: SpindleAPI,
  patch: Partial<VisualNovelConfig>,
  userId?: string
): Promise<VisualNovelConfig> {
  const current = await loadConfig(spindle, userId);
  const next = normalizeConfig({ ...current, ...patch });
  await serializedWrite(scopedKey(userId, "config.json"), () => spindle.userStorage.setJson("config.json", next, {
    indent: 2,
    ...(userOptions(userId) ?? {})
  }));
  return next;
}

export async function loadChatState(spindle: SpindleAPI, chatId: string, userId?: string): Promise<StoredChatState> {
  const stored = await spindle.userStorage.getJson<unknown>(chatStatePath(chatId), {
    fallback: {},
    ...(userOptions(userId) ?? {})
  });
  const raw=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored as Partial<StoredChatState>:{};
  // Scene/continuity are optional planning caches, not the saved story. An
  // incompatible cache must not prevent loading the active turn or a new reply.
  // Preserve storage unchanged here; ordinary future planning can refresh it.
  const optionalCache=<T>(value:unknown,parse:(v:unknown)=>T,label:string):T|null=>{
    if(value===undefined||value===null)return null;
    try{return parse(value);}catch{spindle.log?.warn?.(`Saved ${label} cache is unavailable; continuing without that optional cache.`);return null;}
  };
  return {
    schemaVersion: 1,
    activeTurnPath: typeof raw.activeTurnPath === 'string' ? raw.activeTurnPath : null,
    latestScene: optionalCache(raw.latestScene,value=>SceneStateSchema.parse(value),'scene'),
    terminalContinuity: optionalCache(raw.terminalContinuity,value=>TurnPlanSchema.shape.terminalContinuity.parse(value),'continuity'),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString()
  };
}

export async function saveChatState(
  spindle: SpindleAPI,
  chatId: string,
  state: StoredChatState,
  userId?: string,
  isCurrent: () => boolean = () => true
): Promise<void> {
  const path = chatStatePath(chatId);
  await serializedWrite(scopedKey(userId, path), () => isCurrent() ? spindle.userStorage.setJson(path, state, {
    indent: 2,
    ...(userOptions(userId) ?? {})
  }) : Promise.resolve());
}

export async function loadTurnRecord(
  spindle: SpindleAPI,
  path: string | null,
  userId?: string
): Promise<StoredTurnRecord | null> {
  if (!path) return null;
  const raw = await spindle.userStorage.getJson<Partial<StoredTurnRecord> | null>(path, {
    fallback: null,
    ...(userOptions(userId) ?? {})
  });
  if (!raw?.plan || typeof raw.speaker !== "string") return null;
  const status = raw.status === "planning" || raw.status === "failed" || raw.status === "cancelled" ? raw.status : "ready";
  return {
    schemaVersion: 1,
    ...(raw.presentation !== undefined ? {presentation:raw.presentation} : {}),
    ...(raw.imageLibrary!==undefined?{imageLibrary:raw.imageLibrary}:{}),
    speaker: raw.speaker,
    ...(Array.isArray(raw.correctionRequestIds) ? {correctionRequestIds:raw.correctionRequestIds.filter(id=>typeof id === "string" && id.length <= 100).slice(-32)} : {}),
    ...(Array.isArray(raw.replanRequestIds) ? {replanRequestIds:raw.replanRequestIds.filter(id=>typeof id === "string" && id.length <= 100).slice(-32)} : {}),
    ...(raw.forceImageReview === true ? {forceImageReview:true} : {}),
    ...(raw.plannerMode === 'model' || raw.plannerMode === 'fallback' ? {plannerMode:raw.plannerMode} : {}),
    ...(CardRoleSchema.safeParse(raw.cardRole).success ? {cardRole: CardRoleSchema.parse(raw.cardRole)} : {}),
    ...(typeof raw.cardId === "string" ? {cardId:raw.cardId} : {}),
    status,
    plan: TurnPlanSchema.parse(raw.plan),
    jobs: Array.isArray(raw.jobs) ? raw.jobs.map((job) => AssetJobSchema.parse(job)) : [],
    ...(Array.isArray(raw.imageRequests) ? { imageRequests: safeImageHistory(raw.imageRequests) } : {}),
    ...(raw.previousImages && typeof raw.previousImages === "object" ? { previousImages: raw.previousImages } : {}),
    ...(typeof raw.error === "string" ? { error: raw.error } : {}),
    ...(typeof raw.resolvedSourceText === "string" ? { resolvedSourceText: raw.resolvedSourceText } : {}),
    ...(raw.source && typeof raw.source === "object" && raw.source.version === 2 && typeof raw.source.rawFingerprint === "string"
      ? { source: { version: 2 as const, rawFingerprint: raw.source.rawFingerprint } }
      : {}),
    ...(raw.settingsSnapshot && typeof raw.settingsSnapshot === "object" ? { settingsSnapshot: raw.settingsSnapshot as Record<string, unknown> } : {}),
    ...(Array.isArray(raw.imageRecoveryRequestIds) ? {imageRecoveryRequestIds:raw.imageRecoveryRequestIds.filter((id):id is string=>typeof id==='string'&&id.length<=100).slice(-32)} : {}),
    ...(Array.isArray(raw.attempts) ? { attempts: raw.attempts as NonNullable<StoredTurnRecord["attempts"]> } : {}),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString()
  };
}

export async function saveTurnRecord(
  spindle: SpindleAPI,
  path: string,
  record: StoredTurnRecord,
  userId?: string
): Promise<void> {
  await serializedWrite(scopedKey(userId, path), async () => {
    const next=await recordWithImageLibrary(spindle,path,record,userId);
    await spindle.userStorage.setJson(path, recordWithPresentation(next), {indent:2,...(userOptions(userId)??{})});
  });
}

/* ------------------------------------------------------------------ *
 * Character reference portraits (image anchoring).
 * ------------------------------------------------------------------ */

/** A stored canonical reference portrait for one character in one chat. */
export type StoredPortrait = {
  /** Display name at capture time (the map key is the case-insensitive form). */
  name: string;
  /** Persisted Lumiverse image ID of the canonical portrait. */
  imageId: string;
  /** Raw base64 image bytes (no data-URL prefix). */
  data: string;
  mimeType: string;
  createdAt: string;
  /** Source prompt used when capturing this portrait, for provenance. */
  prompt?: string;
  identityFingerprint?: string;
  /**
   * Where this portrait came from. Absent means "captured" (legacy records).
   * Card portraits are stored under a `card:`-prefixed map key, so the two
   * sources never overwrite each other and switching the setting back
   * restores the previous anchor.
   */
  source?: "captured" | "card";
  /** Card asset name this portrait was resolved from (card source only). */
  assetName?: string;
};

export type PortraitRecord = {
  schemaVersion: 1;
  portraits: Record<string /* characterAppearanceKey */, StoredPortrait>;
  updatedAt: string;
};

/** Path of the per-chat canonical portrait store. */
export function portraitStatePath(chatId: string): string {
  return `chats/${safeSegment(chatId)}/portraits.json`;
}

export const VALID_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif"
]);

function isStoredPortrait(value: unknown): value is StoredPortrait {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.name !== "string" || !record.name.trim() ||
    typeof record.imageId !== "string" || !record.imageId.trim() ||
    typeof record.data !== "string" || !record.data.trim() ||
    typeof record.mimeType !== "string" || !VALID_IMAGE_MIMES.has(record.mimeType.toLowerCase())
  ) {
    return false;
  }
  const cleanData = record.data.trim();
  return /^[A-Za-z0-9+/]+={0,2}$/.test(cleanData);
}

function normalizePortraitRecord(raw: unknown): PortraitRecord {
  const empty: PortraitRecord = { schemaVersion: 1, portraits: {}, updatedAt: new Date(0).toISOString() };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const record = raw as Record<string, unknown>;
  const source = record.portraits && typeof record.portraits === "object" && !Array.isArray(record.portraits)
    ? record.portraits as Record<string, unknown>
    : {};
  const portraits: Record<string, StoredPortrait> = {};
  for (const [rawKey, value] of Object.entries(source)) {
    const key = characterAppearanceKey(rawKey);
    if (!key || !isStoredPortrait(value)) continue;
    portraits[key] = value;
  }
  return {
    schemaVersion: 1,
    portraits,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : empty.updatedAt
  };
}

/** Load the per-chat portrait map, keyed by `characterAppearanceKey(name)`. */
export async function loadPortraits(
  spindle: SpindleAPI,
  chatId: string,
  userId?: string
): Promise<Record<string, StoredPortrait>> {
  const raw = await spindle.userStorage.getJson<unknown>(portraitStatePath(chatId), {
    fallback: null,
    ...(userOptions(userId) ?? {})
  });
  return normalizePortraitRecord(raw).portraits;
}

/**
 * Persist a canonical portrait for a character. First-wins by default: an
 * existing portrait for the same character is never overwritten unless
 * `options.replace` is true, so the anchor image stays stable for the life of
 * the chat.
 * Returns whether this portrait became the stored one.
 */
export async function savePortrait(
  spindle: SpindleAPI,
  chatId: string,
  portrait: StoredPortrait,
  userId?: string,
  options?: { replace?: boolean; key?: string }
): Promise<boolean> {
  // `options.key` lets card portraits live under `card:<characterKey>` while
  // captured portraits keep the plain character key.
  const key = options?.key?.trim() || characterAppearanceKey(portrait.name);
  if (!key || !isStoredPortrait(portrait)) return false;
  const path = portraitStatePath(chatId);
  let stored = false;
  await serializedWrite(scopedKey(userId, path), async () => {
    const raw = await spindle.userStorage.getJson<unknown>(path, {
      fallback: null,
      ...(userOptions(userId) ?? {})
    });
    const record = normalizePortraitRecord(raw);
    if (record.portraits[key] && !options?.replace) return;
    record.portraits[key] = portrait;
    record.updatedAt = new Date().toISOString();
    await spindle.userStorage.setJson(path, record, {
      indent: 2,
      ...(userOptions(userId) ?? {})
    });
    stored = true;
  });
  return stored;
}

/**
 * Delete a character's canonical portrait from the store, allowing it to be
 * re-seeded on subsequent generations. Returns whether a portrait was deleted.
 */
export async function deletePortrait(
  spindle: SpindleAPI,
  chatId: string,
  characterName: string,
  userId?: string
): Promise<boolean> {
  const key = characterAppearanceKey(characterName);
  if (!key) return false;
  const path = portraitStatePath(chatId);
  let deleted = false;
  await serializedWrite(scopedKey(userId, path), async () => {
    const raw = await spindle.userStorage.getJson<unknown>(path, {
      fallback: null,
      ...(userOptions(userId) ?? {})
    });
    const record = normalizePortraitRecord(raw);
    if (!record.portraits[key]) return;
    delete record.portraits[key];
    record.updatedAt = new Date().toISOString();
    await spindle.userStorage.setJson(path, record, {
      indent: 2,
      ...(userOptions(userId) ?? {})
    });
    deleted = true;
  });
  return deleted;
}

/**
 * Reset all stored canonical portraits for a chat.
 */
export async function resetPortraits(
  spindle: SpindleAPI,
  chatId: string,
  userId?: string
): Promise<void> {
  const path = portraitStatePath(chatId);
  await serializedWrite(scopedKey(userId, path), async () => {
    await spindle.userStorage.setJson(path, {
      schemaVersion: 1,
      portraits: {},
      updatedAt: new Date().toISOString()
    }, {
      indent: 2,
      ...(userOptions(userId) ?? {})
    });
  });
}


export async function loadCardRole(spindle:SpindleAPI,chatId:string,cardId:string|undefined,userId?:string):Promise<CardRole> {
 if(!cardId || !spindle.userStorage) return 'auto';
 const parsed=StoredCardRoleSchema.safeParse(await spindle.userStorage.getJson(`chats/${safeSegment(chatId)}/card-role.json`,{fallback:null,...(userOptions(userId)??{})}));
 return parsed.success && parsed.data.cardId===cardId ? parsed.data.role : 'auto';
}
export async function saveCardRole(spindle:SpindleAPI,chatId:string,cardId:string,role:CardRole,userId?:string):Promise<void> {
 const path=`chats/${safeSegment(chatId)}/card-role.json`;
 const value=StoredCardRoleSchema.parse({version:1,cardId,role});
 await serializedWrite(scopedKey(userId,path),()=>spindle.userStorage.setJson(path,value,{indent:2,...(userOptions(userId)??{})}));
}
/** Explicit user correction, scoped to this character in this chat. */
export async function saveCorrectedAppearance(spindle:SpindleAPI,chatId:string,name:string,tags:string,userId:string):Promise<void> {
 const path=chatRosterPath(chatId);
 await serializedWrite(scopedKey(userId,path),async()=>{
  const map=await loadCharacterAppearance(spindle,userId,chatId);
  const old=appearanceMapKeyFor(map,name); if(old) delete map[old]; map[name]=tags;
  await spindle.userStorage.setJson(path,map,{indent:2,userId});
 });
 const visual=await loadSingleCharacterState(spindle,chatId,userId);
 if(characterAppearanceKey(visual.protagonist.name)===characterAppearanceKey(name)) {
   const visualPath=singleCharacterStatePath(chatId);
   await serializedWrite(scopedKey(userId,visualPath),async()=>{
     const current=await loadSingleCharacterState(spindle,chatId,userId);
     if(characterAppearanceKey(current.protagonist.name)!==characterAppearanceKey(name)) return;
     // Explicit user corrections may replace the frozen seed; automatic planner saves may not.
     await spindle.userStorage.setJson(visualPath,{...current,protagonist:{name:current.protagonist.name,tags:splitTags(tags)},updatedAt:new Date().toISOString()},{indent:2,userId});
   });
 }
 const registry=await loadCharacterRegistry(spindle,chatId,userId);
 const entry=Object.values(registry).find(e=>characterAppearanceKey(e.name)===characterAppearanceKey(name));
 if(entry) {entry.tags=tags; const category=subjectCategoryFromTags(tags); if(category!=="unknown") entry.subjectCategory=category;}
 const report=mergeCharacterDeclarations(registry,[{name,tags}]);
 const registryPath=characterRegistryPath(chatId);
 await serializedWrite(scopedKey(userId,registryPath),()=>spindle.userStorage.setJson(registryPath,{schemaVersion:CHARACTER_REGISTRY_SCHEMA_VERSION,characters:report.registry,updatedAt:new Date().toISOString()},{indent:2,userId}));
}


/** Conditional writes run inside the existing queue so an obsolete operation cannot write after a newer turn. */
export async function saveTurnRecordIfCurrent(spindle: SpindleAPI, path: string, record: StoredTurnRecord, userId: string, isCurrent: () => boolean): Promise<boolean> {
  let saved = false;
  await serializedWrite(scopedKey(userId, path), async () => {
    if (!isCurrent()) return;
    const next=await recordWithImageLibrary(spindle,path,record,userId);
    if(!isCurrent())return;
    await spindle.userStorage.setJson(path, recordWithPresentation(next), { indent: 2, userId });
    saved = isCurrent();
  });
  return saved;
}

async function recordWithImageLibrary(spindle:SpindleAPI,path:string,record:StoredTurnRecord,userId?:string):Promise<StoredTurnRecord>{
 let previous:StoredTurnRecord|null=null;
 try{previous=await spindle.userStorage.getJson<StoredTurnRecord|null>(path,{fallback:null,...(userOptions(userId)??{})});}
 catch{
  spindle.log?.warn?.('Previous image history could not be read; recovery will retain only available image references.');
  const imageLibrary=mergeImageLibrary(undefined,record);
  return {...record,imageLibrary:imageLibrary&&typeof imageLibrary==='object'&&(imageLibrary as {version?:unknown}).version===1?{...imageLibrary,incomplete:true}:imageLibrary};
 }
 return {...record,imageLibrary:mergeImageLibrary(previous??undefined,record)};
}

function recordWithPresentation(record:StoredTurnRecord):StoredTurnRecord {
  if(record.presentation!==undefined && (record.presentation as {version?:unknown})?.version!==1)return record;
  return {...record,presentation:projectTurnPresentation(record.plan)};
}
