# Beta.50 — dismissible Cast view portraits

Branch: Testing. Base: beta.49 (`62dd3c5`). User screenshot showed a named portrait floating over an environment image with no close control. Source inspection identified `CastStage`, not an image-review dialog or a new image-generation request.

## Behavior

Cast view is an existing opt-in Appearance setting. It arranges available compatible environment and character-portrait artwork for the current scene, with up to two named portrait cards and speaker highlighting. Action/Manga pictures retain their normal view. The art is displayed as supplied rather than converted into a cutout, so portrait artwork containing scenery remains a rectangular card. Displaying it does not request another image.

- A themed, accessible **× / Hide cast portraits** control is now integrated into the last visible portrait caption. Its target is at least 44×44 pixels.
- Dismissal removes the portrait overlays and exposes a small **Cast / Show cast portraits** control above the dialogue. The same background projection remains selected. Neither action advances the story, modifies the reply draft, deletes art, writes settings or requests generation.
- Dismissal stays local across paragraphs, scene/turn refreshes and temporarily absent compositions. Explicit restore or toggling Cast view off/on reopens it. The persistent off switch remains **Appearance → Cast view**.
- Pointer and keyboard activation cannot bubble into reading actions. Focus moves to the replacement control and survives external refreshes while that control is focused. Image-decoding epochs prevent late completion from reopening dismissed portraits.
- The layout reserves space for the close caption and fits cards above the dialogue. Existing no-room collapse remains on cramped landscapes; controls do not force unusable portrait space into the reader.

## Verification

| Check | Fresh local result |
|---|---|
| Missing close regression | Failed before controls existed; passed afterward |
| Review focus regression | Reproduced failing, fixed and passed |
| Full isolated unit/integration suite | 1,591 passed; zero failures; 134 files |
| Separate speech transport | 18 passed; combined total 1,609 |
| Browser suites | Five passed: cast, mobile reader, host lifecycle, reading and settings workspace |
| Final cast browser rerun | Passed after focus correction; close/restore, refresh, draft/background/cursor preservation, late decode, theme/layout bounds and existing settings opt-in |
| Visual inspection | Mobile portrait caption close control inspected |
| Both TypeScript projects, production builds, manifest checks | Passed after final focus change; hashes in `build-verification.json` |
| Local scanner/startup probes | No blocked capabilities; declared `base64_decode`; extension loaded |

Independent code review found no Critical/Important issue. The Minor focus issue was reproduced with a stronger test and fixed before release. Browser geometry assertions wait for animation-frame layout/ResizeObserver settlement; delayed-close checks run only when portrait space is visible, with cramped landscapes retaining the existing collapse behavior.

No physical Android or live-host acceptance test was run. Fixtures use local artwork and mocked endpoints; showing/hiding portraits makes no paid request. Tooling remains Bun 1.3.14 with the existing Node 22.19 browser adapter and test-only speech keepalive; manifest runtime remains Bun >=1.4.0. Local scanner/startup probes do not certify production-host installation. Main, user attachments, presets, dependencies and stored artwork are excluded from this release.
