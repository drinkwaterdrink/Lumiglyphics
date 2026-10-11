# Lumiglyphics implementation status

Implemented locally as `0.1.0-beta.1` on `codex/image-review`, based on the pinned Cue 1.7.0-beta import (`a04f73b`). Origin points to the requested Lumiglyphics repository. Nothing has been pushed or published.

## Delivered

- Existing picture, prompt, model and connection settings are preserved; review defaults on.
- Native VN overlay inspector shows positive/negative prompts, provider/model, safe parameter overrides, reference summaries and bounded request history.
- Generate, Skip, Reset edits and Copy prompt work per picture. Local edits survive host updates.
- Targeted replacement supports generated, failed, cancelled and cache-reused pictures. Failed replacements retain previous usable art; generation-disabled replacements reject before mutation.
- Review gates are scoped to user/chat/source/request. Duplicate approvals cannot dispatch twice; closing/changing the turn cancels held requests. A final profile lookup cannot dispatch after cancellation.
- Manual requests remain independent despite identical prompts and bypass automatic cache lookup/storage. Automatic reuse retains upstream behavior.
- Reopen/restart recovery cancels orphaned waiting records and permits an explicit fresh preparation.
- Separate manifest, action, settings and frontend cleanup identities; upstream attribution preserved.

## Decisions and limits

The user authorized beginning local implementation after a final design pass. The executing plan proceeded inline without another approval round.

Review mode is captured at batch start. Toggling applies to the next batch and does not interrupt an automatic batch underway or release existing drafts. This deliberately replaces the initial proposal's dynamic mid-batch timing: already registered scheduler dependencies and cache claims must stay consistent with per-picture approval. Both toggle descriptions and the README explain the timing. Targeted replacements always require review.

Preparation is bounded by configured concurrency and existing portrait dependencies. Later drafts may appear after an earlier portrait finishes; unseen requests are never approved together. History is limited to 32 records / 512,000 serialized characters and prioritizes waiting drafts. Oversize review requests fail before dispatch.

`prepared` and `approved` describe the extension request lifecycle, not provider dispatch or success. Credentials, reference-image bytes and oversize parameters are omitted; omitted nested fields survive edited JSON overrides. Existing host connections handle providers. A model-specific visual parameter editor, prompt-format conversion, gallery and camera changes remain future work.

No live Lumiverse installation, install-time host scanner, NanoGPT or OpenRouter calls were tested. The local build/static checks do not certify runtime compatibility. Already dispatched provider work may continue after closing, as in upstream; later work and stale results are blocked.

Upstream includes no LICENSE file in the reviewed revision. Attribution is retained; no new licensing rights are asserted. Resolve upstream reuse terms before publishing/distribution.

## Verification

Using isolated Bun 1.4.0; the global Bun installation was not changed. Frozen install with lifecycle scripts disabled passed; dependency versions remain pinned.

- Full suite: **1,214 pass, 0 fail**, 5,800 assertions across 92 files.
- Full TypeScript check and production build: passed.
- Chromium image-review fixture: passed; includes draft preservation, toggle, exact edits, duplicate click guard, malformed-edit Skip, cursor selection, missing history, replacement action, safe text and mobile/desktop layout.
- Existing settings fixture: passed, including review checkbox persistence and no external network requests.
- Existing reading fixture: passed (keyboard/focus, touch targets, history, draft retention, custom CSS, scaling and reduced motion).
- Manifest entry/version and local backend pattern checks: passed. Scanner reference: https://docs.lumiverse.chat/getting-started/capabilities/
- Independent read-only review: cancellation, Skip, cache-only replacement, disabled generation, cursor and manual-cache findings fixed and rechecked. Batch toggle timing is the documented first-release limitation.

Meaningful regressions were observed failing before fixes: hold/approval gate, final-lookup cancellation, malformed-parameter Skip, oversize omitted parameters and reopen preparation recovery. Browser tests use local fixtures; no paid image calls were made.

Current machine-readable evidence: `docs/review-evidence/implementation-validation.json` and `build-verification.json`. The original `validation.json` records the earlier unsupported-toolchain audit; it is historical.
