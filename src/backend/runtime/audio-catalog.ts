import type { SpindleAPI } from "lumiverse-spindle-types";

export type AudioCategory = "bgm" | "sfx";

export type AudioCatalogEntry = {
  id: string;
  name: string;
  filePath: string;
  relativePath: string;
  category: AudioCategory;
  tags: string[];
  url?: string;
};

export type AudioCatalog = {
  bgm: AudioCatalogEntry[];
  sfx: AudioCatalogEntry[];
  all: AudioCatalogEntry[];
};

export const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".ogg", ".wav", ".m4a", ".flac"] as const;
const AUDIO_EXT_SET = new Set<string>(SUPPORTED_AUDIO_EXTENSIONS);

const BGM_KEYWORDS = new Set([
  "bgm", "music", "ost", "soundtrack", "theme", "song", "melody",
  "instrumental", "background", "ambient", "ambience",
]);

const SFX_KEYWORDS = new Set([
  "sfx", "sound", "effect", "effects", "se", "foley", "hit", "impact",
  "step", "footstep", "click", "whoosh", "woosh", "blast", "explosion",
  "ui", "chime", "bell", "beep", "punch", "slash", "door", "creak", "gunshot",
]);

const NOISE_TOKENS = new Set(["audio", "track", "sound", "file", "media", "lumiverse", "preview"]);

function normalizedPath(input: string): string {
  return input.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/");
}

function extensionOf(input: string): string {
  const name = normalizedPath(input).split("/").at(-1) ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function stemOf(input: string): string {
  const name = normalizedPath(input).split("/").at(-1) ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

function joinStoragePath(prefix: string, relativePath: string): string {
  return [prefix.replace(/^\/+|\/+$/g, ""), relativePath.replace(/^\/+/, "")]
    .filter(Boolean)
    .join("/");
}

/**
 * Lumiverse extensions cannot access arbitrary host paths. Audio lives under
 * the extension's scoped storage root. Absolute legacy values fall back to the
 * conventional `audio/` storage prefix.
 */
export function normalizeAudioStoragePrefix(input: string): string {
  const value = normalizedPath(input.trim()).replace(/^\/+|\/+$/g, "");
  if (!value || /^[A-Za-z]:\//.test(normalizedPath(input.trim())) || input.trim().startsWith("/")) {
    return "audio";
  }
  if (value.split("/").some((part) => part === "..")) return "audio";
  return value;
}

export function tokenizeText(input: string): string[] {
  const decamel = input.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return decamel.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function categorizeAudioFile(_filePath: string, relativePath: string): AudioCategory {
  const normRel = normalizedPath(relativePath);
  const segments = normRel.split("/").filter(Boolean);
  const dirTokens = segments.slice(0, -1).flatMap(tokenizeText);
  const fileTokens = tokenizeText(stemOf(normRel));
  const fileHasSfx = fileTokens.some((token) => SFX_KEYWORDS.has(token));
  const fileHasBgm = fileTokens.some((token) => BGM_KEYWORDS.has(token));
  if (fileHasSfx && !fileHasBgm) return "sfx";
  if (fileHasBgm && !fileHasSfx) return "bgm";
  const dirHasSfx = dirTokens.some((token) => SFX_KEYWORDS.has(token));
  const dirHasBgm = dirTokens.some((token) => BGM_KEYWORDS.has(token));
  if (dirHasSfx && !dirHasBgm) return "sfx";
  if (dirHasBgm && !dirHasSfx) return "bgm";
  return fileHasSfx ? "sfx" : "bgm";
}

export function extractAudioTags(relativePath: string, category: AudioCategory): string[] {
  const normRel = normalizedPath(relativePath);
  const segments = normRel.split("/").filter(Boolean);
  const tokens = [...segments.slice(0, -1), stemOf(normRel)].flatMap(tokenizeText);
  const tags = new Set<string>([category]);
  for (const token of tokens) {
    if (token.length < 2 || /^\d+$/.test(token) || NOISE_TOKENS.has(token)) continue;
    if (category === "sfx" && (token === "sfx" || token === "se")) continue;
    if (category === "bgm" && (token === "bgm" || token === "ost")) continue;
    tags.add(token);
  }
  return [...tags].sort();
}

function mimeForExtension(extension: string): string {
  switch (extension) {
    case ".mp3": return "audio/mpeg";
    case ".ogg": return "audio/ogg";
    case ".wav": return "audio/wav";
    case ".m4a": return "audio/mp4";
    case ".flac": return "audio/flac";
    default: return "application/octet-stream";
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const parts: string[] = [];
  const chunk: string[] = [];
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const packed = (first << 16) | (second << 8) | third;
    chunk.push(
      alphabet[(packed >>> 18) & 63]!,
      alphabet[(packed >>> 12) & 63]!,
      index + 1 < bytes.length ? alphabet[(packed >>> 6) & 63]! : "=",
      index + 2 < bytes.length ? alphabet[packed & 63]! : "=",
    );
    if (chunk.length >= 8192) {
      parts.push(chunk.join(""));
      chunk.length = 0;
    }
  }
  if (chunk.length > 0) parts.push(chunk.join(""));
  return parts.join("");
}

type ScopedCatalogEntry = {
  catalog: AudioCatalog;
  prefix: string;
  storage: unknown;
  epoch: number;
};
const scopedCatalogs = new Map<string, ScopedCatalogEntry>();
const emptyCatalog = (): AudioCatalog => ({ bgm: [], sfx: [], all: [] });
const scopeKeyFor = (userId?: string): string => userId ?? "owner";
let scanEpoch = 0;
const entryEpochs = new WeakMap<AudioCatalogEntry, { scopeKey: string; epoch: number }>();
const storageIds = new WeakMap<object, number>();
let nextStorageId = 0;

function audioStorageFor(spindle: SpindleAPI, userId?: string): {
  ref: object;
  list: (prefix: string) => Promise<string[]>;
  readBinary: (path: string) => Promise<Uint8Array>;
} {
  const userStore = spindle.userStorage as unknown as {
    list?: (prefix: string, opts?: { userId?: string }) => Promise<string[]>;
    readBinary?: (path: string, opts?: { userId?: string }) => Promise<Uint8Array>;
  } | undefined;
  if (userStore && typeof userStore.list === "function" && typeof userStore.readBinary === "function") {
    const opts = userId ? { userId } : undefined;
    return {
      ref: userStore,
      list: (prefix) => userStore.list!(prefix, opts),
      readBinary: (path) => userStore.readBinary!(path, opts),
    };
  }
  return {
    ref: spindle.storage,
    list: (prefix) => spindle.storage.list(prefix),
    readBinary: (path) => spindle.storage.readBinary(path),
  };
}

function audioCacheKey(storage: object, userId: string | undefined, entry: AudioCatalogEntry): string {
  let storageId = storageIds.get(storage);
  if (storageId === undefined) {
    storageId = ++nextStorageId;
    storageIds.set(storage, storageId);
  }
  const meta = entryEpochs.get(entry);
  return JSON.stringify([scopeKeyFor(userId), storageId, meta?.epoch ?? scanEpoch, normalizedPath(entry.filePath)]);
}

/**
 * Scan audio files through Lumiverse's scoped storage API. No host filesystem
 * module or Bun.file access is used. The binary is converted to a browser-safe
 * data URL lazily when a cue first uses a track.
 */
export async function scanAudioCatalog(spindle: SpindleAPI, requestedPrefix = "audio", userId?: string): Promise<AudioCatalog> {
  const prefix = normalizeAudioStoragePrefix(requestedPrefix);
  const scopeKey = scopeKeyFor(userId);
  const storage = audioStorageFor(spindle, userId);
  const existing = scopedCatalogs.get(scopeKey);
  if (existing && existing.storage === storage.ref && existing.prefix === prefix && existing.catalog.all.length > 0) {
    return existing.catalog;
  }
  const epoch = ++scanEpoch;
  scopedCatalogs.set(scopeKey, { catalog: emptyCatalog(), prefix, storage: storage.ref, epoch });
  clearAudioUrlCache(userId);

  let files: string[];
  try {
    files = await storage.list(prefix);
  } catch {
    return emptyCatalog();
  }

  const entries: AudioCatalogEntry[] = [];
  for (const listedPath of files) {
    const relativePath = normalizedPath(listedPath);
    const extension = extensionOf(relativePath);
    if (!AUDIO_EXT_SET.has(extension)) continue;
    const storagePath = joinStoragePath(prefix, relativePath);
    // Metadata only: file bytes are read lazily per cue (ensureAudioUrl), so a
    // large imported library no longer sits in worker memory as base64.
    const category = categorizeAudioFile(storagePath, relativePath);
    const entry: AudioCatalogEntry = {
      id: relativePath.replace(/\.[^.]+$/, ""),
      name: stemOf(relativePath),
      filePath: storagePath,
      relativePath,
      category,
      tags: extractAudioTags(relativePath, category),
    };
    entryEpochs.set(entry, { scopeKey, epoch });
    entries.push(entry);
  }

  entries.sort((left, right) => left.id.localeCompare(right.id));
  const catalog: AudioCatalog = {
    bgm: entries.filter((entry) => entry.category === "bgm"),
    sfx: entries.filter((entry) => entry.category === "sfx"),
    all: entries,
  };
  if (scopedCatalogs.get(scopeKey)?.epoch === epoch) {
    scopedCatalogs.set(scopeKey, { catalog, prefix, storage: storage.ref, epoch });
  }
  return catalog;
}

export function getAudioCatalog(userId?: string): AudioCatalog {
  return scopedCatalogs.get(scopeKeyFor(userId))?.catalog ?? emptyCatalog();
}

export function clearAudioCatalogCache(userId?: string): void {
  if (userId !== undefined) {
    scopedCatalogs.delete(scopeKeyFor(userId));
    clearAudioUrlCache(userId);
    return;
  }
  scopedCatalogs.clear();
  scanEpoch++;
  clearAudioUrlCache();
}

/**
 * Resolve an audio query to a catalog entry using exact id, name, or relativePath.
 * Deterministic matching prevents wrong-mood fuzzy false positives and SFX misfires.
 */
export function findAudioEntry(query: string, preferredCategory?: AudioCategory, userId?: string): AudioCatalogEntry | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const catalog = getAudioCatalog(userId);
  const normalized = normalizedPath(trimmed).toLowerCase();
  const withoutExtension = normalized.replace(/\.[a-z0-9]+$/i, "");
  const matches = (entry: AudioCatalogEntry) =>
    entry.id.toLowerCase() === normalized
    || entry.id.toLowerCase() === withoutExtension
    || entry.name.toLowerCase() === normalized
    || entry.name.toLowerCase() === withoutExtension;

  // An explicit path wins over extension-stripped aliases, including when a
  // category hint would otherwise select a different same-named track.
  const exactPaths = catalog.all.filter((entry) => entry.relativePath.toLowerCase() === normalized);
  if (exactPaths.length > 0) return exactPaths.length === 1 ? exactPaths[0]! : null;

  if (preferredCategory && catalog[preferredCategory]?.length > 0) {
    const candidates = catalog[preferredCategory].filter(matches);
    if (candidates.length > 0) return candidates.length === 1 ? candidates[0]! : null;
  }
  const candidates = catalog.all.filter(matches);
  return candidates.length === 1 ? candidates[0]! : null;
}

/**
 * Bounded data-URL cache. Only tracks actually used by recent turns are held
 * in memory; the total character budget (~36 MB of raw audio) evicts the
 * least-recently-used entries first.
 */
const audioUrlCache = new Map<string, string>();
const AUDIO_URL_CACHE_BUDGET = 48_000_000;
let audioUrlEpoch = 0;

function cacheAudioUrl(id: string, url: string): void {
  audioUrlCache.delete(id);
  audioUrlCache.set(id, url);
  let total = 0;
  for (const value of audioUrlCache.values()) total += value.length;
  for (const key of audioUrlCache.keys()) {
    if (total <= AUDIO_URL_CACHE_BUDGET || audioUrlCache.size <= 1) break;
    const evicted = audioUrlCache.get(key);
    audioUrlCache.delete(key);
    total -= evicted?.length ?? 0;
  }
}

/** Clear the lazy data-URL cache (used on rescans and in tests). */
export function clearAudioUrlCache(userId?: string): void {
  if (userId !== undefined) {
    const prefix = JSON.stringify([scopeKeyFor(userId)]).slice(0, -1);
    for (const key of audioUrlCache.keys()) {
      if (key.startsWith(prefix)) audioUrlCache.delete(key);
    }
    return;
  }
  audioUrlEpoch++;
  audioUrlCache.clear();
}

/** Load (and cache) the playable data URL for a catalog entry. */
export async function ensureAudioUrl(spindle: SpindleAPI, entry: AudioCatalogEntry, userId?: string): Promise<string | null> {
  const meta = entryEpochs.get(entry);
  const scopeKey = meta?.scopeKey ?? scopeKeyFor(userId);
  const currentScoped = scopedCatalogs.get(scopeKey);
  if (meta && currentScoped && meta.epoch !== currentScoped.epoch) return null;
  const epoch = audioUrlEpoch;
  const storage = audioStorageFor(spindle, userId);
  const key = audioCacheKey(storage.ref, userId, entry);
  const cached = audioUrlCache.get(key);
  if (cached) {
    cacheAudioUrl(key, cached);
    return cached;
  }
  try {
    const bytes = await storage.readBinary(entry.filePath);
    if (epoch !== audioUrlEpoch) return null;
    if (meta && scopedCatalogs.get(scopeKey)?.epoch !== meta.epoch) return null;
    const url = `data:${mimeForExtension(extensionOf(entry.relativePath))};base64,${bytesToBase64(bytes)}`;
    cacheAudioUrl(key, url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Preload the data URLs for a turn's audio cues so the synchronous
 * `resolveAudioUrl` can serve them from cache when the turn is rendered.
 */
export async function preloadAudioForCues(
  spindle: SpindleAPI,
  cues: ReadonlyArray<{ bgm?: string | null | undefined; sfx?: string | null | undefined }>,
  userId?: string,
): Promise<void> {
  for (const cue of cues) {
    for (const [query, category] of [[cue.bgm, "bgm"], [cue.sfx, "sfx"]] as const) {
      if (!query) continue;
      const entry = findAudioEntry(query, category, userId);
      if (entry) await ensureAudioUrl(spindle, entry, userId);
    }
  }
}

export function resolveAudioUrl(query: string, category?: AudioCategory, userId?: string): string | null {
  if (!query) return null;
  const entry = findAudioEntry(query, category, userId);
  const storage = scopedCatalogs.get(scopeKeyFor(userId))?.storage as object | undefined;
  if (entry && storage) {
    const cached = audioUrlCache.get(audioCacheKey(storage, userId, entry));
    if (cached) return cached;
  }
  return /^(?:https?:|data:|blob:)/i.test(query) ? query : null;
}

/**
 * Build a concise summary of the audio catalog suitable for inclusion in planner prompting.
 */
export function getAudioCatalogPromptSummary(userId?: string): { bgmLines: string[]; sfxSamples: string[] } {
  const catalog = getAudioCatalog(userId);
  const bgmLines: string[] = [];
  const choice = (entry: AudioCatalogEntry) => findAudioEntry(entry.name, entry.category, userId) === entry ? entry.name : entry.relativePath;
  if (catalog.bgm.length > 0) {
    const bgmList = catalog.bgm.map(choice).slice(0, 25).join(", ");
    bgmLines.push(`  * Available BGM: [${bgmList}]`);
  }
  const sfxSamples = catalog.sfx.slice(0, 30).map(choice);
  return { bgmLines, sfxSamples };
}
