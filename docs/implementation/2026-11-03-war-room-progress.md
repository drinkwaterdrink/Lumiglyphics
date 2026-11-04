# War room implementation progress

Branch: codex/audited-improvements. Base: beta.127, 3a0ad72c507b8065bc0ce8ee48e1054db3afb6a3.

## Checkpoint 1 — Gallery ownership and character avatar matching, beta.128

Reproduced current-source failures before implementation: Gallery admitted an unread excerpt, retained old pixels after replacement, collided on reused job IDs and retained the old chat after null/new-chat delivery. Ann borrowed Joanne's avatar through substring matching while ignoring Ann's ID-only image.

Gallery now receives the reader cursor from VnStage, admits only ready/generated assets at or before it, uses canonical image candidates, and upserts the current reply's items using full chat/message/swipe/source/revision/job identity. Other replies remain available within the same session/chat; alternate swipes/source revisions replace that reply's entries. Chat changes and stage reset clear collection ownership. The session collection is bounded to256 images. Changed collections close their lightbox so stale excerpts cannot remain visible. Unchanged deliveries retain the current view. Backward reading removes the active reply's later entries. This is an in-memory collection, not a new persisted archive.

Folio avatar matching now requires exact normalized character names instead of substring similarity. Existing profile aliases and stable-ID library lookup remain intact. Both Folio CG collection and avatar candidates require generated/browser-ready state and share canonical image loading references, including ID-only images. This does not claim the complete Folio roster/lore projection is now reveal-safe.

Regression coverage retains the original gallery mount/lightbox test, with an explicit revealed cursor, and adds replacement/reveal/branch/chat tests plus Ann/Joanne/ID-only matching. Real-host phone browser verifies visible cards, replacement refresh, lightbox entry and chat isolation. Existing Cast workspace, artwork reveal phone/desktop and host-lifecycle browser suites pass. No live model/image/TTS calls or installed/physical-device acceptance.

## Remaining council execution

1. Audit Folio roster/lore discovery end-to-end and define its reader versus authoring context; add cursor/source tests before changing policy. Preserve saved manual DNA and explicit aliases.
2. Implement outcome-oriented correction entry points and validated return-to-reading targets inside existing Studio/workspace surfaces.
3. Evaluate production previous-shot continuity wiring with manual override and cache identity tests.
4. Add bounded local picture diagnostics; investigate document/dossier source-return consistency and paragraph-owned choreography.
5. Prototype scene direction lock and test-only lifecycle chaos replay only with explicit owners, validation and cost limits.
6. Extract further lifecycle seams only after characterizing their state and cancellation behavior. Current packet does not mark the whole council roadmap complete.

Release verification: Bun1.4 isolated suite **2,152 pass, zero fail,11,278 assertions/210 files**. Full TypeScript, backend/frontend build, manifest/static verifier, status generation, blocked-pattern scanner and diff check pass. Gallery, Cast workspace, artwork reveal and host lifecycle browsers pass. The user reported resize failing, then confirmed applying the latest installed update resolved it. Current-fixture mouse dragging also worked after the transient opening card cleared; no resize behavior change is included. The older mobile-reader monolith still targets a removed resize button and is not counted as passing.


## Checkpoint 2 — Folio reader reveal boundaries, beta.129

Base beta.128, 9936c1bebd6d2d3eabb66d07fd3d2ceba6841c79. RED regressions showed full-reply candidate discovery and later lore/media remaining available at an earlier cursor, plus null context retaining narrative text. The host now updates Folio at its selected reading cursor during initial/restored load, advance, backward/History navigation and same-turn asset updates, rather than discovering everything before cursor selection.

Folio rebuilds story-derived lore/CG state from the cursor-local snapshot and eligible assets. Presentation ownership must match chat/message/swipe/source/revision. Unanchored subject/cast candidates require literal Unicode-boundary mentions in revealed narrative. Compatible ready images use canonical references and must be at or before the cursor. Rewinding removes no-longer-visible automatically discovered profiles; saved profiles, explicit manual drafts and in-progress saves remain available as authoring data. No saved DNA is deleted or rewritten by reading navigation. Rebuilding clears stale facts/CGs across edits and swipes. Cursor movement cancels old auto-fill proposals, complementing backend apply guards. Focused text controls are not replaced by ordinary derived-state notifications.

Tests cover future character/text/facts/CG exclusion, forward appearance and rewind removal, wrong-revision snapshots, saved/manual DNA preservation, null story clearing, Ann versus Joanne and proposal cancellation. Real-host browser checks at390/1280 cover initial opening, advance, rewind and chat isolation. Existing DNA controls/lock/delete/undo/editing and host cancel/swipe/chat/save-acknowledgement suites pass; the host fixture now introduces Nadine/Darby in its actual visible passage instead of relying on an unanchored whole-turn candidate. Browser plugin unavailable; repository localhost Playwright fixtures used. No live/paid generation or physical-device acceptance.

The Folio reveal-policy checkpoint is implemented. Next council packet: outcome-oriented Artwork corrections and validated return-to-reading behavior, followed by previous-shot continuity. Saved DNA is intentionally accessible independently of story reveal; it is user-owned authoring guidance. Broader P1/P2/P3 items remain pending.

Beta.129 release gate: **2,155 tests pass, zero fail,11,293 assertions/210 files**; full TypeScript, production bundles, manifest/version/static verifier, status generation, blocked-pattern scanner and diff checks pass. Folio reveal, DNA UI, DNA host lifecycle and general host lifecycle browsers pass. Next authorized push after129 requires130.


## Checkpoint 3 — Artwork correction navigation and reading return, beta.130

Base beta.129, 7c90ca1ac88cf2d1b28f04d1bfeae9c548f4b174. Implemented the council's four outcome entry points in the existing Picture tab: Person or outfit, Camera or framing, Edit wording, Another image. They navigate to existing subject/template/prompt controls or focus the available contextual footer action. They do not dispatch text/image requests, apply edits, save settings or bypass approval. Subject correction opens its existing form when eligible; held prompts route to editable wording with visible guidance instead of focusing a hidden form. Another image respects the final enabled primary action, including unavailable configuration and pending work. Specialist tabs and Customize remain intact. Buttons use a wrapping two-column layout with44px minimum height. Guidance remains visible after switching tabs.

Reused ReaderWorkspace.close and existing source/cursor ownership. No duplicate return cursor, automatic seek, protocol schema or storage fields were added. Browser evidence proves same-passage/draft return, preservation of local prompt edits across close/reopen, and no stale return when a swipe/source/chat changes while Artwork is open. This preserves the current source instead of restoring obsolete context.

RED/GREEN browser regression covers the missing entry points, held versus completed correction paths, no transport dispatch from navigation, preserved drafts and responsive hit geometry at320/390/1280. Completed-image verification explicitly loads the fixture's existing template configuration; missing templates correctly leave replacement unavailable. Screenshots were reviewed at320px. Existing image-review, Reader/Cast/Artwork handoff, model-prompt, host lifecycle and reader-polish suites pass, including mobile Artwork visibility/focus and150% landscape host scale. New real-host return checks pass at390/1280. Browser plugin unavailable; repository Playwright localhost fixtures used. No live/paid calls, physical-device acceptance or new paid workflow claimed.

Next council packet: compatible previous-shot continuity in the production V2 builder, preserving manual camera overrides and cache identity. Larger P2/P3 upgrades and final council-wide review remain pending. Next authorized push after beta.130 requires beta.131.

Beta.130 release gate: **2,155 tests pass, zero fail,11,294 assertions/210 files**; full TypeScript, backend/frontend production builds, manifest/version/static verifier, generated status table, blocked-pattern scan and diff check pass.


## Checkpoint 4A — V2 same-picture camera continuity, beta.131

Base beta.130, 50bd58c8e4c8e840a15f55878046b2c17e14bf60. The shot director already accepted previous-shot evidence, but production V2 rebuilds supplied only its revision. A focused regression observed telephoto/selective prior framing replaced by normal framing. The V2 builder now accepts a caller-owned cue/shot/style snapshot; the production review rebuild callback supplies the original frozen shot from that exact picture's generation closure. No global last-finished-image state is introduced.

Continuity requires matching job, paragraph, scene/revision, character/ensemble, template snapshot, semantic style and output orientation/ratio. The previous shot must pass ImageShotSpec validation. The existing director additionally requires matching intent/revision and a focal character. Fixed templates retain their literal framing; explicit Reframe bypasses continuity; explicit manual lens/depth overrides retain highest priority. Only lens and depth receive weak continuity, with other composition decisions remaining current. Metadata and compiled wording receive the resolved shot through the established builder. This preserves the frozen prepared baseline; it does not invent a persistent camera lock.

Production integration tests exercise generateAssets -> review rebuild -> builder -> mock provider, confirm preserved lens/depth, manual overrides and exactly one explicit provider dispatch. Unit regressions cover mismatched context, revisions, output shape, malformed snapshots, explicit Reframe, caller immutability and existing fixed/none/ensemble behavior. Initial generation and its cache identity are unchanged. Review-modified requests continue through the existing approved-versus-frozen cache-claim release guard; no rebuilt wording is stored under an incompatible original key. No additional model/image calls or state/storage fields are added.

Ruling: scope this checkpoint to same-picture rebuild continuity. Cross-picture/scene continuity is still pending: it requires deterministic prior-cue selection before scheduling, with the same selected shot included in cache identity and generation. Choosing the last completed image would introduce concurrency-dependent prompts and incorrect cache hits. No cross-turn/cross-scene inheritance is claimed. The next camera packet must address those interfaces together before broader continuity can be marked complete.

Beta.131 release gate: **2,158 tests pass, zero fail,11,317 assertions/210 files**. Full TypeScript, production bundles, manifest/version/static verification, status generation, blocked-pattern scan and diff check pass. Model-prompt, Artwork correction and real-host return browser suites pass. Browser plugin unavailable; local Playwright fixtures used. No live/paid generation, physical-device acceptance or cross-picture continuity claim. Next authorized push requires beta.132.
