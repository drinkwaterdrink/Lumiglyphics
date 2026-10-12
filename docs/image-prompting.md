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
