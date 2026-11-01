/**
 * APERTURE v4 Design System & Theme Styles
 * Faithful reproduction of the approved APERTURE v4 visual design tokens,
 * concentric orbital backdrops, iris navigation, refined reader dialogue,
 * World Lens cartography, Character Folios, Workspace, and Settings.
 */

export const APERTURE_ICONS = {
  menu: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  close: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  back: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  book: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>`,
  world: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/></svg>`,
  cast: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19c0-3 3-5 5.5-5s5.5 2 5.5 5M15 14c2.2 0 4.5 1.4 4.5 4.5"/></svg>`,
  image: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
  history: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m12 2 9 4.9-9 4.9L3 6.9 12 2ZM3 11.8l9 4.9 9-4.9M3 16.7l9 4.9 9-4.9"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m12 3 2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/></svg>`,
  panel: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16M9 9h3M9 13h3"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  up: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`,
  down: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
  min: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M5 12h14"/></svg>`,
  search: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  grip: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="9" cy="8" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="16" r="1.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="16" r="1.5"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  document: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  info: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  play: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  check: `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
};

import { APERTURE_CSS_FOUNDATION } from "./aperture/foundation.js";
import { APERTURE_CSS_ROUTE_BAR_READER } from "./aperture/route-bar-reader.js";
import { APERTURE_CSS_WORKSPACE_SETTINGS } from "./aperture/workspace-settings.js";
import { APERTURE_CSS_LENS_FOLIO } from "./aperture/lens-folio.js";
import { APERTURE_CSS_SHEETS_STAGE_PALETTES } from "./aperture/sheets-stage-palettes.js";

/** Full stylesheet: the parts concatenate to the original text, unchanged. */
export const APERTURE_THEME_CSS = [APERTURE_CSS_FOUNDATION, APERTURE_CSS_ROUTE_BAR_READER, APERTURE_CSS_WORKSPACE_SETTINGS, APERTURE_CSS_LENS_FOLIO, APERTURE_CSS_SHEETS_STAGE_PALETTES].join("");
