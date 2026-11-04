# Artwork correction workflow checkpoint

Approved council P1 scope, executing on codex/audited-improvements after beta.129. Preserve all paid-dispatch, source, request, draft and approval ownership.

Design: add four navigation shortcuts in the existing Picture tab: Person or outfit, Camera or framing, Edit wording, Another image. These open existing controls or focus the current contextual primary action; they never dispatch requests. Subject shortcuts use the existing correction form when eligible, otherwise route editable held prompts to wording with an explanation. Existing specialist tabs and Customize remain intact. Use at least44px touch targets and a wrapping two-column layout. Pending/readonly/unavailable operations remain guarded by current controls. Generation costs stay with existing explicit actions.

Return design: reuse ReaderWorkspace.close and its existing focus restoration. Do not introduce a second stored cursor or automatic seek. Prove that close/reopen preserves passage, unsent reply and selected image edits; source/swipe/chat changes must retain their current owner and must not restore an old reading position.

1. Add a failing real-browser test for shortcut navigation, held prompt fallback, zero transport, local edits and close/reopen at390/1280.
2. Implement navigation-only controls in studio.ts, reusing navigateBrief/switchTab and existing footer actions. Test completed and busy states as well as held review.
3. Extend real-host return coverage for cursor/draft and source replacement while Artwork is open; fix only reproduced ownership failures.
4. Run affected browser suites, full TypeScript and isolated unit suite; bump130 in all three files, build/verify/status/static scan, explicit commit/push and remote confirmation.

Ruling: existing workspace owns reading position and restoration focus; avoid new schema/storage fields unless a reproducible failure requires them. The cost is no cross-source automatic return, which protects current reading ownership.

Execution complete at beta.130: shortcut and return browser acceptance passed; existing Studio/model/reader suites passed; full2155pass0fail and release gates passed. Existing workspace return behavior required verification only, with no new stored cursor.
