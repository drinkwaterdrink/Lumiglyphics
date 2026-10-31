import { z } from "zod";

/**
 * Text-model usage spent on one reply. Counts are exact (we made the calls).
 * Token totals are the sum of what providers reported; a provider that reports
 * nothing leaves them null, and the reader says so rather than showing zero.
 */
export const ReplyUsageSchema = z.object({
  plannerCalls: z.number().int().nonnegative(),
  systemOneCalls: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative().nullable(),
  completionTokens: z.number().int().nonnegative().nullable(),
}).strict();
export type ReplyUsage = z.infer<typeof ReplyUsageSchema>;

export function createReplyUsage(): ReplyUsage {
  return { plannerCalls: 0, systemOneCalls: 0, promptTokens: null, completionTokens: null };
}

/** Adds one provider response's usage. Missing numbers are ignored, not counted as zero. */
export function addPlannerUsage(usage: ReplyUsage, reported: { prompt_tokens?: unknown; completion_tokens?: unknown } | null | undefined): void {
  usage.plannerCalls += 1;
  if (typeof reported?.prompt_tokens === "number" && Number.isFinite(reported.prompt_tokens)) {
    usage.promptTokens = (usage.promptTokens ?? 0) + Math.max(0, Math.round(reported.prompt_tokens));
  }
  if (typeof reported?.completion_tokens === "number" && Number.isFinite(reported.completion_tokens)) {
    usage.completionTokens = (usage.completionTokens ?? 0) + Math.max(0, Math.round(reported.completion_tokens));
  }
}

/** System One reports input tokens per batch; the call count is the number of batches. */
export function addSystemOneUsage(usage: ReplyUsage, batches: number, inputTokens: number): void {
  usage.systemOneCalls += Math.max(0, Math.round(batches));
  if (inputTokens > 0) usage.promptTokens = (usage.promptTokens ?? 0) + Math.round(inputTokens);
}

const count = (value: number) => value.toLocaleString("en-US");

/**
 * Plain-language summary for the reader. Example:
 * "Text: 2 planner calls, 1 System One call · 4,120 prompt / 610 completion tokens · 3 images generated"
 */
export function formatReplyUsage(usage: ReplyUsage, imagesGenerated: number): string {
  const calls = usage.plannerCalls + usage.systemOneCalls;
  const parts: string[] = [];
  const callParts = [
    usage.plannerCalls ? `${usage.plannerCalls} planner ${usage.plannerCalls === 1 ? "call" : "calls"}` : "",
    usage.systemOneCalls ? `${usage.systemOneCalls} System One ${usage.systemOneCalls === 1 ? "call" : "calls"}` : "",
  ].filter(Boolean);
  parts.push(calls ? `Text: ${callParts.join(", ")}` : "Text: no model calls (deterministic plan)");
  if (usage.promptTokens !== null || usage.completionTokens !== null) {
    parts.push(`${count(usage.promptTokens ?? 0)} prompt / ${count(usage.completionTokens ?? 0)} completion tokens`);
  } else if (calls) {
    parts.push("token counts not reported by the provider");
  }
  parts.push(`${count(imagesGenerated)} ${imagesGenerated === 1 ? "image" : "images"} generated`);
  return parts.join(" · ");
}
