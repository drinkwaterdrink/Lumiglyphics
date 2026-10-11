# Image review implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline. Steps use checkbox syntax for tracking.

**Goal:** Inspect, edit and approve per-picture requests while keeping existing settings and automatic generation.

**Architecture:** Add a bounded request gate at the existing image pipeline's final provider boundary. Persist safe snapshots with turn records and expose them through the existing scoped protocol to an overlay inspector.

**Tech Stack:** TypeScript, Bun 1.4.0, Zod, existing DOM frontend and Spindle APIs.

**Spec:** docs/superpowers/specs/2026-10-10-image-review-design.md

## Global constraints

- Preserve existing settings; review defaults on and is toggleable.
- No paid image call before manual approval, and no silent approval of unseen drafts.
- Retain source attribution; no publishing in this task.
- No raw reference bytes/credentials in UI or persisted request history.
- Preparation is bounded by scheduler concurrency; complete provider integration requires live host verification.

## Review focus

- Duplicate clicks cannot spend twice: gate claim test in task 1.
- Profile drift cannot silently modify approved text: integration test in task 2.
- Cancelled approvals cannot generate: abort test in task 1 and pipeline test in task 2.
- Host updates cannot erase unsaved text: browser check in task 3.
- Replacement failure retains usable prior art: controller test in task 2.

## Task 1: Request validation and approval gate

Files: src/shared/image-review.ts, src/backend/runtime/image-review.ts and image-review.test.ts.

Interfaces: ImageRequestRecord is the safe frontend/persisted view. ImageReviewGate.prepare(jobId, paragraphIndex, request, metadata, review, signal) returns the frozen request; decide(requestId, action, edits) claims a pending request exactly once.

- [x] Write tests for hold, exact local edits, duplicate approval, skip, abort, automatic recording, binary/credential redaction and invalid JSON keys.
- [x] Run tests and observe missing behavior.
- [x] Implement gate, validator and safe snapshot serializer; run tests green.

## Task 2: Integrate the provider boundary and turn lifecycle

Files: src/backend/runtime/images.ts, controller.ts, storage.ts, src/protocol.ts, src/config.ts and targeted tests.

Interfaces: SceneCacheOptions.beforeGenerate(job, request, signal) returns the approved request. TurnView.imageRequests exposes persisted records. vn_image_review submits a scoped request ID/action; vn_prepare_image starts a targeted replacement.

- [x] Test no render before gate approval and exact edited request; test profile revision rejection and replacement preservation.
- [x] Run red tests; wire final request hook, profile/default resolution, cache bypass for edited requests, safe storage and scoped protocol handlers.
- [x] Add review configuration normalization and restore waiting-record inspection; run targeted tests green.

## Task 3: Extend the existing settings and add inspector

Files: src/frontend/image-review/studio.ts, src/frontend/host/controller.ts, src/frontend/settings/panel.ts, browser fixture and test script.

Interfaces: ImageStudio.setTurn(turn), setReview(enabled), destroy(); sends only validated scoped actions through host controller.

- [x] Add browser assertions for toggle, prompt inspection, local edits, generate/skip, missing history, draft preservation and replacement controls.
- [x] Observe red browser check; implement responsive inspector using existing overlay placement, review toggle in Pictures settings, and host routing/cleanup.
- [x] Run browser/settings regression checks green.

## Task 4: Package and verify

Files: spindle.json, package.json, README.md, UPSTREAM.md, docs/IMPLEMENTATION_STATUS.md.

- [x] Set unique Lumiglyphics identity and provenance; preserve pinned dependencies.
- [x] Run Bun unit suite, full typecheck, build, backend capability scan and browser checks. Record exact outcomes and any live verification limitation.
- [x] Request whole-change review and fix material findings; provide local install/build instructions without publishing.

Completed locally. See `docs/IMPLEMENTATION_STATUS.md` for verification and the explicit batch-toggle timing decision.
