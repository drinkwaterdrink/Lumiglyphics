# Dynamic image templates and visual context

Date: 2026-10-10. Status: written design for user review; not implemented.

## Intent and accepted scope

Give the user control over what an illustration depicts and how its prompt is written. The reader can choose a suitable template from story context, while the user can inspect, change, and approve the actual prepared request. All controls extend the existing Pictures settings and image prompt reviewer. Mobile navigation and editing must improve with this work.

The user approved the conversational direction: editable templates, independently toggleable dynamic selection and review, existing image budget, explicit SimTracker visual context, and editable wording for their varied image models. The attached Visual Prompt Forge script is reference material; installing or executing it is unnecessary.

## Current behavior and constraints

- `maxImagesPerTurn` already defaults to 4. Preserve its existing range (0 through 12), semantics, concurrency, and reuse-only cache candidates. Zero currently means unlimited, not disabled. Image generation has its own switch.
- The planner receives recent chat, character and persona context, optional activated lore, and existing character continuity. It does not currently extract SimTracker state. Character/persona context default on; lore defaults off.
- `runtime/images.ts` forces an anime-oriented, one-character compiler and fixed camera. Merely appending editable strings cannot provide environment-only illustrations.
- Prepared image requests already have review, editable prompts/parameters, bounded history, reference-aware preparation, and replacement protection. Preserve those guarantees.
- Use user-scoped Spindle APIs. No runtime evaluation, direct filesystem access, new dependency, new provider adapter, or broad new permissions.

## Modes and configuration

Add `dynamicImageTemplates` (default false), `defaultImageTemplateId`, `imageTemplates`, `imagePromptFormat` (`description` or `tags`), and `includeSimTrackerContext` (default true). These are user settings. Dynamic selection and `reviewImages` remain independent; either combination works.

With dynamic selection off, each new cue uses the chosen default template. With it on, the existing text-planning pass chooses an enabled template using its name, category, and editable “Use when” description. Do not make a second text-model call solely for routing. Invalid or disabled choices fall back to the enabled default; if that is unavailable, use the built-in portrait fallback and record the fallback reason. Never accept invented template IDs.

Capture template/config revisions when preparing a batch. Saving settings affects future preparations; it does not rewrite held or approved requests. Previously recorded requests remain inspectable exactly as prepared.

## Editable templates

Initial categories: Character portrait, Environment, Story action, Detail / object, and Custom. Portrait/action templates support one visible named subject. Environment/detail templates default to no people. Custom supports either one subject or no people. Multi-character dialogue composition and multi-reference identity support are a later change, explicitly outside this release.

Each template has a stable ID, name, category, enabled flag, selection description, positive body, negative body, subject mode (`one` or `none`), framing, and reference policy (`character` or `none`). Supported framing: portrait, upper body, full body, wide, close-up. Environment defaults to wide; detail to close-up. Existing character-reference settings still decide the reference source and strength when the template permits a character reference.

Allow bounded plain-text placeholders: `{{style}}`, `{{scene}}`, `{{subjects}}`, `{{action}}`, `{{composition}}`, `{{lighting}}`, `{{suffix}}`, `{{negative}}`. Display their meanings and warn on unknown placeholders before saving. No executable expressions. Maximum 24 templates, 80-character names, 1,000-character selection descriptions, and 8,000 characters per prompt body. Reject duplicate IDs and malformed input rather than partially saving it.

Keep existing prefix/suffix/negative settings as shared style inputs. Preserve saved prompt presets and import them as named portrait templates without deleting the original records. Existing users retain their current prefix, including explicit anime wording; display it clearly and offer a deliberate clear/reset action. New template bodies must not inject hidden anime quality wording or default female identity. Unknown gender stays unspecified; tag mode uses a gendered count only when supported by resolved identity.

Use the selected description/tag format consistently, with the same visual facts. Image connection/model selection remains separate. Users can duplicate and name templates for model-specific wording; this release does not install automatic model profiles or claim universal negative/reference/parameter support.

## Planning and grounded visual descriptions

Extend the planner response and persisted cues with validated template ID, short selection reason, and the visible visual subject/action information needed for nonportrait cues. Template metadata is guidance; chat/tracker/lore are evidence, not instructions. Keep the story text unchanged.

New locations favor environment views; expression-driven beats favor portraits; significant movement favors action; focal props favor detail. Category changes alone do not justify a new render. Continue meaningful visual-change checks, reuse, and the existing budget. Do not require a render for every category or every paragraph. Preserve the existing opening-cue behavior unless an exact compatible image is reused.

Build a structured visual brief from scene, cue, subject identity, attire, and framing before rendering the selected template. No-people cues must bypass character tags, pose captions, portrait capture and character references throughout preparation and caching. Their cues may coexist with separate character continuity; an environment picture must not erase the active character from the story state. Action templates must retain the event rather than collapsing it into a fixed portrait pose. Unsupported multi-character events depict a grounded single-subject viewpoint and disclose that scope in preview.

## SimTracker evidence

Adapt the attached script's read-only extraction: latest supported JSON tracker block in chat, `characters` or `characterData` cast arrays, and optional `worldData`. Read original message content before display/narrative stripping. Do not depend on another extension's private storage, DOM, or undocumented cross-extension API.

Bound scanning to the last 30 messages through the target turn, 64,000 characters per message, 20 cast records, and 8,000 characters of resulting visual context. Do not read future turns when inspecting or replacing an older picture. Malformed/unsupported data is nonfatal and visibly reported. Record source message ID and name/alias matches; never merge different characters merely because traits overlap. Unknown presence does not mean present; older snapshots must not force characters into a later scene.

Extract visible traits, current wardrobe, expression, gesture, position, condition, action, held objects, and environment. Omit IDs, tracker property names, affiliations, UI colors, and nonvisual statistics from prompts. Distinguish lasting identity from temporary scene facts; do not promote tracker content or prompt edits into saved appearance automatically.

Explicit per-picture edits control the final request. Existing saved appearance overrides govern durable identity. Current scene evidence and tracker state inform temporary attire/action, with current explicit scene facts winning over older tracker values. Report conflicting durable descriptions, retain the saved override where present, and leave unsupported details unspecified. Do not implement a new Visual Bible or automated conflict-promotion system in this release.

## Preview and regeneration

Record template ID/name/revision, category, selection reason, format, safe component provenance, and SimTracker detection/source status with each prepared request. Older requests show template metadata unavailable rather than reconstructing it from today's settings. Exclude secrets and raw reference images from frontend metadata.

Add a template selector and expandable “Prompt sources” section to the existing reviewer. Changing a template is an explicit rebuild: if text edits exist, offer Keep edits or Replace with template. Keep edits preserves the current request untouched. Replace sends a scoped backend reprepare command that recompiles prompts and resolves applicable references, producing a new draft revision; it never generates an image. A generation cannot race with a reprepare. Approved/generated requests use the existing replacement workflow, retain the usable old image, and require fresh approval of the rebuilt request when review is enabled.

Automatic mode records the same compiled request metadata. Inspection, template changes, saves, copying, and expanded previews never call the image API.

Cache identity includes the effective template content/revision, brief, format, compiled prompts, parameters, and applicable references. Persist selected templates with cues so exact reuse cannot cross portrait/environment categories. Existing cache records without this identity cannot masquerade as matching new templates. Preserve independent manual requests and cancellation/source-fingerprint/profile-revision checks.

## Mobile organization

Place Generation, Templates, Composition and consistency, Context sources, and Advanced parameters within the existing Pictures section. Move image prompt editors and image context controls out of unrelated Advanced navigation without duplicating settings. Keep other extension sections intact; use a section select on narrow screens in place of the extension's horizontally overflowing tab row.

Use collapsible groups, labeled 44px-or-larger touch targets, one-column forms, and explicit Save/Discard for template drafts. Preserve unsaved drafts across host state updates and show backend save failures. Keep instant-save behavior for existing everyday controls. Avoid a whole-settings saving rewrite.

On mobile, image review occupies the available viewport with a scrollable body, solid readable background, visible header/close control and sticky primary action area. Friendly status text (“Ready”, “Waiting for review”) replaces raw internal statuses. Generated requests expose Edit and regenerate rather than a prominent disabled Generate action.

## Validation and delivery

Test migration, malformed templates, fallback routing, all toggle combinations, supported/malformed/stale tracker snapshots, aliases and identity conflicts. Integrate planner/serialization/compiler/cache/reference tests, including no portrait capture for no-people templates, one-character action preservation, budget 4 and unlimited 0, and System One compatibility. System One may supply expression hints but must not discard nonportrait cues or bypass the existing request budget.

Exercise real browser fixtures at 360px and desktop widths for navigation, drafts, exact prompt preparation, template changes, failed saves, replacement, cancellation, and template/reference changes racing with approval. Run the full test suite, typecheck, build, blocked-capability bundle checks, and affected settings/image-review/reading browser fixtures using the existing isolated Bun 1.4.0 toolchain.

Document shipped behavior and limits, update the beta version consistently, and publish the tested implementation to the user's existing Lumiglyphics GitHub main branch under their standing authorization. Do not stage attachments, private media, cache artifacts, or upstream reference scripts. Source/build/browser validation is distinct from user testing inside Lumiverse with real providers.
