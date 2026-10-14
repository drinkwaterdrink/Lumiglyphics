# Mobile History exits — beta.24

The supplied screenshot showed the top History controls obscured by floating stage launchers. History now starts below top navigation; its header/footer do not shrink or scroll with entries. Close has a minimum 44px target, and a persistent Back to reader action provides a second exit. Both retain the reading position and existing focus-return behavior. Overlapping panel/image tools are hidden while History is open and restored afterward; Back to chat remains accessible. Reader reset closes History and clears its temporary overlay state.

Verification:

- The new mobile regression failed before implementation because Close was not a correctly positioned mobile target.
- Final History browser checks passed at 360×640, 390×844 and 844×390 for Lumiverse, Paper Novel, Boxed Console, Midnight Noir and Literature Club. Header/footer exits were tapped after scrolling in both directions; progress remained unchanged and floating tools returned.
- Read-only review found Literature Club would render the new footer text white on a light background. Matching its existing dark-pink close chrome fixed the contrast; the final browser check asserts the rendered foreground. No other actionable review findings.
- Final screenshots for Lumiverse and Literature Club were inspected.
- Existing reading browser checks passed, including history focus return, keyboard navigation, draft preservation and host UI scaling.
- Full isolated suite: 1,411 passed, 0 failed, 6,600 assertions. Speech transport: 18 passed, 0 failed, 45 assertions using the established keepalive preload. Total: 1,429 tests.
- The first full-suite run had 23 constructor failures because the manually built stage mock omitted the new footer button. Updating that fixture to mirror real markup restored all affected tests; production DOM checks use the actual rendered stage.
- Typecheck, production build, manifest/bundle verification, blocked-pattern scan and whitespace checks passed.

No paid generation, live Lumiverse installation or physical Android run was performed. Installed Bun is 1.3.14 against declared >=1.4.0; Chromium uses the existing Node browser adapter. This is a targeted History fix; cast setup remains pending.
