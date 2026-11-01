export type CustomRegexRule={pattern:RegExp;replacement:string;/** 1-based settings line that defined the rule. */line?:number};
export type DisplayRuleIssue={line:number;message:string};

/** Display rules run synchronously on the main thread during paragraph
 *  rendering, so a pattern longer than this is rejected rather than risking
 *  long scans on low-end devices. */
export const MAX_DISPLAY_RULE_PATTERN = 1000;

type GroupState = { hasQuantifier: boolean; hasAlternation: boolean };

/**
 * Static catastrophic-backtracking screen. A full regex safety analysis is
 * impossible without an engine, but the textbook ReDoS shapes used in real
 * attacks are detectable without executing the pattern:
 *
 *   1. a quantified group whose body itself contains a quantifier (`(a+)+`,
 *      `(\\w+\\s?)*`, `(a{2})+`), and
 *   2. a quantified group containing alternation (`(a|a)*`, `(.*|x)+`),
 *      whose branches can match the same text in multiple ways.
 *
 * Escapes and character classes are skipped so their contents never count.
 * Returns a human-readable rejection reason, or null when the pattern passes.
 */
export function findReDoSHazard(source: string): string | null {
  let inCharacterClass = false;
  let afterOpenParen = false;
  const stack: GroupState[] = [];
  let closed: GroupState | null = null;
  let previousWasQuantifier = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (inCharacterClass) {
      if (char === "\\") index += 1;
      else if (char === "]") inCharacterClass = false;
      continue;
    }
    if (char === "\\") { index += 1; previousWasQuantifier = false; closed = null; continue; }
    if (char === "[") { inCharacterClass = true; previousWasQuantifier = false; closed = null; continue; }
    if (char === "(") {
      stack.push({ hasQuantifier: false, hasAlternation: false });
      afterOpenParen = true;
      closed = null;
      previousWasQuantifier = false;
      continue;
    }
    if (char === ")") {
      closed = stack.pop() ?? null;
      afterOpenParen = false;
      previousWasQuantifier = false;
      continue;
    }
    if (char === "|") {
      const group = stack.at(-1);
      if (group) group.hasAlternation = true;
      previousWasQuantifier = false;
      continue;
    }
    const braceMatch = char === "{" ? /^\{\d+(?:,\d*)?\}/.exec(source.slice(index)) : null;
    const isQuantifier = char === "+" || char === "*" || char === "?" || braceMatch !== null;
    if (isQuantifier) {
      // "?:" / "?=" / "(?<=" etc. are group modifiers, not quantifiers.
      const groupModifier = char === "?" && afterOpenParen;
      // "+?" / "*?" / "??" / "{n}?" are laziness markers, not new repetition.
      const lazinessMarker = char === "?" && previousWasQuantifier;
      if (!groupModifier && !lazinessMarker) {
        if (closed && (closed.hasQuantifier || closed.hasAlternation)) {
          return "Repeated group contains repetition or alternation, which can freeze the reader with catastrophic backtracking. Simplify or unroll the pattern.";
        }
        const parent = stack.at(-1);
        if (parent) parent.hasQuantifier = true;
      }
      if (braceMatch) index += braceMatch[0].length - 1;
      previousWasQuantifier = true;
      afterOpenParen = false;
      closed = null;
      continue;
    }
    previousWasQuantifier = false;
    afterOpenParen = false;
    closed = null;
  }
  return null;
}

/** Syntax diagnostics plus a static execution-safety screen. Compiling a
 *  RegExp alone cannot establish that it is safe to run on story text. */
export function compileDisplayRules(input:string|undefined):{rules:CustomRegexRule[];issues:DisplayRuleIssue[]}{
 const rules:CustomRegexRule[]=[],issues:DisplayRuleIssue[]=[];
 for(const [index,line] of (input??'').split(/\r?\n/).entries()){
  const text=line.trim();
  if(!text||text.startsWith('#')||text.startsWith('//'))continue;
  const issue=(message:string)=>issues.push({line:index+1,message});
  let source:string,flags='g',replacement:string;
  if(text.startsWith('/')){
   const match=text.match(/^\/(.+)\/([a-z]*)\s*=>\s*(.*)$/);
   if(!match){issue('Use /pattern/flags => replacement.');continue;}
   source=match[1]!;flags=match[2]||'g';replacement=match[3]??'';
  }else{
   const separator=text.indexOf('=>');
   if(separator<0){issue('Add => between the pattern and replacement.');continue;}
   source=text.slice(0,separator).trim();replacement=text.slice(separator+2).trim();
   if(!source){issue('Enter a pattern before =>.');continue;}
  }
  if(source.length>MAX_DISPLAY_RULE_PATTERN){issue(`Display rule patterns are limited to ${MAX_DISPLAY_RULE_PATTERN} characters.`);continue;}
  const hazard=findReDoSHazard(source);
  if(hazard){issue(hazard);continue;}
  try{rules.push({pattern:new RegExp(source,flags),replacement,line:index+1});}
  catch{issue('Invalid pattern or flags. Check brackets, escapes and repeated flags.');}
 }
 return {rules,issues};
}
