import assert from "node:assert/strict";
import test from "node:test";
import { normalizeConfig } from "../../config";
import { SceneStateSchema, VisualCueSchema } from "../../shared/contracts";
import { resolveImageTemplate } from "../../shared/image-templates";
import { buildVisualBrief } from "./visual-brief";
import {sceneImageIdentityFor} from './images.js';

const scene = SceneStateSchema.parse({ sceneId: "s", revision: 0, startParagraph: 0, environment: { location: "garden", description: "A fountain beneath tall trees", timeOfDay: "night", weather: null, lighting: "moonlight", persistentElements: ["fountain"] }, cast: ["Mira"], character: "Mira", identityPrompt: "silver hair, green eyes", attire: "raincoat", basePrompt: "garden", compositionLock: "wide", continuity: { revision: 0, characters: {}, facts: {} }, cameraLock: { framing: "wide", angle: "eye level", perspective: "straight-on", lens: null, subjectAnchor: "center", horizon: "stable", safeDialogueRegion: "lower quarter", aspectRatio: "16:9" } });
const cue = VisualCueSchema.parse({ cueId: "c", paragraphIndex: 0, sceneId: "s", sceneRevision: 0, kind: "flattened_scene", assetJobId: "j", character: "Mira", resolvedIdentity: "old red hair", resolvedAttire: "raincoat", visualDescription: "Mira opens the garden gate" });

test('single-subject brief includes the resolved outfit once',()=>{
 const brief=buildVisualBrief(normalizeConfig({}),scene,cue);
 assert.equal(brief.subjects.match(/raincoat/g)?.length,1);
});

test('appearance preparation records saved identity precedence separately from outfit and template usage',()=>{
 const config=normalizeConfig({}),template=resolveImageTemplate(config).template;
 const brief=buildVisualBrief(config,scene,{...cue,imageTemplate:template},{mira:'silver hair, green eyes'});
 assert.equal(brief.subjectPreparation?.name,'Mira');
 assert.equal(brief.subjectPreparation?.identitySource,'saved appearance');
 assert.equal(brief.subjectPreparation?.identity,'silver hair, green eyes');
 assert.equal(brief.subjectPreparation?.attire,'raincoat');
 assert.equal(brief.subjectPreparation?.attireSource,'picture cue');
 assert.equal(brief.subjectPreparation?.subjectsInPositive,true);
 const manual=buildVisualBrief(config,scene,{...cue,imageTemplate:template,visualSources:['manual subject correction']},{mira:'silver hair, green eyes'});
 assert.equal(manual.subjectPreparation?.identitySource,'manual correction');
 assert.equal(manual.subjectPreparation?.identity,'old red hair');
 const omitted=buildVisualBrief(config,scene,{...cue,imageTemplate:{...template,positive:'A landscape',negative:''}});
 assert.equal(omitted.subjectPreparation?.subjectsInPositive,false);
 assert.equal(omitted.subjectPreparation?.subjectsInNegative,false);
});

test('display-only appearance provenance does not become part of image cache identity',()=>{
 const config=normalizeConfig({}),template=resolveImageTemplate(config).template;
 const result=sceneImageIdentityFor(config,scene,{...cue,imageTemplate:template},undefined,'nanogpt');
 assert.equal('subjectPreparation' in (result.visualBrief as object),false);
});

test('source labels follow null outfit fallback and bounded identity previews disclose shortening',()=>{
 const config=normalizeConfig({}),fallback={...cue,attire:null};delete fallback.resolvedAttire;
 const brief=buildVisualBrief(config,scene,fallback);
 assert.equal(brief.subjectPreparation?.attireSource,'scene');
 assert.equal(brief.subjectPreparation?.attire,'raincoat');
 const long=buildVisualBrief(config,scene,{...cue,resolvedIdentity:'x'.repeat(4100)});
 assert.equal(long.subjectPreparation?.identity.length,4000);assert.equal(long.subjectPreparation?.shortened,true);
});

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

test("ensemble brief includes named present subjects and persona without borrowing portrait identity", () => {
  const config = normalizeConfig({ defaultImageTemplateId: "ensemble" });
  const template = resolveImageTemplate(config).template;
  assert.equal(template.id, "ensemble");
  const members = [{ name: "Mira", appearance: "silver hair, green eyes", attire: "red coat" }, { name: "Josh", appearance: "brown hair, glasses", persona: true }];
  const group = VisualCueSchema.parse({ ...cue, imageTemplate: template, ensembleSubjects: members });
  const brief = buildVisualBrief(config, scene, group);
  assert.match(brief.subjects, /Mira.*silver hair.*red coat/);
  assert.match(brief.subjects, /Josh.*brown hair.*glasses/);
  assert.doesNotMatch(brief.subjects, /One visible|old red hair/);
  assert.equal(brief.referencePolicy, "none");
  assert.match(brief.composition, /2 visible characters/);
});

test("long ensemble appearances retain every named subject and disclose condensation", () => {
  const config=normalizeConfig({defaultImageTemplateId:"ensemble"});
  const brief=buildVisualBrief(config,scene,{...cue,imageTemplate:resolveImageTemplate(config).template,ensembleSubjects:Array.from({length:6},(_,i)=>({name:i===5?'Josh':`Cast ${i}`,appearance:'silver hair, green eyes, '.repeat(50).slice(0,1200),persona:i===5}))});
  for(const name of ['Cast 0','Cast 1','Cast 2','Cast 3','Cast 4','Josh'])assert.ok(brief.subjects.includes(name));
  assert.ok(brief.subjects.length<=1800);
  assert.ok(brief.conflicts.some(note=>note.includes('condensed')));
});
