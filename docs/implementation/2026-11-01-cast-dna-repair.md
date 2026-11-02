# Cast / Appearance DNA repair handoff

Implementation checkout: `.codex-attachments/main3-audit-20261101`, branch `codex/audited-improvements`, based on published beta.111 commit `6240bba01d97f4c5b9ca773365f29d954add0d24`. The user subsequently authorized publishing this packet as beta.112. Main-3-GPT and primary Testing source are untouched. Release verification is recorded in the parent audit progress document.

## Resulting workflow

1. Open Cast and select a character. Auto-Fill All, Lock/Unlock DNA, Copy Prompt, Delete character and Save changes are reachable in a portrait-independent toolbar.
2. Auto-Fill All uses the configured story-reader text connection to propose fields from enabled context. A field sparkle limits the proposal to that field, including current scene attire.
3. Review current -> suggested values with Evidence, Inferred or Generated labels and expandable source excerpts. Existing nonempty values are not selected for replacement by default. Apply selected fields commits once; discard/failure/cancellation leaves saved DNA unchanged. Unresolved ambiguity can yield no proposed change rather than a fabricated fact.
4. Manual typing is a draft. Save changes commits against the known library revision. Newer local edits survive an earlier acknowledgement; unedited fields can receive newer server state. Locks block automated completion, while explicit manual editing remains possible.
5. Delete removes only this chat's profile, suppresses immediate rediscovery and supports Undo. Story text, tracker, lorebooks and gallery images are not deleted. Merge duplicate previews values: retained values win, blank fields can be filled, names become aliases, and the removed record remains undoable.

The word boy/girl is no longer taken from the first matching word anywhere in a turn. Model-generated gender values normalize to woman/man while explicit age remains separate and custom/nonbinary identity remains supported. A proposal is not semantic proof: review is the authority for accepting generated or inferred visual details.

## Context and source limits

The collector reads one message snapshot and bounds target-name/alias passages with literal Unicode matching and surrounding pronoun context. A saved reading position limits narrative to that turn/cursor. It also reads the enabled card/scenario and activated lorebook context through the existing visual-context loader, matched SimTracker evidence, cursor-valid story reference dossiers, and enabled supported LumiBooks/LumiScript providers.

Unavailable, disabled, unmatched and truncated sources have distinct reported statuses. Activated lore APIs do not search every inactive world-book entry. Optional Codex RPC requires that producer to be installed, enabled and reachable. Private/noInject facts are excluded by the existing provider boundary; unclassified author references remain reference evidence and are not promoted into observed story history. The extension never writes generated details back to external sources.

Context excerpts are bounded to 24,000 characters total, 3,000 per evidence item and 40 items. Text generation has a 45-second request deadline, cancellation and at most one format-repair attempt. Other host reads have bounded waits. No text/image generation starts from browsing Cast. A request already sent may still incur provider cost even when cancelled locally.

## Prompt integration

Saved DNA is resolved into the existing chat-scoped effective appearance map, which is frozen for image preparation and shared by compilation, preview and cache identity. This reaches ordinary generation paths instead of relying on an optional DNA argument that callers never supplied.

Selection stays by pictured character name/known alias. Single-subject images do not append other profiles; named ensembles resolve each member's own appearance; templates with no people do not receive character DNA. Explicit picture-level subject corrections retain their precedence. A current outfit replaces default clothing, including V2 shot serialization; changing physical DNA changes the corresponding image identity, while provenance-only metadata does not needlessly invalidate art.

## Persistence and lifecycle

- Stable IDs replace mixed name/ID dictionary keys. Lookup prefers exact IDs, then canonical names, then unambiguous aliases. Adding an existing canonical name/alias opens its profile instead of saving an empty replacement.
- V1 remains readable; successful writes use V2 with revisions and deleted records. Valid entries survive malformed neighbors. Original and recovery backups preserve legacy/unreadable raw data before replacement. Unknown versions or invalid collection/revision shapes are refused without destructive rewrites.
- Mutations serialize read/check/write per user/chat. Explicit revisions reject stale full-record saves. All targeted responses retain the originating userId.
- Proposal responses are bound to request and turn identity. Cancel/swipe/chat changes cannot reopen a discarded review. Saved mutations remain chat-scoped so a swipe does not strand a save acknowledgement. Apply also checks the captured reading turn and library revision.

## Review and verification

Independent read-only review identified and drove repairs for stale saves, duplicate Add replacement, canceled/swipe response ownership, missing attire scope, contradictory combined hair/eye controls, focused-input stale closures, same-name merge tombstone filtering, and save acknowledgements crossing swipes. Behavioral regressions cover these paths; the focused-input browser assertion failed with green replacing violet before the fix and passed after it.

Offline browser acceptance passes at 360, 366, 390, 412 and 1440 pixels: visible hit-testable >=44px actions, proposal review/apply, lock, explicit drafts/save, input focus, duplicate Add protection, clipboard rejection feedback, delete/undo and no horizontal overflow. Invalid manual fields produce a readable validation error and retain the draft instead of silently stranding Save. Actual host fixture checks reject delayed proposals after cancel/swipe/chat changes and settle a save acknowledgement after a swipe. Browser plugin is unavailable, so repository Playwright fixtures were used. These fixtures do not contact live model or image services.

Actual mocked `imageGen.generate` payload tests verify saved physical DNA, exclusion of unrelated profiles, a DNA edit reaching a new request, current-outfit replacement, multiple named ensemble members and no-people exclusion. The original focused Artwork and compact-reader browser regressions also pass.

Final full unit/build results are recorded in `2026-11-01-audit-progress.md`. Logs and screenshots live under ignored `.cache/implementation/`.

**UNVERIFIED:** Live text-model quality, a Lumiverse installation and a physical Android device. No paid/live model or image request was used. Original roadmap Tasks 3-11 remain queued; the previously recorded baseline browser-suite exceptions are not counted as passing checks.
