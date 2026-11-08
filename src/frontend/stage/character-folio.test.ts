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

it('projects only reached Folio names, lore and images and removes them on rewind',()=>{const restore=installFakeDocument();try{
 const f:any=new CharacterFolio();const key={chatId:'chat',assistantMessageId:'m',swipeId:0,sourceFingerprint:'fingerprint',revision:0};
 const entity=(name:string)=>({id:name,name,kind:'npc',facts:[{field:'secret',value:'later fact'}]});
 const turn:any={chatId:'chat',messageId:'m',swipeId:0,sourceFingerprint:'fingerprint',revision:0,paragraphs:['Ann speaks.','Joanne enters.'],subjectCandidates:['Ann','Joanne'],assets:[{jobId:'jo',paragraphIndex:1,status:'generated',imageId:'jo',stageAsset:{character:'Joanne'}}],presentation:{version:1,snapshots:[{at:{key,paragraphIndex:0},entities:[],presentEntityIds:[]},{at:{key,paragraphIndex:1},entities:[entity('Joanne')],presentEntityIds:['Joanne']}]}};
 f.syncFromTurn(turn,0);expect(Object.values(f.library).map((c:any)=>c.name)).toEqual(['Ann']);expect(f.latestTurnText).not.toContain('Joanne');expect(f.loreMap.joanne).toBeUndefined();
 f.syncFromTurn(turn,1);expect(f.loreMap.joanne.facts[0].value).toBe('later fact');expect(f.loreMap.joanne.cgs[0].imageUrl).toContain('/jo');
 f.syncFromTurn(turn,0);expect(f.loreMap.joanne).toBeUndefined();expect(Object.values(f.library).map((c:any)=>c.name)).toEqual(['Ann']);
 f.syncFromTurn({...turn,presentation:{...turn.presentation,snapshots:turn.presentation.snapshots.map((s:any)=>({...s,at:{...s.at,key:{...key,revision:2}}}))}},1);expect(f.loreMap.joanne?.facts).toBeUndefined();
 }finally{restore();}});
it('rewinding preserves saved DNA and unsaved manual changes while clearing story lore',()=>{const restore=installFakeDocument();try{const f:any=new CharacterFolio();const dna=createEmptyCharacterDNA('Joanne','jo');dna.hair.color='silver';f.setLibrary({version:2,revision:1,characters:{jo:dna}});f.library.jo.hair.color='violet draft';f.dirty.add('jo');f.syncFromTurn({paragraphs:['Ann speaks'],subjectCandidates:['Joanne'],assets:[]},0);expect(f.library.jo.hair.color).toBe('violet draft');expect(f.loreMap.joanne).toBeUndefined();f.syncFromTurn(null,0);expect(f.library.jo.hair.color).toBe('violet draft');expect(f.latestTurnText).toBe('');}finally{restore();}});

it('does not discover Ann inside Joanne and cancels a proposal after cursor movement',()=>{const restore=installFakeDocument();try{let cancelled=0;const f:any=new CharacterFolio({onCancelDNA:()=>cancelled++});const t:any={chatId:'c',messageId:'m',swipeId:0,sourceFingerprint:'fingerprint',revision:0,paragraphs:['Joanne speaks.','Ann enters.'],subjectCandidates:['Ann'],assets:[]};f.syncFromTurn(t,0);expect(Object.values(f.library)).toHaveLength(0);f.syncFromTurn(t,1);expect(Object.values(f.library).map((c:any)=>c.name)).toEqual(['Ann']);f.pending=true;f.syncFromTurn(t,0);expect(cancelled).toBe(1);expect(f.pending).toBe(false);}finally{restore();}});

it('resolves nicknames like Bob to Robert without creating duplicate entries', () => {
  const restore = installFakeDocument();
  try {
    const f: any = new CharacterFolio({});
    // Start with Robert
    f.setLibrary({
      characters: {
        'robert': {
          id: 'robert',
          name: 'Robert Vance',
          aliases: [],
          hair: {},
          eyes: {},
          build: {},
          signatureOutfit: '',
          distinguishingFeatures: [],
          colorPalette: [],
          locked: false,
          lastUpdated: 1000
        }
      }
    } as any);

    // Turn mentions "Bob"
    const turn: any = {
      chatId: 'c',
      messageId: 'm',
      swipeId: 0,
      sourceFingerprint: 'f',
      revision: 0,
      paragraphs: ['Bob sits down at the counter.'],
      subjectCandidates: ['Bob'],
      assets: []
    };

    f.syncFromTurn(turn, 0);

    // Should NOT create a second character for Bob!
    const characters = Object.values(f.library) as any[];
    expect(characters).toHaveLength(1);
    expect(characters[0].name).toBe('Robert Vance');
    expect(characters[0].aliases).toContain('Bob');
  } finally {
    restore();
  }
});

it('allows setting primary face reference and secondary outfit reference in the gallery', () => {
  const restore = installFakeDocument();
  try {
    let savedDna: any = null;
    const f: any = new CharacterFolio({
      onSaveDNA: (dna: any) => { savedDna = dna; }
    });

    f.setLibrary({
      characters: {
        'mira': {
          id: 'mira',
          name: 'Mira',
          aliases: [],
          hair: {},
          eyes: {},
          build: {},
          signatureOutfit: '',
          distinguishingFeatures: [],
          colorPalette: [],
          locked: false,
          lastUpdated: 1000
        }
      }
    } as any);

    const turn: any = {
      chatId: 'c',
      messageId: 'm',
      swipeId: 0,
      sourceFingerprint: 'f',
      revision: 0,
      paragraphs: ['Mira smiles.'],
      subjectCandidates: ['Mira'],
      assets: [
        {
          stageAsset: { character: 'Mira', role: 'Scene' },
          status: 'generated',
          imageUrl: 'https://example.com/face.png',
          paragraphIndex: 0
        },
        {
          stageAsset: { character: 'Mira', role: 'Full portrait', attire: 'Winter cloak' },
          status: 'generated',
          imageUrl: 'https://example.com/cloak.png',
          paragraphIndex: 0
        }
      ]
    };

    f.syncFromTurn(turn, 0);
    f.activeSubTab = 'cgs';
    f.renderDetail();

    const char = f.library['mira'];
    expect(char).toBeDefined();

    // Verify buttons in gallery
    const cards = f.detailContainer.querySelectorAll('.folio-cg-card');
    expect(cards.length).toBeGreaterThanOrEqual(2);

    // Click primary reference on first card (most recent image: cloak)
    const firstPrimaryBtn = cards[0].querySelectorAll('button')[0];
    firstPrimaryBtn.click();
    expect(char.referenceImageUrl).toBe('https://example.com/cloak.png');
    expect(char.avatarUrl).toBe('https://example.com/cloak.png');
    expect(savedDna?.referenceImageUrl).toBe('https://example.com/cloak.png');

    // Click secondary reference on second card (earlier image: face)
    const secondOutfitBtn = cards[1].querySelectorAll('button')[1];
    secondOutfitBtn.click();
    expect(char.secondaryReferenceImageUrl).toBe('https://example.com/face.png');
    expect(savedDna?.secondaryReferenceImageUrl).toBe('https://example.com/face.png');
  } finally {
    restore();
  }
});
