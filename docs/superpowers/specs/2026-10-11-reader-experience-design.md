# Lumiglyphics reader experience — proposed design

Status: implementation underway on Testing, beta.35, 2026-10-15. Recovery, mobile reader, standalone tooltips/quiet references, unified History and the cast setup foundations are delivered. G supports local action drafts and provider-owned move editing; Use awaits capability metadata. H1 now provides a literal current-reply document viewer with reveal gates. Cross-turn document aggregation/public source adapters, normalized external reconciliation, expression artwork/independent placement, F rules and broader image-library work remain follow-ups. See the implementation plan and dated verification evidence for exact scope.

Planning clarification: Rookhaven Academy is a scenario/world/narrator card, and this is the user's primary card type. It has successfully generated images before; investigate intermittent extraction/resolution failures rather than assuming scenario cards cannot work. Support character, scenario/world, narrator, ensemble, and nonhuman cards without requiring manual classification for normal use. The user requests built-in optional tooltips for NPCs, locations, and important objects, with category and detail controls. Supplied preset prompts are inspiration only: no dependency, preset branding, or required markup. See the companion implementation plan for concrete contracts, task order, and acceptance criteria.

## Purpose and scope

Improve the mobile visual-novel experience and develop the six selected ideas: persistent locations/cast staging (1), contextual reading companion (4), teachable presentation rules (5), paragraph-timed changes (6), scene interaction tray (7), and mobile reader controls (8).

Defer storyboard editing, reading timeline/bookmarks, and shareable presentation packs. Exact resume remains within the selected mobile-reader idea. Keep photo/image controls in the existing Pictures settings. Lumiglyphics must remain functional without SimTracker, LumiBooks, LumiScript, LumiAgent, or Warp.

### Selected additions — 2026-10-13

The user selected cast setup, tooltip actions, in-world documents, quiet reference quick access and a library for previous-message images. These additions extend the existing scope. They are roadmap commitments to plan/implement in bounded increments, not a claim that the features already exist or an instruction to implement the whole research catalog.

- **Cast setup:** Register an actual character before a saved generated appearance exists. Connect identity/aliases, appearance, outfits, supplied portrait/expression art and existing voice controls. Keep setup in current Pictures/scene/Voice surfaces. Scenario card titles are not cast members by default; setup does not generate pictures or rewrite prose. Independent background/portrait generation remains E2 and shares the existing budget.
- **Tooltip actions:** Reach Ask, Examine, Approach, Use and Custom from an inline entity card or quiet sheet using one common composer flow. Draft an intention, preserve existing typed text and send through the normal reply gate. Engine moves retain their owner/current-state validation; a click cannot declare success, unlock contents or roll independently.
- **In-world documents:** Show exact established letters, journals, notices, phone messages and terminal contents as readable themed text. Distinguish exterior from revealed contents; unavailable/private contents remain unavailable. Source and reveal timing apply to every section. Opening a document makes no paid call or external write. Artwork is decoration, not the authoritative lettering.
- **Quiet reference quick access:** One compact, searchable sheet for relevant known cast/items/places with independent category controls and a menu-only mode. Inline highlighting is optional; no automatic popups or persistent information clutter. Reuse existing facts, suppression, pins and notes while retaining reveal gates and cursor/focus behavior.
- **Previous-message image library:** Browse verified images already made for this chat, grouped by source message. Default to active-story versions through the reading position; alternate swipes/replaced images are explicit filters. Provide lazy thumbnails, full-image zoom/pan, available safe prompt/model details and source excerpts. Opening/paging does not generate images or change the active turn. Backfill only recoverable historical records and identify missing metadata; do not promise every overwritten/deleted legacy image can be reconstructed.

The image library is a display/history feature, not the deferred reading-bookmark timeline or a second photo-settings system. It remains separate from saved place/cast art reuse. External-source adapters may be added incrementally; standalone versions of these features must not wait for every companion integration.

Recommended order and checkable milestones are maintained in the implementation plan under E3, D2, G, H and I. The earlier research catalog remains a menu of unselected possibilities beyond this approved scope.

## Observed failure and limits of diagnosis

The supplied screenshot reports missing appearance for "Rookhaven Academy" while prose describes Aleister. The nameplate also shows the scenario title. `src/backend/runtime/images.ts` rejects character cues with an explicitly empty resolved identity before compiling/sending the image request. This is an extension-side identity error, not evidence of an image-provider rejection.

`resolveSingleCharacter` in `planner.ts` has a name-only fallback that can choose the card title when extraction yields no usable identity. `resolveCueTimeline` accepts unknown non-persona subject names and cannot resolve an appearance for them. Speaker canonicalization also includes card/message names. These are plausible paths for the observed output, not proof of the exact live planner response. Preserve diagnostics sufficient to distinguish planner failure, missing descriptions, scenario-title selection, and provider failure.

The present retry behavior normally regenerates unfinished images against the stored plan; it does not always replan. Repeating a missing-identity request can therefore repeat its failure. Never solve it by assigning a different character's appearance or inferring that every title-like name is a location.

## Package A — card identity and image recovery

Support character, scenario/world/narrator, ensemble, and nonhuman cards in Auto mode. The card wrapper is context, not automatic proof of a drawable person. Preserve supported same-person appearance across incomplete extraction; never borrow a different person's body. Manual card-role selection is an optional correction tool. Compare successful and failed plans for the same scenario before claiming a live root cause.

Keep existing generation-review and dynamic-template behavior. Missing subject evidence fails before an image-provider call and offers correction; valid automatic generation still works when review is off. Corrections produce held review drafts. Distinguish subject/planner errors from provider rejection or network failure.

### Image subject recovery

Keep the missing-identity safety check. Separate narrator/card labels from drawable entities and validate explicit subject references using actual character evidence rather than title heuristics.

Represent unresolved subjects as a recoverable preparation condition where possible. In the existing Image prompts panel offer: choose a known subject, supply/edit that subject's appearance with clearly scoped persistence, or explicitly use an enabled no-people template. Keep prompt review independent of dynamic selection. If story facts cannot support an environment image, ask for correction rather than inventing one.

Separate Replan reply from retrying failed image requests; label scope and preserve completed assets where compatible. New drafts still obey the existing budget and review rules. Do not automatically release held drafts or call paid providers after a correction. Show compact status on mobile; technical details expand on demand.

Diagnostics should include bounded subject ID/name, selected template, identity-source status, planner/fallback status, and failure stage. Avoid credentials and whole raw chat dumps. Provide a user-controlled diagnostic copy action.

## Package B — mobile reader (8)

### Reader layout

Use a bottom dialogue sheet with a visible drag handle and three labeled snap positions: Compact, Reading, Expanded. Provide equivalent buttons for accessibility and devices where dragging is awkward. Size is bounded by available viewport, safe areas, and keyboard; long text scrolls within the sheet without advancing the paragraph.

Provide a separate Hide text action and a persistent Show text button. Hiding pauses automatic advance so the reader cannot silently miss content. Keep Back to chat accessible. Controls must distinguish sheet collapse from paragraph advancement. No drag on text itself and no interference with selection or scrolling.

Add background-opacity control without reducing text opacity. Offer a readable solid default and a reset action. Add Image first (art above the sheet, minimal overlap) and Overlay layouts; persist the user's choice. Existing image fit remains available. Respect reduced-motion settings and orientation changes. Consolidate secondary controls into an overflow menu while keeping essential reading controls reachable.

Remember sheet size, opacity, text size, and layout per user. Store resume cursor per chat/message/swipe/content fingerprint. Restore only when the source still matches; edited/deleted/swiped replies must not restore an invalid cursor. Resume must not restart speech or paid generation.

Adjustable sheet defaults off for existing installations, Overlay layout, Reading size. Once enabled, snap targets are 22%, 34%, and 60% of usable viewport height; opacity range 0.35–1, default 0.9. Keep existing text scale 0.8–1.6 and 44px touch targets. Clamp on keyboard/orientation changes; if space is insufficient, use a scrollable sheet without covering essential controls. Asset-only turn revisions do not invalidate the same-content resume cursor.

### Validation

Regression cases: scenario title mistaken for subject, genuine character with missing description, normal named character, environment template with no identity, explicit aliases, and retry versus replan. Confirm no unrelated identity substitution and no provider calls for unresolved character requests.

Mobile browser checks: narrow widths, portrait/landscape, long paragraphs, keyboard open, large font, touch scrolling/dragging, opacity extremes, hidden text, reduced motion, and stale resume state. Validate settings persistence and lifecycle teardown. Live Lumiverse testing remains distinct from fixtures.

## Package C — paragraph-timed presentation and optional context (6)

Introduce immutable per-turn presentation snapshots anchored to chat/message/swipe/fingerprint and paragraph index. Keep drawable subject, speaking character, narrator, location, outfit, and external source freshness distinct. Reading backward restores presentation snapshots without changing canonical chat or third-party state.

External updates must not retroactively change earlier paragraphs or held image requests. Use attributable paragraph timing when available. Latest-only snapshots with uncertain timing must not be shown as historical facts or reveal late events early. Missing/disabled providers clear their contribution gracefully; delayed responses for a previous chat are discarded.

Keep identity, mutable state, and viewpoint-visible facts distinct. Private/unclassified facts never reach frontend cards by default. Optional context reads have a 1500ms deadline and do not block reader startup. Cap optional planner projections at 32 entities, 128 facts, and 64 deltas per reply, with fact values at most 1200 characters; an invalid optional projection cannot fail a valid prose/image plan.

LumiBooks: consume its published codex/summary endpoints with correct user/chat scope and respect disabled record/file states. Codex snapshots are current knowledge, not inherently historical or spoiler-safe.

Warp: consume its public scene event and existing game/panel bridge; Warp owns stats, rolls, and outcomes. Validate identity and scene information before incorporating it.

SimTracker: preserve supported chat extraction and develop a versioned optional adapter for normalized tracker evidence. Do not assume stock SimTracker already publishes Lumiglyphics-compatible events. Custom fields and formats require explicit mappings.

LumiScript: accept bounded, versioned presentation proposals through its cross-extension RPC facilities. Scripts cannot bypass review/budget or become required for ordinary operation.

LumiAgent: defer automatic editing integration until discovery/registration support is established; its current recognized-provider registry does not include Lumiglyphics.

## Package D — built-in optional tooltips (4)

Settings label: Tooltips. Provide a master toggle plus independent NPCs/characters, Locations, and Important items/objects toggles. Default master off, categories on when enabled. Offer Brief/Standard/Expanded detail, Important/All known linking, and density 1–6 per paragraph (default 3), capped at 24 anchors per reply. Detail only changes the amount of already known information.

Use ordinary prose without special presets, injected macros, or companion dependencies. Example prompts inform static-versus-living descriptions and knowledge boundaries; preset parser/import support is deferred. Disabled categories have no clickable anchors; master off omits tooltip-specific planner payload. Clicking cards never calls a model.

Mobile tap opens a contextual sheet; desktop supports keyboard and hover preview. Exact/unambiguous names or explicit references may link; inferred pronouns and ambiguous aliases may not. Custom display regex transformations must not corrupt linking/prose. Preserve typewriter/text effects and unchanged speech text. Users can suppress/pin a specific known entity and add local display notes without changing story canon.

Cards show public established facts, state as of the reading paragraph, and attribution. Secrets, buried history, inaccessible contents, and future information stay excluded. Current external reference data without a historical reveal anchor is labeled separately and never treated as known historical information.

## Package E — persistent places and cast staging (1)

Store reusable location artwork and descriptive identity separately from temporary lighting/weather/decoration. Use explicit names/aliases and user confirmation for ambiguous merges. Reuse approved artwork only when compatible with the current presentation; allow replacement and reset.

Offer the existing single-image mode and optional background-plus-portrait staging. Begin with two visible portraits and a mobile cast tray for additional participants. Highlight the speaker without implying all speakers are physically present. Portraits are separate assets, not automatically transparent cutouts. Support imported suitable art and provider-dependent generation with truthful capability limits.

All generated portraits/backgrounds share the existing image budget. No automatic batch for the entire cast, no hidden cutout generation, and no promise of perfect identity consistency across models.

Budget remains default 4, range 0–12, 0 unlimited. Reused assets consume no new generation slot; failed jobs retain their admitted slot on explicit retry. Replan reconciles kept jobs before admitting new jobs. Limit saved variants to 8 per location and 128 location records per chat; do not silently evict pinned/referenced art or delete underlying host images. Reuse existing flattened_scene/background/sprite cue kinds.

## Package F — teachable presentation rules (5)

Presentation rules: offer a small ordered rule set scoped to chat or user, building on existing effects/music/template controls. Rules may hold backgrounds, request establishing shots, favor close-ups, limit motion, or suppress effects. "Remember this correction" previews the proposed rule and scope. Rules affect presentation and cannot rewrite story facts or external state. Avoid extra model calls per paragraph.

Limit to 12 rules per scope. Explicit per-picture edit wins, then chat rules, user rules, planner defaults. Priority is 0–100 (default 50), with saved order breaking ties within one scope/priority. Accessibility motion cap wins. First implementation derives typed rules from supported controls; arbitrary free-text rule interpretation is deferred.

## Package G — scene interaction tray (7)

Interaction tray: select a present person/important object and draft an editable narrative intention. Sending remains explicit; looking at a proposed interaction does not execute an action, reveal a clue, or mutate game state. With Warp, show its valid moves/odds and dispatch through its bridge; without Warp, submit ordinary prose with no invented mechanics.

Keep local text drafts separate from provider moves. Editing a provider move as ordinary text removes its odds and provider dispatch. Stale/expired moves cannot execute, and duplicate activation sends at most once. While reading, drafts can be prepared but Send waits for the existing Your turn gate. Preserve the user's unsent input and offer Insert versus Replace.

## Delivery order

Implement A then B for the first useful release, C then D for timed state and built-in tooltips, E for locations/cast, then F and G. All packages have concrete implementation tasks and acceptance criteria in the companion plan. Apply user/chat/swipe/fingerprint validation, additive migrations, standalone fallback, and existing budget/review contracts throughout.

No product code, commits, or pushes have been made as part of this design draft.

## Beta.25 cast setup foundation — 2026-10-13

Pictures → Cast setup and portraits now supports registration before generation, explicit aliases, editable base appearance, seven named outfits, a default outfit and user-verified gallery artwork. Configure voice opens an unsaved override in existing Voice settings. Setup is reversible presentation guidance; learned identity persistence is separate and guards against setup edits during reader or external illustration planning. Gallery selection checks the full saved draft again before assigning artwork. Management refreshes cannot start planning.

Assigned art decorates an existing matching portrait cue in Cast view, including a queued cue. It does not add characters to scenes, create a generated variant or become an image-model reference. Artwork remains bound to the saved look at assignment and requires reassignment after appearance/outfit changes. Expression artwork, independent background/portrait allocation and standalone placement without a planned portrait cue remain E2/E3 follow-ups. D2, G and H remain pending; image-library follow-ups remain I work. See the dated cast setup verification evidence.
