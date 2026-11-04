# Lumiglyphics phase-plan delivery inventory

Scope: Main-3-GPT beta.109 through beta.127, on `codex/audited-improvements`.
The two supplied audits were checked against source before adopting changes. This inventory records implemented work, not every suggestion made by either model. The detailed chronological evidence is in [audit progress](2026-11-01-audit-progress.md); Cast/DNA has its own [operating handoff](2026-11-01-cast-dna-repair.md).

## Phase 0 — Reproducible baseline

- Verified branch/repository boundaries and used the isolated Main-3-GPT checkout; preserved primary Testing source.
- Established Bun1.4, frozen dependencies, full isolated tests, installed TypeScript compiler and backend/frontend build verification.
- Recorded actual baseline failures instead of treating inherited handoff claims as current evidence.
- Synchronized the three version files for each authorized push; generated build hashes/status evidence and verified published branch tips.

## Phase 1 — Speaker, prompt guidance and artwork-history correctness (beta.110)

- Restored named-character and Narrator speaker criteria in serialized System One requests.
- Validated guidance and prompt edits; made enrichment work for held and completed artwork using the correct writer.
- Restricted restore to an existing saved version with matching user/chat/message/swipe/source/revision/job ownership.
- Prevented late same-job generation/review/batch writes from replacing a restored image; retained unrelated/shared jobs.
- Made restoration transactional: failed/delayed writes do not change selection or discard completed provider results.
- Kept restored images at generated until the browser confirms loading.
- Validated/deduplicated optional image history, retained up to50 versions per job and preserved valid neighbors of corrupt entries.
- Mounted the previously detached Previous Versions UI; built thumbnails with safe DOM properties and canonical image URLs.

## Phase 2 — Compact, reveal-safe presentation (beta.111)

- Replaced repeated full state snapshots with entity/fact dictionaries, baseline states, sparse changes and a beat index.
- Kept compact data through storage and frontend/backend messaging; added shared detached cursor selectors.
- Retained legacy-v1 compatibility and preserved unknown versions without destructive migration.
- Removed wholesale loss at65 changes/257 paragraphs; kept bounded valid prefixes with explicit limit diagnostics.
- Updated cast, DNA, nameplates, folio, dossiers, documents, context and cache invalidation consumers.
- Restricted dossier artwork/facts to revealed passages and validated source identity.
- Replaced repeated prefix replay for reference links with bounded incremental accounting.
- Measured synthetic storage/wire sizes: the60-paragraph fixture fell from969,137 to21,319 bytes; the300-paragraph fixture from4,845,817 to42,401 bytes. These are fixture measurements, not device guarantees.

## Priority Phase 2A — Cast and Appearance DNA repair (beta.112, final hardening beta.126)

- Made Auto-Fill All, per-field suggestions, Lock/Unlock DNA, Copy Prompt, Save and Delete reachable independently of portrait layout.
- Added context-aware LLM proposals from enabled card/scenario, story/pronouns, SimTracker, activated lorebooks, revealed story references and supported enabled external Codex providers.
- Disclosed disabled/unavailable/unmatched/truncated sources; bounded evidence and generation waits with cancellation and one format-repair attempt.
- Labeled Evidence/Inferred/Generated suggestions; showed current-versus-proposed values and required explicit selected-field application.
- Preserved locks, manual edits and existing values; normalized generated gender wording to woman/man while keeping explicit age and custom identities separate.
- Added stable character IDs, aliases, duplicate Add protection, merge previews, Delete, suppression of immediate rediscovery and Undo.
- Added per-user/chat serialized revision checks, legacy recovery backups and protection against stale saves/proposals/acknowledgements.
- Saved physical DNA reaches actual image compilation, preview and cache identity for pictured characters, including named ensembles; unrelated/no-person images do not receive those profiles.
- Current scene attire replaces signature clothing; explicit picture-level corrections retain precedence.
- Final review fix: evidence uses validated canonical paragraphs through the revealed cursor, not raw blank lines; stale source/swipe/revision records are excluded. Rewinding invalidates a pending proposal's context.

## Phase 3 — Consistent image loading and Artwork actions (beta.113)

- Shared ordered/cancellable canonical and fallback image loading across Reader, Cast and Artwork.
- Added cleanup of decode timers/listeners and rejection of superseded completions.
- Supported ID-only portraits and explicit selected display art.
- Preserved only compatible earlier art on replacement failure, with a truthful error; otherwise showed a neutral unavailable state.
- Consolidated duplicate generation/enrichment actions into one contextual footer action and organized secondary actions under Customize.
- Prevented duplicate in-flight enrichment and migrated obsolete browser navigation to visible public controls.

## Phase 4 — Bounded System One and display rules (beta.113)

- Preflighted serialized UTF-8 request sizes, limited batch sizes/concurrency and enforced an overall deadline.
- Retained valid sibling answers when another batch fails; reported submitted/answered/skipped/truncated/failed coverage truthfully.
- Counted dispatched requests and reported tokens independently of valid answer parsing; kept fallback available for incomplete coverage.
- Moved custom display regex execution off the UI thread into disposable workers with startup/execution deadlines and input/output/source/rule limits.
- Cancelled obsolete work, bounded expansion/cache sizes and retained original story text with a visible reason if workers cannot run.
- Fixed Continue skipping a paragraph while its display-rule evaluation was still pending.

## Phase 5 — Settings, resume and picture explanations (beta.114)

- Grouped settings into Reading, Look & sound, Artwork, and Setup & advanced while preserving aliases/deep links/draft guards.
- Added ranked search across human labels, descriptions and keywords without indexing secrets or input values.
- Added a dismissible exact-position resume card using a previously revealed excerpt, speaker/location and Continue; no generated recap.
- Prevented stale/future-revision cursor restoration and accidental autoplay/skip after resume.
- Added Why this picture? with recorded template/framing/source/cache/review explanations and explicit Not recorded fallbacks.
- Excluded private reasoning, raw context bodies and unrestricted diagnostics from that explanation surface.

## Phase 6 — Prompt editing, comparison and golden tests (beta.115)

- Added scoped bounded undo/redo for positive, negative and verbatim parameter JSON, including keyboard/touch controls, typing groups and IME composition.
- Preserved oversized current drafts and isolated histories across jobs/requests/swipes/source/revisions.
- Added shared debounced advisory prompt lint and parameter validation without rewriting creative content.
- Added accessible image comparison with a keyboard wipe slider and side-by-side mode; comparing sends no generation request.
- Added44 exact golden outputs across11 dialect keys, plus semantic identity/outfit/negative/reference/framing/budget checks. Registry checks reflect10 implementations with the intentional NovelAI/Anima alias.

## Phase 7 — Music, weather and remembered cast (beta.116)

- Added selectable cue-driven or location-based BGM policy, retaining cue-driven defaults and avoiding identical-track restarts.
- Added a soundtrack picker using already-revealed tracks and source-scoped manual selection.
- Smoothed speech ducking independently of scene attenuation/crossfade and cleaned up gain timers.
- Derived weather from recorded environment; explicit effects/none win, and clear/indoor transitions remove stale weather.
- Honored negated/hypothetical/ended weather and outdoor exceptions without another classifier call.
- Honored reduced motion and Effects off without discarding established atmosphere metadata.
- Added optional dimmed Off scene portraits using earlier compatible same-scene art; kept them out of active presence and generation selection.
- Bounded remembered-cast layout and isolated tray gestures from reader navigation.

## Phase 8 — Truthful speech read-along (beta.117)

- Added paragraph-level speech highlighting and actual media-time progress.
- Preserved text/selection/Unicode rendering and accurately handled unknown duration.
- Scoped synthesis/playback to the correct paragraph/reply/swipe and rejected stale results/play attempts.
- Fixed hidden-tab loading hangs, old audio continuing during explicit replay, and progress appearing when duration is unknown.
- Verified pause/resume/seek/end and explicit resume after visibility changes using mocked audio.
- Exact word/sentence alignment and sentence-timed effects remain deferred because the installed transport supplies no alignment timestamps.

## Phase 9 — Scene history and optional relationship/presence observations (beta.118)

- Added reveal-safe scene/presence markers, paginated History and a preview-then-seek passage slider.
- Bounded scrubber/history controls and retained keyboard focus through pagination.
- Added a persisted relationship-tracker toggle, default off, with disabled mode avoiding derived observation work.
- Displayed literal sourced relationship statements, negations and separately labeled earlier quotations; kept presence/location separate.
- Added no invented affection/trust scores, canon writes or extra model calls.
- Fixed unread speaker leaks, reused paragraph-ID read state, backward/forward reread behavior, edit invalidation and mobile History overflow.

## Phase 10 — Image activity and toggleable data saver (beta.119)

- Added data saver, default off, pausing unsent automatic image calls at the final dispatch boundary.
- Retained explicit manual approval/retry, cache reuse and existing in-flight calls; stopped stale/closed work from resuming.
- Added a bounded user/chat/session image activity ledger using actual SDK dispatches, with results, failures, held/skipped work, cache/shared reuse, restores and late completions.
- Added exact-request Generate this waiting picture and bulk retry handling without duplicate starts or applying unrelated drafts.
- Applied saver/approval rules to external image previews as well as the reader.
- Removed invented dollar estimates; unknown provider pricing is shown as unavailable.
- Kept wait time out of provider timing and made cancellation/billing uncertainty explicit.

## Phase 11 — UI polish, focused decomposition and final review (beta.120-beta.126)

- Raised reader/reference/sheet action targets to44px; fixed offscreen/duplicate arrows, progress overlap and scaled-layout failures.
- Restored and retained the top-right mobile Artwork shortcut with direct opening and focus return.
- Improved World Lens character/place/item navigation, observed-reference access and Back/Close focus ownership.
- Extracted focused JSON repair, V2 request building, shared subject policy, whole-portrait transitions, typewriter DOM logic, review RPC dispatch and Advanced settings markup; retained lifecycle/source/cancellation ownership.
- Fixed JSON comment removal corrupting literal quoted creative text.
- Fixed solo/ensemble classification when appearance text contains colons, page-template allocation and effective-style cache identity.
- Restricted portrait reuse by source/scene/outfit/reveal position; prevented future expressions and incompatible attire from flashing while loading.
- Added bounded complete-portrait crossfades with reduced-motion/effects-off/abort cleanup and immediate unsupported-animation fallback.
- Fixed reduced-motion rainbow text flattening and paper-theme text contrast.
- Fixed double reader font/line-height scaling, inline-reference workspace/focus leaks and World Lens return-state loss.
- Updated obsolete reading/dossier/settings/model-prompt browser fixtures while retaining behavioral assertions and external-request isolation.
- Made reply options scroll inside available phone/landscape/desktop space; kept full choices and Send reachable, preserved drafts, isolated wheel/touch gestures and made portraits yield while replying.
- Verified opaque AA title/hint contrast across10 themes and high-scale landscape behavior.
- Completed one fresh whole-branch review and fixed both confirmed findings: canonical DNA reveal boundaries and version-specific artwork provenance.
- Restores now recover their own subject/template/prompt/negative/fingerprint metadata, including active-batch reconciliation; legacy versions without trustworthy metadata remain visible with restoration disabled and explained.

## Post-plan follow-up — Reader artwork reveal race (beta.127)

- Removed the host's fallback to the earliest ready image regardless of cursor, which could show an unread scene when opening a reply.
- Cancelled pending scene decoding before Previous and History seeks, preventing a late completion from resurrecting unread artwork or sending a ready acknowledgement.
- Retained intentional holding of a previously revealed background while waiting for a different reply's first eligible picture.
- Added a real-host phone/desktop regression covering opening, forward reveal, rewind, delayed replacement, both seek routes and previous-reply holding. No live generation is involved.

## Selected-suggestion mapping

| Original suggestion | Delivered result |
|---|---|
|2|Exact-position resume card|
|3|Paragraph read-along and real audio progress; exact alignment deferred|
|5|Optional location BGM policy and revealed soundtrack selection|
|6|Recorded-weather particles and indoor/clear cleanup|
|7|Optional remembered Off scene cast display|
|9|Why this picture? recorded explanations|
|10|Wipe/side-by-side image comparison|
|11|Actual image request/activity ledger, unknown prices explicit|
|12|Advisory inline prompt lint|
|13|Scoped prompt undo/redo|
|14|Explained and implemented as golden-test infrastructure|
|15|Reveal-safe History scene scrubber|
|16|Toggleable relationship/presence observations, default off|
|18|Explained only; image hotspots were not selected for implementation|
|20|Toggleable data saver, default off|

## Remaining boundaries

- The code is on `codex/audited-improvements`; no merge into Main-3-GPT or installed deployment is implied.
- Installed Lumiverse/Spindle CSP and worker behavior, physical Android keyboard/touch/audio, and live model/image/TTS quality/billing remain unverified. Local browser fixtures are not physical-device evidence.
- Exact word/sentence speech timing depends on a real alignment contract. No fake timing was implemented.
- General syntax-aware HTML sink analysis remains an infrastructure follow-up; current source/static checks and malicious-thumbnail regressions remain active.
- Legacy images without recorded trustworthy provenance cannot safely gain restored metadata retroactively.
- Suggestions1/4/8/17/19, scene hotspots, offline PWA, invented relationship scores and automatic paid expression/layer generation were not included.
- Further splitting of tightly coupled planner/scene lifecycle code was not pursued solely to reduce file size.
