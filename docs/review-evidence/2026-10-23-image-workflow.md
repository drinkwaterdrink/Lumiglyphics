# beta.60 — image workflow polish

Continue the cross-system audit with a focused inspector improvement. Existing Shadow DOM, theme variables, approved-request contracts, model budgets and image queue behavior remain authoritative.

## Changes

- Selected-picture statuses distinguish rewriting, template preparation, queued retry and running retry from an earlier failure/completion.
- Saved-request edits promote **Prepare edited preview** to the persistent footer. Quick retry is hidden while such edits exist because it uses the saved scene rather than local wording.
- Preview preparation hides competing quick retries. Failures preserve the draft and restore its preview action.
- Reset edits is available for saved local drafts, not only held reviews.
- Invalid wording/parameters show **Prompt needs attention**. Fixing the fields restores a useful picture/draft state.
- Footer help updates as fields change instead of retaining stale repair/retry instructions.

No writer prompt instructions or provider parameters changed in this increment. Better artistic outputs are not claimed: this makes selecting, repairing and approving the intended wording clearer. The beta.58 model-specific prompting and identity protections remain in force.

## Verification

- New pure state regression failed before implementation, then passed.
- New Chromium workflow regression failed before implementation because the edited-preview action was hidden. Final coverage includes invalid-to-valid draft correction, actual edited request payload, primary action visibility, no competing retry, failed-preview recovery, Reset edits, queued/running status and panel overflow at 320/390/1280px.
- During browser development, the Reset edits check first exposed a collapsed control and then the actual hidden saved-draft Reset control; final test uses the real expanded Prompt actions UI.
- Full unit suite: 1684 passed, 0 failed, 8127 assertions across 143 files; local Bun reports 1.3.14.
- Existing inspector, retry-queue and model-prompt browser suites passed. The latter covers model-specific ceilings, repair failure recovery, frozen review profiles and responsive layouts.
- Final TypeScript/build/bundle/scanner checks recorded with the release.
- Screenshot inspection: `.cache/browser-fixtures/image-workflow-390.png`; final workflow test captures all three widths.
- Physical Android keyboard/screen reader behavior, host integration and live image quality remain unverified. No paid model calls were made.
