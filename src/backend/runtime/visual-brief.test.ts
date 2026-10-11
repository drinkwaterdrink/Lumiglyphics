import assert from "node:assert/strict";
import test from "node:test";
import { normalizeConfig } from "../../config";
import { SceneStateSchema, VisualCueSchema } from "../../shared/contracts";
import { resolveImageTemplate } from "../../shared/image-templates";
import { buildVisualBrief } from "./visual-brief";

const scene = SceneStateSchema.parse({ sceneId: "s", revision: 0, startParagraph: 0, environment: { location: "garden", description: "A fountain beneath tall trees", timeOfDay: "night", weather: null, lighting: "moonlight", persistentElements: ["fountain"] }, cast: ["Mira"], character: "Mira", identityPrompt: "silver hair, green eyes", attire: "raincoat", basePrompt: "garden", compositionLock: "wide", continuity: { revision: 0, characters: {}, facts: {} }, cameraLock: { framing: "wide", angle: "eye level", perspective: "straight-on", lens: null, subjectAnchor: "center", horizon: "stable", safeDialogueRegion: "lower quarter", aspectRatio: "16:9" } });
const cue = VisualCueSchema.parse({ cueId: "c", paragraphIndex: 0, sceneId: "s", sceneRevision: 0, kind: "flattened_scene", assetJobId: "j", character: "Mira", resolvedIdentity: "old red hair", resolvedAttire: "raincoat", visualDescription: "Mira opens the garden gate" });

test("durable_and_temporary_precedence_in_visual_brief", () => {
  const config = normalizeConfig({});
  const brief = buildVisualBrief(config, scene, cue, { mira: "silver hair, green eyes" });
  assert.match(brief.subjects, /silver hair/);
  assert.doesNotMatch(brief.subjects, /red hair/);
  assert.match(brief.subjects, /raincoat/);
  assert.match(brief.action, /opens the garden gate/);
  assert.ok(brief.conflicts.length);
});

test("no_people_visual_brief_keeps_environment_and_omits_character_state", () => {
  const config = normalizeConfig({});
  const template = resolveImageTemplate(config, "environment").template;
  const brief = buildVisualBrief(config, scene, { ...cue, imageTemplate: template });
  assert.equal(brief.subjects, "");
  assert.equal(brief.action, "");
  assert.equal(brief.referencePolicy, "none");
  assert.equal(brief.framing, "wide");
  assert.match(brief.scene, /fountain/);
  assert.doesNotMatch(JSON.stringify(brief), /Mira|raincoat|red hair/);
  assert.equal(scene.character, "Mira");
});

test("detail_visual_brief_uses_prop_focus_and_custom_framing", () => {
  const config = normalizeConfig({});
  const template = resolveImageTemplate(config, "detail").template;
  const brief = buildVisualBrief(config, scene, { ...cue, imageTemplate: template, visualFocus: "an engraved brass key" });
  assert.match(brief.action, /engraved brass key/);
  assert.match(brief.composition, /close-up/);
  assert.equal(brief.subjectMode, "none");
});
