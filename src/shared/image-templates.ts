import {PresentationRuleTraceSchema} from './presentation-rules.js';
import {SharedStyleSnapshotSchema} from './shared-style-snapshot.js';
import {ImageShotSpecSchema, ShotIntentSchema} from './image-shot-spec.js';
import {StyleDNASchema} from './style-dna.js';
import {ImageOutputPlanSchema} from './image-output-plan.js';
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
  subjectMode: z.enum(["one", "none", "ensemble"]),
  framing: ImageTemplateFramingSchema,
  referencePolicy: z.enum(["character", "none"]),
  outputAspectRatio: z.enum(["connection", "9:16"]).optional(),
  cameraPolicy: z.enum(["directed", "fixed"]).optional(),
  intent: ShotIntentSchema.optional(),
  safeAreaPolicy: z.enum(["auto", "dialogue", "none"]).optional()
}).strict();
export type ImageTemplate = z.infer<typeof ImageTemplateSchema>;
export const ImageTemplateSnapshotSchema = ImageTemplateSchema.extend({ revision: z.string().regex(/^[a-f0-9]{8}$/) }).strict();
export type ImageTemplateSnapshot = z.infer<typeof ImageTemplateSnapshotSchema>;
export const SubjectPreparationSchema=z.object({
  name:z.string().max(256),identity:z.string().max(4000),
  identitySource:z.enum(['manual correction','saved appearance','resolved context','ensemble snapshot','unavailable','locked DNA']).or(z.string().max(64)),
  attire:z.string().max(2000).nullable(),attireSource:z.enum(['picture cue','scene','not supplied','locked DNA']).or(z.string().max(64)),
  direction:z.string().max(1000),shortened:z.boolean(),
  subjectsInPositive:z.boolean(),subjectsInNegative:z.boolean(),
}).strict();
export const VisualBriefSchema = z.object({
  scene: z.string().max(4000), subjects: z.string().max(4000), action: z.string().max(4000), composition: z.string().max(1000), lighting: z.string().max(1000),
  subjectMode: z.enum(["one", "none", "ensemble"]), framing: ImageTemplateFramingSchema, referencePolicy: z.enum(["character", "none"]), sources: z.array(z.string().max(300)).max(24), conflicts: z.array(z.string().max(1000)).max(16),
  subjectPreparation:SubjectPreparationSchema.optional()
}).strict();
export type VisualBrief = z.infer<typeof VisualBriefSchema>;
export const ImagePromptMetadataSchema = z.object({
  template: ImageTemplateSnapshotSchema,
  selectionReason: z.string().max(300),
  format: z.enum(["description", "tags"]),
  brief: VisualBriefSchema,
  sharedStyle: SharedStyleSnapshotSchema.optional().catch(undefined),
  presentationRuleTrace: PresentationRuleTraceSchema.optional(),
  trackerStatus: z.enum(["detected", "not_found", "unsupported", "malformed", "disabled"]),
  trackerSourceMessageId: z.string().max(256).optional(),
  promptEngineVersion: z.literal(2).optional(),
  promptDialect: z.string().max(64).optional(),
  shotSpec: ImageShotSpecSchema.optional(),
  styleSnapshot: StyleDNASchema.optional(),
  outputPlan: ImageOutputPlanSchema.optional(),
  budgetSummary: z.object({
    complexity: z.string().max(32),
    softRange: z.tuple([z.number(), z.number()]),
    hardLimit: z.number(),
    finalCharacters: z.number()
  }).strict().optional(),
  serializerRevision: z.string().max(64).optional(),
  referenceSummary: z.string().max(2000).optional(),
  promptLintWarnings: z.array(z.string().max(500)).max(32).optional(),
  shadowPrompt: z.object({
    v1Prompt: z.string().max(65000),
    v1NegativePrompt: z.string().max(65000).optional(),
    v2Prompt: z.string().max(65000).optional(),
    v2NegativePrompt: z.string().max(65000).optional()
  }).strict().optional()
}).strict();
export type ImagePromptMetadata = z.infer<typeof ImagePromptMetadataSchema>;
export const ImageTemplateListSchema = z.array(ImageTemplateSchema).max(32).refine(templates => new Set(templates.map(t => t.id)).size === templates.length, "Template IDs must be unique.");

const LEGACY_MANGA_POSITIVE = `{{style}}
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
{{suffix}}`;
const LEGACY_MANGA_NEGATIVE = "identity drift, different face between panels, changed hairstyle, changed accessories, inconsistent wardrobe, repeated panel composition, broken reading order, extra limbs, fused hands, unreadable lettering, misspelled dialogue, random text, covered face, flat poses, weak contrast, muddy colors, photorealistic rendering, 3D CGI, watermark, logo";

const LEGACY_BODY = "{{style}}\n{{subjects}}\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\n{{suffix}}";
const LEGACY_ENVIRONMENT_POSITIVE = "{{style}}\n{{scene}}\n{{composition}}\n{{lighting}}\nAn environment view without people.\n{{suffix}}";
const LEGACY_DETAIL_POSITIVE = "{{style}}\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\nAn object detail without people.\n{{suffix}}";
const LEGACY_ENSEMBLE_POSITIVE = "{{style}}\nDepict one coherent scene with the complete visible cast below, including the user's persona when listed. Each named appearance belongs only to that individual; keep faces, hair, build and clothing distinct.\nCAST:\n{{subjects}}\nSETTING: {{scene}}\nMOMENT: {{action}}\n{{composition}}\n{{lighting}}\nUse an external camera view so the listed persona is visible too. Compose readable interactions and spatial relationships, with natural poses and clear silhouettes. Show only the supplied moment, no extra people, duplicated individuals, merged bodies, split panels or invented events.\n{{suffix}}";
const LEGACY_ENSEMBLE_NEGATIVE = "{{negative}}, duplicate person, merged identities, swapped hair or clothing, fused bodies, extra limbs, cropped-out cast, split screen";
const LEGACY_TWO_SHOT_POSITIVE = "{{style}}\nA medium two-shot composition depicting two characters interacting.\nCAST:\n{{subjects}}\nSETTING: {{scene}}\nINTERACTION: {{action}}\n{{composition}}\n{{lighting}}\nCompose both subjects naturally in the frame with distinct body language and eye line. Clear dialogue safe area in the lower third.\n{{suffix}}";
const LEGACY_TWO_SHOT_NEGATIVE = "{{negative}}, single character, crowded group, fused bodies, mismatched eye-contact, obscured expressions";

const body = LEGACY_BODY;
export const BUILTIN_IMAGE_TEMPLATES: readonly ImageTemplate[] = [
  { id: "portrait", name: "Character portrait", category: "portrait", enabled: true,
    useWhen: "A single named character's subtle expression, gaze, or emotional shift is the main visual beat (first-person POV reaction).",
    positive: "{{style}}\nAn expressive cinematic character portrait with natural asymmetric poise and living environmental depth.\nSUBJECT: {{subjects}}\nMOMENT & EXPRESSION: {{action}}\nSETTING: {{scene}}\n{{composition}}\n{{lighting}}\nCapture authentic facial nuance, believable eyeline, and natural posture rather than a rigid frontal stare.\n{{suffix}}",
    negative: "{{negative}}", subjectMode: "one", framing: "portrait", referencePolicy: "character", cameraPolicy: "directed", intent: "portrait", safeAreaPolicy: "auto" },
  { id: "environment", name: "Environment", category: "environment", enabled: true,
    useWhen: "Entering a new place, revealing scenery, or shifting atmosphere with strong foreground-to-horizon depth.",
    positive: "{{style}}\nA layered environmental scene with foreground textures, architectural or natural midground detail, and deep atmospheric distance.\n{{scene}}\n{{composition}}\n{{lighting}}\nAn environment view without people.\n{{suffix}}",
    negative: "{{negative}}", subjectMode: "none", framing: "wide", referencePolicy: "none", cameraPolicy: "directed", intent: "environment", safeAreaPolicy: "none" },
  { id: "action", name: "Story action", category: "action", enabled: true,
    useWhen: "A dynamic single-character movement, physical effort, clash, or sudden gesture matters more than a static reaction.",
    positive: "{{style}}\nA kinetic single-character action frame with dynamic weight transfer, diagonal energy, and tangible interaction with the surroundings.\nSUBJECT: {{subjects}}\nACTION: {{action}}\nSETTING: {{scene}}\n{{composition}}\n{{lighting}}\nShow motion through posture, clothing, and camera perspective rather than a stiff standing pose.\n{{suffix}}",
    negative: "{{negative}}", subjectMode: "one", framing: "full body", referencePolicy: "character", cameraPolicy: "directed", intent: "action", safeAreaPolicy: "auto" },
  { id: "detail", name: "Detail / object", category: "detail", enabled: true,
    useWhen: "An important object, clue, weapon, letter, or tactile close-up is the visual focus.",
    positive: "{{style}}\nA tactile close-up focusing on a pivotal physical detail in the scene.\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\nAn object detail without people.\n{{suffix}}",
    negative: "{{negative}}", subjectMode: "none", framing: "close-up", referencePolicy: "none", cameraPolicy: "directed", intent: "detail", safeAreaPolicy: "none" },
  { id: "custom", name: "Custom", category: "custom", enabled: false, useWhen: "Use this when its custom instructions suit the scene.", positive: body, negative: "{{negative}}", subjectMode: "one", framing: "upper body", referencePolicy: "character", cameraPolicy: "fixed", intent: "custom", safeAreaPolicy: "auto" },
  { outputAspectRatio: "9:16", id: "manga-page", name: "Manga page", category: "action", enabled: false, useWhen: "A visual story beat benefits from several connected panels focusing on the same visible character. Use only events already in the brief; do not invent future story developments.", subjectMode: "one", framing: "full body", referencePolicy: "character", cameraPolicy: "directed", intent: "manga-page", safeAreaPolicy: "none",
    positive: `{{style}}
SUBJECT: {{subjects}}
Keep face, hair, proportions, skin, accessories and clothing consistent across panels. Use a supplied character reference as identity authority; no unrelated named cast.
SCENE: {{scene}}
ACTION: {{action}}
Create one full-color tall manga page with 5–7 connected panels. Use asymmetrical layout and clear left-to-right, top-to-bottom reading order. Show only this scene/action, without invented events or outcomes. Vary establishing views, action details and reaction close-ups; avoid repeated compositions. Match expressions to the action, with cinematic perspective and restrained motion lines.
Wordless by default: no dialogue, captions or random text. If explicitly approved lines are supplied, reproduce only those lines with correct spelling; keep faces and gestures clear.
LIGHTING: {{lighting}}
Strong ink contours, manga shading, halftones, expressive contrast, coherent colors and clean negative space. Keep all panels/gutters inside a mobile portrait page with modest margins; no oversized white border. Follow requested dimensions. Render one page, not separate panel images.
{{composition}}
{{suffix}}`,
    negative: "identity drift, wardrobe drift, repeated panels, broken reading order, extra limbs, malformed hands, illegible or unrequested text, obscured faces, stiff poses, muddy contrast, photo, CGI, watermark, logo" },
  { id: "ensemble", name: "Full scene / ensemble", category: "action", enabled: false,
    useWhen: "A full-scene beat showing everyone physically present staged organically across the room or setting as the story happens (seated, working, talking in clusters, moving across foreground/midground/background)—including the user's persona when present. List visibleCharacters for this exact moment; omit offscreen or departed characters.",
    subjectMode: "ensemble", framing: "wide", referencePolicy: "none", cameraPolicy: "directed", intent: "ensemble", safeAreaPolicy: "auto",
    positive: "{{style}}\nDepict one unified, lived-in full scene showing the complete visible cast below (including the user's persona when listed) staged naturally where they belong in the setting.\nCAST:\n{{subjects}}\nSETTING & ARCHITECTURE: {{scene}}\nSCENE ACTION & BLOCKING: {{action}}\n{{composition}}\n{{lighting}}\nUse an objective external camera pulled back enough to show room geometry and depth across foreground, midground, and background planes. Every character must be occupied in their real story posture, activity, and sightlines—seated, leaning, moving, conversing, or interacting with props—NEVER lined up side-by-side in a flat front-facing row. Keep each named individual's face, hair, build, and clothing distinct, with no extra crowd, duplicated people, merged bodies, or split panels.\n{{suffix}}",
    negative: "{{negative}}, side-by-side lineup, police lineup, group portrait row, characters standing shoulder-to-shoulder facing camera, stiff standing poses, duplicate person, merged identities, swapped hair or clothing, fused bodies, extra limbs, cropped-out cast, split screen" },
  { id: "two-shot", name: "Two-shot dialogue", category: "action", enabled: false,
    useWhen: "Two characters conversing, negotiating, tending to something together, or locked in direct tension. Emphasize angled depth, over-the-shoulder, or across-the-table blocking rather than standing shoulder-to-shoulder.",
    subjectMode: "ensemble", framing: "upper body", referencePolicy: "character", cameraPolicy: "directed", intent: "two-shot", safeAreaPolicy: "auto",
    positive: "{{style}}\nA dynamic narrative two-shot framing two characters in active spatial interaction.\nCAST:\n{{subjects}}\nSETTING: {{scene}}\nINTERACTION & BLOCKING: {{action}}\n{{composition}}\n{{lighting}}\nStage both characters with natural depth separation, angled body orientation, believable eyelines toward each other or a shared focal point, and distinct emotional posture—avoid stiff side-by-side posing facing the lens. Keep the lower quarter readable for dialogue UI.\n{{suffix}}",
    negative: "{{negative}}, side-by-side lineup, staring blankly straight at camera, crowded group, fused bodies, mismatched eye-contact, obscured expressions" },
  { id: "cinematic-wide", name: "Cinematic wide establishing", category: "environment", enabled: false,
    useWhen: "Sweeping cinematic establishing view of a location or exterior vista with deep perspective, leading lines, atmospheric layers, and strong sense of scale.",
    subjectMode: "none", framing: "wide", referencePolicy: "none", cameraPolicy: "directed", intent: "establishing", safeAreaPolicy: "none",
    positive: "{{style}}\nAn expansive cinematic wide-angle establishing shot with multi-plane depth.\nENVIRONMENT: {{scene}}\nATMOSPHERE: {{lighting}}\n{{composition}}\nAnchor the frame with foreground framing elements, clear architectural or landscape leading lines into the midground, and a rich atmospheric horizon. Clean vista without focal character obstructions.\n{{suffix}}",
    negative: "{{negative}}, close-up, cropped horizon, cramped framing, flat depth, blurry backdrop" },
  { id: "dramatic-closeup", name: "Dramatic close-up", category: "portrait", enabled: false,
    useWhen: "High-stakes emotional peak, sudden shock, whispered confession, quiet realization, or intense facial micro-expression.",
    subjectMode: "one", framing: "close-up", referencePolicy: "character", cameraPolicy: "directed", intent: "reaction", safeAreaPolicy: "auto",
    positive: "{{style}}\nA tight cinematic dramatic close-up locked onto intense emotional nuance.\nSUBJECT: {{subjects}}\nEMOTION & MOMENT: {{action}}\nSETTING CONTEXT: {{scene}}\n{{composition}}\n{{lighting}}\nAsymmetric framing, razor-sharp focus on eyes and subtle expression, sculptural key-to-shadow contrast, and soft atmospheric depth separation.\n{{suffix}}",
    negative: "{{negative}}, wide shot, full body, blank expression, stiff frontal pose, cropped forehead, flat lighting" },
  { id: "key-visual", name: "Key visual / Climax", category: "action", enabled: false,
    useWhen: "A definitive story climax, commanding entrance, decisive stance, or sweeping dramatic reveal.",
    subjectMode: "one", framing: "full body", referencePolicy: "character", cameraPolicy: "directed", intent: "action", safeAreaPolicy: "auto",
    positive: "{{style}}\nA striking visual novel key visual with commanding narrative composition and environmental scale.\nSUBJECT: {{subjects}}\nCLIMAX MOMENT: {{action}}\nENVIRONMENT: {{scene}}\n{{composition}}\n{{lighting}}\nDynamic camera angle, powerful full-figure silhouette, dramatic environmental rim lighting, and cinematic depth.\n{{suffix}}",
    negative: "{{negative}}, mundane snapshot, stiff pose, awkward limbs, cropped feet, flat front lighting" },
  { id: "candid-moment", name: "Candid moment", category: "portrait", enabled: false,
    useWhen: "An unposed, lived-in slice-of-life beat captured mid-gesture, mid-thought, or mid-conversation without theatrical posing.",
    subjectMode: "one", framing: "portrait", referencePolicy: "character", cameraPolicy: "directed", intent: "dialogue", safeAreaPolicy: "auto",
    positive: "{{style}}\nAn unposed candid narrative frame catching an authentic mid-moment beat.\nSUBJECT: {{subjects}}\nGESTURE & MOMENT: {{action}}\nENVIRONMENT: {{scene}}\n{{composition}}\n{{lighting}}\nRelaxed weight distribution, natural glance or mid-action posture, lived-in environmental details, and spontaneous atmospheric lighting.\n{{suffix}}",
    negative: "{{negative}}, stiff mannequin pose, artificial looking straight at camera, extreme fisheye, harsh flash" }
];

export function validateImageTemplates(value: unknown): ImageTemplate[] {
  return ImageTemplateListSchema.parse(value);
}

const LEGACY_TEMPLATE_DEFAULTS: Record<string, { positives: readonly string[]; negatives?: readonly string[]; useWhens?: readonly string[] }> = {
  portrait: {
    positives: [LEGACY_BODY],
    useWhens: ["A named character's expression or reaction is the main visual beat."]
  },
  environment: {
    positives: [LEGACY_ENVIRONMENT_POSITIVE],
    useWhens: ["Entering a new place, revealing scenery, or a meaningful change in atmosphere."]
  },
  action: {
    positives: [LEGACY_BODY],
    useWhens: ["A significant movement or event matters more than a facial reaction. Focus on one visible character."]
  },
  detail: {
    positives: [LEGACY_DETAIL_POSITIVE],
    useWhens: ["An important object, clue, or other close-up is the visual focus."]
  },
  ensemble: {
    positives: [LEGACY_ENSEMBLE_POSITIVE],
    negatives: [LEGACY_ENSEMBLE_NEGATIVE],
    useWhens: ["A shared scene or interaction should show everyone physically present, including the user's persona. List visibleCharacters for this exact moment; omit offscreen, departed, remembered and merely mentioned characters."]
  },
  "two-shot": {
    positives: [LEGACY_TWO_SHOT_POSITIVE],
    negatives: [LEGACY_TWO_SHOT_NEGATIVE],
    useWhens: ["Two characters conversing, interacting, or in direct tension. Focus on mid-range framing and relational chemistry."]
  }
};

export function upgradeImageTemplates(value: unknown): ImageTemplate[] {
  const templates = validateImageTemplates(value);
  for (const templateId of ["manga-page", "ensemble", "two-shot", "cinematic-wide", "dramatic-closeup", "key-visual", "candid-moment"]) {
    if (!templates.some(t => t.id === templateId) && templates.length < 32) {
      const builtin = BUILTIN_IMAGE_TEMPLATES.find(t => t.id === templateId);
      if (builtin) templates.push({ ...builtin });
    }
  }
  return templates.map(t => {
    if (t.id === 'manga-page') {
      const builtin = BUILTIN_IMAGE_TEMPLATES.find(template => template.id === 'manga-page')!;
      return {...t,...(t.outputAspectRatio === undefined ? {outputAspectRatio:'9:16' as const} : {}),
        ...(t.positive === LEGACY_MANGA_POSITIVE ? {positive:builtin.positive} : {}),
        ...([LEGACY_MANGA_NEGATIVE, 'identity drift, wardrobe drift, repeated compositions, broken reading order, extra limbs, malformed hands, unreadable or misspelled lettering, unrequested text, obscured faces, stiff poses, weak contrast, muddy colors, photorealism, 3D CGI, watermark, logo'].includes(t.negative) ? {negative:builtin.negative} : {})};
    }
    const legacy = LEGACY_TEMPLATE_DEFAULTS[t.id];
    const builtin = BUILTIN_IMAGE_TEMPLATES.find(template => template.id === t.id);
    if (!legacy || !builtin) return t;
    return {
      ...t,
      ...(legacy.positives.includes(t.positive) ? { positive: builtin.positive } : {}),
      ...(legacy.negatives && legacy.negatives.includes(t.negative) ? { negative: builtin.negative } : {}),
      ...(legacy.useWhens && legacy.useWhens.includes(t.useWhen) ? { useWhen: builtin.useWhen } : {})
    };
  });
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
    templates.push({ ...templates[0]!, id: `preset-${index}-${preset.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "import"}`, name: preset.name.slice(0, 80), positive: `${importText(preset.positive, 7900)}\n{{subjects}}\n{{action}}\n{{scene}}\n{{composition}}\n{{lighting}}\n{{suffix}}`, negative: importText(preset.negative, 8000), cameraPolicy: "fixed" });
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
