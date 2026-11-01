import { APERTURE_ICONS } from '../theme/aperture-theme.js';
import type { AssetView, TurnView } from '../../protocol.js';

export interface CGItem {
  id: string;
  imageUrl: string;
  title: string;
  characterName?: string | undefined;
  chapterTitle?: string | undefined;
  storyExcerpt?: string | undefined;
  unlockedAt: string;
  isMilestone?: boolean | undefined;
}

export class CgGalleryModal {
  private readonly backdrop: HTMLElement;
  private readonly modal: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly counter: HTMLElement;
  private readonly filterContainer: HTMLElement;
  private readonly lightbox: HTMLElement;
  private items: CGItem[] = [];
  private currentFilter: 'all' | 'milestones' | 'portraits' = 'all';
  private activeLightboxIndex = -1;
  private isOpen = false;

  constructor(private readonly mount: HTMLElement) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'cg-gallery-backdrop';
    this.backdrop.hidden = true;

    this.backdrop.innerHTML = `
      <style>
        .cg-gallery-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100005;
          background: rgba(4, 8, 12, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
          color: #f1f5f9;
          font-family: inherit;
        }
        .cg-gallery-modal {
          width: 100%;
          max-width: 1100px;
          height: 85vh;
          max-height: 800px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
        }
        .cg-gallery-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
        }
        .cg-gallery-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cg-gallery-counter {
          font-size: 12px;
          font-weight: 600;
          color: var(--vn-shell-accent, #6ee7b7);
          background: rgba(110, 231, 183, 0.1);
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid rgba(110, 231, 183, 0.2);
        }
        .cg-gallery-close {
          min-width: 44px;
          min-height: 44px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 16px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cg-gallery-close:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .cg-gallery-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.1);
          overflow-x: auto;
        }
        .cg-tab-btn {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .cg-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .cg-tab-btn.active {
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .cg-gallery-grid {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .cg-card {
          position: relative;
          aspect-ratio: 16 / 10;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .cg-card:hover {
          transform: translateY(-3px) scale(1.02);
          border-color: var(--vn-shell-accent, #6ee7b7);
          box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.6);
        }
        .cg-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .cg-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 10px 12px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .cg-card:hover .cg-card-overlay {
          opacity: 1;
        }
        .cg-card-title {
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cg-card-meta {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
        }
        .cg-lightbox {
          position: fixed;
          inset: 0;
          z-index: 100010;
          background: rgba(0, 0, 0, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: calc(64px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px));
          box-sizing: border-box;
        }
        .cg-lightbox img {
          max-width: 92vw;
          max-height: 72vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
          pointer-events: auto;
        }
        .cg-lightbox-quote {
          margin-top: 16px;
          max-width: 800px;
          font-style: italic;
          font-size: 14px;
          text-align: center;
          color: #e2e8f0;
          line-height: 1.6;
          pointer-events: auto;
        }
        .cg-lightbox-top-bar {
          position: absolute;
          top: calc(16px + env(safe-area-inset-top, 0px));
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100020;
          pointer-events: auto;
        }
        .cg-lightbox-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cg-lightbox-btn {
          min-height: 40px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(8px);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cg-lightbox-btn:hover {
          background: rgba(255, 255, 255, 0.22);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .cg-lightbox-close-pill {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .cg-lightbox-close-pill:hover {
          background: rgba(239, 68, 68, 0.35);
          border-color: rgba(239, 68, 68, 0.6);
          color: #fff;
        }
        .cg-empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: rgba(255, 255, 255, 0.4);
          gap: 12px;
          font-size: 14px;
        }
      </style>
      <div class="cg-gallery-modal">
        <header class="cg-gallery-header">
          <div class="cg-gallery-title">
            <h2>Story CG Gallery <span class="cg-gallery-counter" data-cg-counter>0 Unlocked</span></h2>
          </div>
          <button type="button" class="cg-gallery-close" data-cg-close aria-label="Close CG Gallery">${APERTURE_ICONS.close}</button>
        </header>
        <nav class="cg-gallery-nav" data-cg-tabs>
          <button type="button" class="cg-tab-btn active" data-cg-tab="all">All Visual Moments</button>
          <button type="button" class="cg-tab-btn" data-cg-tab="milestones">Milestone CGs</button>
          <button type="button" class="cg-tab-btn" data-cg-tab="portraits">Character Portraits</button>
        </nav>
        <div class="cg-gallery-grid" data-cg-grid></div>
      </div>
      <div class="cg-lightbox" data-cg-lightbox hidden>
        <div class="cg-lightbox-top-bar">
          <button type="button" class="cg-lightbox-btn" data-cg-lightbox-back>${APERTURE_ICONS.back} <span>Back to Gallery</span></button>
          <div class="cg-lightbox-actions">
            <button type="button" class="cg-lightbox-btn" data-cg-download>📥 <span>Export Native</span></button>
            <button type="button" class="cg-lightbox-btn cg-lightbox-close-pill" data-cg-lightbox-close aria-label="Close Lightbox">✕ <span>Close (Esc)</span></button>
          </div>
        </div>
        <img data-cg-lightbox-img src="" alt="Story CG" />
        <div class="cg-lightbox-quote" data-cg-lightbox-quote></div>
      </div>
    `;

    this.modal = this.backdrop.querySelector('.cg-gallery-modal')!;
    this.grid = this.backdrop.querySelector('[data-cg-grid]')!;
    this.counter = this.backdrop.querySelector('[data-cg-counter]')!;
    this.filterContainer = this.backdrop.querySelector('[data-cg-tabs]')!;
    this.lightbox = this.backdrop.querySelector('[data-cg-lightbox]')!;

    this.mount.append(this.backdrop);
    this.attachEvents();
  }

  private attachEvents(): void {
    this.backdrop.querySelector('[data-cg-close]')?.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this.filterContainer.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-cg-tab]');
      if (!btn) return;
      this.filterContainer.querySelectorAll('.cg-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.currentFilter = (btn.dataset.cgTab as any) || 'all';
      this.render();
    });

    this.lightbox.querySelector('[data-cg-lightbox-back]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeLightbox();
    });

    this.lightbox.querySelector('[data-cg-lightbox-close]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeLightbox();
    });

    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.closeLightbox();
      }
    });

    this.lightbox.querySelector('[data-cg-download]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = this.items[this.activeLightboxIndex];
      if (item?.imageUrl) {
        const a = document.createElement('a');
        a.href = item.imageUrl;
        a.download = `lumiglyphics-cg-${item.id}.png`;
        a.click();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        if (!this.lightbox.hidden) {
          this.closeLightbox();
        } else {
          this.close();
        }
      }
    });
  }

  syncFromTurn(turn: TurnView | null): void {
    if (!turn) return;
    const newItems: CGItem[] = [];
    const urlOf = (a: AssetView) => a.stageAsset?.displayImageUrl ?? a.imageUrl;

    for (const asset of turn.assets ?? []) {
      if ((asset.status === 'generated' || asset.status === 'browser_ready') && urlOf(asset)) {
        const excerpt = turn.paragraphs[asset.paragraphIndex] || '';
        const role = asset.stageAsset?.role;
        const isMilestone = role === 'background' || asset.paragraphIndex === 0;

        newItems.push({
          id: asset.jobId,
          imageUrl: urlOf(asset)!,
          title: asset.stageAsset?.character || `Moment at ¶${asset.paragraphIndex + 1}`,
          characterName: asset.stageAsset?.character,
          storyExcerpt: excerpt,
          unlockedAt: new Date().toLocaleTimeString(),
          isMilestone
        });
      }
    }

    if (newItems.length > 0) {
      const existingIds = new Set(this.items.map(i => i.id));
      for (const item of newItems) {
        if (!existingIds.has(item.id)) {
          this.items.push(item);
        }
      }
      this.render();
    }
  }

  setItems(items: CGItem[]): void {
    this.items = items;
    this.render();
  }

  open(): void {
    this.isOpen = true;
    this.backdrop.hidden = false;
    this.mount.dataset.vnGalleryOpen = 'true';
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.vnGalleryOpen = 'true';
    }
    this.render();
  }

  close(): void {
    this.isOpen = false;
    this.backdrop.hidden = true;
    delete this.mount.dataset.vnGalleryOpen;
    if (typeof document !== 'undefined' && document.body) {
      delete document.body.dataset.vnGalleryOpen;
    }
    this.closeLightbox();
  }

  private openLightbox(index: number): void {
    this.activeLightboxIndex = index;
    const item = this.filteredItems()[index];
    if (!item) return;

    const img = this.lightbox.querySelector<HTMLImageElement>('[data-cg-lightbox-img]')!;
    const quote = this.lightbox.querySelector<HTMLElement>('[data-cg-lightbox-quote]')!;

    img.src = item.imageUrl;
    quote.textContent = item.storyExcerpt ? `“${item.storyExcerpt}”` : '';
    this.lightbox.hidden = false;
  }

  private closeLightbox(): void {
    this.activeLightboxIndex = -1;
    this.lightbox.hidden = true;
  }

  private filteredItems(): CGItem[] {
    if (this.currentFilter === 'milestones') {
      return this.items.filter(i => i.isMilestone);
    }
    if (this.currentFilter === 'portraits') {
      return this.items.filter(i => Boolean(i.characterName));
    }
    return this.items;
  }

  private render(): void {
    const list = this.filteredItems();
    this.counter.textContent = `${this.items.length} Unlocked`;
    this.grid.replaceChildren();

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'cg-empty-state';
      empty.innerHTML = `<span>No story CGs unlocked in this category yet. Advance the story or generate scenes to collect artwork.</span>`;
      this.grid.append(empty);
      return;
    }

    list.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'cg-card';
      card.onclick = () => this.openLightbox(index);

      const img = document.createElement('img');
      img.src = item.imageUrl;
      img.alt = item.title;
      img.loading = 'lazy';

      const overlay = document.createElement('div');
      overlay.className = 'cg-card-overlay';

      const title = document.createElement('div');
      title.className = 'cg-card-title';
      title.textContent = item.title;

      const meta = document.createElement('div');
      meta.className = 'cg-card-meta';
      meta.textContent = item.characterName ? `Cast: ${item.characterName}` : 'Story Scene';

      overlay.append(title, meta);
      card.append(img, overlay);
      this.grid.append(card);
    });
  }
}
