> Implementation note: this initial proposal is broader than the first release. The accepted design in `docs/superpowers/specs/2026-10-10-image-review-design.md` and current README define shipped behavior. Model-specific visual controls and a prepare-all scheduler remain future work.

# Lumiglyphics image controls: initial proposal

Date: October 10, 2026, America/New_York.

Status: proposed direction for discussion. No product implementation or approved feature specification yet.

## User intent

The user wants more control over generated images, including seeing prompts before images generate, and is open to ideas for additional generation controls. The first design priority is making planned image requests visible, editable, and explicitly selectable while preserving the existing Lumiverse reading experience.

The user has confirmed that prompt review must be toggleable. Their immediate problem is unexpected images with no visibility into the prompts sent to the model. The first version therefore needs prompt inspection in both review and automatic modes, not just a pre-generation approval screen.

Recommended initial default: review on while tuning. This default is a recommendation; the toggle requirement is confirmed. Review should preserve reading and give a quick path to generate the current picture, without requiring approval of every possible future picture.

The user primarily uses NanoGPT and OpenRouter, switching among image models within those services. The design must prioritize these connections rather than assuming NovelAI. Lumiverse's public image API documents NanoGPT, provider schemas and live model lists; its current image-provider setup guide does not document an OpenRouter image profile. OpenRouter itself supports image generation, but the route exposed by the user's installed Lumiverse must be verified before promising compatibility or choosing an adapter. Text/planner connections and image connections are distinct.

## Recommended first version: Image Studio

Add an Image Studio accessible from the VN overlay and a native Lumiverse drawer tab. The overlay entry is important because the normal chat surfaces are hidden in VN mode. The drawer supplies persistent access; narrow screens use a full-width layout.

For each candidate picture, show the paragraph/scene it illustrates, the subject and environment, and whether it needs generation or can reuse an existing picture. Selecting a candidate opens:

- Positive prompt and negative prompt editors. For structured providers such as NovelAI V4+, distinguish the scene caption from character captions rather than suggesting one text box represents the entire request.
- Selected connection, resolved model and optional workflow.
- Supported provider settings, populated from the host's capability schema: for example seed, dimensions, steps, guidance and sampler where available.
- The selected reference image, reference source and relevant anchoring controls where supported.
- An expandable explanation of prompt components: style prefix/suffix, inferred character appearance, pose/action, camera and environment. Keep the compiled editable prompt authoritative; these explanations must not secretly overwrite a user's text edits.
- Generate this, Generate selected, Skip, Reset edits and Copy prompt actions.
- An always-available Inspect prompt action on generated pictures. Show the recorded extension request used for that result, including negative text, structured captions, settings and reference provenance. Do not reconstruct it from today's settings. Older imported/cached pictures without request records must say that the original request is unavailable.
- Edit and regenerate from that recorded request, retaining the previous usable picture until the replacement is ready. A failed replacement should leave the previous picture accessible.

Every edit should state its scope. Default to this picture only. A separate action can save a reusable preset; editing one picture must not silently rewrite the character's durable appearance, future scenes, or a host connection profile.

Keep the current valid stage picture while new pictures wait. Reading, choices, and typing should remain usable. Skipped images are an intentional decision, not a failed job or an invitation to auto-retry.

## Recommended toggle behavior

Provide a plainly labeled **Review before generating** toggle and remember it per user. Keep the prompt inspector available regardless of the toggle.

- **On:** prepare prompts and hold unstarted new image requests. Show the current paragraph's picture first, with Generate this as the primary action. Other candidates appear in a collapsible list with Generate selected and an explicit Generate all action. Do not open a blocking modal for every paragraph.
- **Off:** prepare and record each actual request, then dispatch automatically using the existing prioritization and concurrency limits. The user can inspect any resulting picture's recorded request and edit/regenerate it.
- **Switching on:** hold requests that have not been dispatched. Already dispatched requests remain visible as generating; toggling cannot undo them. A separate cancel action can use available cancellation support.
- **Switching off:** apply automatic behavior to future candidates. Previously held candidates remain held until the user explicitly selects Resume held images, Generate selected or Skip. Turning off the toggle must not unexpectedly launch an accumulated batch.

The recommendation combines manual review and automatic generation as two modes of the same request pipeline. Scene-boundary-only review can wait; it adds complexity without ensuring visibility into later prompts.

## Approaches considered

| Workflow | Behavior | Tradeoff |
| --- | --- | --- |
| Review first — recommended | Plan the reply, hold all new picture requests, then generate selected requests or approve the batch | Most control; adds an explicit action for each batch |
| Automatic with optional review | Preserve automatic pictures; a toggle holds future unstarted requests for editing | Less interruption; automatic mode can spend requests before inspection |
| Review at scene boundaries | Hold the first new picture of a physical scene, then allow later cues automatically | Less review work; later prompts still change without individual approval |

The first release should support the first two through the toggle above. Scene-boundary review is deferred. Every mode records request provenance so switching modes never removes the ability to inspect a picture.

## Preview and request integrity

Source baseline: `japolino/cue-living-novel@842d397d34bbb2952153f33739c8b13e70d5177b`.

In the current source, `startAssets()` reloads configuration, and the scheduler executor in `generateAssets()` compiles the prompt, resolves reference portraits and assembles effective parameters shortly before `spindle.imageGen.generate()`. A UI that independently formats a preview can diverge from that actual request.

The proposed change separates preparation from dispatch:

1. Resolve the source turn and selected connection/profile revision.
2. Use the real prompt compiler to prepare a request draft with model, workflow, prompts, parameters and reference provenance.
3. Let the user edit and select drafts without calling the image-generation API.
4. Validate and approve a draft revision.
5. Dispatch the approved extension request without recompiling its text or silently re-reading different settings.
6. Associate the result and recorded settings with that exact draft revision.

Automatic mode uses the same preparation and recording path, skipping the manual approval step. Persist the request record before dispatch and attach success/failure information afterward. Exclude credentials and raw reference-image bytes from inspectable request history; record safe reference identifiers and provenance instead. Retain exact requests for pictures still displayed or selectable, with bounded history for older discarded attempts. The inspector must distinguish the original generated request from any subsequent edits.

No image request should begin merely because the user opens the editor, changes a field, switches cards, or copies a prompt. Building a new scene plan may still use the existing text planner; the UI should distinguish that text-model activity from rendering an image.

The preview can accurately show what the extension passes to Lumiverse. Lumiverse subsequently merges connection defaults and performs provider-specific request conversion. Without a host dry-run request API, do not claim to show the byte-for-byte final upstream HTTP body. Display resolved defaults when exposed and identify host-managed transformations honestly.

A changed swipe, source fingerprint, scene revision or connection/profile revision invalidates approval. Old drafts may remain visible for reference, but must not generate into the current turn as if they still belonged to it. Validation and dispatch must remain scoped to the originating user and chat.

Reference capture is a special dependency: later requests may anchor to the first newly generated portrait. Their reference is unresolved before that portrait exists. Show that state explicitly. After the portrait arrives, the draft must be finalized for review, or an expressly approved dependency policy must govern it. A generic Approve all action must not hide the fact that later references are not yet known.

Cache and deduplication identity must include actual edited prompts, effective settings and resolved references. Mark cache reuse separately from a new render; Generate variation should bypass reuse intentionally. A seed alone does not determine reuse identity.

## Additional ideas worth considering

1. **Saved visual presets:** reusable prompt additions, negatives and supported settings for a style or a particular chat. One-picture edits remain separate from presets.
2. **Variations and image history:** retain previous generated images for a cue, record the request used, and let the user choose which image appears. Changing the displayed picture need not rewrite the chat or replan the story.
3. **Structured prompt controls:** edit clothing, expression, action/prop and background as fields, with an expandable compiled-text view. Apply these as explicit local overrides, not automatic permanent character changes.
4. **Camera controls:** select portrait/upper-body/full-body framing and viewpoint. This is a later engine change because the present compiler fixes the camera and filters visible traits accordingly. Prompt text alone is insufficient.
5. **Live generation previews:** show intermediate frames/status for providers that advertise preview streaming. Current Lumiverse docs identify ComfyUI and SwarmUI support. This is an in-progress render preview, distinct from inspecting a prompt before rendering starts.

The recommended first release prioritizes the review toggle, always-available request inspection, local prompt editing, provider controls, reference visibility and selective generation/regeneration. It retains the current picture when replacing it; a full image-history gallery and saved presets can follow. Freely changing cameras or drawing multiple characters should be separate changes to the visual contracts.

The cause of the user's unexpected images is not yet established. Prompt text, structured captions, inferred character appearance, style/negative additions, references and provider settings are candidates to inspect, not confirmed causes. Source review alone cannot diagnose the user's actual failed requests. A recorded example and the active provider will guide that investigation.

One concrete source finding: the upstream default positive prefix is `masterpiece, best quality, anime visual novel scene`; `describeCue()` fixes `promptStyle: "anima"` and defaults its syntax to `comfyui`. This confirms an anime/tag-oriented baseline, not that the user's active configuration uses that prefix or that it caused a particular failure. Exposing these additions and allowing edits is directly relevant when trying different image models. A future prose/tag-format selector should be explicit, model-aware and compiled from the same scene description; do not silently rewrite approved text or equate a service name with one preferred prompt format.

Provider parameter schemas may describe the service as a whole rather than every model. Validate against model-specific capability information where available. Otherwise indicate unknown support honestly, preserve exposed host controls and allow reviewed advanced overrides; do not present negative prompts, sampler, steps or reference strengths as universally effective. Model/profile changes invalidate prior approval and require revalidation.

## Code areas affected

| Area | Expected responsibility |
| --- | --- |
| `src/backend/runtime/images.ts` | Extract shared request preparation; dispatch approved requests; maintain provider/reference and cache correctness |
| `src/backend/runtime/controller.ts` | Hold new requests; route prepare/edit/approve/skip; preserve turn ownership and reading delivery |
| `src/backend/runtime/storage.ts` | Persist draft revisions, local overrides and request/result provenance in user storage |
| `src/protocol.ts`, `src/shared/contracts.ts` | Validate drafts, revision IDs, scoped actions and results |
| `src/config.ts` | Review mode and settings defaults |
| `src/frontend/host/controller.ts` | Studio entry, drawer lifecycle and targeted state routing |
| New frontend image-studio modules | Candidate list, editors, supported settings, selection and status |
| Existing scheduler and cache tests | Ensure held/skipped requests cannot dispatch and edited requests cannot reuse mismatched results |

A request awaiting review is not a scheduler job that should start automatically. Draft lifecycle should be explicit and separate from existing queued/generating/generated/browser-ready job lifecycle unless the final specification deliberately extends the latter.

## Acceptance checks for the eventual implementation

- Holding a newly planned reply produces zero image API calls before approval.
- Review off still records the dispatched request and exposes it from the generated picture.
- Review mode is captured at batch start; toggle changes apply to the next batch and never silently dispatch old held drafts.
- Original requests remain distinct from edited drafts, and missing historical records are reported accurately.
- Failed replacements preserve the previously usable picture.
- Generating a selected draft sends its approved text/settings exactly once.
- Editing one candidate does not change other candidates, durable identity or host connection defaults.
- A failed request retries only after explicit user action; double-clicks do not duplicate requests.
- Changes to source/profile/references cannot silently replace an approved request.
- Swiping, switching chats or closing the view prevents stale dispatch/display and preserves existing cancellation safeguards.
- Reading works while images are held, skipped or failed.
- An edited request does not hit an incompatible cache entry; explicit variations bypass reuse.
- Unsupported provider controls are omitted or clearly unavailable.
- Same-caption/different-reference requests remain distinct, including structured NovelAI captions.
- The UI can recover draft state after frontend reopen without automatically rendering it.
- Existing tests, full build, backend scanner checks and real Lumiverse install/runtime checks still need execution once product code exists and the required toolchain is available.

## Decisions needed before implementation design

- Should the first version include only raw prompt editing, or also structured local subject/environment overrides?
- Confirm the recommended initial default of review on, with current-picture-first generation and an always-available inspector.
- Verify which image connection route the installed Lumiverse exposes for OpenRouter before finalizing implementation support.

The review toggle and NanoGPT/OpenRouter usage are confirmed. The remaining points concern the final design and integration verification.

## References

- [Pinned image runtime](https://github.com/japolino/cue-living-novel/blob/842d397d34bbb2952153f33739c8b13e70d5177b/src/backend/runtime/images.ts)
- [Pinned backend controller](https://github.com/japolino/cue-living-novel/blob/842d397d34bbb2952153f33739c8b13e70d5177b/src/backend/runtime/controller.ts)
- [Lumiverse image API, parameter schemas and preview streams](https://docs.lumiverse.chat/backend-api/image-generation/)
- [Lumiverse image connection setup](https://lumiverse.chat/guides/image-generation/setup/)
- [OpenRouter image API and per-model/endpoint capabilities](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [Existing upstream review](./UPSTREAM_REVIEW.md)

This proposal does not resolve the earlier baseline toolchain or upstream licensing questions, and does not publish or change extension code.
