# Lumiglyphics audited improvements implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Subagent execution is an optional later user choice, not authorized by this plan alone.

**Goal:** Repair independently verified failures and implement the user's selected suggestions without spending surprises, lost story state or reveal leaks.

**Architecture:** Preserve Spindle worker/frontend IPC and strict validated story/job contracts. Introduce a compact reveal-aware presentation representation and shared pure selectors; route optional reading features through it. Land separate working packets rather than a cross-cutting rewrite.

**Tech stack:** TypeScript, Bun >=1.4.0, Zod, Spindle, existing DOM/theme stack and Playwright browser fixtures.

**Spec:** `docs/audits/2026-11-01-main-3-gpt-audit.md` (findings A01-A10 and selected-suggestion design decisions).

**Execution status:** Tasks 0 and 1 published as beta.110 (`8981bd3`) on `codex/audited-improvements`. Task 2 is published as beta.111 (`6240bba`). Task 2A is included in the beta.112 release checkpoint as the Cast/DNA repair in `2026-11-01-cast-dna-repair.md`; Tasks 3-4 are included in the beta.113 checkpoint; Task 5 is included in the beta.114 checkpoint; Task 6 is included in the beta.115 checkpoint; Task 7 is included in the beta.116 checkpoint; Task 8 is included in the beta.117 checkpoint with paragraph-only timing; Task 9 is included in the beta.118 checkpoint; Task 10 is included in the beta.119 checkpoint; Task 11 is underway: its UI/reference/JSON-repair checkpoint is beta.120 and its shared V2-builder/subject-policy checkpoint is beta.121 and its cursor/outfit-safe cast reuse checkpoint is beta.122 and its bounded portrait-transition checkpoint is beta.123 and its typewriter/theme-correction checkpoint is beta.124 and its reader/dossier integration checkpoint is beta.125; remaining structural steps and the final whole-branch review are pending. See `docs/implementation/2026-11-01-audit-progress.md` for evidence, additional bugs and known baseline browser failures.

## Global constraints

- Implement against Main-3-GPT commit `b0f5f5a594f4f6310a491b3452b388b91afdabfe` or an explicitly verified descendant; the current primary checkout is Testing beta.74. Do not apply this plan blindly to Testing.
- Every push increments the beta suffix in package.json, spindle.json and src/shared/build-info.ts. The first correctness packet was pushed as **0.2.0-beta.110**. Task 11F is the **0.2.0-beta.125** checkpoint; the following authorized push requires **0.2.0-beta.126**, subject to rechecking the remote. Never downgrade a newer release.
- Preserve source comments/docstrings, primary story/job validation, userId targeting/storage isolation, swipe/revision identity, intake epochs and view gating. A closed reader never starts automatic generation.
- No live/paid image calls in automated tests. New text/image calls need explicit workflow intent and accurate usage reporting. No filtering/softening creative themes or descriptions; lint only advises.
- Persisted optional caches/history may be ignored or rederived without blocking a valid story. Unknown future formats remain preserved and unavailable rather than overwritten.
- Keep the reader’s top-right Artwork shortcut visible on mobile as explicitly requested; larger touch targets must not relocate it into a menu.
- Use existing `base -> preset -> user` theme layering; respect reduced motion/effect intensity, focus, touch scrolling and mobile keyboard behavior.
- Suggestions 16 and 20 are toggleable and proposed default off. Keep current behavior as default for music and cast-presence policies.

## Review focus

1. A swipe/replan/restore while image or lint work is pending must reject stale completions (Tasks 1, 3, 6).
2. Long multilingual replies, 65+ changes, huge/corrupt optional history must preserve primary story and reveal boundaries (Tasks 1, 2, 4).
3. Backward history navigation must restore earlier facts/weather/cast/music without showing future art or firing historical SFX (Tasks 2, 7, 9).
4. A missing TTS timing API, denied worker creation or absent network API must produce truthful fallback behavior (Tasks 4, 8, 10).
5. On mobile with a soft keyboard, assistive technology or reduced motion, controls remain usable and never send a story action unexpectedly (Tasks 3, 5, 6, 8).

## Delivery approach

Work packets are release boundaries, not promised dates or arbitrary one-file-per-push mandates. Each task below follows: add the named failing behavioral regression; run it to establish failure; implement the described boundary; rerun the regression and relevant existing suites/browser fixtures; review explicit changed paths. Commit only when separately requested/authorized. Run the release gate before any authorized push.

Recommended sequence: 0 -> 1 -> 2 -> 2A (urgent Cast/DNA repair) -> 3 -> 4/5/6 -> 7 -> 8 -> 9 -> 10 -> 11. Tasks sharing `protocol.ts`, `config.ts`, studio or host state should be implemented sequentially to avoid contract drift. Each packet must remain installable with unsupported optional data safely unavailable.

## Task 0 — Establish the branch and reproducible verification

**Files:** package.json; bun.lock; scripts/verify-extension-build.ts; scripts/generate-status-table.ts; applicable repository guidance. No dependency upgrades assumed.

**Interfaces:** consumes verified Main-3-GPT source; produces a recorded baseline with exact Bun/TypeScript versions and command results.

- [ ] Inspect actual Git root/status/AGENTS guidance; reuse a suitable Main-3-GPT checkout or authorized isolated checkout. Preserve existing attachments and unrelated edits.
- [ ] Use Bun >=1.4.0 and frozen lockfile dependencies. Diagnose package bin linking rather than allowing npx to download an unrelated `tsc` package.
- [ ] Run `npx tsc --noEmit` and `bun test`; also use configured `bun run test` (`--isolate`) if necessary, documenting any runner difference/hang. Run a clean baseline build and bundle verifier.
- [ ] Record failures before product changes; do not carry the earlier Testing branch's pass count forward. This audit ran only the six targeted suites (39 cases), not the full baseline.

## Task 1 — Repair speaker, guidance and artwork-history contracts

**Modify:** src/backend/runtime/system-one.ts; src/protocol.ts; src/backend/runtime/controller.ts; src/backend/runtime/storage.ts; src/backend/runtime/image-review.ts; src/frontend/image-review/studio.ts; src/frontend/dom/innerhtml-guard.test.ts.
**Tests:** src/backend/runtime/system-one.test.ts; src/backend/runtime/enrich-and-versions.test.ts; new src/shared/image-version-history.test.ts; new src/protocol-image-operations.test.ts; existing image-review browser fixture/script.
**Create:** src/shared/image-version-history.ts for version schemas and bounded history helpers.

**Interfaces:** introduce strict restore request `{type:'vn_restore_previous_image', chatId, messageId, sourceFingerprint, swipeId, revision, jobId, versionId}`; backend resolves image ID/URL from saved history, never from caller-provided replacements. Add `promptOperation?: 'rewrite' | 'enrich'` and `guidance?: string` to the prepare contract, retaining an explicit legacy adapter for `regeneratePrompt`. Guidance maximum 400 characters, matching existing UI. Shared bounded history schema validates version identity, references, timestamp and optional prompt provenance. Proposed retained list limit: 50 versions/job, newest first for retention, with deterministic migration of legacy order and active image preserved; document retention in UI before pruning.

- [ ] Add outbound speaker-criteria regression: serialized options contain Narrator, Mira and unknown; response assignment respects thresholds and narrator semantics.
- [ ] Add held/completed-image enrichment regressions: the same optional direction and current edits reach the enrich writer, notices match the operation, no image generation occurs before approval. Validate guidance-bearing regeneration requests and reject malformed/oversized fields.
- [ ] Add restore regressions for nonexistent version, wrong user/chat/swipe/revision/job, closed/stale source, malformed history and completion arriving after restore. Require saved-list membership, no arbitrary URL injection, stable prompt/version provenance and no duplicate history entries.
- [ ] Introduce per-job operation ownership at the mutation/generation boundary: restore supersedes pending same-job writes; preserve unrelated jobs. A superseded review/generation completion cannot replace the selected restored version. Initial restored status is generated; browser acknowledgement alone marks browser_ready. Cover both restore and manual-replacement status paths.
- [ ] Build history thumbnails via DOM APIs. Add multiline/mixed trusted-untrusted HTML guard fixtures; prefer syntax-aware sink analysis over broader regex exemptions. Cover malicious quotes in stored URLs without executing injected markup.
- [ ] Implement bounded optional-history migration so corrupt history does not reject primary jobs/story. Run `bun test --isolate src/backend/runtime/system-one.test.ts src/backend/runtime/enrich-and-versions.test.ts src/protocol-image-operations.test.ts src/shared/image-version-history.test.ts` and existing studio browser checks.

**Done:** speaker options are usable; enrichment honors guidance in both states; restore selects only saved compatible versions, cannot be overwritten by stale work and reports browser readiness truthfully.

## Task 2 — Compact presentation through persistence, IPC and consumers

**Modify:** src/shared/presentation-entities.ts; src/backend/runtime/presentation-timeline.ts; src/backend/runtime/entity-projection.ts; src/backend/runtime/storage.ts; src/backend/runtime/controller.ts; src/protocol.ts; src/shared/cast-composition.ts; src/shared/dossiers.ts; src/frontend/stage/dossiers.ts; all remaining snapshot consumers found by `rg 'presentation|snapshots' src`.
**Create:** src/shared/presentation-selectors.ts and its test; src/backend/runtime/presentation-size.test.ts.
**Tests:** existing presentation/entity projection/storage/controller/cast/dossier/context suites and `scripts/test-reader-reference-workspace-browser.ts`.

**Interfaces:** add `ReaderPresentationV2` with `version:2`, `key:TurnKey`, `paragraphCount`, one entity dictionary, reveal-anchored facts, baseline states, sparse ordered changes, beat index and documents. Define `selectPresentationSnapshot(value: ReaderPresentationV1 | ReaderPresentationV2, paragraphIndex:number): PresentationSnapshot | undefined`. `ReaderPresentation` becomes the validated union during migration. Cursor selectors return detached, reveal-filtered values; never expose future facts through a reference to the dictionary. Exact numeric budgets come from valid TurnPlan maxima plus explicit compact-byte limits, measured before freezing the schema; no fixed 85% saving promise.

- [ ] Add regressions for 60 paragraphs/6 NPCs/6 facts, 64 versus 65 changes, 257+ paragraphs, simultaneous changes, new/future/private entities, backward seeks, source mismatch and unknown future versions. Assert semantic equality with old snapshots for supported fixtures and no wholesale loss of valid earlier observations at optional enrichment limits.
- [ ] Store each fact/state update once; deduplicate no-op changes and index by paragraph. Use periodic bounded checkpoints only if profiling justifies them. Keep compact data in storage and vn_turn IPC; do not expand the entire old representation on each frontend update.
- [ ] Replace direct `.snapshots[index]` consumers with the shared selector; keep a bounded per-turn cursor cache. Audit projections used by cast scan/character DNA/reference history and document reveal as well as the visible dossiers.
- [ ] Adapt v1 records without resetting primary data; rederive known derived caches when safe, preserve unknown versions untouched. Include identity/content changes that retain a key in cache invalidation.
- [ ] Replace all raw 512000 full-snapshot checks with compact-format validation/budgets. Return diagnostic reasons for capped optional enrichment. Remove the independent 64-change wholesale-drop behavior; distinguish CPU/byte bounds from story acceptance.
- [ ] Restrict dossier artwork to <= cursor and compatible entity/location. Add a fixture with only a future ready image and assert no image shown.
- [ ] Verify persisted bytes, IPC bytes, projection/seek latency and peak allocations for bounded stress fixtures; record measured results without invented thresholds. Run presentation/storage/controller/cast/dossier suites and reference browser tests.

**Done:** compact persisted and transported presentation remains available for stress fixtures; no future facts/art leak and no primary-state reset. This task is a coordinated contract migration, not just a storage rewrite.

## Task 2A — Priority Cast and Appearance DNA repair

User reported wrong auto-fill gender, missing controls and duplicate characters on mobile. Independent local reproductions confirmed character contamination, disconnected LLM/source collection, key mismatch duplicates, clipped/covered controls and concurrent lost saves. Host lifecycle and image-prompt integration also need repair.

**Audit/design:** `docs/audits/2026-11-01-cast-dna-audit.md`.
**Detailed repair plan:** `docs/superpowers/plans/2026-11-01-cast-dna-repair.md`.
**Selected direction:** evidence plus context-consistent generated suggestions, labeled and reviewed before saving. Preserve explicit source facts, age, manual edits and locks; scope every operation to its character/chat and revision.

- [x] A1: stable IDs, legacy migration, serialized storage and chat/request lifecycle.
- [x] A2: visible mobile actions, correct artwork scope and truthful editing UI.
- [x] A3: scenario/card, tracker, relevant lorebooks and supported codex evidence with source statuses and identity attribution.
- [x] A4: actual bounded text-model proposal, validated fields/provenance and stale-result protection.
- [x] A5: review/apply, delete/undo with rediscovery suppression, explicit duplicate merge.
- [x] A6: prove saved effective DNA in actual mocked provider payloads and cache identity; full release verification.

Task 2A is included in the beta.112 release checkpoint; prior beta.111 does not contain it. See `docs/implementation/2026-11-01-cast-dna-repair.md`. This packet precedes original Task 3; original selected suggestions remain in scope.

## Task 3 — Unify image loading and simplify Artwork actions

**Modify:** src/frontend/stage/cast-stage.ts; src/frontend/stage/image-loader.ts; src/frontend/image-review/studio.ts; src/frontend/host/controller.ts; src/frontend/stage/vn-stage.ts only where a reproduced failure requires it.
**Tests/create:** extend image-loader.test.ts; new scripts/test-reader-artwork-handoff-browser.ts with fixture; existing image inspector/review/recovery scripts.

**Interfaces:** reusable async candidate loader returns loaded URL or a terminal error; consumes `sceneImageCandidatesFor` while respecting explicit `stageAsset.displayImageUrl` selections. Caller owns a full-identity/epoch token and discards stale results.

- [x] Reproduce ID-only portrait, stale URL with valid ID, missing background, action/manga in cast mode, approval while Artwork is open, failed first/fallback URL, hung/rejected decode, hidden sheet, swipe, restore and disposal. Record which reported black-screen hypotheses reproduce before changing stage selection.
- [x] Route portrait loading through compatible ordered candidates; terminal unavailable state on every branch. Clear decode timers on every settle; preserve previous image on failure. Add cancellation to avoid stale candidates continuing after supersession.
- [x] Define one contextual primary image action and one secondary Customize area. Preserve distinct Prepare preview, Approve/generate, Regenerate picture, Rewrite wording, Enrich wording and Restore meanings. Remove duplicate retry/enrich controls; keep pending-operation/error state per selected request.
- [x] Verify mobile textarea caret, IME and soft keyboard across debounced updates, focus return, no surprise generation when closing a drawer, reduced motion and plain status labels. Run reader-artwork handoff and existing studio/image browser checks.

**Done:** the same usable image reference loads consistently in Reader/Cast/Artwork; failures are visible and actionable; one control per operation.

## Task 4 — Bound System One and display regex work

**Modify:** src/backend/runtime/system-one.ts; src/backend/runtime/planner.ts; src/shared/reply-usage.ts; src/shared/display-rules.ts; src/frontend/stage/rich-text.ts; src/frontend/stage/vn-stage.ts.
**Create:** src/frontend/stage/display-rule-executor.ts plus tests, or an equivalently isolated backend executor only after sandbox capability validation.

**Interfaces:** `SystemOneCoverage` adds submitted/answered/skipped/truncated paragraph data and failure reasons; usage counts requests when dispatched, including failed/partial batches. `evaluateDisplayRules(input:{text:string; rulesSource:string; generation:string}, signal:AbortSignal):Promise<{text:string; issues:DisplayRuleIssue[]; generation:string}>`. Proposed worker deadline 50 ms per evaluation, text input/output caps 100,000 characters and one active request plus latest queued generation; verify mobile behavior before freezing these defaults.

- [x] Add mocked System One tests for long CJK/emoji input, huge candidate descriptions, missing answers, one failed sibling batch, cancellation and deadline; assert byte cap before any dispatch, accurate attempts and safe story-reader fallback. Retain relevance ranking and explicit paragraph cap until a separate budget decision expands it.
- [x] Pack requests by actual serialized UTF-8 bytes, not seven paragraphs alone. Preflight all batches, bound concurrency (proposed max 2) and one overall planning deadline. Report omitted input; never silently switch off fallback protections.
- [x] Validate Worker creation and termination under Spindle CSP/scanner. If unsupported, retain known fast rules and disable runtime-unbounded custom-rule execution with a visible issue; do not claim a Promise.race interrupts synchronous regex.
- [x] Add worker termination regression with an accepted slow regex, output-expanding replacements, stale settings/turn result, unavailable worker and disposal. Use a killable worker so tests cannot hang the process.
- [x] Evaluate transformed display text once per turn/settings generation, cache bounded results, preserve original escaped rendering on failure and keep source text unchanged for planning/provenance. Run System One/planner/usage/display suites and `test:display-rules`.

**Done:** bounded work, honest partial coverage and useful fallback; no main-thread freeze or hidden additional calls.

## Task 5 — Settings navigation, resume card and picture explanations (2, 9)

**Modify:** src/frontend/settings/routes.ts; src/frontend/settings/panel.ts; src/frontend/host/reading-position.ts; src/frontend/host/controller.ts; src/frontend/stage/reader-workspace.ts; src/frontend/image-review/studio.ts; src/backend/runtime/controller.ts diagnostics; src/protocol.ts.
**Create:** src/frontend/stage/resume-card.ts and tests; settings search tests in the existing settings fixture.

**Interfaces:** search indexes human labels/descriptions/keywords plus SETTINGS_FIELD_PAGES, not just internal field names. Resume model includes exact turn identity, index, revealed excerpt and location/speaker. Picture explanation uses a bounded structured diagnostic DTO (cue/source/template/framing/cache/review reasons), never raw chain-of-thought/debug dumps.

- [x] Keep existing routes/aliases and field ownership; group settings home into Reading, Look & sound, Artwork, Setup & advanced. Preserve draft edits, Apply/reset, deep links and Cast management's Story ownership. Search opens the exact field with focus.
- [x] Resume card shows Continue, a previous revealed excerpt and optional Back to latest. No LLM recap. Suppress on routine same-turn asset updates. Stale source/swipe/revision and corrupt/out-of-range position never restore blindly; disable autoplay on resume.
- [x] Why this picture shows recorded structured reasons and human wording; missing reason says Not recorded. No inference from hidden story data, provider keys, raw external context or verbose logs.
- [x] Test saved position after edit/swipe, switching users/chats, empty/unavailable presentation, keyboard search/clear and mobile focus. Run settings resilience/workspace, reading-position and image inspector checks.

## Task 6 — Prompt editing and version comparison (10, 12, 13; recommended 14)

**Modify:** src/frontend/image-review/studio.ts; src/backend/runtime/prompt-lint.ts; existing prompt compiler tests.
**Create:** src/shared/prompt-lint.ts (pure implementation; backend compatibility export); src/frontend/image-review/prompt-history.ts; src/frontend/image-review/version-comparison.ts and tests; src/backend/runtime/prompt-serializers/golden.test.ts with fixture directory.

**Interfaces:** `PromptEditSnapshot = {prompt:string;negativePrompt:string;parametersText:string}`. Per full turn/job/request identity, proposed maximum 50 edit states, grouped by 500 ms typing/IME burst; undo/redo does not send backend messages. Lint consumes a pure serialized profile/cue/reference summary and returns field-addressable warnings. Comparison consumes two validated history entries and has no generate/restore side effects.

- [x] Add undo/redo tests for prompt/negative/invalid parameter text, IME composition, redo invalidation, server-prepared wording, rapid selection changes and stale rerender. Exclude live typed fields from heavy DOM rebuilds; expose keyboard and touch controls with focus-safe buttons.
- [x] Debounce inline lint (proposed 200 ms); show advisory warnings beside relevant fields. Do not silently change text, block themes or call a writer. Client/backend lint results agree; no backend imports in browser bundle.
- [x] Compare current and saved images with a labeled keyboard-operable range slider and side-by-side alternative. Unavailable versions show errors; selecting/dragging never restores. Restore is a separate action using Task 1's contract.
- [x] Recommended #14: enumerate the serializer registry's 11 dialect keys/10 functions; approved fixture snapshots cover solo, ensemble, environment, long prompts, negatives, references, framing and identity anchors. NovelAI alias behavior is intentional. Combine snapshots with semantic invariants; updating a golden file requires reviewing the actual wording diff, not blanket regeneration.
- [x] Run prompt history/comparison/lint/golden unit tests and image review mobile browser checks. No provider calls.

## Task 7 — Audio, weather and remembered cast (5, 6, 7)

**Modify:** src/config.ts; src/frontend/settings/routes.ts and audio/appearance controls; src/frontend/host/controller.ts; src/frontend/stage/audio-engine.ts; src/backend/runtime/planner-effects.ts; src/shared/cast-composition.ts; src/frontend/stage/cast-stage.ts; relevant protocol/config normalization.
**Create:** src/shared/scene-atmosphere.ts plus tests for policy selectors.

**Interfaces:** proposed `musicTransitionPolicy:'cue'|'location'` default cue; `castAbsenceDisplay:'hide'|'dim'` default hide. Presence model explicitly separates present speakers/drawable subjects from remembered off-scene portraits. Weather reads established scene environment and explicit effects, not fabricated place tags.

- [x] Location policy keeps current track within a location, crossfades on validated location change and permits explicit user track selection. Same-track transitions never restart playback; unknown location and backward seeks are deterministic. No new inference calls.
- [x] Smooth speech ducking as its own factor using the existing eased gain infrastructure, independent of presentation attenuation and track crossfade. Test rapid play/pause/end and avoid double attenuation or timer leaks.
- [x] Complete weather precedence/clearing: explicit ambient/manual rules win; no weather inferred from negated/hypothetical text. Location/interior transition clears stale particles; respects effect intensity and reduced motion. Test rain -> clear, outside -> inside, backward seek and explicit none.
- [x] Dim mode can show only previously revealed compatible portraits in a clearly labeled Off scene tray; two active portrait slots still prioritize present cast. Off-scene people never enter generation selection, current location membership or speaker attribution. Never borrow future/cross-scene art as though present.
- [x] Run audio/effect/cast/config tests and mobile stage fixture; verify transitions with screenshots/audio state mocks. Human listening/device results remain separate evidence.

## Task 8 — Truthful speech read-along (3) and optional timed effects refinement

**Modify:** src/frontend/speech/controller.ts; src/frontend/speech/transport.ts; src/frontend/host/controller.ts; src/frontend/stage/vn-stage.ts; rich-text/entity-anchor rendering integration.
**Create:** src/frontend/speech/read-along.ts and tests. A new host timing contract is conditional on actual platform support, not assumed available.

**Interfaces:** progress events bind full speech cursor identity and audio playback time; timing capability is `none | sentence | word`. Existing buffered-Blob transports expose none. New `alignment` data is validated only if the host actually returns it. No synthesized fake provider capability.

- [x] First expose speaking-paragraph highlighting and playback progress with pause/resume/end clearing. Show sentence or word tracking only when reliable alignment exists; label approximate sentence mode if separately provided. Selection 3 stays planned even though exact word support has a platform dependency.
- [x] Capability spike: inspect actual host TTS response/tool contract offline or using already-authorized non-synthesis metadata. If no alignment exists, document paragraph-only delivery and the exact missing host capability; do not add forced-alignment services/model calls without separate approval.
- [x] Test paragraph/cursor/chat change, hidden tab, seek/pause/restart, stale response, reduced motion, mixed narration, punctuation, CJK/RTL and combining characters. Preserve text selection, tooltips and document anchors; screen readers should not announce every highlight tick.
- [x] Sentence-level SFX/one-shot effects are a later optional refinement from the audits: share reveal/playback clock, do not replay on seeks, discard stale cues, and keep legacy paragraph scheduling if timing absent. No new cue-schema output/cost until its benefit and supported timing are verified.
- [x] Run speech controller/transport/host-stage browser fixtures with fake audio only.

## Task 9 — Scene scrubber and optional relationship/presence history (15, 16)

**Modify:** src/frontend/stage/vn-stage.ts history surface; src/frontend/host/controller.ts; src/frontend/stage/dossiers.ts; src/config.ts; src/frontend/settings/routes.ts; storage/protocol only for optional bounded derived indexes.
**Create:** src/shared/scene-history.ts; src/shared/relationship-observations.ts; src/frontend/stage/scene-scrubber.ts; src/frontend/stage/relationship-tracker.ts and tests.

**Interfaces:** scene events contain source TurnKey, paragraph index, revealed location/cast-change labels and event kind. Relationship observations contain subject, explicitly stated relationship text, evidence source/reveal anchor and provenance; no inferred numerical affection/trust scores. Proposed `relationshipTrackerEnabled:boolean` default false.

- [x] Derive scene/cast markers from compact changes and full source identity. Jump through existing history loading/cursor paths, not arbitrary asset/state mutation. Virtualize/paginate long history; keep old/alternate branches visibly distinct and restore history position without auto-generation.
- [x] Toggle relationship tracking on/off through normalized config. Off stops relationship-index building, shows no tracker UI and initiates no extra model calls; normal story reference/presence infrastructure continues. Re-enabling rebuilds bounded indexes from validated revealed evidence.
- [x] Display presence/location history separately from explicit relationship statements. Outfit/expression frequency is never represented as relationship strength. Missing evidence reads Unknown/Not established; no canon writes. Persist only an optional versioned derived cache with known invalidation keys.
- [x] Test branch edit, no location, rapid cast changes, offscreen speaker, unavailable projection, disabled tracker, future/private facts, bounded old-record reads and backward seeks. Run history/dossier/browser tests.

## Task 10 — Image activity ledger and toggleable data saver (11, 20)

**Modify:** src/config.ts; src/frontend/settings/routes.ts; src/backend/core/asset-scheduler.ts; src/backend/runtime/images.ts; src/backend/runtime/image-review.ts; src/backend/runtime/controller.ts; src/shared/reply-usage.ts; src/protocol.ts; frontend Artwork/status surfaces.
**Create:** src/shared/image-usage.ts; src/backend/runtime/image-usage.ts; src/shared/generation-policy.ts and tests.

**Interfaces:** `dataSaverMode:boolean` default false, per-user config consistent with existing preferences. `automaticGenerationAllowed({viewOpen,generateImages,dataSaverMode}):boolean`. Activity events use full turn/job/request/attempt IDs and classify provider-start/success/failure/cancel-unknown, held/skip, cache reuse and restore; deduplicate on stable IDs. Session means current loaded extension session unless a separately labeled persisted per-chat total is added.

- [x] Count provider attempts at dispatch, not UI clicks. Retries add attempts, held requests do not imply billed images, cache hits/restores are zero new generation, unknown completion/billing remains unknown. Do not infer dollars from counts; show money only with verified provider usage/pricing, otherwise Price unavailable.
- [x] Place the data-saver gate immediately before automatic provider dispatch, not just intake. Cover reopen, retry queues, cache misses, bootstrap and transitions from held to approved. Preserve stored artwork, prompt previews and budgets; cache reuse remains available.
- [x] Enabling pauses unsent automatic image starts and speculative asset prefetch. Already-sent calls may finish/bill; report that truthfully. Explicit manual generation remains allowed via existing approval flow, with visible data-saver status. Turning off resumes only still-current eligible work through the scheduler, never discarded/stale jobs.
- [x] Test toggle mid-queue/in-flight, closed reader, chat/user switch, explicit approval, retry, failed/late completion and unavailable navigator.connection API. No reliance on metered-network detection; no service worker/offline promises.
- [x] Run scheduler/controller/review/usage/config suites and mocked image retry browser harness.

## Task 11 — Targeted decomposition and visual consistency

**Modify/extract:** src/frontend/stage/vn-stage.ts -> typewriter-controller.ts and scene-layer-renderer.ts at proven seams; src/backend/runtime/planner.ts -> planner/json-repair.ts then prompt-builder.ts if justified; src/backend/runtime/controller.ts -> controller/review-rpc-handlers.ts; src/frontend/settings/panel.ts -> focused route renderers. These are proposed new paths, not claims they exist.

**Interfaces:** preserve existing public stage/controller/planner behavior. Extraction inputs explicitly carry identity/cancellation/state rather than accessing newly created global singletons. Shared cast/shot subject selection lives in a pure shared module, never importing frontend rendering into backend.

- [x] Profile changed paths before extraction. Do not split aperture-theme.ts (already split), move scene-boundary logic into a second reducer, or delete legacy Inlay helpers still imported by V2.
- [x] Deduplicate near-identical V2 request-building blocks behind one request builder; retain v1/v2 gates and golden/parity coverage. Unify shot/cast subject decisions, not pixel portrait layout with camera geometry. Test no-people, solo, ensemble and manga modes.
- [x] Audit ready portrait reuse: same source/scene, matching attire, equal or earlier passage only; skip reloading the unchanged preferred ready reference. Replace incompatible art with a neutral loading/unavailable state. Fix cast restore control hit testing under the reader header and retain 44px targets. Verified in beta.122.
- [x] Reuse compatible complete expression portraits only when available; crossfade existing art without implying a flattened image contains separable eyes/mouth. Any new expression/layer generation is deferred, explicit opt-in and budgeted, not a free default feature. Verified beta.123: extracted whole-portrait renderer uses a bounded 180ms dissolve, abort/reduced-motion/effects-off cleanup, and immediate fallback for unsupported animation APIs; no new generation.
- [ ] Render theme gallery/mobile fixtures before changing shell colors or motion. Fix an initial shell flash only if reproduced. Preserve existing document materials and reveal gating; verify contrast, focus, scroll, high zoom, reduced motion and keyboard rather than replacing already-working CSS curves.
- [x] Extract typewriter DOM/cursor/remainder/pacing work into `typewriter-controller.ts`, preserving exported attributes, comments and public stage behavior. Stage retains timers, hidden-tab checks, audio eligibility, source lifecycle and completion callbacks. Verified beta.124 with direct step tests and real text-effects/line-wrap/Unicode browser coverage.
- [x] Migrate legacy reading/dossier browser fixtures to current visible Auto, World Lens, category chips and workspace routes. Preserve draft/keyboard/touch/source/alias/disabled/read-only checks; fix observed undersized sheet actions, double text scaling and reference workspace/focus leaks. Verified in beta.125.
- [ ] Verify behavior after each seam extraction. Tests may be updated for moved imports; behavioral expectations may not be weakened to hide regressions. Avoid forcing a separate push/version bump for every moved file.

## Release gate for each authorized delivery

1. Review explicit paths/diff; no scratch clone/evidence files, credentials or generated artifacts unintentionally staged. Record target branch and base SHA.
2. Run `npx tsc --noEmit`, `bun test` and configured isolated suite as applicable; run affected browser scripts and meaningful failure/race regressions. No live paid calls.
3. Bundle both entries with the handoff's Bun.build command (backend target bun, frontend target browser) or the repository build script if equivalent; confirm both results.
4. Run `bun run ./scripts/verify-extension-build.ts` and `bun run ./scripts/generate-status-table.ts`. Review generated evidence diffs; don't claim browser/device/host acceptance from structural checks.
5. Before an authorized push, synchronize all three version files to the next verified beta and rerun bundle/version verification. Stage explicit files only. No automatic merge/deploy/push from this plan.

## Explanations and exclusions for review

**14: golden-prompt tests** are saved expected prompt outputs. They catch an accidental missing character, changed tag order, lost outfit or budget-fitting regression without buying images. Recommended in Task 6 as test infrastructure; not a new screen or runtime feature. Current registry is 11 dialect keys, not a verified 12 independent serializers.

**18: scene hotspots** would place clickable markers over objects such as a desk or lantern, opening an editable examination/action draft. A click would not send a message. Reliable pixel placement is a separate problem: planner coordinates can be wrong, generated art may omit/move the object, and cover-cropping moves markers. Requires geometry-aware projection and source/reveal checks or user-authored marker positions, plus keyboard/list alternatives. Planner-authored markers add output tokens. Explanation only; no implementation task until selected.

**Not selected:** number shortcuts (#1), per-speaker blips (#4), mobile gestures (#8), Moments (#17), Prompt Recipes (#19). Full offline PWA, invented relationship scoring and automatic extra expression generation are also excluded. Exact word alignment is a clearly recorded dependency within selected #3, not silently promised.

## Planning validation

Selected scope mapped: 2/9 -> Task 5; 3 -> Task 8; 5/6/7 -> Task 7; 10/12/13 -> Task 6; 11/20 -> Task 10; 15/16 -> Task 9. 14/18 explanations supplied. A01/A03/A04/A06 -> Task 1; A02/A05 -> Task 2; A07/A10 loading/UX -> Task 3; A08/A09 -> Task 4; structural/visual refinements -> Task 11. Both requested toggles have defaults, persistence and disabled-mode behavior. Execution has begun; consult the execution-status paragraph and progress document before resuming work.
