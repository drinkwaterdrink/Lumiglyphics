# Lumiglyphics audit and improvement ideas (2026-10-30, beta.93)

Scope: a read-through of the repository plus local verification (tests, typecheck, build, bundle check). This audit does not change product code. Earlier internal audits (`2026-10-24-exhaustive-architecture-audit.md`, `2026-10-24-beta72-deep-audit.md`, `extension-polish-audit.md`) were checked against HEAD where noted below.

## 1. What was verified

| Check | Result |
|---|---|
| `bun test --isolate` | **1,835 pass, 0 fail** across 162 files (~29 s) |
| `bun run build` (`typecheck:build` + two bundles) | Passes. `backend.js` ~1.9 MB, `frontend.js` ~2.2 MB |
| `bun run verify:bundle` | Passes |
| `bun run typecheck` (includes test files) | **Fails: 9 errors in 5 test files** |
| `bun run verify` | Therefore **fails** at the typecheck step |
| Browser test scripts (`test:*`, Playwright) | 44 scripts, **none** run by `verify` or any automation |
| CI configuration | **None** (no `.github/` directory) |

Size: 193 non-test source files (~81k lines including tests), 162 test files. Largest modules: `aperture-theme.ts` (3,815 lines, mostly CSS), `vn-stage.ts` (3,043), `planner.ts` (2,784), `settings/panel.ts` (2,480), `controller.ts` (2,130), `images.ts` (1,557).

Claims in the overview that checked out: 92 pose/expression entries, 256-entry / 1 MiB scene-cache defaults, 3,000-character image prompt limit, ten theme presets in config, and the `vn_view` / view-gating behaviour in `controller.ts`.

## 2. Corrections to the overview and docs

- **Theme presets:** `ARCHITECTURE.md` (line ~178) says "exactly seven" built-in presets. `src/config.ts` and `README.md` list **ten**. Update ARCHITECTURE.md.
- **Architecture-audit finding F1 (view-close misses intake epoch)** is **fixed** at HEAD. `abortChatWork` calls `bumpIntakeEpoch` (`controller.ts:261`).
- **Architecture-audit finding F4 (scene-cache key collision)** is addressed: lookups verify a full-identity digest (`scene-image-cache.ts`).
- **Finding F5 (display-rule ReDoS)** is still open, as the roadmap says. See 3.4.

## 3. Findings (prioritized)

### P1: fix soon

**3.1 The typecheck is red, so `verify` is red.** Nine type errors sit in test fixtures: `vn-stage-reading.test.ts` (4), `cast-context.test.ts`, `external-images.test.ts`, `cast-suggestions.test.ts` (2), and `prompt-length.test.ts`. One uses an invalid model family `"sdxl"`. Production code typechecks cleanly (`typecheck:build`), so these are fixture drift. Fix the fixtures (or exclude tests from the strict check) so `verify` can be trusted again.

**3.2 No CI, and most browser tests never run automatically.** 44 `test:*` scripts exist, but `verify` runs only `bun test`, typecheck, build and the bundle check. A regression in stage, settings or review UI can merge without any signal. Add a GitHub Actions workflow with `bun install --frozen-lockfile`, `bun test`, `typecheck`, `build`, `verify:bundle`, and a Playwright job for the browser suites.

**3.3 Licensing.** `UPSTREAM.md` says the upstream Cue revision had no LICENSE file, and this derivative has not chosen one. This is a legal blocker for publishing or distribution, not a code issue. Resolve it with the upstream author before wider release.

**3.4 Repository hygiene: a 30 MB zip is tracked.** `standard-vn-audio-pack.zip` (31.6 MB, 19 files) is committed at the repo root and referenced by no code. `.git` is 36 MB as a result. The `.gitignore` already excludes an unpacked `standard-vn-audio-pack/` directory. Move the archive to a GitHub Release asset or Git LFS, and document the install step.

### P2: correctness and safety

**3.5 System One silently truncates its inputs.** In `system-one.ts` (around lines 116–171):
- Expression choices are limited to `POSE_EXPRESSION_CATALOGUE.slice(0, 16)`. Only 16 of 92 poses can be chosen. The planner's own fallback can still use all 92, so this is an inconsistency that is hard to notice.
- Audio is limited to the first 24 BGM and first 24 SFX tracks. Tracks are taken in alphabetical id order (`audio-catalog.ts` sorts by id), not by relevance. A large library silently loses most of its music.
- Only the first 24 paragraphs get decisions, and only 32 names are passed.

Nothing in the UI tells the user any of this. Suggested fix: rank candidates before slicing (tag match against the paragraph text or the scene's mood), and expose "N of M tracks/poses offered" in the System One diagnostics.

**3.6 Story text goes to a third-party endpoint, and the UI doesn't clearly say so.** System One sends paragraph text (up to 3,000 characters each) and the previous scene to `https://api.typesafe.ai` by default, through Lumiverse's HTTP proxy. The settings hint reads only "Requests go through Lumiverse's HTTP proxy." Users who write mature or private roleplay should be told plainly that their story text leaves Lumiverse and goes to a named third party. Add that disclosure and make the endpoint choice explicit.

**3.7 User regex runs on the main thread.** Display rules (`src/shared/display-rules.ts`, applied in `rich-text.ts` and the settings panel) use a static ReDoS screen. The screen catches only the textbook shapes, and the code itself notes that "valid syntax does not establish execution safety." A pathological pattern can freeze the whole Lumiverse tab on every paragraph. Options: run user regexes in a Web Worker with a timeout; switch to a linear-time engine (RE2-style); or cap input length per match.

**3.8 Frontend HTML is built by string concatenation in about 75 places.** Escaping is mostly correct: the backlog and dialogue paths escape first (`escapeHtml` in `rich-text.ts`). But no single rule enforces this, and every new template is a fresh chance to miss one. Introduce a small tagged-template helper that escapes interpolations by default, and use it for new code first.

### P3: maintainability

**3.9 Very large modules.** `planner.ts` (2,784), `vn-stage.ts` (3,043), `controller.ts` (2,130), `settings/panel.ts` (2,480) and `aperture-theme.ts` (3,815, mostly CSS) are each hard to review. Split them along the seams that already exist (planner: parse / repair / fallback / prompt; controller: intake / planning / assets / views; stage: reveal / effects / history / dialogue).

**3.10 Documentation sprawl.** The README is ~56 KB. `docs/` holds about 35 dated audits, plans and reviews, and `ARCHITECTURE.md` is ~47 KB. Several documents already contradict each other (see section 2). Designate one current status page and mark older audits as historical.

**3.11 Tests cover fixtures more than the host.** The unit suite is strong (1,835 passing tests), but the README states the staging host contract has "not yet been tested inside a live Lumiverse installation." The best next investment is an in-process fake of `SpindleAPI` (the types package is already a dev dependency), so the controller can be driven end to end with generation, chat mutation, image and CORS calls in tests.

## 4. Improvement ideas

Grouped by user value. Items marked (existing) already appear on the roadmap.

**Trust and cost (highest value for a paid-image product)**
- **Per-turn cost and call budget.** Show the user, before or after each reply, how many text calls (planner, System One batches, prompt rewrite) and paid image requests were made. Today this is spread across diagnostics. The data already exists in the controller.
- **Clear data-leaving indicator.** Show, per feature, which providers receive story text (planner connection, System One, image provider, TTS). See 3.6.
- **Expression variants without new generations (existing, E3).** Reuse a saved portrait as the base and swap expression artwork from the cache or the library. This cuts cost and makes expression changes feel instant.

**Reader experience**
- **Export and import of per-chat presentation state.** Right now `visual-state.json`, cast art, location art and presentation rules stay in one user's storage with no export. Users who move to another device, or who recreate a chat, lose their work. A bundle export (JSON plus referenced images) would fix that. I found no backup or export path in the code.
- **Smarter audio pick (ties to 3.5).** Choose music and effects by tag match and scene mood rather than alphabetical id order. Show the user which track was chosen and why.
- **Accessibility pass.** The code has 11 `aria-live` attributes and 24 reduced-motion checks, which is a solid base. Check that the paragraph reveal announces text to screen readers, that the choice list is fully keyboard operable, and that focus returns to the stage after closing the history or settings overlays. (I did not test these with assistive technology.)

**Developer and maintainer**
- **Demo and fixture mode as a product feature.** `demo.ts` and `serve:reader-first` exist. A bundled "no-provider" sample story would let new users try the reader without any connection and give contributors a visual regression target.
- **Single status page.** Replace the scattered status claims with one generated table, built from `package.json` and the test list, so counts such as "ten presets" and "seven destinations" can't drift.

## 5. Strengths worth keeping

- The view-gating model is strict and easy to reason about: automatic work only runs while the reader is open, and closing the view cancels in-flight work.
- Late results are rejected by epochs and ownership guards, not by timing. This is verified by tests.
- Everything is bounded: cache entries, paragraph counts, retries, history, and prompt length.
- Model output is validated with Zod and repaired with a deterministic fallback, so a bad planner response degrades the presentation rather than breaking the reply.
- Chat messages stay the source of truth, and the extension's own state is a rebuildable projection.
- Failure of optional companions (System One, LumiBooks, SimTracker) is isolated and fail-soft.

## 6. Suggested order of work

1. Restore a green `verify` (3.1). Add CI (3.2). Fix the stale preset count (section 2).
2. Add the third-party disclosure for System One (3.6) and fix the truncation caps (3.5).
3. Move the audio zip out of Git (3.4). Resolve the LICENSE question (3.3) before any publication.
4. Sandbox user regexes (3.7).
5. Build the fake-host harness (3.11), then start the module splits (3.9).
6. Product work: cost visibility, presentation export, audio ranking.
