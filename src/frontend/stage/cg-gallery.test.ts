import { describe, expect, it, test } from 'bun:test';
import { CgGalleryModal } from './cg-gallery.js';
import { installFakeDocument, FakeNode } from './stage-test-dom.js';
import type { TurnView } from '../../protocol.js';

describe('Story Event CG Gallery & Lightbox (Phase 5)', () => {
  it('mounts gallery modal, syncs turn assets, and supports lightbox', () => {
    const restore = installFakeDocument();
    try {
      const mount = new FakeNode('div');
      const gallery = new CgGalleryModal(mount as unknown as HTMLElement);

      const mockTurn: TurnView = {
        chatId: 'test-chat',
        messageId: 'msg-1',
        speaker: 'Narrator',
        choices: [],
        sourceFingerprint: 'fp-1',
        swipeId: 0,
        revision: 1,
        status: 'ready',
        paragraphs: ['Nadine stands in the rain.'],
        assets: [
          {
            jobId: 'job-1',
            cueId: 'cue-1',
            paragraphIndex: 0,
            status: 'generated',
            imageUrl: '/image/nadine-rain.png',
            stageAsset: {
              sceneId: 'scene-1',
              role: 'background',
              character: 'Nadine'
            }
          }
        ]
      };

      gallery.syncFromTurn(mockTurn,0);
      gallery.open();
      expect(mount.dataset.vnGalleryOpen).toBe('true');

      const counter = mount.querySelector('[data-cg-counter]');
      expect(counter?.textContent).toContain('1 Unlocked');

      const cards = mount.querySelectorAll('.cg-card');
      expect(cards.length).toBe(1);

      // Click card to open lightbox
      cards[0]?.click();

      const lightbox = mount.querySelector('[data-cg-lightbox]');
      expect(lightbox?.hidden).toBe(false);
      const quote = mount.querySelector('[data-cg-lightbox-quote]');
      expect(quote?.textContent).toContain('Nadine stands in the rain');

      // Verify lightbox back and close controls exist and are accessible
      const backBtn = mount.querySelector('[data-cg-lightbox-back]');
      expect(backBtn).not.toBeNull();
      const closeBtn = mount.querySelector('[data-cg-lightbox-close]');
      expect(closeBtn).not.toBeNull();

      gallery.close();
      expect(mount.dataset.vnGalleryOpen).toBeUndefined();
      const backdrop = mount.querySelector('.cg-gallery-backdrop');
      expect(backdrop?.hidden).toBe(true);
    } finally {
      restore();
    }
  });
});

const turn=(chatId='A',url='/old',messageId='m',swipeId=0)=>({chatId,messageId,swipeId,sourceFingerprint:'fingerprint',revision:0,paragraphs:['read','secret'],assets:[{jobId:'job',paragraphIndex:1,status:'generated',imageUrl:url}]} as any);
function gallery(){const g:any=Object.create(CgGalleryModal.prototype);g.items=[];g.render=()=>{};g.closeLightbox=()=>{};return g;}
test('gallery admits only revealed items and upserts replacements',()=>{const g=gallery();g.syncFromTurn(turn(),0);expect(g.items).toHaveLength(0);g.syncFromTurn(turn(),1);expect(g.items[0].storyExcerpt).toBe('secret');g.syncFromTurn(turn('A','/new'),1);expect(g.items).toHaveLength(1);expect(g.items[0].imageUrl).toBe('/new');g.syncFromTurn(turn(),0);expect(g.items).toHaveLength(0);});
test('gallery scopes job IDs by reply, replaces alternate branches and clears chats/null',()=>{const g=gallery();g.syncFromTurn(turn(),1);g.syncFromTurn(turn('A','/second','m2'),1);expect(g.items).toHaveLength(2);g.syncFromTurn(turn('A','/swipe','m2',1),1);expect(g.items).toHaveLength(2);expect(g.items.at(-1).imageUrl).toBe('/swipe');g.syncFromTurn(turn('B','/B'),1);expect(g.items).toHaveLength(1);expect(g.items[0].imageUrl).toBe('/B');g.syncFromTurn(null,0);expect(g.items).toHaveLength(0);});
