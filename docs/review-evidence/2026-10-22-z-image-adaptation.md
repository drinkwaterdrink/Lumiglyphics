# beta.57 — Z-Image Turbo automatic prompt adaptation

Branch: Testing. Base: beta.56 (`75eaf78`).

## Report and reproduced failure

The supplied beta.56 screenshot correctly detects a live 1,200-character Z-Image ceiling but retains a blocked draft of 2,796 positive plus 118 negative characters. Detection alone was working. The full writer response and original draft are unavailable, so the precise user-runtime rejection is unconfirmed.

Local red tests reproduce two contributing defects: single-character fitting rejected reordered appearance facts because it required the complete original subject paragraph verbatim; visual-brief compilation inserted resolved attire twice. Automatic repair already ran, but its failure reason was not passed to the review panel.

## Changes

- Fitting preserves each single-character fact still present in the edited draft, allows fact reordering/punctuation changes, and deduplicates repeated leading `Wearing` clauses. It does not paraphrase away unique appearance facts. Ordinary rerolls retain existing exact-phrase protection; ensemble facts remain bound to their named owner.
- Single-character compilation includes resolved attire once. No saved appearances or shared style settings are migrated or overwritten.
- Exact known NanoGPT Z-Image Turbo, Turbo LoRA and Turbo image-to-image routes use positive-only automatic guidance. The writer translates essential exclusions into concrete positive direction. Base, unknown/custom routes, other providers and automatic-off behavior are unchanged.
- A bounded, sanitized adaptation failure is carried into request history and shown beside validation in reader/external review. Successful fitting clears the earlier failure. No image is dispatched over budget, and no extra paid image retries are introduced.
- Existing model output capability selection remains active; integration verifies 720×1280 for requested 9:16 on Z-Image Turbo. No unsupported sampler keys are injected.

## Source verification

Public [NanoGPT image metadata](https://api.nano-gpt.com/api/v1/images/models), read on 2026-10-22, lists 1,200 Unicode-code-point prompt characters for the three exact Turbo routes and supported sizes including `720*1280`. The extension conservatively measures JavaScript UTF-16 length for the combined positive/negative ceiling. It never treats tokens as characters. That endpoint does not advertise steps, CFG or a negative-support field.

The [official Z-Image model card](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) describes Turbo without CFG and its native Diffusers example uses guidance scale zero and nine inference steps (eight forwards). This supports positive-only automatic guidance; it does not establish that NanoGPT accepts native Diffusers sampler parameters. The [official prompt-enhancer source](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo/blob/main/pe.py) supports concrete visual descriptions and preservation of subject/action/text constraints. Extension rewriting additionally prohibits invented events and props.

## Verification

- Initial focused run: 24 pass, 3 fail, reproducing missing Turbo positive-only policy, strict single-character paragraph rejection and duplicate attire. After fixes: 27 pass, 0 fail.
- Full suite: **1,669 pass, 0 fail**, 8,073 assertions across 142 files.
- Full TypeScript check, production build, manifest/version verification and backend blocked-capability scanner pass.
- Existing Playwright model-prompt harness passes. Browser plugin is absent, so the established Playwright fixture fallback was used. The reported 2,914/1,200 blocked state displays its adaptation explanation; editing to valid positive-only wording enables generation and hides the obsolete failure. Existing budget persistence, manual caps, size controls, 320/390/1280 layouts, ten themes and repair actions remain covered. Screenshot inspected locally at `.cache/model-prompt-research/z-image-fitted-mobile.png`.
- Mock integration verifies one automatic writer call, preserved appearance, empty negative text, supported portrait dimensions and a bounded final provider request. Failed adaptation retains the complete draft and makes no provider image call. History tests verify failure retention and clearing on successful repair.

No paid provider generations were made. Physical Android keyboard/host integration and real model output quality remain unverified. Very large unique cast descriptions may still exceed a small endpoint budget; they remain explicitly blocked rather than silently truncated. Existing prepared drafts are preserved on update and can be fitted or prepared anew.
