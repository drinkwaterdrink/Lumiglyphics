import { describe, expect, test } from "bun:test";
import { normalizeConfig, DEFAULT_CONFIG } from "../../config.js";
import { DEFAULT_SPEECH_SETTINGS } from "../../speech-config.js";
import { SpeechController, splitSpeechChunks, type SpeechAudioElement, type SpeechCursor } from "./controller.js";
import { inferAutoDeliveryTag } from "./delivery.js";
import { autoCastVoicesForCast } from "./voice-resolution.js";
import type { TtsProfileSnapshot, TtsTransport } from "./transport.js";
import { AmbientSynth, normalizeAmbientPreset } from "../stage/ambient-synth.js";
import { AudioEngine, createMockAudioPlayer } from "../stage/audio-engine.js";

function makeCursor(paragraphIndex: number, text: string, extra?: Partial<SpeechCursor>): SpeechCursor {
  return {
    chatId: "chat-1",
    messageId: "msg-1",
    sourceFingerprint: "fp-1",
    paragraphIndex,
    text,
    paragraphSpeaker: "Narrator",
    turnSpeaker: "Sable",
    ...extra,
  };
}

function makeFakeAudio(): SpeechAudioElement & { emitEnded: () => void } {
  const listeners = new Map<string, Set<() => void>>();
  const el: SpeechAudioElement & { emitEnded: () => void } = {
    src: "",
    volume: 1,
    playbackRate: 1,
    currentTime: 0,
    duration: 5,
    paused: true,
    ended: false,
    async play() {
      el.paused = false;
      el.ended = false;
    },
    pause() {
      el.paused = true;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    emitEnded() {
      el.ended = true;
      el.paused = true;
      listeners.get("ended")?.forEach((fn) => fn());
    },
  };
  return el;
}

describe("Wave B — Zero-Gap Audiobook, Procedural Audio & Auto-Cast", () => {
  test("config normalizes ambientVolume and builtInAudioEnabled", () => {
    expect(DEFAULT_CONFIG.ambientVolume).toBe(0.45);
    expect(DEFAULT_CONFIG.builtInAudioEnabled).toBe(true);
    expect(normalizeConfig({ ambientVolume: 2.5, builtInAudioEnabled: false })).toMatchObject({
      ambientVolume: 1,
      builtInAudioEnabled: false,
    });
    expect(normalizeConfig({ ambientVolume: -1 })).toMatchObject({
      ambientVolume: 0,
      builtInAudioEnabled: true,
    });
  });

  test("splitSpeechChunks splits >2000 char text on sentence boundaries", () => {
    const sentence = "Rain taps softly against the dormitory windowpane. ";
    const longText = sentence.repeat(50).trim();
    expect(longText.length).toBeGreaterThan(2000);
    const chunks = splitSpeechChunks(longText, 1900);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1900);
      expect(c.endsWith(".")).toBe(true);
    }
  });

  test("inferAutoDeliveryTag maps prose cues and poseExpressionId", () => {
    expect(inferAutoDeliveryTag("<whisper>Stay quiet.</whisper>", null)).toBe("whispers");
    expect(inferAutoDeliveryTag("<shout>Look out!</shout>", null)).toBe("shouting");
    expect(inferAutoDeliveryTag("Just a normal line.", "crying_soft")).toBe("crying");
    expect(inferAutoDeliveryTag("Just a normal line.", "neutral")).toBe("");
  });

  test("SpeechController prefetchCursor is idle-safe, caches next cursor during playback, and clamps playbackRate", async () => {
    const synthCalls: string[] = [];
    const audio = makeFakeAudio();
    const transport: TtsTransport = {
      async listProfiles() { return []; },
      async listVoices() { return []; },
      async getProfile(connectionId): Promise<TtsProfileSnapshot> {
        return {
          id: connectionId,
          name: "Narrator",
          provider: "openrouter_tts",
          model: "gemini-2.5-flash-tts",
          voice: "v1",
          isDefault: false,
          updatedAt: "rev-1",
          parametersFingerprint: "p1",
        };
      },
      async synthesize(req) {
        synthCalls.push(req.text);
        return new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/mpeg" });
      },
    };
    let urls = 0;
    const controller = new SpeechController({
      transport,
      createAudio: () => audio,
      createObjectUrl: () => `blob:mock-${++urls}`,
      revokeObjectUrl: () => {},
    });
    controller.setSettings({
      ...DEFAULT_SPEECH_SETTINGS,
      enabled: true,
      narrator: { connectionId: "conn-1", voice: "v1" },
    });
    controller.setActive(true);
    controller.setPlaybackRate(1.3);
    expect(controller.getPlaybackRate()).toBe(1.3);
    controller.setPlaybackRate(5);
    expect(controller.getPlaybackRate()).toBe(2);

    const c0 = makeCursor(0, "First paragraph.");
    const c1 = makeCursor(1, "Second paragraph.");

    // Idle guard: prefetchCursor must do nothing before playback starts
    controller.setCursor(c0);
    controller.prefetchCursor(c1);
    await new Promise((r) => setTimeout(r, 15));
    expect(synthCalls.length).toBe(0);

    // During active playback, prefetchCursor warms the cache for c1
    await controller.playCurrent();
    expect(audio.playbackRate).toBe(2);
    controller.prefetchCursor(c1);
    await new Promise((r) => setTimeout(r, 25));
    expect(synthCalls).toEqual(["First paragraph.", "Second paragraph."]);

    // Advancing to c1 plays immediately from cache without a third synthesize call
    controller.setCursor(c1, { autoplay: true });
    await new Promise((r) => setTimeout(r, 25));
    expect(synthCalls.length).toBe(2);

    controller.dispose();
  });

  test("AmbientSynth normalizes presets, handles indoor muffling, and no-ops safely without AudioContext", () => {
    expect(normalizeAmbientPreset("Heavy Rain")).toBe("heavy_rain");
    expect(normalizeAmbientPreset("Thunderstorm")).toBe("storm");
    expect(normalizeAmbientPreset("none")).toBeNull();

    const synth = new AmbientSynth();
    expect(() => {
      synth.setAtmosphere("rain", { indoor: true });
      synth.setSpeechDucking(true);
      synth.playFoley("parchment", 0.8);
      synth.playFoley("bond_chime", 0.8);
      synth.playFoley("dice_roll", 0.8);
      synth.dispose();
    }).not.toThrow();

    const engine = new AudioEngine({
      audioFactory: createMockAudioPlayer,
      ambientVolume: 0.5,
      builtInAudioEnabled: true,
    });
    expect(() => {
      engine.setAtmosphere("storm", { indoor: true });
      engine.playBgm("https://example.com/theme.mp3", { crossfadeDuration: 0 });
      engine.stopBgm({ fadeDuration: 0 });
      engine.playFoley("page_turn");
      engine.destroy();
    }).not.toThrow();
  });

  test("autoCastVoicesForCast assigns distinct voices and preserves manual overrides", () => {
    const result = autoCastVoicesForCast({
      chatId: "chat-9",
      cast: [
        { name: "Sable", gender: "female", demeanor: "calm" },
        { name: "Rowan", gender: "male", demeanor: "gruff" },
        { name: "Miri", gender: "female", demeanor: "bright" },
      ],
      availableVoices: [
        { connectionId: "c1", voiceId: "v-f1", label: "Female Soft" },
        { connectionId: "c1", voiceId: "v-m1", label: "Male Deep" },
        { connectionId: "c1", voiceId: "v-f2", label: "Female Bright" },
      ],
      existingOverrides: {
        "chat::chat-9::miri": { connectionId: "c1", voice: "custom-miri" },
      },
    });
    expect(result.assignedCount).toBe(2);
    expect(result.nextOverrides["chat::chat-9::miri"]).toEqual({ connectionId: "c1", voice: "custom-miri" });
    expect(result.nextOverrides["chat::chat-9::sable"]?.voice).toMatch(/^v-f/);
    expect(result.nextOverrides["chat::chat-9::rowan"]?.voice).toBe("v-m1");
  });
});
test("speech chunks stay within the transport limit without sentence breaks", () => {
  const text = "x".repeat(2001);
  const chunks = splitSpeechChunks(text, 1900);
  expect(chunks.every(chunk => chunk.length <= 1900)).toBe(true);
  expect(chunks.join("")).toBe(text);
});
