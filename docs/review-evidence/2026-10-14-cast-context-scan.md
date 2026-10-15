# Cast context scan — beta.28

User requested context/tracker autofill and use in image prompts while D2 quiet references was being examined. This increment implements that explicit steering; no D2 product code was changed.

Pictures → Cast setup and portraits → Fill from context adds Scan context, a character/source picker, a read-only source preview, Fill empty fields and explicit Replace appearance. Both fill actions affect drafts only. Existing aliases/outfits and appearance edits are preserved by Fill empty fields. Different-character candidates cannot overwrite the current character name; Add character starts a new draft. Save cast setup remains required to persist the result. Saved identity/default outfit guidance enters the existing chat appearance overlay used for future image prompts, including supporting characters; scene-specific clothing and explicit per-picture correction retain their established precedence. Already prepared prompts are unchanged.

Sources are existing saved/learned chat appearances, saved setups, and recognized inline SimTracker payloads when includeSimTrackerContext is enabled (including configured field mappings). This does not perform new unstructured-prose extraction, access private companion storage or invoke unverified companion RPCs. Scenario-card names are not inferred as NPCs. Current source candidates come first, followed by other learned appearances and saved setups. Suggestions are capped at32; omission is disclosed. Scanner checks chat access, originating user, message signature and cast epoch and performs no writes or model/image calls.

Verification:

- Final isolated suite:1,432 pass,0 fail,6,675 assertions across123 files. Speech transport:18 pass,0 fail,45 assertions with established keepalive preload. Total1,450 tests.
- Six dedicated scan cases cover tracker appearance/aliases/separate outfit, disabled source,user access,known-story fallback,empty descriptions,context freshness,the real controller response route with zero paid calls,and candidate capacity. Saved setup-to-template identity resolution for a supporting character is checked locally.
- Chromium mobile cast setup checks passed at390×844: source preview,fill preservation,explicit draft replacement,no implicit setup save,width containment,and chat-switch cleanup,alongside registration/outfit/artwork/Voice regression checks. Existing settings browser suite passed. Screenshot inspected.
- Independent review found saved setups could crowd out new characters at32 suggestions. Failing/passing regression verifies new tracker entries are prioritized and truncation disclosed. No other actionable findings reported.
- Strict typecheck,production build,bundle/version verification,backend blocked-pattern scan and whitespace check passed. After final text-input styling adjustment the cast browser and production build were rerun.

No live Lumiverse installation,physical Android or paid provider call was run. Installed Bun1.3.14 is older than declared>=1.4.0; browser checks use the established Node adapter. D2 quiet references,G actions,H documents and other pending roadmap work remain unchanged.
