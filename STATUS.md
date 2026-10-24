# Lumiglyphics status — beta.62

This matrix describes beta.62 on Testing. Dated plans and evidence describe their own releases; they are historical context rather than competing current status pages.

| Area | Status | Current behavior / remaining scope |
|---|---|---|
| Reader identity and recovery | Delivered | Scenario/narrator cards, appearance correction, replan, saved cursor/drafts and guarded revisions. |
| Mobile reader | Delivered | Adjustable themed text sheet, icon controls, click-to-advance, history exits, close suspension and temporary prose preview while planning. Physical Android acceptance remains manual. |
| Image prompts and recovery | Delivered | Explicit per-picture retry queue, retry unfinished and completed-image regeneration without review; edited previews keep approval. State-specific inspector, editable templates/shared styles, optional dynamic selection, model-aware combined character budgets, optional manual ceiling, approval, prompt rewrite/restore, individual retry and failure dismissal. Published size/ratio controls now validate model output locally. |
| Full scene / ensemble | Delivered, opt-in | Named physically present cast plus persona, separate appearances, bounded descriptions, no single-face reference or portrait reuse. Up to 16 subjects; actual model accuracy varies. |
| Cast and saved place art | Delivered foundation | Context scan, manual appearance/outfit guidance, gallery art and optional compatible reuse. Cast overlays now have local hide/restore controls. Cast view now allocates background and up to two already selected, present subjects within one shared budget; verified saved/cache hits cost no new slot. Expression/outfit variant allocation and richer placement remain pending. |
| References and interactions | Delivered foundation | Grouped cards, category/field/detail toggles, inline highlights, quiet menu, reveal-scoped sources and interaction drafts. Optional earlier descriptions have verified ancestry and original source labels. Legacy/dynamic-macro history and broad identity reconciliation remain pending. |
| Documents | Delivered foundation | Literal current-reply document reading. Cross-turn aggregation and classified external adapters remain pending. |
| History | Delivered foundation | Unified saved prose/images with version-aware navigation. Broader bounded indexing/backfill/dedup remains pending. |
| Settings workspace | Delivered for Testing | Seven categories, focused pages, searchable cast/place management and page-specific technical saves. Physical host/device acceptance remains manual. |
| F1 template preferences | Delivered | Scoped rules, previews, remembered corrections and trace. |
| F2 presentation policies | Partial | Named selected-picture-subject, current-place and verified paragraph-item conditions delivered. Conditional Gentle/Off one-shot effect caps delivered, including automatic-shake enforcement and global/OS precedence. Conditional music Quiet/Mute delivered. Opt-in within-reply background hold delivered, releasing at scene/revision boundaries and respecting manual artwork and full-scene/page compositions; broad physical-presence rules require stronger planner evidence. |
| Companion context | Partial / contract-bound | Optional SimTracker/public companion data; broad historical/reveal reconciliation requires verified public contracts. |
| Warp illustrations | Delivered | Independent of reader visibility; shared request review gate, closed-reader approval/edit/cancel surface and scoped request snapshots. |
| Audio and speech | Delivered, optional | Full-path audio cache identity and explicit speech lifecycle. Stable public TTS API/host autoplay coexistence remain compatibility limits. |
| Deferred ideas | Deferred | Storyboard, bookmark timeline, presentation packs, autonomous simulation and a parallel memory/RPG engine. |

Remaining work: [current roadmap](docs/ROADMAP.md).

Release evidence: [beta.58 image pipeline audit](docs/review-evidence/2026-10-22-image-pipeline-audit.md), [beta.57 Z-Image adaptation](docs/review-evidence/2026-10-22-z-image-adaptation.md), [beta.56 cast allocation](docs/review-evidence/2026-10-20-cast-allocation.md), [beta.55 queued image retries](docs/review-evidence/2026-10-20-queued-image-retries.md), [beta.54 background hold and style persistence](docs/review-evidence/2026-10-19-background-hold-style-persistence.md), [beta.53 prompt repair](docs/review-evidence/2026-10-19-prompt-repair.md), [beta.52 model output compatibility](docs/review-evidence/2026-10-19-model-output-compatibility.md), [beta.51 model-aware image prompts](docs/review-evidence/2026-10-19-model-aware-prompts.md), [beta.50 cast overlay dismissal](docs/review-evidence/2026-10-19-cast-dismissal.md), [beta.49 music preferences](docs/review-evidence/2026-10-19-music-preferences.md), [beta.48 effect preferences](docs/review-evidence/2026-10-19-effect-preferences.md), [beta.47 named-subject preferences](docs/review-evidence/2026-10-19-subject-preferences.md), [beta.46 earlier references](docs/review-evidence/2026-10-18-reference-retention.md), [beta.45 reader and inspector polish](docs/review-evidence/2026-10-18-reader-inspector-polish.md), [beta.44 settings workspace](docs/review-evidence/2026-10-18-settings-workspace.md). Neither automated checks nor source inspection certify every provider, physical device or supported host version.

Beta.59: [cross-system polish audit](docs/extension-polish-audit.md), History filter-race recovery, exact archive accounting and reduced refresh/merge work. Existing feature scope is unchanged.

Beta.60: prompt-review operation states, visible edited-preview actions and saved-draft reset; queued/running retries no longer masquerade as failures. See [verification](docs/review-evidence/2026-10-23-image-workflow.md).

Beta.61: display-rule syntax feedback with line selection, invalid-draft save protection and duplicate settings heading cleanup. [Evidence and limits](docs/review-evidence/2026-10-23-display-rules.md).

Beta.62 starts the approved [cohesive experience plan](docs/superpowers/plans/2026-10-23-cohesive-experience.md): consistent picture-selector/thumbnail operation labels and a reply summary. Main remains at the promoted beta.61 baseline.
