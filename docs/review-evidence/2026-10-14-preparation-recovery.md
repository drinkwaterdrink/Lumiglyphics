# Scene preparation recovery — beta.32

The user reported an apparently stuck Preparing the scene screen, then confirmed it eventually loaded. Their selected reader model is DeepSeek 4.1 Flash. No provider timing or server log was supplied, so the cause of that individual delay is not established. The release does not claim to accelerate the provider.

Investigation confirmed an independent recovery defect: a running PlanningQueue task remained in the chat's serial queue after cancellation until its external promise settled. A never-settling reader request therefore prevented a fresh attempt from starting. Preparation also had no overall deadline.

The queue now races running work against cancellation and a three-minute deadline. A timeout aborts local ownership, releases the queue, and raises a visible retryable preparation error. Ordinary cancellation remains quiet. No automatic replacement provider request is sent on timeout. This bounds queued preparation, not pre-queue state loading or macro intake.

The operation signal is passed into normal planning and manual replanning. A late failed provider request cannot enter the planner's normal second-attempt path. Persistence and frontend turn delivery recheck ownership, including after audio-view resolution. External requests already submitted may still finish or be billed remotely; this change does not claim transport cancellation.

Verification:

- Captured failing regressions for cancellation and deadline handling before the fix. Both originally returned still blocked.
- Queue tests cover cancellation, deadline errors, retry with the same source id, ignored late results, per-chat serialization, independent chats and deduplication.
- A real controller regression stalls the mocked reader, observes vn_error, explicitly refreshes successfully, then rejects the old provider call. It confirms no stale stored/published turn, no image calls and no additional planner attempt from the late failure.
- Full isolated suite: 1,445 pass, 0 fail, 6,711 assertions across 123 files. Separate speech transport: 18 pass, 0 fail, 45 assertions. Total 1,463 tests.
- Strict typecheck, production build, manifest/bundle verification and whitespace checks passed. The current extracted Lumiverse scanner reports no blocked categories. The built backend also initializes under the public host sandbox initializer with mocked APIs.
- No live DeepSeek generation, paid image generation or physical Android test was performed. The tests use local Bun 1.3.14; the project declares >=1.4.0. Dependencies and lockfile are unchanged.

Host log location was checked in the public SpindlePanel.tsx and worker-host.ts sources: no extension log viewer was found in the panel; backend log messages are handled by the server. Enable Lumiglyphics Verbose debug logging before reproduction and inspect the Lumiverse server terminal/container logs for `[Spindle:lumiglyphics]`. Verbose logs include story content.
