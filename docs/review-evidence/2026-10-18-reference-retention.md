# beta.46 — verified earlier references

Branch: Testing. Base: beta.45 (`1bb985e`). This continues the approved reference roadmap with an optional display-only history. No dependency, permission, preset or image-generation path is replaced.

## Delivered

- New plans capture optional versioned SHA-256 ancestry certificates from immutable native message snapshots. Certificates bind the plan key/paragraph digest to ordered raw messages, IDs, role, name, swipe, parent and branch. Original raw planning input must match the snapshot target; literal targets are fingerprint-checked again on read. Intervening user messages participate in the history prefix.
- Earlier observations come only from saved plans with valid matching certificates and literal source text. Exact evidence is revalidated against both source paragraphs and native source text. Original source keys and reply/paragraph labels remain intact. Matching uses exact kind/name, with no casing/alias inference. Current-turn fact validators remain strict.
- Cards add **Earlier in this story**, including source quotes. The existing menu includes previously observed subjects and a Reply & earlier / This reply scope filter. Category, field, detail, pin/hide/note preferences remain effective. Earlier-only cards have no scene actions, present-location claim, or document-reading control. Descriptions stay out of image prompts and current scene state.
- **Reading → References → Remember earlier references** controls retention. Enabling it triggers a correlated read-only refresh. Opening/filtering cards uses no provider/model request. Live edit/swipe/delete notifications clear displayed history and refresh read-only state; late uncorrelated broadcasts cannot restore invalidated history. Editing an older assistant reply no longer automatically plans that older reply and moves the reader backwards.
- Optional data failures, unsupported certificates, deadlines and history mismatches leave ordinary reading intact. Unknown future certificate payloads remain preserved. Legacy certificates are never fabricated during reads.

## Limits and deferred scope

Newly prepared replies are required; older saved replies are not backfilled. Conditional, stateful, random and unknown macro ancestry is excluded because current variables do not prove a historical selection. Name/image display macros may appear in ancestry, but macro-bearing source replies are not imported. Source identity uses exact names; full identity/alias reconciliation remains future work.

The prefix is bounded to 1,024 messages / four million input characters. Reads check at most 16 prior saved assistant records, return up to 128 descriptive observations, and use a 750ms optional deadline. A limited selection is labeled. Temporary ownership, outfit, condition, access, goals and document contents do not carry into current state. Broader dynamic-history support and cross-reply document aggregation remain pending.

## Independent review and fixes

The reviewer found two Important issues, both reproduced failing in central tests before fixes:

1. User edits and ancestor deletion did not clear already displayed history. Backend invalidation now happens before early returns. Frontend state clears immediately, refreshes without preparation, and rejects old uncorrelated history deliveries. An older assistant edit invalidates references without starting model work for that old response.
2. A queued plan could bind old input to a newer target snapshot. Capture now checks the exact original raw source and literal target fingerprint; reading also validates literal target fingerprints. A controller regression covers a target changing between intake and the planning history read.

The duplicate config read noted during review was removed by reusing the config already loaded for display decoration. Browser coverage now explicitly checks focus return, geometry, touch targets, three themes and chat/revision scope.

## Verification

| Check | Fresh local result |
|---|---|
| Isolated unit/integration suite | **1,576 passed**, zero failures, 134 files |
| Separate speech transport suite | **18 passed**; total **1,594** |
| Restricted validator/storage/controller/history suite | **115 passed**, overlapping the ordinary suite |
| Browser suites | All **33** scripts passed; new retained-reference checks cover mobile/desktop, themes, sources, filtering, opt-out, stale scopes and live invalidation |

| Both TypeScript projects | Passed with no emit |
| Production backend/frontend builds | Passed; beta.46 manifest and entry hashes recorded in `build-verification.json` |
| Local host scanner probe | No blocked capabilities; declared `base64_decode` |
| Local sandbox startup probe | Loaded successfully |

Browser endpoints are local mocks; provider/model calls are not live. The scanner and startup probes are local compatibility checks, not a production-host installation. Tooling uses local Bun 1.3.14 with the existing Node 22.19 browser adapter and a test-only speech keepalive. The declared runtime remains Bun >=1.4.0. Physical Android and production-host/provider acceptance remain unverified.
