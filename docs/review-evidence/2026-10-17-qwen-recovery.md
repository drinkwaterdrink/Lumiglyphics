# Qwen Turbo compatibility and recovery audit - beta.41

## Findings and fixes

- **Provider contract mismatch:** exact NanoGPT route `qwen-image-2.1-turbo` previously fell through to generic pixel sizing. A 9:16 selection could therefore prepare `864x1536`, which the reported provider rejected. Model preparation now uses 1K/2K resolution tiers and separate supported framing; explicit 2K is preserved. The supported ratio catalog is exact to this route and provider. Unsupported requested shapes use the closest catalog ratio before preview.
- **Native adapter boundary:** generated Qwen wire fields carry `resolution` and `aspect_ratio` through the existing serialized raw override. Manual preview size/aspect edits synchronize generated fields, internal markers stay out of the provider payload, and validation rejects unsupported reviewed values before a paid call. User-authored connection raw overrides are preserved and remain authoritative. Approved/held requests are not silently rewritten.
- **Recovery discoverability:** image error cards now offer Review picture, opening the current picture's existing prompt/retry controls without generating or retrying. Batch Try again remains available with its existing truthful scope. Retry scope notes have a full line, rather than squeezing beside buttons.
- **Editing stability:** image review now reports its open state to the host. Auto advancement is held and Skip stops while the panel is open; closing releases that hold. Chat reset and destruction release the panel state. Other holds still apply.
- **Mobile overlap:** rendered inspection reproduced the waiting-count text widening Image prompts over the error title and dismiss button. The launcher now fits the reserved space, with a small count badge and an accessible waiting-count label. Browser checks verify no intersection at 320 and 390 pixels; the settled screenshot was inspected.

## Sources

Verified 2026-10-17 against the [NanoGPT model page](https://nano-gpt.com/models/image/qwen-image-2.1-turbo) and its [public image catalog](https://nano-gpt.com/api/models?type=image): 1k/2k, default1k, ratios 1:1, 3:2, 16:9, 21:9, 9:16, 2:3, 3:4, 4:5. Inspected the pinned [native NanoGPT adapter](https://github.com/prolix-oc/Lumiverse/blob/3ca135a20a31f4ba18c8e96b24724cd73ad7c8eb/src/image-gen/providers/nanogpt.ts) and raw override helper already used for Anima/Klein compatibility. A mock of that adapter verified actual serialized Qwen size/resolution2k and aspect_ratio9:16, with no network generation.

## Audit boundaries

This pass traces model sizing, preview edits, the provider wire boundary, error actions, panel lifecycle and mobile recovery layout. It is not a complete re-audit of every extension subsystem. The Lumiverse artifact auditor flagged existing `chat_mutation` and `app_manipulation` permissions as needing justification. They support user-authored reply/choice submission and the visual-novel overlay/component overrides; no new permission, dependency, storage migration or background retry was added. The extracted host scanner reports no blocked capabilities.

## Verification

Observed RED/GREEN for Qwen sizing/edit validation, the review shortcut and the mobile launcher overlap. Focused sizing tests retain Anima/Klein and unrelated-provider guards. Real browser checks cover read-only error recovery, visible Qwen model guidance, modal visibility lifecycle, touch focus, frozen held edits, template preferences and layout. All-theme error dismissal and full settings browser suites pass.

Final verification: 1,493 isolated tests across 127 files plus 18 speech transport tests (1,511 total), 87 cold sandbox checks, strict typecheck, production build, bundle/dependency/version checks, extracted host capability scanner and restricted startup passed. Image-review, settings and all-theme error-control browser checks passed. No live Lumiverse host, physical Android keyboard or paid Qwen generation was used; live provider success remains to be tested with the user's connection. Release target is Testing only.

After updating, open Review picture and Retry this picture on an old failure to prepare a new approval preview. Existing failed/held request snapshots keep their old fields until explicitly replaced. Roadmap F2 presentation policies remain pending.
