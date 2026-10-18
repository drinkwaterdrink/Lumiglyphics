# Settings workspace implementation ledger

User-approved design: `.codex-remote-attachments/01a1286d-2370-7283-bc21-31d36e23315e/203febb6-c6a8-4219-b8c4-ed087f0f8dd8/1-Lumiglyphics-Settings-Overhaul-Plan.md`.

Base: beta.43, `82c602d`, Testing. Scope: settings frontend and verification, preserving all config/library/voice/reference fields and generation machinery. No new provider workflow, storage migration, image call or main-branch update.

## Delivery checklist

- [x] Inventory all 62 fields: typed `SETTINGS_FIELD_PAGES` exhaustively maps `VisualNovelConfig`; additional management actions audited separately.
- [x] Typed pages and legacy aliases; category home/mobile dialog/desktop rail; route-aware search, Back and scroll restoration.
- [x] Explicit Images composition (no positional child moves); overview, templates, style, rules, reuse and advanced generation.
- [x] Cast/place list-detail workspaces, shared draft, source review, gallery and voice return path.
- [x] Reading/Appearance/Audio/Connections/Advanced focus and per-page saves; no duplicate authoritative editors.
- [x] Full regression/browser/theme/zoom checks, production build/scanner and independent review.

Publication procedure: commit the verified beta.44 release, push Testing and confirm remote HEAD. Physical host/device and fresh-tester acceptance remain manual, as recorded below.

## Decisions and interfaces

- Existing beta.42/43 serialized config and correlated acknowledgement paths are retained. New editors must not bypass them.
- Shell owns route visibility and pending technical saves. Template and cast editors own their existing drafts and expose `guardNavigation(callback)`; voices still use the shared Audio editor.
- Existing `look`, `pictures`, `sound`, `voice` links remain aliases. New page IDs carry focused context without changing config keys.
- Root owns shell/model/routes/styles; delegated cast/place and template UI changes have disjoint files. Legacy browser tests are maintained separately, with shared browser port access serialized.
- Use container width; no fixed-height nested application scroll area. Dirty footer stays in document flow for keyboard safety. Physical Android keyboard/Back acceptance cannot be certified through viewport emulation.
- The supplied companion concept HTML is not attached. Implement from the complete written design, existing host tokens and rendered local fixtures.
- Browser skill/plugin absent; use existing Playwright fixtures and local Node adapter. Do not install dependencies.

## Progress/evidence

Final evidence: [beta.44 settings workspace](../../review-evidence/2026-10-18-settings-workspace.md). 1,539 isolated tests plus 18 speech transport tests passed; all 29 browser scripts passed; 96 overlapping restricted-runtime checks and both type/build/bundle/scanner/startup gates passed. Cast roster RED browser was observed before implementation. Mobile/desktop and settled light/dark screenshots were inspected; text-scaling checks passed.

Independent review identified two Important issues, both reproduced RED and fixed GREEN in actual browser fixtures: (1) an older Save-and-leave intention surviving a later Stay; (2) stale destructive confirmations after changing cast/place variants. The save still completes, but superseded navigation is cancelled; both variant changes invalidate removal confirmations. Review found no other Critical/Important issue. A delayed search-focus race was also reproduced in the maintained settings suite and fixed by invalidating deferred focus after newer interactions, including focus changes.

Rollout ruling: this release targets Testing without schema/data migration. Keep beta.43 (`82c602d`) as the complete frontend rollback point rather than shipping a second permanent settings implementation or a fake legacy editor. A temporary full-UI cutover flag and physical host/device acceptance from phase 5 are not implemented/certified here. The written plan's broader measured usability comparison remains a manual acceptance task; no measured improvement is claimed.
