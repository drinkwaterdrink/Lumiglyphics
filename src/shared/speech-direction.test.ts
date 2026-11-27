import { expect, test } from "bun:test";
import { insertSpeechEvent, normalizeSpeechDirections } from "./speech-direction.js";

test("keeps a uniquely grounded direction on the cleaned speech copy", () => {
  const text = "Wait… did you hear that?";
  const cue = { paragraphIndex: 1, anchor: "Wait…", event: "short pause" } as const;
  expect(normalizeSpeechDirections([
    { ...cue, anchor: "hear", event: "door slam" }, { ...cue, paragraphIndex: 2 }, cue,
    { ...cue, anchor: "hear that?" }, { ...cue, paragraphIndex: 0, anchor: "Look" },
  ], [{ index: 1, text }, { index: 0, text: "Look around. Look again." }])).toEqual([cue]);
  expect(insertSpeechEvent(text, cue, "<short pause>")).toBe("Wait… <short pause> did you hear that?");
  expect(insertSpeechEvent("That line changed.", cue, "<short pause>")).toBe("That line changed.");
});
