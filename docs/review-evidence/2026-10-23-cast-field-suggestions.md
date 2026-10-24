# beta.67 — explicit cast field suggestions

Testing-only continuation of Phase 3. Main remains beta.61; the beta.66 overlap hotfix is retained.

## Delivered

- Source review separately displays saved appearance, aliases and default outfit used for future preparations, the current appearance draft, and the selected read-only source. Long saved guidance can scroll with keyboard focus.
- Additive individual-field actions: **Use appearance only**, **Add suggested aliases**, **Add suggested outfits**. Existing bulk fill/replace actions remain available.
- Appearance-only selection changes no aliases/outfits/default. Alias addition deduplicates case-insensitively within the 16-entry limit. Outfit addition uses fresh IDs, preserves existing same-name outfits and reports different wording without overwriting, preserves the current default, and reports the seven-outfit limit.
- All changes remain local drafts until explicit Save changes. Another character cannot supply targeted fields to the open draft. All-cast scanning resolves existing canonical records rather than creating a duplicate draft for a matched character.
- Original incoming suggestions remain visible after a conflict/capacity warning. No automatic semantic merging, field saving, portrait generation or default-outfit selection.
- Existing cast workspace browser suite moved onto the shared Node fixture server with mocked gallery responses, preserving its original flow coverage.

## Verification

- Pure field-selection tests observed failing before the helper existed, then passed: isolated appearance/alias changes, nonmutation, outfit conflict/default protection, capacity limits and empty descriptions.
- Full suite: 1707 passed, 0 failed, 8198 assertions across 147 files; local Bun reports 1.3.14.
- New Chromium suite at 320/390/1280px: saved/draft distinction, isolated imports, preserved outfit/default, no save before explicit action, another-character guard, canonical-record reuse during all-cast scan and final saved values.
- Existing cast workspace Chromium suite passed: shared drafts, explicit saves, scan review, display gallery, stale portrait reassignment guidance, chat-scoped draft restoration, voice handoff and place navigation.
- During browser test development, an ambiguous accessible-label selector matched three controls; corrected to exact labels and reran successfully.
- TypeScript, production build, bundle verification and backend scanner checked before publication.
- Screenshot inspected: `.cache/browser-fixtures/cast-suggestions-390.png`.
- Physical Android, screen-reader behavior and real companion/host integration remain unverified. No paid calls, permissions, new dependencies or storage migrations.

## Remaining

This imports existing text fields, not individual inferred hair/eye traits. Durable per-field origin tracking, more comprehensive alias/source reconciliation, per-person ensemble provenance and final-prompt occurrence mapping remain unfinished.
