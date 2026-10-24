# beta.61 — formatting settings polish

## Findings and changes

- Invalid literal regex rules previously fell through to the plain-pattern parser. `/foo/gg => bar` compiled as a different pattern instead of being rejected. A renderer regression reproduced this before the fix.
- Shared `compileDisplayRules` now supplies both renderer rules and settings diagnostics. Invalid literal syntax never falls through. Comments, valid flags, empty replacements and additional replacement `=>` text retain their behavior.
- Text filtering settings show syntax feedback with original line numbers and invalid-field styling. Apply keeps invalid drafts local and selects the first offending line. Other page saves are independent; saved source text is not migrated or rewritten.
- Discard and host acknowledgements update diagnostics while preserving newer drafts.
- Repeated settings group headings are hidden when the page heading already has the same title. Distinct section headings and all controls remain.

This is syntax validation, not execution isolation. Valid JavaScript regular expressions can still be slow. The checker compiles patterns but never tests them against story text. Worker/time-budget execution and plain-text fallback remain follow-up work. No claim of ReDoS prevention is made.

## Evidence

- Full suite: 1688 passed, 0 failed, 8137 assertions across 144 files under local Bun 1.3.14.
- Shared compiler and rich-text regressions passed, including invalid repeated flags and malformed brackets, original line numbers, comments, empty replacements and inert syntax checking.
- New Node/Chromium suite passed at 320/390/1280px: line feedback, invalid Apply sends no patch, offending line selected, valid page-only save, Discard, unrelated host update draft retention and a single Text filtering heading.
- Existing settings resilience and host lifecycle Chromium suites passed.
- TypeScript, production bundles and bundle validation checked for release. Backend static capability scan checked separately.
- Generic Lumiverse artifact auditor flagged existing `chat_mutation` and `app_manipulation` permissions for justification. They remain used for explicit user-authored message submission and native overlay/component overrides; verified call sites include runtime `chat.appendMessage` and frontend `ui.mountApp`/`registerComponentOverride`. No permissions were added.
- Physical Android IME, screen-reader behavior and host integration remain unverified. No paid model requests or dependency changes.

Screenshots: `.cache/browser-fixtures/display-rules-{320,390,1280}.png`.
