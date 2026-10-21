# beta.55 — queued per-picture image retry and regeneration

Branch: Testing. Base: beta.54 (`14582d0`).

## Scope and behavior

The reader can now queue explicit retries for failed/cancelled generated-image slots and replacements for completed images without waiting between selections. Retry unfinished selects the unfinished slots together. Completed images are preserved while replacements run; other slots are not reset. Existing edited-preview and rewrite paths remain separately available with approval.

Quick retry uses the stored scene and current connection/settings, bypasses prompt review only for the selected work, and retains final prompt-budget/model-output validation. It does not apply unsubmitted local prompt edits. An already held selected request is approved as prepared instead of scheduling a duplicate image. Selected initial work that has not reached review receives a one-use batch approval; other initial work retains its configured review behavior.

The queue runs one replacement at a time after existing asset work finishes. Each selection gets one attempt; a failure continues to the next item. Duplicate active/queued job IDs are coalesced, request IDs are bounded/idempotent, and a queue is capped at 24 items. There is no autonomous retry loop, timer polling or persisted paid-work resumption.

Clear queued retries removes waiting replacements and unused selected-batch approvals. It does not claim cancellation of an already sent provider request. Reader close, chat switch, new generation and explicit recovery/cancel invalidate queue ownership. Late callbacks cannot re-create the queue or overwrite another turn. A backend restart drops the in-memory queue.

Queue commands require complete chat/message/fingerprint/swipe/revision identity. Cache-only slots and stale replies are rejected. Worker execution re-checks current source, view ownership and settings through the existing single-picture path. Prior images use the existing labelled fallback behavior when a replacement fails.

## UI

- Retry picture and Regenerate picture are immediate queue actions in the footer.
- Retry unfinished and queue status appear near the picture selector.
- Queued and active retries have distinct selector states, and duplicate clicks are disabled locally.
- Clear queued retries is shown when items are waiting.
- Prompt actions retain Edit before retry / replacement-preview tools; explicit recovery previews are labelled Prepare unfinished previews.
- Error notices remain dismissible. The queue does not clear or advance story text.

## Verification

- Queue tests cover serial execution, duplicate selection/request IDs, a failed item continuing, existing-batch blocking/wake, bounds, clear and cancellation snapshots.
- Real controller fixture tests cover multiple cancelled pictures with review globally on, completed-image regeneration, retained previous artwork, a provider failure, close during provider work, selected existing held/queued requests, stale revision rejection, simultaneous enqueue clicks, no duplicate generation on request replay, and clearing while enqueue admission waits on configuration storage.
- Strict command validation covers missing source version, empty/oversized selection and unexpected fields.
- Full suite: 1,655 pass, 0 fail; 7,996 assertions across 141 files.
- Full TypeScript check, production build, manifest verification and backend blocked-pattern scanner passed.
- Chromium queue checks passed at 320, 390 and 1280 pixels: multiple selections while running, bulk retry, completed regeneration, clear, source isolation and no review requests from quick actions.
- Existing inspector and recovery browser flows passed after updating intentional labels/layout expectations. Model-budget/prompt-repair browser checks also passed as release regression checks.
- Browser plugin unavailable; used the repository's Playwright fixtures under Node. Local runtime/browser execution required the same sandbox escape as prior fixture runs.
- Mobile queue screenshot inspected at `.cache/image-retry-queue/390.png`.

No paid provider calls, physical Android checks or actual host installation/update were performed. In-memory provider fixtures demonstrate lifecycle and scope behavior; they do not certify external-provider cancellation, billing or success.
