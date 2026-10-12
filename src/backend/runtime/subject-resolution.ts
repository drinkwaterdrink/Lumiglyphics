import type { SubjectCorrection } from "../../shared/subject-correction.js";
export { SubjectCorrectionSchema } from "../../shared/subject-correction.js";
import type { VisualCue } from "../../shared/contracts.js";
import {
  characterIdFor, distillVisualTags, isUsableIdentity, resolveCharacterReference,
  subjectCategoryFromTags, type CharacterRegistry
} from "../../shared/identity.js";
import { templateSnapshot, type ImageTemplate } from "../../shared/image-templates.js";

/** Keep scene context, but discard directions that might still describe the old person. */
function clearSubjectDirection(cue: VisualCue): VisualCue {
  return { ...cue, visualDescription: "", visualFocus: "", action: null, expression: null, promptDelta: "", resolvedAttire: null };
}

/** Only the selected cue changes. Never borrow the previous scene's body or wardrobe. */
export function correctVisualSubject(cue: VisualCue, subject: SubjectCorrection, registry: CharacterRegistry, templates: ImageTemplate[]): VisualCue {
  const clean = clearSubjectDirection(cue);
  if (subject.kind === "environment") {
    const template = templates.find(item => item.id === subject.templateId);
    if (!template || template.subjectMode !== "none") throw new Error("Choose a template with no people for an environment picture.");
    const { characterId: _id, ...rest } = clean;
    return { ...rest, character: null, resolvedIdentity: "", subjectCategory: "unknown", imageTemplate: templateSnapshot(template) };
  }
  const entry = resolveCharacterReference(registry, { name: subject.name });
  const name = entry?.name ?? subject.name;
  const tags = distillVisualTags(subject.appearance?.trim() || entry?.tags || "");
  if (tags.length < 2 || !isUsableIdentity(name, tags)) {
    throw new Error(`Enter concrete appearance details for "${name}" (for example hair, eyes, skin, clothing or species). No other character's appearance will be used.`);
  }
  if (cue.imageTemplate?.subjectMode === "none") throw new Error("Choose a character template before preparing this subject.");
  const identity = tags.join(", ");
  const explicitCategory = subject.appearance?.trim() ? subjectCategoryFromTags(identity) : "unknown";
  return {
    ...clean, character: name, characterId: entry?.id ?? characterIdFor(name), resolvedIdentity: identity,
    subjectCategory: explicitCategory !== "unknown" ? explicitCategory : entry?.subjectCategory ?? subjectCategoryFromTags(identity)
  };
}
