# Beta.10 verification — combined budget, themes and timeline foundation

Scope: feedback correction and first C roadmap foundation on Testing.

- Positive plus negative share one 3000 UTF-16 character budget. Exact negative duplicates are removed first during over-budget preparation; positive remains verbatim if that suffices. If still over, only line-edge whitespace/duplicate lines are compacted. No unique prompt details are truncated. Final dispatch and review approvals enforce the combined cap, including single-image replacement edits. Pasted drafts remain editable above budget and show one combined counter.
- Manga defaults use shorter exclusions covering identity/wardrobe consistency, panel order, limbs/hands, lettering, faces, poses, contrast, medium and marks. Only exact older default fields migrate; customized fields and held request history remain intact. Intended guidance is preserved; no image-quality equivalence measurement is claimed.
- Astral glass, Neon rain and Obsidian reliquary are integrated into existing theme controls, preview tokens, shell chrome and nested review panels. Local SVG framing, textured plates and slow edge light require no external assets. Reduced motion, gentle/off intensity, narrow phones, landscape, resize touch targets and custom theme layering remain supported.
- C foundation: strict typed entities, attributed facts, allowlisted mutable state and turn/paragraph anchors; reveal-timed snapshots derived from already validated planner scenes, cues, speaker attribution and continuity. Partial wardrobe updates preserve other clothing; scene departures clear present cast; radio/offscreen speech does not add a person to the room. Backward reads select earlier isolated state. Private/unclassified/foreign/future facts are excluded. Saved metadata validates source and reveal anchors.
- Additive storage uses the existing user-scoped serialized queue. Older turns derive locally; future/invalid optional versions are unavailable without resetting stored content. Oversize projections (>64 changes, >256 paragraphs or >512 KB) are omitted instead of publishing frozen state. No new model call, image budget, external write or provider integration is introduced.

Validation actually run:

- RED/GREEN boundary tests for combined cap, negative-first positive preservation, timeline reveal/backward isolation, scene departure, optional versioning and provenance checks.
- Full isolated suite: 1302 pass, 0 fail across 107 files; separate speech transport suite: 18 pass, 0 fail. Total 1320.
- Strict TypeScript check, production build and bundle verification passed. Manifest version is 0.2.0-beta.10.
- Image-review browser checks passed, including native editable drafts, 2800+201 combined rejection and intact overlong pasted input.
- Atelier browser checks passed for all three themes at 360x800, 390x844, 844x390 and 1280x800, including reduced motion and effects off. Mobile reader browser suite passed across all supported themes; mobile and desktop screenshots inspected.
- Fresh read-only review found three issues; all reproduced and fixed with regression tests. A concurrent additional Visitor-entry regression was also fixed and passed before final full suite.

Limits: Bun 1.3.14 is below the declared 1.4.0 floor; browser checks use the established Node adapter and speech transport the established keepalive. No live Lumiverse installation, paid image generation, physical Android keyboard test or measured before/after image quality was run.

Roadmap: C's first story-plan projection/persistence foundation is delivered. Normalized optional companion-source adapters, context status/precedence controls and optional planner entity proposals remain next; D-G tooltips, richer staging, rules and interaction drafts are not yet shipped. No new tooltip toggle is claimed available in this build.
