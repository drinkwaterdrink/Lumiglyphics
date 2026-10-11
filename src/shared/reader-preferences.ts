export type ReaderPreferences = {
  adjustableSheetEnabled: boolean;
  layout: "overlay" | "image-first";
  sheetSize: "compact" | "reading" | "expanded";
  backgroundOpacity: number;
};
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  adjustableSheetEnabled: false, layout: "overlay", sheetSize: "reading", backgroundOpacity: 0.9,
};
export function normalizeReaderPreferences(value: unknown): ReaderPreferences {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    adjustableSheetEnabled: input.adjustableSheetEnabled === true,
    layout: input.layout === "image-first" ? "image-first" : "overlay",
    sheetSize: input.sheetSize === "compact" || input.sheetSize === "expanded" ? input.sheetSize : "reading",
    backgroundOpacity: typeof input.backgroundOpacity === "number" && Number.isFinite(input.backgroundOpacity)
      ? Math.max(0.35, Math.min(1, input.backgroundOpacity)) : 0.9,
  };
}
const RATIOS = { compact: 0.22, reading: 0.34, expanded: 0.6 } as const;
export function sheetHeight(size: ReaderPreferences["sheetSize"], usableHeight: number): number {
  const height = Number.isFinite(usableHeight) ? Math.max(0, usableHeight) : 224;
  return Math.round(Math.min(height, Math.max(224, height * RATIOS[size])));
}
export function nearestSheetSize(height: number, usableHeight: number): ReaderPreferences["sheetSize"] {
  return (Object.keys(RATIOS) as ReaderPreferences["sheetSize"][]).reduce((best, size) =>
    Math.abs(sheetHeight(size, usableHeight) - height) < Math.abs(sheetHeight(best, usableHeight) - height) ? size : best, "reading");
}
