# Beta.48 — conditional stage-effect limits

Branch: Testing. Base: beta.47 (`1dc9031`). This continues F2 with conditional one-shot effect limits, leaving background hold and music policies for later increments.

## Delivered

- **Images → Presentation rules → Then → Limit stage effects** adds Gentle and No one-shot effects. The existing native scope/condition/preview/save/edit workflow remains intact; effect-only actions do not need an enabled image template. Search includes template, effects, gentle and off terms.
- Template and effect actions resolve independently by chat/account scope, priority and save order. Conditions use the original plan without chaining through a template preference. New plans store optional per-paragraph limits while retaining original effect cues, images, identities, audio and continuity.
- Dialogue, current-location and literal verified paragraph-item conditions can match without an image slot. NPC and template conditions deliberately require retained assigned picture metadata; they do not reconstruct discarded planner candidates or imply physical presence. UI help and previews explain this boundary.
- Reader playback chooses the lower of the global effect setting and paragraph cap. Stage enforcement covers planned, direct and automatic prose-triggered one-shot effects. Entering a capped paragraph clears preceding transient effects while preserving atmospheric weather. Danger pulses soften to static vignettes. Text animation, weather overlays and audio retain their existing controls. OS reduced-motion CSS remains authoritative.
- Existing replies are unchanged. Unsupported/malformed optional cap data degrades independently of primary saved-story validation; misaligned transport arrays are ignored. No extra model/provider call, permission, dependency or storage reset is introduced.

## Review and corrections

Self-review caught the automatic shake heuristic bypassing host-filtered planned effects. Paragraph caps now also reach the stage, and direct/heuristic triggers enforce them. Transient cleanup preserves ambient weather. A browser regression checks these paths and OS reduced motion against the actual reader fixture.

Independent review raised image-budget dependence for NPC/template conditions. The bounded contract deliberately matches assigned picture metadata, consistent with beta.47; the UI and docs now explicitly distinguish those conditions from dialogue/location/item matching without images. Preserving every discarded planner candidate is outside this increment. Review also caught abnormal source line endings; changed files were normalized, and an existing invalid punctuation byte in the rule editor was repaired. Final review found no unresolved Critical or Important issue under the clarified contract.

## Fresh local verification

| Check | Result |
|---|---|
| New shared/backend/playback regressions | Failed before implementation, passed afterward |
| New effect-action editor flow | Failed before controls existed, passed afterward |
| Full isolated unit/integration suite | 1,584 passed; zero failures; 134 files |
| Separate speech transport | 18 passed; combined total 1,602 |
| Restricted schema/preferences/storage/controller suite | 119 passed; overlaps ordinary tests |
| Browser suites | Eight passed: effect policies, presentation rules, host lifecycle, mobile reader, image inspector, settings workspace, text effects and settings |
| Visual review | Native mobile action/limit fields and preview screenshot inspected |
| Both TypeScript projects | Passed |
| Production builds and manifest checks | Passed; beta.48 entry hashes in `build-verification.json` |
| Local scanner/startup probes | No blocked capabilities; declared `base64_decode`; extension loaded |
| Staged whitespace checks | Passed before publication |

All browser/provider endpoints are local mocks. No paid generation calls or physical Android tests were run. Local Bun 1.3.14 uses the existing Node 22.19 browser adapter and test-only speech keepalive; manifest runtime remains Bun >=1.4.0. Scanner/startup probes are local compatibility checks, not production-host installation acceptance. User attachments and main are excluded from this release.
