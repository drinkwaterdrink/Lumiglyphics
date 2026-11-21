import { describe, expect, test } from 'bun:test';
import { alignSpanInParagraph, hasTokenOverlap, normalizeForGroundMatch } from './grounding.js';

describe('Wave 1 shared grounding utilities', () => {
  test('normalizeForGroundMatch cleans Braille Pattern Blank (\\u2800), inline tags, curly quotes, and emphasis', () => {
    const raw = '<cornflower>“Watch\u2800the\u2800<i>third</i>\u2800step—don’t\u2800*slip*,”</cornflower>\u2800she\u2800said.';
    expect(normalizeForGroundMatch(raw)).toBe('"watch the third step-don\'t slip," she said.');
  });

  test('preserves true Braille characters when actual Braille dots (U+2801-U+28FF) exist', () => {
    const realBraille = '⠁\u2800⠃';
    expect(normalizeForGroundMatch(realBraille)).toBe('⠁\u2800⠃');
  });

  test('alignSpanInParagraph resolves exact, preset-normalized, and fuzzy spans back to real offsets', () => {
    const paragraph = 'You\u2800spot\u2800<cornflower>a\u2800*chalked\u2800notice*</cornflower>\u2800pinned\u2800to\u2800the\u2800board.';
    const normalizedHit = alignSpanInParagraph(paragraph, 'a chalked notice');
    expect(normalizedHit).not.toBeNull();
    expect(paragraph.slice(normalizedHit!.start, normalizedHit!.end)).toContain('chalked');

    const fuzzyPara = 'She unfolded the yellowed shipping ledger and read the final line aloud.';
    const fuzzyHit = alignSpanInParagraph(fuzzyPara, 'unfolded yellowed shipping ledger and read final line');
    expect(fuzzyHit).not.toBeNull();
    expect(fuzzyHit!.matchType).toBe('fuzzy');
    expect(fuzzyPara.slice(fuzzyHit!.start, fuzzyHit!.end)).toContain('yellowed shipping ledger');
  });

  test('hasTokenOverlap accepts minor punctuation/conjunction variants while rejecting hallucinations', () => {
    expect(hasTokenOverlap('dry and clipped cadence with a faint burr', 'dry, clipped cadence', 0.8)).toBe(true);
    expect(hasTokenOverlap('Mira: known role.', 'inferred role', 0.8)).toBe(false);
    expect(hasTokenOverlap('Mira carries the black key.', 'a cursed key', 0.8)).toBe(false);
  });
});
