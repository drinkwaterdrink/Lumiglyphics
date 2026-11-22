/**
 * Sleek, luminous duotone SVG stock icons for World Lens & Reference Popcards
 * when an entity does not yet have its own dedicated artwork.
 */

export type EntityIconKind = 'npc' | 'place' | 'object' | 'document' | 'thread';

function svgWrap(inner: string, label: string): string {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-label="${label}" style="display:block;flex:none;color:var(--vn-shell-accent,#86dbb2)">${inner}</svg>`;
}

export function renderEntityStockIcon(kind: EntityIconKind, subHint = ''): string {
  const hint = subHint.trim().toLowerCase();

  if (kind === 'npc') {
    return svgWrap(
      `<circle cx="12" cy="8.5" r="3.6" fill="currentColor" fill-opacity="0.16"/>` +
      `<path d="M5 19.5c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5"/>` +
      `<circle cx="12" cy="12" r="9.5" stroke-opacity="0.28"/>`,
      'Character'
    );
  }

  if (kind === 'place') {
    return svgWrap(
      `<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.1"/>` +
      `<polygon points="12,5.5 14.2,10.2 18.5,12 14.2,13.8 12,18.5 9.8,13.8 5.5,12 9.8,10.2" fill="currentColor" fill-opacity="0.22"/>` +
      `<circle cx="12" cy="12" r="1.4" fill="currentColor"/>`,
      'Location'
    );
  }

  if (kind === 'thread') {
    return svgWrap(
      `<path d="M12 3.5l2.1 5.4 5.4 2.1-5.4 2.1L12 18.5l-2.1-5.4-5.4-2.1 5.4-2.1z" fill="currentColor" fill-opacity="0.2"/>` +
      `<circle cx="18.5" cy="5.5" r="1.2" fill="currentColor"/>`,
      'Story thread'
    );
  }

  if (kind === 'document') {
    if (hint === 'journal' || /\b(?:ledger|register|book|logbook|diary)\b/.test(hint)) {
      return svgWrap(
        `<path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.5v16.5H6a2.5 2.5 0 0 0-2.5 2.5z" fill="currentColor" fill-opacity="0.15"/>` +
        `<path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-6.5v16.5H18a2.5 2.5 0 0 1 2.5 2.5z" fill="currentColor" fill-opacity="0.08"/>` +
        `<path d="M6.5 7.5h2.5M6.5 11h2.5M14.5 7.5H17M14.5 11H17M14.5 14.5H17"/>`,
        'Ledger / Journal'
      );
    }
    if (hint === 'map' || /\b(?:timetable|chart|blueprint|schedule)\b/.test(hint)) {
      return svgWrap(
        `<polygon points="3,6 9,3.5 15,6 21,3.5 21,18 15,20.5 9,18 3,20.5" fill="currentColor" fill-opacity="0.14"/>` +
        `<path d="M9 3.5v14.5M15 6v14.5"/>` +
        `<path d="M6.5 10.5l2.5 1.5 3-2.5 2.5 2" stroke-dasharray="2 2"/>`,
        'Map / Chart'
      );
    }
    if (hint === 'phone') {
      return svgWrap(
        `<rect x="6.5" y="2.5" width="11" height="19" rx="2.4" fill="currentColor" fill-opacity="0.14"/>` +
        `<path d="M9.5 6.5h5M9.5 10h5M9.5 13.5h3.5"/>` +
        `<circle cx="12" cy="18.2" r="0.9" fill="currentColor"/>`,
        'Phone'
      );
    }
    if (hint === 'terminal') {
      return svgWrap(
        `<rect x="3" y="4" width="18" height="13" rx="2" fill="currentColor" fill-opacity="0.15"/>` +
        `<path d="M7 9l2.5 2-2.5 2M11.5 13h4.5M8 21h8M12 17v4"/>`,
        'Terminal'
      );
    }
    if (hint === 'letter') {
      return svgWrap(
        `<rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor" fill-opacity="0.14"/>` +
        `<path d="M3.5 6.5L12 13l8.5-6.5"/>` +
        `<circle cx="12" cy="13" r="1.5" fill="currentColor"/>`,
        'Letter'
      );
    }
    if (hint === 'newspaper') {
      return svgWrap(
        `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h11A1.5 1.5 0 0 1 18 5.5V19a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity="0.14"/>` +
        `<path d="M18 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2h-2M7.5 8h7M7.5 11.5h7M7.5 15h4.5"/>`,
        'Newspaper'
      );
    }
    // notice, poster, flyer, receipt, pamphlet, note
    return svgWrap(
      `<path d="M6 3.5h8.5L19 8v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5z" fill="currentColor" fill-opacity="0.14"/>` +
      `<path d="M14.5 3.5V8H19M8.5 11.5h7M8.5 15h7M8.5 18.2h4.5"/>`,
      'Document'
    );
  }

  // kind === 'object' (Items & Artifacts)
  if (/\b(?:sword|blade|dagger|knife|katana|axe|spear|bow|halberd|rapier)\b/.test(hint)) {
    return svgWrap(
      `<path d="M19.5 4.5l-9.8 9.8M14.5 4.5h5v5" fill="currentColor" fill-opacity="0.16"/>` +
      `<path d="M6.8 11.8l5.4 5.4M4.5 19.5l3.2-3.2M4.5 16.5l3 3"/>`,
      'Weapon'
    );
  }
  if (/\b(?:key|lockpick)\b/.test(hint)) {
    return svgWrap(
      `<circle cx="7.5" cy="14.5" r="3.5" fill="currentColor" fill-opacity="0.16"/>` +
      `<path d="M10.2 12l8.3-8.3M16 6.2l2.3 2.3M13.5 8.7l2 2"/>`,
      'Key'
    );
  }
  if (/\b(?:potion|vial|flask|elixir|bottle)\b/.test(hint)) {
    return svgWrap(
      `<path d="M9.5 3.5h5M10.5 3.5v4l-4.6 7.4A3 3 0 0 0 8.4 19.5h7.2a3 3 0 0 0 2.5-4.6L13.5 7.5v-4" fill="currentColor" fill-opacity="0.16"/>` +
      `<path d="M7.5 14.5h9"/>`,
      'Potion / Vial'
    );
  }
  if (/\b(?:ring|gem|amulet|crystal|jewel|medallion|locket|pendant)\b/.test(hint)) {
    return svgWrap(
      `<polygon points="12,3.5 18.5,8.5 12,20.5 5.5,8.5" fill="currentColor" fill-opacity="0.18"/>` +
      `<path d="M5.5 8.5h13M9 8.5l3 12 3-12"/>`,
      'Relic / Gem'
    );
  }
  // Default luminous artifact crest
  return svgWrap(
    `<polygon points="12,3 19.5,7.5 19.5,16.5 12,21 4.5,16.5 4.5,7.5" fill="currentColor" fill-opacity="0.15"/>` +
    `<path d="M12 3v18M4.5 7.5L12 12l7.5-4.5"/>`,
    'Artifact'
  );
}
