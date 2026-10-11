import type { ImageTemplateSnapshot } from "../../shared/image-templates.js";

/** Shape defaults use the host adapter's fields, never an unrecognized API field.
 * Extension JSON and raw overrides remain authoritative. Profile shape is the
 * fallback when the template uses connection settings or the adapter is unknown. */
export function templateOutputParameters(template: ImageTemplateSnapshot | undefined, provider: string | null, explicit: Record<string, unknown>, profile: Record<string, unknown>): Record<string, unknown> {
  const result = { ...profile, ...explicit };
  if (template?.outputAspectRatio !== "9:16") return result;
  const shapeKeys = ["size", "width", "height", "aspectRatio", "aspect_ratio", "imageGenerationConfig", "image_config", "rawRequestOverride"];
  if (shapeKeys.some(key => explicit[key] !== undefined)) return result;
  // A profile raw override can replace the entire adapter payload. Respect it.
  if (profile.rawRequestOverride !== undefined) return result;
  if (provider === "openrouter" || provider === "google") result.aspectRatio = "9:16";
  else if (provider === "nanogpt") result.size = "864x1536";
  return result;
}
