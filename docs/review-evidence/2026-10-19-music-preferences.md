# Beta.49 — conditional background-music quieting

Branch: Testing. Base: beta.48 (`bf92988`). This continues F2 and adds a consolidated [remaining roadmap](../ROADMAP.md). Background hold remains next; this increment does not implement independent cast/background generation or broader source reconciliation.

## Delivered

- **Images → Presentation rules → Then → Quiet background music** offers Quiet (35% of saved music volume) and Mute. Scope, priority, save order, previews, CRUD and revision protection use the existing editor. Template, effect and music decisions resolve independently. No enabled image template is required for a music-only rule.
- New plans retain optional per-paragraph music limits without rewriting tracks, sound effects, images, character identities or continuity. Invalid optional metadata cannot block a valid saved story; misaligned playback arrays are ignored. Existing replies remain unchanged.
- The host applies music attenuation before opening cues, during forward reading even without an audio cue, before backward track reconstruction, and on restored/revised/same-turn state. Switching chats does not inherit another turn's cap. Global music volume is the ceiling; volume-setting changes preserve the paragraph attenuation.
- Quieting changes gain rather than starting a new track. Forward volume changes preserve playback position. Backward navigation retains its existing reconstruction of earlier music; this increment does not promise position-preserving scrubbing. Speech and SFX retain their own volume settings. No new audio-generation or provider call is added.
- The audio engine tracks all outgoing BGM crossfades, keeps a normalized fade envelope separate from current global volume and paragraph attenuation, and stops all tracked players on close/destruction. Rapid crossfades cannot evade mute. Repeated volume changes cannot escape the global ceiling.

Conditions retain beta.48 boundaries. Dialogue, current-location and verified paragraph-item conditions can match without images. NPC and template conditions require retained assigned picture metadata and do not reconstruct discarded candidates or infer physical presence.

## Review correction

Independent review reproduced a volume-increase bug: a track started at global volume zero remained silent when volume was raised during its fade. The original track gain still encoded the old global target. A new deterministic regression failed before the fix. Fade progress now targets a normalized envelope of one, and output multiplies the envelope by current global volume and attenuation. The regression and existing upward/downward/mute/crossfade tests pass. Final review found no unresolved Critical or Important issue.

## Fresh local verification

| Check | Result |
|---|---|
| New rule, planning and audio regressions | Failed before implementation; passed afterward |
| Reviewed fade-volume regression | Failed before correction; passed afterward |
| Full isolated unit/integration suite | 1,591 passed; zero failures; 134 files |
| Separate speech transport | 18 passed; combined total 1,609 |
| Restricted schema/preferences/storage/controller suite | 121 passed; overlaps ordinary tests |
| Browser suites | Eight passed: music policies, presentation rules, effect policies, host lifecycle, settings workspace, settings, image inspector and speech |
| Music browser boundaries | Gain before playback, cue-free forward changes, backward track reconstruction, global mute, SFX isolation, chat reset and close |
| Visual check | Mobile music selector and preview screenshot inspected |
| Both TypeScript projects / production builds | Passed; beta.49 entry hashes in `build-verification.json` |
| Local scanner/startup probes | No blocked capabilities; declared `base64_decode`; extension loaded |

The music browser fixture observes host-to-engine calls without playing network media; deterministic audio-engine tests exercise fades and volume output. Browser endpoints use local mocks. No paid generation, audible live-host autoplay, physical Android or external companion acceptance test was run. Local tooling remains Bun 1.3.14 with the existing Node 22.19 browser adapter and speech keepalive; manifest runtime remains Bun >=1.4.0. Scanner/startup probes do not certify a production-host install. Main, user attachments, presets and dependencies are excluded from the release.
