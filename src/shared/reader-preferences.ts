export type ReaderPreferences = {
  adjustableSheetEnabled: boolean;
  layout: "overlay" | "image-first";
  sheetSize: "compact" | "reading" | "expanded";
  backgroundOpacity: number;
  heightRatio?: number;
};
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  adjustableSheetEnabled: false, layout: "overlay", sheetSize: "reading", backgroundOpacity: 0.12,
};
export function normalizeReaderPreferences(value: unknown): ReaderPreferences {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    adjustableSheetEnabled: input.adjustableSheetEnabled === true,
    layout: input.layout === "image-first" ? "image-first" : "overlay",
    sheetSize: input.sheetSize === "compact" || input.sheetSize === "expanded" ? input.sheetSize : "reading",
    backgroundOpacity: typeof input.backgroundOpacity === "number" && Number.isFinite(input.backgroundOpacity)
      ? Math.max(0, Math.min(1, input.backgroundOpacity)) : DEFAULT_READER_PREFERENCES.backgroundOpacity,
    ...(typeof input.heightRatio === "number" && Number.isFinite(input.heightRatio) ? { heightRatio: Math.max(.12, Math.min(1, input.heightRatio)) } : {}),
  };
}
export const MIN_DIALOGUE_SHEET_HEIGHT = 176;
const RATIOS = { compact: 0.2, reading: 0.34, expanded: 0.6 } as const;
export function sheetHeight(size: ReaderPreferences["sheetSize"], usableHeight: number, heightRatio?: number): number {
  if(!Number.isFinite(usableHeight))return 224;
  const height=Math.max(0,usableHeight);
  return Math.round(Math.min(height,Math.max(MIN_DIALOGUE_SHEET_HEIGHT,height*(heightRatio??RATIOS[size]))));
}
export function nearestSheetSize(height: number, usableHeight: number): ReaderPreferences["sheetSize"] {
  return (Object.keys(RATIOS) as ReaderPreferences["sheetSize"][]).reduce((best, size) =>
    Math.abs(sheetHeight(size, usableHeight) - height) < Math.abs(sheetHeight(best, usableHeight) - height) ? size : best, "reading");
}
