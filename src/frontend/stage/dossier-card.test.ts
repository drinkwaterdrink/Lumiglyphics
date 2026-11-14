import { describe, expect, it } from 'bun:test';
import { DossierCard } from './dossier-card.js';
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

      expect(dossier.facts[0].value).toBe('High cedar wood ceiling with golden lanterns');
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
        version: 1,
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

      expect(sentBodies.some((b) => b.action === 'autofill_location' && b.locationName === 'Flat 3')).toBe(true);
      expect(sentBodies.some((b) => b.action === 'save_location' && b.location.environmentDescription?.includes('warm brass lamps'))).toBe(true);
    } finally {
      restore();
    }
  });
});
