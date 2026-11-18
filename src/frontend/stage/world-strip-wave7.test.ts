import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createDocumentReader } from './document-reader.js';
import { TrackerMappingsPanel } from '../settings/tracker-mappings.js';
import { TRACKER_MAPPING_FIELDS, normalizeTrackerMappings } from '../../shared/tracker-mappings.js';
import { installFakeDocument } from './stage-test-dom.js';
import { renderWorldAtmosphereStrip, selectWeatherGlyph } from './world-strip.js';

describe('Wave 7 Council A, B & C: Document Reader & World Clock Strip', () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installFakeDocument();
  });

  afterEach(() => {
    restore();
  });

  test('renderWorldAtmosphereStrip hides completely when telemetry is absent and renders SVG glyph + units when present', () => {
    const strip = document.createElement('div');
    renderWorldAtmosphereStrip(strip, null);
    expect(strip.hidden).toBe(true);
    expect(strip.textContent).toBe('');

    renderWorldAtmosphereStrip(strip, {
      time: '9:48 PM',
      date: 'Oct 14',
      temperature: '54°F',
      weather: 'Steady cold rain',
      indoor: true,
      source: 'simtracker',
    });
    expect(strip.hidden).toBe(false);
    expect(strip.querySelector('svg')).not.toBeNull();
    expect(strip.textContent).toContain('9:48 PM');
    expect(strip.textContent).toContain('Oct 14');
    expect(strip.textContent).toContain('54°F');
    expect(strip.textContent).toContain('Steady cold rain outside');
    expect(selectWeatherGlyph({ weather: 'heavy thunderstorm' })).toBe('storm');
    expect(selectWeatherGlyph({ time: '22:15' })).toBe('moon');
  });

  test('createDocumentReader renders Prop Artwork Stage, Observed Physicality, and Transcribed Text without fake text', () => {
    let generated = false;
    const panel = createDocumentReader(
      {
        id: 'document-1',
        name: 'crumpled flyer',
        kind: 'flyer',
        paragraphIndex: 0,
        visualDetails: 'purple ink bleeding across damp paper',
        observations: [{
          paragraphIndex: 1,
          summary: 'hand-drawn map and list of prices',
          material: 'damp paper',
          evidence: 'Purple ink bleeds across the damp paper, smearing a hand-drawn map and a list of prices.',
        }],
        sections: [],
      },
      () => {},
      () => {},
      { onGenerate: () => { generated = true; } },
    );

    const obs = panel.querySelector('[data-document-observations]');
    expect(obs?.textContent).toContain('Observed Physicality');
    expect(obs?.textContent).toContain('hand-drawn map and list of prices');
    const genBtn = panel.querySelector<HTMLButtonElement>('[data-document-art-gen]');
    expect(genBtn).not.toBeNull();
    genBtn?.click();
    expect(generated).toBe(true);
    expect(panel.querySelector('[data-document-empty-text]')?.textContent).toContain('No verbatim text transcribed yet');
  });

  test('TrackerMappingsPanel renders every field in TRACKER_MAPPING_FIELDS without throwing at startup', () => {
    const panel = new TrackerMappingsPanel(() => {});
    for (const field of TRACKER_MAPPING_FIELDS) {
      expect(panel.host.querySelector(`[data-mapping="${field}"]`)).not.toBeNull();
    }
    panel.setConfig(normalizeTrackerMappings({ time: ['worldData.time'], weather: ['weather'] }));
    expect((panel.host.querySelector(`[data-mapping="time"]`) as HTMLInputElement).value).toBe('worldData.time');
    panel.destroy();
  });
});
