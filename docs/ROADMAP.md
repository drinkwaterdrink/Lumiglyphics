# Remaining Lumiglyphics roadmap

Current scope: beta.55 on Testing. This page summarizes unfinished work; [STATUS.md](../STATUS.md) is the delivered-feature matrix. Earlier dated plans retain their original checklists and should not be read as the current completion count.

## Next delivery sequence

| Order | Work | Existing foundation | Remaining outcome |
|---|---|---|---|
| 1 | E2/E3 complete scene and cast | Cast scanning/editing, outfits, supplied/saved portraits, place art and compatible reuse | Allocate backgrounds and portraits independently inside the same image budget. Add expression artwork/variant management and richer placement without generating a portrait for every roster entry or confusing speakers with physically present characters. |
| 2 | C/D reference and source reconciliation | Reveal-scoped current cards, inline links, quiet reference menu and verified earlier descriptions | Explicit identity/alias reconciliation, clearer conflicting-source precedence, and additional eligible cross-reply/companion evidence. Dynamic macro histories remain excluded until historical choices can be verified. Private or unclassified data must not become revealed knowledge. |
| 3 | H expanded world documents | Literal current-reply document viewer and item links | Combine legitimately revealed document fragments across replies, preserve earlier access states, and admit explicitly classified public companion sources. Missing or sealed contents remain unavailable. |
| 4 | G capability-based item actions | Local Ask/Examine/Approach drafts and supported provider moves | Offer meaningful Use actions only when a verified source describes the capability. Keep the user's editable intention and existing draft; clicking never declares success or silently submits a turn. |
| 5 | I deeper unified History | Saved prose/images together, source/version navigation, filters and prompt inspection | Bounded indexing/backfill beyond recoverable saved turns, deduplicate images while retaining their source uses, include additional supplied/display-art provenance, and improve missing/deleted-art and storage-limit recovery. Do not promise recovery of images whose host metadata no longer exists. |
| 6 | Release quality and compatibility | Automated unit/browser/build checks and existing themed mobile layouts | Continue polish throughout each increment. Complete physical Android keyboard, resizing, focus, navigation and theme acceptance; exercise supported host versions, representative image providers and optional companion combinations. Fixture success does not certify a real provider or device. |

The ordering is the current implementation sequence, not a delivery-date estimate. Source/reveal contracts take precedence over downstream document or item-action work. Each increment remains useful with companion extensions absent and ships separately to Testing after verification.

beta.54 delivers opt-in background hold within a prepared reply. It uses compatible available background art, releases at scene/revision boundaries, respects manual replacements and full-scene/page compositions, and leaves generation jobs and failure reporting intact. Cross-reply artwork allocation remains part of the scene/cast work below.

## Boundaries of the current presentation rules

- Template, effect and music actions resolve separately. Scopes, priority, previews and editable saved rules already exist.
- Conditional Gentle/Off covers one-shot effects, including automatic shakes. Text animation and weather retain their existing controls; OS reduced motion stays authoritative.
- Quiet/Mute reduces background music relative to its saved volume. It does not select new tracks, change speech/SFX volume, or generate audio. Extra music-selection policies are possible follow-ups rather than required for this quieting increment.
- Dialogue, current-place and verified paragraph-item conditions can match without an image. Selected-NPC and original-template conditions require retained assigned picture metadata and do not infer discarded planner candidates or physical presence.
- Wider automatic presence tracking is unfinished and must not be advertised as already reliable.

## Image generation follow-ups

Model-aware character budgets, family guidance and manual budget controls shipped in beta.51.
Catalogue-driven NanoGPT sizes, Flux route compatibility and per-picture size/ratio controls
shipped in beta.52. Current public NanoGPT adapter forwarding was inspected; that does not verify
the host version running on a user device.
Remaining: exact native tokenizer counters where public tokenizers are available, additional
provider-specific capability adapters, current-host parameter-forwarding verification, and
opt-in same-scene prompt comparisons. Metadata proves supported fields and limits, not an
artistic optimum. No automatic paid comparison generations are enabled.

beta.53 repairs ensemble prompt rejection, preserves edited repair drafts and adds measured
retry feedback plus a dedicated Fit to budget action. Native tokenizer counters and controlled
prompt comparisons remain unfinished; this repair increment does not add automatic image spending.

## Deferred ideas

Storyboard editing, a bookmark timeline, reusable presentation packs, autonomous simulation and a parallel memory/RPG engine remain deferred. They are not prerequisites for finishing the selected roadmap and will not silently expand the current implementation scope.

Image recovery polish in beta.55 adds a bounded session retry queue, one attempt per selected picture, a Retry unfinished action, completed-picture regeneration, and explicit clear/close cancellation. Quick retries skip review; edited previews retain approval. No autonomous retry loops or persisted paid jobs are introduced. Independent background/cast allocation remains next.
