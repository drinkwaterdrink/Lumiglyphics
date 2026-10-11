import { expect, test } from "bun:test";
import { repairScenarioSubjects } from "./scenario-subjects.js";

const input = () => ({
  scenes: [{ startParagraph: 0, character: "Rookhaven Academy", cast: ["Rookhaven Academy", "Aleister"] }],
  cues: [{ paragraphIndex: 0, character: "Rookhaven Academy" }],
  characters: [{ name: "Aleister", description: "brown hair, green eyes, tall man" }],
  speakers: [{ paragraphIndex: 0, name: "Rookhaven Academy" }]
});

test("scenario wrapper resolves to the sole described scene participant", () => {
  const original = input();
  const result = repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false });
  expect(result.scenes[0]!.character).toBe("Aleister");
  expect(result.scenes[0]!.cast).toEqual(["Aleister"]);
  expect(result.cues[0]!.character).toBe("Aleister");
  expect(result.speakers[0]!.name).toBe("Narrator");
  expect(original.scenes[0]!.character).toBe("Rookhaven Academy");
});

test("an ordinary character card keeps its matching subject", () => {
  const original = input();
  const result = repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: true });
  expect(result).toEqual(original);
});

test("ambiguous cast does not silently borrow a person's appearance", () => {
  const original = input();
  original.scenes[0]!.cast.push("Mira");
  original.characters.push({ name: "Mira", description: "silver hair, blue eyes" });
  const result = repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false });
  expect(result.scenes[0]!.character).toBe("Rookhaven Academy");
  expect(result.cues[0]!.character).toBe("Rookhaven Academy");
});

test("explicit character cues take priority over a wrapper scene label", () => {
  const original = input();
  original.scenes[0]!.cast.push("Mira");
  original.characters.push({ name: "Mira", description: "silver hair, blue eyes" });
  original.cues[0]!.character = "Mira";
  const result = repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false });
  expect(result.scenes[0]!.character).toBe("Mira");
  expect(result.cues[0]!.character).toBe("Mira");
});

test("unknown labels and genuine missing appearances stay unresolved", () => {
  const original = input();
  original.cues[0]!.character = "Newcomer";
  original.scenes[0]!.character = "Newcomer";
  const result = repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false });
  expect(result.cues[0]!.character).toBe("Newcomer");
});

test("a card without appearance or separate cast evidence is not assumed to be a narrator", () => {
  const original = input();
  original.characters = [];
  expect(repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false })).toEqual(original);
});

test("a separately described person bearing the card name stays eligible", () => {
  const original = input();
  original.characters.push({ name: "Rookhaven Academy", description: "stone skin, amber eyes, horned creature" });
  expect(repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false })).toEqual(original);
});

test("later scenes resolve only their own cast and discard a wrapper's stale identity ID", () => {
  const original = { ...input(), scenes: [
    { startParagraph: 0, character: "Rookhaven Academy", characterId: "card-id" as string | null, cast: ["Aleister"] },
    { startParagraph: 2, character: "Rookhaven Academy", characterId: "card-id" as string | null, cast: ["Mira"] }
  ], cues: [{ paragraphIndex: 0, character: "Rookhaven Academy" }, { paragraphIndex: 3, character: "Rookhaven Academy" }] };
  original.characters.push({ name: "Mira", description: "silver hair, blue eyes" });
  const result = repairScenarioSubjects(original, { name: "Rookhaven Academy", hasCharacterIdentity: false });
  expect(result.cues.map(c => c.character)).toEqual(["Aleister", "Mira"]);
  expect(result.scenes.map(s => s.characterId)).toEqual([null, null]);
});
