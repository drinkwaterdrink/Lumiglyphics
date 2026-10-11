import { expect, test } from "bun:test";
import { restoreReadingPosition, LoadedReadingCursor } from "./reading-position.js";
import { decideTurnApplication } from "./controller.js";
import type { TurnView } from "../../protocol.js";
import { isFrontendRequest } from "../../protocol.js";
const turn = { chatId: "chat", messageId: "message", swipeId: 0, sourceFingerprint: "fingerprint", revision: 3, paragraphs: ["one", "two", "three"] };
const saved = { version: 1 as const, key: { chatId: "chat", assistantMessageId: "message", swipeId: 0, sourceFingerprint: "fingerprint", revision: 1 }, paragraphIndex: 2 };
test("asset-only revisions preserve the reading cursor", () => { expect(restoreReadingPosition(saved, turn)).toBe(2); });
test("swipes, edits, different chats and out-of-range cursors cannot restore", () => {
  for (const patch of [{ swipeId: 1 }, { sourceFingerprint: "edited-fingerprint" }, { chatId: "other" }, { messageId: "other" }, { paragraphs: ["one"] }]) {
    expect(restoreReadingPosition(saved, { ...turn, ...patch })).toBeNull();
  }
  expect(restoreReadingPosition({ ...saved, paragraphIndex: -1 }, turn)).toBeNull();
  expect(restoreReadingPosition({ ...saved, version: 2 }, turn)).toBeNull();
});
test("cursor messages reject malformed scopes and unsupported versions at the boundary", () => {
  expect(isFrontendRequest({ type: "vn_reading_position", position: saved })).toBe(true);
  expect(isFrontendRequest({ type: "vn_reading_position", position: { ...saved, key: {} } })).toBe(false);
  expect(isFrontendRequest({ type: "vn_reading_position", position: { ...saved, paragraphIndex: -1 } })).toBe(false);
  expect(isFrontendRequest({ type: "vn_reading_position", position: { ...saved, version: 2 } })).toBe(false);
});
test("inactive delivery cannot relabel the loaded prose or its saved cursor", () => {
  const loaded = new LoadedReadingCursor();
  const a = { ...turn, speaker: "Narrator", status: "ready", assets: [], choices: [] } as TurnView;
  loaded.load(a);
  const b = { ...a, messageId: "new-reply", sourceFingerprint: "new-fingerprint" };
  expect(loaded.position(2)?.key.assistantMessageId).toBe(a.messageId);
  expect(decideTurnApplication(loaded.turn, b, 2, true, true).kind).toBe("load-turn");
  loaded.load(b);
  expect(loaded.position(0)?.key.assistantMessageId).toBe(b.messageId);
  expect(loaded.position(10)).toBeNull();
});
