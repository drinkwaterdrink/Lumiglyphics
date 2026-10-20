# beta.54 — background hold and shared-style persistence

Branch: Testing. Base: beta.53 (`2fa4c85`).

## Changes

- Shared style selection is now a saved advanced setting alongside its wording. Apply/save changes persists the selected built-in or personal style, including edits to its wording. Explicit Custom is distinct from legacy settings with no selected ID.
- Existing settings without an ID infer only an exact matching personal/built-in style. Unmatched wording is retained as Custom. Deleted/missing style IDs do not change the prompt fields. Saving a preset still only updates the library until Apply.
- New optional presentation action: Keep the current background. A matching condition latches a hold until the prepared reply's scene/revision changes. It works from existing cursor-visible compatible background assets only. Manual replacements, scene illustrations and manga pages take priority.
- Normal reader and cast composition share the same pure background selector. No jobs, budgets, prompts or retry counts change. Failures/progress use their original assets and remain independently visible.
- Manual picture replacement is retained as source metadata so later automatic background candidates cannot supersede that explicit choice during a hold.
- Old plans without hold metadata behave as before. Malformed optional hold metadata degrades without preventing valid saved-turn loading. Misaligned arrays are ignored by view transport/selection.
- Rule previews explain current-reply scope and scene/manual/composition precedence. New rules remain opt-in and apply to future preparations.

## Verification

- Red tests reproduced the absent hold behavior and missing style restoration helper before implementation.
- Full suite: 1,648 pass, 0 fail, 7,966 expectations across 139 files.
- Full TypeScript check, production build, manifest verification and backend blocked-pattern scanner passed.
- Chromium mobile shared-style flow passed: personal style Apply, complete panel reconstruction, built-in with modified suffix, explicit Custom, and retained wording.
- Chromium presentation-rule workflow passed: background action preview/save/edit, scoped CRUD, stale/unknown responses, protected drafts, light/dark layout and touch focus.
- Browser plugin unavailable; used the existing Playwright fixtures under Node. Bun fixture builds needed execution outside the filesystem sandbox to resolve installed runtime paths; sandbox failure was not a product failure.
- Shared-style mobile screenshot inspected at `.cache/shared-styles/mobile.png`.

No paid model/image calls, real host update cycle, or physical Android acceptance were performed. This verifies persisted configuration and reconstructed UI, not a specific installed Lumiverse host. Cross-reply background/cast allocation, expression variants and provider/device compatibility remain on the roadmap.
