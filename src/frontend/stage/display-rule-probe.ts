import { compileDisplayRules } from "../../shared/display-rules.js";

/**
 * Dialogue display rules run on the main thread while a paragraph renders, so a
 * catastrophic pattern would freeze the reader. Before the reader applies a rule
 * set, each rule runs alone in a disposable worker against adversarial samples.
 * A rule that does not finish in time is left out. Until a probe finishes, the
 * reader applies no custom rules (fail closed).
 *
 * This guards against patterns that are slow on ordinary-looking text, but it
 * cannot prove a rule safe for every paragraph; the static screen still applies.
 */
export const PROBE_TIMEOUT_MS = 500;

/** Inputs chosen to make backtracking blow up: long runs with a failing tail. */
export const PROBE_SAMPLES: readonly string[] = [
  `${"a".repeat(3000)}!`,
  `${"0".repeat(3000)}x`,
  `${" ".repeat(3000)}x`,
  `${"The lantern flickered as Mira whispered, \"Did you hear that?\" ".repeat(20)}`,
];

export type RuleProbeOutcome = "ok" | "slow" | "unavailable";

export type DisplayRuleProbe = {
  /** The rules text with slow lines removed. Equal to the input when nothing was removed. */
  safeText: string;
  /** Settings line numbers of rules that did not finish in time. */
  slowLines: number[];
  /** True when workers cannot run here; the caller keeps the statically screened rules. */
  unavailable: boolean;
};

function workerSource(): string {
  return `const samples = ${JSON.stringify(PROBE_SAMPLES)};
onmessage = ({ data }) => {
  const pattern = new RegExp(data.source, data.flags);
  for (const sample of samples) sample.replace(pattern, data.replacement);
  postMessage({ ok: true });
};`;
}

/** Runs one rule against the samples in its own worker. */
export function probeRuleInWorker(rule: { pattern: RegExp; replacement: string }, timeoutMs = PROBE_TIMEOUT_MS): Promise<RuleProbeOutcome> {
  return new Promise((resolve) => {
    let url: string;
    let worker: Worker;
    try {
      url = URL.createObjectURL(new Blob([workerSource()], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch {
      resolve("unavailable");
      return;
    }
    let settled = false;
    const finish = (outcome: RuleProbeOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(outcome);
    };
    const timer = setTimeout(() => finish("slow"), timeoutMs);
    worker.onerror = () => finish("unavailable");
    worker.onmessage = () => finish("ok");
    worker.postMessage({ source: rule.pattern.source, flags: rule.pattern.flags, replacement: rule.replacement });
  });
}

function withoutLines(text: string, lines: ReadonlySet<number>): string {
  return text.split(/\r?\n/).filter((_, index) => !lines.has(index + 1)).join("\n");
}

export async function probeDisplayRules(
  rulesText: string,
  probe: (rule: { pattern: RegExp; replacement: string }) => Promise<RuleProbeOutcome> = probeRuleInWorker,
): Promise<DisplayRuleProbe> {
  const { rules } = compileDisplayRules(rulesText);
  if (!rules.length) return { safeText: rulesText, slowLines: [], unavailable: false };
  const outcomes = await Promise.all(rules.map((rule) => probe(rule)));
  if (outcomes.includes("unavailable")) return { safeText: rulesText, slowLines: [], unavailable: true };
  const slowLines = rules.flatMap((rule, index) => (outcomes[index] === "slow" && rule.line ? [rule.line] : []));
  if (!slowLines.length) return { safeText: rulesText, slowLines, unavailable: false };
  return { safeText: withoutLines(rulesText, new Set(slowLines)), slowLines, unavailable: false };
}

/**
 * Returns an applier for one stage. It applies nothing until the probe for the
 * given text has finished, then applies the probed text. Results are cached per
 * text so repeated settings pushes do not re-run workers.
 */
export function createDisplayRuleGuard(
  apply: (rulesText: string) => void,
  probe: (text: string) => Promise<DisplayRuleProbe> = probeDisplayRules,
): (rulesText: string) => void {
  const cache = new Map<string, string>();
  let latest = 0;
  return (rulesText: string) => {
    const token = ++latest;
    if (!rulesText.trim()) { apply(""); return; }
    const cached = cache.get(rulesText);
    if (cached !== undefined) { apply(cached); return; }
    apply("");
    probe(rulesText).then((result) => {
      const safe = result.unavailable ? rulesText : result.safeText;
      if (cache.size >= 20) cache.clear();
      cache.set(rulesText, safe);
      if (token === latest) apply(safe);
    }, () => {
      if (token === latest) apply("");
    });
  };
}
