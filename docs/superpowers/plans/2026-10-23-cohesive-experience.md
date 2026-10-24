# Cohesive Lumiglyphics Experience Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Keep each phase independently usable and verified.

**Goal:** Apply the ten approved polish suggestions as a coherent reader, picture, cast and settings experience.

**Architecture:** Extend the existing TypeScript/Shadow DOM modules. Project shared operation states from retained request/asset evidence; retain backend ownership of approvals and paid work. Add UI explanations from actual prepared metadata, never a separate inferred story.

**Tech Stack:** TypeScript, Bun bundling/tests, Node/Playwright browser fixtures, existing Spindle APIs.

**Spec:** The ten suggestions approved by the user in this chat: unified picture workflow; visual prompt brief; explicit cast injection; prioritized prompt construction; model capability explanation; stable reader rhythm; consistent navigation/recovery; moment-oriented History; settings scope/consequences; measured quality acceptance.

## Global constraints

- Main is the verified beta.61 baseline (`b5af6caf5df9bbc2010f4f34fac734c7f8bc0264`); new increments ship only to Testing unless explicitly requested otherwise.
- Preserve settings, saved artwork, request attribution, drafts, source/reveal boundaries and approval behavior.
- Do not silently create paid comparisons, automatic retries or additional image requests.
- Use existing theme tokens and accessible touch targets. No framework migration.
- Native provider support, physical Android and artistic quality require evidence distinct from fixtures.

## Review focus

- Failed assets with queued replacements must show current work without erasing failure history.
- An older selected request must not rewrite the attribution of a newer image.
- Missing metadata must remain visibly unavailable, not inferred from current cast/story settings.
- Source conflicts must retain ownership and scope, including user persona versus NPC descriptions.
- Changing chats, closing a panel, delayed host messages and failed operations must preserve valid drafts and reject stale responses.

## Phase 1 — shared picture workflow (first delivery)

Files: `src/frontend/image-review/inspector-model.ts`, its tests, `studio.ts`, and `scripts/test-image-workflow-browser.ts`.

- [x] Add pure labels and reply-status summary projection from inspector states; test held/preparing/generated/failed/queued mixtures before implementation.
- [x] Use the projection for picture select options, thumbnail captions and inspector title. Include local rewrite/template operations and confirmed retry queue state.
- [x] Add a compact reply summary without duplicating technical error payloads or performing new work.
- [x] Verify selection, queued retry, prompt drafts, repair, no paid calls on browsing, and 320/390/1280px layouts.

- [x] Extend shared statuses to reader-level progress, including review updates, scoped retry events and initial/reopened reply load. Delivered beta.63.
- [ ] Unify remaining recovery controls and mirror local rewrite/template preparation into reader progress before calling the whole workflow complete.

## Phase 2 — visual brief and compatibility explanation

Files: new focused frontend brief projection and view modules next to `studio.ts`; shared request/metadata contracts only if necessary.

- [x] Project subjects, action, composition, lighting, template and output from saved request evidence. Delivered beta.64; do not infer an unrecorded style preset.
- [x] Show absent/legacy metadata honestly. Raw edited wording remains authoritative; identify when the brief belongs to the saved preparation rather than new free-text edits.
- [x] Link brief fields to existing editors; preserve unrelated draft fields.
- [x] Explain verified capabilities versus family guidance/manual settings; verify square-only and nearest supported portrait output, positive-only routes and unknown models.

- [ ] Persist and expose a separate shared-style snapshot for future requests, if added to the compiler contract; existing requests must remain unavailable rather than borrowing current settings.

## Phase 3 — cast injection transparency

Files: cast workspace, visual-brief/identity preparation modules, relevant tests.

- [x] Record bounded identity/outfit/direction preparation ingredients with source labels; show the pre-format subject block, template placeholder usage and retained conflicts in the reader. Delivered beta.65.
- [x] Add cast-workspace saved/draft comparison and explicit appearance-only, alias and outfit imports with conflict/default protection. Delivered beta.67.
- [x] Retain optional selected-source notes for exact base-appearance wording across saves; flag manual edits and clear mismatched notes on save. Delivered beta.68.
- [ ] Add per-trait reconciliation inside free-text appearance, origin tracking for remaining fields, per-person ensemble provenance and final-prompt occurrence mapping.
- [x] Explain existing this-picture/this-chat correction scope before submission; retain source precedence and expose conflicts without automatically resolving them. Delivered beta.65.
- [ ] Test persona/NPC ownership, aliases, absent companions, stale tracker data and manual edits.

## Phase 4 — prompt priorities and measured comparisons

Files: prompt compiler/detail/rewrite/protection modules and an opt-in comparison fixture/workflow.

- [ ] Complete compiler-level priority enforcement for identity/action/spatial relationships before decorative detail. Beta.70 delivers calculated writer allocations after exact cast accounting, adaptive negative guidance, retry recalculation and scaled initial scene estimates. Scene/style semantic retention still needs representative evaluation; no claim of enforced semantic equivalence.
- [x] Report exact before/after positive, negative and combined counts with a local previous-wording comparison and Restore. Counts do not claim semantic preservation. Delivered beta.69; semantic quality comparisons remain pending.
- [ ] Establish representative same-scene evaluations for identity, composition, fidelity and unwanted additions. Paid runs require explicit selection; never start on install/open.
- [ ] Test small budgets, ensembles, positive-only routes, unsupported dimensions and impossible fixed-fact budgets.

## Phase 5 — reader rhythm and overlay navigation

Files: stage/dialogue/image presentation, documents/dossiers/history/review overlay controllers.

- [ ] Preserve stable toolbar/text geometry during loading, notices, speaker changes and replacement artwork.
- [ ] Apply common Back/Close/focus/scroll restoration semantics while keeping drafts and user-controlled artwork.
- [ ] Test nested navigation, mobile rotation, keyboard focus, reduced motion, failed image decoding and late events. Physical Android acceptance stays explicit.

## Phase 6 — History moments and settings clarity

Files: image library/storage projection, settings page controllers and route/search modules.

- [ ] Group picture attempts under their real source slot; preserve source versions, unavailable art and reading position.
- [ ] Add supported return-to-passage/reference actions without inventing historical metadata.
- [ ] Explain scope, effect timing and spending consequences beside settings; preserve search destinations and page drafts.
- [ ] Test long histories, alternate swipes, missing images, saves racing newer edits and returning from search.

## Release quality across every phase

- [ ] Keep first-use, long-chat, ensemble, failed-batch, model-switch, narrow-phone and post-update acceptance scenarios.
- [ ] Run focused regressions first, then appropriate unit/browser/build/bundle checks. Record live provider/device evidence separately.
- [ ] Update this plan's checkboxes and release evidence for each delivered increment. Do not label all ten suggestions complete after the first phase.
