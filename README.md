# Lumiglyphics

Lumiglyphics extends [Cue — Living Novel by japolino](https://github.com/japolino/cue-living-novel) with image prompt inspection and optional approval before generation. This is a testing build, version `0.2.0-beta.31`, based on upstream commit `842d397d34bbb2952153f33739c8b13e70d5177b`. See [UPSTREAM.md](UPSTREAM.md) for provenance.

**Image library:** Open the picture icon below Image prompts to browse saved pictures from earlier replies in this chat. The default shows active story versions through your reading position. Choose All story images, alternate versions or replaced pictures explicitly; optional filters select picture type or template name. Pages contain up to 24 lazy thumbnails grouped by reply. Open a picture for whole-image fit, zoom/scroll, a source excerpt and available read-only prompt/model details. Browsing makes no generation calls and pauses auto/skip. Missing images and legacy metadata are labelled. Future replacement/replan references are retained in bounded per-turn history; overwritten legacy references cannot always be recovered. Reused images can appear under each source reply. Native/card pictures and supplied portrait display overrides without saved jobs are not indexed in this first release.

Open **Image prompts** in the visual novel to inspect each prepared picture's positive and negative prompts, provider, model, safe parameters and reference summary. With **Review before generating** enabled (the default), edit a picture and choose **Generate this**, or **Skip**. You can continue reading while a picture waits. Matching prompts remain separate in review mode. Parameters are JSON overrides for this picture; omitted fields remain host managed.

The review toggle is also in the existing Pictures settings. It applies to the next image batch; changing it does not release waiting drafts. Automatic mode keeps recording newly generated requests. Reused pictures and older turns may have no original request available. Preparation follows the existing concurrency and portrait dependencies, so later pictures can appear after earlier ones finish.

**Regenerate prompt** asks your story-reader text connection for fresh wording for one picture, then opens a new approval preview. It uses text tokens; it does not generate an image. Failed rerolls retain the held preview, and completed generated pictures can prepare a replacement while keeping their usable art. New planning targets 2,750–2,900 combined positive/negative characters when useful detail supports it. Overlong compiled prompts receive a bounded shortening pass; the final image request must stay within **3,000 characters combined**. See [image prompting](docs/image-prompting.md) and the [potential feature catalog](docs/2026-10-13-feature-catalog.md).

After waiting pictures finish or are skipped, **Prepare editable preview** creates a new draft when the original request is unavailable for the selected picture, including pictures reused within the generation budget. It always asks for review. If the replacement fails, the previous usable picture remains displayed. Generated pictures must be enabled in settings.

**Correct this picture’s subject** is available for completed, failed or cancelled generated pictures in Image prompts after the batch settles. Enter a character name and concrete appearance details, or choose Environment / no people. It prepares a new held preview even when normal review is off; generation starts only after **Generate this**. Old subject-specific directions are cleared, so add any desired action in the preview. Appearance is picture-only unless **Save appearance for this character in this chat** is checked. Explicit saves update this chat’s baseline, not other chats or global memory. Extra reuse-only pictures beyond the budget cannot be regenerated here.

**Card role for this chat** offers Auto, Character, and Scenario / world / narrator. Use Scenario for a narrator/world card whose title is being mistaken for a person. The setting belongs to this chat and attached card and affects future planning; existing artwork and held prompts are unchanged. Actual named cast members remain eligible. Auto preserves the current evidence-based behavior, without guessing from title words.

In **Pictures**, expand **Templates** to edit Character portrait, Environment, Story action, Detail / object, or Custom. Enable **Choose templates from story context** to let the existing story reader choose from enabled templates using your “When to use” guidance. Turn it off to use your selected default every time. This does not add another planning call or change the built-in budget: default **4**, range **0–12**, with **0 unlimited**. Prompt review is a separate toggle.

You can edit each template's wording, negative prompt, framing, visible subject mode and reference policy, duplicate templates, and disable categories you do not want. The catalog supports 32 templates. **Save templates** and **Discard template changes** affect the catalog only. Shared prefix, suffix, negative, appearance/series controls and legacy presets remain in **Shared style and consistency**; fields marked Apply use the existing Apply bar. Clear the inherited anime prefix there if you want photographs or another style. Choose natural-language descriptions or comma-separated tags to suit your image model. This version supports one character or no people; multi-character composition is deferred.

The local expanded preview is labeled as sample or latest-scene context and never generates an image. **Image prompts** shows the actual prepared extension request, with its selected template, reason, safe source information and SimTracker detection status. Changing a held picture's template rebuilds a new review draft; **Keep edits** retains your text, while **Replace with template** replaces prompt/parameter edits. Held pictures retain their prepared settings when you save the catalog. No-people templates omit character references and first-portrait capture. Portrait/action templates can retain character continuity.

Outgoing positive and negative prompts share a **3,000-character combined limit**. Over-budget preparation removes exact duplicate negative exclusions first. The Manga default uses shorter instructions and exclusions; unchanged older defaults migrate, while custom templates and already-held requests stay intact. Overlong automatic prompts pause for editing rather than losing unique details or reaching the provider. Failed/completed request fields support a local replacement draft: edit directly, choose **Prepare edited preview**, then approve the new prompt. Counters show the limit; saved request history stays unchanged.

**Reply recovery** inside Image prompts offers **Replan this reply**. It calls the story reader again (which may use tokens), reuses exact verified cached pictures and holds every new image prompt for approval even when normal review is off. Existing art for the same paragraph and person remains a previous-picture fallback while a replacement waits or fails. **Picture diagnostics** distinguishes missing subjects, missing appearance, no-people templates and other failures; its copy button excludes chat text, appearance bodies, prompts and raw provider errors.

**Context sources** now also offers optional LumiBooks reference-status reads and an explicitly selected LumiScript context endpoint. Both start disabled. After saving, **Refresh source status** reads the current chat's published data once, reports available/disabled/unavailable/cleared/invalid/timed-out status and labels snapshot age. Reads wait for source settings to finish saving and have a 1.5-second provider deadline. No added generation, companion writes, or imported facts in image prompts or historical paragraphs. LumiBooks disabled/frozen files and disabled records are excluded; codex facts remain unclassified reference evidence. LumiScript requires the [versioned context contract](integrations/context-sources.md); ordinary scripts work without it. Sources stay optional, and an older host without the shared RPC pool reports unavailable. This is the next context foundation increment; importing revealed facts into dossiers and planner context remains pending.

**Context sources** includes a SimTracker toggle. Supported tracker JSON in this chat can supply appearance, attire and environment evidence through the current reply; later snapshots cannot change an older picture's frozen context. This is not a direct SimTracker integration and unrecognized payloads are reported. Saved appearance overrides take priority over tracker/planner identity. The story reader still makes the visual choice; inspect it when accuracy matters.

For NanoGPT Anima text-to-image, new preparations use supported `1k` resolution instead of pixel dimensions such as `864x1536`. To request the higher tier, set `"size": "1.5k"` in Parameters (JSON). Anima's generated `aspectRatio` is editable independently (for example `"9:16"` for a portrait page). Custom raw overrides in your image connection stay authoritative and must be corrected in that connection. Invalid resolution edits are caught locally; there is no automatic paid retry. See [NanoGPT's Anima model documentation](https://nano-gpt.com/models/image/wavespeed-ai/anima/text-to-image).

The Image prompts header shows the loaded build version. After updating from Testing, reload Lumiverse and check for **0.2.0-beta.12**. Tapping an editable textarea explicitly focuses native text input; records that cannot be edited explain which preparation action is needed. The mobile close icon sits below Back to chat.

On mobile, choose a settings section from the selector. Pictures uses expandable groups. The reviewer has an opaque background, scrollable fields and fixed Close/generation controls.

Existing model connections, image settings, prompt presets, style and reference controls remain available. Provider requests go through Lumiverse's image API, including NanoGPT or OpenRouter profiles when your host exposes them. The panel shows the extension request prepared for Lumiverse; the host may translate it into another provider payload. This build has not yet been tested inside a live Lumiverse installation or against either provider.

For a first comparison, use one picture per reply, concurrency one, and review on. Check the inherited anime style/prefix and frozen character appearance against your chosen model. Change those existing settings if they conflict with the intended style. Prompt edits affect one picture; they do not rewrite the character's saved identity.

Build with Bun 1.4.0 or newer:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run verify
bun run test:image-review
bun run test:image-templates
```

The build writes `dist/backend.js` and `dist/frontend.js`, referenced by `spindle.json`. Lumiglyphics has a separate installation identifier and storage from Cue. Run one visual novel extension at a time during host testing.

## Test in Lumiverse

Install from `https://github.com/drinkwaterdrink/Lumiglyphics` using the `Testing` branch in Lumiverse's extension installer. Approve the requested permissions, enable Lumiglyphics, and disable Cue during testing. Open the Lumiglyphics settings, select your existing planning and image connections, and enable generated pictures. Start with one picture per reply and review enabled, then open the visual novel and choose **Image prompts** to edit and generate a waiting picture.

The host builds the repository's TypeScript source during installation; Bun 1.4.0 or newer is required by the pinned dependencies. If installation fails, keep the build/error log so the failing host step can be diagnosed. The local build checks do not replace testing inside your Lumiverse installation.

## Upstream functionality

Cue is a Lumiverse extension that turns a chat into a living visual novel. It replaces the native message and input surfaces only while VN mode is active. Canonical chat messages remain the source of truth.

> The sections below describe inherited Cue functionality. Lumiglyphics uses its own `lumiglyphics` identifier.

The preview includes:

NovelAI profiles automatically use model-aware prompt formatting. V4+ receives separate scene and character captions and numerical emphasis; V3 keeps a combined prompt with bracket emphasis. The saved profile model is used unless Cue overrides it. Negative numerical emphasis requires V4.5 or newer.

Under Advanced, NovelAI has toggles for model-specific quality tags and default negative tags. Custom positive prefixes and edited or empty negatives are preserved. Automatic quality tags are written into the request so they can be inspected; V4.5 Curated includes `rating:general` and reduced feet emphasis. These options do not affect other providers. The Lumiverse NovelAI adapter must also include the accompanying change that honors `qualityToggle: false` and empty negatives.

- paragraph-by-paragraph reveal with a final acknowledgement gate
- Previous button and Left Arrow to reread earlier paragraphs in the current reply. Going back pauses Auto and Skip, keeps your response draft, and does not rewind the chat. Skip still uses your selected mode.
- Standard typed-response and CYOA choice modes
- a single native image pipeline — planner → asset scheduler — with per-provider bounded concurrency and progressive delivery
- previous-image retention and decode-before-swap so a late image never blanks the stage
- exactly one centered protagonist per frame: no second character, crowd, or bystander
- a frozen per-chat character-identity/tag block, migrated automatically from the legacy visual-profile record
- a closed pose/expression catalogue, with deterministic selection by default
- editable one-character and no-people framing, with explicit scene-boundary checks
- swipe, edit, delete, duplicate-submit, and stale-image reconciliation
- view-gated generation: Cue only plans turns and generates images for chats whose Cue view is open; closing the view (or leaving the chat) aborts the in-flight image batch and marks it cancelled, opening the view plans the latest reply only when nothing current is stored, and cancelled images wait for a manual Retry instead of resuming on their own
- per-user and per-chat persisted continuity
- a settings tab, a user-selectable scene-image fit (Cover / Contain / Stretch / Original size / Scale down), ten built-in theme presets (Lumiverse, Golden hour, Boxed console, Paper novel, Midnight noir, Yamaku classic, Literature club, Astral glass, Neon rain, Obsidian reliquary), and a shadow-DOM custom CSS contract that is always the final styling layer
- an always-accessible **Back to chat** control that restores native Lumiverse

It targets Lumiverse staging `1.1.6`, audited at commit `33dfa9ee62999fa3e2567066ed5cdadf61635323`, and `lumiverse-spindle-types` `0.6.23`.

## Optional System One decisions

The **Connections** settings section configures Cue's own System One URL and model (applied with **Apply**). Save the API key there; Lumiverse encrypts it in Cue's private enclave. Cue sends Jev's typed `state` and `questions` request through the Spindle HTTP proxy. This requires the `cors_proxy` permission. If no key is saved or the request fails, Cue uses its existing story reader.

**Compare** logs decision latency, input tokens, and speaker/expression agreement without changing the turn. **Use for presentation and familiar scenes** applies confident speaker, expression, and audio decisions. For replies of up to seven short paragraphs, Cue can reuse a known scene without calling the prose planner when Jev finds no scene or visual change. Longer replies use the story reader and split Jev's presentation questions into requests that fit the API limits. This setting is off by default.

## Image pipeline and identity

When System One is On and returns confident expression decisions, the picture limit applies to new renders after cache lookup. Cue checks expressions across the classified paragraphs, reuses compatible images without spending generation slots, and generates distinct missing images in paragraph order up to the limit. Repeated requests for the same missing image share its render. Other misses keep the current image; uncertain continuation paragraphs and repeated expressions do not force a swap. Jev currently classifies the first 24 paragraphs. Off, Compare, unavailable classifiers, and native card art retain their existing image-budget behavior.

Generated scene images come from the one built-in path: `src/backend/runtime/planner.ts`, then `src/backend/runtime/images.ts`, then the per-provider `AssetScheduler`. The sidecar planner proposes scene boundaries, environments, paragraph cues and bounded visual focus. When dynamic selection is enabled it chooses an enabled template and explains the choice. The template compiler assembles the visual brief with saved appearance, current attire/action, scene facts and your shared style. Pose/expression selection still uses the finite catalogue.

Templates choose one visible character or no people and portrait, upper-body, full-body, wide or close-up framing. Durable character identity is preserved separately from current attire and action. By default, pose is selected deterministically; optional System One decisions can choose another pose from the same catalogue. System One continuation shortcuts are used only with the fixed portrait default; dynamic or non-portrait selections go through the story reader. Existing provider dimensions remain controlled by image settings, independently of composition wording. Old cues without template metadata retain the legacy compiler.

The pipeline never mutates canonical chat messages. It writes only extension-owned projections: per-turn records, per-chat state, and the single-character visual-state identity record.

As with any generative system, image-provider speed and visual identity quality depend on the selected model, provider, and prompt settings. Cue does not promise a specific provider result.

RisuAI card greetings that pack several alternative scenes into one message are macro-resolved before planning, so only the selected scene is shown. Limitation: no host event fires when a scene picker in the chat is clicked, so a changed selection is picked up only when Cue is reopened, when state is requested again, through the Try again control on the waiting card (`vn_refresh`), or through Try again on a visible turn (`vn_retry_turn` re-resolves first and replans when the selection changed). Volatile macros such as `{{random}}`, `{{roll}}` or `{{time}}` in a message re-resolve on every check without counting as a new scene; a message whose host resolution fails keeps its stored turn.

## Scene image reuse (temporary cache)

Cue keeps a small, in-memory cache of the scene images it generated so an
exact-compatible cue can reuse an image instead of sending a new provider
request. The cache is reuse-first and generate-on-miss; it never generates
ahead of time and never relaxes a match.

**What "exact compatible" means.** A cached image is reused only when all of
these are identical: the durable character id and subject class (never just
the display name), the resolved appearance tags and wardrobe, the effective
environment (location, time and weather, lighting, description, persistent
elements), the closed-catalogue pose/expression, the bounded action/prop, the
camera framing, and the exact provider request (positive and negative prompt,
connection and workflow, provider, model, your image parameters, prompt
syntax, and the reference-anchoring toggle). Scene ids, cue ids, paragraph
numbers, the turn key and free-form
`promptDelta` are not part of the match, so alternating speakers (Mira, Alex,
Mira) in the same room still reuse. Composition and camera locks are not
rendered into prompts and are ignored. Character cues whose planner run did not persist
a character id, resolved appearance and subject class never use the cache. No-people cues use scene and template identity instead. Template content, prompt format and structured visual focus also participate in matching.

**Lifetime.**

- Memory only, per backend worker. A Lumiverse restart starts empty. Nothing
  is written to storage and no image bytes are held: entries are pointers
  (image id, URL, provenance). Bounded to 256 entries / 1 MiB of metadata,
  least-recently-used first.
- Scoped to one user and one chat. Switching chats releases the previous
  chat's entries. The backend learns the active chat from the host
  `CHAT_SWITCHED` event and from the frontend's `vn_get_state` request (sent
  on every chat switch); a chat that only ever produced generation events
  without either signal is released when its message is deleted or the
  worker restarts.
- Scoped to one physical scene episode. The planner keeps `priorSceneId`
  across speaker switches and changes it only on a real boundary (location
  change, major time jump, environment replacement, forced). Entries from an
  earlier episode are retired, so leaving a room and returning to an identical
  room does not reuse the earlier visit. Deleting the active message (chat
  scene lineage restarts) releases the whole chat scope.
- Late results are never admitted. Every new generation, swipe, edit,
  regeneration, cancel and asset batch start advances the chat's admission
  epoch; a provider result that arrives afterwards is kept for its own turn
  record but not cached.
- Forced regeneration ("Regenerate reply" / "Try again"): unfinished jobs are
  re-made without a lookup and any image they showed is dropped from the
  cache. Finished images are kept, as before.
- Missing assets: before a reuse the extension checks `images.get`; a deleted
  or unverifiable image is dropped and normal generation runs. `IMAGE_DELETED`
  host events drop entries too.
- Eviction or invalidation never deletes an image and never rewrites a stored
  turn; historical turns keep their image ids.

**Extra swaps beyond the image cap.** The planner still generates at most
`maxImagesPerTurn` images. Cues beyond the cap are kept as reuse-only
candidates (`cacheCues`, up to 16). A candidate becomes an extra image only
when an exact-compatible image is already cached: at planning time (it then
appears in the first turn view) or later in the same turn when a budgeted image
lands (it then arrives as a normal asset update). A candidate with no cached
match produces nothing: no job, no request, no error, no retry. Such assets
are marked `source: "cache"` and are excluded from generation progress and
from the "Try again" wording.

**Concurrent requests.** If two compatible cues are in flight at once (for
example a superseded batch still running), only one owns the provider
request; the other waits and shares the result. An aborted owner releases the
waiter immediately; a failed owner fails the waiter once (no retry cascade).

**Reference anchoring first.** The portrait decision runs before any reuse.
A render that must capture a character's portrait (anchoring on, no
compatible portrait yet) is always generated, never served from the cache; it
is still stored for later cues. Toggling reference anchoring on or off changes
compatibility, so images made under the other setting are not reused.

**Limitations.** Exact match only. The captured portrait itself is not part
of the match (only the toggle is), so once a portrait exists, renders anchored
to it and the capture render of the same appearance count as compatible; your
own reference or source settings in image parameters do count. A swipe that re-enters a room
starts a new episode. The cache does not survive a restart. Reuse means the
same Lumiverse image id is shown in several turns; deleting it from the
gallery affects all of them, exactly as today.

**Debugging.** With **Debug logging** on, `[VN] scene-cache ...` lines report
each hit (with the source message and an estimate of the generation time
avoided), each miss with its reason (`absent`, `evicted`, `invalidated`,
`episode_retired`, `bypass`, `portrait_capture`, `asset_missing`,
`asset_unverifiable`, `identity_unresolved`), each store and rejection (`stale_admission`,
`aborted`, `no_image_id`), waits for in-flight owners, candidate resolutions,
scope releases, and a per-batch summary (hits, shared, avoided, stores,
misses, rejects, waits, evictions, entries, bytes).

## Text effects

Dialogue can style a few words with an inline tag. Wrap the words and close the tag:

| Markup | Effect | Looks like / use for | Moves |
| --- | --- | --- | --- |
| `<shake>Get down!</shake>` | Shake | Letters jolt hard and fast. Shouts, impacts, fear. | letters |
| `<tremble>I-I'm fine.</tremble>` | Tremble | A small nervous quiver. Cold, nerves, holding back tears. | letters |
| `<wave>La la la~</wave>` | Wave | Letters ripple up and down in turn. Sing-song, teasing, dreamy. | letters |
| `<bounce>We won!</bounce>` | Bounce | Letters hop one after another. Excited, cheerful. | letters |
| `<rainbow>Magic!</rainbow>` | Rainbow | Colours flow through the letters. Magic, wonder, silliness. | letters |
| `<glow>The seal breaks.</glow>` | Glow | A soft, breathing light around the words. Spells, revelations. | whole words |
| `<pulse>Ba-dump.</pulse>` | Pulse | Words swell like a heartbeat. Emphasis, longing. | whole words |
| `<glitch>SYSTEM ERROR</glitch>` | Glitch | Colour split with sudden digital tearing. Machines, corruption. | letters |
| `<whisper>don't tell anyone</whisper>` | Whisper | Small, faint, slightly italic. Secrets, asides. | none |
| `<shout>STOP!</shout>` | Shout | Large and bold; each letter punches in. Yelling. | letters |
| `<fade>Remember me...</fade>` | Fade | Letters drift in slowly, then flicker like a ghost. Memories, the uncanny. | letters |

- Tags are case-insensitive and nest: `<rainbow><wave>la la</wave></rainbow>` gives rainbow letters that also ripple. Markdown works inside (`<shout>**NO**</shout>`).
- A tag that is never closed, or a stray closing tag, is dropped; it never swallows the rest of the paragraph. Unknown tags (`<sparkle>`) and tags with attributes stay visible as plain text, like other unsupported HTML. Tags inside backticks stay literal.
- The output form `<span data-vn-text-fx="wave">…</span>` is also accepted. Only catalogue ids pass the sanitizer; any other value is removed.
- The tags are display markup only. Cue removes them from planner and image prompts and from text sent to speech (TTS), so they are never read aloud.
- The **Text effects** setting (config `textEffects`) has three modes: **Animated** (default), **Still** (config value `static`: colours, glow, and sizes stay; nothing moves), and **Off** (plain text). The OS "reduce motion" setting always behaves as Still. Effect intensity **Gentle** makes text motion smaller and slower. History always shows effects Still.
- **Display regex rules** run before the tags are read, so a rule can add effects. For example, to make every "magic" shimmer: `/\b(magic)\b/gi => <rainbow>$1</rainbow>`.
- **Teaching the model.** Paste this into a character card, lorebook entry, or preset (Settings also shows it with a Copy button):

  ```text
  Text effects: in dialogue you may wrap a few words in one of these tags to style them in the visual novel:
  <shake> <tremble> <wave> <bounce> <rainbow> <glow> <pulse> <glitch> <whisper> <shout> <fade>
  Examples: "<shake>Get down!</shake>", "<whisper>don't tell anyone</whisper>", "<rainbow><wave>la la la</wave></rainbow>".
  Use them rarely (at most one or two per reply), only for strong moments, wrap only the words that need it, and always close every tag.
  ```

Custom CSS can restyle effects through `[data-vn-text-fx="<id>"]`, the per-letter `[data-vn-text-fx-ch]` spans (index in `--vn-ch`), and the tuning properties `--vn-text-fx-amp`, `--vn-text-fx-speed`, `--vn-text-fx-glow`, `--vn-text-fx-rainbow-mix`, `--vn-text-fx-rainbow-1` … `-7`, and `--vn-text-fx-split-a` / `-b`.

## Run the standalone preview

```powershell
bun install --frozen-lockfile
bun run serve:demo
```

Open `http://localhost:4173` for CYOA mode or `http://localhost:4173/?mode=standard` for typed input.

## Install into a local Lumiverse staging checkout

Build the bundles:

```powershell
bun run verify
```

Copy this directory, including `dist`, into:

```text
data\extensions\visual_novel_preview\repo
```

Enable the extension and grant its requested permissions in Lumiverse. Enter from **Visual novel** in the chat header, or **Composer Extras → Open visual novel**. The settings tab controls connections, generation limits, planning context, prompts, scene-image fit, the visual-novel theme preset, and the custom CSS layer.

Opening an existing chat bootstraps its latest assistant reply automatically. A new empty chat needs its first normal assistant reply before there is anything to present.

The overlay feature-detects the staging component override API. If that API is absent, it leaves native chat intact and reports that the build is unsupported.

## Development

### Pinned status cards and inline HTML

Open **Panels** at the top left of VN. Newly planned replies expose complete HTML/SVG blocks when their paragraph is reached. Choose **Pin this card** for a saved snapshot, or **Keep it updated** for a uniquely identified status source. Drag the title, drag the lower-right resize handle, or use arrow keys on the title; Shift + arrows resizes. Positions and pins are stored per chat in this browser. **Reset positions** recovers misplaced cards; **Unpin all** removes saved cards.

SimTracker is optional. Panels shows available cards from the current reply first; **Advanced tools** holds SimTracker capture, pasted HTML, and status template rules. Opening or closing advanced tools does not disable saved rules or pinned updates.

Settings are split into sections — **Reading**, **Look**, **Pictures**, **Sound**, **Voice**, **Connections** and **Advanced** — shown as a side rail on wide screens and a tab strip on narrow ones; the search box at the top jumps to any setting, and the last open section is remembered. Everyday settings save as you change them. **Advanced** (prompts, story-reader context, model overrides, JSON parameters, text filtering, custom CSS) and the System One fields wait for **Apply**: a bar shows how many changes are not applied yet, with **Apply** and **Discard**, and drafts survive switching sections.

For a regex status template, expand **Add status template rule**, enter the pattern without slash delimiters, flags, and the multiline HTML replacement. Captures through `$36` and named captures are supported and escaped. Host macros in replacements are resolved through Lumiverse without committing variable changes. Use **Refresh live sources** after changing language variables. Rules operate on the first 200,000 source characters and reveal at the end of the turn. Multiple matches offer snapshots only, to avoid following the wrong character.

Rules do not change filtering. **Ignored tags** hides whole blocks from dialogue and image planning; **Display regex rules** affects dialogue only. Recognized ignored status tags remain available as plain-text cards. Complete HTML blocks are extracted separately before narrative planning. Previously cached plans may not contain panel sources.

Frames allow CSS layouts, SVG drawings, and CSS-only checkbox/radio interactions, but no scripts or navigation. Remote images/fonts are blocked unless explicitly enabled for that frame. A content update rebuilds that card's frame; other cards retain their state. Followed values from previous turns are hidden until the source appears in the current turn. Snapshot pins deliberately remain visible.

For stock SimTracker, let its card render in normal chat, open VN, then choose **Capture SimTracker snapshot**. This captures markup and checkbox state, not JavaScript behavior. Live updates require the companion adapter in [integrations/simtracker-vn-bridge.ts](./integrations/simtracker-vn-bridge.ts), wired to SimTracker's own template output. It is not installed into SimTracker automatically. The adapter must return only the requested chat/message/swipe's cards, call `refresh()` after updates, and `destroy()` on teardown. No DOM nodes are moved between extensions.

### Game engine extensions

A rules engine such as Warp can play alongside VN mode:

- **Moves on the stage.** Its choices (with success odds) appear as chips at **Your turn**, above your own reply options, in both standard and CYOA mode. Picking one shows it as your line and hands it back to the engine, which rolls and sends the message. The contract lives in [src/frontend/host/game-bridge.ts](./src/frontend/host/game-bridge.ts): the engine sends `vn-game-state-v1` (`{ version: 1, provider, chatId, choices: [{ id, label, group?, detail?, odds? }], busy? }`), VN answers picks with `vn-game-pick-v1` and asks for a fresh state with `vn-game-request-v1`. Up to 12 moves are shown.
- **Live status cards.** Providers named `warp` (as well as `simtracker`) may publish **Keep it updated** cards over the panel bridge above.
- **Moods for expressions.** An engine may leave `metadata.vn_hints = { moods: { Name: "flustered" }, notes: [...] }` on a reply or on the player message it answers. The planner reads it as data and prefers expressions that match.

Browser regression checks:

```powershell
bunx playwright install chromium
bun run test:panels
```

```powershell
bun run test
bun run typecheck
bun run build
bun run build:demo
```

See [SPEECH.md](./SPEECH.md) for the default-off paragraph speech (TTS) feature, its contracts, and its truthful limitations.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the viability decision, staging host contract, image pipeline, deterministic single-character identity, data ownership, state machines, and remaining preview limits.

Shared image styles and suffix behavior are documented in [Image prompting](docs/image-prompting.md). Built-in looks are in Pictures → Image prompts → Shared style and exclusions; all wording remains editable.

The first paragraph-timed presentation foundation derives sourced location, cast, drawable subject and speaker snapshots from the existing validated reader plan. Snapshots restore earlier outfit and presence state on backward reading, omit private/unclassified facts, and remain scoped to one turn. This is the foundation for upcoming context-source adapters and configurable tooltips; those controls are not yet shipped. No extra model call or image generation is added. Unsupported or oversized optional metadata leaves ordinary reading available.

Cast setup is available under **Pictures → Cast setup and portraits**. Add an actual NPC with a concrete appearance, explicit aliases and optional named outfits before generating a portrait. Choose a default outfit, then assign gallery artwork to the saved base look or outfit. Assigned artwork is display-only in Cast view for an already planned matching portrait cue; it is not sent as a model reference. Editing a look preserves its artwork pointer but requires reassignment before that artwork can depict the new look. Removing setup restores learned appearance guidance. Configure voice opens a draft in the existing Voice controls; choose a profile there to save it.

History now combines saved reply text and images. Story shows expandable reply previews with matching thumbnails; Images is the gallery-only view. Filters include read-so-far/all, active/alternate versions and replaced images. Old images without the exact text snapshot appear separately with their original excerpts. Full-size viewing, zoom and saved prompts share the same window; Back to reader remains visible. History browses saved extension plans; unplanned replies and missing image references are not reconstructed. Very long reply previews are labelled when shortened.

Cast setup → Fill from context → Scan context offers recognized saved story appearances, enabled SimTracker descriptions/aliases/current clothing and saved setups. Preview a source, then Fill empty fields or explicitly Replace appearance. Review the draft and Save cast setup to apply appearance guidance to future image prompts. Scanning never calls a model or saves automatically; prepared prompts retain their wording. Unstructured prose and private companion-extension storage are not scanned. New context is prioritized within the32-suggestion limit; omissions are disclosed.

Quiet references: enable Tooltips under Reading and choose Reference display → Menu only to keep story text plain. The book icon opens a searchable NPC/location/item sheet. Names and aliases are searchable; pins and current-scene entries sort first. Known references remain gated by category, suppression and reveal timing. Back to references preserves search/category; browsing does not call a model or generate images.

Cast scanning includes NPCs from recognized tracker snapshots within the last30 chat messages, with support for JSON/YAML, scalar appearance and character-name-keyed records. Newest usable tracker descriptions win per exact name. The active reader's revealed tooltip NPCs are also offered; name-only entries are marked appearance needed and cannot replace a populated appearance with blank text. Older tracked outfits may need updating. Live scene presence still uses the latest tracker snapshot.
