import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { THEME_PRESET_IDS } from "../../config.js";
import { THEME_PRESET_LABELS, THEME_PRESET_OPTIONS } from "./panel";
import { TEXT_EFFECT_CATALOGUE } from "../../shared/text-effects.js";

describe("theme preset settings options", () => {
  test("the selector exposes all canonical presets", () => {
    expect(THEME_PRESET_OPTIONS.map(({ value }) => value)).toEqual([...THEME_PRESET_IDS]);
    expect(THEME_PRESET_OPTIONS.length).toBe(THEME_PRESET_IDS.length);
  });

  test("every option carries a non-empty, distinct label", () => {
    for (const option of THEME_PRESET_OPTIONS) {
      expect(option.value).toBeTruthy();
      expect(option.label.trim().length).toBeGreaterThan(0);
    }
    const labels = THEME_PRESET_OPTIONS.map(({ label }) => label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("the label map covers every canonical preset id", () => {
    for (const id of THEME_PRESET_IDS) {
      expect(THEME_PRESET_LABELS[id].trim().length).toBeGreaterThan(0);
    }
  });
  test("lumiverse is the default host-token entry and is labelled as the host default", () => {
    expect(THEME_PRESET_LABELS.lumiverse).toMatch(/host default/i);
    expect(THEME_PRESET_OPTIONS[0]?.value).toBe("lumiverse");
  });
});

describe("settings panel markup", () => {
  const source = readFileSync(new URL("./panel.ts", import.meta.url), "utf8");
  const names = [...source.matchAll(/name="([A-Za-z]+)"/g)].map((match) => match[1]!);
  const advancedBlock = /const ADVANCED_KEYS = \[([\s\S]*?)\] as const;/.exec(source)![1]!;
  const advancedKeys = [...advancedBlock.matchAll(/"([A-Za-z]+)"/g)].map((match) => match[1]!);

  test("every Advanced key has exactly one control", () => {
    expect(advancedKeys.length).toBeGreaterThan(20);
    for (const key of advancedKeys) expect(names.filter((name) => name === key)).toEqual([key]);
  });

  test("everyday controls appear once (radio groups once per option list)", () => {
    for (const name of ["mode", "skipMode", "generateChoices", "autoEnter", "referenceAnchoring", "parserConnectionId", "imageConnectionId",
      "textSpeed", "autoPlayDelay", "textScale", "maxImagesPerTurn", "bgmVolume", "sfxVolume", "systemOneApiKey",
      "novelAiSteps", "novelAiGuidance", "novelAiSampler", "novelAiSeed", "novelAiWidth", "novelAiHeight"]) {
      expect(names.filter((candidate) => candidate === name)).toEqual([name]);
    }
  });

  test("the text effects mode control exists and saves as an everyday patch", () => {
    expect(source).toContain('optionList("textEffects", TEXT_EFFECT_MODE_OPTIONS)');
    expect(source).toContain('case "textEffects": return { textEffects: normalizeTextEffects(target.value) };');
    expect(advancedKeys).not.toContain("textEffects");
  });

  test("the text effects reference renders from the shared catalogue, not a copy", () => {
    expect(source).toContain("TEXT_EFFECT_CATALOGUE.map(");
    expect(source).toContain("applyTextEffects(preview)");
    expect(source).toContain("VN_TEXT_EFFECTS_CSS");
    expect(TEXT_EFFECT_CATALOGUE.length).toBeGreaterThan(0);
  });

  test("there are no network assets in the panel styles", () => {
    expect(source).not.toMatch(/url\(\s*["']?https?:/i);
    expect(source).not.toMatch(/@import/i);
  });
  test("modern reading and audio toggles have dedicated controls with search find tags", () => {
    for (const name of ["smartPacing", "chapterTitleCards", "typewriterAudio", "typewriterVolume", "readerTypography", "atmosphericLighting", "directorAi", "sentimentLighting", "smartProseFilter", "smartDialogueExtraction"]) {
      expect(names.filter((candidate) => candidate === name)).toEqual([name]);
    }
    expect(source).toContain('find("Intelligent dramatic pacing"');
    expect(source).toContain('find("Cinematic chapter cards"');
    expect(source).toContain('find("Director AI shot framing"');
    expect(source).toContain('find("Contextual sentiment lighting"');
    expect(source).toContain('find("Typewriter sound"');
    expect(source).toContain('find("Typewriter sound volume"');
    expect(source).toContain('find("Reading typography"');
    expect(source).toContain('find("Dynamic atmospheric lighting"');
    expect(source).toContain('find("Smart prose & metadata filter"');
    expect(source).toContain('find("Smart preset dialogue extraction"');
  });
  test("appearance preview does not use unsafe non-null assertions on removed details element", () => {
    expect(source).not.toContain("data-appearance-preview']!");
    expect(source).not.toContain('data-appearance-preview"]!');
  });
});

test("the data-flow list escapes a crafted System One host name", async () => {
  const { describeDataFlows } = await import("../../shared/data-flows.js");
  const { html } = await import("../dom/html.js");
  const flows = describeDataFlows({ enabled: true, generateImages: false, useNativeCardImages: false, systemOneMode: "on", systemOneApiUrl: "<img src=x onerror=alert(1)>", speech: { enabled: false } });
  const markup = html`<ul>${flows.map((flow) => html`<li>${flow.destination}</li>`)}</ul>`.value;
  expect(markup).not.toContain("<img");
  expect(markup).toContain("&lt;img");
});
