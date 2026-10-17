# NanoGPT model output sizing - beta.38

The user reported Anima resolution errors and FLUX.3 Klein rejecting `864x1536`. They confirmed Template / connection default succeeds, but want portrait output near 9:16.

## Verified causes and behavior

- The generic NanoGPT fixed-shape path sent pixel dimensions to every model. Klein Base accepts five square sizes only. Its exact route now preserves a supported saved square size, or uses 1024x1024, before preview. The preview explicitly says 9:16 is unavailable. Other Flux/Klein routes and other providers do not inherit this rule.
- Current Anima short IDs (`anima/text-to-image` and its LoRA variant) were missing from the existing rules. Short/full IDs now use `size: "1k"` or `"1.5k"`, plus a separate aspect ratio. Exact 9:16 is supported for text-to-image. Nonstandard pixel proportions use the closest published ratio before review. Anima image-to-image retains its reference's aspect ratio.
- Manga defaults previously replaced a supported saved resolution with generic portrait pixels, losing Anima's higher tier during later normalization. Model-aware template defaults preserve supported Anima tiers and Klein square sizes. Explicit per-picture fields and custom raw overrides keep their existing priority.
- Lumiverse's native adapter forwards `size` and deep-merges `rawRequestOverride`, which must be JSON text. Our generated object caused `rawJson.trim is not a function` in a local probe of the native helper. The provider boundary now serializes object overrides without changing their values, while keeping existing strings unchanged. Internal markers are omitted from the wire request.
- Reviewed invalid shapes fail locally without an image request or automatic paid retry. Raw size and optional resolution are checked independently: neither can mask an invalid outgoing size, including explicit null. Raw null aspect ratio cannot conceal the visible 9:16 setting. Custom raw values are never silently rewritten.
- The preview notice describes visible fields because private raw overrides are excluded from history/editor payloads. Connection overrides can change those fields; the notice says so.

## Sources and native adapter probe

Public source inspected on 2026-10-17, pinned Lumiverse revision `3ca135a20a31f4ba18c8e96b24724cd73ad7c8eb`:

- [Native NanoGPT adapter](https://github.com/prolix-oc/Lumiverse/blob/3ca135a20a31f4ba18c8e96b24724cd73ad7c8eb/src/image-gen/providers/nanogpt.ts): constructs size, applies the raw override; model discovery returns IDs/labels rather than per-model dimensions.
- [Native merge helper](https://github.com/prolix-oc/Lumiverse/blob/3ca135a20a31f4ba18c8e96b24724cd73ad7c8eb/src/image-gen/types.ts): JSON text, protected keys and deep merge semantics.
- [Spindle image bridge](https://github.com/prolix-oc/Lumiverse/blob/3ca135a20a31f4ba18c8e96b24724cd73ad7c8eb/src/spindle/worker-host-image-gen-api.ts): merges profile/request parameters without converting object raw overrides.
- [Anima](https://nano-gpt.com/models/image/wavespeed-ai/anima/text-to-image) and [Anima LoRA parameters](https://wavespeed.ai/zh-CN/models/wavespeed-ai/anima/text-to-image-lora): resolution tiers, aspect ratios and reference framing.
- [NanoGPT Klein Base](https://cake.nano-gpt.com/models/image/blackforestlabs/flux-3/klein/base/text-to-image): square sizes 768, 1024, 1536, 2048 and 4096 pixels.
- [Spindle image-generation API](https://docs.lumiverse.chat/backend-api/image-generation/): provider-level capability schemas and ID/label model discovery. No exposed per-model schema permits reliable universal automatic sizing.

Ignored `.cache/model-sizing-research/` holds the downloaded adapter/helper and mocked probe. Only the provider-error import is stubbed; actual generation body construction and native raw merge run. Fetch is replaced entirely. RED reproduced the object `.trim` failure; GREEN checks three Anima/Klein payloads, expected size/aspect, one image each, no internal marker, and no network request.

## Verification

- Full isolated suite: 1,477 passed, zero failed, across 125 files. Separate speech transport: 18 passed, zero failed. Total 1,495 tests.
- Cold contract/storage/controller validation with Function/eval disabled: 87 passed.
- Mobile image-review, image-template settings and per-picture/batch recovery browser checks passed. New tests verify visible known-model limits and stale-notice removal; Anima/Klein screenshots at 390x844 were inspected.
- Strict typecheck, production build, bundle/version/pinned-dependency checks, extracted host scanner (no blocked capabilities) and full host sandbox startup passed.
- Native adapter probe: three mocked provider payloads passed, zero network calls.
- Fresh independent review found a raw resolution/size masking case and a notice wording issue. RED/GREEN follow-ups close masking and explicit-null size/aspect cases; final review reported no remaining Important issues.

Focused regressions cover aliases, closest ratio, immutable preparation, provider separation, all supported Klein sizes, raw override preservation/serialization, reviewed invalid shapes, conflicting/null raw fields, default-profile model freezing and Manga tier retention.

No schema migration, permission or dependency changes. Existing saved art, failed jobs and held approvals remain intact. Prepare a new preview or Retry this picture to apply new sizing to an older request. No live paid-provider generation, user's installed Lumiverse version, or physical Android keyboard/device was tested. Other model-specific requirements remain provider-dependent; this is not a universal compatibility guarantee. The next independent roadmap package remains F presentation rules.

Local Bun is 1.3.14 while the repository declares >=1.4.0; browser verification uses the existing Node runner. No root install or lockfile rewrite was performed.
