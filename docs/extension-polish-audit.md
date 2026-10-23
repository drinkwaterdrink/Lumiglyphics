# Extension polish audit — 2026-10-23

Scope: follow-up to the beta.58 image pipeline audit, on Testing. This is a targeted cross-system review, not a claim that every path or host integration has been exhaustively verified.

## Implemented

| Finding | Evidence | Change |
|---|---|---|
| History template search can silently disappear | A response inside the 300ms debounce cancels the search timer; Chromium regression failed with empty query instead of Manga | Completing or failing a page request clears its request timeout without cancelling pending input. Closing, changing context and starting a new load still cancel obsolete work. |
| History refresh reconstructs cards it immediately discards | `load` calls `back(false)` while the old page is still populated, which calls `render` | Clear the old page before returning to browse mode. Avoids unnecessary DOM/image construction on refresh. |
| Archive accounting exceeds its own entry-array ceiling | Boundary regression produced 480001 characters against 480000 | Include commas and maintain an incremental serialized-length total. Serialize existing entries once per merge instead of once per candidate. Existing archives are preserved. This is a character ceiling, not a byte quota. |
| Browser verification is inconsistent across runners | Existing Bun History suite stalled without output; equivalent Node suite completed | Shared Node HTTP/Playwright fixture helper with bounded Bun bundle subprocess. Migrated History, host lifecycle and settings resilience scripts; added a dedicated History race command. No production framework replacement. |

## Areas inspected and retained

- **Generation:** beta.58 identity anchors, bounded repair, combined model budget, explicit retry queue and immutable approved requests remain the baseline. The complete regression suite was rerun; no paid provider calls were made.
- **Lifecycle:** host teardown explicitly unsubscribes listeners and destroys stage, review, library, audio and speech controllers. Browser checks exercised changed replies, stale chats, draft/cursor retention and closing. These do not certify Android process suspension.
- **Settings:** request-correlated acknowledgements and unapplied-draft protection already exist. Browser checks covered failed Apply, partial patches, pending-save guards, newer edits and section search. Preserve these contracts when decomposing the settings panel.
- **Presentation:** rich text escapes HTML text and text-effect expansion has per-span/per-call bounds. History writes saved prompts as text, uses lazy thumbnails, and verifies chat/request ownership. Existing mobile History tests passed portrait/landscape bounds and five theme presets.
- **Storage:** history keeps original prompt attribution, bounds page reads, filters alternate/deleted sources and treats missing images truthfully. The archive optimization preserves those behaviors.
- **Architecture:** current TypeScript modules and Shadow DOM do not require a framework migration to deliver the requested polish. The 2302-line settings panel is a concrete maintenance pressure point; split ownership by existing settings section while keeping one save coordinator. Migration to a new UI framework would add regression surface without an established user-facing benefit in this audit.

## Recommended next work, in order

1. **Display-regex resilience.** `parseCustomRegexRules` accepts user-provided JavaScript regular expressions. Invalid patterns are silently skipped and valid pathological patterns can stall synchronous execution. Add explicit validation feedback first, then evaluate isolated execution with a timeout and plain-text fallback. A heuristic cannot prove arbitrary regex safe; do not claim input-length caps solve backtracking.
2. **Unified operation status.** Consolidate preparation, prompt repair, image queue and rendering into consistent per-picture states with one clearly labelled primary action. Preserve the distinction between text-token operations and paid image requests. Do not add automatic spending.
3. **Settings ownership refactor.** Extract section controllers incrementally; retain central draft/acknowledgement logic and current setting IDs. Add a browser regression per extracted section, then simplify markup/styles. Avoid a single large rewrite.
4. **Performance measurements.** Capture reader-open, History-page, cast-scan and prompt-repair durations plus counts locally with opt-in diagnostics. Measure representative long chats before introducing indexing, concurrency or virtualization. The archive change reduces repeated work by inspection; no device speedup is claimed.
5. **Accessible overlay consistency.** Shared close/back/focus behavior and operation announcements across History, dossiers, documents and prompt review. Verify keyboard and screen reader behavior as well as touch sizes; passing bounds checks alone is insufficient.
6. **Continue scene/cast variants.** Add expression/outfit variants with visible provenance and explicit selection, following the existing roadmap. Keep current physical presence distinct from the full cast roster.
7. **Provider/device acceptance.** Real Android keyboard, rotation, interruption, long chats and representative provider routes remain the most important unverified acceptance work. Use opt-in same-scene comparisons for prompt quality; limits and documentation do not prove an artistic optimum.

## Verification

- 1683 unit tests passed, 0 failed, 8122 assertions across 143 files.
- TypeScript project check, production build, bundle verification and blocked-capability scan passed.
- Chromium History race test passed: successful response race, error race, close cancellation.
- Existing History browser suite passed: safe prompt text, filters, zoom, stale-page handling, mobile/landscape layout and themed return controls.
- Host lifecycle browser suite passed: stale chats/state attempts, revised presentation, cursor/draft retention, replacement acknowledgements and close suspension.
- Settings resilience browser suite passed: search, failed Apply, partial patches, pending guard and newer edits.
- Tested local Bun reports 1.3.14 despite package target 1.4; no separate 1.4 runtime verification claimed.
- Physical Android, live host/provider requests, screen-reader usability and artistic quality remain unverified.
