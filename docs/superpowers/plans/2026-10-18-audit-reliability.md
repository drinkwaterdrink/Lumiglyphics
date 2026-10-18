# Audit reliability fixes implementation plan

**Goal:** Resolve F01–F13 from the supplied beta.41 audit against beta.42 on Testing.

**Architecture:** Preserve existing story, image-review and storage interfaces while making revision, chat and image-attempt ownership explicit. Use guarded queued record mutations; keep untrusted story formatting separate from user-authored theme CSS.

**Constraints:** Testing only; no paid test calls, automatic retries, new permissions, or saved-data deletion. F03 is already fixed and must retain its regression. Zero image budget means unlimited. External generation must honor prompt review even when the reader is closed.

## Tasks

- [x] F01/F02/F08/F09: distinguish revised plans from rebroadcasts, reject stale chat state, correlate decoded images, stop hidden progression. Test cursor/draft retention and late delivery through controller fixtures.
- [x] F04/F07: guarded queued readiness mutation and atomic submission reservation. Test stale snapshots, image replacements and concurrent duplicate submissions.
- [x] F05: allowlisted text-only story CSS with validated values. Test escapes and browser network behavior while retaining safe emphasis/color.
- [x] F06/F10: reviewable external prepared requests and consistent unlimited-budget semantics. Test approval/cancel/duplicate/closed-reader behavior without provider calls before approval.
- [x] F11/F12/F13: full audio cache identity, persistent error dismissal, accessible settings search. Test same-stem audio files, resync and keyboard navigation.
- [x] Maintain legacy browser checks and one current status matrix; complete full tests, mobile/browser checks, build and sandbox/scanner gates; fresh review.

Publication procedure: commit the verified release to Testing, push and verify the remote revision. Record the resulting revision in the delivery response.

## Review focus

Same-source revision with a nonzero cursor and unsent draft; A→B→A and null stale state; decode finishing after replacement/deletion; external approval after cancellation or settings change; late audio load completing after rescan.

## Delivery

Each task starts with a failing regression and ends with its focused checks. Shared lifecycle changes receive integration coverage. Preserve optional-cache recovery and presentation-only error dismissal. Broader proposed features, F2 policies and independent asset allocation are separate roadmap work.

User steering adds the opt-in Full scene / ensemble template, including the persona and physically present named cast. Implementation and validation are recorded in [beta.43 evidence](../../review-evidence/2026-10-18-audit-fixes.md).
