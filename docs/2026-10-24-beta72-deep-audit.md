# Lumiglyphics — deep audit (beta.72)

**Date:** 2026-10-24 · **Branch:** `Testing` @ `58f8ae4` (+ audit fixes on `arena/bcd536d4-lumiglyphics`)
**Version audited:** `package.json` → `0.2.0-beta.72` (the brief says beta.58; this checkout is 14 betas newer, so every behaviour below was checked against the actual code, not the brief).
**Method:** full read of the backend runtime, core, prompt and frontend stage/settings layers; `bun run typecheck`; `bun test --isolate` (1738 pass, 0 fail, 152 files, 25 s); targeted micro-benchmarks on Bun 1.4.4; one fix verified by reverting it and watching the new regression test fail.

Everything marked **[applied]** is on this branch with tests. Everything else is a proposal with exact anchors. Line numbers are from this checkout and move by a few lines as files change.

---

## 0. Executive summary

The architecture is sound and unusually disciplined about one hard rule: **the canon chat is never mutated, and every async result re-proves ownership before it writes.** The scene-image cache in particular (`src/backend/core/scene-image-cache.ts`) is the strongest part of the codebase: structured identity keys, episode scoping, admission epochs, single-owner claims with cancellation-safe waiters, and pointer-only entries (no pixels). Prompt anchoring (`prompt-anchors.ts`) is a genuinely good design: the writer model never gets to paraphrase identity clauses.

The remaining defects are not "the design is wrong" — they are **ownership leaks at the edges of the abort story**, plus a write path that redoes expensive work on every asset tick.

| # | Severity | Finding | Status |
|---|---|---|---|
| F-01 | **High** | An aborted asset batch keeps its `AbortController` in `assetControllers` until the provider settles. A provider that ignores `abort` makes `Replan this reply`, queued retries and card-role saves fail with "Finish the chat reply, skip waiting pictures…" indefinitely | **Fixed [applied]** |
| F-02 | **High** | The reader-presentation projection (Zod + structured clones + `JSON.stringify`) is rebuilt on *every* turn write, including each of the 3–4 asset-status writes per picture. Measured **8.0 ms → 1.5 ms** per write after the fix | **Fixed [applied]** |
| F-03 | Med | `PlanningQueue.enqueue` could return a just-cancelled operation as a dedupe hit (microtask window), silently swallowing an explicit retry | **Fixed [applied]** |
| F-04 | Med | Message reconcile (`MESSAGE_EDITED`/`SWIPED`/`SWIPE_EDITED`) released cache admission but never aborted the previous reply's asset batch, so paid generations kept running during a 3-minute replan | **Fixed [applied]** |
| F-05 | Med | Presenting a saved version-1 projection is fatal above ~512 KB: at 90 paragraphs the projection is 500 KB, at 100 it is silently dropped (measured). Long replies lose reference/document/Cast-View data with no notice | Open |
| F-06 | Med | `readReferenceHistory()` has a 750 ms deadline that cannot stop work: sequential SHA-256 per message (≤1024), 16 sequential `loadTurnRecord` Zod parses, two full-chat reads and two `JSON.stringify` comparisons of up to 4 MB continue after the reader gave up | Open |
| F-07 | Med | `cancelIncompleteJobs` writes with the unconditional `saveTurnRecord`, so it can overwrite a job update that landed after its read | Open |
| F-08 | Med | Every asset tick rewrites the whole turn record (263 KB in the benchmark) **including** `resolvedSourceText` + `panelSource` (up to 200 000 chars each), with `indent: 2` | Open |
| F-09 | Med | Typewriter reveal runs on a 20 ms `setInterval` and rewrites the hidden "rest" span on every character: O(n²) string allocation + one layout-affecting write per 20 ms per paragraph | Open |
| F-10 | Low–Med | `parseGameState` drops the provider's `revision`, so a delayed `vn-game-state-v1` broadcast can repopulate choices the player already spent | Open |
| F-11 | Low | Per-chat maps (`intakeEpochs`, `imageRetryEpochs`, `activeChatByUser`, `preparationSessions`, `assetControllers`) are never pruned, and naive deletion would be *unsafe* (it resets the counter). Needs a monotonic-generation design, not `delete` | Open |
| F-12 | Low | `revokeHit()` decrements global `hits`/`generationsAvoided` counters, so statistics drift across batches when a late asset check rejects an old hit | Open |
| F-13 | Low | Panel rule evaluation spawns one worker per rule per run (12 rules × 500 ms timeout = 6 s worst case) and `@container` CSS keeps all 12 pinned iframes live | Open |
| F-15 | Low | Reviewer drafts are keyed by `draftKey()` but the template switch tests `draftKey === requestId`, so a replacement preview's edits are replaced without the confirm dialog | Open |
| F-14 | Low | No explicit branch-change handling: ancestry is certified per `branch_id`/`parent_message_id`, but nothing aborts or replans when the host switches branches without an edit event | Open |

---

## 1. Deep architecture, state and concurrency

### 1.1 What is already correct (verified, not assumed)

The abort story is layered, and the layers do different jobs:

| Layer | Where | Invalidates |
|---|---|---|
| Intake epoch | `controller.ts:885` `bumpIntakeEpoch` | A macro resolve that started before a cancel/new generation/deletion |
| Planning queue | `core/planning-queue.ts` `cancelChat` | Queued + running planner calls per chat |
| Turn ownership | `activeTurnKeys` (`controller.ts:129`) + `compareTurnKeys` (`core/guards.ts:18`) | Late persist/send/asset results for a replaced turn |
| Asset batch | `assetControllers` (`controller.ts:113`) | Provider calls, review gates |
| Cache admission | `core/scene-image-cache.ts` `admission`/`isAdmitted` | A result from a batch whose scene/chat/swipe changed |
| Cache episode | `retainEpisodes` + `sceneEpisodeOf` | Reuse across a physical scene boundary |
| Storage serialization | `storage.ts:103` `serializedWrite` | Interleaved read-modify-write per path |

Three properties are worth calling out because they are easy to get wrong and are right here:

1. **Epochs are minted before work, checked at the write.** `startAssets` releases the admission, mints a fresh token (`controller.ts` line ~787), and `cache.store` re-checks `token.scope` + `isAdmitted(token)` (`scene-image-cache.ts:367`–`380`). A stale batch cannot poison the cache even if its provider call returns minutes later.
2. **Waiter semantics are cancellation-correct.** `claim()` only lets waiters re-claim on `aborted`/`released` (`scene-image-cache.ts:532`), and the owner's `signal` settles `aborted` immediately, so a doomed generation does not hold other paragraphs hostage. The `finally` in `images.ts` (~1450) settles `released` on every non-store exit.
3. **Every conditional write re-checks inside the queue.** `saveTurnRecordIfCurrent` (`storage.ts:1029`) evaluates `isCurrent()` *inside* `serializedWrite`, so it cannot pass a check outside the lock and write stale data inside it.

### 1.2 F-01 — an aborted batch must stop looking busy [applied]

**Before** (verbatim from `abortChatWork`; the `GENERATION_STARTED` handler had the same line):

```ts
planningQueue.cancelChat(userId, chatId, undefined, reason);
const abortedTurn = activeTurnKeys.get(key) ?? null;
activeTurnKeys.delete(key);
pendingAssetStarts.delete(key);
assetControllers.get(key)?.abort(reason);       // flips the signal, entry stays in the map
releaseSceneCacheAdmission(spindle, userId, chatId, "view_closed");
void cancelIncompleteJobs(spindle, chatId, userId, abortedTurn).catch(...);
```

`abort()` flips the signal; it does not remove the entry. The entry is only removed by that batch's own `finally` (`startAssets`, `if (assetControllers.get(key) === controller) assetControllers.delete(key)`), i.e. **after the provider call returns**. `images.ts` documents that "provider calls may ignore abort" — ComfyUI websockets and some HTTP adapters can hang for minutes.

Meanwhile four operations treat `assetControllers.has(key)` as "live work":

* `replanCurrentTurn` (`controller.ts:1504`) → throws *"Finish the chat reply, skip waiting pictures, and let current preparation finish before replanning."*
* `queueImageRetries` (`controller.ts:1593`, via `blocked()` for the retry queue)
* `prepareSingleImageUnlocked` (`controller.ts:901`) → *"Generate or skip the waiting pictures before preparing a replacement."*
* `vn_save_card_role` (`controller.ts:1678` and the re-check at `:1689`)

Only `prepareSingleImage` and `queueImageRetries` call `releaseAbortedImageBatch` first; replan does not. Result: after a view close (or a new generation) during a hung image call, **Replan this reply is dead until the provider times out**, and the error message blames the user.

**After** [applied, `controller.ts:237`]:

```ts
function abortAssetBatch(key: string, reason: string): void {
  const controller = assetControllers.get(key);
  if (!controller) return;
  controller.abort(reason);
  releaseAbortedImageBatch(key);   // deletes controller + review gate + preparation sentinel
}
```

Both `abortChatWork` and `GENERATION_STARTED` now use it. This is safe because ownership is proved by **object identity**, not presence: `ownsBatch()` and the asset `onUpdate` handler both compare `assetControllers.get(key) === controller`, so removal turns late callbacks into no-ops. The regression test (`scene-image-controller-lifecycle.test.ts`, "a provider that ignores abort…") fails on the old code with exactly the user-visible message and passes now.

**Follow-up worth doing:** replace map-identity ownership with a first-class handle so this cannot regress:

```ts
type AssetBatch = { readonly id: string; key: string; turn: TurnKey; controller: AbortController; gate: ImageReviewGate };
const batches = new Map<string, AssetBatch>();
const owns = (batch: AssetBatch) => batches.get(batch.key) === batch;
```

### 1.3 F-04 — reconcile left the old image batch paying

`reconcileMessageEvent` (`controller.ts:1948`) does:

```ts
bumpIntakeEpoch(userId, event.chatId);
releaseSceneCacheAdmission(spindle, userId, event.chatId, "message_changed");
await processAssistantMessage(...);
```

It does not touch `assetControllers` or `activeTurnKeys`. So when a user edits a reply while six pictures are generating, those six provider calls continue until the *new* plan finishes (up to the 180 s planning timeout) and `startAssets` replaces the batch. The results are correctly discarded (admission released), but the money is spent and the user's stop request is only honoured at the next turn.

**Fixed** [applied, `controller.ts:1959`–`1964`] — the smallest version of the fix, placed after the "is this still the latest reply?" check so an ancestor edit cannot kill the visible turn's batch:

```ts
const key = runtimeKey(userId, event.chatId);
bumpIntakeEpoch(userId, event.chatId);
// The replaced reply's pictures are no longer this turn's pictures: stop
// paying for them now instead of when the next plan happens to start.
activeTurnKeys.delete(key);
abortAssetBatch(key, "The reply changed while its pictures were being generated.");
releaseSceneCacheAdmission(spindle, userId, event.chatId, "message_changed");
await processAssistantMessage(spindle, event.chatId, event.message, event.message.content, userId);
```

Why deleting ownership is safe here: the asset callbacks already validate `assetControllers.get(key) === controller` **and** `compareTurnKeys(activeTurnKeys.get(key), changed.ownerTurnKey).accepted`, so a batch whose turn key was just removed can neither persist nor send. Covered by the existing reconcile/lifecycle suites (full run below).

Still open: `planningQueue` is *not* cancelled for the old plan in reconcile. `processAssistantMessage` cancels only its own operation when re-entered with a different dedupe id; if a plain reconcile lands while a previous reconcile's plan is still running, both plans run and the later `activeTurnKeys.set` wins. Adding `planningQueue.cancelChat(userId, event.chatId, undefined, "The reply changed.")` next to `bumpIntakeEpoch` would make that deterministic — deliberately left for a follow-up because it changes which replan wins on rapid double-edits.

### 1.4 F-07 — `cancelIncompleteJobs` uses the unconditional writer

`controller.ts:187`–`226` loads the chat state, loads the record, mutates jobs to `cancelled`, re-checks `unclaimed()`, then calls `saveTurnRecord` (unconditional). Between the final `unclaimed()` check and the queued write, a reopened reader can persist a `vn_asset_ready` (`markAssetReady`) or a review-gate update; the cancel write then overwrites those newer jobs with its older snapshot.

Two-layer fix:

```ts
// 1. Make the mutation atomic and re-read inside the queue.
await mutateActiveTurnRecord(spindle, chatId, chatState.activeTurnPath, userId, record => {
  if (abortedTurn && !turnKeyEquals(record.plan.key, abortedTurn)) return null;
  const jobs = record.jobs.map(job => settleCancelled(job, nowTime));
  return jobsChanged ? { ...record, jobs, imageRequests: cancelHeld(record.imageRequests) } : null;
}, () => !activeTurnKeys.has(key));
```

`mutateActiveTurnRecord` already locks chat-state → turn-path and sees the last queued record (`storage.ts:779`), which removes the read-modify-write window entirely. The second argument keeps the "a newer owner claimed the chat" rule.

### 1.5 F-03 — cancelled operations and the dedupe cache [applied]

`processAssistantMessage` dedupes by `${message.id}:${swipe_id}:${fingerprint}` (`controller.ts:1019`), and `PlanningQueue.enqueue` returned any existing operation:

```ts
const existing = this.operations.get(dedupeKey);
if (existing) return { ...existing, reused: true };
```

`operations.delete` happens in `void tail.finally(...)`, i.e. at least one microtask after `cancelChat` aborts the controller. Any caller that enqueues the same dedupe id in that window (a reconcile immediately after a generation start, a retry path that cancels and re-enters, two host events for one edit) got back a promise that was already rejecting with `AbortError`, and `processAssistantMessage` swallows abort errors (`if (isAbortError(error, ...)) return;`) — a silent no-op.

**After** [applied, `planning-queue.ts`]:

```ts
if (existing && !existing.operation.controller.signal.aborted) return { ...existing, reused: true };
```

Old cleanup cannot delete the replacement: `tail.finally` only removes the entry when `this.operations.get(dedupeKey)?.promise === promise` (already the case for the pre-existing code). New test: "a just-cancelled operation is never returned as a dedupe hit".

**Still open on the same line:** the dedupe key omits intent. `retry`/`forceRegenerate` reuse a normal in-flight operation's closure (which captured `previousScene`/`existing` for the *non-retry* path). Today `retryTurn` always cancels first, so exposure is theoretical — but the key should be intent-aware:

```ts
const dedupeId = `${message.id}:${message.swipe_id}:${fingerprint}:${options?.retry ? "retry" : options?.forceRegenerate ? "regen" : "auto"}`;
```

### 1.6 Branch changes, chat switches, view closing

* **View closing** (`closeView` → `abortChatWork`, `controller.ts:250`) is complete: intake epoch, retry queue, planning cancel, ownership drop, asset abort, cache admission, persisted cleanup. Idempotent via `views.close()` returning false the second time.
* **Chat switching** has two independent paths: `CHAT_SWITCHED` → `noteActiveChat` → `releaseSceneCacheScope(previous)` (drops entries, bumps generation + epoch), and the frontend's explicit `vn_view`/`vn_get_state`, which goes through `openView`/`closeView` and thereby `abortChatWork`. A single `vn_get_state {chatId:B}` while chat A was open therefore **drops A's cache scope even though A's view was never explicitly closed** — correct (cross-chat reuse is forbidden) but it also means opening the settings panel and returning can cost a full re-generation if the host fires state requests for other chats.
* **Branch change** has no dedicated event. `MESSAGE_SWIPED` is the closest host signal, and `referenceMessages`/`ReferenceLineage` correctly store `branch_id`/`parent_message_id` so ancestry is never inferred across branches. But if a host changes the active branch without editing or swiping the message, the reader keeps showing the old projection until `vn_refresh`: nothing compares `branch_id` on `vn_get_state`. Since the record's `source.rawFingerprint` is text-based, the same text on another branch is indistinguishable. **Recommendation:** persist the observed `branch_id`/`parent_message_id` in `source` (additive, version 3) and classify a mismatch as `changed` (replan, identity preserved) — the same policy used for unmaskable volatile macros.

### 1.7 Prompt budget and identity anchors

The budget chain is coherent: profile (`shared/image-prompt-profile.ts`) → budget plan (`prompt-budget.ts`) → writer (`prompt-rewrite.ts`) → expand → hard assertions (`prompt-length.ts`, `assertEffectivePromptBudget`, `assertRawPromptOverride`). Verified specifics:

* `maxCharacters` = live NanoGPT capability → catalogue → 3000 fallback; `z-image-turbo*` (and FLUX-2, FLUX-3 klein/pro/dev) are `positive-only`; a manual budget is capped by the provider ceiling. NovelAI is `format: "tags"`, Z-Image `description`, Anima `hybrid`.
* `rewriteBudgetPlan` reserves `min(100, 6%)` for the scene and refuses when identity + scene cannot fit, with an explicit "Fit again cannot resolve this" message. That is the right failure mode.
* Anchors: `createPromptAnchors` namespaces tokens (`[[LG_CAST_<n>_<i>]]`) by scanning the prompt for existing prefixes, replaces longest-first, and `expandPromptAnchors` requires **each token exactly once** and rejects tokens in the negative field. A model cannot leak an unexpanded marker because the returned prompt is the *expanded* one, and the post-expansion assertions run on it.

Three real gaps:

1. **Protection is skipped after successful expansion** (`prompt-rewrite.ts:126`: `if(!expanded.usedAnchors)assertPromptProtection(...)`). That is mostly fine — the anchor text is inserted verbatim — but it also skips `minimumCharacters` and the ensemble ownership check. A writer can satisfy the anchors and *additionally* write `"Mira, silver hair"` next to Theo's section; nothing catches the duplicated/misattributed clause because the ownership check never runs. Cheap fix: always run `assertPromptProtection(expanded.prompt, protection)` — with anchors expanded, it trivially passes unless the writer duplicated facts, which is exactly what you want to catch.
2. **`promptProtection` ensemble matching is O(rows × prompt)** — for each `Name:` row it runs `prompt.matchAll(new RegExp(...))` over the whole prompt (`prompt-protection.ts:28`–`41`). With 16 subjects and a 3,000-char prompt this is small, and the name regex is escaped and length-capped, so there is no ReDoS; it is just repeated scanning. Build one combined alternation once, or index `match.index` by name.
3. **`max_tokens` in the rewrite loop is ~3× too large** (`prompt-rewrite.ts:115`): `Math.max(2200, chars * 0.8)` grants 2 400 tokens for a 3 000-char ceiling (≈750 tokens of English) and 2 200 for the 1 200-char Z-Image profile. That inflates latency/cost and invites the model to over-write (which then fails the length check and burns the second attempt). Use `Math.min(4096, Math.ceil(chars / 3) + 256)` with a 1 024 floor. The retry loop also re-sends the full ~3 kB system prompt *and* `previousCandidate`; sending only the failed candidate + a one-line repair instruction on attempt 2 would halve failure cost.

### 1.8 Cross-extension RPC, Warp bridge and pinned panels

**Context sources** (`context-providers/index.ts:26`): one concurrent bounded read per enabled source, 1 500 ms cap, late results discarded, abort wired. Good. Two costs worth fixing:

* `JSON.stringify(value)?.length > 256_000` runs **before** any structural checks, so a 20 MB reply is fully serialized to decide it is too big. Check `Array.isArray(x.entities)?.length` / per-array caps first, and only then measure.
* `optionalRpcReader` reads `spindle.rpcPool.read` directly. It is typed as optional and the endpoint is built from a fixed prefix (`lumi_books.codex.${chatId}`), so injection is not possible — but `chatId` is interpolated unescaped. Scope check happens after the read (`normalizeLumiBooks` compares `input.chatId === scope.chatId`), so a hostile id cannot read another chat's data; still, `encodeURIComponent(chatId)` is free defence.

**Warp bridge** (`frontend/host/game-bridge.ts:45`): strict version, provider/chat match, 12-choice cap, text caps, odds clamped to 0–1, duplicate ids dropped, `resolve()` re-validates before `pick()`, and picks clear the provider's choices until it sends a new set. Solid. The gap is F-10: `parseGameState` ignores `d.revision`, and `GameChoice.revision` is assigned locally (`++this.revision`), so the field exists but never participates in ordering. A provider that emits a delayed snapshot (e.g., the state from before the last pick) will repopulate choices and un-busy the UI early.

```ts
// GameState gains `revision: number`; receive() keeps the highest per provider.
const incoming = typeof d.revision === "number" && Number.isSafeInteger(d.revision) ? d.revision : 0;
if (incoming > 0 && incoming <= (this.revisions.get(provider) ?? -1)) return;
this.revisions.set(provider, incoming);
```

Also drop the per-choice local `revision` (it is only consumed by `gameMoveKey`/`resolve`, where it adds a nondeterministic field to the snapshot key — see `gameMoveKey` in `shared/game-moves.ts`).

**Pinned panels** — the sanitizer (`frontend/stage/panel-document.ts:8`) is careful: tag/attribute allowlists, `on*` dropped, `input` restricted to checkbox/radio, `img` limited to `data:` (or `https:` only after the user opts in), unresolved macros rejected, CSP with `script-src 'none'` + `connect-src 'none'`, and `sandbox=""` (opaque origin, no scripts) on every frame. The remaining exposure is by design but should be stated in the UI:

* `<style>` is allowed, and **remote mode** (`style-src https:`) lets a card `@import` or reference an arbitrary https URL. That leaks nothing beyond a request (referrer is `no-referrer`), but it is a beacon; the "contacts third-party sites" label covers it.
* `<style>` can also target the injected chrome inside the frame (`body`, the injected `<style>` rules). Harmless for security, but a card can hide the "remote images" warning area? No — that checkbox lives in the dock's shadow root, outside the iframe. Fine.
* `MAX_PANEL_HTML` is enforced in three places (schema, sanitizer, rule renderer) and `panelSource` is capped at 200 000 chars in `planner.ts:2620`; `evaluatePanelRule` allows 1 MB but is only ever handed that 200 k slice. Consistent.

**Regex engine** (`panel-rules.ts`): user patterns run in a disposable worker with a 500 ms timeout and forced `g`, `$1…$99`/`$&`/`$<name>` are escaped, unknown groups throw, empty matches throw, output capped at 12 cards × 100 KB, template capped at 100 KB. Catastrophic backtracking is neutralised by `worker.terminate()`. Two residual issues (F-13):

1. `runRules` evaluates rules **sequentially**, one worker each, so 12 pathological rules = 12 × 500 ms of blocking error UX before the drawer settles. Run them concurrently and share one worker pool.
2. The worker code is built with `evaluatePanelRule.toString()` and a Blob URL; that is fine under a bundler that preserves the function body, but a class-static or minified helper referenced from inside would break. Add a smoke test that a rule with a nested capture actually renders (the repo has `test-panels-browser.ts` — check it covers `$<name>`).

---

## 2. Performance and resources

### 2.1 Turn writes are the hot path [F-02 fixed]

Every asset transition (`queued → generating → generated → browser_ready`) calls `saveBatch()` → `saveTurnRecordIfCurrent` → `recordWithImageLibrary` + `recordWithPresentation` + `setJson(indent: 2)` (`storage.ts:766`, `:1029`, `:1041`, `:526`).

Before the fix, `recordWithPresentation` **always** rebuilt the projection:

```ts
function recordWithPresentation(record: StoredTurnRecord): StoredTurnRecord {
  if (record.presentation !== undefined && (record.presentation as { version?: unknown })?.version !== 1) return record;
  return { ...record, presentation: projectTurnPresentation(record.plan) };   // recomputed on every write
}
```

`projectTurnPresentation` walks every paragraph, filters all cues/deltas/documents/references per paragraph, builds a full snapshot per paragraph with `structuredClone`, then runs `ReaderPresentationSchema.parse` and `JSON.stringify` for the 512 KB cap.

Measured on a synthetic 60-paragraph, 8-picture turn (Bun 1.4.4, warm):

| | per write | stored record |
|---|---|---|
| rebuild (before) | **8.0 ms** | 263 KB |
| reuse (after) | **1.5 ms** | 263 KB |

That is ~5.4× less CPU and ~240 KB less garbage **per asset tick**, i.e. roughly 150 ms of backend main-thread time per 8-picture reply, which matters because that thread also serves every frontend request and the host bridge.

`projectTurnPresentation` cost itself (projection only):

| paragraphs / cues | projection | presentation size |
|---|---|---|
| 30 / 4 | 4.0 ms | 77 KB |
| 60 / 8 | 6.2 ms | 242 KB |
| 90 / 12 | 12.1 ms | 500 KB |
| 100 / 14 | 12.8 ms | **dropped (>512 KB)** |
| 110 / 15 | 16.8 ms | **dropped** |

The reuse check is deliberately cheap and conservative: version 1, one snapshot per paragraph, first/last `at.paragraphIndex` correct, and `samePresentationTurn(first.at.key, plan.key)`. Full schema validation still happens where the projection is consumed (`readerPresentationFor`, `entity-projection.ts:108`), so a corrupted save degrades to "no presentation", not to a wrong one. Test: "an unchanged plan reuses its saved reader projection and a different turn rebuilds it" (`storage.test.ts`).

### 2.2 F-05 — the 512 KB presentation cliff is a product bug

At 100 paragraphs the projection is silently discarded (`JSON.stringify(result).length <= 512000`), which takes reader references, in-world documents, Cast View entity state and speaker identity with it. Long, literary replies are exactly the audience for this extension. Recommendations, cheapest first:

1. **Store only reveal boundaries.** Most paragraphs change nothing. Emit a snapshot for paragraph 0 and for every paragraph where an entity appears, a fact reveals, a delta applies or a scene starts; reconstruct intermediate snapshots in the frontend (or on read) by carrying the previous state forward. Expect 10–30× smaller payloads and removes the hard cliff.
2. **Delta-encode facts.** `entities` is re-cloned per snapshot with every fact revealed so far — the O(P × E × F) blow-up. Store `facts` once per entity plus `revealedAt`, and derive per-snapshot visibility.
3. **Cap and warn.** If the projection is dropped, say so once (`debugLogging` + a single `vn_notice`) instead of failing silently. Today `presentation === undefined` is indistinguishable from "feature not applicable".

### 2.3 F-08 — writing a 263 KB record 24 times per reply

Each turn record carries `resolvedSourceText` *and* `plan.panelSource` (up to 200 000 chars each — `planner.ts:2620`, `shared/contracts.ts:318`). With `indent: 2`, that is a formatted multi-hundred-KB JSON write through `spindle.userStorage` several times per picture. Fixes:

```ts
// storage.ts — turn records are machine state, not user-editable settings.
await spindle.userStorage.setJson(path, value, { ...(userOptions(userId) ?? {}) }); // no indent
```

* Drop `indent: 2` for `turns/**` (keep it for `config.json`; humans debug that).
* Store `panelSource` once per chat (or derive it from `resolvedSourceText`), not per turn.
* **Coalesce asset writes.** `onUpdate` currently awaits a full save per transition. Keep the in-memory `current` authoritative and flush with a trailing edge (150–250 ms) plus a forced flush on `finally`/`vn_turn`/error. Providers emit transitions in bursts; this alone removes most of the write volume without changing any observable state.

### 2.4 F-06 — the reference scanner's deadline is advisory

`reference-history.ts`: `readReferenceHistory` races `collect` against a 750 ms timer, but `collect` only checks `Date.now() >= deadline` **between stages** (`:55`–`:79`). Inside those stages:

* `frames()` (`:34`) awaits one SHA-256 (plus hex assembly) *per message*, sequentially, for up to 1024 messages and 4 MB of text.
* `matches()` re-hashes the paragraph digest for each of up to 16 records.
* 16 `loadTurnRecord` calls, each running full `TurnPlanSchema` + per-job `AssetJobSchema` parsing.
* The final freshness check reads all messages again and compares `JSON.stringify(fresh) !== JSON.stringify(snapshot)` — two serializations of up to 4 MB.

The consequence is the classic "deadline that stops waiting but not working": the UI shows "references unavailable" while the worker keeps burning CPU against the next turn's planning. Proposed refactor in §5.3.

### 2.5 F-09 — typewriter cost

`vn-stage.ts:2109` `startTypewriter`:

* `setInterval(..., this.textSpeed)` with `textSpeed` default **20 ms** ⇒ 50 ticks/s.
* Every tick writes `current.node.textContent = current.fullText.slice(0, charIdx)` and, crucially, `current.rest.textContent = current.fullText.slice(charIdx)` (`:2187`). A 1 500-char paragraph therefore allocates ~1 500 strings averaging 750 chars ≈ 1.1 M characters of garbage, plus 3 000 DOM text writes inside an already-laid-out paragraph.
* Because untyped text stays in the layout as a hidden sibling, each write invalidates the line box of that paragraph twice.

Safe improvements without changing the reading feel:

1. Move the ticker to `requestAnimationFrame` and reveal `Math.max(1, round(elapsed / textSpeed) - revealed)` characters per frame. Same pace, ≤60 writes/s, no interval drift when throttled.
2. Only update the rest span when it changes by ≥8 characters (or drop it and use a fixed-size `visibility:hidden` clone of the paragraph, updated once).
3. Pause the ticker when `document.visibilityState !== "visible"` and when the dialogue is off-screen (`IntersectionObserver`), and resume with a re-based timestamp. Background tabs currently keep ticking.

### 2.6 Cache, ancestry and image-library notes

* `SceneImageCache` is metadata-only and correctly bounded (256 entries / 1 MiB, `enforceBounds` keeps the just-stored entry even if it alone exceeds the byte cap — documented and sensible). Nits: `entryBytes` recomputes `canonicalJson(provenance)` although the caller already has the object (cheap); `revokeHit` decrements *global* counters (F-12) so a per-scope `hits` field would be more honest; `lookup()` re-inserts on every hit (required for Map-order LRU, fine).
* `resolveCacheCues` (`images.ts:530`) awaits, **per candidate in a loop**: `findLocationArt`, `findCastArt`, `verifyEntry`. For a reply with 8 extra candidates that is up to 24 sequential storage round-trips *before* the first `vn_turn`. Resolve the provider/profile once (already done) and run the three lookups per candidate with `Promise.all`, then `Promise.allSettled` across candidates (order-insensitive; jobs are keyed by `assetJobId`).
* The 16-reply / 128-observation ancestry scanner is bounded and fails closed; the only issue is the work described in §2.4.
* Image library pagination is genuinely bounded: ≤24 turn files read, ≤24 entries returned, 10 000-path cap, 1 200-char path cap, path traversal rejected (`image-library.ts:81`). Keep it — the one improvement is caching `parseRecord` per path within a request (it is called for the anchor and again inside the page loop).

### 2.7 LLM and token efficiency

* **Planner** (`planner.ts:1145`): system = instruction + reference context (≤5 200 char character + 2 600 persona + 3 600 lore) + known-character block; user = previous scene + recent chat + target response. The stable instruction is first, which is prefix-cache friendly — good. Two savings: (a) the template catalogue JSON (`:599`) is 32 templates × ~120 chars even when `dynamicImageTemplates` is off (then it is one template — keep it, but drop the "catalog" framing); when on, send `{id,name,useWhen}` only and omit `category/framing` for templates with defaults. (b) `knownCharacterBlock` repeats saved tags that also appear in the reference context; dedupe by canonical name and drop facts already present verbatim.
* **System One** (`system-one.ts:57`–`88`): per 7-paragraph batch it re-sends `state.previousScene` (environment + character + attire) and per-paragraph `criteria` maps (32 speaker names, 16 poses, 24 BGM, 24 SFX). Hoist a single `catalog` object and reference it by id, and send `previousScene` only in batch 0 with a `continuation: true` flag. Expect a 30–45% request-size cut on 3-batch replies, with no accuracy change (the model does not need 24 BGM descriptions to answer `bgm_3 = keep_current`).
* **Model output resolution** is correctly centralised (`shared/model-output-capabilities.ts`, `shared/model-output-catalogue.ts`, `shared/image-model-output.ts`) and validated locally before the provider call (`assertModelOutputParameters`, `assertCapabilityOutput`). No action beyond adding a golden-file test per provider family (Klein square, Qwen `1k/2k`, Anima `1k/1.5k + aspectRatio`, FLUX 720×1280) — the unit tests cover several already.

---

## 3. UI/UX polish and visual-storytelling ergonomics

### 3.1 Settings fatigue is structural, not cosmetic

`frontend/settings/routes.ts` defines **7 sections and 22 pages**, and `DEFAULT_CONFIG` now has **66 top-level fields** (the brief's "62" is stale) plus nested `imageParameters`, `readerPreferences`, `speech`, `trackerMappings`, `contextSources`, `imageTemplates` (32 slots). The home screen (7 category rows) is good; the problem is depth: **Images → 5 children**, **Advanced → 6 children**, **Connections → 3 children**.

Concrete, low-risk improvements:

1. **Three-tier disclosure, one tier per audience.** *Read* (enabled, mode, theme, text speed, images on/off), *Direct* (templates, shared style, presentation rules, audio), *Engineer* (parameters JSON, custom CSS, logging, storage). Today the page tree mixes all three under the same visual weight; the only hint is the `summary()` line.
2. **Show the consequence, not the field.** The home rows already carry a live summary (`panel.ts:2074`–`2084`). Extend that to *every* page header (`Appearance · Golden Hour · 1.0× text`) and to toggles that spend money: "Review before generating · 2 pictures held".
3. **Recently changed + search-first.** `SETTINGS_FIELD_PAGES` already maps every config key to a page — that is a ready-made command palette. Make the existing search the primary path: show "Images → Scene templates" with a one-line "what this changes", not just a field match.
4. **Collapse the JSON editors behind an explicit "Edit raw" button.** `parserParameters`, `imageParameters`, `customCss` are large `textarea`s today; a syntax-highlighted drawer with validation is friendlier and prevents the most common support failure (invalid JSON with a generic save error).
5. **Presets that are describable.** "Consistency & reuse" is a decision, not a setting: offer *Reuse saved pictures (recommended)* / *Always generate fresh* / *Custom* and write the underlying three toggles.

### 3.2 Mobile reviewer: mostly solved, four sharp edges left

Fair credit first, because the file has clearly been through a pass: `frontend/image-review/studio.ts` already

* keeps **one primary action per state** — `render()` (`:521`–`:553`) hides `Generate this`/`Skip`/`Reset` outside `state === "review"`, moves the primary between the footer and the `[data-prompt-actions]` details (`:321`, `:330`), and disables it with a reason in `title`;
* groups every secondary action into a `<details><summary>Prompt actions</summary>` (`:243`–`:245`) instead of a seven-button row;
* becomes a full sheet under a 600 px container (`@container (max-width:600px)`, `:27`), and a short-viewport variant keeps the footer horizontally scrollable (`:28`);
* uses 44 px minimum targets (`:22`, `:25`), `container-type: inline-size` (`:25`), `overscroll-behavior: contain` on the scrolling body (`:25`), and a 44 px close button (`:25`);
* hides the previous preview's stray state when `[data-vn-history-open]` is set (`outer-css.ts:160`).

That is why "settings fatigue" is the top complaint and the reviewer is not: it is the one surface that already discloses progressively.

The four things still worth changing:

1. **The footer stacks every remaining button full width.** `[data-studio-footer] .row{display:block}` + `[data-studio-footer] button{width:100%}` (`:31`) applies at every width, so a 490 px desktop panel shows `Generate this` and `Skip` as two full-width bars, plus `data-action-help`. Use a two-column grid above ~420 px, single column below:

   ```css
   [data-studio-footer] .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
   [data-studio-footer] .row button{width:auto}
   [data-studio-footer] .row button[data-generate],
   [data-studio-footer] .row button[data-prepare]{grid-column:1/-1}
   @container (max-width:420px){[data-studio-footer] .row{display:block}[data-studio-footer] .row button{width:100%}}
   ```

2. **A real draft-key mismatch drops the "replace my edits?" guard for replacements.** Drafts are stored under `draftKey(record)` (`:99`, `:119`, `:140`), which is `record.requestId` only when `state === "review"`, and `replacement:${jobId}:${requestId}` otherwise (`:279`). But the template switch tests `this.drafts.has(record.requestId)` (`:124`):

   ```ts
   if (this.drafts.has(record.requestId)) this.el<HTMLElement>("[data-template-confirm]").hidden = false;
   else this.rebuildTemplate();
   ```

   For a **replacement** preview with local edits the test is always false, so `Use template` silently discards the edits that the confirmation dialog exists to protect. One-line fix: `if (this.drafts.has(this.draftKey(record)))`. Any other `drafts.has(record.requestId)` call site (e.g. `:399`) deserves the same review.

3. **Closing the panel never asks about unsaved edits.** `[data-close]` and the launch toggle both call `setOpen(false)` (`:105`, `:112`, `:675`) with no dirty check; `destroy()` clears `this.drafts`. A `state !== "review"` preview with edits is exactly the case where the reader has typed something expensive. Either confirm, or persist per `draftKey` in `sessionStorage` (keyed by turn key + requestId) so a relay-out/relay-in survives.

4. **iOS keyboard vs. the editor.** The body scrolls and textareas are `resize: vertical` (`:31`), with no `scroll-padding-bottom`. On a 360×640 phone the prompt editor sits under the keyboard and the caret can end up behind the footer. Add:

   ```css
   [data-studio-body]{scroll-padding-bottom:45dvh}
   @supports (padding:max(0px)){[data-studio-footer]{padding-bottom:max(12px,env(safe-area-inset-bottom))}}
   textarea{resize:none}          /* drag-resize is unusable on touch anyway */
   ```

   The exit control (`outer-css.ts:164`, top-right, ~45 px tall at 12 px inset) and the reviewer launcher (`studio.ts:23`, `top:70px`, same right inset) already clear each other by design, so no z-index fight to fix.

### 3.3 Pinned panels on touch

`panel-dock.ts` is careful (44 px targets, `touch-action: none` on handle/resize, Escape closes, stopPropagation on the layer, `ResizeObserver` re-layout). Remaining touch issues:

* `drag()`'s `move()` calls `this.host.getBoundingClientRect()` **on every pointermove**, then `layout()` for all pins, then writes `left/top` — one forced layout per frame per dragged pin. Cache the host rect at `pointerdown`, and write transforms (`translate3d`) during the drag, committing to `x/y` on `pointerup`.
* No snap or bounds feedback: a pin dragged to the edge keeps its clamped normalized position but the handle can end up under the `Back to chat` button. Clamp against the measured safe area and the exit control.
* `layout()` runs for all pins on every resize observer tick. Debounce to one rAF.
* 12 pins = 12 iframes with full `srcdoc` documents. Add `loading="lazy"` to the frames, destroy the `srcdoc` of pins whose `collapsed` is true (currently only the body is hidden — the iframe stays mounted), and reuse one frame when `follow` updates instead of `remove()` + recreate.

### 3.4 Stage transitions and atmosphere

Concrete refinements that fit the existing `data-vn-*` contract:

**Cast View speaker highlight** (`cast-stage.ts` CSS, line 9–11): today it is an instant border/box-shadow swap. A 220 ms transition plus a subtle desaturation of the inactive portrait reads as "who is speaking" without motion sickness:

```css
[data-vn-cast-card] {
  transition: border-color .22s ease, box-shadow .22s ease, opacity .22s ease,
              filter .22s ease, transform .22s ease;
  will-change: opacity, transform;
}
[data-vn-cast-card][data-active="false"] { opacity: .82; filter: saturate(.72) brightness(.94); }
[data-vn-cast-card][data-active="true"] {
  transform: translateY(-2px) scale(1.012);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vn-accent) 55%, transparent),
              0 .55rem 1.8rem #0006;
}
@keyframes vn-cast-enter { from { opacity: 0; transform: translateY(6px) scale(.985); } }
[data-vn-cast-card] { animation: vn-cast-enter .28s cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) {
  [data-vn-cast-card] { animation: none; transition: opacity .12s linear; }
  [data-vn-cast-card][data-active="true"] { transform: none; }
}
```

**Scene crossfade** (`vn-stage.ts:1612`): the swap is a fixed `setTimeout(350)` that does not know the theme's transition duration. If a preset (or user CSS) uses a longer fade, the outgoing layer's `src` is removed while it is still visible ⇒ flash. Drive the swap from the actual transition:

```ts
private swapAfterTransition(next: () => void): void {
  let done = false;
  const finish = () => { if (done) return; done = true; clearTimeout(fallback); this.incomingImageEl.removeEventListener("transitionend", finish); next(); };
  const fallback = setTimeout(finish, 600);          // safety for reduced-motion / no transition
  this.incomingImageEl.addEventListener("transitionend", finish, { once: true });
}
```

**Audio ducking (35% Quiet)** — `audio-engine.ts:132` snaps the attenuation in one step (`player.volume = gain * bgmVolume * attenuation`), which clicks. Ramp it, and use an equal-power curve for track crossfades (`fadeVolume`, `:274` uses linear gain, which dips ~3 dB mid-crossfade):

```ts
setBgmAttenuation(target: number, rampMs = 240): void {
  const to = Number.isFinite(target) ? Math.max(0, Math.min(1, target)) : 1;
  const from = this.bgmAttenuation;
  if (rampMs <= 0) { this.bgmAttenuation = to; this.applyGain(); return; }
  const started = this.now();
  this.attenuationTimer = this.setInterval(() => {
    const p = Math.min(1, (this.now() - started) / rampMs);
    this.bgmAttenuation = from + (to - from) * (1 - Math.cos(p * Math.PI)) / 2; // smooth in/out
    this.applyGain();
    if (p >= 1) { this.clearAttenuationTimer(); this.bgmAttenuation = to; this.applyGain(); }
  }, 25);
}

// crossfade: gain = sin(p·π/2) for the incoming layer, cos for the outgoing
```

With Quiet at 0.35, use 160 ms attack when speech starts and 420 ms release when it ends — short enough not to feel like a volume knob, long enough not to pump.

**Effects discipline:** `text-effects.ts` already caps 240 letters/span and 2 400/call, and the CSS tests assert motion uses only transform/opacity/filter. Keep that. Add `contain: paint` on `[data-vn-cast]` and `[data-vn-fx-overlay]`, and gate ambient particle layers on `effectIntensity !== "off"` at *mount* time (they currently mount and are hidden), to keep GPU layers down on phones.

### 3.5 Keyboard flows

Audio/keyboard parity is close (arrows, space, Escape, auto/skip). Missing flows worth adding, in priority order:

Today the stage handles `←` (previous), `→`/`Enter`/`Space` (advance), `L` (backlog), `A` (auto), `S` (skip) and `Escape` (close backlog), and bails out whenever a modifier is held or the target is interactive (`vn-stage.ts:1696`–`1731`). Missing:

1. `R` — open/close the image-prompt reviewer; `P` — panels; `C` — cast tray. (`L` is already taken by history; keep it.) Show them in the existing tooltips.
2. `?` — shortcut sheet (`Shift+?` currently does nothing).
3. In the reviewer, `⌘/Ctrl+Enter` = approve & generate, `Esc` = close with dirty check, `⌘/Ctrl+Z` scoped to the prompt textarea undo stack (currently the stage-level handler can swallow it).
4. A focus trap in the reviewer/backlog (`inert` on the stage behind the drawer) and `Escape` precedence: drawer → reviewer → panels → exit prompt. `panel-dock` stops propagation itself, so ordering is already mostly deterministic; document it.

---

## 4. Next-gen mechanics (roadmap-aligned)

### M1 — Layered expression compositing instead of whole-portrait swaps

**Value.** Today a new expression or outfit means a new full render and a new cache identity (`SceneImageIdentity.pose` + `request.prompt` include the whole subject). With a base portrait + one expression diff per character, the stage can cross-dissolve only the face region: 20–40 ms transitions instead of a 3–8 s generation, and far fewer paid calls in ensemble scenes.

**Architectural fit.** Extend `SceneImageIdentity` (not the key format wholesale — add `layer?: { base: string; expression: string }`) so the cache key distinguishes base from layer; `scene-image-cache` already treats entries as opaque pointers, so a layered entry can point at two image ids. `cast-stage.ts` already composes per-character cards — add a second `<img>` with a `mask-image`/`clip-path` region and a `data-vn-cast-layer="expression"` attribute. The planner already selects a closed-catalogue pose id (`shared/character.ts`), so no new model output is needed.

**Trade-offs.** Provider-dependent masking quality (some models regenerate the whole frame, so layers will not align); needs a per-character anchor/alignment pass (face bbox) or the layer will be visibly offset; doubles the cache entry count per character (still metadata-only); requires a fallback path to the current whole-portrait behaviour when `subjectMode === "ensemble"`.

### M2 — Dossier/Lorebook synthesis with a salience budget

**Value.** The pending loop (LumiBooks/LumiScript → Dossier/Planner) is the biggest untapped context win: today `collectContextSources` deliberately returns **status only** to the frontend and normalised evidence (≤32 entities, visibility `unclassified`) that the planner cannot fully trust. A "dossier card" that keeps a small, evidence-anchored fact set per entity (name, role, 2–3 visible traits, reveal anchor) would improve identity consistency without dumping a lorebook into every prompt.

**Architectural fit.** Reuse `entity-projection.ts`'s reveal-scoped facts as the write side (it already produces `facts` with `source` + `revealedAt` and drops private continuity). Add a compile step that renders only facts whose `revealedAt.paragraphIndex <= current cursor` into `knownCharacterBlock` (`planner.ts`), budgeted per character (e.g. 240 chars) with a stable order. `dossiers.ts` already has a card UI and `tooltips` preferences; the planner change is additive.

**Trade-offs.** Token budget competition with recent-chat context (must be enforced, not advisory); provenance semantics (an "observed" fact from a LumiScript is not canon — keep `visibility` and never promote unclassified facts into appearance anchors); cache invalidation when a fact is corrected (`saveCorrectedAppearance` already invalidates the frozen visual state).

### M3 — Point-and-click environment inspection

**Value.** A visual novel where the background is inspectable (click the desk → in-world document; click the window → weather/continuity fact) turns the generated scene into a playable stage and gives the reader a reason to look at the art.

**Architectural fit.** Extend the planner output with a bounded, optional `interactionPoints: [{paragraphIndex, label, x, y, action}]` (normalized 0–1, max 6, max 40 chars) — same trust boundary as `storyReferences`, validated by Zod, never generated client-side. `game-bridge.ts` already has a versioned pick/request flow; an inspection is just a `pick` with `provider: "stage"`. The document reader (`document-reader.ts`) already renders in-world texts, so the action target exists.

**Trade-offs.** Prompt cost and model unreliability (coordinates must be validated/clamped and hidden until the paragraph reveals); accessibility (hotspots need keyboard focus and a list equivalent — the interaction tray is the natural home); touch targets at 360 px (a 44 px minimum at 6 points over a background can occlude art).

### M4 — Speculative next-scene prefetch with strict admission

**Value.** The largest latency win available: image generation is 3–8 s and the reader usually waits at the end of a paragraph. When the planner's `terminalContinuity` + `boundary` suggest a likely next scene, pre-generate one low-priority candidate.

**Architectural fit.** Reuse everything: mint an admission for a *speculative* epoch, `priority: "background"`, store under the current episode. When the real turn arrives, `cache.lookup` finds it and the batch reports `generationsAvoided` (stats already exist). The `bypassJobIds`/`independentRequests` flags already handle "review required" cases — speculative work must skip review gating and must never approve itself.

**Trade-offs.** Paid tokens for images the user may never see; cache pollution and eviction pressure under the 256-entry cap; requires a hard budget (say ≤1 speculative image per reply, only when `imageConcurrency > 1`) and a kill switch in settings. Also needs an explicit "speculative" provenance so the library/history does not present it as this reply's art.

### M5 — Deterministic "director's cut" replays

**Value.** Readers re-read. Today a replan or retry produces a different visual because prompts and pose selection are model-dependent. Storing a compact *direction recipe* (`sceneId`, template id, pose id, framing, seed, environment diff) would let the reader replay the same "cut" deterministically — and gives authors a way to pin a look.

**Architectural fit.** `settingsSnapshot` and `attempts` already exist on the record; add a `direction` block on the accepted plan, and make `prepareAssetJobs` prefer it when present. `imageParameters.seed` is already user-controlled and cache identity includes parameters, so determinism composes with the scene cache.

**Trade-offs.** Provider determinism is not guaranteed (ComfyUI with the same seed can still differ across model versions/GPU); recipes must be invalidated when a template/style changes (`promptFingerprint` already does that); adds a schema version.

---

## 5. Before/after refactors

### 5.1 `recordWithPresentation` — stop rebuilding an unchanged projection [applied]

**Before** (verbatim, pre-fix):

```ts
function recordWithPresentation(record:StoredTurnRecord):StoredTurnRecord {
  if(record.presentation!==undefined && (record.presentation as {version?:unknown})?.version!==1)return record;
  return {...record,presentation:projectTurnPresentation(record.plan)};
}
```

**After** (this branch, `storage.ts:1058`–`1082`):

```ts
/**
 * A saved version-1 projection is trusted only when it was derived from exactly
 * this turn key. The full schema validation happens where it is read
 * (`readerPresentationFor`), so this check stays cheap: it runs on EVERY turn
 * write, including each per-job asset update.
 */
function presentationBelongsToPlan(presentation: unknown, plan: TurnPlan): boolean {
  if (!presentation || typeof presentation !== "object") return false;
  const candidate = presentation as { version?: unknown; snapshots?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.snapshots)) return false;
  if (candidate.snapshots.length !== plan.paragraphs.length) return false;
  const first = candidate.snapshots[0] as { at?: { key?: TurnKey; paragraphIndex?: unknown } } | undefined;
  const last = candidate.snapshots[candidate.snapshots.length - 1] as { at?: { key?: TurnKey; paragraphIndex?: unknown } } | undefined;
  if (!first?.at?.key || first.at.paragraphIndex !== 0) return false;
  if (last?.at?.paragraphIndex !== plan.paragraphs.length - 1) return false;
  return samePresentationTurn(first.at.key, plan.key);
}

function recordWithPresentation(record: StoredTurnRecord): StoredTurnRecord {
  const saved = record.presentation;
  if (saved !== undefined && (saved as { version?: unknown })?.version !== 1) return record;
  if (saved !== undefined && presentationBelongsToPlan(saved, record.plan)) return record;
  return { ...record, presentation: projectTurnPresentation(record.plan) };
}
```

**Next step (not applied): coalesce writes in `startAssets`.** This is the larger win and is local to one function:

```ts
// controller.ts, inside startAssets — replace the awaited saveBatch with a
// trailing-edge writer. `current` stays authoritative in memory.
let pendingFlush: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> = Promise.resolve();
const flush = (): Promise<void> => {
  flushing = flushing.then(async () => {
    pendingFlush = null;
    if (!ownsBatch()) return;
    await saveBatch();
  });
  return flushing;
};
const scheduleFlush = (): void => {
  if (pendingFlush !== null) return;
  pendingFlush = setTimeout(() => { void flush(); }, 180);
};
// onUpdate / gate: scheduleFlush() instead of await saveBatch()
// finally:            if (pendingFlush) clearTimeout(pendingFlush); await flush();
//                     (so vn_turn / errors still observe the final state)
```

### 5.2 Abort ownership — make "aborted" and "live" the same thing [applied]

**Before:**

```ts
assetControllers.get(key)?.abort(reason);
// entry remains; replan/prepare/queue checks assetControllers.has(key) === true
```

**After** (`controller.ts:237`), built on the helper the single-picture path already used, so there is exactly one place that removes a batch:

```ts
function abortAssetBatch(key: string, reason: string): void {
  const controller = assetControllers.get(key);
  if (!controller) return;
  controller.abort(reason);
  releaseAbortedImageBatch(key);   // deletes controller, gate and preparation sentinel
}
```

The full rationale is in §1.2. Test coverage: `scene-image-controller-lifecycle.test.ts` — "a provider that ignores abort cannot leave the chat looking busy after the reader closes". Verified red on the old code (message *"Finish the chat reply, skip waiting pictures…"*) and green after.

### 5.3 Reference history — a deadline that actually stops work

**Before** (`reference-history.ts:34` `frames`, `:55` `collect`): the 750 ms race in `readReferenceHistory` (`:82`) resolves the caller, but `collect` keeps running. `frames()` hashes every message sequentially with no deadline; `collect` checks `Date.now() >= deadline` only between stages; the freshness check serialises the whole message list twice (`JSON.stringify(fresh) !== JSON.stringify(snapshot)`, up to 4 MB each).

**After** — three surgical changes, same certificate format (so stored lineages stay valid), each stage abortable:

```ts
type Frame = { message: Message; prefixDigest: string; messageCount: number; replyNumber: number };

/** The prefix chain is byte-identical to the old one; only the deadline is new.
 *  Returning null means "the reader gave up" and is treated exactly like the
 *  existing `Date.now() >= deadline` early returns. */
async function frames(
  messages: readonly Message[],
  chatId: string,
  deadline = Number.POSITIVE_INFINITY
): Promise<Frame[] | null> {
  let prefix = await hash(JSON.stringify([1, chatId]));
  let replyNumber = 0;
  const result: Frame[] = [];
  for (const [index, message] of messages.entries()) {
    if (Date.now() >= deadline) return null;
    prefix = await hash(JSON.stringify([prefix, message]));
    if (!message.is_user && message.role !== "system") replyNumber++;
    result.push({ message, prefixDigest: prefix, messageCount: index + 1, replyNumber });
  }
  return result;
}

async function collect(
  api: SpindleAPI,
  target: StoredTurnRecord,
  userId: string | undefined,
  deadline: number
): Promise<ReferenceHistory | undefined> {
  if (!ReferenceLineageSchema.safeParse(target.referenceLineage).success) return undefined;
  const key = target.plan.key;
  const snapshot = referenceMessages(await api.chat.getMessages(key.chatId), key.assistantMessageId);
  if (!snapshot) return undefined;

  const lineage = await frames(snapshot, key.chatId, deadline);
  if (!lineage) return undefined;
  const last = lineage[lineage.length - 1]!;
  if (!await matches(target, last)) return undefined;

  const eligible = lineage.slice(0, -1).filter(frame => !frame.message.is_user && frame.message.role !== "system");
  const selected = eligible.slice(-MAX_RECORDS);
  const entries: HistoricalReference[] = [];
  let truncated = eligible.length > MAX_RECORDS;

  // Load AND verify concurrently. Every branch re-tests the deadline, so a slow
  // host cannot keep this function working after the caller stopped waiting.
  const verified = await Promise.allSettled(selected.map(async frame => {
    if (Date.now() >= deadline) return undefined;
    const record = await loadTurnRecord(api, turnPath(key.chatId, frame.message.id, frame.message.swipe_id), userId);
    if (!record || Date.now() >= deadline) return undefined;
    if (record.plan.key.chatId !== key.chatId || needsResolution(frame.message.content)) return undefined;
    return await matches(record, frame) ? record : undefined;
  }));

  const seen = new Set<string>();
  for (let index = selected.length - 1; index >= 0; index--) {
    const outcome = verified[index]!;
    if (outcome.status !== "fulfilled" || !outcome.value) continue;
    const record = outcome.value;
    const frame = selected[index]!;
    for (const reference of normalizeStoryReferences(record.plan.storyReferences, record.plan.paragraphs.map(p => ({ text: stripTextEffectTags(p.text) }))).reverse()) {
      if (!retainableReferenceField(reference.field) || !stripTextEffectTags(frame.message.content).includes(reference.evidence)) continue;
      const identity = JSON.stringify([reference.kind, reference.name, reference.field]);
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (entries.length >= 128) { truncated = true; continue; }
      entries.push({ sourceKey: record.plan.key, replyNumber: frame.replyNumber, reference });
    }
  }

  // Freshness: compare the SAME prefix chain instead of two 4 MB strings. The
  // chain already hashes every normalised message field, so equal chains mean
  // equal snapshots, and it can be interrupted between messages.
  const fresh = referenceMessages(await api.chat.getMessages(key.chatId), key.assistantMessageId);
  if (!fresh || Date.now() >= deadline) return undefined;
  const freshLineage = await frames(fresh, key.chatId, deadline);
  if (!freshLineage || freshLineage[freshLineage.length - 1]!.prefixDigest !== last.prefixDigest) return undefined;

  const parsed = ReferenceHistorySchema.safeParse({
    version: 1, target: key, targetReplyNumber: last.replyNumber, entries, truncated,
  });
  return parsed.success && JSON.stringify(parsed.data).length <= 256000 ? parsed.data : undefined;
}
```

Callers change in one place each: `captureReferenceLineage` (`:44`) now does `const frame = (await frames(snapshot, plan.key.chatId))?.at(-1); if (!frame) return undefined;` — the default deadline keeps it unbounded, exactly as today. `readReferenceHistory` already races the promise; it needs no change and now the losing branch stops within one message hash.

Measured expectation: on a 200-reply chat (≈1.2 MB) the current scan costs ~1.2 MB of sequential hashing plus 2 × 1.2 MB `JSON.stringify`; the new one costs 2 chains with no large allocations and returns `undefined` at the deadline instead of continuing to run. The remaining per-record cost is `matches()` re-hashing `record.plan.paragraphs` — memoise it with a module-level `WeakMap<StoredTurnRecord, string>` (records are immutable snapshots) if profiling shows it matters.

### 5.4 Cast View CSS — a speaker transition that reads as direction [proposal]

See §3.4 for the full block. It is a drop-in replacement for lines 9–11 of the CSS template in `frontend/stage/cast-stage.ts`, keeps the existing attribute contract (`data-active`, `data-vn-cast-card`), and honours `prefers-reduced-motion` without removing information (the inactive card is only dimmed/desaturated, never hidden).

Pinned-panel drag optimisation (also §3.3), drop-in for `panel-dock.ts:218`:

```ts
private drag(handle: HTMLButtonElement, pin: Pin, resizing: boolean): void {
  const apply = (dx: number, dy: number, resize: boolean) => {
    if (resize) {
      pin.width = Math.max(180, Math.min(this.hostRect.width - 24, pin.width + dx));
      pin.height = Math.max(140, Math.min(this.hostRect.height - 80, pin.height + dy));
    } else {
      pin.x = clampPanel(pin.x + dx / Math.max(1, this.hostRect.width - Math.min(pin.width, this.hostRect.width - 24) - 24), 1);
      pin.y = clampPanel(pin.y + dy / Math.max(1, this.hostRect.height - (pin.collapsed ? 46 : Math.min(pin.height, this.hostRect.height - 80)) - 80), 1);
    }
  };
  handle.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    this.hostRect = this.host.getBoundingClientRect();   // one layout read per gesture
    let x = event.clientX, y = event.clientY;
    handle.onpointermove = (e) => { apply(e.clientX - x, e.clientY - y, resizing); x = e.clientX; y = e.clientY; this.layoutSoon(); };
    const done = () => { handle.onpointermove = null; this.layout(); this.save(); };
    handle.onpointerup = done; handle.onpointercancel = done; handle.onlostpointercapture = done;
  };
  // layoutSoon(): coalesce to one rAF; layout() keeps its current clamping maths.
}
```

---

## 6. Verification, risks and a prioritized backlog

**Verified here**

* `bun run typecheck` — clean.
* `bun test --isolate` — **1739 pass / 0 fail** across 152 files (5 new regression tests: 1 planning queue, 1 lifecycle, 1 storage, 1 reference deadline, plus the retained existing 14 reference tests).
* Fix correctness proven by reverting: the lifecycle test fails on the pre-fix controller with the exact user-visible error, and the storage test fails against the always-rebuild implementation.
* Benchmarks reproduced with a throwaway script (not committed): projection reuse 8.0 → 1.5 ms/write; projection 4–17 ms and the 512 KB cliff at ~100 paragraphs.

**Not verified (needs a real host/device)**

* Physical Android/iOS behaviour of the reviewer, pinned-panel dragging and the adjustable sheet (the repo's own status page says the same).
* Provider-specific abort behaviour (ComfyUI websocket, NovelAI, NanoGPT) — F-01 is designed exactly because these are unreliable.
* Browser TTS/`speechSynthesis` coexistence; the extension's role here is unchanged.

**Backlog, ranked**

| Priority | Item | Effort | Risk if ignored |
|---|---|---|---|
| P0 | F-01 abort ownership **[done]** | S | Replan/retry dead after a hung provider |
| P0 | F-02 projection reuse **[done]** | S | 5× write CPU + GC churn per reply |
| P1 | F-15 reviewer draft-key fix | XS | Template switch silently discards replacement edits |
| P0 | F-05 presentation cliff (boundary snapshots) | M | Long replies silently lose references/documents |
| P1 | F-04 reconcile aborts the old batch **[done]** | S | Paid generations keep running after an edit |
| P1 | F-08 coalesced turn writes + no indent | S–M | Hundreds of KB written 20+ times per reply |
| P1 | F-07 atomic cancel via `mutateActiveTurnRecord` | S | Lost job updates after a close/reopen race |
| P1 | F-06 deadline-aware reference scan **[done]** | M | CPU burn after the UI gave up |
| P2 | F-09 typewriter rAF + visibility pause | S | Jank/long tails on mobile, O(n²) garbage |
| P2 | F-10 game bridge revision ordering | XS | Stale choices after a pick |
| P2 | Reviewer: one primary + dirty guard + footer grouping | S | Accidental draft loss, tall sheet on phones |
| P2 | Settings: three-tier disclosure + consequence summaries | M | "Settings fatigue" stays the top complaint |
| P3 | F-11 epoch-map pruning (generation-based) | M | Slow memory growth over long sessions |
| P3 | F-13 panel worker pool + lazy iframes | S | 12 iframes/6 s worst case on low-end devices |
| P3 | F-12 per-scope cache statistics | XS | Misleading diagnostics |
| P3 | Branch-change detection in `source` (v3) | M | Silent staleness on hosts that switch branches |

**Design note for whoever takes F-11:** do not `delete` epoch entries. `intakeEpochs.get(key) ?? 0` means a deleted entry reads as epoch 0, and any operation capture from before the deletion compares equal again — a stale result would be accepted. Prune by replacing the map with a bounded LRU of `{ epoch, lastTouched }` where a pruned key reads as `Number.MAX_SAFE_INTEGER - 1` (or route everything through a monotonic counter that is never reused), so "unknown" can never look "current".
