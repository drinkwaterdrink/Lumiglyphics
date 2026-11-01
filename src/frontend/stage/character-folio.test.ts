import { describe, expect, it } from 'bun:test';
import { CharacterFolio } from './character-folio.js';
import { createEmptyCharacterDNA, formatCharacterDNAToPromptClause, formatCharacterDNAToTags, mergeCharacterDNA } from '../../shared/character-dna.js';
import { installFakeDocument } from './stage-test-dom.js';

describe('CharacterFolio & Character DNA', () => {
  it('formats character DNA to prompt clauses and tags correctly', () => {
    const dna = createEmptyCharacterDNA('Nadine Pruitt', 'nadine');
    dna.hair = { color: 'chestnut brown', length: 'shoulder-length', style: 'messy bun' };
    dna.eyes = { color: 'hazel', shape: 'sharp' };
    dna.build = { height: 'petite', bodyType: 'slender', skinTone: 'fair with freckles', gender: 'woman', species: 'human' };
    dna.signatureOutfit = 'stiff canvas work apron over faded sleeveless midi dress';
    dna.distinguishingFeatures = ['clay packed gray under nails', 'ears and neck pink'];

    const clause = formatCharacterDNAToPromptClause(dna);
    expect(clause).toContain('petite slender woman human');
    expect(clause).toContain('fair with freckles');
    expect(clause).toContain('shoulder-length messy bun chestnut brown hair');
    expect(clause).toContain('sharp hazel eyes');
    expect(clause).toContain('stiff canvas work apron');

    const tags = formatCharacterDNAToTags(dna);
    expect(tags).toContain('woman human');
    expect(tags).toContain('fair with freckles skin');
    expect(tags).toContain('shoulder-length messy bun chestnut brown hair');
    expect(tags).toContain('sharp hazel eyes');
    expect(tags).toContain('clay packed gray under nails');
  });

  it('merges DNA patches while respecting locked state', () => {
    const base = createEmptyCharacterDNA('Rena', 'rena');
    base.hair.color = 'silver';
    base.locked = true;

    // Without overrideLocked, locked DNA should reject changes
    const merged = mergeCharacterDNA(base, { hair: { color: 'blonde' } }, false);
    expect(merged.hair.color).toBe('silver');

    // With overrideLocked, changes are accepted
    const forced = mergeCharacterDNA(base, { hair: { color: 'blonde' } }, true);
    expect(forced.hair.color).toBe('blonde');
  });

  it('renders roster and character details in folio UI', () => {
    const restore = installFakeDocument();
    try {
      const folio = new CharacterFolio();
      const el = folio.element;
      expect(el.getAttribute('data-character-folio')).toBe('true');

      const nadine = createEmptyCharacterDNA('Nadine Pruitt', 'nadine');
      nadine.hair.color = 'hazel';
      nadine.locked = true;

      folio.setLibrary({
        nadine
      });

      const rosterItems = el.querySelectorAll('.folio-roster-item');
      expect(rosterItems.length).toBe(1);
      expect(el.querySelector('.folio-hero-title h2')?.textContent).toBe('Nadine Pruitt');
      expect(el.querySelector('.folio-lock-badge')?.textContent).toBe('🔒');
    } finally {
      restore();
    }
  });
});
