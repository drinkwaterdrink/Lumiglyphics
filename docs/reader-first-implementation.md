# Reader-first implementation and preservation gates

Approved direction: the 2026-10-24 reader-first redesign. Work stays on `arena/bcd536d4-lumiglyphics`.

## Non-negotiable preservation contract

- Keep all existing configuration keys, defaults and persisted values, including adjustable dialogue height, opacity, compact/reading/expanded size, overlay/image-first layout, hide/show text and text scale.
- Preserve all built-in theme IDs, the shell/theme correspondence, documented `data-vn-*` selectors, base → preset → user cascade, sanitized custom CSS and host scale compensation.
- Reuse existing settings, reviewer, history and dossiers: do not fork settings state, approvals, image requests, source/reveal policy or backend ownership.
- Navigation alone never submits prose, regenerates art or resets drafts. Back, Close and Back to chat remain distinct.
- Do not replace scene art with prototype art or insert the prototype's fictional data into the installed extension.

## Delivery sequence

- [x] Shared reader navigation/workspace, responsive shell, focus reading and local menu search.
- [x] Dock existing Story, Artwork, History and full Settings instances; preserve their deep controls and drafts.
- [x] Harmonize reader/chrome spacing and labels without flattening the built-in themes.
- [x] Verify source-safe lifecycle, keyboard/mobile navigation, resize/hide/show, every theme and all settings coverage.
- [x] Run unit, browser, type, build and bundle checks; document limitations.

New narrative simulation, automatic memory extraction and a separate RPG engine are not part of a UI migration. Saved story facts must continue to come from validated projections, never mockup data.

## Verification and publishing

Final checks: **1,747 unit tests and 27 browser suites passed**, plus typecheck/build/bundle checks. All 10 current theme IDs and all 22 Settings routes were covered. See [evidence and manual limits](review-evidence/2026-10-24-reader-first.md).

Publish only the session branch: `git push origin arena/bcd536d4-lumiglyphics`. No version bump or automatic release/promotion is part of this UI change.
