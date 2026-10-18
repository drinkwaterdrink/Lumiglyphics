import assert from "node:assert/strict";
import test from "node:test";
import { normalizeConfig } from "../config";
import { BUILTIN_IMAGE_TEMPLATES, validateImageTemplates, resolveImageTemplate, renderImageTemplate } from "./image-templates";

test("template_validation_is_atomic", () => {
  const portrait = BUILTIN_IMAGE_TEMPLATES[0]!;
  for (const invalid of [
    [portrait, portrait], Array.from({ length: 33 }, (_, i) => ({ ...portrait, id: `t${i}` })),
    [{ ...portrait, name: "x".repeat(81) }], [{ ...portrait, useWhen: "x".repeat(1001) }],
    [{ ...portrait, positive: "x".repeat(8001) }], [{ ...portrait, negative: "x".repeat(8001) }],
    [{ ...portrait, category: "unknown" }], [{ ...portrait, positive: "{{password}}" }],
    [{ ...portrait, subjectMode: "many" }]
  ]) assert.throws(() => validateImageTemplates(invalid));
  assert.equal(validateImageTemplates([portrait])[0]!.name, portrait.name);
});

test("old catalogs gain an opt-in full scene ensemble without replacing user edits", () => {
  const old = { ...BUILTIN_IMAGE_TEMPLATES[0]!, positive: "personal {{subjects}}" };
  const config = normalizeConfig({ imageTemplates: [old], defaultImageTemplateId: "ensemble" });
  const ensemble = config.imageTemplates.find(t => t.id === "ensemble");
  assert.ok(ensemble);
  assert.equal(ensemble.enabled, false);
  assert.equal(ensemble.subjectMode, "ensemble");
  assert.equal(ensemble.referencePolicy, "none");
  assert.equal(config.imageTemplates[0]!.positive, old.positive);
  assert.equal(resolveImageTemplate(config).template.id, "ensemble");
});

test("manga page is opt-in, grounded in the brief, and has editable independent negatives", () => {
  const manga = BUILTIN_IMAGE_TEMPLATES.find(t => t.id === "manga-page")!;
  assert.ok(manga);
  assert.equal(manga.enabled, false);
  const config = normalizeConfig({ imageTemplates: [{ ...manga, enabled: true }], defaultImageTemplateId: manga.id });
  const output = renderImageTemplate(resolveImageTemplate(config).template, { style: "ink illustration", scene: "Library at sunset", subjects: "Aleister, dark hair, green coat", action: "Opening a sealed letter", composition: "portrait", lighting: "warm light", suffix: "", negative: "text, speech bubble, border" });
  assert.match(output.prompt, /Aleister, dark hair, green coat/);
  assert.match(output.prompt, /5–7/);
  assert.match(output.prompt, /Opening a sealed letter/);
  assert.match(output.prompt, /wordless/i);
  assert.doesNotMatch(output.negativePrompt, /speech bubble|border/);
  assert.match(output.negativePrompt, /identity drift/);
  assert.equal(config.maxImagesPerTurn, 4);
});

test("old catalogs automatically gain an unchecked manga template without replacing edits", () => {
  const original = { ...BUILTIN_IMAGE_TEMPLATES[0]!, positive: "personal {{scene}}" };
  const config = normalizeConfig({ imageTemplates: [original] });
  assert.equal(config.imageTemplates.find(t => t.id === "manga-page")?.enabled, false);
  assert.equal(config.imageTemplates[0]!.positive, original.positive);
  assert.deepEqual(normalizeConfig(config).imageTemplates, config.imageTemplates);
  const manual = normalizeConfig({ ...config, defaultImageTemplateId: "manga-page", dynamicImageTemplates: false });
  assert.equal(resolveImageTemplate(manual).template.id, "manga-page");
  const dynamic = normalizeConfig({ ...manual, dynamicImageTemplates: true });
  assert.equal(resolveImageTemplate(dynamic, "manga-page").template.id, "portrait");
});

test("legacy_config_preserves_style_and_presets", () => {
  const preset = { id: "portrait", name: "Flux personal", positive: "my precise style", negative: "my negative" };
  const config = normalizeConfig({ promptPrefix: "old anime prefix", promptSuffix: "old suffix", negativePrompt: "old negative", promptPresets: [preset] });
  assert.equal(config.dynamicImageTemplates, false);
  assert.equal(config.includeSimTrackerContext, true);
  assert.equal(config.maxImagesPerTurn, 4);
  assert.equal(normalizeConfig({ maxImagesPerTurn: 0 }).maxImagesPerTurn, 0);
  assert.equal(config.promptPrefix, "old anime prefix");
  assert.equal(config.promptSuffix, "old suffix");
  assert.equal(config.negativePrompt, "old negative");
  assert.deepEqual(config.promptPresets, [preset]);
  const imported = config.imageTemplates.find(t => t.name === preset.name)!;
  assert.ok(imported);
  assert.notEqual(imported.id, "portrait");
  assert.ok(imported.positive.includes(preset.positive));
  assert.equal(imported.negative, preset.negative);
  assert.deepEqual(normalizeConfig(config).imageTemplates, config.imageTemplates);
});

test("legacy template migration survives unknown macros and length limits on reload", () => {
  const config = normalizeConfig({ promptPresets: [{ id: "old", name: "Legacy", positive: "{{char}} " + "x".repeat(7980) + "{{scene}}", negative: "{{old_negative}}" }] });
  assert.doesNotThrow(() => normalizeConfig(config));
  assert.equal(config.promptPresets[0]!.negative, "{{old_negative}}", "original presets are preserved");
});

test("template_snapshot_is_stable_and_fallback_is_valid", () => {
  const config = normalizeConfig({});
  const first = resolveImageTemplate(config);
  assert.equal(first.template.id, "portrait");
  assert.equal(resolveImageTemplate(config).template.revision, first.template.revision);
  const edited = normalizeConfig({ ...config, imageTemplates: config.imageTemplates.map(t => t.id === "portrait" ? { ...t, positive: "{{scene}}" } : t) });
  assert.notEqual(resolveImageTemplate(edited).template.revision, first.template.revision);
  assert.equal(first.template.positive, config.imageTemplates[0]!.positive);
  assert.equal(resolveImageTemplate(config, "invented").template.id, "portrait");
  assert.ok(resolveImageTemplate(config, "invented").fallbackReason);
  const disabled = normalizeConfig({ ...config, imageTemplates: config.imageTemplates.map(t => ({ ...t, enabled: false })) });
  assert.equal(resolveImageTemplate(disabled).template.id, "portrait");
});

test("rendering_is_plain_text_and_does_not_recursively_expand_values", () => {
  const template = resolveImageTemplate(normalizeConfig({})).template;
  const output = renderImageTemplate(template, { style: "{{scene}}", scene: "snowy courtyard", subjects: "", action: "", composition: "wide", lighting: "moonlight", suffix: "", negative: "blur" });
  assert.ok(output.prompt.includes("{{scene}}"));
  assert.ok(output.prompt.includes("snowy courtyard"));
  assert.equal(output.negativePrompt, "blur");
  assert.doesNotMatch(output.prompt, /1girl|solo|masterpiece/);
});


test("untouched legacy Manga wording migrates compactly while custom fields stay intact",()=>{
 const oldPositive="{{style}}\nIDENTITY CONTROL:\nKeep this subject recognizable throughout the page: {{subjects}}. Preserve face, hair, body proportions, skin tone, accessories and wardrobe. If a character image reference is supplied, use it as the visual authority. Do not add unrelated named characters.\nPAGE STRUCTURE:\nCreate one full-color manga page with 5–7 interconnected panels, an asymmetrical layout and clear left-to-right, top-to-bottom reading order. Depict only the supplied scene and action; develop their visual presentation without inventing new events or outcomes.\nSCENE AND ACTION:\n{{scene}}\n{{action}}\nUse an establishing view, action details and reaction close-ups as appropriate. Vary wide shots, low angles, close-ups and profiles without repeating composition. Keep character expressions consistent with the action. Use cinematic perspective and restrained motion lines.\nLETTERING:\nWordless panels by default: no dialogue bubbles, captions or random text. If this template is edited to include approved dialogue or sound effects, reproduce only those exact lines, preserve spelling, and leave safe space around faces and important gestures.\nSTYLE AND LIGHTING:\n{{lighting}}\nStrong ink contours, manga shading, halftone textures, clean negative space, expressive contrast and a coherent color palette. Keep panel gutters clear and identity and clothing consistent.\nPRODUCTION:\nA detailed, editorially finished tall portrait page, composed for a mobile screen. Keep every panel and gutter inside the page, with modest outer margins and no oversized white border. Follow the requested output dimensions. This is one page image, not separate images per panel.\n{{suffix}}";
 const oldNegative="identity drift, different face between panels, changed hairstyle, changed accessories, inconsistent wardrobe, repeated panel composition, broken reading order, extra limbs, fused hands, unreadable lettering, misspelled dialogue, random text, covered face, flat poses, weak contrast, muddy colors, photorealistic rendering, 3D CGI, watermark, logo";
 const manga=BUILTIN_IMAGE_TEMPLATES.find(t=>t.id==='manga-page')!;
 const migrated=normalizeConfig({imageTemplates:[{...manga,positive:oldPositive,negative:oldNegative}] }).imageTemplates.find(t=>t.id==='manga-page')!;
 assert.ok(migrated.positive.length < oldPositive.length);assert.ok(migrated.negative.length < oldNegative.length);
 assert.match(migrated.positive,/5–7/);assert.match(migrated.positive,/skin, accessories and clothing/);assert.match(migrated.positive,/no dialogue, captions or random text/);
 const edited=normalizeConfig({imageTemplates:[{...manga,positive:oldPositive+'\nMy custom direction',negative:'custom exclusions'}]}).imageTemplates.find(t=>t.id==='manga-page')!;
 assert.equal(edited.positive,oldPositive+'\nMy custom direction');assert.equal(edited.negative,'custom exclusions');
});
