export type ReaderPreferences = {
  adjustableSheetEnabled: boolean;
  layout: "overlay" | "image-first";
  sheetSize: "compact" | "reading" | "expanded";
  backgroundOpacity: number;
  heightRatio?: number | undefined;
  theme?: ("light" | "dark") | undefined;
  typography?: ("novelist" | "modern" | "cinematic" | "retro" | "terminal" | "manga" | "fantasy" | "accessible") | undefined;
  smartPacing?: boolean | undefined;
  typewriterAudio?: ("off" | "blip" | "click" | "pip") | undefined;
  typewriterVolume?: number | undefined;
  chapterTitleCards?: boolean | undefined;
  atmosphericLighting?: boolean | undefined;
  directorAi?: boolean | undefined;
  sentimentLighting?: boolean | undefined;
  smartProseFilter?: boolean | undefined;
  smartDialogueExtraction?: boolean | undefined;
  readabilityScrim?: boolean | undefined;
};
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  adjustableSheetEnabled: false,
  layout: "overlay",
  sheetSize: "reading",
  backgroundOpacity: 0.9,
  theme: "light",
  smartProseFilter: true,
  smartDialogueExtraction: true,
  readabilityScrim: true,
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
    ...(typeof input.heightRatio === "number" && Number.isFinite(input.heightRatio) ? { heightRatio: Math.max(.12, Math.min(1, input.heightRatio)) } : {}),
    ...(typeof input.typography === "string" && ["novelist", "modern", "cinematic", "retro", "terminal", "manga", "fantasy", "accessible"].includes(input.typography) ? { typography: input.typography as ReaderPreferences["typography"] } : {}),
    ...(input.smartPacing !== undefined ? { smartPacing: input.smartPacing === true } : {}),
    ...(input.typewriterAudio === "off" || input.typewriterAudio === "blip" || input.typewriterAudio === "click" || input.typewriterAudio === "pip" ? { typewriterAudio: input.typewriterAudio } : {}),
    ...(typeof input.typewriterVolume === "number" && Number.isFinite(input.typewriterVolume) ? { typewriterVolume: Math.max(0, Math.min(1, input.typewriterVolume)) } : {}),
    ...(input.chapterTitleCards !== undefined ? { chapterTitleCards: input.chapterTitleCards === true } : {}),
    ...(input.atmosphericLighting !== undefined ? { atmosphericLighting: input.atmosphericLighting === true } : {}),
    ...(input.directorAi !== undefined ? { directorAi: input.directorAi === true } : {}),
    ...(input.sentimentLighting !== undefined ? { sentimentLighting: input.sentimentLighting === true } : {}),
    smartProseFilter: input.smartProseFilter !== undefined ? input.smartProseFilter === true : (DEFAULT_READER_PREFERENCES.smartProseFilter ?? true),
    smartDialogueExtraction: input.smartDialogueExtraction !== undefined ? input.smartDialogueExtraction === true : (DEFAULT_READER_PREFERENCES.smartDialogueExtraction ?? true),
    readabilityScrim: input.readabilityScrim !== undefined ? input.readabilityScrim === true : (DEFAULT_READER_PREFERENCES.readabilityScrim ?? true),
  };
}
const RATIOS = { compact: 0.22, reading: 0.34, expanded: 0.6 } as const;
export function sheetHeight(size: ReaderPreferences["sheetSize"], usableHeight: number, heightRatio?: number): number {
  const height = Number.isFinite(usableHeight) ? Math.max(0, usableHeight) : 224;
  return Math.round(Math.min(height, Math.max(224, height * (heightRatio ?? RATIOS[size]))));
}
export function nearestSheetSize(height: number, usableHeight: number): ReaderPreferences["sheetSize"] {
  return (Object.keys(RATIOS) as ReaderPreferences["sheetSize"][]).reduce((best, size) =>
    Math.abs(sheetHeight(size, usableHeight) - height) < Math.abs(sheetHeight(best, usableHeight) - height) ? size : best, "reading");
}
