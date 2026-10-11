import assert from "node:assert/strict";
import test from "node:test";
import type { SpindleAPI, ChatMessageDTO } from "lumiverse-spindle-types";
import { normalizeConfig } from "../../config";
import { planTurn } from "./planner";
import { emptySingleCharacter } from "../core/visual-state";

async function plan(configPatch: Record<string, unknown>, selectedId?: string) {
  let calls = 0, instruction = "";
  const content = "Mira enters the garden.\n\nShe finds a brass key.";
  const spindle = { generate: { raw: async (request: any) => { calls++; instruction = request.messages[0].content; return { content: JSON.stringify({ scenes: [{ startParagraph: 0, environment: { location: "garden", description: "A fountain under trees" }, cast: ["Mira"], basePrompt: "garden", compositionLock: "wide" }], cues: [{ paragraphIndex: 0, character: "Mira", templateId: selectedId, templateReason: "New location", visualDescription: "Mira enters the garden", visualFocus: "fountain" }, { paragraphIndex: 1, character: "Mira", templateId: "detail", templateReason: "Important object", visualFocus: "a brass key" }], characters: [{ name: "Mira", description: "silver hair, green eyes" }] }) }; } }, log: { warn() {}, info() {} } } as unknown as SpindleAPI;
  const config = normalizeConfig({ includeCharacterContext: false, includePersonaContext: false, ...configPatch });
  const result = await planTurn(spindle, { chatId: "c", message: { id: "a", name: "Mira", content } as ChatMessageDTO, content, previousScene: null, previousContinuity: null, recentMessages: [], config, singleCharacter: emptySingleCharacter(), characterAppearance: {} });
  return { ...result, calls, instruction };
}

test("routing_respects_modes_and_enabled_catalog_in_one_pass", async () => {
  const dynamic = await plan({ dynamicImageTemplates: true }, "environment");
  assert.equal(dynamic.calls, 1);
  assert.equal(dynamic.usedFallback, false);
  assert.equal(dynamic.plan.visualCues[0]?.imageTemplate?.category, "environment");
  assert.equal(dynamic.plan.visualCues[1]?.visualFocus, "a brass key");
  assert.equal(dynamic.plan.visualCues[0]?.imageTemplateReason, "New location");
  assert.match(dynamic.instruction, /Use when|useWhen/);
  const fixed = await plan({ dynamicImageTemplates: false, defaultImageTemplateId: "action" }, "environment");
  assert.equal(fixed.plan.visualCues[0]?.imageTemplate?.id, "action");
  assert.equal(fixed.plan.visualCues[1]?.imageTemplate?.id, "action");
  const invalid = await plan({ dynamicImageTemplates: true }, "invented");
  assert.equal(invalid.plan.visualCues[0]?.imageTemplate?.id, "portrait");
  assert.match(invalid.plan.visualCues[0]?.imageTemplateReason ?? "", /unavailable/);
});

test("nonportrait_selection_preserves_story_character_and_budget", async () => {
  const result = await plan({ dynamicImageTemplates: true, maxImagesPerTurn: 1 }, "environment");
  assert.equal(result.plan.visualCues.length, 1);
  assert.equal(result.plan.visualCues[0]?.imageTemplate?.subjectMode, "none");
  assert.equal(result.plan.scenes[0]?.character, "Mira");
  assert.equal(result.plan.cacheCues?.[0]?.imageTemplate?.id, "detail");
  const unlimited = await plan({ dynamicImageTemplates: true, maxImagesPerTurn: 0 }, "environment");
  assert.equal(unlimited.plan.visualCues.length, 2);
});
