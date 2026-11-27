import { z } from "zod";
import { prepareSpeechText } from "./text-effects.js";
import type { SpeechSettings } from "../speech-config.js";

export const SPEECH_EVENTS = ["short pause", "long pause", "breath", "sigh", "gasp", "chuckle", "laugh"] as const;
export const SpeechDirectionSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(),
  anchor: z.string().trim().min(4).max(160),
  event: z.enum(SPEECH_EVENTS),
}).strict();
export type SpeechDirection = z.infer<typeof SpeechDirectionSchema>;

export function sceneSpeechEnabled(speech: SpeechSettings): boolean {
  return speech.enabled && speech.deliveryMode === "gemini-audio-tags" && speech.sceneAwareDelivery && !speech.deliveryTag.trim();
}

function anchorEnd(text: string, anchor: string): number {
  const start = text.indexOf(anchor);
  if (start < 0 || text.indexOf(anchor, start + 1) >= 0) return -1;
  const end = start + anchor.length;
  const word = /[\p{L}\p{N}\p{M}]/u;
  if ((word.test(text[start-1] ?? "") && word.test(anchor[0] ?? ""))
    || (word.test(anchor.at(-1) ?? "") && word.test(text[end] ?? ""))) return -1;
  return end;
}

export function normalizeSpeechDirections(raw: unknown, paragraphs: readonly { index: number; text: string }[]): SpeechDirection[] {
  if (!Array.isArray(raw)) return [];
  const spoken = new Map(paragraphs.map(p => [p.index, prepareSpeechText(p.text)]));
  const used = new Set<number>();
  const result: SpeechDirection[] = [];
  for (const value of raw.slice(0, 64)) {
    const parsed = SpeechDirectionSchema.safeParse(value);
    if (!parsed.success) continue;
    const cue = parsed.data;
    const text = spoken.get(cue.paragraphIndex);
    if (!text || used.has(cue.paragraphIndex) || anchorEnd(text, cue.anchor) < 0) continue;
    used.add(cue.paragraphIndex);
    result.push(cue);
    if (result.length === 32) break;
  }
  return result;
}

export function insertSpeechEvent(text: string, cue: SpeechDirection, tag: string): string {
  const end = anchorEnd(text, cue.anchor);
  if (end < 0) return text;
  return [text.slice(0, end).trimEnd(), tag, text.slice(end).trimStart()].filter(Boolean).join(" ");
}
