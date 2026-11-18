import { createDocumentReader, DOCUMENT_READER_CSS, populateDocumentArtStage, type DocumentReaderOptions } from './document-reader.js';
import { APERTURE_ICONS } from '../theme/aperture-theme.js';
import { html } from '../dom/html.js';
import type { StoryDocument } from '../../shared/story-documents.js';
import { InteractionTray } from './interaction-tray.js';
import type { InteractionDraft, DraftMergeMode } from '../../shared/scene-interactions.js';
import { entityOverride, type ReferenceKind, type referenceEntries, type ReaderDossier, type TooltipPreferences } from '../../shared/dossiers.js';
import { referenceFieldInfo, REFERENCE_FIELD_GROUPS } from '../../shared/reference-fields.js';
import {
  createItemId,
  createLocationId,
  deriveShortAliases,
  findMatchingItem,
  findMatchingLocation,
  formatItemDNAForImagePrompt,
  formatLocationDNAForImagePrompt,
  type ItemDNA,
  type LocationDNA,
  type StoryDnaActionBody,
  type StoryDNASet,
} from '../../shared/story-dna.js';

export interface DossierVisualContext {
  imageUrl?: string;
  imageCaption?: string;
  isPresent?: boolean;
  isActiveLocation?: boolean;
  locationName?: string;
  presentCharacters?: Array<{ id: string; name: string }>;
  summarySnippet?: string;
  anchors?: string[];
  connectedLocations?: string[];
  onSelectEntity?: (id: string, trigger: HTMLElement) => void;
}

export interface DossierSceneHubContext {
  activeLocationId?: string | undefined;
  activeLocationName?: string | undefined;
  locationImageUrl?: string | undefined;
  locationDna?: LocationDNA | undefined;
  presentCast: Array<{
    id: string;
    name: string;
    imageUrl?: string | undefined;
    present?: boolean | undefined;
    dnaId?: string | undefined;
    wardrobeStates?: Record<string, string> | undefined;
    activeWardrobeKey?: string | undefined;
    activeOutfit?: string | undefined;
  }>;
  activeItems: Array<{ id: string; name: string; imageUrl?: string | undefined }>;
  onSelectWardrobe?: ((charIdOrName: string, key: string, outfit: string) => void) | undefined;
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
  private hubView: 'scene' | 'atlas' = 'scene';
  private storyDna: StoryDNASet = { locations: {}, items: {}, revision: 0 };
  private storyDnaRequester: ((body: StoryDnaActionBody) => void) | null = null;
  private storyDnaError: string | null = null;
  private sceneHubContext: DossierSceneHubContext | null = null;
  private activeDossierContext: {
    dossier: ReaderDossier;
    prefs: TooltipPreferences;
    chatId: string;
    trigger: HTMLElement;
    actions?: Parameters<DossierCard['open']>[4];
    storyDocument?: StoryDocument | undefined;
    visual?: DossierVisualContext | undefined;
  } | null = null;
  private awaitingDnaSync = false;
  private folioOpener: ((characterName: string) => void) | null = null;
  private documentOptionsResolver: ((docId: string) => DocumentReaderOptions) | null = null;
  private activeDocumentRecord: StoryDocument | null = null;

  setFolioOpener(fn: (characterName: string) => void): void {
    this.folioOpener = fn;
  }

  setDocumentOptionsResolver(fn: (docId: string) => DocumentReaderOptions): void {
    this.documentOptionsResolver = fn;
  }

  openDocument(storyDocument: StoryDocument, back: () => void, trigger?: HTMLElement): void {
    if (trigger) this.returnFocus = trigger;
    this.activeDocumentRecord = storyDocument;
    const opts = this.documentOptionsResolver?.(storyDocument.id) ?? {};
    const reader = createDocumentReader(
      storyDocument,
      () => {
        if (this.host.hidden || reader.parentElement !== this.host) return;
        this.activeDocumentRecord = null;
        back();
      },
      () => {
        if (!this.host.hidden && reader.parentElement === this.host) {
          this.activeDocumentRecord = null;
          this.close();
        }
      },
      opts,
    );
    if (this.host.dataset.vnWorkspaceTool) reader.removeAttribute('aria-modal');
    this.documentState(true);
    this.host.replaceChildren(reader);
    this.host.hidden = false;
    reader.querySelector<HTMLElement>('button')?.focus();
  }

  refreshDocumentStage(documentId: string): void {
    if (this.host.hidden || !this.activeDocumentRecord || this.activeDocumentRecord.id !== documentId) return;
    const reader = this.host.querySelector<HTMLElement>('[data-vn-document-reader]');
    const stage = reader?.querySelector<HTMLElement>('[data-document-art-stage]');
    if (!reader || reader.dataset.vnDocId !== documentId || !stage) return;
    const opts = this.documentOptionsResolver?.(documentId) ?? {};
    populateDocumentArtStage(stage, this.activeDocumentRecord, opts);
  }

  setStoryDna(storyDna: StoryDNASet): void {
    this.storyDna = storyDna;
    this.storyDnaError = null;
    if (this.awaitingDnaSync && this.activeDossierContext && this.isOpen()) {
      this.awaitingDnaSync = false;
      const ctx = this.activeDossierContext;
      this.open(ctx.dossier, ctx.prefs, ctx.chatId, ctx.trigger, ctx.actions, ctx.storyDocument, ctx.visual);
      return;
    }
    const statusEl = this.host.querySelector<HTMLElement>('[data-story-dna-status]');
    if (statusEl) {
      statusEl.textContent = 'Saved Story DNA synced.';
      statusEl.hidden = false;
    }
  }

  setStoryDnaRequester(fn: (body: StoryDnaActionBody) => void): void {
    this.storyDnaRequester = fn;
  }

  setStoryDnaError(error: string): void {
    this.storyDnaError = error;
    this.awaitingDnaSync = false;
    const statusEl = this.host.querySelector<HTMLElement>('[data-story-dna-status]');
    if (statusEl) {
      statusEl.textContent = error;
      statusEl.hidden = false;
    }
  }

  setSceneHubContext(ctx: DossierSceneHubContext | null): void {
    this.sceneHubContext = ctx;
  }

  constructor(
    mount: HTMLElement,
    private closeCallback: () => void,
    private update: (entity: ReaderDossier['entity'], patch: { suppressed?: boolean; pinned?: boolean; note?: string; factEdits?: Record<string, string | null> }) => boolean,
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
    const kind = dossier.entity.kind;
    if (kind === 'npc' && this.folioOpener) {
      this.close();
      this.folioOpener(dossier.entity.name);
      return;
    }
    this.documentState(false);
    this.returnFocus = trigger;
    this.activeDossierContext = { dossier, prefs, chatId, trigger, actions, storyDocument, visual };
    this.host.replaceChildren();
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

    if (kind === 'place' || kind === 'object') {
      panel.append(this.buildStoryDnaStudio(kind, dossier));
    }

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
      editBtn.style.cssText = 'width:26px;height:26px;min-width:26px;min-height:26px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:6px;cursor:pointer;font-size:12px;opacity:0.78;padding:0;';
      editBtn.onmouseenter = () => { editBtn.style.opacity = '1'; };
      editBtn.onmouseleave = () => { editBtn.style.opacity = '0.78'; };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.title = 'Delete reference fact';
      delBtn.className = 'fact-del-btn';
      delBtn.textContent = '🗑️';
      delBtn.style.cssText = 'width:26px;height:26px;min-width:26px;min-height:26px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:6px;cursor:pointer;font-size:12px;opacity:0.78;padding:0;';
      delBtn.onmouseenter = () => { delBtn.style.opacity = '1'; };
      delBtn.onmouseleave = () => { delBtn.style.opacity = '0.78'; };

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
            this.update(dossier.entity, { factEdits: { [field]: newVal } });
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
        this.update(dossier.entity, { factEdits: { [field]: null } });
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
    if (kind === 'place' && visual?.presentCharacters?.length && (visual.onSelectEntity || this.folioOpener)) {
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
          if (this.folioOpener) {
            this.folioOpener(char.name);
            return;
          }
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
      const read = document.createElement('button');
      read.type = 'button';
      read.textContent = storyDocument.sections.length
        ? 'Read revealed text & view closeup'
        : 'Inspect document & view closeup';
      read.dataset.vnReadDocument = '';
      read.onclick = () => {
        if (this.host.hidden || panel.parentElement !== this.host) return;
        this.openDocument(
          storyDocument,
          () => {
            this.open(dossier, prefs, chatId, trigger, actions, storyDocument, visual);
            this.host.querySelector<HTMLElement>('[data-vn-read-document]')?.focus();
          },
          trigger,
        );
      };
      panel.append(read);
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
    this.activeDossierContext = null;
    if (!this.isOpen()) {
      this.query = '';
      this.category = 'all';
      this.scope = 'all';
      this.selectedEntityId = null;
      this.hubView = 'scene';
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
    titleBlock.style.cssText = 'margin:2px 0 6px;display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;';
    const pageTitle = document.createElement('h1');
    pageTitle.className = 'page-title';
    pageTitle.style.cssText = 'margin:0;font-size:20px;font-family:Georgia,serif;letter-spacing:-0.02em;line-height:1.15;';
    pageTitle.textContent = 'Look closer.';
    const pageSub = document.createElement('div');
    pageSub.className = 'page-sub';
    pageSub.style.cssText = 'font-size:11px;opacity:0.75;';
    pageSub.textContent = 'Locations, scene items & cast lore.';
    titleBlock.append(pageTitle, pageSub);
    panel.append(titleBlock);

    // Filter Chips (.chip-row) — compact single scrollable bar
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
    search.placeholder = 'Find reference…';
    search.setAttribute('aria-label', 'Search references');
    search.value = this.query;
    inputWrap.append(search);

    const category = document.createElement('select');
    category.setAttribute('aria-label', 'Reference category');
    category.style.display = 'none';

    for (const [value, label] of [['all', 'All'], ['place', 'Places'], ['object', 'Items']]) {
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
    folioBtn.style.cssText = 'background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 14%,var(--vn-shell-button,transparent));color:var(--vn-shell-accent,#d8b4fe);border:1px solid color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 38%,transparent);';
    folioBtn.innerHTML = '👤 Folio';
    folioBtn.title = 'Open Character Folio for character DNA, portraits and lore';
    folioBtn.onclick = () => {
      this.folioOpener?.('');
    };
    tabs.append(folioBtn);

    const addRefBtn = document.createElement('button');
    addRefBtn.type = 'button';
    addRefBtn.className = 'chip add-ref-chip';
    addRefBtn.style.cssText = 'background:color-mix(in srgb,var(--vn-shell-accent,#38bdf8) 18%,var(--vn-shell-field,transparent));color:var(--vn-shell-accent,#38bdf8);border:1px solid color-mix(in srgb,var(--vn-shell-accent,#38bdf8) 42%,transparent);margin-left:auto;';
    addRefBtn.textContent = '＋ Add';
    addRefBtn.title = 'Manually add a location or item to the story world';
    tabs.append(addRefBtn);

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
    addRefPanel.style.cssText = 'display:none;margin:8px 0 12px;padding:12px;border-radius:var(--vn-shell-radius,10px);background:var(--vn-shell-field,rgba(0,0,0,0.35));border:1px solid var(--vn-shell-border-strong,var(--vn-shell-border,rgba(56,189,248,0.35)));';
    addRefPanel.innerHTML = '<div style="font-weight:700;font-size:12px;margin-bottom:8px;color:var(--vn-shell-accent,#38bdf8);">＋ Add Story Reference / Artifact</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<input data-add-ref-name type="text" placeholder="Name (e.g. Carved Yew Staff, Flat 3)" style="padding:6px 8px;font-size:11px;border-radius:var(--vn-shell-radius,6px);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.15));background:var(--vn-shell-panel,rgba(0,0,0,0.25));color:inherit;" />' +
      '<select data-add-ref-kind style="padding:6px 8px;font-size:11px;border-radius:var(--vn-shell-radius,6px);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.15));background:var(--vn-shell-panel,rgba(0,0,0,0.25));color:inherit;">' +
      '<option value="object">💎 Item / Unique Artifact</option>' +
      '<option value="place">📍 Location / Place</option>' +
      '</select></div>' +
      '<textarea data-add-ref-desc placeholder="Physical description, materials, visual traits (e.g. carved yew staff encrusted in diamonds wrapped in vines)..." style="width:100%;height:55px;box-sizing:border-box;padding:6px 8px;font-size:11px;border-radius:var(--vn-shell-radius,6px);border:1px solid var(--vn-shell-border,rgba(255,255,255,0.15));background:var(--vn-shell-panel,rgba(0,0,0,0.25));color:inherit;margin-bottom:8px;"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
      '<button type="button" data-add-ref-cancel style="padding:4px 10px;font-size:11px;border-radius:var(--vn-shell-radius,6px);background:transparent;border:1px solid var(--vn-shell-border,rgba(255,255,255,0.2));color:inherit;cursor:pointer;">Cancel</button>' +
      '<button type="button" data-add-ref-save style="padding:4px 12px;font-size:11px;font-weight:700;border-radius:var(--vn-shell-radius,6px);background:var(--vn-shell-accent,#38bdf8);border:none;color:var(--vn-shell-accent-contrast,#041624);cursor:pointer;">Save Reference</button>' +
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
      if (this.storyDnaRequester) {
        if (kind === 'place') {
          this.storyDnaRequester({
            action: 'save_location',
            location: {
              id: createLocationId(name),
              name,
              aliases: deriveShortAliases(name),
              environmentDescription: desc.slice(0, 2000),
              persistentElements: [],
              connectedLocations: [],
              autoDiscovered: false,
              lastUpdated: Date.now(),
            },
          });
        } else {
          this.storyDnaRequester({
            action: 'save_item',
            item: {
              id: createItemId(name),
              name,
              aliases: deriveShortAliases(name),
              description: desc.slice(0, 2000),
              distinctiveFeatures: [],
              colors: [],
              autoDiscovered: false,
              lastUpdated: Date.now(),
            },
          });
        }
      }
      this.selectedEntityId = newEntity.id;
      addRefPanel.style.display = 'none';
      nameInput.value = '';
      descInput.value = '';
      render();
    });

    // Dual-View World Lens Header (Current Scene Hub + Connected Atlas)
    const hubToggleBar = document.createElement('div');
    hubToggleBar.className = 'world-hub-tabs';
    hubToggleBar.dataset.worldHeaderTabs = '';
    const sceneTabBtn = document.createElement('button');
    sceneTabBtn.type = 'button';
    sceneTabBtn.className = 'chip';
    sceneTabBtn.dataset.worldHubTab = 'scene';
    sceneTabBtn.textContent = '🏛️ Current Scene';
    const atlasTabBtn = document.createElement('button');
    atlasTabBtn.type = 'button';
    atlasTabBtn.className = 'chip';
    atlasTabBtn.dataset.worldHubTab = 'atlas';
    atlasTabBtn.textContent = '🗺️ Connected Atlas';
    sceneTabBtn.onclick = () => { this.hubView = 'scene'; render(); };
    atlasTabBtn.onclick = () => { this.hubView = 'atlas'; render(); };
    hubToggleBar.append(sceneTabBtn, atlasTabBtn);
    panel.append(hubToggleBar);

    const worldSheet = document.createElement('div');
    worldSheet.className = 'world-sheet-map';
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

      sceneTabBtn.setAttribute('aria-pressed', String(this.hubView === 'scene'));
      atlasTabBtn.setAttribute('aria-pressed', String(this.hubView === 'atlas'));
      if (this.hubView === 'scene') sceneTabBtn.classList.add('active'); else sceneTabBtn.classList.remove('active');
      if (this.hubView === 'atlas') atlasTabBtn.classList.add('active'); else atlasTabBtn.classList.remove('active');

      worldSheet.replaceChildren();

      // World Lens focuses on Places & Items; any cast entries become Scene Hub cast pills -> Character Folio.
      const filtered = entries.filter(({ entity }) =>
        entity.kind !== 'npc' &&
        (this.scope === 'all' || !entity.id.startsWith('earlier:')) &&
        (this.category === 'all' || entity.kind === this.category) &&
        (!this.query.trim() || [entity.name, ...entity.aliases].some(name => name.toLocaleLowerCase().includes(this.query.trim().toLocaleLowerCase())))
      );

      count.textContent = filtered.length ? `${filtered.length} reference${filtered.length === 1 ? '' : 's'}` : 'No locations or items match. Try another filter.';
      countBadge.textContent = `${filtered.length} FOUND`;

      if (!filtered.some(e => e.entity.id === this.selectedEntityId)) {
        this.selectedEntityId = filtered[0]?.entity.id ?? null;
      }

      const activeEntry = filtered.find(e => e.entity.id === this.selectedEntityId) ?? filtered[0];

      // Gather Present Cast from sceneHubContext + any NPCs present in incoming entries
      const castByKey = new Map<string, DossierSceneHubContext['presentCast'][number]>();
      for (const c of this.sceneHubContext?.presentCast ?? []) {
        castByKey.set(c.name.trim().toLowerCase(), c);
      }
      for (const e of entries) {
        if (e.entity.kind !== 'npc') continue;
        const key = e.entity.name.trim().toLowerCase();
        if (!castByKey.has(key)) {
          const vis = visualResolver?.(e.entity);
          castByKey.set(key, { id: e.entity.id, name: e.entity.name, imageUrl: vis?.imageUrl, present: vis?.isPresent ?? e.current });
        }
      }
      const presentCast = [...castByKey.values()];

      if (this.hubView === 'scene') {
        const sceneHub = document.createElement('div');
        sceneHub.className = 'world-scene-hub';
        sceneHub.dataset.worldSceneHub = '';

        const activePlaceEntry = entries.find(e => e.entity.kind === 'place' && visualResolver?.(e.entity)?.isActiveLocation)
          ?? entries.find(e => e.entity.kind === 'place');
        const activeLocName = this.sceneHubContext?.activeLocationName ?? activePlaceEntry?.entity.name ?? 'Current Story Scene';
        const matchedLocDna = this.sceneHubContext?.locationDna ?? findMatchingLocation(this.storyDna.locations, activeLocName);
        const locImageUrl = this.sceneHubContext?.locationImageUrl
          ?? (activePlaceEntry ? visualResolver?.(activePlaceEntry.entity)?.imageUrl : undefined)
          ?? matchedLocDna?.referenceImageUrl;

        const banner = document.createElement('div');
        banner.className = 'world-scene-banner';
        if (locImageUrl) {
          const img = document.createElement('img');
          img.src = locImageUrl;
          img.alt = activeLocName;
          banner.append(img);
        } else {
          banner.innerHTML = fallbackSvgForKind('place', activeLocName);
        }
        const bannerOverlay = document.createElement('div');
        bannerOverlay.className = 'world-scene-banner-overlay';
        const locTitle = document.createElement('h3');
        locTitle.textContent = `📍 ${activeLocName}`;
        const dnaPills = document.createElement('div');
        dnaPills.className = 'world-scene-dna-pills';
        for (const trait of [matchedLocDna?.lighting, matchedLocDna?.atmosphere, matchedLocDna?.architecture].filter(Boolean)) {
          const pill = document.createElement('span');
          pill.className = 'scene-dna-pill';
          pill.textContent = trait!;
          dnaPills.append(pill);
        }
        if (activePlaceEntry) {
          const editSceneryBtn = document.createElement('button');
          editSceneryBtn.type = 'button';
          editSceneryBtn.className = 'world-lens-cta';
          editSceneryBtn.dataset.sceneHubEdit = '';
          editSceneryBtn.textContent = '✨ Inspect & Edit Scenery DNA';
          editSceneryBtn.onclick = () => open(activePlaceEntry.entity.id, trigger);
          bannerOverlay.append(locTitle, dnaPills, editSceneryBtn);
        } else {
          bannerOverlay.append(locTitle, dnaPills);
        }
        if (!matchedLocDna && activeLocName && activeLocName !== 'Current Story Scene' && this.storyDnaRequester) {
          const pinLocBtn = document.createElement('button');
          pinLocBtn.type = 'button';
          pinLocBtn.className = 'world-lens-cta';
          pinLocBtn.dataset.scenePinLocation = activeLocName;
          pinLocBtn.textContent = '📌 Pin location to World';
          pinLocBtn.onclick = () => {
            this.storyDnaRequester?.({
              action: 'save_location',
              location: {
                id: createLocationId(activeLocName),
                name: activeLocName,
                aliases: [],
                lighting: '',
                atmosphere: '',
                architecture: '',
                environmentDescription: '',
                persistentElements: [],
                connectedLocations: [],
                notes: '',
                locked: false,
                lastUpdated: Date.now(),
              },
            });
            pinLocBtn.textContent = '📌 Pinned to World ✓';
            pinLocBtn.disabled = true;
          };
          bannerOverlay.append(pinLocBtn);
        }
        banner.append(bannerOverlay);
        sceneHub.append(banner);

        const castWrap = document.createElement('div');
        castWrap.className = 'world-scene-cast';
        const castTitle = document.createElement('div');
        castTitle.className = 'world-scene-subhead';
        castTitle.textContent = '👥 Present in Scene · Open in Character Folio';
        const castRow = document.createElement('div');
        castRow.className = 'world-scene-cast-row';
        if (presentCast.length > 0) {
          for (const char of presentCast) {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'present-cast-pill';
            pill.dataset.presentCastPill = char.name;
            pill.textContent = `👤 ${char.name} →`;
            pill.onclick = () => {
              if (this.folioOpener) this.folioOpener(char.name);
            };
            castRow.append(pill);
          }
        } else {
          const emptyCast = document.createElement('span');
          emptyCast.className = 'world-scene-empty';
          emptyCast.textContent = 'No named characters established in this paragraph yet.';
          castRow.append(emptyCast);
        }
        castWrap.append(castTitle, castRow);
        sceneHub.append(castWrap);

        const wardrobeCandidates = presentCast.filter(c => c.wardrobeStates && Object.keys(c.wardrobeStates).length > 0);
        if (wardrobeCandidates.length > 0 && this.sceneHubContext?.onSelectWardrobe) {
          const wardrobeWrap = document.createElement('div');
          wardrobeWrap.className = 'world-scene-cast';
          wardrobeWrap.dataset.sceneWardrobeSwap = '';
          const wTitle = document.createElement('div');
          wTitle.className = 'world-scene-subhead';
          wTitle.textContent = '👗 Quick Scene Wardrobe Swap';
          wardrobeWrap.append(wTitle);
          for (const char of wardrobeCandidates.slice(0, 3)) {
            const charLabel = document.createElement('div');
            charLabel.style.cssText = 'font-size:11px;opacity:0.8;margin:4px 0 3px;font-weight:600;';
            charLabel.textContent = char.name;
            const wRow = document.createElement('div');
            wRow.className = 'world-scene-cast-row';
            for (const [key, outfit] of Object.entries(char.wardrobeStates!)) {
              const wBtn = document.createElement('button');
              wBtn.type = 'button';
              const isActive = char.activeWardrobeKey === key || (!char.activeWardrobeKey && char.activeOutfit === outfit);
              wBtn.className = `present-item-pill ${isActive ? 'active' : ''}`;
              wBtn.dataset.sceneWardrobeOption = `${char.name}:${key}`;
              wBtn.textContent = key;
              wBtn.title = outfit;
              wBtn.onclick = () => {
                this.sceneHubContext?.onSelectWardrobe?.(char.dnaId ?? char.name, key, outfit);
              };
              wRow.append(wBtn);
            }
            wardrobeWrap.append(charLabel, wRow);
          }
          sceneHub.append(wardrobeWrap);
        }

        const activeObjects = filtered.filter(e => e.entity.kind === 'object');
        if (activeObjects.length > 0) {
          const itemsWrap = document.createElement('div');
          itemsWrap.className = 'world-scene-items';
          const itemsTitle = document.createElement('div');
          itemsTitle.className = 'world-scene-subhead';
          itemsTitle.textContent = '💎 Active Artifacts & Items';
          const itemsRow = document.createElement('div');
          itemsRow.className = 'world-scene-cast-row';
          for (const { entity } of activeObjects.slice(0, 6)) {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `present-item-pill ${this.selectedEntityId === entity.id ? 'active' : ''}`;
            pill.textContent = `✦ ${entity.name}`;
            pill.onclick = () => {
              this.selectedEntityId = entity.id;
              render();
            };
            itemsRow.append(pill);
          }
          itemsWrap.append(itemsTitle, itemsRow);
          sceneHub.append(itemsWrap);
        }

        worldSheet.append(sceneHub);
      } else {
        // Connected Atlas Topological SVG Graph
        const atlasSection = document.createElement('div');
        atlasSection.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:6px;';

        const atlasBar = document.createElement('div');
        atlasBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;opacity:0.88;';
        const legend = document.createElement('span');
        legend.textContent = '★ Active · 📍 Visited · Dashed = path';

        let atlasZoom = Number((worldSheet.dataset.atlasZoom) || '1');
        if (!Number.isFinite(atlasZoom) || atlasZoom < 0.7 || atlasZoom > 1.8) atlasZoom = 1;
        const zoomControls = document.createElement('div');
        zoomControls.style.cssText = 'display:flex;align-items:center;gap:4px;';

        const atlasViewport = document.createElement('div');
        atlasViewport.style.cssText = 'overflow:auto;max-height:240px;border-radius:10px;border:1px solid var(--vn-panel-border,rgba(255,255,255,.16));background:rgba(12,24,20,0.55);';

        const atlasWrap = document.createElement('div');
        atlasWrap.className = 'world-atlas-view';
        atlasWrap.dataset.worldAtlasView = '';
        const applyAtlasZoom = (next: number) => {
          atlasZoom = Math.max(0.75, Math.min(1.75, Number(next.toFixed(2))));
          worldSheet.dataset.atlasZoom = String(atlasZoom);
          atlasWrap.style.transform = `scale(${atlasZoom})`;
          atlasWrap.style.transformOrigin = 'top left';
          atlasWrap.style.width = `${Math.round(100 / Math.min(1, atlasZoom) * atlasZoom)}%`;
        };
        for (const [label, aria, delta] of [['−', 'Zoom out atlas', -0.25], ['1:1', 'Reset atlas zoom', 0], ['+', 'Zoom in atlas', 0.25]] as const) {
          const zBtn = document.createElement('button');
          zBtn.type = 'button';
          zBtn.textContent = label;
          zBtn.setAttribute('aria-label', aria);
          zBtn.style.cssText = 'min-width:44px;min-height:44px;padding:6px 10px;margin:0;font-size:12px;font-weight:700;';
          zBtn.onclick = () => applyAtlasZoom(delta === 0 ? 1 : atlasZoom + delta);
          zoomControls.append(zBtn);
        }
        atlasBar.append(legend, zoomControls);
        applyAtlasZoom(atlasZoom);

        const placeMap = new Map<string, { id: string; name: string; entryId?: string; isActive: boolean; connections: string[] }>();
        for (const e of entries) {
          if (e.entity.kind !== 'place') continue;
          const vis = visualResolver?.(e.entity);
          const dna = findMatchingLocation(this.storyDna.locations, e.entity.name);
          placeMap.set(createLocationId(e.entity.name), {
            id: createLocationId(e.entity.name),
            name: e.entity.name,
            entryId: e.entity.id,
            isActive: Boolean(vis?.isActiveLocation),
            connections: [...new Set([...(dna?.connectedLocations ?? []), ...(vis?.connectedLocations ?? [])])],
          });
        }
        for (const loc of Object.values(this.storyDna.locations)) {
          const key = createLocationId(loc.name);
          if (!placeMap.has(key)) {
            placeMap.set(key, {
              id: key,
              name: loc.name,
              entryId: `dna:loc:${loc.id}`,
              isActive: Boolean(this.sceneHubContext?.activeLocationName && createLocationId(this.sceneHubContext.activeLocationName) === key),
              connections: loc.connectedLocations ?? [],
            });
          }
        }
        const nodes = [...placeMap.values()].slice(0, 10);
        const coords = new Map<string, { x: number; y: number }>();
        nodes.forEach((node, idx) => {
          if (nodes.length === 1) {
            coords.set(node.id, { x: 165, y: 105 });
          } else {
            const angle = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const rx = 108;
            const ry = 68;
            coords.set(node.id, {
              x: Math.round(165 + Math.cos(angle) * rx),
              y: Math.round(105 + Math.sin(angle) * ry),
            });
          }
        });
        const drawnEdges = new Set<string>();
        const edgePaths: string[] = [];
        for (const node of nodes) {
          const from = coords.get(node.id);
          if (!from) continue;
          for (const targetName of node.connections) {
            const targetKey = createLocationId(targetName);
            const to = coords.get(targetKey);
            if (!to || targetKey === node.id) continue;
            const edgeKey = [node.id, targetKey].sort().join('::');
            if (drawnEdges.has(edgeKey)) continue;
            drawnEdges.add(edgeKey);
            edgePaths.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(168,211,200,0.45)" stroke-width="1.8" stroke-dasharray="4 3"/>`);
          }
        }
        if (nodes.length > 0 && edgePaths.length === 0) {
          for (let i = 1; i < nodes.length; i++) {
            const prev = coords.get(nodes[i - 1]!.id)!;
            const curr = coords.get(nodes[i]!.id)!;
            edgePaths.push(`<line x1="${prev.x}" y1="${prev.y}" x2="${curr.x}" y2="${curr.y}" stroke="rgba(168,211,200,0.22)" stroke-width="1.3" stroke-dasharray="3 5"/>`);
          }
        }
        atlasWrap.innerHTML = `<svg class="world-map-svg" viewBox="0 0 330 210" aria-hidden="true">${edgePaths.join('')}</svg>`;
        for (const node of nodes) {
          const pt = coords.get(node.id)!;
          const nodeBtn = document.createElement('button');
          nodeBtn.type = 'button';
          nodeBtn.className = `map-node-pill ${this.selectedEntityId === node.entryId ? 'active' : ''} ${node.isActive ? 'active-location' : ''}`;
          nodeBtn.style.left = `${Math.max(4, Math.min(68, Math.round((pt.x / 330) * 100 - 11)))}%`;
          nodeBtn.style.top = `${Math.max(4, Math.min(72, Math.round((pt.y / 210) * 100 - 10)))}%`;
          nodeBtn.style.maxWidth = '120px';
          const badge = node.isActive ? `★ ACTIVE · 👥 ${presentCast.length}` : 'Visited';
          nodeBtn.innerHTML = html`<span class="index-dot"></span><b style="white-space:normal;line-height:1.2;word-break:break-word">${node.isActive ? '★' : '📍'} ${node.name}</b><small>${badge}</small>`.value;
          nodeBtn.onclick = () => {
            if (node.entryId) {
              this.selectedEntityId = node.entryId;
              render();
            }
          };
          atlasWrap.append(nodeBtn);
        }
        if (nodes.length === 0) {
          const emptyAtlas = document.createElement('p');
          emptyAtlas.className = 'world-scene-empty';
          emptyAtlas.style.padding = '16px';
          emptyAtlas.textContent = 'Visit or add locations to map the story atlas.';
          atlasWrap.append(emptyAtlas);
        }
        atlasViewport.append(atlasWrap);
        atlasSection.append(atlasBar, atlasViewport);

        const selectedAtlasNode = nodes.find(n => n.entryId === this.selectedEntityId) ?? nodes.find(n => n.isActive) ?? nodes[0];
        if (selectedAtlasNode) {
          const matchedEntry = entries.find(e => e.entity.id === selectedAtlasNode.entryId || (e.entity.kind === 'place' && createLocationId(e.entity.name) === selectedAtlasNode.id));
          const quickCard = document.createElement('div');
          quickCard.className = 'world-lens';
          quickCard.dataset.atlasQuickCard = '';
          quickCard.style.marginTop = '2px';
          const qTitle = document.createElement('h3');
          qTitle.textContent = `${selectedAtlasNode.isActive ? '★ ' : '📍 '}${selectedAtlasNode.name}`;
          const qMeta = document.createElement('p');
          const connText = selectedAtlasNode.connections.length ? `Connected: ${selectedAtlasNode.connections.join(', ')}` : (selectedAtlasNode.isActive ? 'Current active location' : 'Visited location');
          qMeta.textContent = connText;
          quickCard.append(qTitle, qMeta);
          if (matchedEntry) {
            const qBtn = document.createElement('button');
            qBtn.type = 'button';
            qBtn.className = 'world-lens-cta';
            qBtn.textContent = 'Inspect location →';
            qBtn.onclick = () => open(matchedEntry.entity.id, trigger);
            quickCard.append(qBtn);
          }
          atlasSection.append(quickCard);
        }
        worldSheet.append(atlasSection);
      }

      if ((this.storyDna.chapterCodex?.length ?? 0) > 0 || (this.storyDna.thoughtCabinet?.length ?? 0) > 0) {
        const codexCard = document.createElement('div');
        codexCard.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,0.55);border:1px solid rgba(148,163,184,0.2);';
        codexCard.dataset.worldCodexSection = '';
        if (this.storyDna.chapterCodex?.length) {
          const chHdr = document.createElement('div');
          chHdr.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a7f3d0;';
          chHdr.textContent = `📖 Chapter Codex (${this.storyDna.chapterCodex.length})`;
          const chList = document.createElement('div');
          chList.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
          for (const ch of this.storyDna.chapterCodex.slice(-6).reverse()) {
            const pill = document.createElement('span');
            pill.style.cssText = 'font-size:11px;padding:4px 8px;border-radius:7px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.28);color:#e2e8f0;';
            pill.title = ch.summary;
            pill.textContent = ch.title;
            chList.append(pill);
          }
          codexCard.append(chHdr, chList);
        }
        if (this.storyDna.thoughtCabinet?.length) {
          const tcHdr = document.createElement('div');
          tcHdr.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#fde68a;margin-top:2px;';
          tcHdr.textContent = `🧠 Thought Cabinet (${this.storyDna.thoughtCabinet.length})`;
          const tcList = document.createElement('div');
          tcList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
          for (const tc of this.storyDna.thoughtCabinet.slice(-4).reverse()) {
            const row = document.createElement('div');
            row.style.cssText = 'font-size:11px;line-height:1.35;padding:5px 8px;border-radius:6px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fef3c7;';
            const b = document.createElement('strong');
            b.textContent = `[${tc.category}] ${tc.title}: `;
            const span = document.createElement('span');
            span.textContent = tc.description.slice(0, 120);
            row.append(b, span);
            tcList.append(row);
          }
          codexCard.append(tcHdr, tcList);
        }
        worldSheet.append(codexCard);
      }

      // World Lens Preview Card at bottom of map
      const lensCard = document.createElement('div');
      lensCard.className = 'world-lens';
      if (activeEntry) {
        const vis = visualResolver?.(activeEntry.entity);
        const lensTitle = document.createElement('h3');
        lensTitle.textContent = activeEntry.entity.name;
        const lensDesc = document.createElement('p');
        lensDesc.textContent = vis?.summarySnippet ?? (activeEntry.entity.kind === 'place' ? 'Location recognized in current scene.' : 'Item recognized in current scene.');

        const ctaBtn = document.createElement('button');
        ctaBtn.type = 'button';
        ctaBtn.className = 'world-lens-cta';
        ctaBtn.textContent = activeEntry.entity.kind === 'object' ? 'See known documents →' : 'Inspect reference →';
        ctaBtn.onclick = () => {
          open(activeEntry.entity.id, trigger);
        };

        const hideBtn=document.createElement('button');hideBtn.type='button';hideBtn.style.cssText='display:inline-block;margin-top:6px!important;margin-left:6px!important;min-height:0!important;min-width:0!important;padding:4px 10px!important;font-size:10.5px!important;font-weight:600!important;border-radius:6px!important;background:rgba(255,255,255,0.08)!important;color:var(--vn-muted-text,#d1dfd5)!important;border:1px solid rgba(255,255,255,0.18)!important;cursor:pointer;';hideBtn.textContent='✕ Hide from Lens';hideBtn.title='Hide this reference from World Lens';hideBtn.onclick=()=>{if(this.update(activeEntry.entity,{suppressed:true})){const idx=entries.findIndex(e=>e.entity.id===activeEntry.entity.id);if(idx>=0)entries.splice(idx,1);this.selectedEntityId=null;render();}};
        lensCard.append(lensTitle, lensDesc, ctaBtn, hideBtn);
      } else {
        lensCard.innerHTML = '<h3>No matching references</h3><p>Try another category or clear the search.</p>';
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'world-lens-cta';
        resetBtn.textContent = 'Reset filters';
        resetBtn.onclick = () => {
          this.category = 'all';
          this.query = '';
          this.scope = 'all';
          category.value = 'all';
          search.value = '';
          scope.value = 'all';
          render();
        };
        lensCard.append(resetBtn);
        const missingLoc = this.sceneHubContext?.activeLocationName;
        if (missingLoc && missingLoc !== 'Current Story Scene' && !findMatchingLocation(this.storyDna.locations, missingLoc) && this.storyDnaRequester) {
          const pinFallbackBtn = document.createElement('button');
          pinFallbackBtn.type = 'button';
          pinFallbackBtn.className = 'world-lens-cta';
          pinFallbackBtn.dataset.scenePinFallback = missingLoc;
          pinFallbackBtn.textContent = `📌 Pin ${missingLoc} to World`;
          pinFallbackBtn.onclick = () => {
            this.storyDnaRequester?.({
              action: 'save_location',
              location: {
                id: createLocationId(missingLoc),
                name: missingLoc,
                aliases: [],
                lighting: '',
                atmosphere: '',
                architecture: '',
                environmentDescription: '',
                persistentElements: [],
                connectedLocations: [],
                notes: '',
                locked: false,
                lastUpdated: Date.now(),
              },
            });
            pinFallbackBtn.textContent = `📌 ${missingLoc} pinned ✓`;
            pinFallbackBtn.disabled = true;
          };
          lensCard.append(pinFallbackBtn);
        }
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

  private buildStoryDnaStudio(kind: 'place' | 'object', dossier: ReaderDossier): HTMLElement {
    const wrap = document.createElement('section');
    wrap.className = 'story-dna-studio';
    wrap.dataset.storyDnaStudio = kind;

    const status = document.createElement('p');
    status.dataset.storyDnaStatus = '';
    status.className = 'story-dna-status';
    status.hidden = !this.storyDnaError;
    if (this.storyDnaError) status.textContent = this.storyDnaError;

    const head = document.createElement('div');
    head.className = 'story-dna-studio-head';
    const heading = document.createElement('h3');
    heading.textContent = kind === 'place' ? '📍 Scenery DNA Studio' : '💎 Item DNA Studio';

    const existingLoc = kind === 'place' ? findMatchingLocation(this.storyDna.locations, dossier.entity.name) : undefined;
    const existingItem = kind === 'object' ? findMatchingItem(this.storyDna.items, dossier.entity.name) : undefined;
    let isLocked = Boolean(kind === 'place' ? existingLoc?.locked : existingItem?.locked);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'story-dna-studio-actions';

    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.dataset.storyDnaLock = '';
    lockBtn.setAttribute('aria-pressed', String(isLocked));
    lockBtn.textContent = isLocked ? '🔒 Locked DNA' : '🔓 Lock DNA';

    const autofillBtn = document.createElement('button');
    autofillBtn.type = 'button';
    autofillBtn.dataset.storyDnaAutofill = '';
    autofillBtn.textContent = '✨ Auto-Fill DNA';
    autofillBtn.disabled = isLocked || !this.storyDnaRequester;

    lockBtn.onclick = () => {
      isLocked = !isLocked;
      lockBtn.setAttribute('aria-pressed', String(isLocked));
      lockBtn.textContent = isLocked ? '🔒 Locked DNA' : '🔓 Lock DNA';
      autofillBtn.disabled = isLocked || !this.storyDnaRequester;
      saveBtn.click();
    };

    actionsRow.append(lockBtn, autofillBtn);
    head.append(heading, actionsRow);
    wrap.append(head, status);

    const factVal = (...fields: string[]) => {
      for (const f of fields) {
        const hit = dossier.facts.find(x => x.field === f)?.value || dossier.state?.[f];
        if (hit?.trim()) return hit.trim();
      }
      return '';
    };

    const form = document.createElement('div');
    form.className = 'story-dna-form';

    const addField = (key: string, labelText: string, value: string, multiline = false, placeholder = '') => {
      const row = document.createElement('label');
      row.className = 'story-dna-field';
      const lbl = document.createElement('span');
      lbl.textContent = labelText;
      const input = document.createElement(multiline ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement;
      if (!multiline) (input as HTMLInputElement).type = 'text';
      input.dataset.dnaField = key;
      input.value = value;
      if (placeholder) input.placeholder = placeholder;
      row.append(lbl, input);
      form.append(row);
      return input;
    };

    const preview = document.createElement('div');
    preview.className = 'story-dna-preview';
    const previewLabel = document.createElement('small');
    previewLabel.textContent = 'Prompt Injection Preview';
    const previewText = document.createElement('code');
    previewText.dataset.storyDnaPreview = '';
    preview.append(previewLabel, previewText);

    const footer = document.createElement('div');
    footer.className = 'story-dna-footer';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.dataset.storyDnaSave = '';
    saveBtn.textContent = kind === 'place' ? 'Save Scenery DNA' : 'Save Item DNA';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.storyDnaDelete = '';
    delBtn.textContent = 'Delete DNA';
    footer.append(saveBtn, delBtn);

    if (kind === 'place') {
      const aliasesIn = addField('aliases', 'Short Aliases (comma-separated)', (existingLoc?.aliases ?? dossier.entity.aliases ?? []).join(', '));
      const descIn = addField('environmentDescription', 'Environment & Scenery Description', existingLoc?.environmentDescription ?? factVal('description', 'impression', 'surroundings', 'layout'), true);
      const archIn = addField('architecture', 'Architecture / Layout', existingLoc?.architecture ?? factVal('layout', 'architecture'));
      const lightIn = addField('lighting', 'Lighting', existingLoc?.lighting ?? '');
      const atmIn = addField('atmosphere', 'Atmosphere / Weather', existingLoc?.atmosphere ?? '');
      const elemIn = addField('persistentElements', 'Persistent Props / Landmarks (comma-separated)', (existingLoc?.persistentElements ?? []).join(', '));
      const connIn = addField('connectedLocations', 'Connected Locations (comma-separated)', (existingLoc?.connectedLocations ?? []).join(', '));
      const loreIn = addField('loreText', 'Lore / History', existingLoc?.loreText ?? factVal('history', 'publicHistory', 'significance', 'customs'), true);
      const notesIn = addField('notes', 'Personal Notes', existingLoc?.notes ?? '', true);

      const buildLoc = (): LocationDNA => ({
        id: existingLoc?.id ?? createLocationId(dossier.entity.name),
        name: existingLoc?.name ?? dossier.entity.name,
        aliases: aliasesIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 16),
        ...(descIn.value.trim() ? { environmentDescription: descIn.value.trim().slice(0, 2000) } : {}),
        ...(archIn.value.trim() ? { architecture: archIn.value.trim().slice(0, 500) } : {}),
        ...(lightIn.value.trim() ? { lighting: lightIn.value.trim().slice(0, 500) } : {}),
        ...(atmIn.value.trim() ? { atmosphere: atmIn.value.trim().slice(0, 500) } : {}),
        persistentElements: elemIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 24),
        connectedLocations: connIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 24),
        ...(loreIn.value.trim() ? { loreText: loreIn.value.trim().slice(0, 4000) } : {}),
        ...(notesIn.value.trim() ? { notes: notesIn.value.trim().slice(0, 2000) } : {}),
        ...(existingLoc?.referenceImageUrl ? { referenceImageUrl: existingLoc.referenceImageUrl } : {}),
        locked: isLocked,
        autoDiscovered: false,
        lastUpdated: Date.now(),
      });

      const refreshPreview = () => {
        const clause = formatLocationDNAForImagePrompt(buildLoc());
        previewText.textContent = clause || 'Fill scenery details above to inject consistent location visuals into generated art.';
      };
      [aliasesIn, descIn, archIn, lightIn, atmIn, elemIn, connIn, loreIn, notesIn].forEach(el => el.addEventListener('input', refreshPreview));
      refreshPreview();

      autofillBtn.onclick = () => {
        this.awaitingDnaSync = true;
        status.textContent = 'Scanning story & SimTracker for scenery clues...';
        status.hidden = false;
        this.storyDnaRequester?.({
          action: 'autofill_location',
          locationId: existingLoc?.id,
          locationName: dossier.entity.name,
        });
      };
      saveBtn.onclick = () => {
        const nextLoc = buildLoc();
        this.storyDnaRequester?.({ action: 'save_location', location: nextLoc });
        status.textContent = 'Saving Scenery DNA...';
        status.hidden = false;
      };
      delBtn.onclick = () => {
        if (existingLoc) {
          this.storyDnaRequester?.({ action: 'delete_location', locationId: existingLoc.id });
          status.textContent = 'Deleted Location DNA.';
          status.hidden = false;
        }
      };
    } else {
      const aliasesIn = addField('aliases', 'Short Aliases (comma-separated)', (existingItem?.aliases ?? dossier.entity.aliases ?? []).join(', '));
      const typeIn = addField('itemType', 'Item Type / Category', existingItem?.itemType ?? '');
      const descIn = addField('description', 'Visual Description (Prompt Injection)', existingItem?.description ?? factVal('description', 'appearance', 'significance') ?? dossier.entity.name, true);
      const matIn = addField('materials', 'Materials / Craftsmanship', existingItem?.materials ?? '');
      const featIn = addField('distinctiveFeatures', 'Distinctive Features (comma-separated)', (existingItem?.distinctiveFeatures ?? []).join(', '));
      const colIn = addField('colors', 'Colors (comma-separated)', (existingItem?.colors ?? []).join(', '));
      const heldIn = addField('heldBy', 'Held / Owned By', existingItem?.heldBy ?? factVal('owner'));
      const loreIn = addField('loreText', 'Lore / Significance', existingItem?.loreText ?? factVal('provenance', 'significance', 'history', 'function'), true);
      const notesIn = addField('notes', 'Personal Notes', existingItem?.notes ?? '', true);

      const buildItem = (): ItemDNA => ({
        id: existingItem?.id ?? createItemId(dossier.entity.name),
        name: existingItem?.name ?? dossier.entity.name,
        aliases: aliasesIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 16),
        ...(typeIn.value.trim() ? { itemType: typeIn.value.trim().slice(0, 100) } : {}),
        description: (descIn.value.trim() || dossier.entity.name).slice(0, 2000),
        ...(matIn.value.trim() ? { materials: matIn.value.trim().slice(0, 500) } : {}),
        distinctiveFeatures: featIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 24),
        colors: colIn.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12),
        ...(heldIn.value.trim() ? { heldBy: heldIn.value.trim().slice(0, 160) } : {}),
        ...(loreIn.value.trim() ? { loreText: loreIn.value.trim().slice(0, 4000) } : {}),
        ...(notesIn.value.trim() ? { notes: notesIn.value.trim().slice(0, 2000) } : {}),
        ...(existingItem?.referenceImageUrl ? { referenceImageUrl: existingItem.referenceImageUrl } : {}),
        locked: isLocked,
        autoDiscovered: false,
        lastUpdated: Date.now(),
      });

      const refreshPreview = () => {
        const clause = formatItemDNAForImagePrompt(buildItem());
        previewText.textContent = clause || 'Describe this artifact so prompts stay consistent whenever it appears.';
      };
      [aliasesIn, typeIn, descIn, matIn, featIn, colIn, heldIn, loreIn, notesIn].forEach(el => el.addEventListener('input', refreshPreview));
      refreshPreview();

      autofillBtn.onclick = () => {
        this.awaitingDnaSync = true;
        status.textContent = 'Scanning story for artifact details...';
        status.hidden = false;
        this.storyDnaRequester?.({
          action: 'autofill_item',
          itemId: existingItem?.id,
          itemName: dossier.entity.name,
        });
      };
      saveBtn.onclick = () => {
        const nextItem = buildItem();
        this.storyDnaRequester?.({ action: 'save_item', item: nextItem });
        status.textContent = 'Saving Item DNA...';
        status.hidden = false;
      };
      delBtn.onclick = () => {
        if (existingItem) {
          this.storyDnaRequester?.({ action: 'delete_item', itemId: existingItem.id });
          status.textContent = 'Deleted Item DNA.';
          status.hidden = false;
        }
      };
    }

    wrap.append(form, preview, footer);
    return wrap;
  }

  close(): void {
    this.activeDossierContext = null;
    this.awaitingDnaSync = false;
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
[data-vn-root] [data-entity-anchor]{font:inherit;font-weight:650;color:inherit;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,transparent);border:0;text-decoration:underline 1.5px color-mix(in srgb,var(--vn-accent,#9ec6f0) 80%,transparent);text-underline-offset:3px;border-radius:.15em;padding:0;cursor:pointer;text-align:inherit;display:inline;line-height:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}
[data-vn-root] [data-entity-anchor][data-entity-doc="true"]{background:color-mix(in srgb,#e8c987 18%,var(--vn-accent,#9ec6f0) 10%);text-decoration:underline dotted 1.5px color-mix(in srgb,#e8c987 82%,var(--vn-accent,#9ec6f0))}
[data-vn-root] [data-entity-anchor][data-entity-doc="true"]::after{content:" 🗏";font-size:.78em;opacity:.72;vertical-align:0.05em}
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
.folio-hero-card{height:250px;position:relative;background:var(--vn-shell-field,#2a3539);overflow:hidden;border-radius:var(--vn-shell-radius,12px);margin:8px 0 12px;border:1px solid var(--vn-shell-border,rgba(255,255,255,.15))}
.folio-hero-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 18%;filter:saturate(.7) contrast(1.05)}
.folio-hero-card:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(10,16,20,.35) 60%,rgba(8,14,16,.92) 100%)}
.folio-hero-label{position:absolute;z-index:2;bottom:22px;left:16px;font-family:var(--vn-shell-display-font,Georgia,serif);font-size:30px;letter-spacing:-.04em;color:#fff!important;text-shadow:0 2px 10px rgba(0,0,0,.85)}
.folio-hero-sub{position:absolute;z-index:2;left:17px;bottom:7px;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:rgba(255,255,255,.88)!important;text-shadow:0 1px 4px rgba(0,0,0,.85)}
.folio-meta{display:flex;gap:5px;margin:8px 0 10px;flex-wrap:wrap}
.folio-meta .tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:var(--vn-shell-radius,6px);font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 14%,var(--vn-shell-field,transparent));color:var(--vn-shell-text,#d5eee7);border:1px solid var(--vn-shell-border,rgba(130,185,165,.35))}
.folio-quote-callout{border-left:2px solid var(--vn-shell-accent,var(--vn-accent,#b7d6ae));padding:2px 0 2px 12px;color:var(--vn-shell-text,var(--vn-chrome-text,#e4ead9));font:italic 13px/1.5 Georgia,serif;margin:12px 0}
.observations-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--vn-shell-border,rgba(255,255,255,.15));margin-top:8px}
.observation-cell{padding:8px 6px 8px 0;border-bottom:1px solid var(--vn-shell-border,rgba(255,255,255,.12));min-height:48px}
.observation-cell:nth-child(even){padding-left:10px}
.observation-cell span{display:block;font-size:9.5px;margin-bottom:2px;opacity:.92;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-shell-muted,var(--vn-muted-text,#9cb5a8))}
.observation-cell strong{font-size:11.5px;font-weight:650;color:var(--vn-shell-text,var(--vn-chrome-text,var(--vn-text,#f3f7f0)))}

.observation-cell em{font-size:8.5px;font-style:normal;margin-left:4px;padding:1px 4px;border-radius:4px;background:color-mix(in srgb,var(--vn-shell-accent,#dcebad) 20%,transparent);color:var(--vn-shell-accent,#dcebad);font-weight:750}

[data-dossier-media]{margin:0;position:relative;overflow:hidden;border-radius:var(--vn-shell-radius,12px);border:1px solid color-mix(in srgb,var(--vn-shell-accent,var(--vn-accent,#9ec6f0)) 35%,transparent);background:rgba(0,0,0,.35);display:grid;place-items:center}
[data-dossier-media][data-has-image="true"]{cursor:zoom-in}
[data-dossier-media][data-expanded="true"]{grid-column:1 / -1;width:100%;height:auto;max-height:340px;cursor:zoom-out}
[data-dossier-media] img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block}
[data-dossier-media][data-expanded="true"] img{object-fit:contain;max-height:320px;background:rgba(0,0,0,.6)}
[data-dossier-media] svg{width:100%;height:100%;display:block;color:var(--vn-shell-accent,var(--vn-accent,#9ec6f0))}
[data-dossier-media] figcaption{position:absolute;inset:auto 0 0 0;padding:4px 8px;font-size:.68em;background:linear-gradient(transparent,rgba(0,0,0,.82));color:#fff;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}

/* World Lens Scene Map & Chips */
.chip-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px}
.chip{height:34px;min-height:34px;white-space:nowrap;padding:0 12px;border:1px solid var(--vn-shell-border,var(--vn-panel-border,rgba(255,255,255,.2)));border-radius:min(var(--vn-shell-radius,20px),20px);font-size:11.5px;font-weight:600;cursor:pointer;background:var(--vn-shell-button,var(--vn-button-bg,rgba(255,255,255,.06)));color:var(--vn-shell-text,inherit);transition:all .15s ease}
.chip[aria-pressed="true"],.chip.active{border-color:var(--vn-shell-accent,var(--vn-accent,#a8d3c8));background:var(--vn-shell-accent,var(--vn-accent,#a8d3c8));color:var(--vn-shell-accent-contrast,#091418)!important;font-weight:750;box-shadow:0 2px 10px color-mix(in srgb,var(--vn-shell-accent,var(--vn-accent,#a8d3c8)) 28%,transparent)}
.world-sheet-map{margin-top:8px;height:calc(min(45vh,310px));min-height:240px;border-radius:var(--vn-shell-radius,12px);position:relative;overflow:hidden;border:1px solid var(--vn-shell-border,var(--vn-panel-border,rgba(255,255,255,.18)));background:var(--vn-shell-field,rgba(16,28,25,.96))}
.world-map-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.world-map-svg path{fill:none;stroke:var(--vn-shell-accent,var(--vn-accent,#80b5a3));stroke-width:1.2;stroke-dasharray:3 5;opacity:.5}
.map-node-pill{position:absolute;min-width:82px;max-width:114px;padding:5px 8px;text-align:left;border-radius:min(var(--vn-shell-radius,8px),10px);border:1px solid var(--vn-shell-border,rgba(255,255,255,.25));background:var(--vn-shell-panel,rgba(22,40,34,.95));color:var(--vn-shell-text,inherit);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);transition:transform .18s cubic-bezier(.16,1,.3,1),background .15s ease;z-index:2}
.map-node-pill.active{background:var(--vn-shell-accent,var(--vn-accent,#deefac));color:var(--vn-shell-accent-contrast,#122822)!important;border-color:var(--vn-shell-border-strong,#fff);transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.map-node-pill b{display:block;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.map-node-pill small{display:block;font-size:9px;opacity:.75;margin-top:1px}
.map-node-pill .index-dot{display:block;width:7px;height:7px;background:var(--vn-shell-muted,#90b5a7);border:1.5px solid var(--vn-shell-panel,#fff);border-radius:100%;position:absolute;top:-5px;left:9px}
.map-node-pill.active .index-dot{background:var(--vn-shell-accent-contrast,#315f50);border-color:var(--vn-shell-accent,#deefac)}
.world-lens{position:relative;margin:10px 0 6px;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-panel,var(--vn-panel-solid,rgba(14,25,21,.94)));backdrop-filter:blur(8px);border:1px solid var(--vn-shell-border,var(--vn-panel-border,rgba(130,175,155,.35)));box-shadow:var(--vn-shell-shadow,0 6px 18px rgba(0,0,0,.35));z-index:3}
.world-lens h3{font-size:13px;margin:0 0 2px;font-weight:700;color:var(--vn-shell-text,var(--vn-text,#f2f7ed));font-family:var(--vn-shell-display-font,inherit)}
.world-lens p{margin:0;font-size:11px;line-height:1.48;color:var(--vn-shell-muted,#d1dfd5)}


.world-lens-cta{display:inline-block;margin-top:8px!important;min-height:0!important;min-width:0!important;padding:6px 12px!important;font-size:11px!important;font-weight:750!important;border-radius:min(var(--vn-shell-radius,6px),8px)!important;background:var(--vn-shell-accent,var(--vn-accent,#a8d3c8))!important;color:var(--vn-shell-accent-contrast,#0f1e1a)!important;border:none!important;cursor:pointer}
.world-strip{display:flex;gap:8px;margin:6px 0 10px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}
.world-strip button{display:flex!important;align-items:center;text-align:left;gap:8px;flex-shrink:0;padding:6px 10px 6px 6px!important;min-height:48px!important;border-radius:min(var(--vn-shell-radius,10px),12px)!important;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2))!important;background:var(--vn-shell-field,rgba(255,255,255,.04))!important;cursor:pointer}
.world-strip button:hover{background:var(--vn-shell-button,rgba(255,255,255,.08))!important}
.world-strip button.active{border-color:var(--vn-shell-accent,var(--vn-accent,#a8d3c8))!important;background:color-mix(in srgb,var(--vn-shell-accent,var(--vn-accent,#a8d3c8)) 16%,var(--vn-shell-field,transparent))!important}
.world-strip img,.world-strip .thumb-initials{width:36px;height:36px;border-radius:6px;object-fit:cover;flex:none;display:grid;place-items:center;font-weight:700;font-size:11px;background:var(--vn-shell-button,rgba(0,0,0,.3));color:var(--vn-shell-accent,var(--vn-accent,#a8d3c8))}
.world-strip b{display:block;font-size:11px;font-weight:650}
.world-strip small{display:block;font-size:9px;color:var(--vn-shell-muted,inherit);margin-top:1px}
.input-wrap{display:flex;gap:8px;align-items:center;border:1px solid var(--vn-shell-border,rgba(255,255,255,.2));border-radius:var(--vn-shell-radius,10px);background:var(--vn-shell-field,rgba(0,0,0,.15));width:100%;padding:0 10px;height:42px;box-sizing:border-box}
.input-wrap input{width:100%;min-width:0;background:none;border:none;outline:none;font:inherit;color:var(--vn-shell-text,inherit);padding:0}

/* Cast chips and Details */
[data-dossier-present-cast]{margin:12px 0;padding:10px 12px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-field,rgba(255,255,255,.03));border:1px solid var(--vn-shell-border,#666)}
[data-dossier-present-cast] h3{margin:0 0 8px;font-size:.8em;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-shell-muted,inherit)}
[data-dossier-cast-chips]{display:flex;flex-wrap:wrap;gap:6px}
[data-dossier-cast-chip]{margin:0!important;min-height:44px;min-width:44px;padding:8px 12px!important;border-radius:999px!important;font-size:.8em!important;font-weight:600!important}
[data-vn-dossier-card] dl{margin:0}
[data-vn-dossier-card] dt{font-size:.75em;margin-top:12px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:.025em;color:var(--vn-shell-accent,#a8c7b8)}
[data-vn-dossier-card] dt:first-child{margin-top:0}
[data-vn-dossier-card] dd{margin:3px 0 0;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.62;color:var(--vn-shell-text,var(--vn-chrome-text,var(--vn-text,#f2f7f0)))}
[data-vn-dossier-card] [data-fact-expand]{display:inline;min-width:0;min-height:0;padding:1px 6px;margin:0 0 0 4px;font-size:.75em;border-radius:6px;vertical-align:baseline}
[data-reference-overview]{padding:12px 14px;background:var(--vn-shell-field,rgba(27,49,41,.6));border:1px solid var(--vn-shell-border,rgba(130,185,165,.3));border-radius:var(--vn-shell-radius,12px);margin:10px 0 14px}
section[data-reference-current],section[data-reference-observations]{margin:14px 0;padding:12px 14px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-field,rgba(255,255,255,.03));border:1px solid var(--vn-shell-border,#666)}
section[data-reference-current] h3,section[data-reference-observations] h3{font-size:.82em;text-transform:uppercase;letter-spacing:.03em;margin:0 0 10px;opacity:1;color:var(--vn-shell-accent,#dcebad);font-weight:700}
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
[data-reference-filters]{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;margin:4px 0 8px;align-items:center}
[data-reference-filters] input{font-size:16px}
[data-reference-filters] select{box-sizing:border-box;min-width:0;width:auto;max-width:150px;min-height:44px;font:inherit;font-size:16px;color:inherit;background:var(--vn-button-bg,#ffffff0d);border:1px solid var(--vn-panel-border,#666);border-radius:9px;padding:6px 8px}
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
.world-hub-tabs{display:flex;gap:6px;margin:4px 0 6px}
.world-scene-hub{padding:10px;display:flex;flex-direction:column;gap:10px}
.world-scene-banner{position:relative;height:142px;border-radius:min(var(--vn-shell-radius,10px),12px);overflow:hidden;border:1px solid var(--vn-shell-border,rgba(255,255,255,.16));background:var(--vn-shell-panel,rgba(12,20,24,.88))}
.world-scene-banner img,.world-scene-banner svg{width:100%;height:100%;object-fit:cover;display:block}
.world-scene-banner-overlay{position:absolute;inset:auto 0 0 0;padding:10px 12px;background:linear-gradient(transparent,rgba(6,12,16,.92));display:flex;flex-direction:column;gap:5px}
.world-scene-banner-overlay h3{margin:0;font-size:14px;font-weight:700;color:#fff;font-family:var(--vn-shell-display-font,inherit)}
.world-scene-dna-pills{display:flex;flex-wrap:wrap;gap:4px}
.scene-dna-pill{font-size:9.5px;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 20%,rgba(0,0,0,.35));border:1px solid color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 40%,transparent);color:#f4f9ff}
.world-scene-subhead{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--vn-shell-muted,inherit);margin-bottom:5px}
.world-scene-cast-row{display:flex;flex-wrap:wrap;gap:6px}
.present-cast-pill,.present-item-pill{min-height:44px;min-width:44px;padding:8px 12px!important;margin:0!important;font-size:12px!important;border-radius:999px!important;background:color-mix(in srgb,var(--vn-shell-accent,#a8d3c8) 14%,var(--vn-shell-button,transparent))!important;border:1px solid var(--vn-shell-border-strong,var(--vn-shell-border))!important;color:var(--vn-shell-text,inherit)!important}
.present-item-pill.active,.present-cast-pill.active{background:var(--vn-shell-accent,#a8d3c8)!important;color:var(--vn-shell-accent-contrast,#091418)!important;border-color:var(--vn-shell-accent,#a8d3c8)!important;font-weight:750!important}
.world-scene-empty{font-size:11px;color:var(--vn-shell-muted,inherit)}
.world-atlas-view{position:relative;height:215px;width:100%}
.story-dna-studio{margin:12px 0;padding:12px;border-radius:var(--vn-shell-radius,12px);background:var(--vn-shell-field,rgba(18,32,38,.7));border:1px solid var(--vn-shell-border,rgba(130,185,165,.32));display:flex;flex-direction:column;gap:10px}
.story-dna-studio-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.story-dna-studio-head h3{margin:0;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--vn-shell-accent,#d6ecad)}
.story-dna-studio-actions{display:flex;gap:6px}
.story-dna-studio-actions button{min-height:44px;min-width:44px;padding:6px 12px!important;font-size:12px!important;margin:0!important}
.story-dna-status{margin:0;font-size:11px;color:var(--vn-shell-accent,#93c5fd)}
.story-dna-form{display:grid;grid-template-columns:1fr;gap:8px}
.story-dna-field{display:flex;flex-direction:column;gap:3px;font-size:11px}
.story-dna-field span{color:var(--vn-shell-muted,inherit);font-weight:600}
.story-dna-field input,.story-dna-field textarea{box-sizing:border-box;width:100%;padding:7px 9px;border-radius:min(var(--vn-shell-radius,8px),10px);border:1px solid var(--vn-shell-border,rgba(255,255,255,.16));background:var(--vn-shell-panel,rgba(0,0,0,.28));color:var(--vn-shell-text,inherit);font:inherit;font-size:12px}
.story-dna-field textarea{min-height:54px;margin:0}
.story-dna-preview{padding:8px 10px;border-radius:min(var(--vn-shell-radius,8px),10px);background:var(--vn-shell-panel,rgba(0,0,0,.28));border:1px dashed var(--vn-shell-border-strong,var(--vn-shell-border))}
.story-dna-preview small{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--vn-shell-muted,inherit);margin-bottom:3px}
.story-dna-preview code{display:block;font-size:11px;line-height:1.45;white-space:pre-wrap;color:var(--vn-shell-accent,#cbe9e0)}
.story-dna-footer{display:flex;gap:8px;justify-content:flex-end}
.story-dna-footer button{min-height:44px;min-width:44px;margin:0!important;font-size:12px!important}
.vn-inline-tooltip-popover{position:fixed;z-index:260;width:min(320px,calc(100vw - 24px));padding:12px;border-radius:var(--vn-shell-radius,14px);background:var(--vn-shell-panel,rgba(15,23,36,.96));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--vn-shell-border-strong,var(--vn-shell-border));box-shadow:0 14px 36px rgba(0,0,0,.58);color:var(--vn-shell-text,#eef4f1);display:flex;flex-direction:column;gap:8px}
.vn-inline-tooltip-head{display:flex;align-items:center;gap:10px}
.vn-inline-tooltip-thumb{width:42px;height:42px;border-radius:8px;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--vn-shell-button,rgba(255,255,255,.08));font-weight:700}
.vn-inline-tooltip-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.vn-inline-tooltip-title{flex:1;min-width:0}
.vn-inline-tooltip-title strong{display:block;font-size:13.5px;line-height:1.25}
.vn-inline-tooltip-title small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--vn-shell-muted,inherit)}
.vn-inline-tooltip-close{min-width:44px;min-height:44px;border-radius:50%;border:1px solid var(--vn-shell-border,rgba(255,255,255,.18));background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1}
.vn-inline-tooltip-body{margin:0;font-size:11.5px;line-height:1.45;opacity:.92;white-space:pre-line}
.vn-inline-tooltip-cta{width:100%;padding:7px 10px;border-radius:min(var(--vn-shell-radius,8px),10px);border:none;background:var(--vn-shell-accent,#a8d3c8);color:var(--vn-shell-accent-contrast,#0e1e1a);font-weight:750;font-size:11.5px;cursor:pointer;text-align:center}
` + DOCUMENT_READER_CSS;

export const DOCKED_DOSSIER_CSS = `
[data-vn-dossier][data-vn-workspace-tool="story"]{position:relative;inset:auto;display:flex;align-items:stretch;padding:0;background:transparent;height:100%;z-index:auto}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]{width:100%;max-height:100%;height:100%;border:0;border-radius:0;box-shadow:none;padding:18px;font-size:14px;line-height:1.7}
[data-vn-workspace-tool="story"] [data-vn-dossier-card] > .dossier-topbar-header{display:none!important}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]>header{position:static;top:auto;padding:0 0 14px;background:transparent;display:flex;align-items:center;justify-content:space-between}
[data-vn-workspace-tool="story"] [data-vn-dossier-card]>header button[aria-label^="Close"]{display:none}
[data-reference-categories]{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
[data-reference-categories] button{flex:1;min-width:60px;margin:0;font-size:11.5px;padding:6px 10px}
[data-reference-categories] [aria-pressed="true"]{border-color:var(--vn-shell-accent,var(--vn-accent))!important;background:var(--vn-shell-accent,var(--vn-accent))!important;color:var(--vn-shell-accent-contrast,#091418)!important;font-weight:750!important}
`;
