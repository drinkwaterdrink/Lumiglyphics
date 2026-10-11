# Testing beta.4 — continuous resize and template workflow

## Reader

Inspected the user's mockup, screenshots and three representative frames of the attached 6.99-second recording. Replaced release-time size snapping with a saved optional height ratio. Drag adjusts every pixel; arrow keys adjust 16 CSS pixels. Compact/Reading/Expanded remain settings presets and clear custom height when selected. Settings indicate Custom (dragged) after manual resizing. Height scales with the available viewport and remains clamped for readable content and keyboard space.

The adjustable panel now has one compact header: resize at upper left, bounded speaker name, Previous/History/Auto/Skip, and hide at upper right. Existing buttons and behavior are reused. Text scrolls below a themed divider; progress and Continue remain in the footer. Desktop Continue can show its label. Theme colors, text contrast and background-only opacity are retained; name ornaments are suppressed to leave room for the name. Full speaker text is available through its title. The legacy layout remains available when adjustable panels are off.

## Prompt settings

Image prompts now exposes default template and format first, followed by a checklist of **Templates used by dynamic mode**. Default/manual selection is independent of dynamic inclusion. **Customize a template** opens names and prompt bodies; **Composition and context guidance** opens selection guidance, category, framing, subject and reference controls. Placeholder help and local previews remain available. Shared style/exclusions and character consistency/references have separate collapsible sections within the same Image prompts section. No prompt fields or presets were removed.

Existing catalogs gain Manga page automatically with dynamic inclusion off. Add manga button is removed. Manual settings and picture-review dropdowns show it without requiring dynamic inclusion; backend replacement and held-request rebuild validate manual choices by catalog existence. Automatic selection only accepts checked templates. Dynamic mode cannot be enabled with an empty saved pool through the UI; an invalid external empty pool reports an error instead of silently selecting an excluded template. The catalog cap expands from 24 to 32 to preserve all existing saved templates during the addition. A crafted full 32-entry catalog without Manga is preserved; normal upgrade catalogs previously had at most 24 entries.

Template choices and catalog edits use Save templates/Discard template changes; default/format save immediately. Shared style retains Apply. Unsaved wording survives host refreshes and failed saves. Held image requests keep their prepared snapshots until explicitly rebuilt.

## Verification

- 1,248 unit tests across 99 files plus 18 transport tests pass: 1,266 total. TypeScript, production build and bundle/manifest checks pass.
- Chromium settings, mobile reader, existing reader, image templates and image review scripts pass. Checks cover single-row left-corner header, non-snapping release, saved-height echo, all seven themes, phone widths/orientation, zoom, drag/key interaction, simulated keyboard shrink, dynamic checklist, old catalog upgrade, manual unchecked Manga, invalid templates, failed-save drafts, light-theme fields, catalog capacity and zero implicit preview generation.
- Added a backend regression covering both held-request template rebuilding and replacement preparation with unchecked Manga; it failed before the manual integration fix and passes afterward, with generation approval preserved.
- Fresh read-only review caught manual dropdown/backend filtering still using dynamic inclusion; all three integration points were fixed and rechecked. No remaining actionable issue reported.
- Browser execution uses the previously documented bundled Node adapter; transport verification uses the temporary keepalive for installed Bun 1.3.14. These ignored helpers are not shipped.

No live Lumiverse install, paid image model, physical mobile keyboard or companion integration was exercised. Image panel consistency and lettering quality remain provider/model-dependent. Entity tooltips and the other remaining reader-experience plan packages are still pending.
