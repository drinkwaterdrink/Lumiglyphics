# beta.71 — scenario opening recovery and scene wording review

Testing only; main remains beta.61.

## Reported failure

The screenshot shows `No usable appearance was resolved for "Made in Abyss RPG"`. The user confirmed Aleister Crowley is the active player persona with an appearance description. A new-chat fixture reproduces a scenario wrapper selected for a single-person picture while the active persona is present and described. The ordinary timeline excludes personas from NPC subject resolution; an unresolved wrapper can therefore reach the image guard with an empty appearance.

## Recovery changes

- Added picture-local persona recovery when the planner explicitly lists the active persona among visible participants, the paragraph literally names them, and the current single-person focus has no resolved appearance. In Auto, the unresolved focus must match the attached card title, the card must lack a usable appearance, and the title must not appear as an entity in the paragraph. Explicit Character mode, known subjects, unknown real subjects, absent personas and unusable persona descriptions remain untouched.
- Uses only the current persona description. Does not seed that persona into the durable NPC registry, borrow a previous character's body/wardrobe, or change dialogue attribution. The selected picture disables scenario-card portrait references and records its appearance source.
- Preserves the attached card name before scenario-role normalization so explicit scenario repair still works when character context is disabled.
- For an explicitly marked scenario with successful setting planning but no drawable person, an enabled environment template can show the established setting without people. No such fallback is added after planner failure or when environment templates are disabled. The per-picture template reason explains this change.
- Missing-appearance stage notices direct the user to subject correction or Scenario-role/replan controls instead of offering another unchanged-plan retry. Opening Image prompts expands those recovery controls locally.

Existing failed saved replies need to be replanned after updating. Changing card role alone does not replace saved prompts or images. The exact user's card, persona description, planner output and live host are unavailable; the reproduced condition is verified locally, not confirmed as the only possible cause of this report.

## Continued roadmap work

The writer receives up to two short complete action/composition fields only when their literal wording remains in the current editable prompt. Absent, partially edited, very short or long fields are skipped rather than restored or clipped. The existing local rewrite comparison snapshots those fields and flags when their exact wording changes, including live edits. This is an attention/review aid, not a semantic fidelity validator: concise paraphrases remain allowed and exact matches do not prove meaning or prevent negation. Existing combined budgets and protected identity checks remain authoritative.

## Verification

- Reproduced first-message title/persona selection failure before the fix, then exercised the actual planner-to-image scheduler with a local provider stub. Both Auto and explicit Scenario reach one mocked image generation using persona appearance; the scenario title is absent from the image prompt.
- Guard tests cover explicit Character mode, known NPCs, unknown subjects, absent/undescribed personas, names that only partially match, disabled environment templates, offline planner failure and context-disabled scenario repair.
- Chromium inspector checks cover exact scene wording review, retained baselines, restoration, mobile bounds and local missing-subject recovery navigation. Model-budget, workflow and host lifecycle suites also passed.
- TypeScript, production builds, manifest/bundle validation and local backend static-pattern scanners passed. Local scanner success is not live host install-time acceptance.
- Full unit suite: 1716 passed across 151 files, plus 18 separate speech transport tests with the existing keepalive; 1734 tests total, zero failures, 8436 assertions. Local Bun is 1.3.14; the declared >=1.4 runtime was not separately exercised.
- No live text/image provider calls or physical Android checks.
