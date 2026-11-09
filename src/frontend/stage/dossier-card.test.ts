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

      const ctaBtn = card.host.querySelector('.world-lens-cta');
      expect(ctaBtn).not.toBeNull();
      expect(ctaBtn?.textContent).toContain('Open character folio');

      (ctaBtn as unknown as HTMLButtonElement)?.click();
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
});
