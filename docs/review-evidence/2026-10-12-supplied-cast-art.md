# Supplied cast artwork — beta.20

## Delivered

Existing Pictures settings now offer a scoped native-gallery picker for an existing saved portrait appearance and a restore-generated action. Gallery files are uploaded through Lumiverse itself. Display overrides are appearance/outfit-bound and Cast-view-only. They never mutate provider jobs, prompts, reference inputs, generated-image reuse or the image budget. No new permissions/dependencies or deletion of host images.

## Verification

- New supplied-art test failed before implementation, then passed for scoped verification, display lookup, appearance mismatch, original generated-image reuse and restoration.
- Gallery test verifies originating user, offset 12, limit 12, native small specificity, and filtering video/SVG. Request/gallery schemas are bounded and reject malformed data. Metadata storage remains bounded and version-compatible.
- Turn integration verifies originating user, no provider calls, unchanged original jobs, matching display override and rejection after outfit changes. Cursor/scene/Manga projection checks preserve original scene assets.
- Independent read-only review identified three actionable issues. Each was reproduced red then fixed green: browser-ready updates losing supplied art; restoration selecting the wrong preferred variant; a parallel projection retaining a resolved override after reset. All outgoing turn/asset paths now use shared enrichment, restoration activates the chosen variant, and whole-projection epochs invalidate stale metadata.
- Full suite exposed completed retry notifications being suppressed by the post-decoration guard. Fixed the guard to reject abort/replacement/stale state while allowing matching completed batches. Targeted retry/lifecycle checks passed, followed by a fresh complete green suite.
- Final isolated unit run: **1,377 pass, 0 fail**, 6,488 assertions in 118 files. Separate speech transport run: **18 pass, 0 fail**, 45 assertions. Total **1,395 tests**.
- Full TypeScript, production build, manifest/version/bundle verification, blocked-pattern scanner and whitespace checks passed.
- Chromium settings, cast, image review and mobile reader fixtures passed. Settings exercised gallery choice, original portrait restoration, opt-in controls and a 390px gallery overflow check. Phone screenshot inspected: picker/buttons stay inside the viewport. The fixture uses unavailable fake host image ids, so thumbnail/preview error fallbacks are exercised; real gallery pixels were not tested.

## Limits

No live Lumiverse, physical Android or paid image-provider test was run. Bun 1.3.14 was installed while the project declares >=1.4.0. Artwork assignment currently requires an existing saved portrait appearance; direct upload and initial character registration are pending. Cast view still requires a usable environment cue and established portrait cues; it does not request missing assets automatically. Independent background/portrait generation allocation, external source reconciliation and roadmap F/G remain pending.
