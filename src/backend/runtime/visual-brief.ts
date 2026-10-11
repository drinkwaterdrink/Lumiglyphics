import { applyAttireOverride } from "./attire.js";
import type { VisualNovelConfig } from "../../config.js";
import type { SceneState, VisualCue } from "../../shared/contracts.js";
import type { CharacterAppearanceMap } from "../../shared/identity.js";
import { characterAppearanceKey } from "../../shared/identity.js";
import { compileActionProp } from "../../shared/action-prop.js";
import { resolveImageTemplate, type ImageTemplate } from "../../shared/image-templates.js";
import type { VisualBrief } from "../../shared/image-templates.js";
export type { VisualBrief } from "../../shared/image-templates.js";
import { POSE_EXPRESSION_CATALOGUE, poseById } from "../../shared/character.js";

const text = (values: (string | null | undefined)[], max = 4000) => [...new Set(values.map(value => value?.trim()).filter(Boolean))].join("; ").slice(0, max);

export function buildVisualBrief(config: VisualNovelConfig, scene: SceneState, cue: VisualCue, appearances?: CharacterAppearanceMap): VisualBrief {
  const template = cue.imageTemplate ?? resolveImageTemplate(config).template;
  const noPeople = template.subjectMode === "none";
  const name = cue.character ?? scene.character ?? scene.cast[0] ?? "";
  const saved = Object.entries(appearances ?? {}).find(([key]) => characterAppearanceKey(key) === characterAppearanceKey(name))?.[1]?.trim();
  const resolved = cue.resolvedIdentity?.trim() || (name === scene.character ? scene.identityPrompt?.trim() : "") || "";
  const attire = cue.resolvedAttire !== undefined ? cue.resolvedAttire : cue.attire ?? (name === scene.character ? scene.attire : null);
  const conflicts = !noPeople && saved && resolved && saved !== resolved ? ["Saved appearance differs from scene evidence; the saved appearance is used."] : [];
  const identity = saved || resolved;
  const appearance = attire ? applyAttireOverride(identity, attire) : identity;
  const subject = cue.subjectCategory ?? scene.subjectCategory;
  const subjectLabel = subject === "female" ? "One visible woman" : subject === "male" ? "One visible man" : "One visible character";
  const pose = noPeople ? "" : poseById(POSE_EXPRESSION_CATALOGUE, cue.poseExpressionId).suffix;
  const environment = scene.environment;
  return {
    scene: text([environment.location, environment.description, ...environment.persistentElements, environment.timeOfDay, environment.weather]),
    subjects: noPeople ? "" : text([subjectLabel, appearance, attire ? `Wearing ${attire}` : "", template.category === "portrait" ? pose : ""]),
    action: noPeople ? template.category === "detail" || template.category === "custom" ? (cue.visualFocus ?? "").slice(0, 1000) : "" : text([cue.visualDescription, compileActionProp(cue.action), template.category === "portrait" ? "" : pose]),
    composition: `${template.framing}; eye-level view; ${noPeople ? "no people" : "one visible character"}; keep the lower quarter clear for dialogue`,
    lighting: (environment.lighting ?? "").slice(0, 1000),
    subjectMode: template.subjectMode,
    framing: template.framing,
    referencePolicy: noPeople ? "none" : template.referencePolicy,
    sources: [...(cue.visualSources ?? []), "scene context", ...(!noPeople && saved ? ["saved appearance"] : [])].slice(0, 24),
    conflicts
  };
}
