import { expect, test } from "bun:test";
import { normalizeReaderPreferences, sheetHeight, nearestSheetSize } from "./reader-preferences.js";

test("defaults match the conservative reading sheet", () => {
  const prefs = normalizeReaderPreferences({});
  expect(prefs.adjustableSheetEnabled).toBe(false);
  expect(prefs.layout).toBe("overlay");
  expect(prefs.sheetSize).toBe("reading");
  expect(prefs.backgroundOpacity).toBe(0.9);
  expect(prefs.theme).toBe("light");
});
test("roundtrips valid sizes and clamps opacity", () => {
  const prefs = normalizeReaderPreferences({
    adjustableSheetEnabled: true,
    layout: "image-first",
    sheetSize: "compact",
    backgroundOpacity: 2.5,
    heightRatio: 0.42,
    theme: "dark",
  });
  expect(prefs.adjustableSheetEnabled).toBe(true);
  expect(prefs.layout).toBe("image-first");
  expect(prefs.sheetSize).toBe("compact");
  expect(prefs.backgroundOpacity).toBe(1);
  expect(prefs.heightRatio).toBe(0.42);
  expect(prefs.theme).toBe("dark");
});
test("snap targets include readable space and stay inside the usable viewport", () => {
  expect(sheetHeight("reading", 800)).toBe(272);
  expect(sheetHeight("expanded", 800)).toBe(480);
  expect(sheetHeight("compact", 200)).toBe(200);
  expect(sheetHeight("expanded", 100)).toBe(100);
  expect(sheetHeight("expanded", NaN)).toBe(224);
  expect(nearestSheetSize(450, 800)).toBe("expanded");
});

test("customization and accessibility preferences normalize cleanly", () => {
  const prefs = normalizeReaderPreferences({
    typography: "novelist",
    smartPacing: true,
    typewriterAudio: "blip",
    typewriterVolume: 0.6,
    chapterTitleCards: true,
    atmosphericLighting: true,
    directorAi: true,
    sentimentLighting: true,
  });
  expect(prefs.typography).toBe("novelist");
  expect(prefs.smartPacing).toBe(true);
  expect(prefs.typewriterAudio).toBe("blip");
  expect(prefs.typewriterVolume).toBe(0.6);
  expect(prefs.chapterTitleCards).toBe(true);
  expect(prefs.atmosphericLighting).toBe(true);
  expect(prefs.directorAi).toBe(true);
  expect(prefs.sentimentLighting).toBe(true);
});
