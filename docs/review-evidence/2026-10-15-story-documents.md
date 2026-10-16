# In-world story documents - beta.35

Implemented October 15, 2026, as H1 of the approved reader roadmap.

Important letters, notes, journals, notices, phones and terminals can expose Read revealed text from their existing item card, reached through inline highlights or the quiet reference menu. Tooltips master/Items gates and reference suppression apply. Missing contents remain unavailable; optional Examine/Custom drafts remain story intentions rather than access grants.

The existing planner call accepts optional storyDocuments enrichment. It copies literal established passages only, with exact name/evidence matching and validated UTF-16 source offsets. Invalid optional proposals do not request repairs or invalidate the primary plan. Limits: 12 documents, 16 passages each, 6,000 characters per passage and 24,000 total body characters. No private companion storage or unclassified Codex data is consumed. Existing TurnPlan/ReaderPresentation TurnKey envelopes own chat/message/swipe/fingerprint/revision provenance; document IDs are turn-local. Source offsets are checked again during saved projection and frontend hydration.

The themed viewer renders textContent, never HTML. It provides selectable text, explicit Copy text, source-paragraph labels, Back to item, Close, focus containment and inner scrolling. Passage visibility follows the paragraph cursor, including backward reading. Reference filters survive the return path. Context/category changes close the viewer, and detached controls cannot reopen a stale scope. Floating controls are temporarily hidden while viewing a document.

Verification completed:

- RED/GREEN shared literal-source tests and planner integration tests. Cases include absent/sealed text, progressive revelation, ambiguous/repeated evidence, invented contents, source removal, malformed optional data, different swipes, Unicode, hostile markup, length limits and supported document types. Planner fixture verifies one existing model call with no repair call.
- Full isolated suite: 1,462 passed, zero failed, across 125 files. Separate speech transport: 18 passed, zero failed. Total: 1,480 tests.
- New browser suite passed at 360x800 and 844x390 across every theme. It checks revealed-only passages, previous-position restoration, literal hostile markup, item/reference return flow, viewport bounds, unobstructed 44px controls, focus containment, real clipboard copying, long journal scrolling, source replacement, category disabling and stale detached controls. No external requests or chat submissions occurred.
- Long-document browser testing reproduced an existing unbounded non-adjustable story panel that placed controls offscreen. Limiting only that text area and adding inner scrolling resolved it without changing adjustable-sheet preferences.
- Visual inspection reproduced Literature Club's white text on a pale card (contrast 1.07:1). Using the theme's existing chrome text token fixed reference/document cards. The browser suite now checks document text contrast of at least 4.5:1 across all themes. Portrait and landscape screenshots were inspected.
- Existing dossier, scene-interaction, reading and provider-move browser regressions passed.
- Strict typecheck, production build, bundle/version verification, extracted host scanner (no blocked capabilities) and host sandbox initialization passed.
- Fresh independent review and follow-ups found no remaining important issues.

No dependency, lockfile or permission changes. Local Bun is 1.3.14 while the project declares >=1.4.0; browser checks use the existing Node adapter. Physical Android, live Lumiverse and paid-model extraction were not tested.

H1 is the literal current-reply path. Existing saved replies without document enrichment are not reconstructed; a reader model may omit a document, leaving its original story text available. Cross-turn document aggregation, explicit public companion document adapters and a document-specific Read intention remain follow-ups. No extra model/image call occurs on opening, reading or copying, and no chat/inventory/canon writes occur.
