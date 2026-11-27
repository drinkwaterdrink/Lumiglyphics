import { characterAppearanceKey } from "../../shared/identity.js";

type RosterMember = { name: string; aliases?: readonly string[] };

const nonVisible = /\b(?:off[ -]?screen|off[ -]?camera|out of (?:frame|view)|not (?:visible|present|in frame)|absent|(?:only |merely )?mentioned|remembered|imagined|pictured|behind (?:the )?camera)\b/i;
const physicalStaging = /^(?:is\s+|are\s+)?(?:stands?|standing|sits?|sitting|seated|kneels?|kneeling|crouch(?:es|ing)?|leans?|leaning|lies|lying|walks?|walking|runs?|running|enters?|entering|faces?|facing|holds?|holding|waits?|waiting|occupies|occupying|at\b|in\b|on\b|beside\b|behind\b|near\b|(?:foreground|midground|background)\b)\b/i;
const positionPrefix = /^(?:(?:in|at|on)\s+(?:the\s+)?)?(?:foreground|midground|background|(?:far[- ])?left|(?:far[- ])?right|center)(?:[- ](?:left|right|center))?\s*[:,—-]\s*/i;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Recover only named roster members with their own affirmative blocking line. */
export function recoverStagedCast(
  visible: readonly string[],
  relationships: readonly string[] | undefined,
  roster: readonly RosterMember[],
): string[] {
  const recovered = [...visible];
  if (!relationships?.length) return recovered;
  const names = new Map<string, { name: string; member: RosterMember } | null>();
  for (const member of roster) {
    for (const name of [member.name, ...member.aliases ?? []]) {
      const key = characterAppearanceKey(name);
      if (!key) continue;
      const previous = names.get(key);
      names.set(key, previous === undefined || previous?.member === member ? { name, member } : null);
    }
  }
  const matchers = [...names.values()]
    .filter(entry => entry !== null)
    .sort((left, right) => right.name.length - left.name.length)
    .map(({ name, member }) => ({ member, pattern: new RegExp(`^${escapeRegex(name)}(?=$|[^\\p{L}\\p{N}'’])`, "iu") }));
  const matchNamedMember = (line: string) => {
    for (const { member, pattern } of matchers) {
      const match = pattern.exec(line);
      if (match) return { member, next: line.slice(match[0].length).replace(/^[\s:,—-]+/, "") };
    }
    return null;
  };
  const staged = new Set<string>();
  for (const relationship of relationships) {
    if (nonVisible.test(relationship)) continue;
    const text = relationship.trim();
    const prefix = positionPrefix.exec(text);
    // Match the longest alias first so "Mira Vale" never resolves to "Mira".
    const match = matchNamedMember(text.slice(prefix?.[0].length ?? 0));
    if (!match) continue;
    const paired = /^and\s+/i.exec(match.next);
    const second = paired ? matchNamedMember(match.next.slice(paired[0].length)) : null;
    const blocking = second?.next ?? match.next;
    if (!physicalStaging.test(blocking) && !(prefix && !blocking)) continue;
    staged.add(match.member.name);
    if (second) staged.add(second.member.name);
  }
  const included = new Set(visible.map(name => {
    const key = characterAppearanceKey(name);
    return characterAppearanceKey(names.get(key)?.member.name ?? name);
  }));
  for (const name of staged) {
    if (!included.has(characterAppearanceKey(name))) recovered.push(name);
  }
  return recovered;
}
