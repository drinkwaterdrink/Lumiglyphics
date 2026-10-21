# beta.56 — shared-budget base cast artwork allocation

Branch: Testing. Base: beta.55 (`33bebf7`).

## Delivered increment

Cast view remains off by default. On newly prepared eligible portrait scenes, allocation considers a no-people Environment background plus portraits of up to two subjects already selected by existing picture cues. At each cue, the existing cursor-scoped presentation projection must identify that exact character as present and a usable appearance must resolve. A speaker name alone never qualifies.

The allocator does not expand the roster, add a story-model request, invent an appearance, or change prose/continuity. Uncertain presence, missing enabled environment templates, manually selected/corrected artwork, and mixed action/manga/ensemble compositions retain their previous flow. Existing saved turns do not automatically regenerate on update or on toggling Cast view.

All new art shares the existing per-reply budget. Priority is explicit manual choices, then each eligible scene's background and selected portraits. A new background can consume a one-picture allowance; there is no separate portrait allowance. Already compatible saved place/cast variants and exact verified temporary-cache hits cost no new slot. Persistent reuse settings and reference-capture requirements remain authoritative. Source metadata on existing portrait cues is preserved so layout annotations do not invalidate compatible saved artwork.

Candidate expansion enters the existing asset pipeline before scheduling. Same-paragraph background/portrait jobs have distinct identities, separate reviews and ordinary recovery/retry controls. Overflow remains bounded reuse-only cue data; it does not create paid requests. Zero retains its existing unlimited-budget meaning, while cast selection stays limited to two base subjects per scene.

## UI and failure polish

- Cast view settings explain allocation, opt-in behavior, the shared allowance and composition fallbacks.
- Picture selector and inspector identify Background and Portrait artwork, including a portrait subject name in the selector.
- A successful background can no longer hide a failed portrait at the same paragraph. Error selection stays cursor-bounded and never reveals a future failure.
- Existing rectangular portrait layout, speaker emphasis, hide/restore, delayed decode protection and theme tokens are retained.

## Verification

- Added red tests before implementing cast candidates and the same-paragraph failure fix.
- Candidate tests cover immutable input, bounded selected cast, no subject data in synthetic backgrounds, missing enabled environment, manual/action/ensemble/manga fallbacks, off-screen/absent subjects and budget limits of one/two/three.
- Controller fixture generates one background and one portrait on the same paragraph, keeps both separately gated under normal review, and confirms one planning text call with no allocation text call.
- Integration tests verify an environment saved before cast allocation can be reused for free, a weather mismatch requires a fresh budgeted background, and an exact temporary-cache background hit frees the allowance for a portrait.
- Full suite: 1,662 pass, 0 fail, 8,044 assertions across 142 files.
- Full TypeScript check, production build, manifest verification and backend blocked-pattern scan passed.
- Chromium cast checks passed across ten existing themes, overlay/image-first layouts and phone/landscape/desktop sizes; checks include two portraits, speaker highlighting, backward navigation, hidden future artwork, touch-sized dismissal and stale decode cleanup.
- Inspector and retry-queue browser regressions passed, including distinct same-paragraph Background/Portrait labels and existing prompt-edit/review behavior.
- Browser plugin unavailable; used existing Playwright fixtures with Node and Bun bundling. The cast runner was adapted to this same established workflow. An initial Node source-module resolution error was a test-runner issue, corrected before successful checks.
- Inspected `.cache/cast/390.png` for mobile layout and dialogue clearance.

No paid provider calls, real host installation/update or physical Android acceptance were performed. Source presence is the existing validated plan/projection contract, not a claim that every model correctly infers physical presence. Expression/outfit variant management, broader supplied-art allocation, richer placement and wider cross-reply presence reconciliation remain unfinished.
