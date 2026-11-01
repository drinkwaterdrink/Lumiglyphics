import { z } from 'zod';

export const ShotIntentSchema = z.enum([
  'portrait',
  'reaction',
  'dialogue',
  'two-shot',
  'confrontation',
  'action',
  'ensemble',
  'environment',
  'detail',
  'establishing',
  'manga-page',
  'custom'
]);
export type ShotIntent = z.infer<typeof ShotIntentSchema>;

export const ShotSizeSchema = z.enum([
  'extreme-close-up',
  'close-up',
  'medium-close-up',
  'medium',
  'medium-wide',
  'full-body',
  'wide',
  'establishing',
  'macro'
]);
export type ShotSize = z.infer<typeof ShotSizeSchema>;

export const CameraAngleSchema = z.enum([
  'eye-level',
  'low-angle',
  'high-angle',
  'overhead',
  'ground-level',
  'three-quarter',
  'profile',
  'over-the-shoulder'
]);
export type CameraAngle = z.infer<typeof CameraAngleSchema>;

export const LensFeelSchema = z.enum([
  'ultrawide',
  'wide',
  'normal',
  'portrait',
  'telephoto',
  'macro',
  'unspecified'
]);
export type LensFeel = z.infer<typeof LensFeelSchema>;

export const CompositionModeSchema = z.enum([
  'centered',
  'rule-of-thirds',
  'symmetrical',
  'layered-depth',
  'leading-lines',
  'negative-space',
  'lateral-ensemble',
  'frame-within-frame',
  'foreground-obstruction'
]);
export type CompositionMode = z.infer<typeof CompositionModeSchema>;

export const SubjectPlacementSchema = z.object({
  subject: z.string().min(1).max(200),
  horizontal: z.enum(['far-left', 'left', 'center', 'right', 'far-right']).optional(),
  depth: z.enum(['foreground', 'midground', 'background']).optional(),
  scale: z.enum(['small', 'medium', 'large', 'dominant']).optional(),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
}).strict();
export type SubjectPlacement = z.infer<typeof SubjectPlacementSchema>;

export const ShotOutputSchema = z.object({
  requestedRatio: z.string().max(32).optional(),
  actualRatio: z.string().max(32).optional(),
  orientation: z.enum(['square', 'portrait', 'landscape', 'unknown'])
}).strict();
export type ShotOutput = z.infer<typeof ShotOutputSchema>;

export const ShotCameraSchema = z.object({
  shotSize: ShotSizeSchema,
  angle: CameraAngleSchema,
  lens: LensFeelSchema,
  depthOfField: z.enum(['deep', 'moderate', 'shallow', 'selective']),
  focusTarget: z.string().max(200).optional()
}).strict();
export type ShotCamera = z.infer<typeof ShotCameraSchema>;

export const ShotCompositionSchema = z.object({
  mode: CompositionModeSchema,
  subjectPlacements: z.array(SubjectPlacementSchema).max(16)
}).strict();
export type ShotComposition = z.infer<typeof ShotCompositionSchema>;

export const ShotSafeAreaSchema = z.object({
  edge: z.enum(['top', 'bottom', 'left', 'right']),
  fraction: z.number().min(0).max(1),
  reason: z.enum(['dialogue-overlay', 'ui-overlay', 'manual'])
}).strict();
export type ShotSafeArea = z.infer<typeof ShotSafeAreaSchema>;

export const ImageShotSpecSchema = z.object({
  version: z.literal(1),
  intent: ShotIntentSchema,
  output: ShotOutputSchema,
  camera: ShotCameraSchema,
  composition: ShotCompositionSchema,
  crop: z.string().max(200).optional(),
  safeArea: ShotSafeAreaSchema.optional(),
  source: z.enum(['planner', 'deterministic-fallback', 'manual']),
  revision: z.number().int().min(0).default(0)
}).strict();
export type ImageShotSpec = z.infer<typeof ImageShotSpecSchema>;

export function createDefaultShotSpec(partial?: Partial<ImageShotSpec>): ImageShotSpec {
  return ImageShotSpecSchema.parse({
    version: 1,
    intent: 'portrait',
    output: {
      requestedRatio: 'default',
      actualRatio: '1:1',
      orientation: 'square'
    },
    camera: {
      shotSize: 'medium',
      angle: 'eye-level',
      lens: 'normal',
      depthOfField: 'moderate'
    },
    composition: {
      mode: 'centered',
      subjectPlacements: []
    },
    source: 'deterministic-fallback',
    revision: 0,
    ...partial
  });
}

export function parseImageShotSpec(value: unknown): ImageShotSpec | undefined {
  const parsed = ImageShotSpecSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
