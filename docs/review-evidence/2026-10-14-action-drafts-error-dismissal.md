# Tooltip action drafts and dismissible image errors - beta.33

Implemented October 14-15, 2026. User requested dismissible image-generation errors and continuation of the approved roadmap. This delivers G1 local action drafts, not the entire G provider-action package.

Image errors in the reader and notices in Image prompts have accessible dismiss controls with 44px touch targets. Dismissal is local presentation state: failed image/job/request diagnostics remain intact, no retry starts, and the story cursor does not advance. Same-error refreshes stay dismissed; different failures and new request identities can show again. The prompt panel's key includes both selected history and latest request IDs so a new failure is visible even when viewing an older attempt. Dismissal sets are bounded.

Reading > Tooltips gains Action drafts, off by default. The existing inline card and searchable reference sheet share one action editor. Present NPCs offer Ask and Approach; known places/items offer Examine; eligible references offer Custom. The builder uses names and reveal-scoped presence, not private facts or hidden contents. It proposes intentions rather than success. Missing capability data withholds Use. Nothing is sent on opening, editing or inserting a draft.

Insert preserves existing typed text; Replace is explicit. Actions prepared while reading wait for Your turn. CYOA preserves its choices and permits the normal composer for a prepared draft. Clearing its text leaves the composer open, and switching a typed standard reply to CYOA preserves access. Normal submission handles errors and double taps. Turn/revision/paragraph/category/availability guards reject stale detached actions.

Browser checks found a reply textarea could overlap the reference toolbar in landscape. The reply scroll area is now clipped above the reserved reader area. At Your turn, an oversized adjustable sheet temporarily makes room for the reply controls; the saved height ratio remains unchanged. Tests use near-maximum saved height and actual textarea/Send clicks.

Verification completed October 15:

- RED/GREEN regressions for stage dismissal, CYOA composer access, landscape overlap and new-request/same-error prompt notices.
- Full isolated suite: 1,452 pass, 0 fail, 6,733 assertions across 124 files. Separate speech transport: 18 pass, 0 fail, 45 assertions. Total: 1,470 tests.
- Mobile action/dismissal browser checks pass in standard and CYOA modes at 360x800 and 844x390, including near-maximum sheet height, editable focus, typed-draft preservation, explicit replacement, detached double taps, stale revision, opt-out, absent NPCs, normal Send gating and error dismissal across every theme preset.
- Existing dossier, reader and settings browser checks passed. Image-review browser checks passed, including preserved provider diagnostics, no request on dismiss and identical errors on new failed attempts. Reference modal screenshots were inspected.
- Strict typecheck, production build, bundle/version verification, extracted host scanner and sandbox initialization passed. No dependency/lockfile changes or additional permissions were introduced.
- Fresh independent review findings were fixed; follow-up reported no remaining important findings.

No live Lumiverse/paid-provider run or physical Android keyboard test was performed. Local Bun is 1.3.14 while the project declares >=1.4.0. Browser scripts use the existing Node adapter. G2 provider-owned action/Use integration and H in-world documents remain pending; existing Warp moves retain their existing authoritative game-bridge flow.
