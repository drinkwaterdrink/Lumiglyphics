export const IMAGE_OUTPUT_RATIOS = ["default", "1:1", "9:16", "16:9", "3:4", "4:3", "2:3", "3:2"] as const;
export type ImageOutputRatio = typeof IMAGE_OUTPUT_RATIOS[number];
export function normalizeImageOutputRatio(value: unknown): ImageOutputRatio {
  return IMAGE_OUTPUT_RATIOS.includes(value as ImageOutputRatio) ? value as ImageOutputRatio : "default";
}
