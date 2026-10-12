# Beta.9 prompt length and mobile editing — 2026-10-11

User evidence: NanoGPT rejected a 3,111-character request (maximum 3,000). Screenshot showed an inspected failed request, whose prompt fields were read-only. Nested shadow events also reached reader click/keyboard navigation.

Fixes:

- Outgoing primary positive and negative prompts each have a conservative 3,000 UTF-16-character limit at the sole image provider call, including no-review/external paths. Edited requests validate the same limit. NovelAI and host-managed copies are synchronized with compacted/edited primary text.
- Overlong compiled text only sheds line-edge whitespace and exact duplicate lines. Unique text is not truncated. Still-overlong automatic requests pause for review, even with review off. No-review surfaces fail locally before provider calls.
- Manga defaults use shorter positive instructions and a shorter negative prompt while retaining identity, wardrobe, panel count/order, grounded action, wordless/approved lettering, composition and visual quality concepts. Only fields exactly equal to older defaults migrate; user edits and existing held snapshots are preserved.
- Completed/failed/cancelled historical requests support local editable replacement drafts. Prepare edited preview passes the exact edited prompt/negative/parameters into the one-picture forced-review path; invalid edits fail before changing completed art. Request history stays unchanged. Inputs use 16px text, live length counters, and preserve long pasted text for explicit shortening. Native editing events stay inside the studio so they cannot advance the reader or trigger hotkeys. Same-turn refreshes preserve local edits.

Validation:

- Focused prompt-limit tests failed before implementation. Final isolated unit suite: 1289 passing, 0 failing across 105 files. Separate speech transport: 18 passing, 0 failing. Total: 1307 tests.
- Final provider-boundary tests prove oversize no-hook requests and callbacks dispatch zero image calls. Gate tests prove oversize automatic requests become editable held drafts and cannot be approved over the cap. Controller tests prove exact local replacement edits become a held preview without another paid call and invalid edits preserve completed art.
- Migration tests use the actual previous Manga default as a regression fixture; shortened defaults migrate, custom fields remain intact.
- Mobile reviewer browser checks pass: native typing of reader-hotkey letters, no navigation-event leakage, same-turn draft persistence, editable failed fields, exact preparation payload, overlong paste preservation/warnings, counters, fixed footer and no horizontal overflow. Template settings and shared-style browser checks pass.
- Strict TypeScript, production build, bundle verification and debugger blocked-capability scanner pass.
- Independent read-only review reported no important findings. Minor historical Use template enablement was corrected. Reviewer did not run tests independently.

Limits: Bun 1.3.14 is below declared >=1.4.0; executed checks passed using the existing transport keepalive and Node browser adapter. No live Lumiverse/paid-provider call or physical Android keyboard test was performed. Shorter instructions preserve intended controls; image quality has not been measured against the older wording. Custom overlong prompts require editing rather than silent loss of unique detail. Host/provider-specific translation can impose additional limits beyond the extension's primary fields.

Roadmap: this feedback fix does not advance entity/dossier/rule/interaction work; package C remains next.
