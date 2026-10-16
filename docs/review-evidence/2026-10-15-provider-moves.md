# Provider moves and editable replies - beta.34

Implemented October 15, 2026, as the G2 increment of the approved reader roadmap.

At Your turn, Available moves is an expandable group. Native choices retain their provider, identity and odds. With Reading > Tooltips > Action drafts enabled, a pencil opens Edit as message using the same reply editor as local reference actions. Insertion preserves existing text; replacement is explicit. Conversion creates an ordinary reply without provider-pick metadata, odds or automatic checks. Only normal Send submits it.

The game bridge resolves choices against the current provider/chat snapshot before accepting a pick. Local revisions distinguish refreshed identical choices; refresh clears cached availability. Busy, spent, forged and outdated choices cannot dispatch picks. Providers sharing a choice ID remain distinct. The host accepts the pick before presenting the user's intention. No public bridge payload or permission changes were needed.

The editor rejects stale scene/move snapshots and retains typed edits for recovery. Closing, insertion, reset, turn changes, input gating and disabling actions clear its shell marker. While it is open, the overlapping Image prompts launcher is hidden and then restored. Fixed navigation and the reply composer leave room for scrolling in short landscape viewports without changing saved sheet size.

Verification:

- RED/GREEN cases reproduced duplicate-ID ownership, stale/spent picks and real ImageStudio launcher overlap before their fixes.
- Full isolated suite: 1,456 pass, 0 fail, 6,748 assertions across 124 files. Separate speech transport: 18 pass, 0 fail, 45 assertions. Total: 1,474 tests.
- New game-moves browser suite passed at 360x800 and 844x390 in standard and CYOA modes, using real stage, bridge, ImageStudio and PanelDock. It covers native ownership, ordinary draft conversion, preservation/replacement, stale refresh, cancellation, failed-send recovery, double submission, opt-out, busy moves and touch targets across every theme preset. No external requests were made.
- Existing scene-interactions, dossier and reading browser checks passed.
- Strict typecheck, production build, bundle/version verification, extracted host scanner (no blocked capabilities) and host sandbox initialization passed.
- Fresh independent review and follow-up reported no remaining important findings. Its fixture-ordering note was corrected to match production pick-before-presentation behavior.
- The visual-effects test DOM gained native insertBefore semantics; all 37 focused effects tests and the full suite passed.

The cached public Warp bridge source was inspected. Its current contract exposes provider-owned choices but no entity capability metadata. Capability-dependent Use remains withheld; labels are not treated as proof of entity association. H in-world documents is the next selected package.

No live Warp, paid-provider or physical Android test was performed. Local Bun is 1.3.14 while the project declares >=1.4.0; browser checks use the existing Node adapter. No dependency, lockfile or permission changes were introduced.
