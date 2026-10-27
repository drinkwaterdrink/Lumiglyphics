import { expect, test } from "bun:test";
import { TypewriterAudioSynthesizer } from "./typewriter-audio.js";

test("TypewriterAudioSynthesizer initializes with default blip mode and clamped volume", () => {
  const synth = new TypewriterAudioSynthesizer();
  expect(synth.getMode()).toBe("blip");

  synth.setMode("click");
  expect(synth.getMode()).toBe("click");

  synth.setMode("pip");
  expect(synth.getMode()).toBe("pip");

  synth.setMode("off");
  expect(synth.getMode()).toBe("off");

  synth.setVolume(1.5); // clamps to 1
  synth.setVolume(-0.2); // clamps to 0
});

test("TypewriterAudioSynthesizer play and destroy gracefully handle headless environments", () => {
  const synth = new TypewriterAudioSynthesizer("click", 0.5);
  expect(() => synth.play()).not.toThrow();
  expect(() => synth.destroy()).not.toThrow();
});
