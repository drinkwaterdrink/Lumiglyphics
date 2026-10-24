# beta.72 — consistent reader activity and preparation acknowledgements

Testing only; main remains beta.61.

## Reader polish

The inspector now publishes a small local operation snapshot for prompt preparation, rewriting and template changes. Reader progress uses that snapshot alongside backend asset/review/retry state. Snapshots match chat, message, source fingerprint, swipe, revision and latest request ID before they affect a picture. A rewrite or template change has its own label rather than being reported as provider image generation or an actionable held review.

Closing the inspector keeps background activity visible; reopening keeps the current draft. New previews, error recovery and source changes clear the local activity. Old template/rewrite request IDs are retired on request replacement. Repeated renders do not publish identical snapshots, and keystrokes do not start extra host/model requests. The launcher count now reflects latest per-picture review states that are actually awaiting review, excluding local work and submitted requests.

## Timing correction

Previously, any rebroadcast of an already-failed/cancelled asset could clear a new `preparing` state. Each preparation now records the starting request/status/failure ID. The same old failure cannot acknowledge a new operation. A replacement request, changed terminal status/failure ID, removed picture, operation error or scope reset can clear it. No automatic retry, image generation, storage migration or change to provider budgets was added.

## Verification

- Observed local-progress unit regression and stale-failure browser race fail before their fixes; observed the old launcher count include rewriting work before correcting it.
- Full unit suite: 1717 passed across 151 files; separate speech transport: 18 passed with the existing test-only keepalive. Total: 1735 tests, zero failures, 8444 assertions. Local Bun reports 1.3.14; the declared >=1.4 runtime was not separately exercised.
- Chromium suites passed: reader picture status, image inspector, host lifecycle, image workflow, model prompts and image retry queue.
- Browser checks cover close/reopen, retained edits after rewrite failure, template/new-preview acknowledgement, stale failure rebroadcasts, preparation errors, chat switches reusing the same job ID, and 320/390/1280px bounds. Explicit overlap checks keep the progress badge clear of Image prompts. Inspected 320px and 390px screenshots.
- Both TypeScript projects, production builds, manifest/bundle verification and local backend static-pattern scans passed. Local scanners do not certify a live host install-time scan.
- No live provider calls or physical Android verification. Remaining recovery controls and broader mobile/overlay acceptance stay open in the roadmap.
