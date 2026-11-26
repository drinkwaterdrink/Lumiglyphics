import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, normalizeConfig } from "../../config.js";
import { TurnPlanSchema, type SceneState, type TurnPlan, type VisualCue } from "../../shared/contracts.js";
import { resolveImagePromptProfileV2 } from "../../shared/image-prompt-profile-v2.js";
import { templateSnapshot, type VisualBrief } from "../../shared/image-templates.js";
import { createReferencePlan } from "../../shared/reference-plan.js";
import { resolveStyleDNA } from "../../shared/style-dna.js";
import { resolveImageOutputPlan } from "./image-output-plan.js";
import { resolveShotSpec } from "./shot-director.js";
import { compileModelPrompt, resolveSubjectPromptMode } from "./model-prompt-compiler.js";
import { resolveReferencePlanBudgeted } from "./reference-plan.js";
import { formatReferenceDirectives } from "./prompt-serializers/helpers.js";
import {
  castArtIdentityFor,
  computeDeterministicV2Plan,
  generateAssets,
  createAssetJobs,
  sceneImageIdentityFor,
} from "./images.js";
import { ImageRetryQueue } from "./image-retry-queue.js";
import { findLocationArt, loadLocationArt, saveLocationArt } from "./location-art.js";
import { loadCastArt, saveCastArt } from "./cast-art.js";
import { CastStage } from "../../frontend/stage/cast-stage.js";
import { panelDocument } from "../../frontend/stage/panel-document.js";
import { generateCueEffectMarkup } from "../../frontend/stage/procedural-particles.js";
import { VN_EFFECTS_CSS } from "../../frontend/theme/effects-css.js";
import { FakeNode, installFakeDocument } from "../../frontend/stage/stage-test-dom.js";

const now = new Date().toISOString();

function makeScene(overrides: Partial<SceneState> = {}): SceneState {
  return {
    sceneId: "scene-1",
    revision: 0,
    startParagraph: 0,
    environment: {
      location: "Lantern Gate",
      timeOfDay: "dusk",
      weather: "clear",
      lighting: "warm lantern light",
      description: "Cobblestone courtyard outside the old lantern gate",
      persistentElements: [],
    },
    cast: ["Ren"],
    continuity: {
      revision: 0,
      characters: {},
      facts: {},
    },
    basePrompt: "Cobblestone courtyard outside the old lantern gate",
    identityPrompt: "messy black hair, amber eyes, charcoal coat",
    cameraLock: {
      framing: "medium shot",
      angle: "eye-level view",
      perspective: "fixed",
      lens: "35mm",
      subjectAnchor: "center",
      horizon: "middle",
      safeDialogueRegion: "lower third",
      aspectRatio: "16:9",
    },
    compositionLock: "one visible character",
    activeAssetId: null,
    priorSceneId: null,
    ...overrides,
  };
}

function makeVisualCue(overrides: Partial<VisualCue> = {}): VisualCue {
  const config = normalizeConfig({});
  return {
    cueId: "cue-1",
    paragraphIndex: 0,
    sceneId: "scene-1",
    sceneRevision: 0,
    kind: "sprite",
    action: "standing beside the lantern gate",
    expression: "calm gaze",
    promptDelta: "",
    character: "Ren",
    attire: "charcoal coat",
    assetJobId: "job-1",
    imageTemplate: templateSnapshot(config.imageTemplates[0]!),
    ...overrides,
  };
}

function makeTurnPlan(visualCues: VisualCue[], sceneOverrides: Partial<SceneState> = {}): TurnPlan {
  const scene = makeScene(sceneOverrides);
  return TurnPlanSchema.parse({
    schemaVersion: 1,
    key: {
      chatId: "chat-w3",
      assistantMessageId: "msg-1",
      swipeId: 0,
      sourceFingerprint: "fp-wave3-0001",
      revision: 0,
    },
    paragraphs: visualCues.map((_, idx) => ({
      index: idx,
      sourceIndex: idx,
      text: `Beat ${idx + 1}`,
    })),
    scenes: [scene],
    visualCues,
    choices: [],
    initialContinuity: { revision: 0, characters: {}, facts: {} },
    continuityDeltas: [],
    terminalContinuity: { revision: 0, characters: {}, facts: {} },
    planningStatus: "planned",
    createdAt: now,
  });
}

describe("Council Wave 3 verification", () => {
  test("delta-only 4-condition gate compresses standard ref routes and bypasses NovelAI/Anima, high denoise, and silhouettes", () => {
    const styleDNA = resolveStyleDNA(DEFAULT_CONFIG).styleDNA;
    const outputPlan = resolveImageOutputPlan({ requestedRatio: "2:3", modelId: "flux-2-klein-4b" });
    expect(outputPlan.orientation).toBe("portrait");

    const brief: VisualBrief = {
      scene: "Lantern courtyard at dusk",
      subjects: "Ren: messy black hair, amber eyes, sharp jawline, mole under left eye; wearing charcoal coat",
      action: "leaning against the stone archway",
      composition: "medium shot",
      lighting: "warm amber lantern light",
      subjectMode: "one",
      framing: "portrait",
      referencePolicy: "character",
      sources: [],
      conflicts: [],
      subjectPreparation: {
        name: "Ren",
        identity: "messy black hair, amber eyes, sharp jawline, mole under left eye",
        identitySource: "saved appearance",
        attire: "charcoal coat",
        attireSource: "picture cue",
        direction: "leaning against the stone archway",
        shortened: false,
        subjectsInPositive: true,
        subjectsInNegative: false,
      },
    };
    const shotSpec = resolveShotSpec({ brief, outputPlan });
    const refPlan = createReferencePlan([
      {
        imageId: "ref-ren",
        role: "identity",
        label: "Ren character portrait",
        dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        subject: "Ren",
        wireIndex: 1,
        byteSize: 128,
      },
    ]);

    const fluxProfile = resolveImagePromptProfileV2("nanogpt", "flux-2-klein-4b");
    expect(resolveSubjectPromptMode({ profile: fluxProfile, referencePlan: refPlan, brief })).toBe("delta-only");
    const fluxCompiled = compileModelPrompt({ brief, shotSpec, styleDNA, profile: fluxProfile, outputPlan, referencePlan: refPlan });
    expect(fluxCompiled.prompt).toContain("matching Reference Image 1");
    expect(fluxCompiled.prompt).toContain("Use reference image 1");
    expect(fluxCompiled.prompt).not.toContain("mole under left eye");

    // 1) NovelAI / Anima bypass
    const naiProfile = resolveImagePromptProfileV2("novelai", "nai-diffusion-4-full");
    expect(resolveSubjectPromptMode({ profile: naiProfile, referencePlan: refPlan, brief })).toBe("full-prose");

    // 2) denoise >= 0.5 bypass
    expect(resolveSubjectPromptMode({ profile: fluxProfile, referencePlan: refPlan, brief, denoiseStrength: 0.5 })).toBe("full-prose");

    // 3) Back-view / silhouette bypass
    const silhouetteBrief: VisualBrief = { ...brief, action: "standing in silhouette facing away from the camera" };
    expect(resolveSubjectPromptMode({ profile: fluxProfile, referencePlan: refPlan, brief: silhouetteBrief })).toBe("full-prose");
    const compiledSilhouette = compileModelPrompt({ brief: silhouetteBrief, shotSpec, styleDNA, profile: fluxProfile, outputPlan, referencePlan: refPlan });
    expect(compiledSilhouette.prompt).toContain("amber eyes");
  });

  test("reference budget enforces <= 3 attached refs and formatReferenceDirectives stays aligned with wireIndex", async () => {
    const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const big = "data:image/jpeg;base64," + "A".repeat(700_000);
    const plan = await resolveReferencePlanBudgeted({
      referenceImages: [
        { data: tinyPng, role: "identity", subject: "Ren", label: "Ren" },
        { data: big, role: "identity", subject: "Sora", label: "Sora" },
        { data: tinyPng, role: "identity", subject: "Mina", label: "Mina" },
        { data: tinyPng, role: "style", label: "Style" },
      ],
      maxRefs: 6,
      compressDataUrl: async (url) => (url.length > 500_000 ? "data:image/webp;base64,BBBB" : url),
    });

    const wired = plan.references.filter((r) => typeof r.wireIndex === "number");
    expect(wired.length).toBeLessThanOrEqual(3);
    expect(wired.map((r) => r.wireIndex)).toEqual([1, 2, 3]);
    const dirs = formatReferenceDirectives(plan).join(" ");
    expect(dirs).toContain("Use reference image 1");
    expect(dirs).toContain("Use reference image 2");
    expect(dirs).toContain("Use reference image 3");
    expect(dirs).not.toContain("Use reference image 4");
  });

  test("V2 sceneImageIdentityFor matches deterministic plan, castArtIdentityFor reuses across scenes, and previousSceneShot threads across beats", async () => {
    const config = normalizeConfig({
      imagePromptEngineVersion: 2,
      referenceAnchoring: false,
      imageProvider: "nanogpt",
      imageModel: "flux-2-klein-4b",
      selectedSharedStyleId: "",
      reviewImages: false,
    });
    const beat1 = makeVisualCue({ cueId: "c1", assetJobId: "j1", paragraphIndex: 0, character: "Ren", kind: "flattened_scene" });
    const beat2 = makeVisualCue({ cueId: "c2", assetJobId: "j2", paragraphIndex: 1, character: "Ren", attire: "wet trenchcoat", kind: "flattened_scene", visualDescription: "Ren steps inside the gatehouse during a sudden downpour", action: "steps inside the gatehouse" });
    const turn = makeTurnPlan([beat1, beat2]);

    const id1a = sceneImageIdentityFor(config, turn.scenes[0]!, beat1, {}, "nanogpt");
    const id1b = sceneImageIdentityFor(config, turn.scenes[0]!, beat1, {}, "nanogpt", { source: "none" });
    const diffContScene = makeScene({ continuity: { revision: 1, characters: {}, facts: { lanternLit: "yes" } } });
    const id1Diff = sceneImageIdentityFor(config, diffContScene, beat1, {}, "nanogpt", { source: "none" }, undefined, undefined, undefined, undefined, { relightRevision: 1 });
    expect(id1a).toEqual(id1b);
    expect(id1a.continuityDigest).not.toBe(id1Diff.continuityDigest);
    expect(id1Diff.relightRevision).toBe(1);

    const v2Plan = computeDeterministicV2Plan({ config, scene: turn.scenes[0]!, cue: beat1, provider: "nanogpt" });
    expect(id1a.shotSpecDigest).toBe(v2Plan.shotSpecDigest);
    expect(id1a.styleDnaDigest).toBe(v2Plan.styleDnaDigest);
    expect(id1a.imageTemplate).toEqual(beat1.imageTemplate);
    expect(id1a.outputPlanDigest).toBe(v2Plan.outputPlanDigest);

    const portraitConfig = normalizeConfig({ ...config, persistentCastArt: true });
    const portraitCue = makeVisualCue({
      ...beat1,
      imageTemplate: templateSnapshot({ ...portraitConfig.imageTemplates[0]!, category: "portrait", subjectMode: "one" }),
    });
    const sceneA = makeScene({ environment: { ...makeScene().environment, location: "Courtyard", weather: "clear" } });
    const sceneB = makeScene({ sceneId: "scene-2", environment: { ...makeScene().environment, location: "Subway Platform", weather: "storm" } });
    const castA = castArtIdentityFor(portraitConfig, sceneA, portraitCue, undefined, "nanogpt", "rev1");
    const castB = castArtIdentityFor(portraitConfig, sceneB, { ...portraitCue, action: "running toward the stairs" }, undefined, "nanogpt", "rev1");
    expect(castA).not.toBeNull();
    expect(castB).not.toBeNull();
    expect(castA!.requestFingerprint).toBe(castB!.requestFingerprint);
    expect(castA!.appearanceFingerprint).toBe(castB!.appearanceFingerprint);

    // Cross-beat previousSceneShot threading inside generateAssets
    const sent: Array<{ jobId: string; shotSize: string | undefined }> = [];
    const spindle: any = {
      userStorage: { getJson: async (_p: string, o: any) => structuredClone(o?.fallback), setJson: async () => {} },
      imageGen: { generate: async () => ({ imageId: `img-${sent.length + 1}` }) },
    };
    await generateAssets(spindle, turn, createAssetJobs(turn, config), config, new AbortController().signal, () => {}, "u1", {
      beforeGenerate: async (job, request) => {
        sent.push({ jobId: job.jobId, shotSize: request.shotSpec?.camera.shotSize });
        return request;
      },
    });
    expect(sent.map(entry => entry.jobId)).toEqual([beat1.assetJobId, beat2.assetJobId]);
    expect(sent.every(entry => Boolean(entry.shotSize))).toBe(true);
  });

  test("ImageRetryQueue enforces viewport priority ordering, empty enqueue no-op, and clearPending cleanup", async () => {
    const ran: string[] = [];
    let blocked = true;
    const queue = new ImageRetryQueue(
      async (jobId) => {
        ran.push(jobId);
      },
      () => blocked,
      () => {},
      () => {}
    );

    // Empty enqueue must not count against 128 request limit or enter snapshot
    for (let i = 0; i < 150; i++) {
      queue.enqueue(`empty-${i}`, []);
      expect(queue.hasRequest(`empty-${i}`)).toBe(false);
    }

    queue.enqueue("req-1", ["bg", "near", "view"], ["view", "near", "bg"]);
    expect(queue.snapshot().jobIds).toEqual(["view", "near", "bg"]);
    blocked = false;
    queue.wake();
    await new Promise((r) => setTimeout(r, 20));
    expect(ran).toEqual(["view", "near", "bg"]);

    blocked = true;
    queue.enqueue("req-2", ["later"]);
    queue.clearPending();
    expect(queue.hasRequest("req-2")).toBe(false);
    blocked = false;
    queue.wake();
    await new Promise((r) => setTimeout(r, 20));
    expect(ran).toEqual(["view", "near", "bg"]);
  });

  test("cast-art and location-art evict oldest unpinned LRU variants past 8 and throw only when all 8 are pinned", async () => {
    const store = new Map<string, unknown>();
    const spindle: any = {
      userStorage: {
        getJson: async (p: string, o: any) => structuredClone(store.get(p) ?? o?.fallback),
        setJson: async (p: string, v: unknown) => {
          store.set(p, structuredClone(v));
        },
      },
      images: { get: async (id: string) => ({ id }) },
    };

    const baseCast = { character: "Ren", description: "coat", requestFingerprint: "rf", appearanceFingerprint: "af" };
    for (let i = 1; i <= 9; i++) {
      await saveCastArt(spindle, "chat-lru", { ...baseCast, imageId: `img-${i}` }, "u1");
      await new Promise((r) => setTimeout(r, 2));
    }
    const castLib = await loadCastArt(spindle, "chat-lru", "u1");
    expect(castLib.characters[0]!.variants.length).toBe(8);
    expect(castLib.characters[0]!.variants.some((v) => v.imageId === "img-1")).toBe(false);

    for (const v of castLib.characters[0]!.variants) v.pinned = true;
    store.set("chats/chat-lru/cast-art.json", castLib);
    await expect(saveCastArt(spindle, "chat-lru", { ...baseCast, imageId: "img-10" }, "u1")).rejects.toThrow(/8/);

    const baseLoc = { location: "Shrine", description: "torii", requestFingerprint: "rf", environmentFingerprint: "ef" };
    for (let i = 1; i <= 9; i++) {
      await saveLocationArt(spindle, "chat-lru", { ...baseLoc, imageId: `loc-${i}` }, "u1");
      await new Promise((r) => setTimeout(r, 2));
    }
    const locLib = await loadLocationArt(spindle, "chat-lru", "u1");
    expect(locLib.locations[0]!.variants.length).toBe(8);
    expect(locLib.locations[0]!.variants.some((v) => v.imageId === "loc-1")).toBe(false);
    expect(await findLocationArt(spindle, "chat-lru", baseLoc, "u1")).not.toBeNull();
  });

  test("Wave 3 frontend stage fixes: AVIF panel whitelist, unique speedLines IDs, static off-mode grading, and zero-blur CastStage", () => {
    const avif = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYx";
    const g = globalThis as Record<string, unknown>;
    const prevParser = g.DOMParser;
    g.DOMParser = class {
      parseFromString(html: string) {
        const imgMatch = html.match(/<img\b[^>]*src="([^"]*)"[^>]*>/i);
        const attrs: Record<string, string> = imgMatch ? { src: imgMatch[1]! } : {};
        const imgEl = {
          localName: "img",
          get attributes() { return Object.keys(attrs).map((name) => ({ name })); },
          getAttribute: (k: string) => attrs[k] ?? null,
          setAttribute: (k: string, v: string) => { attrs[k] = v; },
          removeAttribute: (k: string) => { delete attrs[k]; },
          remove: () => {},
        };
        const body = { get innerHTML() { return attrs.src ? `<img src="${attrs.src}" referrerpolicy="${attrs.referrerpolicy ?? ""}">` : "<img>"; } };
        return {
          head: { innerHTML: "" },
          body,
          querySelectorAll: () => (imgMatch ? [imgEl] : []),
        };
      }
    };
    try {
      const doc = panelDocument(`<img src="${avif}" alt="avatar">`);
      expect(doc).toContain(avif);
    } finally {
      g.DOMParser = prevParser;
    }

    const sl1 = generateCueEffectMarkup("speed_lines", 1);
    const sl2 = generateCueEffectMarkup("speed_lines", 2);
    const id1 = sl1.match(/id="(vn-sl-focus-\d+)"/)?.[1];
    const id2 = sl2.match(/id="(vn-sl-focus-\d+)"/)?.[1];
    expect(id1).toBe("vn-sl-focus-1");
    expect(id2).toBe("vn-sl-focus-2");
    expect(id1).not.toBe(id2);
    expect(sl1).toContain(`fill="url(#${id1})"`);
    expect(generateCueEffectMarkup("speed_lines")).toBe(generateCueEffectMarkup("speed_lines"));

    expect(VN_EFFECTS_CSS).not.toContain('[data-vn-effect-intensity="off"] [data-vn-scene-image]');
    expect(VN_EFFECTS_CSS).toContain("translate3d(-14cqw, 0, 0)");

    const restore = installFakeDocument();
    try {
      const root = new FakeNode("div");
      const stage = new CastStage(root as any);
      const css = (stage as any).style.textContent as string;
      expect(css).not.toContain("blur(1");
      expect(css).toContain("opacity:.84;filter:brightness(.86) saturate(.84)");
      expect(css).toContain("data-vn-cast-readiness");
      stage.destroy();
    } finally {
      restore();
    }
  });
});
