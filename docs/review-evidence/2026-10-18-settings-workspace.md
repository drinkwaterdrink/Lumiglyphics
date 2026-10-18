# beta.44 — settings workspace

Branch: Testing. Base: beta.43 (`82c602d`). The supplied settings-overhaul plan is the design basis. This is a frontend redesign over the existing config, cast/place libraries, rules and voice services; it does not migrate history or replace generation machinery.

## Delivered

- Seven categories and a lightweight settings home. Narrow containers use compact Back/category/search controls; wide containers use a sidebar. Navigation stays in normal flow to avoid competing with the host header. Search is explicitly scoped to Lumiglyphics and opens the relevant focused page.
- Images overview keeps source, review, numeric budget, connection and output shape together. Templates, shared style, rules, references/reuse and model-specific controls have focused destinations. Controls are rendered directly in their destination rather than moved by positional child indexes.
- Characters & places has searchable saved lists and entity details. Appearance, outfits, display portraits and source review share a scoped character draft; saved summaries remain distinct. Source suggestions require an intentional save. Display-art assignment targets a saved look and shows when reassignment is needed. Voice uses the existing shared editor with a return path.
- Reading keeps pace/replies/references together. Appearance owns local visual preview, fit, themes, dialogue sheet and motion. Audio groups Speech and Music. Connections owns reader/context services. Advanced is an index of focused technical editors.
- Technical Save/Discard operates on the current page's edited keys. Save-and-leave waits for matching confirmation. Failed/unknown saves retain drafts, and newer edits survive delayed echoes. Character drafts survive subpage browsing and are retained in memory by story when the host changes chats.

## Preservation

`SETTINGS_FIELD_PAGES` exhaustively satisfies `Record<keyof VisualNovelConfig, SettingsPageId>`; a runtime inventory test checks all **62 keys** against `DEFAULT_CONFIG`. Existing keys and stored prompt text are unchanged. Legacy section links remain accepted aliases.

Maintained browser coverage exercises presets and exact suffix text, image source/budget/review, raw unknown provider parameters, NovelAI controls, context mappings/status, System One enclave actions, scoped rules, tooltip categories/actions, theme/filter/CSS editors, audio management, cast aliases/outfits/art variants and gallery assignments. There is no new credential path, dependency, permission or paid action. Browsing, search, local appearance preview, scans and gallery inspection do not invoke generation. Open reader remains an explicit separate action with its normal preparation behavior.

## Review fixes

Independent review found two Important issues. Both were reproduced failing in browser tests before fixes:

1. A pending Save-and-leave could navigate after a later Stay. New navigation/Stay/Escape now cancels the obsolete navigation intent while retaining the actual save.
2. Changing a selected character/place variant could leave a stale removal confirmation active. Variant changes now invalidate both confirmations.

The maintained settings suite also exposed a delayed focus callback interfering with a subsequent search. Deferred scroll/focus now yields to newer keyboard, pointer, input and focus interactions. Keyboard category navigation retains focus on its selected tab. Review identified no other Critical/Important finding; the author verified the fixes through regression tests.

## Verification

| Check | Result |
|---|---|
| Isolated unit/integration suite | 1,539 passed across 130 files; zero failures |
| Separate speech transport suite | 18 passed; total **1,557** |
| Restricted validator/controller/storage suite | 96 passed; overlaps normal suite |
| Browser suites | All **29** scripts passed, including new settings/cast workspaces and maintained rule navigation |
| Responsive/visual | Narrow 320/360/390/412px and wide 768/1000/1280px fixtures across suites; light/dark screenshots inspected; 200% text-scaling overflow check passed |
| Types and production bundles | Both TypeScript projects, backend/frontend builds and bundle verification passed |
| Local host probes | No blocked capabilities; restricted startup loaded successfully |

The actual settings fixture was checked for meaningful page content, correct title, interaction results and page errors; its navigation/open-reader counter confirms no reader launch from browsing. Cast fixture actions are restricted to existing metadata operations. Browser runs use local mock/intercepted endpoints, not paid providers. Final visual checks disabled finite CSS transitions for light-theme screenshots so captures reflect settled colors.

Local tooling: Bun 1.3.14 and the existing Node 22.19 Playwright adapter. The manifest still declares Bun >=1.4.0; no lockfile change masks that difference. Speech transport tests use a test-only keepalive preload for this local runtime. This verifies source/build behavior, not production-host acceptance.

## Rollout limits

Testing is the rollout gate; main is unchanged. Beta.43 is the complete rollback point, with no data-schema migration to undo. A temporary full legacy-UI cutover flag from the proposed plan was not added; there is one authoritative editor/data path. Physical Android keyboard/Back/safe-area behavior, live Lumiverse host mounting and the proposed fresh-user usability comparison remain manual acceptance tasks. No measured usability improvement or universal device/provider compatibility is claimed. F2 presentation policies remain separate roadmap work.
