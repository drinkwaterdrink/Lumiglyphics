# Cast workspace clarity - beta.39

The user requested clearer per-character context scanning, appearance management/removal and visibility into which description supplies image prompts. This updates the existing cast workspace rather than adding a separate settings system or identity engine.

## Behavior

- Opening Cast automatically loads saved records once per chat, without generation. Select a saved character at the top. The saved appearance preview shows the actual `setupAppearance` baseline (appearance plus default outfit guidance) used by the existing appearance loader. Draft edits and scanned suggestions remain separate until Save cast setup.
- Saved setup still overrides learned appearance when the character is pictured. Scene attire and explicit per-picture corrections retain their existing priority. The final prepared wording remains in Image prompts; already prepared prompts are not silently updated.
- Scan this character passes the selected ID through the existing scoped cast action. The backend validates that record and filters normalized names/aliases before the 32-candidate limit. The bounded tracker history and per-block extraction limits remain unchanged.
- Scan all characters retains discovery. Results have separate character and source selectors; Open this character selects an existing match or creates an unsaved draft. Empty/name-only evidence cannot erase a saved appearance or bypass save validation. Scans use no LLM or image request and do not write canon.
- Editing, aliases and outfits are grouped separately from display-only artwork/voice and historical generated portrait metadata. Gallery artwork is not an image-model reference. Primary save, source visibility, native theme tokens, full-width fields, 44px touch controls and mobile wrapping support the normal workflow.
- Switching, adding, refreshing and artwork/portrait mutations protect dirty drafts. Removal uses an inline scoped confirmation, discloses discarded edits and retains chat/tracker facts and gallery images. Removing a cast pointer does not prevent later rediscovery from story evidence.
- New scans/source changes invalidate older pending confirmations. Results and filled drafts are scrolled into view without forcing keyboard focus. A chat change clears local selections, suggestions, drafts and confirmations; existing request/user/chat guards remain intact.

## Verification

- Scoped backend scan regression covers multiple bounded snapshots, alias recognition beyond the unfiltered suggestion limit, stale missing IDs and no storage writes. Existing source, cast setup, compiler priority and persistence regressions remain enabled.
- Observed mobile RED/GREEN for missing active-guidance/draft controls, normalized alias grouping, artwork-clear draft loss and stale pending navigation.
- Browser workflow covers registration, saved versus unsaved appearance, per-character scan payload, source review without autosave, second-character import, dirty switches, outfit deletion, isolated character removal, gallery artwork, voice shortcut, chat reset and no global Apply leakage.
- Responsive widths 360, 390, 844 and 1280; touch targets at least 44px; light-theme text/field/accent tokens checked. Dark and light screenshots inspected locally.
- Existing cast reader, full settings and image-review browser checks pass. The broader settings test was updated for the intentional Refresh cast label, collapsed portrait tools and explicit removal confirmation.
- Fresh read-only review identified alias normalization mismatch and artwork clearing discarding unsaved drafts. Both were reproduced and fixed; follow-up reported no remaining important issue. No independent live browser rerun was claimed by the reviewer.

Final verification: 1,478 isolated tests passed across 125 files, plus 18 separate speech transport tests (1,496 total). Cold sandbox contract/storage/controller validation: 87 passed. Cast setup, cast reader, full settings and image-review browser checks passed. Strict typecheck, production build, bundle/version/dependency verifier, extracted host scanner (no blocked capabilities) and sandbox startup passed. The final auto-load/stale-confirmation additions received a static reviewer spot check with no blocker; rendered behavior was verified by the implementer.

Local Bun is 1.3.14 while the project declares >=1.4.0. Browser checks use the existing Node adapter. No root install or lockfile rewrite was performed.

No storage schema, dependency, permission or provider contract change. No chat resets, hidden generation calls or required companion extension. Scanning reads recognized structured story/tooltip/tracker evidence; it does not extract arbitrary unstructured prose or access another extension's private storage. Physical Android and live provider-generated pixel consistency were not tested. Existing model/reference behavior still determines the resulting art.
