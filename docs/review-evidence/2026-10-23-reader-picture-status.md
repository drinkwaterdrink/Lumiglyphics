# beta.63 — reader picture status

Testing-only continuation of the cohesive-experience plan; main remains beta.61.

## Delivered

- Reader image progress uses the inspector's state labels and summary, distinguishing held review, preparing, waiting for a slot, generation and explicit retry state.
- Held review and queued retries use a still icon. Active prompt preparation/provider generation use the busy indicator. No fabricated percentage or duration.
- Clicking reader picture progress opens the existing inspector without submitting work.
- Request-record changes refresh progress. Retry events require exact chat/message/source/swipe/revision ownership.
- Turn loading resets the stage store; progress is now restored after loading. The real-host fixture reproduced the missing initial badge before this correction.
- Returning to a different turn clears retained queue evidence. Cache-only display swaps stay excluded from generation totals.

## Verification

- Held-review regression observed failing before implementation.
- Host/state and reading-focused suites passed after changing count expectations to explicit preparation evidence.
- Full suite: 1691 passed, 0 failed, 8147 assertions across 144 files. Local Bun reports 1.3.14.
- New Chromium real-host suite: initial held-review badge survives load, no spinner for review, click opens inspector without paid messages, approval updates reader, queued retry replaces earlier failed status, stale revision cannot override current progress.
- Existing real-host lifecycle Chromium suite passed, including drafts/cursor preservation and stale source handling.
- TypeScript, production build, bundle verification and backend static capability scan checked before release.
- Screenshot: `.cache/browser-fixtures/reader-picture-status.png`.

## Limits

This increment projects retained backend request/asset/queue evidence. Local inspector-only rewriting/template operations are not yet mirrored into reader progress. Recovery error-card controls still need the broader overlay pass. Physical Android, live host/providers and image quality remain unverified. No paid model calls, dependency or storage-schema changes.
