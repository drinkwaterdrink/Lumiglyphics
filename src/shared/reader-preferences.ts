export const READER_DIALOGUE_STYLES = [
  "preset",
  "glass-card",
  "cinema-bar",
  "editorial-page",
  "terminal-hud",
] as const;

export type ReaderDialogueStyle = (typeof READER_DIALOGUE_STYLES)[number];

export type ReaderPreferences = {
  adjustableSheetEnabled: boolean;
  layout: "overlay" | "image-first";
  sheetSize: "compact" | "reading" | "expanded";
  backgroundOpacity: number;
  heightRatio?: number | undefined;
  theme?: ("light" | "dark") | undefined;
  typography?: ("novelist" | "modern" | "cinematic" | "retro" | "terminal" | "manga" | "fantasy" | "accessible") | undefined;
  dialogueStyle?: ReaderDialogueStyle | undefined;
  smartPacing?: boolean | undefined;
  typewriterAudio?: ("off" | "blip" | "click" | "pip") | undefined;
  typewriterVolume?: number | undefined;
  chapterTitleCards?: boolean | undefined;
  atmosphericLighting?: boolean | undefined;
  directorAi?: boolean | undefined;
  sentimentLighting?: boolean | undefined;
  smartProseFilter?: boolean | undefined;
  smartDialogueExtraction?: boolean | undefined;
  smartBeatSegmentation?: boolean | undefined;
  readabilityScrim?: boolean | undefined;
  virtualCameraEnabled?: boolean | undefined;
  confidantCutInsEnabled?: boolean | undefined;
  adaptiveTint?: boolean | undefined;
};
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  adjustableSheetEnabled: false,
  layout: "overlay",
  sheetSize: "reading",
  backgroundOpacity: 0.9,
  theme: "light",
  smartProseFilter: true,
  smartDialogueExtraction: true,
  smartBeatSegmentation: true,
  readabilityScrim: true,
  virtualCameraEnabled: true,
  confidantCutInsEnabled: true,
  adaptiveTint: true,
};
export function normalizeReaderPreferences(value: unknown): ReaderPreferences {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    adjustableSheetEnabled: input.adjustableSheetEnabled === true,
    layout: input.layout === "image-first" ? "image-first" : "overlay",
    sheetSize: input.sheetSize === "compact" || input.sheetSize === "expanded" ? input.sheetSize : "reading",
    backgroundOpacity: typeof input.backgroundOpacity === "number" && Number.isFinite(input.backgroundOpacity)
      ? Math.max(0, Math.min(1, input.backgroundOpacity)) : 0.9,
    theme: input.theme === "dark" ? "dark" : "light",
    ...(typeof input.heightRatio === "number" && Number.isFinite(input.heightRatio) ? { heightRatio: Math.max(.05, Math.min(1, input.heightRatio)) } : {}),
    ...(typeof input.typography === "string" && ["novelist", "modern", "cinematic", "retro", "terminal", "manga", "fantasy", "accessible"].includes(input.typography) ? { typography: input.typography as ReaderPreferences["typography"] } : {}),
    ...(typeof input.dialogueStyle === "string" && (READER_DIALOGUE_STYLES as readonly string[]).includes(input.dialogueStyle) ? { dialogueStyle: input.dialogueStyle as ReaderDialogueStyle } : {}),
    ...(input.smartPacing !== undefined ? { smartPacing: input.smartPacing === true } : {}),
    ...(input.typewriterAudio === "off" || input.typewriterAudio === "blip" || input.typewriterAudio === "click" || input.typewriterAudio === "pip" ? { typewriterAudio: input.typewriterAudio } : {}),
    ...(typeof input.typewriterVolume === "number" && Number.isFinite(input.typewriterVolume) ? { typewriterVolume: Math.max(0, Math.min(1, input.typewriterVolume)) } : {}),
    ...(input.chapterTitleCards !== undefined ? { chapterTitleCards: input.chapterTitleCards === true } : {}),
    ...(input.atmosphericLighting !== undefined ? { atmosphericLighting: input.atmosphericLighting === true } : {}),
    ...(input.directorAi !== undefined ? { directorAi: input.directorAi === true } : {}),
    ...(input.sentimentLighting !== undefined ? { sentimentLighting: input.sentimentLighting === true } : {}),
    smartProseFilter: input.smartProseFilter !== undefined ? input.smartProseFilter === true : (DEFAULT_READER_PREFERENCES.smartProseFilter ?? true),
    smartDialogueExtraction: input.smartDialogueExtraction !== undefined ? input.smartDialogueExtraction === true : (DEFAULT_READER_PREFERENCES.smartDialogueExtraction ?? true),
    smartBeatSegmentation: input.smartBeatSegmentation !== undefined ? input.smartBeatSegmentation === true : (DEFAULT_READER_PREFERENCES.smartBeatSegmentation ?? true),
    readabilityScrim: input.readabilityScrim !== undefined ? input.readabilityScrim === true : (DEFAULT_READER_PREFERENCES.readabilityScrim ?? true),
    virtualCameraEnabled: input.virtualCameraEnabled !== undefined ? input.virtualCameraEnabled === true : (DEFAULT_READER_PREFERENCES.virtualCameraEnabled ?? true),
    confidantCutInsEnabled: input.confidantCutInsEnabled !== undefined ? input.confidantCutInsEnabled === true : (DEFAULT_READER_PREFERENCES.confidantCutInsEnabled ?? true),
    adaptiveTint: input.adaptiveTint !== undefined ? input.adaptiveTint === true : (DEFAULT_READER_PREFERENCES.adaptiveTint ?? true),
  };
}
export const MOBILE_SHEET_DETENTS = { compact: 48, reading: 142, expandedRatio: 0.65 } as const;
const RATIOS = { compact: 0.22, reading: 0.34, expanded: 0.6 } as const;
export function sheetHeight(size: ReaderPreferences["sheetSize"], usableHeight: number, heightRatio?: number): number {
  const height = Number.isFinite(usableHeight) ? Math.max(0, usableHeight) : 224;
  return Math.round(Math.min(height, Math.max(224, height * (heightRatio ?? RATIOS[size]))));
}
/** Computes pixel height for the 3-detent mobile DialogueSheet (Peek 48px / Reader 142px / Expanded 65vh). */
export function mobileSheetDetentHeight(
  size: ReaderPreferences["sheetSize"],
  usableHeight: number,
  readerHeight?: number,
): number {
  const usable = Number.isFinite(usableHeight) ? Math.max(MOBILE_SHEET_DETENTS.compact, usableHeight) : MOBILE_SHEET_DETENTS.reading;
  if (size === "compact") return Math.min(usable, MOBILE_SHEET_DETENTS.compact);
  if (size === "reading") return Math.min(usable, MOBILE_SHEET_DETENTS.reading);
  const full = Number.isFinite(readerHeight) && (readerHeight ?? 0) > 0 ? readerHeight! : usable;
  return Math.min(usable, Math.max(MOBILE_SHEET_DETENTS.reading, Math.round(full * MOBILE_SHEET_DETENTS.expandedRatio)));
}
/** Snaps an arbitrary mobile sheet drag height to the nearest Peek / Reader / Expanded detent. */
export function snapMobileSheetDetent(
  height: number,
  usableHeight: number,
  readerHeight?: number,
): { detent: ReaderPreferences["sheetSize"]; px: number } {
  const candidates: Array<{ detent: ReaderPreferences["sheetSize"]; px: number }> = (
    ["compact", "reading", "expanded"] as const
  ).map((detent) => ({
    detent,
    px: mobileSheetDetentHeight(detent, usableHeight, readerHeight),
  }));
  return candidates.reduce((best, item) =>
    Math.abs(item.px - height) < Math.abs(best.px - height) ? item : best
  );
}
export function nearestSheetSize(height: number, usableHeight: number): ReaderPreferences["sheetSize"] {
  return (Object.keys(RATIOS) as ReaderPreferences["sheetSize"][]).reduce((best, size) =>
    Math.abs(sheetHeight(size, usableHeight) - height) < Math.abs(sheetHeight(best, usableHeight) - height) ? size : best, "reading");
}
