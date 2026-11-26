import { describe, expect, it } from 'bun:test';
import { normalizeTooltipPreferences } from '../../shared/dossiers.js';
import { DossierCard } from './dossier-card.js';
import { StageDossiers } from './dossiers.js';
import { installFakeDocument, FakeNode } from './stage-test-dom.js';

describe('DossierCard & World Lens Header', () => {
  it('renders sticky top header with Back to Reading button and Close button in overview mode', () => {
    const restore = installFakeDocument();
    try {
      const mount = new FakeNode('div');
      let closed = false;
      const card = new DossierCard(mount as unknown as HTMLElement, () => { closed = true; }, () => false);

      const mockEntries = [
        {
          entity: { id: 'darby', name: 'Darby Pruitt', kind: 'npc' as const, aliases: [] },
          current: true,
          pinned: false,
          note: undefined
        }
      ];

      const trigger = new FakeNode('button');
      card.openTray(mockEntries as any, trigger as unknown as HTMLElement, () => {});

      const header = card.host.querySelector('.dossier-topbar-header');
      expect(header).not.toBeNull();

      const backBtn = card.host.querySelector('.workspace-back-btn');
      expect(backBtn).not.toBeNull();
      expect(backBtn?.textContent).toContain('Back to Reading');

      const closeBtn = card.host.querySelector('.dossier-close-btn');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.textContent).toContain('×');

      // Clicking back button should trigger close callback
      (backBtn as unknown as HTMLButtonElement)?.click();
      expect(closed).toBe(true);
    } finally {
      restore();
    }
  });

  it('triggers folioOpener callback when Open character folio is clicked for an NPC', () => {
    const restore = installFakeDocument();
    try {
      const mount = new FakeNode('div');
      const card = new DossierCard(mount as unknown as HTMLElement, () => {}, () => false);

      let openedChar: string | null = null;
      card.setFolioOpener((name) => {
        openedChar = name;
      });

      const mockEntries = [
        {
          entity: { id: 'nadine', name: 'Nadine Pruitt', kind: 'npc' as const, aliases: [] },
          current: true,
          pinned: true,
          note: undefined
        }
      ];

      const trigger = new FakeNode('button');
      card.openTray(mockEntries as any, trigger as unknown as HTMLElement, () => {});

      const pillBtn = card.host.querySelector('[data-present-cast-pill="Nadine Pruitt"]');
      expect(pillBtn).not.toBeNull();
      expect(pillBtn?.textContent).toContain('Nadine Pruitt');

      (pillBtn as unknown as HTMLButtonElement)?.click();
      expect(openedChar as string | null).toBe('Nadine Pruitt');
    } finally {
      restore();
    }
  });

  it('renders Folio shortcut chip and Add Reference button, allowing manual reference creation', () => {
    const restore = installFakeDocument();
    try {
      const mount = new FakeNode('div');
      const card = new DossierCard(mount as unknown as HTMLElement, () => {}, () => false);

      let openedFolio = false;
      card.setFolioOpener(() => {
        openedFolio = true;
      });

      const mockEntries = [
        {
          entity: { id: 'flat-3', name: 'Flat 3', kind: 'place' as const, aliases: [] },
          current: true,
          pinned: false,
          note: undefined
        }
      ];

      const trigger = new FakeNode('button');
      card.openTray(mockEntries as any, trigger as unknown as HTMLElement, () => {});

      const folioShortcut = card.host.querySelector('.folio-shortcut-chip');
      expect(folioShortcut).not.toBeNull();
      (folioShortcut as unknown as HTMLButtonElement)?.click();
      expect(openedFolio).toBe(true);

      const addRefBtn = card.host.querySelector('.add-ref-chip');
      expect(addRefBtn).not.toBeNull();

      const addRefPanel = card.host.querySelector('.add-ref-panel');
      expect(addRefPanel).not.toBeNull();
      expect((addRefPanel as unknown as HTMLElement)?.style.display).toBe('none');

      // Click to open panel
      (addRefBtn as unknown as HTMLButtonElement)?.click();
      expect((addRefPanel as unknown as HTMLElement)?.style.display).toBe('block');

      // Fill in and save
      const nameInput = addRefPanel?.querySelector('[data-add-ref-name]') as unknown as HTMLInputElement;
      const descInput = addRefPanel?.querySelector('[data-add-ref-desc]') as unknown as HTMLTextAreaElement;
      const saveBtn = addRefPanel?.querySelector('[data-add-ref-save]') as unknown as HTMLButtonElement;

      nameInput.value = 'Carved Yew Staff';
      descInput.value = 'Carved yew staff encrusted in diamonds wrapped in vines';
      saveBtn?.click();

      expect((addRefPanel as unknown as HTMLElement)?.style.display).toBe('none');
      const lensTitle = card.host.querySelector('.world-lens h3');
      expect(lensTitle?.textContent).toBe('Carved Yew Staff');
    } finally {
      restore();
    }
  });
  it('renders edit and delete buttons on fact rows in reference card and allows editing/deleting facts', () => {
    const restore = installFakeDocument();
    try {
      const mount = new FakeNode('div');
      const card = new DossierCard(mount as unknown as HTMLElement, () => {}, () => false);

      const dossier = {
        entity: { id: 'cedar-loft', name: 'The Cedar Loft', kind: 'place' as const, aliases: [] },
        facts: [
          { field: 'description', value: 'High cedar wood ceiling with shattered crates on the floor', source: { provider: 'model' as const } }
        ],
        state: {
          description: 'High cedar wood ceiling with shattered crates on the floor'
        }
      };

      const prefs = {
        fieldGroups: {},
        rememberReferences: false,
        maxFactChars: 320,
        pinnedEntities: [],
        overrides: []
      };

      const trigger = new FakeNode('button');
      card.open(dossier as any, prefs as any, 'c1', trigger as unknown as HTMLElement);

      const editBtn = card.host.querySelector('.fact-edit-btn') as unknown as HTMLButtonElement;
      expect(editBtn).not.toBeNull();
      const delBtn = card.host.querySelector('.fact-del-btn') as unknown as HTMLButtonElement;
      expect(delBtn).not.toBeNull();

      // Click edit
      editBtn.click();
      const input = card.host.querySelector('.fact-edit-input input') as unknown as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe('High cedar wood ceiling with shattered crates on the floor');

      // Edit value and save
      input.value = 'High cedar wood ceiling with golden lanterns';
      const saveBtn = card.host.querySelector('.fact-edit-input button') as unknown as HTMLButtonElement;
      saveBtn.click();

      expect(dossier.facts[0]?.value).toBe('High cedar wood ceiling with golden lanterns');
      const textSpan = card.host.querySelector('.fact-value-text');
      expect(textSpan?.textContent).toBe('High cedar wood ceiling with golden lanterns');

      // Click delete
      delBtn.click();
      expect(dossier.facts.length).toBe(0);
    } finally {
      restore();
    }
  });

  it('removes People tab, persists + Add Reference via storyDnaRequester, and renders Connected Atlas SVG', () => {
    const restore = installFakeDocument();
    try {
      const host = new FakeNode('div');
      const card = new DossierCard(host as unknown as HTMLElement);
      const sentBodies: any[] = [];
      card.setStoryDnaRequester((body) => sentBodies.push(body));
      card.setStoryDna({
        revision: 1,
        locations: {
          'flat-3': {
            id: 'flat-3',
            name: 'Flat 3',
            aliases: ['The Loft'],
            environmentDescription: 'Cedar loft above the harbor',
            persistentElements: ['oak desk'],
            connectedLocations: ['Courtyard'],
            lastUpdated: 100,
          },
          courtyard: {
            id: 'courtyard',
            name: 'Courtyard',
            aliases: [],
            environmentDescription: 'Rain-slick cobblestones',
            persistentElements: [],
            connectedLocations: ['Flat 3'],
            lastUpdated: 101,
          },
        },
        items: {},
      });

      const entries = [
        { entity: { id: 'flat-3', name: 'Flat 3', kind: 'place' as const, aliases: ['The Loft'] }, current: true, pinned: false, note: undefined },
        { entity: { id: 'courtyard', name: 'Courtyard', kind: 'place' as const, aliases: [] }, current: false, pinned: false, note: undefined },
        { entity: { id: 'nadine', name: 'Nadine Pruitt', kind: 'npc' as const, aliases: [] }, current: true, pinned: true, note: undefined },
      ];
      const trigger = new FakeNode('button');
      card.openTray(entries as any, trigger as unknown as HTMLElement, () => {});

      const catLabels = Array.from(card.host.querySelectorAll('[data-reference-categories] button')).map((b) => b.textContent);
      expect(catLabels.some((t) => t?.includes('People'))).toBe(false);

      // + Add Reference -> save_item
      const addBtn = card.host.querySelector('.add-ref-chip') as unknown as HTMLButtonElement;
      addBtn.click();
      const nameInput = card.host.querySelector('[data-add-ref-name]') as unknown as HTMLInputElement;
      const kindSelect = card.host.querySelector('[data-add-ref-kind]') as unknown as HTMLSelectElement;
      const descInput = card.host.querySelector('[data-add-ref-desc]') as unknown as HTMLTextAreaElement;
      nameInput.value = 'Carved Yew Staff';
      kindSelect.value = 'object';
      descInput.value = 'Ancient staff wrapped in emerald vines';
      (card.host.querySelector('[data-add-ref-save]') as unknown as HTMLButtonElement).click();

      expect(sentBodies.some((b) => b.action === 'save_item' && b.item.name === 'Carved Yew Staff')).toBe(true);

      // Connected Atlas toggle renders SVG edges & location node buttons
      const atlasTab = card.host.querySelector('[data-world-hub-tab="atlas"]') as unknown as HTMLButtonElement;
      atlasTab.click();
      const atlasView = card.host.querySelector('[data-world-atlas-view]');
      expect(atlasView).not.toBeNull();
      expect(atlasView?.querySelector('svg')).not.toBeNull();
      expect(atlasView?.querySelectorAll('.map-node-pill').length).toBeGreaterThanOrEqual(2);
    } finally {
      restore();
    }
  });

  it('opens Scenery DNA Studio inside DossierCard and triggers autofill and save actions', () => {
    const restore = installFakeDocument();
    try {
      const host = new FakeNode('div');
      const card = new DossierCard(host as unknown as HTMLElement);
      const sentBodies: any[] = [];
      card.setStoryDnaRequester((body) => sentBodies.push(body));

      const placeDossier = {
        entity: { id: 'flat-3', name: 'Flat 3', kind: 'place' as const, aliases: ['The Loft'] },
        facts: [{ field: 'description', value: 'Exposed cedar beams and rain-streaked skylights', status: 'established', confidence: 'stated', source: 'turn' }],
        state: {},
        pinned: false,
      };
      const trigger = new FakeNode('button');
      card.open(placeDossier as any, { overrides: [], fieldGroups: {} } as any, 'c1', trigger as unknown as HTMLElement);

      const descField = card.host.querySelector('[data-dna-field="environmentDescription"]') as unknown as HTMLTextAreaElement;
      const previewEl = card.host.querySelector('[data-story-dna-preview]');
      expect(descField).not.toBeNull();
      expect(previewEl?.textContent).toContain('Exposed cedar beams');

      descField.value = 'Exposed cedar beams with warm brass lamps';
      (card.host.querySelector('[data-story-dna-autofill]') as unknown as HTMLButtonElement).click();
      (card.host.querySelector('[data-story-dna-save]') as unknown as HTMLButtonElement).click();

      expect(sentBodies.some((b) => b.action === 'review_autofill' && b.kind === 'place' && b.name === 'Flat 3')).toBe(true);
      expect(sentBodies.some((b) => b.action === 'save_location' && b.location.environmentDescription?.includes('warm brass lamps'))).toBe(true);
    } finally {
      restore();
    }
  });

  it('pins unrecorded scene location to World DNA and swaps scene wardrobe in Current Scene hub', () => {
    const restore = installFakeDocument();
    try {
      const host = new FakeNode('div');
      const card = new DossierCard(host as unknown as HTMLElement);
      const sentBodies: any[] = [];
      const wardrobeCalls: Array<{ char: string; key: string; outfit: string }> = [];
      card.setStoryDnaRequester((body) => sentBodies.push(body));
      card.setSceneHubContext({
        activeLocationName: 'Old Boathouse',
        presentCast: [
          {
            id: 'npc-dana',
            name: 'Dana',
            dnaId: 'dna-dana',
            present: true,
            activeWardrobeKey: 'casual',
            wardrobeStates: { casual: 'flannel shirt', coat: 'yellow rain slicker' },
          },
        ],
        activeItems: [],
        onSelectWardrobe: (char, key, outfit) => wardrobeCalls.push({ char, key, outfit }),
      });

      const trigger = new FakeNode('button');
      card.openTray([], trigger as unknown as HTMLElement, () => {}, undefined);

      const pinBtn = card.host.querySelector('[data-scene-pin-location="Old Boathouse"]') as unknown as HTMLButtonElement;
      expect(pinBtn).not.toBeNull();
      pinBtn.click();
      expect(sentBodies.some((b) => b.action === 'save_location' && b.location.name === 'Old Boathouse')).toBe(true);

      const swapBtn = card.host.querySelector('[data-scene-wardrobe-option="Dana:coat"]') as unknown as HTMLButtonElement;
      expect(swapBtn).not.toBeNull();
      swapBtn.click();
      expect(wardrobeCalls).toEqual([{ char: 'dna-dana', key: 'coat', outfit: 'yellow rain slicker' }]);
    } finally {
      restore();
    }
  });

  it('Wave 2: zero-fake-edges Atlas + Link Places toggle_route + Story Threads + Perspectives + Hidden Drawer', () => {
    const restore = installFakeDocument();
    try {
      const host = new FakeNode('div');
      const card = new DossierCard(host as unknown as HTMLElement);
      const sentBodies: any[] = [];
      let unhid = '';
      card.setStoryDnaRequester((body) => sentBodies.push(body));
      card.setStoryDna({
        revision: 4,
        locations: {
          'loc-a': { id: 'loc-a', name: 'Marten House Lobby', aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: 1 },
          'loc-b': { id: 'loc-b', name: 'Fourth Floor Corridor', aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: 2 },
        },
        items: {},
        deletedLocations: {
          'loc-old': { id: 'loc-old', name: 'Collapsed Shed', aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: 1 },
        },
        thoughtCabinet: [
          { id: 'th-1', title: 'Who signed the pass', category: 'mystery', description: 'Check registrar ledger', status: 'active', updatedAt: 10 },
        ],
        npcBeliefs: {
          'Naomi': [{ topic: 'Pipes', belief: 'Thinks pipes knock at ten', knowsSecret: false, updatedAt: 1 }],
          'Pim': [{ topic: 'Scholarship', belief: 'Doubts the scholarship stamp', knowsSecret: false, updatedAt: 2 }],
        },
      });
      card.setSceneHubContext({
        activeLocationName: 'Marten House Lobby',
        presentCast: [],
        activeItems: [],
        hiddenOverrides: [{ kind: 'place', name: 'Basement' }],
        onUnhideOverride: (kind, name) => { unhid = `${kind}:${name}`; },
      });

      const trigger = new FakeNode('button');
      card.openTray([], trigger as unknown as HTMLElement, () => {}, undefined);
      (card.host.querySelector('[data-world-hub-tab="atlas"]') as unknown as HTMLButtonElement).click();

      // Zero fake sequential edges
      expect(card.host.querySelector('[data-atlas-empty-routes]')?.textContent).toContain('No routes mapped yet');
      expect(card.host.querySelectorAll('line').length).toBe(0);

      // Link Places mode connects two nodes via toggle_route
      const linkBtn = card.host.querySelector('[data-atlas-link-toggle]') as unknown as HTMLButtonElement;
      linkBtn.click();
      const mapNodes = card.host.querySelectorAll('.map-node-pill');
      expect(mapNodes.length).toBeGreaterThanOrEqual(2);
      (mapNodes[0] as unknown as HTMLButtonElement).click();
      (card.host.querySelectorAll('.map-node-pill')[1] as unknown as HTMLButtonElement).click();
      const routeReq = sentBodies.find((b) => b.action === 'toggle_route');
      expect(routeReq).toBeDefined();
      expect(routeReq.connected).toBe(true);

      // Thread status cycles active -> developing & + New Thread saves
      (card.host.querySelector('[data-thread-status-btn="th-1"]') as unknown as HTMLButtonElement).click();
      expect(sentBodies.some((b) => b.action === 'save_thread' && b.thread.status === 'developing')).toBe(true);

      (card.host.querySelector('[data-add-thread-btn]') as unknown as HTMLButtonElement).click();
      const titleInput = card.host.querySelector('[data-new-thread-title]') as unknown as HTMLInputElement;
      const descInput = card.host.querySelector('[data-new-thread-desc]') as unknown as HTMLTextAreaElement;
      titleInput.value = 'Fix radiator leak';
      descInput.value = 'Inspect basement boiler';
      (card.host.querySelector('[data-save-thread-btn]') as unknown as HTMLButtonElement).click();
      expect(sentBodies.some((b) => b.action === 'save_thread' && b.thread.title === 'Fix radiator leak')).toBe(true);

      // Perspectives filter
      const perspSection = card.host.querySelector('[data-world-perspectives-section]');
      expect(perspSection?.textContent).toContain('Naomi');
      (card.host.querySelector('[data-perspective-filter="Naomi"]') as unknown as HTMLButtonElement).click();
      expect(card.host.querySelector('[data-world-perspectives-section]')?.textContent).toContain('Thinks pipes knock');

      // Hidden / Deleted drawer Unhide & Restore
      const drawer = card.host.querySelector('[data-hidden-deleted-drawer]');
      expect(drawer).not.toBeNull();
      (card.host.querySelector('[data-unhide-override="place:Basement"]') as unknown as HTMLButtonElement).click();
      expect(unhid).toBe('place:Basement');
      (card.host.querySelector('[data-restore-location-id="loc-old"]') as unknown as HTMLButtonElement).click();
      expect(sentBodies.some((b) => b.action === 'restore_location' && b.locationId === 'loc-old')).toBe(true);
    } finally {
      restore();
    }
  });

  it('Wave 2: Documents tab, + Add validation, inline fact edit sync, DNA drawer Merge & embedded Location Art', () => {
    const restore = installFakeDocument();
    try {
      const host = new FakeNode('div');
      const updates: any[] = [];
      const card = new DossierCard(host as unknown as HTMLElement, () => {}, (entity, patch) => {
        updates.push({ entity, patch });
        return true;
      });
      const dnaSent: any[] = [];
      const artSent: any[] = [];
      card.setStoryDnaRequester((body) => dnaSent.push(body));
      card.setLocationArtRequester((act) => artSent.push(act));
      card.setStoryDna({
        revision: 2,
        locations: {
          'loc-main': { id: 'loc-main', name: 'Marten House', aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: 1 },
          'loc-dup': { id: 'loc-dup', name: 'Marten Hall', aliases: [], persistentElements: [], connectedLocations: [], lastUpdated: 2 },
        },
        items: {},
        documents: {
          'doc-intake': {
            id: 'doc-intake',
            name: 'intake ledger',
            kind: 'note',
            aliases: [],
            sections: [{ paragraphIndex: 0, text: 'Signed by Pim Dole' }],
            lastUpdated: 10,
          },
        },
      });
      card.setLocationArtLibrary({
        version: 1,
        locations: [{
          entityId: 'marten house',
          name: 'Marten House',
          artRevision: 1,
          description: 'Brick hall',
          preferredVariantId: 'img-2',
          variants: [
            { id: 'img-1', imageId: 'asset-1', requestFingerprint: 'rf-1', environmentFingerprint: 'ef-1', approved: true, createdAt: '2026-01-01' },
            { id: 'img-2', imageId: 'asset-2', requestFingerprint: 'rf-2', environmentFingerprint: 'ef-2', approved: true, createdAt: '2026-01-02' },
          ],
        }],
      });
      card.setSceneHubContext({ activeLocationName: 'Marten House', presentCast: [], activeItems: [] });

      const trigger = new FakeNode('button');
      card.openTray([], trigger as unknown as HTMLElement, () => {}, undefined);

      // + Add validation shows [data-add-ref-error] when empty, then creates dna:item:* when valid
      (card.host.querySelector('.add-ref-chip') as unknown as HTMLButtonElement).click();
      (card.host.querySelector('[data-add-ref-save]') as unknown as HTMLButtonElement).click();
      expect((card.host.querySelector('[data-add-ref-error]') as HTMLElement)?.hidden).toBe(false);

      const addName = card.host.querySelector('[data-add-ref-name]') as unknown as HTMLInputElement;
      const addDesc = card.host.querySelector('[data-add-ref-desc]') as unknown as HTMLTextAreaElement;
      addName.value = 'Brass Key';
      addDesc.value = 'Cool brass key numbered 47';
      (card.host.querySelector('[data-add-ref-save]') as unknown as HTMLButtonElement).click();
      expect((card.host.querySelector('[data-add-ref-error]') as HTMLElement)?.hidden).toBe(true);
      expect(dnaSent.some((b) => b.action === 'save_item' && b.item.name === 'Brass Key')).toBe(true);

      // Documents tab opens Document Reader directly
      (card.host.querySelector('[data-reference-category="document"]') as unknown as HTMLButtonElement).click();
      const docReadBtn = card.host.querySelector('.world-lens-cta') as unknown as HTMLButtonElement;
      expect(docReadBtn?.textContent).toContain('Read');
      docReadBtn?.click();
      expect(card.host.querySelector('[data-vn-document-reader]')).not.toBeNull();

      // Open place dossier: verify inline fact edit syncs .folio-quote-callout & .observations-grid, Merge & Location Art
      card.open({
        entity: {
          id: 'loc-main',
          kind: 'place',
          name: 'Marten House',
          aliases: [],
          firstParagraph: 0,
          facts: [{ id: 'f1', entityId: 'loc-main', field: 'description', value: 'smells of wet wool', visibility: 'observed', source: { provider: 'model' } as any, revealedAt: {} as any }],
        },
        facts: [{ id: 'f1', entityId: 'loc-main', field: 'description', value: 'smells of wet wool', visibility: 'observed', source: { provider: 'model' } as any, revealedAt: {} as any }],
        state: { description: 'smells of wet wool' },
      } as any, normalizeTooltipPreferences({ enabled: true }), 'chat-1', trigger as unknown as HTMLElement);

      expect(card.host.querySelector('[data-story-dna-drawer="place"]')).not.toBeNull();
      expect(card.host.querySelector('[data-location-art-embedded]')).not.toBeNull();

      // Inline fact edit updates quote callout and observations grid live
      (card.host.querySelector('.fact-edit-btn') as unknown as HTMLButtonElement).click();
      const editInput = card.host.querySelector('.fact-edit-input input') as unknown as HTMLInputElement;
      editInput.value = 'rain-lashed gables';
      (card.host.querySelector('.fact-edit-input button') as unknown as HTMLButtonElement).click();
      expect(updates.length).toBe(1);
      expect(card.host.querySelector('.folio-quote-callout')?.textContent).toContain('rain-lashed gables');
      expect(card.host.querySelector('.observations-grid')?.textContent).toContain('rain-lashed gables');

      // Prefer img-1 dispatches select action
      (card.host.querySelector('[data-location-art-prefer="img-1"]') as unknown as HTMLButtonElement).click();
      expect(artSent.some((a) => a.action === 'select' && a.variantId === 'img-1')).toBe(true);

      // Merge into loc-dup
      const mergeSel = card.host.querySelector('[data-dna-merge-select]') as unknown as HTMLSelectElement;
      mergeSel.value = 'loc-dup';
      (card.host.querySelector('[data-dna-merge-btn]') as unknown as HTMLButtonElement).click();
      expect(dnaSent.some((b) => b.action === 'merge_location' && b.sourceId === 'loc-main' && b.targetId === 'loc-dup')).toBe(true);
    } finally {
      restore();
    }
  });

  it('Wave 2: StageDossiers.trackSelectedPhrase emits custom lexicon and item/document entries', () => {
    const restore = installFakeDocument();
    try {
      const root = new FakeNode('div') as unknown as HTMLElement;
      const text = new FakeNode('div', 'Pim checked the brass ledger.') as unknown as HTMLElement;
      const controls = new FakeNode('div') as unknown as HTMLElement;
      const sent: any[] = [];
      const dossiers = new StageDossiers(root, text, controls, () => {}, () => {}, () => {});
      dossiers.setStoryDnaRequester((body) => sent.push(body));

      dossiers.trackSelectedPhrase('Brass Ledger', 'object', 'Heavy green ledger behind the desk');
      expect(sent.some((b) => b.action === 'add_custom_lexicon' && b.term === 'Brass Ledger' && b.kind === 'object')).toBe(true);
      expect(sent.some((b) => b.action === 'save_item' && b.item.name === 'Brass Ledger')).toBe(true);

      dossiers.trackSelectedPhrase('Pipe Maintenance Notice', 'document', 'Turn off steam valves at ten');
      expect(sent.some((b) => b.action === 'save_document_note' && b.name === 'Pipe Maintenance Notice')).toBe(true);
    } finally {
      restore();
    }
  });
});
