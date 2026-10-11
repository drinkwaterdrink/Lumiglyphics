import { expect, test } from "bun:test";
import { normalizeReaderPreferences, sheetHeight, nearestSheetSize } from "./reader-preferences.js";

test("existing installations retain the original reader until enabled", () => {
  expect(normalizeReaderPreferences(undefined)).toEqual({ adjustableSheetEnabled: false, layout: "overlay", sheetSize: "reading", backgroundOpacity: 0.9 });
});
test("invalid preferences cannot create invisible or oversized text surfaces", () => {
  expect(normalizeReaderPreferences({ adjustableSheetEnabled: "yes", sheetSize: "huge", layout: "bad", backgroundOpacity: NaN }).backgroundOpacity).toBe(0.9);
  expect(normalizeReaderPreferences({ backgroundOpacity: 0 }).backgroundOpacity).toBe(0.35);
  expect(normalizeReaderPreferences({ backgroundOpacity: 5 }).backgroundOpacity).toBe(1);
});

test("custom heights preserve intermediate sizes across viewport changes", () => {
  const prefs = normalizeReaderPreferences({ heightRatio: .413 });
  expect(prefs.heightRatio).toBe(.413);
  expect(sheetHeight("reading", 800, prefs.heightRatio)).toBe(330);
  expect(sheetHeight("reading", 600, prefs.heightRatio)).toBe(248);
  expect(normalizeReaderPreferences({ heightRatio: NaN }).heightRatio).toBeUndefined();
  expect(sheetHeight("reading", 200, .8)).toBe(200);
});
test("snap targets include readable space and stay inside the usable viewport", () => {
  expect(sheetHeight("reading", 800)).toBe(272);
  expect(sheetHeight("expanded", 800)).toBe(480);
  expect(sheetHeight("compact", 200)).toBe(200);
  expect(sheetHeight("expanded", 100)).toBe(100);
  expect(sheetHeight("expanded", NaN)).toBe(224);
  expect(nearestSheetSize(450, 800)).toBe("expanded");
});
