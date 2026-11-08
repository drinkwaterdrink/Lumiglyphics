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
import { POSE_EXPRESSION_CATALOGUE, poseById, sanitizePoseExpression } from "../../shared/character.js";
import { formatCharacterDNAToPromptClause, type CharacterDNA, type CharacterDNALibrary } from "../../shared/character-dna.js";
import { areNamesEquivalent, findMatchingCharacterId } from "../../shared/nicknames.js";

const text = (values: (string | null | undefined)[], max = 4000) => [...new Set(values.map(value => value?.trim()).filter(Boolean))].join("; ").slice(0, max);

const PROP_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'by', 'with', 'from', 'near', 'under', 'over', 'into',
  'north', 'south', 'east', 'west', 'corner', 'side', 'wall', 'floor', 'room', 'area', 'three', 'two', 'one'
]);

/**
 * Strips literary non-visual negations (such as "no visible aura, only...") from positive visual descriptions
 * because diffusion models attend to the noun ("aura") and render the negated effect.
 */
export function sanitizeVisualNarrativeDescription(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  return raw
    .replace(/\b(?:with\s+)?no\s+(?:visible|magical|magic|supernatural|glowing)\s+(?:aura|glow|halo|mana|light)\s*,?\s*(?:only\s+)?/gi, "")
    .replace(/\bwithout\s+any\s+(?:visible\s+)?(?:aura|glow|halo)\s*,?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function propKeywords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 4 && !PROP_STOP_WORDS.has(w));
}

/**
 * Deduplicates persistent room elements against an already-detailed environment description and active scene action,
 * and omits unmentioned background room inventory when the scene description + active action are already rich.
 */
export function selectRelevantPersistentElements(
  envDescription: string | null | undefined,
  activeAction: string | null | undefined,
  persistentElements: readonly string[]
): string[] {
  if (!persistentElements || persistentElements.length === 0) return [];
  const desc = (envDescription ?? "").trim();
  const act = (activeAction ?? "").trim();

  // For short/minimal environment descriptions (< 80 chars), preserve all persistent elements
  if (desc.length < 80) {
    return [...persistentElements];
  }

  const descKeywords = new Set(propKeywords(desc));
  const actKeywords = new Set(propKeywords(act));
  const isDetailedActionBeat = act.length >= 80;

  const selected: string[] = [];
  for (const elem of persistentElements) {
    const trimmed = elem?.trim();
    if (!trimmed) continue;
    const keys = propKeywords(trimmed);
    if (keys.length === 0) continue;

    // 1. If the prop's primary nouns are already described in environment.description, skip duplicate prop entry
    const overlapWithDesc = keys.filter(k => descKeywords.has(k)).length;
    if (overlapWithDesc >= 1 && (overlapWithDesc / keys.length >= 0.34 || overlapWithDesc >= 2)) {
      continue;
    }

    // 2. When a detailed action paragraph is active, only include persistent room inventory if referenced in the action
    if (isDetailedActionBeat) {
      const mentionedInAction = keys.some(k => actKeywords.has(k));
      if (!mentionedInAction) {
        continue;
      }
    }

    keys.forEach(k => descKeywords.add(k));
    selected.push(trimmed);
  }

  return selected;
}

export function resolveTemplateIdentity(
  scene: SceneState,
  cue: VisualCue,
  appearances?: CharacterAppearanceMap,
  characterDNALibrary?: CharacterDNALibrary | Record<string, CharacterDNA>
) {
  const name = normalizeCharacterName(cue.character || scene.character || scene.cast[0] || "");
  const sameCharacter = characterAppearanceKey(name) === characterAppearanceKey(scene.character || scene.cast[0] || "");

  let lockedDNA: CharacterDNA | undefined;
  if (characterDNALibrary) {
    const chars = ('characters' in characterDNALibrary ? characterDNALibrary.characters : characterDNALibrary) as Record<string, CharacterDNA>;
    const matchId = findMatchingCharacterId(chars, name);
    if (matchId && chars[matchId]) {
      lockedDNA = chars[matchId];
    } else {
      const key = name.trim().toLowerCase();
      lockedDNA = chars[key] ?? Object.values(chars).find((r: CharacterDNA) => r.name.trim().toLowerCase()===key||r.aliases.some((a: string) => a.trim().toLowerCase() === key));
    }
  }

  const dnaAppearance = lockedDNA ? formatCharacterDNAToPromptClause(lockedDNA) : undefined;
  const saved = (lockedDNA?.locked && dnaAppearance)
    || Object.entries(appearances ?? {}).find(([key]) => areNamesEquivalent(key, name))?.[1]?.trim()
    || dnaAppearance;
  const resolved = cue.resolvedIdentity?.trim() || (sameCharacter ? scene.identityPrompt?.trim() : "") || "";
  return {
    name,
    sameCharacter,
    saved,
    resolved,
    identity: cue.visualSources?.includes("manual subject correction") ? resolved : saved || resolved,
    lockedDNA
  };
}

export function buildVisualBrief(
  config: VisualNovelConfig,
  scene: SceneState,
  cue: VisualCue,
  appearances?: CharacterAppearanceMap,
  characterDNALibrary?: CharacterDNALibrary | Record<string, CharacterDNA>
): VisualBrief {
  const template = cue.imageTemplate ?? resolveImageTemplate(config).template;
  const noPeople = template.subjectMode === "none";
  const ensemble = template.subjectMode === "ensemble";
  const { name, sameCharacter, saved, resolved, identity, lockedDNA } = resolveTemplateIdentity(scene, cue, appearances, characterDNALibrary);
  const dnaAttire = lockedDNA ? (lockedDNA.activeOutfit || lockedDNA.signatureOutfit || null) : null;
  const attire = cue.resolvedAttire !== undefined ? cue.resolvedAttire : cue.attire ?? (sameCharacter ? scene.attire : null) ?? dnaAttire;
  const manual = cue.visualSources?.includes("manual subject correction");
  const conflicts = !noPeople && !ensemble && saved && resolved && saved !== resolved
    ? [manual ? "Manual appearance replaces saved appearance for this picture." : lockedDNA?.locked ? "Locked Character DNA takes precedence over story text drift." : "Saved appearance differs from scene evidence; the saved appearance is used."]
    : [];
  const appearance = attire ? applyAttireOverride(identity, attire) : identity;
  const subject = cue.subjectCategory ?? scene.subjectCategory;
  const subjectLabel = subject === "female" ? "One visible woman" : subject === "male" ? "One visible man" : "One visible character";
  const cleanedVisualDescription = sanitizeVisualNarrativeDescription(cue.visualDescription);
  const rawPose = noPeople || ensemble ? "" : poseById(POSE_EXPRESSION_CATALOGUE, cue.poseExpressionId).suffix;
  const pose = sanitizePoseExpression(rawPose, {
    keepWeightBrackets: false,
    stripAnimeTropes: true,
    hasActiveSceneAction: cleanedVisualDescription.length > 40
  });
  const environment = scene.environment;
  const relevantPersistentElements = selectRelevantPersistentElements(
    environment.description,
    cleanedVisualDescription,
    environment.persistentElements
  );
  const chars = characterDNALibrary
    ? (('characters' in characterDNALibrary ? characterDNALibrary.characters : characterDNALibrary) as Record<string, CharacterDNA>)
    : undefined;

  const members = (cue.ensembleSubjects ?? scene.cast.map(name => ({name,appearance:""}))).map(member=>{
    let dnaAppearance: string | undefined;
    let memberDna: CharacterDNA | undefined;
    if (chars) {
      const matchId = findMatchingCharacterId(chars, member.name);
      if (matchId && chars[matchId]) {
        memberDna = chars[matchId];
        dnaAppearance = formatCharacterDNAToPromptClause(memberDna);
      }
    }
    const saved = Object.entries(appearances ?? {}).find(([key]) => areNamesEquivalent(key, member.name))?.[1];
    const memberAttire = ('attire' in member && member.attire)
      ? String(member.attire)
      : (memberDna?.activeOutfit || memberDna?.signatureOutfit || undefined);
    const appearanceBase = manual ? member.appearance : (dnaAppearance || saved || member.appearance);
    const appearance = memberAttire ? applyAttireOverride(appearanceBase, memberAttire) : appearanceBase;
    return {...member, appearance, attire: memberAttire};
  });
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
    ...(!noPeople?{subjectPreparation:{
      name:ensemble?'Named ensemble':name.slice(0,256),identity:ensemble?'':(attire?applyAttireOverride(identity,''):identity).slice(0,4000),
      identitySource:ensemble?'ensemble snapshot' as const:!identity?'unavailable' as const:manual?'manual correction' as const:lockedDNA?.locked?'locked DNA' as any:saved?'saved appearance' as const:'resolved context' as const,
      attire:ensemble?null:attire?.slice(0,2000)??null,
      attireSource:ensemble?'not supplied' as const:cue.resolvedAttire!==undefined||cue.attire!=null?'picture cue' as const:sameCharacter&&scene.attire!==undefined&&scene.attire!==null?'scene' as const:dnaAttire?'locked DNA' as any:'not supplied' as const,
      direction:pose.slice(0,1000),shortened:!ensemble&&(identity.length>4000||(attire?.length??0)>2000||pose.length>1000),
      subjectsInPositive:template.positive.includes('{{subjects}}'),subjectsInNegative:template.negative.includes('{{subjects}}'),
    }}:{}),
    scene: text([environment.location, environment.description, ...relevantPersistentElements, environment.timeOfDay, environment.weather]),
    subjects: noPeople ? "" : ensemble ? group : text([subjectLabel, appearance, template.category === "portrait" ? pose : ""]),
    action: noPeople ? template.category === "detail" || template.category === "custom" ? (cue.visualFocus ?? "").slice(0, 1000) : "" : text([cleanedVisualDescription, compileActionProp(cue.action), template.category === "portrait" ? "" : pose]),
    composition: `${template.framing}; eye-level view; ${noPeople ? "no people" : ensemble ? `${members.length} visible characters, including every listed subject; distinct faces and silhouettes` : "one visible character"}; keep the lower quarter clear for dialogue`,
    lighting: (environment.lighting ?? "").slice(0, 1000),
    subjectMode: template.subjectMode,
    framing: template.framing,
    referencePolicy: noPeople || ensemble ? "none" : template.referencePolicy,
    sources: [...(cue.visualSources ?? []), "scene context", ...(lockedDNA?.locked ? ["character DNA matrix"] : []), ...(ensemble ? ["named cast and persona appearance snapshot"] : !noPeople && saved && !manual ? ["saved appearance"] : [])].slice(0, 24),
    conflicts: [...conflicts, ...(ensemble && members.some(member => member.appearance.length > descriptionBudget) ? ["Ensemble appearance descriptions are condensed to share the prompt budget; all listed names are retained."] : []), ...sharedStyleWarnings(template, config.promptPrefix, config.promptSuffix, config.negativePrompt)].slice(0, 16)
  };
}
