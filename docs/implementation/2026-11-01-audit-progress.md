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

## Remaining roadmap

Tasks 2-11 have not been implemented. Next: compact presentation across storage/IPC/cursor consumers, fixing both size and state-change limits and future-art fallback. Selected suggestion features, including toggles 16 and 20, remain planned rather than shipped.
