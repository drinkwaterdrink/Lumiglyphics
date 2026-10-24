# beta.66 — cache cue overlap hotfix

## User report

Reader error during `vn_asset_ready`: custom validation issue at `cacheCues[0].paragraphIndex`, "Cache cues cannot share a paragraph with a budgeted visual cue." The image remained visible. This is saved-plan validation, not an image-provider rejection.

## Reproduction and cause

Cast allocation intentionally creates independent background/portrait candidates at one paragraph. With a budget exhausted after admitting the background, the unfunded portrait was left in `cacheCues` at the same paragraph. The existing schema correctly rejects that overlap. Writes could retain the invalid plan until a later read, including browser image-readiness acknowledgement, invoked strict parsing.

The allocation regression reproduced invalid plans at a small shared budget. An actual `markAssetReady` regression reproduced rejection of a stored generated image because an unfunded optional cache candidate overlapped its paragraph.

## Fix

- After free reuse and funded admission, retain optional cache candidates only at paragraphs without an admitted visual cue. No new requests or budget slots. Free art/cache hits that were admitted with jobs remain admitted.
- Saved-plan reading attempts recovery only when every validation issue is the exact optional cache-overlap condition. It removes only conflicting cache proposals with no matching saved job, then revalidates the complete plan.
- Any matching job, unrelated schema issue, wrong scene, duplicate ID or remaining invalidity continues to reject. The primary schema is unchanged.
- Read recovery does not mutate the stored input. A normal successful mutation, such as acknowledgement, can persist the repaired plan. Existing jobs/images, prose, visual cues, source identity and approvals are retained.

## Verification

- Both source-allocation and actual-readiness regressions observed failing before implementation, then passing.
- Allocation tests check strict plan validity and no cache/budget paragraph collision under budgets 1/2/3, with no provider generation during admission.
- Readiness tests confirm the generated image reaches `browser_ready`, keeps its image ID, retains original visual cues and leaves the input object unchanged. Saved-job overlaps and unrelated wrong-scene errors are not silently repaired or written.
- Full suite: 1703 passed, 0 failed, 8188 assertions across 146 files; local Bun 1.3.14.
- Existing real-host Chromium reader-status suite passed.
- TypeScript, production build, bundle verification and backend capability scan checked before publication.
- No paid provider calls. The user's exact stored reply and physical Android installation were unavailable; the matching validation failure was reproduced locally.

Testing only. Main remains beta.61. No settings migration, image regeneration or broad cache reset is required for the recoverable case.
