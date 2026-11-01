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
});
