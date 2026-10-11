// Adopted from cache-review probe `.cache/scene-cache/probes/reference-capture.regression.test.ts` (import paths adjusted).
/**
 * Regression probe (cache-review) for the exact found case: a cache hit must
 * never skip a reference-portrait capture render, and existing capture
 * concurrency (one capture per character, later cues anchored) must be
 * unchanged with the cache on.
 */
import { describe, expect, test } from "bun:test";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { DEFAULT_CONFIG, type VisualNovelConfig } from "../../config.js";
import { resolveImageTemplate } from "../../shared/image-templates.js";
import { ImageReviewGate } from "./image-review.js";

test("real preparation switches held templates and references without generating early", async () => {
  for (const [before, after, capture] of [["portrait", "environment", false], ["environment", "portrait", true]] as const) {
    const h = harness();
    const p = plan(`rebuild-${before}`, [[0, "idle"]]);
    p.visualCues[0]!.imageTemplate = resolveImageTemplate(DEFAULT_CONFIG, before).template;
    const records: any[] = [];
    const gate = new ImageReviewGate(async record => { records.push(record); });
    const generation = generateAssets(h.spindle, p, createAssetJobs(p, on), on, new AbortController().signal, () => {}, undefined, { beforeGenerate: (job, request, metadata, signal) => gate.prepare(job.jobId, job.paragraphIndex, request, metadata, true, signal), independentRequests: true, disableCacheStore: true });
    const start = Date.now();
    while (!records.length) { if (Date.now() - start > 2000) throw new Error("No review prepared"); await new Promise(resolve => setTimeout(resolve, 5)); }
    const oldId = records.at(-1).requestId;
    expect(h.calls).toHaveLength(0);
    await gate.reprepare(oldId, after);
    expect(h.calls).toHaveLength(0);
    expect(records.at(-1).imagePromptMetadata.template.id).toBe(after);
    expect(gate.decide(oldId, "generate", {})).toBe(false);
    expect(gate.decide(records.at(-1).requestId, "generate", {})).toBe(true);
    const result = await generation;
    expect(result[0]?.status).toBe("generated");
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.includeDataUrl).toBe(capture);
    expect(Object.keys(portraits(h)).length).toBe(capture ? 1 : 0);
  }
});

test("environment generation never captures a portrait in captured or card mode", async () => {
  for (const referenceSource of ["captured", "card"] as const) {
    const h = harness();
    const p = plan(`env-${referenceSource}`, [[0, "idle"]]);
    p.visualCues[0]!.imageTemplate = resolveImageTemplate(DEFAULT_CONFIG, "environment").template;
    const result = await run(h, new SceneImageCache(), p, { ...on, referenceSource });
    expect(result[0]?.status).toBe("generated");
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.includeDataUrl).toBe(false);
    expect(h.calls[0]?.anchored).toBe(false);
    expect(Object.keys(portraits(h))).toHaveLength(0);
  }
});

test("no-reference template excludes saved connection reference parameters", async () => {
  const h = harness();
  const p = plan("env-defaults", [[0, "idle"]]);
  p.visualCues[0]!.imageTemplate = resolveImageTemplate(DEFAULT_CONFIG, "environment").template;
  let received: Record<string, unknown> = {};
  h.spindle.imageGen.getConnection = (async () => ({ id: "conn", provider: "novelai", updated_at: 1, default_parameters: { resolvedReferenceImages: ["old character reference"], seed: 42 } })) as any;
  const original = h.spindle.imageGen.generate;
  h.spindle.imageGen.generate = async input => { received = input.parameters ?? {}; return original(input); };
  await generateAssets(h.spindle, p, createAssetJobs(p, on), { ...on, imageConnectionId: "conn" }, new AbortController().signal, () => {}, undefined, { beforeGenerate: async (_job, input) => input });
  expect(received.resolvedReferenceImages).toEqual([]);
  expect(received.seed).toBe(42);
});
import { TurnPlanSchema, type AssetJob, type SceneState, type TurnPlan, type VisualCue } from "../../shared/contracts.js";
import { createAssetJobs, generateAssets, resolveCacheCues } from "./images.js";
import { SceneImageCache } from "../core/scene-image-cache.js";
import { portraitStatePath } from "./storage.js";

const now = new Date().toISOString();
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function scene(): SceneState {
  return {
    sceneId: "s1", revision: 0, startParagraph: 0,
    environment: { location: "Library", timeOfDay: "night", weather: null, lighting: "lamplight", description: "A quiet library.", persistentElements: ["oak desk"] },
    cast: ["Mira"], continuity: { revision: 0, characters: {}, facts: {} }, basePrompt: "base", identityPrompt: "silver hair, green eyes, red coat",
    cameraLock: { framing: "upper body", angle: "eye level", perspective: "straight-on", lens: null, subjectAnchor: "c", horizon: "h", safeDialogueRegion: "r", aspectRatio: "16:9" },
    compositionLock: "lock", activeAssetId: null, priorSceneId: null, character: "Mira", characterId: "mira", subjectCategory: "female", attire: null
  };
}
function cue(p: number, pose: string, tag: string): VisualCue {
  return { cueId: `cue-${tag}-${p}`, paragraphIndex: p, sceneId: "s1", sceneRevision: 0, kind: "flattened_scene", action: null, expression: null, poseExpressionId: pose, promptDelta: "", assetJobId: `job-${tag}-${p}`, character: "Mira", characterId: "mira", subjectCategory: "female", resolvedIdentity: "silver hair, green eyes, red coat", resolvedAttire: null };
}
function plan(tag: string, cues: Array<[number, string]>): TurnPlan {
  return TurnPlanSchema.parse({
    schemaVersion: 1, key: { chatId: "chat-A", assistantMessageId: `m-${tag}`, swipeId: 0, sourceFingerprint: `fp-${tag}-00000000`, revision: 1 },
    paragraphs: [0, 1, 2].map((index) => ({ index, sourceIndex: index, text: `P${index}` })), scenes: [scene()],
    visualCues: cues.map(([p, pose]) => cue(p, pose, tag)), choices: [], initialContinuity: { revision: 0, characters: {}, facts: {} }, continuityDeltas: [],
    terminalContinuity: { revision: 0, characters: {}, facts: {} }, planningStatus: "planned", createdAt: now
  });
}

function harness() {
  const calls: Array<{ includeDataUrl: boolean | undefined; anchored: boolean }> = [];
  const store = new Map<string, unknown>();
  const images = new Set<string>();
  let seq = 0;
  const spindle = {
    log: { info() {}, warn() {}, error() {} },
    imageGen: {
      generate: async (input: { includeDataUrl?: boolean; parameters?: Record<string, unknown> }) => {
        calls.push({ includeDataUrl: input.includeDataUrl, anchored: Array.isArray(input.parameters?.resolvedReferenceImages) && input.parameters.resolvedReferenceImages.length > 0 });
        await new Promise((resolve) => setTimeout(resolve, 10));
        const imageId = `img-${++seq}`; images.add(imageId);
        return { imageId, imageUrl: `/api/v1/images/${imageId}`, imageDataUrl: PNG, model: "m", provider: "novelai" };
      },
      getConnection: async () => ({ provider: "novelai" }),
      listConnections: async () => [{ provider: "novelai", is_default: true }]
    },
    images: { get: async (id: string) => images.has(id) ? { id } : null },
    userStorage: {
      getJson: async (path: string, options: { fallback: unknown }) => store.get(path) ?? options.fallback,
      setJson: async (path: string, value: unknown) => { store.set(path, value); }
    }
  } as unknown as SpindleAPI;
  return { spindle, calls, store, images };
}
async function run(h: ReturnType<typeof harness>, cache: SceneImageCache, p: TurnPlan, cfg: VisualNovelConfig): Promise<AssetJob[]> {
  return generateAssets(h.spindle, p, createAssetJobs(p, cfg), cfg, new AbortController().signal, () => {}, undefined, { sceneCache: cache });
}
const off: VisualNovelConfig = { ...DEFAULT_CONFIG, maxImagesPerTurn: 2, imageConcurrency: 2, referenceAnchoring: false };
const on: VisualNovelConfig = { ...off, referenceAnchoring: true };
const portraits = (h: ReturnType<typeof harness>) => ((h.store.get(portraitStatePath("chat-A")) as { portraits?: Record<string, unknown> } | undefined)?.portraits ?? {});

test("template cache candidates reuse the actual compatible captured portrait", async () => {
  const h = harness(), cache = new SceneImageCache();
  const first = plan("template-anchor", [[0, "idle"], [1, "angry"]]);
  first.visualCues.forEach(c => { c.imageTemplate = resolveImageTemplate(on).template; });
  const jobs = await run(h, cache, first, on);
  expect(h.calls.filter(c => c.anchored)).toHaveLength(1);
  const second = plan("template-reuse", []);
  second.cacheCues = [{ ...first.visualCues[1]!, cueId: "reuse-cue", assetJobId: "reuse-job" }];
  const reused = await resolveCacheCues(h.spindle, second, on, undefined, [], cache);
  expect(reused).toHaveLength(1);
  expect(reused[0]?.imageId).toBe(jobs[1]?.imageId);
  expect(h.calls).toHaveLength(2);
});

test("no-people template overrides host-merged reference defaults and empty negatives", async () => {
  const h = harness(), p = plan("host-merge", [[0, "idle"]]);
  const template = resolveImageTemplate(on, "environment").template;
  p.visualCues[0]!.imageTemplate = { ...template, negative: "" };
  const defaults = { resolvedReferenceImages: ["old portrait bytes"], referenceImages: ["old ref"], negativePrompt: "HOST NEGATIVE", seed: 42 };
  h.spindle.imageGen.getConnection = (async () => ({ id: "conn", provider: "nanogpt", updated_at: 1, default_parameters: defaults })) as any;
  let merged: any, prepared: any;
  const original = h.spindle.imageGen.generate;
  h.spindle.imageGen.generate = async input => { merged = { ...defaults, ...input.parameters }; expect(input.negativePrompt).toBe(""); return original(input); };
  const jobs = await generateAssets(h.spindle, p, createAssetJobs(p, on), { ...on, imageConnectionId: "conn" }, new AbortController().signal, () => {}, undefined, { beforeGenerate: async (_job, input) => { prepared = input; return input; } });
  expect(jobs[0]?.status).toBe("generated");
  expect(merged.resolvedReferenceImages).toEqual([]);
  expect(merged.referenceImages).toEqual([]);
  expect(merged.negativePrompt).toBe("");
  expect(prepared.negativePrompt).toBe("");
  expect(merged.seed).toBe(42);
});

test("template cache invalidates changed connection defaults or model", async () => {
  const h = harness(), cache = new SceneImageCache(), cfg = { ...off, imageConnectionId: "nano" };
  let model = "model-a", seed = 1;
  h.spindle.imageGen.getConnection = (async () => ({ id: "nano", provider: "nanogpt", model, updated_at: seed, default_parameters: { seed } })) as any;
  const make = (tag: string) => { const p = plan(tag, [[0, "idle"]]); p.visualCues[0]!.imageTemplate = resolveImageTemplate(cfg, "environment").template; return p; };
  await run(h, cache, make("profile-a"), cfg);
  await run(h, cache, make("profile-a-repeat"), cfg);
  expect(h.calls).toHaveLength(1);
  model = "model-b"; seed = 2;
  await run(h, cache, make("profile-b"), cfg);
  expect(h.calls).toHaveLength(2);
});

test("saved template appearance change cannot reuse a mismatched captured portrait", async () => {
  const h = harness();
  const make = (tag: string) => { const p = plan(tag, [[0, "idle"]]); p.visualCues[0]!.imageTemplate = resolveImageTemplate(on).template; return p; };
  await run(h, new SceneImageCache(), make("old-identity"), on);
  expect(h.calls[0]?.includeDataUrl).toBe(true);
  h.store.set("chats/chat-A/characters.json", { mira: "black hair, brown eyes" });
  await run(h, new SceneImageCache(), make("new-identity"), on);
  expect(h.calls[1]?.includeDataUrl).toBe(true);
  expect(h.calls[1]?.anchored).toBe(false);
});

describe("regression: reference capture vs scene cache", () => {
  test("anchoring off -> on: the next render of a character with no portrait MUST capture, even though the cache has a hit", async () => {
    const cache = new SceneImageCache();
    const h = harness();
    const t1 = await run(h, cache, plan("a1", [[0, "smile"]]), off);
    expect(t1[0]!.status).toBe("generated");
    expect(h.calls).toEqual([{ includeDataUrl: false, anchored: false }]);
    expect(Object.keys(portraits(h))).toEqual([]);
    const t2 = await run(h, cache, plan("a2", [[0, "smile"]]), on);
    expect(t2[0]!.status).toBe("generated");
    expect(h.calls.length).toBe(2);                                     // capture render happened
    expect(h.calls[1]).toEqual({ includeDataUrl: true, anchored: false });
    expect(Object.keys(portraits(h))).toEqual(["mira"]);                 // portrait stored
    // A later identical cue is now anchored by portrait; the cache may serve it (portrait exists, no capture needed).
    const t3 = await run(h, cache, plan("a3", [[0, "smile"]]), on);
    expect(t3[0]!.status).toBe("generated");
    expect(h.calls.length).toBe(2);
  });

  test("capture concurrency unchanged with the cache on: one capture per character, later cues anchored, then all hits", async () => {
    const cache = new SceneImageCache();
    const h = harness();
    const t1 = await run(h, cache, plan("c1", [[0, "smile"], [1, "angry"]]), on);
    expect(t1.every((j) => j.status === "generated")).toBe(true);
    expect(h.calls.length).toBe(2);
    expect(h.calls.filter((c) => c.includeDataUrl === true).length).toBe(1);   // exactly one capture
    expect(h.calls.filter((c) => c.anchored).length).toBe(1);                 // the other waited and was anchored
    expect(Object.keys(portraits(h))).toEqual(["mira"]);
    const t2 = await run(h, cache, plan("c2", [[0, "smile"], [1, "angry"]]), on);
    expect(t2.every((j) => j.status === "generated")).toBe(true);
    expect(h.calls.length).toBe(2);                                            // both hits
    expect(t2.map((j) => j.imageId).sort()).toEqual(t1.map((j) => j.imageId).sort());
  });

  test("no portrait, cold cache, anchoring on: the very first render captures (baseline unchanged)", async () => {
    const h = harness();
    await run(h, new SceneImageCache(), plan("b1", [[0, "smile"]]), on);
    expect(h.calls).toEqual([{ includeDataUrl: true, anchored: false }]);
    expect(Object.keys(portraits(h))).toEqual(["mira"]);
  });
});
