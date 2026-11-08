/**
 * Bidirectional nickname and diminutive matching dictionary.
 * Helps prevent duplicate character discovery when characters are referred to by common diminutives
 * (e.g., Robert vs. Bob, William vs. Bill, Katherine vs. Kate, or single-name vs. full-name).
 */

const NICKNAME_CLUSTERS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["robert", "bob", "bobby", "rob", "robby", "robbie"]),
  new Set(["william", "bill", "billy", "will", "willy", "willie", "liam"]),
  new Set(["richard", "rick", "ricky", "rich", "richie", "dick", "dickie"]),
  new Set(["james", "jim", "jimmy", "jamie", "jem"]),
  new Set(["john", "johnny", "jon", "jonny", "jack", "jackie"]),
  new Set(["jonathan", "jon", "john", "jonny"]),
  new Set(["joseph", "joe", "joey"]),
  new Set(["thomas", "tom", "tommy"]),
  new Set(["charles", "charlie", "charley", "chuck", "chas"]),
  new Set(["edward", "ed", "eddie", "eddy", "ned", "ted", "teddy"]),
  new Set(["michael", "mike", "mikey", "mick"]),
  new Set(["david", "dave", "davey", "davy"]),
  new Set(["daniel", "dan", "danny"]),
  new Set(["benjamin", "ben", "benny", "benji"]),
  new Set(["alexander", "alex", "alec", "lex", "xander", "sasha"]),
  new Set(["alexandra", "alex", "alexa", "lexi", "lexie", "sasha", "sandra"]),
  new Set(["anthony", "tony"]),
  new Set(["christopher", "chris"]),
  new Set(["matthew", "matt", "matty"]),
  new Set(["samuel", "sam", "sammy"]),
  new Set(["nicholas", "nick", "nicky", "nico"]),
  new Set(["elizabeth", "liz", "lizzie", "lizzy", "beth", "betty", "betsy", "eliza", "ellie"]),
  new Set(["margaret", "maggie", "meg", "peggy", "marge", "margie", "daisy"]),
  new Set(["katherine", "catherine", "kate", "katie", "kathy", "cat", "cathy", "kay"]),
  new Set(["patricia", "pat", "patty", "patsy", "tricia", "trish"]),
  new Set(["jennifer", "jen", "jenny", "jenn"]),
  new Set(["rebecca", "becca", "becky"]),
  new Set(["victoria", "vicky", "vicki", "tori"]),
  new Set(["abigail", "abby", "abbie", "gail"]),
  new Set(["eleanor", "ellie", "ella", "nora"]),
  new Set(["theodore", "theo", "ted", "teddy"]),
  new Set(["arthur", "art", "artie"]),
  new Set(["henry", "hank", "harry", "hal"]),
  new Set(["andrew", "andy", "drew"]),
  new Set(["francis", "frank", "frankie"]),
  new Set(["gerald", "jerry", "gerry"]),
  new Set(["lawrence", "larry"]),
  new Set(["stephen", "steven", "steve", "stevie"]),
  new Set(["walter", "walt", "wally"]),
  new Set(["marche", "marseline", "marseline vane"])
];

const LOOKUP_MAP = new Map<string, ReadonlySet<string>>();
for (const cluster of NICKNAME_CLUSTERS) {
  for (const name of cluster) {
    LOOKUP_MAP.set(name, cluster);
  }
}

/**
 * Normalizes a raw character name for comparison:
 * strips honorifics (Mr., Ms., Dr., Lord, Lady, Captain, Detective), punctuation, and casing.
 */
export function normalizeNameToken(rawName: string): string {
  return rawName
    .trim()
    .toLowerCase()
    .replace(/^(?:mr\.|mrs\.|ms\.|miss|dr\.|doctor|sir|lord|lady|captain|detective|sergeant|officer|prof\.|professor)\s+/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether two names can refer to the same individual based on:
 * 1. Exact string match (case-insensitive).
 * 2. Diminutive / nickname equivalence (e.g. Robert <-> Bob).
 * 3. Full-name vs first-name / last-name match (e.g. Marseline Vane <-> Marseline, or Robert Smith <-> Bob).
 */
export function areNamesEquivalent(nameA: string, nameB: string): boolean {
  const normA = normalizeNameToken(nameA);
  const normB = normalizeNameToken(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Split tokens (first name, last name, etc.)
  const tokensA = normA.split(" ");
  const tokensB = normB.split(" ");

  const firstA = tokensA[0]!;
  const firstB = tokensB[0]!;

  // 1. Direct nickname cluster check on first names
  const clusterA = LOOKUP_MAP.get(firstA);
  const clusterB = LOOKUP_MAP.get(firstB);

  const firstNamesMatch = firstA === firstB || (clusterA !== undefined && clusterA.has(firstB)) || (clusterB !== undefined && clusterB.has(firstA));

  if (firstNamesMatch) {
    // If one is just a first name and the other has a surname, allow equivalence
    if (tokensA.length === 1 || tokensB.length === 1) return true;
    // If both have surnames, surnames must match
    const lastA = tokensA[tokensA.length - 1]!;
    const lastB = tokensB[tokensB.length - 1]!;
    if (lastA === lastB) return true;
  }

  // 2. Full single name matches the single surname (e.g. Detective Vane <-> Marseline Vane)
  if (tokensA.length === 1 && tokensB.length > 1 && tokensB[tokensB.length - 1] === tokensA[0]) {
    return true;
  }
  if (tokensB.length === 1 && tokensA.length > 1 && tokensA[tokensA.length - 1] === tokensB[0]) {
    return true;
  }

  return false;
}

/**
 * Finds an existing character entry in a library matching a newly discovered candidate name,
 * taking aliases and nickname diminutives into account.
 */
export function findMatchingCharacterId(
  library: Record<string, { id: string; name: string; aliases?: readonly string[] }>,
  candidateName: string
): string | null {
  const candidateNorm = normalizeNameToken(candidateName);
  if (!candidateNorm) return null;

  for (const char of Object.values(library)) {
    if (areNamesEquivalent(char.name, candidateName)) {
      return char.id;
    }
    for (const alias of char.aliases ?? []) {
      if (areNamesEquivalent(alias, candidateName)) {
        return char.id;
      }
    }
  }

  return null;
}
