import type { SpeechDeliveryMode, SpeechSettings } from "../../speech-config.js";
import { insertSpeechEvent, sceneSpeechEnabled, SPEECH_EVENTS, SpeechDirectionSchema, type SpeechDirection } from "../../shared/speech-direction.js";

/**
 * Outbound speech-text decoration.
 *
 * Bumped whenever formatting changes so cache keys never serve audio produced
 * by an older formatter for the same prose.
 */
export const DELIVERY_ADAPTER_VERSION = 4;

/**
 * The "commonly used" inline audio tags from the official Gemini
 * speech-generation guide (https://ai.google.dev/gemini-api/docs/speech-generation,
 * #audio-tags). The docs state there is NO exhaustive supported-tag list; these
 * are suggestions for the picker, and free text is allowed. They are
 * probabilistic performance guidance for Gemini-family TTS models only — other
 * providers may read the bracket text aloud.
 */
export const GEMINI_AUDIO_TAG_SUGGESTIONS: readonly string[] = [
  "amazed", "crying", "curious", "excited", "sighs", "gasp", "giggles", "laughs",
  "mischievously", "panicked", "sarcastic", "serious", "shouting", "tired",
  "trembling", "whispers",
];

/**
 * Build the exact text sent to the synthesis endpoint. The visible paragraph
 * prose is NEVER modified; this only decorates the outbound copy.
 *
 * - mode "none": byte-identical prose.
 * - mode "gemini-audio-tags" with a nonempty tag: `[tag] ` + prose, matching the
 *   documented inline-modifier syntax (no closing tag exists in the docs).
 * - mode "gemini-audio-tags" with an empty tag: prose unchanged (no invented tag).
 */
/**
 * Whether the selected profile's route supports the documented Gemini audio
 * tags. Only a Gemini-family model id qualifies; any other provider/model gets
 * the tag ONLY through the clearly-labeled `deliveryAllProviders` compatibility
 * opt-in (default off), because it may read the bracket text aloud.
 */
export function deliveryTagAllowedForModel(
  mode: SpeechDeliveryMode,
  profileModel: string,
  applyToAllProviders: boolean,
): boolean {
  if (mode !== "gemini-audio-tags") return false;
  if (applyToAllProviders) return true;
  return /gemini/i.test(profileModel);
}

export function formatOutboundText(text: string, mode: SpeechDeliveryMode, tag: string): string {
  if (mode !== "gemini-audio-tags") return text;
  // The tag is free text typed by the user. Reduce it to one safe token so
  // bracket/angle markup cannot smuggle extra tags or prompt content into the
  // outbound request: strip outer brackets, drop anything outside letters,
  // digits, space, hyphen and underscore, collapse whitespace, cap length.
  const stripped = tag.trim().replace(/^\[+|\]+$/g, "").trim();
  const safe = stripped.replace(/[^A-Za-z0-9 _-]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!safe) return text;
  return `[${safe}] ${text}`;
}

const POSE_TO_GEMINI_TAG: ReadonlyArray<[RegExp, string]> = [
  [/whisper|hush|secret/i, "whispers"],
  [/shout|yell|furious|angry|rage/i, "shouting"],
  [/sad|cry|weep|sob|sorrow/i, "crying"],
  [/laugh|giggle|chuckle|joy|happy|delight/i, "laughs"],
  [/gasp|shock|surpris|startl/i, "gasp"],
  [/nervous|trembl|fear|scared|anxious|panic/i, "trembling"],
  [/sarcas|smug|teas|smirk/i, "sarcastic"],
  [/sigh|tired|weary|exhaust/i, "sighs"],
  [/excit|enthus/i, "excited"],
];

/**
 * Infers a Gemini inline audio expression tag from explicit `<whisper>` / `<shout>` / `<sigh>`
 * prose cues or the current speaker's `poseExpressionId`, returning `""` when neutral.
 */
export function inferAutoDeliveryTag(text: string, poseExpressionId?: string | null): string {
  const lower = text.toLowerCase();
  if (/<whisper\b/i.test(lower)) return "whispers";
  if (/<shout\b|<yell\b/i.test(lower)) return "shouting";
  if (/<sigh\b/i.test(lower)) return "sighs";
  const pose = (poseExpressionId ?? "").trim();
  if (!pose) return "";
  for (const [pattern, tag] of POSE_TO_GEMINI_TAG) {
    if (pattern.test(pose)) return tag;
  }
  return "";
}

export function formatSpeechDelivery(
  spoken: string,
  original: string,
  settings: SpeechSettings,
  model: string,
  direction?: SpeechDirection,
  pose?: string | null,
): string {
  if (!deliveryTagAllowedForModel(settings.deliveryMode, model, settings.deliveryAllProviders)) return spoken;
  const modern = /(?:^|[/:])gemini-3\.8-flash(?:-lite)?-tts$/i.test(model.trim());
  const manual = settings.deliveryTag.trim();
  if (manual) {
    if (!modern) return formatOutboundText(spoken, settings.deliveryMode, manual);
    const event = manual.toLowerCase().replace(/^[\[<]|[\]>]$/g, "").trim();
    const allowed = [...SPEECH_EVENTS, "cough", "giggle", "whispers", "whispering"];
    return allowed.includes(event) ? `<${event}> ${spoken}` : spoken;
  }
  if (sceneSpeechEnabled(settings)) {
    const validated = SpeechDirectionSchema.safeParse(direction);
    if (!validated.success || !/(?:^|[/:])gemini-[\w.-]*tts(?:-preview)?$/i.test(model.trim())) return spoken;
    const cue = validated.data;
    const legacyEvent = { laugh: "laughs", chuckle: "laughs", sigh: "sighs" } as const;
    const event = modern ? cue.event : (legacyEvent[cue.event as keyof typeof legacyEvent] ?? cue.event);
    return insertSpeechEvent(spoken, cue, modern ? `<${event}>` : `[${event}]`);
  }
  return modern ? spoken : formatOutboundText(spoken, settings.deliveryMode, inferAutoDeliveryTag(original, pose));
}
