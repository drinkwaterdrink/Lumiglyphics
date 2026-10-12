# Anima resolution and mobile prompt review

Testing release: 0.2.0-beta.11. Scope is the reported prompt editing/navigation and NanoGPT Anima resolution failures; the remaining reader roadmap is unchanged.

Mobile review now sits below the outer Back to chat navigation, with a 44px close icon and a visible build number. Editable textareas use text input mode and synchronous native focus in the tap/click gesture. Studio pointer/touch events stop propagation without preventing native defaults. Missing saved requests explain the need to Prepare editable preview first; completed/failed requests retain local editable replacement drafts. Existing saved requests and custom templates are preserved.

Known NanoGPT Anima text-to-image model IDs prepare with resolution tiers (`size: "1k"` by default, preserving `"1.5k"`) rather than pixel dimensions. Pixel proportions become a separate editable aspectRatio and a host-adapter raw aspect_ratio override. A private marker keeps generated overrides synchronized with review edits and is omitted from history/editor and provider dispatch. User/profile raw overrides remain authoritative. Resolution is validated before the provider call; no automatic paid retry occurs. Replacement drafts are normalized before their new preview, rather than silently changing approved settings.

References inspected: [official NanoGPT Anima model](https://nano-gpt.com/models/image/wavespeed-ai/anima/text-to-image), [official NanoGPT image API](https://docs.nano-gpt.com/api-reference/image-generation), and [official Lumiverse NanoGPT adapter](https://github.com/I-Sereya-I/Lumiverse/blob/main/src/image-gen/providers/nanogpt.ts). The host adapter sends size and accepts rawRequestOverride; the extension does not implement a separate provider transport.

Validation:

- Full isolated unit suite: 1,307 passed, 0 failed across 107 files. Speech transport separately: 18 passed, 0 failed. Total 1,325.
- Integrated reader-shell browser fixture with mobile viewport and touch emulation passed. Before the fix, the added navigation-clearance assertion failed. Positive, negative and parameters fields receive native focus on touch; drafts and event isolation remain intact.
- Request-path regressions verify supported Anima tiers before review, automatic mode, final dispatch and rejection of unsupported post-preview edits without a provider call. Generated aspect edits and preservation of custom raw overrides are covered.
- TypeScript, production build, manifest/build-label consistency, local bundle verification, Lumiverse skill backend scanner and git diff whitespace check passed.
- Independent read-only review found one generated-aspect override synchronization issue. It was corrected and regression-tested; follow-up review found no remaining material issues.

Limits: no live Lumiverse installation, physical Android IME or paid image API call was exercised. Browser focus is verified; physical keyboard appearance and actual Anima output require device/provider testing. Local Bun is 1.3.14, below the project's pinned 1.4.0 requirement; build/tests completed with the existing Node browser adapter and separate speech transport harness. The screenshot's older layout may indicate a stale installed frontend or old saved request; the visible version allows verification after updating and reloading.
