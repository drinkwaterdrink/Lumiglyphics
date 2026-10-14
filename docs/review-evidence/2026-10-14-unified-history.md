# Unified History — beta.27

Delivered approved I2: production reader History opens one window with Story and Images views. Story groups exact reply/swipe/fingerprint/revision snapshots with expandable text, speaker labels and thumbnails; text-only saved replies remain browsable. Images retains gallery-only access. Filters are collapsed by default, and full-size viewing/zoom/saved prompts share the existing viewer. Header close and persistent Back to reader retain focus; returning from the image viewer preserves expanded replies and scroll. Read-so-far prevents future paragraphs from entering previews. Browsing performs no generation or chat writes.

Historical images without the matching saved text snapshot appear as explicitly labelled saved image versions with original per-image excerpts. They are never silently attached to newer reply text. Missing image references remain visible as unavailable. Unsupported archive data stays preserved. The existing library enumeration fix remains in place.

Verification:

- Final isolated suite:1,426 passed,0 failed,6,660 assertions across122 files. Separate speech transport:18 passed,0 failed,45 assertions with established keepalive preload. Total1,444 tests.
- Strict typecheck, production build, manifest/version verification, backend static scan and whitespace checks passed.
- Unified History browser checks passed with real shell CSS and visibility state at360×640 and844×390 for Lumiverse,Paper Novel,Midnight Noir,Boxed Console and Literature Club, plus390×844 interaction checks. Screenshots were inspected for mobile spacing and light-theme readability. Checks cover collapsed filters,exact-version grouping,original historical excerpts,Story/Images switching,zoom,prompt safety,stale pages,chat reset,return focus and persistent exits.
- Existing History browser checks passed15 viewport/theme combinations. Real VnStage History control integration opens the unified window without opening legacy backlog underneath and returns without changing progress.
- Existing reader browser checks passed touch targets,keyboard/focus,drafts,theme toolbars,UI scale,reduced motion and History returns. A44px target measured43.99997px after Chromium fractional scaling; only that assertion now tolerates0.01px rounding. No target was reduced.
- Independent review found old-version association and malformed saved speaker handling. Both fixes have failing-then-passing regressions. Production shell tests also reproduced and fixed a rule hiding the new window with competing overlays. No further important review findings reported before the last metadata fix.

Limitations: previews use saved extension plans, not unplanned host replies. Each reply preview is capped at12,000 characters and256 paragraphs and explicitly labelled when shortened. Saved image archives do not retain complete old text snapshots, so historical versions use original excerpts. Broader image backfill/deduplication and D2/G/H remain pending. No live Lumiverse,physical Android or paid image generation run was performed. Installed Bun1.3.14 is older than declared>=1.4.0; browser tests use the established Node adapter.
