# Saved portrait art — beta.19

## Delivered boundary

Optional exact cross-turn portrait persistence and library controls inside existing Pictures settings. Whole portrait pictures remain ordinary host images and can enter Cast view through current, cursor-scoped cues. No additional permissions, dependencies, provider calls, whole-cast requests or gallery deletion. Supplied-art import and independent background/portrait generation remain pending.

## Verification

- Watched the new cross-turn allocation regression fail before images integration, then pass: a saved unchanged portrait survives cache restart, returns a generated cache-provider job, and leaves a budget of one available for a new candidate.
- Storage checks cover user/chat isolation, strict request/appearance compatibility, missing image verification, concurrent bounded writes, preserved unknown versions, preference compatibility and forget behavior.
- Integration checks cover stable connection snapshots, reviewed edits staying independent, changed appearance/outfit/dimensions, unresolved appearance, Manga exclusion and reference-capable anchoring exclusion.
- Independent read-only review found one lookup/reset race. Deferred host verification reproduced a forgotten image returning after reset (red). Epoch checks after storage load and verification fixed it (green). Other reviewed scope/reference/allocation boundaries had no actionable findings.
- Final full isolated suite: **1,370 passed, 0 failed**, 6,470 assertions in 118 files. Separate speech transport: **18 passed, 0 failed**, 45 assertions. Total 1,388 tests.
- Full TypeScript check and production build passed. Manifest/version/bundle checks and blocked-pattern scanner passed. `git diff --check` passed.
- Chromium settings, cast, image review and mobile reader fixtures passed. Saved portrait controls exercised load/prefer/forget, explicit opt-in persistence and 390px overflow check. Phone screenshot inspected: controls wrap within the viewport. Fixture gallery preview intentionally uses an unavailable fake host image; error fallback is visible and generation is not requested.

## Runtime limits

These are mock backend and Chromium fixture checks, not live Lumiverse, physical Android keyboard, or paid image-model tests. Bun 1.3.14 was available; the project declares Bun >=1.4.0. Exact matching may miss art when planner wording or scene changes. Anchored ComfyUI/SwarmUI/NovelAI portrait requests retain the existing capture route. Reuse applies to future preparations; held review requests and already rendered pictures remain frozen.
