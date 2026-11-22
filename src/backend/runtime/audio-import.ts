/**
 * Reassembly buffers for chunked audio imports. The host WebSocket bridge
 * caps a frontend->backend message at 4 MB, so files larger than one chunk
 * arrive as ordered pieces sharing a transferId.
 */
const AUDIO_IMPORT_TTL_MS = 5 * 60 * 1000;
const MAX_AUDIO_IMPORT_BUFFERS = 16;
const audioImportBuffers = new Map<string, { chunks: Array<string | undefined>; received: number; updatedAt: number }>();

function pruneAudioImportBuffers(now = Date.now()): void {
  for (const [key, entry] of audioImportBuffers) {
    if (now - entry.updatedAt > AUDIO_IMPORT_TTL_MS) {
      audioImportBuffers.delete(key);
    }
  }
  while (audioImportBuffers.size >= MAX_AUDIO_IMPORT_BUFFERS) {
    const oldestKey = audioImportBuffers.keys().next().value;
    if (!oldestKey) break;
    audioImportBuffers.delete(oldestKey);
  }
}

/** Maximum assembled base64 size (~30 MB of raw audio). */
export const MAX_AUDIO_IMPORT_BASE64 = 40 * 1024 * 1024;

/**
 * Accept one chunk of a (possibly single-chunk) audio import. Returns the
 * complete base64 payload once every chunk has arrived, otherwise null.
 * Oversized transfers throw and drop their buffer.
 */
export function acceptAudioImportChunk(
  bufferKey: string,
  part: { dataBase64: string; chunkIndex?: number; chunkCount?: number },
): string | null {
  const chunkCount = part.chunkCount && part.chunkCount > 1 ? Math.floor(part.chunkCount) : 1;
  if (chunkCount === 1) {
    if (part.dataBase64.length > MAX_AUDIO_IMPORT_BASE64) throw new Error("Audio file too large to import (30 MB max).");
    return part.dataBase64;
  }
  const index = Math.floor(part.chunkIndex ?? 0);
  if (index < 0 || index >= chunkCount) return null;
  const now = Date.now();
  pruneAudioImportBuffers(now);
  const buffer = audioImportBuffers.get(bufferKey) ?? { chunks: new Array<string | undefined>(chunkCount), received: 0, updatedAt: now };
  if (buffer.chunks.length !== chunkCount) {
    audioImportBuffers.delete(bufferKey);
    return null;
  }
  if (buffer.chunks[index] === undefined) buffer.received += 1;
  buffer.chunks[index] = part.dataBase64;
  buffer.updatedAt = now;
  const assembledSoFar = buffer.chunks.reduce((total, chunk) => total + (chunk?.length ?? 0), 0);
  if (assembledSoFar > MAX_AUDIO_IMPORT_BASE64) {
    audioImportBuffers.delete(bufferKey);
    throw new Error("Audio file too large to import (30 MB max).");
  }
  audioImportBuffers.set(bufferKey, buffer);
  if (buffer.received < chunkCount) return null;
  audioImportBuffers.delete(bufferKey);
  return buffer.chunks.join("");
}

/** Drop any unfinished chunk buffers for a user's import session. */
export function clearAudioImportBuffers(userKey: string): void {
  for (const key of [...audioImportBuffers.keys()]) {
    if (key.startsWith(`${userKey}:`)) audioImportBuffers.delete(key);
  }
}
