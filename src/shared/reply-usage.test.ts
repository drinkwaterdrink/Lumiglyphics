import { expect, test } from "bun:test";
import { addPlannerTokens, addSystemOneUsage, createReplyUsage, formatReplyUsage, recordPlannerAttempt, ReplyUsageSchema } from "./reply-usage.js";

test("planner calls add up exact counts and only the tokens providers reported", () => {
  const usage = createReplyUsage();
  recordPlannerAttempt(usage);
  addPlannerTokens(usage, { prompt_tokens: 1200, completion_tokens: 300 });
  recordPlannerAttempt(usage);
  addPlannerTokens(usage, undefined);
  expect(usage).toEqual({ plannerCalls: 2, systemOneCalls: 0, promptTokens: 1200, completionTokens: 300 });
});

test("a provider that reports no usage leaves token totals unknown, not zero", () => {
  const usage = createReplyUsage();
  recordPlannerAttempt(usage);
  addPlannerTokens(usage, {});
  expect(usage.promptTokens).toBeNull();
  expect(formatReplyUsage(usage, 0)).toContain("token counts not reported");
});

test("System One batches count as calls and their input tokens are added", () => {
  const usage = createReplyUsage();
  addSystemOneUsage(usage, 3, 900);
  addSystemOneUsage(usage, 1, 0);
  expect(usage.systemOneCalls).toBe(4);
  expect(usage.promptTokens).toBe(900);
});

test("the reader line reads plainly and pluralizes", () => {
  const usage = { plannerCalls: 2, systemOneCalls: 1, promptTokens: 4120, completionTokens: 610 };
  expect(formatReplyUsage(usage, 3)).toBe("Text: 2 planner calls, 1 System One call · 4,120 prompt / 610 completion tokens · 3 images generated");
  expect(formatReplyUsage(createReplyUsage(), 1)).toBe("Text: no model calls (deterministic plan) · 1 image generated");
});

test("stored usage is validated strictly", () => {
  expect(ReplyUsageSchema.safeParse({ plannerCalls: -1, systemOneCalls: 0, promptTokens: null, completionTokens: null }).success).toBe(false);
  expect(ReplyUsageSchema.safeParse({ plannerCalls: 1, systemOneCalls: 0, promptTokens: null, completionTokens: null, extra: 1 }).success).toBe(false);
});
