# Previous-message image library — beta.23

## Delivered

The reader has an accessible picture-icon launcher below Image prompts. Its library is scoped to the current chat and opens without generation. Default browsing follows active message versions through the reading cursor. Explicit controls expose all story images, alternate versions, replaced pictures, newest/oldest order, picture roles and template-name matching.

Up to 24 lazy native thumbnails appear per page, grouped by source reply. Full-image viewing provides whole-picture fit, 1–4× zoom with scrolling, source excerpt and available read-only prompt/model/provider details. Missing images and missing request metadata are labelled. Prompt markup stays inert text. Clipboard failure offers text selection instead. Auto/skip pauses while browsing; close, source/revision/cursor changes, chat switches and teardown clear pending selections. Late responses must match both chat and request ID.

Normal and conditional turn saves capture completed image occurrences in an additive archive before overwriting a turn. Each turn retains at most 128 occurrences and approximately 480,000 serialized characters; reaching the limit marks history incomplete rather than evicting old entries. Unknown archive versions are preserved. Unreadable prior JSON cannot block a valid recovery save; historical gaps are marked. Gallery URLs, credentials, connection IDs, provider parameters and reference bytes are not archived. Host images are never deleted by library browsing.

Backend loads verify chat access, reading-source fingerprint and image ownership under the sender. Saved turn reads are bounded to 24 per page plus two anchor checks, and at most 24 image lookups use native small-thumbnail URLs. Messages/swipes/deletions and the anchor key are rechecked after asynchronous reads. Browsing writes no metadata and invokes no text/image model.

## Review and verification

- Archive/persistence tests initially failed before implementation. Coverage includes replan/replacement retention, prepared-versus-approved prompts, pagination, active/alternate versions, missing images, unsupported versions, role/template filtering and cursor bounds.
- Independent read-only review found corrupt-prior-record recovery, cached prompt misattribution and source-freshness gaps. Seven reproductions failed before correction, then passed after input sanitization, conservative cached-request attribution, first-archive attribution precedence and before/after source validation.
- Additional regressions reproduced unreadable JSON blocking recovery and failed-replacement fallback artwork disappearing from the default view; both passed after correction. Fallback art remains current while it is the displayed usable image.
- Controller integration verifies sender-scoped responses, cross-user denial, error request IDs and zero paid calls.
- Final focused library suite: 18 passed, 0 failed, 52 assertions.
- Full isolated unit suite: 1,411 passed, 0 failed, 6,600 assertions across 121 files. Separate speech transport suite: 18 passed, 0 failed, 45 assertions. Total: 1,429 tests, 6,645 assertions.
- TypeScript, production build, manifest/bundle verification, blocked-pattern scanner and whitespace checks passed.
- Chromium mobile library checks passed for native touch interactions, fit/zoom, inert prompt text, filters, page navigation, stale-response rejection, layout bounds and reset. The mobile screenshot was inspected. Existing mobile-reader and image-review browser fixtures passed.

## Rulings and limits

Ruling: deliver the useful saved-turn viewer as I1. The complete package-I checklist remains broader. Repeated image IDs can appear under each source reply; a global unique-image index retaining multiple source uses is deferred. Backfill reads recoverable saved turns, not an invented association between unrelated host-gallery images and messages. Native/card pictures and supplied portrait display overrides without stored jobs are not indexed. Missing legacy references cannot be reconstructed merely by installing this update. Host message navigation and historical regeneration are not offered.

The verified host API returns the chat message list and storage path list in full. Only saved turn bodies/image verification and IPC responses are page-bounded; this first version does not claim fully paginated host metadata traversal. Large-history indexing, richer provenance and deeper quota fixtures remain follow-ups. Unsupported archives remain intact and current recoverable pictures may still be viewed; omitted prompts are identified rather than guessed. Cached artwork does not borrow an old approved request merely because the job ID matches.

No paid generation, live Lumiverse installation or physical Android test was performed. Browser checks use controlled fixtures and the existing Node browser adapter. Installed Bun is 1.3.14 versus the project's declared >=1.4.0; speech timeout tests use the established test-only keepalive preload. No dependencies or permissions were added.
