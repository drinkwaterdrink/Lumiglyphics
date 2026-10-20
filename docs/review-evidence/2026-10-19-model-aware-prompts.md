# beta.51 — model-aware image prompts

## Delivered

- Exact provider/model prompt profiles frozen per prepared request, shared by planning,
  semantic repair, review, regeneration, history and final dispatch validation.
- NanoGPT public model discovery, two-second wait, shared in-flight fetch, hourly cache,
  one-minute failure backoff, validated metadata and a dated bundled catalogue fallback.
  Discovery sends no story content, credentials or reference images.
- Conservative combined character ceilings for reported positive-field limits. Both UTF-16
  and Unicode code-point ceilings are enforced conservatively using UTF-16 counts. Unknown
  and native token limits are not represented as verified character limits.
- Family guidance for FLUX, Qwen, Anima, Z Image, Grok Imagine, GPT Image, Nano Banana,
  Seedream, MiniMax, Muse and NovelAI. Recognizing a family does not verify its endpoint limit.
- Optional manual combined budget, 256–50,000 characters. Published smaller ceilings still
  apply. Automatic wording can be disabled independently of the manual budget.
- Clearly blocked oversized/unsupported-negative drafts and model-profile receipts in reader
  review and external review. Legacy records retain their 3,000-character budget.
- Identified NanoGPT FLUX 3 routes translate essential negative constraints into positive
  scene intent via the writer, or remain blocked for editing. No blind truncation.
- Final dispatch reasserts the frozen policy, rejects conflicting raw prompt/model overrides,
  and strips internal profile metadata before calling the host.

## Verification

- `bun test --parallel=4`: **1,622 passed, zero failed**, across 137 files.
- Full TypeScript check passed; build and local extension bundle/capability checks passed.
- `node --experimental-strip-types scripts/test-model-prompts-browser.ts`: passed.
  Checks manual budget persistence, smaller verified provider cap, frozen review counts,
  disabled generation for oversized drafts, console health and 320/390/1280px layouts.
  Local screenshots: `.cache/model-prompt-research/settings-mobile.png` and
  `.cache/model-prompt-research/review-mobile.png` (ignored QA artifacts).
- Broader checks exposed stale stage DOM fixtures missing native root/focus APIs used by
  the existing cast overlay. Updated both test doubles; production cast behavior unchanged.
- The single-process Bun test run stalled at shutdown; the supported worker-isolated run
  completed. Bun/Playwright Chromium startup also stalled, so browser QA used Node, which
  launched the same installed Chromium successfully. No test failures were hidden.

## Limits and remaining work

No paid provider generations or physical Android tests were run. Discovery and documentation
cannot prove an artistic optimum, provider forwarding behavior in every host version, or exact
native tokenizer usage. Existing dimension normalization stays independent. Additional provider
adapters, exact native token counters and opt-in prompt comparisons remain roadmap work.

Sources: [NanoGPT discovery](https://docs.nano-gpt.com/api-reference/image-generation),
[public catalogue](https://api.nano-gpt.com/api/v1/images/models),
[FLUX structure](https://docs.bfl.ai/guides/prompting_unified_building),
[FLUX parameters](https://docs.bfl.ai/guides/prompting_unified_technical),
[Anima model card](https://huggingface.co/circlestone-labs/Anima),
[NovelAI guidance](https://docs.novelai.net/en/image/basics/).
