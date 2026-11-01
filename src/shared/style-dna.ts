import { z } from 'zod';

export const StyleLightingOverlaySchema = z.object({
  type: z.string().min(1).max(200),
  intentional: z.boolean()
}).strict();
export type StyleLightingOverlay = z.infer<typeof StyleLightingOverlaySchema>;

export const StyleDNASchema = z.object({
  medium: z.string().max(200).optional(),
  rendering: z.array(z.string().max(200)).max(16).optional(),
  linework: z.array(z.string().max(200)).max(16).optional(),
  shading: z.array(z.string().max(200)).max(16).optional(),
  texture: z.array(z.string().max(200)).max(16).optional(),
  palette: z.array(z.string().max(200)).max(16).optional(),
  realism: z.array(z.string().max(200)).max(16).optional(),
  surface: z.array(z.string().max(200)).max(16).optional(),
  atmosphere: z.array(z.string().max(200)).max(16).optional(),
  cameraHints: z.array(z.string().max(200)).max(16).optional(),
  lightingOverlay: StyleLightingOverlaySchema.optional(),
  preserve: z.array(z.string().max(200)).max(16).optional(),
  avoidIntent: z.array(z.string().max(200)).max(16).optional()
}).strict();
export type StyleDNA = z.infer<typeof StyleDNASchema>;

export function createEmptyStyleDNA(partial?: Partial<StyleDNA>): StyleDNA {
  return StyleDNASchema.parse({
    ...partial
  });
}

export function parseStyleDNA(value: unknown): StyleDNA | undefined {
  const parsed = StyleDNASchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
