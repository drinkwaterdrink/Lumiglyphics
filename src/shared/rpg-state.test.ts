import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRpgPromptGuidance,
  computePacingFrustrationMultiplier,
  computeQuestUrgency,
  formatSkillCheckSubmission,
  normalizeRpgMode,
  reduceRpgState,
  resolveSkillCheck,
} from "./rpg-state.js";

describe("RPG & Adventure Mode (AdventureTime-inspired systems)", () => {
  it("normalizes rpgMode to off by default and accepts lite or full", () => {
    assert.equal(normalizeRpgMode(undefined), "off");
    assert.equal(normalizeRpgMode(null), "off");
    assert.equal(normalizeRpgMode("invalid"), "off");
    assert.equal(normalizeRpgMode("off"), "off");
    assert.equal(normalizeRpgMode("lite"), "lite");
    assert.equal(normalizeRpgMode("FULL"), "full");
  });

  it("resolves 5-tier d20 skill checks with normal, advantage, and disadvantage", () => {
    const check = { stat: "DEX" as const, dc: 15, modifier: 2, rollMode: "normal" as const };
    // Natural 20 -> critical_success
    const critWin = resolveSkillCheck(check, () => 20);
    assert.equal(critWin.tier, "critical_success");
    assert.equal(critWin.total, 22);

    // Natural 1 -> critical_failure even with high modifier
    const critFail = resolveSkillCheck({ ...check, modifier: 20 }, () => 1);
    assert.equal(critFail.tier, "critical_failure");

    // Total >= DC -> success
    const success = resolveSkillCheck(check, () => 13);
    assert.equal(success.tier, "success");
    assert.equal(success.total, 15);

    // Total within 3 of DC -> partial
    const partial = resolveSkillCheck(check, () => 11);
    assert.equal(partial.tier, "partial");
    assert.equal(partial.total, 13);

    // Total < DC - 3 -> failure
    const failure = resolveSkillCheck(check, () => 5);
    assert.equal(failure.tier, "failure");
    assert.equal(failure.total, 7);

    // Advantage takes highest of 2d20
    const rollsAdv = [4, 17];
    let idxAdv = 0;
    const advOutcome = resolveSkillCheck({ ...check, rollMode: "advantage" }, () => rollsAdv[idxAdv++]!);
    assert.deepEqual(advOutcome.rolls, [4, 17]);
    assert.equal(advOutcome.natural, 17);
    assert.equal(advOutcome.tier, "success");

    // Disadvantage takes lowest of 2d20
    const rollsDis = [18, 6];
    let idxDis = 0;
    const disOutcome = resolveSkillCheck({ ...check, rollMode: "disadvantage" }, () => rollsDis[idxDis++]!);
    assert.deepEqual(disOutcome.rolls, [18, 6]);
    assert.equal(disOutcome.natural, 6);
    assert.equal(disOutcome.tier, "failure");

    const formatted = formatSkillCheckSubmission("I vault over the balcony.", advOutcome);
    assert.match(formatted, /^\[SKILL CHECK: DEX DC 15 — SUCCESS \(2d20\(4, 17\)->17 \+2 = 19 vs DC 15\)\]/);
  });

  it("computes AdventureTime quest urgency tiers and quadratic pacing frustration multiplier", () => {
    const baseQuest = {
      id: "quest-gate",
      title: "Seal the Northern Gate",
      objective: "Reach the gate before midnight",
      status: "active" as const,
      deadlineTurns: 10,
      turnsElapsed: 0,
    };
    assert.equal(computeQuestUrgency(baseQuest, 3), "relaxed");
    assert.equal(computeQuestUrgency(baseQuest, 6), "approaching");
    assert.equal(computeQuestUrgency(baseQuest, 9), "imminent");
    assert.equal(computeQuestUrgency(baseQuest, 10), "due_now");
    assert.equal(computeQuestUrgency(baseQuest, 12), "overdue");

    assert.equal(computePacingFrustrationMultiplier(0, 12), 1);
    assert.equal(computePacingFrustrationMultiplier(12, 12), 2);
  });

  it("reduces RPG state across turns and automatically builds the World Node Atlas graph", () => {
    const turn1 = reduceRpgState(null, {
      personaName: "Kael",
      locations: [{ location: "Oakhaven Tavern", description: "Warm hearth and oak tables." }],
      vitals: { hp: 85, maxHp: 100, inventory: ["Iron Dagger", "Lantern"], currency: "45 Gold" },
      quests: [{ title: "Find the Lost Relic", objective: "Search the Sunken Crypt", deadlineTurns: 5 }],
    });
    assert.equal(turn1.turnCounter, 1);
    assert.equal(turn1.vitals.name, "Kael");
    assert.equal(turn1.vitals.hp, 85);
    assert.equal(turn1.quests.length, 1);
    assert.equal(turn1.atlas.nodes.length, 1);
    assert.equal(turn1.atlas.nodes[0]?.label, "Oakhaven Tavern");

    const turn2 = reduceRpgState(turn1, {
      locations: [{ location: "Sunken Crypt", description: "Flooded stone corridor." }],
      vitals: { hp: 70 },
    });
    assert.equal(turn2.turnCounter, 2);
    assert.equal(turn2.vitals.hp, 70);
    assert.equal(turn2.atlas.nodes.length, 2);
    assert.equal(turn2.atlas.edges.length, 1);
    assert.equal(turn2.atlas.currentLocationId, "node-sunken-crypt");

    //Prompt guidance is completely empty when rpgMode is off
    assert.equal(buildRpgPromptGuidance(turn2, "off"), "");
    assert.match(buildRpgPromptGuidance(turn2, "lite"), /RPG SKILL CHECKS \(LITE MODE\)/);
    assert.match(buildRpgPromptGuidance(turn2, "full"), /STANDALONE RPG STATE & QUEST TRACKING \(FULL MODE\)/);
  });
});
