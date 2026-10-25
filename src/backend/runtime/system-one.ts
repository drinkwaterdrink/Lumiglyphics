import type { SpindleAPI } from "lumiverse-spindle-types";
import { z } from "zod";
import type { VisualNovelConfig } from "../../config.js";
import type { SceneState } from "../../shared/contracts.js";
import { POSE_EXPRESSION_CATALOGUE } from "../../shared/character.js";
import { getAudioCatalog } from "./audio-catalog.js";

export const SYSTEM_ONE_KEY = "system_one_api_key";

export function systemOneEndpoint(apiUrl: string): string {
  const base = new URL(apiUrl.trim());
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) {
    throw new Error("System One URL must use HTTPS or local HTTP");
  }
  if (base.username || base.password) throw new Error("System One URL cannot contain credentials");
  const path = base.pathname.replace(/\/+$/, "");
  base.pathname = path.endsWith("/v1/systemone") ? path : `${path.endsWith("/v1") ? path : `${path}/v1`}/systemone`;
  base.search = "";
  base.hash = "";
  return base.toString();
}

const Answer = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), choice: z.string(), confidence: z.number().min(0).max(1), probabilities: z.record(z.string(), z.number()) }),
  z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
]);
const Response = z.object({
  model: z.string(),
  answers: z.record(z.string(), Answer),
  usage: z.object({ input_tokens: z.number().nullable().optional(), output_tokens: z.number().nullable().optional() }).optional(),
});
type AnswerValue = z.infer<typeof Answer>;

export type SystemOneDecisions = {
  speakers: Map<number, string>;
  expressions: Map<number, string>;
  bgm: Map<number, string>;
  sfx: Map<number, string>;
  sceneChange: boolean;
  needsDescription: boolean;
  durationMs: number;
  inputTokens: number;
};

/** The Spindle CORS DTO carries no abort signal, so the deadline races the proxy. */
export const SYSTEM_ONE_TIMEOUT_MS = 15_000;

function systemOneTimeout(ms: number): Error {
  const error = new Error(`System One request timed out after ${ms} ms.`);
  error.name = "TimeoutError";
  return error;
}

/**
 * Race the CORS proxy call against a wall-clock deadline and the caller's
 * abort signal. The proxy request itself cannot be cancelled, so a late
 * response is simply discarded; planning must never wait on a hung endpoint.
 */
async function boundedCors(
  spindle: SpindleAPI,
  endpoint: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ status: number; body: string }> {
  if (signal?.aborted) {
    const error = new Error("System One request cancelled.");
    error.name = "AbortError";
    throw error;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(systemOneTimeout(timeoutMs)), timeoutMs);
  });
  let abortReject: ((reason: unknown) => void) | undefined;
  const onAbort = (): void => {
    const error = new Error("System One request cancelled.");
    error.name = "AbortError";
    abortReject?.(error);
  };
  if (signal) signal.addEventListener("abort", onAbort, { once: true });
  const abortPromise = new Promise<never>((_, reject) => { abortReject = reject; });
  try {
    return await Promise.race([
      spindle.cors(endpoint, init) as Promise<{ status: number; body: string }>,
      deadline,
      ...(signal ? [abortPromise] : []),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/** A missing answer means "no change detected" — never invent a scene cut. */
function noulTripped(answer: AnswerValue | undefined, threshold: number): boolean {
  return answer?.type === "noul" && answer.noul > threshold;
}

function chosen(answer: AnswerValue | undefined, allowed: Set<string>, threshold: number): string | null {
  if (answer?.type !== "choice" || answer.confidence < threshold || !allowed.has(answer.choice)) return null;
  return answer.choice;
}

export async function decidePresentation(
  spindle: SpindleAPI,
  input: { paragraphs: Array<{ index: number; text: string }>; previousScene: SceneState | null; names: string[]; personaName?: string; config: VisualNovelConfig; userId?: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<SystemOneDecisions | null> {
  if (input.config.systemOneMode === "off") return null;
  const key = await spindle.enclave.get(SYSTEM_ONE_KEY, input.userId);
  if (!key) return null;
  const model = input.config.systemOneModel.trim();
  if (!model) throw new Error("System One model is missing");
  const endpoint = systemOneEndpoint(input.config.systemOneApiUrl);

  const names = [...new Set(["Narrator", ...(input.personaName ? [input.personaName] : []), ...input.names].filter(Boolean))].slice(0, 32);
  const poses = POSE_EXPRESSION_CATALOGUE.slice(0, 16);
  const poseIds = poses.map((pose) => pose.id);
  const audio = getAudioCatalog();
  const music = audio.bgm.slice(0, 24);
  const sounds = audio.sfx.slice(0, 24);
  const questions: Record<string, unknown> = {};
  // Reuse is safe only when the scene questions can see every paragraph in full.
  const completeSceneView = input.paragraphs.length <= 7 && input.paragraphs.every((paragraph) => paragraph.text.length <= 3000);
  if (input.previousScene && completeSceneView) {
    questions.scene_change = { type: "noul", instructions: "Does the target response explicitly move to a different physical location, make a major time jump, or replace the visible environment? A speaker change alone is not a scene change." };
    questions.needs_description = { type: "noul", instructions: "Does the target response add a visible location, wardrobe, appearance, prop, or action not represented in the previous scene?" };
  }
  for (const paragraph of input.paragraphs.slice(0, 24)) {
    const index = paragraph.index;
    questions[`speaker_${index}`] = { type: "choice", instructions: `Who speaks or owns paragraph ${index}? Choose Narrator for omniscient narration; choose unknown when the text does not identify a speaker.`, criteria: Object.fromEntries([...names, "unknown"].map((name) => name === "unknown" ? [name, "The speaker cannot be determined"] : [])) };
    questions[`expression_${index}`] = { type: "choice", instructions: `Which expression should the on-screen companion show as a reaction to paragraph ${index}?`, criteria: Object.fromEntries(poses.map((pose) => [pose.id, pose.suffix])) };
    if (music.length) questions[`bgm_${index}`] = { type: "choice", instructions: `Should background music change at paragraph ${index}?`, criteria: { keep_current: "No music change", ...Object.fromEntries(music.map((entry) => [entry.id, `${entry.name}; ${entry.tags.join(", ")}`])) } };
    if (sounds.length) questions[`sfx_${index}`] = { type: "choice", instructions: `Is a sound effect clearly called for at paragraph ${index}?`, criteria: { none: "No sound effect", ...Object.fromEntries(sounds.map((entry) => [entry.id, `${entry.name}; ${entry.tags.join(", ")}`])) } };
  }
  const started = Date.now();
  const paragraphs = input.paragraphs.slice(0, 24);
  const batches = Array.from({ length: Math.ceil(paragraphs.length / 7) }, (_, i) => paragraphs.slice(i * 7, (i + 1) * 7));
  const parsedBatches = await Promise.all(batches.map(async (batch, batchIndex) => {
    const batchQuestions: Record<string, unknown> = batchIndex === 0 && questions.scene_change
      ? { scene_change: questions.scene_change, needs_description: questions.needs_description }
      : {};
    for (const paragraph of batch) {
      for (const prefix of ["speaker", "expression", "bgm", "sfx"]) {
        const name = `${prefix}_${paragraph.index}`;
        if (questions[name]) batchQuestions[name] = questions[name];
      }
    }
    const body = JSON.stringify({
      model,
      state: {
        previousScene: input.previousScene ? { environment: input.previousScene.environment, character: input.previousScene.character, attire: input.previousScene.attire } : null,
        paragraphs: batch.map((paragraph) => ({ index: paragraph.index, text: paragraph.text.slice(0, 3000) })),
      },
      questions: batchQuestions,
    });
    if (new TextEncoder().encode(body).length > 65_536) throw new Error("System One request exceeds the API's 64 KiB limit");
    const response = await boundedCors(spindle, endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body,
    }, input.timeoutMs ?? SYSTEM_ONE_TIMEOUT_MS, input.signal);
    if (response.status < 200 || response.status >= 300) throw new Error(`System One request failed (${response.status})`);
    return Response.parse(JSON.parse(response.body));
  }));
  const answers = Object.assign({}, ...parsedBatches.map((batch) => batch.answers)) as Record<string, AnswerValue>;
  const speakers = new Map<number, string>();
  const expressions = new Map<number, string>();
  const bgm = new Map<number, string>();
  const sfx = new Map<number, string>();
  for (const paragraph of input.paragraphs.slice(0, 24)) {
    const speaker = chosen(answers[`speaker_${paragraph.index}`], new Set(names), 0.65);
    if (speaker) speakers.set(paragraph.index, speaker);
    const expression = chosen(answers[`expression_${paragraph.index}`], new Set(poseIds), 0.6);
    if (expression) expressions.set(paragraph.index, expression);
    const track = chosen(answers[`bgm_${paragraph.index}`], new Set(["keep_current", ...music.map((entry) => entry.id)]), 0.7);
    if (track && track !== "keep_current") bgm.set(paragraph.index, track);
    const effect = chosen(answers[`sfx_${paragraph.index}`], new Set(["none", ...sounds.map((entry) => entry.id)]), 0.7);
    if (effect && effect !== "none") sfx.set(paragraph.index, effect);
  }
  const scene = answers.scene_change;
  const description = answers.needs_description;
  return {
    speakers, expressions, bgm, sfx,
    // Fail closed: a missing/malformed answer never invents a scene cut or
    // forces a prose re-description; explicit high noul values still do.
    sceneChange: noulTripped(scene, 0.2),
    needsDescription: noulTripped(description, 0.2),
    durationMs: Date.now() - started,
    inputTokens: parsedBatches.reduce((total, batch) => total + (batch.usage?.input_tokens ?? 0), 0),
  };
}
