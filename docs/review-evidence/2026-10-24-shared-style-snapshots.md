# beta.73 — shared style at preparation

Testing only; main remains beta.61.

## Behavior

New template-based image preparations save an optional shared-style snapshot beside their visual brief. It records the explicit selected preset association when present, whether preset-controlled fields were customized, and the configured prefix, suffix and shared negatives. Direct placeholder occurrences are counted separately for the template's positive and negative fields. Nested placeholders inside shared text are not treated as recursive substitutions.

The reader exposes this under **Image prompts → Prepared picture brief → Shared style at preparation**. It displays saved words, a customized label, configured character counts and unused fields. This is a record of preparation inputs, not another instruction layer or a claim that the final prompt still contains every phrase. Adaptation, rewriting and manual edits may change wording; the actual prompt remains authoritative. Browsing this section never reapplies a style or makes a provider call.

Older requests remain unavailable rather than borrowing current settings or inferring a preset label. Invalid/future optional style snapshots are ignored independently while a valid saved request and brief remain usable. Each field saves at most its first 4000 characters for display, with the original length and an explicit truncation note; this never truncates the real generation prompt. Long values are keyboard-scrollable and wrap inside the mobile layout.

## Boundaries

No config migration, setting removal, automatic generation, model budget change, style rewrite policy or new backend permission. The snapshot sits outside the visual cache identity. Changing only a preset association while keeping rendered wording identical does not invalidate art. Template changes capture their own placeholder usage; prompt rewrites retain their preparation snapshot. Existing review-history size limits remain in effect, and snapshot storage is bounded.

## Verification

- Snapshot unit regressions were observed failing before implementation. Cases include direct/nonrecursive placeholder use, exact configured wording, customization, explicit unset versus unrecorded/unknown preset choices, and bounded fields.
- Actual image preparation was exercised with a local provider stub: saved prefix/usage reach review metadata, unused suffix stays absent from the provider prompt, and only one mocked image request occurs.
- Held review/regeneration/history checks retain saved style after current config changes. A damaged optional snapshot does not discard the valid prompt or visual brief. Cache identity stays identical when only the preset association changes.
- Chromium prepared-brief checks pass at 320/390/1280px: inert markup, long keyboard-scrollable values, explicit truncation, frozen wording after config changes, unavailable legacy snapshots, no requests during browsing, and preserved edited text during navigation. Narrow-phone screenshot inspected.
- Reader picture-status, image inspector and model-prompt Chromium suites also pass. Both TypeScript projects, production builds, manifest/bundle validation and local backend static-pattern scans pass.
- Final full suite: 1726 passed across 153 files plus 18 separate speech transport tests using the existing test-only keepalive; 1744 total, zero failures, 8483 assertions.
- No live provider calls or physical Android verification. Local Bun reports 1.3.14; the declared >=1.4 runtime is not separately verified. Local scanners do not certify a live host install-time scan.
