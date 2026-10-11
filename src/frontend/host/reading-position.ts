import type { TurnView } from "../../protocol.js";
import { ReadingPositionSchema, type ReadingPosition } from "../../shared/reading-position.js";
/** The cached newest reply does not become readable until actually loaded. */
export class LoadedReadingCursor {
  turn: TurnView | null = null;
  load(turn: TurnView | null): void { this.turn = turn; }
  position(paragraphIndex: number): ReadingPosition | null {
    const turn = this.turn;
    if (!turn || turn.status !== "ready" || !Number.isInteger(paragraphIndex) || paragraphIndex < 0 || paragraphIndex >= turn.paragraphs.length) return null;
    return { version: 1, key: { chatId: turn.chatId, assistantMessageId: turn.messageId, swipeId: turn.swipeId, sourceFingerprint: turn.sourceFingerprint, revision: turn.revision }, paragraphIndex };
  }
}
export function restoreReadingPosition(saved: unknown, current: Pick<TurnView, "chatId" | "messageId" | "swipeId" | "sourceFingerprint" | "paragraphs">): number | null {
  const parsed = ReadingPositionSchema.safeParse(saved);
  if (!parsed.success) return null;
  const { key, paragraphIndex } = parsed.data;
  return key.chatId === current.chatId && key.assistantMessageId === current.messageId
    && String(key.swipeId ?? 0) === String(current.swipeId ?? 0) && key.sourceFingerprint === current.sourceFingerprint
    && paragraphIndex < current.paragraphs.length ? paragraphIndex : null;
}
