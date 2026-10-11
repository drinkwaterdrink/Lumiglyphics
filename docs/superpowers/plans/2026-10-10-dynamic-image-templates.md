# Dynamic image templates implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Recommended execution for this plan: Native, in this session, with one independent whole-change review before publishing.

**Goal:** Make image subjects, framing, and prompts editable and optionally context-selected, with explicit SimTracker evidence and usable mobile controls.

**Architecture:** A shared validated template catalog and structured visual brief feed one deterministic compiler. The existing planner selects templates; the existing reference-aware preparation/review boundary records and dispatches the compiled request. Tracker extraction supplies bounded evidence without another generation call.

**Tech Stack:** Existing TypeScript, Zod, Bun 1.4.0, DOM frontend, Playwright, and Lumiverse Spindle APIs; no added dependency.

**Spec:** `docs/superpowers/specs/2026-10-10-dynamic-image-templates-design.md` (approved by the user's “Please continue” response).

## Global constraints

- Extend existing Pictures settings and image reviewer; no separate photo settings.
- `dynamicImageTemplates` defaults false; `includeSimTrackerContext` defaults true. Review remains independently toggleable.
- Preserve image budget default 4, existing range 0 through 12, and unlimited semantics for 0.
- Support one subject or no people; multi-character dialogue and multi-reference support are deferred.
- Preserve saved prefixes, suffixes, negatives, prompt presets, connection settings, appearance overrides, and recorded requests.
- Maximum 24 templates, names 80 characters, selection descriptions 1,000 characters, and positive/negative bodies 8,000 characters each.
- Tracker bounds: 30 messages through the target, 64,000 characters per message, 20 cast records, 8,000 characters of resulting visual context.
- No runtime evaluation, direct runtime filesystem access, dependency changes, provider adapters, broad new permissions, or hidden image-generation calls.
- No raw reference bytes or credentials in request metadata. Preserve user/chat/source/profile scoping, cancellation, manual cache isolation, and usable previous images on replacement failure.
- Keep attachments and `.cache` outside commits and publication. Publish the tested implementation to the existing Lumiglyphics main branch under standing user authorization.

## Review focus

- Environment/detail pictures cannot capture portraits or inherit character references; pin in task 4.
- A later tracker snapshot cannot influence replacement of an earlier turn; pin in task 2.
- Rebuilding a held draft cannot race with approval and spend an obsolete request; pin in task 5.
- Unsaved template text survives host updates and failed saves; pin in task 6.
- System One expression routing cannot discard environment/detail cues or exceed the configured request budget; pin in task 3 and task 4.

## File structure and interfaces

Create `src/shared/image-templates.ts` for validation, built-in templates, snapshots, and deterministic rendering; create `src/backend/runtime/simtracker.ts` for bounded extraction; create `src/backend/runtime/visual-brief.ts` for grounded scene-to-brief assembly; create `src/frontend/settings/image-templates.ts` for the focused template editor. Keep existing planner, compiler, review, protocol, and panel integration in their current modules.

Shared exported interfaces:

- `ImageTemplate`: `{ id, name, category, enabled, useWhen, positive, negative, subjectMode, framing, referencePolicy }`; string literal unions match the spec.
- `ImageTemplateSnapshot`: `ImageTemplate` plus `revision: string`, derived deterministically from all template content. Snapshot is frozen per prepared batch.
- `VisualBrief`: `{ scene, subjects, action, composition, lighting, subjectMode, framing, referencePolicy, sources, conflicts }`; text fields are bounded, sources are safe source labels/IDs, conflicts contain visual-description conflicts only.
- `ImagePromptMetadata`: `{ template: ImageTemplateSnapshot, selectionReason, format, brief, trackerStatus, trackerSourceMessageId? }`.
- `validateImageTemplates(value: unknown): ImageTemplate[]`: strict validation that throws without partial saves.
- `resolveImageTemplate(config: VisualNovelConfig, selectedId?: string): { template: ImageTemplateSnapshot; fallbackReason?: string }`.
- `renderImageTemplate(template: ImageTemplateSnapshot, values: Record<ImageTemplateToken, string>): { prompt: string; negativePrompt: string }`.
- `extractSimTracker(messages: readonly TrackerMessage[], targetMessageId: string): SimTrackerEvidence`; `TrackerMessage` is `{ id: string; content: string }`; evidence is `{ status: 'detected' | 'not_found' | 'unsupported' | 'malformed', sourceMessageId?: string, cast, world, warnings }`.
- `buildVisualBrief(config: VisualNovelConfig, scene: SceneState, cue: VisualCue, appearances?: CharacterAppearanceMap): VisualBrief`.

Add optional persisted `imageTemplate`, `imageTemplateReason`, `visualDescription`, `visualFocus`, and bounded `visualSources` to `VisualCueSchema`. Keep absent fields valid for legacy turn records. `imageTemplate` stores the snapshot, never an unvalidated raw model object. Request records carry optional `imagePromptMetadata`; legacy absence is preserved.

## Task 1: Template contracts and configuration migration

**Files:** Create shared image-templates module/tests. Modify `src/config.ts`, `src/config.test.ts`, `src/shared/contracts.ts`, `src/backend/runtime/storage.ts` and relevant storage tests.

**Consumes:** Existing prefix/suffix/negative/presets and user config patch path.
**Produces:** Shared interfaces above; config fields specified by the spec. Default template ID `portrait`, default format `description`, built-in IDs `portrait`, `environment`, `action`, `detail`, `custom`.

- [ ] Add `template_validation_is_atomic`: reject duplicate IDs, 25 templates, 81-character names, 1,001-character selection descriptions, 8,001-character bodies, unknown enum values and unknown tokens; retain previous saved catalog after invalid patch.
- [ ] Add `legacy_config_preserves_style_and_presets`: existing style values remain exact; preset templates contain their saved positive/negative values, original preset records remain, migration is idempotent. Reserved built-in IDs cannot collide with imported preset IDs.
- [ ] Add `template_snapshot_is_stable`: content changes alter revision; equal content yields equal revision; stored snapshot survives catalog edits. Missing/disabled selection falls back as specified.
- [ ] Run new unit tests using the isolated Bun executable and verify they fail for missing exports/behavior.
- [ ] Implement validation, built-ins, bounded pure placeholder rendering, deterministic snapshots, normalization/migration, atomic config updates and optional backward-compatible cue/request fields. Preserve unknown legacy record handling.
- [ ] Run affected config/shared/storage tests; require zero failures. Commit explicit task files only.

## Task 2: Explicit tracker evidence and grounding

**Files:** Create runtime simtracker and visual-brief modules/tests. Modify `context.ts`, `context.test.ts`, `controller.ts`, and `planner.ts` input/context integration.

**Consumes:** Shared template types, existing appearance map and scene/cue types.
**Produces:** `SimTrackerEvidence`; optional `PlanTurnInput.simTrackerEvidence`; bounded evidence in planner context and safe source metadata in briefs.

- [ ] Add `tracker_uses_latest_supported_snapshot_through_target`: use the latest supported tracker before/at target, exclude later messages, enforce scan/size/cast bounds, recognize `characters` and `characterData` plus world-only snapshots.
- [ ] Add `tracker_failure_is_nonfatal`: disabled toggle skips extraction; malformed and unsupported input receive truthful status; valid older fallback cannot be labeled current without its source ID.
- [ ] Add `tracker_extracts_visible_facts_only`: hair/eyes/wardrobe/action survive; UI colors, IDs, roles and statistics do not become image facts; ambiguous aliases do not merge people; absence/unknown presence cannot establish a visible cast member.
- [ ] Add `durable_and_temporary_precedence`: saved identity remains authoritative on durable conflict; current explicit scene outfit/action wins over older tracker values; unknown details stay unspecified and extraction never writes appearance storage.
- [ ] Run tests red; implement bounded parsing adapted from the supplied script as source reference, without executing/importing its UI or relying on private tracker storage.
- [ ] Thread original messages through target-scoped extraction before narrative filtering, separately from the user's configured recent-chat count. Feed evidence into the existing planner pass and brief builder.
- [ ] Run context/tracker/brief/controller tests green. Commit explicit task files.

## Task 3: Dynamic routing in the existing planner

**Files:** Modify `planner.ts`, `planner.test.ts`, `planner-fallback.test.ts`, `planner-repair.test.ts`, `contracts.ts`; create `src/backend/runtime/template-selection.test.ts`.

**Consumes:** Validated enabled template catalog and tracker evidence.
**Produces:** Selected snapshots/reasons and grounded visual focus on persisted cues, including cache-only cues.

- [ ] Add `routing_respects_modes_and_catalog`: off uses chosen default; on supplies enabled names/categories/useWhen guidance and accepts only known enabled IDs; invalid IDs fall back with a recorded reason. No extra generation call.
- [ ] Add `nonportrait_selection_preserves_story_identity`: environment cues retain independent story character continuity while their visible brief contains no character; detail cues retain their actual prop focus; action preserves the event.
- [ ] Add `routing_preserves_budget_and_system_one`: budget 4 caps provider candidates; 0 preserves unlimited behavior; System One pose hints do not replace/filter nonportrait cues; meaningful-change and cache-only candidates remain bounded by existing behavior.
- [ ] Add `old_planner_output_and_fallback_are_valid`: output without new fields remains parseable; fallback selects the configured default; optional raw output normalization retains validated focus/reason fields.
- [ ] Run tests red; update planner instructions, raw schema, repair/normalization, fallback and final cue materialization. Replace contradictory fixed portrait/one-person planner instructions with per-template constraints; do not change narrative/choice behavior.
- [ ] Run planner/contracts/continuity tests green. Commit explicit task files.

## Task 4: Compilation, category-aware references, and cache integrity

**Files:** Modify `runtime/images.ts`, `images.test.ts`, `image-prompt-pipeline.test.ts`, `reference-anchoring.test.ts`, `scene-image-reference-capture.test.ts`, `scene-image-reuse.test.ts`, `core/scene-image-cache.ts` and tests.

**Consumes:** Cue snapshots and `buildVisualBrief`; existing provider structured caption support.
**Produces:** One compiler result used for exact prompt recording, provider generation and cache identity, with safe `ImagePromptMetadata`.

- [ ] Add `environment_and_detail_never_reference_characters`: no character count/gender/pose, no portrait fetch/capture/store, no character captions, no reference parameter merge in card or captured mode. Existing story character survives.
- [ ] Add `description_and_tags_share_grounded_facts`: supported identity/attire/event/location/light/framing appear in both formats; unknown gender never defaults to female; no hidden anime additions; existing shared prefix appears only where the template uses it.
- [ ] Add `category_and_revision_isolate_cache`: same scene with different template/format/brief/reference policy misses; identical compiler output and snapshot can reuse; old cache identity does not match new category keys. Manual approval still bypasses automatic cache.
- [ ] Add `novelai_captions_match_selected_brief`: portrait structured captions remain consistent with edited/generated text; no-people category emits no character caption. No promised support for parameters the model lacks.
- [ ] Run tests red; integrate brief/template compiler into `describeCue`, positive/negative/provider request preparation and cache identity. Audit every reference selection, first-portrait acquisition, scheduling and cache lookup branch for template policy.
- [ ] Add integration assertions for provider call count under budget 4 and System One routing; run compiler/reference/cache suites green. Commit explicit task files.

## Task 5: Exact prepared-request metadata and atomic template rebuild

**Files:** Modify `src/shared/image-review.ts`, `src/protocol.ts`, runtime `image-review.ts`, `image-review.test.ts`, `controller.ts`, `storage.ts`, `images.ts`; create `src/backend/runtime/template-review.test.ts`.

**Consumes:** Prepared compiler result and template metadata from task 4.
**Produces:** `vn_reprepare_image_template` scoped request `{ chatId, messageId, sourceFingerprint, requestId, templateId }`; optional `templateId` on existing `vn_prepare_image`; atomic pending-draft replacement and fresh approval revision.

- [ ] Add `reprepare_does_not_generate`: rebuilding held request changes prompt/category/refs and request ID; old ID cannot approve; provider call count remains 0 until new approval.
- [ ] Add `approval_and_reprepare_have_one_winner`: claim the current pending request synchronously before async work. Approval already claimed means reject rebuild; rebuild claimed means reject obsolete approval. Failed/cancelled preparation cannot dispatch either request; errors remain visible.
- [ ] Add `reprepare_enforces_scope_and_profile`: reject other user/chat/source, missing or disabled template, stale connection and duplicate requests; preserve existing cancellation and scoped preparation lock.
- [ ] Add `history_remains_truthful_and_bounded`: automatic and reviewed records include actual template/brief metadata; legacy metadata absent stays unavailable; sanitize new metadata and maintain existing history bounds. Existing generated-image replacement failure keeps the previous usable picture.
- [ ] Run tests red; extend gate metadata and implement an atomic pending claim/rebuild callback path rather than frontend prompt substitution. Reprepare uses frozen original scene facts and freshly validated chosen template, resolves applicable references and returns a new review draft.
- [ ] Run gate/controller/provider-boundary/storage suites green. Commit explicit task files.

## Task 6: Existing Pictures settings and mobile reviewer

**Files:** Create `frontend/settings/image-templates.ts` and tests. Modify settings `panel.ts`, `model.ts` and tests; image-review `studio.ts`, host `controller.ts`, browser fixtures and scripts.

**Consumes:** Config catalog, pure template renderer, scoped rebuild protocol and request metadata.
**Produces:** `ImageTemplateEditor` with `setConfig(config: VisualNovelConfig): void`, `destroy(): void`; constructor accepts `mount: HTMLElement`, `onSave(patch: Partial<VisualNovelConfig>): void`, and `onPreview(template: ImageTemplateSnapshot): void`. Studio receives catalog updates separately from preserved turn request snapshots.

- [ ] Add browser assertions at 360px and desktop for Pictures groups, mobile section selector, independent toggles, existing budget including 0, template enable/duplicate/save/discard, placeholder help, shared style clearing and description/tag selector.
- [ ] Add `template_drafts_survive_update_and_failed_save`: dirty editor text remains on host config sync; invalid template shows field error without save; backend failure never shows success; Save/Discard scope is explicit. Existing everyday controls retain instant saves.
- [ ] Add reviewer checks for actual metadata, friendly statuses, legacy unavailable label, viewport scrolling and reachable sticky actions, plus Edit and regenerate on a finished picture.
- [ ] Add `template_change_preserves_manual_edits`: Keep edits sends no rebuild; Replace sends exactly one scoped rebuild and cannot generate; no paid API call when opening preview or saving. New request ID retires old draft without carrying incompatible parameters/references.
- [ ] Run fixtures red; implement focused editor, reorganize existing Pictures controls without duplicate settings, mobile navigation and readable reviewer. Source expansion is escaped plain text; no raw tracker UI or private media.
- [ ] Run settings/image-review/reading browser regressions green. Commit explicit task files.

## Task 7: Whole-change verification and publication

**Files:** Update `README.md`, `docs/IMPLEMENTATION_STATUS.md`, `spindle.json`, `package.json` and tracked verification evidence.

**Consumes:** Completed task commits and checks.
**Produces:** Tested beta `0.2.0-beta.1`, consistent metadata, published source on existing GitHub main, and precise host-testing instructions.

- [ ] Run with isolated Bun 1.4.0 prepended to PATH: `bun run test`, `bun run typecheck`, `bun run build`, `bun run verify:bundle`, `bun run test:settings`, `bun run test:image-review`, `bun run test:reading`. Require zero failures and record actual outputs; browser runtime may require sandbox escalation.
- [ ] Perform one independent whole-change review through the code-review tool or a review agent authorized by the execution skill. Inspect migration, preview/dispatch equality, async races, no-people references, tracker source scope, System One budget, mobile drafts and manifest capability limits. Resolve material findings and repeat only affected checks unless shared changes justify full rerun.
- [ ] Write user-facing controls and limitations: tracker requires supported chat payload, multiple-character support deferred, model-specific wording remains editable, existing prefix retained, template changes explicit, budget 0 unlimited, host/provider tests still required.
- [ ] Confirm Git root/branch/status and stage only explicit product/docs files. Verify no attachments, credentials, caches or zip source in staged diff; run `git diff --check` and commit.
- [ ] Push tested branch state to `origin/main` using normal fast-forward push; inspect upstream divergence before attempting and never force-push. Verify remote main SHA matches the tested commit.
- [ ] Report implementation, validation results, published commit and concrete mobile Lumiverse test steps without claiming real-provider validation not performed.
