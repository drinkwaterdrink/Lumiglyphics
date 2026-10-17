# Template preferences - beta.40 (F1)

This is the first complete slice of roadmap work package F. It supports template preferences; entity/object conditions and background, effect, motion and music policies remain F2. Package F is not marked complete.

## Behavior

- Empty rule documents are off by default. Up to 12 rules each for This chat and All my chats. Supported conditions are attributed dialogue, a confirmed location change at the first existing cue in that scene revision, or the template the planner would otherwise choose.
- Only enabled templates can be preferred. A character template requires usable identity guidance. Ineligible targets are skipped, allowing a valid lower-priority preference to apply. Rules examine the original planner template and do not chain. Chat scope wins over account scope; priority and save order break ties within a scope.
- A pure fresh-plan transformation changes template snapshots and diagnostic metadata only. It creates no cues, model calls or image slots and leaves appearance, continuity, budgets, review mode and accessibility settings unchanged. Manual picture-template or subject corrections take priority and clear obsolete rule provenance. Current held requests and saved plans are not rewritten when rules are managed.
- The native Pictures panel includes Template preferences, searchable through settings. Examples open editable drafts. Exact condition, target, scope and priority are previewed before Save. Rules can be edited, turned on/off and removed with an inline confirmation.
- Image prompts includes Remember a template preference beside template controls, using the same editor. Saving it does not change the current image request or generate an image. New requests preserve applied/skipped reasons in Prompt sources.
- User-scoped versioned JSON documents use the existing serialized storage queue and expected revisions to reject stale writers. Unsupported documents are preserved. Optional account/chat reads time out independently after 1.5 seconds so one unavailable scope cannot hide the other or hold planning open indefinitely.
- UI responses are request/chat scoped; expired and stale replies are ignored. Unknown save status requires Refresh before another mutation, preserves the draft and does not auto-retry. Refresh preserves dirty fields; removing a template elsewhere retains it as unavailable rather than substituting another target. Config changes invalidate preview.
- Controls inherit native settings/reader tokens, wrap at phone widths, expose 44px touch targets and use native inputs. No dependencies or permissions were added.

## Verification

- Shared/backend RED/GREEN covered typed schemas, limits, precedence, disabled targets, non-chaining, scoped persistence, revision conflicts, concurrent writes, unsupported data, chat access, dialogue/location matching, identity safety, manual overrides and immutable cue slots.
- Actual planner integration verifies unchanged generation call counts, slot counts, identity and terminal continuity. The stalled-scope regression reproduced a review finding, then passed with independent deadlines.
- Mobile browser workflow covers examples, preview/save, scoped CRUD, draft preservation, removed-target hydration, unavailable validation, stale chat responses, unknown/late save recovery, touch focus, light/dark tokens and no overflow at 320/390/768 pixels. Screenshot inspected locally.
- The real image-review browser workflow verifies remembered preference payloads, explicit save, frozen provenance and unchanged current image requests. Full settings and cast setup browser suites passed.
- Fresh read-only review identified independent-scope timeout and removed-target draft hydration issues. Both were fixed and regression tested; follow-up found no remaining actionable issue. The reviewer did not claim an independent browser run.

Final checks: 1,490 isolated tests across 127 files plus 18 separate speech transport tests (1,508 total) passed. Cold sandbox contract/storage/controller checks: 87 passed. Strict typecheck, production build, bundle/version/dependency verification, extracted capability scanner (no blocked capabilities) and restricted backend startup passed.

No live Lumiverse host session, physical Android keyboard or paid image-provider generation was used for verification. The branch is Testing; main is unchanged.
