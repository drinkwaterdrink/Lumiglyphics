import type { WorldAtmosphereSnapshot } from '../../shared/contracts.js';

const WEATHER_GLYPHS = {
  storm: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 10.5H3.5a2.5 2.5 0 0 1-.2-5 3.6 3.6 0 0 1 6.9-.9A2.6 2.6 0 0 1 12.6 10.5h-.9"/><path d="M8.5 8.5 6.8 11.5h2.2l-1.5 3"/></svg>',
  rain: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.8A2.4 2.4 0 0 1 3.3 5a3.6 3.6 0 0 1 6.8-.9 2.6 2.6 0 0 1 2.5 5.7"/><path d="m5.3 11.8-.9 2M8.3 11.8l-.9 2M11.3 11.8l-.9 2"/></svg>',
  snow: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.2v11.6M3 5.1l10 5.8M13 5.1l-10 5.8"/><circle cx="8" cy="8" r="1.3"/></svg>',
  fog: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" aria-hidden="true"><path d="M2.5 6h9.5M4 9h9.5M2 12h8.5"/></svg>',
  overcast: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12h7.6a2.4 2.4 0 0 0 .3-4.8 3.6 3.6 0 0 0-6.8-1A2.7 2.7 0 0 0 4.5 12Z"/></svg>',
  moon: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.2 10.2A4.8 4.8 0 0 1 6 3.8a5 5 0 1 0 6.2 6.4Z"/></svg>',
  sun: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="2.7"/><path d="M8 2v1.3M8 12.7V14M2 8h1.3M12.7 8H14M3.8 3.8l.9.9M11.3 11.3l.9.9M12.2 3.8l-.9.9M4.7 11.3l-.9.9"/></svg>',
} as const;

const TOKEN_GLYPHS = {
  time: '<svg viewBox="0 0 16 16" width="12.5" height="12.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.8"/><path d="M8 4.6V8l2.2 1.4"/></svg>',
  date: '<svg viewBox="0 0 16 16" width="12.5" height="12.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.2" y="3.2" width="11.6" height="10.4" rx="1.8"/><path d="M5.2 1.8v2.6M10.8 1.8v2.6M2.2 6.4h11.6"/></svg>',
  temp: '<svg viewBox="0 0 16 16" width="12.5" height="12.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.4 9.5V3.4a1.4 1.4 0 0 0-2.8 0v6.1a2.6 2.6 0 1 0 2.8 0Z"/><path d="M8 6.4v4.1"/></svg>',
} as const;

type GlyphKey = keyof typeof WEATHER_GLYPHS;

export function selectWeatherGlyph(snapshot: WorldAtmosphereSnapshot): GlyphKey {
  const weather = (snapshot.weather ?? '').toLowerCase();
  const tod = (snapshot.timeOfDay ?? snapshot.time ?? '').toLowerCase();
  if (/(?:thunder|storm|lightning|tempest|squall)/.test(weather)) return 'storm';
  if (/(?:rain|drizzle|downpour|shower|sleet)/.test(weather)) return 'rain';
  if (/(?:snow|blizzard|frost|flurr|hail)/.test(weather)) return 'snow';
  if (/\b(?:fog|mist|haze|smog)\b/.test(weather)) return 'fog';
  if (/\b(?:overcast|cloud|gloom|gray|grey)\b/.test(weather)) return 'overcast';
  if (/\b(?:night|midnight|moon|late)\b/.test(tod) || /\b(?:20|21|22|23|00|01|02|03|04):\d{2}|(?:8|9|10|11)\s*p\.?m\.?/i.test(tod)) {
    return 'moon';
  }
  return 'sun';
}

function capitalizeWord(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
}

/** Populate the compact Row-2 topbar strip cleanly without placeholder dashes when context is absent. */
export type WorldStripRenderOptions = {
  documentCount?: number | undefined;
  expanded?: boolean | undefined;
};

export function renderWorldAtmosphereStrip(
  strip: HTMLElement | null,
  snapshot: WorldAtmosphereSnapshot | null,
  options?: WorldStripRenderOptions,
): void {
  if (!strip) return;
  if (!snapshot) {
    strip.hidden = true;
    strip.removeAttribute('role');
    strip.removeAttribute('tabindex');
    strip.removeAttribute('aria-expanded');
    strip.replaceChildren();
    return;
  }

  const timeText = snapshot.time?.trim() || (snapshot.timeOfDay ? capitalizeWord(snapshot.timeOfDay) : '');
  const dateText = snapshot.date?.trim() || (snapshot.season ? capitalizeWord(snapshot.season) : '');
  const tempText = snapshot.temperature?.trim() || '';
  const weatherText = snapshot.weather?.trim() ? capitalizeWord(snapshot.weather) : '';

  if (!timeText && !dateText && !tempText && !weatherText && !(options?.documentCount && options.documentCount > 0)) {
    strip.hidden = true;
    strip.removeAttribute('role');
    strip.removeAttribute('tabindex');
    strip.removeAttribute('aria-expanded');
    strip.replaceChildren();
    return;
  }

  strip.replaceChildren();
  strip.setAttribute('role', 'button');
  strip.tabIndex = 0;
  strip.setAttribute('aria-expanded', String(Boolean(options?.expanded)));
  strip.setAttribute('aria-haspopup', 'dialog');

  const weatherGlyphHtml = WEATHER_GLYPHS[selectWeatherGlyph(snapshot)];
  const glyphWrap = document.createElement('span');
  glyphWrap.className = 'vn-world-glyph';
  glyphWrap.setAttribute('aria-hidden', 'true');
  glyphWrap.innerHTML = weatherGlyphHtml;
  strip.append(glyphWrap);

  const tokens: Array<{ kind: string; text: string; iconHtml: string }> = [];
  if (timeText) tokens.push({ kind: 'time', text: timeText, iconHtml: TOKEN_GLYPHS.time });
  if (dateText) tokens.push({ kind: 'date', text: dateText, iconHtml: TOKEN_GLYPHS.date });
  if (tempText) tokens.push({ kind: 'temp', text: tempText, iconHtml: TOKEN_GLYPHS.temp });
  if (weatherText) {
    tokens.push({
      kind: 'weather',
      text: snapshot.indoor ? `${weatherText} outside` : weatherText,
      iconHtml: weatherGlyphHtml,
    });
  }

  tokens.forEach((tok, idx) => {
    if (idx > 0) {
      const dot = document.createElement('span');
      dot.className = 'vn-world-sep';
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = '|';
      strip.append(dot);
    }
    const span = document.createElement('span');
    span.className = `vn-world-token vn-world-${tok.kind}`;
    const icon = document.createElement('span');
    icon.className = 'vn-world-token-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = tok.iconHtml;
    const text = document.createElement('span');
    text.textContent = tok.text;
    span.append(icon, text);
    strip.append(span);
  });

  if (options?.documentCount && options.documentCount > 0) {
    const docBadge = document.createElement('span');
    docBadge.className = 'vn-world-doc-badge';
    docBadge.dataset.vnWorldDocCount = String(options.documentCount);
    docBadge.textContent = `📄 ${options.documentCount}`;
    strip.append(docBadge);
  }

  const chevron = document.createElement('span');
  chevron.className = 'vn-world-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▾';
  strip.append(chevron);

  if (snapshot.source) {
    strip.dataset.worldSource = snapshot.source;
  }
  strip.hidden = false;
}

export type ScenePostcardModel = {
  locationName?: string | undefined;
  locationImageUrl?: string | undefined;
  lighting?: string | undefined;
  atmosphere?: WorldAtmosphereSnapshot | null;
  presentCast?: ReadonlyArray<{ id: string; name: string }> | undefined;
  documents?: ReadonlyArray<{ id: string; name: string; kind: string }> | undefined;
};

export function createScenePostcardPopover(
  model: ScenePostcardModel,
  handlers: {
    onClose: () => void;
    onOpenLens: () => void;
    onOpenCharacter?: ((charName: string) => void) | undefined;
    onOpenDocument?: ((docId: string) => void) | undefined;
  },
): HTMLElement {
  const card = document.createElement('section');
  card.dataset.vnScenePostcard = '';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', model.locationName ? `${model.locationName} scene summary` : 'Scene summary');
  card.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('header');
  const thumb = document.createElement('div');
  thumb.className = 'vn-postcard-thumb';
  if (model.locationImageUrl) {
    const img = document.createElement('img');
    img.src = model.locationImageUrl;
    img.alt = '';
    thumb.append(img);
  } else {
    thumb.textContent = '📍';
  }

  const titleWrap = document.createElement('div');
  titleWrap.className = 'vn-postcard-title';
  const titleStrong = document.createElement('strong');
  titleStrong.textContent = model.locationName || 'Current Scene';
  const sub = document.createElement('small');
  const atmoParts = [
    model.atmosphere?.time || model.atmosphere?.timeOfDay,
    model.atmosphere?.date || model.atmosphere?.season,
    model.atmosphere?.temperature,
    model.atmosphere?.weather ? (model.atmosphere.indoor ? `${model.atmosphere.weather} outside` : model.atmosphere.weather) : undefined,
    model.lighting,
  ].filter((x): x is string => Boolean(x && x.trim()));
  sub.textContent = atmoParts.join(' · ') || 'Active reading moment';
  titleWrap.append(titleStrong, sub);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'vn-postcard-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close scene postcard');
  closeBtn.onclick = () => handlers.onClose();

  header.append(thumb, titleWrap, closeBtn);
  card.append(header);

  if (model.presentCast?.length) {
    const castRow = document.createElement('div');
    castRow.className = 'vn-postcard-pills';
    for (const c of model.presentCast.slice(0, 6)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vn-postcard-pill';
      btn.dataset.postcardCast = c.name;
      btn.textContent = `👤 ${c.name}`;
      btn.onclick = () => {
        handlers.onClose();
        handlers.onOpenCharacter?.(c.name);
      };
      castRow.append(btn);
    }
    card.append(castRow);
  }

  if (model.documents?.length) {
    const docRow = document.createElement('div');
    docRow.className = 'vn-postcard-pills';
    for (const d of model.documents.slice(0, 4)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vn-postcard-pill';
      btn.dataset.postcardDoc = d.id;
      btn.textContent = `📄 ${d.name}`;
      btn.onclick = () => {
        handlers.onClose();
        handlers.onOpenDocument?.(d.id);
      };
      docRow.append(btn);
    }
    card.append(docRow);
  }

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'vn-postcard-cta';
  cta.dataset.postcardOpenLens = '';
  cta.textContent = 'Open in World Lens →';
  cta.onclick = () => {
    handlers.onClose();
    handlers.onOpenLens();
  };
  card.append(cta);

  return card;
}
