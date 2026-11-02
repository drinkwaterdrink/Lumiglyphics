# Cast and Appearance DNA repair implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Tasks are sequential; no implementation delegation is authorized by this plan alone.

**Goal:** Make Cast editing and character-scoped evidence plus generated DNA suggestions reliable, reviewable and actually connected to image prompts.

**Architecture:** Stable per-chat identity and serialized revisioned storage underpin a scoped evidence collector and validated LLM proposal service. Frontend drafts and proposal review are separate from saved effective DNA. One appearance resolver feeds actual provider requests and previews.

**Tech stack:** Existing TypeScript, Bun 1.4.0, Zod, Spindle APIs, DOM/APERTURE, Playwright. Reuse configured story-reader text connection, not a separate mandatory provider.

**Spec:** `docs/audits/2026-11-01-cast-dna-audit.md`, especially Proposed interaction contract. User selected evidence plus generated suggestions reviewed before saving. User approved implementation on 2026-11-01. The core repair is implemented locally; final verification and concrete workflow details are recorded in `docs/implementation/2026-11-01-cast-dna-repair.md`.

## Priority and boundaries

This is **Task 2A** in the existing improvements roadmap, immediately after published beta.111 and before original Task 3. Complete the correctness foundation before adding generation. Original Tasks 3-11 remain queued.

- Work only in the Main-3-GPT-based isolated checkout on codex/audited-improvements. Primary Testing and Main-3-GPT are unchanged.
- Next authorized push must use beta.112 or the next verified newer suffix, synchronized in all three version files. No automatic push from this document.
- No paid/live model or image calls in automated tests. Auto-fill requires an explicit action; browsing Cast never starts generation. Real model acceptance is a separately reported manual check.
- Preserve comments, creative content, explicit age/identity, primary story contracts, source settings, full turn identities, epochs and userId scoping.
- Generated suggestions remain local proposals until explicit apply. Error, cancellation, invalid output or stale context cannot replace good edits.

## Review focus

1. Multi-character pronouns, nicknames, punctuation and non-Latin names must not contaminate another character (A3/A4).
2. Switch chat, swipe, delete or manually edit while a proposal is pending: discard stale completion and never resurrect deleted identities (A1/A4/A5).
3. Concurrent saves and malformed legacy neighbors cannot silently erase another profile (A1).
4. Disabled or unavailable lore/codex and unclassified/hidden facts must not become fabricated observed evidence (A3).
5. Phone keyboard, reduced motion, clipboard failure and overflowing portrait media must preserve accessible actions and draft selection (A2/A5).

## A1 — Stable identity, safe persistence and scoped lifecycle

**Files:** shared/character-dna.ts; new backend/runtime/character-dna-store.ts; existing character-dna-harvester.ts; protocol.ts; backend/runtime/controller.ts; frontend/host/controller.ts; stage/character-folio.ts; matching test files.

**Interfaces:** `DnaScope={userId:string,chatId:string}`; library V2 `{version:2,revision:number,characters:Record<id,CharacterDNA>,suppressedIds:string[]}`; `mutateCharacterDnaLibrary(spindle,scope,expectedRevision,mutation)`. Preserve legacy raw backup before first successful migration; source identity mappings and aliases resolve to stable IDs, never name-as-storage-key alone.

- [x] Add regressions: discovered Nadine + saved same ID remains one; canonical/alias selection finds the same object; concurrent Nadine/Darby saves both survive; stale revision returns conflict; malformed neighbor does not erase valid record; failed migration write retains legacy input.
- [x] Run the targeted tests and observe the current duplicate/lost-write failures.
- [x] Implement bounded V1->V2 entry migration and per-user/chat queue. Serialize mutation+revision check+write; report unsupported/corrupt data instead of saving an empty replacement over it. Do not guess-merge surname-only identities.
- [x] Add strict discriminated DNA request schema: list/save/scan/propose/apply/delete/restore/merge; nonempty bounded chat/request/character IDs; revisions and field paths checked. No caller JSON merged with overrideLocked=true.
- [x] Scope Folio state to active chat, request IDs and epoch; replace authoritative saved snapshots rather than shallow merging different key spaces. Keep detected suggestions/drafts separate. Clear on chat switch/fork and reject stale responses/errors without changing selection.
- [x] Run storage/controller/protocol/Folio and host-lifecycle tests; expected green. Record exact commands and outcomes before A2.

## A2 — Repair visible controls and truthful editing UI

**Files:** stage/character-folio.ts; theme/aperture/lens-folio.ts; theme/aperture/sheets-stage-palettes.ts; new scripts/character-dna-browser-fixture.ts and scripts/test-character-dna-browser.ts; Folio tests.

**Interfaces:** selected-character toolbar separate from dedicated portrait media; draft callback includes `{chatId,characterId,revision}`. No model/persistence calls from render.

- [x] Add real browser assertions at 360/366/390/412/1440 widths: Auto-Fill All, Lock DNA, Copy Prompt are visible and hit-testable; controls >=44px; selected name readable; no horizontal overflow. Reproduce current clipping/overlay failure before changes.
- [x] Restrict full-bleed image/pseudo-element styling to dedicated artwork. Make card/action flex sizing explicit. Actions remain outside clipping and reachable while scrolling/soft keyboard is open.
- [x] Associate input labels, name field-action icons, preserve focus/IME while updating previews, await clipboard and show success only after fulfilment. Add clipboard rejection test.
- [x] Remove global whole-turn regex save paths from single/all-field buttons. Wire scan/proposal intent with explicit field mask. Locked auto-fill is unavailable with explanation; manual unlock remains explicit.
- [x] Replace unconditional Active in Flux & Recraft claim with truthful saved/draft status until A6 integration proves actual prompt use.
- [x] Rerun browser and Folio regressions; save mobile/desktop screenshots; require zero page/console errors in this flow.

## A3 — Character-specific evidence collection

**Files:** new backend/runtime/character-dna-context.ts and .test.ts; existing context.ts, context-providers/index.ts, simtracker.ts, character-dna-harvester.ts as needed; shared/character-dna.ts.

**Interfaces:** `collectCharacterDnaEvidence(spindle,{scope,characterId,turnKey,paragraphIndex,signal}) -> {target,contextRevision,evidence,sourceStatuses}`. Evidence includes source/ref/field/value, target identity and visibility; statuses distinguish available/no-match/disabled/unavailable/truncated. Capture messages and turn once per operation.

- [x] Add failing fixtures for Nadine she/mid forties versus Darby boy; pronoun-only following sentences; aliases; regex punctuation and Unicode; multiple named subjects; contradictory facts; structured age/gender fields; current outfit versus default; source failures and late reads.
- [x] Read enabled card/scenario through existing visual-context APIs, relevant activated lorebook entries, configured tracker, cursor-valid story dossiers and enabled supported Codex provider. Use bounded per-character evidence with source labels. Do not claim to search all inactive lorebooks using the activated-entry API; add attached-book lookup only if the local SDK exposes it and source settings permit it.
- [x] Preserve provider visibility/noInject and reader reveal rules. Unclassified Codex references remain author/reference evidence, never observed history. Respect disabled sources; never report absent data merely because reading failed.
- [x] Use safe literal matching and stable alias resolution. Deterministic extraction only consumes target-scoped facts. Keep unresolved attribution/conflicts explicit; LLM receives enough surrounding context to resolve pronouns without using another person's traits.
- [x] Test source spies and exact source/status results; expected green without live requests.

## A4 — Bounded LLM proposal and field provenance

**Files:** new backend/runtime/character-dna-autofill.ts and .test.ts; shared/character-dna.ts; controller.ts; protocol.ts; reuse connection resolver/generation patterns from prompt-rewrite.ts.

**Interfaces:** `DnaProposal={id,scope,characterId,baseRevision,contextRevision,fieldMask,changes}`; each change has path/current/value/classification/sourceRefs and optional conflict. `proposeCharacterDna(...,signal)` returns proposal without save; `applyCharacterDnaProposal` rechecks identity/revision/locks/allowed paths inside A1 queue. Store only selected values and provenance; unknown is not an empty-string overwrite.

- [x] Add red tests: actual configured text call occurs once on intent; per-field sparkle cannot change neighbors; no connection reports actionable error; malformed/oversized output and invented source refs rejected; lock/manual edit preserved; timeout/cancel/chat switch/delete prevents apply; a repair request cannot loop.
- [x] Build bounded structured prompts from target evidence, current values and requested field mask. Prefer locally validated JSON regardless of provider schema enforcement; at most one format-repair attempt. Follow existing text connection timeout/abort/userId patterns. Do not reuse image generation.
- [x] Normalize generated vocabulary woman/man while preserving nonbinary/custom identities and age separately. Never replace sourced explicit age with a guessed default. Pronouns support target-specific inference; conflicts remain reviewable. Unsupported detail is Generated, not Evidence.
- [x] Validate maximum field lengths/counts from DNA schemas, target ownership, paths, duplicate changes, provenance refs and classifications. Preserve existing manual values as default-unselected replacements. No external source mutation or automatic retries after cancellation.
- [x] Mock generation and test every branch; assert no image calls and no save before Apply. Record RED/GREEN results.

## A5 — Review, deletion/undo and duplicate merge

**Files:** character-folio.ts; host/controller.ts; protocol.ts; backend DNA store/controller; new/reused browser fixtures and unit tests.

**Interfaces:** draft/proposal UI states idle/scanning/generating/reviewing/applying/error; scoped delete undo token and suppression; merge preview identifies retained ID and selected field conflicts. A1 queue is the only saved-library writer.

- [x] Add failing browser/controller tests: review current->suggested with evidence labels; apply selected fields; cancel preserves draft; retry preserves edits; pending result for other chat/selection cannot change active field; error announced accessibly.
- [x] Add Delete character in More, with explicit chat/profile scope; remove only this chat's DNA identity and suppress immediate turn rediscovery. Undo restores it. Test next sync and stale in-flight save do not recreate it; story text, external sources and gallery images remain intact.
- [x] Offer Merge duplicate with explicit canonical ID, alias union and field-conflict preview. Exact ID duplicates migrate automatically; uncertain name similarity is a suggestion only. Test same-surname distinct characters remain separate.
- [x] Add per-field review labels, source excerpts/status summary, protected manual/lock semantics and one Apply action. Cancel/failure never persists partially. Test keyboard/focus, soft keyboard viewport and no-surprise generation.
- [x] Run A1-A5 suites and real browser flows green before A6.

## A6 — Effective DNA in actual provider prompts

**Files:** runtime/images.ts, visual-brief.ts, cast-allocation.ts, presentation-rules.ts, controller.ts and relevant request/cache code; shared appearance contracts; generation tests.

**Interfaces:** resolve one immutable effective appearance snapshot per request, including DNA library revision, target ID, explicit picture overrides and current outfit. Use the same snapshot for preview, payload and cache identity; locked saved DNA precedence must be explicit and testable. Do not mutate queued good jobs when a later profile save arrives.

- [x] Add failing end-to-end mock tests: save Nadine's selected DNA -> prepare image -> exact provider payload contains her appearance; field not applied does not appear; Darby's traits never appear; current attire replaces default; explicit picture overrides follow documented precedence; ensemble members receive their own DNA.
- [x] Thread effective appearance through ordinary template/provider compilation, manual preview/review/retry and cast fingerprinting. Avoid reading the library for every field/image substep; freeze a scoped snapshot when intent is accepted.
- [x] Include DNA revision/effective appearance in cache identity so an edited profile cannot reuse obsolete prompt output. Test queued previous revision remains coherent and new intent uses new revision.
- [x] Make Live/Saved preview claim match the actual effective appearance and display precedence/conflict explanations where useful.
- [x] Full isolated unit suite, installed TypeScript compiler, production build, bundle verification/status generation, offline DNA browser regressions and diff check. Report host/physical-device and live-model acceptance separately as UNVERIFIED if unavailable. Update ledger and retain original Tasks 3-11.

## Completion contract

The packet is complete only when Nadine's multi-character she/mid-forties example is correctly attributed; generated fields are labeled and reviewable; visible actions work on mobile; duplicate/delete/undo and cross-chat races pass; and an actual mocked provider payload proves saved DNA use. A green helper-only unit test does not establish this contract.


## Execution outcome

Implemented and locally verified on 2026-11-01. See `docs/implementation/2026-11-01-cast-dna-repair.md` and the parent audit progress record for exact tests, review fixes, source-scope rulings and unverified live/device acceptance. The user subsequently authorized the beta.112 release checkpoint. Original Tasks 3-11 remain pending.
