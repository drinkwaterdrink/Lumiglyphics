# Lumiglyphics documentation index

Start here. Each row says what a document is for and whether it is current.

## Current sources of truth

| Document | Purpose |
|---|---|
| [../STATUS.md](../STATUS.md) | Delivered-feature matrix (hand-written). |
| [STATUS-TABLE.md](STATUS-TABLE.md) | Counts generated from the code (version, presets, test files). Regenerate with `bun run status:generate`; CI checks it. |
| [ROADMAP.md](ROADMAP.md) | Unfinished work. |
| [2026-10-30-audit-and-improvement-ideas.md](2026-10-30-audit-and-improvement-ideas.md) | Latest audit, with the suggestions and what has been done since. |
| [2026-10-24-exhaustive-architecture-audit.md](2026-10-24-exhaustive-architecture-audit.md) | Architecture audit (F1–F16). Still the reference for the open F-items. |
| [../README.md](../README.md) | User-facing overview and setup. |

## Historical (kept for context; do not treat as current status)

- `2026-10-13-*`: early audit and feature catalogue.
- `2026-10-24-beta72-deep-audit.md`, `2026-10-24-product-ux-roadmap.md`, `2026-10-24-reader-first-redesign.md`, `2026-10-24-roleplay-mechanics-and-polish.md`: plans and audits from that release line.
- `IMPLEMENTATION_STATUS.md`: a 2026-10-13 snapshot. Use STATUS.md instead.
- `review-evidence/`: per-release verification records.
- `superpowers/`: planning notes.

When a dated document and a current source disagree, trust the current source and the code.
