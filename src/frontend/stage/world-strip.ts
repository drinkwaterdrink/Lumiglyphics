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
export function renderWorldAtmosphereStrip(
  strip: HTMLElement | null,
  snapshot: WorldAtmosphereSnapshot | null,
): void {
  if (!strip) return;
  if (!snapshot) {
    strip.hidden = true;
    strip.replaceChildren();
    return;
  }

  const timeText = snapshot.time?.trim() || (snapshot.timeOfDay ? capitalizeWord(snapshot.timeOfDay) : '');
  const dateText = snapshot.date?.trim() || (snapshot.season ? capitalizeWord(snapshot.season) : '');
  const tempText = snapshot.temperature?.trim() || '';
  const weatherText = snapshot.weather?.trim() ? capitalizeWord(snapshot.weather) : '';

  if (!timeText && !dateText && !tempText && !weatherText) {
    strip.hidden = true;
    strip.replaceChildren();
    return;
  }

  strip.replaceChildren();
  const glyphWrap = document.createElement('span');
  glyphWrap.className = 'vn-world-glyph';
  glyphWrap.setAttribute('aria-hidden', 'true');
  glyphWrap.innerHTML = WEATHER_GLYPHS[selectWeatherGlyph(snapshot)];
  strip.append(glyphWrap);

  const tokens: Array<{ kind: string; text: string }> = [];
  if (timeText) tokens.push({ kind: 'time', text: timeText });
  if (dateText) tokens.push({ kind: 'date', text: dateText });
  if (tempText) tokens.push({ kind: 'temp', text: tempText });
  if (weatherText) {
    tokens.push({
      kind: 'weather',
      text: snapshot.indoor ? `${weatherText} outside` : weatherText,
    });
  }

  tokens.forEach((tok, idx) => {
    if (idx > 0) {
      const dot = document.createElement('span');
      dot.className = 'vn-world-sep';
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = '·';
      strip.append(dot);
    }
    const span = document.createElement('span');
    span.className = `vn-world-token vn-world-${tok.kind}`;
    span.textContent = tok.text;
    strip.append(span);
  });

  if (snapshot.source) {
    strip.dataset.worldSource = snapshot.source;
  }
  strip.hidden = false;
}
