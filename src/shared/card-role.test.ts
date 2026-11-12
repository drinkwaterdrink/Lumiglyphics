import { describe, expect, it } from "bun:test";
import { isScenarioTitle, isLikelyScenarioCard, SCENARIO_KEYWORD_RE } from "./card-role.js";

describe("Scenario Card Detection & Keyword Matching", () => {
  it("detects scenario and institution titles as scenario titles", () => {
    expect(isScenarioTitle("Rookthorn Academy")).toBe(true);
    expect(isScenarioTitle("Crossroads Tavern")).toBe(true);
    expect(isScenarioTitle("Hogwarts RPG")).toBe(true);
    expect(isScenarioTitle("Cyberpunk 2077 CYOA")).toBe(true);
    expect(isScenarioTitle("The Grand Guild")).toBe(true);
    expect(isScenarioTitle("Space Station Alpha")).toBe(true);
    expect(isScenarioTitle("Forgotten Realm Chronicles")).toBe(true);
    expect(isScenarioTitle("The Haunted Manor")).toBe(true);
    expect(isScenarioTitle("Narrator")).toBe(true);
    expect(isScenarioTitle("Storyteller")).toBe(true);
  });

  it("does not classify ordinary character names as scenario titles", () => {
    expect(isScenarioTitle("Aleister")).toBe(false);
    expect(isScenarioTitle("Lady Marseline Vane")).toBe(false);
    expect(isScenarioTitle("Robert Vance")).toBe(false);
    expect(isScenarioTitle("Mira")).toBe(false);
    expect(isScenarioTitle("Elena Rostova")).toBe(false);
    expect(isScenarioTitle("Kaelen")).toBe(false);
  });

  it("isLikelyScenarioCard identifies scenario cards by title, tags, or description prefix", () => {
    expect(isLikelyScenarioCard({ name: "Rookthorn Academy", tags: ["fantasy"] })).toBe(true);
    expect(isLikelyScenarioCard({ name: "Adventure Sandbox", tags: [] })).toBe(true);
    expect(isLikelyScenarioCard({ name: "Aleister", tags: ["scenario", "rpg"] })).toBe(true);
    expect(isLikelyScenarioCard({ name: "Aleister", tags: ["narrator"] })).toBe(true);
    expect(isLikelyScenarioCard({ name: "A Unknown Card", description: "Scenario: You arrive at a remote village." })).toBe(true);
    expect(isLikelyScenarioCard({ name: "Elena", tags: ["female", "elf"], description: "A graceful elf warrior with silver hair." })).toBe(false);
  });
});
