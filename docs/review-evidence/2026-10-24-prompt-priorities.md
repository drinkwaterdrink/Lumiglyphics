# beta.70 — calculated prompt priorities

Testing only; main stays beta.61.

## Findings and changes

The rewrite path supplied a combined target and expanded identity count, but did not calculate how much positive wording remained after identity and negatives. Its suggested negative length was fixed at 100–250 characters regardless of model budget. Initial planning also subtracted a fixed 1800-character ensemble estimate, which exhausted the direction allowance on a 1200-character profile even when the template left usable space.

- Added a pure character-allocation projection for rewrite/reroll requests. It counts exact expanded cast blocks first, allocates scene action/contact/layout next, then a small model-scaled negative allowance, then supporting setting/style/light detail. Existing short negatives do not acquire a filler quota. Positive-only routes receive zero negative allowance.
- Every writer attempt receives its calculated positive allowance beyond identity. After an oversized attempt, the numeric allocations and feedback are recalculated together. The latest attempt target explicitly supersedes the initial preferred range.
- Ordinary safety headroom yields when exact identity plus minimal scene space can fit at the actual ceiling. Impossible fixed budgets still fail before a writer generation call. Valid near-ceiling output remains accepted under the real limit.
- Initial planning scales estimated identity reservations to available template headroom, leaving direction space when available. Estimates are explicitly labelled; supplied facts must not be omitted to satisfy an estimate. Fixed template/style wording that exhausts the target still reports zero additional space.

These allocations are writer guidance, not enforced semantic field slices. Exact identity ownership, real combined character validation, frozen model/parameters, two-attempt limits, cancellation, retained failed drafts and explicit image approval remain authoritative. No code truncates prompts, fabricates missing scene facts or claims semantic equivalence. Initial custom style/template literals remain intact; adaptation preserves their intent through rewriting rather than silently replacing configuration.

## Verification

- Observed new accounting/integration tests fail before implementation, including the near-ceiling safety-headroom case.
- Focused tests cover 256–50000-character profiles, ensembles, exhausted fixed wording, positive-only routes, negative allowances, exact expansion accounting, smaller second-attempt targets, impossible identity budgets, stale/manual edits and frozen image parameters.
- Chromium model-budget, image workflow and inspector regression suites run against local fixtures; no paid model/image calls.
- Full suite: 1706 passed across 149 files plus 18 separate speech transport tests with the existing test-only keepalive; 1724 total, zero failures, 8383 assertions. Local Bun reports 1.3.14, below the declared >=1.4 runtime requirement.
- Both TypeScript projects, production builds, manifest/bundle verification and local backend static-pattern checks passed. These do not certify a live host install-time scan.
- Live-provider scene/style fidelity and physical Android acceptance remain unverified. This increment does not finish compiler-level semantic priority enforcement or the representative image-quality evaluation plan.
