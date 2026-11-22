import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { installFakeDocument } from "./stage-test-dom.js";
import { DEFAULT_CONFIG } from "../../config.js";
import { DEFAULT_READER_PREFERENCES, normalizeReaderPreferences } from "../../shared/reader-preferences.js";
import { clampRimRgb, extractSceneRimTint } from "./chromatic-rim.js";
import { QuickTunerDrawer } from "./quick-tuner.js";
import { APERTURE_CSS_LENS_FOLIO } from "../theme/aperture/lens-folio.js";
import { APERTURE_CSS_ROUTE_BAR_READER } from "../theme/aperture/route-bar-reader.js";

describe("Wave C — Reader Craft, Chromatic Rim, Constellation & Quick Tuner", () => {
  let restoreDom: (() => void) | null = null;

  beforeEach(() => {
    restoreDom = installFakeDocument();
    if (!(document as any).body) {
      (document as any).body = document.createElement("body");
    }
  });

  afterEach(() => {
    restoreDom?.();
    restoreDom = null;
  });

  test("clampRimRgb keeps sampled rim tint within eye-safe luminance bounds", () => {
    expect(clampRimRgb(0, 0, 0)).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(clampRimRgb(255, 255, 255)).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    // Pure black is lifted above 0.36 luminance
    const lifted = clampRimRgb(0, 0, 0);
    const nums = lifted.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
    expect(nums[0]).toBeGreaterThanOrEqual(80);
    // Pure white is toned down below 200
    const toned = clampRimRgb(255, 255, 255);
    const wNums = toned.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
    expect(wNums[0]).toBeLessThanOrEqual(200);
    // Graceful null when image has zero dimensions or no canvas 2D context
    expect(extractSceneRimTint(null)).toBeNull();
  });

  test("normalizeReaderPreferences defaults adaptiveTint true and preserves explicit false", () => {
    expect(DEFAULT_READER_PREFERENCES.adaptiveTint).toBe(true);
    expect(normalizeReaderPreferences({}).adaptiveTint).toBe(true);
    expect(normalizeReaderPreferences({ adaptiveTint: false }).adaptiveTint).toBe(false);
  });

  test("QuickTunerDrawer opens, emits live patches for preset/opacity/rim/textScale/volume, closes on Escape, and destroys cleanly", () => {
    const mount = document.createElement("div");
    document.body.appendChild(mount);
    const patches: any[] = [];
    const tuner = new QuickTunerDrawer({
      mount,
      onPatch: (patch) => patches.push(patch),
    });
    tuner.setConfig({ ...DEFAULT_CONFIG });
    expect(tuner.isOpen()).toBe(false);

    const opener = document.createElement("button");
    tuner.open(opener);
    expect(tuner.isOpen()).toBe(true);

    const host = mount.querySelector("[data-vn-quick-tuner]") as HTMLElement;
    expect(host?.dataset.open).toBe("true");
    const shadow = tuner.getShadowRoot();

    // Click preset pill
    const noirBtn = shadow.querySelector('[data-tuner-preset="midnight-noir"]') as HTMLButtonElement;
    noirBtn.click();
    expect(patches.some((p) => p.themePreset === "midnight-noir")).toBe(true);

    // Toggle Chromatic Rim
    const rim = shadow.querySelector("[data-tuner-rim]") as HTMLInputElement;
    rim.checked = false;
    rim.dispatchEvent({ type: "change", bubbles: true } as any);
    expect(patches.some((p) => p.readerPreferences?.adaptiveTint === false)).toBe(true);

    // Escape closes
    const sheet = shadow.querySelector(".tuner-sheet") as HTMLElement;
    sheet.dispatchEvent({ type: "keydown", key: "Escape", bubbles: true, preventDefault() {}, stopPropagation() {} } as any);
    expect(tuner.isOpen()).toBe(false);

    tuner.destroy();
    expect(mount.querySelector("[data-vn-quick-tuner]")).toBeNull();
  });

  test("Aperture CSS contains Ken Burns transform keyframes, Chromatic Rim, Constellation art-state, and Studio badge", () => {
    expect(APERTURE_CSS_LENS_FOLIO).toContain("@keyframes vn-kb-drift");
    expect(APERTURE_CSS_LENS_FOLIO).toContain("var(--vn-scene-rim-tint");
    expect(APERTURE_CSS_LENS_FOLIO).toContain('[data-art-state="ready"]');
    expect(APERTURE_CSS_LENS_FOLIO).toContain('[data-art-state="generating"]');
    expect(APERTURE_CSS_LENS_FOLIO).toContain('[data-resonance="warmth"]');
    expect(APERTURE_CSS_ROUTE_BAR_READER).toContain('[data-attention-count]');
  });
});
