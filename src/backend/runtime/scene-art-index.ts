import type { SpindleAPI } from "lumiverse-spindle-types";
import { z } from "zod";
import { canonicalJson } from "../core/scene-image-cache.js";

const MAX_SCENE_ART_ENTRIES = 64;

const SceneArtEntrySchema = z.object({
  backdropDigest: z.string().min(1).max(64),
  beatDigest: z.string().min(1).max(64).optional(),
  locationKey: z.string().min(1).max(160),
  location: z.string().min(1).max(200),
  imageId: z.string().min(1).max(256),
  createdAt: z.string().min(1),
  lastUsedAt: z.string().min(1),
}).strict();

const SceneArtIndexSchema = z.object({
  version: z.literal(1),
  entries: z.array(SceneArtEntrySchema).max(MAX_SCENE_ART_ENTRIES),
}).strict();

export type SceneArtEntry = z.infer<typeof SceneArtEntrySchema>;
export type SceneArtIndex = z.infer<typeof SceneArtIndexSchema>;

const runtimes = new WeakMap<object, { tails: Map<string, Promise<void>> }>();
function runtimeFor(api: SpindleAPI): { tails: Map<string, Promise<void>> } {
  let entry = runtimes.get(api);
  if (!entry) {
    entry = { tails: new Map() };
    runtimes.set(api, entry);
  }
  return entry;
}

function indexPath(chatId: string): string {
  return `chats/${encodeURIComponent(chatId).replaceAll("%", "_")}/scene-art-index.json`;
}

function scopeKey(chatId: string, userId?: string): string {
  return canonicalJson([userId ?? null, chatId]);
}

function storageOpts(userId?: string): { userId: string } | undefined {
  return userId ? { userId } : undefined;
}

async function runLocked<T>(api: SpindleAPI, chatId: string, userId: string | undefined, work: () => Promise<T>): Promise<T> {
  const rt = runtimeFor(api);
  const key = scopeKey(chatId, userId);
  const previous = rt.tails.get(key) ?? Promise.resolve();
  const current = previous.then(work, work);
  const tail = current.then(() => undefined, () => undefined);
  rt.tails.set(key, tail);
  try {
    return await current;
  } finally {
    if (rt.tails.get(key) === tail) rt.tails.delete(key);
  }
}

export async function loadSceneArtIndex(api: SpindleAPI, chatId: string, userId?: string): Promise<SceneArtIndex> {
  try {
    const raw = await api.userStorage.getJson<unknown>(indexPath(chatId), { fallback: null, ...storageOpts(userId) });
    if (raw === null) return { version: 1, entries: [] };
    const parsed = SceneArtIndexSchema.safeParse(raw);
    return parsed.success ? parsed.data : { version: 1, entries: [] };
  } catch {
    return { version: 1, entries: [] };
  }
}

/**
 * Look up a verified backdrop image in the chat's persisted SceneArtIndex by backdropDigest.
 * Returns null if absent or if the host image asset no longer exists.
 */
export async function findBackdropArt(
  api: SpindleAPI,
  chatId: string,
  backdropDigest: string,
  userId?: string,
): Promise<{ imageId: string; imageUrl: string } | null> {
  if (!backdropDigest.trim()) return null;
  const index = await loadSceneArtIndex(api, chatId, userId);
  const matches = index.entries
    .filter((entry) => entry.backdropDigest === backdropDigest)
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  for (const entry of matches) {
    try {
      const image = await api.images.get(entry.imageId, userId);
      if (image) {
        return {
          imageId: entry.imageId,
          imageUrl: `/api/v1/images/${encodeURIComponent(entry.imageId)}`,
        };
      }
    } catch {
      // Unverifiable entry is skipped cleanly.
    }
  }
  return null;
}

/**
 * Persist a completed scene backdrop/image mapping so revisited rooms and
 * scene-change-only turns reuse existing artwork across restarts.
 */
export async function saveBackdropArt(
  api: SpindleAPI,
  chatId: string,
  entry: { backdropDigest: string; beatDigest?: string; location: string; imageId: string },
  userId?: string,
): Promise<boolean> {
  const location = entry.location.trim();
  if (!location || !entry.backdropDigest.trim() || !entry.imageId.trim()) return false;
  return runLocked(api, chatId, userId, async () => {
    try {
      const index = await loadSceneArtIndex(api, chatId, userId);
      const now = new Date().toISOString();
      const locationKey = location.toLowerCase().slice(0, 160);
      const existing = index.entries.find(
        (candidate) => candidate.backdropDigest === entry.backdropDigest && candidate.imageId === entry.imageId,
      );
      if (existing) {
        existing.lastUsedAt = now;
        if (entry.beatDigest) existing.beatDigest = entry.beatDigest;
      } else {
        const next: SceneArtEntry = {
          backdropDigest: entry.backdropDigest,
          ...(entry.beatDigest ? { beatDigest: entry.beatDigest } : {}),
          locationKey,
          location: location.slice(0, 200),
          imageId: entry.imageId,
          createdAt: now,
          lastUsedAt: now,
        };
        index.entries.push(next);
        if (index.entries.length > MAX_SCENE_ART_ENTRIES) {
          index.entries.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
          index.entries = index.entries.slice(0, MAX_SCENE_ART_ENTRIES);
        }
      }
      await api.userStorage.setJson(indexPath(chatId), SceneArtIndexSchema.parse(index), storageOpts(userId));
      return true;
    } catch {
      return false;
    }
  });
}
