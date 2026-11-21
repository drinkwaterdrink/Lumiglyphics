import { describe, expect, test } from "bun:test";
import { extractInlineCardImages, extractInlineCardImagesWithParagraphs, prepareNarrative } from "./paragraphs.js";

describe("narrative preparation", () => {
  test("keeps paragraph source indexes after removing metadata", () => {
    const prepared = prepareNarrative("First paragraph.\n\n<Think>hidden</Think>\n\nSecond paragraph.", { ignoredTags: ["Think"] });
    expect(prepared.paragraphs).toEqual([
      { index: 0, sourceIndex: 0, text: "First paragraph." },
      { index: 1, sourceIndex: 2, text: "Second paragraph." }
    ]);
  });

  test("extracts single authored choices with attributes", () => {
    const prepared = prepareNarrative([
      "The door waits.",
      "",
      "<Choice id=\"enter\" value=\"I enter the room.\">Enter</Choice>",
      "<Choice message='I walk away.'>Leave</Choice>"
    ].join("\n"));
    expect(prepared.paragraphs).toEqual([{ index: 0, sourceIndex: 0, text: "The door waits." }]);
    expect(prepared.choices).toEqual([
      { id: "enter", label: "Enter", submission: "I enter the room.", source: "authored", unlocksAfterParagraph: 0 },
      { id: expect.stringMatching(/^choice-/), label: "Leave", submission: "I walk away.", source: "authored", unlocksAfterParagraph: 0 }
    ]);
  });

  test("does not renumber narrative blocks around a choice block", () => {
    const prepared = prepareNarrative("Before.\n\n<Choice>Continue</Choice>\n\nAfter.");
    expect(prepared.paragraphs).toEqual([
      { index: 0, sourceIndex: 0, text: "Before." },
      { index: 1, sourceIndex: 2, text: "After." }
    ]);
  });

  test("extracts a bullet list from one Choice block and creates stable unique IDs", () => {
    const content = "Answer now.\n\n<Choice>\n- Yes\n- No\n- Yes\n</Choice>";
    const first = prepareNarrative(content);
    const second = prepareNarrative(content);
    expect(first.choices.map(({ label }) => label)).toEqual(["Yes", "No", "Yes"]);
    expect(new Set(first.choices.map(({ id }) => id))).toHaveLength(3);
    expect(first.choices.map(({ id }) => id)).toEqual(second.choices.map(({ id }) => id));
  });

  test("extractInlineCardImages extracts asset names and strips tags", () => {
    const raw = 'Look at this: <img="neeko_excited"> and {{img::neeko_smug}} with <img src="neeko_neutral">';
    const extracted = extractInlineCardImages(raw);
    expect(extracted.assetNames).toEqual(["neeko_excited", "neeko_smug", "neeko_neutral"]);
    expect(extracted.text).toBe("Look at this:  and  with ");
  });


  test("extractInlineCardImages treats RisuAI <pimg=\"name\"> like <img=\"name\">", () => {
    const raw = "Seated upon the throne was the Empress.\n\n<pimg=\"aurelia\">\n\nHer golden eyes shone.\n\n<pimg=\"elizabeth_smirking\">";
    const extracted = extractInlineCardImages(raw);
    expect(extracted.assetNames).toEqual(["aurelia", "elizabeth_smirking"]);
    expect(extracted.text).not.toContain("pimg");
    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map((p) => p.text)).toEqual(["Seated upon the throne was the Empress.", "Her golden eyes shone."]);
    const placed = extractInlineCardImagesWithParagraphs(raw, prepared.paragraphs);
    expect(placed).toEqual([{ name: "aurelia", paragraphIndex: 0 }, { name: "elizabeth_smirking", paragraphIndex: 1 }]);
  });

  test("extractInlineCardImages supports cmd attribute tags and trims trailing whitespace", () => {
    const raw = 'Morgan stands before you.\n\n<img cmd="Morgan_dress">\n\nShe smiles softly.\n\n<img cmd="Morgan_dress ">';
    const extracted = extractInlineCardImages(raw);
    expect(extracted.assetNames).toEqual(["Morgan_dress", "Morgan_dress"]);
    expect(extracted.text).not.toContain("img");
    expect(extracted.text).not.toContain("cmd");
    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map((p) => p.text)).toEqual(["Morgan stands before you.", "She smiles softly."]);
    const placed = extractInlineCardImagesWithParagraphs(raw, prepared.paragraphs);
    expect(placed).toEqual([
      { name: "Morgan_dress", paragraphIndex: 0 },
      { name: "Morgan_dress", paragraphIndex: 1 },
    ]);
  });

  test("extractInlineCardImages supports unquoted img=expression tags", () => {
    const raw = 'An expression: <img=neeko_curious> and quoted <img="neeko_happy">';
    const extracted = extractInlineCardImages(raw);
    expect(extracted.assetNames).toEqual(["neeko_curious", "neeko_happy"]);
    expect(extracted.text).toBe("An expression:  and quoted ");
  });

  test("extractInlineCardImagesWithParagraphs maps unquoted and pipe-caption markers", () => {
    const content = 'She smiles.\n\n<img=neeko_curious> | <"😏:Hi">\n\nThen she looks away.';
    const prepared = prepareNarrative(content);
    const images = extractInlineCardImagesWithParagraphs(content, prepared.paragraphs);
    expect(images).toEqual([{ name: "neeko_curious", paragraphIndex: 0 }]);
  });

  test("prepareNarrative strips inline card images from paragraphs", () => {
    const content = 'Neeko says hello! <img="neeko_wave">\n\nShe winks. {{img::neeko_wink}}';
    const prepared = prepareNarrative(content);
    expect(prepared.paragraphs).toEqual([
      { index: 0, sourceIndex: 0, text: "Neeko says hello!" },
      { index: 1, sourceIndex: 1, text: "She winks." },
    ]);
  });

  test("prepareNarrative strips custom ignoredTags including bracket syntax", () => {
    const content = [
      "Before status window.",
      "",
      "<status>",
      "HP: 100/100",
      "MP: 50/50",
      "</status>",
      "",
      "[Status]",
      "Level 5 Adventurer",
      "[/Status]",
      "",
      "After status window.",
    ].join("\n");
    const prepared = prepareNarrative(content, { ignoredTags: ["status"] });
    expect(prepared.paragraphs).toEqual([
      { index: 0, sourceIndex: 0, text: "Before status window." },
      { index: 1, sourceIndex: 3, text: "After status window." },
    ]);
  });

  test("extractChoices rejects numeric attributes.value and preserves actual choice text", () => {
    const content = 'Some story text.\n\n<Choice id="2" value="2">Step closer and call her bluff</Choice>';
    const prepared = prepareNarrative(content);
    expect(prepared.choices).toEqual([
      {
        id: "2",
        label: "Step closer and call her bluff",
        submission: "Step closer and call her bluff",
        source: "authored",
        unlocksAfterParagraph: 0,
      },
    ]);
  });

  test("automatically filters heuristic tags without explicit ignoredTags", () => {
    const raw = [
      "<think>",
      "Internal reasoning should never appear in reading mode.",
      "</think>",
      "",
      "<scene_header location=\"City Archives\" time=\"Midnight\" atmosphere=\"Heavy rain\">",
      "",
      "The heavy rain hammered relentlessly against the stained glass.",
      "",
      "<ooc>Remember to stay in character</ooc>",
      "",
      "She turned toward the door with an uneasy expression."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "The heavy rain hammered relentlessly against the stained glass.",
      "She turned toward the door with an uneasy expression."
    ]);
    expect(prepared.detectedSceneMetadata).toEqual({
      location: "City Archives",
      timeOfDay: "Midnight",
      atmosphere: "Heavy rain"
    });
  });

  test("extracts scene metadata from bracket syntax and filters it from narrative text", () => {
    const raw = [
      "[Scene: Grand Ballroom | Lighting: Chandelier warm glow | Time: Dusk]",
      "",
      "The orchestra began playing a solemn waltz.",
      "",
      "[Status: Active Combat]",
      "",
      "Everyone turned their eyes toward the balcony."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "The orchestra began playing a solemn waltz.",
      "Everyone turned their eyes toward the balcony."
    ]);
    expect(prepared.detectedSceneMetadata).toEqual({
      location: "Grand Ballroom",
      lighting: "Chandelier warm glow",
      timeOfDay: "Dusk"
    });
  });

  test("extracts scene metadata from single-line pseudo-tags like <scene header: ...>", () => {
    const raw = [
      "<scene header: Tokyo Rooftop, Sunset>",
      "A cool breeze stirred the hanging lanterns.",
      "She leaned against the railing."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "A cool breeze stirred the hanging lanterns.\nShe leaned against the railing."
    ]);
    expect(prepared.detectedSceneMetadata).toEqual({
      location: "Tokyo Rooftop",
      timeOfDay: "Sunset"
    });
  });
  test("filters preset AI reasoning, cognition traces, and neural docks from story text", () => {
    const raw = [
      "<cognition_trace>",
      "0. Fork Protocol CHOICE DETECTION: None.",
      "STATE RECALL: Manifest pending.",
      "</cognition_trace>",
      "",
      "The clerk looked up from his ledger.",
      "",
      "<eidos_dialogue speaker=\"Tulver\" color=\"#B87333\">\"Sign the line.\"</eidos_dialogue>",
      "",
      "───",
      "",
      "<details><summary>Color Registry</summary>Aleister #8FA8C8</details>",
      "",
      "<neural_dock>",
      "<parasite_feed>Waiting on signature</parasite_feed>",
      "[Affinity: 0% | Δ(+0%) | Take: 1]",
      "<subject_status>Subject: Aleister</subject_status>",
      "</neural_dock>"
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "The clerk looked up from his ledger.",
      "\"Sign the line.\""
    ]);
    expect(prepared.detectedSpeakers).toEqual([
      { paragraphIndex: 1, speaker: "Tulver" }
    ]);
  });

  test("unwraps custom dialogue and thought tags with speaker attribution", () => {
    const raw = [
      "The rain drummed against the windowpane.",
      "",
      "<eidos_dialogue speaker=\"Tulver\">\"East stair, second landing.\"</eidos_dialogue>",
      "",
      "<eidos_thought speaker=\"Tulver\">Third column filled before noon.</eidos_thought>",
      "",
      "He turned back to the register."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "The rain drummed against the windowpane.",
      "\"East stair, second landing.\"",
      "Third column filled before noon.",
      "He turned back to the register."
    ]);
    expect(prepared.detectedSpeakers).toEqual([
      { paragraphIndex: 1, speaker: "Tulver" },
      { paragraphIndex: 2, speaker: "Tulver" }
    ]);
  });

  test("completely filters <true_thoughts> character internal monologue tags from reader dialogue and prose", () => {
    const raw = [
      "Your face runs hot as you look her over.",
      "",
      "<true_thoughts character=\"Marseline Vane\">It stood up out of the packing and picked his arm like a berth assignment.</true_thoughts>",
      "",
      "\"Uh, hello. What's your name?\"",
      "",
      "<true_thoughts character=\"Kallirrhoe Tskhin\">Grandmother's stories had this exact thing.</true_thoughts>",
      "",
      "\"I am what was sent,\" she says."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "Your face runs hot as you look her over.",
      "\"Uh, hello. What's your name?\"",
      "\"I am what was sent,\" she says."
    ]);
  });

  test("extracts spatial scene location from structured continuity blocks", () => {
    const raw = [
      "<cognition_trace>",
      "<b>Spatial</b>: Registry Hall counter — Aleister at the counter edge; Tulver seated behind ledger.",
      "</cognition_trace>",
      "",
      "Aleister stood before the wooden desk."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "Aleister stood before the wooden desk."
    ]);
    expect(prepared.detectedSceneMetadata?.location).toBe("Registry Hall counter");
  });
  test("generalizes to arbitrary presets: filters cyberpunk matrix_state, json fences, and unwraps line speaker", () => {
    const raw = [
      "<matrix_state>",
      "Status: Stealth",
      "Alert Level: 2",
      "</matrix_state>",
      "",
      "```json",
      "{ \"active_cyberware\": [\"sandevistan\"] }",
      "```",
      "",
      "Vance checked the charge on his neural port before stepping into the alley.",
      "",
      "<line speaker=\"Kage\">\"Camera drones on the north bridge. Stay low.\"</line>",
      "",
      "The neon signs hummed through the acid rain."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "Vance checked the charge on his neural port before stepping into the alley.",
      "\"Camera drones on the north bridge. Stay low.\"",
      "The neon signs hummed through the acid rain."
    ]);
    expect(prepared.detectedSpeakers).toEqual([
      { paragraphIndex: 1, speaker: "Kage" }
    ]);
  });

  test("generalizes to fantasy RPG presets: filters quest_log, dice checks, and unwraps npc character tag", () => {
    const raw = [
      "<quest_log>",
      "Current Objective: Locate the Silver Key",
      "</quest_log>",
      "",
      "🎲 Roll: 1d20 + 4 = 19 (Perception check passed)",
      "",
      "The iron doors grind open, revealing a torchlit hall.",
      "",
      "<npc character=\"Grimbald\">\"Watch your step. The stones are rigged with darts.\"</npc>",
      "",
      "[Inventory: Torch (2) | Health: 85/100]",
      "",
      "Aleister stepped forward cautiously, raising his lantern."
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "The iron doors grind open, revealing a torchlit hall.",
      "\"Watch your step. The stones are rigged with darts.\"",
      "Aleister stepped forward cautiously, raising his lantern."
    ]);
    expect(prepared.detectedSpeakers).toEqual([
      { paragraphIndex: 1, speaker: "Grimbald" }
    ]);
  });

  test("filters <eidos_chapter> metadata block from story prose and extracts location and title", () => {
    const raw = [
      "<eidos_chapter>",
      "Chapter: 1",
      "Part: 1",
      "Title: Sign First, Thank After",
      "Location: Orth · Delver Guild HQ, Registry Hall",
      "Focus: Tulver",
      "</eidos_chapter>",
      "",
      "The words come out awkward and half-breathless — right, well, thanks — and Aleister Crowley is already looking toward the doorway.",
      "",
      "<eidos_dialogue speaker=\"Tulver\" color=\"#B87333\" effect=\"plain\">\"Name's not on the manifest. Until it is, you're a man holding a whistle with no slot.\"</eidos_dialogue>"
    ].join("\n");

    const prepared = prepareNarrative(raw);
    expect(prepared.paragraphs.map(p => p.text)).toEqual([
      "The words come out awkward and half-breathless — right, well, thanks — and Aleister Crowley is already looking toward the doorway.",
      "\"Name's not on the manifest. Until it is, you're a man holding a whistle with no slot.\""
    ]);
    expect(prepared.detectedSceneMetadata?.location).toBe("Orth · Delver Guild HQ, Registry Hall");
    expect(prepared.detectedSceneMetadata?.title).toBe("Sign First, Thank After");
    expect(prepared.detectedSpeakers).toEqual([
      { paragraphIndex: 1, speaker: "Tulver" }
    ]);
  });

  test("splits dense monolithic walls and single-newline dialogue into readable VN beats without dropping text", () => {
    const denseWall = [
      "Other ways. Laura kept her thumb on the cold zinc rim of the jar and looked at the salt shaker instead of his mouth.",
      "Three glasses of cheap pinot on an empty stomach had already softened the fence she usually kept around forty-four years of good sense, and Dana bringing up that five-o'clock timer hadn't helped.",
      "She knew what relaxing could do to a woman who had spent six months sleeping alone on one side of a king bed.",
      "That did not mean she was going to hotbox her own kitchen with a twenty-year-old guest before dinner.",
      "Riss had a nose like a bloodhound, the carpet in the living room held every smell for three days, and the cop two doors down was bound to step onto his back deck the second a cloud of weed smoke drifted over the fence.",
      "Still, the dull ache in her left hip wasn't waiting until Monday, and the gas-station gummies in her purse weren't worth the sugar they were rolled in.",
      "Two hits outside on the patio with a sweatshirt on would fix that without ruining the house."
    ].join(" ");

    const segmented = prepareNarrative(denseWall);
    expect(segmented.paragraphs.length).toBeGreaterThanOrEqual(4);
    expect(segmented.paragraphs.every((p) => p.text.length <= 250)).toBe(true);
    expect(segmented.paragraphs.map((p) => p.text).join(" ")).toBe(denseWall);

    const rawMode = prepareNarrative(denseWall, { smartBeatSegmentation: false });
    expect(rawMode.paragraphs).toHaveLength(1);
    expect(rawMode.paragraphs[0]!.text).toBe(denseWall);

    const singleNewlineTurns = "\"Wait,\" Elena whispered, keeping her hand near the latch.\nMarcus stepped back from the rain-streaked glass. \"They found the key.\"";
    const turnPrepared = prepareNarrative(singleNewlineTurns);
    expect(turnPrepared.paragraphs.map((p) => p.text)).toEqual([
      "\"Wait,\" Elena whispered, keeping her hand near the latch.",
      "Marcus stepped back from the rain-streaked glass.",
      "\"They found the key.\""
    ]);
  });

  test("does not swallow opening <prose> narration up to </true_thoughts> when earlier metadata tags are mismatched or unclosed", () => {
    const mismatchedPreProse = [
      "<reasoning>",
      "Plan the rainy inn arrival and avoid echoing.",
      "</thinking>",
      "",
      "<prose>",
      "You push past the wet iron gate and climb Marten House's broad stone steps.",
      "",
      "Iron slams three times deep inside the stone wall beside the staircase.",
      "",
      "<true_thoughts character=\"Orin\">Five past five and the fourth-floor boiler picks now to hammer.</true_thoughts>",
      "",
      "Orin sets his pen down and brushes dry grit from his sleeve. <span style=\"color:#E2C275\">\"Pfft, fourth-floor kickback again.\"</span>",
      "</prose>"
    ].join("\n");

    const mismatchedResult = prepareNarrative(mismatchedPreProse);
    expect(mismatchedResult.paragraphs.map((p) => p.text)).toEqual([
      "You push past the wet iron gate and climb Marten House's broad stone steps.",
      "Iron slams three times deep inside the stone wall beside the staircase.",
      "Orin sets his pen down and brushes dry grit from his sleeve.",
      "\"Pfft, fourth-floor kickback again.\""
    ]);

    const unclosedSameTag = [
      "<true_thoughts>",
      "Private note before prose with missing closer.",
      "",
      "<prose>",
      "You push past the wet iron gate and climb Marten House's broad stone steps.",
      "",
      "<true_thoughts>",
      "Second unclosed marker inside prose.",
      "",
      "Iron slams three times deep inside the stone wall beside the staircase.",
      "",
      "<true_thoughts character=\"Orin\">Five past five and the boiler hammers.</true_thoughts>",
      "",
      "Orin sets his pen down and brushes dry grit from his sleeve.",
      "</prose>"
    ].join("\n");

    const unclosedResult = prepareNarrative(unclosedSameTag, { ignoredTags: ["true_thoughts"] });
    expect(unclosedResult.paragraphs.map((p) => p.text)).toEqual([
      "You push past the wet iron gate and climb Marten House's broad stone steps.",
      "Second unclosed marker inside prose.",
      "Iron slams three times deep inside the stone wall beside the staircase.",
      "Orin sets his pen down and brushes dry grit from his sleeve."
    ]);

    const inlineMentionInClosedReasoning = [
      "<reasoning>",
      "Note: wrap the story inside <prose> tags cleanly.",
      "</reasoning>",
      "",
      "<prose>",
      "The lantern flickers at the threshold.",
      "</prose>"
    ].join("\n");

    const inlineMentionResult = prepareNarrative(inlineMentionInClosedReasoning);
    expect(inlineMentionResult.paragraphs.map((p) => p.text)).toEqual([
      "The lantern flickers at the threshold."
    ]);
  });

  test("filters emoji pipe HUD header, GFX_START..GFX_END, trailing unclosed GFX_START, and <internal_states>/<state:*> blocks while extracting metadata and preserving <cornflower> speech", () => {
    const sample = `[🕰️\u28005:15\u2800PM\u2800|\u2800🗓️\u2800Monday,\u2800September\u280018,\u28002000\u2800|\u2800📍\u2800Marten\u2800House\u2800-\u2800Fourth\u2800Floor\u2800Corridor\u2800|\u2800🌧️\u2800Cold\u2800Mountain\u2800Rain,\u280052°F\u2800]

You\u2800pass\u2800through\u2800the\u2800open\u2800iron\u2800gate\u2800of\u2800Marten\u2800House.

<cornflower>"Watch\u2800the\u2800third\u2800step\u2800down\u2800on\u2800the\u2800next\u2800flight,\u2800it's\u2800slick,"</cornflower>\u2800she\u2800says,\u2800shifting\u2800the\u2800heavy\u2800basket\u2800higher\u2800on\u2800her\u2800arm.

You\u2800stop\u2800outside\u2800the\u2800dark\u2800wooden\u2800door\u2800marked\u280047.

<!--\u2800GFX_START\u2800-->
<internal_states>
<state:world>
\u2800<loc>Marten\u2800House\u2800-\u2800Fourth\u2800Floor\u2800Corridor</loc>
\u2800<time>5:15\u2800PM</time>
</state:world>
<state:thoughts>
\u2800<ent_think><name>Naomi\u2800Vance</name><tQ1>Get\u2800this\u2800laundry\u2800downstairs.</tQ1></ent_think>
</state:thoughts>
<state:vent>
\u2800<vent>Okay\u2800we\u2800FINALLY\u2800have\u2800the\u2800full\u280016-section\u2800state\u2800engine\u2800wired\u2800up!</vent>
</state:vent>
</internal_states>
<!--\u2800GFX_END\u2800-->`;

    const res = prepareNarrative(sample);
    expect(res.paragraphs.map((p) => p.text)).toEqual([
      "You pass through the open iron gate of Marten House.",
      "\"Watch the third step down on the next flight, it's slick,\" she says, shifting the heavy basket higher on her arm.",
      "You stop outside the dark wooden door marked 47."
    ]);
    expect(res.detectedSceneMetadata?.time).toBe("5:15 PM");
    expect(res.detectedSceneMetadata?.date).toBe("Monday, September 18, 2000");
    expect(res.detectedSceneMetadata?.location).toBe("Marten House - Fourth Floor Corridor");
    expect(res.detectedSceneMetadata?.temperature).toBe("52°F");
    expect(res.detectedSceneMetadata?.weather).toBe("Cold Mountain Rain");

    // Also strip everything after GFX_START even when GFX_END is missing (e.g. unclosed or streaming)
    const truncatedGfx = "Story beat one.\n\n<!-- GFX_START -->\n<internal_states>\n<state:vent><vent>Leaked notes</vent></state:vent>";
    expect(prepareNarrative(truncatedGfx).paragraphs.map((p) => p.text)).toEqual([
      "Story beat one."
    ]);
  });

  test("Wave 1: preserves diegetic document blocks (<letter>, <ship_log>, [NOTICE: ...]) and extracts spoiler-free structuredHints without leaking thoughts", () => {
    const sample = [
      "<letter>",
      "From: Naomi Vance",
      "To: Occupant of Room 47",
      "Keep the radiator bleed valve cracked open tonight.",
      "</letter>",
      "",
      "[NOTICE: Hot water off after midnight.]",
      "",
      "<ship_log>",
      "Entry 14: Cold mountain rain continues.",
      "</ship_log>",
      "",
      "<!-- GFX_START -->",
      "<internal_states>",
      "<state:world><loc>Marten House Lobby</loc><features>oak desk, sign-in ledger</features></state:world>",
      "<state:onscreen><ent_on><name>Orin Vance</name></ent_on></state:onscreen>",
      "<state:thoughts><ent_think><name>Secret Mole</name><why>Hidden betrayal plot</why></ent_think></state:thoughts>",
      "<inventory>brass key, folded slip</inventory>",
      "</internal_states>",
      "<!-- GFX_END -->",
    ].join("\n");

    const prepared = prepareNarrative(sample);
    const joined = prepared.paragraphs.map((p) => p.text).join("\n");
    expect(joined).toContain("From: Naomi Vance");
    expect(joined).toContain("Keep the radiator bleed valve cracked open tonight.");
    expect(joined).toContain("[NOTICE: Hot water off after midnight.]");
    expect(joined).toContain("Entry 14: Cold mountain rain continues.");
    expect(prepared.structuredHints?.location).toBe("Marten House Lobby");
    expect(prepared.structuredHints?.presentNpcs).toContain("Orin Vance");
    expect(prepared.structuredHints?.presentNpcs).not.toContain("Secret Mole");
    expect(prepared.structuredHints?.inventoryItems).toContain("brass key");
    expect(prepared.structuredHints?.knownDocuments).toEqual(expect.arrayContaining(["sign-in ledger", "folded slip"]));
  });
});
