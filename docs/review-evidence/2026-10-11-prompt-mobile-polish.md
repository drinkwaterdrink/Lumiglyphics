# Testing beta.3 — prompt editor and reader polish

## Delivered

Pictures now has one **Image prompts** section containing context selection, **Scene templates**, consistency controls and **Shared style**. Original positive prefix/suffix, negative prompt, presets and series reference fields retain their values and save behavior. Shared style fields use Apply; template catalog drafts use Save templates, with their own failure retention. Templates use shared settings only through their style/suffix/negative placeholders. The local preview describes these roles. Template controls now have consistent spacing, labels and a themed text input; host light-theme tokens are verified.

The reader no longer has a size dropdown or Text panel title. Compact/Reading/Expanded remain in Appearance settings, with drag and keyboard resizing retained. Hide/show are named, focusable icons. Navigation is visually smaller across preset readers; adjustable sheets use a compact strip. The adjustable speaker label is bounded and less prominent, and decorative dialogue ornaments no longer crowd its resize handle. Theme background opacity and text scrolling remain intact.

**Manga page** is an editable, disabled-by-default built-in. Existing saved catalogs can select **Add manga page** without overwriting their entries; repeated selection does not duplicate it, and the 24-template cap remains enforced. Enable it and save templates before selecting it as the default or allowing dynamic selection. It uses the resolved scene/action/appearance/lighting and available character reference. It requests one page with 5–7 panels showing the current visual beat, not a new full-reply storyboard. Wordless by default; approved dialogue or sound effects can be written into the template or held prompt. Its independent negatives avoid shared speech-bubble/border exclusions; its positive wording still uses shared style and suffix, which users can adjust or omit. Portrait output dimensions are set through existing image parameters where supported. One page consumes one picture from the existing budget; no extra generation path was added.

## Verified

- 1,245 unit tests across 99 files plus 18 speech transport tests: 1,263 passing. Strict TypeScript, production build, manifest/bundle checks pass.
- Chromium image-template, mobile-reader, existing-reader and settings regression scripts pass. Coverage includes saved drafts, invalid placeholders, failed saves, old-catalog Manga insertion, duplicate prevention, catalog cap, light-theme token inheritance, four mobile/orientation sizes, all seven reader themes, zoom, text scrolling, drag/key resize and simulated keyboard shrink.
- Screenshot inspection caught a Paper theme ornament crowding the drag handle; it is suppressed only in adjustable mode. Fresh read-only review found no remaining actionable issues. Its initial coverage and default-reader compactness concerns were addressed.
- Verification uses installed Bun 1.3.14 with the previously documented temporary transport keepalive and Node Chromium adapter. Neither workaround is shipped. Live Lumiverse, paid image models and a physical mobile keyboard were not exercised; model panel coherence and lettering quality require user testing.

The remaining reader-experience packages (entity projections/tooltips, persistent assets, presentation rules, timed changes and interactions) remain pending. This update does not claim those are delivered.
