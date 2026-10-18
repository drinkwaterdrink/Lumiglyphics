# beta.43 — audit fixes and full-scene illustrations

Target: `Testing`, based on beta.42. This release addresses the supplied beta.41 audit's F01–F13 findings and adds the requested opt-in ensemble image template. Main remains on beta.42.

## Finding coverage

| Finding | Resolution and verification |
|---|---|
| F01 revised replies | Same-source revisions reload paragraph attribution, choices and presentation while retaining a compatible cursor and unsent draft. Actual frontend-controller lifecycle browser regression. |
| F02 late chat state | Chat identity and correlated state-request IDs reject old responses before they mutate the active reader. A→B→A→B and stale/null state regressions. |
| F03 concurrent config saves | Already corrected in beta.42: merge and write remain inside the serialized queue. Existing concurrent-save regression retained and rerun. |
| F04 late readiness writes | Queued fresh-record mutation validates active epoch, source and supplied plan/image identity, preventing rollback of newer persisted turns. Backend regressions. |
| F05 escaped story CSS | Text-only property/value allowlist rejects escapes, comments, entities, arbitrary classes and resource-bearing values. Unit tests and browser network interception include an escaped-URL positive control and 11 sanitized attack variants. User-authored theme CSS remains separate. |
| F06 external image review | Warp requests use the shared review gate, with an independent editable approval/cancel dialog available while the reader is closed. Scoped snapshots and source cancellation are covered by backend and actual-controller browser tests. |
| F07 duplicate submissions | Synchronous in-flight reservation makes simultaneous duplicate requests join the same operation; persisted request metadata still prevents later replay. Concurrent backend regressions. |
| F08 replacement image readiness | Decode/ack identity includes plan revision and image identity; late old decodes cannot acknowledge a replacement. Same-job image replacement browser regression. |
| F09 hidden Skip | Closing the reader suspends progression and clears timers; reopening retains position. Actual-controller browser regression. |
| F10 zero external budget | Zero retains the existing unlimited meaning; the generation enable switch remains authoritative. Backend regression. |
| F11 audio cache collisions | Full path, extension, storage identity and scan epoch distinguish files; stale reads cannot repopulate invalidated caches. Ambiguous friendly names are rejected and summaries expose unique paths. Audio regression suite. |
| F12 dismissed errors | Routine image synchronization preserves dismissal; a distinct failed attempt can surface a new notice. Dismissal does not change job state. Stage regressions. |
| F13 search accessibility | Removed invalid search-input aria-expanded; polite result announcements and existing keyboard navigation are verified in the settings browser check. |

## Full scene / ensemble

The built-in **Full scene / ensemble** template is appended to existing template catalogs without replacing edits, subject to the existing catalog capacity. It is excluded from dynamic selection by default. It can be chosen manually or enabled in the dynamic-template list.

The planner snapshots named physically present characters and the user's persona as separate subjects. Saved cast guidance takes priority over learned appearance; current scene attire remains available. The prompt uses an external camera, a shared setting and distinct identities rather than treating the scene as a solo portrait. Single-face references and portrait reuse are disabled for this template.

Descriptions share a bounded budget while retaining every included name. Condensation is disclosed. Up to 16 subjects are supported; an oversized group receives an explicit correction request rather than silently dropping cast members. This does not prevent ordinary single-character templates from planning. Existing prepared/approved prompts remain frozen, and the combined 3,000-character guard still applies. Missing appearance information is not fabricated; image-model identity and crowd accuracy remain variable.

## Review and validation

Independent review found and prompted fixes for source-cancelled external dialogs, ambiguous audio-summary references, long group descriptions losing later names, and ensemble metadata overflowing ordinary portrait plans. Scoped re-review reported no remaining must-fix issues. Final modal ownership, pause behavior and responsive adjustments were then checked with the actual-controller browser fixture and the type/build gates.

- 1,526 isolated unit/integration tests across 128 files, zero failures.
- 18 separately preloaded speech transport tests, zero failures: **1,544 total**.
- 96 cold restricted-runtime checks, zero failures. These overlap the normal suite and are not additional unique tests.
- All 27 browser scripts passed, including the new actual-controller lifecycle and story-CSS network checks. Responsive external review was checked at 320, 390 and 1280 pixels; dark/light screenshots were inspected.
- Typecheck, production build and bundle verification passed. Host scanner reported no blocked capabilities; restricted startup loaded successfully.
- One reading browser assertion was adjusted to allow floating-point measurement of a 44px control as 43.99997px; production touch targets were not reduced.

Local checks used Bun 1.3.14, below the manifest's declared minimum 1.4.0, and the existing local Node 22.19 browser adapter. No dependency/lockfile change was made to disguise that difference. Browser scripts ran sequentially through that adapter.

During the final pre-commit refresh, `bun run` reported `CouldntReadCurrentDirectory`; direct invocation of the local TypeScript compiler and bundle-verification script succeeded. Direct host scanner/startup probes also succeeded. This local package-runner issue is distinct from extension runtime acceptance.

No live paid image/TTS request, physical Android keyboard test, multi-device race or production-host upgrade acceptance was performed. Automated coverage does not certify every provider/model or host version. There are no new permissions, automatic paid retries or saved-history resets. Broader protocol tightening and F2 presentation policies remain separate roadmap work.
