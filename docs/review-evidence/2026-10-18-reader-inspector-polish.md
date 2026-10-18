# beta.45 — reader, image inspector and reference cards

Branch: Testing. Base: beta.44 (`6b79aca`). No preset, dependency, permission or persisted turn schema was replaced. Main is outside this release.

## Delivered

- A temporary read-only reply preview arrives after the existing narrative parser and display-macro resolver, before visual-context/model planning completes. It uses escaped reader Markdown, preserves preset text, and carries chat/message/swipe/source fingerprint plus a frontend state-request session. Closed, superseded and malformed previews are rejected. Cursor transfer requires the complete paragraph sequence and source identity to match. Preview navigation has 44px controls, hides/restores locally, and never submits a reply, sends read acknowledgments, plays speech or requests another model/image. Large previews are omitted as a whole rather than truncating prose. Failed preparation leaves prose readable with a truthful stopped caption.
- Image prompts starts with picture/status/excerpt and a thumbnail where available. Two/three-picture batches have a strip; larger batches keep a selector. Planning, no planned pictures, budget zero, preparation, approval, generation, failure, cancellation, cache reuse and older pictures have separate explanations. The footer has one appropriate main action. Advanced template, correction, rule, source, raw parameter and recovery controls remain available in disclosures. The editor retains native focus behavior, per-picture drafts, invalid JSON/combined-length validation, prompt rewriting and previous-wording restore. Rewrite uses text tokens; Generate starts an image request. Retry includes an edited draft where applicable and still prepares approval first.
- Extractive references accept richer NPC, place and item fields. Exact subject/value evidence, category compatibility, reveal cursor and current-message provenance remain required. Unsupported/private/unrevealed fields are omitted. There is no extra extraction request. Grouped cards keep a summary, current state, collapsed populated details, source disclosure, local notes/pin/hide/actions and revealed-document reading. Reading settings retain categories, detail and link density, with optional information groups. Disabled groups do not consume the detail allowance or leak through inline-anchor descriptions. Expanded mode allows up to 32 visible fields within the existing bounded data budget.
- Item owner/condition observations project into detached snapshots from their actual reveal paragraph. Long ownership observations remain facts rather than invalidating the smaller state schema. Conflicting tracked state and story observations remain visibly distinct with paragraph attribution; neither silently replaces the other.

## Independent review

Read-only review identified an Important merge issue: a tracked outfit/owner could overwrite a differing observed value in the card. A production projection/selection reproduction confirmed a newer 297-character ownership observation was hidden behind an older short owner. The UI now separates conflicting story observations from tracked scene state, because the two paths do not have comparable timestamps. A focused browser regression verifies both differing outfits remain visible and labeled. The review's minor stopped-caption issue had already been corrected; a failure/retry browser check verifies the preparing caption returns.

## Verification

| Check | Fresh local result |
|---|---|
| Isolated unit/integration suite | **1,556 passed**, 0 failed, 132 files |
| Separate speech transport suite | **18 passed**, total **1,574** |
| Restricted validator/storage/controller suite | **98 passed**; overlaps the normal suite |
| Browser suites | All **32** scripts passed; final targeted preview/reference checks passed after review fixes |
| Types | Both TypeScript projects passed |
| Production bundles | Backend and frontend built; manifest/version/bundle verifier passed |
| Local host probes | No blocked capabilities; restricted backend startup loaded |
| Visual inspection | Mobile preview, 390px inspector and 360px grouped card screenshots inspected; existing suites cover theme and responsive variations |

New scripts: `test-preparation-preview-browser.ts`, `test-image-inspector-browser.ts`, `test-reader-reference-workspace-browser.ts`. Existing image review/recovery and dossier scripts retain their scenarios with updated controls/disclosures. The preview browser uses the actual host controller and covers old sessions, final/closed replies, exact-source cursor transfer, no temporary read acknowledgment, preset escaping, touch targets and failure/retry captions. Image checks cover local drafts, combined 3,000-character validation, native focus, main action selection, historical/reused/empty states and prior-asset updates during planning.

Tests use local mocked/intercepted endpoints, Bun 1.3.14, and the existing Node 22.19 Playwright adapter; the declared runtime remains Bun >=1.4.0. The separate speech transport suite uses a test-only keepalive preload for this local runtime. These results do not certify physical Android keyboard behavior, paid provider acceptance, or a live production Lumiverse session.

## Next phase

Cross-reply reference aggregation remains pending. The investigation in the progress plan documents required ancestry and resolved-selection evidence. Re-resolving historical macros against current variables cannot prove an old branch. Current-turn validators were kept strict; no old fact is restamped as new evidence.
