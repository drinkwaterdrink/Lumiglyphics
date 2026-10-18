# Reader and image inspector polish

Approved scope: improve reading while preparation continues, clarify the in-reader image workflow, and offer richer optional reference cards. Preserve existing settings, actions, saved data, presets, and theme contracts. Publish to Testing only.

## Implementation

- [x] Show a bounded, source-scoped narrative preview while the existing planner works; preserve the reading position when the final plan arrives. No temporary reading acknowledgments or synthetic saved turns.
- [x] Coordinate compact reader controls and truthful preparation status with accessible touch targets.
- [x] Rework image inspection around picture/excerpt/status, a single appropriate primary action, editable prompts, and secondary advanced controls. Preserve drafts and the combined 3,000-character limit.
- [x] Expand extractive reference fields and group populated facts. Keep category/detail controls and add optional field groups; preserve local actions and document reading.
- [x] Verify reveal boundaries, chat/source races, optional enrichment recovery, themes, mobile layouts, and existing workflows.
- [x] Independent review, release evidence and build verification. Publish to Testing and verify the remote commit as the final release operation.

## Ownership

Root: protocol/backend preview transport, host/stage integration, shared tooltip preferences, release validation.
Reference data: story-reference vocabulary, exact evidence normalization, projection and prompt instructions.
Reference cards: grouped cards, Reading field-group controls, focused browser coverage.
Image inspector: image review UI/state model, focused regression coverage.

## Deferred follow-up

Cross-reply reference retention needs explicit ancestry validation: live ordered assistant history, current swipe and resolved/raw fingerprints for every ancestor through the viewed target, original evidence provenance unchanged, and no carry-over of scene state. Existing current-turn validators must not be loosened to simulate this. This phase enriches current-reply reference cards only.

## Validation

Fresh integrated results: 1,556 isolated tests plus 18 speech transport tests passed; 98 overlapping restricted-runtime tests passed. All 32 browser scripts passed; targeted preview/reference regressions also passed after review fixes. Both type projects, production builds, manifest verifier, local scanner and restricted startup passed. Independent review's Important observed/tracked state merge finding was reproduced and corrected by retaining distinct labeled values. Full details: [release evidence](../../review-evidence/2026-10-18-reader-inspector-polish.md). Local mocks/browser tests cannot establish physical Android keyboard behavior or live provider acceptance.

## Reference data implementation

Owner: reference-data agent. Implemented in `src/shared/story-references.ts`, new `src/shared/reference-fields.ts`, `src/backend/runtime/entity-projection.ts`, their tests, and only the reference instructions in `planner.ts`.

- Added optional descriptive field vocabulary for NPC roles, affiliations, relationships, mannerisms, voice, stated goals and known history; place layout, routes, surroundings, customs, services, public history and known risks; item provenance, function, limits, access, revealed contents, ownership and significance. All four original fields remain accepted for every category. New category-specific fields are rejected outside their category.
- Kept the exact contiguous visible-paragraph quote requirement: both exact subject name and exact extractive value must occur in the quote. Unsupported, malformed and duplicate proposals remain nonfatal. Existing 32-reference total, 400-character value and 1,200-character quote bounds remain unchanged.
- Exported group metadata and `referenceFieldInfo(field)` for presentation and independent group toggles. Groups: overview, identity, appearance, relationships, behavior, setting, use, history, state. Unknown saved presentation fields get readable overview labels; appearance remains descriptive, while outfit/condition/owner/location/presence identify living state.
- Updated the existing opt-in planner instruction to collect several useful supported details about focal subjects, without required profile fields, invented placeholders, special markup, private context, hidden motives, unrevealed secrets, unread contents or another model call.
- Projected observed item owner/condition into detached snapshots beginning at the revealing paragraph. Newest observed values win; older facts retain their original source and reveal anchors. Optional item state does not consume the required continuity-delta budget. Ownership descriptions over the existing 256-character state limit remain full observed facts without invalidating the projection.
- Validation: first new normalization run had the expected new-field rejection failures; the owner/condition projection test then failed on absent current state before implementation. Final direct unit run: `bun test src/shared/story-references.test.ts src/backend/runtime/entity-projection.test.ts src/backend/runtime/planner.test.ts src/shared/contracts.test.ts` = **59 pass, 0 fail**. Local Bun is 1.3.14; sandbox run produced an unrelated working-directory EPERM, and clean runs used the authorized elevated test invocation. Full-suite/build/browser validation is coordinated by root after integration. No live provider calls, preset edits or Git mutations were performed by this agent.

### Cross-reply retention investigation (deferred, no contract changes)

The usable read path is `spindle.chat.getMessages(chatId)` for live ordered messages, then `turnPath(chatId, message.id, message.swipe_id)` and `loadTurnRecord` for each earlier assistant response. A turn already preserves `plan.key` (chat, assistant id, swipe, fingerprint, revision), optional version-2 `source.rawFingerprint`, `resolvedSourceText`, and extractive `storyReferences` with exact quoted evidence. `controller.relateRecord` checks raw/selection fingerprints and distinguishes edits from scene reselection. `resolveMessageIntake` uses host macros with `commit:false` and distinguishes stable selection from volatile content.

Minimal safe next-phase design:

1. Take an ordered live-history snapshot through the viewed target, excluding all later responses. Build a bounded lineage prefix of message identity, swipe, raw fingerprint and planned resolved-selection identity; include intervening user messages because changing an earlier instruction can invalidate subsequent branch knowledge.
2. Admit only successfully loaded, validated predecessor plans that match their current history entry and lineage prefix. A missing/deleted/edited/swiped ancestor, changed chat/branch, failed intake, unresolved selection or unprovable legacy fingerprint makes that lineage unavailable rather than importing guessed knowledge. Recheck the live prefix before publication so an edit during loading cannot race the result.
3. Revalidate retained observations against each source plan's original visible paragraphs and quote evidence. Match entities only by kind and exact explicit name; do not merge names by casing, ambiguous alias or visual similarity. Retain original source message/fingerprint/revision/reveal paragraph and observed timestamp. Never restamp an old fact as though the target response said it.
4. Extend the presentation contract additively with explicit admitted-source lineage. Current `buildPresentationTimeline`, `readerPresentationFor` and `selectReaderDossier` all deliberately require current-message provenance; all three would need to validate this admitted-source contract. Do not weaken their checks to allow arbitrary same-chat facts. Keep the history cache optional and independently recoverable.
5. Carry descriptive observed facts only. Do not transfer an old scene's presence, speaker, drawable subject, location, outfit, condition or ownership as target-turn current state. Keep state changes separately attributed to their actual source cursor. Preserve older descriptions while choosing newest supported living values only with validated chronology.

Unresolved host contract: resolving an old macro against current chat variables is not proof of that message's historical branch. Its result may change even with `commit:false`; masked volatile values also intentionally do not equal a complete historical content digest. A dedicated lineage/selection snapshot captured when planning, or an authoritative historical branch token, is needed before retaining macro-derived predecessor facts confidently. Live ordered message identity alone does not prove this. This implementation keeps current-reply provenance intact and makes no cross-reply imports.
