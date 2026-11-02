# Lumiglyphics Main-3-GPT independent audit and design brief

Date: 2026-11-01. Audited commit: `b0f5f5a594f4f6310a491b3452b388b91afdabfe`, version `0.2.0-beta.109`.

## Scope and evidence

Reviewed all three supplied texts: the evidence-oriented audit, the five-phase audit, and the response/master plan with 20 suggestions. Verified against a fresh, isolated clone of `Main-3-GPT` in `.codex-attachments/main3-audit-20261101`. The main checkout remains `Testing` at beta.74; source findings below refer to Main-3-GPT, not that checkout. No product code changed, dependencies installed, image providers contacted, commits made, or pushes performed.

Fresh checks on the audited source:

- Installed TypeScript compiler: `node ../../node_modules/typescript/bin/tsc --noEmit`, exit 0 from the audit clone. Dependencies resolved from the existing ancestor checkout; this is not a clean-install reproducibility check.
- Targeted offline suites: `bun test --isolate` with `presentation-timeline.test.ts`, `entity-projection.test.ts`, `system-one.test.ts`, `image-loader.test.ts`, `shared/cast-composition.test.ts`, and `enrich-and-versions.test.ts`: **39 pass, 0 fail, 77 assertions**, exit 0.
- Scratch offline probes in `.codex-attachments/main3-audit-evidence.ts`: actual System One request construction with mocked IPC, protocol validation, projection delta overflow, and actual timeline size. These probes are audit evidence, not committed regression tests.
- Skill artifact scanner: reported absent `dist` entry files in the unbuilt clone and permission-review reminders for `chat_mutation`/`app_manipulation`. Absent bundles in a source clone are not evidence of a broken release. These permissions have plausible existing uses; no blanket removal recommended.
- Did not run full Main-3-GPT suite, production build, screenshot/browser/device checks, live Spindle installation, or paid APIs. Earlier beta.74 tests are not evidence for this branch. Installed Bun is 1.3.14 versus repository requirement >=1.4.0; fix toolchain before release verification.

## Independent findings

### A01 — High: System One never offers named speakers

`src/backend/runtime/system-one.ts:185`: the criteria builder maps every name other than `unknown` to `[]`. Those entries become an undefined-valued key that disappears in JSON. Offline request capture yielded exactly `{"unknown":"The speaker cannot be determined"}` even with `Mira` in the name list. The response validator permits names, but the request does not offer them.

Fix: emit a valid criterion for every offered name and Narrator. Test serialized outbound criteria, not just mocked answers. Preserve unknown/narrator/nameplate semantics.

### A02 — High: presentation has two independent all-or-nothing cliffs

`src/backend/runtime/entity-projection.ts:47,145,159,165` and `src/frontend/stage/dossiers.ts:66`:

- The 65th state change sets overflow and drops the entire projection. A scratch fixture with one NPC and 64 changes returns presentation; 65 returns undefined. Scene-cast changes count too. This is independent of payload size.
- Full entities, facts, source metadata and state are repeated in each snapshot. An actual 60-paragraph, six-NPC, six-fact, 40-character-value timeline serialized to **969,137 characters** with this fixture, exceeding the 512,000-character guard. This is a synthetic stress fixture, not a measured typical story.
- There is also an explicit >256-paragraph projection rejection, although primary TurnPlan paragraphs do not have that ceiling. Facts/entities have separate budgets. Distinguish intentionally bounded enrichment from losing everything already valid.

Growth is paragraphs multiplied by accumulated entity/fact state; it can approach quadratic when facts accumulate with paragraphs, but is linear in paragraphs for a fixed entity/fact set. The first audit's blanket quadratic statement needs that qualification.

Fix: compact versioned projection with bounded dictionaries, reveal-anchored facts and sparse state changes; cursor selection shared by frontend/backend. Fix wire and frontend caps as well as persistence. A compact disk format expanded into the old huge IPC payload alone does not solve the frontend rejection or allocation cost. Report omitted optional enrichment explicitly; never invalidate primary story/jobs.

### A03 — High: restoration accepts an arbitrary image reference and overstates readiness

`src/backend/runtime/controller.ts:1412-1468`, `src/protocol.ts:45,272-289`, `src/backend/runtime/storage.ts:761`:

- Restore looks up the selected job but uses `request.imageId` and `request.imageUrl` without requiring them to match its saved version list.
- The request does not identify swipe/revision/version ID, and restoration's epoch is only checked against intake changes; pending work on the same job is not explicitly superseded here.
- Restore writes `browser_ready` and `readyAt` before the browser loads the restored resource. Other replacement code also writes readiness early (`controller.ts:1391`); audit both paths.
- Saved previousVersions is accepted as an arbitrary object, with no array/entry bounds; malformed optional history can reach rendering, and normal history grows without a retention policy.

These are code-confirmed contract gaps. Cross-user image access and a provider-completion overwrite were not reproduced; do not label them demonstrated exploits/data loss.

Fix: bounded schema; select by saved version ID under full turn/job identity; backend resolves image fields; make restore atomic with same-job operation ownership so old completions cannot overwrite it. Restored assets become `generated` until a browser acknowledgement. Preserve source/prompt provenance and a deliberate, documented history retention policy.

### A04 — High: guidance and enrichment differ by review state

`src/frontend/image-review/studio.ts:869-921`: for a held review the studio sends `vn_enrich_image_prompt` with guidance; for a completed/non-review request it instead sends `vn_prepare_image` with `regeneratePrompt: true`, omitting guidance and enrichment semantics while displaying an enriching notice. Direction can therefore be lost for this existing UI path.

Separately, `src/protocol.ts:277` rejects `guidance` on `vn_regenerate_image_prompt` despite its declared type and handler accepting it. Offline validation: without guidance true, with guidance false. That mismatch is latent unless a sender includes guidance; it is distinct from the currently wired enrich bug.

Fix: explicit prepare/enrich operation contracts, bounded guidance schema, identical behavior for held versus completed artwork, full identity checks and no provider-image call until approval. Do not rewrite story themes or descriptions.

### A05 — Medium: dossier art can use future paragraphs

`src/frontend/stage/dossiers.ts:99-102`: when no ready asset exists at/before the cursor, the visual resolver falls back to all ready turn assets, including later paragraphs. It can show a later portrait/location image while the facts remain reveal-gated.

Fix: keep art cursor-bounded too. Show unavailable art rather than revealing a future beat. Audit subject/location compatibility separately from image availability. Code-confirmed path; no browser reproduction performed.

### A06 — Medium: history thumbnail interpolates an unescaped URL

`src/frontend/image-review/studio.ts:1189-1193` puts `ver.imageUrl` in an HTML attribute. The single-line guard in `src/frontend/dom/innerhtml-guard.test.ts` misses it, and whole-line exemptions can hide unsafe neighboring expressions.

Fix: DOM creation and property assignment for version thumbnails plus bounded trusted image-reference handling. Use syntax-aware checks or narrowly scoped fixtures for multiline sinks; regex scans are not a complete proof of HTML safety. Malformed optional history and restore validation belong in the same fix family. Injection sink confirmed; hostile persisted payload/browser execution not reproduced.

### A07 — Medium: cast loader ignores the canonical image route

`src/frontend/stage/cast-stage.ts:103-105` reads `asset.imageUrl` only; `src/shared/cast-composition.ts:16` permits imageId-only assets. This can leave Loading portrait indefinitely. It also skips the same-origin imageId route when both fields exist, so an unreachable legacy URL can fail where scene loading succeeds.

Fix: reuse the ordered candidate list, terminal unavailable state and operation cancellation, preserving explicitly supplied display-art precedence. Test ID-only, stale URL plus valid ID, failures and switch/disposal. ID-only data is currently a latent compatibility case, not a proven common writer output.

### A08 — Medium: System One coverage and request failure reporting are incomplete

`system-one.ts:176-211`: relevance ranking already exists; alphabetical-only selection claim is false. Remaining limits are 24 paragraphs, 3,000 characters per paragraph and a 65,536-byte request cap. Fixed seven-paragraph batches plus candidate descriptions can exceed that byte cap. Promise.all discards the combined result if one batch fails; sibling calls may already have been sent. `planner.ts:2237-2240` catches failure and continues with the story-reader path, so this does not necessarily break turn planning.

Fix: prebuild and byte-measure every batch before sending any; bound concurrency and total deadline; expose truncation, missing answers, actual sent requests and partial/failed usage. Do not claim `answered` simply because a paragraph was submitted. Preserve the conservative continuation rules. Never silently add paid retries or raise limits without budget controls.

### A09 — Medium: regex work is still unbounded on the UI thread

`src/shared/display-rules.ts`, `src/frontend/stage/rich-text.ts:381-395`: static safety screening is useful but does not establish a runtime deadline. Accepted overlapping adjacent quantifiers can still be slow. Do not run malicious timing probes on the UI thread.

Fix: once-per-turn/settings-generation worker evaluation with a real termination deadline, bounded queue/output, stale-result rejection and original escaped-text fallback. Keep display transformations separate from canonical planning source. Preserve JS regex semantics; do not quietly substitute a reduced regex language. Confirm Spindle worker/CSP support before choosing the execution location.

### A10 — Low/Medium: UX duplication and small resource issues

- Studio has duplicate retry/regenerate controls (`studio.ts:1033,1237`) and enrich entry points. Consolidate behavior and labels, retaining clear text-token versus image-generation actions.
- `image-loader.ts:84-87`: decode timeout is not cleared after early decode completion. Loaded-image decode rejection is already caught and timeout already bounded; the five-phase audit's hard decode deadlock claim is contradicted by this code.
- Large files justify seam extraction, not automatic feature rewrites: vn-stage 3,228 lines; planner 2,799; settings/panel 2,507; controller 2,284. `aperture-theme.ts` is already 49 lines.

## Where the supplied audits need correction

| Claim/proposal | Independent decision |
|---|---|
| Presentation size cliff | Confirmed; fix delta overflow and wire/frontend representation too. No measured 85% guarantee. |
| Four concrete black-screen mechanisms | Hypotheses; require browser failure/race fixtures. Previous image survives load failure, decode is optional/bounded, cast composition rejects missing background/full-scene mismatch. |
| Relevance-ranked poses/audio | Already implemented; fix speaker criteria and coverage instead. |
| 12 serializers | Current map has **11 dialect keys and 10 serializer functions**; NovelAI aliases Anima. Test the registry dynamically, not a hardcoded 12. |
| Shot placement and FLUX prose | Already implemented; improve shared subject selection and verify end-to-end serialization. |
| BGM speech ducking with a 420 ms ramp already shipped | Partly true. Presentation attenuation has a 420 ms ramp; `setSpeechDucking` itself steps immediately. Smooth that independent factor without compounding attenuation. |
| Weather overlays | Already derived from `mergedEnv.weather` (`planner.ts:2465`). Extend precedence, clearing and location transitions, not a duplicate weather classifier. No place-tag schema is established. |
| Diegetic documents | Already have letter/journal/phone/terminal styling and reveal-gated text. Preserve; targeted visual QA before extra styling work. |
| Settings are 22 flat routes | 22 entries, but already hierarchical. Improve home grouping/search while retaining route IDs, aliases, drafts and Apply behavior. |
| Typewriter rAF / spring missing | Timer is setInterval and includes pauses/hidden-tab handling; drawer curve exists. Test actual motion before retuning. |
| Layered facial sprites without new cost | Not generally possible from flattened art. Reuse compatible complete portraits first; generating layers/variants is explicit budgeted future work. |
| Relationships from presence/outfits/expressions | These show observations, not affection/trust. New tracker needs source-backed relationship statements or explicitly labeled unknowns. |
| Offline PWA/service worker | No existing implementation or verified Spindle support. Data saver is feasible independently; offline reading needs a separate platform investigation. |

## User-selected suggestion scope and design decisions

| Number | Plan decision |
|---|---|
| 2 Resume card | Include. Existing exact reading position stores a key/index, not a recap. Use an already-revealed excerpt and location/speaker, no invented/model-generated summary. |
| 3 Speech read-along | Include. Existing TTS returns a Blob, not word timings. First ship truthful paragraph/sentence highlighting; accurate words require a supported alignment contract. Never fake exact words from elapsed-time estimates. |
| 5 Location BGM | Include as a selectable music policy. Preserve current cue-driven default. Location policy changes music on a location transition or explicit user choice, without repeatedly restarting the same track. |
| 6 Weather particles | Include as completion of existing weather behavior: explicit effects/manual preferences win; weather stops indoors/when cleared according to established state. No extra classifier. |
| 7 Absent cast dimming | Include as an opt-in remembered-cast display, clearly labeled Off scene. Never count dimmed figures as present or feed them to image generation. |
| 9 Why this picture? | Include using structured cue/template/source/cache diagnostics, not raw private model reasoning or unrestricted debug logs. Say when a reason was not recorded. |
| 10 Compare versions | Include after version-history validation. Accessible slider plus side-by-side mode, same-job compatible versions, explicit Restore. Comparing generates nothing. |
| 11 Image spend ledger | Include counts and known usage. Failed/time-out requests may still be billable; unknown prices stay unknown. Distinguish provider attempts, results, retries, held requests, cache hits and restores. |
| 12 Inline prompt lint | Include. Pure shared lint module or backend-prepared diagnostics; do not pull backend runtime code into browser bundle. Warnings advise without changing creative content. |
| 13 Undo/redo | Include. Bounded per-turn/job/request edit history including positive, negative and parameter text; group typing and IME; reset history on identity change. |
| 14 Golden prompt tests | Explain and recommend as engineering infrastructure: save representative expected serializer output, then flag unexpected wording/order/anchor changes. No runtime UI, model calls or generation cost. Include in the quality packet as a recommendation, not a reader feature the user explicitly selected. |
| 15 History scene scrubber | Include. Seek via validated source/revision/paragraph anchors and reveal-safe location/cast-change events. No artificial timestamps or chapters. |
| 16 Relationship/presence | Include, **toggleable, default off**. Presence and explicit relationship observations remain distinct. Disabled means no new relationship extraction/model calls/index maintenance. Existing story facts remain available. |
| 18 Hotspots | Explain only; not selected for implementation. Click a visible lantern/desk marker to prepare an editable action; never auto-send. Planner coordinates cannot prove alignment to generated pixels, and object-fit cropping changes positions. A reliable version needs image geometry/provenance validation or user-positioned markers, with an accessible list fallback. Planner-authored hotspots add output tokens even if clicks cost no calls. |
| 20 Data saver | Include, **toggleable, default off**, manual control always available. Suppress new automatic image starts/prefetch; do not discard held previews or cancel already-sent calls under a claim of avoided billing. Allow deliberate manual generation. Network auto-detection is optional/best-effort, not required for the toggle to work. |

Unselected suggestions 1, 4, 8, 17 and 19 are not feature commitments. Thus number shortcuts, per-speaker blips, mobile swipes, Moments and Prompt Recipes are outside this plan. Accessibility/focus/reduced-motion checks still apply to every selected feature.

## Architecture recommendation and alternatives

Recommend incremental, independently verified packets: correctness and contracts first; compact presentation second; editing and navigation third; selected immersive features fourth; behavior-preserving extraction last or alongside the exact seam being touched.

Alternatives considered: (1) enlarge caps and keep full snapshots: smallest patch but leaves repeated allocations, opaque overflow and wire growth; reject. (2) compact storage only and expand all snapshots over IPC: easier consumer compatibility but retains frontend cliffs; reject as the final solution. (3) compact shared representation with validated cursor selectors and bounded memoization: touches consumers but fixes persistence, IPC and rendering together; recommend. Keep old readers/persisted records through an explicit compatibility adapter and derived-cache regeneration.

Design calls above are recommendations for review, not claims the user approved their defaults. The task authorizes an audit and plan, not implementation. See the companion implementation plan for packets, files, interfaces and acceptance tests.
