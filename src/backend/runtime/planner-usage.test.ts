import { expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../../config.js";
import { emptySingleCharacter } from "../core/visual-state.js";
import { createFakeSpindle } from "../testing/fake-spindle.js";
import { planTurn } from "./planner.js";

const message = {
  id: "assistant-1", chat_id: "chat-1", index_in_chat: 2, is_user: false, name: "Mira",
  content: "First paragraph.\n\nSecond paragraph.", send_date: 1, swipe_id: 0,
  swipes: ["First paragraph.\n\nSecond paragraph."], swipe_dates: [1], extra: {},
  parent_message_id: "user-1", branch_id: null, created_at: 1, role: "assistant",
} as const;

function input(): Parameters<typeof planTurn>[1] {
  return {
    chatId: "chat-1", userId: "alice", message, content: message.content,
    previousScene: null, previousContinuity: null, recentMessages: [],
    config: { ...DEFAULT_CONFIG, systemOneMode: "off" },
    singleCharacter: emptySingleCharacter(), characterAppearance: {},
  } as unknown as Parameters<typeof planTurn>[1];
}

test("end to end: two failed planner attempts are counted as two calls, tokens unknown, and the plan falls back", async () => {
  const fake = createFakeSpindle({ plannerFallback: new Error("planner offline") });
  const usage = { plannerCalls: 0, systemOneCalls: 0, promptTokens: null, completionTokens: null };
  const result = await planTurn(fake.api, { ...input(), usage });
  expect(fake.generateCalls.length).toBe(2);
  expect(result.usedFallback).toBe(true);
  expect(result.usage).toEqual({ plannerCalls: 2, systemOneCalls: 0, promptTokens: null, completionTokens: null });
  expect(result.plan.paragraphs.length).toBeGreaterThan(0);
});

test("end to end: reported provider usage is summed across attempts", async () => {
  const fake = createFakeSpindle({
    plannerReplies: [
      { content: "not json", usage: { prompt_tokens: 100, completion_tokens: 10 } },
      { content: "still not json", usage: { prompt_tokens: 120, completion_tokens: 12 } },
    ],
  });
  const result = await planTurn(fake.api, input());
  expect(result.usage.plannerCalls).toBe(2);
  expect(result.usage.promptTokens).toBe(220);
  expect(result.usage.completionTokens).toBe(22);
});
