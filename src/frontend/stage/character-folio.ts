import type { CharacterDNA, CharacterDNALibrary } from '../../shared/character-dna.js';
import {
  createEmptyCharacterDNA,
  formatCharacterDNAToPromptClause,
  formatCharacterDNAToTags,
  mergeCharacterDNA
} from '../../shared/character-dna.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';
import type { WorkspaceSurface } from './reader-workspace.js';

export interface CharacterFolioHandlers {
  onSaveDNA?: (dna: CharacterDNA) => void;
  onHarvestDNA?: (characterName: string) => void;
  onAutoFillDNA?: (characterName: string) => void;
  onClose?: () => void;
}

export class CharacterFolio implements WorkspaceSurface {
  readonly element: HTMLElement;
  private readonly rosterList: HTMLElement;
  private readonly detailContainer: HTMLElement;
  private readonly searchInput: HTMLInputElement;
  private library: Record<string, CharacterDNA> = {};
  private activeCharacterId: string | null = null;
  private isEditing = false;
  private activeFilter = '';

  constructor(private readonly handlers: CharacterFolioHandlers = {}) {
    this.element = document.createElement('div');
    this.element.className = 'character-folio-surface';
    this.element.setAttribute('data-character-folio', 'true');

    this.element.innerHTML = `
      <style>
        .character-folio-surface {
          display: flex;
          height: 100%;
          width: 100%;
          overflow: hidden;
          background: var(--vn-shell-bg, #0b1114);
          color: var(--vn-shell-text, #e2e8f0);
          font-family: inherit;
        }
        .folio-sidebar {
          width: 280px;
          min-width: 220px;
          border-right: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
          display: flex;
          flex-direction: column;
          background: var(--vn-shell-field, rgba(0, 0, 0, 0.2));
        }
        .folio-search-wrap {
          padding: 12px;
          border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.06));
        }
        .folio-search-wrap input {
          width: 100%;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.12));
          border-radius: 6px;
          color: inherit;
          font-size: 13px;
        }
        .folio-search-wrap input:focus {
          outline: 1px solid var(--vn-shell-accent, #6ee7b7);
        }
        .folio-roster {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .folio-roster-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: inherit;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }
        .folio-roster-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .folio-roster-item.active {
          background: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 15%, transparent);
          border-color: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 40%, transparent);
        }
        .folio-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .folio-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .folio-roster-meta {
          flex: 1;
          min-width: 0;
        }
        .folio-roster-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .folio-roster-sub {
          font-size: 11px;
          color: var(--vn-shell-muted, #94a3b8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .folio-lock-badge {
          font-size: 12px;
          opacity: 0.8;
        }
        .folio-detail {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .folio-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--vn-shell-muted, #94a3b8);
          text-align: center;
          gap: 8px;
        }
        .folio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
        }
        .folio-hero {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .folio-hero-avatar {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          overflow: hidden;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.15));
        }
        .folio-hero-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .folio-hero-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .folio-hero-title p {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--vn-shell-muted, #94a3b8);
        }
        .folio-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .folio-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          background: rgba(255, 255, 255, 0.05);
          color: inherit;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s ease;
        }
        .folio-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .folio-btn-primary {
          background: var(--vn-shell-accent, #6ee7b7);
          color: #0b1114;
          border-color: var(--vn-shell-accent, #6ee7b7);
        }
        .folio-btn-primary:hover {
          filter: brightness(1.1);
        }
        .folio-matrix {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .folio-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.06));
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .folio-card h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--vn-shell-muted, #94a3b8);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .folio-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .folio-field label {
          font-size: 11px;
          color: var(--vn-shell-muted, #94a3b8);
        }
        .folio-field input {
          padding: 6px 10px;
          border-radius: 4px;
          border: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.1));
          background: rgba(0, 0, 0, 0.2);
          color: inherit;
          font-size: 12px;
        }
        .folio-field input:disabled {
          background: transparent;
          border-color: transparent;
          padding-left: 0;
          opacity: 0.9;
        }
        .folio-field input:focus {
          outline: 1px solid var(--vn-shell-accent, #6ee7b7);
        }
        .folio-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .folio-chip {
          padding: 3px 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          font-size: 11px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .folio-prompt-preview {
          background: rgba(0, 0, 0, 0.35);
          border: 1px dashed var(--vn-shell-border, rgba(255, 255, 255, 0.15));
          border-radius: 8px;
          padding: 12px;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.5;
          color: color-mix(in srgb, var(--vn-shell-accent, #6ee7b7) 90%, #fff);
          word-break: break-word;
        }
        @media (max-width: 760px) {
          .character-folio-surface {
            flex-direction: column;
          }
          .folio-sidebar {
            width: 100%;
            height: 160px;
            border-right: none;
            border-bottom: 1px solid var(--vn-shell-border, rgba(255, 255, 255, 0.08));
          }
          .folio-detail {
            padding: 14px;
          }
        }
      </style>
      <div class="folio-sidebar">
        <div class="folio-search-wrap">
          <input type="text" data-folio-search placeholder="Filter characters..." />
        </div>
        <div class="folio-roster" data-folio-roster></div>
      </div>
      <div class="folio-detail" data-folio-detail>
        <div class="folio-empty">
          <span>Select a character from the cast roster or create one to inspect their Visual DNA.</span>
        </div>
      </div>
    `;

    this.rosterList = this.element.querySelector('[data-folio-roster]')!;
    this.detailContainer = this.element.querySelector('[data-folio-detail]')!;
    this.searchInput = this.element.querySelector('[data-folio-search]')!;

    this.searchInput.addEventListener('input', () => {
      this.activeFilter = this.searchInput.value.trim().toLowerCase();
      this.renderRoster();
    });
  }

  setLibrary(library: CharacterDNALibrary | Record<string, CharacterDNA>): void {
    this.library = ('characters' in library ? library.characters : library) as Record<string, CharacterDNA>;
    if (!this.activeCharacterId || !this.library[this.activeCharacterId]) {
      const first = Object.keys(this.library)[0];
      this.activeCharacterId = first || null;
    }
    this.renderRoster();
    this.renderDetail();
  }

  setActiveCharacter(idOrName: string): void {
    const key = idOrName.trim().toLowerCase();
    if (this.library[key]) {
      this.activeCharacterId = key;
    } else {
      const match = Object.values(this.library).find(c => c.name.toLowerCase() === key || c.aliases.some(a => a.toLowerCase() === key));
      if (match) {
        this.activeCharacterId = match.id.toLowerCase();
      }
    }
    this.renderRoster();
    this.renderDetail();
  }

  private renderRoster(): void {
    this.rosterList.replaceChildren();
    const characters = Object.values(this.library).filter(c => {
      if (!this.activeFilter) return true;
      return c.name.toLowerCase().includes(this.activeFilter) || c.aliases.some(a => a.toLowerCase().includes(this.activeFilter));
    });

    if (characters.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'folio-empty';
      empty.style.padding = '20px 8px';
      empty.textContent = this.activeFilter ? 'No matching characters.' : 'No cast registered.';
      this.rosterList.append(empty);
      return;
    }

    for (const char of characters) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `folio-roster-item${this.activeCharacterId === char.id.toLowerCase() ? ' active' : ''}`;
      item.onclick = () => {
        this.activeCharacterId = char.id.toLowerCase();
        this.isEditing = false;
        this.renderRoster();
        this.renderDetail();
      };

      const avatar = document.createElement('div');
      avatar.className = 'folio-avatar';
      if (char.avatarUrl) {
        const img = document.createElement('img');
        img.src = char.avatarUrl;
        img.alt = char.name;
        avatar.append(img);
      } else {
        avatar.textContent = (char.name[0] || '?').toUpperCase();
      }

      const meta = document.createElement('div');
      meta.className = 'folio-roster-meta';
      const name = document.createElement('div');
      name.className = 'folio-roster-name';
      name.textContent = char.name;
      const sub = document.createElement('div');
      sub.className = 'folio-roster-sub';
      sub.textContent = [char.build.species, char.hair.color ? `${char.hair.color} hair` : ''].filter(Boolean).join(' · ') || 'Unconfigured';
      meta.append(name, sub);

      item.append(avatar, meta);

      if (char.locked) {
        const lock = document.createElement('span');
        lock.className = 'folio-lock-badge';
        lock.title = 'Locked DNA';
        lock.textContent = '🔒';
        item.append(lock);
      }

      this.rosterList.append(item);
    }
  }

  private renderDetail(): void {
    this.detailContainer.replaceChildren();
    if (!this.activeCharacterId || !this.library[this.activeCharacterId]) {
      const empty = document.createElement('div');
      empty.className = 'folio-empty';
      empty.innerHTML = `<span>Select a character from the cast roster to view their Visual DNA.</span>`;
      this.detailContainer.append(empty);
      return;
    }

    const char = this.library[this.activeCharacterId]!;
    const header = document.createElement('div');
    header.className = 'folio-header';

    const hero = document.createElement('div');
    hero.className = 'folio-hero';

    const heroAvatar = document.createElement('div');
    heroAvatar.className = 'folio-hero-avatar';
    if (char.avatarUrl) {
      const img = document.createElement('img');
      img.src = char.avatarUrl;
      heroAvatar.append(img);
    } else {
      heroAvatar.textContent = (char.name[0] || '?').toUpperCase();
    }

    const heroTitle = document.createElement('div');
    heroTitle.className = 'folio-hero-title';
    const h2 = document.createElement('h2');
    h2.textContent = char.name;
    const p = document.createElement('p');
    p.textContent = char.sourceSummary ? `Source: ${char.sourceSummary}` : 'Established via narrative evidence';
    heroTitle.append(h2, p);
    hero.append(heroAvatar, heroTitle);

    const actions = document.createElement('div');
    actions.className = 'folio-actions';

    // Auto-fill button
    const autoFillBtn = document.createElement('button');
    autoFillBtn.type = 'button';
    autoFillBtn.className = 'folio-btn';
    autoFillBtn.innerHTML = `✨ <span>Auto-Fill with LLM</span>`;
    autoFillBtn.onclick = () => {
      this.handlers.onAutoFillDNA?.(char.name);
    };

    // Lock toggle button
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = `folio-btn${char.locked ? ' folio-btn-primary' : ''}`;
    lockBtn.innerHTML = char.locked ? `🔒 <span>DNA Locked</span>` : `🔓 <span>Lock DNA</span>`;
    lockBtn.onclick = () => {
      char.locked = !char.locked;
      this.handlers.onSaveDNA?.(char);
      this.renderRoster();
      this.renderDetail();
    };

    // Edit toggle button
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'folio-btn';
    editBtn.textContent = this.isEditing ? 'Cancel Edit' : '✏️ Edit DNA';
    editBtn.onclick = () => {
      this.isEditing = !this.isEditing;
      this.renderDetail();
    };

    actions.append(autoFillBtn, lockBtn, editBtn);

    if (this.isEditing) {
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'folio-btn folio-btn-primary';
      saveBtn.textContent = '💾 Save DNA';
      saveBtn.onclick = () => {
        this.saveCurrentEdits(char);
        this.isEditing = false;
        this.handlers.onSaveDNA?.(char);
        this.renderRoster();
        this.renderDetail();
      };
      actions.append(saveBtn);
    }

    header.append(hero, actions);

    // Matrix
    const matrix = document.createElement('div');
    matrix.className = 'folio-matrix';

    // Hair Card
    const hairCard = document.createElement('div');
    hairCard.className = 'folio-card';
    hairCard.innerHTML = `<h3>💇 Hair DNA</h3>`;
    hairCard.append(
      this.createField('Color', char.hair.color ?? '', v => { char.hair.color = v; }),
      this.createField('Length', char.hair.length ?? '', v => { char.hair.length = v; }),
      this.createField('Style', char.hair.style ?? '', v => { char.hair.style = v; })
    );

    // Eyes Card
    const eyesCard = document.createElement('div');
    eyesCard.className = 'folio-card';
    eyesCard.innerHTML = `<h3>👁️ Eyes DNA</h3>`;
    eyesCard.append(
      this.createField('Color', char.eyes.color ?? '', v => { char.eyes.color = v; }),
      this.createField('Shape', char.eyes.shape ?? '', v => { char.eyes.shape = v; })
    );

    // Build Card
    const buildCard = document.createElement('div');
    buildCard.className = 'folio-card';
    buildCard.innerHTML = `<h3>👤 Physical Build</h3>`;
    buildCard.append(
      this.createField('Height', char.build.height ?? '', v => { char.build.height = v; }),
      this.createField('Body Type', char.build.bodyType ?? '', v => { char.build.bodyType = v; }),
      this.createField('Skin Tone', char.build.skinTone ?? '', v => { char.build.skinTone = v; }),
      this.createField('Species', char.build.species ?? '', v => { char.build.species = v; })
    );

    // Wardrobe Card
    const wardrobeCard = document.createElement('div');
    wardrobeCard.className = 'folio-card';
    wardrobeCard.innerHTML = `<h3>👗 Wardrobe & Attire</h3>`;
    wardrobeCard.append(
      this.createField('Signature Outfit', char.signatureOutfit ?? '', v => { char.signatureOutfit = v; }),
      this.createField('Active Scene Outfit', char.activeOutfit ?? '', v => { char.activeOutfit = v; })
    );

    // Distinguishing Marks Card
    const marksCard = document.createElement('div');
    marksCard.className = 'folio-card';
    marksCard.innerHTML = `<h3>⚡ Distinguishing Features</h3>`;
    if (this.isEditing) {
      marksCard.append(
        this.createField('Features (comma separated)', char.distinguishingFeatures.join(', '), v => {
          char.distinguishingFeatures = v.split(',').map(s => s.trim()).filter(Boolean);
        })
      );
    } else {
      const chips = document.createElement('div');
      chips.className = 'folio-chips';
      if (char.distinguishingFeatures.length === 0) {
        chips.innerHTML = `<span style="font-size:12px;opacity:0.6">No specific marks established.</span>`;
      } else {
        for (const feat of char.distinguishingFeatures) {
          const chip = document.createElement('span');
          chip.className = 'folio-chip';
          chip.textContent = feat;
          chips.append(chip);
        }
      }
      marksCard.append(chips);
    }

    matrix.append(hairCard, eyesCard, buildCard, wardrobeCard, marksCard);

    // Prompt Clause Live Preview
    const previewCard = document.createElement('div');
    previewCard.className = 'folio-card';
    previewCard.innerHTML = `<h3>✨ Live Injected Prompt Clause</h3>`;
    const previewText = document.createElement('div');
    previewText.className = 'folio-prompt-preview';
    const compiledClause = formatCharacterDNAToPromptClause(char);
    previewText.textContent = compiledClause ? `${char.name}: ${compiledClause}.` : `${char.name} has no physical traits defined.`;
    previewCard.append(previewText);

    this.detailContainer.append(header, matrix, previewCard);
  }

  private createField(label: string, initialValue: string, onChange: (value: string) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'folio-field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = initialValue;
    input.disabled = !this.isEditing;
    input.placeholder = this.isEditing ? `Enter ${label.toLowerCase()}...` : 'Not set';
    input.addEventListener('change', () => onChange(input.value.trim()));
    wrap.append(lbl, input);
    return wrap;
  }

  private saveCurrentEdits(char: CharacterDNA): void {
    // Collect all input values from detail view
    char.lastUpdated = Date.now();
  }

  enter(): void {
    this.handlers.onHarvestDNA?.(this.activeCharacterId || '');
  }

  leave(): void {
    this.isEditing = false;
  }

  back(): boolean {
    if (this.isEditing) {
      this.isEditing = false;
      this.renderDetail();
      return true;
    }
    this.handlers.onClose?.();
    return false;
  }
}
