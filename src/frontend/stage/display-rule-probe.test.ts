import { expect, test } from "bun:test";
import { createDisplayRuleGuard, probeDisplayRules, type DisplayRuleProbe } from "./display-rule-probe.js";

const RULES = "/hello/ => hi\n/world/ => earth";

test("a rule that does not finish in time is removed and reported by its settings line", async () => {
  const result = await probeDisplayRules(RULES, async (rule) => (rule.pattern.source === "world" ? "slow" : "ok"));
  expect(result.slowLines).toEqual([2]);
  expect(result.safeText).toBe("/hello/ => hi");
  expect(result.unavailable).toBe(false);
});

test("when workers cannot run, the statically screened rules are kept as written", async () => {
  const result = await probeDisplayRules(RULES, async () => "unavailable");
  expect(result).toEqual({ safeText: RULES, slowLines: [], unavailable: true });
});

test("the guard applies nothing until the probe finishes, then the safe text, cached per text", async () => {
  const applied: string[] = [];
  let probes = 0;
  const guard = createDisplayRuleGuard(
    (text) => applied.push(text),
    async (text): Promise<DisplayRuleProbe> => {
      probes += 1;
      return { safeText: "/hello/ => hi", slowLines: [2], unavailable: false };
    },
  );
  guard(RULES);
  expect(applied).toEqual([""]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(applied).toEqual(["", "/hello/ => hi"]);
  guard(RULES);
  expect(applied.at(-1)).toBe("/hello/ => hi");
  expect(probes).toBe(1);
});

test("a stale probe cannot overwrite newer settings", async () => {
  const applied: string[] = [];
  const pending: Array<(value: DisplayRuleProbe) => void> = [];
  const guard = createDisplayRuleGuard(
    (text) => applied.push(text),
    (text) => new Promise<DisplayRuleProbe>((resolve) => pending.push((value) => resolve({ ...value, safeText: text }))),
  );
  guard("/a/ => b");
  guard("/c/ => d");
  pending[1]!({ safeText: "", slowLines: [], unavailable: false });
  pending[0]!({ safeText: "", slowLines: [], unavailable: false });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(applied.at(-1)).toBe("/c/ => d");
});

test("clearing the rules applies nothing and needs no probe", () => {
  const applied: string[] = [];
  createDisplayRuleGuard((text) => applied.push(text), async () => { throw new Error("should not probe"); })("   ");
  expect(applied).toEqual([""]);
});
