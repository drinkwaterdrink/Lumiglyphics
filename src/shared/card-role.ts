import { z } from "zod";

export const CardRoleSchema = z.enum(["auto", "character", "scenario"]);
export type CardRole = z.infer<typeof CardRoleSchema>;
export const StoredCardRoleSchema = z.object({
  version: z.literal(1), cardId: z.string().min(1).max(200), role: CardRoleSchema
}).strict();

export const SCENARIO_KEYWORD_RE = /\b(?:academy|rpg|adventure|simulator|simulation|chronicles|campaign|setting|universe|guild|tavern|inn|empire|kingdom|city|realm|station|dungeon|manor|estate|school|university|sanctuary|asylum|narrator|storyteller|game\s*master|dm|gm|cyoa|sandbox)\b/i;

export const SCENARIO_TAG_RE = /^(?:scenario|narrator|rpg|cyoa|sandbox|world|setting|location|adventure|storyteller|gm|dm)$/i;

/** Returns true if a name is likely a scenario, world, or institution card title rather than a character. */
export function isScenarioTitle(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  return SCENARIO_KEYWORD_RE.test(trimmed);
}

/** Determines if card metadata indicates a scenario/narrator/sandbox world card. */
export function isLikelyScenarioCard(card: { name?: string | null; tags?: readonly string[] | null; description?: string | null } | null | undefined): boolean {
  if (!card) return false;
  const name = card.name?.trim() ?? '';
  if (name && isScenarioTitle(name)) return true;
  if (Array.isArray(card.tags) && card.tags.some(t => SCENARIO_TAG_RE.test(t.trim()))) return true;
  const desc = card.description?.trim() ?? '';
  if (desc && (desc.startsWith('Scenario:') || desc.startsWith('Setting:') || desc.startsWith('World:') || desc.startsWith('RPG:'))) return true;
  return false;
}

