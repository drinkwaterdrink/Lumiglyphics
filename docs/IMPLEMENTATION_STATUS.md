# Lumiglyphics implementation status

## Latest Testing increment: 0.2.0-beta.20

Pictures → Saved portrait art now lets you choose supplied artwork from your Lumiverse gallery for an existing saved appearance, or restore its generated portrait. The gallery is paged in groups of 12, uses host-provided small-image URLs, filters PNG/JPEG/WebP/AVIF, and revalidates image access under the originating user when assigning. Transparent PNGs retain their transparency. Upload files to Lumiverse's own gallery first; direct file upload is not added in this increment.

Enable Look → Scene → Cast view to display chosen artwork. The mapping applies only to matching character identity/appearance/outfit and established cursor-scoped portrait cues. It does not replace provider jobs, alter prompts, consume image slots or turn supplied pictures into image-model references. Original scene images, Manga pages and action pictures retain their existing behavior. Missing supplied art falls back to the generated portrait or its ordinary placeholder. Assignment/restoration makes the selected variant preferred. Forget/reset removes the mapping with the library metadata and preserves host images.

All outgoing turn/asset views share display enrichment, including generation status updates, browser-ready acknowledgements, correction and cancellation paths. Library epochs invalidate both individual lookups and a whole parallel projection. Chat/request-scoped gallery responses and errors reject stale replies. Existing reader settings/themes and mobile controls remain in place.

This is another bounded E2 increment: supplied artwork selection is now available for saved appearances. Direct upload, character setup before any saved portrait, independent background/portrait generation allocation, normalized external context reconciliation, F rules and G interactions remain pending. No extra permissions or dependencies.

See `docs/review-evidence/2026-10-12-supplied-cast-art.md` for evidence and runtime limits.

## Latest Testing increment: 0.2.0-beta.19

Pictures → Generation now includes optional Reuse saved portrait art (off by default). Completed, unedited Character portrait requests can be saved per user/chat and reused across turns/restarts when the full compiled request, character appearance, outfit, environment, template/style, model/connection and dimensions match. Compatible hits cost zero new image slots and can appear in the existing Cast view through normal cue assets; no whole-cast generation or extra provider request is added.

Pictures → Saved portrait art provides previews, compatible variant preferences, forget variant/character and reset controls. Each variant retains its own appearance description. Management removes metadata only; existing reader images and host gallery images remain. Missing/unverifiable images fall back to normal budgeted generation. Reset/forget/preference epochs reject stale lookup and save results. Edited review prompts stay independent. Reference-capable anchored generation retains its existing capture route; this library does not turn ordinary portraits into reference cutouts.

This continues E2 with exact cross-turn persistence. Supplied artwork upload/selection, independent background/portrait generation allocation, normalized external context reconciliation, F presentation rules and G interactions remain pending. Exact matching is intentionally conservative: changed scene wording may require a new image.

See `docs/review-evidence/2026-10-12-saved-portrait-art.md` for checks and limits.

## Latest Testing increment: 0.2.0-beta.18

New planning requests richer grounded visual direction aiming for 2,500–2,800 combined positive/negative characters, with actual shared-style/template reservations. Short, sparse scenes remain shorter; there is no artificial padding or extra model call. The existing 3,000-character dispatch guard remains authoritative and overlong unique wording stays reviewable rather than silently losing facts. Targets are instructions to the planner, not guaranteed model output. Existing held prompts/templates/styles remain unchanged.

Look → Scene → Cast view is optional/default-off. It arranges completed Environment and Character portrait template pictures from the current turn/scene, shows at most two portraits, highlights the attributed speaker, and allows switching additional available portraits via a tray. It makes no image requests. Cursor bounds, absent-character state and outfit incompatibility prevent inappropriate reuse. Action, detail, Manga, legacy assets or insufficient background art retain scene display. This is the first bounded E2 presentation increment: supplied-art selection and persistent cross-turn cast libraries remain pending.

See `docs/review-evidence/2026-10-12-prompt-detail-cast.md` for checks and limits.

## Latest Testing increment: 0.2.0-beta.17

The reader header uses accessible icon-only controls with mobile touch targets and a floating, theme-aware speaker badge for attributed dialogue. Known NPC, location and item names are highlighted and clickable; the open-book button retains the current-reference menu. Display rules only prevent linking names that are no longer present in rendered prose. Tap prose or empty dialogue-panel space to continue; buttons, reference cards, scrolling, selection and resize gestures preserve their own behavior. While text is typing, the first tap finishes the current paragraph. Tooltip settings and category gates remain optional. This increment responds to reader UI feedback; E2 cast staging remains pending.

See `docs/review-evidence/2026-10-12-reader-header-links.md` for local checks and runtime limits.

## Latest Testing increment: 0.2.0-beta.16

Optional persistent place art is available under Pictures. Enable Reuse saved place art to retain completed Environment-template pictures and reuse exact-compatible variants across visits/restarts. Saved place art provides preview/prefer/forget/reset controls, with user/chat isolation and no host image deletion. Reused art costs zero new image slots; new jobs retain the existing budget/review route. Edited requests remain independent. This is E1; cast staging and external source reconciliation remain pending.

## Latest Testing increment: 0.2.0-beta.15

Optional built-in story tooltips are available under Reading → Tooltips. NPCs, locations and items can be enabled separately, with detail/link density controls and local pin/hide/notes. Facts come from grounded visible-story references in the existing planner call; tapping a card makes no provider request. Mobile sheets and desktop cards inherit the current theme, pause reading automation and preserve cursor visibility. Existing replies without reference metadata require future planning to populate tooltips. External companion dossier integration remains pending. See the latest reader-experience plan increment for scope and validation limits.

## Current template upgrade: 0.2.0-beta.1

Implemented editable templates and independently toggleable dynamic story-reader selection, with the existing budget (default 4, 0 unlimited). No additional provider adapter, planning call, dependency or permission was added. Existing shared styles, presets, connections and appearance overrides remain available in Pictures. Environment/detail templates omit character references and portrait capture; manual template rebuild retires the previous approval atomically. Supported SimTracker chat JSON is bounded to context through the target reply and is recorded as safe source metadata.

Pictures has expandable Generation, Templates, Shared style and consistency, Context sources and Advanced image parameters groups. Mobile navigation uses a section selector. The opaque mobile reviewer scrolls fields while Close and image actions remain reachable. Template drafts survive host updates and failed saves. Catalog save/discard is separate from existing Apply fields. The preview labels sample context explicitly; prepared requests show actual metadata.

Current local verification: 1,243 unit tests pass, zero failures; full typecheck, production build, bundle/manifest verification, and template/settings/image-review/reading Chromium checks pass. Regression checks cover migration reload, no-people references, tracker bounds, cache identity, scoped rebuild/approval races and draft retention. Independent read-only whole-change review completed; all seven Important findings and the selection-action usability finding were reproduced and fixed. The final suite and affected browser checks passed after fixes. No paid image call or live Lumiverse install was performed; real provider conversion and quality require host testing.

Limits: one character or no people; provider/model-specific negative prompts and parameters may be ignored by the host/provider. Dynamic mode defaults off; review defaults on. An inherited anime prefix remains visible/editable. Tracker context requires a supported payload and does not directly query another extension. Legacy presets beyond the first 19 remain in the original preset list; unsupported legacy macro notation is literalized only in imported templates. Original presets are preserved. Rebuild uses frozen scene/style/model facts with the newly selected enabled template; settings changes apply to future preparations.

## Historical first prompt-review release

Initial prompt-review release implemented as `0.1.0-beta.1` on `codex/image-review`, based on the pinned Cue 1.7.0-beta import (`a04f73b`). Origin points to the requested Lumiglyphics repository. The user subsequently authorized publishing the tested version on GitHub for live testing. The initial local verification below precedes that publication; the README contains installation instructions for `main`.

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
