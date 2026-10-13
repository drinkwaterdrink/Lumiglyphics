# Shared styles and image prompting

Scene templates decide **what to show** (portrait, environment, action, detail, Manga page). Shared styles decide **how it is rendered**. Choose them in Pictures → Image prompts → Shared style and exclusions.

## Where the placeholders come from

| Placeholder | Source |
| --- | --- |
| `{{style}}` | Saved Style / positive prefix field (`promptPrefix`) |
| `{{suffix}}` | Saved Finishing details / positive suffix field (`promptSuffix`) |
| `{{negative}}` | Saved shared Negative prompt field (`negativePrompt`) |
| `{{subjects}}` | Resolved visual identity and current attire; supported saved appearance overrides take priority |
| `{{scene}}` | Planned scene environment, time, weather and persistent visual details |
| `{{action}}` | Prepared visual description, supported action/prop information and pose |
| `{{composition}}` | The selected template's framing and subject mode |
| `{{lighting}}` | Planned scene lighting |

The suffix is literal text you supply. It can appear anywhere its placeholder is placed, not necessarily last. Nothing in the story, card or tracker automatically fills it. Empty shared fields add nothing. If a template omits a placeholder, that shared field is not used. Placeholder-like text inside a field is not recursively expanded.

Example template:

```text
{{subjects}}
{{action}}
{{style}}
{{scene}}
{{lighting}}
{{composition}}
{{suffix}}
```

A short prefix might be `An unposed candid snapshot taken with a cellphone camera.` The suffix can supply rendering detail such as modest sensor noise, mild JPEG compression and ordinary phone optics. Identity, current events and setting belong in the scene brief, rather than being repeated in a style preset.

## Library and saving

Twelve built-in starting points: neutral, clean cel anime, Hunter × Hunter-inspired hand drawing, retro painted cels, monochrome manga, natural photorealism, candid cellphone, direct-flash cellphone, observational documentary, 35 mm film, watercolor and gouache narrative illustration.

Selecting fills editable drafts. Apply changes future preparations. Save preset stores a personal prefix/suffix/negative record immediately but does not apply the fields. Built-ins remain available; save a personal copy to keep your edits. Legacy personal presets without a suffix keep the current suffix when selected. Held requests and completed pictures are not rewritten; prepare a replacement to use changed settings.

## Prompting decisions

- Use concrete visual properties and short medium descriptions, rather than stacked quality slogans. The library's wording is an authored interpretation of provider guidance, not a benchmarked optimum.
- Preserve scene identity, wardrobe, setting and mood. Candid style means believable capture imperfections, not arbitrary injury, dirty skin or deliberately unreadable faces. Direct-flash style deliberately changes the lighting and is labeled accordingly.
- Natural-language description is a useful starting point for instruction-following models. Tag format remains available for workflows that benefit from it. Neither format unlocks unsupported model capabilities.
- Put your crucial subject/action early when editing a template. A style prefix is deliberately short, with rendering detail in the suffix. Existing template wording is preserved.
- Request dimensions in image parameters, separately from descriptive wording. Camera names, grain and lens descriptions are appearance cues, not actual EXIF or physical simulation settings.
- Negative prompt support is model-dependent. FLUX.2 does not support it. Important desired properties are therefore in the positive style; the negative field remains editable and is not silently removed.
- Manga's default page instructions specify full-color ink rendering. Photographic or monochrome shared styles can conflict with them. Advisory notes appear in the local expanded preview and prepared request's provenance; edit the template medium/color instructions to resolve those conflicts. Notes never change your prompt or trigger a request.
- Character references help identity consistency but can also influence rendering style. Inspect the reference summary in the prepared request when a new style seems to be ignored. Models and routed endpoints differ in reference and style fidelity.

## Research references

- [Black Forest Labs FLUX.2 prompting guide](https://docs.bfl.ai/guides/prompting_guide_flux2): subject/action/style/context, priority ordering, concrete photographic descriptors and lack of negative prompts.
- [OpenAI image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting): clear subject, composition, style and constraints; preserve specified details; refine one variable at a time; parameters are separate from prompts.
- [xAI image generation](https://docs.x.ai/developers/model-capabilities/images/generation): prompt-based generation and explicit aspect-ratio controls.
- [ByteDance Seedream 5.0 Lite introduction](https://seed.bytedance.com/en/blog/deeper-thinking-more-accurate-generation-introducing-seedream-5-0-lite): instruction following and reference-based style transfer. This family guidance does not verify capabilities of every NanoGPT/OpenRouter model alias, including Flash.

Validation covers compilation, storage compatibility and UI workflow. No paid side-by-side image-quality comparison has been run. Compare a few identical scene briefs and references on your actual connection, altering one style detail at a time.


## Correcting a picture and card role

After the image batch settles, Image prompts provides **Correct this picture’s subject** for a generated, failed or cancelled picture. Choose Character and enter its name, then leave Appearance empty to use this chat’s known baseline or supply concrete visual details. Old subject direction is cleared; add desired action in the new preview. Choose Environment / no people for scenery; the template picker selects a compatible template and remains editable. Both routes hold a preview for approval even with normal review off. Other finished pictures stay intact.

**Save appearance for this character in this chat** defaults off. Checking it explicitly replaces that character’s appearance baseline in this chat; it does not rewrite other chats or global memory. An explicit, unambiguous subject class in the supplied appearance also corrects a mistaken classification. Inspection never sends a provider request; approved replacements can incur an image-generation charge.

**Card role for this chat** applies to future plans. Scenario / world / narrator treats the card title as a wrapper, excludes it from automatic drawable subjects and narrator fallback, and keeps separately named cast members. Character and Auto retain existing ordinary-card behavior. Changing the attached card resets the effective preference to Auto. Missing real-person appearance still blocks generation rather than borrowing another character’s body.


## Replanning and diagnostics

In **Image prompts → Reply recovery**, **Replan this reply** calls the story-reader model for the current reply. It can incur model-token charges. Finish or skip held images first. Unlike ordinary automatic generation, new image requests from an explicit replan always wait for approval; this preference persists for that same reply through retries. A newer reply, edit, swipe, generation, closed reader or duplicate request invalidates pending recovery.

Replanning reuses only exact semantic cache matches whose host image still exists. The cache comparison includes templates, prompts, negative prompts, model/profile, parameters and reference policy. When an exact match cannot be verified (including an empty cache after restart), existing art for the same paragraph and person is kept as previous-picture fallback rather than being claimed as a match. An unrelated character is never substituted. Approved request history for unchanged job IDs remains inspectable. Image budget and connection settings are unchanged. Native card pictures do not make image-provider calls.

**Picture diagnostics** reports the selected subject/template, SimTracker detection, story-reader model versus fallback mode, and a bounded explanation. Missing subject and missing appearance have different remedies; no-people templates require neither. Older records without resolved metadata report unavailable. A passing subject check does not prove model compatibility. **Copy diagnostics** includes names and status only, excluding chat text, appearance descriptions, prompts, reference bytes and raw provider errors. Technical error text and the actual prepared prompt can still be inspected separately.

The existing Try again control retries unfinished images where a usable plan exists; its legacy recovery can plan again when no usable plan/appearance exists. Use explicit Replan when you want to reconsider scene selection and inspect new prompts before paying for images.


## Prompt length and mobile editing

Outgoing primary positive and negative prompts share one limit of 3,000 UTF-16 characters total. The review panel shows individual field lengths plus the combined count. Overlong generated requests first deduplicate exact negative exclusions and line-edge whitespace; only if still over budget does the positive shed line-edge whitespace and exact duplicate lines. Unique facts are not automatically truncated. If still too long, the normal pipeline holds an editable preview even when review is off; generation requires a valid prompt within the combined limit. Requests without a review surface fail locally before spending on an image. Host-managed positive/negative copies remain synchronized. Provider/host-specific translation and other model limits still depend on the selected connection.

The built-in Manga instructions and negatives are shorter, retaining identity/wardrobe consistency, panel count/order, grounded scene/action, wordless/approved-lettering rules, composition, lighting and visual quality controls. Exact unchanged older defaults migrate field by field. Customized wording and already-held request snapshots stay intact. This is a wording refinement, not a measured image-quality guarantee.

After a picture fails or finishes, its request fields can be edited directly as a **local replacement draft**. Tap the field normally to focus it, edit positive/negative/parameters, then choose **Prepare edited preview**. No image is generated until approval. Finish or skip other waiting pictures before preparing a replacement. History remains unchanged; same-turn refreshes retain local edits. Prompts may temporarily exceed the final limit in the editor so pasted details are not silently cut. The counters warn, and submission is blocked until shortened. Preparation errors retain the local draft.

The studio isolates clicks, typing and scrolling from reader navigation while preserving native input behavior. Textarea font size is 16px. Browser fixture checks cover focus/editability, typing, hotkey isolation, long paste preservation, counters and fixed mobile controls. A physical Android keyboard/IME was not exercised.


### Detail and length target

New story-reader planning aims for 2,750–2,900 characters total across positive and negative prompts when the available evidence supports useful detail. Shared styles, suffixes and template instructions consume the same budget; the planner sees their reservations. Character direction emphasizes the visible instant, pose/contact, expression, gaze, materials, spatial relationships and established lighting. Environment/detail templates remain people-free. Sparse scenes can be shorter. The 3,000-character dispatch guard still blocks excess unique wording for review instead of removing facts silently. Held prompts require an explicit new preparation to use new guidance.

The target is an extension planning policy, not a model quality threshold. Specificity and clear constraints matter more than filling a character count. References: [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting) and [BFL negative prompting guidance](https://help.bfl.ai/articles/7734566352-does-flux-2-support-negative-prompting). Provider/model support for negative prompts remains variable; no blanket automatic negative removal was added.

### Regenerate prompt and budget repair

Choose **Regenerate prompt** to ask the configured story-reader text connection for fresh wording for this picture. A held request gets a new preview and approval ID. A completed or failed generated picture prepares a replacement preview. This action uses text-generation tokens; it does not generate an image. The request's image model, dimensions, seed and reference parameters stay frozen. Rerolls replace the prepared wording rather than submitting an unsaved local edit.

Overlong compiled prompts now receive a bounded shortening attempt before review. It prioritizes verbose negatives and repeated wording, preserves an exact subject phrase when present, and instructs the writer to retain scene, identity, style and composition constraints. Output is measured and must be at most 2,950 combined characters. One corrective retry is allowed for invalid or oversized output. If no valid rewrite is available, the original remains reviewable; it cannot pass the final 3,000-character image guard. Sparse scenes can remain shorter. Semantic fidelity still requires review and is not guaranteed by length checking alone.

Raw prompt overrides in the image connection can replace the reviewed prompt. The extension checks object and JSON-string overrides, rejects oversized values and requires conflicting prompt fields to be removed before using the preview. See the host's [raw-override implementation](https://github.com/prolix-oc/Lumiverse/blob/main/src/image-gen/types.ts). Unrelated raw dimension settings retain their existing behavior.
