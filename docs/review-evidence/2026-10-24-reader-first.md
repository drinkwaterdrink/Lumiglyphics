# Reader-first implementation verification — 2026-10-24

Scope: the beta.72-based `arena/bcd536d4-lumiglyphics` working branch. This is a production-source integration, not a claim that a new release has been published or that every physical device/provider has been certified.

## Delivered

- Protected, labeled desktop Read / Story / Artwork / History / Settings navigation; phone Read / Story / Artwork / More. Back to chat is separate, keyboard-visible and outside user CSS.
- Quiet reading header, reversible Focus reading, local menu/settings search (Ctrl/Command K), responsive same-instance workspaces and actionable review counts. Searching and navigating do not generate prose or pictures.
- Story categories over the existing validated references, including revealed literal documents. Back returns from document to item to references; Close returns to reading. Direct inline-reference entry closes back to its original anchor.
- The actual image reviewer and History library are reused, including approval, repair, retries, original request provenance, version filters and asynchronous response guards. Locally edited prompts, selected picture/request and scroll survive tool switching; advancing the reading cursor still selects the appropriate picture on reopening.
- The actual Settings and Speech settings are reused. Every existing configuration key still maps to its existing page; all 22 pages remain. Unsaved technical editors retain drafts and their native Save / Discard / Stay confirmation. The native host settings tab retains its home after the reader workspace closes.
- Adjustable dialogue resizing remains pointer- and keyboard-operated, with saved height ratio, compact/reading/expanded sizes, opacity, overlay/image-first layouts, text scale and hide/show. Height calculations now use the reader's real reduced bounds; short landscape keeps room for replies.
- All **10** preset IDs currently in `THEME_PRESET_IDS` remain, including the three Atelier presets. The shell uses existing per-preset tokens, rather than forcing a single mineral palette. Reader styling still uses base → preset → sanitized user CSS; custom CSS cannot hide navigation/exit.
- Covered mobile reading content and floating companion layers are inert while a workspace is open. Focus stays within the extension across shadow roots. Native dialogs retain their own Escape behavior; suspension/cleanup closes native menu chrome without discarding editor drafts.

## Verification actually executed

| Check | Result |
|---|---|
| `bun test --isolate` | **1,747 passed, 0 failed**, 153 files, 8,502 assertions |
| `bun run typecheck` | Passed |
| `bun run build` | Passed, backend and frontend bundles |
| `bun run verify:bundle` | Passed; manifest/version/entry checks and local backend static patterns |
| Browser suites listed below | **27 passed, 0 failed**, against the final source |
| `git diff --check` | Passed |

Browser commands (`bun run test:<name>`):

```
reader-first             mobile-reader          host-lifecycle
reading                  dossiers               documents
reader-reference-workspace reference-retention  settings
settings-workspace       settings-resilience    history
story-css                image-review           image-inspector
image-library            reader-picture-status  speech
speech:stage             prepared-brief         image-workflow
image-recovery           image-retry-queue      history-races
scene-interactions       game-moves             model-prompts
```

The new `reader-first` suite runs the **real host controller** and its actual tools. It covers 1440×900, 1024×768, 390×844, 320×720 and 844×390, all presets on phone/desktop, nested Speech theme inheritance, primary Settings button contrast ≥4.5:1, original-instance navigation, unsent reply/prompt/note/technical-editor recovery, source reveal boundaries, native settings dialogs, simulated visual-viewport keyboard avoidance, resizing/hide/show, focus/exit, cleanup while menu search is open, and zero paid navigation actions. Existing mobile/reading suites additionally cover pointer resizing and Lumiverse UI-scale compensation.

Chromium was run headlessly through Playwright using a locally unpacked Chromium 133 compatible binary because the normal browser download host is not available in this environment. The browser and generated bundles/logs remain in ignored `.cache` / `dist`; they are not extension dependencies. Normal development can use `bunx playwright install chromium`.

## Review the working UI

Run `bun run serve:reader-first` and open port 4175. The server binds to `0.0.0.0` and browser resources use relative URLs, including in a proxied preview.

This is a **sample host fixture around the production UI**: sample observatory art/prose, no credentials, no live model calls, and no durable story persistence. Settings acknowledgements and read-only History responses are fixture-owned. It is not a replacement for installing the extension in Lumiverse.

- [Desktop reader](reader-first/reader-desktop.png)
- [Phone Settings workspace](reader-first/settings-phone.png)

## Deliberate boundaries

The concept's illustrative Moments/memento data has not been shipped as fake persistence. No autonomous simulation, new memory engine, invented biography or automatic generation was added. Existing backend authority, reveal policies and explicit submission/approval gates remain.

The eight backend files already modified before this UI implementation were preserved and verified, not reset or replaced. Their audit hardening is kept in a separate commit from the reader-first integration.

Automated checks do not certify native iOS/Android keyboards, assistive-technology announcements, every Lumiverse host version, live provider output or permission changes on physical devices. Those remain manual acceptance checks. No live paid provider request was needed for this UI verification.
