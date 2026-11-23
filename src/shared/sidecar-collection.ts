export const SIDECAR_COLLECTION_LABELS = {
  storyReferences: "Story references",
  storyDocuments: "Readable documents",
  npcBeliefs: "Character perspectives",
  threadUpdates: "Story threads",
  wardrobeDeltas: "Wardrobe changes",
} as const;

export type SidecarOutput = keyof typeof SIDECAR_COLLECTION_LABELS;
export const SIDECAR_OUTPUTS = Object.keys(SIDECAR_COLLECTION_LABELS) as SidecarOutput[];
export type SidecarCollection = {
  profile: "essentials" | "worldbuilding" | "custom";
  selected: SidecarOutput[];
};

export const DEFAULT_SIDECAR_COLLECTION: SidecarCollection = { profile: "worldbuilding", selected: [...SIDECAR_OUTPUTS] };

export function normalizeSidecarCollection(value: unknown): SidecarCollection {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (raw.profile === "essentials") return { profile: "essentials", selected: ["storyReferences", "storyDocuments"] };
  if (raw.profile === "custom" && Array.isArray(raw.selected)) {
    const selected: unknown[] = raw.selected;
    return { profile: "custom", selected: SIDECAR_OUTPUTS.filter(output => selected.includes(output)) };
  }
  return { profile: "worldbuilding", selected: [...SIDECAR_OUTPUTS] };
}
