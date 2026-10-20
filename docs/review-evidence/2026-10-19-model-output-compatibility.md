# beta.52 — model output compatibility and review controls

## Scope

Continue the approved model-aware image pipeline with published output sizes and clearer
per-picture controls. Preserve templates, shared styles, existing shape preferences, manual
raw overrides, held request snapshots, saved images and prompt budget controls.

## Behavior

- NanoGPT discovery now parses bounded size/ratio enums alongside prompt limits. A verified
  239-route catalogue snapshot backs unavailable discovery. An unavailable metadata fetch
  remains optional enrichment; it does not block reader startup or discard saved turns.
- Choose the closest published framing before review, then the closest existing pixel area
  when equal shapes offer multiple sizes. Keep a valid tier where possible and prefer 1k
  when a tiered route has no valid selected tier. Do not invent image dimensions.
- Ratio-valued size fields (Grok/Muse), pixel-size lists (Flux/Qwen/Z Image/Seedream) and
  resolution tiers with separate ratios (Nano Banana/MiniMax/Qwen) retain their API format.
  Auto-only sizes explicitly state that the model controls the shape.
- Both published Flux 3 Klein text-to-image variants use square output. Known Flux 2 routes
  and the alternate Flux 3 route naming receive positive-only wording handling.
- Image size & framing in reader review exposes published choices separately from technical
  JSON. Local changes synchronize JSON and block invalid values without generating an image.
  The preparation receipt and current edited values remain distinct.
- Custom raw overrides are untouched. Outgoing size/resolution/ratio fields are validated
  before resolving approval and again at final dispatch. Null raw values cannot mask invalid
  fields. Internal generated-override markers are synchronized and removed at the boundary.

## Evidence

- Current public Lumiverse NanoGPT adapter inspected on 2026-10-19. It forwards `size` and
  applies a raw override; separate ratios therefore use `aspect_ratio` through the existing
  native override facility. Other provider-native parameter mappings are not inferred.
- Unit tests cover bounded metadata, every bundled record's persistence schema, nearest
  framing, resolution tiers, unknown formats, raw conflicts/nulls, live discovery and overrides.
- Integration tests inspect actual final extension dispatch for Flux 2, Flux 3 Klein, Qwen,
  Z Image Turbo, Grok Imagine, Muse and Nano Banana. Review tests verify invalid edits cannot
  resolve an approval or issue a paid request.
- Browser QA uses Node/Playwright because the Browser skill is unavailable and the local Bun
  Chromium launcher stalled in prior checks. It checks size/ratio selectors, JSON synchronization,
  invalid-size blocking, mobile layout and absence of generation when changing controls.
  Screenshots are local ignored artifacts in `.cache/model-prompt-research/`.

Final checks:

- `bun test --parallel=4`: **1,634 passed, zero failed**, across 138 files.
- Full TypeScript check, production build and local extension capability scan passed.
- Node/Playwright model-prompt QA passed, including all ten reader themes at
  320/390/1280px widths and minimum 44px touch targets for the new selects.
- Expired live discovery is discarded after refresh failure, so dated fallback metadata
  is not presented as freshly discovered. The reader continues with conservative defaults.

No paid generations or physical Android testing were run. Public host-source inspection does
not prove the user's installed host version. Exact native tokenization, additional providers
and controlled paid image comparisons remain follow-ups.

Sources: [public NanoGPT catalogue](https://api.nano-gpt.com/api/v1/images/models),
[NanoGPT size field](https://docs.nano-gpt.com/api-reference/endpoint/image-generation-openai),
[Lumiverse NanoGPT adapter](https://github.com/prolix-oc/Lumiverse/blob/main/src/image-gen/providers/nanogpt.ts),
[Lumiverse native overrides](https://docs.lumiverse.chat/backend-api/image-generation/),
[FLUX 3 parameters](https://docs.bfl.ai/guides/prompting_unified_technical).
