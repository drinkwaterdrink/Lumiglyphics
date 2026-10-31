import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard. A template literal assigned to innerHTML must not interpolate
 * a value unless it is built with html`` (which escapes) or the interpolation is
 * a known-trusted constant or helper. Multi-line statements are not inspected, so
 * this is a tripwire for the common single-line case, not a full analysis.
 */
const SAFE_INTERPOLATIONS = [
  /\bhtml`/,          // escaping template
  /escapeHtml\(/,     // existing escaper
  /\$\{[A-Z_][A-Z0-9_]*\}/, // module constants such as CSS, THEME_MARKUP
  /readerIcon\(/,     // fixed SVG icon table
  /\bsvg\b/i,         // inline SVG markup
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [path] : [];
  });
}

test("no single-line innerHTML template interpolates an unescaped value", () => {
  const violations: string[] = [];
  for (const file of sourceFiles("src/frontend")) {
    readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      const assignsTemplate = /innerHTML\s*=\s*`/.test(line) || /insertAdjacentHTML\(.*`/.test(line);
      if (!assignsTemplate || !line.includes("${")) return;
      if (SAFE_INTERPOLATIONS.some((pattern) => pattern.test(line))) return;
      violations.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  expect(violations).toEqual([]);
});
