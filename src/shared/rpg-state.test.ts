import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRpgPromptGuidance,
  computePacingFrustrationMultiplier,
  computeQuestUrgency,
  evaluateChoiceGate,
  evaluateContextualSkillCheck,
  evaluateContextualSkillCheckDetailed,
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

  it("resets turnsSinceProgress on location/quest progress and applies contextual vitals to skill checks", () => {
    const start = reduceRpgState(null, {
      personaName: "Kael",
      locations: [{ location: "Harbor", description: "Foggy docks." }],
      vitals: { stress: 85, stamina: 10, companions: [{ name: "Mira", hp: 90, maxHp: 100, affinity: 60, status: "healthy" }] },
    });
    assert.equal(start.turnsSinceProgress, 0);

    const idleTurn = reduceRpgState(start, { vitals: { stress: 85, stamina: 10 } });
    assert.equal(idleTurn.turnsSinceProgress, 1);

    const progressTurn = reduceRpgState(idleTurn, {
      locations: [{ location: "Watchtower", description: "High stone tower." }],
    });
    assert.equal(progressTurn.turnsSinceProgress, 0);

    const strCheck = evaluateContextualSkillCheck({ stat: "STR", dc: 14, modifier: 2, rollMode: "normal" }, start.vitals);
    assert.equal(strCheck.modifier, 0);

    const chaCheck = evaluateContextualSkillCheck({ stat: "CHA", dc: 12, modifier: 1, rollMode: "normal" }, {
      ...start.vitals,
      stress: 20,
    });
    assert.equal(chaCheck.modifier, 2);

    const allyCheck = evaluateContextualSkillCheck(
      { stat: "CHA", dc: 14, modifier: 0, rollMode: "normal", reason: "Convince Mira to open the vault" },
      { ...start.vitals, companions: [{ name: "Mira", hp: 90, maxHp: 100, affinity: 80, status: "healthy" }] }
    );
    assert.equal(allyCheck.rollMode, "advantage");

    const gearCheck = evaluateContextualSkillCheck(
      { stat: "INT", dc: 13, modifier: 0, rollMode: "normal", reason: "Unlock the cipher with Brass Key" },
      { ...start.vitals, inventory: ["Brass Key"] }
    );
    assert.equal(gearCheck.rollMode, "advantage");
  });

  it("applies additive rpgDeltas cleanly, clamps bounds, and gates choices on flags/items", () => {
    const base = reduceRpgState(null, {
      personaName: "Lyra",
      vitals: {
        hp: 80,
        maxHp: 100,
        stamina: 50,
        maxStamina: 100,
        stress: 20,
        inventory: ["Iron Dagger"],
        companions: [{ name: "Rowan", hp: 100, maxHp: 100, affinity: 40, status: "healthy" }],
      },
    });
    const withDebt = reduceRpgState(base, {
      rpgDeltas: { flagsSet: { owes_debt: true } },
    });
    const deduped = reduceRpgState(withDebt, {
      rpgDeltas: { itemsAdded: ["iron dagger"] },
    });
    assert.deepEqual(deduped.vitals.inventory, ["Iron Dagger"]);

    const next = reduceRpgState(withDebt, {
      dramaticProgress: true,
      rpgDeltas: {
        hpDelta: 50,
        staminaDelta: -90,
        stressDelta: 15,
        itemsAdded: ["Silver Pass"],
        itemsRemoved: ["Iron Dagger"],
        flagsSet: { met_guild: true },
        flagsCleared: ["owes_debt"],
        companionAffinityDeltas: [{ name: "Rowan", affinityDelta: 40, status: "trusted" }],
      },
    });
    assert.equal(next.vitals.hp, 100);
    assert.equal(next.vitals.stamina, 0);
    assert.equal(next.vitals.stress, 35);
    assert.deepEqual(next.vitals.inventory, ["Silver Pass"]);
    assert.equal(next.flags.met_guild, true);
    assert.equal(next.flags.owes_debt, undefined);
    assert.equal(next.vitals.companions[0]?.affinity, 80);
    assert.equal(next.vitals.companions[0]?.status, "trusted");
    assert.equal(next.turnsSinceProgress, 0);

    const lockedFlag = evaluateChoiceGate({ flags: ["missing_flag"] }, "Talk to the informant first", next);
    assert.deepEqual(lockedFlag, { locked: true, lockedReason: "Talk to the informant first" });

    const lockedItem = evaluateChoiceGate({ items: ["Skeleton Key"] }, undefined, next);
    assert.deepEqual(lockedItem, { locked: true, lockedReason: "Requires Skeleton Key" });

    const unlocked = evaluateChoiceGate({ flags: ["met_guild"], items: ["silver pass"] }, "Locked", next);
    assert.deepEqual(unlocked, { locked: false, lockedReason: null });

    const detailed = evaluateContextualSkillCheckDetailed(
      { stat: "CHA", dc: 14, modifier: 1, rollMode: "normal", reason: "Present Silver Pass to guards" },
      next.vitals,
    );
    assert.ok(detailed.sources.some((s) => s.label === "Base" && s.delta === 1));
    assert.ok(detailed.sources.some((s) => s.label === "Companion Bond" && s.delta === 1));
    assert.ok(detailed.sources.some((s) => s.label === "Bond Advantage" && s.advantage));
    assert.ok(detailed.sources.some((s) => s.label === "Gear: Silver Pass" && s.delta === 1));
    assert.equal(detailed.check.modifier, 3);
    assert.equal(detailed.check.rollMode, "advantage");
  });
});
