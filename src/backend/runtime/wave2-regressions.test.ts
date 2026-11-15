import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../../config.js";
import { SceneImageCache, backdropDigestOf, type SceneImageIdentity } from "../core/scene-image-cache.js";
import { findBackdropArt, saveBackdropArt } from "./scene-art-index.js";
import { prepareAssetJobs } from "./images.js";
import { deriveColorScriptKeyframe } from "./visual-brief.js";
import { harvestTurnStoryDNA } from "./story-dna-harvester.js";
import type { TurnPlan } from "../../shared/contracts.js";

function memoryStorage() {
  const store = new Map<string, unknown>();
  const images = new Set<string>();
  const spindle: any = {
    userStorage: {
      getJson: async (key: string, opts?: { fallback?: unknown }) => store.has(key) ? store.get(key) : (opts?.fallback ?? null),
      setJson: async (key: string, value: unknown) => { store.set(key, structuredClone(value)); }
    },
    images: {
      get: async (id: string) => images.has(id) ? { id } : null
    },
    connections: { list: async () => [], get: async () => null },
    log: { info: () => {}, warn: () => {} }
  };
  return { spindle, store, images };
}

describe("Wave 2 Regressions (P3 Backdrop/Trigger + Seat 1 ColorScript + P9 Codex)", () => {
  test("P3 backdropDigestOf stays stable across pose/character swaps while beatDigest differs", () => {
    const base: SceneImageIdentity = {
      subject: { characterId: "char-1", subjectCategory: "female" },
      appearance: { identity: "silver hair", attire: "cloak" },
      environment: { location: "Obsidian Library", timeWeather: "night", lighting: "candlelight", description: "tall bookshelves", persistentElements: ["oak table"] },
      pose: { id: "idle", suffix: "" },
      action: null,
      framing: { framing: "medium shot", angle: "eye level", perspective: "straight-on" },
      request: { prompt: "p1", negativePrompt: "", provider: "openai", connectionId: null, model: "gpt-image-1", parameters: {}, promptSyntax: "description", referenceAnchoring: false }
    };
    const otherBeat: SceneImageIdentity = {
      ...base,
      subject: { characterId: "char-2", subjectCategory: "male" },
      pose: { id: "smile", suffix: "smiling" },
      request: { ...base.request, prompt: "p2" }
    };
    expect(backdropDigestOf(base)).toBe(backdropDigestOf(otherBeat));
  });

  test("P3 SceneArtIndex + imageGenerationTrigger='scene-change' collapses beat cues and reuses persisted room art", async () => {
    const { spindle, images } = memoryStorage();
    images.add("img-library-1");
    const plan: TurnPlan = {
      key: { chatId: "chat-p3", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fp12345678", revision: 1 },
      paragraphs: [
        { index: 0, text: "Entering the library.", kind: "narration", speaker: "Narrator" },
        { index: 1, text: "Walking past the reading tables.", kind: "narration", speaker: "Narrator" }
      ],
      scenes: [{
        sceneId: "scene-lib",
        revision: 1,
        startParagraph: 0,
        environment: { location: "Obsidian Library", timeOfDay: "night", weather: null, lighting: "candlelight", description: "Tall shelves.", persistentElements: ["oak desk"], removedElements: [] },
        cast: ["Mira"],
        character: "Mira",
        attire: "library robes",
        ambient: null,
        ambientSource: "explicit",
        continuity: { characters: [] },
        basePrompt: "obsidian library",
        identityPrompt: "silver hair",
        cameraLock: "eye level",
        compositionLock: "centered",
        activeAssetId: null,
        priorSceneId: null
      }],
      visualCues: [
        { paragraphIndex: 0, sceneId: "scene-lib", sceneRevision: 1, assetJobId: "job-0", visualDescription: "Standing by oak desk", expression: "idle", action: null, character: "Mira", characterId: "char-mira", subjectCategory: "female", poseExpressionId: "idle", resolvedIdentity: "silver hair", resolvedAttire: "library robes", promptDelta: "p0" },
        { paragraphIndex: 1, sceneId: "scene-lib", sceneRevision: 1, assetJobId: "job-1", visualDescription: "Reading by candle", expression: "think", action: null, character: "Mira", characterId: "char-mira", subjectCategory: "female", poseExpressionId: "think", resolvedIdentity: "silver hair", resolvedAttire: "library robes", promptDelta: "p1" }
      ],
      audioCues: [],
      effectCues: [],
      choices: [],
      characters: [],
      speakers: [],
      initialContinuity: { characters: [] },
      terminalContinuity: { characters: [] }
    };
    const cfg = { ...DEFAULT_CONFIG, imageGenerationTrigger: "scene-change" as const, maxImagesPerTurn: 4 };
    const jobsFirst = await prepareAssetJobs(spindle, plan, cfg, undefined, new SceneImageCache(), "u1");
    expect(jobsFirst).toHaveLength(1);
    expect(jobsFirst[0]!.jobId).toBe("job-0");
    expect(plan.visualCues.map(c => c.paragraphIndex)).toEqual([0]);
    expect(plan.cacheCues?.map(c => c.paragraphIndex)).toEqual([1]);

    // Simulate indexing after completion, then revisiting room on a new turn with fresh cache:
    await saveBackdropArt(spindle, "chat-p3", {
      backdropDigest: backdropDigestOf({
        environment: { location: "Obsidian Library", timeWeather: "night", lighting: "candlelight", description: "Tall shelves.", persistentElements: ["oak desk"] },
        request: { provider: null, model: cfg.imageModel, promptSyntax: cfg.imagePromptFormat },
        styleDnaDigest: "",
        outputPlanDigest: ""
      }),
      location: "Obsidian Library",
      imageId: "img-library-1"
    }, "u1");
    const found = await findBackdropArt(spindle, "chat-p3", backdropDigestOf({
      environment: { location: "Obsidian Library", timeWeather: "night", lighting: "candlelight", description: "Tall shelves.", persistentElements: ["oak desk"] },
      request: { provider: null, model: cfg.imageModel, promptSyntax: cfg.imagePromptFormat },
      styleDnaDigest: "",
      outputPlanDigest: ""
    }), "u1");
    expect(found?.imageId).toBe("img-library-1");
  });

  test("Seat 1 deriveColorScriptKeyframe blocks outdoor sunbeams indoors without windows and strips negated glow", () => {
    const inside = deriveColorScriptKeyframe({
      baseLighting: "no visible aura, dim candlelight",
      location: "Basement Cellar",
      timeOfDay: "sunset",
      description: "Windowless stone room",
      narrativeContext: "golden hour outside",
      chromaticLutEnabled: true
    });
    expect(inside.enclosure).toBe("interior");
    expect(inside.lighting).not.toContain("no visible aura");
    expect(inside.lighting).not.toContain("golden-hour");

    const rawOnly = deriveColorScriptKeyframe({
      baseLighting: "cool fluorescent tube",
      location: "Server Room",
      chromaticLutEnabled: false
    });
    expect(rawOnly.lighting).toBe("cool fluorescent tube");
  });

  test("P9 #36 harvestTurnStoryDNA records structured { who, where, whatChanged } on chapterCodex", () => {
    const set: any = { locations: {}, items: {}, revision: 0 };
    const plan: any = {
      key: { chatId: "c1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "f1" },
      scenes: [{
        sceneId: "s1",
        revision: 1,
        startParagraph: 0,
        character: "Mira",
        attire: "winter coat",
        cast: ["Mira", "Kael"],
        environment: {
          location: "North Pier",
          timeOfDay: "dusk",
          weather: "rain",
          lighting: "lantern light",
          description: "Wet timber planks under rain.",
          persistentElements: []
        }
      }],
      visualCues: [],
      storyReferences: []
    };
    const changed = harvestTurnStoryDNA(plan, set, "m1:0", "Old Tavern", { chapterCodexEnabled: true });
    expect(changed).toBe(true);
    expect(set.chapterCodex).toHaveLength(1);
    expect(set.chapterCodex[0].where).toBe("North Pier");
    expect(set.chapterCodex[0].who).toEqual(["Mira", "Kael"]);
    expect(set.chapterCodex[0].whatChanged).toContain("Moved from Old Tavern to North Pier");
    expect(set.chapterCodex[0].whatChanged).toContain("Attire: winter coat");
  });
});
