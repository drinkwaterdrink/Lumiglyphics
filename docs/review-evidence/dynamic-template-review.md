# Dynamic image templates: final review and decisions

Independent read-only review compared b2721e7..3c04786 to the approved spec/plan. No Critical findings. Seven Important findings and one selection-action usability finding were fixed in one regression pass. Review did not modify the checkout. Tests first reproduced each effect before the fix; full suite afterward: 1,243 pass, 0 fail.

## Findings resolved

1. Host reference-default merge: empty overrides now replace inherited references. The host contract is documented at https://docs.lumiverse.chat/backend-api/image-generation/. A regression simulates the merged parameters instead of only checking omission.
2. Empty negatives: both top-level and parameter text explicitly retain the empty template negative.
3. Captured references: cache candidates resolve the same compatible portrait ID as generation, including reuse-only/System One candidates.
4. Connection changes: new template cache keys include the resolved profile's identity, model, defaults and revision. Legacy cache behavior is preserved.
5. Template continuity: Edit and regenerate sends the selected template explicitly, so a manually rebuilt environment stays an environment.
6. Saved appearance: compiler and captured-reference fingerprints share the same durable-identity resolver. A changed appearance acquires a fresh portrait.
7. Tracker aliases: only unique aliases enter planner evidence; ambiguous names are excluded using the matching helper.
8. Selector recovery: selecting an enabled replacement immediately updates action availability. Graded Important usability by the implementer because an otherwise valid selection was inaccessible.

Backend regressions are in scene-image-reference-capture.test.ts and simtracker.test.ts. Browser regressions are in test-image-review-browser.ts and test-image-templates-browser.ts. Safe reference metadata continues to omit image bytes and credentials.

## Execution decisions and tradeoffs

- PowerShell-native bookkeeping replaces Unix helper scripts. Equivalent task tracking is retained; risk is bookkeeping drift, not product behavior.
- First 19 legacy presets import alongside five built-ins, keeping the 24-template bound. All originals remain available; additional originals require later deliberate import.
- New description templates use natural-language subject labels rather than inherited 1girl/solo. Legacy direct compilation remains available for old cues; models may still need user-tailored tag wording.
- Attire parsing is shared between compiler and brief to prevent cyclic imports and contradictory wardrobe. No new appearance system was added.
- Unsupported legacy macro notation is literalized only in imported templates, with safe length limits. Original preset text is preserved; users may need to replace unsupported macros with the documented placeholders.
- Reviewer paper is opaque for contrast while retaining host accent/field tokens. It may differ visually from a translucent host theme.

No deferred minor findings remain. The review set aside paid-provider visual quality/unsupported parameters (requires live host testing), contradictory user-authored template prose (editable creative control), broader legacy cache redesign (outside new-template contract), and publication documentation (completed by the primary implementer). These are explicit limits, not claims of validation.

## Suggested host test

Update Lumiglyphics from main. In Pictures, keep review on and choose one picture initially. Enable dynamic selection; try entering a new room, an object clue, and a character reaction. Inspect template/reason/source metadata and edit the positive prompt. Change portrait to environment, replace its draft, then generate. Edit and regenerate that completed environment and confirm it remains an environment. Try clearing the shared anime prefix, switching image models, and a supported tracker snapshot. Restore the desired budget (default 4) afterward.
