# Beyond chat: mechanics, features and polish for Lumiglyphics

**Research date:** 24 October 2026 · **Code baseline:** `0.2.0-beta.72`, branch `arena/bcd536d4-lumiglyphics`, HEAD `a34d5b9` at review time.

**Status:** researched proposals, not shipped functionality, approved scope or a replacement roadmap. No runtime changes accompany this document. This extends the [deep audit](2026-10-24-beta72-deep-audit.md), rather than repeating its five mechanics.

## The recommendation in one paragraph

**Make Lumiglyphics the continuity-aware stage for roleplay, not another roleplay service.** Its advantage is the transformation of an existing conversation into a readable, inspectable, emotionally coherent production: a stable cast, meaningful objects, remembered moments, controlled revelation and recoverable presentation. Borrow author control from NovelAI, the separation of rules and narration from Voyage, and scene/memory packaging from selected Chinese apps. Do not import their entire business models, build a second canon database behind the host, or mistake an attractive relationship meter for an actual simulation.

The three strongest new bets are **a source-backed relationship/event journal**, **diegetic artifacts that accumulate without inventing missing text**, and **a backstage continuity inspector that explains and repairs what Lumi believes**. Pair those with the already-planned cast variant work and reader-navigation polish. This produces a more distinctive product than adding ten new generation toggles.

---

## 1. Research: what is documented, what is inferred, what is worth adapting

### Evidence limits

This is public-documentation research plus inspection of the local repository, **not hands-on testing of these services**. Official descriptions establish advertised workflows, not reliability, latency, retention, artistic quality or correctness. Chinese descriptions below are translated/summarized; older observations are explicitly dated. Storefront availability and feature access can vary by account and region. “Less familiar to a US audience” is a research direction, not a measured awareness claim.

“Voyage” is interpreted as **Latitude's Voyage AI RPG Platform**, Android package `io.voyage`, not the unrelated Voyage AI embedding service. The store listing identifies its developer lineage and describes its RPG/world-building workflows. [1](https://play.google.com/store/apps/details?id=io.voyage&hl=en_US)

### 1.1 NovelAI — steal inspectability, not another settings labyrinth

**Documented:** Lorebook entries activate using keys; entries can be imported/exported, embedded in PNGs and hidden from view. Its Context Viewer exposes inclusion/exclusion reasons, source sections, activation keys and token allocations. [1](https://docs.novelai.net/en/text/lorebook/) [4](https://docs.novelai.net/en/text/editor/advancedsettings/)

**Documented:** Director Tools offers background removal, emotion changes, colorization and other targeted transformations. The documentation explicitly warns that emotion edits can affect more than the face and work best on a clear, front-facing single anime character. [1](https://docs.novelai.net/en/image/directortools/)

**Adaptation:** Show not just “this is the prompt,” but **why each source was included, what was excluded, what changed and what the reader is allowed to know**. Offer image operations by intent—“make a neutral base,” “create an expression,” “remove background”—only when the actual connection supports them.

**Do not copy:** dozens of expert context controls as the first-use experience. Also, hidden-from-view lore is not proof of a security boundary: Lumi must enforce disclosure before data reaches a reader-facing view or request.

### 1.2 Voyage — steal the authority boundary

**Documented:** Latitude describes a World Engine separate from narration, with structured world state and consequences; the Android listing advertises skill checks, relationships, world creation, multiplayer and a DM role. These are vendor claims, not independently verified guarantees that a character “never forgets.” [15](https://www.businesswire.com/news/home/20260421658665/en/Voyage-Launches-the-First-AI-Native-RPG-Platform-Signaling-the-Future-of-Gaming) [1](https://play.google.com/store/apps/details?id=io.voyage&hl=en_US)

**Adaptation:** Lumi should **display authoritative outcomes supplied by a rules provider**, while leaving prose improvisation and user intentions separate. A provider can say a lock is open; a generated sentence suggesting a lockpick attempt must not make it open.

**Do not copy:** a complete autonomous RPG engine inside Lumi. The existing roadmap explicitly defers autonomous simulation and a parallel memory/RPG engine (`docs/ROADMAP.md:45–47`). Multiplayer also needs host/server authority; window events are not multiplayer transport.

### 1.3 星野 / Xingye — steal the artifact, not the compulsion loop

**Documented:** Its developer-provided App Store description emphasizes user-created agents with configurable appearance, voice, persona and skills. [1](https://apps.apple.com/cn/app/%E6%98%9F%E9%87%8E-%E6%89%80%E5%BB%BA%E7%9A%86%E4%BD%A0%E6%89%80ai/id6463076337)

**Historical observation:** A December 2023 product analysis describes 星念 as “memory photos,” with an image on the front and a story on the back, and describes rewind, memory controls and an event journal. The same analysis questions how tightly the cards connect to actual conversations. Treat this as historical design evidence, not a verified 2026 specification. [14](https://www.woshipm.com/evaluating/5946439.html)

**Adaptation:** Turn a real passage and its existing image into a keepsake with a return-to-passage anchor. Make the image/story connection explicit and editable.

**Do not copy:** paid random memory rewards, relationship grinding, exclusivity purchases or mechanics that punish absence. The remembered moment should belong to the user's story, not to a retention funnel.

### 1.4 猫箱 / Maoxiang — steal conversational embodiment

**Documented:** Its App Store description emphasizes distinct virtual characters, voice interaction and personalized stories. A 2024 TechNode hands-on report describes expressive parenthetical actions and characters initiating topics during interaction. [1](https://apps.apple.com/cn/app/%E7%8C%AB%E7%AE%B1-%E5%92%8C%E5%BF%83%E5%8A%A8-ai-%E6%8E%A2%E7%B4%A2%E5%89%A7%E6%83%85%E5%AE%87%E5%AE%99/id6475000292) [9](https://cn.technode.com/post/2024-11-08/maoxiang-app-tested/)

**Adaptation:** More expressive delivery of **existing prose**: clear speaker identity, distinct but restrained vocal direction, readable gestures and silence. The visual stage can embody an action without manufacturing an extra chat reply.

**Do not copy:** off-session messages masquerading as actual story events. Lumi is not the narrator and must not invent that a character called while the user was away.

### 1.5 筑梦岛 / Zhumengdao — steal scene packaging and revisitable memory

**Documented:** The developer description distinguishes character creation, multi-character rooms, saved “dreams” that can be shared or continued, and 小剧场 (“little theaters”) containing backstory, special situations, story fragments or side episodes. The listing's version history also documents a character-diary feature in November 2025. [1](https://apps.apple.com/us/app/%E7%AD%91%E6%A2%A6%E5%B2%9B/id6465838500?l=zh-Hans-CN&platform=tv)

**Adaptation:** A story need not be an undifferentiated chat log. Give scenes a **premise, cast, local presentation and a meaningful return point**. Distinguish the reusable character from the particular situation they are in.

**Do not copy:** automatic “private diary” generation presented as evidence of a character's hidden thoughts. A diary is either actual revealed story text, explicitly author-authored material, or clearly labeled non-canon speculation.

### 1.6 冒泡鸭 / Maopaoya — useful historical scene-first reference, uncertain service status

**Documented:** Its public site organizes entry around both characters and strongly framed situations, including a survival setting, a clinic and an escape-game scenario. The site also advertises configurable agents and contextual interaction. [9](https://maopaoya.com/)

**Status caveat:** June 2025 reporting describes reduced investment and merger of its team into another product, with limited remaining maintenance. A still-visible landing page does not establish that the original service remains fully operational in October 2026. [18](https://www.oschina.net/news/353456)

**Adaptation:** A strong playable premise is more compelling than “chat with this character.” An interaction tray can expose the current scene's **unresolved questions and verified affordances**, rather than generic suggested replies.

### 1.7 叨叨 / Daodao — a narrow historical lesson in purposeful interaction

**Documented:** Its store description combines character interaction and little-theater group chats with practical loops such as bookkeeping and vocabulary practice. The visible listing includes old release history, so this is a documented concept, not a claim about current operating quality. [4](https://apps.apple.com/us/app/%E5%8F%A8%E5%8F%A8-ai%E8%81%8A%E5%A4%A9%E8%AE%B0%E8%B4%A6-%E8%AF%ADc%E9%99%AA%E4%BC%B4/id1613151419)

**Adaptation:** Give interaction an understandable purpose—inspect a document, follow up a promise, revisit an unanswered question—without forcing every session into stat progression. **Do not add real financial/personal tracking to Lumi:** that is unrelated scope and unnecessary sensitive data.

### The transferable pattern

These sources suggest three useful design patterns—not universal claims about a national market:

1. **Character + situation + artifact:** the agent is not the whole product; scenes and souvenirs give interaction structure.
2. **Control after a bad response:** repair, rewind and inspection matter as much as initial generation.
3. **Embodiment without more prose:** voice, staging, expression and pacing can make the same words feel materially better.

For Lumi, the corresponding loop should be:

> **Read → notice → inspect → choose an editable intention → let the host/provider resolve → preserve the meaningful moment.**

---

## 2. Product boundary: four owners, not four competing truths

| Owner | Owns | Must not silently own |
|---|---|---|
| Host conversation | Actual prose, message edits, alternate swipes, host branches and submission | Lumi-only visual preferences |
| Lumi | Reveal-scoped presentation, artwork attribution, reader cursor, user annotations, recoverable local drafts | Combat success, new dialogue, secret motives or inventory canon |
| Optional rules provider | Its declared state, rules, capability checks and accepted outcomes | Unrelated host/companion facts |
| User/author | Corrections, scene intent, disclosure decisions, optional worldbuilding | Automatic promotion of a local note into everyone else's canon |

**Code reality:** `src/frontend/host/game-bridge.ts:45–63` parses bounded choices; `:113–118` consumes a local choice and emits a pick event. It does not implement rules, persist a world, authenticate the event sender or prove the provider executed the action. Same-window events are interoperability, not a security boundary.

**Code reality:** `src/shared/presentation-entities.ts:6–12` already distinguishes evidence source, visibility and reveal anchor. `src/backend/runtime/entity-projection.ts:35–36` produces observed facts; `:108–119` validates reader projections against turn identity and disclosure. Preserve that separation.

**Code reality:** `src/backend/runtime/context-providers/session.ts:18–19` deliberately returns source status only. The existence of LumiBooks/LumiScript adapters does **not** mean their facts are currently admitted into reader dossiers or planner memory.

**Design rule:** Every new mechanic must answer “Who is allowed to say this is true?” before answering “What animation does it get?”

---

## 3. Twelve concrete features and mechanics

Labels: **Roadmap extension** builds on selected work; **New proposal** needs explicit approval; **Host/provider dependent** cannot honestly ship as a Lumi-only mechanic. Cost statements describe the proposed MVP, not today's implementation.

### F1. Relationship receipts — remember why a bond changed

**Pitch:** Instead of an unexplained heart meter, show source-backed moments: *“You kept Mara's secret”*, *“You returned the compass”*, *“Mara declined to answer.”* Tap one to return to the passage. Separately, the user can annotate *“This mattered to my character.”*

**The Value:** Turns relationship development into something inspectable and emotionally meaningful without pretending the model has a persistent affection score. Works for rivals, mentors, siblings and uneasy allies—not just romance.

**Architectural Fit:** **New proposal**, adjacent to reference reconciliation and deeper History. Reuse `PresentationAnchorSchema` and `EvidenceSourceSchema` (`src/shared/presentation-entities.ts:5–7`), but introduce a separate bounded event/annotation record rather than stuffing events into appearance state. `StageDossiers` (`src/frontend/stage/dossiers.ts:9`) is the natural entry surface. Cross-turn entity identity needs reconciliation first: local IDs such as `e1` are not global character IDs (`entity-projection.ts:27`).

**MVP:** User pins a revealed passage to a selected character and chooses a label. Show the quotation, source version and annotation. No classifier or additional LLM call. A later optional extractor proposes receipts for approval; it does not assign emotional valence as fact.

**Trade-offs:** An NPC's statement is an event, not proof of sincerity. Corrections/swipes must orphan or rebind receipts explicitly, never silently attach them to replacement prose. Keep author notes separate from story evidence.

**Acceptance:** Pinning creates zero generation requests; editing the source marks the receipt outdated; deleting the source retains the user annotation but clearly loses the citation; another branch never inherits it without verified ancestry.

### F2. Promises and open threads — unresolved, not automatically failed

**Pitch:** A quiet “Threads” drawer: *return the compass*, *ask about the missing carriage*, *meet at dusk*. States are **mentioned / user-tracked / explicitly resolved / contradicted / source unavailable**. A calendar deadline is shown only if time is actually supplied.

**The Value:** Creates direction without generic AI-suggested choices or a compulsory quest log. The reader remembers what they cared about.

**Architectural Fit:** **New proposal**, using the same evidence infrastructure as F1. Feed an editable intention to `ReplyDraftEditor` (`src/frontend/stage/interaction-tray.ts:3`) rather than submitting or asserting success. Rules-provider quests remain a separately labeled source.

**MVP:** Select a passage → “Track this thread”; user edits its title and can mark it resolved. Track an unresolved question without inferring who knows its answer.

**Trade-offs:** Do not call silence a broken promise, elapsed real time an in-world deadline, or a UI checkbox a world-state update. Avoid automatic “you abandoned them” messages. Thread notes should not reach the host model without an explicit supported export/injection policy.

**Acceptance:** Checking a box changes only the local journal; no relationship score changes; no timer advances while the reader is offline.

### F3. The evidence desk — playable documents, not generated filler

**Pitch:** Letters, journal pages, maps and clues collect on a desk. A torn letter can gain a second verified fragment later; inaccessible sections remain visibly missing. Put two known clues beside each other and write a **user hypothesis**, not a fabricated conclusion.

**The Value:** Gives exploration and mystery play a satisfying object loop. Documents become part of the story's interface rather than disposable quoted paragraphs.

**Architectural Fit:** **Roadmap extension** of H expanded documents (`docs/ROADMAP.md:13`). Reuse `createDocumentReader` (`src/frontend/stage/document-reader.ts:4`) and `validateStoryDocuments` as called in `entity-projection.ts:38,118`. Add stable document identity and fragment/access revisions before cross-reply merging.

**MVP:** A list/grid of legitimately revealed document fragments with exact quotes, “found in” anchors and a comparison pane. A document's paper/screen skin is decorative; its text remains literal selectable DOM text.

**Trade-offs:** Similar names do not prove two scraps belong to the same document. Translation, reconstruction and forgery detection are author/provider actions, not free UI deductions. Reader knowledge can exceed character knowledge; label perspective explicitly.

**Acceptance:** Jumping to an earlier paragraph hides later fragments; unread/sealed text is not shipped to the document DOM; merging requires confirmed identity; quoted words are not silently paraphrased.

### F4. Diegetic channels — phone, radio, letter, public notice

**Pitch:** Render a source-identified exchange as a phone conversation, radio transmission, letter or notice board. Keep the host prose unchanged and provide an immediate “plain text” toggle.

**The Value:** Strong genre identity at little or no inference cost. A station mystery and a modern romance should not feel like the same text box with different wallpaper.

**Architectural Fit:** **New proposal**, downstream of F3 and presentation rules. Introduce a small validated channel enum with source/reveal anchors, not arbitrary planner HTML. `src/frontend/stage/panel-document.ts:8` already isolates pinned HTML; these core reading surfaces should instead use Lumi-owned typed components. Explicit author assignments can arrive before automatic classification.

**MVP:** Apply a channel to a selected revealed passage, this passage only. Style the container and label the medium. No simulated notifications or invented timestamps.

**Trade-offs:** Phone layouts can reduce text width and harm reading; avoid bubbles for long narration. A received letter does not prove the sender is present. A radio voice does not authorize a portrait on stage.

**Acceptance:** Copy/search/export returns the original wording; screen readers announce sender and medium once; no fabricated “typing…” event is represented as a real NPC action.

### F5. Reader knowledge versus character knowledge

**Pitch:** Let a dossier distinguish **seen in the story**, **known by my character**, **stated by someone**, and **my speculation**. A mystery can reveal a villain to the reader without making the player character omniscient.

**The Value:** Makes dramatic irony, unreliable narrators and mystery play possible without accidental spoilers or false certainty.

**Architectural Fit:** **New proposal**, after C/D source reconciliation (`docs/ROADMAP.md:12`). Existing visibility values (`observed/private/unclassified`, `presentation-entities.ts:7`) are necessary but insufficient: “observed by the reader” is not “known by this character.” Add explicit perspective/knowledge grants. Start with user annotations, not inferred omniscience.

**MVP:** A “my character knows this” annotation on an already revealed fact. Keep it out of automatic prompt injection until a separate host contract is approved. Never expose private/unclassified companion data to let the user classify it.

**Trade-offs:** This is a real model change, not a pair of filter chips. An NPC belief requires source evidence and a knower; a narrator's claim is not universal truth. Switching perspective must not expose sealed data through search counts, image thumbnails, tooltips or accessibility labels.

**Acceptance:** Reader and character views produce different, testable fact sets; a hidden fact cannot be recovered through export, search snippets or alternate image text.

### F6. Backstage inspector — “Why does Lumi think that?”

**Pitch:** Tap a portrait, outfit, place or prompt ingredient and inspect a compact chain: **current assignment → source passage/card → precedence decision → final usage**. Repair the exact layer responsible.

**The Value:** A direct answer to wrong-character art and continuity drift. Makes recovery teachable rather than a sequence of retries and unexplained edits.

**Architectural Fit:** **Roadmap extension** of existing prepared briefs and cast transparency. `src/frontend/image-review/prepared-brief.ts:3` already projects request metadata; `docs/ROADMAP.md:65–73` records source-selection progress and remaining per-field provenance. Extend that evidence path rather than creating a new LLM explanation. NovelAI's context inclusion reasons are the useful reference, not its whole settings surface. [4](https://docs.novelai.net/en/text/editor/advancedsettings/)

**MVP:** Show supplied source, rejected/conflicting source, selected value, saved request snapshot and correction scope. Where final prompt occurrence mapping is absent, say “not recorded”; do not fabricate an explanation. Keep a proposed next prompt separate from the request that actually produced an existing image.

**Trade-offs:** Provenance makes data gaps visible. That is good. Never label character counts “tokens” without the correct tokenizer. A passage shown in a reader-level inspector must itself be eligible for that reader; expert logs are not an excuse for spoiler leakage.

**Acceptance:** Changing today's cast settings does not rewrite an old image's explanation. A source absent from saved metadata remains unavailable. The correction button names “this picture / future pictures in this chat” before spending.

### F7. A wardrobe and expression rack, with neutral fallback

**Pitch:** Manage a small rack of **identity × outfit × expression × pose** variants. Preview a neutral base, attach supplied art and replace just the selected slot. Missing expression? Use the compatible neutral portrait—not a paid surprise generation.

**The Value:** Delivers the biggest immediate VN quality improvement: a character stops changing face, framing and costume every time their mood changes.

**Architectural Fit:** **Roadmap extension**, directly E2/E3 (`docs/ROADMAP.md:11,51`). `SceneImageIdentity` in `src/backend/core/scene-image-cache.ts:36–52` already carries pose information; `src/backend/runtime/images.ts:406` constructs that identity. Extend compatibility deliberately. A “smile” render is not interchangeable across outfits, identity revisions or framing. Keep whole-portrait variants as the first implementation; face-only compositing is a separate image-alignment problem.

**MVP:** Manual variant assignment and neutral fallback, with import/export only for assets the user may share. Later expose supported emotion/background-removal operations through a capability adapter. NovelAI documents such tools, but that does not establish availability through Lumi's current host connection. [1](https://docs.novelai.net/en/image/directortools/)

**Trade-offs:** Rerendered expressions can alter more than the face; transparent cutouts can have edge artifacts. Full variant grids grow combinatorially. Make expression optional, outfit compatibility strict and generation per-slot opt-in.

**Acceptance:** Browsing the rack costs zero requests; changing outfit cannot reuse an incompatible smile; missing variants remain explicitly missing; a provider without edit support still works with user-supplied portraits.

### F8. Stage blocking — a scene is not just a speaker portrait

**Pitch:** Pin a character to left/right, preserve who remains on stage and let dialogue focus move subtly between them. Distinguish **speaking**, **present**, **mentioned** and **remote**. Offer “keep this composition for this scene” as a local override.

**The Value:** Prevents visual teleportation and makes ensemble conversation easier to follow. A silent witness should not disappear merely because someone else spoke.

**Architectural Fit:** **Roadmap extension** of richer placement, with a **new local blocking override**. `entity-projection.ts:42–57,71–78` already separates cast, speaker and drawable cue subject; `PresentationSnapshotSchema` (`presentation-entities.ts:12`) preserves those identities. `src/frontend/stage/cast-stage.ts:9–11` supplies existing focus styling. Do not treat provisional presence as globally solved.

**MVP:** Manual left/right lock for the already-supported cast, scoped to the scene identity; no automatic expansion to a stage full of NPCs. Explicit remote/offstage label can suppress a portrait without changing prose.

**Trade-offs:** Automatic blocking can imply physical presence the prose never established. A fixed slot can conflict with manga/ensemble images. A scene boundary releases the lock; corrected identity invalidates it. Avoid mandatory pan/zoom and preserve current full-scene image behavior.

**Acceptance:** Mentioning someone does not spawn them; remote dialogue does not mark them present; reduced motion removes movement but preserves the active-speaker border.

### F9. Beat-level direction — silence and emphasis without rewriting

**Pitch:** Give an already-written beat a pause, restrained focus change, caption treatment or music envelope. Let the user override “too intense” for this beat and preview it instantly.

**The Value:** Emotional pacing is not proportional to the number of effects. One deliberate pause can do more than animated letters, camera shake and weather running together.

**Architectural Fit:** **Roadmap extension** of reader rhythm and presentation rules, plus **new beat-level overrides**. `buildPresentationTimeline` (`src/backend/runtime/presentation-timeline.ts:7`) supplies paragraph beats. `AudioEngine.setBgmAttenuation` (`src/frontend/stage/audio-engine.ts:133`) and `fadeVolume` (`:274`) are real integration points. Current Quiet means a factor of 0.35, not a guaranteed perceptual loudness level or dialogue mix.

**MVP:** User-assigned pause/focus/Quiet override on a paragraph, previewed without an LLM. Add gain ramps with cancellation ownership, not another independent timer competing with BGM fades.

**Trade-offs:** No real-time pacing if autoplay is off; the reader decides when to advance. Equal-power crossfades are not universally correct for correlated tracks. Respect OS reduced motion, user effect settings, speech playback and device audio unlock requirements.

**Acceptance:** Skip bypasses optional pauses; tab hiding suspends animation work; mute stays muted during transitions; rapid paragraph changes cannot leave attenuation stuck at 0.35.

### F10. Memory postcards and a spoiler-safe return ritual

**Pitch:** Save a moment as an image on one side and an exact quote plus user caption on the other. On returning to a long chat, show **where I stopped / who was present / what I was tracking**, drawn only from already-read evidence.

**The Value:** Gives History emotional structure and makes long-running roleplay easier to resume. The keepsake is an actual story moment, not a random collectible.

**Architectural Fit:** History grouping is a **roadmap extension**; postcards and resume recaps are **new proposals**. Reuse source/image attribution and reader anchors. A bounded read index is required; `readReferenceHistory` (`src/backend/runtime/reference-history.ts:95`) is an ancestry check, not a general long-term search database. The bookmark timeline remains deferred (`docs/ROADMAP.md:47`).

**MVP:** Manual save from an already-read passage using existing art. Resume card uses deterministic labels and quotations—no generated summary or new illustration. “Return to passage” is offered only when that exact source can be resolved.

**Trade-offs:** A recap can spoil later paragraphs in the same generated reply. Store the consumed cursor separately from the plan's full text. Exports may disclose personal prose; show a privacy/rights preview and strip credentials, raw prompts and unrelated metadata by default.

**Acceptance:** Returning at paragraph 4 cannot recap paragraph 9; deleted art shows a placeholder rather than generating a replacement; saving/exporting a card has zero provider cost.

### F11. Capability cards and outcome receipts

**Pitch:** An object card says *what can be attempted*, *why the action is available*, and—when a provider supports it—*what actually happened*. For a brass key: “Try on this lock” is an intention; “Lock opened” appears only after an authoritative accepted result.

**The Value:** Brings Voyage-like legibility to gameplay without building Voyage's engine. The player sees the difference between a suggested action, a submitted action and a resolved outcome.

**Architectural Fit:** Capability-based item actions are a **roadmap extension** (`docs/ROADMAP.md:14`); authoritative receipts are **host/provider dependent**. Current `GameBridge.pick` (`game-bridge.ts:113–118`) has no provider revision, request ID or receipt in its emitted detail. A versioned protocol extension needs provider session/revision, bounded request IDs, acknowledgement/result semantics and duplicate suppression. Preserve v1 compatibility explicitly; do not silently reinterpret it.

**MVP:** Keep local Examine/Ask drafts as-is. For an opted-in provider, display its own named result and state revision. If acknowledgement is missing, show “outcome unknown; refresh state,” not a retry that might spend twice.

**Trade-offs:** A UI-generated probability must never masquerade as a rules check. Providers can lie or be buggy; label attribution. Same-window event validation does not establish sender authenticity. Payment idempotency requires cooperation from the actual execution owner, not just a frontend map.

**Acceptance:** Double taps execute at most once for cooperating providers; delayed old results cannot overwrite newer state; reload reconciles rather than assumes success; browsing a card never consumes an item.

### F12. Side-stage rehearsal — experiments that do not rewrite canon

**Pitch:** Preview a different presentation cut, or prepare an editable “what if?” premise. Clearly separate **visual rehearsal** from **a real alternate story branch**.

**The Value:** Encourages experimentation without fear of losing the version the user liked. Useful for outfits, mood, staging and actual narrative alternatives when the host supports them.

**Architectural Fit:** **New proposal**; prose alternatives are **host dependent**. Existing swipes and `samePresentationTurn` (`presentation-entities.ts:22–23`) identify versions but do not prove branch ancestry. A visual rehearsal can stay local; a narrative fork needs host-provided branch identity, a cloned cursor and scoped source/art bindings.

**MVP:** Preview local staging/rhythm settings against saved text and already-available art; Apply or Discard. No story generation. Show “Open host branch…” only if the host offers a verified operation.

**Trade-offs:** A sandbox can accidentally leak alternate knowledge, mutate shared dossiers or start paid jobs. Do not simulate a branch with an untracked array of messages. “Reproduce the same settings” is not “regenerate identical pixels”: seeds do not guarantee provider determinism.

**Acceptance:** Discard restores the prior view and drafts; rehearsal cannot alter the canonical turn record; no generation begins merely by opening the preview; host branching remains disabled when unsupported.

---

## 4. More ambitious experiments — promising, but not the next release

### E1. A belief board for mysteries

**The Value:** Show competing claims: “Mara says the gate was shut” versus “the journal records a visitor.” Let the player connect evidence and write a hypothesis.

**Architectural Fit:** Extend F3/F5 with claim attribution and perspective, not a universal truth graph. Begin entirely with user-selected revealed quotations. No automatic contradiction verdict required.

**Trade-offs:** Semantic contradiction detection is uncertain; “disagrees with” is not “proved false.” A board can become a second memory engine if fed back indiscriminately. Gate behind verified cross-turn identity and compact projection storage.

### E2. A location atlas that admits what is unknown

**The Value:** An itinerary of actually visited places with known connections makes exploration feel spatially coherent.

**Architectural Fit:** Start as a revealed location list using `locationId` in presentation snapshots. Add a graph only for explicit source-backed connections, and coordinates only from a provider or author. Store-scoped IDs require reconciliation before merging visits.

**Trade-offs:** Text mentions of two places do not establish adjacency, direction, distance or a traversable path. Never let the image model draw a map that becomes authoritative geography. This is distinct from the existing point-and-click hotspot proposal.

### E3. Voice casting and delivery direction

**The Value:** Consistent voice identity and restrained delivery can improve multi-character readability more than elaborate animation.

**Architectural Fit:** A versioned voice binding per reconciled character plus a speech-capability adapter; current speech configuration is a starting point, not evidence that every backend supports emotional control, streaming or phoneme timing. All spoken text must come from eligible prose.

**Trade-offs:** Requires explicit provider support, licensing/consent for supplied voices, cost controls, cancellation and a text-only fallback. Do not infer voice traits from sensitive identity attributes, clone an identifiable person's voice without authorization, or promise lip-sync without alignment data.

### E4. Shareable scene capsules

**The Value:** Package a premise, cast bindings, supplied art, local style and a starting passage so another user can stage a scene quickly. This adapts the little-theater pattern without requiring a public content feed.

**Architectural Fit:** A typed, versioned, data-only import/export package. Inventory its files and sources before enabling it; preserve host ownership of prose. Reusable presentation packs are explicitly deferred (`docs/ROADMAP.md:47`), so this needs a separate decision.

**Trade-offs:** Asset rights, private character data, prompt injection, archive bombs and portability. No executable scripts, arbitrary CSS by default, secrets, paid jobs or automatic host submission in an imported capsule. Preview permissions and total sizes before import.

---

## 5. Polish that should land before another large feature

The previous audit identifies architectural defects; this section turns them into **user-facing acceptance targets**, not claims of work completed. Numbers below are proposed test targets, not measured current performance.

### 5.1 Reader rhythm and visual stability

1. **Reserve geometry:** keep dialogue controls, status strip and image slot dimensions stable while loading. Decode before replacing the displayed asset; failed decoding keeps the last valid art and a retry affordance.
2. **One input, one meaning:** first advance completes text reveal; next advance moves the passage. An input that dismisses a modal must not also advance the story.
3. **No auto-stealing the page:** a completed background image must not scroll, focus an inspector or reset the reading cursor.
4. **A calm speaker handoff:** short border/opacity transition; never dim inactive dialogue below readable contrast. Keep a static active marker with motion disabled.
5. **Paragraph-aware text reveal:** batch work into animation frames, avoid per-character rewrites of the full remainder and pause offscreen work. Preserve selectable/copyable full text.
6. **Readable effect fallback:** plain text toggle for stylized text; CJK, emoji, combining characters and screen-reader reading must not split into broken fragments.

**Code anchors:** `src/frontend/stage/vn-stage.ts:1577` (`updateSceneImage`), `:1696–1731` (keyboard handler), `:2109` (`startTypewriter`); `src/frontend/stage/text-effects.ts:282` (`applyTextEffects`).

### 5.2 Recovery and spending clarity

7. **Name the failed layer:** “prompt preparation failed,” “provider rejected size,” “image download failed,” and “display failed” need different recovery actions.
8. **Separate the four verbs:** Retry failed generation, Rewrite prompt, Replace displayed art and Replan reply should never look interchangeable.
9. **Preserve failed drafts:** reopen a replacement and recover its exact prompt, template and parameters. Use the composite draft key consistently; the previous audit's `studio.ts:124` mismatch is still a prerequisite fix.
10. **Tell the spending truth:** “Uses existing art,” “Will request one image,” or “Provider pricing unavailable.” Never invent a dollar estimate from request count alone.
11. **Respect cancellation limits:** distinguish “stopped waiting locally” from “provider confirmed cancellation.” Local abort does not establish that a paid remote job stopped.
12. **No punitive error walls:** a nonblocking status chip with an expandable diagnostic is better than replacing the passage with a stack trace.

**Code anchors:** `src/frontend/image-review/studio.ts:124,279` (draft lookup/key), `src/backend/runtime/controller.ts:237` (`abortAssetBatch`), `:1592` (`queueImageRetries`), `src/frontend/image-review/prepared-brief.ts:3`.

### 5.3 Mobile, keyboard and overlay navigation

13. **Back means one layer:** document → dossier → reader restores focus and scroll at every step. Close returns to the reader; “Back to chat” leaves the VN. Use distinct labels/icons.
14. **Browser Back is scoped:** integrate overlay history only if host navigation can be preserved; do not trap Android Back inside Lumi or replace the host's history entries blindly.
15. **Reviewer keyboard survival:** on a narrow phone with the software keyboard open, the active field and primary action remain reachable; account for visual viewport/safe-area insets.
16. **Touch panel controls:** explicit Move/Resize mode plus a reset-to-visible action. Do not make tiny resize handles the only recovery path; prevent drag from swallowing reading gestures.
17. **Visible keyboard map:** show existing ←/→, Enter/Space, L/A/S and Escape behaviors. Add new shortcuts only after collision checks; do not commandeer L for a new journal.
18. **Focus and scrolling:** trap focus only in true modals, restore the opener, avoid trapping the parent reader's scroll, and keep touch targets at least 44 CSS px where feasible.

**Code anchors:** `studio.ts:27–31` (narrow/short viewport CSS); `src/frontend/stage/panel-dock.ts:218–238` (drag/move); `vn-stage.ts:1696–1731` (current shortcuts). Physical Android/iOS checks remain necessary.

### 5.4 Settings without fatigue

19. **Tasks first:** “Make dialogue easier to read,” “Keep cast artwork consistent,” and “Reduce image spending” should reveal relevant controls, not add three new unrelated settings pages.
20. **Scope beside the control:** label global/chat/picture, effective now/next preparation, and whether a change can spend money. Existing images keep their attribution.
21. **Local preview and undo:** preview typography, motion and staging without saving global settings; Restore actually restores all previewed fields.
22. **Consequence summaries:** give Characters and Connections the same useful summary treatment as Reading/Pictures. Example: “Supplied portraits preferred; missing variants stay neutral.”
23. **Capabilities, not wishful toggles:** an unsupported edit operation is disabled with a reason, not shown as enabled and silently ignored.
24. **Suggested presets are transparent:** show the exact changed fields before applying a “quiet reading” or “cinematic” preset. No preset silently switches model, connection or paid generation policy.

**Code anchors:** `src/frontend/settings/routes.ts:34` (field routing), `src/frontend/settings/model.ts:395` (sections), `src/frontend/settings/panel.ts:2069–2085` (summaries). The previous audit counts 66 top-level config keys, not the original brief's 62.

### 5.5 Sound, accessibility and trust

25. **Ramp Quiet rather than snap:** use a bounded attack/release envelope owned by the audio engine; leaving a quiet beat restores the saved relative level, never an absolute volume that overwrites user choice.
26. **Reveal sound separately:** if offered, per-letter ticks are opt-in, rate-limited, disabled under skip and independently mutable. Do not require them for character identity.
27. **Text is the primary representation:** screen readers do not announce each animated letter or repeat the full passage on every cosmetic state update. A reduced-motion reader still receives all story information.
28. **Source unavailable is a first-class state:** deleted passages, old metadata and missing art remain navigable explanations, not empty cards or newly inferred replacements.
29. **Private export preview:** show which quotes, names and assets will leave the device/workspace. Strip hidden facts and provider/configuration secrets by default.
30. **A plain reading safety hatch:** one action disables decorative presentation without discarding story position, annotations, image assignments or saved settings.

**Code anchors:** `src/frontend/stage/audio-engine.ts:133–138,274`; `src/shared/presentation-entities.ts:7,11`; `src/backend/runtime/entity-projection.ts:108–119`.

---

## 6. Technical prerequisites: do not build a richer UI on weaker truth

### 6.1 Compact, bounded projections first

`projectTurnPresentation` currently returns no projection above 256 paragraphs (`entity-projection.ts:12`), when its delta budget overflows (`:90`), or when serialized presentation exceeds 512,000 JS string code units (`:103–104`). **That last threshold is not a measured UTF-8 byte count.** Adding relationship events and documents to duplicated paragraph snapshots makes the cliff worse.

Before F1/F3/F5 grow: design compact entity/evidence tables plus reveal deltas and periodic checkpoints. Put user notes in separate bounded storage. Preserve old record reading, validate migration and report unavailable presentation explicitly. Do not promise that every 100-paragraph turn fails: the previous audit's threshold was fixture-dependent, not a universal paragraph limit.

### 6.2 Stable identity is not a name string

`entity-projection.ts:20–28` deliberately keys local entities by exact kind/name and assigns turn-local IDs. Do not join `e1` across turns. A future reconciliation layer needs stable source-qualified IDs, explicit aliases, ambiguity handling and user-confirmed merges. A renamed NPC and two people sharing a name are different problems.

### 6.3 Historical validity is not branch authority

The turn key compares chat/message/swipe/fingerprint/revision (`presentation-entities.ts:22–23`). It does not supply a full host branch graph. Existing reference history validates bounded prior material; it is not permission to backfill every scene or merge alternate continuities. When ancestry cannot be established, display source unavailable rather than crossing branches.

### 6.4 Receipts require protocol work

Current pick events omit a request ID and provider revision (`game-bridge.ts:118`). The local revision at `:83` protects the current UI selection; it is not a server-assigned rules revision. Define idempotency, stale-revision rejection and explicit acknowledgement with provider maintainers before introducing spendable capabilities or outcome history.

### 6.5 Keep four kinds of data separate

- **Evidence:** what the source actually says, with revision and reveal anchor.
- **Interpretation:** a claim or summary, with its author/model and uncertainty.
- **Presentation override:** how to stage it, without changing source truth.
- **User annotation:** what the player wants to remember, private unless explicitly shared.

No conversion between these categories should happen just because they share a text field. Keep prompt injection policy separate from reader rendering policy: an untrusted imported document is story data, not an instruction to the model or a license to execute code.

### 6.6 Scope and cost stay explicit

A feature can have **zero extra calls**, **one explicit optional preparation**, or **provider-priced execution**. Do not blur those classes. Local browsing, sorting, exporting, previewing existing art and marking a journal entry must never trigger paid work. Source refreshes keep their bounded deadlines and late results cannot enter a newer chat.

---

## 7. Priority: what I would actually build

Effort labels are relative, not calendar estimates: **S** mostly one surface/derived state; **M** shared contracts plus persistence/UI; **L** reconciliation, protocol or migration work. “No extra calls” refers to the stated MVP only.

| Priority | Increment | Effort | Extra calls in MVP | Dependency / reason |
|---|---|---:|---|---|
| 0 | Fix remaining high-severity lifecycle, stale-write, prompt-protection and projection-limit issues from the audit | M–L | None | New mechanics amplify existing races and storage cliffs |
| 1 | Recovery vocabulary + replacement draft preservation + stable reader geometry | S–M | None | Immediate trust; finish the approved cohesive-experience work |
| 2 | F7 manual variant rack + F8 bounded blocking | M | None | Direct continuation of selected E2/E3 roadmap |
| 3 | F6 evidence-backed backstage inspector | M | None | Completes source transparency before richer evidence UI |
| 4 | Stable identity/access reconciliation + compact projections | L | None | Required foundation, not a glamorous standalone feature |
| 5 | F3 document fragments/evidence desk | M after foundation | None | Direct selected H-roadmap continuation |
| 6 | F1 manual receipts + F2 user-tracked threads | M | None | First genuinely new mechanic I would approve |
| 7 | F10 saved moments + cursor-bounded resume card | M | None | Builds on History, but postcards need approval |
| 8 | F4 channel skins + F9 local beat direction | M | None | Distinctive polish with a plain-text fallback |
| Later | F5 perspective knowledge; F11 authoritative results | L | Provider dependent | Require disclosure and protocol cooperation |
| Exploratory | F12 narrative forks; E1–E4 | L | Explicit / capability dependent | Host branches, scope decisions, provenance or sharing risk |

**If only one new mechanic is approved:** F1 + F2 as a single **Moments & Threads** drawer. Start with manual pins and exact source quotations. It adds meaning, costs no model calls and tests whether users want structured story memory before committing to an automated extraction engine.

**If only one visual feature is approved:** F7, the manual outfit/expression rack with neutral fallback. This is less speculative and more compatible than face-patch animation or automatic expression generation.

**If only one polish pass is approved:** unify Back/Close/focus/scroll behavior and preserve replacement drafts. Those changes benefit every future feature.

---

## 8. Evaluation plan: validate delight without manufacturing engagement

Do not optimize for session length alone. A longer session can mean a delightful scene or ten minutes repairing a failed image.

### A. Cohort fixtures

Maintain synthetic, shareable fixtures for: two characters with the same name; one character changing aliases; unreliable narrator; reader-only reveal; remote speaker; alternate swipe; edited source; missing image; sealed document; outfit change; 100+ paragraph reply; unavailable companion; provider timeout; narrow viewport with keyboard; reduced motion and screen-reader navigation.

### B. Correctness gates

- **Zero forbidden disclosures** in DOM, search, export, alt text, thumbnails or recap fixtures.
- **Zero paid requests** from opening/browsing/closing local surfaces.
- **Zero cross-chat/alternate-version commits** after delayed asynchronous work.
- Every claimed receipt has a resolvable source or an explicit unavailable state.
- Unsupported capabilities degrade to an explanation, not a fake success.
- An unresolved operation never becomes “failed, safe to retry” merely because a local timeout expired.

### C. Performance and UX targets

Proposed targets to measure on named devices, not results already achieved:

- Local drawers give visible feedback within 100 ms at the 95th percentile on the chosen mid-range Android device, using bounded fixture data.
- Long animations do not perform hidden-tab work; no repeated tasks over 50 ms during routine reader navigation in the profiled acceptance trace.
- Image-slot swaps produce no measurable layout shift attributable to slot resizing in the fixture.
- Focus and scroll restoration survive 20 nested open/back/close cycles without accumulating listeners, workers, iframes or retained detached views.
- An explicit memory/storage budget is tested for long History; do not solve speed by retaining every decoded full-size image.

### D. Useful product questions

- Can a user identify the wrong appearance source and repair the intended scope without regenerating repeatedly?
- Can they resume after a week without reading unseen text or scanning the entire chat?
- Can they find the passage behind a meaningful event quickly?
- Do tracked threads get revisited voluntarily, without alerts or guilt prompts?
- Does cast continuity improve with supplied variants across scene boundaries?
- Do users understand which actions are local notes versus canonical provider outcomes?

Test with private/local instrumentation or opt-in anonymized task outcomes. Do not upload intimate roleplay excerpts as product analytics. Report fixture/device/provider evidence separately.

---

## 9. Explicit “not now” list

1. A universal autonomous world simulator inside Lumi.
2. Hidden relationship scores inferred from every sentence.
3. Automatic private diaries that invent secret character thoughts.
4. Background paid prefetching as a default latency fix.
5. Forced daily check-ins, streak punishment or “your character misses you” guilt notifications.
6. Gacha access to story memories, core repair controls or character continuity.
7. A social discovery feed before import/export rights and privacy are solved.
8. Automatic camera motion, lip-sync or layer compositing without suitable input assets and capability evidence.
9. Branch diagrams built from guessed ancestry.
10. Another dozen settings pages as a substitute for coherent defaults.

**Bottom line:** the next leap is not more generated content. It is making the content the user already cares about **legible, consistent, embodied and worth returning to**. Lumi can do that while remaining an extension—and without pretending to control the underlying fictional world.
