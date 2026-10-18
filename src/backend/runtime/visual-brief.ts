import { sharedStyleWarnings } from "../../shared/image-styles.js";
import { applyAttireOverride } from "./attire.js";
import type { VisualNovelConfig } from "../../config.js";
import type { SceneState, VisualCue } from "../../shared/contracts.js";
import type { CharacterAppearanceMap } from "../../shared/identity.js";
import { characterAppearanceKey, normalizeCharacterName } from "../../shared/identity.js";
import { compileActionProp } from "../../shared/action-prop.js";
import { resolveImageTemplate, type ImageTemplate } from "../../shared/image-templates.js";
import type { VisualBrief } from "../../shared/image-templates.js";
export type { VisualBrief } from "../../shared/image-templates.js";
import { POSE_EXPRESSION_CATALOGUE, poseById } from "../../shared/character.js";

const text = (values: (string | null | undefined)[], max = 4000) => [...new Set(values.map(value => value?.trim()).filter(Boolean))].join("; ").slice(0, max);

export function resolveTemplateIdentity(scene: SceneState, cue: VisualCue, appearances?: CharacterAppearanceMap) {
  const name = normalizeCharacterName(cue.character || scene.character || scene.cast[0] || "");
  const sameCharacter = characterAppearanceKey(name) === characterAppearanceKey(scene.character || scene.cast[0] || "");
  const saved = Object.entries(appearances ?? {}).find(([key]) => characterAppearanceKey(key) === characterAppearanceKey(name))?.[1]?.trim();
  const resolved = cue.resolvedIdentity?.trim() || (sameCharacter ? scene.identityPrompt?.trim() : "") || "";
  return { name, sameCharacter, saved, resolved, identity: cue.visualSources?.includes("manual subject correction") ? resolved : saved || resolved };
}

export function buildVisualBrief(config: VisualNovelConfig, scene: SceneState, cue: VisualCue, appearances?: CharacterAppearanceMap): VisualBrief {
  const template = cue.imageTemplate ?? resolveImageTemplate(config).template;
  const noPeople = template.subjectMode === "none";
  const ensemble = template.subjectMode === "ensemble";
  const { sameCharacter, saved, resolved, identity } = resolveTemplateIdentity(scene, cue, appearances);
  const attire = cue.resolvedAttire !== undefined ? cue.resolvedAttire : cue.attire ?? (sameCharacter ? scene.attire : null);
  const manual = cue.visualSources?.includes("manual subject correction");
  const conflicts = !noPeople && !ensemble && saved && resolved && saved !== resolved ? [manual ? "Manual appearance replaces saved appearance for this picture." : "Saved appearance differs from scene evidence; the saved appearance is used."] : [];
  const appearance = attire ? applyAttireOverride(identity, attire) : identity;
  const subject = cue.subjectCategory ?? scene.subjectCategory;
  const subjectLabel = subject === "female" ? "One visible woman" : subject === "male" ? "One visible man" : "One visible character";
  const pose = noPeople || ensemble ? "" : poseById(POSE_EXPRESSION_CATALOGUE, cue.poseExpressionId).suffix;
  const environment = scene.environment;
  const members = cue.ensembleSubjects ?? scene.cast.map(name => ({name,appearance:Object.entries(appearances ?? {}).find(([key]) => characterAppearanceKey(key) === characterAppearanceKey(name))?.[1] ?? ""}));
  // Reserve room for every name before sharing the remaining appearance budget.
  // A long first description must never erase the persona or the last cast member.
  const nameBudget = members.reduce((total, member) => total + member.name.length + 4, 0);
  if (ensemble && nameBudget > 4000) throw new Error("The ensemble names exceed the prompt preview limit. Shorten cast display names before preparing this picture.");
  const descriptionBudget = Math.max(0, Math.floor((Math.max(1800, nameBudget) - nameBudget) / Math.max(1, members.length)));
  const group = members.map(member => {
    const look = member.appearance.trim();
    const description = `${look || "appearance not established"}${"attire" in member && member.attire ? `; wearing ${member.attire}` : ""}`;
    const bounded = description.length > descriptionBudget ? description.slice(0, descriptionBudget).replace(/\s+\S*$/, "") : description;
    return `${member.name}: ${bounded}`;
  }).join("\n");
  return {
    scene: text([environment.location, environment.description, ...environment.persistentElements, environment.timeOfDay, environment.weather]),
    subjects: noPeople ? "" : ensemble ? group : text([subjectLabel, appearance, attire ? `Wearing ${attire}` : "", template.category === "portrait" ? pose : ""]),
    action: noPeople ? template.category === "detail" || template.category === "custom" ? (cue.visualFocus ?? "").slice(0, 1000) : "" : text([cue.visualDescription, compileActionProp(cue.action), template.category === "portrait" ? "" : pose]),
    composition: `${template.framing}; eye-level view; ${noPeople ? "no people" : ensemble ? `${members.length} visible characters, including every listed subject; distinct faces and silhouettes` : "one visible character"}; keep the lower quarter clear for dialogue`,
    lighting: (environment.lighting ?? "").slice(0, 1000),
    subjectMode: template.subjectMode,
    framing: template.framing,
    referencePolicy: noPeople || ensemble ? "none" : template.referencePolicy,
    sources: [...(cue.visualSources ?? []), "scene context", ...(ensemble ? ["named cast and persona appearance snapshot"] : !noPeople && saved && !manual ? ["saved appearance"] : [])].slice(0, 24),
    conflicts: [...conflicts, ...(ensemble && members.some(member => member.appearance.length > descriptionBudget) ? ["Ensemble appearance descriptions are condensed to share the prompt budget; all listed names are retained."] : []), ...sharedStyleWarnings(template, config.promptPrefix, config.promptSuffix, config.negativePrompt)].slice(0, 16)
  };
}
