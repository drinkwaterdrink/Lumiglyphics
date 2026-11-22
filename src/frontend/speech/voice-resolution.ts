import type { SpeechSettings, SpeechVoiceRef } from "../../speech-config.js";

/**
 * Pure voice resolution for one paragraph, mirroring the stage nameplate
 * semantics in `host/controller.ts#nameplateForParagraph`:
 * - `''`  -> intentional narrator;
 * - named -> that character/persona name;
 * - null/undefined -> unknown, falls back to the turn speaker (NOT the narrator).
 */

/** Case-insensitive, whitespace-collapsed name key (never a card id — Cue only has names). */
export function speakerNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Chat-scoped override key. Scoping to the chat id prevents a same-named
 * character in another chat from stealing this chat's voice.
 */
export function characterOverrideKey(chatId: string, name: string): string {
  return `chat::${chatId}::${speakerNameKey(name)}`;
}

export type ResolvedVoice = {
  ref: SpeechVoiceRef | null;
  /** Which configured slot supplied the ref; "none" = unconfigured (stay silent, hint at settings). */
  source: "character-override" | "character-default" | "narrator" | "none";
  role: "narrator" | "character";
  /** Display name the resolution was performed for ("" for narrator). */
  speakerName: string;
};

export function resolveVoiceForParagraph(
  settings: Pick<SpeechSettings, "narrator" | "characterDefault" | "characters">,
  input: { chatId: string; paragraphSpeaker: string | null | undefined; turnSpeaker: string; aliases?: readonly string[] | Record<string, readonly string[]> | undefined },
): ResolvedVoice {
  const attributed = input.paragraphSpeaker;
  // null/undefined = unknown attribution: fall back to the turn speaker, exactly
  // like the nameplate. Empty string is the intentional narrator.
  const name = attributed === undefined || attributed === null ? input.turnSpeaker : attributed;
  if (name.trim() === "") {
    if (settings.narrator) return { ref: settings.narrator, source: "narrator", role: "narrator", speakerName: "" };
    if (settings.characterDefault) {
      return { ref: settings.characterDefault, source: "character-default", role: "narrator", speakerName: "" };
    }
    return { ref: null, source: "none", role: "narrator", speakerName: "" };
  }
  const override = settings.characters[characterOverrideKey(input.chatId, name)];
  if (override) return { ref: override, source: "character-override", role: "character", speakerName: name };

  if (input.aliases) {
    const aliasList: readonly string[] = Array.isArray(input.aliases)
      ? input.aliases
      : (typeof input.aliases === "object"
        ? ((input.aliases as Record<string, readonly string[]>)[name] ?? (input.aliases as Record<string, readonly string[]>)[speakerNameKey(name)] ?? [])
        : []);
    for (const alias of aliasList) {
      if (!alias || typeof alias !== "string") continue;
      const aliasOverride = settings.characters[characterOverrideKey(input.chatId, alias)];
      if (aliasOverride) {
        return { ref: aliasOverride, source: "character-override", role: "character", speakerName: name };
      }
    }
  }

  if (settings.characterDefault) {
    return { ref: settings.characterDefault, source: "character-default", role: "character", speakerName: name };
  }
  if (settings.narrator) return { ref: settings.narrator, source: "narrator", role: "character", speakerName: name };
  return { ref: null, source: "none", role: "character", speakerName: name };
}

export type AutoCastMember = {
  name: string;
  gender?: string;
  age?: string;
  demeanor?: string;
};

export type AutoCastVoiceOption = {
  connectionId: string;
  voiceId: string;
  label?: string;
  gender?: string;
};

export type AutoCastResult = {
  nextOverrides: Record<string, SpeechVoiceRef>;
  assignedCount: number;
  assignments: Array<{ name: string; connectionId: string; voice: string }>;
};

const FEMALE_RE = /\b(female|woman|girl|lady|she|her|feminine|soprano|alto|princess|queen)\b/i;
const MALE_RE = /\b(male|man|boy|gentleman|he|him|masculine|baritone|bass|tenor|prince|king)\b/i;

/**
 * Distributes distinct TTS voices across discovered cast members without
 * overwriting any existing manual character override.
 */
export function autoCastVoicesForCast(input: {
  chatId: string;
  cast: ReadonlyArray<AutoCastMember>;
  availableVoices: ReadonlyArray<AutoCastVoiceOption>;
  existingOverrides: Readonly<Record<string, SpeechVoiceRef>>;
}): AutoCastResult {
  const nextOverrides: Record<string, SpeechVoiceRef> = { ...input.existingOverrides };
  const assignments: Array<{ name: string; connectionId: string; voice: string }> = [];
  if (!input.chatId || input.cast.length === 0 || input.availableVoices.length === 0) {
    return { nextOverrides, assignedCount: 0, assignments };
  }

  const usedVoiceKeys = new Set(
    Object.values(input.existingOverrides).map((ref) => `${ref.connectionId}\u0000${ref.voice}`),
  );

  for (const member of input.cast) {
    const cleanName = member.name.trim();
    if (!cleanName || !speakerNameKey(cleanName)) continue;
    const key = characterOverrideKey(input.chatId, cleanName);
    if (nextOverrides[key]) continue;

    const traitText = `${member.gender ?? ""} ${member.age ?? ""} ${member.demeanor ?? ""}`.trim();
    const wantsFemale = FEMALE_RE.test(traitText);
    const wantsMale = !wantsFemale && MALE_RE.test(traitText);

    let bestVoice: AutoCastVoiceOption | null = null;
    let bestScore = -Infinity;
    for (const voice of input.availableVoices) {
      const voiceKey = `${voice.connectionId}\u0000${voice.voiceId}`;
      const voiceMeta = `${voice.gender ?? ""} ${voice.label ?? ""} ${voice.voiceId}`.trim();
      let score = usedVoiceKeys.has(voiceKey) ? -10 : 10;
      if (wantsFemale && FEMALE_RE.test(voiceMeta)) score += 6;
      else if (wantsFemale && MALE_RE.test(voiceMeta)) score -= 4;
      if (wantsMale && MALE_RE.test(voiceMeta)) score += 6;
      else if (wantsMale && FEMALE_RE.test(voiceMeta)) score -= 4;
      if (score > bestScore) {
        bestScore = score;
        bestVoice = voice;
      }
    }

    if (bestVoice) {
      usedVoiceKeys.add(`${bestVoice.connectionId}\u0000${bestVoice.voiceId}`);
      nextOverrides[key] = { connectionId: bestVoice.connectionId, voice: bestVoice.voiceId };
      assignments.push({ name: cleanName, connectionId: bestVoice.connectionId, voice: bestVoice.voiceId });
    }
  }

  return {
    nextOverrides,
    assignedCount: assignments.length,
    assignments,
  };
}
