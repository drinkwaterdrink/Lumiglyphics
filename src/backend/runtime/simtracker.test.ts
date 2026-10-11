import assert from "node:assert/strict";
import test from "node:test";
import { extractSimTracker, trackerContext, matchTrackerCharacter } from "./simtracker";
const message = (id: string, value: unknown) => ({ id, content: `<tracker>${JSON.stringify(value)}</tracker>` });

test("tracker_uses_latest_supported_snapshot_through_target", () => {
  const evidence = extractSimTracker([
    message("old", { characters: [{ name: "Mira", appearance: { hair: "red" } }] }),
    message("target", { characterData: [{ name: "Mira", appearance: { hair: { color: "silver", style: "braided" }, eyes: "green" }, wardrobe: { summary: "raincoat" }, live: { position: "doorway" } }] }),
    message("future", { characters: [{ name: "Mira", appearance: { hair: "blue" } }] })
  ], "target");
  assert.equal(evidence.status, "detected");
  assert.equal(evidence.sourceMessageId, "target");
  assert.match(evidence.cast[0]!.identity, /silver.*braided/);
  assert.match(evidence.cast[0]!.attire, /raincoat/);
  assert.match(evidence.cast[0]!.sceneState, /doorway/);
  assert.doesNotMatch(trackerContext(evidence), /blue|red/);
});

test("tracker_failure_is_nonfatal_and_bounded", () => {
  assert.equal(extractSimTracker([{ id: "a", content: "ordinary prose" }], "a").status, "not_found");
  assert.equal(extractSimTracker([{ id: "a", content: "<tracker>{ broken }</tracker>" }], "a").status, "malformed");
  assert.equal(extractSimTracker([message("a", { other: true })], "a").status, "unsupported");
  assert.equal(extractSimTracker([message("a", { worldData: { location: "garden" } })], "a").status, "detected");
  assert.equal(extractSimTracker([message("a", { characters: [{ name: "Mira" }] })], "missing").status, "not_found");
  const cast = Array.from({ length: 25 }, (_, i) => ({ name: `Person${i}`, appearance: { summary: "x".repeat(4000) } }));
  const evidence = extractSimTracker([message("a", { characters: cast })], "a");
  assert.ok(evidence.cast.length <= 20);
  assert.ok(trackerContext(evidence).length <= 8000);
  const history = [message("old", { characters: [{ name: "Mira" }] }), ...Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, content: "hello" }))];
  assert.equal(extractSimTracker(history, "m29").status, "not_found");
});

test("tracker_extracts_visible_facts_only_and_does_not_merge_aliases", () => {
  const evidence = extractSimTracker([message("a", { characters: [
    { name: "Mira", aliases: ["Captain"], appearance: { hair: "silver", eyes: "green" }, present: false, id: "internal", role: "guard", accent_color: "red", stats: { strength: 20 } },
    { name: "Robin", aliases: ["Captain"], appearance: { hair: "black" } }
  ] })], "a");
  assert.equal(evidence.cast[0]!.present, false);
  assert.equal(evidence.cast[1]!.present, null);
  assert.equal(matchTrackerCharacter(evidence, "Captain"), null);
  assert.equal(matchTrackerCharacter(evidence, "Mira")?.name, "Mira");
  assert.doesNotMatch(trackerContext(evidence), /internal|accent_color|strength|guard/);
});

test("planner tracker context includes unique aliases and excludes ambiguous aliases", () => {
  const evidence = extractSimTracker([message("a", { characters: [
    { name: "Mira", aliases: ["Silver", "Captain"], appearance: { hair: "silver" } },
    { name: "Robin", aliases: ["Captain"], appearance: { hair: "black" } }
  ] })], "a");
  assert.match(trackerContext(evidence), /Mira.*aliases: Silver/);
  assert.doesNotMatch(trackerContext(evidence), /Captain/);
});
