# Beta.15 story tooltips verification

Base: Testing 3ec7fa7e41521c33f0d0093115feeef01a78fe49. Release: 0.2.0-beta.15.

- Isolated unit suite: 1,339 passed, 0 failed across 114 files; 6,372 assertions.
- Speech transport suite with local keepalive preload: 18 passed, 0 failed; 45 assertions.
- Full TypeScript, production build, manifest/bundle verification and backend static-pattern scanner passed.
- Chromium tooltip flow passed at 390×844 and 1200×800, including every theme preset, unchanged prose, category gates, visible facts, backward snapshot state, card bounds, keyboard note save, Escape/focus return, typewriter completion, code protection, uncertain regex omission, local suppression, and zero external requests.
- Settings browser passed category/detail persistence. Existing mobile-reader, reading, text-effects and speech-stage integration fixtures passed.
- Fresh-context read-only reviewer identified focus trapping in collapsed details and first-mention alias ownership bugs. Both fixed; regression browser/unit checks passed, re-review found no remaining actionable findings. Reviewer independently ran five dossier tests and diff whitespace check.

Toolchain: installed Bun 1.3.14 (project declares Bun >=1.4.0); isolated units plus existing Node browser wrapper and speech transport keepalive workaround were used. No global toolchain was changed. Local fixtures are not a live Lumiverse installation or physical Android test. No paid provider request or companion-extension runtime call was performed.

Scope: standalone story-sourced tooltips. External SimTracker/Warp normalized dossier adapters/precedence remain unfinished in C. References require optional existing planner enrichment or already available metadata; enabling after planning does not synthesize missing facts locally. Customization bounds preserve existing notes rather than silently evicting them.
