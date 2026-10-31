import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  VnStage,
  isAmbientEffect,
  isStageEffect,
  TEXT_SHAKE_HEURISTIC_REGEX,
  type StageEffect,
} from "./vn-stage";
import type { VnTurnInput } from "../store";
import type { TurnView } from "../../protocol";
import { stageTurnInput } from "../host/controller";
import { generateAmbientMarkup, generateCueEffectMarkup } from "./procedural-particles";
import type { AmbientEffect } from "../store";

describe("stage effects heuristics & schemas", () => {
  test("isStageEffect validates only recognized stage effects", () => {
    expect(isStageEffect("shake")).toBe(true);
    expect(isStageEffect("flash_white")).toBe(true);
    expect(isStageEffect("flash_red")).toBe(true);
    expect(isStageEffect("zoom_in")).toBe(true);
    expect(isStageEffect("fade_to_black")).toBe(true);

    expect(isStageEffect("spin")).toBe(false);
    expect(isStageEffect("")).toBe(false);
    expect(isStageEffect(null)).toBe(false);
    expect(isStageEffect(undefined)).toBe(false);
  });

  test("TEXT_SHAKE_HEURISTIC_REGEX matches all impacts and shocks", () => {
    const hits = [
      "*thud*",
      "*THUD*",
      "*slam*",
      "*SLAM!*",
      "*crash*",
      "*CRASH*",
      "*smack*",
      "*shake*",
      "Suddenly, there was a *thud* against the window.",
      "The heavy oak door slammed shut with a violent *slam*!",
      "*Crash!* Glass scattered everywhere.",
    ];

    for (const text of hits) {
      expect(TEXT_SHAKE_HEURISTIC_REGEX.test(text)).toBe(true);
    }
  });

  test("TEXT_SHAKE_HEURISTIC_REGEX rejects non-impact narrative words", () => {
    const misses = [
      "He had a thudding headache.",
      "The car crashed into the barrier.",
      "They shook hands warmly.",
      "He took a sip of tea.",
      "Normal visual novel dialogue line.",
    ];

    for (const text of misses) {
      expect(TEXT_SHAKE_HEURISTIC_REGEX.test(text)).toBe(false);
    }
  });
});

// Parse the real shell and theme markup, including reader workspace chrome.
import { FakeNode as MockNode, installFakeDocument } from "./stage-test-dom.js";

describe("VnStage visual effects & transitions", () => {
  let restoreDocument: () => void;
  let mount: any;

  beforeEach(() => {
    restoreDocument = installFakeDocument();
    mount = new MockNode("div");
  });

  afterEach(() => {
    restoreDocument();
  });

  test("VnStage initializes with active and incoming image layers and flash overlay", () => {
    const stage = new VnStage({ mount });
    expect(stage.getActiveSceneImage()).toBeDefined();
    expect(stage.getIncomingSceneImage()).toBeDefined();
    expect(stage.getFlashOverlay()).toBeDefined();
    expect(stage.getActiveSceneImage().getAttribute("data-vn-layer")).toBe("active");
    expect(stage.getIncomingSceneImage().getAttribute("data-vn-layer")).toBe("incoming");
  });

  test("triggerEffect('shake') applies shake class and attribute then clears after 300ms", async () => {
    const stage = new VnStage({ mount });
    const root = (stage as any).root as unknown as MockNode;

    stage.triggerEffect("shake");
    expect(root.classList.contains("vn-shake")).toBe(true);
    expect(root.dataset.vnShake).toBe("true");

    await new Promise((r) => setTimeout(r, 350));
    expect(root.classList.contains("vn-shake")).toBe(false);
    expect(root.dataset.vnShake).toBeUndefined();
  });

  test("triggerEffect('flash_white') and triggerEffect('flash_red') flash overlay", async () => {
    const stage = new VnStage({ mount });
    const flash = stage.getFlashOverlay() as unknown as MockNode;

    stage.triggerEffect("flash_white");
    expect(flash.classList.contains("vn-flash-white")).toBe(true);
    expect(flash.dataset.vnFlash).toBe("white");

    await new Promise((r) => setTimeout(r, 550));
    expect(flash.classList.contains("vn-flash-white")).toBe(false);
    expect(flash.dataset.vnFlash).toBeUndefined();

    stage.triggerEffect("flash_red");
    expect(flash.classList.contains("vn-flash-red")).toBe(true);
    expect(flash.dataset.vnFlash).toBe("red");

    await new Promise((r) => setTimeout(r, 550));
    expect(flash.classList.contains("vn-flash-red")).toBe(false);
  });

  test("triggerEffect('fade_to_black') triggers blackout overlay", async () => {
    const stage = new VnStage({ mount });
    const flash = stage.getFlashOverlay() as unknown as MockNode;

    stage.triggerEffect("fade_to_black");
    expect(flash.classList.contains("vn-fade-to-black")).toBe(true);
    expect(flash.dataset.vnFlash).toBe("fade_to_black");

    await new Promise((r) => setTimeout(r, 1050));
    expect(flash.classList.contains("vn-fade-to-black")).toBe(false);
  });

  test("triggerEffect('zoom_in') applies zoom-in transform class to scene images", () => {
    const stage = new VnStage({ mount });
    const activeImg = stage.getActiveSceneImage() as unknown as MockNode;

    stage.triggerEffect("zoom_in");
    expect(activeImg.classList.contains("vn-zoom-in")).toBe(true);
    expect(activeImg.dataset.vnZoom).toBe("in");

    stage.resetZoom();
    expect(activeImg.classList.contains("vn-zoom-in")).toBe(false);
    expect(activeImg.dataset.vnZoom).toBeUndefined();
  });

  test("crossfading between scene images smoothly transitions active and incoming layers", async () => {
    const stage = new VnStage({ mount, createImage: () => ({ complete: true, naturalWidth: 100, decode: async () => {}, src: "", addEventListener() {}, removeEventListener() {} } as any) });

    // Initial image load sets active layer directly
    await stage.setSceneImage({ url: "https://example.com/scene1.png", requestId: "r1" });
    const active1 = stage.getActiveSceneImage() as unknown as MockNode;
    expect(active1.getAttribute("src")).toBe("https://example.com/scene1.png");
    expect(active1.dataset.vnEmpty).toBe("false");
    expect(stage.isCrossfading()).toBe(false);

    // Second image initiates crossfade on incoming layer
    await stage.setSceneImage({ url: "https://example.com/scene2.png", requestId: "r2" });
    const incoming = stage.getIncomingSceneImage() as unknown as MockNode;
    expect(incoming.getAttribute("src")).toBe("https://example.com/scene2.png");
    expect(incoming.dataset.vnEmpty).toBe("false");
    expect(stage.isCrossfading()).toBe(true);

    // After crossfade duration completes (350ms), incoming becomes active
    await new Promise((r) => setTimeout(r, 400));
    expect(stage.isCrossfading()).toBe(false);
    const newActive = stage.getActiveSceneImage() as unknown as MockNode;
    expect(newActive.getAttribute("src")).toBe("https://example.com/scene2.png");
    expect(newActive.getAttribute("data-vn-layer")).toBe("active");
  });

  test("paragraph rendering triggers explicit cue metadata effect", () => {
    const stage = new VnStage({ mount });
    const flash = stage.getFlashOverlay() as unknown as MockNode;

    const turn: VnTurnInput = {
      mode: "standard",
      paragraphs: [
        {
          id: "p1",
          text: "A lightning strike lit up the dark sky.",
          effect: "flash_white",
        },
      ],
    };

    stage.loadTurn(turn);
    expect(flash.classList.contains("vn-flash-white")).toBe(true);
  });

  test("paragraph rendering triggers text heuristic shake on impacts", () => {
    const stage = new VnStage({ mount });
    const root = (stage as any).root as unknown as MockNode;

    const turn: VnTurnInput = {
      mode: "standard",
      paragraphs: [
        {
          id: "p1",
          text: "With a violent *CRASH*, the vase shattered.",
        },
      ],
    };

    stage.loadTurn(turn);
    expect(root.classList.contains("vn-shake")).toBe(true);
  });

    test("renderDialogueContent does not restart rendering when state or progress updates occur", () => {
    const stage = new VnStage({ mount });
    const turn: VnTurnInput = {
      mode: "standard",
      paragraphs: [{ id: "p1", text: "Hello world paragraph." }],
    };
    stage.loadTurn(turn);
    const dialogueEl = (stage as any).dialogueText as MockNode;
    expect(dialogueEl.innerHTML).toBe("Hello world paragraph.");

    // Simulate typing in progress by altering innerHTML
    dialogueEl.innerHTML = "Hel";

    // Trigger an asset progress update (which invokes render())
    stage.setAssetProgress({ current: 1, total: 3 });

    // With the fix, because paragraph.id and formatted text did not change,
    // renderDialogueContent should NOT overwrite dialogueEl.innerHTML back to start or formatted!
    expect(dialogueEl.innerHTML).toBe("Hel");
  });

  test("continue button pops out with data-vn-ready='true' only after text is finished typing", () => {
    const stage = new VnStage({ mount });
    const turn: VnTurnInput = {
      mode: "standard",
      paragraphs: [{ id: "p1", text: "Hello world paragraph." }],
    };
    stage.loadTurn(turn);
    const contBtn = (stage as any).continueButton as MockNode;

    // After loading with instant text (or completed typing), button is ready
    expect(contBtn.dataset.vnReady).toBe("true");

    // While typing is simulated as active
    (stage as any).isTyping = true;
    (stage as any).updateContinueButton();
    expect(contBtn.dataset.vnReady).toBe("false");

    // When typing completes, button is marked ready
    (stage as any).completeTypewriter();
    expect(contBtn.dataset.vnReady).toBe("true");
  });
});


describe("extended stage effects & ambient overlays", () => {
  let restoreDocument: () => void;
  let mount: any;

  beforeEach(() => {
    restoreDocument = installFakeDocument();
    mount = new MockNode("div");
  });

  afterEach(() => {
    restoreDocument();
  });

  test("isStageEffect accepts every extended effect id", () => {
    const ids: StageEffect[] = [
      "shake", "flash_white", "flash_red", "zoom_in", "fade_to_black",
      "shake_hard", "rumble", "zoom_punch", "speed_lines", "fade_from_black",
      "fade_to_white", "lightning", "zoom_out", "tilt", "heartbeat",
      "blur_pulse", "sparkle_burst", "hearts_burst", "confetti",
    ];
    for (const id of ids) expect(isStageEffect(id)).toBe(true);
    expect(isStageEffect("explode")).toBe(false);
  });

  test("isAmbientEffect accepts exactly the ambient catalogue", () => {
    const ids = [
      "rain", "heavy_rain", "snow", "sakura", "fog", "fireflies", "embers",
      "vignette_dark", "sepia_flashback", "desaturate", "dream_haze", "danger_pulse",
    ];
    for (const id of ids) expect(isAmbientEffect(id)).toBe(true);
    expect(isAmbientEffect("shake")).toBe(false);
    expect(isAmbientEffect(null)).toBe(false);
    expect(isAmbientEffect("")).toBe(false);
  });

  test("shake_hard and rumble apply and clear their classes", async () => {
    const stage = new VnStage({ mount });
    const root = (stage as any).root as unknown as MockNode;
    stage.triggerEffect("shake_hard");
    expect(root.classList.contains("vn-shake-hard")).toBe(true);
    expect(root.dataset.vnShake).toBe("hard");
    await new Promise((r) => setTimeout(r, 560));
    expect(root.classList.contains("vn-shake-hard")).toBe(false);
    stage.triggerEffect("rumble");
    expect(root.classList.contains("vn-rumble")).toBe(true);
    expect(root.dataset.vnShake).toBe("rumble");
    await new Promise((r) => setTimeout(r, 860));
    expect(root.classList.contains("vn-rumble")).toBe(false);
  });

  test("zoom_out persists until reset; zoom_punch and tilt are timed", async () => {
    const stage = new VnStage({ mount });
    const scene = (stage as any).scene as unknown as MockNode;
    stage.triggerEffect("zoom_out");
    expect(scene.dataset.vnZoom).toBe("out");
    stage.resetZoom();
    expect(scene.dataset.vnZoom).toBeUndefined();

    stage.triggerEffect("zoom_punch");
    expect(scene.dataset.vnZoom).toBe("punch");
    expect(scene.classList.contains("vn-zoom-punch")).toBe(true);
    await new Promise((r) => setTimeout(r, 510));
    expect(scene.classList.contains("vn-zoom-punch")).toBe(false);

    stage.triggerEffect("tilt");
    expect(scene.dataset.vnTilt).toBe("true");
    await new Promise((r) => setTimeout(r, 760));
    expect(scene.dataset.vnTilt).toBeUndefined();
  });

  test("flash presets fade_from_black / fade_to_white / lightning drive the flash overlay", async () => {
    const stage = new VnStage({ mount });
    const flash = stage.getFlashOverlay() as unknown as MockNode;
    stage.triggerEffect("fade_from_black");
    expect(flash.dataset.vnFlash).toBe("fade_from_black");
    stage.triggerEffect("lightning");
    expect(flash.dataset.vnFlash).toBe("lightning");
    await new Promise((r) => setTimeout(r, 610));
    expect(flash.dataset.vnFlash).toBeUndefined();
  });

  test("particle bursts mount procedural particles into the fx overlay and clear after their duration", async () => {
    const stage = new VnStage({ mount });
    const fx = stage.getFxOverlay() as unknown as MockNode;
    stage.triggerEffect("sparkle_burst");
    expect(fx.dataset.vnEffect).toBe("sparkle_burst");
    expect(fx.innerHTML).toContain('class="vn-burst vn-burst--sparkle"');
    expect(fx.innerHTML).toContain("vn-sparkle");
    await new Promise((r) => setTimeout(r, 910));
    expect(fx.dataset.vnEffect).toBeUndefined();
    expect(fx.innerHTML).toBe("");

    stage.triggerEffect("confetti");
    expect(fx.dataset.vnEffect).toBe("confetti");
    expect(fx.innerHTML).toContain("vn-confetti-piece");

    stage.triggerEffect("speed_lines");
    expect(fx.dataset.vnEffect).toBe("speed_lines");
    expect(fx.innerHTML).toContain("<svg");
  });

  test("lightning pairs the double flash with a drawn bolt that self-clears", async () => {
    const stage = new VnStage({ mount });
    const fx = stage.getFxOverlay() as unknown as MockNode;
    const flash = stage.getFlashOverlay() as unknown as MockNode;
    stage.triggerEffect("lightning");
    expect(flash.dataset.vnFlash).toBe("lightning");
    expect(fx.dataset.vnEffect).toBe("lightning");
    expect(fx.innerHTML).toContain("vn-bolt");
    await new Promise((r) => setTimeout(r, 610));
    expect(flash.dataset.vnFlash).toBeUndefined();
    expect(fx.dataset.vnEffect).toBeUndefined();
    expect(fx.innerHTML).toBe("");
  });

  test("effect intensity 'off' leaves the fx overlay untouched", () => {
    const stage = new VnStage({ mount });
    const fx = stage.getFxOverlay() as unknown as MockNode;
    stage.setEffectIntensity("off");
    stage.triggerEffect("lightning");
    stage.triggerEffect("confetti");
    expect(fx.innerHTML).toBe("");
    expect(fx.dataset.vnEffect).toBeUndefined();
  });

  test("resetEffects clears a running burst immediately", () => {
    const stage = new VnStage({ mount });
    const fx = stage.getFxOverlay() as unknown as MockNode;
    stage.triggerEffect("hearts_burst");
    expect(fx.innerHTML).not.toBe("");
    stage.resetEffects();
    expect(fx.innerHTML).toBe("");
    expect(fx.dataset.vnEffect).toBeUndefined();
  });

  test("applyAmbient mounts weather markup, persists across paragraph advance, and clears on reset", () => {
    const stage = new VnStage({ mount });
    const scene = (stage as any).scene as unknown as MockNode;
    const overlay = stage.getAmbientOverlay() as unknown as MockNode;

    stage.loadTurn({ mode: "standard", paragraphs: [{ id: "p-rain", text: "Rain hammers the roof." }], choices: [], ambient: "rain" } as VnTurnInput);
    expect(stage.getCurrentAmbient()).toBe("rain");
    expect(scene.dataset.vnSceneAmbient).toBe("rain");
    expect(overlay.dataset.vnAmbient).toBe("rain");
    expect(overlay.innerHTML).toContain("vn-rain-bg");

    // Ambient survives loading a turn that does not mention ambient.
    stage.loadTurn({ mode: "standard", paragraphs: [{ id: "p0", text: "Hello." }], choices: [] } as VnTurnInput);
    expect(stage.getCurrentAmbient()).toBe("rain");

    // A turn with ambient: null explicitly clears it.
    stage.loadTurn({ mode: "standard", paragraphs: [{ id: "p1", text: "Later." }], choices: [], ambient: null } as VnTurnInput);
    expect(stage.getCurrentAmbient()).toBe(null);
    expect(overlay.innerHTML).toBe("");
    expect(scene.dataset.vnSceneAmbient).toBeUndefined();
  });

  test("heavy_rain markup carries the wet-lens droplets; mood grades mount without SVG", () => {
    const stage = new VnStage({ mount });
    const overlay = stage.getAmbientOverlay() as unknown as MockNode;
    stage.applyAmbient("heavy_rain");
    expect(overlay.innerHTML).toContain("data-vn-lens-droplets");
    stage.applyAmbient("vignette_dark");
    expect(overlay.dataset.vnAmbient).toBe("vignette_dark");
    expect(overlay.innerHTML).toBe("");
    stage.applyAmbient(null);
    expect(overlay.dataset.vnAmbient).toBeUndefined();
  });

  function hostView(overrides: Partial<TurnView> = {}): TurnView {
    return {
      chatId: "chat", messageId: "message", swipeId: 0,
      sourceFingerprint: "fp", revision: 1, speaker: "Mira",
      paragraphs: ["Outside.", "Inside.", "Later."],
      choices: [], assets: [], status: "ready", ...overrides
    };
  }

  test("host stage input preserves omitted ambient data and forwards explicit clears", () => {
    const stage = new VnStage({ mount, textSpeed: 0 });
    try {
      stage.loadTurn(stageTurnInput(hostView({ ambients: ["rain", "rain", "rain"] }), "standard", true));
      expect(stage.getCurrentAmbient()).toBe("rain");
      const omitted = stageTurnInput(hostView({ sourceFingerprint: "next" }), "standard", true);
      expect(Object.hasOwn(omitted, "ambient")).toBe(false);
      expect(Object.hasOwn(omitted.paragraphs[0]!, "ambient")).toBe(false);
      stage.loadTurn(omitted);
      expect(stage.getCurrentAmbient()).toBe("rain");
      const cleared = stageTurnInput(hostView({ sourceFingerprint: "clear", ambients: [null, null, null] }), "standard", true);
      expect(cleared.ambient).toBeNull();
      stage.loadTurn(cleared);
      expect(stage.getCurrentAmbient()).toBeNull();
      expect((stage.getAmbientOverlay() as unknown as MockNode).innerHTML).toBe("");
    } finally { stage.destroy(); }
  });

  test("host paragraph ambient clears on advance, restores on rewind, and clears again", () => {
    const stage = new VnStage({ mount, textSpeed: 0 });
    try {
      stage.loadTurn(stageTurnInput(hostView({ ambients: ["rain", null, "snow"], effects: [null, "flash_white", null] }), "standard", true));
      expect(stage.getCurrentAmbient()).toBe("rain");
      (stage as any).advance();
      expect(stage.getCurrentAmbient()).toBeNull();
      expect((stage.getFlashOverlay() as unknown as MockNode).dataset.vnFlash).toBe("white");
      stage.previous();
      expect(stage.getCurrentAmbient()).toBe("rain");
      expect((stage.getFlashOverlay() as unknown as MockNode).dataset.vnFlash).toBeUndefined();
      (stage as any).advance();
      expect(stage.getCurrentAmbient()).toBeNull();
      (stage as any).advance();
      expect(stage.getCurrentAmbient()).toBe("snow");
    } finally { stage.destroy(); }
  });

  test("paragraph ambient null overrides cue ambient while omission falls back to cue", () => {
    const stage = new VnStage({ mount, textSpeed: 0 });
    try {
      stage.loadTurn({ mode: "standard", ambient: "rain", paragraphs: [
        { id: "clear", text: "Inside.", ambient: null, cue: { ambient: "snow" } },
        { id: "cue", text: "Outside.", cue: { ambient: "fog" } },
        { id: "keep", text: "Still outside." }
      ] });
      expect(stage.getCurrentAmbient()).toBeNull();
      (stage as any).advance();
      expect(stage.getCurrentAmbient()).toBe("fog");
      (stage as any).advance();
      expect(stage.getCurrentAmbient()).toBe("fog");
    } finally { stage.destroy(); }
  });

  test("reset clears ambient state entirely", () => {
    const stage = new VnStage({ mount });
    stage.applyAmbient("snow");
    expect(stage.getCurrentAmbient()).toBe("snow");
    stage.reset();
    expect(stage.getCurrentAmbient()).toBe(null);
  });
});


describe("procedural particle markup", () => {
  const WEATHER: AmbientEffect[] = ["rain", "heavy_rain", "snow", "sakura", "fog", "fireflies", "embers"];
  const GRADES: AmbientEffect[] = ["vignette_dark", "sepia_flashback", "desaturate", "dream_haze", "danger_pulse"];
  const BURSTS: StageEffect[] = ["speed_lines", "sparkle_burst", "hearts_burst", "confetti", "lightning"];
  const nodeCount = (html: string) => (html.match(/<(?:i|b|div|svg|path|polygon|rect|g)\b/g) ?? []).length;
  const particles = (html: string) => (html.match(/class="vn-pt /g) ?? []).length;

  test("markup is deterministic (byte-identical across calls)", () => {
    for (const id of WEATHER) expect(generateAmbientMarkup(id)).toBe(generateAmbientMarkup(id));
    for (const id of BURSTS) expect(generateCueEffectMarkup(id)).toBe(generateCueEffectMarkup(id));
  });

  test("weather fields stay within the node budget and are not empty", () => {
    for (const id of WEATHER) {
      const html = generateAmbientMarkup(id);
      expect(html.length).toBeGreaterThan(0);
      expect(nodeCount(html)).toBeLessThanOrEqual(120);
    }
    // Particle fields carry enough particles to read as weather.
    expect(particles(generateAmbientMarkup("snow"))).toBeGreaterThanOrEqual(60);
    expect(particles(generateAmbientMarkup("sakura"))).toBeGreaterThanOrEqual(30);
    expect(particles(generateAmbientMarkup("fireflies"))).toBeGreaterThanOrEqual(16);
    expect(particles(generateAmbientMarkup("embers"))).toBeGreaterThanOrEqual(30);
    // Rain is two scrolling tile sheets (back + soft front), not hundreds of nodes.
    expect((generateAmbientMarkup("rain").match(/class="vn-rain-layer /g) ?? []).length).toBe(2);
    expect((generateAmbientMarkup("heavy_rain").match(/class="vn-rain-layer /g) ?? []).length).toBe(2);
  });

  test("bursts stay within the node budget", () => {
    for (const id of BURSTS) {
      const html = generateCueEffectMarkup(id);
      expect(html.length).toBeGreaterThan(0);
      expect(nodeCount(html)).toBeLessThanOrEqual(170);
    }
    expect(generateCueEffectMarkup("shake")).toBe("");
    expect(generateCueEffectMarkup("flash_white")).toBe("");
  });

  test("mood grades mount no markup (pure CSS)", () => {
    for (const id of GRADES) expect(generateAmbientMarkup(id)).toBe("");
  });

  test("stratified columns cover the full width for every particle layer", () => {
    for (const id of ["snow", "sakura", "embers", "fireflies"] as AmbientEffect[]) {
      const lefts = [...generateAmbientMarkup(id).matchAll(/class="vn-pt [^"]*" style="left:([\d.]+)%/g)].map((m) => Number(m[1]));
      expect(lefts.length).toBeGreaterThan(10);
      const deciles = new Set(lefts.map((x) => Math.min(9, Math.floor(x / 10))));
      expect(deciles.size).toBe(10);
    }
  });

  test("seeded values stay inside their declared ranges", () => {
    // Opacity attributes on speed lines are seeded in [0.55, 0.95].
    const opacities = [...generateCueEffectMarkup("speed_lines").matchAll(/\sopacity="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(opacities.length).toBeGreaterThan(60);
    for (const o of opacities) {
      expect(o).toBeGreaterThanOrEqual(0.55);
      expect(o).toBeLessThanOrEqual(0.95);
    }
    // Particle sizes are seeded positive px values.
    for (const id of ["snow", "sakura", "embers", "fireflies"] as AmbientEffect[]) {
      for (const m of generateAmbientMarkup(id).matchAll(/--sz:([\d.-]+)px/g)) expect(Number(m[1])).toBeGreaterThan(2);
    }
  });

  test("speed lines keep a clear centre", () => {
    const html = generateCueEffectMarkup("speed_lines");
    const tips = [...html.matchAll(/points="([\d.-]+),([\d.-]+) /g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(tips.length).toBeGreaterThanOrEqual(60);
    for (const [x, y] of tips) {
      const r = Math.hypot((x - 400) / 400, (y - 300) / 300);
      expect(r).toBeGreaterThanOrEqual(0.49);
    }
  });

  test("markup only references inline data URIs (no network assets)", () => {
    const all = [...WEATHER.map(generateAmbientMarkup), ...BURSTS.map(generateCueEffectMarkup)].join("");
    expect(all).not.toMatch(/https?:/i);
    for (const m of all.matchAll(/url\(([^)]*)\)/g)) {
      expect(m[1]!.startsWith("data:image/svg+xml;base64,") || m[1]!.startsWith("#")).toBe(true);
    }
  });

  test("rain tiles are seeded per depth and differ between rain and heavy_rain", () => {
    const tiles = (html: string) => [...html.matchAll(/--tile:url\(([^)]*)\)/g)].map((m) => m[1]);
    const light = tiles(generateAmbientMarkup("rain"));
    const heavy = tiles(generateAmbientMarkup("heavy_rain"));
    expect(new Set(light).size).toBe(2);
    expect(new Set(heavy).size).toBe(2);
    for (const t of light) expect(heavy).not.toContain(t);
  });
});
