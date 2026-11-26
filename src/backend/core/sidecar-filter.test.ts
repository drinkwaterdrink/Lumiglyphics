import { describe, expect, test } from "bun:test";
import { extractInlineCardImagesWithParagraphs, prepareNarrative } from "./paragraphs.js";

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
  test("routes a preset dateline, colored speech, HTML card, deliberation, and Oracle options separately", () => {
    const reply = [
      "@campus|Monday, January 5, 2026|8:18 AM|Cycle 1",
      "Mira stepped through the gate.",
      '<soul_deliberation>{"chime":"Internal direction","whisper":"Ask the model to suggest a lost key"}</soul_deliberation>',
      '<font color="#80CBC4">"Come through,"</font> the guard said.',
      '<div style="border:1px solid gold"><span>ENTRY LOG</span><span>Permit pending</span></div>',
      "The guard shut the register.",
      "<oracle_paths>\n@sun|Follow the guard|I follow the guard.|The gate closes behind you.\n\n@moon|Wait here|I wait by the gate.|The fog thickens.\n</oracle_paths>",
    ].join("\n\n").replaceAll(" ", "\u2800");
    const prepared = prepareNarrative(reply);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "Mira stepped through the gate.", '"Come through," the guard said.', "The guard shut the register.",
    ]);
    expect(prepared.detectedSceneMetadata).toMatchObject({ date: "Monday, January 5, 2026", time: "8:18 AM" });
    expect(prepared.panels).toHaveLength(1);
    expect(prepared.panels[0]?.html).toContain("ENTRY LOG");
    expect(prepared.choices.map(({ label, submission, unlocksAfterParagraph }) => ({ label, submission, unlocksAfterParagraph }))).toEqual([
      { label: "Follow the guard", submission: "I follow the guard.", unlocksAfterParagraph: 2 },
      { label: "Wait here", submission: "I wait by the gate.", unlocksAfterParagraph: 2 },
    ]);
  });

  test("retains ambiguous prose while keeping a private block out of speech, panel and scene hints", () => {
    const reply = '@reader|this line is part of the story.\n\n<muse-deliberation><say speaker="Mira">Private sentence.</say><scene time="2:00 AM"/><div>Private card</div></muse-deliberation>\n\n<letter>Bring the copper key.</letter>';
    const prepared = prepareNarrative(reply);
    expect(prepared.paragraphs.map(p => p.text)).toEqual(["@reader|this line is part of the story.", "Bring the copper key."]);
    expect(prepared.panels).toEqual([]);
    expect(prepared.detectedSceneMetadata).toBeUndefined();
    expect(prepared.detectedSpeakers).toBeUndefined();
  });

  test("preserves source paragraph slots and ignores image directives inside deliberation", () => {
    const reply = 'The gate opened.\n\n<soul_deliberation><img="private"></soul_deliberation>\n\nMira stepped inside. <img="entrance">';
    const { paragraphs } = prepareNarrative(reply);
    expect(paragraphs.map(p => p.sourceIndex)).toEqual([0, 2]);
    expect(extractInlineCardImagesWithParagraphs(reply, paragraphs)).toEqual([{ name: "entrance", paragraphIndex: 1 }]);
  });
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
