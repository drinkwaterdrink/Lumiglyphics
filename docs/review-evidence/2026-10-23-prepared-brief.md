# beta.64 — prepared picture brief and model explanation

Testing-only continuation of the approved cohesive-experience plan. Main remains beta.61.

## Delivered

- A collapsible prepared brief above the prompt editor shows retained subjects, moment, scene, composition, framing, lighting and template. Metadata is displayed as inert text; long values scroll within bounded rows.
- The brief states that prompt wording is authoritative. Free-text/negative/parameter edits flag the brief as unchanged preparation notes; no model is called to reinterpret a draft.
- Links open/focus existing prompt, subject, template and output controls without replacing fields or submitting work. Unavailable actions are disabled. Invalid parameter JSON sends output navigation to the offending editor.
- Model explanation distinguishes live metadata captured for the request, bundled catalogue, manual ceilings, family writing guidance and unverified fallback support. Positive-only routes and square-only output capabilities are explicit.
- Current draft output settings and any saved output-selection decision are separately labelled. Raw overrides remain authoritative and their contents are not copied into the explanation. Unknown output evidence is labelled unavailable.
- Missing preparation metadata produces an unavailable note rather than inferred details from current settings. Planning hides stale briefs. Unchanged content nodes are preserved across input events.

No shared-style preset is guessed from the current config: the request does not retain a separate style snapshot. A compiler-backed style snapshot for future requests remains a follow-up. This increment does not alter prompt construction, provider parameters, approval or paid-work policy.

## Verification

- Projection tests observed failing before implementation, then passed: saved facts, edited drafts, no style invention, source strength, positive-only/square-only routes, raw override privacy and saved nearest-size decisions versus edited output.
- Full suite: 1696 passed, 0 failed, 8165 assertions across 145 files; local Bun reports 1.3.14.
- New Chromium suite at 320/390/1280px: inert markup, correct notes, capability explanation, focus/navigation, draft preservation, no outgoing requests from browsing, invalid-JSON recovery, unavailable metadata and hiding stale notes during planning.
- Existing inspector suite passed: draft switching, focus, held approval, rewrite restoration and terminal states. Model-prompt/workflow suites additionally checked before release.
- A parallel browser run initially failed because suites bundling the same entrypoint shared a fixed output filename. The fixture server now uses a unique output per build; the brief/workflow suites then passed concurrently. The brief test also explicitly waits for fixture readiness.
- TypeScript, production build, bundle validation and backend capability scanner checked for release.
- Screenshot inspection: `.cache/browser-fixtures/prepared-brief-390.png`.
- Physical Android, screen-reader behavior, host/provider integration and artistic quality remain unverified. No paid model calls, dependencies or storage migrations.
