# Beta.18 prompt detail and cast presentation verification

Base: Testing 253ab1be439a1d9c7e244419cc4a0da2441335c4. Release: 0.2.0-beta.18.

Prompt policy: the existing normal planner call includes a grounded 2,500–2,800 combined positive/negative target, actual template/shared-wording reservations and remaining direction guidance. Tests verify fixed/dynamic catalogs, Manga reservation, long shared styles and propagation through the actual planner call. No new model call or automatic word-padding step. Existing combined 3,000-character dispatch validation is unchanged. Held prompts remain frozen. Live model adherence to the new target was not tested.

Cast scope: first E2 presentation increment only, optional/default-off under Look → Scene. Reuses current-turn Environment/portrait pictures, capped at two visible portraits and 32 scene candidates. Others are selectable in a tray, speaker first. Legacy/action/detail/Manga retain scene role. No new images, storage, permissions, dependency or scheduler route. Supplied-art selection and persistent cross-turn cast libraries remain pending.

- Full isolated unit suite: 1,357 passed, 0 failed across 117 files; 6,425 assertions.
- Separate speech transport suite: 18 passed, 0 failed; 45 assertions.
- TypeScript, production build, manifest/bundle verification and backend static-pattern scan passed.

Regression checks cover actual AssetView role derivation, default/migration, cursor bounds/future art, two faces/speaker/tray, failed outfit replacement, environment revision boundaries, failed backgrounds and turn-scoped absence evidence. Missing usable compatible background falls back to normal display. Fresh scene/revision scope cannot borrow old faces. These rules are conservative; equivalent art in another scene/revision is not reused yet.

Chromium cast fixture covers 390px phone, 844px landscape and 1200px desktop; all themes, both reader layouts, contain-fit rectangular portraits, dialogue clearance, speaker highlight, tray interactions without advancing, backward reading, delayed decode after reset and settings persistence. ResizeObserver shrinks portraits to available space and collapses them on very short viewports with no usable art area. The observer is lazy/default-off. Existing image-review, mobile-reader, settings, reading and dossier fixtures passed. The 390px screenshot was visually inspected.

Toolchain: installed Bun 1.3.14 (project declares >=1.4.0), existing Node browser runner and speech transport keepalive preload. No global runtime was changed. No physical Android, live Lumiverse, live companion or paid-provider tests were performed. Local checks verify request/UI logic; they cannot certify image fidelity or a guaranteed output character count from each model.
