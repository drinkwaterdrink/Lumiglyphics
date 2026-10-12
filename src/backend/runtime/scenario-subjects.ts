import { characterAppearanceKey, distillVisualTags, isUsableIdentity } from "../../shared/identity.js";

type Reference = { character?: string | null | undefined; characterId?: string | null | undefined };
type SubjectPlan = {
  scenes: Array<Reference & { startParagraph: number; cast: string[] }>;
  cues: Array<Reference & { paragraphIndex: number }>;
  characters: Array<{ name: string; description: string; characterId?: string | null | undefined }>;
  speakers: Array<{ paragraphIndex: number; name: string }>;
};

/** Repair only unsupported card-wrapper references, never unknown real people. */
export function repairScenarioSubjects<T extends SubjectPlan>(plan: T, card: { name: string; hasCharacterIdentity: boolean; explicitScenario?: boolean }): T {
  const key = characterAppearanceKey(card.name);
  if (!key || card.hasCharacterIdentity) return plan;
  const described = plan.characters.filter(person => {
    if(card.explicitScenario && characterAppearanceKey(person.name)===key) return false;
    const tags = distillVisualTags(person.description);
    return tags.length >= 2 && isUsableIdentity(person.name, tags);
  });
  // A separately described entity may legitimately have the same name as its card.
  if ((!card.explicitScenario && described.length === 0) || (!card.explicitScenario && described.some(person => characterAppearanceKey(person.name) === key))) return plan;
  const wrapper = (name: string | null | undefined) => !!name && characterAppearanceKey(name) === key;
  const personFor = (name: string | null | undefined) => described.find(person => characterAppearanceKey(person.name) === characterAppearanceKey(name ?? ""));
  const replacementFor = (scene: SubjectPlan["scenes"][number]) => {
    const cue = plan.cues.find(c => c.paragraphIndex === scene.startParagraph && !wrapper(c.character) && personFor(c.character));
    if (cue) return personFor(cue.character);
    const candidates = described.filter(person => scene.cast.some(name => characterAppearanceKey(name) === characterAppearanceKey(person.name)));
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  const scenes = plan.scenes.map(scene => {
    const person = wrapper(scene.character) ? replacementFor(scene) : undefined;
    return { ...scene, cast: scene.cast.filter(name => !wrapper(name)), ...(person ? { character: person.name, characterId: person.characterId ?? null } : card.explicitScenario && wrapper(scene.character) ? {character:null,characterId:null} : {}) };
  });
  const cues = plan.cues.map(cue => {
    if (!wrapper(cue.character)) return cue;
    const scene = [...plan.scenes].reverse().find(s => s.startParagraph <= cue.paragraphIndex);
    const person = scene ? replacementFor(scene) : undefined;
    return person ? { ...cue, character: person.name, characterId: person.characterId ?? null } : card.explicitScenario ? {...cue,character:null,characterId:null} : cue;
  });
  return { ...plan, scenes, cues, characters: card.explicitScenario ? plan.characters.filter(person=>!wrapper(person.name)) : plan.characters, speakers: plan.speakers.map(speaker => wrapper(speaker.name) ? { ...speaker, name: "Narrator" } : speaker) };
}
