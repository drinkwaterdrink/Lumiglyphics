# beta.53 — oversized prompt recovery

## Report and reproduced failures

The supplied beta.51 screenshots show a blocked Qwen draft with 5,825 positive and 192
negative characters (6,017 combined), followed by the generic rewrite failure. The complete
prompt and actual model responses were not supplied, so the exact provider attempt cannot
be replayed. Local regression cases reproduce two independent rejection bugs:

- A correct ensemble rewrite was rejected if it rearranged the complete cast-description
  block, because the previous validator required that whole block verbatim.
- A valid prompt below the actual model ceiling could be rejected for exceeding the smaller
  internal safety target. Targets now guide generation; the actual ceiling validates it.

## Fixes and continued polish

- Ensemble protection now retains every named subject and supplied appearance clause with
  its own person while allowing block/phrase ordering to change. Missing or swapped facts
  still fail validation; no cast member is automatically dropped. Legacy single-person
  exact-phrase protection remains in place.
- Length retry receives the measured failed candidate, a lower target and its actual size.
  Invalid JSON/fields, missing identities and excess length produce specific final reasons.
  Common fenced/prose JSON wrappers and text-block responses are supported without evaluation.
- Fit to budget replaces Rewrite prompt for oversized drafts. It uses the current edited
  text and parameter draft, including when preparing a replacement for a cancelled picture.
  Invalid JSON is caught locally before entering a busy state. Source/revision boundaries
  still clear stale drafts; cancellation within the same source preserves replacement edits.
- Explicit saved-picture repair skips redundant automatic repair of the old compiled prompt.
  Repair inputs may be oversized, but outputs must pass the frozen budget before approval.
- Ensemble planning reserves 1,800 characters for the roster instead of the single-person
  700-character estimate, reducing future overshoot. Per-picture repairs leave saved styles
  and templates unchanged.
- Approval ownership, cancellation, reference/parameter protections and per-picture scope
  remain enforced. Repair uses text tokens and does not start an image request automatically.

## Verification

Regression tests cover ensemble reordering, swapped appearances, near-ceiling acceptance,
measured retry feedback, wrapped JSON, current oversized edits, held/saved controller recovery,
and isolation from another already-approved picture. Browser QA recreates the reported 6,017
character size, confirms current edits are sent, checks failure recovery/dismissal and local
JSON errors, and verifies cancelled-picture repair still requires approval.

Final verification:

- `bun test --parallel=4`: **1,641 passed, zero failed**, across 138 files.
- Full TypeScript check, production build and manifest/static-capability checks passed.
- Lumiverse debugger bundle scanner: no common blocked patterns found.
- Node/Playwright model-prompt browser checks passed, including the reported combined size,
  current-draft payloads, JSON-error recovery, cancellation recovery and all existing theme checks.
- Browser screenshot inspected: `.cache/model-prompt-research/prompt-repair-mobile.png`
  (ignored local QA artifact). No live DeepSeek or
image-provider requests were made. This fixes reproduced rejection paths and adds diagnostics;
it does not promise that every text model will successfully compress every possible scene.
