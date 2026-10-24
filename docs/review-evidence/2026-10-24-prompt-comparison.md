# beta.69 — measured prompt rewrite comparison

Testing only; main remains beta.61.

After a successful rewrite, the inspector shows the previous and current combined character counts, the difference, and separate positive/negative counts. These use the same raw JavaScript string length as the editor budget validation, without trimming. Identical fields are labelled unchanged; equal-length replacements are still recognized as changed wording.

A collapsed comparison contains read-only copies of the draft captured when the rewrite was requested. Current text stays in the existing editors. Counts update while editing; the captured baseline stays fixed. Restore retains current image parameters and restores only wording. Comparison/editing/restoration make no provider calls. Existing source/revision scope cleanup and bounded in-memory retention remain in place.

This is visibility and review polish, not a new prompt-fitting algorithm or evidence of improved image quality. Counts do not establish semantic equivalence, and the UI says so. No prompt budget, protected identity requirement, approval rule, model parameter or provider behavior changed.

## Verification

- Unit regressions cover unchanged fields, equal combined lengths with redistributed wording, whitespace and Unicode using the editor character metric.
- Chromium inspector checks cover successful replacement, local comparison, live counts, fixed baseline, restoration, and 320/390/1280px bounds.
- Related workflow and model-prompt Chromium suites pass, including blocked drafts and failed repair recovery.
- Full suite: 1698 passed across 148 files, plus 18 separate speech transport tests using the existing test-only keepalive; 1716 passed total, zero failures, 8232 assertions. Local Bun 1.3.14 is below the declared >=1.4 runtime; the ordinary all-in-one run stalled at the known speech timeout tests and was stopped.
- Both TypeScript projects, production build, bundle/manifest checks and local backend static-pattern checks passed. These are not live host install-time scanner acceptance.
- No live provider calls or physical Android verification.
