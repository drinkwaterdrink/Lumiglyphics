import { z } from "zod";
import type { VisualNovelConfig, VisualNovelPromptPreset } from "../config.js";

export const IMAGE_TEMPLATE_TOKENS = ["style", "scene", "subjects", "action", "composition", "lighting", "suffix", "negative"] as const;
export type ImageTemplateToken = typeof IMAGE_TEMPLATE_TOKENS[number];
export const ImageTemplateCategorySchema = z.enum(["portrait", "environment", "action", "detail", "custom"]);
export const ImageTemplateFramingSchema = z.enum(["portrait", "upper body", "full body", "wide", "close-up"]);
const templateText = z.string().max(8000).refine(value => [...value.matchAll(/\{\{([^{}]*)\}\}/g)].every(match => (IMAGE_TEMPLATE_TOKENS as readonly string[]).includes(match[1]!)), "Unknown template placeholder.");
export const ImageTemplateSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/),
  name: z.string().trim().min(1).max(80),
  category: ImageTemplateCategorySchema,
  enabled: z.boolean(),
  useWhen: z.string().max(1000),
  positive: templateText,
  negative: templateText,
  subjectMode: z.enum(["one", "none"]),
  framing: ImageTemplateFramingSchema,
  referencePolicy: z.enum(["character", "none"]),
  outputAspectRatio: z.enum(["connection", "9:16"]).optional()
}).strict();
export type ImageTemplate = z.infer<typeof ImageTemplateSchema>;
export const ImageTemplateSnapshotSchema = ImageTemplateSchema.extend({ revision: z.string().regex(/^[a-f0-9]{8}$/) }).strict();
export type ImageTemplateSnapshot = z.infer<typeof ImageTemplateSnapshotSchema>;
export const VisualBriefSchema = z.object({
  scene: z.string().max(4000), subjects: z.string().max(4000), action: z.string().max(4000), composition: z.string().max(1000), lighting: z.string().max(1000),
  subjectMode: z.enum(["one", "none"]), framing: ImageTemplateFramingSchema, referencePolicy: z.enum(["character", "none"]), sources: z.array(z.string().max(300)).max(24), conflicts: z.array(z.string().max(1000)).max(16)
}).strict();
export type VisualBrief = z.infer<typeof VisualBriefSchema>;
export const ImagePromptMetadataSchema = z.object({ template: ImageTemplateSnapshotSchema, selectionReason: z.string().max(300), format: z.enum(["description", "tags"]), brief: VisualBriefSchema,
  trackerStatus: z.enum(["detected", "not_found", "unsupported", "malformed", "disabled"]), trackerSourceMessageId: z.string().max(256).optional() }).strict();
export type ImagePromptMetadata = z.infer<typeof ImagePromptMetadataSchema>;
export const ImageTemplateListSchema = z.array(ImageTemplateSchema).max(32).refine(templates => new Set(templates.map(t => t.id)).size === templates.length, "Template IDs must be unique.");

const body = "{{style}}\n{{subjects}}\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\n{{suffix}}";
export const BUILTIN_IMAGE_TEMPLATES: readonly ImageTemplate[] = [
  { id: "portrait", name: "Character portrait", category: "portrait", enabled: true, useWhen: "A named character's expression or reaction is the main visual beat.", positive: body, negative: "{{negative}}", subjectMode: "one", framing: "portrait", referencePolicy: "character" },
  { id: "environment", name: "Environment", category: "environment", enabled: true, useWhen: "Entering a new place, revealing scenery, or a meaningful change in atmosphere.", positive: "{{style}}\n{{scene}}\n{{composition}}\n{{lighting}}\nAn environment view without people.\n{{suffix}}", negative: "{{negative}}", subjectMode: "none", framing: "wide", referencePolicy: "none" },
  { id: "action", name: "Story action", category: "action", enabled: true, useWhen: "A significant movement or event matters more than a facial reaction. Focus on one visible character.", positive: body, negative: "{{negative}}", subjectMode: "one", framing: "full body", referencePolicy: "character" },
  { id: "detail", name: "Detail / object", category: "detail", enabled: true, useWhen: "An important object, clue, or other close-up is the visual focus.", positive: "{{style}}\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\nAn object detail without people.\n{{suffix}}", negative: "{{negative}}", subjectMode: "none", framing: "close-up", referencePolicy: "none" },
  { id: "custom", name: "Custom", category: "custom", enabled: false, useWhen: "Use this when its custom instructions suit the scene.", positive: body, negative: "{{negative}}", subjectMode: "one", framing: "upper body", referencePolicy: "character" },
  { outputAspectRatio: "9:16", id: "manga-page", name: "Manga page", category: "action", enabled: false, useWhen: "A visual story beat benefits from several connected panels focusing on the same visible character. Use only events already in the brief; do not invent future story developments.", subjectMode: "one", framing: "full body", referencePolicy: "character",
    positive: `{{style}}
IDENTITY CONTROL:
Keep this subject recognizable throughout the page: {{subjects}}. Preserve face, hair, body proportions, skin tone, accessories and wardrobe. If a character image reference is supplied, use it as the visual authority. Do not add unrelated named characters.
PAGE STRUCTURE:
Create one full-color manga page with 5–7 interconnected panels, an asymmetrical layout and clear left-to-right, top-to-bottom reading order. Depict only the supplied scene and action; develop their visual presentation without inventing new events or outcomes.
SCENE AND ACTION:
{{scene}}
{{action}}
Use an establishing view, action details and reaction close-ups as appropriate. Vary wide shots, low angles, close-ups and profiles without repeating composition. Keep character expressions consistent with the action. Use cinematic perspective and restrained motion lines.
LETTERING:
Wordless panels by default: no dialogue bubbles, captions or random text. If this template is edited to include approved dialogue or sound effects, reproduce only those exact lines, preserve spelling, and leave safe space around faces and important gestures.
STYLE AND LIGHTING:
{{lighting}}
Strong ink contours, manga shading, halftone textures, clean negative space, expressive contrast and a coherent color palette. Keep panel gutters clear and identity and clothing consistent.
PRODUCTION:
A detailed, editorially finished tall portrait page, composed for a mobile screen. Keep every panel and gutter inside the page, with modest outer margins and no oversized white border. Follow the requested output dimensions. This is one page image, not separate images per panel.
{{suffix}}`,
    negative: "identity drift, different face between panels, changed hairstyle, changed accessories, inconsistent wardrobe, repeated panel composition, broken reading order, extra limbs, fused hands, unreadable lettering, misspelled dialogue, random text, covered face, flat poses, weak contrast, muddy colors, photorealistic rendering, 3D CGI, watermark, logo" }
];

export function validateImageTemplates(value: unknown): ImageTemplate[] {
  return ImageTemplateListSchema.parse(value);
}

export function upgradeImageTemplates(value: unknown): ImageTemplate[] {
  const templates = validateImageTemplates(value);
  if (!templates.some(t => t.id === "manga-page") && templates.length < 32) {
    templates.push({ ...BUILTIN_IMAGE_TEMPLATES.find(t => t.id === "manga-page")! });
  }
  return templates.map(t => t.id === "manga-page" && t.outputAspectRatio === undefined ? { ...t, outputAspectRatio: "9:16" as const } : t);
}

export function templateSnapshot(template: ImageTemplate): ImageTemplateSnapshot {
  const normalized = ImageTemplateSchema.parse(template);
  let hash = 2166136261;
  for (const char of JSON.stringify(normalized)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Object.freeze({ ...normalized, revision: (hash >>> 0).toString(16).padStart(8, "0") });
}

export function migrateImageTemplates(presets: readonly VisualNovelPromptPreset[]): ImageTemplate[] {
  const templates = BUILTIN_IMAGE_TEMPLATES.map(t => ({ ...t }));
  // Legacy presets were literal prefix text, not template programs. Preserve the
  // original records and make unsupported macro notation literal in the import.
  const importText = (value: string, limit: number) => value.replace(/\{\{([^{}]*)\}\}/g, (token, key: string) => (IMAGE_TEMPLATE_TOKENS as readonly string[]).includes(key) ? token : `{${key}}`).slice(0, limit).replace(/\{\{[^{}]*$/, "");
  for (const [index, preset] of presets.slice(0, 24 - templates.length).entries()) {
    templates.push({ ...templates[0]!, id: `preset-${index}-${preset.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "import"}`, name: preset.name.slice(0, 80), positive: `${importText(preset.positive, 7900)}\n{{subjects}}\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\n{{suffix}}`, negative: importText(preset.negative, 8000) });
  }
  return templates;
}

export function resolveImageTemplate(config: VisualNovelConfig, selectedId?: string): { template: ImageTemplateSnapshot; fallbackReason?: string } {
  const selected = selectedId && config.imageTemplates.find(t => t.id === selectedId && t.enabled);
  if (selected) return { template: templateSnapshot(selected) };
  const dynamicSelection = config.dynamicImageTemplates;
  if (dynamicSelection && !config.imageTemplates.some(t => t.enabled)) throw new Error("Choose at least one template for dynamic image generation.");
  const fallback = config.imageTemplates.find(t => t.id === config.defaultImageTemplateId && (!dynamicSelection || t.enabled))
    ?? (dynamicSelection ? config.imageTemplates.find(t => t.enabled) : undefined);
  return { template: templateSnapshot(fallback ?? { ...BUILTIN_IMAGE_TEMPLATES[0]! }),
    ...((selectedId || !fallback) ? { fallbackReason: "Requested template unavailable; using the default template." } : {}) };
}

export function renderImageTemplate(template: ImageTemplateSnapshot, values: Record<ImageTemplateToken, string>): { prompt: string; negativePrompt: string } {
  const render = (text: string) => text.replace(/\{\{([^{}]*)\}\}/g, (_, key: ImageTemplateToken) => values[key] ?? "").replace(/\n{3,}/g, "\n\n").trim();
  return { prompt: render(template.positive), negativePrompt: render(template.negative) };
}
