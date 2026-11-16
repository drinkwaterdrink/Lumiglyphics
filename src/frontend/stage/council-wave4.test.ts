import { describe, expect, test } from "bun:test";
import { prepareSpeechText } from "../../shared/text-effects.js";
import { AudioEngine, createMockAudioPlayer, type AudioPlayerElement } from "./audio-engine.js";
import { TypewriterAudioSynthesizer } from "./typewriter-audio.js";
import { effectiveSpeakerAttribution, nameplateForParagraph, speechCursorFor } from "../host/controller.js";
import type { TurnView } from "../../protocol.js";

describe("Council Wave 4 verification", () => {
  test("prepareSpeechText cleans display tags, ruby furigana, HTML entities, and Markdown delimiters", () => {
    const raw = "# Heading\n> <whisper>*Hello*</whisper> <ruby>世界<rt>せかい</rt></ruby><br>**Wait** _now_ &amp; check [this](https://example.com) `code`!";
    expect(prepareSpeechText(raw)).toBe("Heading Hello 世界 Wait now & check this code!");
    expect(prepareSpeechText("<shake>   </shake><br>** **")).toBe("");
    expect(prepareSpeechText("snake_case_identifier stays intact")).toBe("snake_case_identifier stays intact");
  });

  test("effectiveSpeakerAttribution keeps nameplateForParagraph and speechCursorFor in parity for presentation snapshots", () => {
    const view: TurnView = {
      chatId: "c1",
      messageId: "m1",
      swipeId: 0,
      sourceFingerprint: "fp-12345678",
      revision: 0,
      speaker: "TurnSpeaker",
      paragraphs: ["One line."],
      paragraphSpeakers: ["RawSpeaker"],
      assets: [],
      presentation: {
        version: 1,
        snapshots: [
          {
            at: {
              paragraphIndex: 0,
              key: { chatId: "c1", assistantMessageId: "m1", swipeId: 0, sourceFingerprint: "fp-12345678", revision: 0 },
            },
            speakerEntityId: "npc-1",
            entities: [{ id: "npc-1", kind: "npc", name: "ResolvedNPC" }],
            stateByEntity: {},
          },
        ],
      } as any,
    } as any;

    expect(effectiveSpeakerAttribution(view, 0)).toBe("ResolvedNPC");
    expect(nameplateForParagraph(view, 0)).toBe("ResolvedNPC");
    expect(speechCursorFor(view, 0)?.paragraphSpeaker).toBe("ResolvedNPC");
  });

  test("AudioEngine rescues a fading track back to active and stopBgm pauses every fading track across rapid switches", () => {
    const players: AudioPlayerElement[] = [];
    let currentTime = 1000;
    let nextId = 1;
    const timers = new Map<number, { fn: () => void; step: number; next: number }>();
    const tick = (ms: number) => {
      const target = currentTime + ms;
      while (true) {
        let bestId: number | null = null;
        let bestTime = Infinity;
        for (const [id, t] of timers) {
          if (t.next <= target && t.next < bestTime) {
            bestId = id;
            bestTime = t.next;
          }
        }
        if (bestId === null) break;
        currentTime = bestTime;
        const entry = timers.get(bestId)!;
        entry.next += entry.step;
        entry.fn();
      }
      currentTime = target;
    };

    const engine = new AudioEngine({
      crossfadeDuration: 200,
      audioFactory: (src) => {
        const p = createMockAudioPlayer(src);
        players.push(p);
        return p;
      },
      now: () => currentTime,
      setInterval: (fn, ms = 25) => {
        const id = nextId++;
        timers.set(id, { fn, step: Math.max(1, ms), next: currentTime + Math.max(1, ms) });
        return id;
      },
      clearInterval: (id) => {
        timers.delete(id as number);
      },
    });

    engine.playBgm("track-a");
    tick(250);
    engine.playBgm("track-b");
    tick(50);
    // Rescue fading track-a before it finishes fading out
    engine.playBgm("track-a");
    expect(players.length).toBe(2);
    expect(engine.getCurrentBgm()).toBe("track-a");

    // Rapid A -> B -> C + stopBgm must stop all tracks cleanly
    engine.playBgm("track-b");
    engine.playBgm("track-c");
    expect(players.length).toBe(3);
    engine.stopBgm({ fadeDuration: 100 });
    tick(150);
    for (const p of players) {
      expect(p.paused).toBe(true);
    }
    engine.destroy();
  });

  test("TypewriterAudioSynthesizer caches clickNoiseBuffer by sampleRate and clears on destroy", () => {
    let createBufferCalls = 0;
    const prevWindow = (globalThis as Record<string, unknown>).window;
    const prevPerf = (globalThis as Record<string, unknown>).performance;
    let fakeNow = 100;
    (globalThis as Record<string, unknown>).performance = { now: () => fakeNow };
    (globalThis as Record<string, unknown>).window = {
      AudioContext: class {
        sampleRate = 48000;
        currentTime = 0;
        state = "running";
        destination = {};
        createBuffer(_ch: number, len: number, sr: number) {
          createBufferCalls++;
          return { sampleRate: sr, getChannelData: () => new Float32Array(len) };
        }
        createBufferSource() {
          return { buffer: null, connect() {}, start() {} };
        }
        createBiquadFilter() {
          return { type: "", frequency: { value: 0 }, Q: { value: 0 }, connect() {} };
        }
        createGain() {
          return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
        }
        resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
      },
    };
    try {
      const synth = new TypewriterAudioSynthesizer("click", 0.5);
      synth.play();
      fakeNow += 32; // >= 30ms minIntervalMs
      synth.play();
      expect(createBufferCalls).toBe(1);
      synth.destroy();
    } finally {
      (globalThis as Record<string, unknown>).window = prevWindow;
      (globalThis as Record<string, unknown>).performance = prevPerf;
    }
  });
});
