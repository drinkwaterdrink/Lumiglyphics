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
