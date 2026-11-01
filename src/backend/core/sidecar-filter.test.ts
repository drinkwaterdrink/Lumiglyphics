import { describe, expect, test } from "bun:test";
import { prepareNarrative } from "./paragraphs.js";

/** Condensed from a real preset reply: prose interleaved with metadata sidecars. */
const REPLY = `<scene_header sky="storm" location="PRUITT FARMHOUSE" time="4:47 PM" />

"Sunday," Nadine says. "Sunday night, if his daddy's back holds." She lifts a towel and lays it back over the mug like she's tucking it in.

<rose>"Twenty-one,"</rose> she says, to the towels, and keeps walking.

<wardrobe>
Nadine · Wardrobe:
Layers: Slip-stiff apron / cotton tee / cutoff shorts / barefoot
Condition: Clay-streaked, apron board-stiff
Tells: Gray clay packed under every nail
</wardrobe>

<sola_easel>
[0. Overall Core Check] (Core Invariants Checklist)
- [x] Agency Integrity: PASS — Darby assumes labor but leaves the door open.
- [x] Anti-Echo Protocol: PASS — answers move forward.
</sola_easel>

<sola_hud digest="Day 1 · Late Afternoon">
<date>
Day: Day 1
Time: Late Afternoon (4:47 PM)
Sola: the house ate his friend
</date>
<bond>
Pair: User & Darby
Dynamic: Sizing Up Free Labor
</bond>
</sola_hud>

<cider>"Six-three. Six-four with the boots."</cider> She jerks her chin at the window. <cider>"There's a tub on that trailer. It comes off tonight or the yard swallows it by morning."</cider>

<arrow>
Gamble: N/A
Trajectory: N/A
Sola: wind's resting. it's COILING though.
</arrow>`;

function texts(content: string, smartProseFilter = true): string[] {
  return prepareNarrative(content, { smartProseFilter }).paragraphs.map((paragraph) => paragraph.text);
}

describe("structured sidecar filter", () => {
  test("keeps the story prose, including speech and action wrapped in tags", () => {
    const output = texts(REPLY).join("\n");
    expect(output).toContain('"Sunday," Nadine says.');
    expect(output).toContain("Twenty-one");
    expect(output).toContain('"Six-three. Six-four with the boots."');
    expect(output).toContain("She jerks her chin at the window.");
  });

  test("removes unnamed metadata blocks and their contents", () => {
    const output = texts(REPLY).join("\n");
    for (const leaked of ["Wardrobe", "Slip-stiff apron", "Core Invariants", "Agency Integrity", "Day: Day 1", "Pair: User", "Gamble: N/A", "COILING", "<wardrobe>", "<sola_hud", "</sola_easel>", "<arrow>"]) {
      expect(output).not.toContain(leaked);
    }
  });

  test("removes lines that hold only a tag, without touching the text around them", () => {
    const multiline = "<rose>\nHe said he was fine.\n</rose>";
    expect(texts(multiline)).toEqual(["He said he was fine."]);
  });

  test("a one-line tagged sentence is never treated as metadata", () => {
    expect(texts("<tell note=\"ears pink\">She hugs it against her hip like it weighs nothing.</tell>")).toEqual([
      "She hugs it against her hip like it weighs nothing.",
    ]);
  });

  test("catalogued text effects and basic formatting survive the filter", () => {
    expect(texts('He says "<SHAKE>Get down!</SHAKE>" and <b>means</b> it.')).toEqual([
      'He says "<SHAKE>Get down!</SHAKE>" and <b>means</b> it.',
    ]);
  });

  test("comparisons in prose are not mistaken for tags", () => {
    expect(texts("She checked whether x<y and z>w held.")).toEqual(["She checked whether x<y and z>w held."]);
  });

  test("when the smart prose filter is off, sidecars pass through unchanged", () => {
    expect(texts(REPLY, false).join("\n")).toContain("Slip-stiff apron");
  });
});
