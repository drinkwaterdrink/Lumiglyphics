import { describe, expect, it } from 'bun:test';
import { CharacterFolio } from './character-folio.js';
import { createEmptyCharacterDNA, formatCharacterDNAToPromptClause, formatCharacterDNAToTags, mergeCharacterDNA } from '../../shared/character-dna.js';
import { installFakeDocument } from './stage-test-dom.js';

describe('CharacterFolio & Character DNA', () => {
  it('formats character DNA to prompt clauses and tags correctly', () => {
    const dna = createEmptyCharacterDNA('Nadine Pruitt', 'nadine');
    dna.hair = { color: 'chestnut brown', length: 'shoulder-length', style: 'messy bun' };
    dna.eyes = { color: 'hazel', shape: 'sharp' };
    dna.build = {
      age: 'late 20s',
      height: 'petite',
      bodyType: 'slender',
      bust: 'full bust with natural cleavage',
      hipsGlutes: 'curvy hourglass hips',
      skinTone: 'fair with freckles',
      gender: 'woman',
      species: 'human'
    };
    dna.faceFeatures = 'heart-shaped face, soft full lips';
    dna.demeanor = 'guarded posture, shy gaze';
    dna.signatureOutfit = 'stiff canvas work apron over faded sleeveless midi dress';
    dna.distinguishingFeatures = ['clay packed gray under nails', 'ears and neck pink'];

    const clause = formatCharacterDNAToPromptClause(dna);
    expect(clause).toContain('late 20s petite slender woman human');
    expect(clause).toContain('with full bust with natural cleavage');
    expect(clause).toContain('curvy hourglass hips');
    expect(clause).toContain('fair with freckles skin');
    expect(clause).toContain('heart-shaped face, soft full lips');
    expect(clause).toContain('shoulder-length messy bun chestnut brown hair');
    expect(clause).toContain('sharp hazel eyes');
    expect(clause).toContain('stiff canvas work apron');
    expect(clause).toContain('guarded posture, shy gaze');

    const tags = formatCharacterDNAToTags(dna);
    expect(tags).toContain('late 20s');
    expect(tags).toContain('woman human');
    expect(tags).toContain('full bust with natural cleavage');
    expect(tags).toContain('curvy hourglass hips');
    expect(tags).toContain('heart-shaped face, soft full lips');
    expect(tags).toContain('shoulder-length messy bun chestnut brown hair');
    expect(tags).toContain('sharp hazel eyes');
    expect(tags).toContain('clay packed gray under nails');
    expect(tags).toContain('guarded posture, shy gaze');
  });

  it('skips bust and glutes for male characters unless muscular chest/shoulders specified', () => {
    const maleDna = createEmptyCharacterDNA('Darby Pruitt', 'darby');
    maleDna.build = {
      age: 'early 30s',
      height: 'tall',
      bodyType: 'athletic',
      bust: 'full bust', // invalid for male, should be skipped
      hipsGlutes: 'curvy hips', // invalid for male, should be skipped
      gender: 'man',
      species: 'human'
    };
    const maleClause = formatCharacterDNAToPromptClause(maleDna);
    expect(maleClause).not.toContain('bust');
    expect(maleClause).not.toContain('curvy hips');

    // If male has broad chest specified, it is preserved
    maleDna.build.bust = 'broad muscular chest';
    const chestClause = formatCharacterDNAToPromptClause(maleDna);
    expect(chestClause).toContain('broad muscular chest');
  });

  it('active scene outfit overrides signature default outfit so two outfits are never sent', () => {
    const dna = createEmptyCharacterDNA('Cassidy Pruitt', 'cass');
    dna.signatureOutfit = 'worn denim overalls over flannel shirt';
    dna.activeOutfit = 'black evening gown with silver trim';

    const clause = formatCharacterDNAToPromptClause(dna);
    expect(clause).toContain('black evening gown with silver trim');
    expect(clause).not.toContain('worn denim overalls');
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

  it('auto-populates cast roster from scene turn entities and subject candidates without prior saved DNA', () => {
    const restore = installFakeDocument();
    try {
      const folio = new CharacterFolio();
      const el = folio.element;

      const mockTurn: any = {
        chatId: 'scene-chat',
        messageId: 'msg-pruitt',
        speaker: 'Narrator',
        paragraphs: ['Darby Pruitt speaks to Nadine Pruitt in the kitchen.'],
        subjectCandidates: ['Darby Pruitt', 'Nadine Pruitt'],
        presentation: {
          version: 1,
          snapshots: [
            {
              at: { key: 'msg-pruitt', paragraphIndex: 0 },
              entities: [
                { id: 'darby', name: 'Darby Pruitt', kind: 'npc', pinned: false },
                { id: 'nadine', name: 'Nadine Pruitt', kind: 'npc', pinned: true },
                { id: 'kitchen', name: 'Pruitt Farmhouse Kitchen', kind: 'place', pinned: false }
              ]
            }
          ]
        },
        assets: [
          {
            jobId: 'asset-nadine',
            cueId: 'cue-1',
            paragraphIndex: 0,
            status: 'generated',
            imageUrl: '/img/nadine.png',
            stageAsset: { character: 'Nadine Pruitt' }
          }
        ]
      };

      folio.syncFromTurn(mockTurn);
      folio.enter();

      const rosterItems = el.querySelectorAll('.folio-roster-item');
      expect(rosterItems.length).toBe(2);

      const rosterNames = Array.from(el.querySelectorAll('.folio-roster-name')).map(n => n.textContent);
      expect(rosterNames).toContain('Darby Pruitt');
      expect(rosterNames).toContain('Nadine Pruitt');

      // First character should be active by default
      const heroName = el.querySelector('.folio-hero-title h2')?.textContent;
      expect(['Darby Pruitt', 'Nadine Pruitt']).toContain(heroName ?? '');
    } finally {
      restore();
    }
  });
});
