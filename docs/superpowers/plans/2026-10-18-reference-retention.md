# Verified earlier references — beta.46

Continue the approved reader/reference roadmap on Testing. Preserve current reply validation, settings, presets and image prompts. Earlier descriptions are display-only and retain their original reply/paragraph attribution.

## Design

Store an optional versioned certificate on newly planned replies. It binds the plan key and paragraph digest to a SHA-256 prefix of the live ordered messages through that reply: IDs, swipe, role, name, raw content, parent and branch IDs. Recompute before serving earlier references and recheck live history after storage reads. Include intervening user messages. Never backfill legacy certificates from today's history.

This increment admits literal source messages only. Name-display/image macros may exist in the ancestry, but dynamic/conditional/stateful/unknown macros make the ancestry ineligible. Macro-bearing source replies are not imported. This deliberately avoids claiming historical variable resolution from current variables. Limits: 1,024 prefix messages, 4 million input characters, 16 prior saved assistant records, 128 returned observations, and a bounded optional read deadline. Missing, malformed, future-version, changed or unavailable optional data cannot block ordinary reading.

Historical observations use a separate transport/display contract. Do not put them in current-turn entity facts, current scene state, image prompts, document contents or interaction moves. Only exact category/name matches attach to current inline cards. A Known references menu also opens earlier-only subjects without scene actions. Category, field, detail, pin/hide/note preferences still apply. Remembering earlier references is optional in Reading settings.

## Tasks

1. Add certificate/history schemas and backend tests for unchanged history, edits/swipes/branch/parent/user-message changes, legacy/unsupported data, macro boundaries, source evidence, missing source records, future exclusion, budgets and deferred-read races. Implement bounded certificate creation and read-only history collection.
2. Preserve optional certificates through storage. Capture from the original planning history and seal against the resulting plan; preserve/reseal only through validated replanning. Decorate outgoing views within the optional deadline; retain primary reading on failure.
3. Add the independent history payload and selectors. Keep current facts strict; validate target/source scope and apply preferences before detail limits. Add UI sections/menu selection, prior-reply labels and a Reading toggle. Earlier-only subjects have no scene interactions or document access.
4. Browser tests: current cards plus earlier facts, earlier-only menu, filtering/toggle, sources, Back/focus, no automatic submission/generation, revision/chat changes and responsive themes. Maintain existing reader/inspector/settings tests.
5. Independent review; fix Important findings. Run appropriate full/restricted/type/build/browser checks and local host probes. Document limitations, release beta.46 and push Testing only, then verify remote. Exclude user attachments/local artifacts.

## Review focus

- Changing an intervening user message invalidates a captured descendant.
- Missing/invalid certificates never get silently regenerated on read.
- Dynamic macro ancestry cannot be treated as proven historical selection.
- Delayed optional history reads cannot publish facts for an edited source/target.
- Earlier-only cards never imply physical presence or offer scene-owned actions.

## Completion checkpoint

Tasks 1–4 and the implementation/review/verification portion of task 5 are complete. Both Important review findings were reproduced and fixed: immediate invalidation after ancestor changes, and exact original-input binding during certificate capture. Fresh local verification passed 1,594 unit/integration tests, all 33 browser suites, both TypeScript projects, production builds, manifest/static checks, and local scanner/startup probes. See `docs/review-evidence/2026-10-18-reference-retention.md` for boundaries and limitations. The final publication operation targets Testing only; user attachments and local test artifacts are excluded.
