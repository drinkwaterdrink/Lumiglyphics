# APERTURE v4 production integration map

**Scope:** Integrate the supplied APERTURE v4 brief and prototype design into the existing Lumiglyphics extension. The HTML prototype is reference material only; no prototype route or sample operation is copied into production. Preserve the real host lifecycle, controllers, persistence, provenance, and all existing Settings routes.

## Existing production owners

| APERTURE surface | Production owner / behavior |
| --- | --- |
| Full-screen reader and dialogue | `src/frontend/stage/vn-stage.ts`; `DialogueSheet` in `src/frontend/stage/dialogue-sheet.ts` owns resize, hide/restore, safe area, keyboard insets, and persistence. Paragraph advance/history remain in `VnStage`. |
| Shared destinations and workspace state | `src/frontend/stage/reader-workspace.ts`; tool owners are mounted with `WorkspaceSurface` rather than reimplemented. |
| Theme and host chrome | `src/frontend/theme/outer-css.ts`, `reader-shell-css.ts`, `base-css.ts`, and `style-layers.ts`; custom CSS remains the final theme layer. |
| Appearance persistence | `VisualNovelConfig` in `src/config.ts`; reader geometry/opacity in `src/shared/reader-preferences.ts`; live UI in `src/frontend/settings/panel.ts`. |
| World Lens and Cast/Folios | `StageDossiers` in `src/frontend/stage/dossiers.ts` and `dossier-card.ts`; uses revealed, cursor-scoped presentation entities and reference history. Cast/Folios filters to established NPC entries; it does not synthesize hidden facts. |
| Pinned cards / Panels | `PanelDock` in `src/frontend/stage/panel-dock.ts`; existing saved pins, sources, capture, and bridge behavior remain authoritative. |
| Art Studio / Image Library / History | `ImageStudio`, `ImageLibrary`, and `VnStage` history/backlog; queue, review, retry, saved image, and provenance operations stay with their existing controllers. |
| Voice / TTS | `SpeechController`, `SpeechDock`, and `SpeechSettingsSection`; playback remains optional and disabled by default. |
| Host Back/Close | Existing `data-vn-exit` control and `onExit`/deactivation path; Iris close returns to the reader, while Back to Chat invokes the same host path. |

## Integration decisions

- APERTURE is a saved presentation mode, not a replacement theme preset. New installs default to APERTURE light and compact adjustable dialogue. Existing persisted `themePreset` values migrate with APERTURE disabled unless the user already saved the APERTURE flag, so a saved preset is not silently reset.
- The optional APERTURE reader CSS is ordered `base -> preset -> aperture -> user`. Built-in themes remain available when APERTURE is off, and existing custom CSS stays last.
- Dialogue background opacity is normalized across the full `0..1` range and applied to the panel background pseudo-element only; text and controls keep full opacity.
- The Iris menu and compact reader dock route into existing workspace/tools. Lens/Cast use the current source-aware dossier owner; no prototype fixture data or paid operation is introduced.
- All existing settings keys remain present and routed. No release version, deployment, publishing, or release action is in scope.

## Regression focus

1. Normalize old saved theme configurations without turning APERTURE on or changing existing sheet preferences.
2. Verify fresh defaults, light/dark appearance switching, and 0–100% background opacity.
3. Exercise Iris/close/host exit, Panels, Voice, Art Studio, Image Library, History, Lens, and Cast via the real production UI owners.
4. Check safe-area and touch-target bounds at 320×720, 360×800, 390×844, 430×932, 844×390, and desktop widths.
5. Run the requested full suite and bundle checks; no version bump or push.
