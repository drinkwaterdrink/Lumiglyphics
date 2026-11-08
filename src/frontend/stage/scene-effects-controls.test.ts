import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { VnStage } from "./vn-stage.js";
import { FakeNode as MockNode, installFakeDocument } from "./stage-test-dom.js";
import { generateAmbientMarkup, generateCueEffectMarkup } from "./procedural-particles.js";
import { SCENE_EFFECT_CATEGORIES, ALL_SCENE_EFFECT_IDS } from "../settings/model.js";
import { normalizeConfig, DEFAULT_CONFIG } from "../../config.js";
import { AmbientEffectSchema, StageEffectSchema } from "../../shared/contracts.js";

describe("Scene Effects Controls & New Immersive Effects", () => {
  let restoreDocument: () => void;
  let mount: any;

  beforeEach(() => {
    restoreDocument = installFakeDocument();
    mount = new MockNode("div");
  });

  afterEach(() => {
    restoreDocument();
  });

  test("filmGrain config option defaults to false and sets data-vn-film-grain='false'", () => {
    const config = normalizeConfig({});
    expect(config.filmGrain).toBe(false);
    expect(DEFAULT_CONFIG.filmGrain).toBe(false);

    const stage = new VnStage({ mount });
    const root = (stage as any).root as unknown as MockNode;
    const ambient = stage.getAmbientOverlay() as unknown as MockNode;

    expect(root.dataset.vnFilmGrain).toBe("false");
    expect(ambient.dataset.vnFilmGrain).toBe("false");

    stage.setFilmGrain(true);
    expect(stage.getFilmGrain()).toBe(true);
    expect(root.dataset.vnFilmGrain).toBe("true");
    expect(ambient.dataset.vnFilmGrain).toBe("true");

    stage.setFilmGrain(false);
    expect(stage.getFilmGrain()).toBe(false);
    expect(root.dataset.vnFilmGrain).toBe("false");
    expect(ambient.dataset.vnFilmGrain).toBe("false");
  });

  test("disabledSceneEffects suppresses individual stage effects from playing", () => {
    const stage = new VnStage({ mount });
    const root = (stage as any).root as unknown as MockNode;

    // By default, shake triggers
    stage.triggerEffect("shake");
    expect(root.classList.contains("vn-shake")).toBe(true);

    // Now disable "shake"
    stage.setDisabledSceneEffects(["shake"]);
    expect(stage.getDisabledSceneEffects()).toEqual(["shake"]);

    // Clear active shake
    root.classList.remove("vn-shake");
    delete root.dataset.vnShake;

    // Triggering shake now should be a NO-OP
    stage.triggerEffect("shake");
    expect(root.classList.contains("vn-shake")).toBe(false);
    expect(root.dataset.vnShake).toBeUndefined();

    // But other non-disabled effects still work
    stage.triggerEffect("flash_white");
    const flash = stage.getFlashOverlay() as unknown as MockNode;
    expect(flash.classList.contains("vn-flash-white")).toBe(true);
  });

  test("disabledSceneEffects suppresses narrative heuristic shake", () => {
    const stage = new VnStage({ mount });
    const root = (stage as any).root as unknown as MockNode;

    stage.setDisabledSceneEffects(["shake"]);

    stage.loadTurn({
      mode: "standard",
      paragraphs: [
        {
          id: "p1",
          text: "The giant hammer hit the anvil with a deafening *THUD*!",
        },
      ],
    });

    // Because "shake" is in disabledSceneEffects, text-triggered shake does NOT fire!
    expect(root.classList.contains("vn-shake")).toBe(false);
    expect(root.dataset.vnShake).toBeUndefined();
  });

  test("disabledSceneEffects suppresses ambient weather and mood grades", () => {
    const stage = new VnStage({ mount });
    const overlay = stage.getAmbientOverlay() as unknown as MockNode;

    // Apply rain without disabling
    stage.applyAmbient("rain");
    expect(overlay.dataset.vnAmbient).toBe("rain");
    expect(overlay.className).toBe("vn-ambient-rain");

    // Disable rain
    stage.setDisabledSceneEffects(["rain"]);
    // When an active ambient is disabled, it should immediately clear!
    expect(overlay.dataset.vnAmbient).toBeUndefined();
    expect(overlay.innerHTML).toBe("");

    // Applying rain while disabled remains suppressed
    stage.applyAmbient("rain");
    expect(overlay.dataset.vnAmbient).toBeUndefined();
    expect(overlay.innerHTML).toBe("");

    // Non-disabled ambient (e.g. sunbeams) applies normally
    stage.applyAmbient("sunbeams");
    expect(overlay.dataset.vnAmbient).toBe("sunbeams");
    expect(overlay.className).toBe("vn-ambient-sunbeams");
    expect(overlay.innerHTML).toContain("vn-sunbeams-light");
  });

  test("new ambient effects generate deterministic markup within node budget", () => {
    const newAmbients = [
      "sunbeams",
      "shooting_stars",
      "autumn_leaves",
      "underwater_bubbles",
      "floating_runes",
      "snowstorm",
    ] as const;

    const nodeCount = (html: string) => (html.match(/<(?:i|b|div|svg|path|polygon|rect|g)\b/g) ?? []).length;

    for (const effect of newAmbients) {
      expect(AmbientEffectSchema.safeParse(effect).success).toBe(true);
      const html1 = generateAmbientMarkup(effect);
      const html2 = generateAmbientMarkup(effect);
      expect(html1).toBe(html2);
      expect(html1.length).toBeGreaterThan(0);
      expect(nodeCount(html1)).toBeLessThanOrEqual(120);
    }

    // Specific markup validations
    expect(generateAmbientMarkup("sunbeams")).toContain("vn-sunbeams-motes");
    expect(generateAmbientMarkup("shooting_stars")).toContain("vn-shooting-stars");
    expect(generateAmbientMarkup("autumn_leaves")).toContain("vn-autumn-leaves");
    expect(generateAmbientMarkup("underwater_bubbles")).toContain("vn-bubbles");
    expect(generateAmbientMarkup("floating_runes")).toContain("vn-floating-runes");
    expect(generateAmbientMarkup("snowstorm")).toContain("vn-snowstorm-frost");
  });

  test("new stage effects trigger and generate valid markup", () => {
    const stage = new VnStage({ mount });
    const scene = (stage as any).scene as unknown as MockNode;
    const fx = (stage as any).fxOverlay as unknown as MockNode;

    expect(StageEffectSchema.safeParse("glitch").success).toBe(true);
    expect(StageEffectSchema.safeParse("cinema_bars").success).toBe(true);

    stage.triggerEffect("glitch");
    expect(scene.classList.contains("vn-glitch")).toBe(true);
    expect(fx.innerHTML).toContain("vn-fx-glitch");

    stage.triggerEffect("cinema_bars");
    expect(fx.innerHTML).toContain("vn-cinema-bar--top");
    expect(fx.innerHTML).toContain("vn-cinema-bar--bottom");
  });

  test("SCENE_EFFECT_CATEGORIES covers all catalog effect ids and provides human descriptions", () => {
    expect(SCENE_EFFECT_CATEGORIES.length).toBeGreaterThanOrEqual(5);
    expect(ALL_SCENE_EFFECT_IDS.length).toBeGreaterThanOrEqual(35);

    // Check that every category has valid items with label and desc
    for (const cat of SCENE_EFFECT_CATEGORIES) {
      expect(cat.title.length).toBeGreaterThan(0);
      expect(cat.effects.length).toBeGreaterThan(0);
      for (const eff of cat.effects) {
        expect(eff.id.length).toBeGreaterThan(0);
        expect(eff.label.length).toBeGreaterThan(0);
        expect(eff.desc.length).toBeGreaterThan(0);
      }
    }
  });
});
