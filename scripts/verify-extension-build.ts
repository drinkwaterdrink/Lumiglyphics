import { LUMIGLYPHICS_VERSION } from '../src/shared/build-info.js';
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const manifest = JSON.parse(readFileSync("spindle.json", "utf8"));
assert.equal(manifest.version, LUMIGLYPHICS_VERSION);
assert.equal(manifest.identifier, "lumiglyphics");
assert.equal(manifest.github, "https://github.com/drinkwaterdrink/Lumiglyphics");
assert.equal(manifest.homepage, "https://github.com/drinkwaterdrink/Lumiglyphics#readme");
assert.equal(manifest.version, JSON.parse(readFileSync("package.json", "utf8")).version);
for (const entry of [manifest.entry_backend, manifest.entry_frontend]) assert.ok(existsSync(entry), `Missing entry ${entry}`);
const validatorVersion=JSON.parse(readFileSync('package.json','utf8')).dependencies.zod;
assert.match(validatorVersion,/^\d+\.\d+\.\d+$/,'Pin the runtime validator to an exact tested version.');
assert.equal(JSON.parse(readFileSync('node_modules/zod/package.json','utf8')).version,validatorVersion,'Installed validator differs from the release pin.');
assert.ok(readFileSync('bun.lock','utf8').includes(`"zod": ["zod@${validatorVersion}",`),'Lockfile validator differs from the release pin.');
const backend = readFileSync(manifest.entry_backend, "utf8");
const patterns = {
  filesystem: /(?:from\s*|import\s*\(|require\s*\()\s*["'](?:node:)?fs(?:\/promises)?["']|\breadFileSync\s*\(/,
  processModules: /["'](?:node:)?(?:child_process|net|tls|dgram|http|https|worker_threads|cluster|sqlite)["']|["']bun:sqlite["']/,
  systemApis: /\bBun\s*\.\s*(?:file|write|spawn|spawnSync|serve|connect|listen)\b|\bprocess\s*\.\s*(?:env|exit|kill|chdir|dlopen)\b/,
  dynamicCode: /\beval\s*\(|\bFunction\s*\(/,
};
const matches = Object.entries(patterns).filter(([, pattern]) => pattern.test(backend)).map(([name]) => name);
assert.deepEqual(matches, [], "Backend contains patterns requiring investigation");
// Lumiverse builds the backend with --target bun. YAML's Node binary helper
// needs the documented declaration even when only the core schema is used.
// This is a conservative local check, not a replacement for the host scanner.
const base64Decode = /\bBuffer\s*\.\s*from\s*\([^)]*["'`]base64["'`]|\batob\s*\(/.test(backend);
const declaredCapabilities: unknown[] = manifest.requested_capabilities ?? [];
assert.ok(!base64Decode || declaredCapabilities.includes("base64_decode"),
  "Backend bundles base64 decoding; declare base64_decode in spindle.json");
const evidence = {
  checkedAt: new Date().toISOString(), identifier: manifest.identifier, version: manifest.version,
  entries: [manifest.entry_backend, manifest.entry_frontend].map((entry: string) => { const data = readFileSync(entry); return { entry, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") }; }),
  localStaticPatterns: { checked: Object.keys(patterns), matches },
  capabilities: { declared: declaredCapabilities, base64Decode },
  limitation: "Local text checks only; not the host install-time scanner or a live Lumiverse runtime test.",
  reference: "https://docs.lumiverse.chat/getting-started/capabilities/"
};
writeFileSync("docs/review-evidence/build-verification.json", `${JSON.stringify(evidence, null, 2)}\n`);
console.log("Manifest entries/version and local backend static-pattern checks passed.");
