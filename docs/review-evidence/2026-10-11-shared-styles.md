# Testing beta.6 — shared style library

Added twelve scene-independent shared looks in the existing prompt preset selector. Selection fills editable drafts; Apply changes future requests. Personal presets now persist optional suffix text while old records retain their suffix-selection behavior. Textareas and inline help explain the three shared fields. Built-ins do not occupy personal preset storage or become dynamic scene templates.

Added advisory warnings for omitted placeholders, recursive-looking literal shared text, photographic-vs-ink and monochrome-vs-full-color instructions, and photographic texture exclusions. Notes appear in local preview and prepared provenance. They never rewrite instructions, block generation, modify frozen requests or start paid work.

Research rationale and references: `docs/image-prompting.md`. These are researched authored presets, not image-quality benchmarks. No live Lumiverse installation or paid model comparison has been run.

Validation: 1257 unit tests across 102 files plus 18 transport tests. Strict typecheck, production build and bundle verification. Settings, image-template, image-review and shared-style browser workflows. Mobile style screenshot inspected. Bun 1.3.14 remains below the declared engine floor; the established Node browser adapter and transport keepalive were used.

Read-only reviewer found no significant issues. Minor textarea type annotations were corrected. Existing configuration and user template wording are preserved; the remainder of the reader roadmap is unchanged.
