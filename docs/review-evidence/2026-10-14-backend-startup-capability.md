# Backend startup capability — beta.31

The reported beta.30 startup failure was reproduced with Lumiverse's actual backend build target and safety scanner. The host builds `src/backend.ts` with `--target bun`; our local build previously used `--target browser` for both entries. The Bun build includes YAML's Node binary helper, `node_buffer.Buffer.from(src, "base64")`, which triggers the host's base64 decoding rule. The browser build did not reproduce that rule. This was a packaging validation gap in beta.30.

The manifest now declares only `base64_decode`, the documented capability for legitimate binary decoding. No dynamic execution capability or additional runtime API permissions were added. The existing audio import decoder and bundled library helpers are legitimate binary handling. Settings and storage identifiers are unchanged.

Local build targets now match the host: Bun backend, browser frontend. Bundle verification requires the declaration when decoding helpers are present; `verify` now includes bundle verification. These conservative local checks remain distinct from the host scanner.

Validation on 2026-10-14:

- Extracted the public host's scanner functions without changing their logic from `src/spindle/manager.service.ts` (latest file commit `c629e3b5bff18ff62739c25ddd1dcb1cca85cced`, downloaded source SHA256 `a8e98064054f3e8c9be6993b9c8e833db72f75dedb373272110f52fb141545fa`). Only host application imports/types were replaced with a small standalone type/capability-validation harness in the ignored research cache.
- Before the manifest fix, the host-target bundle produced `blocked: ["base64 decoding"]` with that scanner. After declaring `base64_decode`, the release bundle produced `blocked: []`.
- The strengthened local verifier failed on the missing declaration before the fix and passed afterward.
- Strict typecheck, production build and bundle/version verification passed. Tracker and cast-context regression tests: 19 pass, 0 fail, 31 assertions. No runtime behavior was changed in this patch.
- No live Lumiverse installation or physical Android test was performed. Local Bun is 1.3.14; the project declares Bun >=1.4.0. Dependencies and lockfile were not changed in this patch.

References: [host scanner/build implementation](https://github.com/prolix-oc/Lumiverse/blob/c629e3b5bff18ff62739c25ddd1dcb1cca85cced/src/spindle/manager.service.ts), [documented capabilities](https://docs.lumiverse.chat/getting-started/capabilities/).

Update Lumiglyphics from Testing to beta.31, then restart it if it remains on Starting. Reinstallation or deleting saved settings is not required by this fix.
