# Lumiglyphics Product & UX Roadmap — Competitor-Informed

**Date:** 2026-10-24
**Branch:** `arena/2d85d8e9-lumiglyphics`
**Companion document:** [`2026-10-24-exhaustive-architecture-audit.md`](./2026-10-24-exhaustive-architecture-audit.md)
**Method:** the audit's sixteen findings (F1–F16) were fixed first; this document is the product layer. Competitor material below comes from live research conducted 2026-10-24 (sources in Appendix A). Anything not directly sourced is labeled **[inference]** and reflects platform knowledge rather than a cited claim.

---

## 0. Where things stand after the audit fixes

Every numbered finding from the audit is now implemented, tested, and green (1,794 tests, 0 failures; typecheck and both production bundles build clean).

| Finding | What changed, in one line |
 --- | --- |
| F1 | Closing a reader view now invalidates in-flight macro intakes via the intake epoch; a guard before `planTurn` discards stale work. |
| F2 / F3 | System One calls have a 15 s deadline, external-abort support, and fail-closed booleans (missing answers route to the normal planner, never to silent fast-paths). |
| F4 | Scene cache keys now carry an independent cyrb53 full-identity digest, stored per entry and verified on every lookup/store; a hash collision can no longer serve one identity's image for another. |
| F5 | Display regex rules get a static catastrophic-backtracking screen, 1,000-character pattern cap, and a 100 k-character runtime input cap. |
| F6 | Prompt-protection fact matching is tokenized: punctuation-attached facts validate, partial-word coincidences do not. |
| F7 | Reference-history prefix and paragraph digests are memoized (chain-linked LRU); the 750 ms optional-read budget is no longer burned re-hashing the same ancestry three times. |
| F8 | JSON repair's O(n²) tail-copy per quote is replaced by an O(n) next-non-whitespace index table plus sticky regexes. |
| F9 | Config normalization is content-addressed and memoized; a turn's ~16 `loadConfig` calls reuse one build, with clone-on-read safety. |
| F10 | Panel dock builds candidate rows once per turn (cursor moves only toggle `hidden`); follow-pins swap `srcdoc` in place only when content actually changes — no more iframe reload flicker per paragraph. |
| F11 | Scene cache rejects entries over a quarter of the byte budget and enforces a per-chat 50% fair share so one heavy chat cannot evict everyone else. |
| F12 | "Quiet"/"Mute" music ducking eases over a 420 ms ease-out ramp instead of stepping, on a timer independent of crossfades. |
| F13 | Image-library change detection compares five primitives instead of double `JSON.stringify`; story cards are grouped into a reply-key map once instead of O(n·m) re-stringification. |
| F14 | SFX players are hard-capped at 32; a stalled element that never fires `ended`/`error` is paused and evicted. |
| F15 | The 24 px panel resize glyph now exposes a 44 px-class invisible hit zone; the image studio traps focus inside its mobile fullscreen layout and sets `aria-modal` only there. |
| F16 | Review-cancellation recovery writes are gated on an actually-open view. |
| Polish | Reader backlog is capped at 200 entries; the typewriter pauses while the tab is hidden and catches up on return. |

**The product lesson underneath all of them:** Lumiglyphics already has unusually strong *integrity* machinery (exact-compatibility image cache, prompt protection, admission epochs, reference lineage). The roadmap should spend that trust on *experience depth*, not on rebuilding what works.

---

# Part I — What the field does well

## 1. SillyTavern — the power-user reference

SillyTavern's durable advantage is composable automation and a huge extension ecosystem. The things worth studying:

- **Macros 2.0.** The new macro engine adds nesting, deterministic evaluation order, scoped macros, a conditional `if`, whitespace-preservation flags, variable shorthands/comparisons/assignment, and Ctrl+Space autocomplete inside inputs. The legacy engine is frozen and will be retired [S2][S3]. Lumiglyphics already resolves host macros in panel rules and image prompts; the gap is authoring ergonomics and composability.
- **STScript (slash commands).** A real scripting language over the chat: persona CRUD, prompt injection, streamed generation against a named connection profile, regex-state queries, variable scopes, piped execution and closures [S5]. This is the escape hatch that keeps advanced users from outgrowing the tool.
- **World Info (lorebook).** Entries activate by keyword, support recursive activation (an activated entry's text can trigger further entries), explicit insert ordering, and rename propagation into chat/character/persona links [S1][S7].
- **Group chats.** Multi-character sessions with tag-filtered member lists; community memory extensions tag memories with who was present and can route per-character lorebooks [S1][S9][S10].
- **Small details that earn loyalty.** Named capture groups in regex replacements, TTS voice maps split across quoted speech / asterisk action / narration, Quick Reply sets that auto-execute before generation, extension manifests declaring a minimum client version, background images storing aspect-ratio/dominant-color metadata, and pinning recent chats to the welcome screen [S1].

## 2. RisuAI — the mobile-first lorebook laboratory

RisuAI runs as an installable PWA, on Android, and on desktop, and it pushes the most structured lorebook semantics in the category:

- **Hard budgets you can see.** A new install scans the last five messages for keys and gives *all* lorebook entries together an 800-token budget that does not grow with context size [R3]. Lumiglyphics' planner already thinks in bounded terms — this is a natural mental model to expose in UI.
- **Decorators put an entry's behavior inside the entry.** `@@activate`, `@@probability 30`, `@@activate_only_after 10`, `@@activate_only_every 5`, `@@keep_activate_after_match`, `@@depth 2`, `@@role system`, `@@position after_desc`, `@@priority 500`, and `@@ignore_on_max_context` (first to be dropped when the budget is full) make each card self-describing [R3].
- **Recursive scanning is on by default**, so entries can chain; higher insert order wins when the budget is tight [R3].
- **Modules (`.risum`)** bundle lorebook + regex scripts + trigger scripts into one shareable, switchable file [R3][R7].
- **Four regex modes** — modify input, modify output, modify the raw request, or display-only [R7] — a cleaner taxonomy than a single "custom regex" bucket.
- **Emotion images** swap the portrait to match the reply's detected affect; trigger scripts (including Lua) fire on conditions; built-in translation of input and output rounds out the mobile feature set [R7].

## 3. NovelAI — the writer's control panel

NovelAI competes on *legible control* over generation and on image craft:

- **Phrase Bias.** Bias groups with a shared bias value; curly braces target exact text, square brackets target token IDs; biases are case-sensitive and can be import/exported as `.bias` files. Lorebook entries and categories can carry biases, including a *when-entry-inactive* bias (used for random encounters and nickname steering) [N1][N6][N12].
- **Banned Tokens and Stop Sequences** for hard exclusions, plus a **Context Viewer** that shows the exact prompt being sent — lore entries, memory, author's note, and active bias groups [N2].
- **Layered standing instructions.** Memory, Lorebook, and tiered Author's Note each occupy a distinct, visible place in context [N2].
- **Image craft.** Vibe Transfer steers output style from a reference image (character consistency across renders), alongside inpainting/outpainting and shareable image presets [N9]. Author/genre *modules* shift prose voice without pasting examples [N7].
- **Editor-first basics done right:** retry, inline edit, branch, and a live token counter [N5].

## 4. Voyage (Latitude) — the structured-world RPG pole

Voyage is the closest competitor to Lumiglyphics' visual-novel direction because it puts a *single world state* behind free-form play:

- **World Engine + one canonical state.** Multiplayer (parties up to eight) and a human Dungeon Master mode work because every player action resolves against one shared world rather than parallel chat threads [V3][V10].
- **Tabletop mechanics with real skill checks:** stats, skills, and equipment shape outcomes instead of arbitrary model decisions; characters can die, reputations shift, and consequences persist [V1].
- **Card-based mobile log.** Quest offers are accept/reject cards; inventory and travel updates appear as cards in the log; a map opens mid-game; a people-in-scene strip shows health; dialogue carries a tone word [V8].
- **Creation studio.** A thirteen-step character creator and Voyage Studio for worlds (regions, landmarks, quests, villains, rules, maps), with publishing to the community [V1][V6].
- **Visual Novel mode** for face-to-face character scenes alongside the RPG log [V10].

## 5. Zeta (Scatter Lab, South Korea) — the polished consumer VN

Zeta shows what mass-market visual-novel roleplay looks like in 2026:

- A dedicated **Visual Novel mode** (launched September 2026) for face-to-face conversation with selectable models (Zeta, Koji, Luca) [Z2].
- **One-tap contextual Snapshots** that generate an image of the current chat moment, plus character voice/TTS and Smart Reply suggestions [Z4][Z5].
- A **3 million-character marketplace** of user creations, "plots" (interactive stories), and a freemium model built on an ad timer plus a Pieces currency [Z1].

## 6. Chinese platforms — 猫箱, 星野/Talkie, and the gacha layer

- **猫箱 (Maoxiang, ByteDance)** frames play as 语c (language cosplay) and 剧本杀 (script-murder) story frameworks; the assistant proactively starts topics and renders expressions/actions in parentheticals, and an AI creation assistant helps build characters and stories [C7][C6].
- **星野/Talkie (MiniMax)** pairs voice and text in the same reply, offers reset/event/regenerate controls, generates characters from a photo or description, and turns standout moments into collectible **CG gacha cards**; scene-specific assistant characters are a first-class concept [C7].
- The tradeoff to learn from: heavy 违禁词 (banned-term) moderation and content reshaping are a constant platform risk in this market [C10]. Lumiglyphics' self-hosted/Lumiverse positioning is a differentiator here — user-owned content avoids platform-level rewrite risk.

---

# Part II — What Lumiglyphics should protect

Before adding, name the assets competitors would have to rebuild:

1. **The exact-compatibility scene cache with identity digests and admission epochs** — no competitor researched here has anything comparable; their image regen is stateless.
2. **Prompt protection and budget-aware rewriting** — identity facts survive "Fit to budget" with token-level guarantees; NovelAI offers bias levers but not fact ownership.
3. **The reference-lineage certificate chain** — "Earlier references" with cryptographic prefix digests is stronger than Risu's keyword scan or ST's variable bags.
4. **The sandboxed panel system** — user HTML in an opaque-origin sandbox with CSP, worker-killed regex, and a live extension bridge.
5. **The review-gated image pipeline** — held previews, per-picture correction, replan/retry semantics. This is the trust backbone for a visual product.

The roadmap below leans on all five rather than replacing them.

---

# Part III — The program: seven themes

## Theme A — Reading surface and motion aesthetics

The reader is the product. Everything here is polish-level work with outsized perceived-quality impact.

### A1. Motion system overhaul (Wave 1, S–M)
- **Transition-end-driven image crossfades** replacing the fixed 350 ms timer (audit §2.4), so background-tab throttling cannot desync layer swaps; race the CSS event against a safety timeout.
- **Typewriter rAF coalescing** for the two `textContent` writes per tick at very low text speeds, and a configurable reveal curve (linear / ease-out) rather than fixed cadence.
- **Scene transition vocabulary:** a small, named set (fade, dip-to-black, blur, slide, none) selectable per scene and overridable by the planner's scene boundary, all respecting `prefers-reduced-motion` (which already downgrades text effects).
- **Audio-visual sync marks:** let a paragraph's BGM/SFX cue land on the first revealed character rather than on paragraph load, so long typewriter reveals don't desync sound from text.

### A2. Backlog/history becomes a first-class surface (Wave 1, S)
- Now that backlog is capped at 200 entries, add **jump-back** (tap any history entry to re-read from there without changing the live turn), search within backlog, and per-entry image thumbnails.
- NovelAI-style **branching indicators** on history entries that have swipes; Zeta-style **Snapshot** button per entry to generate/attach a picture of that moment [Z4].
- Empty and loading states for the history panel (currently text-only).

### A3. Micro-interaction and touch pass (Wave 1, S)
- Audit every interactive target to 44 px (the F15 resize handle was the known offender; do a full sweep of stage controls, library filters, studio select rows on coarse pointers).
- Haptic-style visual press feedback consistency (the panel CSS already scales buttons to .97 on active; standardize across stage, library, studio, panels).
- Safe-area insets on every overlay (partially present in panels/library; finish the job for the studio and choice sheets).
- Long-press conventions on mobile: long-press a paragraph for (copy · regenerate · snapshot · pin panel), mirroring the desktop right-click menu.

### A4. Choice and input UX (Wave 2, M)
- **Quick-Reply slots** inspired by ST's Quick Replies [S1]: user-authored buttons that can inject text, run a macro, or fire before generation; per-character binding like ST's character-scoped sets.
- Choice button entrance animation staggered by index, with reduced-motion fallback; choice press ripple; keyboard number-row selection (1–9) on desktop.
- Smart Reply suggestions above the input (Zeta pattern [Z5]) as an optional planner output, clearly labeled as suggestion not content.

## Theme B — Identity and expression: the layered sprite system

This is the audit's proposal #1 and the strongest differentiator available. Risu's emotion images [R7] and Zeta's VN mode [Z2] validate the demand; Lumiglyphics can do it with cache-grade consistency.

### B1. Layered expression sprite spec (Wave 2, L)
- A **sprite sheet document** per character: base body layer + expression layer (eyes/mouth) + pose/prop layer + optional attire overlay, each with closed-catalogue ids that plug into the existing `SceneImageIdentity.pose` slot rather than inventing a parallel system.
- The planner emits an **expression directive** (closed set: neutral, happy, sad, angry, surprised, flustered, focused, pained) per speaker per paragraph — a bounded enum the model can't hallucinate outside of, same discipline as pose ids today.
- Renderer composites layers with a short crossfade between expression layers only (the body stays mounted), eliminating full-image swap flicker — the same in-place-swap principle F10 established for panels.
- Fallback chain: layered sprite → single emotion image → current scene image → nameplate-only, so characters without sheets degrade gracefully.

### B2. Emotion director (Wave 2, M)
- A small classifier step (planner-side, same fail-closed pattern as System One) that maps paragraph tone to the expression enum; compare-mode logging like the existing scene-change log.
- Risu-style **fallback expression** config per character [S1] and a manual override picker on the nameplate.
- Expression history feeds the reference-history tooltip ("she smiled here, frowned there") as a relationship/emotion arc strip — a feature neither competitor has, built on data Lumiglyphics already plans.

### B3. Voice and presence (Wave 2, M)
- **TTS voice maps** split across quoted dialogue, asterisk action narration, and system text — the exact split ST added [S1] — per character, with the existing speech pipeline.
- Per-character speaking-rate and pitch; silence trimming; ducking integration (the F12 ramp already gives the bed).
- Speaker-reactive nameplate pulse when voice starts, respecting reduced motion.

## Theme C — World memory: LumiBooks

The audit's proposal #2: bounded lorebooks synthesized *through the planner* instead of dumped into context. Risu's decorators [R3] and NovelAI's context layering [N2] are the design vocabulary.

### C1. LumiBook entry model (Wave 2, L)
- Entries carry: keys (primary/secondary), body text, scope (global/chat/character), and a **decorator-compatible behavior set** modeled on Risu's proven vocabulary: activation probability, activate-only-after-N-messages, every-Nth-turn, keep-active-after-match, insertion depth/position, drop priority, inactive-only flag [R3]. **[inference on exact mapping; semantics sourced]**
- Recursive key scanning with a visible activation trace, capped by a hard token budget surfaced in the editor (Risu's 800-token default is a good starting preset [R3]).
- **Crucial Lumiglyphics twist:** entries don't concatenate into the prompt raw. The planner *synthesizes* activated entries into its structured scene/continuity output, so contradictions resolve through the same continuity-delta machinery that already exists — avoiding the "prose and variables disagree" drift that ST community guides warn about [S8].

### C2. Authoring and legibility (Wave 2, M)
- **Context Viewer** (NovelAI's most-copied power feature [N2]): a read-only drawer showing the exact prompt assembled for the next turn — system, character, activated LumiBook entries with their trigger reasons, author's note tier, recent messages, image prompt, bias settings. This turns the planner from a black box into an inspectable instrument.
- Entry **activation debugger**: why an entry did/didn't fire (key not in scan window, budget eviction, probability roll), directly answering Risu's community "entry never fires" checklist [R3].
- Import SillyTavern/Risu lorebook formats where licensing permits; export to a Lumiglyphics-native bundle (the `.risum` module idea [R7], see Theme E).

### C3. Standing instruction tiers and steering (Wave 3, M)
- **Author's Note tiers** (always / every N turns / per scene) in a dedicated, visibly-positioned context slot [N2].
- **Phrase-bias equivalent for the planner:** user-managed term preferences ("always call it the Sundered Court, never Dark Court") compiled into the existing prompt-protection layer as soft preferences with hard-protected facts kept distinct — NovelAI's bias groups prove users want this granularity [N1], and F6's token matcher is the enforcement point.
- Banned-token/stop-sequence passthrough for connections that support it, stored per connection profile.

## Theme D — The interactive stage

The audit's proposal #3, and Voyage's home turf [V1][V8]. The difference: Lumiglyphics builds it on top of generated scenes rather than a hand-authored world engine.

### D1. Hotspots (Wave 3, L)
- Planner emits bounded **hotspot annotations** per scene image: `{id, label, region hint, kind (look/talk/use/go), target entity}` rendered as accessible, keyboard-navigable markers over the staged image (with an always-visible list fallback for screen readers and reduced-motion users).
- Interactions produce choice intents that flow through the normal planning queue — no separate engine, preserving the F1 epoch/cancellation guarantees.
- Voyage's accept/reject quest cards [V8] map naturally onto the existing choice system with a new visual treatment and a persistent quest log.

### D2. Inventory and entities (Wave 3, L)
- Structured inventory/entity ledger derived from continuity deltas (the data already exists in scene state), shown as **cards in the log** when items are gained/used — Voyage's inventory-card pattern [V8].
- Image hotspots for known inventory items reuse the scene cache: examining an item is a cache lookup, not a generation.
- Relationship/opinion meters per named entity, fed by the same reference evidence the ancestry chain already verifies — Voyage sells "they remember your betrayals" [V1]; Lumiglyphics can show the receipts.

### D3. Map and travel (Wave 3, M)
- A hand-offable map layer (user-authored image + named locations, later planner-drawn), with current-location marker; travel becomes a scene-boundary event the cache already understands (episodes retire correctly on location change).
- DM mode (Voyage [V3]): a human host can override any planner choice for the table, reusing the review-gate UI pattern.

## Theme E — Creation studio and prompt craftsmanship

### E1. Prompt version timeline (audit proposal #5) (Wave 2, M)
- Every edit/regenerate of an image prompt becomes an immutable, diffable version (the `previousWording` map in the studio is the seed; today it's in-memory and capped at 12).
- Persist per picture: author, trigger (manual edit / fit-to-budget / template rebuild / regen), length delta (the prompt-revision summary already computes this), and one-click restore.
- A timeline strip in the studio; feeds a future "prompt evolution" export for sharing presets.

### E2. Image presets and style steering (Wave 2, M)
- NovelAI-style shareable **image presets** (sampler, aspect, negative pack, reference strength) [N9] and **Vibe-style reference transfer** [N9] wired to the existing reference-anchoring toggle rather than bolted on.
- Cache-aware **adaptive image director** (audit proposal #4): the director chooses when to reuse vs. regenerate using live cache stats (hit rate, eviction pressure, episode age) — turning the F4/F11 machinery into user-visible value ("reused 4 of 6 scenes this turn, saved ~40 s") with an explainable policy.
- Per-template presentation rules already exist; surface them in the studio with live previews.

### E3. Macros and automation (Wave 3, L)
- Evolve the current macro resolver toward ST's Macros 2.0 ergonomics: nested evaluation, scoped variables, conditionals, and Ctrl+Space autocomplete in every macro-aware field [S2][S3].
- A curated, sandboxed **action library** (not a full STScript on day one): named, parameterized actions ("roll d20 + stat", "insert author's note for 3 turns", "snapshot this paragraph") built from internal primitives, with the panel worker/CSP model as the security boundary.
- Panel rules adopt Risu's four-mode taxonomy (input / output / request / display-only) [R7] and ST's named capture groups [S1].

### E4. Bundles and sharing (Wave 3, M)
- A "character pack" bundle: card + sprite sheet + LumiBook subset + panel rules + presentation rules + voice map, in one importable file — the `.risum` lesson [R7] applied to Lumiglyphics' stronger asset model.
- Pack manifest with schema version and minimum app version (ST extension-manifest pattern [S1]), validated on import with a readable diff screen.

## Theme F — Mobile-first quality bar

Zeta, Risu, and Voyage are all mobile-first [R7][V6][Z1]; Lumiglyphics' stage already behaves like one, so formalize the bar.

- **Installable PWA** with offline shell, standalone display, home-screen icon, and background-state resilience (the F14/hidden-tab work is the groundwork).
- **Performance budgets per turn:** TTI of the reader under 1 s on a mid Android, no long task over 50 ms on the paragraph path, image decode off the critical path (already true via preload/decode), worker pool for panel rules (audit §2.5 — today up to 12 worker spawns per turn; pool to one long-lived worker).
- **Bandwidth modes:** data-saver (thumbnails only, no autoplay BGM), wifi-only generation, prefetch on wifi — cheap settings-page work that competitors with mobile roots treat as table stakes.
- **Notification/multitasking:** reply-ready system notification with the snapshot thumbnail (Zeta's snapshot-as-shareable moment [Z4]), tapping returns to the exact paragraph.
- Full i18n scaffolding; the CN/KR markets show voice+text simultaneous replies and proactive topic shifts as expectations [C7] — design the input/streaming protocol now so dual-channel output doesn't require a rewrite.

## Theme G — Systems, observability, and platform

### G1. Multi-user and host features (Wave 2, S)
- F11's per-scope fair share is the kernel; add per-user cache stats in any host dashboard and configurable quotas.
- Voyage-style shared sessions [V3] are a long bet, but the single-world-state discipline is worth adopting now: one canonical scene state per chat, with all participants reading it — the scene cache and epoch system already assume this.

### G2. Telemetry that respects the trust model (Wave 2, S)
- Local-only performance diary: per-turn planner time, cache hit/miss reasons (the stats objects already exist), System One deadline/abort counts (F2), panel worker timeouts (F5), repair depth (F8). Viewable in a diagnostics screen, exportable, never leaving the device without explicit action.
- The studio's copy-diagnostics pattern (status/subject/template only, no story text) becomes the house style for every shareable report.

### G3. Extensibility bridge (Wave 3, M)
- The `vn-panel-export-v1` bridge already supports simtracker/warp providers; formalize a versioned extension API with capability scopes, the manifest/min-version rule [S1], and an in-app directory of vetted bridges.

---

# Part IV — Sized backlog at a glance

| ID | Initiative | Size | Theme | Depends on |
| --- | --- | --- | --- | --- |
| A1 | Transition-end crossfades, typewriter rAF, transition vocabulary | M | A | — |
| A2 | Backlog jump-back, search, snapshots in history | S | A | — |
| A3 | 44 px sweep, safe-area finish, long-press paragraph menu | S | A | F15 |
| A4 | Quick-reply slots, choice animations, smart replies | M | A | — |
| B1 | Layered sprite spec + compositing renderer | L | B | scene cache (done) |
| B2 | Emotion director with fail-closed classifier | M | B | B1, F2 pattern |
| B3 | TTS voice maps, per-character voice settings | M | B | F12 |
| C1 | LumiBook entries, decorators, bounded activation | L | C | planner |
| C2 | Context Viewer + activation debugger | M | C | C1 |
| C3 | Author's-note tiers, term preferences, banned tokens | M | C | F6 |
| D1 | Scene hotspots + quest cards | L | D | choices, F1 |
| D2 | Inventory/entity cards, relationship meters | L | D | reference history (F7) |
| D3 | Map layer, DM mode | M | D | D1 |
| E1 | Persistent prompt version timeline | M | E | studio |
| E2 | Image presets, vibe transfer, adaptive director | M | E | F4/F11 stats |
| E3 | Macro 2.0 ergonomics, action library, regex four-modes | L | E | F5 worker pool |
| E4 | Character pack bundles with manifests | M | E | B1, C1 |
| F1 | PWA install/offline shell | M | F | — |
| F2 | Performance budgets + pooled panel worker | M | F | F10 |
| F3 | Data-saver/bandwidth modes, ready notifications | S | F | F1 |
| G1 | Per-user quotas and cache dashboards | S | G | F11 |
| G2 | Local performance diary | S | G | F2/F5/F8 counters |
| G3 | Versioned extension API + directory | M | G | panel bridge |

---

# Part V — Where we go from here

## Recommended sequencing

**Wave 1 — "feel the quality" (two-to-three weeks, no new data models).**
A2, A3, F2's worker-pool half, G2. These are mostly frontend changes on top of the freshly-hardened F-series. The goal is that every existing interaction feels measurably smoother, and the diagnostics screen proves it with real numbers. Ship this before any headline feature: polish compounds trust, and the audit work just raised the floor.

**Wave 2 — the identity and memory spine (the differentiators).**
B1/B2 (layered sprites + emotion director) and C1/C2 (LumiBooks + Context Viewer), with E1 (prompt timeline) riding alongside since the studio is open anyway. This is where Lumiglyphics stops being "a really well-built VN reader" and becomes the platform that keeps characters *visually and factually consistent* in a way none of the researched competitors do. The fail-closed, bounded, cache-verified engineering culture from the audit is exactly what makes these trustworthy where Risu/ST implementations feel heuristic.

**Wave 3 — interactivity and authoring depth.**
D1/D2 hotspots and inventory, E3/E4 macros and packs, F1 PWA, G3 extension API. By this point the data model supports Voyage-style agency without copying its hand-authored-world limitations, because Lumiglyphics' world state is generated but lineage-verified.

## The one decision to make first

The sprite strategy (B1) has a fork: **(a)** own a compositing layer format (more work, full quality control, cache-friendly layer ids), or **(b)** consume Risu/ST-style single emotion images first and composite later (faster time-to-market, migration path). Recommendation: **spec the layered format now, accept single-image emotion sheets in v1** — the identity/cache plumbing treats both identically, so no rework either way.

## What we should deliberately *not* do

- **No free-form scripting engine in the first year.** STScript's power is also its support burden and security surface [S5]; the curated action library covers 90% of needs inside the existing sandbox model.
- **No gacha/collectible monetization mechanics** (Talkie's CG cards [C7]) — it conflicts with the user-owned, integrity-first positioning.
- **No cloud-only memory sync** until the local lineage model has a clean encryption story; the reference-history chain is valuable precisely because it is verifiable.
- **No chat-wide raw lorebook injection.** The planner-synthesis path (C1) is the moat; raw concatenation is the competitor default and the source of their context drift [S8].

## Success metrics

- *Engineering:* zero F-class regressions (the 1,794-test gate stays green), p95 paragraph path under one frame budget, cache hit rate visible per turn.
- *Experience:* time-to-first-image after opening a chat, number of manual regenerations per turn (should fall as B2/E2 land), backlog/snapshot usage.
- *Depth:* share of turns with an activated LumiBook entry that the planner synthesized without a protection warning — the signature metric that the bounded-memory approach works.

---

# Appendix A — Sources (research conducted 2026-10-24)

### SillyTavern
- [S1] SillyTavern release notes (macro engine, lorebook, groups, regex, TTS, quick replies, manifests): https://github.com/SillyTavern/SillyTavern/releases
- [S2] SillyTavern 1.15.0 Macros 2.0 announcement: https://github.com/SillyTavern/SillyTavern/discussions/4926
- [S3] Macros documentation: https://docs.sillytavern.app/usage/core-concepts/macros/
- [S5] Slash Command / STScript overview: https://deepwiki.com/SillyTavern/SillyTavern/7.1-extension-system
- [S7] World Info system: https://deepwiki.com/SillyTavern/SillyTavern/6.1-world-info-system
- [S8] Game-state decomposition (variables vs lore vs author's note vs summary): https://tableforge.gg/blog/sillytavern-game-state
- [S9] Memory Books group-chat support: https://github.com/snietzl2/SillyTavernMemoryBooks
- [S10] Multi-character memory discussion: https://www.reddit.com/r/SillyTavernAI/comments/1urvatb/memory_books_now_with_multicharacter_memory_support/

### RisuAI
- [R1] Project README (translators, lorebook, themes, mobile, triggers): https://github.com/kwaroran/Risuai
- [R3] Lorebook mechanics, 800-token budget, decorators, recursive scanning: https://arcanumrpgs.com/blog/risuai-lorebook/
- [R4] Platform overview and card formats: https://ai.miraheze.org/wiki/RisuAI
- [R6] Lorebook system and command/triggers: https://deepwiki.com/kwaroran/Risuai/5.4-lorebook-system
- [R7] RisuAI vs SillyTavern (modules, regex modes, emotion images): https://arcanumrpgs.com/blog/risuai-vs-sillytavern/

### NovelAI
- [N1] Lorebook docs with phrase bias and Add Context: https://docs.novelai.net/en/text/lorebook/
- [N2] Advanced settings, Context Viewer, banned tokens: https://docs.novelai.net/en/text/editor/advancedsettings/
- [N5] Feature overview including branching and token controls: https://synonymsvault.com/novelai-ai/
- [N6] Lorebook phrase bias incl. when-inactive: https://aedial.github.io/novelaiUKB/en/Lorebook.html
- [N7] Modules and community bias presets: https://plisio.net/ai/novelai-ai
- [N9] Vibe Transfer and image editing: https://aitechk.com/novelai-review/
- [N12] Scenario-builder bias group schema: https://github.com/wbrown/novelai-scenario-build

### Voyage (Latitude)
- [V1] Google Play listing (World Engine, skill checks, multiplayer, DM): https://play.google.com/store/apps/details?id=io.voyage
- [V3] Open-beta launch and single-world-state architecture: https://www.prnewswire.com/news-releases/latitude-opens-voyage-to-everyone-introducing-the-second-generation-of-ai-roleplay-302860961.html
- [V5] TechCrunch launch coverage (Voyage Studio): https://techcrunch.com/2026/04/21/voyage-is-an-ai-rpg-platform-for-creating-custom-gaming-worlds-with-ai-generated-npc-interactions/
- [V6] Mobile-first design philosophy: https://arcanumrpgs.com/clients/voyage/
- [V8] Hands-on UI teardown (cards, map, people strip, tone tags): https://branchingskies.com/blog/voyage-alternatives-curated-narrative-2026
- [V10] Open beta feature set incl. visual novel mode: https://voyage.io/releases/open-beta

### Zeta (Scatter Lab)
- [Z1] Business/feature review (Pieces, ad timer, plots, marketplace size): https://www.isekaizero.ai/blog/zeta-ai-review
- [Z2] Visual Novel mode and model selection: https://en.namu.wiki/w/zeta(%EC%95%B1%ED%94%8C%EB%A6%AC%EC%BC%80%EC%9D%B4%EC%85%98)
- [Z4] Snapshot and voice features, market traction: https://www.koreaherald.com/article/10613699
- [Z5] Feature summary (smart reply, snapshots, character creation): https://chrome-stats.com/d/com.scatterlab.messaging

### Chinese platforms
- [C3] Market segmentation (Maoxiang, Talkie/Xingye, Rubii, Mufy): https://www.chinatalk.media/p/ai-roleplay-a-deep-dive
- [C6] Sector overview and immersion patterns: https://36kr.com/p/3061925876721033
- [C7] Competitor teardown (Maoxiang/Talkie/wow feature and UX detail): https://www.woshipm.com/evaluating/6146340.html
- [C8] Traffic and narrative-preference analysis: https://36kr.com/p/3091373518290433
- [C10] Moderation/banned-term platform constraints: https://36kr.com/p/3521421957782665
