# Beta.7 scenario roles and picture recovery — 2026-10-11

Scope: next reader-roadmap increment on Testing. Adds Auto / Character / Scenario roles scoped to the chat and attached card, and subject/appearance corrections within the existing Image prompts panel. Scenario excludes the card title from automatic drawable subjects and narration labels; actual named cast remains eligible. Character explicitly permits the card subject without disabling appearance validation.

Corrections can target failed, cancelled or completed generated pictures. The selected picture is rebuilt into a held review draft even when normal review is off; sibling images remain intact. Old subject-bearing visual direction is discarded. Environment correction uses a no-people template. Extra reuse-only images beyond the budget cannot become new paid jobs. Appearance save defaults off and, when explicitly selected, updates only this character’s chat baseline. User scope, message, swipe and fingerprint are checked; recent repeated correction ids are rejected. Epoch and conditional serialized-write guards prevent obsolete corrections or role updates from publishing/restarting old turns after a new generation.

Verification:

- New regression tests were run failing before implementation for correction contracts and explicit scenario fallback.
- Full isolated suite: 1276 passed, 0 failed across 103 files. Speech transport: 18 passed, 0 failed; total 1294 passing tests.
- Strict TypeScript check, production build, and manifest/bundle static verification pass.
- Browser workflows pass: image review (including mobile role/correction controls, appearance save off by default, compatible no-people selection, fixed footer, no horizontal overflow, request-id fallback when randomUUID is unavailable), image templates, shared styles.
- Inspected the 390x844 recovery screenshot after correcting helper/button spacing.
- Controller tests verify stale fingerprint/swipe rejection, mandatory review with automatic mode enabled, no paid generation before approval, preserved sibling images, picture-only appearance not replacing stored memory, environment preview, repeated request rejection, and generation-start invalidation during a deliberately deferred appearance save.
- Planner tests cover ordinary card fallback, no-card/name-only fallback, scenario + actual NPC, scenario-title hallucination, and explicit Character without an invented appearance. Storage tests verify attached-card changes, unsupported-version preservation, and chat/global isolation of explicit saves.
- Independent read-only review found old cue-description leakage, explicit-scenario declaration bypass, subject-class precedence, and persistence races. All were fixed with regression coverage. Completed-picture correction was also exposed.

Tooling limits: installed Bun is 1.3.14, below the declared >=1.4.0 engine. Tests/build executed successfully with that runtime; transport uses a keepalive preload and browser checks use the existing Node adapter. No paid providers or live Lumiverse runtime were called. These checks cannot establish live provider reliability or diagnose a particular historical failure without its request/plan logs.

Remaining roadmap: richer structured subject-resolution diagnostics and explicit compatible-asset replan control in A; entity/cast/location projection and dossiers, presentation rules, timed changes and interaction drafts in C–G. This increment does not claim those features are shipped.
