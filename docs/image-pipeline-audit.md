# Image generation and prompt refinement audit — 2026-10-22

Scope: the existing Testing pipeline, from planned visual evidence to compiled templates, selected-model capabilities, automatic fitting, review/rewrite, references, final dispatch, recovery and image reuse. This is a source/fixture audit, not a claim of optimal results from every real model.

## Intended experience and implementation approach

The reader should create accurate, model-appropriate visual briefs, preserve each character's appearance, explain limits honestly, and offer one obvious next action. It must retain manual budgets, custom styles, templates, image parameters and references. A failed text operation should leave the usable picture/draft available. Image requests must remain explicit and cancellation must stay final.

The refinement keeps the existing pipeline and interfaces. It replaces fragile identity copying during rewriting with locally expanded identity anchors, shares adaptation between initial preparation and template replacement, separates useful-detail targets from hard limits, and promotes the repair control in blocked states. No additional generation provider, dependency or autonomous image-evaluation loop is introduced.

## Findings and disposition

| Priority | Finding | Change / remaining boundary |
|---|---|---|
| High | Ensemble verification interprets any other character-name mention as a new ownership boundary. Descriptions such as “standing beside Jon Reed” can trigger a false rejection. Literal fact copying also rejects harmless paraphrases. | Writer receives immutable identity markers; local expansion supplies the exact owned blocks, followed by measurement. Legacy full-prompt responses still undergo the existing strict checks. |
| High | Metadata facts were considered present anywhere in the draft, allowing an edited trait from another person to restore a stale appearance. | Explicit `Name:` rows in the current draft take precedence. New traits in edited rows become locks; stale traits belonging to somebody else are not restored. Unstructured prose remains less certain than named rows. |
| High | A large provider context causes planning to aim close to the entire ceiling, and writer output allowances scale with it. | Automatic targets use roughly the established 3,000-character useful-detail range; larger real identity blocks can raise the rewrite target. Explicit manual targets remain honored within verified ceilings. Length is never proof of fidelity. |
| High | Template replacements did not receive the initial preparation's automatic fit pass. | One `adaptImagePrompt` policy handles both paths, preserves failed drafts, bounds text attempts and never calls the image provider itself. |
| High | Failed template preparation retires the held draft and rejects its picture. The frontend can retain its rebuilding flag. | Retire the old approval only after preparation succeeds; restore it on non-cancellation failure. Clear rebuilding state on an error. Cancellation cannot resurrect a draft. |
| Medium | Fit is buried in a disclosure, while the footer can offer a quick image retry for the invalid draft. | Promote Fit to the persistent footer for budget or positive-only violations; hide the competing quick retry in that state. Return Rewrite to tools when valid. |
| Medium | A prompt error clears the frontend's queue view even though backend image work remains queued. | Retain the last confirmed queue view; queue events remain authoritative. |
| Medium | `/imagine/` family detection labels Animagine as Grok. | Detect the Grok brand without matching the substring in Animagine. No new capability is inferred for unknown routes. |
| Medium | Rewrite input repeats stale scene/action metadata beside edited prompt text. | Supply current prompt/negative fields and identity anchors; omit stale scene/action metadata from rewrite context. |
| Medium | Prompting advice varies materially by model. | Refined Anima, Gemini/Nano Banana and Grok guidance using primary sources; retain family-specific FLUX, Qwen, Z-Image, GPT Image, Seedream and generic guidance. Variant-unknown MiniMax/Muse routes remain conservative. |

## Pipeline coverage and retained contracts

1. **Context and cast resolution:** `visual-brief.ts`, `prompt-protection.ts`, template compiler and associated identity/pipeline tests. Appearance and outfit evidence remain scoped to their subject. No change to tracker permissions or revealed knowledge. Metadata can still contain imperfect planner evidence; this is not visual ground-truth verification.
2. **Templates and shared styles:** existing placeholders and source fields remain inspectable. Fitting preserves visual intent and identity; it does not edit saved styles or templates. It cannot guarantee every artistic nuance survives a small hard limit.
3. **Model detection:** `image-prompt-profile.ts`, capability discovery and exact-route snapshots. Live NanoGPT metadata is public, cached and bounded, with no prompts/credentials forwarded. Unknown limits stay labeled fallback. Unicode-code-point limits are conservatively enforced using UTF-16 character counts. Tokenizer limits remain separate.
4. **Dimensions and parameters:** published size/ratio selection and provider-specific adapters run before review. Raw overrides remain authoritative and are validated. No guessed universal CFG, sampler, step count, premium quality tier or expensive resolution is inserted.
5. **Text fitting:** `prompt-rewrite.ts`, `prompt-anchors.ts`, `prompt-adaptation.ts`. Identity expansion is local; expanded positive plus negative text is checked against the frozen model ceiling. Missing, duplicate, negative-field or unknown identity tokens fail explicitly. Writer attempts stay bounded at two; no blind truncation of unique facts.
6. **Review and recovery:** `ImageReviewGate`, reader inspector and external requests. A draft waits for approval when required; failures preserve it; synchronous claims prevent duplicate approvals. Independent picture gates and retry queues remain separate. Closing/cancellation rejects late work.
7. **Final dispatch:** `images.ts` checks the frozen budget, raw prompt/model overrides, connection revision and supported output fields before `imageGen.generate`. Internal profiles and identity tokens are not image-provider fields.
8. **References and reuse:** existing identity/reference resolution, provider reference adapters, image fingerprints, admission checks and saved/cache provenance remain authoritative. Rewritten/edited requests do not populate the original compiler cache identity. Existing tests cover these flows; no new cross-character reference sharing or speculative image recovery is introduced.

## Research and model policy

Primary sources were checked on 2026-10-22:

- [FLUX.2 official guide](https://docs.bfl.ai/guides/prompting_guide_flux2): coherent subject/action/style/context, explicit relationships and positive descriptions. Native prompt upsampling exists on particular BFL APIs; this does not prove an equivalent NanoGPT option is forwarded. No blanket upsampling flag is enabled.
- [Anima official model card](https://huggingface.co/circlestone-labs/Anima): tags and captions can be combined; preserve named appearances and distinguish Aesthetic/base variants. It is illustration-focused, with limited long-text fidelity. Variant-specific score tags are not guessed.
- [Z-Image official model card](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) and [official enhancer](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo/blob/main/pe.py): concrete visual detail and immutable core intent; Turbo's native no-CFG behavior supports positive-only guidance. Native Diffusers controls are not assumed to be hosted request parameters.
- [Qwen official project](https://github.com/QwenLM/Qwen-Image): generation and editing have distinct contracts; preserve explicit lettering/layout and identity requirements. A family name alone cannot establish a routed endpoint's limits.
- [Gemini image guidance](https://ai.google.dev/gemini-api/docs/image-generation): coherent descriptions, real reference roles and positive visual intent. Reference count, edit support and output tiers depend on the actual model route.
- [Grok image prompting guide](https://docs.x.ai/developers/model-capabilities/images/prompting-guide): explicit visual intent, composition, reference use and readable text instructions. Native API controls are separate from third-party forwarding.
- [GPT Image prompting guidance](https://developers.openai.com/api/docs/guides/image-prompting): clear visual specifications and organized constraints; no need to pad a prompt merely because the endpoint permits more text.
- [NanoGPT public image catalogue](https://api.nano-gpt.com/api/v1/images/models): refreshed live. Examples: Z-Image Turbo 1,200 code points; Qwen Image 3/3 Pro 800 code points; Qwen Image 3,000 UTF-16 units; Nano Banana 2.1 50,000 code points. Many Anima, FLUX, Seedream, MiniMax and Muse routes publish no prompt ceiling. Null is unknown, not unlimited.

No third-party “magic words,” universal high-quality setting, arbitrary aesthetic score tags or undocumented model-specific sampler values are treated as verified optimization.

## Limits and follow-up work

- Runtime writer adherence is still required. A writer that repeatedly ignores the identity-marker contract is rejected; the extension retains the draft rather than submitting incomplete or contradictory data. Impossible locked appearance budgets now explain concrete counts before spending text tokens.
- Legacy unstructured prose can be ambiguous. Named editable identity blocks are more reliable than inferring ownership from free prose; broader structured cast authoring is a future improvement.
- The existing ensemble compiler shares a bounded appearance reservation and reports condensation. This audit does not remove that pre-existing preparation limit or promise every long cast description fits an 800/1,200-character endpoint. Full appearance-priority editing is a separate improvement.
- Exact scene/action/style/lettering fidelity remains partly writer/model-dependent; local length/identity checks do not prove semantic equivalence or correct pixels. Reference images are not supported equally by every model.
- A model-by-model image quality benchmark would need explicit representative prompts, real model calls and human comparison. No paid image calls or claims of measured quality gains are part of this release.
- Android soft-keyboard behavior, actual host/provider request forwarding and final output quality require real-device/provider testing. Browser fixtures and unit mocks cannot certify those layers.

Release verification and exact commands: [beta.58 evidence](review-evidence/2026-10-22-image-pipeline-audit.md).
