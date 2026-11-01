import { describe, expect, test } from "bun:test";
import { restorePreviousImage, turnView } from "./controller.js";
import { enrichImagePrompt } from "./prompt-rewrite.js";
import { TurnPlanSchema, type AssetJob } from "../../shared/contracts.js";
import type { StoredChatState, StoredTurnRecord } from "./storage.js";
import { turnPath, chatStatePath } from "./storage.js";
import { DEFAULT_CONFIG } from "../../config.js";

const now = new Date().toISOString();
const key = {
  chatId: "chat",
  assistantMessageId: "msg-1",
  swipeId: 0,
  sourceFingerprint: "fp123456",
  revision: 0
};

const plan = TurnPlanSchema.parse({
  schemaVersion: 1,
  key,
  paragraphs: [{ index: 0, sourceIndex: 0, text: "The rain fell quietly over the old farmhouse porch." }],
  scenes: [{
    sceneId: "scene-1",
    revision: 0,
    startParagraph: 0,
    environment: {
      location: "Porch",
      timeOfDay: "night",
      weather: null,
      lighting: "dim lamplight",
      description: "Rainy wooden porch.",
      persistentElements: []
    },
    cast: ["Nadine"],
    continuity: { revision: 0, characters: {}, facts: {} },
    basePrompt: "dim rainy farmhouse porch at night",
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
    compositionLock: "Nadine centered",
    activeAssetId: null,
    priorSceneId: null
  }],
  visualCues: [{
    cueId: "cue-1",
    paragraphIndex: 0,
    sceneId: "scene-1",
    sceneRevision: 0,
    kind: "flattened_scene",
    action: null,
    expression: null,
    promptDelta: "Nadine looks toward the door",
    assetJobId: "job-1"
  }],
  choices: [],
  initialContinuity: { revision: 0, characters: {}, facts: {} },
  continuityDeltas: [],
  terminalContinuity: { revision: 0, characters: {}, facts: {} },
  planningStatus: "planned",
  createdAt: now
});

function job(jobId: string, imageId: string, imageUrl: string): AssetJob {
  return {
    jobId,
    ownerTurnKey: key,
    sceneId: "scene-1",
    sceneRevision: 0,
    paragraphIndex: 0,
    promptFingerprint: "fp123456",
    provider: "image:default",
    priority: "visible",
    status: "generated",
    imageId,
    imageUrl,
    error: null,
    queuedAt: now,
    startedAt: now,
    generatedAt: now,
    readyAt: null,
    finishedAt: null
  };
}

describe("Previous Image Versions Restoration & Guided Prompt Enricher", () => {
  test("turnView exposes previousVersions when present on stored record", () => {
    const record: StoredTurnRecord = {
      schemaVersion: 1,
      speaker: "Nadine",
      status: "ready",
      plan,
      jobs: [job("job-1", "img-v2", "/api/v1/images/img-v2")],
      previousVersions: {
        "job-1": [
          {
            versionId: "v_1",
            imageId: "img-v1",
            imageUrl: "/api/v1/images/img-v1",
            timestamp: now
          }
        ]
      },
      updatedAt: now
    };

    const view = turnView(record);
    expect(view.assets[0]?.previousVersions).toBeDefined();
    expect(view.assets[0]?.previousVersions).toHaveLength(1);
    expect(view.assets[0]?.previousVersions![0]?.imageId).toBe("img-v1");
  });

  test("restorePreviousImage swaps imageId and preserves current version into history", async () => {
    const data = new Map<string, unknown>();
    const sent: any[] = [];
    const tPath = turnPath("chat", "msg-1", 0);
    const cPath = chatStatePath("chat");

    const initialRecord: StoredTurnRecord = {
      schemaVersion: 1,
      speaker: "Nadine",
      status: "ready",
      plan,
      jobs: [job("job-1", "img-v2", "/api/v1/images/img-v2")],
      previousVersions: {
        "job-1": [
          {
            versionId: "v_1",
            imageId: "img-v1",
            imageUrl: "/api/v1/images/img-v1",
            timestamp: now
          }
        ]
      },
      updatedAt: now
    };

    data.set(tPath, initialRecord);
    data.set(cPath, {
      schemaVersion: 1,
      activeTurnPath: tPath,
      latestScene: null,
      terminalContinuity: null,
      updatedAt: now
    } satisfies StoredChatState);

    const spindle: any = {
      userStorage: {
        getJson: async (path: string) => data.get(path) ?? null,
        setJson: async (path: string, val: unknown) => { data.set(path, val); }
      },
      sendToFrontend: (msg: any) => sent.push(msg),
      log: { warn: () => {}, error: () => {} }
    };

    await restorePreviousImage(spindle, {
      type: "vn_restore_previous_image",
      chatId: "chat",
      messageId: "msg-1",
      sourceFingerprint: "fp123456",
      jobId: "job-1",
      imageId: "img-v1",
      imageUrl: "/api/v1/images/img-v1"
    });

    const updated = data.get(tPath) as StoredTurnRecord;
    expect(updated.jobs[0]?.imageId).toBe("img-v1");
    expect(updated.jobs[0]?.imageUrl).toBe("/api/v1/images/img-v1");
    // img-v2 should now be recorded in history
    expect(updated.previousVersions?.["job-1"]?.some(v => v.imageId === "img-v2")).toBe(true);

    // Frontend notification sent
    expect(sent.some(m => m.type === "vn_asset" && m.asset?.imageId === "img-v1")).toBe(true);
    expect(sent.some(m => m.type === "vn_turn")).toBe(true);
  });

  test("enrichImagePrompt elevates prompt with user guidance and rich photographic details", async () => {
    let calledPrompt = "";
    const spindle: any = {
      generate: {
        raw: async (req: any) => {
          calledPrompt = JSON.stringify(req.messages);
          return {
            content: JSON.stringify({
              prompt: "Nadine Pruitt with longer flowing chestnut hair, wearing a paint-spattered linen apron over a vintage floral midi dress, warm cinematic rim lighting, 35mm lens, atmospheric dusk mist, photorealistic textures",
              negativePrompt: "blurry, deformed, oversaturated, bad anatomy, extra limbs"
            })
          };
        }
      },
      connections: {
        get: async () => ({ id: "conn-1", provider: "openai", model: "gpt-4o" }),
        list: async () => [{ id: "conn-1", provider: "openai", model: "gpt-4o" }]
      }
    };

    const cfg = {
      ...DEFAULT_CONFIG,
      plannerConnectionId: "conn-1",
      plannerModel: "gpt-4o"
    };

    const initialRequest: any = {
      prompt: "Nadine in apron standing on porch",
      negativePrompt: "blur",
      promptProfile: {
        maxCharacters: 3000,
        format: "prose",
        guidance: "Use natural cinematic language.",
        negativeMode: "standard"
      }
    };

    const enriched = await enrichImagePrompt(
      spindle,
      initialRequest,
      undefined,
      cfg,
      "user-1",
      new AbortController().signal,
      "make her hair longer, cinematic rim lighting"
    );

    expect(enriched.prompt).toContain("longer flowing chestnut hair");
    expect(enriched.prompt).toContain("cinematic rim lighting");
    expect(calledPrompt).toContain("make her hair longer, cinematic rim lighting");
  });
});
