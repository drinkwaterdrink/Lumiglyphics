function stripReasoningBlocks(text: string): string {
  // 1. Strip all closed reasoning / thinking tags (think, thought, thinking, reasoning, reflection, plan)
  let cleaned = text.replace(/<(?:think|thought|thinking|reasoning|reflection|plan)\b[\s\S]*?<\/(?:think|thought|thinking|reasoning|reflection|plan)>/gi, "");
  // 2. Strip unclosed leading reasoning tags if cut off before closing tag
  cleaned = cleaned.replace(/^\s*<(?:think|thought|thinking|reasoning|reflection|plan)\b[\s\S]*?(?=```|\{)/gi, "");
  return cleaned.trim();
}

const whitespace = /\s/;

/** Remove syntax comments only outside quoted values, in one linear pass. */
function withoutJsonComments(source:string):string {
  const out:string[]=[];let quote:string|null=null,escaped=false;
  for(let index=0;index<source.length;index++){
    const char=source[index]!;
    if(quote){out.push(char);if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote=null;continue;}
    if(char==='"'||char==="'"){quote=char;out.push(char);continue;}
    if(char==='/'&&source[index+1]==='/'&&source[index-1]!==':'){while(index+1<source.length&&source[index+1]!=='\n'&&source[index+1]!=='\r')index++;out.push(' ');continue;}
    if(char==='/'&&source[index+1]==='*'){index+=2;while(index<source.length&&!(source[index]==='*'&&source[index+1]==='/')){if(source[index]==='\n'||source[index]==='\r')out.push(source[index]!);index++;}index++;out.push(' ');continue;}
    out.push(char);
  }
  return out.join('');
}

export function repairJsonString(candidate: string): string {
  // Strip single-line comments //... outside URLs and block comments /*...*/
  let text = withoutJsonComments(candidate);

  // Convert python literals outside strings: True -> true, False -> false, None -> null
  text = text.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:True|False|None)\b)/g, (match, strVal, literal) => {
    if (strVal) return strVal;
    if (literal === "True") return "true";
    if (literal === "False") return "false";
    if (literal === "None") return "null";
    return match;
  });

  // Single-quoted keys and unquoted property keys outside double-quoted strings:
  text = text.replace(/("(?:\\.|[^"\\])*")|'([a-zA-Z0-9_\-\s]+)'\s*:/g, (match, strVal, key) => {
    if (strVal) return strVal;
    return `"${key}":`;
  });

  text = text.replace(/("(?:\\.|[^"\\])*")|([{\[,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, strVal, prefix, key) => {
    if (strVal) return strVal;
    return `${prefix}"${key}":`;
  });

  // Remove invalid JSON escape sequences like \' -> '
  text = text.replace(/\\'/g, "'");
  // Strip trailing commas before } or ]
  text = text.replace(/,\s*([\}\]])/g, "$1");

  // F8: one O(n) pass giving, for every position, the next non-whitespace
  // index at or after it. The previous implementation copied and re-scanned
  // the whole remaining tail (`text.slice(i + 1).trimStart()`) at every quote,
  // which is quadratic on long model responses with many quoted strings.
  const nextNonSpace = new Int32Array(text.length + 1);
  nextNonSpace[text.length] = text.length;
  for (let i = text.length - 1; i >= 0; i--) {
    nextNonSpace[i] = whitespace.test(text[i]!) ? nextNonSpace[i + 1]! : i;
  }
  const commaFollow = /(?:"[^"\\]*"\s*:|[\{\[\]\}]|"[^"\\]*"|-?\d|true|false|null)/y;

  // Character walk to fix unescaped raw newlines/tabs inside strings, unescaped inner quotes, and balance brackets
  const chars: string[] = [];
  let inString = false;
  let escape = false;
  const openBrackets: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (escape) {
      chars.push(ch);
      escape = false;
      continue;
    }
    if (ch === "\\") {
      chars.push(ch);
      escape = true;
      continue;
    }
    if (ch === '"') {
      if (inString) {
        // Lookahead without copying the tail: inspect the next non-whitespace
        // character after this quote (the old trimStart made \n/\r unreachable
        // as the first character, so only the structural tokens matter).
        const after = nextNonSpace[i + 1]!;
        let isRealDelimiter = false;
        if (after < text.length) {
          const next = text[after]!;
          if (next === ":" || next === "}" || next === "]") {
            isRealDelimiter = true;
          } else if (next === ",") {
            const afterComma = nextNonSpace[after + 1]!;
            if (afterComma < text.length) {
              commaFollow.lastIndex = afterComma;
              isRealDelimiter = commaFollow.test(text);
            }
          }
        }
        // `after === text.length` mirrors the old empty-`rest` case: a quote
        // with nothing after it closes the string rather than being escaped.
        if (!isRealDelimiter && after < text.length) {
          // Unescaped inner quote inside string! Escape it.
          chars.push('\\"');
          continue;
        }
      }
      inString = !inString;
      chars.push(ch);
      continue;
    }
    if (inString) {
      if (ch === "\n") chars.push("\\n");
      else if (ch === "\r") chars.push("\\r");
      else if (ch === "\t") chars.push("\\t");
      else chars.push(ch);
    } else {
      if (ch === "{" || ch === "[") {
        openBrackets.push(ch);
      } else if (ch === "}") {
        if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === "{") {
          openBrackets.pop();
        }
      } else if (ch === "]") {
        if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === "[") {
          openBrackets.pop();
        }
      }
      chars.push(ch);
    }
  }

  let repaired = chars.join("").trimEnd();
  // If ended in trailing comma before cutoff, remove it
  repaired = repaired.replace(/,\s*$/, "");
  // If ended inside an open string, close the string
  if (inString) {
    repaired += '"';
  }
  // Balance any remaining open brackets in reverse order
  for (let i = openBrackets.length - 1; i >= 0; i--) {
    repaired += openBrackets[i] === "{" ? "}" : "]";
  }
  // Final pass for trailing commas before closing braces
  return repaired.replace(/,\s*([\}\]])/g, "$1");
}

/**
 * Debug-only parse trace. `extract` names the step of `jsonObject` that found
 * the JSON text; `strategy` names the `tryParseJson` step that parsed it.
 * Purely informational: it never changes parsing behaviour.
 */
export type JsonParseTrace = { extract?: string; strategy?: string };

function tryParseJson(text: string, trace?: JsonParseTrace): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (trace) trace.strategy = "direct";
    return parsed;
  } catch {
    // 1. Try stripping trailing commas before closing braces/brackets
    try {
      const withoutTrailingCommas = trimmed.replace(/,\s*([\}\]])/g, "$1");
      const parsed = JSON.parse(withoutTrailingCommas);
      if (trace) trace.strategy = "trailing-commas";
      return parsed;
    } catch {
      // 2. Try deep JSON repair (comments, unescaped quotes, unquoted keys, python literals, unescaped control chars, balanced brackets)
      try {
        const repaired = repairJsonString(trimmed);
        const parsed = JSON.parse(repaired);
        if (trace) trace.strategy = "deep-repair";
        return parsed;
      } catch {
        return null;
      }
    }
  }
}

export function jsonObject(content: unknown, trace?: JsonParseTrace): unknown {
  if (content !== null && typeof content === "object") {
    if (trace) trace.extract = "object";
    return content;
  }
  if (typeof content !== "string") {
    throw new Error("The visual planner did not return a JSON object.");
  }

  // 1. Strip thinking blocks like <think>...</think>, <thought>...</thought>, etc.
  const stripped = stripReasoningBlocks(content);

  // 2. Look for ```json ... ``` code fence specifically
  const jsonFencedMatches = stripped.matchAll(/```json\s*([\s\S]*?)(?:```|$)/gi);
  for (const match of jsonFencedMatches) {
    const body = match[1]?.trim();
    if (body) {
      const parsed = tryParseJson(body, trace);
      if (parsed && typeof parsed === "object") {
        if (trace) trace.extract = "json-fence";
        return parsed;
      }
      const start = body.indexOf("{");
      const end = body.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const inner = tryParseJson(body.slice(start, end + 1), trace);
        if (inner && typeof inner === "object") {
          if (trace) trace.extract = "json-fence-span";
          return inner;
        }
      }
    }
  }

  // 3. Look for any ``` ... ``` code fence that contains '{'
  const anyFencedMatches = stripped.matchAll(/```(?:\w+)?\s*([\s\S]*?)(?:```|$)/gi);
  for (const match of anyFencedMatches) {
    const body = match[1]?.trim();
    if (body && body.includes("{")) {
      const parsed = tryParseJson(body, trace);
      if (parsed && typeof parsed === "object") {
        if (trace) trace.extract = "any-fence";
        return parsed;
      }
      const start = body.indexOf("{");
      const end = body.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const inner = tryParseJson(body.slice(start, end + 1), trace);
        if (inner && typeof inner === "object") {
          if (trace) trace.extract = "any-fence-span";
          return inner;
        }
      }
    }
  }

  // 4. Try parsing the whole stripped content directly
  const directParsed = tryParseJson(stripped, trace);
  if (directParsed && typeof directParsed === "object") {
    if (trace) trace.extract = "whole";
    return directParsed;
  }

  // 5. Find the first '{' and last '}' in the whole content
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0) {
    const candidate = end > start ? stripped.slice(start, end + 1) : stripped.slice(start);
    const parsed = tryParseJson(candidate, trace);
    if (parsed && typeof parsed === "object") {
      if (trace) trace.extract = "brace-span";
      return parsed;
    }
  }

  // 6. If all fails, provide a truncated excerpt in the error message for debugging
  const preview = stripped.length > 200 ? `${stripped.slice(0, 197)}...` : stripped;
  throw new Error(`The visual planner did not return a JSON object. Raw content: "${preview}"`);
}
