# Beta.17 reader header and reference links verification

Base: Testing 537f70b4095951c48cb3d563a774912616638cb1. Release: 0.2.0-beta.17.

- Full isolated unit suite: 1,348 passed, 0 failed across 115 files; 6,398 assertions.
- Separate speech transport suite: 18 passed, 0 failed; 45 assertions.
- Full TypeScript, production build, manifest/bundle verification and backend static-pattern scan passed.
- Chromium dossier fixture: 360/390px phones, landscape and desktop, every theme; visible speaker badges, icon-only toolbar, 44px header targets within the panel, highlighted references, current-reference menu, safe cards, timed facts, category gates and protected code/effect/link nodes. Display-renamed names stay plain while unaffected known references remain linked.
- Chromium mobile reader: prose and empty-panel taps advance; Previous does not double-advance; simulated drag/click and selected text do not advance; continuous resizing, hide/show, keyboard viewport and theme bounds pass.
- Existing reading and settings browser fixtures pass. Browser screenshots were inspected for the 390px header and reference card.
- Meaningful regressions failed before fixes: tiny reference control, theme toolbar bounds/hidden icons and adjustable-sheet prose taps blocked from advancing.

Toolchain: installed Bun 1.3.14 (project declares >=1.4.0); existing Node browser runner and speech transport preload were used. No paid provider calls, live Lumiverse installation or physical Android keyboard/touch testing were performed. These checks verify local behavior, not universal runtime compatibility.

Scope: user-requested reader UI refinement. Optional reference extraction, category/detail/linking controls and scene-reference menu are retained. E2 cast staging and external source reconciliation remain pending.
