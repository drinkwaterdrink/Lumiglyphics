# Individual picture recovery - beta.36

The user reported a Cancelled picture with a prepared request and an error blocking replacement while a batch was still registered. The screenshot does not establish the original cancellation cause. Local tests reproduced an aborted provider call retaining the batch lock and late old results overwriting a new attempt.

Image prompts now offers Retry this picture for failed/cancelled slots and Regenerate this picture for completed slots. Both rebuild only the selected existing budgeted job from its saved scene/current settings and hold a fresh preview. Prepare edited preview remains the explicit path for local prompt edits. Completed unrelated pictures are retained.

Waiting batches show their pending/review counts and Stop pending pictures. Reply recovery offers Retry unfinished pictures, retaining completed images and always requiring new approval. Stop affects image work only, not the story cursor or reader plan. Already sent provider requests may still finish; no claim of provider-side cancellation/refund is made.

Recovery validates user-scoped storage, open view, latest message, swipe, revision, source fingerprint, resolved source and intake epoch. Bounded persisted recovery IDs prevent replay. Recovery/preparation/replan admission is mutually exclusive. Existing scheduler, budgets, output checks, review gate and historical image retention remain shared.

Aborted controller locks can be released before a non-cooperative provider settles. Preparation tokens prevent old cleanup from releasing a newer operation. Conditional writes run inside the existing storage queue, and batch completion must still own the controller. Pending starts reserve a token before async config loading; stop/view close/new generation/cancel invalidate that token. This prevents delayed initialization from resurrecting stopped work.

Verification:

- RED/GREEN controller cases reproduced blocked single-picture recovery with a non-settling old provider, stale final overwrites, missing scoped batch recovery and delayed initialization restarting a stopped batch. Tests also verify retained completed images, no added job slots, stale swipe rejection, duplicate requests and approval before provider dispatch.
- Full isolated suite: 1,465 passed, zero failed, across 125 files. Separate speech transport: 18 passed, zero failed. Total: 1,483 tests.
- Recovery browser suite passed at 360x800 and 844x390: explicit selected-picture retry, double-click prevention, fresh approval, pending batch stop/retry, error recovery, scope fields and reachable mobile controls. A short-landscape body-height regression failed at 12px and passed after widening the panel and allowing horizontal footer scrolling; body remains at least 80px in that scenario. Screenshots were inspected.
- Existing image-review and reading browser regressions passed, including editable prompts, combined character limits, held templates, native focus, error dismissal, settings refreshes and reader navigation.
- Strict typecheck, production build, bundle/version verification, extracted host scanner (no blocked capabilities) and host sandbox initialization passed.
- Fresh independent review found delayed-start and admission-lock races; regressions failed before fixes, passed afterward, and follow-up found no remaining important issues.

No new dependency, permission or lockfile changes. Local Bun is 1.3.14 while the project declares >=1.4.0; browser scripts use the existing Node adapter. No live NanoGPT, paid-provider or physical Android test was performed. Actual provider failures remain visible for diagnosis; this release addresses recovery rather than asserting the original provider error was identified.

This is the A/I recovery increment. F teachable presentation rules remains the next independent feature package; broader context reconciliation and asset/document follow-ups remain on the roadmap.
