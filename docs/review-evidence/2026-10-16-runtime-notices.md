# Reader startup and error notices - beta.37

User reported a generic `undefined is not an object (evaluating 'key of value.allKeys')` notice after reopening a previously generated reply following an update. They then reported that a new reply was not recognized. The notice had no close control.

Confirmed fixes:

- General error cards were excluded from dismissal because the existing predicate admitted image sources only. All reader error cards now have a contextual accessible dismiss button. Dismissal preserves the error/phase/cursor and technical diagnostics, starts no retry, and remains local. Different failures or a new turn can show again. Existing image-error button labels are preserved.
- Generic backend notices now include their operation name in technical details.
- Optional saved latestScene/terminalContinuity caches were parsed before saved-turn recovery. Invalid cache fields could abort both reopening a valid saved turn and planning a new reply. Those optional caches now degrade independently to unavailable values, with a bounded generic warning. The active-turn pointer and raw stored data remain unchanged on read. Primary turn/job schemas remain strict.

Validator investigation and limits:

- The reported internal identifier occurs in Zod's object validator. The exact allKeys crash has not reproduced locally, including sandbox-style validation and tests using a newer isolated dependency.
- Checked-in resolution/local tests use Zod 4.5.4. Resolving the previous floating range (^4.4.3) in an isolated fresh install selected 4.6.7. Pinning 4.5.4 removes that demonstrated version-drift possibility; it is a compatibility mitigation, not a proven explanation for this user's crash.
- Package and lockfile dependency constraints now agree on exact 4.5.4; the resolved lock entry/integrity are unchanged. The build verifier rejects floating versions, installed-version mismatch and lock resolution mismatch. No root dependency installation or broad lockfile rewrite was performed.

Verification:

- RED/GREEN general-dismissal regression reproduced the absent button, then verified retained failure state, cursor, no retry and lifecycle reset.
- RED/GREEN operation-detail and exact-version build checks.
- RED/GREEN cache-loading regression reproduced a validation exception, then verified saved-reply reuse with no model call/raw-cache mutation and successful new-reply planning. This is a reproduced startup failure path, distinct from proving the specific allKeys trigger.
- Full isolated suite: 1,467 passed, zero failed, across 125 files. Separate speech transport: 18 passed, zero failed. Total: 1,485 tests.
- Cold contract/storage/controller tests with Function/eval disabled before application imports: 87 passed, zero failed. An earlier isolated 4.6.7 comparison passed 88 tests including view-gating cases; it did not reproduce allKeys.
- All-theme error-notice browser checks at 360x800 and 844x390 passed: readable details, unobstructed 44px close controls, retained state/cursor/counters and visibility of a different error. Screenshots were inspected.
- Existing reader and image-recovery browser checks passed.
- Strict typecheck, production build, bundle/version/pinned-dependency checks, extracted host scanner (no blocked capabilities) and full host sandbox startup passed.
- Fresh independent review and optional-cache follow-up reported no important issues.

No permission changes, no chat resets, no image regeneration on dismissal and no schema bypass for primary records. Local Bun is 1.3.14 while the project declares >=1.4.0; browser checks use the existing Node adapter. Physical Android and the user's live host/storage were not tested. If the internal crash recurs, the added operation context will narrow the next investigation.
