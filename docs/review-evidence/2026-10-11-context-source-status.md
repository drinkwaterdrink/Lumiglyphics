# Beta.12 — optional reference readers and source status

Next C roadmap increment on Testing: LumiBooks published codex and explicitly selected versioned LumiScript reference readers, within the existing Pictures → Context sources section. Both new sources default disabled. No new permission, generation call, companion write, changed image prompt or imported historical snapshot is introduced.

Scope ruling: implement the verified LumiBooks/LumiScript read contracts and status boundary as one reviewable increment. SimTracker custom mapping/normalized evidence, Warp normalized scene evidence, planner entity proposals and precedence/reference rendering remain pending; existing SimTracker visual context and Warp bridges remain supported. Package C and the complete reader roadmap are not claimed finished.

The reader feature-detects newer host RPC capability. Missing producers/permission revocation resolve unavailable, wipes resolve cleared, malformed/foreign/future-version sources resolve invalid. Source reads run concurrently with a 1,500ms response deadline; cancelled and late results cannot refresh another user/chat report. The underlying host RPC has no abort signal, so its work cannot be cancelled by this extension. Backend-only evidence retains source scope and time; LumiBooks facts stay unclassified. Disabled records, noInject/frozen/unknown-state files and secret/knowledge/notes tables are excluded. No imported name or fact reaches the frontend; status/count/freshness is the only response. Snapshot age is labeled after five minutes.

Settings use an optional LumiBooks toggle, explicit LumiScript endpoint save and one Refresh source status action. Invalid endpoint names are rejected without reading another extension. Pending UI refresh has a bounded fallback and cleanup. Changed source settings discard old reports; refresh waits for authoritative source-config saves. Manual source refresh does not block initial reader startup or ordinary planning.

Validation actually run:

- Full isolated suite: 1,318 passed, 0 failed across 110 files; separate speech transport: 18 passed, 0 failed. Total 1,336.
- New tests cover missing/disabled hosts, scoped user/chat rejection, file/record exclusion, wipes/revocation, version/payload/fact/duplicate-ID checks, freshness, deadlines, late cancellation and status-only payloads.
- Review found a source-disable/save/refresh race. A regression first failed with one read while the disable save was pending. A per-user save barrier fixed it; the regression then passed with no read and a final disabled report. Follow-up review found no remaining material issues in this increment.
- Settings browser passed, including save persistence, source reports, endpoint validation and report clearing. Existing image-review and mobile-reader browser suites passed.
- Strict TypeScript, production build, manifest/build-label check, local backend static checks, Lumiverse skill scanner and git diff whitespace checks passed.

Limits: optional providers are mocked in regression tests. No live Lumiverse/LumiBooks/LumiScript deployment was exercised, and no paid model call was made. Local Bun 1.3.14 is below the declared 1.4.0 minimum; the established Node browser adapter and separate speech transport harness were used. Live host RPC endpoint availability and permission policies still need host testing. See integrations/context-sources.md for the verified producer contracts and configuration.
