# Saved-place lookup invalidation — beta.22

## Delivered

Audit A1 is addressed: a place-art lookup captures its originating user/chat management epoch, checks it after storage reads and host image verification, and before trying another compatible variant. Reset, forget or preferred-variant changes invalidate the pending result. Unrelated user/chat changes do not invalidate it. Existing storage schemas, image ownership checks and host images are preserved.

Ruling: ship this bounded reliability fix before the image library. Other audit findings and selected features remain pending; this increment does not claim that all prerequisites are complete.

## Verification

- Four new deterministic cases failed before the fix by returning the stale image: reset/forget/select during gallery verification and reset during a storage snapshot read. All pass after epoch validation.
- Focused location-art suite: 10 passed, 0 failed, 21 assertions, including unrelated user/chat reset isolation.
- Complete test coverage: 1,393 isolated tests across 120 files plus 18 speech transport tests, 0 failures; 6,593 assertions total.
- The original `bun run test` and a separate unmodified transport run stalled at the speech timeout cases. Both were stopped. The established test-only keepalive preload completed all 18 transport tests; no production timeout behavior was changed. Installed Bun is 1.3.14; project metadata requires >=1.4.0.
- Full TypeScript check, production build, manifest/bundle verification, backend blocked-pattern scan and whitespace check passed.
- Separate read-only review found no actionable issues within A1's changed helper/tests. Invalidation of jobs after a lookup has already completed is outside this fix.

No paid generation, live Lumiverse installation or physical Android session was performed. This backend-only change adds no frontend controls, dependencies or permissions. The previous-message image library is not implemented in beta.22.
