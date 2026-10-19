# Beta.47 — named-subject template preferences

Branch: Testing. Base: beta.46 (`e93fca0`). This is a bounded F2 increment in the existing preference workflow, not completion of all presentation policies.

## Delivered behavior

- **Pictures → Template preferences → New preference** adds three conditions: selected NPC picture subject, current named location, and item described in the picture paragraph. Native full-name input, category-specific explanations, preview-before-save and editing of saved conditions use the existing scoped panel.
- Matching requires the same category and full name, ignoring case and outer whitespace. It does not infer aliases or partial names. NPC matching uses `cue.character` directly; speaker attribution, scene cast and identity-resolution fallbacks cannot independently trigger it. Location matching uses the cue's selected scene. Items require a normalized story reference with literal name/value/evidence in that exact paragraph; prior mentions, inventory entries and later descriptions do not qualify.
- Conditions examine the original plan without chaining. Existing chat/account scope, revision protection, priority and save-order precedence, disabled-template exclusion and identity eligibility remain effective. Prompt sources identifies the winning preference and condition. Manual selection and manual subject correction retain precedence. No slots, subjects, identities, budgets, review gates or historical pictures are changed; no extra generation call is added.
- Existing version-1 documents remain supported. Unsupported optional documents remain protected by the existing storage contract. No new dependency or permission is required.

## Review correction and limits

Independent review found that a broad physical-presence condition could trust stale scene cast after a character leaves without an environment boundary. The original synthetic regression supplied absence deltas that ordinary production planning does not reliably emit. The shipped condition is deliberately **selected picture subject**, with direct cue-name matching and updated UI/tests. It makes no claim that the character is physically present in the current prose. Broader presence reconciliation remains future work.

Item conditions depend on the planner producing a literal verified reference. Missing evidence leaves the planner's template unchanged. Names are not reconciled across aliases or language/casing conventions beyond simple case-insensitive comparison. Conditions apply when future replies are prepared; existing held requests are not silently rewritten. Background hold, effect, motion and music policies remain pending F2 work.

## Fresh local verification

| Check | Result |
|---|---|
| New schema/backend regressions | Failed before implementation; passed afterward |
| New mobile condition flow | Failed before controls existed; passed afterward |
| Full isolated unit/integration suite | 1,579 passed; zero failures; 134 files |
| Separate speech suite | 18 passed; total 1,597 |
| Restricted validator/preferences/storage/controller suite | 115 passed; overlaps ordinary tests |
| Browser suites | Six passed: preferences, settings workspace, image inspector, image templates, settings and reader reference workspace |
| New mobile geometry | Subject input and draft fit 320/390px widths; touch target at least 44px; screenshot inspected |
| Both TypeScript projects | Passed |
| Production backend/frontend builds and manifest checks | Passed; beta.47 entry hashes in `build-verification.json` |
| Local host scanner/startup probes | No blocked capabilities; declared `base64_decode`; extension loaded |

One settings-browser keyboard assertion failed in the initial batch; the same suite passed twice in subsequent isolated runs without a product change to navigation. This remains an unreproduced test timing limitation, not a claimed navigation fix. An initial restricted probe importing the Node-based planner test failed during Node assert bootstrap after Function was disabled; the supported Bun-native restricted suite above passed. The planner suite passed in the ordinary full run.

Browser endpoints use local mocks. Local tooling remains Bun 1.3.14 with the existing Node 22.19 browser adapter and speech keepalive; the manifest runtime requirement remains Bun >=1.4.0. No paid provider/model calls or physical Android tests were run. Local scanner/startup probes do not certify a production-host installation. Main, presets and user attachments are excluded from this release.
