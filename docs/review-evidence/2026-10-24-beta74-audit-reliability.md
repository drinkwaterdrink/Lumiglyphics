# Beta.74 verified audit reliability follow-up

Scope: Testing, based on beta.73. The older `arena/bcd536d4-lumiglyphics` branch was inspected, not merged wholesale. Main remains beta.61.

## Delivered

| Finding | Change | Regression evidence |
|---|---|---|
| F-01 | Release aborted asset controllers, review gates and preparation locks immediately; provider settlement no longer controls local busy state. Late results remain identity/turn guarded. | Hung-provider close/reopen/replan test fails on beta.73 and passes here. Existing generation-start and late-completion tests retained. |
| F-03 | A cancelled queue operation cannot satisfy an explicit new dedupe request. Old cleanup still checks promise identity before deleting a replacement. | Same-turn cancel/re-enqueue test fails before the fix. |
| F-07 | Cleanup performs a non-writing preflight, then reloads and mutates the latest selected turn under chat/record queues. Ownership and exact aborted turn remain required. | New competing queued-save regression fails against archived beta.73: old cleanup discards the update. It passes here, preserving correction IDs and error state. Existing close/reopen retry races pass unchanged. |
| F-04 | Genuine current-reply edits retire obsolete batches/planning/retry work. Fresh content, swipe, branch/parent metadata and epoch checks reject delayed events. Macro resolution determines real selection changes. | Stale same-ID events and old image results during replacement planning fail before the fix. Duplicate current notices keep a running or pending-start batch; macro selection/failure tests remain intact. |
| F-02 | Four-entry, two-million-character exact-plan-content LRU caches locally derived projections, including unavailable results. Job-only writes reuse derivation; plan edits invalidate it. | Same-key subject correction and in-place edit coverage. Saved projection identity is never trusted; the audit branch shortcut is deliberately excluded. No exact speedup claim. |
| F-06 | Cooperative hash/freshness deadlines, two concurrent optional record reads, and a guard before local schema validation of late records. Certificates and fail-closed ancestry remain unchanged. | Gated 16-source test confirms at most two reads start, no more start after timeout, and late raw records never enter local validation. Existing branch/edit/fingerprint/truncation tests pass. |

The full record is still durably saved at review/approval and terminal transitions. Character rules, prompt budgets, provider settings, image approval and source/reveal privacy are unchanged.

## Independent review

One fresh-context whole-change review found a pending-start duplicate gap: an identical edit after planning settled but before configuration returned could enqueue another planner call. The new gated handoff regression first observed two calls instead of one; the fix recognizes pending-start ownership and rechecks token/controller, accepted turn and epoch after asynchronous view preparation. Review closed with no remaining blockers. The reviewer inspected code and logs; final tests were run by the implementing agent.

## Final local verification

- Unit suite excluding separately exercised speech transport: **1,735 pass / 0 fail**, 8,467 assertions, 153 files (`.cache/beta74-unit-tests.log`).
- Speech transport: **18 pass / 0 fail**, 45 assertions, one file; established timer keepalive preload (`.cache/beta74-speech.log`). Combined: **1,753 tests**, 8,512 assertions.
- Full TypeScript and build-time TypeScript: passed. Backend/frontend bundles built.
- Bundle manifest/version/static-pattern verifier: passed; tracked `build-verification.json` regenerated for beta.74.
- Spindle bundle scanner: no common blocked patterns found.
- Chromium host lifecycle fixture: passed.
- Chromium image inspector fixture: passed, including drafts, rewrite/restore, focus and responsive bounds.
- Chromium retry queue fixture: passed, including multiple queued selections, bulk retry, completed-image regeneration, clear queue and no review requests.
- Whitespace/staged-path checks performed before release; attachment directories remain excluded.

Runtime: installed Bun **1.3.14**, below the declared >=1.4 target. These results do not certify Bun 1.4, a live Lumiverse session, physical Android/iOS, image quality, real provider request cancellation, or refunds. Host storage requests already started cannot be cancelled; the local deadline prevents additional optional reads and late local validation. Host JSON retrieval/deserialization itself is outside this guard.

## Deliberately remaining

- F-05: compact long-reply presentation with bounded transport, explicit degradation and paragraph-specific reveal safety. The existing 512,000-character cap remains; raising it alone is not a fix.
- F-08/F-09: profile full-record write cost and typewriter layout work before altering durability or text geometry.
- F-15: no demonstrated replacement-template overwrite on the reviewed action path; it operates only in review, where the draft key equals request ID. No speculative confirmation dialog added.
- No speculative paid pre-generation or experimental image hotspots/compositing in this release.

The larger cohesive-experience roadmap remains open; this is a reliability increment, not a claim that every audit idea or roadmap phase is delivered.
