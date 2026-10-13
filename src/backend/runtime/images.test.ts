import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../../config.js";
import { TurnPlanSchema, type SceneState, type TurnPlan, type VisualCue } from "../../shared/contracts.js";
import { POSE_EXPRESSION_CATALOGUE, poseById } from "../../shared/character.js";
import { compileImagePrompt, compileNegativePrompt, createAssetJobs, generateAssets } from "./images.js";
import { ImageReviewGate } from "./image-review.js";

const now = new Date().toISOString();

test('overlong compiled prompts are rewritten once before review and remain under the combined ceiling',async()=>{
 const sent:any[]=[];let textCalls=0;
 const spindle={userStorage:{getJson:async(_:string,o:any)=>o.fallback},connections:{list:async()=>[{id:'writer',provider:'openrouter',model:'writer',is_default:true}]},
  generate:{raw:async()=>{textCalls++;return {content:JSON.stringify({prompt:'A silver-haired traveller in the established scene.',negativePrompt:'blur, text'})};}},
  imageGen:{generate:async(r:any)=>{sent.push(r);return {imageId:'image'};}}} as any;
 const turn=plan([cue('idle')]),config={...DEFAULT_CONFIG,referenceAnchoring:false,promptPrefix:'x'.repeat(3500)};
 const jobs=await generateAssets(spindle,turn,createAssetJobs(turn,config),config,new AbortController().signal,()=>{},'user',{
  beforeGenerate:async(_job,request)=>{expect(request.prompt.length+(request.negativePrompt?.length??0)).toBeLessThan(3000);return request;}
 });
 expect(textCalls).toBe(1);expect(sent).toHaveLength(1);expect(jobs[0]?.status).toBe('generated');expect(sent[0].prompt).toContain('silver-haired');
});

test('Anima portrait resolution is frozen before review and dispatched without a retry', async () => {
  for (const reviewed of [false, true]) {
    const sent: any[] = [];
    const connection = { id: 'nano', provider: 'nanogpt', model: 'wavespeed-ai/anima/text-to-image', updated_at: 1, default_parameters: { size: '1024x1024' } };
    const spindle = { userStorage: { getJson: async (_: string, o: any) => o.fallback }, imageGen: { getConnection: async () => connection, generate: async (request: any) => { sent.push(request); return { imageId: 'image' }; } } } as any;
    const turn = plan([cue('idle')]);
    const config = { ...DEFAULT_CONFIG, imageConnectionId: 'nano', referenceAnchoring: false, imageParameters: { size: '864x1536' } };
    const jobs = await generateAssets(spindle, turn, createAssetJobs(turn, config), config, new AbortController().signal, () => {}, 'user', reviewed ? { beforeGenerate: async (_job, request) => {
      expect(request.parameters?.size).toBe('1k');
      expect(request.parameters?.rawRequestOverride).toEqual({ aspect_ratio: '9:16' });
      return request;
    } } : {});
    expect(sent).toHaveLength(1);
    expect(sent[0].parameters.size).toBe('1k');
    expect(jobs[0]?.status).toBe('generated');
  }
});

test('unsupported Anima resolution edited after preview cannot reach the provider', async () => {
  let calls = 0;
  const connection = { id: 'nano', provider: 'nanogpt', model: 'wavespeed-ai/anima/text-to-image', updated_at: 1 };
  const spindle = { userStorage: { getJson: async (_: string, o: any) => o.fallback }, imageGen: { getConnection: async () => connection, generate: async () => { calls++; return { imageId: 'wrong' }; } } } as any;
  const turn = plan([cue('idle')]);
  const config = { ...DEFAULT_CONFIG, imageConnectionId: 'nano', referenceAnchoring: false };
  const jobs = await generateAssets(spindle, turn, createAssetJobs(turn, config), config, new AbortController().signal, () => {}, 'user', { beforeGenerate: async (_job, request) => ({ ...request, parameters: { size: '864x1536' } }) });
  expect(calls).toBe(0);
  expect(jobs[0]?.error).toContain('1k or 1.5k');
});

test("final provider boundary holds images and sends exactly the approved prompt/settings", async () => {
  const sent: any[] = [];
  const records: any[] = [];
  const gate = new ImageReviewGate(async (record) => { records.push(record); });
  const connection = { id: "nano", provider: "nanogpt", model: "model-a", updated_at: 10, default_parameters: { seed: 7 } };
  const spindle = { userStorage: { getJson: async (_: string, options: any) => options.fallback }, imageGen: { getConnection: async () => connection, generate: async (input: any) => { sent.push(input); return { imageId: "image", imageUrl: "/image" }; } } } as any;
  const turn = plan([cue("idle")]);
  const config = { ...DEFAULT_CONFIG, imageConnectionId: "nano", referenceAnchoring: false };
  const running = generateAssets(spindle, turn, createAssetJobs(turn, config), config, new AbortController().signal, () => {}, "alice", {
    beforeGenerate: (job, request, metadata, signal) => gate.prepare(job.jobId, job.paragraphIndex, request, metadata, true, signal)
  });
  for (let attempt = 0; attempt < 30 && records.length === 0; attempt++) await new Promise((resolve) => setTimeout(resolve, 1));
  expect(sent).toHaveLength(0);
  expect(records[0]?.model).toBe("model-a");
  expect(records[0]?.parameters.seed).toBe(7);
  gate.decide(records[0].requestId, "generate", { prompt: "one calm portrait", parameters: { seed: 55 } });
  await running;
  expect(sent).toHaveLength(1);
  expect(sent[0].prompt).toBe("one calm portrait");
  expect(sent[0].parameters.seed).toBe(55);
  expect(sent[0].userId).toBe("alice");
});

test("changed connection revision prevents dispatch after review", async () => {
  let revision = 1;
  let calls = 0;
  const spindle = { userStorage: { getJson: async (_: string, options: any) => options.fallback }, imageGen: {
    getConnection: async () => ({ id: "nano", provider: "nanogpt", model: "model-a", updated_at: revision }),
    generate: async () => { calls++; return { imageId: "wrong" }; }
  } } as any;
  const turn = plan([cue("idle")]);
  const config = { ...DEFAULT_CONFIG, imageConnectionId: "nano", referenceAnchoring: false };
  const jobs = await generateAssets(spindle, turn, createAssetJobs(turn, config), config, new AbortController().signal, () => {}, "alice", {
    beforeGenerate: async (_job, request) => { revision = 2; return request; }
  });
  expect(calls).toBe(0);
  expect(jobs[0]?.error).toContain("connection changed");
});

test("cancellation during the final profile lookup cannot start a paid image", async () => {
  let lookups = 0;
  let release!: () => void;
  let calls = 0;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const connection = { id: "nano", provider: "nanogpt", model: "model-a", updated_at: 1 };
  const spindle = { userStorage: { getJson: async (_: string, options: any) => options.fallback }, imageGen: {
    getConnection: async () => { lookups++; if (lookups === 3) await blocked; return connection; },
    generate: async () => { calls++; return { imageId: "wrong" }; }
  } } as any;
  const turn = plan([cue("idle")]);
  const config = { ...DEFAULT_CONFIG, imageConnectionId: "nano", referenceAnchoring: false };
  const abort = new AbortController();
  const running = generateAssets(spindle, turn, createAssetJobs(turn, config), config, abort.signal, () => {}, "alice", { beforeGenerate: async (_job, request) => request });
  for (let attempt = 0; attempt < 30 && lookups < 3; attempt++) await new Promise((resolve) => setTimeout(resolve, 1));
  expect(lookups).toBe(3);
  abort.abort();
  release();
  await running;
  expect(calls).toBe(0);
});
test("reviewed matching pictures prepare independently and send their own edits", async () => {
  const records: any[] = [];
  const sent: any[] = [];
  const gate = new ImageReviewGate(async (record) => { records.push(record); });
  const base = plan([cue("idle")]);
  const turn = TurnPlanSchema.parse({ ...base, paragraphs: [...base.paragraphs, { index: 1, sourceIndex: 1, text: "Second." }], visualCues: [base.visualCues[0], { ...base.visualCues[0], cueId: "second", assetJobId: "second", paragraphIndex: 1 }] });
  const config = { ...DEFAULT_CONFIG, referenceAnchoring: false, imageConcurrency: 2 };
  const spindle = { userStorage: { getJson: async (_: string, options: any) => options.fallback }, imageGen: { generate: async (input: any) => { sent.push(input); return { imageId: input.prompt, imageUrl: "/image" }; } } } as any;
  const running = generateAssets(spindle, turn, createAssetJobs(turn, config), config, new AbortController().signal, () => {}, "alice", { independentRequests: true, disableCacheStore: true, beforeGenerate: (job, request, metadata, signal) => gate.prepare(job.jobId, job.paragraphIndex, request, metadata, true, signal) });
  for (let attempt = 0; attempt < 30 && records.length < 2; attempt++) await new Promise((resolve) => setTimeout(resolve, 1));
  expect(records).toHaveLength(2);
  gate.decide(records[0].requestId, "generate", { prompt: "first edit" });
  gate.decide(records[1].requestId, "generate", { prompt: "second edit" });
  await running;
  expect(sent.map((input) => input.prompt).sort()).toEqual(["first edit", "second edit"]);
});
const key = {
  chatId: "chat",
  assistantMessageId: "message",
  swipeId: 0,
  sourceFingerprint: "12345678abcdef",
  revision: 0
};

const scene: SceneState = {
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
  identityPrompt: "silver hair, green eyes, red coat",
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
};

function cue(poseExpressionId: string | undefined, paragraphIndex = 0): VisualCue {
  return {
    cueId: `cue-${poseExpressionId ?? "none"}`,
    paragraphIndex,
    sceneId: "scene",
    sceneRevision: 0,
    kind: "flattened_scene",
    action: null,
    expression: null,
    promptDelta: "",
    ...(poseExpressionId ? { poseExpressionId } : {}),
    assetJobId: `job-${poseExpressionId ?? "none"}`
  };
}

function plan(cues: VisualCue[]): TurnPlan {
  return TurnPlanSchema.parse({
    schemaVersion: 1,
    key,
    paragraphs: [{ index: 0, sourceIndex: 0, text: "First." }],
    scenes: [scene],
    visualCues: cues,
    choices: [],
    initialContinuity: { revision: 0, characters: {}, facts: {} },
    continuityDeltas: [],
    terminalContinuity: { revision: 0, characters: {}, facts: {} },
    planningStatus: "planned",
    createdAt: now
  });
}

describe("compileImagePrompt (vendored Inlay compiler)", () => {
  test("renders ordered ComfyUI sections without legacy prose labels", () => {
    const compiled = compileImagePrompt(DEFAULT_CONFIG, scene, cue("smile"));
    const sections = compiled.split(",\n\n");
    expect(sections).toEqual([
      DEFAULT_CONFIG.promptPrefix,
      "1girl, solo",
      "girl, silver hair, green eyes, red coat, gentle smile, eyes relaxed",
      "Library, night, lamplight",
      "upper body, eye level, straight-on"
    ]);
    expect(compiled.match(/1girl, solo/g)?.length).toBe(1);
    for (const forbidden of ["identity:", "camera:", "composition:", ";", "50mm", "Mira"]) {
      expect(compiled).not.toContain(forbidden);
    }
  });


  test("retains a 'short cut' hair tag under upper body framing (does not drop as figure)", () => {
    const hina = {
      ...scene,
      identityPrompt: "Golden blonde short cut, Brilliant red irises with stark white pupils, round face, Black high school uniform, red sailor ribbon"
    };
    const compiled = compileImagePrompt(DEFAULT_CONFIG, hina, cue("smile"));
    expect(compiled).toContain("Golden blonde short cut");
    expect(compiled).toContain("Brilliant red irises with stark white pupils");
    expect(compiled).toContain("Black high school uniform");
    expect(compiled).toContain("red sailor ribbon");
    expect(compiled).not.toContain("identity:");
  });

  test("projects away lower-body attire under upper body framing", () => {
    const hina = {
      ...scene,
      identityPrompt: "petite, golden blonde short hair, brilliant red eyes, black sailor uniform, red ribbon, black pleated skirt, white pantyhose"
    };
    const compiled = compileImagePrompt(DEFAULT_CONFIG, hina, cue("smile"));
    expect(compiled).toContain("golden blonde short hair");
    expect(compiled).toContain("black sailor uniform");
    expect(compiled).not.toContain("black pleated skirt");
    expect(compiled).not.toContain("white pantyhose");
  });

  test("uses only the exact closed-catalogue pose suffix, not free-form cue text", () => {
    const altered = { ...cue("smile"), action: "Mira turns", expression: "fear", promptDelta: "lantern held high" };
    const compiled = compileImagePrompt(DEFAULT_CONFIG, scene, altered);
    expect(compiled).toContain(poseById(POSE_EXPRESSION_CATALOGUE, "smile").suffix);
    expect(compiled).not.toContain("Mira turns");
    expect(compiled).not.toContain("lantern held high");
  });

  test("only the closed-catalogue pose block varies between cues", () => {
    const smile = compileImagePrompt(DEFAULT_CONFIG, scene, cue("smile"));
    const idle = compileImagePrompt(DEFAULT_CONFIG, scene, cue("idle"));
    expect(smile.replace(poseById(POSE_EXPRESSION_CATALOGUE, "smile").suffix, "POSE"))
      .toBe(idle.replace(poseById(POSE_EXPRESSION_CATALOGUE, "idle").suffix, "POSE"));
  });

  test("falls back to the first catalogue entry for absent or unknown ids", () => {
    const first = poseById(POSE_EXPRESSION_CATALOGUE, undefined);
    expect(compileImagePrompt(DEFAULT_CONFIG, scene, cue(undefined))).toContain(first.suffix);
    expect(compileImagePrompt(DEFAULT_CONFIG, scene, cue("not-a-pose"))).toContain(first.suffix);
  });
  test("compiles the negative prompt through the same Inlay selection", () => {
    const config = { ...DEFAULT_CONFIG, negativePrompt: "low quality; duplicate subject" };
    const negative = compileNegativePrompt(config, scene, cue("idle"));
    expect(negative).toContain("low quality");
    expect(negative).toContain("duplicate subject");
    expect(negative).not.toContain(";");
  });

});

describe("createAssetJobs promptFingerprint", () => {
  test("includes the pose id/suffix so different poses yield different fingerprints", () => {
    const smile = createAssetJobs(plan([cue("smile")]), DEFAULT_CONFIG)[0]!;
    const idle = createAssetJobs(plan([cue("idle")]), DEFAULT_CONFIG)[0]!;
    expect(smile.promptFingerprint).toBeString();
    expect(smile.promptFingerprint).not.toBe(idle.promptFingerprint);
  });

  test("is deterministic for a fixed pose (no clock / content drift)", () => {
    const first = createAssetJobs(plan([cue("wave")]), DEFAULT_CONFIG)[0]!.promptFingerprint;
    const second = createAssetJobs(plan([cue("wave")]), DEFAULT_CONFIG)[0]!.promptFingerprint;
    expect(first).toBe(second);
  });

  test("does not depend on free-form promptDelta", () => {
    const withEmpty = createAssetJobs(plan([cue("smile")]), DEFAULT_CONFIG)[0]!.promptFingerprint;
    const withDelta = createAssetJobs(plan([{ ...cue("smile"), promptDelta: "a completely different free-form delta" }]), DEFAULT_CONFIG)[0]!.promptFingerprint;
    expect(withEmpty).toBe(withDelta);
  });

  test("classifies monster girls and furry females as 1girl, solo", () => {
    const demonGirl = {
      ...scene,
      identityPrompt: "demon girl, red horns, black wings, fangs, gothic black dress"
    };
    const compiled = compileImagePrompt(DEFAULT_CONFIG, demonGirl, cue("smile"));
    expect(compiled).toContain("1girl, solo");
    expect(compiled).not.toContain("1other");

    const wolfGirl = {
      ...scene,
      identityPrompt: "wolf girl, fluffy wolf ears, wolf tail, school uniform"
    };
    const compiledWolf = compileImagePrompt(DEFAULT_CONFIG, wolfGirl, cue("smile"));
    expect(compiledWolf).toContain("1girl, solo");
    expect(compiledWolf).not.toContain("1other");
  });

  test("classifies male anthro/furry as 1boy, solo", () => {
    const wolfMan = {
      ...scene,
      identityPrompt: "anthro wolf male warrior, gray fur, muscular build, leather vest"
    };
    const compiled = compileImagePrompt(DEFAULT_CONFIG, wolfMan, cue("smile"));
    expect(compiled).toContain("1boy, solo");
  });

  test("applies attire override to replace clothing while keeping permanent features", () => {
    const character = {
      ...scene,
      identityPrompt: "golden blonde short hair, red eyes, cat ears, black sailor uniform, pleated skirt"
    };
    const cueWithAttire: VisualCue = {
      ...cue("smile"),
      attire: "white sundress, straw hat"
    };
    const compiled = compileImagePrompt(DEFAULT_CONFIG, character, cueWithAttire);
    expect(compiled).toContain("golden blonde short hair");
    expect(compiled).toContain("red eyes");
    expect(compiled).toContain("cat ears");
    expect(compiled).toContain("white sundress");
    expect(compiled).toContain("straw hat");
    expect(compiled).not.toContain("black sailor uniform");
  });
});

describe("Finding #1: per-cue character resolution", () => {
  test("cue character switch compiles the cue character's identity and not the scene character's", () => {
    const miraScene: SceneState = {
      ...scene,
      character: "Mira",
      identityPrompt: "silver hair, green eyes, red coat"
    };
    const miraCue: VisualCue = cue("smile");
    const rinCue: VisualCue = {
      ...cue("smile"),
      cueId: "cue-rin",
      character: "Rin"
    };
    const guestCue: VisualCue = {
      ...cue("smile"),
      cueId: "cue-guest",
      character: "Guest"
    };
    const characterAppearance = {
      Rin: "black hair, blue eyes, blue kimono"
    };

    const miraPrompt = compileImagePrompt(DEFAULT_CONFIG, miraScene, miraCue, characterAppearance);
    expect(miraPrompt).toContain("silver hair");
    expect(miraPrompt).toContain("green eyes");
    expect(miraPrompt).toContain("red coat");
    expect(miraPrompt).not.toContain("black hair");

    const rinPrompt = compileImagePrompt(DEFAULT_CONFIG, miraScene, rinCue, characterAppearance);
    expect(rinPrompt).toContain("black hair");
    expect(rinPrompt).toContain("blue eyes");
    expect(rinPrompt).toContain("blue kimono");
    expect(rinPrompt).not.toContain("silver hair");
    expect(rinPrompt).not.toContain("green eyes");
    expect(rinPrompt).not.toContain("red coat");

    // Character with no stored appearance must NOT leak Mira's traits
    const guestPrompt = compileImagePrompt(DEFAULT_CONFIG, miraScene, guestCue, characterAppearance);
    expect(guestPrompt).not.toContain("silver hair");
    expect(guestPrompt).not.toContain("green eyes");
    expect(guestPrompt).not.toContain("red coat");
  });

  test("createAssetJobs differentiates prompt fingerprints when cue character switches", () => {
    const p = TurnPlanSchema.parse({
      schemaVersion: 1,
      key,
      paragraphs: [
        { index: 0, sourceIndex: 0, text: "Mira smiles." },
        { index: 1, sourceIndex: 1, text: "Rin smiles." }
      ],
      scenes: [{ ...scene, character: "Mira", identityPrompt: "silver hair, green eyes" }],
      visualCues: [
        { ...cue("smile"), cueId: "cue-0", paragraphIndex: 0, character: "Mira", assetJobId: "job-0" },
        { ...cue("smile"), cueId: "cue-1", paragraphIndex: 1, character: "Rin", assetJobId: "job-1" }
      ],
      choices: [],
      initialContinuity: { revision: 0, characters: {}, facts: {} },
      continuityDeltas: [],
      terminalContinuity: { revision: 0, characters: {}, facts: {} },
      planningStatus: "planned",
      createdAt: now
    });
    const characterAppearance = { Rin: "black hair, blue eyes" };
    const jobs = createAssetJobs(p, DEFAULT_CONFIG, characterAppearance);
    expect(jobs[0]!.promptFingerprint).not.toBe(jobs[1]!.promptFingerprint);
  });
});

describe("Finding #2: repeated expressions generate all cues without lingering queued jobs", () => {
  test("two identical cues across paragraphs share 1 provider call and both reach generated status", async () => {
    const p = TurnPlanSchema.parse({
      schemaVersion: 1,
      key,
      paragraphs: [
        { index: 0, sourceIndex: 0, text: "First smile." },
        { index: 1, sourceIndex: 1, text: "Second smile." }
      ],
      scenes: [scene],
      visualCues: [
        { ...cue("smile"), cueId: "cue-0", paragraphIndex: 0, character: "Mira", assetJobId: "job-0" },
        { ...cue("smile"), cueId: "cue-1", paragraphIndex: 1, character: "Mira", assetJobId: "job-1" }
      ],
      choices: [],
      initialContinuity: { revision: 0, characters: {}, facts: {} },
      continuityDeltas: [],
      terminalContinuity: { revision: 0, characters: {}, facts: {} },
      planningStatus: "planned",
      createdAt: now
    });

    const calls: any[] = [];
    const spindle = {
      userStorage: { getJson: async () => null, setJson: async () => {} },
      imageGen: {
        getConnection: async () => ({ provider: "comfyui" }),
        listConnections: async () => [{ provider: "comfyui", is_default: true }],
        generate: async (input: any) => {
          calls.push(input);
          return { imageId: "img-shared", imageUrl: "/api/v1/images/img-shared" };
        }
      },
      log: { info: () => {}, warn: () => {}, error: () => {} }
    } as any;

    const initialJobs = createAssetJobs(p, DEFAULT_CONFIG);
    const finalJobs = await generateAssets(spindle, p, initialJobs, DEFAULT_CONFIG, new AbortController().signal, () => {});

    expect(calls).toHaveLength(1);
    expect(finalJobs).toHaveLength(2);
    expect(finalJobs[0]!.status).toBe("generated");
    expect(finalJobs[1]!.status).toBe("generated");
    expect(finalJobs[0]!.imageId).toBe("img-shared");
    expect(finalJobs[1]!.imageId).toBe("img-shared");
    // Acceptance check: no unexplained queued jobs
    expect(finalJobs.some((j) => j.status === "queued")).toBe(false);
  });
});

test('final length guard blocks overlong automatic or callback requests without a provider call',async()=>{
 for(const reviewed of [false,true]){
  let calls=0;const spindle={userStorage:{getJson:async(_:string,o:any)=>o.fallback},imageGen:{generate:async()=>{calls++;return {imageId:'unexpected'};}}} as any;
  const turn=plan([cue('idle')]);const config={...DEFAULT_CONFIG,referenceAnchoring:false,...(!reviewed ? {promptPrefix:'x'.repeat(3101)} : {})};
  const jobs=await generateAssets(spindle,turn,createAssetJobs(turn,config),config,new AbortController().signal,()=>{},'limit-user',reviewed ? {beforeGenerate:async(_job,request)=>({...request,prompt:'x'.repeat(3001)})} : {});
  expect(calls).toBe(0);expect(jobs[0]?.status).toBe('failed');expect(jobs[0]?.error).toContain('3,000');
 }
});

test('global shape reaches actual provider after merged settings and separates cache identities', async()=>{
 const turn=plan([cue('idle')]);
 for(const provider of ['nanogpt','openrouter']) {
  const sent:any[]=[];
  const connection={id:'shape',provider,model:'flux',updated_at:1,default_parameters:{size:'1024x1024',aspectRatio:'1:1'}};
  const spindle={userStorage:{getJson:async(_:string,o:any)=>o.fallback},imageGen:{getConnection:async()=>connection,generate:async(r:any)=>{sent.push(r);return {imageId:'image'};}}} as any;
  const config={...DEFAULT_CONFIG,imageConnectionId:'shape',referenceAnchoring:false,imageOutputAspectRatio:'9:16' as const,imageParameters:{size:'512x512',seed:17}};
  const jobs=createAssetJobs(turn,config);
  expect(jobs[0]?.promptFingerprint).not.toBe(createAssetJobs(turn,{...config,imageOutputAspectRatio:'1:1'})[0]?.promptFingerprint);
  await generateAssets(spindle,turn,jobs,config,new AbortController().signal,()=>{},'user',{beforeGenerate:async(_,request)=>{
   expect(request.parameters?.[provider==='nanogpt'?'size':'aspectRatio']).toBe(provider==='nanogpt'?'864x1536':'9:16');
   return request;
  }});
  expect(sent).toHaveLength(1);expect(sent[0].parameters.seed).toBe(17);
 }
});
