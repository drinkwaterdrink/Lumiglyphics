# Audited improvements: implementation progress

Plan: `docs/superpowers/plans/2026-11-01-lumiglyphics-improvements.md`.
Base: Main-3-GPT beta.109, b0f5f5a594f4f6310a491b3452b388b91afdabfe.
Working branch: codex/audited-improvements in the isolated Main-3-GPT checkout.

## Task 0: baseline established

Installed Bun 1.4.0 locally in ignored `.cache/toolchain`, and installed frozen-lockfile dependencies in this checkout. No global tool changes. Baseline full isolated unit suite: 1,970 pass, zero fail (183 files). Baseline source typechecked and bundled. The archived secondary baseline copy cannot run bundle verification without its own node_modules because that verifier reads the installed validator path literally; the main implementation checkout's bundle verifier passes with its frozen dependencies.

`npx --no-install tsc` still tries to resolve an npm package because Bun's Windows executable shim is not recognized there. Use `node node_modules/typescript/bin/tsc --noEmit` for the equivalent installed compiler check; `bun run build` resolves its compiler successfully. No package/dependency pin changed.

## Task 1: correctness packet implemented and verified

- Named System One speaker and Narrator criteria now survive serialized requests.
- Prompt-operation requests validate bounded guidance and edits consistently. Completed-artwork enrichment carries its direction and selects the enrich writer; legacy rewrite requests still work.
- Restore requests select a saved version ID with full turn/swipe/revision/job identity. The backend resolves the image fields; caller-supplied image replacements are rejected.
- Restores start at generated, not browser_ready. Browser acknowledgement is the readiness authority.
- A restored job supersedes its own pending writes and image review; other jobs continue. Shared provider owners remain alive when another picture needs the same result. Queued batch writes are fenced against restoration changes, and readiness acknowledgements update the protected override.
- Optional previous-version history is validated, deduplicated and bounded at 50 retained versions/job; malformed neighbors do not reject primary story/jobs. The UI identifies the retention bound.
- Version thumbnails use DOM properties and the canonical image route, and capture selection identity for restore.
- Newly found defect: Previous Versions was created beside a detached element and never mounted. It is now explicitly appended to the Picture panel.

Evidence: new speaker/protocol tests failed then passed; restoration race failed with late-art overwriting saved-art then passed; shared dependent initially cancelled then passed; browser readiness initially reverted then passed. Offline browser regression fails against unchanged beta.109 for missing guidance and passes on this branch for held/completed enrichment, mounted history, safe thumbnail DOM and saved-version requests. Mobile 390x844 and desktop 1440x960 screenshots were captured; no page/console errors in that flow. First full packet run: 1,979 pass, zero fail (185 files); an acknowledgement-preservation change followed and is being reverified.

Independent review found four further issues; all have reproducing tests that failed before the fixes:

1. Startup could capture a pre-restore record. Batch ownership now registers before configuration awaits and reconciles saved state before scheduling.
2. A restored shared parent was rejected before provider dispatch, cancelling its dependents. Shared execution is now distinct from display ownership.
3. Cancelling a running shared dependent detached it without settling its promise. Cancellation now resolves detached dependents without stopping the parent.
4. Failed persistence still applied selection/cancellation. Restore now fences concurrent writes, commits first, and only then applies ownership/cancellation. A delayed-failure test additionally caught completed provider results being lost behind that fence; final batch persistence now waits/retries after the transaction settles.

The startup regression also exposed restoration of queued jobs failing the required startedAt contract; legacy archived timestamps provide the fallback when the current attempt has never started. Review-fix targeted run: 78 tests across scheduler/controller/history suites passed. After these fixes, installed-compiler typecheck, production build, bundle static/manifest verification, status-table generation and the focused real-browser regression passed again. No new live provider requests were used.

Final full isolated suite after all review fixes: **1,984 pass, zero fail, 10,578 assertions, 185 files**, exit 0. Verification command: `.cache/toolchain/node_modules/bun/bin/bun.exe test --isolate` (Bun 1.4.0). The original image-review suite's independent baseline failure remains the explicit exception below; the focused Artwork browser flow passes.

## Additional findings and decisions

- Existing `scripts/test-image-review-browser.ts` fails at line 16 (`pending-count launcher must not cover the error card`) on both unchanged beta.109 and this branch: at least one measured element has no bounding box. This is not counted as a passing browser suite. Carry into Task 3's fixture/stage investigation; do not weaken the overlap assertion to conceal it.
- The existing source HTML guard remains a documented single-line tripwire. This packet uses a real-browser malicious-thumbnail fixture instead of pretending a broader regex is a complete parser. A general syntax-aware source checker is still a future quality improvement.
- A shared image request already sent may still complete and be billed; restore does not claim cancellation avoids charges.
- No live/paid model or image calls or host/device acceptance. Task 1 initially finished without publication; the user subsequently authorized the beta.110 version bump and push.

## Beta.110 release checkpoint

Version synchronized to `0.2.0-beta.110` in all three version files. Fresh release checks: 1,984 tests pass, zero fail; installed compiler typecheck, production bundles, bundle verifier/status generation, diff whitespace check and focused offline Artwork browser flow pass. Publishing to `codex/audited-improvements`, based on the unchanged Main-3-GPT beta.109 remote head; no force push or Testing changes.

The checkpoint was committed and pushed successfully as `8981bd3ef6ae225f51cdca096c47595c78f44539` to `origin/codex/audited-improvements`. Remote SHA was verified after push. Main-3-GPT and Testing were not changed.

## Task 2: compact presentation implemented and locally verified

New version-2 presentation stores entity/fact dictionaries, baseline state, sparse coalesced changes and a dense beat index. The format stays compact through persistence and IPC; frontend/backend consumers select detached cursor snapshots. Version-1 records remain readable; known derived caches are rebuilt on writes and unknown future formats remain preserved. Full turn identity and reveal/source metadata are validated. A maximum 2,000,000 UTF-8 bytes / 10,000 covered paragraphs retains a valid prefix with explicit diagnostic reasons instead of rejecting the entire projection. Entity/fact enrichment caps also report warnings. Primary narrative/jobs remain separate.

Removed the 64-change and 256-paragraph wholesale drop. Repeated no-op changes are coalesced, item owner/condition updates remain reveal-scoped, and documents retain literal-text revalidation. Updated cast allocation/context, DNA harvesting, nameplates, folio, dossiers and storage cache invalidation. Dossier art no longer falls back to a later paragraph's ready image.

Independent review caught a performance regression in the first migration: recounting earlier mention links replayed every preceding state snapshot. Replaced that pass with an incremental prefix budget over reveal names, invalidated on context/preferences/overrides, capped at 24 links. Backward seeks preserve earlier counts and first-mentioned identities.

Verification after the review fix: **1,992 tests pass, zero fail, 10,631 assertions, 188 files**; installed-compiler typecheck, production bundles, bundle verifier/status generation and diff checks pass. New offline browser fixture passes at 390x844 and 1440x960: current state changes, fact reveal, backward reading, no future-art fetch and no page/console errors. No model/provider calls. The old projection tests now assert the same reader-visible facts via selectors; tests that deliberately expected the old 65-change/257-paragraph failure were replaced with successful-retention expectations. A folio test's synthetic legacy payload was given its missing version discriminator.

Measured synthetic ASCII fixture, six NPCs with six 40-character facts each:

| Paragraphs | Legacy full snapshots | Compact storage / wire representation |
|---|---:|---:|
| 60 | 969,137 bytes | 21,319 bytes |
| 100 | 1,615,217 bytes | 24,800 bytes |
| 300 | 4,845,817 bytes | 42,401 bytes |

Local timing example for 2,500 paragraphs / six NPCs / one outfit update per NPC per paragraph (1,348,888 compact bytes): the old prefix scan took 2,072.52 ms; current snapshot plus incremental prefix accounting took 22.17 ms; 100 cached prefix reads took 3.24 ms. These are local Bun observations, not device-performance guarantees. In three fresh processes for the 300-paragraph fixture, runtime-reported process peak RSS was 79,100-83,072 KiB for legacy and 65,548-66,312 KiB for compact. Process peaks include the runtime and loaded modules; they are not an isolated JavaScript heap measurement.

New regression files: `presentation-size.test.ts`, `presentation-selectors.test.ts`, `reference-link-budget.test.ts`; browser flow: `scripts/test-compact-presentation-browser.ts`. Scratch measurement sources/results are in ignored `.cache/implementation/`.

Additional existing baseline issue: `scripts/test-reader-reference-workspace-browser.ts:33` fails its 44px header-button assertion on both untouched beta.109 and the new source. Carry into the targeted accessibility/visual packet. Investigation of the older Artwork suite's line16 failure shows its selector targets hidden Reader-First navigation, while the current APERTURE shell exposes `Open Art Studio`; this needs a test-flow update, not a weakened overlap assertion.

Beta.111 release checkpoint: all three version files synchronized. Fresh verification: 1,992 tests pass / zero fail; installed-compiler typecheck, production build, bundle verifier/status generation, diff check, and offline mobile/desktop compact-presentation browser regression pass. Publishing the completed Task 2 to origin/codex/audited-improvements as requested; Main-3-GPT and Testing remain unchanged.

## Remaining roadmap

Tasks 3-11 have not been implemented. Next: shared image loading/cancellation and Artwork action consolidation. Selected suggestion features, including toggles 16 and 20, remain planned rather than shipped.
