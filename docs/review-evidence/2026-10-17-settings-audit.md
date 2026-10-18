# Settings reliability and mobile polish audit - beta.42

## Findings and changes

- **Concurrent settings writes:** config updates read and merge inside the existing user-scoped serialized-write queue. Reproduced two independent simultaneous patches losing the first value; regression now retains both. No storage migration or deletion.
- **Failed Advanced Apply:** submit only edited keys; keep submitted raw drafts until authoritative backend confirmation. A failed save leaves the editable draft and Apply/Discard controls. Unknown saves remain visibly unconfirmed and can be explicitly retried. New edits survive an older successful save.
- **Save ownership:** config requests and success/error responses carry optional request IDs. Local stage preview no longer acknowledges persistence in the settings panel. Late failures cannot cancel a newer Advanced retry. Concurrent NovelAI edits use the submitted Advanced replacement object, preserve unrelated keys, and do not leave phantom drafts after confirmation. All panel subeditors use the correlated save path.
- **Optional request lifecycle:** late saved-place and context-source errors cannot cancel newer requests. Chat changes clear prior source status immediately. This does not reset saved art, source endpoint drafts or story state.
- **Self-hosted frontend compatibility:** non-security UI record/correlation IDs fall back when secure-context crypto.randomUUID is unavailable. Saved-place loading, cast outfits/gallery, template duplication, panel resolution and library actions no longer fail at that call. Authentication and user/chat authorization remain unchanged.
- **Pictures navigation:** retain existing controls and power, with touch-sized section headers, short purpose descriptions and search keywords for appearance, dimensions, templates and integrations. Suppress duplicate disclosure arrows. Update output-shape guidance to reflect the existing model compatibility rules.
- **Theme contrast:** fallback status text previously measured approximately 1.37:1 on the light fixture. Semantic status ink now combines the host foreground with its status hue; saved/dirty/saving/error text passes 4.5:1 against both fixture backgrounds. This is not a guarantee for arbitrary custom themes.

## Review and verification

Observed regression failures before the storage, failed-save, missing-UUID, stale-error and contrast fixes, followed by passing checks. A fresh read-only review identified two additional production-path races (optimistic host echoes and uncorrelated save errors); both were addressed. The reviewer follow-up found no remaining concrete must-fix defects in the updated diff.

- 1,496 isolated unit/integration tests across 128 files, plus 18 speech transport tests: 1,514 passed.
- 88 restricted-runtime validation tests passed.
- Strict typecheck, production build, manifest/version/dependency verification, extracted host capability scanner and restricted startup passed. No blocked backend capability.
- Browser coverage: settings, save resilience, cast setup, image templates, NovelAI parameters, image review, image library, template preferences, history, mobile reader and all-theme error notices. Settings resilience includes failed Apply, partial patches, pending guards, retained newer edits, timed-out retry/late failure, concurrent Advanced/everyday image parameters, search, optional stale requests, chat reset and insecure-context IDs.
- Responsive checks at 320/390/768/1280 pixels; light/dark mobile screenshots inspected. Status contrast and section touch dimensions measured.

Browser mocks were updated to echo actual save request IDs; the old NovelAI browser script was also aligned with the current Pictures location of image JSON controls. No paid generation, live Lumiverse session or physical Android keyboard test was performed. The suite does not establish that every extension path is bug-free.

## Scope

This maintenance audit covers settings persistence, request lifecycle, discoverability, self-hosted UI compatibility and regression checks across existing reader/image workflows. No new permissions/dependencies, paid calls, retries, image slots or model selection changes. Saved images, held prompts and history are preserved. Existing chat_mutation/app_manipulation permissions remain justified by user-authored reply actions and the visual-novel overlay; no permission expansion. Roadmap F2 policies remain pending. Release target: Testing only.
