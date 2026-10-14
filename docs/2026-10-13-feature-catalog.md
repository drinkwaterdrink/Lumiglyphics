# Potential feature, update and mechanics catalog

Based on the 13 October audit of Testing beta.20 and research into Voyage, NovelAI, AI Dungeon, Chinese character/story apps, SillyTavern tools and the user's companion extensions. Unselected entries remain candidates. Touch gestures were not the intended request and are not the focus of this catalog.

## Selected for the roadmap — 2026-10-13

The user selected **2 cast setup, 5 tooltip actions, 7 in-world documents, 20 quiet reference quick access**, and newly requested **21 previous-message image library**. These are planned in the [reader roadmap](superpowers/plans/2026-10-11-reader-experience.md) as E3, G, H, D2 and I respectively. Selection does not mean implementation is complete. Other entries retain their existing proposed or previously approved status.

## Recommended product identity

Lumiglyphics should make roleplay feel like an interactive illustrated scene: comfortable reading, recognizable characters and places, useful objects, coordinated sound and deliberate player actions. Its strongest advantage is presenting these together while remaining usable with every companion extension absent.

Effort below is relative complexity, not a delivery estimate. High-value candidates are ranked before optional experiments. Existing roadmap items are labelled so delivered work is not advertised as new.

## Current update

**Regenerate prompt** prepares new wording for one picture through the story-reader text connection. Image generation still needs approval. Failed rewrites retain the held preview; completed pictures can prepare a new replacement preview while retaining usable previous art.

Prompt planning targets 2,750–2,900 combined positive/negative characters when evidence supports useful detail. Automatically repaired/rerolled output is measured against a 2,950-character ceiling, and final image dispatch retains the 3,000-character hard guard. Overlong compiled requests get a bounded shortening attempt that prioritizes verbose negatives and repetition. Protected subject wording stays exact when present. Semantic fidelity beyond those checks needs review, rather than being certified by length alone. Existing held prompts use the new workflow when explicitly regenerated or prepared again.

## Core upgrades worth finishing

| Candidate | Experience | Existing coverage | Effort / priority |
|---|---|---|---|
| 1. Reliable source and reveal timing | Correct outfits, presence and known facts at the paragraph being read | Roadmap C foundation exists; external reconciliation unfinished | High / first foundation |
| 2. Complete cast setup | Choose identity, supplied art, outfits, expression art and voice together, before the first generated portrait | Beta.25 registration/outfit/artwork/Voice foundations delivered; expressions and independent placement pending | High / high value |
| 3. Independent scene assets | Hold a room background while switching portraits; replace only the needed layer | Cast display exists; shared-budget allocation unfinished | High / high value |
| 4. Remember presentation corrections | Keep backgrounds, prefer object shots, reduce effects; save transparent per-chat/global rules | Roadmap F pending | Medium / high value |
| 5. Tooltip action tray | Ask an NPC, examine an object or approach a place from its reference card | Tooltips exist; roadmap G pending | Medium / high value |
| 6. Prompt explanation and model profiles | See what consumed the budget, detect conflicting instructions, reuse model-specific settings | Review/styles/dimensions exist; richer diagnostics are new | Medium / high value |

These form one cohesive next phase. Source timing should precede external dossier imports. Cast setup and asset allocation should share the existing picture budget, not generate the entire roster automatically. Correction rules should show why they fired and support undo.

## New systems and mechanics

| Candidate | What it adds | Optional synergy | Effort / priority |
|---|---|---|---|
| 7. In-world documents | Readable letters, journals, notices, phones and terminals with exact accessible text | LumiBooks established records or LumiScript classified documents | Medium / strongest new signature |
| 8. Manga reading mode | Whole page, zoom/pan, remembered view and optional panel navigation above the text sheet | None required | Medium for viewer; high for automatic panel alignment / high |
| 9. Coordinated atmosphere | Lighting, ambience, music and effects follow the same story beat with restraint | Warp exposed weather/time | Medium / high polish |
| 10. Visible consequences | Public changes appear as small inspectable notices with source and before/after state | Warp outcome ownership; SimTracker visible state | Medium after timing / high |
| 11. Explored-places atlas | Known places, art and established connections in a compact map/list | Warp exposed routes and locations | Medium–high / later depth |
| 12. Dialogue performance | Narrator and speaker voices inside mixed paragraphs; coordinated cast focus | Existing voice configuration remains primary | High / later depth |
| 13. Story-first loading | Let people start reading while optional presentation is still preparing | None required | Medium–high / high polish |
| 14. Return-to-story card | Resume exact reading position, visible cast, place and unsent draft | LumiBooks recap only when bounded to read material | Low–medium / high polish |
| 15. Investigation workspace | Pin established clues/documents, add local notes and inspect their sources | LumiBooks remains persistent Codex | Medium–high / optional genre mechanic |
| 16. Character knowledge views | Clearly separate present, speaking, mentioned and known-to-viewpoint people | Public reveal data from any source | High / after provenance |
| 17. Presentation receipts | Explain which source, template and rule produced this picture or visual change | All enabled sources | Medium / practical control |
| 18. Session request allowance | Optional limit for new image requests and optional text rewrites; show cache savings and held work | Provider usage only if actually exposed | Medium / practical control |
| 19. In-context correction preview | Compare original and proposed prompts; keep useful edits and revert a wording change | LumiAgent proposals through a future reviewed endpoint | Medium / practical control |
| 20. Quiet reference quick access | Relevant known cast/items/place in a compact sheet with search and category filters | LumiBooks public references when available | Low–medium / usability |
| 21. Previous-message image library | Browse earlier story images by message, inspect available prompts and zoom full pictures | Native host gallery and saved turn metadata; no companion required | Medium / first viewer delivered in beta.23 |

## How the strongest new ideas would work

### In-world documents

Tap a named sealed letter to see its established exterior. After the story opens it, its quoted contents become a readable letter. The text should be rendered directly, not generated as lettering inside an image. If the contents have not been revealed, the extension says so and can draft an Examine intention.

The same system can display a phone conversation, evidence photograph with a caption, terminal readout, journal page or newspaper. Use thematic surrounds and small transitions while preserving selection, accessibility and legibility. Opening a known document costs no model call. This gives tangible interaction without adding another inventory engine.

### Manga reading mode

The page remains a page while the user zooms or reads individual panels. The text sheet can collapse, a Fit control restores the overview, and view position survives a brief reference detour. Narrative paragraph, page and panel are distinct positions.

Start with full-image navigation and manually selected panel regions. Prompted panel layouts do not guarantee pixel coordinates; reliable automatic panel detection requires separate research. Never regenerate a page because the user zooms.

### Tooltip actions

Tap Laura → Ask → edit “I ask Laura about the locked room.” Tap the seal → Examine → edit “I examine the seal without breaking it.” Keep any existing draft and require the normal Send action. Success remains something the story or owning engine resolves.

Warp moves retain provider identity, current state and odds. Editing into an unsupported move becomes ordinary free text. No installed engine is required for a useful action tray.

### Readable consequences

“Key acquired,” “Coat damaged,” or “Entered the courtyard” appears when the relevant prose is revealed. Tapping shows evidence and previous/current public state. Numerical outcomes belong to the engine that produced them. Standalone mode can display evidenced qualitative changes without inventing trust scores or hidden danger meters.

This is the useful lesson from Voyage's distinction between authoritative game state and narration. The feature adds clarity; it does not promise persistent mechanics unless the host/owning extension actually supplies them.

### Story-first loading and coordinated atmosphere

Once the selected reply is safely resolved, show readable text while the scene planner prepares optional enrichment. Add images, references and effects when valid results arrive, preserving the cursor and draft. Do not prematurely expose choices or future facts.

Coordinate music ducking, ambience and restrained light/effects at paragraph boundaries. A storm should feel coherent rather than triggering unrelated dramatic effects every few lines. Reduced motion, hidden-page suspension and a calm mode should work throughout.

### Investigation workspace

For mystery or exploration, pin already revealed evidence, document extracts and source links; let the player make local notes or tentative connections. Distinguish a player's hypothesis from established facts. Never automatically reveal the culprit or infer an unseen clue from generated pixels.

It can work from story references alone. If LumiBooks exists, link its relevant public entries instead of maintaining a competing canonical dossier. Treat this as an optional genre surface, not mandatory HUD clutter.

## Useful research lessons

- [Voyage](https://voyage.io/releases/expanded-beta): accessible state, discovery-aware locations and coordinated presentation. Borrow these interaction patterns while letting an installed engine own mechanics.
- [NovelAI's context viewer](https://docs.novelai.net/en/text/editor/advancedsettings/): explain what reached the model and its origin. Extend existing review rather than adding a second prompt-settings system.
- [AI Dungeon Story Cards](https://help.aidungeon.com/faq/story-cards): make relevant information available when needed. LumiBooks/world books can retain storage and retrieval ownership.
- [Xingye](https://apps.apple.com/cn/app/%E6%98%9F%E9%87%8E-%E6%89%80%E5%BB%BA%E7%9A%86%E4%BD%A0%E6%89%80ai/id6463076337), [Maoxiang](https://maoxiangai.com/) and [Zhumengdao](https://apps.apple.com/tw/app/%E7%AD%91%E6%A2%A6%E5%B2%9B/id6465838500?platform=watch): character, voice and story framing feel like one experience. The audit reviewed published material, not installed-app sessions or reliable current market rankings.
- [Prome VN](https://github.com/Bronya-Rand/Prome-VN-Extension) and [SillyTavern mobile-reading feedback](https://www.reddit.com/r/SillyTavernAI/comments/1tal2a6/a_sillytavern_extension_to_improve_mobile_reading/): speaker focus and screen comfort are valuable even without more mechanics.
- [Danganronpa conversion](https://github.com/LithiumWaves/danganronpa-sillytavern): inspectable evidence can be a distinctive interaction. Avoid copying its entire ruleset.

## Integration boundaries

SimTracker supplies supported visible appearance/state; LumiBooks supplies records/summaries; Warp owns moves, rules and results; LumiScript supplies optional custom data/events; LumiAgent can eventually propose reviewed edits. Missing, disabled or incompatible companions must not block ordinary reading.

Every imported fact needs user/chat/source scope and visibility. Latest external state must not rewrite an old paragraph. A rendered panel is not automatically a reliable historical API, and detecting an extension does not imply its private data is safe to import.

## Suggested sequence

The selected roadmap now prioritizes a read-only image library, cast setup, quiet reference access, tooltip actions and documents after targeted reliability/timing checks. These standalone features do not require completing every external adapter. The broader suggestions below remain optional beyond the selected scope.

1. Fix the audit's place-art race and address tracker format/presentation capacity limits.
2. Finish source timing, cast setup and independent scene assets.
3. Deliver correction rules and tooltip actions together.
4. Add in-world documents and Manga reading mode as the first signature additions.
5. Add consequence presentation, atmosphere and session comfort.
6. Consider the atlas, investigation workspace and richer dialogue performance according to the user's preferred genres.

The previously deferred storyboard editor, bookmark timeline and presentation packs remain on the back burner. A second memory engine, relationship simulator, scripting environment or general agent is a poor first investment given the user's installed tools.
