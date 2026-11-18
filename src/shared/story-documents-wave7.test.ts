import { describe, expect, test } from 'bun:test';
import { linkEntityMentions, normalizeTooltipPreferences } from './dossiers.js';
import { senseDocumentsDeterministically, visibleStoryDocuments } from './story-documents.js';

describe('Wave 7 Council B: Diegetic Document Sensing & Anti-Idiom Gating', () => {
  test('senses physical flyer, bridges anaphoric damp paper alias, and gates future observations strictly by cursor', () => {
    const paragraphs = [
      { text: 'A crumpled flyer skitters out of the stairwell on a wet gust, tumbling across the flagstones until it catches against the toe of your shoe.' },
      { text: 'Purple ink bleeds across the damp paper, smearing a hand-drawn map and a list of prices.' },
      { text: 'Printed across the bottom of the crumpled flyer in bold type, it reads: "Halfmoon Ferry departs at midnight."' },
    ];

    const docs = senseDocumentsDeterministically(paragraphs);
    expect(docs).toHaveLength(1);
    const flyer = docs[0]!;
    expect(flyer.kind).toBe('flyer');
    expect(flyer.name.toLowerCase()).toContain('crumpled flyer');
    expect(flyer.paragraphIndex).toBe(0);
    expect(flyer.aliases?.some((a) => a.toLowerCase().includes('damp paper'))).toBe(true);

    // At paragraph 0, paragraph 1 visual observation MUST NOT leak early!
    const atZero = visibleStoryDocuments(docs, 0);
    expect(atZero).toHaveLength(1);
    expect(atZero[0]!.observations?.every((o) => o.paragraphIndex <= 0)).toBe(true);
    expect(atZero[0]!.observations?.some((o) => o.summary?.includes('purple ink'))).toBe(false);

    // At paragraph 1, visual details from paragraph 1 are revealed.
    const atOne = visibleStoryDocuments(docs, 1);
    expect(atOne[0]!.observations?.some((o) => o.paragraphIndex === 1 && /purple ink/i.test(o.summary ?? ''))).toBe(true);
    expect(atOne[0]!.observations?.some((o) => /hand-drawn map/i.test(o.summary ?? ''))).toBe(true);
  });

  test('anti-idiom guard ignores "mental note" and "take note" in both sensing and entity linking', () => {
    const idiomParagraphs = [
      { text: 'She made a mental note to check the schedule later, taking note of how quiet the platform felt.' },
      { text: 'A faint note of panic crept into his voice on a side note.' },
    ];
    const docs = senseDocumentsDeterministically(idiomParagraphs);
    expect(docs).toHaveLength(0);

    const anchors = linkEntityMentions(
      idiomParagraphs[0]!.text,
      [{
        id: 'e1',
        kind: 'object',
        name: 'note',
        aliases: [],
        firstParagraph: 0,
        facts: [],
      }],
      normalizeTooltipPreferences({ enabled: true, linking: 'all-known' }),
    );
    expect(anchors).toHaveLength(0);
  });
});
