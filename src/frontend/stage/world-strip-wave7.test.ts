import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createDocumentReader, formatDocumentDisplayTitle } from './document-reader.js';
import { TrackerMappingsPanel } from '../settings/tracker-mappings.js';
import { TRACKER_MAPPING_FIELDS, normalizeTrackerMappings } from '../../shared/tracker-mappings.js';
import { installFakeDocument } from './stage-test-dom.js';
import { createScenePostcardPopover, renderWorldAtmosphereStrip, selectWeatherGlyph } from './world-strip.js';

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

  test('Wave 2: formatDocumentDisplayTitle, Document Reader note editor & Copy observations fallback', () => {
    expect(formatDocumentDisplayTitle('crumpled flyer', 'flyer')).toBe('Crumpled Flyer');
    expect(formatDocumentDisplayTitle('Notice of the Hall', 'notice')).toBe('Notice of the Hall');

    let savedNote = '';
    let examined = false;
    const panel = createDocumentReader(
      {
        id: 'doc-no-visual',
        name: 'intake ledger',
        kind: 'note',
        paragraphIndex: 0,
        observations: [{
          paragraphIndex: 0,
          summary: 'Signed by Pim Dole in faded blue ink',
          evidence: 'A half-drunk mug sits beside the intake ledger signed by Pim Dole.',
        }],
        sections: [],
      },
      () => {},
      () => {},
      {
        customNote: 'Room 47 stamped for autumn term.',
        onSaveNote: (note) => { savedNote = note; },
        onExamineCloser: () => { examined = true; },
      },
    );

    const copyBtn = panel.querySelector<HTMLButtonElement>('footer button[aria-label="Copy revealed observations"]');
    expect(copyBtn).not.toBeNull();
    expect(copyBtn?.disabled).toBe(false);
    expect(copyBtn?.textContent).toBe('Copy observations');
    expect(panel.querySelector('[data-document-empty-text]')?.textContent).toContain('No verbatim text transcribed yet');
    expect(panel.querySelector('[data-document-custom-note]')?.textContent).toContain('Room 47 stamped for autumn term.');

    const examineBtn = panel.querySelector<HTMLButtonElement>('[data-document-examine-closer]');
    expect(examineBtn).not.toBeNull();
    examineBtn?.click();
    expect(examined).toBe(true);

    const editNoteBtn = panel.querySelector<HTMLButtonElement>('[data-document-edit-note]');
    editNoteBtn?.click();
    const noteBox = panel.querySelector<HTMLElement>('[data-document-note-box]');
    expect(noteBox?.hidden).toBe(false);
    const textarea = noteBox?.querySelector('textarea') as unknown as HTMLTextAreaElement;
    textarea.value = 'Signed in red ink at 5:15 PM.';
    panel.querySelector<HTMLButtonElement>('[data-document-save-note]')?.click();
    expect(savedNote).toBe('Signed in red ink at 5:15 PM.');
  });

  test('Wave 2: interactive World Strip doc badge & createScenePostcardPopover callbacks', () => {
    const strip = document.createElement('div');
    renderWorldAtmosphereStrip(
      strip,
      { time: '5:15 PM', weather: 'Cold Rain', temperature: '52°F', source: 'simtracker' },
      { documentCount: 2, expanded: true },
    );
    expect(strip.hidden).toBe(false);
    expect(strip.getAttribute('role')).toBe('button');
    expect(strip.getAttribute('aria-expanded')).toBe('true');
    expect(strip.querySelector('.vn-world-doc-badge')?.textContent).toContain('2');

    let closed = 0;
    let openedLens = 0;
    let openedChar = '';
    let openedDoc = '';
    const card = createScenePostcardPopover(
      {
        locationName: 'Marten House Lobby',
        lighting: 'Warm sconces',
        presentCast: [{ id: 'c1', name: 'Naomi Vance' }],
        documents: [{ id: 'doc-1', name: 'Notice', kind: 'notice' }],
      },
      {
        onClose: () => { closed++; },
        onOpenLens: () => { openedLens++; },
        onOpenCharacter: (name) => { openedChar = name; },
        onOpenDocument: (id) => { openedDoc = id; },
      },
    );
    card.querySelector<HTMLButtonElement>('[data-postcard-cast="Naomi Vance"]')?.click();
    expect(openedChar).toBe('Naomi Vance');
    expect(closed).toBe(1);

    card.querySelector<HTMLButtonElement>('[data-postcard-doc="doc-1"]')?.click();
    expect(openedDoc).toBe('doc-1');
    expect(closed).toBe(2);

    card.querySelector<HTMLButtonElement>('[data-postcard-open-lens]')?.click();
    expect(openedLens).toBe(1);
    expect(closed).toBe(3);
  });
});
