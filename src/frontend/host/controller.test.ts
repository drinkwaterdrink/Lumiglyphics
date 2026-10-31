import { describe, expect, test } from "bun:test";

import { DEFAULT_CONFIG, type VisualNovelConfig } from "../../config.js";
import {
  applyVisualConfigToStage,
  computeAssetProgress,
  computeReviewAttention,
  connectionCatalogStates,
  currentAssetError,
  currentAssetFailure,
  decideTurnApplication,
  nameplateForParagraph,
  musicAttenuationForParagraph,
  relayReferenceFetch,
  sameTurnIdentity,
  selectCurrentImage,
  shouldPreserveImage,
  stageTurnInput,
  viewStateMessages,
  type VisualStageThemeTarget,
} from "./controller";
import type { AssetView, TurnView } from "../../protocol.js";
import { REFERENCE_IMAGE_MAX_BYTES } from "../../protocol.js";
import type { FrontendRequest } from "../../protocol.js";

test('music attenuation ignores missing/misaligned metadata and never amplifies saved volume',()=>{
 const view={paragraphs:['A','B','C'],musicLimits:['quiet','mute',null]} as TurnView;
 expect([0,1,2].map(i=>musicAttenuationForParagraph(view,i))).toEqual([.35,0,1]);
 expect(musicAttenuationForParagraph(null,0)).toBe(1);
 expect(musicAttenuationForParagraph({...view,musicLimits:['quiet']},0)).toBe(1);
 expect(musicAttenuationForParagraph({...view,musicLimits:['loud',null,null] as any},0)).toBe(1);
});

test("image errors follow the reading cursor without revealing future failures", () => {
  const assets: AssetView[] = [
    { jobId: "a", cueId: "a", paragraphIndex: 0, status: "generated", imageUrl: "a.png" },
    { jobId: "b", cueId: "b", paragraphIndex: 1, status: "failed", error: "No usable appearance" },
    { jobId: "c", cueId: "c", paragraphIndex: 2, status: "generated", imageUrl: "c.png" }
  ];
  expect(currentAssetError({ assets } as TurnView, 0)).toBeNull();
  expect(currentAssetError({ assets } as TurnView, 1)).toBe("No usable appearance");
  expect(currentAssetError({ assets } as TurnView, 2)).toBeNull();
});

function spyStage(): VisualStageThemeTarget & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    setThemePreset(preset) { calls.push(`theme:${preset}`); },
    setSceneImageFit(fit) { calls.push(`fit:${fit}`); },
    setUserCss(css) { calls.push(`css:${css}`); },
    setDisplayRegexRules(rules) { calls.push(`regex:${rules}`); },
  };
}

const baseConfig: VisualNovelConfig = {
  castMode:false,
  showReplyCost:false,
  tooltips: DEFAULT_CONFIG.tooltips,
  persistentLocationArt: false,
  persistentCastArt: false,
  simTrackerMappings: DEFAULT_CONFIG.simTrackerMappings,
  imageOutputAspectRatio: "default",
  collectEntityReferences: false,
  contextSources: DEFAULT_CONFIG.contextSources,
  readerPreferences: DEFAULT_CONFIG.readerPreferences,
  dynamicImageTemplates: DEFAULT_CONFIG.dynamicImageTemplates,
  defaultImageTemplateId: DEFAULT_CONFIG.defaultImageTemplateId,
  imageTemplates: DEFAULT_CONFIG.imageTemplates,
  imagePromptFormat: DEFAULT_CONFIG.imagePromptFormat,
  automaticImagePromptSettings:true,
  imagePromptBudgetOverride:false,
  imagePromptBudget:3000,
  includeSimTrackerContext: DEFAULT_CONFIG.includeSimTrackerContext,
  novelAiQualityTags: true,
  novelAiUseDefaultNegative: true,
  speech: DEFAULT_CONFIG.speech,
  themePreset: "lumiverse",
  enabled: true,
  autoEnter: false,
  mode: "standard",
  sceneImageFit: "cover",
  debugLogging: false,
  generateImages: true,
  reviewImages: false,
  referenceAnchoring: true,
  referenceSource: "captured",
  generateChoices: true,
  promptPresets: [],
  originalReference: false,
  originalCreationName: "",
  parserConnectionId: null,
  systemOneMode: "off",
  systemOneApiUrl: "https://api.typesafe.ai",
  systemOneModel: "jev-latest",
  parserParameters: {},
  imageConnectionId: null,
  imageModel: "",
  imageParameters: {},
  maxImagesPerTurn: 4,
  imageConcurrency: 2,
  includeRecentMessages: 8,
  includeCharacterContext: true,
  includePersonaContext: true,
  includeLorebookContext: false,
  promptPrefix: "",
  promptSuffix: "",
  negativePrompt: "",
  customPlannerInstructions: "",
  customCss: "",
  ignoredTags: "",
  displayRegexRules: "",
  useNativeCardImages: false,
  textSpeed: 20,
  autoPlayDelay: 2000,
  skipMode: "read",
  effectIntensity: "full",
  textEffects: "animated",
  textScale: 1,
  audioDirectory: "",
  bgmVolume: 0.7,
  sfxVolume: 0.8,
};

describe("applyVisualConfigToStage (live controller config application)", () => {
  test("applies the theme preset, scene-image fit, custom CSS, and display regex from the config", () => {
    const stage = spyStage();
    const config: VisualNovelConfig = {
      ...baseConfig,
      themePreset: "golden-hour",
      sceneImageFit: "contain",
      customCss: "[data-vn-dialogue] { border-color: red; }",
      displayRegexRules: "/§([^§]+)§/g => $1",
    };

    applyVisualConfigToStage(stage, config);

    expect(stage.calls).toEqual([
      "theme:golden-hour",
      "fit:contain",
      "css:[data-vn-dialogue] { border-color: red; }",
      "regex:/§([^§]+)§/g => $1",
    ]);
  });

  test("uses the merged config values rather than a stale prior value", () => {
    const stage = spyStage();
    const previous: VisualNovelConfig = { ...baseConfig, themePreset: "paper-novel" };
    // The controller merges a patch into the previous config before applying.
    const patch: Partial<VisualNovelConfig> = {
      themePreset: "midnight-noir",
      customCss: "body {}",
      sceneImageFit: "none",
      displayRegexRules: "foo => bar",
    };
    const merged: VisualNovelConfig = { ...previous, ...patch };

    applyVisualConfigToStage(stage, merged);

    expect(stage.calls[0]).toBe("theme:midnight-noir");
    expect(stage.calls[1]).toBe("fit:none");
    expect(stage.calls[2]).toBe("css:body {}");
    expect(stage.calls[3]).toBe("regex:foo => bar");
  });

  test("always re-applies all four controls even when only one value changed", () => {
    const stage = spyStage();
    const config: VisualNovelConfig = { ...baseConfig, customCss: "p { margin: 0; }" };
    applyVisualConfigToStage(stage, config);
    expect(stage.calls).toEqual([
      "theme:lumiverse",
      "fit:cover",
      "css:p { margin: 0; }",
      "regex:",
    ]);
  });
});


describe("applyVisualConfigToStage (redesign presentation preferences)", () => {
  test("pushes text scale and effect intensity to a stage that supports them", () => {
    const calls: string[] = [];
    const stage: VisualStageThemeTarget = {
      ...spyStage(),
      setTextScale(scale) { calls.push(`scale:${scale}`); },
      setEffectIntensity(level) { calls.push(`fx:${level}`); },
    };
    applyVisualConfigToStage(stage, { ...baseConfig, textScale: 1.25, effectIntensity: "gentle" });
    expect(calls).toEqual(["scale:1.25", "fx:gentle"]);
  });

  test("a stage without the new setters keeps working (setters are optional)", () => {
    const stage = spyStage();
    expect(() => applyVisualConfigToStage(stage, { ...baseConfig, textScale: 1.4, effectIntensity: "off" })).not.toThrow();
    expect(stage.calls).toHaveLength(4);
  });
});

describe("connectionCatalogStates (truthful readiness, never a probe)", () => {
  const option = { id: "c1", name: "Main", provider: "openai", model: "gpt", isDefault: true };

  test("a listed kind is ready with its options; ready means listed, not tested", () => {
    const states = connectionCatalogStates({ planner: [option], image: [] });
    expect(states.planner).toEqual({ status: "ready", options: [option] });
    expect(states.image).toEqual({ status: "ready", options: [] });
  });

  test("a kind whose listing failed is reported as an error instead of an empty ready list", () => {
    const states = connectionCatalogStates({ planner: [option], image: [], errors: { image: "image-gen offline" } });
    expect(states.planner.status).toBe("ready");
    expect(states.image).toEqual({ status: "error", options: [], error: "image-gen offline" });
  });

  test("both kinds can fail independently", () => {
    const states = connectionCatalogStates({ errors: { planner: "a", image: "b" } });
    expect(states.planner).toEqual({ status: "error", options: [], error: "a" });
    expect(states.image).toEqual({ status: "error", options: [], error: "b" });
  });
});


function turn(overrides: Partial<TurnView> = {}): TurnView {
  return {
    chatId: "chat",
    messageId: "message",
    swipeId: 0,
    sourceFingerprint: "feedface12345678",
    revision: 1,
    speaker: "Mira",
    paragraphs: ["The door opens."],
    choices: [],
    assets: [],
    status: "ready",
    ...overrides
  };
}

function asset(overrides: Partial<AssetView> = {}): AssetView {
  return {
    jobId: "job",
    cueId: "cue",
    paragraphIndex: 0,
    status: "generated",
    imageUrl: "/img/one.png",
    ...overrides
  };
}

test("a revised plan reloads presentation at a clamped cursor instead of acting as an asset rebroadcast", () => {
  const old = turn({ paragraphs: ["One", "Two", "Three"], revision: 1 });
  const next = turn({ paragraphs: ["One", "Two"], revision: 2, speaker: "Jo" });
  expect(decideTurnApplication(old, next, 2, true, true)).toEqual({ kind: "revised-turn", paragraphIndex: 1 });
  expect(decideTurnApplication(next, old, 1, true, true)).toEqual({ kind: "none" });
  expect(decideTurnApplication(old, { ...old, swipeId: 1 }, 1, true, true)).toEqual({ kind: "load-turn" });
});

describe("selectCurrentImage (pure frontend image selection)", () => {
  test("picks the highest ready paragraph at or before the cursor", () => {
    const source = turn({
      assets: [
        asset({ jobId: "j0", cueId: "c0", paragraphIndex: 0, imageUrl: "/img/0.png" }),
        asset({ jobId: "j1", cueId: "c1", paragraphIndex: 1, imageUrl: "/img/1.png" }),
        asset({ jobId: "j2", cueId: "c2", paragraphIndex: 2, imageUrl: "/img/2.png" })
      ]
    });
    expect(selectCurrentImage(source, 1)?.paragraphIndex).toBe(1);
    expect(selectCurrentImage(source, 1)?.imageUrl).toBe("/img/1.png");
  });

  test("uses the FIRST ready asset (stable tie) when several share the current paragraph", () => {
    const source = turn({
      assets: [
        asset({ jobId: "c0a", cueId: "c0a", paragraphIndex: 0, imageUrl: "/img/c0a.png" }),
        asset({ jobId: "c0b", cueId: "c0b", paragraphIndex: 0, imageUrl: "/img/c0b.png" })
      ]
    });
    // The first asset in the array wins, never the last (which used to flip).
    expect(selectCurrentImage(source, 0)?.imageUrl).toBe("/img/c0a.png");
  });

  test("ignores non-ready assets and assets above the cursor", () => {
    const source = turn({
      assets: [
        asset({ jobId: "queued", cueId: "cq", status: "queued", imageUrl: "/img/q.png" }),
        asset({ jobId: "future", cueId: "cf", paragraphIndex: 3, imageUrl: "/img/f.png" }),
        asset({ jobId: "ready", cueId: "cr", paragraphIndex: 1, imageUrl: "/img/r.png", status: "browser_ready" })
      ]
    });
    expect(selectCurrentImage(source, 0)).toBeNull();
    expect(selectCurrentImage(source, 1)?.imageUrl).toBe("/img/r.png");
  });

  test("earliest available ready asset can be resolved when opening stage is empty", () => {
    const source = turn({
      assets: [
        asset({ jobId: "job0", cueId: "c0", paragraphIndex: 0, status: "generating" }),
        asset({ jobId: "job1", cueId: "c1", paragraphIndex: 2, imageUrl: "/img/p2.png", status: "generated" })
      ]
    });
    const earliest = source.assets
      .filter((a) => (a.status === "generated" || a.status === "browser_ready" || a.previousImage) && Boolean(a.imageUrl))
      .sort((a, b) => a.paragraphIndex - b.paragraphIndex)[0];
    expect(earliest?.imageUrl).toBe("/img/p2.png");
  });

  test("portrait role at paragraph 0 resolves cleanly and is not dropped by background hold", () => {
    const source = turn({
      assets: [
        asset({ jobId: "p1", cueId: "c1", paragraphIndex: 0, imageUrl: "/img/portrait.png", status: "generated", stageAsset: { role: "portrait", sceneId: "s1", character: "Nadine" } }),
        asset({ jobId: "p2", cueId: "c2", paragraphIndex: 3, imageUrl: "/img/scene.png", status: "queued", stageAsset: { role: "scene", sceneId: "s1" } })
      ]
    });
    const current = selectCurrentImage(source, 0);
    expect(current?.imageUrl).toBe("/img/portrait.png");
    expect(current?.stageAsset?.role).toBe("portrait");
  });
});

describe("sameTurnIdentity (re-broadcast guard)", () => {
  test("is true when chatId, messageId, and sourceFingerprint all match", () => {
    const source = turn({ chatId: "chat", messageId: "m1", sourceFingerprint: "abc" });
    expect(sameTurnIdentity(source, turn({ chatId: "chat", messageId: "m1", sourceFingerprint: "abc" }))).toBe(true);
  });

  test("is false when any identity field differs", () => {
    const source = turn({ chatId: "chat", messageId: "m1", sourceFingerprint: "abc" });
    expect(sameTurnIdentity(source, turn({ chatId: "chat", messageId: "m2", sourceFingerprint: "abc" }))).toBe(false);
    expect(sameTurnIdentity(source, turn({ chatId: "chat", messageId: "m1", sourceFingerprint: "def" }))).toBe(false);
    expect(sameTurnIdentity(source, turn({ chatId: "other", messageId: "m1", sourceFingerprint: "abc" }))).toBe(false);
  });
});

describe("decideTurnApplication (same-turn guard + load-turn path)", () => {
  test("re-broadcasting the SAME already-loaded turn becomes a cursor sync, not a load/reset", () => {
    const previous = turn({ status: "ready" });
    const next = turn({ status: "ready", assets: [asset({ imageUrl: "/img/new.png" })] });
    expect(decideTurnApplication(previous, next, 3, true, true)).toEqual({ kind: "same-turn", paragraphIndex: 3 });
  });

  test("a recorded-but-not-yet-loaded same turn still needs a real load-turn (activation)", () => {
    const previous = turn({ status: "ready" });
    const next = turn({ status: "ready" });
    expect(decideTurnApplication(previous, next, 0, true, false)).toEqual({ kind: "load-turn" });
  });

  test("a genuinely different turn becomes a load-turn", () => {
    const previous = turn({ messageId: "m1" });
    const next = turn({ messageId: "m2" });
    expect(decideTurnApplication(previous, next, 3, true, true)).toEqual({ kind: "load-turn" });
  });

  test("is inert when the stage is not active", () => {
    expect(decideTurnApplication(null, turn(), 0, false, false)).toEqual({ kind: "none" });
  });

  test("maps planning and failed statuses without touching the cursor", () => {
    expect(decideTurnApplication(null, turn({ status: "planning" }), 2, true, false)).toEqual({ kind: "planning" });
    expect(decideTurnApplication(null, turn({ status: "failed", error: "boom" }), 2, true, false)).toEqual({ kind: "error", error: "boom" });
  });
});
describe("computeAssetProgress (granular image generation progress)", () => {
  test('local text operations override old review status only for their exact reply and request',()=>{
    const source=turn({assets:[asset({jobId:'j1',status:'generated'})],imageRequests:[{requestId:'r',jobId:'j1',paragraphIndex:0,state:'review',prompt:'scene',negativePrompt:'',model:'m',provider:'p',connectionId:'c',parameters:{},referenceSummary:'none',createdAt:'today'}]});
    const local={chatId:source.chatId,messageId:source.messageId,sourceFingerprint:source.sourceFingerprint,swipeId:source.swipeId,revision:source.revision,jobs:[{jobId:'j1',requestId:'r',kind:'rewrite' as const}]};
    expect(computeReviewAttention(source)).toBe(1);
    expect(computeReviewAttention(source,local)).toBe(0);
    expect(computeReviewAttention(null)).toBe(0);
    expect(computeAssetProgress(source,null,local)).toMatchObject({label:'1 picture · 1 rewriting prompt',busy:true});
    expect(computeAssetProgress(source,null,{...local,jobs:[{...local.jobs[0]!,kind:'template'}]})).toMatchObject({label:'1 picture · 1 applying template',busy:true});
    for(const mismatch of [{chatId:'other'},{messageId:'other'},{sourceFingerprint:'other'},{swipeId:source.swipeId+1},{revision:source.revision+1}]){
      expect(computeReviewAttention(source,{...local,...mismatch})).toBe(1);
      expect(computeAssetProgress(source,null,{...local,...mismatch})).toMatchObject({label:'1 picture · 1 needs review',busy:false});
    }
    expect(computeAssetProgress(source,null,{...local,jobs:[{...local.jobs[0]!,requestId:'old'}]})).toMatchObject({label:'1 picture · 1 needs review',busy:false});
  });
  test('held reviews are awaiting action rather than provider generation',()=>{
    const source=turn({assets:[asset({jobId:'j1',status:'generating'})],imageRequests:[{requestId:'r',jobId:'j1',paragraphIndex:0,state:'review',prompt:'scene',negativePrompt:'',model:'m',provider:'p',connectionId:'c',parameters:{},referenceSummary:'none',createdAt:'today'}]});
    expect(computeAssetProgress(source)).toMatchObject({label:'1 picture · 1 needs review',busy:false});
  });
  test('retry progress is scoped to the exact source version and never counts another picture',()=>{
    const source=turn({assets:[asset({jobId:'j1',status:'failed'})]});
    const queue={chatId:source.chatId,messageId:source.messageId,sourceFingerprint:source.sourceFingerprint,swipeId:source.swipeId,revision:source.revision,activeJobId:null,jobIds:['j1']};
    expect(computeAssetProgress(source,queue)).toMatchObject({total:1,label:'1 picture · 1 retry queued',busy:false});
    expect(computeAssetProgress(source,{...queue,revision:source.revision+1})).toBeNull();
    expect(computeAssetProgress(source,{...queue,activeJobId:'j1',jobIds:[]})).toMatchObject({label:'1 picture · 1 retry running',busy:true});
  });
  test("returns null when there are no assets in the turn", () => {
    expect(computeAssetProgress(null)).toBeNull();
    expect(computeAssetProgress(turn({ assets: [] }))).toBeNull();
  });

  test("calculates 1/3 when the first of three assets is queued or generating", () => {
    const source = turn({
      assets: [
        asset({ jobId: "j1", status: "generating" }),
        asset({ jobId: "j2", status: "queued" }),
        asset({ jobId: "j3", status: "queued" }),
      ],
    });
    expect(computeAssetProgress(source)).toEqual({ current: 1, total: 3, label:"3 pictures · 3 preparing",busy:true });
  });

  test("calculates 2/3 when the first asset completed and the second is generating", () => {
    const source = turn({
      assets: [
        asset({ jobId: "j1", status: "generated" }),
        asset({ jobId: "j2", status: "generating" }),
        asset({ jobId: "j3", status: "queued" }),
      ],
    });
    expect(computeAssetProgress(source)).toEqual({ current: 2, total: 3, label:"3 pictures · 1 ready · 2 preparing",busy:true });
  });

  test("calculates 3/3 when the first two assets completed and the third is generating", () => {
    const source = turn({
      assets: [
        asset({ jobId: "j1", status: "generated" }),
        asset({ jobId: "j2", status: "browser_ready" }),
        asset({ jobId: "j3", status: "generating" }),
      ],
    });
    expect(computeAssetProgress(source)).toEqual({ current: 3, total: 3, label:"3 pictures · 2 ready · 1 preparing",busy:true });
  });

  test("returns null once all three assets have finished", () => {
    const source = turn({
      assets: [
        asset({ jobId: "j1", status: "generated" }),
        asset({ jobId: "j2", status: "browser_ready" }),
        asset({ jobId: "j3", status: "generated" }),
      ],
    });
    expect(computeAssetProgress(source)).toBeNull();
  });
});

describe("shouldPreserveImage", () => {
  test("returns false when previous turn is null (initial load or fresh chat)", () => {
    expect(shouldPreserveImage(null, turn({ chatId: "chat-1" }))).toBe(false);
  });

  test("returns false when chat ids differ (swapped chat or card)", () => {
    const prev = turn({ chatId: "chat-1", speaker: "Alice" });
    const next = turn({ chatId: "chat-2", speaker: "Alice" });
    expect(shouldPreserveImage(prev, next)).toBe(false);
  });

  test("returns false when speakers differ (swapped character card)", () => {
    const prev = turn({ chatId: "chat-1", speaker: "Alice" });
    const next = turn({ chatId: "chat-1", speaker: "Bob" });
    expect(shouldPreserveImage(prev, next)).toBe(false);
  });

  test("returns true when advancing turns within the same chat and same speaker", () => {
    const prev = turn({ chatId: "chat-1", speaker: "Alice", messageId: "msg-1" });
    const next = turn({ chatId: "chat-1", speaker: "Alice", messageId: "msg-2" });
    expect(shouldPreserveImage(prev, next)).toBe(true);
  });

  test("returns true when advancing turns within the same chat with empty speaker", () => {
    const prev = turn({ chatId: "chat-1", speaker: "", messageId: "msg-1" });
    const next = turn({ chatId: "chat-1", speaker: "", messageId: "msg-2" });
    expect(shouldPreserveImage(prev, next)).toBe(true);
  });
});

describe("nameplateForParagraph (per-paragraph literal speaker)", () => {
  test("falls back to the turn speaker when there is no attribution", () => {
    const view = turn({ paragraphs: ["One.", "Two."] });
    expect(nameplateForParagraph(view, 0)).toBe("Mira");
    expect(nameplateForParagraph(view, 1)).toBe("Mira");
  });

  test("uses the attributed name, hides the plate for narrator, and falls back on null", () => {
    const view = turn({
      speaker: "Monster Musume Paradise",
      paragraphs: ["\"Hi!\"", "The sun sets.", "A stranger waves."],
      paragraphSpeakers: ["Nana", "", null]
    });
    expect(nameplateForParagraph(view, 0)).toBe("Nana");
    // "" = intentional narrator: the stage hides an empty nameplate.
    expect(nameplateForParagraph(view, 1)).toBe("");
    // null = unknown: today's behavior (card name).
    expect(nameplateForParagraph(view, 2)).toBe("Monster Musume Paradise");
  });
});

describe("stageTurnInput (production host-to-stage mapping)", () => {
  test("omits ambient only when the TurnView has no ambients array", () => {
    expect(Object.hasOwn(stageTurnInput(turn(), "standard", true), "ambient")).toBe(false);
    expect(stageTurnInput(turn({ ambients: [] }), "standard", true).ambient).toBeNull();
    expect(stageTurnInput(turn({ ambients: [null] }), "standard", true).ambient).toBeNull();
    expect(stageTurnInput(turn({ ambients: ["snow"] }), "standard", true).ambient).toBe("snow");
  });

  test("forwards paragraph metadata independently of image assets", () => {
    const input = stageTurnInput(turn({
      paragraphs: ["Rain.", "A flash.", "Inside."],
      ambients: ["rain", "rain", null], effects: [null, "flash_white", null],
      choices: [{ id: "go", label: "Go", value: "go" }]
    }), "cyoa", false);
    expect(input.mode).toBe("cyoa");
    expect(input.preserveImage).toBe(false);
    expect(input.choices).toEqual([{ id: "go", label: "Go", value: "go" }]);
    expect(input.paragraphs.map((paragraph) => paragraph.ambient)).toEqual(["rain", "rain", null]);
    expect(input.paragraphs[1]?.effect).toBe("flash_white");
    expect(input.paragraphs[1]?.id).toBe("feedface12345678:1");
  });
});

describe("stageTurnInput (effect presentation preference)", () => {
  test('conditional caps can only lower global effects and soften danger pulses',()=>{
    const view=turn({paragraphs:['A','B','C'],effects:['shake_hard','confetti','flash_white'],ambients:['danger_pulse','rain',null],effectLimits:['gentle','off',null]} as any);
    expect(stageTurnInput(view,'standard',false,'full').paragraphs.map(p=>p.effect)).toEqual(['shake',undefined,'flash_white']);
    expect(stageTurnInput(view,'standard',false,'off').paragraphs.map(p=>p.effect)).toEqual([undefined,undefined,undefined]);
    expect(stageTurnInput(view,'standard',false,'full').ambient).toBe('vignette_dark');
    expect(stageTurnInput(view,'standard',false,'gentle').paragraphs.map(p=>p.effect)).toEqual(['shake',undefined,undefined]);
    expect(stageTurnInput({...view,effectLimits:['garbage'] as any},'standard',false,'full').paragraphs[0]?.effect).toBe('shake_hard');
  });
  const view = () => turn({
    paragraphs: ["Boom.", "Flash.", "Danger."],
    effects: ["shake_hard", "flash_white", "confetti"],
    ambients: ["danger_pulse", "rain", null],
  });

  test("defaults to full so existing playback is unchanged", () => {
    const input = stageTurnInput(view(), "standard", false);
    expect(input.paragraphs.map((paragraph) => paragraph.effect)).toEqual(["shake_hard", "flash_white", "confetti"]);
    expect(input.ambient).toBe("danger_pulse");
  });

  test("gentle softens strong shakes, drops flashes, keeps particles, and calms the danger pulse", () => {
    const input = stageTurnInput(view(), "standard", false, "gentle");
    expect(input.paragraphs.map((paragraph) => paragraph.effect)).toEqual(["shake", undefined, "confetti"]);
    expect(input.paragraphs.map((paragraph) => paragraph.ambient)).toEqual(["vignette_dark", "rain", null]);
    expect(input.ambient).toBe("vignette_dark");
  });

  test("off removes every one-shot effect but keeps atmospheric ambients", () => {
    const input = stageTurnInput(view(), "standard", false, "off");
    expect(input.paragraphs.every((paragraph) => paragraph.effect === undefined)).toBe(true);
    expect(input.paragraphs[1]?.ambient).toBe("rain");
  });
});

describe("currentAssetFailure (actionable, truthful retry scope)", () => {
  test("describes the failed image at the cursor with detail and what retry keeps", () => {
    const view = turn({
      assets: [
        { jobId: "a", cueId: "a", paragraphIndex: 0, status: "generated", imageUrl: "a.png" },
        { jobId: "b", cueId: "b", paragraphIndex: 1, status: "failed", error: "No usable appearance" },
      ],
    });
    expect(currentAssetFailure(view, 0)).toBeNull();
    expect(currentAssetFailure(view, 1)).toEqual({
      message: "This scene image could not be made.",
      detail: "No usable appearance",
      source: "image",
      retryable: true,
      retryScope: "Try again keeps 1 finished image and makes 1 unfinished image again.",
    });
  });
});


describe("viewStateMessages (view announcement on boot, reconnect, activate, chat switch)", () => {
  test("announces the open view before requesting state, with a matching viewOpen flag", () => {
    expect(viewStateMessages("chat-1", true)).toEqual([
      { type: "vn_view", chatId: "chat-1", open: true },
      { type: "vn_get_state", chatId: "chat-1", viewOpen: true },
    ]);
  });

  test("a closed view is announced as closed so the backend skips its turns", () => {
    expect(viewStateMessages("chat-1", false)).toEqual([
      { type: "vn_view", chatId: "chat-1", open: false },
      { type: "vn_get_state", chatId: "chat-1", viewOpen: false },
    ]);
  });

  test("without a chat there is no vn_view announcement, only the state request", () => {
    expect(viewStateMessages("", false)).toEqual([
      { type: "vn_get_state", chatId: "", viewOpen: false },
    ]);
  });

  test("re-announcing after a reconnect is idempotent (same messages every time)", () => {
    expect(viewStateMessages("chat-1", true)).toEqual(viewStateMessages("chat-1", true));
  });

  test("the boot request says nothing about the view: no vn_view, no viewOpen (a reload must not abort a batch autoEnter is about to reopen)", () => {
    const messages = viewStateMessages("chat-1", undefined);
    expect(messages).toEqual([{ type: "vn_get_state", chatId: "chat-1" }]);
    expect(messages.some((message) => message.type === "vn_view")).toBe(false);
    expect("viewOpen" in messages[0]!).toBe(false);
  });
});

describe("relayReferenceFetch (card reference data relay)", () => {
  type Reply = Extract<FrontendRequest, { type: "vn_reference_image" }>;

  function fakeResponse(options: { ok?: boolean; status?: number; size?: number; type?: string; bytes?: Uint8Array }): Response {
    const bytes = options.bytes ?? new Uint8Array([65, 66, 67]);
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      blob: async () => ({
        size: options.size ?? bytes.length,
        type: options.type ?? "image/png",
        arrayBuffer: async () => bytes.buffer
      })
    } as unknown as Response;
  }

  test("fetches the image with credentials and replies with a data URL", async () => {
    const replies: Reply[] = [];
    const urls: Array<{ url: string; init?: RequestInit }> = [];
    await relayReferenceFetch(
      { requestId: "r1", imageId: "img 1" },
      async (url, init) => { urls.push({ url, ...(init ? { init } : {}) }); return fakeResponse({ type: "image/webp" }); },
      (reply) => replies.push(reply)
    );
    expect(urls[0]?.url).toBe("/api/v1/images/img%201");
    expect(urls[0]?.init?.credentials).toBe("same-origin");
    expect(replies).toEqual([{ type: "vn_reference_image", requestId: "r1", dataUrl: "data:image/webp;base64,QUJD" }]);
  });

  test("non-image or missing MIME is rejected instead of relabeled", async () => {
    for (const type of ["", "video/webm", "application/json", "text/html", "application/octet-stream", "image/svg+xml"]) {
      const replies: Reply[] = [];
      await relayReferenceFetch({ requestId: "r1", imageId: "a" }, async () => fakeResponse({ type }), (reply) => replies.push(reply));
      expect(replies[0]?.dataUrl).toBeUndefined();
      expect(replies[0]?.error).toBeDefined();
    }
  });

  test("an HTTP failure and an oversize blob reply with an error, never with data", async () => {
    const replies: Reply[] = [];
    await relayReferenceFetch({ requestId: "r1", imageId: "a" }, async () => fakeResponse({ ok: false, status: 404 }), (reply) => replies.push(reply));
    await relayReferenceFetch({ requestId: "r2", imageId: "a" }, async () => fakeResponse({ size: REFERENCE_IMAGE_MAX_BYTES + 1 }), (reply) => replies.push(reply));
    await relayReferenceFetch({ requestId: "r3", imageId: "a" }, async () => { throw new Error("network down"); }, (reply) => replies.push(reply));
    expect(replies.map((reply) => reply.requestId)).toEqual(["r1", "r2", "r3"]);
    for (const reply of replies) {
      expect(reply.dataUrl).toBeUndefined();
      expect(typeof reply.error).toBe("string");
    }
    expect(replies[1]?.error).toMatch(/8 MiB/);
  });
});

test('stage rejects tooltip presentation from a different turn scope',()=>{
 const view=turn();
 const key={chatId:view.chatId,assistantMessageId:view.messageId,swipeId:view.swipeId,sourceFingerprint:view.sourceFingerprint,revision:view.revision};
 const snapshot={at:{key,paragraphIndex:0},entities:[],stateByEntity:{},presentEntityIds:[],locationId:null,speakerEntityId:null,drawableEntityId:null};
 const presentation={version:1 as const,snapshots:view.paragraphs.map((_,i)=>({...snapshot,at:{key,paragraphIndex:i}}))};
 expect(stageTurnInput({...view,presentation},'standard',false).presentation).toEqual(presentation);
 expect(stageTurnInput({...view,presentation:{...presentation,snapshots:presentation.snapshots.map(s=>({...s,at:{...s.at,key:{...key,chatId:'foreign'}}}))}},'standard',false).presentation).toBeUndefined();
});

test('held backgrounds do not hide current failures or alter generation progress',()=>{
 const first=asset({jobId:'first',cueId:'first',paragraphIndex:0,imageUrl:'/first',stageAsset:{role:'background',sceneId:'s'}});
 const second=asset({jobId:'second',cueId:'second',paragraphIndex:1,imageUrl:'/second',stageAsset:{role:'background',sceneId:'s'}});
 const failed=asset({jobId:'failed',cueId:'failed',paragraphIndex:2,status:'failed',error:'Provider unavailable'});
 const t=turn({paragraphs:['a','b','c'],backgroundHoldStarts:[0,0,0],assets:[first,second,failed]});
 expect(selectCurrentImage(t,1)?.imageUrl).toBe('/first');
 expect(selectCurrentImage(t,0)?.imageUrl).toBe('/first');
 expect(currentAssetError(t,2)).toBe('Provider unavailable');
 expect(computeAssetProgress(t)).toEqual(computeAssetProgress({...t,backgroundHoldStarts:[null,null,null]}));
});

test('same-paragraph cast artwork reports a failed portrait even when its background succeeded',()=>{
 const source=turn({assets:[{jobId:'background',cueId:'background',paragraphIndex:0,status:'generated',imageUrl:'/room'},{jobId:'portrait',cueId:'portrait',paragraphIndex:0,status:'failed',error:'Portrait failed'},{jobId:'future',cueId:'future',paragraphIndex:1,status:'failed',error:'Future error'}]});
 expect(currentAssetError(source,0)).toBe('Portrait failed');expect(currentAssetFailure(source,0)?.detail).toContain('Portrait failed');
});
