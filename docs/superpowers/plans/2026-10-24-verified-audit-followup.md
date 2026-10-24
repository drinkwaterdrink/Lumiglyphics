# Verified audit follow-up on Testing

Apply independent audit findings selectively; preserve beta.73, source ownership, character identity, optional-cache degradation and durable review gates. Do not merge the older audit branch wholesale.

## Current increment

- [x] F-01/F-03: release aborted asset owners immediately and let an explicit retry replace cancelled queue entries.
- [x] F-07: mutate cancellation under the chat and record write queues, against the latest saved state.
- [x] F-04: stop obsolete image batches only after checking fresh latest-message content/swipe/branch.
- [x] F-02: reuse locally derived projections by actual inputs, never saved turn key alone. Test same-key and in-place edits.
- [x] F-06: cooperative hash deadlines, at most two optional record reads, skip validation after deadline; preserve ancestry checks.
- [x] Run regressions, full local checks and one independent whole-change review; publish Testing only.

## Subsequent increments

- [x] F-05: compact bounded reference presentation without weakening reveal-time privacy; surface degraded optional references.
- [x] F-08/F-09: measure full-record persistence and typewriter layout cost before changing durability/geometry.

## Rulings

F-15 is not a demonstrated overwrite defect: the action only operates in review, where its draft key is the request ID. Preserve draft behavior. Live provider abort behavior and physical mobile acceptance remain unverified. Optional history timeouts cannot cancel a host storage request already started. Speculative paid generation stays deferred.

## Implementation decisions

- F-02 uses a four-entry, two-million-character LRU over exact serialized plan inputs and derived projections. Saved projections are never trusted for reuse; same-key replacements and in-place edits invalidate the cache. Oversized plans are computed without admission. Unknown future saved formats remain preserved.
- F-07 performs a non-writing preflight read outside queues, then reloads and mutates inside the existing chat/turn queues. Ownership is checked within the queued mutation and again after asynchronous asset view preparation. Slow preflight reads do not block reopened retries.
- F-04 resolves macros before classifying changes, rechecks current host content/swipe/branch/parent and intake epoch, and suppresses only work already owned by a matching live batch. Genuine selected-scene changes still replan.
- F-06 keeps SHA-256 ancestry certificates unchanged, rechecks the fresh prefix chain, caps in-flight optional reads at two and skips local record schema validation after deadline. Host JSON retrieval already started cannot be cancelled.
- This maintenance increment does not claim to solve F-05, prove live-provider abort behavior, increase prompt quality, or complete the larger cohesive-experience roadmap.

## Verification and review

Final local verification: 1,735 unit tests plus 18 separate speech tests pass; typecheck/build/bundle verification/scanner pass; Chromium host lifecycle, image inspector and retry queue fixtures pass. The fresh reviewer found a pending-start duplicate planning race; its new regression failed with two calls and now passes with one planner and one image call. Follow-up review found no remaining blockers. See [release evidence](../../review-evidence/2026-10-24-beta74-audit-reliability.md) for runtime/device limitations and remaining scope.
