# NPC cast-scan discovery — beta.30

User reported only the player appeared while NPCs were available in SimTracker and tooltips. Investigation confirmed three gaps: latest-only tracker collection, unsupported scalar/keyed/YAML appearance records, and no reader-reference source in the scanner. SimTracker's public trackerData.ts/backend.ts support JSON/YAML and name-keyed records; inspected2026-10-14 at https://github.com/prolix-oc/Lumiverse-SimTracker/tree/main/src .

The parser now supports scalar appearance, keyed character records and bounded YAML using yaml2.9.1 (unique keys,limited alias expansion). Cast setup scans up to30 messages/eight recognized blocks per message, takes each exact name's newest usable tracker description, and labels snapshots so historical clothing can be reviewed. Live planning still uses the latest tracker snapshot and does not turn historical presence into current presence.

The scanner also reads current saved reader-reference metadata using readerPresentationFor and selectReaderDossier, validates ownership/source/reveal bounds and matching reading position, and rechecks context freshness. NPC names without visual descriptions are offered as blank drafts with appearance needed; the strict save contract remains unchanged. Replace appearance is disabled/guarded for blank sources. Optional malformed reader metadata produces a notice while tracker/registry suggestions continue. No automatic save,model or image call was added.

Verification:

- Full isolated suite:1,442 pass,0 fail,6,698 assertions across123 files. Separate speech transport:18 pass,0 fail,45 assertions. Total1,460 tests.
- Failing/passing regressions reproduce scalar appearance omission,only-player latest snapshot hiding older NPCs,and parser format gaps. Additional cases cover keyed YAML,multiple blocks,newest usable body,30-message bound,duplicate YAML keys/excess alias expansion,tooltip-only NPCs,name-only strict-save rejection,invalid future projection and corrupt optional turn recovery.
- Chromium cast setup flow passed source preview,draft preservation,blank-source replacement guard,no implicit save,outfit/artwork/Voice compatibility and scope cleanup. Strict typecheck,production build,bundle/version verification,backend static scan and whitespace checks passed.
- Independent review found optional metadata recovery,canonical reader validation and blank overwrite issues; all fixed with regressions. Follow-up reported no remaining important findings.
- Installed Bun1.3.14 initially regenerated an incompatible lockfile and upgraded local dependency resolutions. The original v2 lockfile and installed versions were restored; only yaml2.9.1 is added to manifest/lock. Existing lock entries remain unchanged. Frozen installation with a newer Bun was not tested here.

No live Lumiverse,physical Android or paid provider run was performed. Browser tests use the existing Node adapter. This reads structured available descriptions/revealed references; arbitrary prose-only physical extraction and unverified private companion APIs remain outside scope.
