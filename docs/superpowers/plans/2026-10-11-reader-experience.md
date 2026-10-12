# Lumiglyphics Reader Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development only if the user selects delegation. Implement and review one work package at a time. Steps use checkbox syntax for tracking.

**Goal:** Deliver features 1, 4, 5, 6, 7, and 8 for a mobile-first scenario/world-card reader, with native clickable entity dossiers and optional extension synergy.

**Architecture:** Extend the existing planner, per-turn projections, asset scheduler, and shadow-DOM stage. Add a small presentation entity model shared by scene staging, dossiers, rules, and interactions; it is a sourced projection, not a competing story-memory engine. Separate permanent descriptions, paragraph-specific state, and viewpoint-visible knowledge.

**Tech Stack:** Existing TypeScript, Zod, Bun >=1.4.0, Playwright, Spindle storage/host APIs, native shadow-DOM UI; retain the lumiglyphics identifier and existing build pipeline.

**Spec:** ../specs/2026-10-11-reader-experience-design.md, plus the user's scenario-card clarification and supplied inline-dossier examples as inspiration only.

**Status:** Beta.8 on `Testing`, 2026-10-11. A recovery controls now include per-chat card roles, scoped picture corrections, structured diagnostics and explicit current-reply replanning. Exact verified cached images are reused; other images wait for approval, with same-subject prior-art fallbacks. Package B and prior prompt/Manga/style increments are delivered. Packages C–G remain pending; next is typed entities/timed presentation. Verification: `docs/review-evidence/2026-10-11-replan-recovery.md`. Earlier unchecked implementation details remain a historical design checklist rather than a claim of identical implementation.

## Global constraints

- Scope: persistent locations/cast (1), clickable companion (4), presentation rules (5), timed changes (6), interactions (7), mobile reader (8). Storyboard editor, bookmark timeline, and presentation packs remain deferred.
- Scenario card title is not automatically a drawable person, location, or dialogue speaker. Preserve support for ordinary character cards and nonhuman characters.
- Canonical chat remains unchanged. All markup normalization, entity links, and presentation changes are extension-owned projections.
- Preserve the current image pipeline, held-request snapshots, provider compatibility, review toggle, dynamic-template toggle, and budget: default 4, range 0–12, 0 unlimited. All generated stage assets share that budget.
- No separate photo settings. Use existing Pictures, appearance, speech, and presentation settings; add contextual controls within the reader.
- Standalone mode works with all companion extensions absent. No automatic external writes, private-storage scraping, or dependency installation.
- Use user-scoped Spindle storage and targeted replies; no filesystem/runtime code generation in backend bundles.
- No full biography invented to fill fields. Missing evidence may remain missing. Dossier extraction does not create new canon or reveal secrets.
- A tap opens information or drafts prose; it never spends tokens, executes a game move, or reveals gated information automatically.
- New opt-in features default off; existing layout and playback behavior remain compatible until the user changes them. Scenario identity correctness and compact error handling are always-on fixes.

## Review focus

1. Scenario titles appearing as subjects/speakers; test a world card plus actual named NPC and an ordinary character card.
2. Future knowledge from late extension updates; test immutable old snapshots, uncertain timing, and hidden dossier fields.
3. Display regex transformations and ambiguous entity references; test readable anchors, safe omission, and no private facts reaching frontend tooltips/TTS/images.
4. Touch drag versus text scrolling, large fonts, and keyboard changes; test sheet controls without accidental paragraph advance.
5. Duplicate submissions, stale provider results, and budget exhaustion; test scope checks, one submission, and zero hidden image calls.

## Source map and implementation boundaries

Existing: `src/backend/runtime/planner.ts` extracts scenes/cues/speakers; `core/cue-state.ts` resolves identity; `runtime/images.ts` prepares/schedules pictures; `runtime/storage.ts` persists user/chat/turn projections; `src/shared/contracts.ts` and `src/protocol.ts` carry contracts. `src/frontend/stage/vn-stage.ts`, `rich-text.ts`, `audio-engine.ts`, `src/frontend/host/controller.ts`, `game-bridge.ts`, `src/frontend/theme/base-css.ts`, and `src/frontend/settings/panel.ts` provide the reader.

Keep new logic in focused modules listed below rather than expanding planner/controller further. Add optional fields with defaults for old stored turns. A failing migration preserves the original record and reports the error; no destructive reset.

Existing `VisualCue.kind` already supports `flattened_scene`, `background`, and `sprite`. Reuse that contract in E; do not add a competing cue taxonomy. The existing identity registry is sufficient for A; the typed cross-feature entity projection is introduced in C. A must not depend on files created only by C.

## Shared boundaries and storage decisions

All new serialized payloads use Zod validation at storage and frontend/backend boundaries. Use the existing user-scoped, serialized-write storage helper in `src/backend/runtime/storage.ts`; do not make a second file-write queue. Additive `StoredTurnRecord.presentation?: {version:1,entities,baseline,deltas}` and `TurnView.presentation?: {version:1,publicEntities,snapshots,anchors}` allow older records to render. Private facts stay in backend projections; frontend payloads contain only reader-visible facts. Before parsing new fields with strict schemas, recognize absent/version-1 data; unsupported future versions report unavailable while preserving the saved record.

New per-chat records: `card-role.json`, `presentation-entities.json`, `location-art.json`, and `reading-position.json`, all under the existing safe chat path and user namespace. Display notes, suppressed/pinned entity IDs, and chat rules live in `presentation-entities.json`; per-user tooltip/mobile/default-rule preferences extend existing config. Stored art uses host image IDs and provenance rather than copied credentials or persistent expiring URLs.

Canonical cross-feature interfaces (defined by C in `src/shared/presentation-entities.ts`; A uses existing registry types):

```ts
type EvidenceSource = {
  provider: 'story' | 'card' | 'manual' | 'lumibooks' | 'warp' | 'simtracker' | 'lumiscript';
  recordId: string; chatId: string; messageId?: string;
  sourceFingerprint?: string; observedAt: string;
};
type PresentationAnchor = { key: TurnKey; paragraphIndex: number };
type EntityFact = {
  id: string; entityId: string; field: string; value: string;
  visibility: 'observed' | 'private' | 'unclassified';
  source: EvidenceSource; revealedAt?: PresentationAnchor;
};
type PresentationEntity = {
  id: string; kind: 'npc' | 'place' | 'object'; name: string; aliases: string[];
  legacyCharacterId?: string; facts: EntityFact[];
};
type ReaderEntity = { id: string; kind: PresentationEntity['kind']; name: string; facts: EntityFact[] };
type ProviderScope = { userId: string; chatId: string; key: TurnKey };
type ProviderEvidence = {
  status: 'ready' | 'unavailable' | 'invalid'; source?: EvidenceSource;
  entities: PresentationEntity[]; deltas: EntityStateDelta[];
  timing: 'paragraph' | 'turn-end' | 'current-only'; diagnostics: string[];
};
type PresentationTimelineInput = {
  key: TurnKey; paragraphCount: number; entities: PresentationEntity[];
  baseline: Omit<PresentationSnapshot, 'at'>; deltas: EntityStateDelta[];
};
```

IDs remain stable across description/name changes and carry kind plus chat scope. Map NPC IDs to existing `CharacterRegistry` IDs rather than renaming old portrait keys. Collision/alias ambiguity never silently merges entities. C caps new planner projection at 32 entities, 128 facts, and 64 deltas per reply; each fact value is at most 1200 characters. If a projection exceeds bounds, reject that optional projection and retain the valid prose/image plan. Invalid metadata cannot fail the whole turn. Prune old local entity projections only when no stored turn/art/note references them; do not add unbounded per-user caches.

All UI requests use current source fingerprint, message/swipe identity, request ID, and authenticated frontend-message user context. Browser events are presentation evidence, not authenticated authority for backend writes. Same-turn asset/revision updates do not invalidate a cursor whose message/swipe/content is unchanged. Chat switch, edit, delete, and different swipe do invalidate pending interactions/requests. Closing the reader aborts new work but retains persisted approved art and the last valid reading position.

## Work package A — scenario identity and recovery

**Outcome:** World cards no longer become people merely because they name the card; unresolved image subjects have useful correction controls.

**Files:** Create `src/shared/card-role.ts`, `src/backend/runtime/subject-resolution.ts` and corresponding tests. Modify `planner.ts`, `core/cue-state.ts`, `images.ts`, `storage.ts`, `src/config.ts`, `src/protocol.ts`, `src/frontend/image-review/studio.ts`, `src/frontend/host/turn-status.ts`; extend existing planner/fallback/reference/reviewer tests.

**Interfaces:** `CardRole = 'auto' | 'character' | 'scenario'`; `SubjectResolution = {status:'resolved',entityId:string,appearance:string} | {status:'needs_subject'|'needs_appearance',candidateName?:string,reason:string}`; `resolveVisualSubject(input: SubjectResolutionInput): SubjectResolution`. Input includes card role, explicit cue reference, typed cast, local identity evidence, and template subject mode. Add a versioned, fingerprint-scoped `vn_correct_image_subject` request and explicit `vn_replan_turn` request; validate ownership before loading/mutating.

`SubjectResolutionInput` is defined in `subject-resolution.ts` as `{cardRole:CardRole,cardName:string,cardDescription:string,cue:Pick<VisualCue,'character'|'characterId'|'imageTemplate'>,registry:CharacterRegistry,roster:Array<{name:string,description:string}>,appearanceMap:CharacterAppearanceMap}`. No-people templates bypass character resolution and use their existing scene context; they never require fabricated identity. Failed extraction cannot erase an already supported same-person identity. An explicit different subject cannot inherit the old person's appearance.

Beta.7 boundary refinement: correction uses a canonical name resolved through the existing registry (including explicit aliases), with a derived id for a manually described person not yet registered. This supports unresolved cast without inventing an id in the UI. Names never become appearance tags. Explicit Scenario excludes automatic planner declarations of its wrapper; manual picture corrections remain available. The existing cue timeline remains authoritative. Beta.8 adds `ImageDiagnostic`, a bounded projection of its resolved subject/template/tracker/planner fields, rather than a second resolver. Explicit replan is delivered with mandatory approval; the legacy Try again recovery remains available. Exact cache verification determines reuse, and cold/unverifiable art is retained as a labelled fallback only for matching prose and identity.

Correction request payload: `{type:'vn_correct_image_subject',version:1,chatId,messageId,swipeId,sourceFingerprint,requestId,jobId,subject:{kind:'character',name,appearance?,saveAppearance:boolean}|{kind:'environment',templateId}}`. Replan payload: `{type:'vn_replan_turn',version:1,chatId,messageId,swipeId,sourceFingerprint,requestId}`. If there is no prepared request because identity resolution failed, corrections operate on the failed job ID and prepare a new review draft. Save appearance defaults false, and the user sees which character/chat it applies to.

Role preference is per chat with Auto default, plus an explicit Scenario/world/narrator choice. Auto may use validated planner role evidence; name patterns alone cannot decide. Known role conflicts remain inspectable. Scenario mode excludes the card wrapper from character seeding and speaker fallback, unless separately declared as an actual entity with evidence. Narration displays Narrator or an optional narrator label; actual dialogue uses the resolved speaker. Role changes invalidate affected future drafts, not completed historical artwork.

The supplied scenario has generated images successfully before. First compare successful and failed plans for the same card, tracing planner schema/repair/fallback, subject selection, appearance extraction, stored identity, and retry reuse. Do not diagnose solely from card type. Add tests for intermittent extraction omissions across consecutive turns on the same card, narration/dialogue switches, ensemble cards, narrator avatars, and ordinary/nonhuman character cards. Auto must handle normal card types without forcing a user to set a role. Manual role choice is a correction tool. Preserve valid saved identity and successful existing behavior; no destructive identity reset or unrelated character substitution. Provider refusal/timeouts remain distinct from subject-resolution failures.

When actual successful/failed planner records are unavailable, first reproduce the screenshot's failure using a deterministic fixture and add bounded diagnostics for the next live occurrence. Continue the supported-card regression work; do not infer a unique live cause from the fixture or block mobile work while waiting for logs.

- [ ] Write failing tests: scenario card Rookhaven Academy + cast Aleister resolves Aleister; scenario with no people supports environment template; scenario title without evidence yields needs_subject; ordinary character card retains its identity; genuinely named character lacking appearance yields needs_appearance; legitimate nonhuman entity remains eligible.
- [ ] Run `bun test src/backend/runtime/subject-resolution.test.ts src/backend/runtime/planner-fallback.test.ts` and confirm the new expectations fail before implementation.
- [ ] Implement role storage/migration and resolution; keep existing empty-identity generation guard. Add candidate/source/stage diagnostics without credentials or full-chat text.
- [x] Expose Choose subject, Appearance for this picture, explicitly saved appearance, and Use environment template through existing reviewer. Corrections prepare drafts; they never silently generate or release held requests. Do not manufacture drafts that bypass validation.
- [x] Add explicit replan alongside failed-request retry (legacy Try again may still plan again when no usable plan/appearance exists). Replan reuses existing compatible finished assets; incompatible assets need explicit replacement. Preserve provider/parameter/template review information and budget accounting.
- [x] Run focused planner, identity, image review, and retry tests; browser-check recovery with stale fingerprint and a held draft. Verify zero image-provider calls for unresolved identities; corrected drafts wait for approval. Ordinary valid automatic-mode generation retains the existing review-off behavior.
- [ ] Check explicit diff scope and commit this package independently.

## Work package B — mobile dialogue sheet and resume (8)

**Outcome:** Users can uncover the image and adjust reading space without editing CSS.

**Files:** Create `src/shared/reader-preferences.ts`, `src/frontend/stage/dialogue-sheet.ts`, `src/frontend/host/reading-position.ts` and tests; create `scripts/test-mobile-reader-browser.ts`. Modify `config.ts`, `protocol.ts`, `runtime/storage.ts`, frontend controller/stage/base CSS/settings, and `package.json` for the new browser command.

**Interfaces:** `ReaderPreferences = {layout:'overlay'|'image-first',sheetSize:'compact'|'reading'|'expanded',backgroundOpacity:number}`; opacity range 0.35–1, default 0.9 for the new adjustable surface. Snap targets 22%, 34%, 60% of usable viewport height, clamped to safe controls/keyboard space; default Reading. `ReadingPosition = {version:1,key:TurnKey,paragraphIndex:number}`. `restoreReadingPosition(saved:ReadingPosition,current:TurnView): number | null` rejects changed fingerprint/swipe or out-of-range paragraphs.

Retain existing text scale controls (0.8–1.6). Preserve old theme background until adjustable sheet is enabled; opacity applies to background only, not children. New layout selection defaults Overlay. Preference persistence uses existing config update pathway; cursor uses `chats/<safe-id>/reading-position.json` in user storage with serialized/debounced writes.

Add `adjustableSheetEnabled:boolean` to ReaderPreferences, default false for existing installations. Enabling exposes sizes/layout/opacity; turning it off restores theme styling. Size targets include the sheet toolbar and exclude top chrome/safe areas/visible keyboard. Keep 44px touch targets and at least a two-line text viewport when space permits; if targets cannot fit, use one scrollable sheet without overlapping essential controls. Clamp again on `visualViewport` changes. No permanently reserved 60%-height blank area in Image first layout.

- [ ] Add failing model tests for snap bounds, opacity normalization, valid cursor restore and stale swipe/edit rejection. Run the new focused tests.
- [ ] Implement draggable handle plus labeled size buttons; pointer capture lives only on handle. Cancel drag on teardown/orientation change. Text scroll and selection never advance the paragraph. Hidden text is transient, pauses Auto/Skip, and does not persist into a confusing next session.
- [ ] Implement Image first layout, background-opacity slider/reset, and persistent Show text control. Back to chat remains reachable. Move secondary actions into overflow; preserve essential Previous, Next, and Auto actions with accessible labels.
- [ ] Save cursor on actual paragraph transitions, flush on close, and restore without autoplay/TTS synthesis/image regeneration. Preserve unsent response draft. Use a visible Resume from paragraph notice with Start reply over option.
- [ ] Browser-test 360x800, 390x844, 412x915 and 844x390; emulate coarse pointer and reduced motion. Assert controls remain visible, sheet scroll is independent, focus returns after menus, resize does not advance text, and keyboard/viewport shrink does not cover composer controls.
- [ ] Run existing reading/settings/speech browser checks plus the new mobile check; commit after reviewing each theme at least in fixture screenshots.

## Work package C — typed entities and timed presentation (6)

**Outcome:** Every later feature has a common identity and correct reveal time.

**Files:** Create `src/shared/presentation-entities.ts`, `src/backend/runtime/entity-projection.ts`, `src/backend/runtime/presentation-timeline.ts`, and `src/backend/runtime/context-providers/{index,lumibooks,warp,simtracker,lumiscript}.ts`; create equivalent unit tests. Modify contracts/protocol/storage/planner and frontend controller/game bridge.

**Interfaces:** Shared definitions above plus `EntityStateDelta = {entityId:string,at:PresentationAnchor,changes:Record<string,string|null>}`; `PresentationSnapshot = {at:PresentationAnchor,locationId:string|null,presentEntityIds:string[],speakerEntityId:string|null,drawableEntityId:string|null,stateByEntity:Record<string,Record<string,string>>}`. Delta fields are allowlisted presentation fields (appearance, outfit, condition, owner, location, presence); conflicting same-paragraph fields follow explicit local override, then observed story, then configured provider precedence. Entity kind/name changes require a separate explicit identity correction, not arbitrary delta keys.

`buildPresentationTimeline(input:PresentationTimelineInput): PresentationSnapshot[]` consumes known baseline plus validated ordered deltas. `ContextProvider.read(scope:ProviderScope,signal:AbortSignal):Promise<ProviderEvidence>` returns attributed facts, source time, scope, and freshness; missing provider resolves unavailable rather than blocking reader startup. Public rendering never receives private facts.

Do not treat each paragraph as a new model call. Extend the existing single planner response with bounded entity references/facts/deltas. Validate before projecting. Store immutable snapshots with each turn; reading backward restores their presentation only. Persist local override fields separately from imported evidence. Match explicit IDs/aliases first; ambiguous names remain distinct and require confirmation.

- [ ] Add failing timeline tests: outfit change at paragraph 8 is absent at paragraph 7; reversing cursor restores old state; speech and drawable person differ; offscreen speaker is not added to the room; missing provider clears its contribution; stale response cannot affect another chat/swipe.
- [ ] Implement timeline and additive storage migration; tests load old turns without entity metadata and keep current rendering.
- [ ] Implement bounded optional provider adapters. LumiBooks uses its public RPC codex snapshot/file flags; Warp uses published state and existing bridge; SimTracker retains current JSON extraction plus explicit custom-field/tag mappings and accepts versioned normalized bridge evidence without executing templates; LumiScript reads explicitly selected versioned RPC proposals. Additional YAML/legacy-format parsers are deferred unless already safely exposed by the installed producer. Feature-detect host capabilities instead of assuming newer methods exist in pinned types.
- [ ] Reject mismatched user/chat/message sources. Treat latest-only or unclassified external facts as current/reference evidence, not historical reveal evidence. No provider may refresh a frozen old picture prompt. No automatic writes back to codex/tracker/rules.
- [ ] Implement freshness handling: optional reads have a 1500ms deadline and never block the initial reader shell or ordinary planning. Use one bounded collection per turn/context refresh rather than polling each paragraph. A late valid result may populate a labeled current-reference card; it may not rewrite a saved turn or advance a reveal. Turn-end state becomes a later-turn baseline only after its originating turn is fully revealed. Wipes/disable clear current contribution while immutable historical projections stay historical.
- [ ] Add tests for absent extensions, revocation, malformed payloads, duplicate aliases, noInject files/records, wipes, and late results. Run focused tests and typecheck against installed Spindle types.
- [ ] Add Context sources status/precedence controls within existing settings. User override wins its explicit field; observed scene changes update mutable state; conflicting provider assertions stay attributed rather than silently merged. Commit this foundation.

## Work package D — clickable NPC/place/object dossiers (4)

**Outcome:** Built-in optional tooltips show readable, sourced cards for important phrases. They require no special preset, inline markup, or companion extension. The user-facing setting is **Tooltips**, with no preset names or branding.

**Files:** Create `src/shared/dossiers.ts`, `src/backend/runtime/dossier-projection.ts`, `src/frontend/stage/entity-anchors.ts`, `src/frontend/stage/dossier-card.ts`, and named tests for each module. Modify planner/rich-text/stage/settings/config and add `scripts/test-dossiers-browser.ts`. Keep TTS consuming unchanged visible prose.

**Interfaces:** `DossierSection = {label:string,facts:EntityFact[]}`; `ReaderDossier = {entityId:string,kind:EntityKind,label:string,sections:DossierSection[]}`; `DossierAnchor = {paragraphIndex:number,start:number,end:number,entityId:string}` indexes UTF-16 offsets in the paragraph's visible text, not raw HTML. `selectReaderDossier(entityId:string,snapshot:PresentationSnapshot,facts:EntityFact[]):ReaderDossier` returns reader-visible fields only. `linkEntityMentions(input:{paragraphIndex:number,text:string,entities:ReaderEntity[],preferences:TooltipPreferences,suppressedEntityIds:string[],pinnedEntityIds:string[]}):DossierAnchor[]` produces bounded nonoverlapping anchors after category/suppression filtering. Pinning prioritizes eligible entities within limits; it never overrides a disabled category or creates an anchor before an entity is mentioned/revealed.

### Built-in tooltip controls

Add `TooltipPreferences = {enabled:boolean,categories:{npcs:boolean,locations:boolean,objects:boolean},detail:'brief'|'standard'|'expanded',linking:'important'|'all-known',maxLinksPerParagraph:number}` to normalized existing config. Default enabled false, all three categories true when enabled, detail brief, linking important, maxLinksPerParagraph 3 (range 1–6); cap at 24 links per reply. Brief shows identity plus one established fact; Standard adds known appearance/function and current state; Expanded shows additional known sections. Detail never unlocks private information.

Expose controls under the existing reading/presentation settings, not a new photo section. Users can turn individual categories off, suppress or pin a specific entity's tooltip, and edit a local display note without changing story canon. Disabled tooltips create no anchors or extra planner payload and need no model call. Enabling them uses the existing story-reader request to propose grounded entities; clicking remains entirely local. Plain prose is the primary supported input.

### Inspiration boundary

Use ordinary prose and the typed projection from C. Preset-specific syntax parsing, macros, tiered biography generation, and import compatibility are outside this implementation scope. The examples inform concise entity cards, static versus mutable facts, and knowledge boundaries only. No preset names appear in product settings/help. No requirement for users to change a preset or add markup.

### Native dossiers and interaction

The existing planner may propose concise NPC/place/object references grounded in visible text. Use local facts/manual notes or optional external evidence; do not generate a Main schema for every NPC. Show name/type, known appearance/description, current revealed state, and sources. Empty fields are omitted. Clicking a card never calls a model. More detail is collapsible, not a full-screen wall of text.

Use subtle dotted underline and tap; desktop also supports keyboard and hover preview. Mobile opens a bottom sheet distinct from dialogue resize. Apply configured density/category/linking filters and the 24-per-reply cap, prioritize explicit/important references, and avoid inferred pronouns. Only unambiguous exact aliases get automatic later links. No links in code, existing links, or unrevealed text. Typewriter effects must retain exactly the same visible characters and speech text. Changes to category switches immediately hide/show eligible existing anchors locally; no replan is triggered. Enabling extraction after a reply was already planned applies to the next planned reply; current reply may use already available facts without pretending new extraction occurred.

- [ ] Add failing linking/projection tests for ordinary NPC/place/object mentions, duplicate aliases, repeated names, articles, Unicode offsets, existing links/code, disabled categories, and zero/ambiguous matches. Assert original prose and TTS text remain equal before/after enabling links.
- [ ] Implement native grounded projection and reader visibility filtering; add tests for hidden facts, buried routes, locked object contents, and later codex knowledge. External facts without a supported reveal anchor never become revealed just because their record mentions the same name. Do not promise perfect automatic spoiler detection for facts already disclosed in ordinary prose.
- [ ] Implement structured anchors in the existing safe renderer; validate offsets against visible text and resolve links after display transforms without regex HTML replacement. If transforms make matching uncertain, omit the anchor rather than corrupting prose.
- [ ] Implement accessible card view with focus return, outside tap/Escape dismiss, and source labels. Nearby entities without inline anchors remain reachable through a small Scene tray.
- [ ] Test ordinary unmarked prose with every companion extension absent: each category toggle independently removes its anchors; detail changes visible fields without revealing private facts; density is bounded; disabling skips tooltip-specific extraction and renders the original reader. Test settings persistence and individual suppression/pinning.
- [ ] Run `bun test src/backend/runtime/dossier-projection.test.ts src/frontend/stage/entity-anchors.test.ts src/frontend/stage/dossier-card.test.ts`; then run `bun run test:dossiers` after adding that command. Mobile/desktop checks cover typewriter, text effects, TTS, scrolling, stale updates, and repeated taps. Assert zero LLM/image calls on open. Commit.

## Work package E — persistent places and cast staging (1)

**Outcome:** Recurring locations remain recognizable; conversations can use independently controlled background and cast assets.

**Files:** Create `src/shared/stage-assets.ts`, `src/backend/runtime/location-art.ts`, `src/backend/runtime/cast-assets.ts`, `src/frontend/stage/cast-stage.ts` and tests. Modify contracts/images/scheduler/cache/storage/template compiler/reviewer/stage/image loader.

**Interfaces:** `StageAssetRole = 'scene'|'background'|'portrait'`; `StageComposition = {mode:'scene'|'cast',backgroundAssetId:string|null,portraits:Array<{entityId:string,assetId:string,position:'left'|'right'}>,activeSpeakerId:string|null}`. `LocationArtRecord = {entityId:string,artRevision:number,description:string,variants:LocationArtVariant[]}`. Variant compatibility includes effective location description, environment state, provider/model/reference settings, and actual prompt/parameters.

Cast mode defaults off. Show at most two portraits, with other present cast in a tray. Support rectangular portraits initially; transparent cutouts are optional supplied artwork, never assumed from ordinary image output. Reuse approved assets, retain previous art while new assets decode, and use neutral placeholders on missing art. Avoid auto-generating every cast member.

Allocate new asset requests from the same per-reply budget before scheduling: explicit user-selected replacement first, required changed background next, active speaker next, second visible portrait last; compatible reused art costs zero. Review mode holds all requests. Manual replacement retains existing behavior but clearly shows it is a new request. Location identity is permanent; weather/time/damage are variants. User can select, replace, forget, or reset location art within Pictures/scene controls.

`StageAssetRole` is asset metadata mapped onto existing cue kinds: scene -> flattened_scene, background -> background, portrait -> sprite. `LocationArtVariant = {id:string,imageId:string,requestFingerprint:string,environmentFingerprint:string,approved:boolean}`; resolve fresh host URLs by image ID for display. Cap saved variants at 8 per location; evict only unpinned/unreferenced variants and never delete the underlying host image automatically. Keep at most 128 location art records per chat; report a clear capacity limit instead of dropping referenced records.

Automatic planned jobs consume a generation slot when admitted, not when they succeed; failed/cancelled jobs remain the same budgeted slot when explicitly retried. Replanning reconciles kept asset slots before admitting new jobs. A budget of 1 permits one new background OR portrait, not one of each. Manual regeneration is an explicit additional request with its own review draft; do not silently reset automatic allocation. No-people/background jobs omit character references and portrait-capture dependencies.

- [ ] Add failing tests for return-to-location reuse, weather variant mismatch, outfit-specific portraits, two speaking NPCs, exhausted budget, repeated character requests, and no transparent-cutout assumption.
- [ ] Implement asset roles and migration; old jobs default scene. Share scheduler/concurrency/cancellation/cache instead of building a second generation route. Update cache keys for asset role/composition where required.
- [ ] Implement cast layout in both mobile reader modes, speaker highlight, supplied art selection, and lazy replacement. No fixed horizontal arrangement that hides all art on portrait phones.
- [ ] Verify review controls for each asset role and transactional compatible reuse. Changing templates/source settings cannot corrupt old snapshots or regenerate unrelated cast.
- [ ] Run image/cache/reference tests and mobile browser fixtures with delayed decoding, failed portrait/background, chat switch, and close. Verify new jobs never exceed configured budget. Commit.

## Work package F — teachable presentation rules (5)

**Outcome:** Users can make repeatable presentation preferences without writing a large prompt.

**Files:** Create `src/shared/presentation-rules.ts`, `src/backend/runtime/presentation-rules.ts`, `src/frontend/settings/presentation-rules-ui.ts` and tests. Modify planner-effects/template selection/config/storage/settings/reviewer.

**Interfaces:** `PresentationRule = {id:string,enabled:boolean,scope:'user'|'chat',priority:number,when:RuleCondition,then:RuleAction}`; typed conditions cover location transition, dialogue, important object, selected entity, and cue category. Typed actions cover hold background, prefer enabled template, suppress effect, cap motion, and music policy. `evaluatePresentationRules(input:RuleInput,rules:PresentationRule[]):RuleDecision` returns decision plus matched rule IDs/reasons.

Start with 12 rules per scope. Explicit per-picture edits win, then chat rules, then user rules, then planner defaults; at equal priority later saved rule wins per affected field. Missing/disabled template action is skipped with visible reason. Hold background ends at confirmed location boundary unless the user explicitly overrides. Accessibility settings always cap motion. Rules do not alter appearance facts, external mechanics, review mode, or budget.

Define `RuleCondition` as tagged variants `{kind:'dialogue'}`, `{kind:'location_changed'}`, `{kind:'important_object'}`, `{kind:'entity',entityId:string}`, or `{kind:'template',templateId:string}`. Define `RuleAction` as `{kind:'hold_background'}`, `{kind:'prefer_template',templateId:string}`, `{kind:'suppress_effect',effectId:string|'all'}`, `{kind:'motion_cap',intensity:'off'|'gentle'}`, or `{kind:'music',mode:'hold'|'silent'}`. Add `savedOrder:number` to PresentationRule for deterministic ties; priority is 0–100, default 50. `RuleInput = {isDialogue:boolean,locationChanged:boolean,importantObject:boolean,entityIds:string[],templateId:string,enabledTemplateIds:string[]}`. `RuleDecision = {holdBackground?:boolean,preferredTemplateId?:string,suppressedEffects:string[],motionCap?:'off'|'gentle',musicMode?:'hold'|'silent',matchedRuleIds:string[],diagnostics:string[]}`.

- [ ] Write failing tests for rule precedence, conflicting fields, disabled template, real location boundary, and reduced-motion override. Run focused tests.
- [ ] Implement deterministic evaluator around existing planner output. Optional planner guidance is compiled into the existing planning request, not a separate model call.
- [ ] Add built-in rule examples and Remember this correction with a preview of exact condition/action/scope. Derive typed proposals from supported controls without an LLM call. Arbitrary free-text instruction parsing is deferred; the user explicitly saves the proposed typed rule.
- [ ] Show matched rules in image review/context details. Reset/delete applies to future presentation, preserving historical snapshots and held drafts.
- [ ] Run rule/planner-effects/browser settings tests and confirm no new per-paragraph model requests. Commit.

## Work package G — scene interaction tray (7)

**Outcome:** Important people/places/objects provide editable action ideas without bypassing the story or a rules engine.

**Files:** Create `src/shared/scene-interactions.ts`, `src/frontend/stage/interaction-tray.ts` and tests. Modify dossier card/frontend controller/game bridge/protocol validation and add `scripts/test-scene-interactions-browser.ts`.

**Interfaces:** `InteractionDraft = {entityId:string,verb:'ask'|'examine'|'approach'|'use'|'custom',text:string,origin:'local'|'warp',key:TurnKey}`; `buildInteractionDraft(entity:ReaderEntity,verb:InteractionDraft['verb'],scope:TurnKey):InteractionDraft`. Local drafts are grammatical intentions, not claims of success. Warp moves retain provider IDs/odds and execute through the existing pick contract rather than being reinterpreted as local mechanics.

Separate local drafts from provider moves: `SceneInteraction = {kind:'draft',draft:InteractionDraft} | {kind:'provider_move',provider:string,choiceId:string,label:string,odds:number|null,chatId:string}`. Provider move labels/IDs must match the latest validated GameBridge state at pick time. Do not edit a move's prose while displaying its original odds; Edit as message converts it to an ordinary draft and removes the odds/provider action. Provider is authoritative for result; a missing/expired move prompts refresh without sending a substitute.

Show Ask for known NPCs, Examine for known objects/places, and Custom. Show Use only when supported by public capabilities/current context; no menu item promises secret contents. Exclude absent NPCs from Approach; offscreen communication requires explicit supported context. The drawer is available at Your turn; while reading, cards may prepare a draft but sending remains disabled until the existing reply gate is reached. Preserve a user's existing draft and offer Insert versus Replace.

- [ ] Add failing tests: opening card changes no state; draft does not submit; hidden contents do not become suggested actions; absent character cannot be approached; existing typed draft survives; stale key prevents send; double tap sends once.
- [ ] Implement draft flow through the existing composer/submission lifecycle. Confirmation is the normal Send action, not an extra approval popup.
- [ ] Integrate Warp moves without duplicate local choices, invented odds, automatic rolls, or writes to Warp state. Disabled/disconnected Warp falls back to ordinary prose drafts.
- [ ] Browser-check mobile keyboard, focus, reopening dossier, click races, submission error, and CYOA/standard modes. Run game bridge/controller regression tests. Commit.

## Delivery, verification, and release gates

Order: A then B for the first useful release; C then D for safe dossiers/timed state; E for cast/location presentation; F and G afterward. Each package is independently reviewed and testable. Do not merge an incomplete downstream feature behind an apparently functioning control.

For each package run focused failing/passing tests as described, then `bun run verify` and `bun run verify:bundle`. Run browser checks appropriate to changed behavior, including existing `test:reading`, `test:settings`, `test:image-review`, `test:image-templates`, and speech checks where touched. Add named browser scripts to package.json in their owning tasks. Do not claim live provider tests from fixture success.

First live-host smoke case: scenario Rookhaven Academy, Aleister as actual NPC, ordinary narration plus dialogue, four-image budget, review on. Exercise missing-identity recovery, environment draft, mobile sheet, hide/show, keyboard, close/reopen, swipe/edit, provider failure, and absent companion extensions. Then test LumiBooks/SimTracker/Warp individually and together. Paid model comparison is user-driven with explicit reviewed requests; reference/negative parameter support varies by chosen model.

Release only after checking migrations, bundle safety, tests and mobile screenshots; describe live-host limitations honestly. Stage explicit source/test/docs/dist paths, exclude attachments, and use a normal push to the user-authorized repository when a release is requested. Never force-push or commit user credentials/attachments.

## Plan review

Feature mapping: 1 -> E; 4 -> D; 5 -> F; 6 -> C; 7 -> G; 8 -> B. Scenario correction belongs to A and is a dependency of image/cast work. Source scope, immutable snapshots, public/private separation, asset budget, and optional providers are shared invariants owned by C and consumed later. No product code or model calls were made while drafting this plan.

## Acceptance matrix and execution checkpoints

| Package | User-visible pass condition | Stop/recovery condition |
| --- | --- | --- |
| A | Same scenario works across ordinary narration/dialogue and recovered extraction omissions; existing character-card identity remains intact. | Missing evidence yields a correctable draft/error, never a borrowed body or repeated ineffective retry. |
| B | Text can resize/hide; art remains inspectable; controls work with keyboard/rotation/large font. | Tight viewport falls back to scrollable sheet; old cursor is discarded after real content changes. |
| C | Outfit/presence/location update exactly at established paragraph, including backward reading. | Optional bad/late evidence is ignored or labeled current reference; canonical turn remains usable. |
| D | Tooltips work on plain prose without companions; NPC/location/object switches independently control anchors. | Ambiguous/transformed text gets no incorrect link; private/unclassified facts are omitted. |
| E | Approved location/cast art reuses safely and never exceeds new-job allocation. | Missing art retains usable existing art or a placeholder; no hidden whole-cast generation. |
| F | Repeating a supported correction applies a visible, predictable rule in future turns. | Conflicting/disabled actions produce a reason; held prompts and historical art remain frozen. |
| G | Card actions draft editable intentions; provider moves use current engine state. | Stale key/move prevents send; duplicate activation produces at most one submission. |

Required named new browser commands: B `test:mobile-reader`; D `test:dossiers`; G `test:scene-interactions`. Each maps to its named script above. New unit files follow adjacent `.test.ts` convention. After C run all migration/storage/protocol tests; after E run all cache/reference/scheduler tests. Finish with one full verify/bundle pass and the affected browser suites. Re-run only if subsequent changes justify it.

Self-review completed against current source: corrected premature A->C dependency, missing entityId in facts, conflicting phase names, unspecified provider timing, mobile enable/default mismatch, retry-budget accounting, and editable provider-move odds. Removed unsupported preset-parser expansion. This review validates the plan's internal consistency; it does not establish runtime/provider correctness before implementation.

Review the default sheet sizes, optional cast mode, dossier visibility, and package order before execution. Recommended execution method: native, implementing one package at a time in this session; use delegated execution only if explicitly selected.
