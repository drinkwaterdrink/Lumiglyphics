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

Tasks 3-11 have not been implemented. Task 2A Cast/DNA repair is now complete locally. Next: shared image loading/cancellation and Artwork action consolidation. Selected suggestion features, including toggles 16 and 20, remain planned rather than shipped.


## Beta.111 published and urgent Cast/DNA findings

Published commit `6240bba01d97f4c5b9ca773365f29d954add0d24` to `origin/codex/audited-improvements`; remote head verified after push. Main-3-GPT remains `b0f5f5a`; primary Testing source untouched. Next authorized push requires beta.112 or next verified newer suffix.

The user subsequently requested a Cast/DNA audit and urgent roadmap addition. Completed independent tracing of frontend/host, IPC, backend harvesting/storage, source adapters and image-prompt compilation. Local repros confirm global character contamination (`boy` from Darby selected for Nadine), absent LLM calls/card/lore reads, duplicate ID/name keys, concurrent lost saves, and APERTURE action clipping/overlay. At 366x760 the synthetic hero shrinks to 30px and actions fail hit testing; 1440x960 actions are also covered. These are findings, not repaired behavior.

Audit: `docs/audits/2026-11-01-cast-dna-audit.md` (C01-C16, coverage, evidence, limitations). New priority plan: `docs/superpowers/plans/2026-11-01-cast-dna-repair.md` (A1-A6) inserted as Task 2A before original Task 3. User explicitly selected evidence plus generated suggestions, labeled and reviewed before saving. This includes source-specific availability, stable identity, lock/manual preservation, delete/undo/discovery suppression, and real provider-payload verification. Detailed repair remains planned; no Cast source changes or live provider calls in this audit.


## Task 2A: Cast/DNA repair implemented and verified locally

User approved the hybrid proposal design and explicitly required injection into pictured-character image prompts. Implemented stable-ID V2 storage, per-user/chat serialized revision checks, legacy/raw recovery backups, strict requests, explicit manual drafts/save, character-scoped LLM proposals, field review/provenance, mobile action repairs, delete/undo/merge and actual provider appearance integration. Full details and operating steps: `docs/implementation/2026-11-01-cast-dna-repair.md`.

Independent review found and prompted fixes for stale saves, duplicate Add replacement, proposal cancellation/swipe ownership, active-attire scope, combined hair/eye contradictions, focused-input stale closures, same-name merge tombstones, and save acknowledgements crossing swipes. Each substantive regression has local behavioral coverage. A final dispatch-boundary test additionally reproduced a text request starting after cancellation; an explicit signal check immediately before dispatch fixes it. No live model/image calls were made.

Final fresh isolated suite: **2,014 pass, zero fail, 10,701 assertions, 191 files**. Installed-compiler typecheck, production frontend/backend build, bundle static/manifest verification, status generation and whitespace check passed. Logs: `.cache/implementation/dna-release-final-tests.log`, with focused RED/GREEN logs beside it. Bun 1.4.0 remains isolated in `.cache/toolchain`.

Offline browser checks pass: new Cast/DNA flow at 360/366/390/412/1440 widths; actual host cancel/swipe/chat rejection and a save acknowledgement crossing a swipe; prior focused compact-presentation and Artwork contract regressions. No page/console errors in the focused DNA UI flow. The known original baseline browser exceptions remain explicitly recorded above and are not counted as passing suites.

Rulings: deleted records implement both suppression and undo instead of a second suppressed-ID list. The existing effective appearance map carries saved DNA into every existing compilation/cache path rather than relying on the unconnected optional DNA argument. Context respects the existing **activated lorebook** setting; installed Spindle types expose broader book enumeration, but this packet does not silently expand that source setting to inactive or unattached books. Unresolved ambiguity can be omitted from a proposal rather than turned into an invented field. Source settings/availability are disclosed and generated/inferred suggestions require user review.

The completed implementation was initially local at beta.111; the user subsequently authorized the beta.112 release checkpoint below. Commit `6240bba` contains prior Tasks 1-2. Primary Testing source is untouched. Actual Lumiverse installation, live model quality and physical Android acceptance remain **UNVERIFIED**. Original Tasks 3-11 remain queued.

Final host browser acceptance also checks invalid manual fields: malformed values are not sent, the validation error names the field, and the draft remains editable. Final fresh unit log records 2,014 pass / zero fail / 10,701 assertions.

## Beta.112 release checkpoint

User authorized publishing the completed Cast/DNA repair. All three version files are synchronized to beta.112. Fresh release checks passed against this exact checkpoint: 2,014 tests, zero failures, 10,700 assertions; installed-compiler typecheck, production build, bundle verification/status generation, diff check, five-width Cast/DNA browser flow and actual host lifecycle browser flow. Publishing to `origin/codex/audited-improvements`. Main-3-GPT and primary Testing remain unchanged. Live model/host/physical-device acceptance remains UNVERIFIED.


## Task3 locally completed

Shared candidate loading now supports aborts, ordered canonical/fallback references and explicit selected display art. Decode timers/listeners clean up on success, error and cancellation. Reader rejects stale completions and retains prior art on failure. Cast supports ID-only portraits, cancels superseded chains, retains prior in-scope art with an explicit replacement-failed caption, and shows an unavailable placeholder when no earlier image exists. Artwork preview uses the same loader.

Studio has one contextual footer image action; saved-scene retry and enrichment duplicates were removed, with quick/bulk and wording actions under Customize. In-flight enrichment cannot be submitted twice. Original review browser script now uses the visible APERTURE launcher and public tabs, retaining its behavioral assertions. Its complete suite passes; the earlier baseline hidden-nav exception is resolved for that suite.

Verification: 2020 tests pass, zero fail,10707assertions/191files; typecheck, production build, bundle verification/status generation and diff check pass. New390/1440 Reader/Cast/Artwork handoff plus original studio and Artwork contract browser flows pass. No paid/live calls or physical-device acceptance. Work is local and uncommitted, version112; Task4 has begun. Original Tasks4-11 remain pending.


## Tasks3-4 beta.113 checkpoint (2026-11-02)

Task4: System One now preflights every serialized UTF-8 body before dispatch, packs by the 65,536-byte and seven-paragraph limits, bounds concurrency to two, and uses one overall deadline including secret lookup. Valid sibling decisions survive failed batches. Dispatch attempts remain counted on failure; reported input/output tokens are tracked independently of answer validation. Coverage distinguishes submitted, skipped, truncated, failed and fully answered paragraphs; scene reuse requires complete usable coverage. A missing or malformed decision cannot silently disable story-reader fallback.

Custom display rules now execute on actual paragraph text in disposable workers, with a 1,000ms startup limit and 50ms execution limit. Input/output cap is100,000 characters; source cap20,000 characters/128rules. Replacement expansion is bounded while preserving native capture/named/prefix/suffix substitution. Stage cache is8entries/1MB. Superseded/disposed work is terminated; blocked workers retain original text with a nonblocking visible reason. Original story text remains unchanged. Runtime worker cancellation preempts obsolete paragraphs instead of queuing them (ruling: less stale work and still at most one owned worker).

Independent review found that pending evaluation could be marked typing-complete and skipped by two Continue presses. Browser RED reproduced index1 before any paragraph0 text displayed; pending evaluation now blocks that transition, and the GREEN test retains index0 until completion/fallback. Cache-hit, oversize and empty-cursor transitions also cancel irrelevant work.

Verification: **2,027 tests pass, zero fail, 10,715 assertions/192files**; full TypeScript checking passed. Offline runtime-browser checks at390/1440 validate a slow accepted regex is killed, expanding replacements stay bounded, native replacement semantics, stale work, delayed worker navigation and unavailable-worker fallback. Existing display-rule settings browser passes320/390/1280. Original full image-review browser, new Reader/Cast/Artwork handoff and Artwork contract browser checks pass. No live or paid calls. Actual Spindle CSP and physical-device acceptance remain UNVERIFIED; runtime fallback is explicit.

All three version files are synchronized to beta.113. Production bundles/static/manifest verification and status generation are rerun before the authorized push. Task3 and Task4 are complete for this checkpoint; Tasks5-11 remain queued. Main-3-GPT and primary Testing source remain unchanged.


## Task 5 — beta.114 checkpoint (2026-11-02)

Published prior checkpoint: beta.113, commit `6b99e2326a4826c2b0708f797ae6f35ce682ef76`, pushed and remote verified on `codex/audited-improvements`.

Settings home now groups the existing seven routes into Reading, Look & sound, Artwork, and Setup & advanced. Existing aliases, field ownership, deep links, Apply/reset and dirty-draft guards remain. Search indexes human labels, explicit keywords, explanatory copy and mapped page descriptions without indexing control values or secrets. Dedicated field descriptions do not leak into parent-group matches. Explicit setting keywords rank above broad page descriptions; cloned label text excludes help text. Browser tests caught and verified the fix for “cast appearance” incorrectly preferring the display toggle.

Resume is a dismissible card on a validated cold restore at a nonzero passage. It uses the exact saved turn/source/swipe and rejects positions from a future plan revision; asset-only revisions still restore. It quotes only the previous passage, capped at 240 plain-text characters, with location/speaker and Continue. No LLM recap or generation is triggered by the card. Autoplay/skip are disabled on restore. Same-turn updates do not reshow a dismissed card; reset, planning, errors and suspension clear it. No cross-turn history restoration is introduced, so the optional Back to latest action is not applicable. Null positions in authoritative state now clear a previous chat's saved cursor.

Artwork's Picture tab has a Why this picture disclosure backed by a versioned bounded asset DTO. It projects recorded cue kind/index, template/framing, allowlisted source labels, appearance source, manual selection, cache/provider path and review state. Raw narrative, appearance bodies, external context, arbitrary selection reasoning and provider errors are excluded. Missing reasons say Not recorded. Previous-image display is identified separately. Legacy records remain usable.

Verification includes full TypeScript checking, targeted backend projection/reading-position/search/resume/explanation unit tests, and local Chromium settings workspace/resilience, real host lifecycle, resume at 390/1440, and Reader/Cast/Artwork handoff. The existing resilience contrast test compared against native-host dark colors while the actual APERTURE panel had an opaque light backdrop; the identical failure was reproduced using published beta.113 settings sources. The test now measures the actual rendered panel backdrop and retains the 4.5:1 requirement. The host lifecycle test now clicks the visible APERTURE Back to Lumiverse chat control, preserving the existing close/suspension checks. Physical-device/live-host acceptance remains UNVERIFIED. No paid/live provider calls.

Final gate: **2,038 tests pass, zero fail, 10,750 assertions/194 files**. Full TypeScript check, production build, manifest/static verification, status generation and diff check pass. Final resume and host lifecycle browsers pass after cleanup changes. Next task: Task 6 prompt undo/redo, inline lint, image comparisons and golden serializer fixtures.
