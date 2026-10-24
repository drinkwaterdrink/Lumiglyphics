# beta.65 — cast preparation transparency

Testing-only first slice of Phase 3 in the cohesive-experience plan. Main remains beta.61.

## Delivered

- New template preparations retain an optional bounded subject-preparation snapshot: selected name, base identity, identity authority, outfit/source, pose/expression direction and whether each template prompt contains `{{subjects}}`.
- Existing resolution remains authoritative: manual correction, then saved appearance, then resolved context. Outfit selection follows the same cue/scene fallback as rendering, including explicit null resolved attire.
- Prepared picture brief adds **Appearance & prompt sources**: distinct ingredient rows, the recorded pre-format subject block, source labels, conflicts and template omissions. The final prompt remains authoritative after formatting, rewriting or manual edits; no claim of exact final-token mapping is made.
- Ingredients exceeding snapshot bounds are explicitly marked shortened. No-people templates record no character snapshot. Ensembles show the named prepared block and explicitly state that per-person precedence was not saved separately.
- Correction UI explains picture-only scope by default and warns that opting into saving applies the named appearance to this chat while preparing the preview. Existing held requests/history remain snapshots.
- Older requests have no invented provenance. Display-only metadata is excluded from image cache identity so compatible saved-art keys are preserved.

No prompt construction, source precedence, paid retry, provider parameter or permission changes. The schema addition is optional; no storage migration or historical backfill. Raw ingredient previews are explanatory and may include clothing that an outfit override replaces.

## Verification

- Backend regression observed failing before snapshot implementation, then passing for saved/manual precedence and omitted placeholders.
- Cache regression observed failing when display metadata entered cache identity, then passing after exclusion.
- Focused tests cover null-outfit scene fallback, explicit shortening, separate identity/outfit/block views, missing provenance and no-people requests.
- Full suite: 1701 passed, 0 failed across 146 files. Local Bun reports 1.3.14.
- New Chromium suite at 320/390/1280px: source/conflict/omission text, no requests while browsing, correction scope, actual named save request and legacy fallback. Screenshot inspected: `.cache/browser-fixtures/cast-preparation-390.png`.
- Existing prepared-brief and image-workflow Chromium suites passed. First rerun exposed a duplicated content-region selector; cast rows now use their own attribute and both suites passed again.
- TypeScript, production build, bundle verification and backend capability scanner passed before publication.
- Physical Android, screen-reader behavior, host/provider integration and artistic consistency remain unverified. No paid calls or new dependencies.

## Remaining Phase 3 work

Cast-workspace field reconciliation, per-person ensemble provenance, exact final-prompt occurrence mapping, and wider source/alias conflict workflows are not complete.
