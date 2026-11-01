import assert from "node:assert/strict";
import test from "node:test";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { DEFAULT_CONFIG } from "../../config.js";
import { ContinuityStateSchema, SceneStateSchema } from "../../shared/contracts.js";
import { emptySingleCharacter } from "../core/visual-state.js";
import { clearAudioCatalogCache, scanAudioCatalog } from "./audio-catalog.js";
import { planTurn } from "./planner.js";
import { decidePresentation, systemOneEndpoint } from "./system-one.js";

const continuity = ContinuityStateSchema.parse({ revision: 1, characters: {}, facts: {} });
const scene = SceneStateSchema.parse({
  sceneId: "known-room", revision: 1, startParagraph: 0,
  environment: { location: "Library", timeOfDay: "evening", weather: null, lighting: "lamplight", description: "A quiet library with bookshelves.", persistentElements: ["bookshelves"] },
  cast: ["Mira"], character: "Mira", continuity, basePrompt: "quiet library, bookshelves, lamplight",
  cameraLock: { framing: "upper body", angle: "eye level", perspective: "straight-on", lens: null, subjectAnchor: "center", horizon: "middle", safeDialogueRegion: "lower quarter", aspectRatio: "16:9" },
  compositionLock: "Mira centered", identityPrompt: "woman, brown hair, green eyes", activeAssetId: null, priorSceneId: null,
});
const message = {
  id: "a1", chat_id: "c1", index_in_chat: 1, is_user: false, name: "Mira", content: "The player says they are tired. Mira watches them quietly.",
  send_date: 1, swipe_id: 0, swipes: [], swipe_dates: [], extra: {}, parent_message_id: null, branch_id: null, created_at: 1, role: "assistant" as const,
};
const decisions = {
  model: "jev-latest", usage: { input_tokens: 250, output_tokens: 20 },
  answers: {
    scene_change: { type: "noul", noul: 0.01 },
    needs_description: { type: "noul", noul: 0.01 },
    speaker_0: { type: "choice", choice: "Mira", confidence: 0.91, probabilities: { Mira: 0.95, Narrator: 0.05 } },
    expression_0: { type: "choice", choice: "listen", confidence: 0.9, probabilities: { listen: 0.95, idle: 0.05 } },
  },
};

function spindle(raw: () => Promise<unknown>, logs: string[], response: unknown, withKey = true): SpindleAPI {
  return {
    enclave: { get: async () => withKey ? "test-secret" : null },
    cors: async (url: string, request: { method: string; headers: Record<string, string>; body: string }) => {
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      assert.equal(request.method, "POST");
      assert.equal(request.headers.Authorization, "Bearer test-secret");
      const body = JSON.parse(request.body);
      assert.equal(body.model, "jev-latest");
      assert.equal(body.state.previousScene.environment.location, "Library");
      assert.equal(body.questions.expression_0.type, "choice");
      return { status: 200, body: JSON.stringify(response) };
    },
    generate: { raw },
    storage: { list: async () => ["music/calm.mp3"] },
    log: { warn: (line: string) => logs.push(line), info: (line: string) => logs.push(line) },
  } as unknown as SpindleAPI;
}

function input(mode: "off" | "compare" | "on") {
  return {
    chatId: "c1", message, content: message.content, previousScene: scene, previousContinuity: continuity, recentMessages: [],
    config: { ...DEFAULT_CONFIG, systemOneMode: mode }, singleCharacter: emptySingleCharacter(), characterAppearance: {},
  };
}

test("confident System One continuation reuses a known scene without a prose planner call", async () => {
  let plannerCalls = 0;
  const logs: string[] = [];
  const result = await planTurn(spindle(async () => { plannerCalls++; throw new Error("should not run"); }, logs, decisions), input("on"));
  assert.equal(plannerCalls, 0);
  assert.equal(result.usedFallback, false);
  assert.equal(result.plan.scenes[0]?.sceneId, "known-room");
  assert.equal(result.plan.visualCues[0]?.poseExpressionId, "listen");
  assert.equal(result.plan.paragraphSpeakers[0], "Mira");
  assert.ok(logs.some((line) => line.includes("System One continuation")));
});

test("compare mode records decisions without changing the story-reader result", async () => {
  const logs: string[] = [];
  const result = await planTurn(spindle(async () => { throw new Error("planner unavailable"); }, logs, decisions), input("compare"));
  assert.equal(result.usedFallback, true);
  assert.equal(result.plan.paragraphSpeakers[0], null);
  assert.ok(logs.some((line) => line.includes("System One compare")));
});

test("missing extension API key falls back to the ordinary planner", async () => {
  let plannerCalls = 0;
  const result = await planTurn(spindle(async () => { plannerCalls++; throw new Error("planner unavailable"); }, [], decisions, false), input("on"));
  assert.equal(plannerCalls, 2);
  assert.equal(result.usedFallback, true);
});

test("System One endpoint accepts HTTPS and local HTTP, but rejects remote HTTP and credentials", () => {
  assert.equal(systemOneEndpoint("https://gateway.example/api/v1"), "https://gateway.example/api/v1/systemone");
  assert.equal(systemOneEndpoint("http://localhost:8080/v1/systemone"), "http://localhost:8080/v1/systemone");
  assert.throws(() => systemOneEndpoint("http://gateway.example"), /HTTPS/);
  assert.throws(() => systemOneEndpoint("https://user:pass@gateway.example"), /credentials/);
});

test("a detected scene change keeps the prose planner in charge", async () => {
  let plannerCalls = 0;
  const response = { ...decisions, answers: { ...decisions.answers, scene_change: { type: "noul", noul: 0.9 } } };
  const result = await planTurn(spindle(async () => { plannerCalls++; throw new Error("planner unavailable"); }, [], response), input("on"));
  assert.equal(plannerCalls, 2);
  assert.equal(result.usedFallback, true);
});

test("a confident audio choice adds a playback cue without adding an image cue", async () => {
  clearAudioCatalogCache();
  const logs: string[] = [];
  const api = spindle(async () => { throw new Error("planner should not run"); }, logs, {
    ...decisions,
    answers: {
      ...decisions.answers,
      bgm_0: { type: "choice", choice: "music/calm", confidence: 0.92, probabilities: { "music/calm": 0.92, none: 0.04, keep_current: 0.04 } },
    },
  });
  await scanAudioCatalog(api);
  const result = await planTurn(api, input("on"));
  assert.equal(result.plan.audioCues[0]?.bgm, "music/calm");
  assert.equal(result.plan.visualCues.length, 1);
  clearAudioCatalogCache();
});

test("classifier continuation covers expressions beyond the image cap and holds uncertain paragraphs", async () => {
  const response = structuredClone(decisions) as any;
  const expressions = ["listen", "listen", "smile", "idle", "listen"];
  for (const [index, expression] of expressions.entries()) {
    response.answers[`expression_${index}`] = { type: "choice", choice: expression, confidence: index === 3 ? 0.2 : 0.95, probabilities: { [expression]: 0.95 } };
  }
  const args = input("on");
  args.content = expressions.map(() => "Mira waits in the library.").join("\n\n");
  args.config = { ...args.config, maxImagesPerTurn: 1, generateImages: true };
  const result = await planTurn(spindle(async () => { throw new Error("planner should not run"); }, [], response), args);
  assert.equal(result.plan.classifierVisuals, true);
  assert.deepEqual(result.plan.visualCues.map((cue) => [cue.paragraphIndex, cue.poseExpressionId]), [[0, "listen"], [2, "smile"], [4, "listen"]]);
});

test("a hung System One endpoint rejects at the deadline instead of stalling planning", async () => {
  const hung = {
    enclave: { get: async () => "test-secret" },
    cors: () => new Promise(() => {}),
    log: { warn: () => {}, info: () => {} },
  } as unknown as SpindleAPI;
  await assert.rejects(
    decidePresentation(hung, {
      paragraphs: [{ index: 0, text: "Mira waits quietly." }],
      previousScene: null, names: ["Mira"], config: { ...DEFAULT_CONFIG, systemOneMode: "on" },
      timeoutMs: 30,
    }),
    /timed out after 30 ms/,
  );
});

test("an external abort cancels a System One request in flight", async () => {
  const hung = {
    enclave: { get: async () => "test-secret" },
    cors: () => new Promise(() => {}),
    log: { warn: () => {}, info: () => {} },
  } as unknown as SpindleAPI;
  const controller = new AbortController();
  const pending = decidePresentation(hung, {
    paragraphs: [{ index: 0, text: "Mira waits quietly." }],
    previousScene: null, names: ["Mira"], config: { ...DEFAULT_CONFIG, systemOneMode: "on" },
    signal: controller.signal, timeoutMs: 5_000,
  });
  controller.abort("cancelled by test");
  await assert.rejects(pending, /cancelled/);
});

test("missing noul answers fail closed: no invented scene change or description need", async () => {
  const api = {
    enclave: { get: async () => "test-secret" },
    cors: async () => ({ status: 200, body: JSON.stringify({ model: "jev-latest", answers: {} }) }),
    log: { warn: () => {}, info: () => {} },
  } as unknown as SpindleAPI;
  const decisions = await decidePresentation(api, {
    paragraphs: [{ index: 0, text: "Mira waits quietly." }],
    previousScene: scene, names: ["Mira"], config: { ...DEFAULT_CONFIG, systemOneMode: "on" },
  });
  assert.equal(decisions?.sceneChange, false);
  assert.equal(decisions?.needsDescription, false);
});

test("off, compare, missing key, invalid response, and native art preserve the original cue budget", async () => {
  const response = structuredClone(decisions) as any;
  response.answers.expression_1 = { type: "choice", choice: "smile", confidence: 0.95, probabilities: { smile: 0.95 } };
  for (const scenario of ["off", "compare", "missing-key", "invalid", "native", "uncertain"] as const) {
    const args = input(scenario === "compare" ? "compare" : "on");
    args.content = "Mira waits.\n\nMira smiles.";
    args.config = { ...args.config, maxImagesPerTurn: 1, generateImages: true, useNativeCardImages: scenario === "native", systemOneMode: scenario === "off" ? "off" : args.config.systemOneMode };
    const result = await planTurn(spindle(async () => { throw new Error("use deterministic fallback"); }, [],
      scenario === "invalid" ? {} : scenario === "uncertain" ? { ...response, answers: {} } : response, scenario !== "missing-key"), args);
    assert.equal(result.plan.classifierVisuals, undefined, scenario);
    assert.equal(result.plan.visualCues.length, 1, scenario);
  }
});

test("candidate ranking puts paragraph-relevant audio first and keeps catalog order on ties", async () => {
  const { rankByRelevance, formatSystemOneCoverage } = await import("./system-one.js");
  const items = [
    { id: "a-calm", name: "Calm meadow", tags: ["calm", "nature"] },
    { id: "b-storm", name: "Thunder storm", tags: ["storm", "rain", "dramatic"] },
    { id: "c-battle", name: "Drums of war", tags: ["battle", "drums"] },
  ];
  assert.deepEqual(rankByRelevance(items, "Lightning split the sky as the storm broke over the hills.", 2).map((i) => i.id), ["b-storm", "a-calm"]);
  // No overlap at all: the first N in catalog order, the previous behaviour.
  assert.deepEqual(rankByRelevance(items, "Zxq plonk.", 2).map((i) => i.id), ["a-calm", "b-storm"]);
  // Pinned ids are offered first even when they do not match the text.
  assert.deepEqual(rankByRelevance(items, "storm", 2, ["c-battle"]).map((i) => i.id), ["c-battle", "b-storm"]);
  assert.match(formatSystemOneCoverage({
    paragraphs: { answered: 24, total: 30 },
    expressions: { offered: 16, total: 92 },
    bgm: { offered: 24, total: 120 },
    sfx: { offered: 24, total: 60 },
  }), /paragraphs 24\/30, expressions 16\/92, bgm 24\/120, sfx 24\/60/);
});
