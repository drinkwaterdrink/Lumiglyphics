# beta.68 — prompt writer field compatibility and appearance source notes

Testing only; main remains beta.61.

## Report and prompt repair

The user's beta.66 screenshot shows Fit failing after two attempts with "The writer returned invalid prompt fields." This identifies response-field validation, not a provider image rejection. The exact writer response was unavailable.

The strict output parser rejected otherwise usable alternate keys, omitted/null negative fields and explanatory metadata. Regression responses reproduced these failures. A bounded normalizer now accepts:

- One positive string under `prompt`, `positivePrompt`, `positive_prompt` or `positive`.
- Negative strings under `negativePrompt`, `negative_prompt` or `negative`.
- Missing/null negative values retain original negative wording; positive-only routes use their existing empty-negative policy.
- A small explicit set of explanation/count fields is ignored as non-prompt metadata.

Conflicting alternatives, arrays/objects in text fields, multiple JSON objects, unknown visual fields and oversized internal fields remain rejected. No arbitrary flattening/stringification or clipping. The existing combined profile budget, anchor expansion/identity validation, frozen image parameters, effective raw-override validation, cancellation and two-attempt bound remain in place.

Errors now identify the invalid field condition and distinguish writer-format failures from length/identity failures. Format failures direct attention to the story-reader text connection rather than telling the user to shorten cast descriptions. Language-model drafts can still exceed a requested character target; those remain blocked until a valid fit is available.

## Completed cast-source increment

Optional `appearanceOrigin` stores the selected source label alongside its exact base-appearance wording. New explicit source selections record it; older records remain unannotated. Workspace views distinguish matching source notes from edited wording. The backend keeps matching notes across unrelated edits and drops stale notes when appearance changes. These are user-selected annotations, not proof of current source freshness, canon, access rights or per-person prompt mapping. No rendering, reference, image-cache or source-precedence policy changed.

## Verification

- Writer compatibility/ambiguity regressions observed failing before implementation, then passing. Common compatible variants need one writer call. Missing negative constraints are retained. Normalized oversized results are still rejected at the frozen 3000-character example limit and receive measured feedback.
- Full suite: 1714 passed, 0 failed, 8227 assertions across 148 files; local Bun reports 1.3.14.
- Model-prompt Chromium suite passed: prepared budget persistence, caps, blocked drafts, Fit failure recovery and responsive bounds.
- Cast suggestion/workspace Chromium suites passed: source note selection, explicit save/reload, stale-note warning, Discard restoration, preserved defaults/outfits, scoped drafts and gallery/voice workflows.
- TypeScript, production build, bundle verification and backend capability scan checked before publication.
- No paid writer/image calls. The user's exact writer response, live host and physical Android remain unverified. This removes reproduced format brittleness; it does not guarantee every text model returns a valid budgeted prompt.
