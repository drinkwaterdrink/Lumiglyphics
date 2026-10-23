# beta.58 — image pipeline audit and refinement

Branch: Testing. Base: beta.57 (`ca949b0`). Research, findings, implementation scope and limits: [full audit](../image-pipeline-audit.md).

## Reproduced problems and fixes

- A cross-mentioned character name in an appearance could break ensemble clause ownership. New immutable identity anchors bypass brittle retyping: the writer arranges compact tokens, the backend expands exact owned descriptions, and the real final length is validated. Legacy responses still face fact checks.
- A fact removed from one person's explicit row could be restored because another person's row now contained it. Current named rows now own their actual traits, including new manual edits.
- Failed template replacement cancelled a usable held prompt. It now preserves/reinstates the original approval on non-cancellation failures, and frontend rebuild controls recover.
- Initial and replacement-template preparation now share `adaptImagePrompt`. Invalid drafts remain held and cannot reach image dispatch; text fitting never generates an image.
- Automatic large-context targets no longer seek tens of thousands of filler characters. Manual budgets and real expanded identity needs remain supported. Native model guidance was refined; Animagine is no longer classified as Grok.
- Fit is promoted to the persistent footer for an invalid model budget/negative-field state, with text-token/no-image explanation. It returns to ordinary tools when the draft is valid. Prompt errors preserve the queue view and local draft.
- Rewriting no longer includes stale scene/action fields beside manually edited prompt text.

## Verification

- Red tests reproduced missing anchor/target exports before implementation, cross-character stale trait restoration, and failed-template cancellation before fixes.
- `bun test --parallel=4`: **1,682 pass, 0 fail**, 8,120 assertions across 143 files. Log: `.cache/image-system-audit-tests.log`. Environment Bun reports 1.3.14; this is not evidence of a separate Bun 1.4 runtime test.
- `node node_modules/typescript/bin/tsc --project tsconfig.json --noEmit`: passed.
- `bun run build`: build typecheck and production frontend/backend bundles passed.
- `bun run verify:bundle`: manifest/version and dependency/bundle checks passed; tracked hashes are in `build-verification.json`.
- `python C:/Users/trent/.codex/skills/lumiverse-extension-debugger/scripts/scan_spindle_bundle.py .`: no common blocked backend patterns found.
- `node --experimental-strip-types scripts/test-model-prompts-browser.ts`: passed. Covers the reported 2,914/1,200 invalid state, visible footer repair, safe edited recovery, template error busy-state recovery, manual budgets, native-size fields, ten themes and 320/390/1280 bounds. A new template interaction initially failed because the fixture had no config/templates; loading the existing fixture config corrected the test, and the complete rerun passed.
- `node --experimental-strip-types scripts/test-image-inspector-browser.ts`: passed. Covers planning/empty/held/terminal states, draft switching, rewrite restoration, focus, mobile/desktop layout and close control bounds.
- `node --experimental-strip-types scripts/test-image-retry-queue-browser.ts`: passed, including preservation of the confirmed queue after a prompt error, multiple queued retries, bulk retry, completed-image regeneration and scoped queue events.
- Browser plugin is unavailable; existing Playwright fixtures were used. Visually inspected `.cache/model-prompt-research/z-image-repair-primary-mobile.png`: Fit is visible above disabled Generate, quick retry is absent for the blocked draft, and close/header/theme remain intact.
- Integration verifies template replacement fits to 1,200 before its preview, expands identities locally, and sends no marker to the image provider. Direct writer tests verify successful one-operation cast repair, second-attempt anchor correction, real expanded-size enforcement, impossible-budget preflight without writer calls, manual edit precedence and cancellation/independent approvals.
- Public provider metadata was refreshed without credentials or prompt text. Unknown limits remain unknown; no sampler support is inferred from native model documentation.

## Limits

No paid image generations or real writer calls were made. User-screenshot rejection is consistent with the reproduced validator defects, but the exact failed request/writer response is unavailable. Real image-quality gains, host forwarding and Android keyboard/IME behavior remain unverified. A writer ignoring its contract can still fail; impossible locked budgets remain blocked rather than dropping characters or unique facts. No blanket “optimal settings for every model” or provider-wide certification is claimed.
