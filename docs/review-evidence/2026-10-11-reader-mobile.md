# Testing beta.2 — mobile reader update

This increment delivers the first scenario-subject fix and the adjustable reader. It does not deliver the entire reader-experience plan.

## Using the update

Under Appearance → Text, enable **Adjustable text panel**. Choose overlay or Image first, panel size, and background opacity. The reader offers a draggable handle, the same size choices, and Hide/Show text. Small panels use compact reading icons with accessible names. Existing installations retain the original reader until enabled.

Hiding text pauses Auto/Skip. Closing/reopening shows text again. Background opacity preserves fully opaque text and uses the chosen theme's background. Text scroll/selection does not advance paragraphs in adjustable mode. Continue remains explicit.

Reading position is stored in user-scoped chat storage. Restoring requires the same chat, assistant message, swipe, and source fingerprint; asset-only revisions are ignored. Resuming does not trigger speech autoplay, reader autoplay, music, or image generation. A resumed reply can be started over; existing local drafts survive that action. Inactive incoming replies cannot relabel old loaded prose or its cursor.

The scenario fix repairs a planner-selected card title only when the card lacks supported visual identity and a separately described scene subject can be identified. It preserves valid ordinary/nonhuman identities, leaves ambiguous subjects unresolved, and never borrows an unknown person's appearance. This reproduces one supported cause of the supplied error; it is not proof of every live failure's cause.

## Verification

- 1,244 unit tests across 99 files passed, plus 18 speech transport tests separately: 1,262 total. Strict TypeScript and production build passed. Manifest/bundle static checks passed.
- Browser checks passed for mobile reader, existing reading, settings, image templates, image review, and speech stage. Mobile coverage includes 360×800, 390×844, 412×915, 844×390; large text; reduced motion; all seven themes; UI zoom 0.8 and 1.5; drag and keyboard resize; independent scrolling; settings saves; and simulated visualViewport keyboard shrink.
- A fresh code review found four Important issues: light-theme contrast, zoom coordinate conversion, resumed speech on rebroadcast, and inactive-delivery cursor identity. All were fixed with regression coverage. Screenshot inspection also caught theme ornament dimensions and toolbar crowding; regressions now check both.

The installed Bun is 1.3.14, below the pinned >=1.4.0 requirement. Its native AbortSignal timeout test stalled without a temporary event-loop keepalive. Speech tests passed with that ignored verification-only preload; production speech timeout code was not changed. Browser checks used bundled Node with an ignored Bun build/server adapter because Bun's Chromium pipe launch timed out. These workarounds are not shipped runtime dependencies.

No live Lumiverse install, paid image provider, real mobile keyboard, or companion-extension integration was tested. Those remain host smoke checks. New tooltips, timed entities, persistent location/cast assets, presentation rules, scene interactions, and expanded subject correction/recovery remain pending in the plan.

## Implementation decisions

- Reused the dedicated Testing checkout and existing config/storage pathways; no new settings application or worktree.
- Existing retry already replans an empty identity. The initial fix addresses a planner choosing the scenario wrapper again; richer correction controls remain pending.
- Kept History and Skip in the compact reading strip instead of adding another overflow menu. Their accessible labels and familiar controls remain available; narrow panels display icons.
- Minimum sheet height includes controls and readable text space; exceptionally short viewports use scrolling. Host zoom and keyboard coordinates are converted to local CSS units.
