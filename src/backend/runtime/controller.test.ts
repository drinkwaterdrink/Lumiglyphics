import { normalizeConfig } from "../../config.js";
import { templateSnapshot } from "../../shared/image-templates.js";
import { describe, expect, test } from "bun:test";
import type { SpindleAPI } from "lumiverse-spindle-types";
import { AssetJobSchema, TurnPlanSchema, type AssetJob } from "../../shared/contracts.js";
import { markAssetReady, registerVisualNovelBackend, sendState, turnView, viewRegistry } from "./controller.js";
import { chatStatePath, singleCharacterStatePath, turnPath, type StoredChatState, type StoredTurnRecord } from "./storage.js";
import { seedSingleCharacter } from "../core/visual-state.js";
import { SINGLE_CHARACTER_SCHEMA_VERSION } from "../../shared/character.js";

const now = new Date().toISOString();
const key = {
  chatId: "chat",
  assistantMessageId: "message",
  swipeId: 0,
  sourceFingerprint: "12345678abcdef",
  revision: 0
};

const plan = TurnPlanSchema.parse({
  schemaVersion: 1,
  key,
  paragraphs: [{ index: 0, sourceIndex: 0, text: "The door opens." }],
  scenes: [{
    sceneId: "scene",
    revision: 0,
    startParagraph: 0,
    environment: {
      location: "Library",
      timeOfDay: "night",
      weather: null,
      lighting: "lamplight",
      description: "A quiet library.",
      persistentElements: []
    },
    cast: ["Mira"],
    continuity: { revision: 0, characters: {}, facts: {} },
    basePrompt: "quiet library at night",
    cameraLock: {
      framing: "medium wide",
      angle: "eye level",
      perspective: "fixed",
      lens: "50mm",
      subjectAnchor: "center",
      horizon: "upper third",
      safeDialogueRegion: "lower third",
      aspectRatio: "16:9"
    },
    compositionLock: "Mira centered",
    activeAssetId: null,
    priorSceneId: null
  }],
  visualCues: [{
    cueId: "cue",
    paragraphIndex: 0,
    sceneId: "scene",
    sceneRevision: 0,
    kind: "flattened_scene",
    action: null,
    expression: null,
    promptDelta: "Mira looks toward the door",
    assetJobId: "job"
  }],
  choices: [],
  initialContinuity: { revision: 0, characters: {}, facts: {} },
  continuityDeltas: [],
  terminalContinuity: { revision: 0, characters: {}, facts: {} },
  planningStatus: "planned",
  createdAt: now
});

function generatedJob(): AssetJob {
  return {
    jobId: "job",
    ownerTurnKey: key,
    sceneId: "scene",
    sceneRevision: 0,
    paragraphIndex: 0,
    promptFingerprint: "prompt-fingerprint",
    provider: "image:default",
    priority: "visible",
    status: "generated",
    imageId: "image",
    imageUrl: "/api/v1/images/image",
    error: null,
    queuedAt: now,
    startedAt: now,
    generatedAt: now,
    readyAt: null,
    finishedAt: null
  };
}

function runtime(record: StoredTurnRecord): { spindle: SpindleAPI; writes: Map<string, unknown>; sent: unknown[] } {
  const path = turnPath("chat", "message", 0);
  const state: StoredChatState = {
    schemaVersion: 1,
    activeTurnPath: path,
    latestScene: plan.scenes[0]!,
    terminalContinuity: plan.terminalContinuity,
    updatedAt: now
  };
  const data = new Map<string, unknown>([[chatStatePath("chat"), state], [path, record]]);
  const writes = new Map<string, unknown>();
  const sent: unknown[] = [];
  const spindle = {
    userStorage: {
      getJson: async (storagePath: string, options: { fallback: unknown }) => data.get(storagePath) ?? options.fallback,
      setJson: async (storagePath: string, value: unknown) => {
        data.set(storagePath, value);
        writes.set(storagePath, value);
      }
    },
    sendToFrontend: (message: unknown) => { sent.push(message); }
  } as unknown as SpindleAPI;
  return { spindle, writes, sent };
}

describe("runtime asset readiness", () => {
  test("failed replacements expose the previous usable picture and preserve request inspection", () => {
    const record: StoredTurnRecord = { schemaVersion: 1, speaker: "Mira", status: "ready", plan, jobs: [{ ...generatedJob(), status: "failed", imageId: null, imageUrl: null }], previousImages: { job: { imageId: "original", imageUrl: "/original" } }, updatedAt: now };
    expect(turnView(record).assets[0]?.imageUrl).toBe("/original");
    expect(turnView(record).assets[0]?.status).toBe("failed");
    expect(turnView(record).assets[0]?.previousImage).toBe(true);
  });
  test("turn views expose the stable job identity", () => {
    const record: StoredTurnRecord = { schemaVersion: 1, speaker: "Mira", status: "ready", plan, jobs: [generatedJob()], updatedAt: now };
    expect(turnView(record).assets[0]?.jobId).toBe("job");
  });

  test("persists browser readiness only for the active fingerprint", async () => {
    const record: StoredTurnRecord = { schemaVersion: 1, speaker: "Mira", status: "ready", plan, jobs: [generatedJob()], updatedAt: now };
    const { spindle, writes, sent } = runtime(record);
    await markAssetReady(spindle, {
      type: "vn_asset_ready",
      chatId: "chat",
      messageId: "message",
      jobId: "job",
      sourceFingerprint: key.sourceFingerprint
    });
    const stored = writes.get(turnPath("chat", "message", 0)) as StoredTurnRecord;
    expect(stored.jobs[0]?.status).toBe("browser_ready");
    expect(stored.jobs[0]?.readyAt).toBeString();
    expect((sent[0] as { asset: AssetJob }).asset.status).toBe("browser_ready");
  });

  test("ignores readiness from an obsolete turn", async () => {
    const record: StoredTurnRecord = { schemaVersion: 1, speaker: "Mira", status: "ready", plan, jobs: [generatedJob()], updatedAt: now };
    const { spindle, writes, sent } = runtime(record);
    await markAssetReady(spindle, {
      type: "vn_asset_ready",
      chatId: "chat",
      messageId: "message",
      jobId: "job",
      sourceFingerprint: "obsolete-fingerprint"
    });
    expect(writes.size).toBe(0);
    expect(sent).toHaveLength(0);
  });
});


type PlanningMsg = {
  id: string;
  content: string;
  is_user: boolean;
  name: string;
};

function planningRuntime(
  messages: PlanningMsg[],
  options: {
    initial?: ReadonlyMap<string, unknown>;
    generateRaw?: () => unknown;
  } = {}
): {
  spindle: SpindleAPI;
  data: Map<string, unknown>;
  sent: Array<Record<string, unknown>>;
  generateCalls: () => number;
} {
  const data = new Map<string, unknown>(options.initial ?? []);
  data.set("config.json", { generateImages: false, maxImagesPerTurn: 4, includeCharacterContext: false, includePersonaContext: false, includeLorebookContext: false });
  const sent: Array<Record<string, unknown>> = [];
  let generateCalls = 0;
  const spindle = {
    userStorage: {
      getJson: async (path: string, readOptions: { fallback: unknown }) => data.get(path) ?? readOptions.fallback,
      setJson: async (path: string, value: unknown) => { data.set(path, value); }
    },
    chat: {
      getMessages: async () => messages.map((m) => ({
        ...m,
        chat_id: "chat-controller",
        index_in_chat: 1,
        send_date: 1,
        swipe_id: 0,
        swipes: [m.content],
        swipe_dates: [1],
        extra: {},
        parent_message_id: m.is_user ? null : "user-1",
        branch_id: null,
        created_at: 1,
        role: m.is_user ? "user" : "assistant"
      }))
    },
    generate: {
      raw: async () => {
        generateCalls += 1;
        if (options.generateRaw) return { content: JSON.stringify(options.generateRaw()) };
        throw new Error("planner unavailable");
      }
    },
    sendToFrontend: (payload: Record<string, unknown>) => { sent.push(payload); },
    log: { warn() {}, error() {}, info() {} }
  } as unknown as SpindleAPI;
  return { spindle, data, sent, generateCalls: () => generateCalls };
}

function singleCharacterPayload(description: string) {
  return {
    scenes: [{
      startParagraph: 0,
      boundary: { claimedNewScene: true, reason: "initial", location: "Observatory", timeOfDay: "night", majorTimeJump: false, environmentReplacement: false, forced: false },
      environment: { location: "Observatory", timeOfDay: "night", weather: null, lighting: "lantern light", description: "An old observatory", persistentElements: ["brass telescope"] },
      cast: ["Mira"],
      basePrompt: "old observatory, brass telescope",
      compositionLock: "Mira centered"
    }],
    cues: [{ paragraphIndex: 0 }],
    choices: [],
    characters: [{ name: "Mira", description }]
  };
}

describe("single-character planning flow", () => {
  test("persists the terminal subject and wardrobe without rewriting the opening scene", async () => {
    const runtime = planningRuntime([
      { id: "assistant-timeline", content: "Mira listens.\n\nA visitor enters.", is_user: false, name: "Scenario" }
    ], { generateRaw: () => ({ ...singleCharacterPayload("silver hair, green eyes"),
      cues: [{ paragraphIndex: 0, character: "Mira" }, { paragraphIndex: 1, character: "Visitor", attire: "blue pajamas" }],
      characters: [{ name: "Mira", description: "silver hair, green eyes" }, { name: "Visitor", description: "red hair, blue eyes" }]
    }) });
    await sendState(runtime.spindle, "chat-controller", "user-timeline", { viewOpen: true });
    const state = runtime.data.get(chatStatePath("chat-controller")) as StoredChatState;
    const record = runtime.data.get(state.activeTurnPath!) as StoredTurnRecord;
    expect(record.plan.scenes[0]?.character).toBe("Mira");
    expect(record.plan.scenes[0]?.attire).toBeNull();
    expect(state.latestScene?.character).toBe("Visitor");
    expect(state.latestScene?.attire).toBe("blue pajamas");
    expect(state.latestScene?.identityPrompt).toBe("red hair, blue eyes");
    const roster = runtime.data.get("chats/chat-controller/characters.json") as Record<string, string>;
    expect(roster.Mira).toBe("silver hair, green eyes");
    expect(roster.Visitor).toBe("red hair, blue eyes");
  });

  test("seeds the single-character state once from the planner on a fresh chat", async () => {
    const runtime = planningRuntime([
      { id: "user-1", content: "Open the door.", is_user: true, name: "User" },
      { id: "assistant-1", content: "Mira steps forward.", is_user: false, name: "Mira" }
    ], { generateRaw: () => singleCharacterPayload("silver hair, green eyes") });

    await sendState(runtime.spindle, "chat-controller", "user-1", { viewOpen: true });

    const stored = runtime.data.get(singleCharacterStatePath("chat-controller")) as Record<string, unknown>;
    expect(stored.schemaVersion).toBe(SINGLE_CHARACTER_SCHEMA_VERSION);
    expect((stored.protagonist as Record<string, unknown>).name).toBe("Mira");
    expect((stored.protagonist as Record<string, unknown>).tags).toEqual(["silver hair", "green eyes"]);
  });

  test("freezes the seeded identity on a later plan even if the planner drifts", async () => {
    const seeded = seedSingleCharacter("Mira", "brown hair, violet eyes");
    const runtime = planningRuntime([
      { id: "user-2", content: "Continue.", is_user: true, name: "User" },
      { id: "assistant-2", content: "A new scene begins.", is_user: false, name: "Mira" }
    ], {
      initial: new Map<string, unknown>([[singleCharacterStatePath("chat-controller"), seeded]]),
      generateRaw: () => singleCharacterPayload("silver hair, green eyes, red coat")
    });

    await sendState(runtime.spindle, "chat-controller", "user-1", { viewOpen: true });

    const stored = runtime.data.get(singleCharacterStatePath("chat-controller")) as Record<string, unknown>;
    // Frozen identity wins; the planner's drifted description is ignored.
    expect((stored.protagonist as Record<string, unknown>).name).toBe("Mira");
    expect((stored.protagonist as Record<string, unknown>).tags).toEqual(["brown hair", "violet eyes"]);
  });

  test("re-sends a valid stored turn without re-planning (reuse guard)", async () => {
    const record: StoredTurnRecord = { schemaVersion: 1, speaker: "Mira", status: "ready", plan, jobs: [], updatedAt: now };
    const path = turnPath("chat", "message", 0);
    const state: StoredChatState = {
      schemaVersion: 1,
      activeTurnPath: path,
      latestScene: plan.scenes[0]!,
      terminalContinuity: plan.terminalContinuity,
      updatedAt: now
    };
    const runtime = planningRuntime([], {
      initial: new Map<string, unknown>([
        [chatStatePath("chat"), state],
        [path, record]
      ]),
      generateRaw: () => { throw new Error("must not re-plan"); }
    });

    await sendState(runtime.spindle, "chat", "user-1", { viewOpen: true });

    // The stored turn is returned as-is; the planner is never invoked again.
    expect(runtime.sent[0]).toMatchObject({ type: "vn_state", chatId: "chat", turn: { messageId: "message" } });
    expect(runtime.generateCalls()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GENERATION_STARTED abort / ownership invalidation
// ---------------------------------------------------------------------------

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for condition");
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
}

const generationContent = "First paragraph.\n\nSecond paragraph.";

function generationPayload(cues: number[]) {
  return {
    scenes: [{
      startParagraph: 0,
      boundary: { claimedNewScene: true, reason: "initial", location: "Observatory", timeOfDay: "night", majorTimeJump: false, environmentReplacement: false, forced: false },
      environment: { location: "Observatory", timeOfDay: "night", weather: null, lighting: "lantern light", description: "An old observatory", persistentElements: ["brass telescope"] },
      cast: ["Mira"],
      basePrompt: "old observatory, brass telescope",
      compositionLock: "Mira centered"
    }],
    cues: cues.map((paragraphIndex) => ({ paragraphIndex })),
    choices: [],
    characters: [{ name: "Mira", description: "silver hair, green eyes" }]
  };
}

function generationFixture() {
  let frontend: (payload: unknown, userId: string) => void = () => {};
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  const data = new Map<string, unknown>();
  const sent: unknown[] = [];
  const gates: Array<{ resolve: (value: { imageId: string; imageUrl?: string | null }) => void; reject: (reason?: unknown) => void }> = [];
  data.set("config.json", {
    generateImages: true,
    reviewImages: false,
    maxImagesPerTurn: 2,
    imageConcurrency: 1,
    includeCharacterContext: false,
    includePersonaContext: false,
    includeLorebookContext: false
  });
  const spindle = {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    onFrontendMessage: (handler: typeof frontend) => { frontend = handler; },
    userStorage: {
      getJson: async (path: string, options: { fallback: unknown }) => data.get(path) ?? options.fallback,
      setJson: async (path: string, value: unknown) => { data.set(path, value); }
    },
    chat: {
      getMessages: async () => [{
        id: "assistant-1",
        content: generationContent,
        is_user: false,
        name: "Mira",
        chat_id: "chat",
        index_in_chat: 1,
        send_date: 1,
        swipe_id: 0,
        swipes: [generationContent],
        swipe_dates: [1],
        extra: {},
        parent_message_id: "user-1",
        branch_id: null,
        created_at: 1
      }]
    },
    generate: {
      raw: async () => ({ content: JSON.stringify(generationPayload([0, 1])) })
    },
    imageGen: {
      generate: async () => {
        const gate = deferred<{ imageId: string; imageUrl?: string | null }>();
        gates.push(gate);
        return gate.promise;
      }
    },
    sendToFrontend: (message: unknown) => { sent.push(message); },
    log: { warn() {}, error() {}, info() {} }
  } as unknown as SpindleAPI;
  const fire = (event: string, ...args: unknown[]) => {
    for (const handler of handlers.get(event) ?? []) handler(...args);
  };
  const assetStatuses = (): string[] => (sent as Array<Record<string, unknown>>)
    .filter((message) => message.type === "vn_asset")
    .map((message) => (message.asset as Record<string, unknown>).status as string);
  return { spindle, fire, data, sent, gates, assetStatuses, request: (payload: unknown, userId = "review-user") => frontend(payload, userId) };
}

describe("image review controller lifecycle", () => {
  test("manual held and replacement choices accept templates excluded from dynamic mode", async () => {
    const f = generationFixture();
    f.data.set("config.json", { generateImages: true, reviewImages: true, referenceAnchoring: false, maxImagesPerTurn: 1, includeCharacterContext: false, includePersonaContext: false });
    registerVisualNovelBackend(f.spindle);
    await sendState(f.spindle, "chat", "review-user", { viewOpen: true });
    const record = () => f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord;
    const latest = () => record()?.imageRequests?.at(-1);
    await waitFor(() => latest()?.state === "review");
    const scope = { chatId: "chat", messageId: "assistant-1", sourceFingerprint: record().plan.key.sourceFingerprint };
    f.request({ type: "vn_reprepare_image_template", ...scope, requestId: latest()!.requestId, templateId: "manga-page" });
    await waitFor(() => latest()?.imagePromptMetadata?.template.id === "manga-page");
    expect(f.gates).toHaveLength(0);
    const first = latest()!;
    f.request({ type: "vn_image_review", ...scope, requestId: first.requestId, action: "generate" });
    await waitFor(() => f.gates.length === 1);
    f.gates[0]!.resolve({ imageId: "original", imageUrl: "/original" });
    await waitFor(() => record().jobs[0]?.status === "generated");
    await new Promise(resolve => setTimeout(resolve, 5));
    f.request({ type: "vn_prepare_image", ...scope, jobId: first.jobId, templateId: "manga-page" });
    await waitFor(() => latest()?.requestId !== first.requestId && latest()?.state === "review");
    expect(latest()?.imagePromptMetadata?.template.id).toBe("manga-page");
    expect(f.gates).toHaveLength(1);
  });
  test("rejects cross-user and duplicate approval; retains old art after replacement failure", async () => {
    const f = generationFixture();
    f.data.set("config.json", { generateImages: true, reviewImages: true, referenceAnchoring: false, maxImagesPerTurn: 1, includeCharacterContext: false, includePersonaContext: false });
    registerVisualNovelBackend(f.spindle);
    await sendState(f.spindle, "chat", "review-user", { viewOpen: true });
    const latestRequest = () => (f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord)?.imageRequests?.at(-1);
    await waitFor(() => latestRequest()?.state === "review");
    expect(f.gates).toHaveLength(0);
    const first = latestRequest()!;
    const action = { type: "vn_image_review", chatId: "chat", messageId: "assistant-1", sourceFingerprint: (f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord).plan.key.sourceFingerprint, requestId: first.requestId, action: "generate", edits: { prompt: "my exact portrait" } };
    f.request(action, "other-user");
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(f.gates).toHaveLength(0);
    f.request(action);
    f.request(action);
    await waitFor(() => f.gates.length === 1);
    f.gates[0]!.resolve({ imageId: "original", imageUrl: "/original" });
    await waitFor(() => (f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord).jobs[0]?.status === "generated");
    expect(latestRequest()?.prompt).toBe("my exact portrait");
    await new Promise((resolve) => setTimeout(resolve, 5));
    f.data.set("config.json", { ...(f.data.get("config.json") as object), generateImages: false });
    f.request({ type: "vn_prepare_image", chatId: "chat", messageId: "assistant-1", sourceFingerprint: action.sourceFingerprint, jobId: first.jobId });
    await waitFor(() => f.sent.some((entry: any) => entry.type === "vn_error" && /Enable generated pictures/.test(entry.error)));
    expect((f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord).jobs[0]?.status).toBe("generated");
    f.data.set("config.json", { ...(f.data.get("config.json") as object), generateImages: true });
    f.request({ type: "vn_prepare_image", chatId: "chat", messageId: "assistant-1", sourceFingerprint: action.sourceFingerprint, jobId: first.jobId });
    await waitFor(() => latestRequest()?.state === "review" && latestRequest()?.requestId !== first.requestId);
    const replacement = latestRequest()!;
    f.request({ ...action, requestId: replacement.requestId });
    await waitFor(() => f.gates.length === 2);
    f.gates[1]!.reject(new Error("provider failed"));
    await waitFor(() => (f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord).jobs[0]?.status === "failed");
    const view = turnView(f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord);
    expect(view.assets[0]?.imageUrl).toBe("/original");
    expect(view.assets[0]?.previousImage).toBe(true);
    expect(view.assets[0]?.error).toContain("provider failed");
    expect(f.gates).toHaveLength(2);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const stored = f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord;
    stored.plan.cacheCues = stored.plan.visualCues;
    stored.plan.visualCues = [];
    f.request({ type: "vn_prepare_image", chatId: "chat", messageId: "assistant-1", sourceFingerprint: action.sourceFingerprint, jobId: first.jobId });
    await waitFor(() => latestRequest()?.state === "review" && latestRequest()?.requestId !== replacement.requestId);
    expect(f.gates).toHaveLength(2);
    f.request({ type: "vn_view", chatId: "chat", open: false });
  });

  test("turning review off keeps an existing draft held; close cancels it without paid calls", async () => {
    const f = generationFixture();
    f.data.set("config.json", { generateImages: true, reviewImages: true, referenceAnchoring: false, maxImagesPerTurn: 1, includeCharacterContext: false, includePersonaContext: false });
    registerVisualNovelBackend(f.spindle);
    await sendState(f.spindle, "chat", "toggle-user", { viewOpen: true });
    const saved = () => f.data.get(turnPath("chat", "assistant-1", 0)) as StoredTurnRecord;
    await waitFor(() => saved().imageRequests?.at(-1)?.state === "review");
    f.request({ type: "vn_set_config", patch: { reviewImages: false } }, "toggle-user");
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(f.gates).toHaveLength(0);
    f.request({ type: "vn_view", chatId: "chat", open: false }, "toggle-user");
    await waitFor(() => saved().jobs[0]?.status === "cancelled");
    expect(f.gates).toHaveLength(0);
    await sendState(f.spindle, "chat", "toggle-user", { viewOpen: true });
    expect((f.sent.filter((entry: any) => entry.type === "vn_state").at(-1) as any).turn.imageRequests.at(-1).state).toBe("cancelled");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const old = saved().imageRequests!.at(-1)!;
    f.request({ type: "vn_prepare_image", chatId: "chat", messageId: "assistant-1", sourceFingerprint: saved().plan.key.sourceFingerprint, jobId: old.jobId }, "toggle-user");
    await waitFor(() => saved().imageRequests?.at(-1)?.state === "review" && saved().imageRequests?.at(-1)?.requestId !== old.requestId);
    expect(f.gates).toHaveLength(0);
    f.request({ type: "vn_view", chatId: "chat", open: false }, "toggle-user");
  });
});

describe("GENERATION_STARTED abort and ownership invalidation", () => {
  test("without GENERATION_STARTED a completion is still accepted", async () => {
    const { spindle, fire, gates, assetStatuses } = generationFixture();
    registerVisualNovelBackend(spindle);
    viewRegistry().open(undefined, "chat");
    fire("GENERATION_ENDED", { chatId: "chat", messageId: "assistant-1", content: generationContent });
    await waitFor(() => gates.length >= 1);
    gates[0]!.resolve({ imageId: "image-0", imageUrl: "/api/v1/images/image-0" });
    await waitFor(() => assetStatuses().includes("generated"));
    expect(assetStatuses()).toContain("generated");
  });

  test("aborts the asset controller and invalidates ownership so a running completion cannot persist/send", async () => {
    const { spindle, fire, gates, sent, assetStatuses } = generationFixture();
    registerVisualNovelBackend(spindle);
    viewRegistry().open(undefined, "chat");
    fire("GENERATION_ENDED", { chatId: "chat", messageId: "assistant-1", content: generationContent });
    // The first job is running (its image call is in flight).
    await waitFor(() => gates.length >= 1);
    await waitFor(() => assetStatuses().includes("generating"));
    // A new generation starts (user submitted a new message): abort + invalidate ownership.
    fire("GENERATION_STARTED", { chatId: "chat" });
    // Let any late completion try to land.
    gates[0]!.resolve({ imageId: "image-0", imageUrl: "/api/v1/images/image-0" });
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    // The running completion must NOT be surfaced as a vn_asset "generated".
    expect(assetStatuses()).not.toContain("generated");
    // The queued second job never started: the image provider saw exactly one call.
    expect(gates.length).toBe(1);
  });
});

describe("Finding #3: vn_retry_turn recovery and settings snapshotting", () => {
  for (const missingIdentity of [false, true]) test(`recovers failed jobs${missingIdentity ? " by replanning unresolved identity" : " with changed settings"}`, async () => {
    let frontendHandler!: (payload: unknown) => void;
    const sent: any[] = [];
    const calls: any[] = [];
    const data = new Map<string, unknown>();
    const message = {
      id: "assistant-retry-1",
      chat_id: "chat",
      content: "Mira smiles warmly.",
      is_user: false,
      name: "Mira",
      swipe_id: 0
    };

    const p = TurnPlanSchema.parse({
      schemaVersion: 1,
      key: { chatId: "chat", assistantMessageId: message.id, swipeId: 0, sourceFingerprint: "fingerprint-1", revision: 1 },
      paragraphs: [{ index: 0, sourceIndex: 0, text: "Mira smiles warmly." }],
      scenes: [{
        sceneId: "scene", revision: 1, startParagraph: 0,
        environment: { location: "Garden", timeOfDay: "day", weather: null, lighting: "sunlight", description: "A garden.", persistentElements: [] },
        cast: ["Mira"], character: "Mira", continuity: { revision: 0, characters: {}, facts: {} },
        basePrompt: "garden", identityPrompt: "silver hair, green eyes",
        cameraLock: { framing: "upper body", angle: "eye level", perspective: "fixed", lens: "50mm", subjectAnchor: "center", horizon: "upper third", safeDialogueRegion: "lower third", aspectRatio: "16:9" },
        compositionLock: "centered", activeAssetId: null, priorSceneId: null
      }],
      visualCues: [{
        cueId: "cue-0", paragraphIndex: 0, sceneId: "scene", sceneRevision: 1, kind: "flattened_scene",
        action: null, expression: null, poseExpressionId: "smile", character: "Mira", promptDelta: "", assetJobId: "job-0"
      }],
      choices: [], initialContinuity: { revision: 0, characters: {}, facts: {} }, continuityDeltas: [], terminalContinuity: { revision: 0, characters: {}, facts: {} }, planningStatus: "planned", createdAt: now
    });

    const failedJob: AssetJob = AssetJobSchema.parse({
      jobId: "job-0", ownerTurnKey: p.key, sceneId: "scene", sceneRevision: 1, paragraphIndex: 0,
      promptFingerprint: "old-fingerprint-12345678", provider: "image:default", priority: "visible",
      status: "failed", startedAt: now, finishedAt: now, error: "Temporary outage",
      queuedAt: now, imageId: null, imageUrl: null, readyAt: null, generatedAt: null
    });

    if (missingIdentity) p.visualCues[0]!.resolvedIdentity = "";
    let planningCalls = 0;
    const record: StoredTurnRecord = {
      schemaVersion: 1,
      speaker: "Mira",
      status: "ready",
      plan: p,
      jobs: [failedJob],
      updatedAt: now
    };
    data.set(turnPath("chat", message.id, 0), record);
    data.set("config.json", {
      generateImages: true,
      reviewImages: false,
      maxImagesPerTurn: 2,
      imageConcurrency: 1,
      promptPrefix: "new quality tags"
    });

    const spindle = {
      on: () => {},
      onFrontendMessage: (fn: any) => { frontendHandler = fn; },
      userStorage: {
        getJson: async (path: string, options: any) => data.get(path) ?? options.fallback,
        setJson: async (path: string, value: unknown) => { data.set(path, value); }
      },
      chat: { getMessages: async () => [message] },
      generate: { raw: async () => {
        planningCalls++;
        return { text: JSON.stringify(singleCharacterPayload("silver hair, green eyes")) };
      } },
      imageGen: {
        getConnection: async () => ({ provider: "comfyui" }),
        listConnections: async () => [{ provider: "comfyui", is_default: true }],
        generate: async (input: any) => {
          calls.push(input);
          return { imageId: "img-recovered-0", imageUrl: "/api/v1/images/img-recovered-0" };
        }
      },
      sendToFrontend: (msg: unknown) => { sent.push(msg); },
      log: { info: () => {}, warn: () => {}, error: () => {} }
    } as any;

    registerVisualNovelBackend(spindle);
    await frontendHandler({ type: "vn_retry_turn", chatId: "chat", messageId: message.id });

    // Wait for the asset to finish generating
    for (let i = 0; i < 50; i++) {
      const saved = data.get(turnPath("chat", message.id, 0)) as StoredTurnRecord | undefined;
      if (saved?.jobs[0]?.status === "generated") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(calls).toHaveLength(1);
    expect(planningCalls).toBe(missingIdentity ? 1 : 0);
    expect(calls[0].prompt).toContain("new quality tags");

    const saved = data.get(turnPath("chat", message.id, 0)) as StoredTurnRecord;
    expect(saved.jobs[0]?.status).toBe("generated");
    expect(saved.jobs[0]?.imageId).toBe("img-recovered-0");
    expect(saved.settingsSnapshot?.promptPrefix).toBe("new quality tags");
    expect(saved.attempts && saved.attempts.length >= 1).toBe(true);
  });
});

describe("paragraph effects and scene ambients", () => {
  function view(overrides: Record<string, unknown> = {}) {
    const effectPlan = TurnPlanSchema.parse({
      ...plan,
      paragraphs: [0, 1, 2, 3].map((index) => ({ index, sourceIndex: index, text: `Beat ${index}.` })),
      ...overrides
    });
    return turnView({ schemaVersion: 1, speaker: "Mira", status: "ready", plan: effectPlan, jobs: [], updatedAt: now });
  }

  test("uncapped effect cues reach paragraphs without image cues and override legacy effects", () => {
    expect(view({
      visualCues: [{ ...plan.visualCues[0], effect: "shake" }],
      effectCues: [{ paragraphIndex: 3, effect: "confetti" }]
    }).effects).toEqual([null, null, null, "confetti"]);
  });

  test("absent effectCues falls back to legacy cues, but [] does not", () => {
    const visualCues = [{ ...plan.visualCues[0], effect: "shake" }];
    expect(view({ visualCues }).effects).toEqual(["shake", null, null, null]);
    expect(view({ visualCues, effectCues: [] }).effects).toBeUndefined();
  });

  test("scene boundaries change and clear ambient even without image cues", () => {
    expect(view({ scenes: [
      { ...plan.scenes[0], ambient: "rain" },
      { ...plan.scenes[0], sceneId: "scene-2", priorSceneId: "scene", startParagraph: 1, ambient: "fog" },
      { ...plan.scenes[0], sceneId: "scene-3", priorSceneId: "scene-2", startParagraph: 2, ambient: null }
    ] }).ambients).toEqual(["rain", "fog", null, null]);
  });

  test("all-null ambients are clear instructions; legacy missing ambients remain omitted", () => {
    expect(view({ scenes: [{ ...plan.scenes[0], ambient: null }] }).ambients).toEqual([null, null, null, null]);
    expect(view().ambients).toBeUndefined();
  });

  test("effect cue schema rejects unknown effects and indexes outside the turn", () => {
    expect(() => view({ effectCues: [{ paragraphIndex: 4, effect: "shake" }] })).toThrow();
    expect(() => view({ effectCues: [{ paragraphIndex: 0, effect: "unknown" }] })).toThrow();
    expect(() => view({ effectCues: [{ paragraphIndex: -1, effect: "shake" }] })).toThrow();
  });
});


test("cached Manga pages carry page presentation without a prepared image request", () => {
  const manga = normalizeConfig({}).imageTemplates.find(t => t.id === "manga-page")!;
  const pagePlan = TurnPlanSchema.parse({ ...plan, visualCues: plan.visualCues.map(c => ({ ...c, imageTemplate: templateSnapshot(manga) })) });
  const job = { ...generatedJob(), provider: "cache", imageId: "page", imageUrl: "/images/page" };
  const record: StoredTurnRecord = { schemaVersion: 1, speaker: "Narrator", status: "ready", plan: pagePlan, jobs: [job], updatedAt: now };
  expect(turnView(record).assets[0]?.presentation).toBe("page");
});


describe('scoped picture subject recovery',()=>{
 test('corrects one failed picture, preserves completed art and holds review with review mode off',async()=>{
  const f=generationFixture();registerVisualNovelBackend(f.spindle);
  await sendState(f.spindle,'chat','recovery-user',{viewOpen:true});
  const saved=()=>f.data.get(turnPath('chat','assistant-1',0)) as StoredTurnRecord;
  await waitFor(()=>f.gates.length===1);f.gates[0]!.resolve({imageId:'first',imageUrl:'/first'});
  await waitFor(()=>f.gates.length===2 || saved().jobs.every(j=>j.status==='generated'));
  if(f.gates[1]) f.gates[1].resolve({imageId:'second',imageUrl:'/second'});
  await waitFor(()=>saved().jobs.every(j=>j.status==='generated'));
  const paidBefore=f.gates.length;const keptImage=saved().jobs[1]!.imageId;
  await new Promise(r=>setTimeout(r,10));
  const failed=saved().jobs[0]!;
  f.data.set(turnPath('chat','assistant-1',0),{...saved(),plan:{...saved().plan,visualCues:saved().plan.visualCues.map(c=>c.assetJobId===failed.jobId?{...c,visualDescription:'Mira in a silver dress waves',action:'Mira adjusts her silver dress'}:c)},jobs:saved().jobs.map(j=>j.jobId===failed.jobId?{...j,status:'failed',imageId:null,imageUrl:null,generatedAt:null,readyAt:null,finishedAt:new Date().toISOString(),error:'No usable appearance'}:j)});
  const action={type:'vn_correct_image_subject',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:saved().plan.key.sourceFingerprint,requestId:'manual-recovery',jobId:failed.jobId,templateId:'portrait',subject:{kind:'character',name:'Mira',appearance:'black hair, brown eyes',saveAppearance:false}};
  f.request({...action,sourceFingerprint:'stale'},'recovery-user');
  await waitFor(()=>f.sent.some((m:any)=>m.type==='vn_error'&&m.operation==='vn_correct_image_subject'));
  expect(saved().jobs[0]?.status).toBe('failed');expect(f.gates).toHaveLength(paidBefore);
  f.request(action,'recovery-user');
  await waitFor(()=>saved().imageRequests?.at(-1)?.state==='review');
  const review=saved().imageRequests!.at(-1)!;
  expect(review.prompt).toContain('black hair');expect(review.prompt).not.toContain('silver hair');expect(review.prompt).not.toContain('silver dress');
  expect(f.gates).toHaveLength(paidBefore);expect(saved().jobs[1]?.imageId).toBe(keptImage);
  expect((f.data.get('chats/chat/characters.json') as Record<string,string>).Mira).toContain('silver hair');
  f.request({type:'vn_image_review',chatId:'chat',messageId:'assistant-1',sourceFingerprint:action.sourceFingerprint,requestId:review.requestId,action:'skip'},'recovery-user');
  await waitFor(()=>saved().imageRequests?.at(-1)?.state==='skipped');
  await new Promise(r=>setTimeout(r,10));
  f.request(action,'recovery-user');await new Promise(r=>setTimeout(r,10));
  expect(saved().imageRequests?.at(-1)?.requestId).toBe(review.requestId);expect(f.gates).toHaveLength(paidBefore);
  f.request({type:'vn_view',chatId:'chat',open:false},'recovery-user');
 });
 test('environment repair prepares without a character or paid call',async()=>{
  const f=generationFixture();f.data.set('config.json',{generateImages:true,reviewImages:false,referenceAnchoring:false,maxImagesPerTurn:1,includeCharacterContext:false,includePersonaContext:false});
  registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','environment-user',{viewOpen:true});
  const saved=()=>f.data.get(turnPath('chat','assistant-1',0)) as StoredTurnRecord;
  await waitFor(()=>f.gates.length===1);f.gates[0]!.resolve({imageId:'first',imageUrl:'/first'});await waitFor(()=>saved().jobs[0]?.status==='generated');await new Promise(r=>setTimeout(r,10));
  f.request({type:'vn_correct_image_subject',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:saved().plan.key.sourceFingerprint,requestId:'environment-recovery',jobId:saved().jobs[0]!.jobId,subject:{kind:'environment',templateId:'environment'}},'environment-user');
  await waitFor(()=>saved().imageRequests?.at(-1)?.state==='review');
  expect(saved().imageRequests?.at(-1)?.imagePromptMetadata?.brief.subjectMode).toBe('none');expect(f.gates).toHaveLength(1);
  f.request({type:'vn_view',chatId:'chat',open:false},'environment-user');
 });
});


test('role choice persists for the attached card and applies to future planning only',async()=>{
 const f=generationFixture();
 (f.spindle as any).chats={get:async()=>({character_id:'world-card'})};
 f.data.set('config.json',{generateImages:false,includeCharacterContext:false,includePersonaContext:false,includeLorebookContext:false});
 registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','role-user',{viewOpen:true});
 const path=turnPath('chat','assistant-1',0);
 const saved=()=>f.data.get(path) as StoredTurnRecord;
 const action={type:'vn_set_card_role',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:saved().plan.key.sourceFingerprint,requestId:'role-choice',role:'scenario'};
 f.request({...action,swipeId:1},'role-user');await new Promise(r=>setTimeout(r,10));
 expect(f.data.has('chats/chat/card-role.json')).toBe(false);
 f.request(action,'role-user');await waitFor(()=>f.data.has('chats/chat/card-role.json'));
 await new Promise(r=>setTimeout(r,10));expect(saved().speaker).toBe('Mira');
 f.data.delete(path);f.data.delete(chatStatePath('chat'));
 await sendState(f.spindle,'chat','role-user',{viewOpen:true});
 expect(saved().speaker).toBe('Narrator');expect(saved().cardRole).toBe('scenario');expect(f.gates).toHaveLength(0);
 f.request({type:'vn_view',chatId:'chat',open:false},'role-user');
});


test('new generation during appearance save cannot restart or broadcast the old correction',async()=>{
 const f=generationFixture();f.data.set('config.json',{generateImages:true,reviewImages:false,referenceAnchoring:false,maxImagesPerTurn:1,includeCharacterContext:false,includePersonaContext:false});
 registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','race-user',{viewOpen:true});
 const path=turnPath('chat','assistant-1',0);const saved=()=>f.data.get(path) as StoredTurnRecord;
 await waitFor(()=>f.gates.length===1);f.gates[0]!.resolve({imageId:'original',imageUrl:'/original'});await waitFor(()=>saved().jobs[0]?.status==='generated');await new Promise(r=>setTimeout(r,10));
 const original=saved();const hold=deferred<void>();let reached=false;
 const write=f.spindle.userStorage.setJson.bind(f.spindle.userStorage);
 (f.spindle.userStorage as any).setJson=async(path:string,value:unknown,options:any)=>{
   if(path==='chats/chat/characters.json'&&!reached){reached=true;await hold.promise;}
   return write(path,value,options);
 };
 f.request({type:'vn_correct_image_subject',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:original.plan.key.sourceFingerprint,requestId:'save-race',jobId:original.jobs[0]!.jobId,templateId:'portrait',subject:{kind:'character',name:'Mira',appearance:'black hair, brown eyes',saveAppearance:true}},'race-user');
 await waitFor(()=>reached);
 const turnsBefore=f.sent.filter((m:any)=>m.type==='vn_turn').length;
 f.fire('GENERATION_STARTED',{chatId:'chat'},'race-user');hold.resolve();await new Promise(r=>setTimeout(r,25));
 expect(f.sent.filter((m:any)=>m.type==='vn_turn')).toHaveLength(turnsBefore);
 expect(saved().jobs[0]?.imageId).toBe('original');expect(f.gates).toHaveLength(1);
 f.request({type:'vn_view',chatId:'chat',open:false},'race-user');
});

describe('explicit scoped replanning',()=>{
 test('replans once, keeps old art as fallback and holds new prompts even with review off',async()=>{
  const f=generationFixture();registerVisualNovelBackend(f.spindle);
  await sendState(f.spindle,'chat','replan-user',{viewOpen:true});
  const path=turnPath('chat','assistant-1',0);const saved=()=>f.data.get(path) as StoredTurnRecord;
  await waitFor(()=>f.gates.length===1);f.gates[0]!.resolve({imageId:'original',imageUrl:'/original'});
  await waitFor(()=>f.gates.length===2 || saved().jobs.every(j=>j.status==='generated'));
  if(f.gates[1])f.gates[1].resolve({imageId:'second',imageUrl:'/second'});
  await waitFor(()=>saved().jobs.every(j=>j.status==='generated'));await new Promise(r=>setTimeout(r,10));
  const old=saved();const paidBefore=f.gates.length;let plannerCalls=0;
  (f.spindle.generate as any).raw=async()=>{plannerCalls++;const payload=generationPayload([0,1]);payload.scenes[0]!.environment.lighting='bright sunlight';return {content:JSON.stringify(payload)};};
  const action={type:'vn_replan_turn',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:old.plan.key.sourceFingerprint,requestId:'explicit-replan'};
  f.request({...action,swipeId:1},'replan-user');await new Promise(r=>setTimeout(r,10));expect(plannerCalls).toBe(0);
  f.request(action,'replan-user');
  await waitFor(()=>Boolean(saved().imageRequests?.some(r=>r.state==='review')));
  expect(plannerCalls).toBe(1);expect(f.gates).toHaveLength(paidBefore);
  expect(saved().plan.key.revision).toBe(old.plan.key.revision+1);
  expect(turnView(saved()).assets[0]).toMatchObject({imageId:'original',previousImage:true});
  f.request(action,'replan-user');await new Promise(r=>setTimeout(r,10));expect(plannerCalls).toBe(1);
  f.request({type:'vn_view',chatId:'chat',open:false},'replan-user');
  await new Promise(r=>setTimeout(r,15));
  await sendState(f.spindle,'chat','replan-user',{viewOpen:true});
  f.request({type:'vn_retry_turn',chatId:'chat',messageId:'assistant-1'},'replan-user');
  await waitFor(()=>Boolean(saved().imageRequests?.some(r=>r.state==='review')));
  expect(saved().forceImageReview).toBe(true);expect(f.gates).toHaveLength(paidBefore);
  f.request({type:'vn_view',chatId:'chat',open:false},'replan-user');
 });
 test('a generation starting during replanning leaves the existing record and cannot publish old work',async()=>{
  const f=generationFixture();f.data.set('config.json',{generateImages:false,includeCharacterContext:false,includePersonaContext:false});
  registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','replan-race',{viewOpen:true});
  const path=turnPath('chat','assistant-1',0);const old=f.data.get(path) as StoredTurnRecord;
  const hold=deferred<{content:string}>();let reached=false;
  (f.spindle.generate as any).raw=async()=>{reached=true;return hold.promise;};
  f.request({type:'vn_replan_turn',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:old.plan.key.sourceFingerprint,requestId:'replan-race'},'replan-race');
  await waitFor(()=>reached);const before=f.sent.filter((m:any)=>m.type==='vn_turn').length;
  f.fire('GENERATION_STARTED',{chatId:'chat'},'replan-race');hold.resolve({content:JSON.stringify(generationPayload([0,1]))});
  await new Promise(r=>setTimeout(r,35));
  expect((f.data.get(path) as StoredTurnRecord).plan.key.revision).toBe(old.plan.key.revision);
  expect(f.sent.filter((m:any)=>m.type==='vn_turn')).toHaveLength(before);expect(f.gates).toHaveLength(0);
  f.request({type:'vn_view',chatId:'chat',open:false},'replan-race');
 });
});


test('replan claims a reopened stored reply and preserves verified exact cached pictures',async()=>{
 const f=generationFixture();
 f.data.set('config.json',{generateImages:true,reviewImages:false,referenceAnchoring:false,maxImagesPerTurn:1,includeCharacterContext:false,includePersonaContext:false,imageConnectionId:'images'});
 (f.spindle.imageGen as any).getConnection=async()=>({id:'images',provider:'nanogpt',model:'test-model',updated_at:1});
 (f.spindle as any).images={get:async(id:string)=>({id})};
 registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','replan-cache',{viewOpen:true});
 const path=turnPath('chat','assistant-1',0);const saved=()=>f.data.get(path) as StoredTurnRecord;
 await waitFor(()=>f.gates.length===1);f.gates[0]!.resolve({imageId:'cached-original',imageUrl:'/cached-original'});
 await waitFor(()=>saved().jobs.every(j=>j.status==='generated'));await new Promise(r=>setTimeout(r,15));
 const old=saved();
 f.request({type:'vn_view',chatId:'chat',open:false},'replan-cache');await new Promise(r=>setTimeout(r,15));
 await sendState(f.spindle,'chat','replan-cache',{viewOpen:true});
 f.request({type:'vn_replan_turn',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:old.plan.key.sourceFingerprint,requestId:'replan-cache'},'replan-cache');
 await waitFor(()=>saved().plan.key.revision===old.plan.key.revision+1);
 await new Promise(r=>setTimeout(r,15));
 expect(saved().jobs[0]).toMatchObject({status:'generated',provider:'cache',imageId:'cached-original'});
 expect(f.gates).toHaveLength(1);expect(saved().imageRequests?.some(r=>r.state==='review')??false).toBe(false);
 f.request({type:'vn_view',chatId:'chat',open:false},'replan-cache');
});


test('an edit without a host event invalidates a replan before persistence',async()=>{
 const f=generationFixture();f.data.set('config.json',{generateImages:false,includeCharacterContext:false,includePersonaContext:false});
 registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','replan-edit',{viewOpen:true});
 const path=turnPath('chat','assistant-1',0);const old=f.data.get(path) as StoredTurnRecord;
 const hold=deferred<{content:string}>();let reached=false;
 (f.spindle.generate as any).raw=async()=>{reached=true;return hold.promise;};
 f.request({type:'vn_replan_turn',version:1,chatId:'chat',messageId:'assistant-1',swipeId:0,sourceFingerprint:old.plan.key.sourceFingerprint,requestId:'replan-edit'},'replan-edit');
 await waitFor(()=>reached);
 const getMessages=f.spindle.chat.getMessages.bind(f.spindle.chat);
 (f.spindle.chat as any).getMessages=async()=> (await getMessages('chat')).map(m=>({...m,content:'Changed reply after planning began.'}));
 hold.resolve({content:JSON.stringify(generationPayload([0,1]))});
 await waitFor(()=>f.sent.some((m:any)=>m.type==='vn_error'&&m.operation==='vn_replan_turn'));
 expect((f.data.get(path) as StoredTurnRecord).plan.key.revision).toBe(old.plan.key.revision);expect(f.gates).toHaveLength(0);
 f.request({type:'vn_view',chatId:'chat',open:false},'replan-edit');
});

test('local replacement edits become a held preview and oversize edits leave completed art intact',async()=>{
 const f=generationFixture();f.data.set('config.json',{generateImages:true,reviewImages:false,referenceAnchoring:false,maxImagesPerTurn:1,includeCharacterContext:false,includePersonaContext:false});
 registerVisualNovelBackend(f.spindle);await sendState(f.spindle,'chat','editable-user',{viewOpen:true});
 const path=turnPath('chat','assistant-1',0);const saved=()=>f.data.get(path) as StoredTurnRecord;
 await waitFor(()=>f.gates.length===1);f.gates[0]!.resolve({imageId:'original',imageUrl:'/original'});await waitFor(()=>saved().jobs[0]?.status==='generated');await new Promise(r=>setTimeout(r,10));
 const action={type:'vn_prepare_image',chatId:'chat',messageId:'assistant-1',sourceFingerprint:saved().plan.key.sourceFingerprint,jobId:saved().jobs[0]!.jobId,edits:{prompt:'A silver-haired character opens a sealed letter.',negativePrompt:'blurry, watermark',parameters:{seed:42}}};
 f.request({...action,edits:{...action.edits,prompt:'x'.repeat(3001)}},'editable-user');
 await waitFor(()=>f.sent.some((m:any)=>m.type==='vn_error'&&m.operation==='vn_prepare_image'));
 expect(saved().jobs[0]?.imageId).toBe('original');expect(f.gates).toHaveLength(1);
 f.request(action,'editable-user');await waitFor(()=>saved().imageRequests?.at(-1)?.state==='review');
 expect(saved().imageRequests?.at(-1)?.prompt).toBe(action.edits.prompt);expect(saved().imageRequests?.at(-1)?.negativePrompt).toBe('blurry, watermark');expect(saved().imageRequests?.at(-1)?.parameters.seed).toBe(42);expect(f.gates).toHaveLength(1);
 f.request({type:'vn_view',chatId:'chat',open:false},'editable-user');
});

test('turn views expose bounded immutable presentation and keep old/future records compatible',()=>{
 const record:StoredTurnRecord={schemaVersion:1,speaker:'Narrator',status:'ready',plan:structuredClone(plan),jobs:[],updatedAt:now};
 const view=turnView(record);
 expect(view.presentation?.version).toBe(1);
 expect(view.presentation?.snapshots[0]?.entities.some(e=>e.kind==='place'&&e.name==='Library')).toBe(true);
 expect(view.presentation?.snapshots[0]?.presentEntityIds).toHaveLength(1);
 record.presentation={version:99,opaque:'preserve'};
 expect(turnView(record).presentation).toBeUndefined();
 expect(record.presentation).toEqual({version:99,opaque:'preserve'});
});


test('stage asset roles derive from explicit templates and legacy jobs remain scenes',()=>{
 const record:StoredTurnRecord={schemaVersion:1,speaker:'Mira',status:'ready',plan,jobs:[generatedJob()],updatedAt:now};
 expect(turnView(record).assets[0]?.stageAsset).toEqual({role:'scene',sceneId:'scene',sceneRevision:0});
 for(const [id,role] of [['portrait','portrait'],['environment','background'],['manga-page','scene']] as const){
  const config=normalizeConfig({});const template=templateSnapshot(config.imageTemplates.find(t=>t.id===id)!);
  const updated={...record,plan:{...plan,visualCues:[{...plan.visualCues[0]!,character:'Mira',resolvedAttire:'raincoat',imageTemplate:template}]}};
  expect(turnView(updated).assets[0]?.stageAsset).toMatchObject({role,sceneId:'scene'});
  if(role==='portrait')expect(turnView(updated).assets[0]?.stageAsset?.character).toBe('Mira');
 }
});
