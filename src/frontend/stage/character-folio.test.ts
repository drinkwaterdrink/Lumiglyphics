import { describe, expect, it } from 'bun:test';
import { CharacterFolio } from './character-folio.js';
import { createEmptyCharacterDNA, formatCharacterDNAToPromptClause, formatCharacterDNAToTags, mergeCharacterDNA } from '../../shared/character-dna.js';
import { installFakeDocument } from './stage-test-dom.js';

describe('CharacterFolio & Character DNA', () => {
  it('retains a draft for the active ID after merging a same-name duplicate',()=>{const restore=installFakeDocument();try{const f=new CharacterFolio();const a=createEmptyCharacterDNA('Nadine','a'),b=createEmptyCharacterDNA('Nadine','b');const l={version:2 as const,revision:1,characters:{a},deleted:{b}};f.setLibrary(structuredClone(l));(f as any).library.a.hair.color='draft';(f as any).dirty.add('a');f.setLibrary(structuredClone(l),false);expect((f as any).library.a.hair.color).toBe('draft');}finally{restore();}});
  it('refreshes unedited server fields while retaining a local draft',()=>{const restore=installFakeDocument();try{const f=new CharacterFolio();const base=createEmptyCharacterDNA('Nadine','nadine');base.hair.color='brown';base.eyes.color='blue';f.setLibrary({version:2,revision:1,characters:{nadine:base}});(f as any).library.nadine.hair.color='silver';(f as any).dirty.add('nadine');const incoming=structuredClone(base);incoming.eyes.color='hazel';f.setLibrary({version:2,revision:2,characters:{nadine:incoming}},false);expect((f as any).library.nadine.hair.color).toBe('silver');expect((f as any).library.nadine.eyes.color).toBe('hazel');}finally{restore();}});
  it('keeps newer local edits when an earlier save acknowledgement arrives',()=>{
    const restore=installFakeDocument();try{const f=new CharacterFolio();f.setLibrary({version:2,revision:0,characters:{nadine:createEmptyCharacterDNA('Nadine','nadine')}});const local=(f as any).library.nadine;local.hair.color='new draft';local.lastUpdated=10;(f as any).dirty.add('nadine');const older=createEmptyCharacterDNA('Nadine','nadine');older.hair.color='old server';older.lastUpdated=9;f.setLibrary({version:2,revision:1,characters:{nadine:older}},true,{id:'nadine',updatedAt:9});expect((f as any).library.nadine.hair.color).toBe('new draft');}finally{restore();}
  });
  it('keeps a discovered and subsequently saved character as one roster entry',()=>{
    const restore=installFakeDocument();try{const folio=new CharacterFolio();folio.syncFromTurn({paragraphs:[],subjectCandidates:['Nadine Pruitt'],assets:[]} as any);folio.setLibrary({version:1,characters:{'nadine pruitt':createEmptyCharacterDNA('Nadine Pruitt')}});expect(folio.element.querySelectorAll('.folio-roster-item')).toHaveLength(1);}finally{restore();}
  });
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

it('never borrows Joanne artwork for Ann and supports canonical ID-only avatars',()=>{const restore=installFakeDocument();try{const f:any=new CharacterFolio();f.syncFromTurn({paragraphs:['Ann speaks'],subjectCandidates:['Ann'],assets:[{jobId:'wrong',paragraphIndex:0,status:'generated',imageUrl:'/joanne',stageAsset:{character:'Joanne'}},{jobId:'right',paragraphIndex:0,status:'generated',imageId:'ann-id',stageAsset:{character:'Ann'}}]} as any);const ann:any=Object.values(f.library).find((c:any)=>c.name==='Ann');expect(ann.avatarUrl).toBe('/api/v1/images/ann-id');}finally{restore();}});
