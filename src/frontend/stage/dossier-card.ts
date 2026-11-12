import { createDocumentReader, DOCUMENT_READER_CSS } from './document-reader.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';
import { html } from '../dom/html.js';
import type { StoryDocument } from '../../shared/story-documents.js';
import { InteractionTray } from './interaction-tray.js';
import type { InteractionDraft, DraftMergeMode } from '../../shared/scene-interactions.js';
import { entityOverride, type ReferenceKind, type referenceEntries, type ReaderDossier, type TooltipPreferences } from '../../shared/dossiers.js';
import { referenceFieldInfo, REFERENCE_FIELD_GROUPS } from '../../shared/reference-fields.js';

export interface DossierVisualContext {
  imageUrl?: string;
  imageCaption?: string;
  isPresent?: boolean;
  isActiveLocation?: boolean;
  locationName?: string;
  presentCharacters?: Array<{ id: string; name: string }>;
  summarySnippet?: string;
  anchors?: string[];
  onSelectEntity?: (id: string, trigger: HTMLElement) => void;
}

function entityInitials(name: string): string {
  const parts = name.trim().split(/[\s·\-]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function fallbackSvgForKind(kind: 'npc' | 'place' | 'object', name: string): string {
  const initials = entityInitials(name).replace(/[<>&"']/g, '');
  if (kind === 'npc') {
    return `<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><defs><linearGradient id="vnNpcGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(158,198,240,0.32)"/><stop offset="100%" stop-color="rgba(20,26,42,0.92)"/></linearGradient></defs><rect width="120" height="140" rx="14" fill="url(#vnNpcGrad)"/><circle cx="60" cy="48" r="22" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/><path d="M24 126c4-24 20-38 36-38s32 14 36 38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/><text x="60" y="54" text-anchor="middle" fill="currentColor" font-size="16" font-weight="700" opacity="0.9">${initials}</text></svg>`;
  }
  if (kind === 'place') {
    return `<svg viewBox="0 0 320 130" aria-hidden="true" focusable="false"><defs><linearGradient id="vnPlaceGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(110,168,230,0.28)"/><stop offset="100%" stop-color="rgba(14,20,34,0.95)"/></linearGradient></defs><rect width="320" height="130" rx="14" fill="url(#vnPlaceGrad)"/><circle cx="256" cy="36" r="16" fill="rgba(255,230,170,0.22)"/><path d="M0 105 L68 58 L128 92 L198 44 L272 88 L320 64 L320 130 L0 130 Z" fill="rgba(255,255,255,0.1)"/><path d="M0 116 L96 74 L168 104 L244 66 L320 96 L320 130 L0 130 Z" fill="rgba(255,255,255,0.14)"/></svg>`;
  }
  return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><linearGradient id="vnItemGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(232,190,116,0.28)"/><stop offset="100%" stop-color="rgba(20,24,38,0.94)"/></linearGradient></defs><rect width="120" height="120" rx="14" fill="url(#vnItemGrad)"/><polygon points="60,20 94,60 60,100 26,60" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.34)" stroke-width="1.5"/><circle cx="60" cy="60" r="12" fill="rgba(255,255,255,0.2)"/></svg>`;
}

const MAP_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [18, 14],
  [62, 22],
  [15, 52],
  [60, 58],
  [38, 36],
  [78, 40],
  [26, 72],
  [68, 74]
];

export class DossierCard {
  readonly host = document.createElement('div');
  private returnFocus: HTMLElement | null = null;
  private trayReturn: (() => void) | null = null;
  private query = '';
  private category: ReferenceKind = 'all';
  private scope = 'all';
  private selectedEntityId: string | null = null;
  private folioOpener: ((characterName: string) => void) | null = null;

  setFolioOpener(fn: (characterName: string) => void): void {
    this.folioOpener = fn;
  }

  constructor(
    mount: HTMLElement,
    private closeCallback: () => void,
    private update: (entity: ReaderDossier['entity'], patch: { suppressed?: boolean; pinned?: boolean; note?: string }) => boolean,
    private documentState: (open: boolean) => void = () => {}
  ) {
    this.host.dataset.vnDossier = '';
    this.host.hidden = true;
    this.host.addEventListener('click', event => {
      event.stopPropagation();
      if (event.target === this.host) this.close();
    });
    this.host.addEventListener('pointerdown', event => event.stopPropagation());
    this.host.addEventListener('wheel', event => event.stopPropagation());
    this.host.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
      if (event.key === 'Tab' && !this.host.dataset.vnWorkspaceTool) {
        const focusable = [...this.host.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,[tabindex]')].filter(
          e => e.getClientRects().length > 0 &&
               (!e.closest('details:not([open])') || e.tagName === 'SUMMARY') &&
               (e.tabIndex >= 0 || e.tagName === 'SUMMARY') &&
               !e.hasAttribute('disabled')
        );
        const current = (typeof this.host.getRootNode === 'function' ? this.host.getRootNode() : this.host.ownerDocument) as ShadowRoot | Document;
        const activeEl = (current as ShadowRoot).activeElement || document.activeElement;
        const index = focusable.indexOf(activeEl as HTMLElement);
        if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === focusable.length - 1)) {
          event.preventDefault();
          (event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
        }
      }
    });
    mount.append(this.host);
  }

  resetForContext(): void {
    this.query = '';
    this.category = 'all';
    this.scope = 'all';
    this.selectedEntityId = null;
    this.trayReturn = null;
  }

  clearBack(): void {
    this.trayReturn = null;
  }

  setDocked(): void {
    this.host.dataset.vnWorkspaceTool = 'story';
  }

  back(): boolean {
    const documentBack = this.host.querySelector<HTMLButtonElement>('[data-vn-document-reader] button[aria-label="Back to item"]');
    if (documentBack) {
      documentBack.click();
      return true;
    }
    if (!this.host.querySelector('[data-vn-reference-sheet]') && this.trayReturn) {
      this.trayReturn();
      return true;
    }
    return false;
  }

  isOpen(): boolean {
    return !this.host.hidden;
  }

  open(
    dossier: ReaderDossier,
    prefs: TooltipPreferences,
    chatId: string,
    trigger: HTMLElement,
    actions?: {
      drafts: InteractionDraft[];
      current: () => string;
      apply: (draft: InteractionDraft, mode: DraftMergeMode) => boolean;
      focus: () => void;
    },
    storyDocument?: StoryDocument,
    visual?: DossierVisualContext
  ): void {
    this.documentState(false);
    this.returnFocus = trigger;
    this.host.replaceChildren();

    const kind = dossier.entity.kind;
    const panel = document.createElement('section');
    panel.dataset.vnDossierCard = '';
    panel.dataset.dossierKind = kind;
    panel.setAttribute('role', 'dialog');
    if (!this.host.dataset.vnWorkspaceTool) panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', `About ${dossier.entity.name}`);

    const header = document.createElement('header');
    header.className = 'dossier-topbar-header';
    header.style.cssText = 'position:sticky;top:0;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--vn-shell-panel, rgba(15,23,42,0.96));border-bottom:1px solid var(--vn-shell-border, rgba(255,255,255,0.12));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'workspace-back-btn dossier-back-btn has-label';
    back.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;border-radius:8px;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.22));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);flex:none;white-space:nowrap;width:auto !important;min-width:auto !important;height:44px;';
    back.innerHTML = APERTURE_ICONS.back + (this.trayReturn ? '<span>Back to Lens</span>' : '<span>Back to Reading</span>');
    back.title = this.trayReturn ? 'Back to references' : 'Back to reading';
    back.setAttribute('aria-label', this.trayReturn ? 'Back to references' : 'Back to reading');
    back.onclick = () => {
      if (this.trayReturn) {
        this.trayReturn();
      } else {
        this.close();
      }
    };

    const title = document.createElement('h2');
    title.style.cssText = 'flex:1;margin:0 8px;font-size:15px;font-weight:700;color:var(--vn-shell-text, #f1f5f9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;';
    title.textContent = kind === 'npc' ? `Character folio · ${dossier.entity.name}` : dossier.entity.name;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dossier-close-btn';
    close.style.cssText = 'min-width:44px;min-height:44px;width:44px;height:44px;border-radius:50%;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.18));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);cursor:pointer;display:grid;place-items:center;font-size:16px;line-height:1;flex:none;';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close information');
    close.onclick = () => this.close();

    header.append(back, title, close);
    panel.append(header);

    const override = entityOverride(prefs, chatId, dossier.entity);
    let currentPinned = override?.pinned === true;

    // APERTURE v4 Folio Hero Card (Screen 5 Character Folio or Location/Item showcase)
    const heroCard = document.createElement('div');
    heroCard.className = 'folio-hero-card';
    heroCard.dataset.dossierHero = kind;

    const figure = document.createElement('figure');
    figure.dataset.dossierMedia = kind;
    if (visual?.imageUrl) {
      figure.dataset.hasImage = 'true';
      const img = document.createElement('img');
      img.src = visual.imageUrl;
      img.alt = visual.imageCaption ?? dossier.entity.name;
      img.loading = 'eager';
      figure.append(img);
      if (visual.imageCaption) {
        const cap = document.createElement('figcaption');
        cap.textContent = visual.imageCaption;
        figure.append(cap);
      }
      figure.title = 'Click to toggle full artwork view';
      figure.onclick = () => {
        figure.dataset.expanded = figure.dataset.expanded === 'true' ? 'false' : 'true';
      };
    } else {
      figure.dataset.hasImage = 'false';
      figure.innerHTML = fallbackSvgForKind(kind, dossier.entity.name);
    }
    heroCard.append(figure);

    const folioLabel = document.createElement('div');
    folioLabel.className = 'folio-hero-label';
    folioLabel.textContent = dossier.entity.name;
    heroCard.append(folioLabel);

    const folioSub = document.createElement('div');
    folioSub.className = 'folio-hero-sub';
    const subLocation = visual?.locationName ? visual.locationName.toUpperCase() : (visual?.isPresent ? 'PRESENT IN SCENE' : 'KNOWN IN STORY');
    const subAlias = (dossier.entity.aliases[0] ?? (kind === 'npc' ? 'CHARACTER' : kind === 'place' ? 'LOCATION' : 'ITEM')).toUpperCase();
    folioSub.textContent = `${subAlias} · ${subLocation}`;
    heroCard.append(folioSub);

    panel.append(heroCard);

    // Meta Tags Bar (.folio-meta)
    const folioMeta = document.createElement('div');
    folioMeta.className = 'folio-meta';
    folioMeta.dataset.dossierIdentity = '';

    const kindSmall = document.createElement('small');
    kindSmall.dataset.referenceKind = '';
    kindSmall.textContent = `${kind === 'npc' ? 'Character' : kind === 'place' ? 'Location' : 'Item'} · Established story information`;
    kindSmall.style.display = 'none';
    folioMeta.append(kindSmall);

    const tagPresent = document.createElement('span');
    tagPresent.className = 'tag night';
    tagPresent.textContent = kind === 'place'
      ? (visual?.isActiveLocation ? '📍 Current scene location' : '🗺️ Known location')
      : (visual?.isPresent ? 'SEEN IN SCENE' : 'MENTIONED IN STORY');
    folioMeta.append(tagPresent);

    if (dossier.entity.aliases.length) {
      const aliasesDiv = document.createElement('div');
      aliasesDiv.dataset.dossierAliases = '';
      aliasesDiv.textContent = `Also known as: ${dossier.entity.aliases.join(', ')}`;
      aliasesDiv.style.display = 'none';
      folioMeta.append(aliasesDiv);

      for (const alias of dossier.entity.aliases.slice(0, 3)) {
        const aliasTag = document.createElement('span');
        aliasTag.className = 'tag night';
        aliasTag.textContent = alias.toUpperCase();
        folioMeta.append(aliasTag);
      }
    }

    if (currentPinned) {
      const pinTag = document.createElement('span');
      pinTag.className = 'tag night';
      pinTag.textContent = '📌 PINNED';
      folioMeta.append(pinTag);
    }

    if (visual?.anchors && visual.anchors.length > 0) {
      for (const anchor of visual.anchors) {
        const anchorTag = document.createElement('span');
        anchorTag.className = 'tag anchor-tag';
        anchorTag.textContent = `⚓ ${anchor}`;
        anchorTag.title = 'Visual consistency anchor trait';
        folioMeta.append(anchorTag);
      }
    }

    const legacyBadges = document.createElement('div');
    legacyBadges.dataset.dossierBadges = '';
    legacyBadges.style.display = 'none';
    const addLegacyBadge = (lbl: string, tone: string) => {
      const b = document.createElement('span');
      b.dataset.dossierBadge = tone;
      b.textContent = lbl;
      legacyBadges.append(b);
    };
    if (kind === 'place') addLegacyBadge(visual?.isActiveLocation ? '📍 Current scene location' : '🗺️ Known location', visual?.isActiveLocation ? 'active' : 'muted');
    else if (kind === 'npc') addLegacyBadge(visual?.isPresent ? '● Present in scene' : '○ Mentioned in story', visual?.isPresent ? 'active' : 'muted');
    else addLegacyBadge(visual?.isPresent ? '✦ In current scene' : '✦ Story item', visual?.isPresent ? 'active' : 'muted');
    if (currentPinned) addLegacyBadge('📌 Pinned', 'pinned');
    folioMeta.append(legacyBadges);

    panel.append(folioMeta);

    // Facts extraction
    const facts = dossier.facts.filter(f => f.value.trim() && prefs.fieldGroups[referenceFieldInfo(f.field).section] !== false);
    const earlier = prefs.rememberReferences ? (dossier.earlier ?? []).filter(e => prefs.fieldGroups[referenceFieldInfo(e.reference.field).section] !== false) : [];
    const lasting = facts.filter(f => !referenceFieldInfo(f.field).living);
    const overview = lasting.filter(f => ['overview', 'identity'].includes(referenceFieldInfo(f.field).section)).slice(0, 2);
    if (!overview.length && lasting.length) overview.push(lasting[0]!);

    const maxFactChars = Math.max(80, Math.min(1200, prefs.maxFactChars ?? 320));

    const appendFact = (list: HTMLElement, field: string, value: string) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = referenceFieldInfo(field).label;

      const contentSpan = document.createElement('span');
      contentSpan.className = 'fact-value-text';

      const renderText = (currentVal: string) => {
        contentSpan.textContent = '';
        if (currentVal.length > maxFactChars) {
          const span = document.createElement('span');
          const toggle = document.createElement('button');
          let expanded = false;
          span.textContent = `${currentVal.slice(0, maxFactChars).trimEnd()}… `;
          toggle.type = 'button';
          toggle.dataset.factExpand = '';
          toggle.textContent = 'Show full';
          toggle.onclick = () => {
            expanded = !expanded;
            span.textContent = expanded ? `${currentVal} ` : `${currentVal.slice(0, maxFactChars).trimEnd()}… `;
            toggle.textContent = expanded ? 'Show less' : 'Show full';
          };
          contentSpan.append(span, toggle);
        } else {
          contentSpan.textContent = currentVal;
        }
      };

      let activeVal = value;
      renderText(activeVal);
      dd.append(contentSpan);

      // Fact Action buttons (Edit & Delete)
      const actionSpan = document.createElement('span');
      actionSpan.className = 'fact-actions';
      actionSpan.style.cssText = 'margin-left:8px;display:inline-flex;gap:4px;vertical-align:middle;';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.title = 'Edit reference fact';
      editBtn.className = 'fact-edit-btn';
      editBtn.textContent = '✏️';
      editBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:11px;opacity:0.6;padding:0 2px;';
      editBtn.onmouseenter = () => { editBtn.style.opacity = '1'; };
      editBtn.onmouseleave = () => { editBtn.style.opacity = '0.6'; };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.title = 'Delete reference fact';
      delBtn.className = 'fact-del-btn';
      delBtn.textContent = '🗑️';
      delBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:11px;opacity:0.6;padding:0 2px;';
      delBtn.onmouseenter = () => { delBtn.style.opacity = '1'; };
      delBtn.onmouseleave = () => { delBtn.style.opacity = '0.6'; };

      editBtn.onclick = () => {
        if (dd.querySelector('.fact-edit-input')) return;
        contentSpan.style.display = 'none';
        actionSpan.style.display = 'none';

        const editWrap = document.createElement('div');
        editWrap.className = 'fact-edit-input';
        editWrap.style.cssText = 'display:flex;gap:4px;margin-top:4px;align-items:center;';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = activeVal;
        input.style.cssText = 'flex:1;font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.25);background:rgba(0,0,0,0.3);color:inherit;';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = '✓';
        saveBtn.title = 'Save';
        saveBtn.style.cssText = 'padding:2px 8px;font-size:12px;border-radius:4px;cursor:pointer;background:rgba(255,255,255,0.15);border:none;color:inherit;';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = '✕';
        cancelBtn.title = 'Cancel';
        cancelBtn.style.cssText = 'padding:2px 8px;font-size:12px;border-radius:4px;cursor:pointer;background:transparent;border:none;color:inherit;opacity:0.7;';

        saveBtn.onclick = () => {
          const newVal = input.value.trim();
          if (newVal) {
            activeVal = newVal;
            const match = dossier.facts.find(f => f.field === field);
            if (match) match.value = newVal;
            if (dossier.state && field in dossier.state) dossier.state[field] = newVal;
          }
          renderText(activeVal);
          editWrap.remove();
          contentSpan.style.display = '';
          actionSpan.style.display = 'inline-flex';
        };

        cancelBtn.onclick = () => {
          editWrap.remove();
          contentSpan.style.display = '';
          actionSpan.style.display = 'inline-flex';
        };

        input.onkeydown = (e) => {
          if (e.key === 'Enter') saveBtn.click();
          if (e.key === 'Escape') cancelBtn.click();
        };

        editWrap.append(input, saveBtn, cancelBtn);
        dd.append(editWrap);
        input.focus();
      };

      delBtn.onclick = () => {
        dt.remove();
        dd.remove();
        const idx = dossier.facts.findIndex(f => f.field === field);
        if (idx >= 0) dossier.facts.splice(idx, 1);
        if (dossier.state && field in dossier.state) delete dossier.state[field];
      };

      actionSpan.append(editBtn, delBtn);
      dd.append(actionSpan);
      list.append(dt, dd);
    };

    // APERTURE Quote Callout
    if (overview.length && overview[0]?.value) {
      const quoteCallout = document.createElement('blockquote');
      quoteCallout.className = 'folio-quote-callout';
      const cleanVal = overview[0].value.replace(/^["“]|["”]$/g, '').trim();
      quoteCallout.textContent = `“${cleanVal}”`;
      panel.append(quoteCallout);

      const section = document.createElement('section');
      const list = document.createElement('dl');
      section.dataset.referenceOverview = '';
      for (const fact of overview) appendFact(list, fact.field, fact.value);
      section.append(list);
      panel.append(section);
    }

    // For Location sheets: Present characters
    if (kind === 'place' && visual?.presentCharacters?.length && visual.onSelectEntity) {
      const castSection = document.createElement('section');
      castSection.dataset.dossierPresentCast = '';
      const castHeading = document.createElement('h3');
      castHeading.textContent = 'Characters at this location';
      const castRow = document.createElement('div');
      castRow.dataset.dossierCastChips = '';
      for (const char of visual.presentCharacters) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.dossierCastChip = '';
        chip.textContent = `👤 ${char.name}`;
        chip.onclick = () => {
          const prevReturn = this.trayReturn;
          this.trayReturn = () => {
            this.trayReturn = prevReturn;
            this.open(dossier, prefs, chatId, trigger, actions, storyDocument, visual);
          };
          visual.onSelectEntity!(char.id, trigger);
        };
        castRow.append(chip);
      }
      castSection.append(castHeading, castRow);
      panel.append(castSection);
    }

    const overviewPairs = new Set(overview.map(f => `${f.field}::${f.value.trim()}`));
    const current = new Map<string, string>();
    for (const fact of facts) {
      if (referenceFieldInfo(fact.field).living && !overviewPairs.has(`${fact.field}::${fact.value.trim()}`)) {
        current.set(fact.field, fact.value);
      }
    }
    const observations = facts.filter(f => referenceFieldInfo(f.field).living && dossier.state[f.field]?.trim() && dossier.state[f.field] !== f.value);
    for (const [field, value] of Object.entries(dossier.state)) {
      if (value.trim() && !overviewPairs.has(`${field}::${value.trim()}`) && prefs.fieldGroups.state !== false && prefs.fieldGroups[referenceFieldInfo(field).section] !== false) {
        current.set(field, value);
      }
    }

    // APERTURE v4 2-Column Verified Observations Grid (.observations-grid)
    const allObservations = [...facts, ...[...current.entries()].map(([k, v]) => ({ field: k, value: v, source: { provider: 'state' } as any }))];
    if (allObservations.length) {
      const obsHead = document.createElement('div');
      obsHead.style.cssText = 'margin:18px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;display:flex;align-items:center;justify-content:space-between;';
      obsHead.innerHTML = '<span>Verified observations</span><span style="font-size:9px;opacity:0.65;">ESTABLISHED FACTS</span>';
      panel.append(obsHead);

      const grid = document.createElement('div');
      grid.className = 'observations-grid';
      for (const item of allObservations.slice(0, 8)) {
        const cell = document.createElement('div');
        cell.className = 'observation-cell';
        if (item.value.length > 55) cell.classList.add('observation-cell-wide');
        const label = document.createElement('span');
        label.textContent = referenceFieldInfo(item.field).label;
        const strong = document.createElement('strong');
        strong.textContent = `${item.value} `;
        const em = document.createElement('em');
        em.textContent = item.source?.provider === 'model' || ('revealedAt' in item && Boolean((item as any).revealedAt)) ? 'SEEN' : 'TOLD';
        strong.append(em);
        cell.append(label, strong);
        grid.append(cell);
      }
      panel.append(grid);
    }

    if (current.size) {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      const list = document.createElement('dl');
      section.dataset.referenceCurrent = '';
      heading.textContent = observations.length ? 'Tracked scene state' : 'Current state';
      for (const [field, value] of current) appendFact(list, field, value);
      section.append(heading, list);
      panel.append(section);
    }

    if (observations.length) {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      const list = document.createElement('dl');
      section.dataset.referenceObservations = '';
      heading.textContent = 'Story observations';
      for (const fact of observations) {
        appendFact(list, fact.field, fact.value);
        const label = list.lastElementChild?.previousElementSibling;
        if (label && fact.revealedAt) label.textContent += ` · paragraph ${fact.revealedAt.paragraphIndex + 1}`;
      }
      section.append(heading, list);
      panel.append(section);
    }

    for (const group of REFERENCE_FIELD_GROUPS) {
      const grouped = lasting.filter(f => referenceFieldInfo(f.field).section === group.id && !overview.includes(f) && current.get(f.field)?.trim() !== f.value.trim());
      if (!grouped.length) continue;
      const section = document.createElement('details');
      const summary = document.createElement('summary');
      const list = document.createElement('dl');
      section.dataset.referenceSection = group.id;
      summary.textContent = group.label;
      for (const fact of grouped) appendFact(list, fact.field, fact.value);
      section.append(summary, list);
      panel.append(section);
    }

    if (earlier.length) {
      const section = document.createElement('details');
      const summary = document.createElement('summary');
      const help = document.createElement('p');
      section.dataset.referenceEarlier = '';
      summary.textContent = `Earlier in this story · ${earlier.length}`;
      help.textContent = 'Descriptions from earlier verified replies. Current scene state is shown separately.';
      section.append(summary, help);
      section.open = !facts.length && !current.size;
      for (const entry of earlier) {
        const list = document.createElement('dl');
        appendFact(list, entry.reference.field, entry.reference.value);
        const source = document.createElement('details');
        const label = document.createElement('summary');
        const quote = document.createElement('blockquote');
        label.textContent = `Reply ${entry.replyNumber} · paragraph ${entry.reference.paragraphIndex + 1}`;
        quote.textContent = entry.reference.evidence;
        source.dataset.earlierSource = '';
        source.append(label, quote);
        section.append(list, source);
      }
      panel.append(section);
    }

    if (!facts.length && !current.size && !earlier.length) {
      const p = document.createElement('p');
      p.dataset.referenceEmpty = '';
      p.textContent = 'No additional information is available with these display settings.';
      panel.append(p);
    }

    if (facts.length) {
      const sources = document.createElement('details');
      const summary = document.createElement('summary');
      const list = document.createElement('ul');
      sources.dataset.referenceSources = '';
      summary.textContent = 'Sources';
      for (const fact of facts) {
        const item = document.createElement('li');
        item.textContent = `${referenceFieldInfo(fact.field).label} · ${fact.source.provider}${fact.revealedAt ? ` · revealed paragraph ${fact.revealedAt.paragraphIndex + 1}` : ''}`;
        list.append(item);
      }
      sources.append(summary, list);
      panel.append(sources);
    }

    if (storyDocument) {
      if (storyDocument.sections.length) {
        const read = document.createElement('button');
        read.type = 'button';
        read.textContent = 'Read revealed text';
        read.dataset.vnReadDocument = '';
        read.onclick = () => {
          if (this.host.hidden || panel.parentElement !== this.host) return;
          const reader = createDocumentReader(
            storyDocument,
            () => {
              if (this.host.hidden || reader.parentElement !== this.host) return;
              this.open(dossier, prefs, chatId, trigger, actions, storyDocument, visual);
              this.host.querySelector<HTMLElement>('[data-vn-read-document]')?.focus();
            },
            () => {
              if (!this.host.hidden && reader.parentElement === this.host) this.close();
            }
          );
          if (this.host.dataset.vnWorkspaceTool) reader.removeAttribute('aria-modal');
          this.documentState(true);
          this.host.replaceChildren(reader);
          reader.querySelector<HTMLElement>('button')?.focus();
        };
        panel.append(read);
      } else {
        const missing = document.createElement('p');
        missing.textContent = 'No document text has been revealed. Examining the item is a story action; opening this card does not unlock it.';
        panel.append(missing);
      }
    }

    if (actions?.drafts.length) {
      panel.append(new InteractionTray(actions.drafts, actions.current, (draft, mode) => {
        if (!actions.apply(draft, mode)) return false;
        this.close();
        actions.focus();
        return true;
      }).host);
    }

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.hidden = true;
    panel.append(status);

    const commit = (patch: { suppressed?: boolean; pinned?: boolean; note?: string }, closeOnSuccess = false): boolean => {
      if (this.update(dossier.entity, patch)) {
        if (closeOnSuccess) this.close();
        return true;
      }
      status.textContent = 'Reference customization limit reached (64). Reset local reference customizations in Reading settings to make room.';
      status.hidden = false;
      return false;
    };

    const localActions = document.createElement('div');
    const pin = document.createElement('button');
    const suppress = document.createElement('button');
    localActions.dataset.referenceActions = '';
    pin.type = suppress.type = 'button';
    pin.textContent = currentPinned ? 'Unpin' : 'Pin reference';
    pin.setAttribute('aria-pressed', String(currentPinned));
    pin.onclick = () => {
      const next = !currentPinned;
      if (commit({ pinned: next })) {
        currentPinned = next;
        pin.textContent = currentPinned ? 'Unpin' : 'Pin reference';
        pin.setAttribute('aria-pressed', String(currentPinned));
        status.textContent = currentPinned ? 'Reference pinned to top of scene references.' : 'Reference unpinned.';
        status.hidden = false;
      }
    };
    suppress.textContent = 'Hide this reference';
    suppress.onclick = () => {
      commit({ suppressed: true }, true);
    };
    localActions.append(pin, suppress);
    panel.append(localActions);

    const notes = document.createElement('details');
    const noteSummary = document.createElement('summary');
    notes.dataset.referenceNotes = '';
    noteSummary.textContent = 'Local display note';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = 'Your note (does not change the story)';
    const input = document.createElement('textarea');
    input.maxLength = 600;
    input.value = override?.note ?? '';
    noteLabel.append(input);
    const noteDisplay = document.createElement('p');
    noteDisplay.dataset.referenceSavedNote = '';
    noteDisplay.hidden = !override?.note;
    if (override?.note) noteDisplay.textContent = `Your note: ${override.note}`;
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save note';
    save.onclick = () => {
      if (commit({ note: input.value })) {
        const trimmed = input.value.trim();
        noteDisplay.hidden = !trimmed;
        noteDisplay.textContent = trimmed ? `Your note: ${input.value}` : '';
        status.textContent = trimmed ? 'Local note saved.' : 'Local note cleared.';
        status.hidden = false;
      }
    };
    notes.append(noteSummary, noteLabel, save);
    panel.append(notes, noteDisplay);

    this.host.append(panel);
    this.host.hidden = false;
    if (this.host.dataset.vnWorkspaceTool) {
      title.tabIndex = -1;
      title.focus();
    } else {
      close.focus();
    }
  }

  openTray(
    entries: ReturnType<typeof referenceEntries>,
    trigger: HTMLElement,
    open: (id: string, trigger: HTMLElement) => void,
    note?: string,
    visualResolver?: (entity: ReaderDossier['entity']) => DossierVisualContext
  ): void {
    this.documentState(false);
    if (!this.isOpen()) {
      this.query = '';
      this.category = 'all';
      this.scope = 'all';
      this.selectedEntityId = null;
    }
    this.returnFocus = trigger;
    this.trayReturn = () => this.openTray(entries, trigger, open, note, visualResolver);
    this.host.replaceChildren();

    const panel = document.createElement('section');
    panel.dataset.vnDossierCard = '';
    panel.dataset.vnReferenceSheet = '';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'World Lens');

    // Header with APERTURE Back button, Title and Close
    const header = document.createElement('header');
    header.className = 'dossier-topbar-header';
    header.style.cssText = 'position:sticky;top:0;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--vn-shell-panel, rgba(15,23,42,0.96));border-bottom:1px solid var(--vn-shell-border, rgba(255,255,255,0.12));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'workspace-back-btn dossier-back-btn has-label';
    backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;border-radius:8px;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.22));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);flex:none;white-space:nowrap;width:auto !important;min-width:auto !important;height:44px;';
    backBtn.innerHTML = APERTURE_ICONS.back + '<span>Back to Reading</span>';
    backBtn.title = 'Back to reading';
    backBtn.setAttribute('aria-label', 'Back to reading');
    backBtn.onclick = () => this.close();

    const title = document.createElement('h2');
    title.style.cssText = 'flex:1;margin:0 8px;font-size:15px;font-weight:700;color:var(--vn-shell-text, #f1f5f9);letter-spacing:-0.01em;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    title.textContent = 'World Lens';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dossier-close-btn';
    close.style.cssText = 'min-width:44px;min-height:44px;width:44px;height:44px;border-radius:50%;border:1px solid var(--vn-shell-border, rgba(255,255,255,0.18));background:var(--vn-shell-button, rgba(255,255,255,0.08));color:var(--vn-shell-text, #f1f5f9);cursor:pointer;display:grid;place-items:center;font-size:16px;line-height:1;flex:none;';
    close.textContent = '×';
    close.title = 'Close references';
    close.setAttribute('aria-label', 'Close information');
    close.onclick = () => this.close();
    header.append(backBtn, title, close);
    panel.append(header);

    const titleBlock = document.createElement('div');
    titleBlock.style.cssText = 'margin:4px 0 10px;';
    const pageTitle = document.createElement('h1');
    pageTitle.className = 'page-title';
    pageTitle.style.cssText = 'margin:0;font-size:26px;font-family:Georgia,serif;letter-spacing:-0.03em;line-height:1.2;';
    pageTitle.textContent = 'Look closer.';
    const pageSub = document.createElement('div');
    pageSub.className = 'page-sub';
    pageSub.style.cssText = 'font-size:11px;opacity:0.75;margin-top:2px;';
    pageSub.textContent = 'People, places and items established in the story.';
    titleBlock.append(pageTitle, pageSub);
    panel.append(titleBlock);

    // Filter Chips (.chip-row)
    const tabs = document.createElement('div');
    tabs.dataset.referenceCategories = '';
    tabs.className = 'chip-row';
    tabs.setAttribute('aria-label', 'Story categories');

    const filters = document.createElement('div');
    filters.dataset.referenceFilters = '';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'input-wrap';
    inputWrap.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m12.5 12.5 4.5 4.5"/></svg>';

    const search = document.createElement('input');
    search.type = 'search';
    search.maxLength = 160;
    search.placeholder = 'Find a known reference…';
    search.setAttribute('aria-label', 'Search references');
    search.value = this.query;
    inputWrap.append(search);

    const category = document.createElement('select');
    category.setAttribute('aria-label', 'Reference category');
    category.style.display = 'none';

    for (const [value, label] of [['all', 'All'], ['npc', 'People'], ['place', 'Places'], ['object', 'Items']]) {
      const option = document.createElement('option');
      option.value = value!;
      option.textContent = label!;
      category.append(option);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = label!;
      button.dataset.referenceCategory = value!;
      button.onclick = () => {
        category.value = value!;
        render();
      };
      tabs.append(button);
    }
    const folioBtn = document.createElement('button');
    folioBtn.type = 'button';
    folioBtn.className = 'chip folio-shortcut-chip';
    folioBtn.style.cssText = 'background:rgba(168,85,247,0.18);color:#d8b4fe;border:1px solid rgba(168,85,247,0.35);';
    folioBtn.innerHTML = '👤 Character Folio';
    folioBtn.title = 'Open Character Folio for character DNA, portraits and lore';
    folioBtn.onclick = () => {
      this.folioOpener?.('');
    };
    tabs.append(folioBtn);

    const addRefBtn = document.createElement('button');
    addRefBtn.type = 'button';
    addRefBtn.className = 'chip add-ref-chip';
    addRefBtn.style.cssText = 'background:rgba(56,189,248,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);margin-left:auto;';
    addRefBtn.textContent = '＋ Add Reference';
    addRefBtn.title = 'Manually add a location or item to the story world';
    filters.append(addRefBtn);

    category.value = this.category;
    filters.append(inputWrap, category);

    const scope = document.createElement('select');
    scope.setAttribute('aria-label', 'Reference scope');
    scope.dataset.referenceScope = '';
    for (const [value, label] of [['all', 'Reply & earlier'], ['reply', 'This reply']]) {
      const option = document.createElement('option');
      option.value = value!;
      option.textContent = label!;
      scope.append(option);
    }
    scope.value = this.scope;
    scope.hidden = !entries.some(e => e.entity.id.startsWith('earlier:'));
    filters.append(scope);

    panel.append(tabs, filters);

    if (note) {
      const hint = document.createElement('small');
      hint.dataset.referenceHistoryNote = '';
      hint.textContent = note;
      panel.append(hint);
    }

    const addRefPanel = document.createElement('div');
    addRefPanel.className = 'add-ref-panel';
    addRefPanel.style.display = 'none';
    addRefPanel.style.cssText = 'display:none;margin:8px 0 12px;padding:12px;border-radius:8px;background:rgba(0,0,0,0.35);border:1px solid rgba(56,189,248,0.35);';
    addRefPanel.innerHTML = '<div style="font-weight:700;font-size:12px;margin-bottom:8px;color:#38bdf8;">＋ Add Story Reference / Artifact</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<input data-add-ref-name type="text" placeholder="Name (e.g. Carved Yew Staff, Flat 3)" style="padding:6px 8px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:inherit;" />' +
      '<select data-add-ref-kind style="padding:6px 8px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:inherit;">' +
      '<option value="object">💎 Item / Unique Artifact</option>' +
      '<option value="place">📍 Location / Place</option>' +
      '</select></div>' +
      '<textarea data-add-ref-desc placeholder="Physical description, materials, visual traits (e.g. carved yew staff encrusted in diamonds wrapped in vines)..." style="width:100%;height:55px;box-sizing:border-box;padding:6px 8px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:inherit;margin-bottom:8px;"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
      '<button type="button" data-add-ref-cancel style="padding:4px 10px;font-size:11px;border-radius:4px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:inherit;cursor:pointer;">Cancel</button>' +
      '<button type="button" data-add-ref-save style="padding:4px 12px;font-size:11px;font-weight:600;border-radius:4px;background:#0284c7;border:none;color:#fff;cursor:pointer;">Save Reference</button>' +
      '</div>';
    panel.append(addRefPanel);

    addRefBtn.onclick = () => {
      addRefPanel.style.display = addRefPanel.style.display === 'none' ? 'block' : 'none';
      if (addRefPanel.style.display === 'block') {
        addRefPanel.querySelector<HTMLInputElement>('[data-add-ref-name]')?.focus();
      }
    };
    addRefPanel.querySelector('[data-add-ref-cancel]')!.addEventListener('click', () => {
      addRefPanel.style.display = 'none';
    });
    addRefPanel.querySelector('[data-add-ref-save]')!.addEventListener('click', () => {
      const nameInput = addRefPanel.querySelector<HTMLInputElement>('[data-add-ref-name]')!;
      const kindSelect = addRefPanel.querySelector<HTMLSelectElement>('[data-add-ref-kind]')!;
      const descInput = addRefPanel.querySelector<HTMLTextAreaElement>('[data-add-ref-desc]')!;
      const name = nameInput.value.trim();
      const kind = kindSelect.value as ReferenceKind;
      const desc = descInput.value.trim();
      if (!name || !desc) return;
      const newEntity: any = {
        id: 'custom:' + Date.now() + ':' + name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name,
        kind,
        aliases: [],
        firstParagraph: 0,
        facts: [{
          id: 'f_custom_' + Date.now(),
          entityId: name,
          field: 'description',
          value: desc,
          visibility: 'observed',
          source: { provider: 'user', recordId: 'manual', observedAt: Date.now() },
          revealedAt: { key: { chatId: 'manual' }, paragraphIndex: 0 }
        }]
      };
      entries.unshift({
        entity: newEntity,
        current: true,
        pinned: true,
        label: name + ': ' + desc,
        overview: desc,
        earlier: false
      } as any);
      this.selectedEntityId = newEntity.id;
      addRefPanel.style.display = 'none';
      nameInput.value = '';
      descInput.value = '';
      render();
    });

    // World Sheet Scene Topology Map (.world-sheet-map)
    const worldSheet = document.createElement('div');
    worldSheet.className = 'world-sheet-map';
    worldSheet.innerHTML = '<svg class="world-map-svg" viewBox="0 0 330 250" aria-hidden="true"><path d="M90 60C160 62 155 90 205 110M90 60C60 90 48 135 48 170M48 170C120 205 130 190 205 190M205 110C225 155 205 170 205 190" stroke="rgba(56,189,248,0.25)" stroke-width="1.5" stroke-dasharray="4 4"/></svg>';
    panel.append(worldSheet);

    // World Lens Card slot right under the map canvas
    const lensSlot = document.createElement('div');
    lensSlot.className = 'world-lens-slot';
    panel.append(lensSlot);

    // Section Head: Known in this scene
    const sectionHead = document.createElement('div');
    sectionHead.style.cssText = 'font-size:10.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;margin:14px 0 6px;display:flex;justify-content:space-between;align-items:center;';
    const sectionHeadLabel = document.createElement('span');
    sectionHeadLabel.textContent = 'Known in this scene';
    const countBadge = document.createElement('span');
    countBadge.style.cssText = 'font-size:9px;opacity:0.65;font-weight:600;';
    sectionHead.append(sectionHeadLabel, countBadge);
    panel.append(sectionHead);

    // Horizontal Thumbnail Strip (.world-strip)
    const worldStrip = document.createElement('div');
    worldStrip.className = 'world-strip';
    panel.append(worldStrip);

    const count = document.createElement('p');
    count.dataset.referenceCount = '';
    count.setAttribute('role', 'status');
    count.style.display = 'none';

    const list = document.createElement('div');
    list.dataset.referenceList = '';
    panel.append(count, list);

    const render = () => {
      for (const button of tabs.querySelectorAll<HTMLElement>('button')) {
        const isActive = button.dataset.referenceCategory === category.value;
        button.setAttribute('aria-pressed', String(isActive));
        if (isActive) button.classList.add('active');
        else button.classList.remove('active');
      }
      this.query = search.value;
      this.category = category.value as ReferenceKind;
      this.scope = scope.value;

      list.replaceChildren();
      worldStrip.replaceChildren();

      // Clear map nodes from worldSheet while keeping the svg
      const svg = worldSheet.querySelector('.world-map-svg');
      worldSheet.replaceChildren();
      if (svg) worldSheet.append(svg);

      const filtered = entries.filter(({ entity }) =>
        (this.scope === 'all' || !entity.id.startsWith('earlier:')) &&
        (this.category === 'all' || entity.kind === this.category) &&
        (!this.query.trim() || [entity.name, ...entity.aliases].some(name => name.toLocaleLowerCase().includes(this.query.trim().toLocaleLowerCase())))
      );

      count.textContent = filtered.length ? `${filtered.length} reference${filtered.length === 1 ? '' : 's'}` : 'No references match. Try another name or category.';
      countBadge.textContent = `${filtered.length} FOUND`;

      if (!filtered.some(e => e.entity.id === this.selectedEntityId)) {
        this.selectedEntityId = filtered[0]?.entity.id ?? null;
      }

      const activeEntry = filtered.find(e => e.entity.id === this.selectedEntityId) ?? filtered[0];

      // Populate World Sheet Scene Topology Map Nodes
      const places = filtered.filter(e => e.entity.kind === 'place');
      const mapEntries = places.length > 0 ? places.slice(0, 8) : filtered.slice(0, 8);
      mapEntries.forEach(({ entity }, i) => {
        const pos = MAP_POSITIONS[i % MAP_POSITIONS.length]!;
        const vis = visualResolver?.(entity);
        const isActiveLoc = vis?.isActiveLocation;
        const nodeBtn = document.createElement('button');
        nodeBtn.type = 'button';
        nodeBtn.className = `map-node-pill ${this.selectedEntityId === entity.id ? 'active' : ''} ${isActiveLoc ? 'active-location' : ''}`;
        nodeBtn.style.left = `${pos[0]}%`;
        nodeBtn.style.top = `${pos[1]}%`;
        const iconSym = entity.kind === 'place' ? (isActiveLoc ? '★' : '📍') : entity.kind === 'object' ? '💎' : '👤';
        const subTxt = isActiveLoc ? 'ACTIVE LOCATION' : (entity.kind === 'npc' ? 'Character' : entity.kind === 'place' ? 'Location' : 'Item');
        nodeBtn.innerHTML = html`<span class="index-dot"></span><b>${iconSym} ${entity.name}</b><small>${subTxt}</small>`.value;
        nodeBtn.onclick = () => {
          this.selectedEntityId = entity.id;
          render();
        };
        worldSheet.append(nodeBtn);
      });

      // World Lens Preview Card at bottom of map
      const lensCard = document.createElement('div');
      lensCard.className = 'world-lens';
      if (activeEntry) {
        const vis = visualResolver?.(activeEntry.entity);
        const lensTitle = document.createElement('h3');
        lensTitle.textContent = activeEntry.entity.name;
        const lensDesc = document.createElement('p');
        lensDesc.textContent = vis?.summarySnippet ?? (activeEntry.entity.kind === 'npc' ? 'Character recognized in current scene.' : activeEntry.entity.kind === 'place' ? 'Location recognized in current scene.' : 'Item recognized in current scene.');

        const ctaBtn = document.createElement('button');
        ctaBtn.type = 'button';
        ctaBtn.className = 'world-lens-cta';
        ctaBtn.textContent = activeEntry.entity.kind === 'npc' ? 'Open character folio →' : activeEntry.entity.kind === 'object' ? 'See known documents →' : 'Inspect reference →';
        ctaBtn.onclick = () => {
          if (activeEntry.entity.kind === 'npc' && this.folioOpener) {
            this.folioOpener(activeEntry.entity.name);
          } else {
            open(activeEntry.entity.id, trigger);
          }
        };

        const evidence=document.createElement('button');evidence.type='button';evidence.textContent='Read story reference';evidence.onclick=()=>open(activeEntry.entity.id,trigger);
        const hideBtn=document.createElement('button');hideBtn.type='button';hideBtn.style.cssText='display:inline-block;margin-top:6px!important;margin-left:6px!important;min-height:0!important;min-width:0!important;padding:4px 10px!important;font-size:10.5px!important;font-weight:600!important;border-radius:6px!important;background:rgba(255,255,255,0.08)!important;color:var(--vn-muted-text,#d1dfd5)!important;border:1px solid rgba(255,255,255,0.18)!important;cursor:pointer;';hideBtn.textContent='✕ Hide from Lens';hideBtn.title='Hide this reference from World Lens';hideBtn.onclick=()=>{if(this.update(activeEntry.entity,{suppressed:true})){const idx=entries.findIndex(e=>e.entity.id===activeEntry.entity.id);if(idx>=0)entries.splice(idx,1);this.selectedEntityId=null;render();}};
        lensCard.append(lensTitle, lensDesc, ctaBtn, evidence, hideBtn);
      } else {
        lensCard.innerHTML = '<h3>No matching references</h3><p>Try another category or clear the search.</p>';
      }
      lensSlot.replaceChildren(lensCard);

      // Populate Horizontal Strip
      for (const { entity, pinned } of filtered) {
        const vis = visualResolver?.(entity);
        const stripBtn = document.createElement('button');
        stripBtn.type = 'button';
        stripBtn.setAttribute('aria-label',entity.name);stripBtn.setAttribute('aria-pressed',String(this.selectedEntityId===entity.id));
        stripBtn.className = this.selectedEntityId === entity.id ? 'active' : '';

        if (vis?.imageUrl) {
          const img = document.createElement('img');
          img.src = vis.imageUrl;
          img.alt = '';
          stripBtn.append(img);
        } else {
          const initials = document.createElement('span');
          initials.className = 'thumb-initials';
          initials.textContent = entity.kind === 'npc' ? entityInitials(entity.name) : entity.kind === 'place' ? '📍' : '✦';
          stripBtn.append(initials);
        }

        const info = document.createElement('span');
        info.innerHTML = html`<b>${entity.name}</b><small>${pinned ? '📌 ' : ''}${entity.kind === 'npc' ? 'Character' : entity.kind === 'place' ? 'Location' : 'Item'}</small>`.value;
        stripBtn.append(info);

        stripBtn.onclick = () => {
          this.selectedEntityId = entity.id;
          render();
        };
        worldStrip.append(stripBtn);
      }

      // Populate Full [data-reference-list] for screen readers & complete test coverage
      for (const { entity, pinned, label, current: isCurrent } of filtered) {
        const vis = visualResolver?.(entity);
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.referenceCurrent = String(isCurrent);
        button.dataset.referenceKindItem = entity.kind;
        button.setAttribute('aria-label', entity.name);
        button.setAttribute('aria-description', `${pinned ? 'Pinned. ' : ''}${label}`);

        const thumb = document.createElement('span');
        thumb.dataset.referenceThumb = entity.kind;
        if (vis?.imageUrl) {
          const img = document.createElement('img');
          img.src = vis.imageUrl;
          img.alt = '';
          img.loading = 'lazy';
          thumb.append(img);
        } else {
          thumb.textContent = entity.kind === 'npc' ? entityInitials(entity.name) : entity.kind === 'place' ? '📍' : '✦';
        }

        const body = document.createElement('span');
        body.dataset.referenceRowBody = '';
        const nameSpan = document.createElement('span');
        nameSpan.dataset.referenceRowTitle = '';
        nameSpan.textContent = entity.name;
        const detail = document.createElement('small');
        detail.textContent = `${pinned ? '📌 Pinned · ' : ''}${entity.kind === 'npc' ? 'Character' : entity.kind === 'place' ? 'Location' : 'Item'} · ${label}`;
        body.append(nameSpan, detail);

        if (vis?.summarySnippet) {
          const snippet = document.createElement('small');
          snippet.dataset.referenceSnippet = '';
          snippet.textContent = vis.summarySnippet.length > 90 ? `${vis.summarySnippet.slice(0, 90).trimEnd()}…` : vis.summarySnippet;
          body.append(snippet);
        }

        button.append(thumb, body);
        button.onclick = () => open(entity.id, trigger);
        list.append(button);
      }
    };

    search.oninput = render;
    category.onchange = render;
    scope.onchange = render;
    render();

    this.host.append(panel);
    this.host.hidden = false;
    if (this.host.dataset.vnWorkspaceTool) {
      search.focus();
    } else {
      close.focus();
    }
  }

  close(): void {
    this.documentState(false);
    if (this.host.hidden) return;
    this.host.hidden = true;
    this.trayReturn = null;
    if (!this.host.dataset.vnWorkspaceTool) {
      this.query = '';
      this.category = 'all';
      this.selectedEntityId = null;
    }
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target?.isConnected) target.focus();
    else this.host.parentElement?.focus();
    this.closeCallback();
  }

  destroy(): void {
    this.documentState(false);
    this.host.remove();
  }
}

export const DOSSIER_CSS = `
[data-vn-references][hidden]{display:none!important}
[data-vn-root] [data-vn-references]{min-width:44px!important;min-height:44px!important;width:44px;height:44px;padding:0!important;display:inline-flex;align-items:center;justify-content:center}
[data-vn-references] svg{width:20px;height:20px;display:block;flex:none}
[data-vn-root] [data-entity-anchor]{font:inherit;font-weight:650;color:inherit;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,transparent);border:0;border-bottom:1px dotted var(--vn-accent,#9ec6f0);border-radius:.2em;padding:0 .08em;cursor:pointer;text-align:inherit;display:inline;line-height:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}
[data-vn-root] [data-entity-anchor]:hover{background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 28%,transparent)}
[data-entity-anchor]:focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:3px}
[data-vn-dossier][hidden]{display:none!important}
[data-vn-dossier]{position:absolute;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,7,14,.74);backdrop-filter:blur(6px);padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box}
[data-vn-dossier-card]{box-sizing:border-box;width:min(100%,580px);max-height:min(86dvh,calc(100dvh - 24px));overflow:auto;overscroll-behavior:contain;padding:20px;border:1px solid var(--vn-panel-border,#666);border-radius:18px;background:var(--vn-panel-solid,#171b26);color:var(--vn-chrome-text,var(--vn-text,#eef1f7));box-shadow:0 16px 56px rgba(0,0,0,.65);touch-action:pan-y;font:inherit;line-height:1.55;scroll-padding-top:76px}
[data-vn-dossier-card] header{position:sticky;top:-20px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-4px 0 0;padding:4px 0 10px;background:var(--vn-panel-solid,#171b26);border-bottom:1px solid var(--vn-panel-border,#666)}
[data-vn-dossier-card] h2{flex:1;min-width:0;margin:0;font-size:1.2em;line-height:1.3;overflow-wrap:anywhere}
[data-vn-dossier-card] button{box-sizing:border-box;font:inherit;min-width:44px;min-height:44px;padding:8px 12px;margin:4px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;cursor:pointer;white-space:normal;transition:border-color .15s ease,background-color .15s ease}
[data-vn-dossier-card] button:hover{border-color:var(--vn-accent,#9ec6f0);background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 14%,var(--vn-button-bg,#ffffff0d))}
[data-vn-dossier-card] header button{flex:none;margin:0;width:44px;padding:6px;font-size:1.35em;line-height:1}

/* Folio Hero & Media */
.folio-hero-card{height:250px;position:relative;background:#2a3539;overflow:hidden;border-radius:12px;margin:8px 0 12px}
.folio-hero-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 18%;filter:saturate(.7) contrast(1.05)}
.folio-hero-card:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(10,16,20,.35) 60%,rgba(8,14,16,.92) 100%)}
.folio-hero-label{position:absolute;z-index:2;bottom:22px;left:16px;font-family:Georgia,serif;font-size:30px;letter-spacing:-.04em;color:#fff!important;text-shadow:0 2px 10px rgba(0,0,0,.85)}
.folio-hero-sub{position:absolute;z-index:2;left:17px;bottom:7px;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#dceada!important;text-shadow:0 1px 4px rgba(0,0,0,.85)}
.folio-meta{display:flex;gap:5px;margin:8px 0 10px;flex-wrap:wrap}
.folio-meta .tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:rgba(45,75,68,.65);color:#d5eee7;border:1px solid rgba(130,185,165,.35)}
.folio-quote-callout{border-left:2px solid var(--vn-accent,#b7d6ae);padding:2px 0 2px 12px;color:var(--vn-chrome-text,#e4ead9);font:italic 13px/1.5 Georgia,serif;margin:12px 0}
.observations-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid rgba(255,255,255,.15);margin-top:8px}
.observation-cell{padding:8px 6px 8px 0;border-bottom:1px solid rgba(255,255,255,.12);min-height:48px}
.observation-cell:nth-child(even){padding-left:10px}
.observation-cell span{display:block;font-size:9.5px;margin-bottom:2px;opacity:.92;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-muted-text,#9cb5a8)}
.observation-cell strong{font-size:11.5px;font-weight:650;color:var(--vn-chrome-text,var(--vn-text,#f3f7f0))}

.observation-cell em{font-size:8.5px;font-style:normal;margin-left:4px;padding:1px 4px;border-radius:4px;background:rgba(220,238,177,.2);color:#d6ecad;font-weight:750}

[data-dossier-media]{margin:0;position:relative;overflow:hidden;border-radius:12px;border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 35%,transparent);background:rgba(0,0,0,.35);display:grid;place-items:center}
[data-dossier-media][data-has-image="true"]{cursor:zoom-in}
[data-dossier-media][data-expanded="true"]{grid-column:1 / -1;width:100%;height:auto;max-height:340px;cursor:zoom-out}
[data-dossier-media] img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block}
[data-dossier-media][data-expanded="true"] img{object-fit:contain;max-height:320px;background:rgba(0,0,0,.6)}
[data-dossier-media] svg{width:100%;height:100%;display:block;color:var(--vn-accent,#9ec6f0)}
[data-dossier-media] figcaption{position:absolute;inset:auto 0 0 0;padding:4px 8px;font-size:.68em;background:linear-gradient(transparent,rgba(0,0,0,.82));color:#fff;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}

/* World Lens Scene Map & Chips */
.chip-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px}
.chip{height:32px;min-height:32px;white-space:nowrap;padding:0 12px;border:1px solid var(--vn-panel-border,rgba(255,255,255,.2));border-radius:20px;font-size:11px;font-weight:550;cursor:pointer;background:var(--vn-button-bg,rgba(255,255,255,.05));color:inherit;transition:all .15s ease}
.chip[aria-pressed="true"],.chip.active{border-color:var(--vn-accent,#a8d3c8);background:var(--vn-accent,#a8d3c8);color:#11201d!important;font-weight:700}
.world-sheet-map{margin-top:8px;height:calc(min(45vh,310px));min-height:240px;border-radius:12px;position:relative;overflow:hidden;border:1px solid var(--vn-panel-border,rgba(255,255,255,.18));background:linear-gradient(145deg,rgba(25,42,36,.95),rgba(16,28,25,.98))}
.world-map-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.world-map-svg path{fill:none;stroke:var(--vn-accent,#80b5a3);stroke-width:1.2;stroke-dasharray:3 5;opacity:.5}
.map-node-pill{position:absolute;min-width:82px;max-width:114px;padding:5px 8px;text-align:left;border-radius:8px;border:1px solid var(--vn-panel-border,rgba(255,255,255,.25));background:rgba(22,40,34,.95);color:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);transition:transform .18s cubic-bezier(.16,1,.3,1),background .15s ease;z-index:2}
.map-node-pill.active{background:var(--vn-accent,#deefac);color:#122822!important;border-color:#fff;transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.map-node-pill b{display:block;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.map-node-pill small{display:block;font-size:9px;opacity:.75;margin-top:1px}
.map-node-pill .index-dot{display:block;width:7px;height:7px;background:#90b5a7;border:1.5px solid white;border-radius:100%;position:absolute;top:-5px;left:9px}
.map-node-pill.active .index-dot{background:#315f50;border-color:#deefac}
.world-lens{position:relative;margin:10px 0 6px;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;background:var(--vn-panel-solid,rgba(14,25,21,.94));backdrop-filter:blur(8px);border:1px solid var(--vn-panel-border,rgba(130,175,155,.35));box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:3}
.world-lens h3{font-size:13px;margin:0 0 2px;font-weight:700;color:var(--vn-chrome-text,var(--vn-text,#f2f7ed))}
.world-lens p{margin:0;font-size:10.5px;line-height:1.4;opacity:.85;color:var(--vn-muted-text,#d1dfd5)}


.world-lens-cta{display:inline-block;margin-top:6px!important;min-height:0!important;min-width:0!important;padding:4px 10px!important;font-size:10.5px!important;font-weight:700!important;border-radius:6px!important;background:var(--vn-accent,#a8d3c8)!important;color:#0f1e1a!important;border:none!important;cursor:pointer}
.world-strip{display:flex;gap:8px;margin:6px 0 10px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}
.world-strip button{display:flex!important;align-items:center;text-align:left;gap:8px;flex-shrink:0;padding:6px 10px 6px 6px!important;min-height:48px!important;border-radius:10px!important;border:1px solid var(--vn-panel-border,rgba(255,255,255,.2))!important;background:rgba(255,255,255,.04)!important;cursor:pointer}
.world-strip button:hover{background:rgba(255,255,255,.08)!important}
.world-strip button.active{border-color:var(--vn-accent,#a8d3c8)!important;background:rgba(168,211,200,.15)!important}
.world-strip img,.world-strip .thumb-initials{width:36px;height:36px;border-radius:6px;object-fit:cover;flex:none;display:grid;place-items:center;font-weight:700;font-size:11px;background:rgba(0,0,0,.3);color:var(--vn-accent,#a8d3c8)}
.world-strip b{display:block;font-size:11px;font-weight:650}
.world-strip small{display:block;font-size:9px;opacity:.72;margin-top:1px}
.input-wrap{display:flex;gap:8px;align-items:center;border:1px solid var(--vn-panel-border,rgba(255,255,255,.2));border-radius:10px;background:rgba(0,0,0,.15);width:100%;padding:0 10px;height:40px;box-sizing:border-box}
.input-wrap input{width:100%;min-width:0;background:none;border:none;outline:none;font:inherit;color:inherit;padding:0}

/* Cast chips and Details */
[data-dossier-present-cast]{margin:12px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--vn-panel-border,#666)}
[data-dossier-present-cast] h3{margin:0 0 8px;font-size:.8em;text-transform:uppercase;letter-spacing:.03em;opacity:.85}
[data-dossier-cast-chips]{display:flex;flex-wrap:wrap;gap:6px}
[data-dossier-cast-chip]{margin:0!important;min-height:36px!important;padding:5px 11px!important;border-radius:999px!important;font-size:.8em!important;font-weight:600!important}
[data-vn-dossier-card] dl{margin:0}
[data-vn-dossier-card] dt{font-size:.75em;opacity:.92;margin-top:12px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:.025em;color:#a8c7b8}
[data-vn-dossier-card] dt:first-child{margin-top:0}
[data-vn-dossier-card] dd{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.62;color:var(--vn-chrome-text,var(--vn-text,#f2f7f0))}
[data-vn-dossier-card] [data-fact-expand]{display:inline;min-width:0;min-height:0;padding:1px 6px;margin:0 0 0 4px;font-size:.75em;border-radius:6px;vertical-align:baseline}
[data-reference-overview]{padding:12px 14px;background:rgba(27,49,41,.6);border:1px solid rgba(130,185,165,.3);border-radius:12px;margin:10px 0 14px}
section[data-reference-current],section[data-reference-observations]{margin:14px 0;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--vn-panel-border,#666)}
section[data-reference-current] h3,section[data-reference-observations] h3{font-size:.82em;text-transform:uppercase;letter-spacing:.03em;margin:0 0 10px;opacity:1;color:#dcebad;font-weight:700}
[data-reference-section]{border-bottom:1px solid var(--vn-panel-border,#666)}
[data-reference-section] dl{padding:0 4px 16px}
[data-reference-sources]{font-size:.8em;margin:12px 0;opacity:.85}
[data-reference-sources] ul{list-style:none;margin:0;padding:0 0 12px;overflow-wrap:anywhere}
[data-reference-sources] li+li{margin-top:6px}
[data-reference-earlier]{border-top:1px solid var(--vn-panel-border,#666);margin-top:16px;padding-top:4px}
[data-reference-earlier]>p{font-size:.8em;color:var(--vn-muted-text);line-height:1.5;margin:0 0 14px}
[data-reference-earlier] dl{padding-top:12px}[data-earlier-source]{font-size:.8em;margin-bottom:12px;border-bottom:1px solid var(--vn-panel-border,#666)}
[data-earlier-source] summary{font-weight:400;color:var(--vn-muted-text)}[data-earlier-source] blockquote{margin:0;padding:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}
[data-reference-actions]{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--vn-panel-border,#666)}
[data-reference-actions] button{margin:0;flex:1}
[data-reference-notes] label{display:block;font-size:.85em}
[data-vn-dossier-card] textarea{display:block;box-sizing:border-box;width:100%;min-height:90px;margin:8px 0;font:inherit;color:inherit;background:#0002;border:1px solid var(--vn-panel-border,#666);border-radius:8px;padding:10px}
[data-vn-dossier-card] summary{box-sizing:border-box;cursor:pointer;min-height:44px;padding:12px 0;font-weight:600;line-height:1.4}
[data-reference-filters]{display:grid;grid-template-columns:1fr;gap:8px;margin:10px 0 6px}
[data-reference-filters] select{box-sizing:border-box;min-width:0;width:100%;min-height:40px;font:inherit;font-size:14px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;padding:6px 8px}
[data-reference-history-note]{font-size:.75em;line-height:1.4;color:var(--vn-muted-text)}
[data-vn-reference-sheet]{display:flex;flex-direction:column;overflow:hidden}
[data-vn-reference-sheet] header,[data-reference-filters],[data-reference-count]{flex:none}
[data-reference-list]{min-height:0;overflow:auto;overscroll-behavior:contain;display:grid;gap:6px;padding:2px 2px 6px;max-height:220px}
[data-reference-count]{font-size:.8em;opacity:.75;margin:8px 0}
[data-reference-list] button{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;text-align:left;margin:0;min-width:0;overflow-wrap:anywhere;gap:10px;padding:8px 10px;border-radius:10px}
[data-reference-thumb]{width:40px;height:40px;border-radius:8px;overflow:hidden;display:grid;place-items:center;font-weight:700;font-size:.85em;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,rgba(255,255,255,.05));border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 35%,transparent);flex:none}
[data-reference-thumb] img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block}
[data-reference-row-body]{display:flex;flex-direction:column;gap:2px;min-width:0}
[data-reference-row-title]{font-weight:650;font-size:.94em}
[data-reference-list] small{font-size:.74em;opacity:.8;line-height:1.3}
[data-reference-snippet]{opacity:.68!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-reference-list] [data-reference-current=true]{border-left:3px solid var(--vn-accent,#9ec6f0)}
[data-vn-dossier-card] :is(button,input,select,textarea,summary):focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
@media(min-width:700px){[data-vn-dossier]{align-items:center}}
@media(max-width:420px){[data-vn-dossier-card]{padding:14px;border-radius:14px}[data-vn-dossier-card] header{top:-14px}[data-reference-overview]{padding:10px}[data-dossier-hero="npc"],[data-dossier-hero="object"]{grid-template-columns:76px minmax(0,1fr)}[data-dossier-media="npc"]{width:76px;height:92px}[data-dossier-media="object"]{width:76px;height:76px}}
` + DOCUMENT_READER_CSS;

export const DOCKED_DOSSIER_CSS = `
[data-vn-dossier][data-vn-workspace-tool="story"]{position:relative;inset:auto;display:flex;align-items:stretch;padding:0;background:transparent;height:100%;z-index:auto}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]{width:100%;max-height:100%;height:100%;border:0;border-radius:0;box-shadow:none;padding:18px;font-size:14px;line-height:1.7}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]>header{position:static;top:auto;padding:0 0 14px;background:var(--vn-panel-solid);display:flex;align-items:center;justify-content:space-between}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]>header button[aria-label^="Close"]{display:none}
[data-reference-categories]{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
[data-reference-categories] button{flex:1;min-width:60px;margin:0;font-size:11px;padding:6px 8px}
[data-reference-categories] [aria-pressed="true"]{border-color:var(--vn-accent);color:var(--vn-accent);background:color-mix(in srgb,var(--vn-accent) 10%,transparent)}
`;
