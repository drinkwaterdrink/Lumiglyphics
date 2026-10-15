# Quiet reference quick access — beta.29

D2 extends existing Tooltips and Scene references rather than adding another Codex or extraction system. Reading → Tooltips → Reference display → Menu only suppresses inline anchors while preserving enabled category-gated access through the book icon. The master switch remains off by default. The sheet searches visible names/aliases, filters NPCs/locations/items, prioritizes pinned and current-scene entries, and displays conservative known/current/absent/elsewhere labels. Location IDs and recognized location names resolve consistently; unrecognized locations do not imply absence.

Cards opened from the sheet provide Back to references with preserved search/category. Close returns focus to the book button; modal input/select controls participate in the focus trap. The sheet pauses auto/skip and does not advance or alter the composer. Long lists scroll inside the sheet so Close remains reachable. Changing source/cursor/chat closes stale selections. Revealed snapshot/category/suppression gates remain unchanged; pins cannot expose future/private facts.

Validation:

- Full isolated suite:1,435 pass,0 fail,6,684 assertions across123 files. Separate speech transport:18 pass,0 fail,45 assertions. Total1,453 tests. Strict typecheck,production build,bundle/version verification,backend blocked-pattern scan and whitespace checks passed.
- Shared regressions cover menu-only eligibility vs anchors,pin/current ordering,category/suppression/future gates,alias search and consistent location name/ID labels.
- Chromium dossier checks passed at360×800,390×844,844×390 and1200×800, with every shipped theme. Checks cover existing inline cards,quiet search/category/no-results,return filters,keyboard focus,reading-position preservation,disabled tooltips,alias search,32 long-name entries at22px text,visible Close while scrolling,source replacement,and zero external provider requests.
- Existing settings browser verifies menu-only persistence and disabled inline-density control. Existing reader browser checks passed keyboard/touch/history/drafts/theme toolbars/text scaling/reduced motion/UI scaling.
- A source-refresh regression initially lost the book button when identical prose skipped re-rendering. loadTurn now hydrates references after replacing presentation context when text is already complete; browser regression passes.
- Independent read-only review reported no actionable findings in the quiet sheet and visibility lifecycle. Subsequent local robustness checks fixed the identical-text refresh and location-label equivalence with regressions. Mobile screenshot inspected for layout.

No live Lumiverse,physical Android keyboard or paid provider run was performed. Installed Bun1.3.14 is older than declared>=1.4.0; browser checks use the existing Node adapter. References remain limited to available reveal-scoped presentation metadata; no chat-wide biography database is created. Tooltip actions G and in-world documents H remain pending.
