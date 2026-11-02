# Cast and Appearance DNA audit

Date: 2026-11-01. Source: `codex/audited-improvements` beta.111, commit `6240bba01d97f4c5b9ca773365f29d954add0d24`. Scope: Folio UI, host lifecycle/IPC, harvesting, schemas, persistence and image-prompt integration. The supplied phone image is evidence of the user's symptom, not instructions embedded in a document.

## Result

The reported failure is supported by reproducible defects. The mechanic currently mixes global regex extraction, incomplete backend harvesting and disconnected prompt helpers. Adding an LLM alone would leave identity, persistence, lifecycle and UI defects intact.

The user selected **evidence plus generated suggestions, reviewed before saving**. Recommended architecture: a character-scoped evidence collector -> validated LLM proposal -> field-by-field review -> revision-checked explicit save -> one effective appearance used by preview and actual generation. This is the priority packet before original Task 3. This audit and its proposed design do not claim that repair has shipped.

## Findings

| ID | Severity | Finding and evidence | Required repair |
|---|---|---|---|
| C01 | High | `character-folio.ts` single/all-field auto-fill calls `extractDNAPartsFromText(latestTurnText)` without character ownership. Synthetic story `Darby is a boy with black hair. Nadine steps forward. She is in her mid forties.` produces `{gender:'boy', age:'forties'}`. It combines different characters' traits. | Eliminate global extraction as an authoritative write; resolve evidence to a stable character before proposing fields. |
| C02 | High | Backend `autofill` in `controller.ts` only harvests, optionally parses caller-supplied JSON and saves. `buildCharacterDNAAutoFillPrompt` is not invoked in production. No text generation happens. | Wire a real bounded text-model request and validate its response locally; report absent configuration/failure truthfully. |
| C03 | High | Harvester accepts optional card description/tags but controller supplies only userId. It never calls `loadVisualContext`, card/scenario or world-book APIs, nor the optional LumiBooks Codex collector. A mock with source spies confirmed no card/lore reads. | Gather enabled scenario/card, relevant lore, tracker and supported codex sources under the current user/chat. Report disabled, unavailable, unmatched and truncated sources distinctly. |
| C04 | High | Narrative selection requires the literal name and one of a narrow visual-word list in the same sentence. Pronoun-only follow-up, age/gender-only lines, aliases and many separate structured fact fields are lost. The synthetic backend harvest above returns no build traits. Names are interpolated unescaped into a regex; punctuation/non-Latin names can fail or mis-match, with exceptions swallowed. | Safe literal identity/alias matching, bounded surrounding passages and entity attribution; preserve labeled structured fields without forcing them through prose regex. |
| C05 | High | UI uses `dna.id` (`nadine-pruitt`) as a key, persistence uses lowercase name (`nadine pruitt`), and `setLibrary` shallow-merges both. Discovering then loading one saved character reproduces **two** roster entries. Selection also switches between dictionary keys and IDs. | Stable per-chat IDs, canonical lookup and migration; deduplicate exact ID/known aliases, explicit review for uncertain matches. |
| C06 | High | Folio has no chat context/reset. Host chat-switch/fork handlers clear other tools but not folio; DNA response handler does not check chatId/requestId. Old profiles/late responses can appear in another chat and subsequently be saved under its current chat ID. | Chat-scoped state and epoch/request ownership; reject late replies, clear active UI on switch, retain drafts only in their owning chat. |
| C07 | High | Persistence loads then rewrites the whole library without serialization. `Promise.all` saving Nadine and Darby against cloned storage retains only Darby. | Per-user/chat mutation queue and revision checks; re-read latest library inside the queue. |
| C08 | High | APERTURE generic `.folio-hero-card img` makes the small avatar absolute/full-card. Forced height plus flex shrink/overflow clips actions; pseudo-element overlays content. Real Chromium synthetic fixture at 366x760: hero only 30px tall, action buttons outside its clipped bounds, all three fail hit testing. At 1440x960 actions also fail hit testing. Screenshot resembles the supplied image. | Scope decorative portrait rules to a dedicated media element, separate reliable action toolbar from clipped artwork, set flex sizing intentionally, ensure 44px controls and mobile scroll access. |
| C09 | High | Preview claims `Live Injected ... Active in Flux & Recraft`, but ordinary production `compileTemplateCue` call sites do not pass its optional DNA-library argument. Existing hooks in `visual-brief.ts` cannot make the library appear by themselves. | Trace/save -> generation integration; one effective appearance contract for previews, cache identity, queued jobs, review/retry, provider payload and ensemble members. Replace unconditional UI claim until proven. |
| C10 | Medium | `vn_character_dna` has no dedicated runtime request schema; it falls through the permissive `vn_` guard. Parser extracts selected strings but does not validate bounds itself; malformed patches fail later at merge/save. No per-field scope in auto-fill requests. | Strict discriminated requests and bounded patch/proposal schema, immutable target ID, requested field paths, explicit error responses. |
| C11 | Medium | Global extraction accepts boy/girl/male/female as gender values, has no subject-scoped she/he resolution and can strip `mid` from `mid forties`. UI male handling recognizes only exact man/male. | Separate age from gender; normalize generated gender vocabulary to woman/man where supported, preserve nonbinary/custom identities and explicit age evidence. Do not silently change a character's age to match a gender label. |
| C12 | Medium | Single-field fallback requests whole-profile auto-fill; all-field action persists regex changes before backend completion. Lock does not stop single-field extraction; optional contextText path merges with overrideLocked=true. | Proposal-only operations, explicit field masks, automated writes respect locks/manual values; late results cannot replace newer edits. |
| C13 | Medium | No Folio delete action or protocol action. Deleting only a dictionary row would allow next `syncFromTurn` to recreate it. Existing separate Cast Art settings' Remove entry does not manage this DNA library. | Delete from this chat with undo and discovery suppression; restore explicitly. Keep chat text, lorebooks, tracker and gallery media intact. Offer merge for duplicate identities. |
| C14 | Medium | One coarse sourceSummary cannot tell which field came from which source, whether sources conflict or a detail was invented. Sources are silently caught; empty success is indistinguishable from unavailable context. | Per-field source references and evidence/inferred/generated classification, conflicts and source availability report. Avoid invented numeric confidence. |
| C15 | Medium | Inputs use labels without `for`/nested input association. Copy reports success without awaiting clipboard result. No scoped pending/error/cancel/retry state for auto-fill. | Associate labels, name icon buttons, preserve focus/IME/drafts, truthful copy feedback, accessible asynchronous status. |
| C16 | Medium | Whole-library schema failure returns an empty library. Repeated message reads can observe different turns. Folio uses final presentation/all turn text independently of reader cursor. | Validate/migrate entries independently, preserve malformed raw records without a destructive overwrite, collect one immutable context snapshot; honor reader reveal boundaries and label author reference separately. |

## Source coverage today

| Requested source | Current DNA auto-fill coverage |
|---|---|
| Scenario / attached card | Optional arguments exist but are not populated by current requests. |
| SimTracker | Best-effort enabled scan; exact-name match; only identity and attire collected. |
| Story reference codex | Partial reader-position dossier support; exact-name match; limited fact names. |
| Lorebooks | No direct DNA harvesting path. Existing general visual-context loader supports activated world-book entries. |
| LumiBooks Codex | Existing optional context provider is separate; not consumed by DNA harvesting. Its unclassified reference facts must not become observed story facts. |
| Chat narrative | Narrow recent named visual sentences; frontend instead scans entire latest turn without attribution. |
| Missing details | No current production LLM completion, despite helper names/comments. |

## Options and chosen direction

1. Evidence only: lowest model cost, but necessarily leaves many fields empty. Useful as an explicit scan mode and fallback, not sufficient for the selected request.
2. **Hybrid evidence + LLM proposals (selected):** collect labeled evidence, ask the configured story-reader text connection for target-scoped structured fields, validate and review before saving. This supports both attribution and plausible visual completion. It costs one text request per explicit autofill action; a provider request already sent may still be billed if cancelled. No image request is needed.
3. LLM directly rewrites/saves a whole profile: simplest surface but vulnerable to silent changes, guesses being treated as canon and stale edits. Not recommended.

An LLM is useful for pronouns, aliases, prose and contextual completion, but is not an authority for overriding user edits or resolving ambiguous identities. Deterministic validation, stable IDs, field ownership and source labels remain necessary.

## Proposed interaction contract

- Keep **Auto-Fill All**, **Lock DNA**, **Copy Prompt**, and **More -> Delete character / Merge duplicate** visible/reachable outside portrait artwork. Display the selected name beside actions. Use portrait area for artwork only.
- Auto-Fill All prepares a complete proposal; per-field sparkle prepares only that field. Existing manual/locked values are protected by default. User can deliberately select individual replacements in review.
- Review shows current -> suggested value and `Evidence`, `Inferred`, `Generated`, `Conflict`, or `Unknown`. Source excerpts are inspectable. Apply selected fields is one save; cancel/failure preserves the draft.
- Example: Nadine is the target; Darby's `boy` is excluded. Nadine's attached `she` supports woman absent conflicting explicit identity; `mid forties` remains her age. Unsupported appearance details may be generated coherently and marked Generated. Do not infer intimate traits merely from pronouns or a name.
- Keep age evidence separate from gender labels; preserve explicit nonbinary/custom identities and transformations. Stable physical DNA and current-scene attire are separate, so a temporary outfit does not rewrite a signature outfit.
- Delete removes this chat's character profile and suppresses immediate rediscovery; undo/restoring re-enables it. No story/source or gallery deletion. Duplicate merge previews retained values, aliases and conflicts; never merge people solely because they share a surname.
- Context-source status is visible. `Disabled` or `Unavailable` never means `searched and found nothing`. Respect source settings, user/chat ownership, reader reveal boundaries and provider noInject/visibility restrictions. Do not write generated details back to external codex/lore/tracker.
- Use configured story-reader text connection with cancellation, timeout, bounded JSON and at most one format-repair attempt. No model request merely on opening or browsing Cast. No image request during auto-fill.

## Evidence and limits

- Local synthetic repro scripts in ignored `.cache/implementation/`: `audit-cast.ts`, `audit-cast-race.ts`, `audit-cast-browser.ts`, `audit-cast-fixture.ts`.
- Browser results: 366x760 and 1440x960; `.cache/implementation/cast-audit-browser.log` and `cast-audit-366.png` / `cast-audit-1440.png`. Tested real CSS/DOM, not the user's actual phone or source chat.
- Static Lumiverse audit ran: two generic permission-justification notes (`chat_mutation`, `app_manipulation`). These existing permissions are not demonstrated causes of DNA failure; removing them blindly would break other capabilities.
- Beta.111 release verification: 1,992 unit tests pass, zero fail, 10,631 assertions; typecheck/build/verifier/status and focused compact-presentation browser fixture pass. These do not prove current Cast correctness; new reproductions demonstrate its coverage gaps.
- No live model/image requests, no user chat data modified, no physical-device or in-host acceptance. The exact original Nadine passage is unavailable; the cross-character failure mechanism and duplicate/UI bugs were reproduced independently.

## Repair follow-through

The user approved implementation after this audit. The Cast/DNA repair is implemented and verified for the user-authorized beta.112 release checkpoint. See `docs/implementation/2026-11-01-cast-dna-repair.md` for the resulting workflow, review fixes, tests and live/device limits. This audit preserves the original failure evidence.
