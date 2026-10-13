# Prompt regeneration and combined budget — beta.21

## Delivered

- Image prompts → Regenerate prompt rerolls a held preview through the configured story-reader text connection. It prepares a fresh approval ID rather than dispatching an image or reformatting the same template.
- Completed/failed generated pictures use the existing single-picture replacement path with forced review and previous usable art retained.
- The text writer targets 2,750–2,900 combined positive/negative characters; measured rewrite output must be at most 2,950. The final 3,000-character guard remains authoritative.
- Over-budget compiled requests get a bounded shortening pass, with one corrective retry for invalid output. Instructions prioritize verbose negatives and redundancy. Failed repair retains the complete request for manual review; it cannot dispatch over budget.
- Exact subject/appearance wording is protected when present in the compiled request. Image parameters and references remain frozen within a held preview, and host-managed caption copies are synchronized after rewriting.
- Raw prompt overrides are checked in object and JSON-string form. Oversized or conflicting wording is rejected with instructions to fix/remove the override in the connection.
- Rewritten requests cannot populate the original scene-cache or persistent-art identity. No dependencies or permissions added.
- The potential feature/update/mechanics catalog contains 20 candidates grounded in the earlier audit/research. These proposed systems were not implemented in this release.

## Evidence

- Rewrite tests initially failed with the missing implementation, then passed for writer-connection selection, user scoping, parameter preservation, combined-length repair and cancellation.
- The JSON-string raw-override regression was observed failing before the guard handled the host's string representation, then passed. Conflicting hidden prompt overrides are also rejected.
- Approval-gate tests cover exclusive reroll ownership, duplicate approval/reroll, restoration after failure, explicit approval of fresh wording and cancellation rejecting late results.
- Controller integration verifies cross-user rejection, a text reroll with no image call, fresh approval IDs, completed-picture replacement and preservation of previous art.
- Pipeline integration verifies automatic oversized-request shortening before review and no dispatch of over-limit automatic/callback requests.
- Appearance regression rejects a writer result that omits the protected appearance and accepts a corrected result containing the exact phrase.
- Final isolated suite: **1,388 passed, 0 failed**, 6,540 assertions across 120 files. Separate speech transport suite: **18 passed, 0 failed**, 45 assertions. **1,406 tests total**.
- Full TypeScript check, production build, bundle/version verification, backend blocked-pattern scanner and whitespace checks passed.
- Chromium image-review, settings and mobile-reader fixtures passed. New browser assertions cover held/completed reroll routing, disabled duplicate actions, failure recovery, fresh editable wording and mobile footer visibility. The mobile screenshot was inspected.

## Limits

No paid text/image generation, live Lumiverse installation or physical Android IME session was run. Tests use controlled responses; semantic fidelity and provider image quality still need review with real models. Sparse scenes may stay shorter; filling the budget is not a quality guarantee. Unsupported or missing text connections preserve manual recovery rather than fabricating a successful rewrite.

Already-running text-generation calls may continue at the host/provider after local cancellation or timeout; late results cannot update the preview. Cache-only cues outside the generation budget retain their existing replacement restriction. Old stored prompts are not rewritten merely by opening the reader.

The available Bun runtime is 1.3.14; package metadata declares Bun >=1.4.0. The existing Node browser adapter was used for Chromium fixtures. The earlier failed suite assertion expected the obsolete 2,500–2,800 target and was updated to the new target before the final green suite.
