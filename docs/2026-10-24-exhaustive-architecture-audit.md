# Lumiglyphics — Exhaustive Architecture, Performance, UX & Roadmap Audit

**Date:** 2026-10-24
**Branch:** `arena/2d85d8e9-lumiglyphics` (base `7f17c01`)
**Scope:** `src/backend`, `src/frontend`, `src/shared`, `src/config.ts` (~43.5k LOC TS excluding tests)
**Method:** static analysis only. This sandbox has no Bun and no `node_modules`, so `bun run verify` / `bun test` were not executed; every finding cites exact files, functions and line numbers verifiable with `grep`/the editor. Re-run `bun run verify` before merging any refactor below.

Severity scale: **P0** data loss / security / wrong content shown · **P1** correctness, race, money wasted · **P2** perf/availability degradation · **P3** polish/ergonomics.

---

## Executive summary

Lumiglyphics is, unusually for a browser-extension codebase, defensively engineered: turn-key acceptance guards (`guards.ts`), admission epochs (`scene-image-cache.ts`), per-chat serialized planning (`planning-queue.ts`), serialized storage writes (`storage.ts:74`), sandboxed panels with CSP (`panel-document.ts`), and identity anchors with strict fact validation (`prompt-anchors.ts`, `prompt-protection.ts`). The projection-only discipline (canonical chat messages are never mutated) is consistently honored.

The residual risk concentrates in four places:

1. **One lifecycle path (view close) does not bump the intake epoch**, so a macro-resolution in flight when the reader closes can still run a paid planner job afterward (P1, `controller.ts:249`).
2. **System One has no request deadline and fails open on missing answers** — a hung endpoint stalls planning, and a dropped answer invents scene cuts (P1/P2, `system-one.ts:103,130`).
3. **Two regex surfaces have asymmetric protection**: panel rules run in a killed worker (`panel-rules.ts:34`), but display rules run on the main thread with no ReDoS guard (`display-rules.ts:22`).
4. **Repeated whole-graph work**: SHA-256 prefix chains rebuilt several times per turn (`reference-history.ts`), full config re-normalization ~16 call sites per turn, O(n²) JSON repair (`planner.ts:906`), and per-cursor DOM/iframe rebuilds in the panel dock.

Findings table:

| # | Sev | Area | Finding |
|---|-----|------|---------|
| F1 | P1 | Lifecycle | View-close skips `bumpIntakeEpoch`; post-close planner run possible |
| F2 | P1 | System One | `spindle.cors` has no timeout/abort; planning can hang forever |
| F3 | P1 | System One | Missing `noul` answers default to `sceneChange/needsDescription = true` (fail-open) |
| F4 | P2 | Scene cache | 2× 32-bit FNV key has no full-identity disambiguator; collision serves wrong image |
| F5 | P2 | Regex | Display regex rules run on main thread, no ReDoS bound |
| F6 | P2 | Prompt safety | Protection fact matching is punctuation-fragile (`" fact "` boundaries) |
| F7 | P2 | Perf | `reference-history` recomputes hash chains 2–4× per turn under a 750 ms deadline |
| F8 | P2 | Perf | `repairJsonString` is O(n²) via `slice().trimStart()` per quote |
| F9 | P2 | Perf | `loadConfig`/`normalizeConfig` (incl. 32-template migration) on every call, ~16 sites/turn |
| F10 | P2 | Frontend | PanelDock rebuilds candidate DOM per cursor step and recreates iframes on follow updates |
| F11 | P2 | Scene cache | Global singleton budget across users; one oversized entry thrashes cache to size 1 |
| F12 | P3 | Audio | 35% "Quiet" ducking is an instant volume step, not a ramp |
| F13 | P3 | Frontend | ImageLibrary `JSON.stringify` identity checks on every streamed turn update |
| F14 | P3 | Audio | Stalled SFX `<audio>` elements can live forever in `activeSfx` |
| F15 | P3 | UX | Panel resize handle is 24 px; 44 px touch target not met; studio focus trap missing |
| F16 | P3 | Lifecycle | Read path (`sendState`) persists review-cancellation writes |

---

# Vector 1 — Deep Architecture, State & Concurrency

## 1.1 Admission epochs & lifecycle cancellation

### F1 (P1): View-close is the one invalidation path that misses the intake epoch

The intake epoch exists precisely to defeat stale macro resolutions (`controller.ts:114-128`):

```ts
const intakeEpochs = new Map<string, number>();
function bumpIntakeEpoch(userId, chatId): void {
  imageRetryEpochs.set(key, (imageRetryEpochs.get(key) ?? 0) + 1);
  imageRetryQueues.get(key)?.queue.cancel(); imageRetryQueues.delete(key);
  intakeEpochs.set(key, (intakeEpochs.get(key) ?? 0) + 1);
}
```

Every invalidation source bumps it: `GENERATION_STARTED` (`controller.ts`, event registration), `reconcileMessageEvent` (swipe/edit), `MESSAGE_DELETED` (`clearDeletedTurn`), and `vn_cancel`. **`abortChatWork` (`controller.ts:249-262`) does not.** It cancels retry queues, the planning queue, asset batches and scene-cache admission — but not the intake epoch.

The race:

1. `processAssistantMessage` awaits `resolveMessageIntake(...)` (`controller.ts:974`). Nothing is enqueued yet.
2. The user closes the reader (or switches chats) → `closeView` → `abortChatWork` → `planningQueue.cancelChat(...)` has **no operation to cancel** because enqueue happens at `controller.ts:1020` after the await.
3. The host resolves the macros; the guard at `controller.ts:975` (`intakeEpochs.get(intakeKey) !== intakeEpoch`) passes because the epoch never moved.
4. A fresh `PlanningQueue.enqueue` creates a new operation. Its task checks only `operation.controller.signal.aborted`; nothing aborts it, and **nothing re-checks `views.isOpen` before `planTurn`** (the only view gate inside the task is the `vn_planning` notification and, much later, `startAssets`, which *does* bail at `controller.ts:787-791`).

Consequence: a full paid text-model planning call runs for a chat nobody is looking at, a turn record is persisted, and a `vn_turn` is sent into a closed view. Reopening later usually reuses the record harmlessly, but the spend and the violation of the "automatic work only for open views" contract (`allowAutomaticWork`, `controller.ts:302-312`) are real.

**Fix** (drop-in in §5.2): call `bumpIntakeEpoch` inside `abortChatWork`; optionally add a `views.isOpen` re-check immediately before `planTurn` as defense in depth.

### What is already correct (do not "fix" these in review)

- **Planning queue dedupe vs. cancellation.** `PlanningQueue.enqueue` (`planning-queue.ts:60-67`) refuses to hand back an already-aborted operation, so an explicit retry is never silently dropped; per-chat tail chaining (`previous.then(execute, execute)`, line 99) serializes narrative planning while chats stay independent, and the 180 s `PreparationTimeoutError` (`planning-queue.ts:52, 91-94`) is deliberately *not* classified as an abort (`isAbortError`, line 44-47).
- **Scene-cache admission.** `SceneImageCache.bumpEpoch`/`isAdmitted` (`scene-image-cache.ts:265-280`) and the stale-admission rejection in `store` (lines 318-321) ensure late provider results cannot populate the active cache; `invalidateScope` (lines 466-477) additionally rolls the generation so a deleted-and-replanned first scene never shares an `initial:*` episode.
- **Owner/waiter claims.** `SceneImageCache.claim` (lines 487-545) settles waiters on owner abort immediately via the owner's signal, supports waiter-side abort with listener cleanup, and the re-claim loop in `generateAssets` (`images.ts`, the `for (;;)` lookup/claim block) correctly handles `aborted`/`released` outcomes and fails once on `failed` (no retry cascade).
- **Turn-key guards.** `compareTurnKeys` (`guards.ts:11-25`) plus `saveTurnRecordIfCurrent`/`mutateActiveTurnRecord` (`storage.ts:779, 1029`) and the `ownsBatch()` closure in `startAssets` (`controller.ts:803`) make stale callbacks unable to persist or send. `cancelIncompleteJobs` (`controller.ts:190-231`) re-checks `activeTurnKeys` before every write and only ever touches the aborted turn's own record.
- **Review gate.** `ImageReviewGate.reprepare`/`regenerate` (`image-review.ts:178-237`) synchronously delete the pending item before the first await, so duplicate approvals/rerolls cannot interleave; failures restore the original preview.
- **Replan/recovery idempotency.** Request-id memory arrays (`replanRequestIds`, `correctionRequestIds`, `imageRecoveryRequestIds`, sliced to 32 in `storage.loadTurnRecord`) plus epoch captures make double-submission a no-op.

### F16 (P3): a read endpoint performs persisted writes

`sendState` (`controller.ts:708`) rewrites any `review`-state image requests to `cancelled`, re-stamps queued jobs and **saves the record** when no asset controller exists. The intent (restart recovery) is sound and the controller-presence check means a live review batch is unaffected, but background/older-frontend state reconciles are read-only callers and can still land a write. Restrict this branch to `options.viewOpen === true` requests.

### Retry/replan/queue interaction notes

- `abortAssetBatch` (`controller.ts:238-245`) deliberately leaves an aborted controller in the map because providers may ignore abort for minutes; the tradeoff is documented at the function. One rough edge: `retryTurn` aborts without deleting the entry, and the new `startAssets` only replaces it later — a user action landing in that window gets "finish the waiting pictures" errors from `replanCurrentTurn`/`prepareSingleImage`. `releaseAbortedImageBatch` exists but is not on the retry path. Consider calling it in `retryTurn` after the abort.
- `ImageRetryQueue` (`image-retry-queue.ts`, 22 lines total) is correctly timer-free and bounded (24 jobs / 128 requests), and `wake()` chains via `finally` so a thrown runner cannot wedge the queue. The epoch pairing in `queueImageRetries` (`controller.ts:1593-1601`) correctly invalidates queues across generation changes.
- `AssetScheduler` is per-batch (constructed in `generateAssets`, `images.ts`), so its `promptOwners`/`scheduled` maps cannot leak across turns. Note `cancel()` on a *running* job only aborts; the status flips when `run()` settles (`asset-scheduler.ts:147-170`) — in-memory state can transiently read `generating` for an aborted job, but persistence is covered by `cancelIncompleteJobs`, so this is cosmetic.

## 1.2 Prompt budget & identity-anchor integrity

### The budget stack (verified intact)

- Hard ceiling enforcement is centralized in `assertPromptLengths` (`prompt-length.ts:27-32`): combined positive+negative vs. profile `maxCharacters`, and a hard error for any negative text on `positive-only` profiles.
- Default 3,000 (`IMAGE_PROMPT_MAX_CHARS`, `prompt-length.ts:2`); manual override clamped to 256–50,000 (`config.ts` `imagePromptBudget`, and `image-prompt-profile.ts:62`).
- Z-Image Turbo's 1,200-char positive-only ceiling is catalogue-driven (`image-prompt-capabilities.ts:19-21`), surfaced through `resolveImagePromptProfile` (`image-prompt-profile.ts:64-74`), including the `positive-only` switch for Z-Image, FLUX 2/3 and NanoGPT routes (`image-prompt-profile.ts:71`).
- NovelAI V3/V4/V4.5 formatting is version-gated in `novelai-prompt.ts:6-11` (`structured`/`numeric`/`negativeNumeric`), with an explicit throw when negative numeric emphasis hits an unsupported model (`novelai-prompt.ts:15-17`) instead of silently degrading.
- Raw connection overrides get a second, independent ceiling/identity check in `assertRawPromptOverride` (`prompt-rewrite.ts:54-70`).

### Anchor integrity (strong)

`createPromptAnchors`/`expandPromptAnchors` (`prompt-anchors.ts`) are correct against the failure modes asked about:

- Un expanded markers cannot reach the provider: the stripped-marker residue check `prompt.replace(marker, "").includes("[[LG_CAST_")` throws "Malformed identity anchor" (`prompt-anchors.ts:21`).
- Anchors are forbidden in the negative prompt (`prompt-anchors.ts:19`), unknown tokens throw (line 24), every supplied anchor must appear **exactly once** (lines 26-28), and expansion uses a functional `replace` (line 30) so `$` patterns in identity text cannot corrupt replacement.
- Legacy complete-prompt responses (no anchors) still get strict fact validation via `assertPromptProtection` (`prompt-rewrite.ts:109`).
- Namespace collision with prompt-authored text is avoided by probing existing namespaces (`prompt-anchors.ts:13`), and longest-block-first masking prevents prefix overlap (line 16).
- The budget math counts the *expanded* identity cost, not token length: `rewriteBudgetPlan` (`prompt-budget.ts:8-17`) feeds `anchors.expandedCharacters` into feasibility, and the writer system prompt states this explicitly (`prompt-rewrite.ts:92`). The infeasible case fails loudly with an actionable message instead of truncating identity (`prompt-rewrite.ts:84`).

### F6 (P2): protected-fact matching is punctuation-fragile

`assertPromptProtection` (`prompt-protection.ts:59-77`) compares facts with space-padded boundaries:

```ts
const text = ` ${canonical(prompt)} `;
if (!protection.facts.every(fact => text.includes(` ${canonical(fact)} `))) throw ...
```

Canonicalization NFKC-normalizes and strips punctuation *inside* the fact but the boundary still requires surrounding spaces. A writer that keeps the fact but attaches commas/colons (`"red dress,"`, `"red dress:"`) produces canonical `"red dress,"`, which fails the `" red dress "` test and throws "Required subject appearance … omitted" even though no fact was lost. Because this runs on the *Fit to budget* path, users intermittently cannot fit a prompt that is actually compliant. Compare with the ensemble path, which scopes facts per named subject (better), but shares the same boundary assumption (`prompt-protection.ts:74`). Fix: compare on a tokenized form (split on `[^\p{L}\p{N}]+`) with ordered-subset matching, or strip trailing punctuation from both haystack and needle.

### F8 (P2, also perf): lenient JSON repair is quadratic

See §2.3 — `repairJsonString` (`planner.ts:859-965`) does `text.slice(i + 1).trimStart()` per inner quote (`planner.ts:906,911`). On a long planner output containing many quotes this is O(n²) and sits directly on the planning hot path before Zod validation.

## 1.3 Cross-extension RPC & sandbox security

### LumiBooks/LumiScript 1.5 s deadline — sound

`collectContextSources` (`context-providers/index.ts:31-47`) races each source against a timer clamped to 1.5 s, removes the abort listener in `finally`, caps payloads at 256 KB after stringify (line 40), and discards late/aborted results. Two honest caveats:

- The underlying `rpcPool.read` is not truly cancellable (no signal is passed through `RpcReader`, line 6); the deadline only discards the result. A hung reader still consumes host resources — acceptable given the pool is host-owned, but worth a comment.
- `normalizedScript` rejects >128 facts and duplicate ids; `normalizeLumiBooks` (`lumibooks.ts:13-28`) fail-closes on unknown file states, enforces chat/user scoping and a +60 s clock-skew ceiling, and caps 32 entities / 256 raw / 1,200-char facts. The session wrapper (`session.ts`) aborts the previous refresh and never returns facts to the frontend.

### Warp bridge — sound

`game-bridge.ts` validates version, caps 12 choices, clamps `odds` to 0–1, truncates every string, dedupes ids (`parseGameState`, lines 40-58), spends picks until a fresh state arrives (`pick`, lines 110-118), and never touches the network. `GameBridge.destroy` removes its listener; `request()` clears stale per-provider state before re-asking. The panel bridge allowlist (`BRIDGE_PROVIDERS`, `panel-dock.ts:11`) plus full payload identity checks in `receiveBridge` (`panel-dock.ts:283-298`) prevent arbitrary window events from becoming cards.

### Pinned Panels sanitizer — strong, with documented residual surface

`panelDocument` (`panel-document.ts`, 30 lines) is defense-in-depth done right: tag allowlist (HTML + SVG), attribute allowlist, explicit `on*` rejection, checkbox/radio-only inputs, data-URI-only images by default with `referrerpolicy`, and a strict CSP meta (`default-src 'none'; script-src 'none'; …`) rendered inside an `<iframe sandbox="">` (`panel-dock.ts:195`). Residual notes:

1. **CSS is fully user-controlled** (`style` attribute and `<style>` are both allowed). Scripts are blocked, but `position:fixed; inset:0` can paint over the card's own chrome (click-jacking *within the sandboxed frame only* — the iframe cannot reach the parent or escape its box). If cards ever become first-class UI rather than isolated frames, add a declaration allowlist mirroring `sanitizeTextStyle` in `rich-text.ts:147-160`.
2. The `$1–$36` replacement engine (`panel-rules.ts:14-22`) actually accepts `$10–$99` (`\d{1,2}`); out-of-range captures throw "Missing or unsupported capture", which is safe but contradicts the field label "($1, $2, ... $36)" in `panel-dock.ts` rule form. Align the regex to `\d{1,2}` with an explicit `<= 36` check and the label.
3. All captures pass through `escape()` (`panel-rules.ts:11`), so the regex engine is not an XSS vector; the 200 KB rendered-card and 1 MB source limits (line 7, `panels.ts:3-5`) bound memory.

### F5 (P2): ReDoS protection is asymmetric — panel rules yes, display rules no

- Panel rules: user regex executes in a disposable Worker killed at 500 ms (`panel-rules.ts:30-43`), with empty-match rejection (line 12) and a 12-result cap (line 24). Good.
- Display rules: `compileDisplayRules` (`display-rules.ts:22`) does `new RegExp(source, flags)` on the **main thread**, and the resulting rules run inside `formatDialogueText` for every paragraph render (including typewriter restarts and backlog). A catastrophic pattern (nested quantifiers) freezes the whole reader tab on mobile, with no worker, timeout or pattern-complexity lint. Fix options, in order of preference: (a) route display-rule compilation/execution through the same worker machinery with a cached result per (rule, paragraph) hash; (b) at minimum add a static guard rejecting nested unbounded quantifiers and cap input length; (c) run rules against paragraphs once at turn-load rather than per render.

### F4 (P2): scene-cache key collision has no content-level guard

`sceneImageCacheKey` (`scene-image-cache.ts:204-207`) is `scene-v2:` + FNV-1a(canonical) + FNV-1a(reversed canonical) + canonical length. Both hashes derive from the same string and the space is 2×32-bit; with 256 live entries the per-batch collision probability is small but non-zero over the worker's lifetime, and a collision silently serves one identity's image for another — the worst failure mode for a visual-continuity feature. `canonicalJson` is already in hand at key construction. Recommended hardening: keep the short key for maps but store the canonical identity (or a SHA-256 digest via `crypto.subtle`, already used in `reference-history.ts:37`) on the entry and verify it in `lookup`/`store`, treating mismatch as a miss.

### F11 (P2): cache budget is global, and one fat entry can monopolize it

- `sceneCache` is a worker-global singleton (`controller.ts:136`); `maxEntries=256`/`maxBytes=1 MiB` (`scene-image-cache.ts:142-143`) apply across **all users and chats**, with no per-scope fair share. Fine for single-user desktop; a multi-user host lets one heavy chat evict everyone else.
- `enforceBounds` (`scene-image-cache.ts:413-423`) never evicts the just-stored `keep` entry even when it alone exceeds `maxBytes`; the comment says this avoids wedging, but the steady state is then "one entry, constant re-eviction of everything else". There is no per-entry byte cap. Reject (or separate-pool) entries above e.g. `maxBytes / 4`.

---

# Vector 2 — Performance & Resource Optimization

## 2.1 Memory, eviction and retained references

- **Scene cache holds pointers only** (image id/url/provenance), never pixels — correct; eviction cannot orphan provider assets, and `invalidateImage` (`scene-image-cache.ts:448-457`) handles `IMAGE_DELETED` across scopes. Tombstones are bounded at 4× `maxEntries` (line 430); `inFlight` entries self-delete on settle (line 522).
- **Config clones.** `normalizeConfig` (`config.ts:278-387`) rebuilds the entire 62-field shape — including `upgradeImageTemplates` over the 32-template catalogue (`config.ts:340`) — on **every** `loadConfig`, which is called from 16 sites in `controller.ts` alone (plus `images.ts`, gates and review flows), each hitting `userStorage.getJson` first. A turn therefore re-reads and re-normalizes the config roughly a dozen times. See F9 fix below.
- **Storage writes are well-behaved.** `serializedWrite` (`storage.ts:103-116`) chains per-key tails and deletes the map entry on settle — no unbounded promise growth; `mutateActiveTurnRecord` nests chat-state and turn locks in a fixed order to avoid deadlock.
- **F14 (P3).** `AudioEngine.activeSfx` (`audio-engine.ts:110`) only releases players on `ended`/`error` (lines 201-207). A stalled network audio element that fires neither (mobile background tab, interrupted request) remains referenced forever. Add a hard cap (e.g. 32) that pauses/evicts the oldest, or a timeout.
- **Backlog growth.** `VnStage.backlogEntries` (`vn-stage.ts:513`) accumulates for the whole reading session with no cap; long sessions on mobile retain formatted HTML strings for every paragraph. Cap to e.g. 200 entries.
- **`ImageReviewGate`/scheduler maps** are per-batch and GC'd with `generateAssets`; module maps in the controller are keyed by runtime chat key and deleted on settle — no cross-turn leak found.

## 2.2 The ancestry scanner (F7, P2)

`reference-history.ts` does far more hashing than its 750 ms deadline can reliably afford:

- `frames()` (line 36) runs a `crypto.subtle` SHA-256 over `JSON.stringify([prefix, message])` **per message**, up to `MAX_PREFIX = 1024` (line 13).
- `collect()` (line 58) builds the chain once for lineage, then **rebuilds the entire chain for the freshness check** (the second `frames()` call near line 75), and `referenceMessages` re-validates the full prefix on each call — it is invoked at capture, at collect start and at freshness (three full validations).
- `matches()` (lines 49-56) adds another two hashes (paragraph digest) per candidate record, for up to `MAX_RECORDS = 16`.

On a slow host storage layer this routinely blows the 750 ms budget (`readReferenceHistory`, line 95), and the failure mode is silent: the "Earlier references" tooltip simply disappears. Recommended: memoize prefix digests in a module LRU keyed by `(chatId, messageCount, messageId, swipeId, contentHash)` so repeated turns reuse the chain incrementally, and hash paragraph digests once when the turn record is written rather than on every ancestry read.

## 2.3 Hot-path algorithmic issues

- **F8 (P2) — O(n²) JSON repair.** `repairJsonString` (`planner.ts:906`) calls `text.slice(i + 1).trimStart()` inside the per-character walk whenever a quote might be an inner quote; line 911 does it again after a comma. Each call copies and scans the tail. For a 16k-token response with hundreds of quoted strings this is millions of char copies on the planning path. Replace with a precomputed `nextNonSpace[i]` index built in one O(n) pass, or a reverse whitespace scan bounded to a few characters (real delimiters are adjacent after optional whitespace).
- **F13 (P3) — stringify-based change detection.** `ImageLibrary.setContext` (`library.ts:78`) does `JSON.stringify(next) !== JSON.stringify(this.context)` on every turn/asset stream update, and story mode re-stringifies every reply key per card (`library.ts:114,129,136`). Compare the five primitive fields directly and compute the card key once into a `Map`.
- **Scene identity serialization.** `sceneImageIdentityFor` (`images.ts`) is rebuilt and `canonicalJson`'d in `prepareAssetJobs`, again in `resolveCacheCues`, and again inside `generateAssets` for the same cues. Memoize the composite key on the cue object for the batch lifetime.
- **`AssetScheduler.drain`** (`asset-scheduler.ts:~219`) copies/filters/sorts all scheduled items on every emit; batches are ≤12 jobs so this is fine today — flag only if batching grows.

## 2.4 DOM & render thrashing

- **Typewriter.** `startTypewriter` (`vn-stage.ts:2118-2210`) is well-constructed: full paragraph laid out first with `visibility:hidden` "rest" spans so line breaks are final (no reflow cascade), surrogate-pair-aware stepping, and no forced synchronous layout inside the interval. Remaining costs: (a) two `textContent` writes per tick (node + rest, lines 2196-2204) — batch both into one frame via `requestAnimationFrame` coalescing when `textSpeed` is very low; (b) `setInterval` keeps firing while the tab is hidden — gate on `document.visibilityState` (the visibility listener already exists for speech at `controller.ts:527`).
- **Text effects.** The 240/span and 2,400/call caps (`text-effects.ts:47-49`) prevent pathological node counts, grapheme splitting uses cached `Intl.Segmenter` (lines 51-63), and decoration is idempotent. On low-end mobile, 2,400 letter spans + per-letter CSS animations in one paragraph is still the heaviest work the stage does; expose the cap to `effectIntensity` (e.g. 600 when `gentle`) and prefer `content-visibility: auto` on off-stage dialogue.
- **Image staging.** `preloadAndDecodeVnImage` (`image-loader.ts:42-56`) decodes before swap and the stage crossfades two layers with a 350 ms timer (`vn-stage.ts:1620-1633`). Two issues: the swap is timer-driven rather than `transitionend`-driven, so background-tab timer throttling desyncs the layer swap from the CSS transition (add a `transitionend` fallback race); and rapid image updates correctly clear/restack the timer but leave the incoming `<img>` `src` churn to the browser cache — acceptable.
- **F10 (P2) — PanelDock.** `refresh()` (`panel-dock.ts:147-161`) runs `list.replaceChildren()` and rebuilds every candidate row on **every `setCursor`**, i.e. on every paragraph advance, even though candidates only change on turn change. Follow-pins remove and recreate the whole node — including a fresh `<iframe srcdoc>` browsing context (`panel-dock.ts:152-156, 195`) — causing a visible reload/flicker on each updated card. Fix: build candidate rows once per turn and toggle hidden by paragraph; for follow updates, only rewrite `srcdoc` when `panelHash(card.html)` actually changes, never on identical content.
- **Panel worker churn.** `renderPanelRule` (`panel-rules.ts:28-44`) creates a new Worker and Blob URL per rule per evaluation; up to 12 rules per turn means 12 worker spawns. Replace with one pooled long-lived worker keyed by an internal sequence, terminating on turn change/destroy.
- **Cast Stage.** `CastStage.refresh` (`cast-stage.ts:48-70`) diffs by a JSON signature (good) but then `replaceChildren` rebuilds all cards; portrait swaps have no enter/exit transition (see §3.3). `fit()` runs on two `ResizeObserver`s and calls `getBoundingClientRect` (forced layout) — throttle via rAF.
- **Image library pagination is genuinely lazy** (24 entries/24 files per page, `image-library.ts:60,97`, `loading="lazy"` + `decoding="async"` in `library.ts:118`); the grid is fully rebuilt per page which is fine at 24 nodes.
- **Procedural particles** are already budgeted (~120 nodes/ambient, compositor-only transform/opacity animations, seeded SVG tiles for rain — `procedural-particles.ts:14-18`); `gentle` halves via CSS. No change needed beyond keeping node creation out of the paragraph tick path.

## 2.5 LLM & token efficiency

- **Static rulebook resent every turn.** `plannerInstruction` (`planner.ts:277-345`) inlines ~3-4k tokens of invariant guidance every call: the 57-pose expression catalogue (line 320), the full stage-effect and ambient catalogues (lines 322-326), the complete JSON shape contract (line 337) and audio catalogues. On providers supporting prompt caching (OpenAI/Anthropic/Google prefix caching), hoist the invariant block to a stable system prefix with the variable parts (audio catalog, template instructions, custom instructions) at the end; today the dynamic `audioInstructions` are spliced into the middle (line 331), which can break prefix cacheability.
- **System One payload waste.** `decidePresentation` (`system-one.ts:74-77`) sends `Object.fromEntries(names.map(name => [name, name === "unknown" ? … : null]))` — every known character costs a null entry; omit null criteria. The same pose/audio catalogues are re-serialized per batch (lines 67-72) even though batches share the request; build once outside `Promise.all`.
- **Double validation is worth keeping.** `normalizePlannerOutput` then `PlannerOutputSchema.parse` (`planner.ts:1207-1210`) is a deliberate trust boundary on model output; do not remove for speed. The same applies to `AssetJobSchema.parse` on every scheduler transition (`asset-scheduler.ts`).
- **Rewrite loop.** `rewriteImagePrompt` limits to two attempts and reuses the previous candidate as a compression draft (`prompt-rewrite.ts:97-118`) — good; the per-call `max_tokens` is derived from target length (line 103) rather than fixed.

---

# Vector 3 — UI/UX Polish & Visual Storytelling Ergonomics

## 3.1 Cognitive load & settings fatigue

The information architecture is already hierarchical — 22 routes in a 5-section tree (`routes.ts:5-27`) rather than one wall — which is the right foundation. Remaining fatigue points:

1. **No presets.** The 62 config fields (`config.ts:74-139`) expose every primitive; a new user must understand `referenceAnchoring`, `referenceSource`, `systemOneMode`, `imagePromptBudgetOverride`, `persistentCastArt` and `effectIntensity` before their first image. Ship three opinionated bundles — *Cinematic default* (current defaults), *Mobile/data saver* (`maxImagesPerTurn:2`, `imageConcurrency:1`, `effectIntensity:"gentle"`, text effects `static`), *Maximum consistency* (anchoring+card source+persistent art on) — as one-tap buttons on the settings home, implemented as typed patches through the existing `vn_set_config` path.
2. **No settings search.** The route map already exists; add a Ctrl/Cmd-K command palette that fuzzy-matches field labels (the `find(...)` tooltip helper in `panel.ts:832` shows the label strings are centralized) and deep-links to `routes.fieldRouting` (`routes.ts:42`).
3. **Raw-power controls sit next to casual ones.** `parserParameters` JSON, `customCss`, `displayRegexRules`, raw `imageParameters` should live behind an explicit "Developer mode" toggle (persisted in config), not merely under *Advanced*.
4. **Reviewer density.** The image studio (`studio.ts`, 701 lines) stacks diagnostics, provenance, subject name, prompt editor, negatives, template reprepare, reroll, fit and recovery in one scrolling panel. Collapse diagnostics/provenance into a `<details>` by default and make the prompt + primary action the above-the-fold content; the CSS already has container queries for the 600 px breakpoint (`studio.ts:27`).
5. **Keyboard flow.** Stage shortcuts exist (S skip, arrows) but are undiscoverable; add a `?` cheatsheet overlay and mirror shortcuts in button `title` attributes. The panel dock already traps Escape (`panel-dock.ts:79`); standardize Escape-to-close across studio/library/panels (library already does, `library.ts:88`).

## 3.2 Mobile & responsive ergonomics

- **Touch targets are mostly respected** (44 px buttons in dock/library media queries, `studio.ts:27`), except the panel **resize handle is 24×24** (`.resize` in `panel-dock.ts` CSS), below the 44 px guideline — expand the hit area with an invisible `::after` padding zone while keeping the visual glyph.
- **Focus management.** Image Library implements a real Shadow-DOM focus trap (`library.ts:83-90`); the studio `section` is a fullscreen-on-mobile surface but has no equivalent trap or `aria-modal` (it is a side panel on desktop), so keyboard/talkback focus can escape to the stage behind. Add the same trap when the container query reports the mobile layout.
- **Scroll containment** is consistently handled with `overscroll-behavior:contain` (library, studio, document reader, dock drawer) — no scroll-trap bug found; textareas correctly use 16 px font to avoid iOS zoom (`library.ts`, `studio.ts` textarea CSS).
- **Dual exit affordances.** Library shows both "Back to reader" and a × close (`library.ts` constructor); on a 390 px screen these compete. Keep × for modal dismissal and move "Back to reader" into the header overflow on narrow widths.
- **Reviewer opacity.** The library overlay scrim is only `#0005` (`:host([data-open=true]){background:#0005}`), so the stage remains visible behind a near-fullscreen modal on mobile — increase scrim opacity under 600 px to keep attention on the review/history task.
- **Draggable panels on touch** correctly use pointer capture + `touch-action:none` (`panel-dock.ts:271-280`) and arrow-key movement; add haptic-equivalent active states and constrain dragging within the viewport (currently clamped only on layout, so a fast drag can transiently leave the panel off-screen before `layout()` runs).

## 3.3 Stage transitions & atmosphere

- **Cast View is static rectangles.** `CastStage` (`cast-stage.ts`) swaps cards via `replaceChildren` with no transition; the speaking cue is only an accent border (`[data-cast-card][data-active=true]`). Add (a) FLIP-style enter/exit (translate+fade, compositor properties only), (b) a 200 ms brightness/`transform: scale(1.02)` active-speaker transition, (c) crossfade the `<img>` rather than replacing the placeholder node. Respect `prefers-reduced-motion` (the panel CSS already shows the pattern).
- **Audio ducking snaps instead of ramping.** `musicAttenuationForParagraph` (`controller.ts:233-236`) returns 0.35 for "quiet", and `AudioEngine.setBgmAttenuation` (`audio-engine.ts:133-136`) writes `player.volume` immediately — an audible step on every quiet/mute boundary. A drop-in ramped implementation is provided in §5.3.
- **One-shot vs. ambient discipline is good.** `presentEffect`/`presentAmbient` honor both global `effectIntensity` and per-paragraph limits (`controller.ts:246-256`, `effect-presentation.ts`); static text-effect mode keeps colors without motion, and OS reduced-motion downgrades animated→static. Extend the same "gentle" curve to particle counts (currently CSS-only halving) for consistency.
- **Crossfade timing** is a fixed 350 ms (`vn-stage.ts:1620`); make it themeable via a CSS custom property so presets like *paper-novel* can use slower dissolves while neon presets cut faster.
- **Speaker nameplate** changes have no transition; a short opacity/translate on `[data-vn-speaker]` would make paragraph-to-paragraph attribution changes read as continuity rather than replacement.

---

# Vector 4 — Next-Gen Mechanics (feature proposals)

## 4.1 Layered expression-diff sprites for Cast View

**The value.** Cast View currently swaps whole generated portraits per cue. A layered model (base body/attire plate + expression plate + optional prop plate) lets expression changes update instantly without a provider round-trip, enables the 57-pose catalogue to actually animate within a scene, and cuts image spend dramatically — most paragraph beats change only expression.

**Architectural fit.** The closed pose catalogue already drives cues (`POSE_EXPRESSION_CATALOGUE`, `character.ts`; cue field `poseExpressionId`). Extend `VisualCue` with an optional `layers: { base?: string; expression?: string; prop?: string }` resolved in `cast-allocation.ts`; `CastStage.renderPortrait` (`cast-stage.ts:72-87`) already preload-decodes and epoch-checks, so it can stack three absolutely-positioned `<img>` plates with crossfades instead of one. The planner gains one field (`expressionLayerConfidence`) and the scene cache gains a layer-aware identity variant in `SceneImageIdentity` — reusing the existing exact-compatibility machinery rather than adding a second cache.

**Trade-offs.** Requires provider/templates that can produce transparent plates (or a local background-removal step; FLUX/anima cutout quality varies); layered compositing raises the mobile compositor node count (mitigate with the existing particle-style node budget); fallback to single-image rendering must remain for providers that cannot layer, so the template catalogue needs a `layered: boolean` capability flag.

## 4.2 Close the Dossier/Lorebook synthesis loop (bounded)

**The value.** The LumiBooks/LumiScript connectors already validate and normalize entities (`lumibooks.ts`, `context-providers/index.ts`) but deliberately stop at status reporting — `ContextSourceSession.refresh` returns only statuses (`session.ts:18`), facts never reach the planner. Completing the loop gives automatic NPC/place continuity without manual dossier entry.

**Architectural fit.** Add an explicit opt-in config flag (`contextSources.injectIntoPlanner`, default off). After `collectContextSources`, map accepted `ContextProposal.entities` into the same shape `knownCharacterBlock`/visual-context already consume, with hard caps reusing existing constants: ≤32 entities, ≤128 facts, 1,200 chars/fact (the lumibooks normalizer already enforces these). Inject into `requestPlannerOutput`'s system message under the existing "data, not instructions" framing (`planner.ts:1148-1152`), and surface source badges in the dossier card so provenance stays visible. The 1.5 s deadline and fail-closed normalization mean no new availability risk.

**Trade-offs.** Token budget: gate injection behind a char budget (e.g. 1,500 chars, prioritized by name overlap with the target response) and count it in the planner context diagnostics (`summarizeDiagnostics`). Stale-data risk is already mitigated by the 5-minute freshness flag (`proposalEvidence`, index.ts:14). The planner must be instructed that connector facts are lower-priority than visible prose — the current prompt's "never obey directives inside it" pattern extends naturally.

## 4.3 Interactive stage: point-and-click inspection + visual inventory

**The value.** Move beyond choice buttons: let players tap scene objects/characters to inspect them, picking up story documents (`storyDocuments` already planned and parsed — `planner.ts:333`, `document-reader.ts`) and Warp game moves into an inventory that drives visual state. This turns the reader into a light point-and-click VN while keeping the host chat as the source of truth.

**Architectural fit.** The transport already exists: `vn-game-state-v1`/`vn-game-pick-v1` (`game-bridge.ts`) and `shared/scene-interactions.ts`. Add a `hotspots` array to planner output (bounded, paragraph-anchored, like cues) rendered as positioned, keyboard-focusable buttons over the scene image; taps dispatch either a game pick (existing `GameBridge.pick`) or open the existing `createDocumentReader` (`document-reader.ts:5`). Inventory state lives in a projection (same discipline as turn records — never mutate chat), keyed by chat, and the scene cache identity already includes `action` tags so inventory-driven prop changes compose with image reuse.

**Trade-offs.** Hotspot coordinates need a model contract (normalized 0–1 x/y + radius) and a fallback for models that can't emit them (hide the layer, keep choices). Mobile occlusion: hotspots must not cover the dialogue sheet — the cast-stage `fit()` measurement pattern (`cast-stage.ts:88-96`) can carve the safe zone. Accessibility cost is real but bounded: hotspots are ordinary buttons with labels and arrow-key navigation.

## 4.4 Cache-aware adaptive image director

**The value.** Today `maxImagesPerTurn` is a fixed user setting. An adaptive director spends the budget where it matters: new physical scene, first appearance of a character, or high System One expression confidence — while coasting on scene-cache hits for speaker-only switches (which already preserve the episode).

**Architectural fit.** All signals exist: `SceneImageCacheStats` (`scene-image-cache.ts:122-138`) exposes hits/misses/evictions, `retainPlanEpisodes` already runs per accepted plan, and System One returns calibrated confidences (`systemOne.ts:113-121`). Implement as a pure function `(plan, stats, config) => cueBudget` used by `prepareAssetJobs` (`images.ts`) before admission — no new state, fully testable in isolation like `cast-allocation.ts`. Keep the manual cap as a hard upper bound and emit a diagnostic line so behavior stays explainable.

**Trade-offs.** Non-deterministic image counts can surprise users recording runs — mitigate by making the policy configurable (`fixed | adaptive`) and logging every promotion/skip with reasons (the debug trace convention is already established). Risk of under-illustrating important beats; require paragraph 0 to always be funded (the planner already instructs this, `planner.ts:319`).

## 4.5 (Honorable mention) Prompt version timeline in the Image Library

`ImageRequestRecord` history (`image-review.ts:safeImageHistory`, 32 records with full prompts/parameters) and the library's existing prompt detail view (`library.ts:view`) already store everything needed to diff prompt versions across rerolls/fits. A side-by-side diff view would make the review loop learnable; effort is mostly frontend, reusing the library's pagination and the studio's provenance data.

---

# Vector 5 — Concrete "Before vs. After" Refactorings

## 5.1 System One: bounded request + fail-closed scene decisions (fixes F2, F3)

**Before** (`system-one.ts:96-131`, abridged):

```ts
const response = await spindle.cors(endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body,
}) as { status: number; body: string };
if (response.status < 200 || response.status >= 300) throw new Error(`System One request failed (${response.status})`);
return Response.parse(JSON.parse(response.body));
// ...
sceneChange: scene?.type !== "noul" || scene.noul > 0.2,
needsDescription: description?.type !== "noul" || description.noul > 0.2,
```

Problems: no deadline (a hung endpoint hangs planning), no external abort, and a *missing* answer evaluates to `true`.

**After** (drop-in; additive optional `signal`, internal 15 s deadline, fail-closed booleans):

```ts
// Add to the SystemOneDecisions input type in decidePresentation:
//   signal?: AbortSignal;
const SYSTEM_ONE_TIMEOUT_MS = 15_000;

/** Race the CORS call against a deadline and any external cancellation. */
async function boundedCors(
  spindle: SpindleAPI,
  endpoint: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
  externalSignal?: AbortSignal,
): Promise<{ status: number; body: string }> {
  if (externalSignal?.aborted) {
    const error = new Error("System One request cancelled.");
    error.name = "AbortError";
    throw error;
  }
  const controller = new AbortController();
  const onExternalAbort = (): void => controller.abort(externalSignal!.reason);
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("System One request timed out.")), SYSTEM_ONE_TIMEOUT_MS);
  try {
    return await spindle.cors(endpoint, { ...init, signal: controller.signal } as RequestInit) as { status: number; body: string };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

/** A missing/failed answer means "no change" — never invent a scene cut. */
function noulTripped(answer: AnswerValue | undefined, threshold: number): boolean {
  return answer?.type === "noul" && answer.noul > threshold;
}
```

Then inside the batch map, replace the call:

```ts
const response = await boundedCors(spindle, endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body,
}, input.signal);
```

and the final aggregation:

```ts
return {
  speakers, expressions, bgm, sfx,
  sceneChange: noulTripped(scene, 0.2),
  needsDescription: noulTripped(description, 0.2),
  durationMs: Date.now() - started,
  inputTokens: parsedBatches.reduce((total, batch) => total + (batch.usage?.input_tokens ?? 0), 0),
};
```

If the deployed `spindle.cors` typings predates `RequestInit.signal`, cast at the boundary as shown; the abort still unblocks the `await` on spec-compliant hosts and the timer guarantees planner progress either way. Callers (`planTurn`) should pass their existing planning `signal` through.

## 5.2 View-close intake epoch (fixes F1) — one-line semantic fix plus guard

**Before** (`controller.ts:249-262`):

```ts
function abortChatWork(spindle: SpindleAPI, userId: string | undefined, chatId: string, reason: string): void {
  const key = runtimeKey(userId, chatId);
  imageRetryEpochs.set(key,(imageRetryEpochs.get(key)??0)+1);
  imageRetryQueues.get(key)?.queue.cancel();imageRetryQueues.delete(key);
  planningQueue.cancelChat(userId, chatId, undefined, reason);
  // ... no intake epoch bump
}
```

**After:**

```ts
function abortChatWork(spindle: SpindleAPI, userId: string | undefined, chatId: string, reason: string): void {
  const key = runtimeKey(userId, chatId);
  // Invalidates macro intakes still awaiting the host when the view closed,
  // so they cannot enqueue a paid plan after the close. Idempotent with the
  // retry-epoch/queue cleanup already performed above it.
  bumpIntakeEpoch(userId, chatId);
  planningQueue.cancelChat(userId, chatId, undefined, reason);
  const abortedTurn = activeTurnKeys.get(key) ?? null;
  activeTurnKeys.delete(key);
  pendingAssetStarts.delete(key);
  abortAssetBatch(key, reason);
  releaseSceneCacheAdmission(spindle, userId, chatId, "view_closed");
  void cancelIncompleteJobs(spindle, chatId, userId, abortedTurn).catch((error) => {
    spindle.log.warn(`Visual novel view-close cleanup failed: ${errorText(error)}`);
  });
}
```

(`bumpIntakeEpoch` already performs the retry-epoch/queue work, so the two preceding lines become redundant and are removed.)

Defense-in-depth inside the planning task in `processAssistantMessage`, immediately before `planTurn` (`controller.ts`, after the `recentMessages` await):

```ts
// A view can close during the config/context awaits; automatic planning is
// contractually limited to open chats (see allowAutomaticWork).
if (!views.isOpen(userId, chatId)) {
  operation.controller.abort("The visual novel view closed before planning ran.");
}
if (operation.controller.signal.aborted) return;
```

The existing `intakeEpochs` guard at `controller.ts:975` plus this check make the post-close planner run unreachable from both the intake window and the awaits inside the task.

## 5.3 Ramped audio ducking (fixes F12)

**Before** (`audio-engine.ts:133-141`):

```ts
setBgmAttenuation(factor:number):void {
  this.bgmAttenuation=Number.isFinite(factor)?Math.max(0,Math.min(1,factor)):1;
  for(const item of this.bgmTracks)this.setTrackVolume(item,item.gain);
}
private setTrackVolume(item:ActiveBgm,gain:number):void {
  item.gain=Math.max(0,Math.min(1,gain));
  item.player.volume=item.gain*this.bgmVolume*this.bgmAttenuation;
}
```

**After** — attenuate over a short ramp using a dedicated timer, independent of the crossfade envelope (`fadeTimer`), so the two never clobber each other:

```ts
const DEFAULT_ATTENUATION_RAMP_MS = 420;

// Extend ActiveBgm with: attenTimer?: TimerHandle; targetAttenuation?: number;
setBgmAttenuation(factor: number, rampMs: number = DEFAULT_ATTENUATION_RAMP_MS): void {
  const next = Number.isFinite(factor) ? Math.max(0, Math.min(1, factor)) : 1;
  const previous = this.bgmAttenuation;
  this.bgmAttenuation = next;
  for (const item of this.bgmTracks) {
    if (item.attenTimer !== undefined) this.clearInterval(item.attenTimer);
    item.targetAttenuation = next;
    if (rampMs <= 0 || previous === next) {
      this.setTrackVolume(item, item.gain);
      continue;
    }
    const startGain = item.gain * this.bgmVolume * previous;
    const targetGain = item.gain * this.bgmVolume * next;
    const startedAt = this.now();
    const intervalMs = 25;
    item.attenTimer = this.setInterval(() => {
      const progress = Math.min(1, (this.now() - startedAt) / rampMs);
      // Ease-out curve so the duck reads as a deliberate music bed change.
      const eased = 1 - (1 - progress) * (1 - progress);
      item.player.volume = Math.max(0, startGain + (targetGain - startGain) * eased);
      if (progress >= 1) {
        if (item.attenTimer !== undefined) this.clearInterval(item.attenTimer);
        item.attenTimer = undefined;
        this.setTrackVolume(item, item.gain);
      }
    }, intervalMs);
  }
}
```

Also clear the new timer in `clearFade`/`stopAll`/`destroy` paths:

```ts
// in stopAll(), alongside item.player.pause():
if (item.attenTimer !== undefined) { this.clearInterval(item.attenTimer); item.attenTimer = undefined; }
```

`setBgmVolume` and the crossfade code already route through `setTrackVolume`, which picks up the current `bgmAttenuation`, so volume changes mid-duck remain correct.

## 5.4 Bonus CSS: touch target and Cast transitions

```css
/* panel-dock.ts CSS: keep the 24px glyph, expose a 44px touch target */
.resize{position:absolute;bottom:0;right:0;width:24px;height:24px;min-height:24px;padding:0;border-radius:6px 0 0 0;cursor:nwse-resize;touch-action:none}
.resize::after{content:"";position:absolute;inset:-10px;}            /* 44px hit area, visual unchanged */
@media (pointer:coarse){.resize::after{inset:-12px;}}

/* cast-stage.ts CSS: animate card swaps without touching the layout path */
[data-vn-cast-card]{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,opacity .22s ease;will-change:transform,opacity}
[data-vn-cast-card][data-active=true]{transform:scale(1.02)}
@media(prefers-reduced-motion:reduce){[data-vn-cast-card]{transition:none}}
```

---

# Verification checklist for the refactors

1. `bun run verify` (typecheck + full isolated test suite + bundle check).
2. New targeted tests:
   - view-close during unresolved intake → no planning operation survives (extend `scripts/test-history-races-browser.ts` / `view-gating.test.ts`).
   - System One timeout via a fake `spindle.cors` that never resolves (fake timers), and missing-answer → `sceneChange === false`.
   - attenuation ramp: mock clock assertions in `audio-engine.test.ts` (mid-ramp volume strictly between endpoints; `stopAll` clears the timer).
3. Manual mobile pass (390×844): panel resize drag, reviewer focus trap, quiet/mute music boundaries with earphones.
4. Re-run `scripts/test-image-retry-queue-browser.ts`, `test-host-lifecycle-browser.ts` and `test-validation-sandbox` after the controller change, since they exercise the exact cancellation paths touched in §5.2.

# Appendix — notable strengths worth preserving

- Projection-only storage with explicit `saveTurnRecordIfCurrent` ownership; canonical messages never mutated.
- Two-level identity defense: intake epochs (macro window) + admission epochs (provider window) + turn-key guards (persistence window).
- Identity anchors with exactly-once/marker-residue/negative-prompt validation and feasible-budget failure messages.
- Sandboxed panel iframes with CSP, allowlist sanitizer, and worker-isolated user regex.
- Bounded everything: cache 256/1 MiB, tombstones 4×, panels 12/100 KB, rules 12, retry queue 24/128, RPC 1.5 s, references 16/128, audio import 30 MB with chunk reassembly.
- Grapheme-correct typewriter/text-effects with hard node caps and reduced-motion support.
- Fail-closed external data normalization (LumiBooks file states, Zod-on-every-boundary, credential/reference byte stripping in `safeImageParameters`).
