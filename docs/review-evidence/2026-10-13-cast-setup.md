# Cast setup foundation — beta.25

Pictures → Cast setup and portraits supports adding a real NPC before generating a portrait, explicit aliases, base appearance, seven named outfits and a default outfit. Artwork is verified against the originating user's native gallery, bound to the saved look at assignment, and used only to decorate an existing matching portrait cue in Cast view. Appearance edits retain the pointer but require reassignment. Generated variants and image-model references retain separate behavior. Configure voice opens an unsaved draft in the existing Voice settings without listing profiles or synthesizing speech.

Manual setup overlays effective identity reads without overwriting learned identity. Removal restores learned guidance. Reader and external illustration planning capture the cast epoch before identity reads and guard durable writes after asynchronous work. Management refreshes are read-only and cannot bootstrap unplanned replies. Scenario/world-card titles are not automatically cast members.

Validation:

- Final isolated suite: 1,421 passed, 0 failed, 6,638 assertions across 122 files. Separate speech transport: 18 passed, 0 failed, 45 assertions with the established keepalive preload. Total: 1,439 tests.
- Strict TypeScript check, production build, manifest/version/bundle verification, backend blocked-pattern scan and whitespace checks passed.
- Chromium mobile cast setup flow passed at 390×844: empty-library registration, canonical name protection, aliases, outfits/default outfit, gallery assignment, no fabricated generated variant, width containment, unsaved gallery edits retained, Voice draft shortcut with zero profile/synthesis/config-save requests, and chat-switch cleanup.
- Existing settings, cast rendering and speech browser checks passed.
- Independent review identified durable manual-identity leakage, setup removal during asynchronous planning (including external Warp illustrations), and gallery selection discarding unsaved edits. All were fixed and regression checked. No paid generation was used.

Limitations: no live Lumiverse installation or physical Android keyboard check was performed. Installed Bun 1.3.14 is older than the declared >=1.4.0; browser checks used the existing Node adapter. Expression artwork, independent background/portrait allocation and standalone portrait placement without a planned matching cue remain E2/E3 follow-ups. D2 quiet references, G actions and H documents remain pending.
