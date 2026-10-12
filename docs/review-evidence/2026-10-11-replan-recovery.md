# Beta.8 explicit replan and diagnostic recovery — 2026-10-11

Scope: the next A recovery increment. C–G entity/timeline/dossier/rule/interaction work remains pending.

Delivered:

- Strict, versioned current-reply replan request validated against authenticated user scope, chat, message, swipe, fingerprint, request ID, open view and generation epoch. Preparation is serialized with picture corrections. Fresh source is checked again after planning/metadata awaits. Duplicate recent request IDs are stored with bounded history.
- Replan calls the story reader; every new image request is held for approval even with review off. The per-reply forced-review flag survives storage, same-source planning and explicit retry. Normal generation on other replies retains its existing review setting.
- Exact semantic cache matches are verified against host image existence and reused. Matching prose/person prior art remains a previous-picture fallback when compatibility cannot be verified; it is not claimed as current new art. Unrelated characters cannot substitute. Approved request history for retained job IDs stays inspectable. Existing budget, providers, templates and settings are reused.
- Picture diagnostics projects existing cue/plan metadata rather than introducing another identity resolver. Missing subject, missing appearance, no-people, generation failure and unavailable legacy metadata are distinct. Copy contains bounded names/status/template/tracker/planner information, with no chat, appearance body, prompts, reference bytes or raw provider error payload.
- Replan and diagnostics live in expandable groups within the existing mobile Image prompts panel. Pending recovery disables competing preparation controls; clipboard failure leaves selectable diagnostics.

Validation:

- New diagnostic and replan tests failed before implementation.
- Final full isolated unit suite: 1283 passing, 0 failing, 104 files. Separate speech transport suite: 18 passing, 0 failing. Total: 1301 tests.
- Strict TypeScript, production build and manifest/static bundle verification pass.
- Browser workflows pass: mobile image reviewer (scoped replan action, disabled pending action, diagnostic text/copy boundaries, fixed footer and no horizontal overflow), template settings and shared styles. Inspected the 390x844 reviewer screenshot.
- Controller regressions cover stale swipe, duplicate submission, zero new paid image calls before approval with review off, prior-art fallback, forced review after close/reopen/retry, invalidation during new generation, source edits without host events, and reopened exact verified cache reuse.
- Fresh independent read-only review found missing ownership after closing/reopening. Fixed by claiming only a fully validated stored key while rejecting different active keys and running generations; regression added. Reviewer confirmed fix and reported no further critical finding. Reviewer did not run tests independently.

Limits: installed Bun 1.3.14 is below the declared >=1.4.0 engine. Tests/build passed using it; transport uses a keepalive preload and browser checks use the existing Node adapter. No live Lumiverse or paid-provider tests were performed. An empty/unverifiable cache after restart requires held replacement previews; matching prior art can remain as fallback. Legacy Try again can still replan when no usable plan/appearance exists; explicit Replan provides the controlled review-first route.

Next: package C typed entity and timed presentation foundation, then configurable built-in NPC/location/object dossiers, persistent cast/location staging, rules and interaction drafts. The complete roadmap is not claimed finished.
